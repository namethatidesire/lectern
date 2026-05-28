import { hammingDistance } from '@shared/hash'
import { getSnapshots } from '../store/lectures'

// Returns true if the given hash is too similar to any of the last N snapshots
// for this lecture, indicating a duplicate slide.
export function isDuplicateSnapshot(
  lectureId: string,
  dhash: string,
  threshold = 5,
  lookback = 5
): boolean {
  const recent = getSnapshots(lectureId).slice(-lookback)
  for (const snap of recent) {
    if (snap.phash && hammingDistance(dhash, snap.phash) <= threshold) {
      return true
    }
  }
  return false
}
