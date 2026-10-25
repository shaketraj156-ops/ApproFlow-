import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const ROLES = {
  OFFICER: 'aicte_officer',
  INSTITUTION: 'institution_admin',
  STAFF: 'institution_staff',
  AUDITOR: 'auditor',
  ADMIN: 'system_admin'
};

// Fictional demo people, one per role.
const DEMO_NAMES = {
  aicte_officer: 'Rajesh Kumar (Section Officer)',
  institution_admin: 'Meera Nair (Institution Admin)',
  institution_staff: 'Arjun Das (Institution Staff)',
  auditor: 'Kavita Rao (Auditor)',
  system_admin: 'Anil Mehta (System Admin)',
};

export function AuthProvider({ children }) {
  // Restore the demo session saved by loginAsRole. No saved session means signed out.
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('approflow_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      localStorage.removeItem('approflow_user'); // corrupted value: start signed out instead of crashing
      return null;
    }
  });

  const [loading, setLoading] = useState(false);

  const loginAsRole = (role, level = 'SECTION_OFFICER', region = 'NORTH') => {
    let mockProfile = {
      id: '00000000-0000-0000-0000-000000000001',
      email: `${role}@aicte.gov.in`,
      full_name: DEMO_NAMES[role] || 'Demo User',
      role: role,
      officer_level: level,
      region: region,
      institution_id: role.includes('institution') ? 'inst-1' : null
    };

    if (role === 'aicte_officer') {
      if (level === 'REGIONAL_HEAD') {
        mockProfile.full_name = `Dr. S. Sharma (Regional Head - ${region})`;
      } else if (level === 'NATIONAL_HEAD') {
        mockProfile.full_name = 'Member Secretary (National Head)';
        mockProfile.region = 'ALL';
      }
    }

    setUser(mockProfile);
    localStorage.setItem('approflow_user', JSON.stringify(mockProfile));
    localStorage.setItem('approflow_token', 'mock_jwt_token_approflow');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('approflow_user');
    localStorage.removeItem('approflow_token');
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginAsRole, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
