import axiosClient from '../api/axiosClient';
import mockUndertakings from '../mocks/undertakings.json';

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

let undertakingsStore = [...mockUndertakings];

export const undertakingsService = {
  async getUndertakings(params = {}) {
    if (USE_MOCKS) {
      let filtered = [...undertakingsStore];
      if (params.status && params.status !== 'ALL') {
        filtered = filtered.filter(u => u.status === params.status);
      }
      if (params.application_id) {
        filtered = filtered.filter(u => u.application_id === params.application_id);
      }
      if (params.institution_id) {
        filtered = filtered.filter(u => u.institution_id === params.institution_id);
      }
      return filtered;
    }
    const response = await axiosClient.get('/undertakings', { params });
    return response.data;
  },

  async createUndertaking(payload) {
    if (USE_MOCKS) {
      const item = {
        id: `u-mock-${Date.now()}`,
        application_id: payload.application_id,
        application_number: payload.application_number || 'AICTE-2026-APP',
        institution_name: payload.institution_name || 'Institution Applicant',
        region: payload.region || 'NORTH',
        title: payload.title,
        description: payload.description,
        due_date: `${payload.due_date}T18:30:00Z`,
        status: 'PENDING',
        days_remaining: 30,
        document_path: null,
        remarks: null,
        created_at: new Date().toISOString()
      };
      undertakingsStore = [item, ...undertakingsStore];
      return item;
    }
    const response = await axiosClient.post('/undertakings', payload);
    return response.data;
  },

  async submitEvidence(id, payload) {
    if (USE_MOCKS) {
      undertakingsStore = undertakingsStore.map(u => 
        u.id === id ? { 
          ...u, 
          status: 'SUBMITTED', 
          document_path: payload.document_path || 'https://storage.supabase.co/aicte/evidence_submitted.pdf',
          remarks: payload.remarks || 'Evidence submitted by Institution'
        } : u
      );
      return undertakingsStore.find(u => u.id === id);
    }
    const response = await axiosClient.post(`/undertakings/${id}/submit`, payload);
    return response.data;
  },

  async verifyUndertaking(id, payload) {
    if (USE_MOCKS) {
      undertakingsStore = undertakingsStore.map(u => 
        u.id === id ? {
          ...u,
          status: payload.decision === 'VERIFIED' ? 'VERIFIED' : 'PENDING',
          remarks: payload.remarks || (payload.decision === 'VERIFIED' ? 'Compliance verified by AICTE Officer' : 'Deficiency not satisfied; rejected')
        } : u
      );
      return undertakingsStore.find(u => u.id === id);
    }
    const response = await axiosClient.post(`/undertakings/${id}/verify`, payload);
    return response.data;
  }
};
