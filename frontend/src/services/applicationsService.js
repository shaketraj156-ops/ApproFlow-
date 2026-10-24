import axiosClient from '../api/axiosClient';
import mockApps from '../mocks/applications.json';

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

export const applicationsService = {
  async getApplications(params = {}) {
    if (USE_MOCKS) {
      let filtered = [...mockApps];
      if (params.stage) {
        filtered = filtered.filter(a => a.current_stage_code === params.stage);
      }
      if (params.region) {
        filtered = filtered.filter(a => a.region === params.region);
      }
      if (params.search) {
        const s = params.search.toLowerCase();
        filtered = filtered.filter(a => 
          a.application_number.toLowerCase().includes(s) ||
          (a.institution_name && a.institution_name.toLowerCase().includes(s))
        );
      }
      return {
        items: filtered,
        total: filtered.length,
        page: params.page || 1,
        page_size: params.page_size || 20,
        pages: 1
      };
    }
    const response = await axiosClient.get('/applications', { params });
    return response.data;
  },

  async getApplicationById(id) {
    if (USE_MOCKS) {
      const app = mockApps.find(a => a.id === id) || mockApps[0];
      return app;
    }
    const response = await axiosClient.get(`/applications/${id}`);
    return response.data;
  },

  async moveStage(id, payload) {
    if (USE_MOCKS) {
      const app = mockApps.find(a => a.id === id) || mockApps[0];
      app.current_stage_code = payload.to_stage;
      return app;
    }
    const response = await axiosClient.post(`/applications/${id}/move`, payload);
    return response.data;
  }
};
