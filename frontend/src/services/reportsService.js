import axiosClient from '../api/axiosClient';
import mockKpis from '../mocks/kpis.json';
import mockFunnel from '../mocks/funnel.json';
import mockBottlenecks from '../mocks/bottlenecks.json';

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

const delay = (value, ms = 250) => new Promise((resolve) => setTimeout(() => resolve(value), ms));

export const reportsService = {
  async getKpis() {
    if (USE_MOCKS) {
      return await delay({ ...mockKpis });
    }
    const response = await axiosClient.get('/reports/kpis');
    return response.data;
  },

  async getFunnel() {
    if (USE_MOCKS) {
      return await delay(mockFunnel.map((r) => ({ ...r })));
    }
    const response = await axiosClient.get('/reports/funnel');
    return response.data;
  },

  async getBottlenecks() {
    if (USE_MOCKS) {
      return await delay(mockBottlenecks.map((r) => ({ ...r })));
    }
    const response = await axiosClient.get('/reports/bottlenecks');
    return response.data;
  },

  async getRegionalSummary() {
    if (USE_MOCKS) {
      const mockRegional = (await import('../mocks/regional.json')).default;
      return await delay(mockRegional.regional_summary);
    }
    const response = await axiosClient.get('/reports/region-summary');
    return response.data;
  },

  async getOfficerWorkload() {
    if (USE_MOCKS) {
      const mockRegional = (await import('../mocks/regional.json')).default;
      return await delay(mockRegional.officers_workload);
    }
    const response = await axiosClient.get('/reports/officer-workload');
    return response.data;
  },

  async getNationalKpis() {
    if (USE_MOCKS) {
      const mockRegional = (await import('../mocks/regional.json')).default;
      return mockRegional.national_kpis;
    }
    const response = await axiosClient.get('/reports/kpis');
    return response.data;
  },
};
