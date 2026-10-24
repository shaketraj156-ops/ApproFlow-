import axiosClient from '../api/axiosClient';
import mockStages from '../mocks/stages.json';

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

export const workflowService = {
  async getStages() {
    if (USE_MOCKS) {
      return mockStages;
    }
    const response = await axiosClient.get('/workflow/stages');
    return response.data;
  },

  async updateStage(code, payload) {
    if (USE_MOCKS) {
      return { code, ...payload };
    }
    const response = await axiosClient.put(`/workflow/stages/${code}`, payload);
    return response.data;
  }
};
