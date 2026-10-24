import axiosClient from '../api/axiosClient';
import mockKpis from '../mocks/kpis.json';

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

export const reportsService = {
  async getKpis() {
    if (USE_MOCKS) {
      return mockKpis;
    }
    const response = await axiosClient.get('/reports/kpis');
    return response.data;
  },

  async getFunnel() {
    if (USE_MOCKS) {
      return [
        { stage_code: "SUBMITTED", stage_name: "Application Submitted", sequence_order: 1, application_count: 8, total_intake_requested: 480, avg_priority_score: 15.0 },
        { stage_code: "SCRUTINY", stage_name: "Document Scrutiny", sequence_order: 2, application_count: 14, total_intake_requested: 960, avg_priority_score: 42.5 },
        { stage_code: "RE_SCRUTINY", stage_name: "Deficiency Re-Scrutiny", sequence_order: 3, application_count: 6, total_intake_requested: 360, avg_priority_score: 64.0 },
        { stage_code: "EVC", stage_name: "Expert Visit Committee", sequence_order: 4, application_count: 7, total_intake_requested: 420, avg_priority_score: 78.2 },
        { stage_code: "REGIONAL_COMMITTEE", stage_name: "Regional Committee Review", sequence_order: 5, application_count: 4, total_intake_requested: 240, avg_priority_score: 80.0 },
        { stage_code: "SAC_SHC", stage_name: "Standing Hearing Committee", sequence_order: 6, application_count: 2, total_intake_requested: 120, avg_priority_score: 88.0 },
        { stage_code: "DECIDED", stage_name: "Final Decision Recorded", sequence_order: 7, application_count: 4, total_intake_requested: 240, avg_priority_score: 12.0 }
      ];
    }
    const response = await axiosClient.get('/reports/funnel');
    return response.data;
  },

  async getBottlenecks() {
    if (USE_MOCKS) {
      return [
        { region: "NORTH", stage_code: "SCRUTINY", stage_name: "Document Scrutiny", pending_count: 6, avg_days_in_stage: 9.2, breach_count: 1, breach_rate_pct: 16.6 },
        { region: "WEST", stage_code: "EVC", stage_name: "Expert Visit Committee", pending_count: 5, avg_days_in_stage: 18.5, breach_count: 3, breach_rate_pct: 60.0 },
        { region: "SOUTH", stage_code: "SCRUTINY", stage_name: "Document Scrutiny", pending_count: 4, avg_days_in_stage: 6.0, breach_count: 0, breach_rate_pct: 0.0 },
        { region: "EAST", stage_code: "EVC", stage_name: "Expert Visit Committee", pending_count: 3, avg_days_in_stage: 12.0, breach_count: 1, breach_rate_pct: 33.3 }
      ];
    }
    const response = await axiosClient.get('/reports/bottlenecks');
    return response.data;
  },

  async getRegionalSummary() {
    if (USE_MOCKS) {
      const mockRegional = (await import('../mocks/regional.json')).default;
      return mockRegional.regional_summary;
    }
    const response = await axiosClient.get('/reports/region-summary');
    return response.data;
  },

  async getOfficerWorkload() {
    if (USE_MOCKS) {
      const mockRegional = (await import('../mocks/regional.json')).default;
      return mockRegional.officers_workload;
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
  }
};

