import { spawnSync } from 'node:child_process'
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { transform } from 'esbuild'
import { parseWranglerJson } from './wrangler-json.mjs'

const production = process.argv.includes('--production')
const target = production ? ['--remote', '--env', 'production'] : ['--local']
const wrangler = new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url).pathname
function run(args, json = false) {
  const result = spawnSync(process.execPath, [wrangler, ...args], {
    encoding: 'utf8', stdio: json ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    maxBuffer: 64 * 1024 * 1024,
  })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`D1 command failed (${result.status})`)
  return json ? parseWranglerJson(result.stdout) : undefined
}
function query(command) {
  const response = run(['d1', 'execute', 'DB', ...target, '--command', command, '--json'], true)
  return response.flatMap(item => item.results ?? [])
}

// Existing installs may contain duplicate associations. Clean them before the
// generated migration adds the unique index; migration SQL stays generated.
const tables = new Set(query("SELECT name FROM sqlite_master WHERE type = 'table'").map(row => row.name))
if (tables.has('post_tags')) {
  query('DELETE FROM post_tags WHERE rowid NOT IN (SELECT min(rowid) FROM post_tags GROUP BY post_id, tag_id)')
}
if (tables.has('post_view_events')) {
  query("UPDATE post_view_events SET lang = 'zh' WHERE lang IS NULL")
}
run(['d1', 'migrations', 'apply', 'DB', ...target])

// Reuse the application's word counter for historical posts, in bounded pages.
const source = readFileSync(new URL('../src/utils/word-count.ts', import.meta.url), 'utf8')
const { code } = await transform(source, { loader: 'ts', format: 'esm' })
const { countWords } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
const directory = mkdtempSync(join(tmpdir(), 'blog-migrate-'))
const quote = value => `'${String(value).replaceAll("'", "''")}'`
try {
  let offset = 0
  while (true) {
    const rows = query(`SELECT id, content, content_en FROM posts ORDER BY id LIMIT 20 OFFSET ${offset}`)
    if (!rows.length) break
    const statements = rows.map(row => {
      const count = value => countWords((value ?? '').replace(/<[^>]*>/g, ' '))
      return `UPDATE posts SET word_count = ${count(row.content)}, word_count_en = ${count(row.content_en)} WHERE id = ${quote(row.id)};`
    })
    const file = join(directory, 'backfill.sql')
    writeFileSync(file, statements.join('\n'))
    run(['d1', 'execute', 'DB', ...target, '--file', file])
    offset += rows.length
  }
} finally {
  rmSync(directory, { recursive: true, force: true })
}
