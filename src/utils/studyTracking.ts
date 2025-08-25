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

    // Store session info for tracking
    localStorage.setItem(CURRENT_STUDY_SESSION_KEY, JSON.stringify(data.session));
    return data.session;
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
): Promise<boolean> => {
  if (!session?.access_token) {
    console.error('No access token available');
    return false;
  }

  try {
    const currentSession = JSON.parse(localStorage.getItem(CURRENT_STUDY_SESSION_KEY) || '{}');

    if (!currentSession.session_id) {
      console.error('No active study session found');
      return false;
    }

    await fetchWithAuth(
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

    return true;
  } catch (error) {
    console.error('Error recording flashcard review:', error);
    return false;
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
