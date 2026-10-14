/** Opens the Quick Book widget from anywhere (header, drawer, portal...). */
export const OPEN_QUICK_BOOK_EVENT = 'chekup:open-quick-book';

/** Old booking links redirect to `/?quickbook=1`, which opens the widget on load. */
export const QUICK_BOOK_PARAM = 'quickbook';
export const QUICK_BOOK_URL = `/?${QUICK_BOOK_PARAM}=1`;

/**
 * Opens Quick Book straight on the time step (earliest-available GP preselected), for patients who
 * need to change their time, e.g. from checkout when the chosen time has closed.
 */
export const QUICK_BOOK_SLOT_VALUE = 'slot';
export function quickBookSlotUrl(consultType?: string): string {
  const type = consultType === 'audio' || consultType === 'video' ? `&type=${consultType}` : '';
  return `/?${QUICK_BOOK_PARAM}=${QUICK_BOOK_SLOT_VALUE}${type}`;
}

export function openQuickBook(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(OPEN_QUICK_BOOK_EVENT));
}
