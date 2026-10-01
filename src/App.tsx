import React, { useState, useEffect } from 'react';
import { POSProvider, usePOS } from './context/POSContext';
import { GuestQRView } from './components/guest/GuestQRView';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminLoginPage } from './components/admin/AdminLoginPage';
import { GuestDigitalReceiptView } from './components/guest/GuestDigitalReceiptView';

const MainApp: React.FC = () => {
  const { activeInterface, isAdminAuthenticated } = usePOS();
  const [receiptParam, setReceiptParam] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const r = params.get('receipt') || params.get('bill');
      if (r) {
        setReceiptParam(r);
      }
    }
  }, []);

  if (receiptParam) {
    return (
      <GuestDigitalReceiptView
        orderIdentifier={receiptParam}
        onBackToMenu={() => {
          setReceiptParam(null);
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.delete('receipt');
            url.searchParams.delete('bill');
            window.history.pushState({}, '', url.toString() || '/');
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1E293B] flex flex-col font-sans selection:bg-amber-500 selection:text-white">
      {activeInterface === 'guest' ? (
        <GuestQRView />
      ) : !isAdminAuthenticated ? (
        <AdminLoginPage />
      ) : (
        <AdminLayout />
      )}
    </div>
  );
};

export default function App() {
  return (
    <POSProvider>
      <MainApp />
    </POSProvider>
  );
}
