import { API_ENDPOINTS, fetchWithAuth } from '@/config/api';
import { Session } from '@supabase/supabase-js';

export interface StudyTimingRecord {
  session_id: string;
  activity_type: 'flashcard' | 'quiz' | 'exercise';
  start_time: string;
  end_time?: string;
  duration_seconds: number;
  activity_details?: {
    card_id?: number;
    quiz_step?: number;
    exercise_step?: number;
    rating?: string;
  };
}

export interface StudyTimingSession {
  session_id: string;
  total_study_time: number;
  flashcard_time: number;
  quiz_time: number;
  exercise_time: number;
  activities: StudyTimingRecord[];
}

/**
 * Start a new timing record for an activity
 */
export const startActivityTiming = async (
  sessionId: string,
  activityType: 'flashcard' | 'quiz' | 'exercise',
  activityDetails: any,
  session: Session | null
): Promise<{ success: boolean; timing_id?: string }> => {
  if (!session?.access_token) {
    console.error('No access token available for timing');
    return { success: false };
  }

  try {
    const response = await fetchWithAuth(
      API_ENDPOINTS.STUDY.TIMING.START,
      {
        method: 'POST',
        body: JSON.stringify({
          session_id: sessionId,
          activity_type: activityType,
          activity_details: activityDetails,
          start_time: new Date().toISOString()
        }),
      },
      session
    );

    if (response.success) {
      return {
        success: true,
        timing_id: response.data.timing_id
      };
    }

    return { success: false };
  } catch (error) {
    console.error('Failed to start activity timing:', error);
    return { success: false };
  }
};

/**
 * End a timing record for an activity
 */
export const endActivityTiming = async (
  timingId: string,
  durationSeconds: number,
  session: Session | null
): Promise<{ success: boolean }> => {
  if (!session?.access_token) {
    console.error('No access token available for timing');
    return { success: false };
  }

  try {
    const response = await fetchWithAuth(
      API_ENDPOINTS.STUDY.TIMING.END,
      {
        method: 'POST',
        body: JSON.stringify({
          timing_id: timingId,
          end_time: new Date().toISOString(),
          duration_seconds: durationSeconds
        }),
      },
      session
    );

    return { success: response.success };
  } catch (error) {
    console.error('Failed to end activity timing:', error);
    return { success: false };
  }
};

/**
 * Record a complete activity timing (for quick activities)
 */
export const recordActivityTiming = async (
  sessionId: string,
  activityType: 'flashcard' | 'quiz' | 'exercise',
  durationSeconds: number,
  activityDetails: any,
  session: Session | null
): Promise<{ success: boolean }> => {
  if (!session?.access_token) {
    console.error('No access token available for timing');
    return { success: false };
  }

  try {
    const response = await fetchWithAuth(
      API_ENDPOINTS.STUDY.TIMING.RECORD,
      {
        method: 'POST',
        body: JSON.stringify({
          session_id: sessionId,
          activity_type: activityType,
          duration_seconds: durationSeconds,
          activity_details: activityDetails,
          recorded_at: new Date().toISOString()
        }),
      },
      session
    );

    return { success: response.success };
  } catch (error) {
    console.error('Failed to record activity timing:', error);
    return { success: false };
  }
};

/**
 * Get study timing summary for a session
 */
export const getStudyTimingSummary = async (
  sessionId: string,
  session: Session | null
): Promise<{ success: boolean; data?: StudyTimingSession }> => {
  if (!session?.access_token) {
    console.error('No access token available for timing');
    return { success: false };
  }

  try {
    const response = await fetchWithAuth(
      API_ENDPOINTS.STUDY.TIMING.SUMMARY(sessionId),
      {
        method: 'GET',
      },
      session
    );

    if (response.success) {
      return {
        success: true,
        data: response.data
      };
    }

    return { success: false };
  } catch (error) {
    console.error('Failed to get timing summary:', error);
    return { success: false };
  }
};

/**
 * Update session timing totals
 */
export const updateSessionTiming = async (
  sessionId: string,
  totalStudyTime: number,
  flashcardTime: number,
  quizTime: number,
  exerciseTime: number,
  session: Session | null
): Promise<{ success: boolean }> => {
  if (!session?.access_token) {
    console.error('No access token available for timing');
    return { success: false };
  }

  try {
    const response = await fetchWithAuth(
      API_ENDPOINTS.STUDY.TIMING.UPDATE_SESSION,
      {
        method: 'POST',
        body: JSON.stringify({
          session_id: sessionId,
          total_study_time: totalStudyTime,
          flashcard_time: flashcardTime,
          quiz_time: quizTime,
          exercise_time: exerciseTime,
          updated_at: new Date().toISOString()
        }),
      },
      session
    );

    return { success: response.success };
  } catch (error) {
    console.error('Failed to update session timing:', error);
    return { success: false };
  }
};
