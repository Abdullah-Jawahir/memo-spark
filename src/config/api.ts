export const API_BASE_URL = 'http://localhost:8000';

export const API_ENDPOINTS = {
  DOCUMENTS: {
    UPLOAD: `${API_BASE_URL}/api/documents/upload`,
    STATUS: (id: string) => `${API_BASE_URL}/api/documents/${id}/status`,
    GUEST_UPLOAD: `${API_BASE_URL}/api/guest/documents/upload`,
    GUEST_STATUS: (id: string) => `${API_BASE_URL}/api/guest/documents/${id}/status`,
  },
} as const; 