import { describe, expect, it } from 'vitest'
import { parseWranglerJson } from '../../scripts/wrangler-json.mjs'

describe('Wrangler JSON output', () => {
  it('ignores CLI notices while preserving brackets and escapes in row values', () => {
    const rows = [{ success: true, results: [{ content: '["quoted"] and \\ backslash' }] }]
    const output = 'Proxy environment variables detected.\n' + JSON.stringify(rows, null, 2) + '\nLogs were written.\n'
    expect(parseWranglerJson(output)).toEqual(rows)
  })

  it('accepts an empty result array and rejects malformed output', () => {
    expect(parseWranglerJson('notice\n[]\n')).toEqual([])
    expect(() => parseWranglerJson('Error: no results')).toThrow()
    expect(() => parseWranglerJson('[broken]')).toThrow()
  })
})
