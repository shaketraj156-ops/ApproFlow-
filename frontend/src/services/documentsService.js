import axiosClient from '../api/axiosClient';
import mockDocs from '../mocks/documents.json';

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

let docsStore = [...mockDocs];

export const documentsService = {
  async getDocuments(params = {}) {
    if (USE_MOCKS) {
      let filtered = [...docsStore];
      if (params.status && params.status !== 'ALL') {
        filtered = filtered.filter(d => d.status === params.status);
      }
      if (params.institution_id) {
        filtered = filtered.filter(d => d.institution_id === params.institution_id);
      }
      return filtered;
    }
    const response = await axiosClient.get('/compliance-documents', { params });
    return response.data;
  },

  async addDocument(payload) {
    if (USE_MOCKS) {
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
        storage_path: payload.storage_path || 'https://storage.supabase.co/aicte/docs/uploaded_document.pdf'
      };
      docsStore = [doc, ...docsStore];
      return doc;
    }
    const response = await axiosClient.post('/compliance-documents', payload);
    return response.data;
  }
};
