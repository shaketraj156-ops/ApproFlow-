import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { AuthGuard } from './AuthGuard';
import { useAuth } from '../context/AuthContext';
import { getRoleLandingRoute } from './roleLanding';

// Pages
import { Login } from '../pages/auth/Login';
import { OfficerDashboard } from '../pages/officer/Dashboard';
import { ApplicationDetail } from '../pages/officer/ApplicationDetail';
import { Alerts } from '../pages/officer/Alerts';
import { Evc } from '../pages/officer/Evc';
import { Undertakings } from '../pages/officer/Undertakings';
import { Documents } from '../pages/officer/Documents';
import { Bottlenecks } from '../pages/bottlenecks/Bottlenecks';
import { RegionalDashboard } from '../pages/region/Dashboard';
import { NationalDashboard } from '../pages/national/Dashboard';
import { InstitutionDashboard } from '../pages/institution/Dashboard';
import { WorkflowAdmin } from '../pages/admin/WorkflowAdmin';
import { AuditLog } from '../pages/audit/AuditLog';
import { Forbidden, NotFound } from '../pages/errors/Forbidden';

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const landing = getRoleLandingRoute(user.role, user.officer_level);
  return <Navigate to={landing} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Login />} />
      <Route path="/" element={<RootRedirect />} />

      {/* Authenticated Dashboard Shell */}
      <Route element={<AuthGuard />}>
        <Route element={<AppShell />}>
          {/* Officer & Dedicated Operational Screens */}
          <Route path="/officer/dashboard" element={<OfficerDashboard />} />
          <Route path="/officer/applications" element={<OfficerDashboard />} />
          <Route path="/officer/applications/:id" element={<ApplicationDetail />} />
          <Route path="/officer/alerts" element={<Alerts />} />
          <Route path="/officer/evc" element={<Evc />} />
          <Route path="/officer/undertakings" element={<Undertakings />} />
          <Route path="/officer/documents" element={<Documents />} />
          
          {/* Regional & National Views */}
          <Route path="/region/dashboard" element={<RegionalDashboard />} />
          <Route path="/national/dashboard" element={<NationalDashboard />} />
          <Route path="/bottlenecks" element={<Bottlenecks />} />

          {/* Institution Portal */}
          <Route path="/institution/dashboard" element={<InstitutionDashboard />} />

          {/* Admin & Audit */}
          <Route path="/admin/workflow" element={<WorkflowAdmin />} />
          <Route path="/admin/escalation" element={<WorkflowAdmin />} />
          <Route path="/admin/alert-rules" element={<WorkflowAdmin />} />
          <Route path="/admin/jobs" element={<WorkflowAdmin />} />
          <Route path="/audit" element={<AuditLog />} />
          <Route path="/reports" element={<Bottlenecks />} />
        </Route>
      </Route>

      {/* Error Routes */}
      <Route path="/403" element={<Forbidden />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
export default AppRoutes;
