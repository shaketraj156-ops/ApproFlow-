import axiosClient from '../api/axiosClient';
import mockApps from '../mocks/applications.json';
import mockStages from '../mocks/stages.json';
import { shouldUseMocks } from '../utils/mockConfig';

// Mock mode keeps its own copy so moves and reassignments survive navigation (and reset on reload).
const store = mockApps.map((a) => ({ ...a }));

const delay = (value, ms = 250) => new Promise((resolve) => setTimeout(() => resolve(value), ms));

function mockError(code, message) {
  const err = new Error(message);
  err.response = { status: 409, data: { error: { code, message } } };
  return err;
}

function getMockApplications(params = {}) {
  let filtered = store.map((a) => ({ ...a }));
  if (params.stage) filtered = filtered.filter((a) => a.current_stage_code === params.stage);
  if (params.region) filtered = filtered.filter((a) => a.region === params.region);
  if (params.search) {
    const s = params.search.toLowerCase();
    filtered = filtered.filter((a) =>
      a.application_number.toLowerCase().includes(s) ||
      (a.institution_name && a.institution_name.toLowerCase().includes(s))
    );
  }
  if (params.is_overdue === true) filtered = filtered.filter((a) => !a.decision && a.days_left < 0);
  filtered.sort((a, b) => b.priority_score - a.priority_score);
  return {
    items: filtered,
    total: filtered.length,
    page: params.page || 1,
    page_size: params.page_size || 20,
    pages: 1,
  };
}

export const applicationsService = {
  async getApplications(params = {}) {
    if (shouldUseMocks()) {
      return await delay(getMockApplications(params));
    }
    try {
      const response = await axiosClient.get('/applications', { params });
      return response.data;
    } catch (err) {
      console.warn('Backend getApplications failed, using mock data:', err.message);
      return await delay(getMockApplications(params));
    }
  },

  async getApplicationById(id) {
    if (shouldUseMocks()) {
      const app = store.find((a) => a.id === id);
      if (!app) {
        const err = new Error('Application not found');
        err.response = { status: 404, data: { error: { code: 'NOT_FOUND', message: `Application ${id} not found` } } };
        throw err;
      }
      return await delay({ ...app }, 150);
    }
    try {
      const response = await axiosClient.get(`/applications/${id}`);
      return response.data;
    } catch (err) {
      console.warn('Backend getApplicationById failed, using mock data:', err.message);
      const app = store.find((a) => a.id === id);
      if (app) return await delay({ ...app }, 150);
      throw err;
    }
  },


  async moveStage(id, payload) {
    if (shouldUseMocks()) {
      const app = store.find((a) => a.id === id);
      if (!app) throw mockError('NOT_FOUND', 'Application not found');
      const current = mockStages.find((s) => s.code === app.current_stage_code);
      const target = mockStages.find((s) => s.code === payload.to_stage);
      if (app.is_on_hold) throw mockError('INVALID_TRANSITION', 'Application is on hold; resume it before moving stages');
      if (app.decision) throw mockError('INVALID_TRANSITION', 'Application already has a final decision');
      if (!target || !current?.next_stages.includes(target.code)) {
        throw mockError('INVALID_TRANSITION', `Cannot move from ${app.current_stage_code} to ${payload.to_stage}`);
      }
      if (target.is_terminal && !payload.decision) {
        throw mockError('INVALID_TRANSITION', 'Moving to a terminal stage requires a decision');
      }
      if (payload.outcome === 'DEFICIENCY_FOUND') app.deficiency_count += 1;
      app.current_stage_code = target.code;
      app.updated_at = new Date().toISOString();
      if (target.is_terminal) {
        app.decision = payload.decision;
        app.days_left = null;
      } else {
        app.days_left = target.sla_days; // the server restarts the SLA clock for the new stage
      }
      return await delay({ ...app });
    }
    const response = await axiosClient.post(`/applications/${id}/move`, payload);
    return response.data;
  },

  async assignOfficer(id, officerId) {
    if (shouldUseMocks()) {
      const app = store.find((a) => a.id === id);
      if (!app) throw new Error('Application not found');
      app.owner_id = officerId;
      return await delay({ ...app }, 150);
    }
    const response = await axiosClient.post(`/applications/${id}/assign`, { officer_id: officerId });
    return response.data;
  },
};

