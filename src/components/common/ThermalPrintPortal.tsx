import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ThermalPrintPortalProps {
  children: React.ReactNode;
  active?: boolean;
}

export const ThermalPrintPortal: React.FC<ThermalPrintPortalProps> = ({ children, active = true }) => {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    let el = document.getElementById('thermal-print-container');
    if (!el) {
      el = document.createElement('div');
      el.id = 'thermal-print-container';
      el.className = 'hidden print:block fixed -top-[99999px] -left-[99999px] w-0 h-0 overflow-hidden pointer-events-none opacity-0 print:opacity-100 print:pointer-events-auto print:static print:w-auto print:h-auto print:overflow-visible';
      el.setAttribute('aria-hidden', 'true');
      document.body.appendChild(el);
    } else {
      el.className = 'hidden print:block fixed -top-[99999px] -left-[99999px] w-0 h-0 overflow-hidden pointer-events-none opacity-0 print:opacity-100 print:pointer-events-auto print:static print:w-auto print:h-auto print:overflow-visible';
      el.setAttribute('aria-hidden', 'true');
    }
    setContainer(el);
  }, []);

  if (!container || !active) return null;

  return createPortal(children, container);
};
