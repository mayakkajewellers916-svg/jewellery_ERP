
import React, { useState } from 'react';
import { Logo, UnderlineInput, Button, toast } from '../components/UIComponents';
import { supabase } from '../supabaseClient';

interface LoginProps {
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast({ title: 'Login Failed', description: 'Username and password are required.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      // Query the users table specifically
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      // Unified failure message for both non-existent user and wrong password
      if (error || !user || password !== user.password_hash) {
        toast({ title: 'Authentication Error', description: 'invalid username or password.', variant: 'destructive' });
        setLoading(false);
        return;
      }

      // Store safe user data in localStorage
      const userData = {
        id: user.id,
        username: user.username,
        role: user.role,
        staff_code: user.staff_code,
        can_edit_bills: user.can_edit_bills,
        can_edit_stock: user.can_edit_stock,
        can_authorize_nongst: user.can_authorize_nongst,
      };
      
      localStorage.setItem('user', JSON.stringify(userData));
      
      toast({ title: 'Welcome Back', description: `Authenticated as ${user.role.toUpperCase()}` });
      onLogin();
    } catch (err: any) {
      console.error('Login error:', err);
      toast({ title: 'System Error', description: 'Failed to connect to authentication server.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickStaffLogin = () => {
    const staffUser = {
      id: 'staff-101',
      username: 'staff',
      role: 'staff',
      staff_code: 'STF01',
      can_edit_bills: false,
      can_edit_stock: false,
      can_authorize_nongst: false
    };
    localStorage.setItem('user', JSON.stringify(staffUser));
    toast({ title: 'Staff Billing Login', description: 'Access Granted: Billing POS Only' });
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

        <div className="space-y-6">
          {/* STAFF QUICK ENTRY - NO PASSWORD REQUIRED */}
          <div className="p-4 bg-gold-50/60 rounded-lg border border-gold-200 text-center space-y-3">
            <div>
              <h3 className="font-bold text-sm text-charcoal-900 uppercase tracking-tight">Staff Counter Portal</h3>
              <p className="text-[11px] text-gray-500 mt-0.5">Direct entry for POS Billing, Sales, Orders & Clients</p>
            </div>
            <button
              type="button"
              onClick={handleQuickStaffLogin}
              className="w-full bg-charcoal-900 hover:bg-black text-gold-400 font-bold py-3 rounded text-xs transition-all shadow-md flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              ⚡ Staff Direct Access (No Password Needed)
            </button>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink mx-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">or Admin Password Login</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          {/* ADMIN PORTAL - PASSWORD REQUIRED */}
          <form onSubmit={handleSubmit} className="space-y-5">
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
                {loading ? 'Authenticating Admin...' : '🔒 Login as Admin (Password Required)'}
              </Button>
              <p className="text-center mt-4 text-[11px] text-gold-600/60 font-serif italic">
                Full ERP Access. Authorized Admin Personnel Only.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
