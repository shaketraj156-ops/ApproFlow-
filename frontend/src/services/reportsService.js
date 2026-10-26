import axiosClient from '../api/axiosClient';
import mockKpis from '../mocks/kpis.json';
import mockFunnel from '../mocks/funnel.json';
import mockBottlenecks from '../mocks/bottlenecks.json';
import { shouldUseMocks } from '../utils/mockConfig';

const delay = (value, ms = 250) => new Promise((resolve) => setTimeout(() => resolve(value), ms));

export const reportsService = {
  async getKpis() {
    if (shouldUseMocks()) {
      return await delay({ ...mockKpis });
    }
    try {
      const response = await axiosClient.get('/reports/kpis');
      return response.data;
    } catch (err) {
      console.warn('Backend getKpis failed, using mock:', err.message);
      return await delay({ ...mockKpis });
    }
  },

  async getFunnel() {
    if (shouldUseMocks()) {
      return await delay(mockFunnel.map((r) => ({ ...r })));
    }
    try {
      const response = await axiosClient.get('/reports/funnel');
      return response.data;
    } catch (err) {
      console.warn('Backend getFunnel failed, using mock:', err.message);
      return await delay(mockFunnel.map((r) => ({ ...r })));
    }
  },

  async getBottlenecks() {
    if (shouldUseMocks()) {
      return await delay(mockBottlenecks.map((r) => ({ ...r })));
    }
    try {
      const response = await axiosClient.get('/reports/bottlenecks');
      return response.data;
    } catch (err) {
      console.warn('Backend getBottlenecks failed, using mock:', err.message);
      return await delay(mockBottlenecks.map((r) => ({ ...r })));
    }
  },

  async getRegionalSummary() {
    if (shouldUseMocks()) {
      const mockRegional = (await import('../mocks/regional.json')).default;
      return await delay(mockRegional.regional_summary);
    }
    try {
      const response = await axiosClient.get('/reports/region-summary');
      return response.data;
    } catch (err) {
      console.warn('Backend getRegionalSummary failed, using mock:', err.message);
      const mockRegional = (await import('../mocks/regional.json')).default;
      return await delay(mockRegional.regional_summary);
    }
  },

  async getOfficerWorkload() {
    if (shouldUseMocks()) {
      const mockRegional = (await import('../mocks/regional.json')).default;
      return await delay(mockRegional.officers_workload);
    }
    try {
      const response = await axiosClient.get('/reports/officer-workload');
      return response.data;
    } catch (err) {
      console.warn('Backend getOfficerWorkload failed, using mock:', err.message);
      const mockRegional = (await import('../mocks/regional.json')).default;
      return await delay(mockRegional.officers_workload);
    }
  },

  async getNationalKpis() {
    if (shouldUseMocks()) {
      const mockRegional = (await import('../mocks/regional.json')).default;
      return mockRegional.national_kpis;
    }
    try {
      const response = await axiosClient.get('/reports/kpis');
      return response.data;
    } catch (err) {
      console.warn('Backend getNationalKpis failed, using mock:', err.message);
      const mockRegional = (await import('../mocks/regional.json')).default;
      return mockRegional.national_kpis;
    }
  },
};

