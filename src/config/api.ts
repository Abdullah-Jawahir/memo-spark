export const API_BASE_URL = 'http://localhost:8000';

export const API_ENDPOINTS = {
  DOCUMENTS: {
    UPLOAD: `${API_BASE_URL}/api/documents/upload`,
    STATUS: (id: string) => `${API_BASE_URL}/api/documents/${id}/status`,
    GUEST_UPLOAD: `${API_BASE_URL}/api/guest/documents/upload`,
    GUEST_STATUS: (id: string) => `${API_BASE_URL}/api/guest/documents/${id}/status`,
  },
  DASHBOARD: {
    MAIN: `${API_BASE_URL}/api/dashboard`,
    USER_INFO: `${API_BASE_URL}/api/dashboard/user-info`,
    OVERVIEW: `${API_BASE_URL}/api/dashboard/overview`,
    RECENT_DECKS: `${API_BASE_URL}/api/dashboard/recent-decks`,
    TODAYS_GOAL: `${API_BASE_URL}/api/dashboard/todays-goal`,
    ACHIEVEMENTS: `${API_BASE_URL}/api/dashboard/achievements`,
  },
  STUDY: {
    START_SESSION: `${API_BASE_URL}/api/study/start-session`,
    RECORD_REVIEW: `${API_BASE_URL}/api/study/record-review`,
    STATS: `${API_BASE_URL}/api/study/stats`,
    RECENT_ACTIVITY: `${API_BASE_URL}/api/study/recent-activity`,
    DECK_MATERIALS: (deckId: string | number) => `${API_BASE_URL}/api/decks/${deckId}/materials`,
    ENRICH_MATERIALS: `${API_BASE_URL}/api/study/enrich-materials`,
  },
  DECKS: {
    LIST: `${API_BASE_URL}/api/decks`,
    GENERATE_MATERIALS: (deckId: string | number) => `${API_BASE_URL}/api/decks/${deckId}/generate-materials`,
  },
} as const;

// Helper function for authenticated API calls using fetch
export const fetchWithAuth = async (url: string, options: RequestInit = {}, session?: { access_token: string } | null) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${response.status}`);
  }

  return response.json();
};