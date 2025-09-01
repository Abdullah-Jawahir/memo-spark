import { API_ENDPOINTS, fetchWithAuth } from '@/config/api';

export interface SearchFlashcardRequest {
  topic: string;
  description?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  count?: number;
}

export interface SearchFlashcardResponse {
  success: boolean;
  message: string;
  data: {
    job_id: string;
    status: string;
    message: string;
    estimated_time: string;
  };
}

export interface JobStatusResponse {
  success: boolean;
  message: string;
  data: {
    status: 'queued' | 'processing' | 'completed' | 'failed' | 'not_found';
    message: string;
    updated_at: string;
    topic: string;
    difficulty: string;
    count: number;
    user_id: string;
    search_id?: number; // Add search_id field
    result?: {
      topic: string;
      description: string;
      flashcards: Array<{
        id: number;
        question: string;
        answer: string;
        type: string;
        difficulty: string;
        order_index: number;
      }>;
      total_count: number;
      difficulty: string;
      message: string;
    };
    completed_at?: string;
  };
}

export interface SearchHistoryResponse {
  success: boolean;
  message: string;
  data: {
    current_page: number;
    data: Array<{
      id: number;
      topic: string;
      description: string;
      difficulty: string;
      status: string;
      flashcards_count: number;
      created_at: string;
      completed_at?: string;
      has_been_studied: boolean;
      study_stats?: {
        total_sessions: number;
        total_studied: number;
        total_correct: number;
        total_incorrect: number;
        average_score: number;
      };
    }>;
    total: number;
    last_page: number;
    per_page: number;
  };
}

export interface SearchDetailsResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
    topic: string;
    description: string;
    difficulty: string;
    status: string;
    flashcards: Array<{
      id: number;
      question: string;
      answer: string;
      type: string;
      difficulty: string;
      order_index: number;
    }>;
    flashcards_count: number;
  };
}

export interface RecentSearchesResponse {
  success: boolean;
  message: string;
  data: Array<{
    id: number;
    topic: string;
    description: string;
    difficulty: string;
    flashcards_count: number;
    created_at: string;
    completed_at?: string;
    has_been_studied: boolean;
    study_stats: {
      total_sessions: number;
      total_studied: number;
      total_correct: number;
      total_incorrect: number;
      average_score: number;
    };
  }>;
}

export interface SearchStatsResponse {
  success: boolean;
  message: string;
  data: {
    total_searches: number;
    completed_searches: number;
    failed_searches: number;
    recent_searches: number;
    total_flashcards: number;
    success_rate: number;
    popular_topics: Array<{
      topic: string;
      count: number;
    }>;
    difficulty_distribution: {
      beginner: { difficulty: string; count: number };
      intermediate: { difficulty: string; count: number };
      advanced: { difficulty: string; count: number };
    };
    period_days: number;
  };
}

export interface StudySessionRequest {
  search_id: number;
  total_flashcards: number;
}

export interface StudySessionResponse {
  success: boolean;
  message: string;
  data: {
    session_id: number;
    search_id: number;
    topic: string;
    total_flashcards: number;
    started_at: string;
  };
}

export interface StudyInteractionRequest {
  study_session_id: number;
  flashcard_id: number;
  result: 'correct' | 'incorrect' | 'skipped';
  time_spent: number;
  attempts?: number;
}

export interface StudyInteractionResponse {
  success: boolean;
  message: string;
  data: {
    record_id: number;
    result: string;
    time_spent: number;
    attempts: number;
    answered_at: string;
    session_complete: boolean;
    session_stats: {
      studied_flashcards: number;
      total_flashcards: number;
      correct_answers: number;
      incorrect_answers: number;
      completion_percentage: number;
      accuracy_percentage: number;
    };
  };
}

export interface StudyStatsResponse {
  success: boolean;
  message: string;
  data: {
    total_sessions: number;
    completed_sessions: number;
    recent_sessions: number;
    total_flashcards_studied: number;
    overall_accuracy: number;
    total_correct_answers: number;
    total_incorrect_answers: number;
    total_study_time_seconds: number;
    total_study_time_formatted: string;
    popular_topics: Array<{
      topic: string;
      sessions_count: number;
      total_flashcards: number;
      average_accuracy: number;
    }>;
    period_days: number;
  };
}

export class SearchFlashcardsService {
  private baseURL: string;

  constructor(baseURL: string = 'http://localhost:8000/api') {
    this.baseURL = baseURL;
  }

  async generateFlashcards(
    request: SearchFlashcardRequest,
    session: { access_token: string } | null
  ): Promise<SearchFlashcardResponse> {
    return fetchWithAuth(API_ENDPOINTS.SEARCH_FLASHCARDS.GENERATE, {
      method: 'POST',
      body: JSON.stringify(request),
    }, session);
  }

  async checkJobStatus(
    jobId: string,
    session: { access_token: string } | null
  ): Promise<JobStatusResponse> {
    return fetchWithAuth(API_ENDPOINTS.SEARCH_FLASHCARDS.JOB_STATUS(jobId), {}, session);
  }

  async getSuggestedTopics(
    session: { access_token: string } | null
  ): Promise<{ success: boolean; message: string; data: string[] }> {
    return fetchWithAuth(API_ENDPOINTS.SEARCH_FLASHCARDS.TOPICS, {}, session);
  }

  async checkHealth(
    session: { access_token: string } | null
  ): Promise<{ success: boolean; message: string; data: any }> {
    return fetchWithAuth(API_ENDPOINTS.SEARCH_FLASHCARDS.HEALTH, {}, session);
  }

  async getSearchHistory(
    params: {
      per_page?: number;
      page?: number;
      status?: string;
      topic?: string;
    } = {},
    session: { access_token: string } | null
  ): Promise<SearchHistoryResponse> {
    const queryString = new URLSearchParams(params as Record<string, string>).toString();
    const url = `${API_ENDPOINTS.SEARCH_FLASHCARDS.HISTORY}?${queryString}`;
    return fetchWithAuth(url, {}, session);
  }

  async getSearchDetails(
    searchId: number,
    session: { access_token: string } | null
  ): Promise<SearchDetailsResponse> {
    return fetchWithAuth(API_ENDPOINTS.SEARCH_FLASHCARDS.SEARCH_DETAILS(searchId), {}, session);
  }

  async getRecentSearches(
    params: { limit?: number; days?: number } = {},
    session: { access_token: string } | null
  ): Promise<RecentSearchesResponse> {
    const queryString = new URLSearchParams(params as Record<string, string>).toString();
    const url = `${API_ENDPOINTS.SEARCH_FLASHCARDS.RECENT}?${queryString}`;
    return fetchWithAuth(url, {}, session);
  }

  async getSearchStats(
    params: { days?: number } = {},
    session: { access_token: string } | null
  ): Promise<SearchStatsResponse> {
    const queryString = new URLSearchParams(params as Record<string, string>).toString();
    const url = `${API_ENDPOINTS.SEARCH_FLASHCARDS.STATS}?${queryString}`;
    return fetchWithAuth(url, {}, session);
  }

  // Study Session Methods
  async startStudySession(
    request: StudySessionRequest,
    session: { access_token: string } | null
  ): Promise<StudySessionResponse> {
    return fetchWithAuth(API_ENDPOINTS.SEARCH_FLASHCARDS.STUDY.START_SESSION, {
      method: 'POST',
      body: JSON.stringify(request),
    }, session);
  }

  async recordStudyInteraction(
    request: StudyInteractionRequest,
    session: { access_token: string } | null
  ): Promise<StudyInteractionResponse> {
    return fetchWithAuth(API_ENDPOINTS.SEARCH_FLASHCARDS.STUDY.RECORD_INTERACTION, {
      method: 'POST',
      body: JSON.stringify(request),
    }, session);
  }

  async completeStudySession(
    studySessionId: number,
    session: { access_token: string } | null
  ): Promise<{ success: boolean; message: string; data: any }> {
    return fetchWithAuth(API_ENDPOINTS.SEARCH_FLASHCARDS.STUDY.COMPLETE_SESSION, {
      method: 'POST',
      body: JSON.stringify({ study_session_id: studySessionId }),
    }, session);
  }

  async getStudySessionDetails(
    sessionId: number,
    session: { access_token: string } | null
  ): Promise<{ success: boolean; message: string; data: any }> {
    return fetchWithAuth(API_ENDPOINTS.SEARCH_FLASHCARDS.STUDY.SESSION_DETAILS(sessionId), {}, session);
  }

  async getStudyStats(
    params: { days?: number } = {},
    session: { access_token: string } | null
  ): Promise<StudyStatsResponse> {
    const queryString = new URLSearchParams(params as Record<string, string>).toString();
    const url = `${API_ENDPOINTS.SEARCH_FLASHCARDS.STUDY.STUDY_STATS}?${queryString}`;
    return fetchWithAuth(url, {}, session);
  }

  // Difficult Cards Management
  async markAsDifficult(
    searchId: number,
    flashcardId: number,
    session: { access_token: string } | null
  ): Promise<{ success: boolean; message: string; data?: any }> {
    return fetchWithAuth(API_ENDPOINTS.SEARCH_FLASHCARDS.DIFFICULT_CARDS.MARK, {
      method: 'POST',
      body: JSON.stringify({
        search_id: searchId,
        flashcard_id: flashcardId
      }),
    }, session);
  }

  async markAsReviewed(
    searchId: number,
    flashcardId: number,
    session: { access_token: string } | null
  ): Promise<{ success: boolean; message: string; data?: any }> {
    return fetchWithAuth(API_ENDPOINTS.SEARCH_FLASHCARDS.DIFFICULT_CARDS.MARK_REVIEWED, {
      method: 'POST',
      body: JSON.stringify({
        search_id: searchId,
        flashcard_id: flashcardId
      }),
    }, session);
  }

  async markAsReRated(
    searchId: number,
    flashcardId: number,
    finalRating: 'again' | 'hard' | 'good' | 'easy',
    session: { access_token: string } | null
  ): Promise<{ success: boolean; message: string; data?: any }> {
    return fetchWithAuth(API_ENDPOINTS.SEARCH_FLASHCARDS.DIFFICULT_CARDS.MARK_RE_RATED, {
      method: 'POST',
      body: JSON.stringify({
        search_id: searchId,
        flashcard_id: flashcardId,
        final_rating: finalRating
      }),
    }, session);
  }

  async getDifficultCardsCount(
    session: { access_token: string } | null,
    searchId?: number
  ): Promise<{ success: boolean; message: string; data?: { difficult_cards_count: number } }> {
    const queryString = searchId ? `?search_id=${searchId}` : '';
    const url = `${API_ENDPOINTS.SEARCH_FLASHCARDS.DIFFICULT_CARDS.GET_COUNT}${queryString}`;
    return fetchWithAuth(url, {}, session);
  }

  // New Review-Based System (similar to regular flashcard reviews)
  async recordReview(
    searchId: number,
    flashcardId: number,
    rating: 'again' | 'hard' | 'good' | 'easy',
    studyTime: number,
    sessionId?: string,
    session: { access_token: string } | null = null
  ): Promise<{ success: boolean; message: string; data?: any }> {
    return fetchWithAuth(API_ENDPOINTS.SEARCH_FLASHCARDS.REVIEWS.RECORD_REVIEW, {
      method: 'POST',
      body: JSON.stringify({
        search_id: searchId,
        flashcard_id: flashcardId,
        rating: rating,
        study_time: studyTime,
        session_id: sessionId
      }),
    }, session);
  }

  async getDifficultCardsCountFromReviews(
    session: { access_token: string } | null,
    searchId: number,
    sessionId?: string
  ): Promise<{ success: boolean; message: string; data?: { difficult_cards_count: number } }> {
    const params = new URLSearchParams({
      search_id: searchId.toString(),
      ...(sessionId && { session_id: sessionId })
    });
    const url = `${API_ENDPOINTS.SEARCH_FLASHCARDS.REVIEWS.GET_DIFFICULT_COUNT}?${params}`;
    return fetchWithAuth(url, {}, session);
  }
}

export default SearchFlashcardsService;
