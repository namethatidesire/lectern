// Hamming distance between two equal-length lowercase hex strings.
// Each hex char = 4 bits; uses a nibble lookup table for speed.
const POPCOUNT4 = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4]

export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return Infinity
  let dist = 0
  for (let i = 0; i < a.length; i++) {
    dist += POPCOUNT4[(parseInt(a[i], 16) ^ parseInt(b[i], 16)) & 0xf]
  }
  return dist
}
