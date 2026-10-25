import React, { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { AuthGuard } from './AuthGuard';

import { Login } from '../pages/auth/Login';
import { Home } from '../pages/home/Home';
import { Forbidden, NotFound } from '../pages/errors/Forbidden';

// Pages are code-split; the shell wraps them in <Suspense>.
const page = (loader, name) => lazy(() => loader().then((m) => ({ default: m[name] })));

const OfficerDashboard = page(() => import('../pages/officer/Dashboard'), 'OfficerDashboard');
const ApplicationDetail = page(() => import('../pages/officer/ApplicationDetail'), 'ApplicationDetail');
const Alerts = page(() => import('../pages/officer/Alerts'), 'Alerts');
const Evc = page(() => import('../pages/officer/Evc'), 'Evc');
const Undertakings = page(() => import('../pages/officer/Undertakings'), 'Undertakings');
const Documents = page(() => import('../pages/officer/Documents'), 'Documents');
const Bottlenecks = page(() => import('../pages/bottlenecks/Bottlenecks'), 'Bottlenecks');
const RegionalDashboard = page(() => import('../pages/region/Dashboard'), 'RegionalDashboard');
const NationalDashboard = page(() => import('../pages/national/Dashboard'), 'NationalDashboard');
const InstitutionDashboard = page(() => import('../pages/institution/Dashboard'), 'InstitutionDashboard');
const WorkflowAdmin = page(() => import('../pages/admin/WorkflowAdmin'), 'WorkflowAdmin');
const AuditLog = page(() => import('../pages/audit/AuditLog'), 'AuditLog');

// system_admin always passes AuthGuard, so it is not repeated in these lists.
const OFFICER = ['aicte_officer'];
const OFFICER_OR_AUDITOR = ['aicte_officer', 'auditor'];
const INSTITUTION = ['institution_admin', 'institution_staff'];
const ADMIN_ONLY = ['system_admin'];

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Login />} />
      <Route path="/" element={<Home />} />

      <Route element={<AuthGuard />}>
        <Route element={<AppShell />}>
          {/* Officer operational screens */}
          <Route element={<AuthGuard allowedRoles={OFFICER} />}>
            <Route path="/officer/dashboard" element={<OfficerDashboard />} />
            <Route path="/officer/alerts" element={<Alerts />} />
            <Route path="/officer/evc" element={<Evc />} />
            <Route path="/officer/undertakings" element={<Undertakings />} />
            <Route path="/officer/documents" element={<Documents />} />
            <Route path="/region/dashboard" element={<RegionalDashboard />} />
            <Route path="/national/dashboard" element={<NationalDashboard />} />
          </Route>

          {/* Officers and auditors */}
          <Route element={<AuthGuard allowedRoles={OFFICER_OR_AUDITOR} />}>
            <Route path="/officer/applications" element={<OfficerDashboard />} />
            <Route path="/officer/applications/:id" element={<ApplicationDetail />} />
            <Route path="/bottlenecks" element={<Bottlenecks />} />
            <Route path="/reports" element={<Bottlenecks />} />
            <Route path="/audit" element={<AuditLog />} />
          </Route>

          {/* Institution portal */}
          <Route element={<AuthGuard allowedRoles={INSTITUTION} />}>
            <Route path="/institution/dashboard" element={<InstitutionDashboard />} />
          </Route>

          {/* Admin */}
          <Route element={<AuthGuard allowedRoles={ADMIN_ONLY} />}>
            <Route path="/admin/workflow" element={<WorkflowAdmin />} />
            <Route path="/admin/escalation" element={<WorkflowAdmin />} />
            <Route path="/admin/alert-rules" element={<WorkflowAdmin />} />
            <Route path="/admin/jobs" element={<WorkflowAdmin />} />
          </Route>
        </Route>
      </Route>

      <Route path="/403" element={<Forbidden />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
export default AppRoutes;
