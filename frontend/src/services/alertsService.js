import axiosClient from '../api/axiosClient';
import mockAlerts from '../mocks/alerts.json';

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

export const alertsService = {
  async getAlerts(params = {}) {
    if (USE_MOCKS) {
      return mockAlerts;
    }
    const response = await axiosClient.get('/alerts', { params });
    return response.data;
  },

  async getSummary() {
    if (USE_MOCKS) {
      return {
        open_count: mockAlerts.length,
        critical_count: mockAlerts.filter(a => a.severity === 'CRITICAL').length,
        acknowledged_count: 0,
        total_active: mockAlerts.length
      };
    }
    const response = await axiosClient.get('/alerts/summary');
    return response.data;
  },

  async acknowledgeAlert(id) {
    if (USE_MOCKS) {
      return { success: true };
    }
    const response = await axiosClient.post(`/alerts/${id}/acknowledge`);
    return response.data;
  },

  async resolveAlert(id) {
    if (USE_MOCKS) {
      return { success: true };
    }
    const response = await axiosClient.post(`/alerts/${id}/resolve`);
    return response.data;
  }
};
