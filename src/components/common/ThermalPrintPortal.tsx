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
      document.body.appendChild(el);
    }
    setContainer(el);
  }, []);

  if (!container || !active) return null;

  return createPortal(children, container);
};
