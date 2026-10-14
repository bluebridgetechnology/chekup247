/** Opens the Quick Book widget from anywhere (header, drawer, portal...). */
export const OPEN_QUICK_BOOK_EVENT = 'chekup:open-quick-book';

/** Old booking links redirect to `/?quickbook=1`, which opens the widget on load. */
export const QUICK_BOOK_PARAM = 'quickbook';
export const QUICK_BOOK_URL = `/?${QUICK_BOOK_PARAM}=1`;

export function openQuickBook(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(OPEN_QUICK_BOOK_EVENT));
}
