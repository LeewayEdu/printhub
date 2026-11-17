// The payment fields (payment_method, paid_amount, ...) are added by payment-fields-migration.sql.
// Until that is run in the database they do not exist, and a write that mentions them fails. This
// helper runs the write WITH the extra fields first and, only if the database says a column is
// missing, repeats it WITHOUT them. That lets the code be deployed before the migration is run.

type Result = { data?: any; error?: any }

export function isMissingColumnError(error: any): boolean {
  if (!error) return false
  const msg = String(error.message || '')
  return error.code === '42703' || error.code === 'PGRST204' || /column .* does not exist|could not find the .* column/i.test(msg)
}

export async function withOptionalColumns(attempt: (includeExtras: boolean) => PromiseLike<Result>): Promise<Result> {
  const first = await attempt(true)
  if (first.error && isMissingColumnError(first.error)) return attempt(false)
  return first
}
