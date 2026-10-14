/**
 * Temporary product switches (MVP).
 *
 * QUICK_BOOK_ONLY is the master switch: while true, Quick Book is the only
 * booking entry point. The doctor directory, doctor profile pages and the
 * standalone "Book a Consultation" buttons are hidden (nothing is deleted),
 * and "Get Started" / the signed-in "Quick Book" button open the Quick Book
 * widget. Set it to false to go back to the normal booking routes.
 */
export const QUICK_BOOK_ONLY = true;

/** Standalone "Book a Consultation" buttons (hero, doctor cards, patient portal, empty states). */
export const SHOW_DIRECT_BOOKING_CTAS = !QUICK_BOOK_ONLY;

/** Public doctor directory (/doctors), doctor profile pages and the portal's "Find a Doctor". */
export const SHOW_DOCTOR_DIRECTORY = !QUICK_BOOK_ONLY;

/** Patient sign-in / registration (and password reset). Hidden while Quick Book is the only way in. */
export const SHOW_PATIENT_AUTH = !QUICK_BOOK_ONLY;

/** Where signed-out patients are sent when a portal page needs a login. */
export const PATIENT_LOGIN_PATH = SHOW_PATIENT_AUTH ? '/login' : '/';
