import React from 'react';
import { POSProvider, usePOS } from './context/POSContext';
import { GuestQRView } from './components/guest/GuestQRView';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminLoginPage } from './components/admin/AdminLoginPage';

const MainApp: React.FC = () => {
  const { activeInterface, isAdminAuthenticated } = usePOS();

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
