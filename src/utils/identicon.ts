/**
 * Deterministic identicon — 5×5 mirrored grid SVG generated from a string seed.
 * Pure JS (no DOM deps), runs in both Worker and browser. FNV-1a hash.
 */
export function identicon(seed: string, size = 40): string {
  function hashStr(s: string): number {
    let h = 0x811c9dc5
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i)
      h = Math.imul(h, 0x01000193)
    }
    return h >>> 0
  }
  const h0 = hashStr(seed)
  const h1 = hashStr(seed + '#1')
  const hue = (h0 % 360 + 360) % 360
  const fg = `hsl(${hue},65%,55%)`
  const cells: string[] = []
  const gridSize = 5
  const cellSize = size / gridSize
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < 3; col++) {
      const bit = (h1 >>> (row * 3 + col)) & 1
      if (bit) {
        const x = col * cellSize
        const y = row * cellSize
        cells.push(`<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${fg}"/>`)
        if (col < 2) {
          cells.push(`<rect x="${(gridSize - 1 - col) * cellSize}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${fg}"/>`)
        }
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="display:block">${cells.join('')}</svg>`
}
