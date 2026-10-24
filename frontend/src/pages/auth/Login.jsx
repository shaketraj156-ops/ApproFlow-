import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, UserCheck, Building2, Eye, KeyRound } from 'lucide-react';
import { getRoleLandingRoute } from '../../routes/roleLanding';

export function Login() {
  const { loginAsRole } = useAuth();
  const navigate = useNavigate();

  const handleRoleLogin = (role, level = 'SECTION_OFFICER', region = 'NORTH') => {
    loginAsRole(role, level, region);
    const landing = getRoleLandingRoute(role, level);
    navigate(landing);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-6 text-white">
      <div className="w-full max-w-md bg-slate-800/90 border border-slate-700 p-8 rounded-2xl shadow-2xl backdrop-blur-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center font-black text-xl mx-auto mb-3 shadow-md">
            AF
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">ApproFlow Portal</h2>
          <p className="text-xs text-slate-400 mt-1">AICTE Approval Workflow Automation & Monitoring</p>
        </div>

        <div className="space-y-4 mb-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">
            Demo Evaluation — Select Active Persona
          </p>

          <div className="grid grid-cols-1 gap-2.5">
            <button
              onClick={() => handleRoleLogin('aicte_officer', 'SECTION_OFFICER', 'NORTH')}
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-700/60 hover:bg-emerald-600/30 border border-slate-600 hover:border-emerald-500 transition text-left"
            >
              <div className="flex items-center space-x-3">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="text-sm font-semibold">Section / Scrutiny Officer</div>
                  <div className="text-xs text-slate-400">North Region • My Queue</div>
                </div>
              </div>
              <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-emerald-400">Launch</span>
            </button>

            <button
              onClick={() => handleRoleLogin('aicte_officer', 'REGIONAL_HEAD', 'WEST')}
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-700/60 hover:bg-blue-600/30 border border-slate-600 hover:border-blue-500 transition text-left"
            >
              <div className="flex items-center space-x-3">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                <div>
                  <div className="text-sm font-semibold">Regional Head (West)</div>
                  <div className="text-xs text-slate-400">EVC scheduler • Regional Bottlenecks</div>
                </div>
              </div>
              <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-blue-400">Launch</span>
            </button>

            <button
              onClick={() => handleRoleLogin('aicte_officer', 'NATIONAL_HEAD', 'ALL')}
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-700/60 hover:bg-purple-600/30 border border-slate-600 hover:border-purple-500 transition text-left"
            >
              <div className="flex items-center space-x-3">
                <KeyRound className="w-5 h-5 text-purple-400" />
                <div>
                  <div className="text-sm font-semibold">National Head (Member Secy)</div>
                  <div className="text-xs text-slate-400">National Heatmap • Cross-Region View</div>
                </div>
              </div>
              <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-purple-400">Launch</span>
            </button>

            <button
              onClick={() => handleRoleLogin('institution_admin')}
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-700/60 hover:bg-amber-600/30 border border-slate-600 hover:border-amber-500 transition text-left"
            >
              <div className="flex items-center space-x-3">
                <Building2 className="w-5 h-5 text-amber-400" />
                <div>
                  <div className="text-sm font-semibold">Institution Admin</div>
                  <div className="text-xs text-slate-400">Status tracking • Undertakings Upload</div>
                </div>
              </div>
              <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-amber-400">Launch</span>
            </button>

            <button
              onClick={() => handleRoleLogin('system_admin')}
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-700/60 hover:bg-indigo-600/30 border border-slate-600 hover:border-indigo-500 transition text-left"
            >
              <div className="flex items-center space-x-3">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <div>
                  <div className="text-sm font-semibold">System Administrator</div>
                  <div className="text-xs text-slate-400">Configure Stages, SLA & Daily Jobs</div>
                </div>
              </div>
              <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-indigo-400">Launch</span>
            </button>
          </div>
        </div>

        <p className="text-[11px] text-center text-slate-500">
          Complies with AICTE Approval Process Handbook (Synthetic demo environment)
        </p>
      </div>
    </div>
  );
}
