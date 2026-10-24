import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { AlertBell } from './AlertBell';
import { LogOut, User, ShieldCheck } from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
          SIH26262
        </span>
        <span className="text-xs text-slate-500 font-medium">
          Region: <strong className="text-slate-700">{user?.region || 'All'}</strong>
        </span>
      </div>

      <div className="flex items-center space-x-4">
        <AlertBell />

        <div className="h-6 w-px bg-slate-200" />

        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800 font-bold text-xs">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-slate-900 leading-none">{user?.full_name}</p>
            <p className="text-[11px] text-slate-500 mt-0.5 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
