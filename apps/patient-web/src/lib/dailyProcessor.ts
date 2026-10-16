import DailyIframe from '@daily-co/daily-js';

/**
 * Whether Daily's built-in background blur / image processor works in this browser. Daily turns it
 * off for every mobile browser (and old desktop ones), so phones always use our on-device pipeline.
 */
export function dailyProcessorSupported(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return !!DailyIframe.supportedBrowser().supportsVideoProcessing;
  } catch {
    return false;
  }
}
