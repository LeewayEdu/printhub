// Focus and navigation arithmetic for the gallery lightbox, kept apart so it can be tested.

/** Next index when Tab (or Shift+Tab) is pressed inside a dialog with `count` focusable controls: it wraps and never leaves. */
export function trapTab(current: number, count: number, shift: boolean): number {
  if (count <= 0) return -1
  if (current < 0) return shift ? count - 1 : 0
  return shift ? (current - 1 + count) % count : (current + 1) % count
}

/** Previous or next picture, wrapping at both ends. */
export function stepIndex(current: number, total: number, dir: 1 | -1): number {
  return total <= 0 ? 0 : (current + dir + total) % total
}
