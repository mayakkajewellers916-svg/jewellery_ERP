import React from 'react';
import { 
  FileText, 
  ShoppingBag, 
  Package, 
  Users, 
  Repeat, 
  UserCog, 
  LogOut,
  Clock,
  CalendarCheck
} from 'lucide-react';
import { Logo } from './UIComponents';

interface SidebarProps {
  onLogout: () => void;
  activeModule: string;
  setActiveModule: (module: string) => void;
  userRole?: string;
  isStaffMode?: boolean;
  onToggleRole?: () => void;
}

const NAV_ITEMS = [
  { id: 'sales-bill', label: 'Sales Bill', icon: FileText },
  { id: 'all-sales', label: 'All Sales', icon: ShoppingBag },
  { id: 'layaway', label: 'Layaway', icon: Clock },
  { id: 'advance', label: 'Order Booking', icon: CalendarCheck },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'customers', label: 'Customers', icon: Users },
];

export const Sidebar: React.FC<SidebarProps> = ({ 
  onLogout, 
  activeModule, 
  setActiveModule,
  userRole = 'admin',
  isStaffMode = false,
  onToggleRole
}) => {
  const isStaff = userRole === 'staff' || isStaffMode;

  // Staff users have access to Sales Bill, All Sales, Layaway, Order Booking, and Customers (Inventory hidden)
  const staffAllowed = ['sales-bill', 'all-sales', 'layaway', 'advance', 'customers'];
  const visibleNavItems = isStaff 
    ? NAV_ITEMS.filter(item => staffAllowed.includes(item.id))
    : NAV_ITEMS;

  return (
    <aside className="w-64 h-screen bg-charcoal-900 border-r border-gray-800 flex flex-col fixed left-0 top-0 z-50 text-white print:hidden">
      <div className="h-16 flex items-center px-6 border-b border-gray-800 gap-3">
         <Logo light />
         <span className="text-sm font-medium tracking-wide text-gray-300">Mayakka Jewellers</span>
      </div>

      <nav className="flex-1 py-6 space-y-1">
        {visibleNavItems.map((item) => {
          const isActive = activeModule === item.id;
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveModule(item.id)}
              className={`
                w-full flex items-center px-6 py-3 text-sm transition-all duration-200 relative
                ${isActive ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}
              `}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gold-500" />
              )}
              <Icon 
                size={18} 
                className={`
                  mr-3 transition-colors duration-200
                  ${isActive ? 'text-gold-500' : 'text-gray-500'}
                `} 
              />
              <span className={isActive ? 'font-medium' : 'font-normal'}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800 space-y-2">
        {onToggleRole && (
          <button
            onClick={onToggleRole}
            className="w-full text-xs font-bold text-gold-400 hover:text-gold-300 bg-charcoal-800 hover:bg-gray-700 py-1.5 px-3 rounded border border-gold-500/30 flex items-center justify-between transition-all"
          >
            <span>Role: {isStaff ? 'Staff (Billing Only)' : 'Admin (Full ERP)'}</span>
            <span className="underline text-[10px]">Switch</span>
          </button>
        )}
        <button 
          onClick={onLogout}
          className="flex items-center text-gray-500 hover:text-red-400 transition-colors duration-200 text-sm w-full px-2 py-2"
        >
          <LogOut size={16} className="mr-3" />
          Logout System
        </button>
      </div>
    </aside>
  );
};