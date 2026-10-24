import axiosClient from '../api/axiosClient';
import mockEvcData from '../mocks/evc.json';

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

// In-memory store for mock mutations
let visitsStore = [...mockEvcData.visits];
let expertsStore = [...mockEvcData.experts_pool];

export const evcService = {
  async getVisits() {
    if (USE_MOCKS) {
      return [...visitsStore];
    }
    const response = await axiosClient.get('/evc-visits');
    return response.data;
  },

  async getExperts() {
    if (USE_MOCKS) {
      return [...expertsStore];
    }
    const response = await axiosClient.get('/experts');
    return response.data;
  },

  async suggestCommittee(payload) {
    if (USE_MOCKS) {
      // Find candidate experts with matching region or availability
      const size = payload.committee_size || 3;
      const targetDate = payload.target_date || new Date().toISOString().split('T')[0];
      
      const available = expertsStore.filter(e => e.is_available);
      const selected = (available.length >= size ? available : expertsStore).slice(0, size);
      
      return [
        {
          scheduled_date: `${targetDate}T10:00:00Z`,
          experts: selected.map((exp, idx) => ({
            id: exp.id,
            name: exp.name,
            affiliation: exp.affiliation,
            specialization: exp.specialization,
            is_lead: idx === 0
          })),
          clash_detected: false
        }
      ];
    }
    const response = await axiosClient.post('/evc-visits/suggest', payload);
    return response.data;
  },

  async scheduleVisit(payload) {
    if (USE_MOCKS) {
      const newVisit = {
        id: `v-mock-${Date.now()}`,
        application_id: payload.application_id,
        application_number: payload.application_number || 'AICTE-2026-MANUAL',
        institution_name: payload.institution_name || 'Participating Institution',
        region: payload.region || 'NORTH',
        scheduled_date: `${payload.scheduled_date}T10:00:00Z`,
        status: 'PROPOSED',
        remarks: payload.remarks || 'Scheduled via ApproFlow EVC Wizard',
        lead_expert: payload.lead_expert_name || 'Assigned Lead Expert',
        experts: (payload.expert_ids || []).map((id, idx) => {
          const exp = expertsStore.find(e => e.id === id) || { name: `Expert ${idx+1}`, affiliation: 'IIT/NIT' };
          return {
            id,
            name: exp.name,
            affiliation: exp.affiliation,
            specialization: exp.specialization || 'Technical Domain',
            is_lead: id === payload.lead_expert_id || idx === 0
          };
        })
      };
      visitsStore = [newVisit, ...visitsStore];
      return newVisit;
    }
    const response = await axiosClient.post('/evc-visits', payload);
    return response.data;
  },

  async confirmVisit(id) {
    if (USE_MOCKS) {
      visitsStore = visitsStore.map(v => 
        v.id === id ? { ...v, status: 'CONFIRMED' } : v
      );
      return visitsStore.find(v => v.id === id);
    }
    const response = await axiosClient.post(`/evc-visits/${id}/confirm`);
    return response.data;
  }
};
