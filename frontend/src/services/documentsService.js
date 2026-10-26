import axiosClient from '../api/axiosClient';
import mockDocs from '../mocks/documents.json';
import { shouldUseMocks } from '../utils/mockConfig';

let docsStore = [...mockDocs];

export const documentsService = {
  async getDocuments(params = {}) {
    if (shouldUseMocks()) {
      let filtered = [...docsStore];
      if (params.status && params.status !== 'ALL') {
        filtered = filtered.filter(d => d.status === params.status);
      }
      if (params.institution_id) {
        filtered = filtered.filter(d => d.institution_id === params.institution_id);
      }
      return filtered;
    }
    try {
      const response = await axiosClient.get('/compliance-documents', { params });
      return response.data;
    } catch (err) {
      console.warn('Backend getDocuments failed, using mock data:', err.message);
      let filtered = [...docsStore];
      if (params.status && params.status !== 'ALL') {
        filtered = filtered.filter(d => d.status === params.status);
      }
      if (params.institution_id) {
        filtered = filtered.filter(d => d.institution_id === params.institution_id);
      }
      return filtered;
    }
  },


  async addDocument(payload) {
    if (shouldUseMocks()) {
      const now = new Date();
      const validUntilDate = new Date(payload.valid_until);
      const daysLeft = Math.ceil((validUntilDate - now) / (1000 * 60 * 60 * 24));
      
      let status = 'VALID';
      if (daysLeft <= 0) status = 'EXPIRED';
      else if (daysLeft <= 60) status = 'EXPIRING_SOON';

      const doc = {
        id: `doc-mock-${Date.now()}`,
        institution_id: payload.institution_id || 'inst-1',
        institution_name: payload.institution_name || 'Delhi Institute of Advanced Technology',
        region: payload.region || 'NORTH',
        title: payload.title,
        document_type: payload.document_type,
        valid_from: `${payload.valid_from}T00:00:00Z`,
        valid_until: `${payload.valid_until}T00:00:00Z`,
        days_remaining: daysLeft,
        status,
        storage_path: payload.storage_path || '/sample-document.pdf'
      };
      docsStore = [doc, ...docsStore];
      return doc;
    }
    const response = await axiosClient.post('/compliance-documents', payload);
    return response.data;
  }
};
