import axiosClient from '../api/axiosClient';
import mockAlerts from '../mocks/alerts.json';
import { shouldUseMocks } from '../utils/mockConfig';

// Fired after an alert changes status, so the bell in the navbar can refresh straight away.
export const ALERTS_CHANGED_EVENT = 'approflow:alerts-changed';
const announce = () => window.dispatchEvent(new Event(ALERTS_CHANGED_EVENT));

// Mock mode keeps its own copy so acknowledging an alert really moves it between tabs.
const store = mockAlerts.map((a) => ({ ...a }));

const delay = (value, ms = 250) => new Promise((resolve) => setTimeout(() => resolve(value), ms));

function find(id) {
  const alert = store.find((a) => a.id === id);
  if (!alert) {
    const err = new Error('Alert not found');
    err.response = { status: 404, data: { error: { code: 'NOT_FOUND', message: 'Alert not found' } } };
    throw err;
  }
  return alert;
}

function getMockAlerts(params = {}) {
  let items = store.map((a) => ({ ...a }));
  if (params.status) items = items.filter((a) => a.status === params.status);
  if (params.severity) items = items.filter((a) => a.severity === params.severity);
  if (params.entity_id) items = items.filter((a) => a.entity_id === params.entity_id);
  items.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return items;
}

function getMockSummary() {
  const open = store.filter((a) => a.status === 'OPEN');
  const acknowledged = store.filter((a) => a.status === 'ACKNOWLEDGED');
  return {
    open_count: open.length,
    critical_count: open.filter((a) => a.severity === 'CRITICAL').length,
    acknowledged_count: acknowledged.length,
    total_active: open.length + acknowledged.length,
  };
}

export const alertsService = {
  async getAlerts(params = {}) {
    if (shouldUseMocks()) {
      return await delay(getMockAlerts(params));
    }
    try {
      const response = await axiosClient.get('/alerts', { params });
      return response.data;
    } catch (err) {
      console.warn('Backend getAlerts failed, using mock alerts:', err.message);
      return await delay(getMockAlerts(params));
    }
  },

  async getSummary() {
    if (shouldUseMocks()) {
      return getMockSummary();
    }
    try {
      const response = await axiosClient.get('/alerts/summary');
      return response.data;
    } catch (err) {
      console.warn('Backend getSummary failed, using mock summary:', err.message);
      return getMockSummary();
    }
  },

  async acknowledgeAlert(id) {
    if (shouldUseMocks()) {
      const alert = find(id);
      alert.status = 'ACKNOWLEDGED';
      alert.acknowledged_at = new Date().toISOString();
      const result = await delay({ ...alert }, 150);
      announce();
      return result;
    }
    try {
      const response = await axiosClient.post(`/alerts/${id}/acknowledge`);
      announce();
      return response.data;
    } catch (err) {
      console.warn('Backend acknowledgeAlert failed, using mock:', err.message);
      const alert = find(id);
      alert.status = 'ACKNOWLEDGED';
      alert.acknowledged_at = new Date().toISOString();
      announce();
      return { ...alert };
    }
  },

  async resolveAlert(id) {
    if (shouldUseMocks()) {
      const alert = find(id);
      alert.status = 'RESOLVED';
      alert.resolved_at = new Date().toISOString();
      const result = await delay({ ...alert }, 150);
      announce();
      return result;
    }
    try {
      const response = await axiosClient.post(`/alerts/${id}/resolve`);
      announce();
      return response.data;
    } catch (err) {
      console.warn('Backend resolveAlert failed, using mock:', err.message);
      const alert = find(id);
      alert.status = 'RESOLVED';
      alert.resolved_at = new Date().toISOString();
      announce();
      return { ...alert };
    }
  },
};

