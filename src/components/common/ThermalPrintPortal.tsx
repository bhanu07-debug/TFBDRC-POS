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
      el.className = 'thermal-print-portal';
      el.setAttribute('aria-hidden', 'true');
      document.body.appendChild(el);
    } else {
      el.className = 'thermal-print-portal';
      el.setAttribute('aria-hidden', 'true');
    }
    setContainer(el);
  }, []);

  if (!container || !active) return null;

  return createPortal(children, container);
};
