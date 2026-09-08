/**
 * Utility functions for reliable thermal receipt and KOT printing.
 * Handles paper width class injection, print trigger, and lifecycle cleanup.
 */

export type ThermalPaperWidth = '80mm' | '58mm';

/**
 * Triggers a thermal print job by mounting clean CSS flags on document.body,
 * calling window.print(), and cleaning up after the print dialog closes.
 */
export const triggerThermalPrint = (paperWidth: ThermalPaperWidth = '80mm'): void => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const widthClass = paperWidth === '58mm' ? 'printing-thermal-58mm' : 'printing-thermal';
  
  // Clean up any stale classes
  document.body.classList.remove('printing-thermal', 'printing-thermal-58mm');
  document.body.classList.add(widthClass);

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    document.body.classList.remove('printing-thermal', 'printing-thermal-58mm');
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);

  // Give the browser DOM a small tick to apply styles before opening print spooler
  setTimeout(() => {
    try {
      window.print();
    } catch (err) {
      console.error('[ThermalPrint] window.print() failed:', err);
      cleanup();
    }
  }, 60);

  // Safety fallback cleanup in case afterprint doesn't fire in certain browsers
  setTimeout(cleanup, 2500);
};
