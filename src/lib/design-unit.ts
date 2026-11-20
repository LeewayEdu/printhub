// The unit word shown next to a design quantity ("2 designs", "1 side"). It comes from products.design_unit_label, which an admin
// types by hand. Some products have a number there ("1", "2", "1-2") or nothing, which used to be printed as the unit ("3 1 × ₦3,000").
// This turns any label into a safe word: empty, numeric, range-like or symbol-only text falls back to "designs", and the word is
// singular for exactly 1 and plural otherwise. Labels only; no price or quantity is touched here.

export const DEFAULT_DESIGN_UNIT = 'designs'

/** True when the text holds at least one letter. "1", "1-2", "", "  " and "--" are not words. */
export function isUnitWord(label: unknown): label is string {
  return typeof label === 'string' && /[A-Za-z\u00C0-\u024F]/.test(label.trim())
}

/** The label as a plural word, trimmed; the default when it is not a usable word. Input may already be plural ("sides") or singular ("side"). */
function pluralWord(label: unknown): string {
  if (!isUnitWord(label)) return DEFAULT_DESIGN_UNIT
  const w = label.trim().replace(/\s+/g, ' ')
  return /s$/i.test(w) ? w : `${w}s`
}

/** The label as a singular word: a trailing "s" is dropped ("designs" -> "design", "sides" -> "side"; "glass" stays). */
function singularWord(label: unknown): string {
  const w = pluralWord(label)
  return /ss$/i.test(w) || w.length < 3 ? w : w.replace(/s$/i, '')
}

/** "design" for 1, "designs" for any other number (0, 2, 3 ...), built from the product's label when it is a real word. */
export function designUnitWord(label: unknown, quantity: number): string {
  return quantity === 1 ? singularWord(label) : pluralWord(label)
}

/** "3 designs" / "1 side" */
export function designUnitText(label: unknown, quantity: number): string {
  return `${quantity} ${designUnitWord(label, quantity)}`
}

/** Admin form check for the Unit Label field. Returns a message when the text is not a usable word, otherwise null.
 *  Empty is allowed (the page then shows "designs"). Numbers, ranges like "1-2" and symbol-only text are not words. */
export function designUnitLabelProblem(label: unknown): string | null {
  if (typeof label !== 'string' || label.trim() === '') return null
  if (isUnitWord(label)) return null
  return 'Unit Label must be a word such as "designs" or "sides", not a number or symbols. Leave it empty to show "designs".'
}
