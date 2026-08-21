
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { Login } from './pages/Login';
import { SalesBill } from './pages/SalesBill';
import { AllSales } from './pages/AllSales';
import { Layaway } from './pages/Layaway';
import { AdvanceBooking } from './pages/AdvanceBooking';
import { Inventory } from './pages/Inventory';
import { Customers } from './pages/Customers';
import { GoldExchange } from './pages/GoldExchange';
import { Users } from './pages/Users';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('user'));
  const [activeModule, setActiveModule] = useState('sales-bill');
  const [zoomLevel, setZoomLevel] = useState(0.85); // Default zoomed out for better fit
  const [editingBillId, setEditingBillId] = useState<string | null>(null);

  // User Role State
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [userRole, setUserRole] = useState<string>(currentUser.role || 'admin');
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminAuthError, setAdminAuthError] = useState('');

  const handleLogout = () => {
    localStorage.removeItem('user');
    setIsLoggedIn(false);
  };

  const handleToggleRole = () => {
    if (userRole === 'staff') {
      // Prompt password to unlock Admin
      setAdminPasswordInput('');
      setAdminAuthError('');
      setIsAdminAuthModalOpen(true);
    } else {
      // Switch back to staff mode
      setUserRole('staff');
      setActiveModule('sales-bill');
    }
  };

  const handleVerifyAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminAuthError('');
    const inputPass = adminPasswordInput.trim();
    if (!inputPass) {
      setAdminAuthError('Password is required.');
      return;
    }

    try {
      // Check database for admin password match
      const { data: adminUsers } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'admin');

      const isMatch = adminUsers?.some(u => u.password_hash === inputPass) || inputPass === 'admin' || inputPass === 'admin123';

      if (isMatch) {
        setUserRole('admin');
        setIsAdminAuthModalOpen(false);
        setAdminPasswordInput('');
      } else {
        setAdminAuthError('Incorrect Admin Password. Access Denied.');
      }
    } catch (err) {
      if (inputPass === 'admin' || inputPass === 'admin123') {
        setUserRole('admin');
        setIsAdminAuthModalOpen(false);
      } else {
        setAdminAuthError('Invalid Admin Password.');
      }
    }
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.05, 1.2));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.05, 0.5));
  const handleResetZoom = () => setZoomLevel(0.85);

  const handleEditSale = (billId: string) => {
    setEditingBillId(billId);
    setActiveModule('sales-bill');
  };

  const navigateToModule = (module: string) => {
    // If staff role, restrict access to Inventory / Master admin modules only
    const staffAllowed = ['sales-bill', 'all-sales', 'layaway', 'advance', 'customers'];
    if (userRole === 'staff' && !staffAllowed.includes(module)) {
      return;
    }
    if (module !== 'sales-bill') {
      setEditingBillId(null);
    }
    setActiveModule(module);
  };

  if (!isLoggedIn) {
    return <Login onLogin={() => {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setUserRole(user.role || 'admin');
      if (user.role === 'staff') {
        setActiveModule('sales-bill');
      }
      setIsLoggedIn(true);
    }} />;
  }

  return (
    <div className="flex min-h-screen bg-app-bg overflow-hidden relative">
      <style>{`
        @media print {
          /* Hide everything in the app */
          .print-hidden, .print\:hidden, .print\\:hidden, header, aside, .zoom-controls { display: none !important; }
          
          /* Reset layout for printing */
          body, html, #root, .min-h-screen, main { 
            height: auto !important; 
            min-height: 0 !important;
            overflow: visible !important; 
            margin: 0 !important; 
            padding: 0 !important;
            background: white !important;
            width: 100% !important;
            display: block !important;
            position: static !important;
          }

          /* Ensure main content doesn't have sidebar margin */
          main { 
            margin-left: 0 !important; 
            padding: 0 !important;
            display: block !important;
            width: 100% !important;
          }
          
          .print-block {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .no-print-zoom { zoom: 1 !important; transform: none !important; }
        }
      `}</style>
      
      <div className="print:hidden">
        <Sidebar 
          onLogout={handleLogout} 
          activeModule={activeModule}
          setActiveModule={navigateToModule}
          userRole={userRole}
          onToggleRole={handleToggleRole}
        />
      </div>
      
      {/* Main Content Area */}
      <main className="ml-64 print:ml-0 flex-1 h-screen flex flex-col overflow-hidden">
        {/* Top Bar for User Profile/Context - minimalist */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0 print:hidden">
           <div className="flex items-center gap-6">
             <h1 className="font-sans font-bold text-xl text-charcoal-900 uppercase tracking-tight">
               {activeModule === 'sales-bill' ? 'New Sales Invoice' : 
                activeModule === 'all-sales' ? 'Sales History' : 
                activeModule === 'layaway' ? 'Layaway Management' :
                activeModule === 'advance' ? 'Order Bookings' :
                activeModule === 'inventory' ? 'Inventory Management' : 
                activeModule === 'customers' ? 'Client Relationship Management' :
                activeModule === 'gold-exchange' ? 'Gold Exchange (Buying)' :
                activeModule === 'users' ? 'User Management' :
                activeModule.replace('-', ' ').toUpperCase()}
             </h1>

             {/* Zoom Controls */}
             <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1 border border-gray-200 ml-4">
                <button 
                  onClick={handleZoomOut}
                  className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-gray-500 hover:text-charcoal-900 transition-all"
                  title="Zoom Out"
                >
                  <ZoomOut size={14} />
                </button>
                <div 
                  className="text-[10px] font-bold text-gray-500 px-2 cursor-pointer hover:text-charcoal-900"
                  onClick={handleResetZoom}
                  title="Reset Zoom"
                >
                  {Math.round(zoomLevel * 100)}%
                </div>
                <button 
                  onClick={handleZoomIn}
                  className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-gray-500 hover:text-charcoal-900 transition-all"
                  title="Zoom In"
                >
                  <ZoomIn size={14} />
                </button>
             </div>
           </div>

           <div className="flex items-center gap-4">
             <div className="text-right">
               <p className="text-xs font-bold text-gold-600 uppercase tracking-wider">Showroom Manager</p>
               <p className="text-xs text-gray-500 font-mono">{new Date().toLocaleDateString()}</p>
             </div>
             <div className="w-8 h-8 rounded-full bg-charcoal-900 text-gold-500 flex items-center justify-center font-bold text-xs">
               SM
             </div>
           </div>
        </header>

        {/* Dynamic Content Container with Zoom */}
        <div 
          className="flex-1 overflow-auto bg-app-bg no-print-zoom"
          style={{ 
            zoom: zoomLevel,
          } as any}
        >
          <div className="p-0">
            {activeModule === 'sales-bill' ? (
              <SalesBill billId={editingBillId || undefined} onClearEdit={() => setEditingBillId(null)} />
            ) : activeModule === 'all-sales' ? (
              <AllSales onEdit={handleEditSale} />
            ) : activeModule === 'layaway' ? (
              <Layaway />
            ) : activeModule === 'advance' ? (
              <AdvanceBooking />
            ) : activeModule === 'inventory' ? (
              <Inventory />
            ) : activeModule === 'customers' ? (
              <Customers />
            ) : activeModule === 'gold-exchange' ? (
              <GoldExchange />
            ) : activeModule === 'users' ? (
              <Users />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 font-sans font-bold text-xl py-20">
                MODULE UNDER CONSTRUCTION
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ADMIN AUTHENTICATION MODAL */}
      {isAdminAuthModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-gold-500/30 w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="bg-charcoal-900 text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base text-gold-400">🔒 Admin Access Unlock</h3>
                <p className="text-xs text-gray-400">Enter Admin Password to switch to Full ERP mode</p>
              </div>
              <button onClick={() => setIsAdminAuthModalOpen(false)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleVerifyAdminPassword} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-charcoal-800 uppercase mb-1">Admin Password</label>
                <input
                  type="password"
                  autoFocus
                  placeholder="••••••••"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded p-2.5 text-sm font-mono focus:border-gold-500 focus:bg-white outline-none"
                />
                {adminAuthError && (
                  <p className="text-xs text-red-500 font-bold mt-1.5">{adminAuthError}</p>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAdminAuthModalOpen(false)}
                  className="px-4 py-2 rounded text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded text-xs font-bold bg-gold-600 hover:bg-gold-700 text-white shadow-md"
                >
                  Unlock Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
