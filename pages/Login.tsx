
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

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const u = username.trim();
    const p = password.trim();

    // If ID & Password are left empty, directly open Staff POS mode
    if (!u && !p) {
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
      toast({ title: 'Staff Access Granted', description: 'Direct Entry: Sales Bill (POS)' });
      onLogin();
      return;
    }

    // If Username and Password are provided, authenticate Admin account
    setLoading(true);
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', u)
        .single();

      if (error || !user || p !== user.password_hash) {
        toast({ title: 'Authentication Error', description: 'Invalid Username or Password.', variant: 'destructive' });
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
      toast({ title: 'Welcome Back', description: `Authenticated as ${user.role?.toUpperCase() || 'ADMIN'}` });
      onLogin();
    } catch (err: any) {
      console.error('Login error:', err);
      toast({ title: 'System Error', description: 'Failed to connect to authentication server.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-10 shadow-soft-gold rounded-sm border-[0.5px] border-gold-500/20 relative overflow-hidden shadow-2xl">
        {/* Decorative corner accent */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-gold-100/50 to-transparent rounded-bl-full pointer-events-none" />
        
        <div className="mb-8">
          <Logo />
        </div>

        <form onSubmit={handleLoginSubmit} className="space-y-6">
          <div className="bg-gray-50 p-4 rounded border border-gray-200 text-center space-y-1">
            <h3 className="font-bold text-xs text-charcoal-900 uppercase tracking-tight">Showroom Login Portal</h3>
            <p className="text-[11px] text-gray-500">
              Enter Admin ID & Password for Admin ERP, or click <strong className="text-gold-700">LOGIN TO SYSTEM</strong> directly for Staff POS Billing.
            </p>
          </div>

          <div className="space-y-4">
            <UnderlineInput 
              label="Username / Admin ID" 
              placeholder="Admin ID (Optional for Staff)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
            <UnderlineInput 
              label="Password" 
              type="password" 
              placeholder="Password (Optional for Staff)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="pt-2">
            <Button type="submit" fullWidth disabled={loading} className="bg-charcoal-900 hover:bg-black text-gold-400 font-bold py-3 uppercase tracking-wider text-xs">
              {loading ? 'Authenticating...' : 'LOGIN TO SYSTEM'}
            </Button>
            <p className="text-center mt-4 text-[11px] text-gold-600/60 font-serif italic">
              Authorized Personnel Only • Mayakka Jewellers ERP
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
