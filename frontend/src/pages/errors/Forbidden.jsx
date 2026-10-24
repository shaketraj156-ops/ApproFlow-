import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';

export function Forbidden() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-4">
        <ShieldX className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900">403 — Access Forbidden</h1>
      <p className="text-sm text-slate-500 mt-2 max-w-md">
        Your role does not possess permissions to view or perform operations on this resource.
      </p>
      <Link
        to="/"
        className="mt-6 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-5xl font-black text-slate-300">404</h1>
      <h2 className="text-2xl font-bold text-slate-900 mt-2">Page Not Found</h2>
      <p className="text-sm text-slate-500 mt-1 max-w-md">
        The requested URL was not found in the AICTE Approval portal.
      </p>
      <Link
        to="/"
        className="mt-6 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition"
      >
        Return Home
      </Link>
    </div>
  );
}
