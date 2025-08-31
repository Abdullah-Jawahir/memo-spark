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
}

export default SearchFlashcardsService;
