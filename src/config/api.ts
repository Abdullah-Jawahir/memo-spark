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
    TIMING: {
      START: `${API_BASE_URL}/api/study/timing/start`,
      END: `${API_BASE_URL}/api/study/timing/end`,
      RECORD: `${API_BASE_URL}/api/study/timing/record`,
      SUMMARY: (sessionId: string) => `${API_BASE_URL}/api/study/timing/summary/${sessionId}`,
    },
  },
  DECKS: {
    LIST: `${API_BASE_URL}/api/decks`,
    GENERATE_MATERIALS: (deckId: string | number) => `${API_BASE_URL}/api/decks/${deckId}/generate-materials`,
  },
  SEARCH_FLASHCARDS: {
    GENERATE: `${API_BASE_URL}/api/search-flashcards/generate`,
    JOB_STATUS: (jobId: string) => `${API_BASE_URL}/api/search-flashcards/job/${jobId}/status`,
    TOPICS: `${API_BASE_URL}/api/search-flashcards/topics`,
    HEALTH: `${API_BASE_URL}/api/search-flashcards/health`,
    HISTORY: `${API_BASE_URL}/api/search-flashcards/history`,
    SEARCH_DETAILS: (searchId: number) => `${API_BASE_URL}/api/search-flashcards/search/${searchId}`,
    RECENT: `${API_BASE_URL}/api/search-flashcards/recent`,
    STATS: `${API_BASE_URL}/api/search-flashcards/stats`,
    STUDY: {
      START_SESSION: `${API_BASE_URL}/api/search-flashcards/study/start-session`,
      RECORD_INTERACTION: `${API_BASE_URL}/api/search-flashcards/study/record-interaction`,
      COMPLETE_SESSION: `${API_BASE_URL}/api/search-flashcards/study/complete-session`,
      SESSION_DETAILS: (sessionId: number) => `${API_BASE_URL}/api/search-flashcards/study/session/${sessionId}`,
      STUDY_STATS: `${API_BASE_URL}/api/search-flashcards/study/stats`,
    },
    DIFFICULT_CARDS: {
      MARK: `${API_BASE_URL}/api/search-flashcards/difficult/mark`,
      MARK_REVIEWED: `${API_BASE_URL}/api/search-flashcards/difficult/reviewed`,
      MARK_RE_RATED: `${API_BASE_URL}/api/search-flashcards/difficult/re-rated`,
      GET_COUNT: `${API_BASE_URL}/api/search-flashcards/difficult/count`,
    },
    // New Review System (similar to regular flashcard reviews)
    REVIEWS: {
      RECORD_REVIEW: `${API_BASE_URL}/api/search-flashcards/record-review`,
      GET_DIFFICULT_COUNT: `${API_BASE_URL}/api/search-flashcards/difficult/count-from-reviews`,
    },
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
    // Check if the response is JSON before trying to parse it
    const contentType = response.headers.get('content-type');
    let errorData: any = {};

    if (contentType && contentType.includes('application/json')) {
      try {
        errorData = await response.json();
      } catch (e) {
        // If JSON parsing fails, use default error
        errorData = {};
      }
    } else {
      // If it's not JSON (e.g., HTML error page), get the text
      try {
        const textResponse = await response.text();
        console.error('Non-JSON error response status:', response.status);
        console.error('Non-JSON error response headers:', Object.fromEntries(response.headers.entries()));
        console.error('Non-JSON error response text:', textResponse.substring(0, 500)); // First 500 chars
        errorData = { message: `Server returned HTML error page (${response.status})` };
      } catch (e) {
        console.error('Failed to read error response text:', e);
        errorData = {};
      }
    }

    throw new Error(errorData.error || errorData.message || `API error: ${response.status}`);
  }

  return response.json();
};