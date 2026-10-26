import axiosClient from '../api/axiosClient';
import mockEvcData from '../mocks/evc.json';
import mockApps from '../mocks/applications.json';
import { istDateString } from '../utils/dates';
import { shouldUseMocks } from '../utils/mockConfig';

const delay = (value, ms = 220) => new Promise((resolve) => setTimeout(() => resolve(value), ms));

/** The error shape the rest of the app reads (`err.response.data.error.message`), for mock mode. */
function mockError(code, message, status = 409) {
  const err = new Error(message);
  err.response = { status, data: { error: { code, message } } };
  return err;
}

// ---------------------------------------------------------------------------
// The screen works with one shape. The API names a few things differently, so both sources are mapped here.
// ---------------------------------------------------------------------------
export function normalizeExpert(e) {
  return {
    ...e,
    affiliation: e.affiliation || null,
    specialization: e.specialization || e.domain || '—',
    load_count: e.load_count ?? e.current_load ?? 0,
    max_load: e.max_load ?? e.max_visits_per_cycle ?? 5,
    is_available: e.is_available ?? e.active ?? true,
  };
}

export function normalizeVisit(v) {
  return {
    ...v,
    scheduled_date: istDateString(v.scheduled_date),
    experts: (v.experts || []).map((x) => ({ ...normalizeExpert(x), is_lead: !!x.is_lead })),
  };
}

// ---------------------------------------------------------------------------
// Mock data, kept in memory so changes survive moving between pages (and reset on reload)
// ---------------------------------------------------------------------------
let visitsStore = mockEvcData.visits.map(normalizeVisit);
let expertsStore = mockEvcData.experts_pool.map((e) => ({ ...e }));

const findVisit = (id) => {
  const visit = visitsStore.find((v) => v.id === id);
  if (!visit) throw mockError('NOT_FOUND', 'EVC visit not found', 404);
  return visit;
};
const update = (id, patch) => {
  visitsStore = visitsStore.map((v) => (v.id === id ? { ...v, ...patch } : v));
  return visitsStore.find((v) => v.id === id);
};
const adjustLoad = (visit, step) => {
  const ids = new Set(visit.experts.map((x) => x.id));
  expertsStore = expertsStore.map((e) => (ids.has(e.id) ? { ...e, load_count: Math.max(0, e.load_count + step) } : e));
};
const addDays = (isoDate, n) => {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const isSunday = (isoDate) => new Date(`${isoDate}T00:00:00Z`).getUTCDay() === 0;

export const evcService = {
  async getVisits() {
    if (shouldUseMocks()) return delay(visitsStore.map((v) => ({ ...v })));
    try {
      const response = await axiosClient.get('/evc-visits');
      return response.data.map(normalizeVisit);
    } catch (err) {
      console.warn('Backend getVisits failed, using mock:', err.message);
      return delay(visitsStore.map((v) => ({ ...v })));
    }
  },

  async getExperts() {
    if (shouldUseMocks()) return delay(expertsStore.map((e) => normalizeExpert(e)));
    try {
      const response = await axiosClient.get('/experts');
      return response.data.map(normalizeExpert);
    } catch (err) {
      console.warn('Backend getExperts failed, using mock:', err.message);
      return delay(expertsStore.map((e) => normalizeExpert(e)));
    }
  },


  /** Up to three dates on which a full committee of free experts is available. */
  async suggestCommittee(payload) {
    if (shouldUseMocks()) {
      const size = payload.committee_size || 3;
      const app = mockApps.find((a) => a.id === payload.application_id);
      const today = istDateString(new Date());
      let day = payload.target_date && payload.target_date > today ? payload.target_date : today;
      const proposals = [];

      for (let checked = 0; checked < 14 && proposals.length < 3; checked += 1, day = addDays(day, 1)) {
        if (isSunday(day)) continue;
        const booked = new Set(
          visitsStore
            .filter((v) => v.scheduled_date === day && ['PROPOSED', 'CONFIRMED'].includes(v.status))
            .flatMap((v) => v.experts.map((x) => x.id))
        );
        const free = expertsStore
          .filter((e) => e.is_available && (!app || e.region === app.region) && !booked.has(e.id) && e.load_count < e.max_load)
          .sort((a, b) => a.load_count - b.load_count)
          .slice(0, size);
        if (free.length >= size) {
          proposals.push({
            scheduled_date: day,
            clash_detected: false,
            experts: free.map((e) => normalizeExpert(e)),
          });
        }
      }
      return delay(proposals, 350);
    }
    const response = await axiosClient.post('/evc-visits/suggest', payload);
    return response.data.map((p) => ({
      ...p,
      scheduled_date: istDateString(p.scheduled_date),
      experts: p.experts.map(normalizeExpert),
    }));
  },

  async scheduleVisit(payload) {
    if (shouldUseMocks()) {
      const today = istDateString(new Date());
      if (payload.scheduled_date < today) throw mockError('VALIDATION_ERROR', 'EVC visit date cannot be in the past', 422);
      if (isSunday(payload.scheduled_date)) throw mockError('VALIDATION_ERROR', 'EVC visits cannot be scheduled on a Sunday', 422);
      const visit = normalizeVisit({
        id: `v-mock-${Date.now()}`,
        application_id: payload.application_id,
        application_number: payload.application_number,
        institution_name: payload.institution_name,
        region: payload.region,
        scheduled_date: payload.scheduled_date,
        status: 'PROPOSED',
        remarks: payload.remarks || null,
        experts: (payload.expert_ids || []).map((id) => {
          const e = expertsStore.find((x) => x.id === id) || { id, name: 'Expert' };
          return { ...e, is_lead: id === payload.lead_expert_id };
        }),
      });
      visitsStore = [visit, ...visitsStore];
      return delay({ ...visit });
    }
    const response = await axiosClient.post('/evc-visits', {
      application_id: payload.application_id,
      scheduled_date: payload.scheduled_date,
      expert_ids: payload.expert_ids,
      lead_expert_id: payload.lead_expert_id || undefined,
      remarks: payload.remarks || undefined,
    });
    return normalizeVisit(response.data);
  },

  async confirmVisit(id) {
    if (shouldUseMocks()) {
      const visit = findVisit(id);
      if (visit.status !== 'PROPOSED') throw mockError('CONFLICT', `Only a PROPOSED visit can be confirmed (current status: ${visit.status})`);
      adjustLoad(visit, +1);
      return delay({ ...update(id, { status: 'CONFIRMED' }) }, 150);
    }
    const response = await axiosClient.post(`/evc-visits/${id}/confirm`);
    return normalizeVisit(response.data);
  },

  /** Moves the visit to a new date. It goes back to "awaiting confirmation". */
  async rescheduleVisit(id, scheduledDate, remarks) {
    if (shouldUseMocks()) {
      const visit = findVisit(id);
      if (!['PROPOSED', 'CONFIRMED'].includes(visit.status)) throw mockError('CONFLICT', `A ${visit.status} visit cannot be rescheduled`);
      if (scheduledDate < istDateString(new Date())) throw mockError('VALIDATION_ERROR', 'EVC visit date cannot be in the past', 422);
      if (isSunday(scheduledDate)) throw mockError('VALIDATION_ERROR', 'EVC visits cannot be scheduled on a Sunday', 422);
      if (visit.status === 'CONFIRMED') adjustLoad(visit, -1);
      return delay({ ...update(id, { scheduled_date: scheduledDate, status: 'PROPOSED', remarks: remarks || visit.remarks }) }, 150);
    }
    const response = await axiosClient.post(`/evc-visits/${id}/reschedule`, { scheduled_date: scheduledDate, remarks: remarks || undefined });
    return normalizeVisit(response.data);
  },

  async cancelVisit(id, reason) {
    if (shouldUseMocks()) {
      const visit = findVisit(id);
      if (!['PROPOSED', 'CONFIRMED'].includes(visit.status)) throw mockError('CONFLICT', `A ${visit.status} visit cannot be cancelled`);
      if (visit.status === 'CONFIRMED') adjustLoad(visit, -1);
      return delay({ ...update(id, { status: 'CANCELLED', remarks: visit.remarks ? `${visit.remarks}\nCancelled: ${reason}` : `Cancelled: ${reason}` }) }, 150);
    }
    const response = await axiosClient.post(`/evc-visits/${id}/cancel`, { reason });
    return normalizeVisit(response.data);
  },

  async completeVisit(id) {
    if (shouldUseMocks()) {
      const visit = findVisit(id);
      if (visit.status !== 'CONFIRMED') throw mockError('CONFLICT', `Only a CONFIRMED visit can be completed (current status: ${visit.status})`);
      if (visit.scheduled_date > istDateString(new Date())) throw mockError('CONFLICT', 'A visit cannot be completed before its scheduled date');
      return delay({ ...update(id, { status: 'COMPLETED' }) }, 150);
    }
    const response = await axiosClient.post(`/evc-visits/${id}/complete`);
    return normalizeVisit(response.data);
  },
};
