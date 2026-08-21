
import React, { useState } from 'react';
import { Logo, UnderlineInput, Button, toast } from '../components/UIComponents';
import { supabase } from '../supabaseClient';

interface LoginProps {
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [loginRole, setLoginRole] = useState<'staff' | 'admin'>('staff');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmitAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast({ title: 'Login Failed', description: 'Admin Username and password are required.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      if (error || !user || password !== user.password_hash) {
        toast({ title: 'Authentication Error', description: 'Invalid Admin username or password.', variant: 'destructive' });
        setLoading(false);
        return;
      }

      const userData = {
        id: user.id,
        username: user.username,
        role: user.role || 'admin',
        staff_code: user.staff_code,
        can_edit_bills: user.can_edit_bills,
        can_edit_stock: user.can_edit_stock,
        can_authorize_nongst: user.can_authorize_nongst,
      };
      
      localStorage.setItem('user', JSON.stringify(userData));
      toast({ title: 'Welcome Back', description: 'Authenticated as Admin (Full ERP)' });
      onLogin();
    } catch (err: any) {
      console.error('Login error:', err);
      toast({ title: 'System Error', description: 'Failed to connect to authentication server.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleStaffLogin = () => {
    const staffUser = {
      id: 'staff-counter',
      username: 'staff',
      role: 'staff',
      staff_code: 'STF01',
      can_edit_bills: false,
      can_edit_stock: false,
      can_authorize_nongst: false
    };
    localStorage.setItem('user', JSON.stringify(staffUser));
    toast({ title: 'Staff Billing Login', description: 'Access Granted: Sales Bill POS' });
    onLogin();
  };

  return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-10 shadow-soft-gold rounded-sm border-[0.5px] border-gold-500/20 relative overflow-hidden shadow-2xl">
        {/* Decorative corner accent */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-gold-100/50 to-transparent rounded-bl-full pointer-events-none" />
        
        <div className="mb-8">
          <Logo />
        </div>

        {/* ROLE SELECTION TABS */}
        <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 mb-6">
          <button
            type="button"
            onClick={() => setLoginRole('staff')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 uppercase ${
              loginRole === 'staff'
                ? 'bg-charcoal-900 text-gold-400 shadow-md'
                : 'text-gray-500 hover:text-charcoal-900'
            }`}
          >
            ⚡ Staff Login
          </button>
          <button
            type="button"
            onClick={() => setLoginRole('admin')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 uppercase ${
              loginRole === 'admin'
                ? 'bg-gold-600 text-white shadow-md'
                : 'text-gray-500 hover:text-charcoal-900'
            }`}
          >
            🔒 Admin Login
          </button>
        </div>

        {/* STAFF LOGIN VIEW (NO PASSWORD REQUIRED) */}
        {loginRole === 'staff' ? (
          <div className="space-y-6 text-center py-2">
            <div className="bg-gold-50/60 p-4 rounded-lg border border-gold-200">
              <h3 className="font-bold text-sm text-charcoal-900 uppercase tracking-tight">Staff Counter Billing</h3>
              <p className="text-xs text-gray-500 mt-1">Direct access to Sales POS Billing. No password required.</p>
            </div>

            <button
              type="button"
              onClick={handleStaffLogin}
              className="w-full bg-charcoal-900 hover:bg-black text-gold-400 font-bold py-4 rounded text-sm transition-all shadow-lg flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              ⚡ Enter Staff Sales Bill (POS)
            </button>

            <p className="text-[11px] text-gray-400 italic">
              Staff mode is restricted strictly to Sales Invoice Billing.
            </p>
          </div>
        ) : (
          /* ADMIN LOGIN VIEW (PASSWORD REQUIRED) */
          <form onSubmit={handleSubmitAdmin} className="space-y-5">
            <div className="bg-gray-50 p-3 rounded border border-gray-200 text-center">
              <h3 className="font-bold text-xs text-charcoal-900 uppercase">Admin ERP Portal</h3>
              <p className="text-[11px] text-gray-500">ID & Password required for Full ERP access</p>
            </div>

            <div className="space-y-4">
              <UnderlineInput 
                label="Admin Username" 
                placeholder="Enter Admin ID"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
              <UnderlineInput 
                label="Admin Password" 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="pt-2">
              <Button type="submit" fullWidth disabled={loading} className="bg-gold-600 hover:bg-gold-700 text-white">
                {loading ? 'Authenticating Admin...' : '🔒 Login as Admin'}
              </Button>
              <p className="text-center mt-4 text-[11px] text-gold-600/60 font-serif italic">
                Authorized Personnel Only.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
