// Wrangler can print a proxy notice before --json output. Only parse the JSON
// array, allowing CLI notices before and after it and brackets inside strings.
export function parseWranglerJson(output) {
  for (const match of output.matchAll(/^\s*\[/gm)) {
    const start = match.index + match[0].lastIndexOf('[')
    let depth = 0
    let quoted = false
    let escaped = false
    for (let index = start; index < output.length; index++) {
      const char = output[index]
      if (quoted) {
        if (escaped) escaped = false
        else if (char === '\\') escaped = true
        else if (char === '"') quoted = false
      } else if (char === '"') quoted = true
      else if (char === '[' || char === '{') depth++
      else if (char === ']' || char === '}') depth--
      if (depth === 0 && !quoted) {
        try {
          const result = JSON.parse(output.slice(start, index + 1))
          if (Array.isArray(result)) return result
        } catch {
          break
        }
      }
    }
  }
  throw new Error('Wrangler did not return a valid JSON array')
}
