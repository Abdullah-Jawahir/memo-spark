import { API_ENDPOINTS, fetchWithAuth } from '@/config/api';
import { Session } from '@supabase/supabase-js';

const CURRENT_STUDY_SESSION_KEY = 'memo-spark-current-study-session';

export interface StudySession {
  session_id: string;
  deck_id: string;
  start_time: string;
  cards_studied: number;
  total_study_time: number;
  status: 'active' | 'completed';
}

/**
 * Start a new study session for a specific deck
 */
export const startStudySession = async (deckId: string, session: Session | null): Promise<StudySession | null> => {
  if (!session?.access_token) {
    console.error('No access token available');
    return null;
  }

  try {
    const data = await fetchWithAuth(
      API_ENDPOINTS.STUDY.START_SESSION,
      {
        method: 'POST',
        body: JSON.stringify({ deck_id: deckId }),
      },
      session
    );

    // Backend may return session under different shapes. Accept both { session: {...} } and {...}
    const sessionObj = data?.session || data;
    if (!sessionObj || (!sessionObj.session_id && !sessionObj.sessionId && !sessionObj.id)) {
      console.error('Unexpected start session response shape', data);
      return null;
    }

    // Normalize session id fields if necessary
    const normalizedSession = {
      session_id: sessionObj.session_id || sessionObj.sessionId || sessionObj.id,
      deck_id: sessionObj.deck_id || sessionObj.deckId || sessionObj.deck || deckId,
      start_time: sessionObj.start_time || sessionObj.started_at || new Date().toISOString(),
      cards_studied: sessionObj.cards_studied || sessionObj.cardsStudied || 0,
      total_study_time: sessionObj.total_study_time || sessionObj.totalStudyTime || 0,
      status: sessionObj.status || 'active',
    } as StudySession;

    // Store session info for tracking
    localStorage.setItem(CURRENT_STUDY_SESSION_KEY, JSON.stringify(normalizedSession));
    return normalizedSession;
  } catch (error) {
    console.error('Error starting study session:', error);
    return null;
  }
};

/**
 * Record a flashcard review with rating and study time
 */
export const recordFlashcardReview = async (
  studyMaterialId: string | number,
  rating: 'again' | 'hard' | 'good' | 'easy',
  studyTimeSeconds: number,
  session: Session | null
): Promise<{ success: boolean, sessionStats?: any }> => {
  if (!session?.access_token) {
    console.error('No access token available');
    return { success: false };
  }

  try {
    const currentSession = JSON.parse(localStorage.getItem(CURRENT_STUDY_SESSION_KEY) || '{}');

    if (!currentSession.session_id) {
      console.error('No active study session found');
      return { success: false };
    }

    const response = await fetchWithAuth(
      API_ENDPOINTS.STUDY.RECORD_REVIEW,
      {
        method: 'POST',
        body: JSON.stringify({
          study_material_id: studyMaterialId,
          rating: rating,
          study_time: studyTimeSeconds,
          session_id: currentSession.session_id
        }),
      },
      session
    );

    // Update session in local storage with incremented count
    currentSession.cards_studied = (currentSession.cards_studied || 0) + 1;
    currentSession.total_study_time = (currentSession.total_study_time || 0) + studyTimeSeconds;
    localStorage.setItem(CURRENT_STUDY_SESSION_KEY, JSON.stringify(currentSession));

    // Backend may return session stats under different keys
    const sessionStats = response.session_stats || response.sessionStats || response.stats || null;

    return {
      success: true,
      sessionStats: sessionStats
    };
  } catch (error) {
    console.error('Error recording flashcard review:', error);
    return { success: false };
  }
};

/**
 * Get the current active study session if any
 */
export const getCurrentStudySession = (): StudySession | null => {
  try {
    const sessionData = localStorage.getItem(CURRENT_STUDY_SESSION_KEY);
    if (!sessionData) return null;

    return JSON.parse(sessionData);
  } catch (error) {
    console.error('Error getting current study session:', error);
    return null;
  }
};

/**
 * Clear the current study session
 */
export const clearCurrentStudySession = (): void => {
  localStorage.removeItem(CURRENT_STUDY_SESSION_KEY);
};
