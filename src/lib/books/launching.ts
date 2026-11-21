// The /books page has two looks: the shop (at least one published book) and a "first titles launching soon" page (none yet).
// While there is nothing to sell the page is kept out of search results; it is listed in the sitemap only once a book exists
// (see sitemap.ts), so the two always agree. Pure helpers so the rule is tested.
export const BOOKS_SOON_WHATSAPP_MESSAGE = 'Hello, I would like to hear when the first C-Chu Books titles are available.'

export function booksIndexState(publishedCount: number): { comingSoon: boolean; robots: { index: boolean; follow: boolean } | undefined } {
  const comingSoon = !(publishedCount > 0)
  return { comingSoon, robots: comingSoon ? { index: false, follow: true } : undefined }
}
