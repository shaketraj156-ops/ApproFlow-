import axiosClient from '../api/axiosClient';
import mockStages from '../mocks/stages.json';
import { shouldUseMocks } from '../utils/mockConfig';

export const workflowService = {
  async getStages() {
    if (shouldUseMocks()) {
      return mockStages;
    }
    try {
      const response = await axiosClient.get('/workflow/stages');
      return response.data;
    } catch (err) {
      console.warn('Backend unavailable, falling back to mock stages:', err);
      return mockStages;
    }
  },

  async updateStage(code, payload) {
    if (shouldUseMocks()) {
      return { code, ...payload };
    }
    try {
      const response = await axiosClient.put(`/workflow/stages/${code}`, payload);
      return response.data;
    } catch (err) {
      console.warn('Backend updateStage failed, falling back to mock:', err);
      return { code, ...payload };
    }
  }
};

