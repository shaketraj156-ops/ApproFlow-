export function getRoleLandingRoute(role, officerLevel) {
  if (role === 'system_admin') return '/admin/workflow';
  if (role === 'auditor') return '/audit';
  if (role === 'institution_admin' || role === 'institution_staff') return '/institution/dashboard';
  if (role === 'aicte_officer') {
    if (officerLevel === 'REGIONAL_HEAD') return '/region/dashboard';
    if (officerLevel === 'NATIONAL_HEAD') return '/national/dashboard';
    return '/officer/dashboard';
  }
  return '/officer/dashboard';
}
