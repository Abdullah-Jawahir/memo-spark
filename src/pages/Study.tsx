import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  RotateCcw, Heart, X, Check, Volume2, BookOpen, Star, AlertCircle, UserPlus, Edit3,
  Clock, RefreshCw, CheckSquare, Layers as LayersIcon, Pencil as PencilIcon, CheckCircle, FileText, Loader2, Pause, Play, Square
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ThemeSwitcher from '@/components/layout/ThemeSwitcher';
import { AnimatePresence, motion } from 'framer-motion';
import StudyTimer from '@/components/study/StudyTimer';
import StudyStatsPanel from '@/components/study/StudyStatsPanel';
import { useTranslation } from 'react-i18next';
import { startStudySession, recordFlashcardReview, getCurrentStudySession, clearCurrentStudySession, startSearchStudySession, recordSearchStudyInteraction, completeSearchStudySession, getCurrentSearchStudySession, clearCurrentSearchStudySession } from '@/utils/studyTracking';
import { API_ENDPOINTS, fetchWithAuth } from '@/config/api';
import { useToast } from '@/hooks/use-toast';
import { downloadStudyProgressPDF } from '@/utils/pdfExport';
import SearchFlashcardsService from '@/integrations/searchFlashcardsService';

interface Flashcard {
  id: number;
  question: string;
  answer: string;
  difficulty: string;
  subject: string;
  type: string;
}

interface Quiz {
  type: string;
  answer: string;
  options: string[];
  question: string;
  difficulty: string;
  correct_answer_option: string;
}

interface Exercise {
  type: 'fill_blank' | 'true_false' | 'short_answer' | 'matching';
  instruction: string;
  exercise_text?: string;
  answer: string | Record<string, string>;
  difficulty: string;
  concepts?: string[];
  definitions?: string[];
}

interface GeneratedCard {
  id?: number;
  type: string;
  question: string;
  answer: string;
  difficulty: string;
}

interface GeneratedContent {
  flashcards?: GeneratedCard[];
  quizzes?: Quiz[];
  exercises?: Exercise[];
  [key: string]: unknown;
}

const Study = () => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [tab, setTab] = useState<'flashcards' | 'quiz' | 'exercises' | 'review'>('flashcards');
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    difficult: 0,
    timeSpent: 0
  });
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [flashcards, setFlashcards] = useState<GeneratedCard[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [sessionRatings, setSessionRatings] = useState<(null | 'again' | 'hard' | 'good' | 'easy')[]>([]);
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<(string | null)[]>([]);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [exerciseStep, setExerciseStep] = useState(0);
  const [exerciseAnswers, setExerciseAnswers] = useState<(string | Record<string, string> | null)[]>([]);
  const [exerciseCompleted, setExerciseCompleted] = useState(false);
  const [showExerciseAnswers, setShowExerciseAnswers] = useState(false);
  const [bookmarkedCards, setBookmarkedCards] = useState<number[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  const [materialsNotFound, setMaterialsNotFound] = useState(false);
  const [reviewedDifficult, setReviewedDifficult] = useState<Set<number>>(new Set());
  const [isLoadingFromStorage, setIsLoadingFromStorage] = useState(true); // Add this state for localStorage loading
  const [isQuizReviewMode, setIsQuizReviewMode] = useState(false); // Add this state for quiz review mode

  // Study tracking specific state
  const [studyTime, setStudyTime] = useState(0);  // Time spent on current activity (flashcards, quiz, exercises)
  const [overallStudyTime, setOverallStudyTime] = useState(0);  // Total time spent across all activities
  const [isStudying, setIsStudying] = useState(false);
  const [isTimerPaused, setIsTimerPaused] = useState(false);  // Manual pause state
  const [cardStudyStartTime, setCardStudyStartTime] = useState(0);
  const [studySession, setStudySession] = useState<any>(null);
  const [showStatsPanel, setShowStatsPanel] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const [overallTimerKey, setOverallTimerKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [ratingInProgress, setRatingInProgress] = useState<'again' | 'hard' | 'good' | 'easy' | null>(null);

  // Track which deck is currently loaded to avoid carrying session stats between decks
  const [currentDeckIdentifier, setCurrentDeckIdentifier] = useState<string | null>(null);

  // Ref used to skip the automatic reset when a tab change is initiated by 'Study Again'
  const skipResetOnTabChange = useRef(false);

  // Track if current card is being re-studied from review tab (for search flashcards)
  const [isReStudyingFromReview, setIsReStudyingFromReview] = useState(false);

  // Track which cards were originally marked as difficult (for search flashcards)
  const [difficultCardIds, setDifficultCardIds] = useState<Set<number>>(new Set());

  // Track which cards are currently being marked as reviewed (loading state)
  const [markingReviewed, setMarkingReviewed] = useState<Set<number>>(new Set());

  // Helper function to refresh difficult cards count for search flashcards
  const refreshDifficultCardsCount = async () => {
    try {
      const searchSessionInfo = localStorage.getItem('memo-spark-search-session-info');
      const isSearchFlashcardSession = !!searchSessionInfo; // Simplified check

      if (isSearchFlashcardSession && user && session) {
        const searchInfo = JSON.parse(searchSessionInfo);
        const searchService = new SearchFlashcardsService();

        // Use the new review-based count method with session ID for accurate session stats
        const countResponse = await searchService.getDifficultCardsCountFromReviews(
          session,
          searchInfo.search_id,
          searchInfo.session_id?.toString() // Use search session ID and convert to string
        );

        if (countResponse.success && countResponse.data) {
          setSessionStats(prev => ({
            ...prev,
            difficult: countResponse.data.difficult_cards_count
          }));
        }
      }
    } catch (error) {
      console.error('Failed to refresh difficult cards count:', error);
    }
  };

  // Helper function to load existing difficult cards for a search session
  const loadExistingDifficultCards = async (searchId: number) => {
    try {
      if (!session?.access_token) return;

      // Initialize empty set for tracking - the review system handles difficult card logic
      setDifficultCardIds(new Set());

      // Get overall difficult count from review system (not session-specific for initial load)
      const searchService = new SearchFlashcardsService();
      const countResponse = await searchService.getDifficultCardsCountFromReviews(
        session,
        searchId
        // Don't pass session_id here to get overall difficult count for this search
      );

      if (countResponse.success && countResponse.data) {
        setSessionStats(prev => ({
          ...prev,
          difficult: countResponse.data.difficult_cards_count
        }));
      }
    } catch (error) {
      console.error('Failed to load existing difficult cards:', error);
    }
  };

  const isGuestUser = !user && generatedContent !== null;

  // Memoized completion status to avoid calling function during render
  const isOverallComplete = useMemo(() => {
    // Only consider activities complete if they exist AND are completed
    const flashcardsComplete = flashcards.length > 0 && sessionComplete;
    const quizzesComplete = quizzes.length > 0 && quizCompleted;
    const exercisesComplete = exercises.length > 0 && exerciseCompleted;

    // All existing activities must be completed
    const hasContent = flashcards.length > 0 || quizzes.length > 0 || exercises.length > 0;
    if (!hasContent) return false;

    // Check completion based on what exists
    if (flashcards.length > 0 && !sessionComplete) return false;
    if (quizzes.length > 0 && !quizCompleted) return false;
    if (exercises.length > 0 && !exerciseCompleted) return false;

    return true;
  }, [sessionComplete, quizCompleted, exerciseCompleted, flashcards.length, quizzes.length, exercises.length]);

  const fetchMaterials = async (force = false) => {
    if (!session?.access_token) return;
    if (!force && (isLoadingMaterials || isRefreshing)) return;

    const deckId = searchParams.get('deckId');
    const deckName = searchParams.get('deck');
    let idToUse: string | null = deckId;

    setMaterialsNotFound(false);
    if (force) {
      setIsRefreshing(true);
    } else {
      setIsLoadingMaterials(true);
    }

    // Resolve deck id from name if missing
    if (!idToUse && deckName) {
      try {
        const listRes = await fetch(API_ENDPOINTS.DECKS.LIST, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (listRes.ok) {
          const decks = await listRes.json();
          const match = (decks || []).find((d: any) => d.name === deckName);
          if (match?.id) idToUse = String(match.id);
        }
      } catch (e) { console.error('Failed to resolve deck id from name', e); }
    }
    if (!idToUse) {
      setIsLoadingMaterials(false);
      setIsRefreshing(false);
      return;
    }
    try {
      const res = await fetch(API_ENDPOINTS.STUDY.DECK_MATERIALS(idToUse), {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error(`Failed to load deck materials (${res.status})`);
      const data = await res.json();
      const parsed: GeneratedContent = {
        flashcards: data.flashcards || [],
        quizzes: data.quizzes || [],
        exercises: data.exercises || [],
      };
      // Build an identifier for this deck (prefer id, fallback to name)
      const deckIdentifier = idToUse || deckName || null;

      // If the deck changed since last load, reset session-related state
      if (currentDeckIdentifier !== deckIdentifier) {
        // Reset session-level state so counts/time don't carry over
        setCurrentCard(0);
        setIsFlipped(false);
        setSessionStats({ correct: 0, difficult: 0, timeSpent: 0 });
        setSessionComplete(false);
        setReviewedDifficult(new Set());
        setStudyTime(0);
        setOverallStudyTime(0);
        setCardStudyStartTime(0);
        setIsStudying(false);
        setIsTimerPaused(false);
        setTimerKey(k => k + 1);
        setOverallTimerKey(k => k + 1);
        setBookmarkedCards([]);
        setQuizStep(0);
        setQuizAnswers([]);
        setQuizCompleted(false);
        setExerciseStep(0);
        setExerciseAnswers([]);
        setExerciseCompleted(false);
        // Clear any persisted study session to avoid submitting reviews to the wrong session
        try { localStorage.removeItem('memo-spark-current-study-session'); } catch (e) { /* ignore */ }
        setStudySession(null);
        setCurrentDeckIdentifier(deckIdentifier);
      }

      setGeneratedContent(parsed);
      setFlashcards(parsed.flashcards || []);
      const normalizedQuizzes = (parsed.quizzes || []).map((q: any) => ({
        ...q,
        correct_answer_option: q.correct_answer_option ?? q.correct_answer ?? q.answer ?? q.correctOption ?? q.correct ?? '',
      }));
      setQuizzes(normalizedQuizzes);
      setExercises(parsed.exercises || []);
      // Ensure sessionRatings matches the new flashcards length
      setSessionRatings(Array(parsed.flashcards?.length || 0).fill(null));

      if ((!parsed.flashcards || parsed.flashcards.length === 0) &&
        (!parsed.quizzes || parsed.quizzes.length === 0) &&
        (!parsed.exercises || parsed.exercises.length === 0)) {
        setMaterialsNotFound(true);
      }

      if (user && parsed.flashcards?.length) {
        setIsStudying(true);
        startStudySession(idToUse, session)
          .then(sessionData => {
            if (sessionData) {
              setStudySession(sessionData);
              setIsStudying(true);
              setCardStudyStartTime(0);
            }
          })
          .catch(error => console.error('Failed to start study session:', error));
      } else if (!user && parsed.flashcards?.length) {
        setIsStudying(true);
      }

      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
      setMaterialsNotFound(true);
    } finally {
      setIsLoadingMaterials(false);
      setIsRefreshing(false);
      // Ensure the overall loading gate is cleared after network fetch
      setIsLoadingFromStorage(false);
    }
  };

  // Function to enrich materials with database IDs
  const enrichMaterialsWithIds = async (materials: GeneratedContent, deckName: string) => {
    if (!user || !session?.access_token) {
      return materials; // For guest users, return as-is
    }

    try {
      const response = await fetchWithAuth(
        API_ENDPOINTS.STUDY.ENRICH_MATERIALS,
        {
          method: 'POST',
          body: JSON.stringify({
            deck_name: deckName,
            materials: materials
          }),
        },
        session
      );

      if (response.success) {
        return {
          flashcards: response.materials.flashcards || [],
          quizzes: response.materials.quizzes || [],
          exercises: response.materials.exercises || [],
        };
      } else {
        console.warn('Failed to enrich materials, using original data');
        return materials;
      }
    } catch (error) {
      console.error('Error enriching materials:', error);
      return materials; // Return original materials if enrichment fails
    }
  };

  // Function to handle tab switching with timer resumption
  const handleTabSwitch = (newTab: 'flashcards' | 'quiz' | 'exercises' | 'review') => {
    // If timer is paused (from flashcard completion) and switching to quiz/exercises/review, resume timer
    if (isTimerPaused && (newTab === 'quiz' || newTab === 'exercises' || newTab === 'review')) {
      console.log('Timer resuming due to tab switch to:', newTab);
      setIsTimerPaused(false);
    }

    setTab(newTab);
  }; useEffect(() => {
    // Initial load only
    const data = localStorage.getItem('generatedContent');
    const searchFlashcardsData = localStorage.getItem('memo-spark-study-flashcards');
    const deckId = searchParams.get('deckId');
    const deckName = searchParams.get('deck');
    const source = searchParams.get('source');
    const searchId = searchParams.get('search_id'); // Get search_id from URL for session persistence

    // Async function to handle search flashcard restoration
    const handleSearchFlashcardSession = async () => {
      // Try to get search flashcards data from localStorage or existing session info
      let parsedSearchData = null;

      if (searchFlashcardsData) {
        try {
          parsedSearchData = JSON.parse(searchFlashcardsData);
        } catch (error) {
          console.error('Failed to parse search flashcards data:', error);
          localStorage.removeItem('memo-spark-study-flashcards');
        }
      }

      // If no localStorage data but we have search_id, try to restore from previous session
      if (!parsedSearchData && searchId) {
        if (!session?.access_token) {
          // Don't set loading to false yet, we need to wait for session
          return false;
        }

        try {
          const searchService = new SearchFlashcardsService();
          const searchDetailsResponse = await searchService.getSearchDetails(parseInt(searchId), session);

          if (searchDetailsResponse.success && searchDetailsResponse.data.flashcards) {
            parsedSearchData = {
              flashcards: searchDetailsResponse.data.flashcards.map((card: any, index: number) => ({
                id: card.id || (index + 1),
                question: card.question,
                answer: card.answer,
                difficulty: card.difficulty,
                subject: searchDetailsResponse.data.topic,
                type: card.type || 'Q&A'
              })),
              source: 'search_flashcards',
              topic: searchDetailsResponse.data.topic,
              search_id: parseInt(searchId),
              timestamp: new Date().toISOString()
            };
            // Store the restored data in localStorage for future use
            localStorage.setItem('memo-spark-study-flashcards', JSON.stringify(parsedSearchData));
          }
        } catch (error) {
          console.error('Failed to restore search flashcard session:', error);
        }
      }

      if (parsedSearchData && parsedSearchData.flashcards && parsedSearchData.flashcards.length > 0) {
        // Clear any previous search session data to ensure fresh start
        try {
          localStorage.removeItem('memo-spark-search-session-info');
          localStorage.removeItem('memo-spark-current-search-study-session');
        } catch (e) {
          console.warn('Failed to clear previous search session data:', e);
        }

        // Set up search flashcards
        setGeneratedContent({
          flashcards: parsedSearchData.flashcards,
          quizzes: [],
          exercises: []
        });
        setFlashcards(parsedSearchData.flashcards);
        setQuizzes([]);
        setExercises([]);
        setSessionRatings(Array(parsedSearchData.flashcards.length).fill(null));
        setIsStudying(true);
        setCurrentDeckIdentifier(`search-${parsedSearchData.topic}`);

        // Reset session stats for fresh start
        setSessionStats({ correct: 0, difficult: 0, timeSpent: 0 });
        setReviewedDifficult(new Set());
        setDifficultCardIds(new Set());

        setIsLoadingFromStorage(false);
        setLastUpdated(new Date());

        // Store search session info immediately (even without authentication)
        localStorage.setItem('memo-spark-search-session-info', JSON.stringify({
          search_id: parsedSearchData.search_id,
          topic: parsedSearchData.topic,
          session_id: null // Will be updated when authenticated session starts
        }));

        // Start study session for search flashcards
        if (session?.access_token && parsedSearchData.search_id) {
          startSearchStudySession(parsedSearchData.search_id, parsedSearchData.flashcards.length, session)
            .then(sessionData => {
              if (sessionData) {
                setStudySession(sessionData);
                // Update search session info with session details
                const existingInfo = JSON.parse(localStorage.getItem('memo-spark-search-session-info') || '{}');
                localStorage.setItem('memo-spark-search-session-info', JSON.stringify({
                  ...existingInfo,
                  session_id: sessionData.session_id
                }));
                // Also store in the utility function's expected key
                localStorage.setItem('memo-spark-current-search-study-session', JSON.stringify({
                  session_id: sessionData.session_id,
                  search_id: parsedSearchData.search_id,
                  topic: parsedSearchData.topic,
                  total_flashcards: parsedSearchData.flashcards.length,
                  started_at: new Date().toISOString()
                }));

                // DO NOT load existing difficult cards for fresh session
                // Instead, keep the fresh stats we already set
              }
            })
            .catch(console.error);
        }

        // Don't clean up search flashcards data when using query parameter persistence
        // Only clean up if there's no search_id in URL (temporary sessions)
        if (!searchId) {
          setTimeout(() => {
            localStorage.removeItem('memo-spark-study-flashcards');
          }, 1000);
        }

        return true; // Return true to indicate search flashcards were loaded
      }

      setIsLoadingFromStorage(false);
      return false; // Return false if no search flashcards were loaded
    };

    // Check for search flashcards first
    if (source === 'search_flashcards') {
      handleSearchFlashcardSession().then(searchFlashcardsLoaded => {
        if (searchFlashcardsLoaded) {
          return; // Exit early since we loaded search flashcards
        }
        // If we didn't load search flashcards, continue with regular flow
        // setIsLoadingFromStorage(false) is already called inside handleSearchFlashcardSession
      }).catch(error => {
        console.error('Error handling search flashcard session:', error);
        setIsLoadingFromStorage(false);
      });
      return; // Exit useEffect early for search flashcards
    }

    if (deckId || deckName) {
      // If no session/token yet, avoid being stuck in loading
      if (!session?.access_token) {
        setIsLoadingFromStorage(false);
        // Optional: mark as not found so the CTA displays if no local data
        if (!data) setMaterialsNotFound(true);
      } else {
        fetchMaterials(false);
      }
    } else if (data) {
      const parsed: GeneratedContent = JSON.parse(data);

      // Check if materials need to be enriched with IDs (for authenticated users)
      if (user && session?.access_token) {
        // Try to get deck name from localStorage or use a default
        const deckNameFromStorage = localStorage.getItem('currentDeckName');
        if (deckNameFromStorage) {
          enrichMaterialsWithIds(parsed, deckNameFromStorage)
            .then(enrichedMaterials => {
              // If the deck changed, reset session state to avoid carrying stats
              const deckIdentifier = deckNameFromStorage || searchParams.get('deckId') || 'enriched-generated';
              if (currentDeckIdentifier !== deckIdentifier) {
                setCurrentCard(0);
                setIsFlipped(false);
                setSessionStats({ correct: 0, difficult: 0, timeSpent: 0 });
                setSessionComplete(false);
                setReviewedDifficult(new Set());
                setStudyTime(0);
                setOverallStudyTime(0);
                setCardStudyStartTime(0);
                setIsStudying(false);
                setTimerKey(k => k + 1);
                setOverallTimerKey(k => k + 1);
                setBookmarkedCards([]);
                setQuizStep(0);
                setQuizAnswers([]);
                setQuizCompleted(false);
                setExerciseStep(0);
                setExerciseAnswers([]);
                setExerciseCompleted(false);
                // Clear persisted study session and in-memory session to avoid stale session_id
                try { localStorage.removeItem('memo-spark-current-study-session'); } catch (e) { /* ignore */ }
                setStudySession(null);
                setCurrentDeckIdentifier(deckIdentifier);
              }

              setGeneratedContent(enrichedMaterials);
              setFlashcards(enrichedMaterials.flashcards || []);
              const normalizedEnrichedQuizzes = (enrichedMaterials.quizzes || []).map((q: any) => ({
                ...q,
                correct_answer_option: q.correct_answer_option ?? q.correct_answer ?? q.answer ?? q.correctOption ?? q.correct ?? '',
              }));
              setQuizzes(normalizedEnrichedQuizzes);
              setExercises(enrichedMaterials.exercises || []);
              setSessionRatings(Array(enrichedMaterials.flashcards?.length || 0).fill(null));

              if (enrichedMaterials.flashcards?.length) {
                setIsStudying(true);
                startStudySession(deckNameFromStorage, session)
                  .then(sessionData => { if (sessionData) setStudySession(sessionData); })
                  .catch(console.error);
              }
              setLastUpdated(new Date());
              setIsLoadingFromStorage(false); // Set loading to false after data is loaded
            })
            .catch(error => {
              console.error('Failed to enrich materials, using original data:', error);
              // Fallback to original materials
              setupOriginalMaterials(parsed);
            });
        } else {
          // No deck name available, use original materials
          setupOriginalMaterials(parsed);
        }
      } else {
        // Guest user or no session, use original materials
        setupOriginalMaterials(parsed);
      }
    } else {
      // No data in localStorage, set loading to false
      setIsLoadingFromStorage(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]); // Add session dependency to re-run when authentication is available

  // Cleanup effect to remove search flashcards data when unmounting
  useEffect(() => {
    return () => {
      // Get current URL parameters to check if this is a persistent search session
      const currentSearchParams = new URLSearchParams(window.location.search);
      const isSearchFlashcardSession = currentSearchParams.get('source') === 'search_flashcards';
      const hasSearchId = !!currentSearchParams.get('search_id');

      // Only clean up localStorage if this is NOT a persistent search session
      // Persistent sessions (with search_id) should maintain their localStorage for reload support
      if (!isSearchFlashcardSession || !hasSearchId) {
        // Clean up search flashcards data when component unmounts
        localStorage.removeItem('memo-spark-study-flashcards');
        // Also clean up session info for non-persistent sessions
        localStorage.removeItem('memo-spark-search-session-info');
        localStorage.removeItem('memo-spark-current-search-study-session');
      }
    };
  }, []);

  // Helper function to setup original materials
  const setupOriginalMaterials = (parsed: GeneratedContent) => {
    // Determine an identifier for these locally stored materials
    const deckIdentifier = searchParams.get('deckId') || searchParams.get('deck') || localStorage.getItem('currentDeckName') || 'local-generated';

    // If we've switched decks, reset session state so stats/time don't carry over
    if (currentDeckIdentifier !== deckIdentifier) {
      setCurrentCard(0);
      setIsFlipped(false);
      setSessionStats({ correct: 0, difficult: 0, timeSpent: 0 });
      setSessionComplete(false);
      setReviewedDifficult(new Set());
      setDifficultCardIds(new Set()); // Reset difficult cards tracking
      setIsReStudyingFromReview(false); // Reset re-studying flag
      setStudyTime(0);
      setOverallStudyTime(0);
      setCardStudyStartTime(0);
      setIsStudying(false);
      setTimerKey(k => k + 1);
      setOverallTimerKey(k => k + 1);
      setBookmarkedCards([]);
      setQuizStep(0);
      setQuizAnswers([]);
      setQuizCompleted(false);
      setExerciseStep(0);
      setExerciseAnswers([]);
      setExerciseCompleted(false);
      // Clear persisted study session and in-memory session to avoid submitting reviews to a stale session
      try { localStorage.removeItem('memo-spark-current-study-session'); } catch (e) { /* ignore */ }
      setStudySession(null);
      setCurrentDeckIdentifier(deckIdentifier);
    }

    setGeneratedContent(parsed);
    setFlashcards(parsed.flashcards || []);
    const normalizedLocalQuizzes = (parsed.quizzes || []).map((q: any) => ({
      ...q,
      correct_answer_option: q.correct_answer_option ?? q.correct_answer ?? q.answer ?? q.correctOption ?? q.correct ?? '',
    }));
    setQuizzes(normalizedLocalQuizzes);
    setExercises(parsed.exercises || []);
    setSessionRatings(Array(parsed.flashcards?.length || 0).fill(null));

    if (user && session && parsed.flashcards?.length) {
      const legacyDeckId = searchParams.get('deck') || 'default-deck';
      setIsStudying(true);
      startStudySession(legacyDeckId, session)
        .then(sessionData => { if (sessionData) setStudySession(sessionData); })
        .catch(console.error);
    } else if (!user && parsed.flashcards?.length) {
      setIsStudying(true);
    }
    setLastUpdated(new Date());
    setIsLoadingFromStorage(false); // Set loading to false after setup is complete
  };
  const currentCardData = flashcards[currentCard];
  const progress = flashcards.length > 0 ? ((currentCard + 1) / flashcards.length) * 100 : 0;

  // Update session stats when study time changes
  useEffect(() => {
    setSessionStats(prev => ({ ...prev, timeSpent: studyTime }));

    // Add this to debug the study time issue
    if (studyTime > 0 && !isStudying && !sessionComplete) {
      setIsStudying(true);
    }
  }, [studyTime, isStudying, sessionComplete]);

  // Track overall study time across all tabs and activities
  useEffect(() => {
    // Setup interval for overall study timer
    let timer: NodeJS.Timeout | null = null;

    // Continue timer until ALL activities are complete, not just flashcards
    // Also respect manual pause state
    if (isStudying && !isOverallComplete && !isTimerPaused) {
      timer = setInterval(() => {
        setOverallStudyTime(prevTime => prevTime + 1);
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isStudying, isOverallComplete, isTimerPaused]); // Watch all completion states and pause state

  // Track current activity time (resets on tab change by separate effect)
  useEffect(() => {
    let activityTimer: NodeJS.Timeout | null = null;

    const isFlashcardsActive = tab === 'flashcards' && flashcards.length > 0 && !sessionComplete;
    const isQuizActive = tab === 'quiz' && quizzes.length > 0 && !quizCompleted;
    const isExercisesActive = tab === 'exercises' && exercises.length > 0 && !exerciseCompleted;

    const isActivityRunning = isFlashcardsActive || isQuizActive || isExercisesActive;

    // Only run timer if activity is running AND not manually paused
    if (isActivityRunning && !isTimerPaused) {
      // Ensure the overall session is considered active while any activity runs
      if (!isStudying) setIsStudying(true);

      activityTimer = setInterval(() => {
        setStudyTime(prev => prev + 1);
      }, 1000);
    }

    // Reset re-studying flag when switching away from flashcards tab (unless via Study Again button)
    if (tab !== 'flashcards' && !skipResetOnTabChange.current) {
      setIsReStudyingFromReview(false);
    }

    // Reset the skip flag after processing
    skipResetOnTabChange.current = false;

    return () => {
      if (activityTimer) clearInterval(activityTimer);
    };
  }, [tab, flashcards.length, quizzes.length, exercises.length, sessionComplete, quizCompleted, exerciseCompleted, isStudying, isTimerPaused]);

  // Stop the overall timer when all activities are complete
  useEffect(() => {
    if (isOverallComplete && isStudying) {
      setIsStudying(false); // Stop the overall timer
    }
  }, [isOverallComplete, isStudying]);

  // Initialize the study session when component mounts
  useEffect(() => {
    // Try to restore an existing study session
    const existingSession = getCurrentStudySession();
    if (existingSession) {
      setStudySession(existingSession);
      setIsStudying(true);
    }
  }, []);

  // Cleanup localStorage when component unmounts (only for guest users)
  useEffect(() => {
    return () => {
      if (isGuestUser) {
        setTimeout(() => {
          localStorage.removeItem('generatedContent');
        }, 1000);
      }
    };
  }, [isGuestUser]);

  // Reset quiz state when quizzes change or tab switches
  useEffect(() => {
    setQuizStep(0);
    setQuizAnswers(Array(quizzes.length).fill(null));
    setQuizCompleted(false);
    setIsQuizReviewMode(false); // Reset quiz review mode
  }, [quizzes, tab]);

  // Reset exercise state when exercises change or tab switches
  useEffect(() => {
    setExerciseStep(0);
    setExerciseAnswers(Array(exercises.length).fill(null));
    setExerciseCompleted(false);
    setShowExerciseAnswers(false);
  }, [exercises, tab]);

  // Reset session stats when switching between content types, but preserve
  // counts when entering the review tab (we want to keep correct/difficult)
  useEffect(() => {
    // If a caller explicitly set the skip flag (e.g. Study Again button), preserve counts
    if (skipResetOnTabChange.current) {
      // Ensure timeSpent stays in sync but preserve correct/difficult counts
      setSessionStats(prev => ({
        correct: prev.correct, // Explicitly preserve correct count
        difficult: prev.difficult, // Explicitly preserve difficult count
        timeSpent: studyTime
      }));
      // Clear the flag for future tab changes
      skipResetOnTabChange.current = false;
      return;
    }

    // Preserve stats when switching between flashcards and review tabs
    if (tab === 'review' || tab === 'flashcards') {
      // When moving into the review flow or back to flashcards, keep the existing correct/difficult
      // counts but ensure the displayed timeSpent matches the current studyTime.
      setSessionStats(prev => ({
        correct: prev.correct, // Explicitly preserve correct count
        difficult: prev.difficult, // Explicitly preserve difficult count  
        timeSpent: studyTime
      }));
      return;
    }

    // Only reset stats for quiz/exercises tabs that have actual content
    if (tab === 'quiz' && quizzes.length > 0) {
      setSessionStats({
        correct: 0,
        difficult: 0,
        timeSpent: studyTime // Keep current activity time
      });
      // Reset activity-specific timers but not the overall timer
      setStudyTime(0);
      setCardStudyStartTime(0);
      return;
    }

    if (tab === 'exercises' && exercises.length > 0) {
      setSessionStats({
        correct: 0,
        difficult: 0,
        timeSpent: studyTime // Keep current activity time
      });
      // Reset activity-specific timers but not the overall timer
      setStudyTime(0);
      setCardStudyStartTime(0);
      return;
    }

    // For empty quiz/exercises tabs, preserve stats but update time
    setSessionStats(prev => ({
      correct: prev.correct,
      difficult: prev.difficult,
      timeSpent: studyTime
    }));
  }, [tab]);

  // Reset review state when flashcards change (but NOT when switching tabs)
  useEffect(() => {
    // Only reset reviewed state when flashcards actually change, not on tab switch
    setReviewedDifficult(new Set());
  }, [flashcards]); // Remove 'tab' dependency to prevent reset on tab switch

  // For Review tab: filter difficult cards using useMemo to recalculate when ratings change
  const difficultCards = useMemo(() => {
    const searchSessionInfo = localStorage.getItem('memo-spark-search-session-info');
    const isSearchFlashcardSession = !!searchSessionInfo;

    if (isSearchFlashcardSession) {
      // For search flashcards, use difficultCardIds and exclude reviewed cards
      const filtered = flashcards
        .map((card, originalIndex) => ({ ...card, originalIndex }))
        .filter(cardWithIndex => {
          // Include cards that are in difficultCardIds but haven't been reviewed
          return difficultCardIds.has(cardWithIndex.id) && !reviewedDifficult.has(cardWithIndex.originalIndex);
        });
      return filtered;
    } else {
      // For regular flashcards, use sessionRatings and exclude reviewed cards
      const filtered = flashcards
        .map((card, originalIndex) => ({ ...card, originalIndex }))
        .filter(cardWithIndex => {
          // Only include cards that are currently marked as 'hard' and haven't been reviewed
          return sessionRatings[cardWithIndex.originalIndex] === 'hard' && !reviewedDifficult.has(cardWithIndex.originalIndex);
        });
      return filtered;
    }
  }, [flashcards, sessionRatings, tab, difficultCardIds, reviewedDifficult]); // Include all dependencies

  // Loading state while fetching materials
  if (isLoadingMaterials || isLoadingFromStorage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-800">
        <div className="absolute top-4 right-4 z-50"><ThemeSwitcher /></div>
        <div className="max-w-full sm:max-w-4xl mx-auto px-6 py-16 text-center">
          <BookOpen className="h-16 w-16 text-blue-500 mx-auto mb-4 animate-pulse" />
          <h1 className="text-2xl font-bold text-foreground mb-2">{t('study.loading')}</h1>
          <p className="text-muted-foreground">{t('study.please_wait')}</p>
        </div>
      </div>
    );
  }

  // Handle case where no materials were found
  if (materialsNotFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-800">
        <div className="absolute top-4 right-4 z-50"><ThemeSwitcher /></div>
        <div className="max-w-full sm:max-w-4xl mx-auto px-6 py-8">
          <div className="text-center">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-4">{t('study.no_materials')}</h1>
            <p className="text-muted-foreground mb-6">{t('study.no_materials_desc')}</p>
            <Link to="/upload">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
                {t('hero.upload')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }
  if (tab === 'flashcards' && flashcards.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-800">
        <div className="absolute top-4 right-4 z-50"><ThemeSwitcher /></div>
        <div className="max-w-full sm:max-w-4xl mx-auto px-6 py-8">
          <div className="text-center">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-4">{t('study.no_flashcards')}</h1>
            <p className="text-muted-foreground mb-6">{t('study.no_flashcards_desc')}</p>
            <Link to="/upload">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
                {t('hero.upload')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleCardFlip = () => {
    const newFlipped = !isFlipped;
    setIsFlipped(newFlipped);

    // If this is the first time flipping the card, record the start time
    if (newFlipped && cardStudyStartTime === 0) {
      setCardStudyStartTime(studyTime);
    }
  };

  // Manual timer control functions
  const handlePauseTimer = () => {
    setIsTimerPaused(true);
  };

  const handleResumeTimer = () => {
    setIsTimerPaused(false);
  };

  const handleStopTimer = () => {
    setIsStudying(false);
    setIsTimerPaused(false);
  };

  const handleResetTimer = () => {
    setStudyTime(0);
    setOverallStudyTime(0);
    setCardStudyStartTime(0);
    setTimerKey(k => k + 1);
    setOverallTimerKey(k => k + 1);
    setIsTimerPaused(false);
  };

  // Helper functions for activity completion with automatic timer management
  const handleQuizCompletion = () => {
    setQuizCompleted(true);
    // Check if this was the last activity and stop timer if so
    const flashcardsComplete = flashcards.length === 0 || sessionComplete;
    const exercisesComplete = exercises.length === 0 || exerciseCompleted;

    setIsTimerPaused(true);

    if (flashcardsComplete && exercisesComplete) {
      // All activities complete - stop both timers
      setIsStudying(false);
    }
  };

  const handleExerciseCompletion = () => {
    setExerciseCompleted(true);
    // Check if this was the last activity and stop timer if so
    const flashcardsComplete = flashcards.length === 0 || sessionComplete;
    const quizzesComplete = quizzes.length === 0 || quizCompleted;

    setIsTimerPaused(true);

    if (flashcardsComplete && quizzesComplete) {
      // All activities complete - stop both timers
      setIsStudying(false);
    }
  };

  const handleNextCard = async (rating: 'again' | 'hard' | 'good' | 'easy') => {
    // Set loading state for the specific button clicked
    setRatingInProgress(rating);

    // Save the rating in our session state
    setSessionRatings(prev => {
      const updated = [...prev];
      updated[currentCard] = rating;
      return updated;
    });

    // Record the flashcard review if user is authenticated
    const currentCardData = flashcards[currentCard];
    if (user && session && currentCardData && currentCardData.id) {
      const studyTimeForCard = studyTime - cardStudyStartTime;

      try {
        // Check if this is a search flashcard study session
        const searchSessionInfo = localStorage.getItem('memo-spark-search-session-info');
        const isSearchFlashcardSession = !!searchSessionInfo; // Simplified check

        if (isSearchFlashcardSession) {
          // Handle search flashcard study session using new review-based system
          const searchInfo = JSON.parse(searchSessionInfo);

          console.log('Search flashcard session info:', searchInfo);
          console.log('Current card data:', currentCardData);
          console.log('Recording review with rating:', rating);

          if (searchInfo.search_id) {
            try {
              const searchService = new SearchFlashcardsService();

              // Record the review in the new review system (similar to regular flashcards)
              const reviewResult = await searchService.recordReview(
                searchInfo.search_id,
                currentCardData.id,
                rating,
                studyTimeForCard,
                searchInfo.session_id?.toString(), // Use search session ID and convert to string
                session
              );

              console.log('Review recorded successfully:', reviewResult);

              // Update session stats based on the review result
              if (reviewResult.success && reviewResult.data?.session_stats) {
                const stats = reviewResult.data.session_stats;
                setSessionStats(prev => ({
                  correct: stats.good_or_easy_count || 0,
                  difficult: stats.hard_count || 0,
                  timeSpent: studyTime
                }));
                console.log('Updated session stats from review:', stats);
              } else {
                // Fallback: Update local session stats
                setSessionStats(prev => {
                  const newStats = { ...prev, timeSpent: studyTime };
                  if (rating === 'good' || rating === 'easy') {
                    newStats.correct = prev.correct + 1;
                  } else if (rating === 'hard') {
                    newStats.difficult = prev.difficult + 1;
                  }
                  return newStats;
                });
              }

              // If this was a difficult card being re-rated from 'hard' to 'good'/'easy', 
              // or marking as reviewed, remove it from local difficult tracking
              if ((rating === 'good' || rating === 'easy') && difficultCardIds.has(currentCardData.id)) {
                setDifficultCardIds(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(currentCardData.id);
                  return newSet;
                });
                setIsReStudyingFromReview(false);
              }

              // If rating is 'hard', add to local difficult tracking
              if (rating === 'hard') {
                setDifficultCardIds(prev => new Set(prev).add(currentCardData.id));
              }

            } catch (error) {
              console.error('Failed to record search flashcard review:', error);
              // Fallback: Update local session stats only
              setSessionStats(prev => {
                const newStats = { ...prev, timeSpent: studyTime };
                if (rating === 'good' || rating === 'easy') {
                  newStats.correct = prev.correct + 1;
                } else if (rating === 'hard') {
                  newStats.difficult = prev.difficult + 1;
                }
                return newStats;
              });
            }
          } else {
            console.error('Search session info missing search_id:', searchInfo);
            // Fallback: Update local session stats only for search flashcards without proper session info
            setSessionStats(prev => {
              const newStats = { ...prev, timeSpent: studyTime };
              if (rating === 'good' || rating === 'easy') {
                newStats.correct = prev.correct + 1;
              } else if (rating === 'hard') {
                newStats.difficult = prev.difficult + 1;
              }
              return newStats;
            });
          }

          // Handle card navigation for search flashcards
          if (currentCard < flashcards.length - 1) {
            setCurrentCard(currentCard + 1);
            setIsFlipped(false);
            setCardStudyStartTime(studyTime); // Reset start time for next card
            setIsReStudyingFromReview(false); // Reset re-studying flag when moving to next card
          } else {
            // Flashcards are complete - handle search session completion
            if (session?.access_token) {
              completeSearchStudySession(session)
                .then(result => {
                  if (result.success) {
                    console.log('Search study session completed:', result.finalStats);
                    // Only clear localStorage if there's no search_id in URL (temporary sessions)
                    // For persistent sessions with search_id, keep localStorage for reload support
                    const searchId = new URLSearchParams(window.location.search).get('search_id');
                    if (!searchId) {
                      localStorage.removeItem('memo-spark-search-session-info');
                      localStorage.removeItem('memo-spark-current-search-study-session');
                    }
                  }
                })
                .catch(console.error);
            }

            setSessionComplete(true);

            // For search flashcards, always stop timer when complete since there are no other activities
            setIsStudying(false);
            setIsTimerPaused(false);
          }

          // Reset rating state
          setRatingInProgress(null);
          // Early return to prevent fallthrough to regular flashcard handling
          return;
        } else {
          // Handle regular deck study session
          // Ensure there's an active study session; start one on-demand if missing
          const stored = getCurrentStudySession();
          if (!stored || !stored.session_id) {
            const idFromQuery = searchParams.get('deckId');
            const nameFromQuery = searchParams.get('deck');
            let deckToUse: string | null = idFromQuery || currentDeckIdentifier || nameFromQuery || null;

            // If the identifier looks like a name (non-numeric), try to resolve it to an id
            if (deckToUse && isNaN(Number(deckToUse))) {
              try {
                const listRes = await fetch(API_ENDPOINTS.DECKS.LIST, {
                  headers: { Authorization: `Bearer ${session?.access_token}` },
                });
                if (listRes.ok) {
                  const decks = await listRes.json();
                  const match = (decks || []).find((d: any) => d.name === deckToUse);
                  if (match?.id) deckToUse = String(match.id);
                }
              } catch (e) {
                console.error('Failed to resolve deck id for on-demand session start', e);
              }
            }

            try {
              const newSession = await startStudySession(deckToUse || 'default-deck', session);
              if (newSession) setStudySession(newSession);
            } catch (e) {
              console.error('Failed to start study session before recording review:', e);
            }
          }

          // Record the flashcard review using our utility
          const result = await recordFlashcardReview(
            currentCardData.id || `card-${currentCard}`,
            rating,
            studyTimeForCard,
            session
          );

          // If we received session stats from the backend, use them to update our UI
          if (result && result.success && result.sessionStats) {
            setSessionStats({
              correct: result.sessionStats.good_or_easy_count || 0,
              difficult: result.sessionStats.hard_count || 0,
              timeSpent: studyTime
            });
          } else {
            // Fall back to local updates if server stats aren't available
            if (rating === 'good' || rating === 'easy') {
              setSessionStats(prev => ({ ...prev, correct: prev.correct + 1 }));
            } else if (rating === 'hard') {
              setSessionStats(prev => ({ ...prev, difficult: prev.difficult + 1 }));
            }
          }
        }
      } catch (error) {
        console.error('Failed to record flashcard review:', error);
      }
    } else {
      // For unauthenticated users, still update the local stats
      if (rating === 'good' || rating === 'easy') {
        setSessionStats(prev => ({ ...prev, correct: prev.correct + 1 }));
      } else if (rating === 'hard') {
        setSessionStats(prev => ({ ...prev, difficult: prev.difficult + 1 }));
      }
    }

    if (currentCard < flashcards.length - 1) {
      setCurrentCard(currentCard + 1);
      setIsFlipped(false);
      setCardStudyStartTime(studyTime); // Reset start time for next card
      setIsReStudyingFromReview(false); // Reset re-studying flag when moving to next card
    } else {
      // Flashcards are complete - handle completion based on session type
      const searchSessionInfo = localStorage.getItem('memo-spark-search-session-info');
      const isSearchFlashcardSession = !!searchSessionInfo; // Simplified check

      if (isSearchFlashcardSession && session?.access_token) {
        // Handle search flashcard session completion
        completeSearchStudySession(session)
          .then(result => {
            if (result.success) {
              console.log('Search study session completed:', result.finalStats);
              // Only clear localStorage if there's no search_id in URL (temporary sessions)
              // For persistent sessions with search_id, keep localStorage for reload support
              const searchId = new URLSearchParams(window.location.search).get('search_id');
              if (!searchId) {
                localStorage.removeItem('memo-spark-search-session-info');
                localStorage.removeItem('memo-spark-current-search-study-session');
              }
            }
          })
          .catch(console.error);
      }

      setSessionComplete(true);

      // Always auto-pause timers when flashcards complete, regardless of other activities
      console.log('Flashcards completed - auto-pausing timers');
      setIsTimerPaused(true);  // Pause the timer instead of stopping completely
      // Note: isStudying remains true so timer can be resumed when switching tabs

      setRatingInProgress(null);
    }

    // Reset rating state
    setRatingInProgress(null);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800'; // treat as medium
      default: return 'bg-card text-card-foreground';
    }
  };

  const capitalize = (s: string | undefined) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

  const formatTime = (seconds: number) => {
    if (seconds === 0) return '0:00';

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    // If over an hour, show hours too
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hours}:${remainingMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayAudio = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new window.SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Sorry, your browser does not support text-to-speech.');
    }
  };

  const handleBookmark = (cardIdx: number) => {
    if (isGuestUser) {
      window.location.href = '/register';
      return;
    }
    setBookmarkedCards(prev =>
      prev.includes(cardIdx)
        ? prev.filter(idx => idx !== cardIdx)
        : [...prev, cardIdx]
    );
  };

  const handleRestartSession = async () => {
    // Reset all state
    setCurrentCard(0);
    setIsFlipped(false);
    setSessionStats({ correct: 0, difficult: 0, timeSpent: 0 });
    setSessionRatings(Array(flashcards.length).fill(null));
    setSessionComplete(false);
    setReviewedDifficult(new Set()); // Reset reviewed difficult cards

    // Important: Reset time tracking
    setStudyTime(0);
    setOverallStudyTime(0);
    setCardStudyStartTime(0);

    // First set studying to false to ensure timer stops
    setIsStudying(false);

    // Reset both timer keys to ensure fresh timers
    setTimerKey(prev => prev + 1);
    setOverallTimerKey(prev => prev + 1);

    // Use setTimeout to ensure the state updates before restarting
    setTimeout(() => {
      // Start a new study session if the user is authenticated
      if (user && session) {
        const idFromQuery = searchParams.get('deckId');
        const nameFromQuery = searchParams.get('deck');
        const restartWithDeck = async () => {
          let idToUse: string | null = idFromQuery;
          if (!idToUse && nameFromQuery && session?.access_token) {
            try {
              const listRes = await fetch(API_ENDPOINTS.DECKS.LIST, {
                headers: { Authorization: `Bearer ${session.access_token}` },
              });
              if (listRes.ok) {
                const decks = await listRes.json();
                const match = (decks || []).find((d: any) => d.name === nameFromQuery);
                if (match?.id) idToUse = String(match.id);
              }
            } catch (e) { console.error('Failed to resolve deck for restart', e); }
          }

          try {
            clearCurrentStudySession();
            const sess = await startStudySession(idToUse || 'default-deck', session);
            if (sess) {
              setStudySession(sess);
              setIsStudying(true);
              setCardStudyStartTime(0);
              setTimerKey(k => k + 1);
            }
          } catch (error) {
            console.error('Failed to restart study session:', error);
          }
        };
        restartWithDeck();
      } else {
        // For guest users, just start the timer
        setIsStudying(true);
        setTimerKey(k => k + 1);
      }
    }, 100);
  };

  const handleExportProgress = () => {
    const data = {
      sessionStats,
      sessionRatings,
      flashcards,
      quizzes,
      exercises,
      bookmarkedCards,
      time: new Date().toISOString(),
    };

    // Generate filename with current date
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '-');
    const filename = `memo-spark-study-report-${currentDate}.pdf`;

    // Show success message
    const success = downloadStudyProgressPDF(data, filename);
    if (success) {
      toast({
        title: "PDF Generated Successfully!",
        description: "Your study progress report has been downloaded.",
        variant: "default",
      });
    } else {
      toast({
        title: "PDF Generation Failed",
        description: "There was an error generating your PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Helper to safely display any value as a string
  const displayValue = (val: unknown) => {
    if (val === undefined || val === null) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-800">
      {/* Top Navigation Bar */}
      <div className="w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm fixed top-0 z-40 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-3 sm:px-4 py-2 flex justify-between items-center">
          <Link to="/dashboard" className="flex items-center space-x-2 group">
            <div className="p-1.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg group-hover:scale-105 transition-transform">
              <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <span className="text-base sm:text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              MemoSpark
            </span>
          </Link>

          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Overall study time always shown in nav bar */}
            <div className="flex items-center mr-1 sm:mr-2 text-xs sm:text-sm">
              <Clock className={`h-3 w-3 sm:h-4 sm:w-4 ${isStudying ? 'text-green-500' : 'text-blue-600'} mr-1`} />
              <span className="font-medium">{formatTime(overallStudyTime)}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchMaterials(true)}
              disabled={isRefreshing}
              className="bg-white/80 dark:bg-gray-800/80 mr-1 sm:mr-2 px-2 sm:px-3"
            >
              {isRefreshing ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-1 sm:mr-2">
                    <RefreshCw className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </span>
                  <span className="hidden sm:inline">Refreshing</span>
                </span>
              ) : (
                <span className="flex items-center">
                  <RefreshCw className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-0 sm:mr-1.5" />
                  <span className="hidden sm:inline">Refresh</span>
                </span>
              )}
            </Button>
            <div className="border-l border-gray-200 dark:border-gray-700 h-4 sm:h-6 mx-1"></div>
            <ThemeSwitcher />
          </div>
        </div>
      </div>

      <div className="max-w-full sm:max-w-4xl lg:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pt-20 sm:pt-24 mt-6 sm:mt-2">
        {/* Guest Warning Banner */}
        {isGuestUser && (
          <Alert className="mb-4 sm:mb-6 border-orange-200 bg-gradient-to-r from-orange-50 to-red-50 text-sm sm:text-base shadow-sm">
            <AlertCircle className="h-4 w-4 text-orange-600 flex-shrink-0" />
            <AlertDescription className="text-orange-800">
              <strong>Guest Session:</strong> These flashcards are for temporary use only—create a free account to save them and track your progress!
              <Link to="/register" className="ml-2 underline font-medium hover:text-orange-600 block sm:inline mt-1 sm:mt-0">
                Sign up now to unlock full features →
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Missing Materials Detection */}
        {user && session && searchParams.get('deckId') && !isOverallComplete && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 sm:mb-8"
          >
            {(() => {
              const missingTypes = [];
              if (quizzes.length === 0) missingTypes.push('quiz');
              if (exercises.length === 0) missingTypes.push('exercise');

              if (missingTypes.length === 0) return null;

              return (
                <Alert className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 text-sm sm:text-base shadow-sm">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <AlertDescription className="text-blue-800">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <strong>📚 Expand Your Study Options!</strong>
                        <div className="mt-1 text-sm">
                          Missing: {missingTypes.map(type => type === 'quiz' ? 'Quizzes' : 'Exercises').join(', ')}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={async () => {
                          const deckId = searchParams.get('deckId');
                          if (!deckId) return;

                          try {
                            toast({
                              title: "Generating materials...",
                              description: "This may take a few minutes. We'll let you know when it's ready!",
                            });

                            const response = await fetchWithAuth(
                              API_ENDPOINTS.DECKS.GENERATE_MATERIALS(deckId),
                              {
                                method: 'POST',
                                body: JSON.stringify({
                                  material_types: missingTypes
                                })
                              },
                              session
                            );

                            if (response.success) {
                              toast({
                                title: "Material generation started!",
                                description: "Refresh the page in a few minutes to see your new quizzes and exercises.",
                                duration: 5000,
                              });
                            }
                          } catch (error) {
                            console.error('Failed to generate materials:', error);
                            toast({
                              title: "Generation failed",
                              description: "Failed to generate materials. Please try again.",
                              variant: "destructive",
                            });
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
                      >
                        Generate Now
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              );
            })()}
          </motion.div>
        )}

        {/* Study Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex flex-col items-center justify-center mb-4">
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 mb-3">
              <div className="p-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full">
                <BookOpen className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground text-center sm:text-left">
                {currentDeckIdentifier?.startsWith('search-')
                  ? `Studying: ${currentDeckIdentifier.replace('search-', '')}`
                  : user
                    ? 'Your Study Session'
                    : 'Uploaded Content'
                }
              </h1>
              {isGuestUser && (
                <Badge variant="outline" className="text-orange-600 border-orange-300 mt-2 sm:mt-0 sm:ml-2">
                  Guest Mode
                </Badge>
              )}
              {currentDeckIdentifier?.startsWith('search-') && (
                <Badge variant="secondary" className="text-blue-600 border-blue-300 mt-2 sm:mt-0 sm:ml-2">
                  AI Generated
                </Badge>
              )}
            </div>

            {lastUpdated && (
              <div className="text-xs text-muted-foreground flex items-center mt-1">
                <Clock className="h-3 w-3 mr-1" />
                Last updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>          {tab === 'flashcards' && flashcards.length > 0 && (
            <div className="bg-card dark:bg-card/30 rounded-lg p-3 sm:p-4 max-w-md mx-auto mb-4 sm:mb-5 shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-2 mb-2 space-y-2 sm:space-y-0">
                <div className="flex items-center flex-wrap gap-2">
                  <Badge className={getDifficultyColor(currentCardData.difficulty) + " px-2 py-0.5 text-xs sm:text-sm"}>
                    {capitalize(currentCardData.difficulty)}
                  </Badge>
                  <Badge variant="outline" className="px-2 py-0.5 text-xs sm:text-sm">{currentCardData.type}</Badge>
                </div>
                <span className="text-sm font-medium bg-gray-50 dark:bg-gray-800/40 px-2 py-1 rounded-md whitespace-nowrap">
                  Card {currentCard + 1} of {flashcards.length}
                </span>
              </div>
              <div className="mt-3">
                <Progress
                  value={progress}
                  className="h-2 sm:h-2.5"
                  indicatorClassName="bg-gradient-to-r from-blue-500 to-purple-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Tab Selector */}
        <div className="flex justify-center mb-4 sm:mb-6">
          <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 w-full max-w-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <Button
              className={`flex-1 rounded-md transition-all duration-300 text-xs sm:text-sm ${tab === 'flashcards' ?
                'bg-gradient-to-r from-blue-500/90 to-purple-500/90 text-white shadow-md' :
                'bg-transparent text-foreground hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              variant="ghost"
              onClick={() => handleTabSwitch('flashcards')}
              size="sm"
            >
              <LayersIcon className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 ${tab === 'flashcards' ? 'text-white' : 'text-blue-500 dark:text-blue-400'}`} />
              <span className="hidden xs:inline">Flashcards</span>
              <span className="xs:hidden">Cards</span>
            </Button>
            <Button
              className={`flex-1 rounded-md transition-all duration-300 text-xs sm:text-sm ${tab === 'quiz' ?
                'bg-gradient-to-r from-blue-500/90 to-purple-500/90 text-white shadow-md' :
                'bg-transparent text-foreground hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              variant="ghost"
              onClick={() => handleTabSwitch('quiz')}
              size="sm"
            >
              <CheckSquare className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 ${tab === 'quiz' ? 'text-white' : 'text-blue-500 dark:text-blue-400'}`} />
              Quiz
            </Button>
            <Button
              className={`flex-1 rounded-md transition-all duration-300 text-xs sm:text-sm ${tab === 'exercises' ?
                'bg-gradient-to-r from-blue-500/90 to-purple-500/90 text-white shadow-md' :
                'bg-transparent text-foreground hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              variant="ghost"
              onClick={() => handleTabSwitch('exercises')}
              size="sm"
            >
              <PencilIcon className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 ${tab === 'exercises' ? 'text-white' : 'text-blue-500 dark:text-blue-400'}`} />
              <span className="hidden xs:inline">Exercises</span>
              <span className="xs:hidden">Exec</span>
            </Button>
            <Button
              className={`flex-1 rounded-md transition-all duration-300 text-xs sm:text-sm ${tab === 'review' ?
                'bg-gradient-to-r from-blue-500/90 to-purple-500/90 text-white shadow-md' :
                'bg-transparent text-foreground hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              variant="ghost"
              onClick={() => handleTabSwitch('review')}
              size="sm"
            >
              <RotateCcw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 ${tab === 'review' ? 'text-white' : 'text-blue-500 dark:text-blue-400'}`} />
              Review
            </Button>
          </div>
        </div>

        {/* Tab Content with Animated Transitions */}
        <div className="w-full">
          <AnimatePresence mode="wait">
            {tab === 'flashcards' && flashcards.length > 0 && (
              <motion.div
                key="flashcards"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.3 }}
              >
                {/* Flashcards Content */}
                <div className="max-w-full sm:max-w-4xl lg:max-w-5xl mx-auto mb-6 sm:mb-8 px-2 sm:px-4">
                  {sessionComplete && (
                    <motion.div
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -40 }}
                      transition={{ duration: 0.5 }}
                      className="max-w-full sm:max-w-4xl mx-auto text-center mt-8 sm:mt-16 lg:mt-24 mb-12 sm:mb-16 lg:mb-24 py-6 sm:py-8 lg:py-16"
                    >
                      <h2 className="text-xl sm:text-2xl font-bold mb-4">🎉 Session Complete!</h2>
                      <p className="text-muted-foreground mb-4 sm:mb-6 text-sm sm:text-base px-4">
                        You've reviewed all flashcards for this session.
                      </p>

                      {/* Summary of the study session */}
                      <div className="mb-6 sm:mb-8">
                        <Card>
                          <CardContent className="p-4 sm:p-6">
                            <h3 className="font-semibold text-lg sm:text-xl mb-4">Session Summary</h3>
                            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                              <div>
                                <div className="text-2xl sm:text-3xl font-bold text-green-600">
                                  {sessionStats.correct}
                                </div>
                                <div className="text-xs sm:text-sm text-muted-foreground">Cards Mastered</div>
                              </div>
                              <div>
                                <div className="text-2xl sm:text-3xl font-bold text-blue-600">
                                  {flashcards.length}
                                </div>
                                <div className="text-xs sm:text-sm text-muted-foreground">Total Cards</div>
                              </div>
                              <div>
                                <div className="text-2xl sm:text-3xl font-bold text-purple-600">
                                  {studyTime > 0 ? formatTime(studyTime) : '0:00'}
                                </div>
                                <div className="text-xs sm:text-sm text-muted-foreground">Study Time</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mb-6 sm:mb-8 px-4">
                        <Button onClick={handleRestartSession} className="w-full sm:w-auto">
                          Restart Session
                        </Button>
                        <Link to="/dashboard?refresh=true" className="w-full sm:w-auto">
                          <Button variant="outline" className="w-full">
                            Go to Dashboard
                          </Button>
                        </Link>
                        <Button variant="outline" onClick={async () => {
                          handleTabSwitch('review');
                          // Refresh difficult cards count when switching to review tab
                          await refreshDifficultCardsCount();
                        }} className="w-full sm:w-auto">
                          Review Difficult Cards
                        </Button>
                      </div>

                      {/* Show detailed stats for logged in users */}
                      {!isGuestUser && user && !showStatsPanel && (
                        <div className="mt-4">
                          <Button
                            variant="ghost"
                            onClick={() => setShowStatsPanel(true)}
                          >
                            View Detailed Statistics
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  )}
                  {!sessionComplete && (
                    <Card
                      className="h-auto sm:h-96 cursor-pointer transform-gpu transition-shadow duration-300 hover:shadow-xl mt-2 sm:mt-0 min-h-[300px] sm:min-h-[384px]"
                      onClick={handleCardFlip}
                    >
                      <CardContent className="h-full p-0">
                        <div className="h-full w-full p-4 sm:p-6">
                          <div className="relative w-full h-[260px] sm:h-[320px] mx-auto [perspective:1200px]">
                            <motion.div
                              className="relative w-full h-full [transform-style:preserve-3d]"
                              animate={{ rotateY: isFlipped ? 180 : 0 }}
                              transition={{ duration: 0.6, ease: 'easeInOut' }}
                            >
                              {/* Front - Question */}
                              <div className="absolute inset-0 bg-white/90 dark:bg-gray-900/80 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center text-center p-5 sm:p-8 [backface-visibility:hidden]">
                                <div className="text-sm text-muted-foreground mb-3">Question</div>
                                <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-foreground leading-relaxed break-words">
                                  {currentCardData.question}
                                </h2>
                                <div className="mt-6 sm:mt-8">
                                  <p className="text-sm text-muted-foreground">Click to reveal answer</p>
                                </div>
                              </div>

                              {/* Back - Answer */}
                              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-blue-600/10 dark:from-purple-500/20 dark:to-blue-500/20 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center text-center p-5 sm:p-8 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                                <div className="text-sm text-muted-foreground mb-3">Answer</div>
                                <h2 className="text-lg sm:text-xl lg:text-2xl font-medium text-foreground leading-relaxed break-words">
                                  {currentCardData.answer}
                                </h2>
                                <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
                                  <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); handlePlayAudio(currentCardData.answer); }} className="w-full sm:w-auto">
                                    <Volume2 className="h-4 w-4 mr-2" />
                                    <span className="hidden sm:inline">Play Audio</span>
                                    <span className="sm:hidden">Audio</span>
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); handleBookmark(currentCard); }} className="w-full sm:w-auto">
                                    <Star className={`${bookmarkedCards.includes(currentCard) ? 'text-yellow-400 fill-yellow-400' : ''} h-4 w-4 mr-2`} />
                                    {isGuestUser ? (
                                      <span className="hidden sm:inline">Sign up to Bookmark</span>
                                    ) : (
                                      <span>{bookmarkedCards.includes(currentCard) ? 'Bookmarked' : 'Bookmark'}</span>
                                    )}
                                    {isGuestUser && <span className="sm:hidden">Sign up</span>}
                                  </Button>
                                </div>
                              </div>
                            </motion.div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </motion.div>
            )}
            {tab === 'quiz' && (
              <motion.div
                key="quiz"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <div className="max-w-full sm:max-w-4xl lg:max-w-5xl px-2 sm:px-4 mx-auto mb-6 sm:mb-8 flex flex-col justify-center rounded-md sm:rounded-lg">
                  {quizzes.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 mx-auto mb-2" />
                      <h2 className="text-lg font-semibold mb-2">No Quizzes Available</h2>
                      <p className="text-muted-foreground text-sm sm:text-base px-4">No quizzes were generated for this document. Try uploading a different document or check back later.</p>
                    </div>
                  ) : quizCompleted ? (
                    <div className="text-center">
                      {/* Quiz Results Summary */}
                      <Card className="mb-4 sm:mb-6 bg-card shadow-lg border border-border">
                        <CardContent className="flex flex-col items-center p-4 sm:p-6 text-sm sm:text-base">
                          <div className="text-2xl sm:text-3xl font-bold mb-2 text-foreground">
                            {(() => {
                              const correct = quizzes.filter((q, idx) => quizAnswers[idx] === q.correct_answer_option).length;
                              if (correct === quizzes.length) return '🏆 Perfect!';
                              if (correct / quizzes.length >= 0.8) return '🎉 Great Job!';
                              if (correct / quizzes.length >= 0.5) return '👍 Good Effort!';
                              return '💡 Keep Practicing!';
                            })()}
                          </div>
                          <div className="text-xl sm:text-2xl font-bold mb-1 text-foreground">
                            {quizzes.filter((q, idx) => quizAnswers[idx] === q.correct_answer_option).length} / {quizzes.length}
                          </div>
                          <div className="text-sm sm:text-base mb-2 text-muted-foreground">
                            Score
                          </div>
                          <Progress value={100 * quizzes.filter((q, idx) => quizAnswers[idx] === q.correct_answer_option).length / quizzes.length} className="w-full max-w-xs mb-2" />
                          <div className="text-sm text-muted-foreground text-center px-4">
                            {(() => {
                              const correct = quizzes.filter((q, idx) => quizAnswers[idx] === q.correct_answer_option).length;
                              if (correct === quizzes.length) return 'Outstanding! You got everything right.';
                              if (correct / quizzes.length >= 0.8) return 'Awesome! Just a little more to perfection.';
                              if (correct / quizzes.length >= 0.5) return 'Nice work! Review the incorrect answers to improve.';
                              return 'Don\'t worry, keep practicing and you\'ll get there!';
                            })()}
                          </div>
                        </CardContent>
                      </Card>
                      {/* Quiz Results Per Question */}
                      <div className="mb-4 sm:mb-6 grid gap-2 sm:gap-4">
                        {quizzes.map((quiz, idx) => {
                          const userAnswer = quizAnswers[idx];
                          const isCorrect = userAnswer === quiz.correct_answer_option;
                          return (
                            <Card key={idx} className={`mb-2 shadow border-l-4 bg-card text-card-foreground ${isCorrect ? 'border-primary' : 'border-destructive'}`}>
                              <CardContent className="p-3 sm:p-4 text-sm sm:text-base">
                                <div className="flex items-start mb-2">
                                  <span className={`mr-2 text-lg flex-shrink-0 ${isCorrect ? 'text-primary' : 'text-destructive'}`}>{isCorrect ? '✔️' : '❌'}</span>
                                  <span className="font-semibold text-card-foreground break-words">Q{idx + 1}: {quiz.question}</span>
                                </div>
                                <div className="mb-1">
                                  <span className="font-medium text-card-foreground">Your answer: </span>
                                  <span className={userAnswer === quiz.correct_answer_option ? 'text-primary font-semibold' : 'text-destructive font-semibold'}>
                                    {userAnswer}
                                  </span>
                                  {userAnswer !== quiz.correct_answer_option && (
                                    <span className="ml-2 text-xs text-destructive">(Incorrect)</span>
                                  )}
                                </div>
                                {userAnswer !== quiz.correct_answer_option && (
                                  <div>
                                    <span className="font-medium text-card-foreground">Correct answer: </span>
                                    <span className="text-primary font-semibold break-words">{quiz.correct_answer_option}</span>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mt-4 px-4">
                        <Button onClick={() => {
                          setQuizStep(0);
                          setQuizAnswers(Array(quizzes.length).fill(null));
                          setQuizCompleted(false);
                          setIsQuizReviewMode(false); // Reset quiz review mode
                        }} className="w-full sm:w-auto">
                          Retry Quiz
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center min-h-[400px]">
                      <Card className="w-full mb-4 bg-card shadow-md rounded-md sm:rounded-lg">
                        <CardContent className="p-4 sm:p-6 overflow-x-auto pb-4">
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="text-xs sm:text-sm">Quiz</Badge>
                            <Badge variant="outline" className="text-xs sm:text-sm">{capitalize(quizzes[quizStep].difficulty) || "Unknown"}</Badge>
                          </div>
                          <div className="mb-4 font-medium break-words whitespace-pre-line text-sm sm:text-base lg:text-lg">Q{quizStep + 1}: {quizzes[quizStep].question}</div>
                          <hr className="my-3 border-muted" />
                          <ul className="mb-4 space-y-2 sm:space-y-3 break-words">
                            {quizzes[quizStep].options.map((option, i) => (
                              <li key={i} className="w-full">
                                <Button
                                  variant={quizAnswers[quizStep] === option ? 'default' : 'outline'}
                                  className="w-full justify-start break-words whitespace-pre-line text-left px-3 py-3 sm:px-4 sm:py-4 text-sm sm:text-base min-h-fit border border-muted bg-muted/60 hover:bg-muted/80 transition rounded-md"
                                  style={{ whiteSpace: 'pre-line' }}
                                  onClick={() => {
                                    const updated = [...quizAnswers];
                                    updated[quizStep] = option;
                                    setQuizAnswers(updated);
                                  }}
                                  disabled={quizAnswers[quizStep] !== undefined && quizAnswers[quizStep] !== null}
                                >
                                  {option}
                                </Button>
                              </li>
                            ))}
                          </ul>

                          {/* Show correct answer in review mode */}
                          {isQuizReviewMode && (
                            <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                              <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="font-medium text-green-800 dark:text-green-200">Correct Answer:</span>
                              </div>
                              <p className="text-green-700 dark:text-green-300 font-semibold">
                                {quizzes[quizStep].correct_answer_option}
                              </p>
                            </div>
                          )}
                          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between w-full mt-3">
                            <Button
                              variant="outline"
                              onClick={() => setQuizStep(s => Math.max(0, s - 1))}
                              disabled={quizStep === 0}
                              className="w-full sm:w-auto"
                            >
                              Previous
                            </Button>
                            {quizStep < quizzes.length - 1 ? (
                              <Button
                                onClick={() => setQuizStep(s => Math.min(quizzes.length - 1, s + 1))}
                                disabled={quizAnswers[quizStep] === undefined || quizAnswers[quizStep] === null}
                                className="w-full sm:w-auto"
                              >
                                Next
                              </Button>
                            ) : (
                              <Button
                                onClick={handleQuizCompletion}
                                disabled={quizAnswers.length !== quizzes.length || quizAnswers.includes(null) || quizAnswers.includes(undefined)}
                                className="w-full sm:w-auto"
                              >
                                Submit
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                      <div className="text-muted-foreground text-sm mb-2">
                        Question {quizStep + 1} of {quizzes.length}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
            {tab === 'exercises' && (
              <motion.div
                key="exercises"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <div className="max-w-full sm:max-w-4xl mx-auto mb-8 flex flex-col justify-center">
                  {exercises.length === 0 ? (
                    <div className="text-center">
                      <AlertCircle className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <h2 className="text-lg font-semibold mb-2">No Exercises Available</h2>
                      <p className="text-muted-foreground">No exercises were generated for this document. Try uploading a different document or check back later.</p>
                    </div>
                  ) : exerciseCompleted ? (
                    <div className="text-center">
                      {/* Exercise Results Summary */}
                      <Card className="mb-6 bg-card shadow-lg border border-border">
                        <CardContent className="flex flex-col items-center p-3 sm:p-6 text-sm sm:text-base">
                          <div className="text-3xl font-bold mb-2 text-foreground">
                            {(() => {
                              const correct = exercises.filter((e, idx) => {
                                const userAnswer = exerciseAnswers[idx];
                                const correctAnswer = e.answer;
                                if (typeof correctAnswer === 'string' && typeof userAnswer === 'string') {
                                  return userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
                                }
                                return false;
                              }).length;
                              if (correct === exercises.length) return '🏆 Perfect!';
                              if (correct / exercises.length >= 0.8) return '🎉 Great Job!';
                              if (correct / exercises.length >= 0.5) return '👍 Good Effort!';
                              return '💡 Keep Practicing!';
                            })()}
                          </div>
                          <div className="text-2xl font-bold mb-1 text-foreground">
                            {exercises.filter((e, idx) => {
                              const userAnswer = exerciseAnswers[idx];
                              const correctAnswer = e.answer;
                              if (typeof correctAnswer === 'string' && typeof userAnswer === 'string') {
                                return userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
                              }
                              return false;
                            }).length} / {exercises.length}
                          </div>
                          <div className="text-base mb-2 text-muted-foreground">
                            Score
                          </div>
                          <Progress value={100 * exercises.filter((e, idx) => {
                            const userAnswer = exerciseAnswers[idx];
                            const correctAnswer = e.answer;
                            if (typeof correctAnswer === 'string' && typeof userAnswer === 'string') {
                              return userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
                            }
                            return false;
                          }).length / exercises.length} className="w-full max-w-xs mb-2" />
                          <div className="text-sm text-muted-foreground">
                            {(() => {
                              const correct = exercises.filter((e, idx) => {
                                const userAnswer = exerciseAnswers[idx];
                                const correctAnswer = e.answer;
                                if (typeof correctAnswer === 'string' && typeof userAnswer === 'string') {
                                  return userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
                                }
                                return false;
                              }).length;
                              if (correct === exercises.length) return 'Outstanding! You got everything right.';
                              if (correct / exercises.length >= 0.8) return 'Awesome! Just a little more to perfection.';
                              if (correct / exercises.length >= 0.5) return 'Nice work! Review the incorrect answers to improve.';
                              return 'Don\'t worry, keep practicing and you\'ll get there!';
                            })()}
                          </div>
                        </CardContent>
                      </Card>
                      {/* Exercise Results Per Question */}
                      <div className="mb-6 grid gap-4">
                        {exercises.map((exercise, idx) => {
                          const userAnswer = exerciseAnswers[idx];
                          const correctAnswer = exercise.answer;
                          // For matching, stringify the object for display
                          const isMatching = exercise.type === 'matching';
                          const userAnswerDisplay = isMatching && typeof userAnswer === 'object' && userAnswer !== null
                            ? Object.entries(userAnswer).map(([k, v]) => `${k}: ${v}`).join(', ')
                            : userAnswer;
                          const correctAnswerDisplay = isMatching && typeof correctAnswer === 'object' && correctAnswer !== null
                            ? Object.entries(correctAnswer).map(([k, v]) => `${k}: ${v}`).join(', ')
                            : correctAnswer;
                          const isCorrect = typeof correctAnswer === 'string' && typeof userAnswer === 'string'
                            ? userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim()
                            : (isMatching && typeof userAnswer === 'object' && typeof correctAnswer === 'object'
                              ? JSON.stringify(userAnswer) === JSON.stringify(correctAnswer)
                              : false);
                          return (
                            <Card key={idx} className={`mb-2 shadow border-l-4 bg-card text-card-foreground ${isCorrect ? 'border-primary' : 'border-destructive'}`}>
                              <CardContent className="p-2 sm:p-4 text-sm sm:text-base">
                                <div className="flex items-center mb-2">
                                  <span className={`mr-2 text-lg ${isCorrect ? 'text-primary' : 'text-destructive'}`}>{isCorrect ? '✔️' : '❌'}</span>
                                  <span className="font-semibold text-card-foreground">Q{idx + 1}: {exercise.instruction}</span>
                                </div>
                                {exercise.exercise_text && (
                                  <div className="mb-2 text-sm text-muted-foreground">
                                    {exercise.exercise_text}
                                  </div>
                                )}
                                <div className="mb-1">
                                  <span className="font-medium text-card-foreground">Your answer: </span>
                                  <span className={isCorrect ? 'text-primary font-semibold' : 'text-destructive font-semibold'}>
                                    {userAnswerDisplay ? displayValue(userAnswerDisplay) : 'No answer provided'}
                                  </span>
                                  {!isCorrect && (
                                    <span className="ml-2 text-xs text-destructive">(Incorrect)</span>
                                  )}
                                </div>
                                {!isCorrect && (
                                  <div>
                                    <span className="font-medium text-card-foreground">Correct answer: </span>
                                    <span className="text-primary font-semibold">{displayValue(correctAnswerDisplay)}</span>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row justify-center gap-4 mt-4">
                        <Button onClick={() => {
                          setExerciseStep(0);
                          setExerciseAnswers(Array(exercises.length).fill(null));
                          setExerciseCompleted(false);
                        }}>
                          Retry Exercises
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center min-h-fit">
                      <Card className="w-full mb-4 bg-card shadow-md rounded-md sm:rounded-lg">
                        <CardContent className="p-3 sm:p-6 overflow-x-auto">
                          <div className="mb-2 flex items-center gap-2">
                            <Badge variant="secondary">Exercise</Badge>
                            <Badge variant="outline">{capitalize(exercises[exerciseStep].difficulty) || "Unknown"}</Badge>
                          </div>
                          <div className="mb-2 font-medium break-words">Q{exerciseStep + 1}: {exercises[exerciseStep].instruction}</div>
                          {exercises[exerciseStep].exercise_text && (
                            <div className="mb-4 p-3 bg-muted rounded-lg">
                              <p className="text-sm text-muted-foreground">{exercises[exerciseStep].exercise_text}</p>
                            </div>
                          )}

                          {exercises[exerciseStep].type === 'fill_blank' && (
                            <div className="mb-4">
                              <Input
                                type="text"
                                placeholder="Enter your answer"
                                value={exerciseAnswers[exerciseStep] as string || ''}
                                onChange={(e) => {
                                  const updated = [...exerciseAnswers];
                                  updated[exerciseStep] = e.target.value;
                                  setExerciseAnswers(updated);
                                }}
                              />
                            </div>
                          )}

                          {exercises[exerciseStep].type === 'true_false' && (
                            <div className="mb-4">
                              <div className="flex items-center justify-center space-x-4">
                                <Button
                                  variant={exerciseAnswers[exerciseStep] === 'True' ? 'default' : 'outline'}
                                  onClick={() => {
                                    const updated = [...exerciseAnswers];
                                    updated[exerciseStep] = 'True';
                                    setExerciseAnswers(updated);
                                  }}
                                >
                                  True
                                </Button>
                                <Button
                                  variant={exerciseAnswers[exerciseStep] === 'False' ? 'default' : 'outline'}
                                  onClick={() => {
                                    const updated = [...exerciseAnswers];
                                    updated[exerciseStep] = 'False';
                                    setExerciseAnswers(updated);
                                  }}
                                >
                                  False
                                </Button>
                              </div>
                            </div>
                          )}

                          {exercises[exerciseStep].type === 'short_answer' && (
                            <div className="mb-4">
                              <Textarea
                                placeholder="Enter your answer"
                                value={exerciseAnswers[exerciseStep] as string || ''}
                                onChange={(e) => {
                                  const updated = [...exerciseAnswers];
                                  updated[exerciseStep] = e.target.value;
                                  setExerciseAnswers(updated);
                                }}
                                rows={4}
                              />
                            </div>
                          )}

                          {exercises[exerciseStep].type === 'matching' && (
                            <div className="mb-4">
                              <div className="space-y-3">
                                <p className="text-sm text-muted-foreground mb-3">
                                  Match each concept with its correct definition:
                                </p>
                                <div className="grid gap-3">
                                  {exercises[exerciseStep].concepts?.map((concept, idx) => (
                                    <div
                                      key={idx}
                                      className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-center sm:space-x-4 p-2 border rounded-lg bg-muted/50"
                                    >
                                      <span className="font-medium text-sm min-w-[100px] break-words sm:text-right sm:w-1/3">
                                        {concept}:
                                      </span>
                                      <div className="flex-1 w-full">
                                        <select
                                          className="w-full max-w-full p-3 sm:p-2 border rounded text-sm bg-background text-foreground truncate min-h-[44px]"
                                          value={exerciseAnswers[exerciseStep]?.[concept] || ''}
                                          onChange={(e) => {
                                            const updated = [...exerciseAnswers];
                                            if (!updated[exerciseStep]) updated[exerciseStep] = {};
                                            (updated[exerciseStep] as Record<string, string>)[concept] = e.target.value;
                                            setExerciseAnswers(updated);
                                          }}
                                          aria-label={`Select definition for ${concept}`}
                                        >
                                          <option value="">Select definition...</option>
                                          {exercises[exerciseStep].definitions?.map((def, defIdx) => (
                                            <option
                                              key={defIdx}
                                              value={def}
                                              className="truncate"
                                              title={def}
                                            >
                                              {def.length > 60 ? def.slice(0, 60) + '...' : def}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="flex justify-between">
                            <Button
                              variant="outline"
                              onClick={() => setExerciseStep(s => Math.max(0, s - 1))}
                              disabled={exerciseStep === 0}
                            >
                              Previous
                            </Button>
                            {exerciseStep < exercises.length - 1 ? (
                              <Button
                                onClick={() => setExerciseStep(s => Math.min(exercises.length - 1, s + 1))}
                                disabled={exerciseAnswers[exerciseStep] === undefined || exerciseAnswers[exerciseStep] === null || exerciseAnswers[exerciseStep] === ''}
                              >
                                Next
                              </Button>
                            ) : (
                              <Button
                                onClick={handleExerciseCompletion}
                                disabled={exerciseAnswers.length !== exercises.length || exerciseAnswers.includes(null) || exerciseAnswers.includes(undefined) || exerciseAnswers.includes('')}
                              >
                                Submit
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                      <div className="text-muted-foreground text-sm mb-2">
                        Exercise {exerciseStep + 1} of {exercises.length}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
            {tab === 'review' && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <div className="max-w-full sm:max-w-4xl mx-auto mb-8">
                  <h2 className="text-xl font-bold mb-4 text-foreground">
                    Review: Difficult Cards ({difficultCards.length})
                  </h2>
                  {difficultCards.length === 0 ? (
                    <div className="text-center text-muted-foreground">
                      <Star className="h-8 w-8 mx-auto mb-2 text-yellow-400" />
                      <p>No difficult cards to review! Great job!</p>
                    </div>
                  ) : (
                    difficultCards.map((card, idx) => (
                      <Card key={`${card.originalIndex}-${card.id}`} className="mb-4 bg-card shadow-md">
                        <CardContent className="p-6 overflow-x-auto">
                          <div className="mb-2 flex items-center gap-2">
                            <Badge variant="outline">Difficult</Badge>
                            <Badge variant="outline">{card.type}</Badge>
                          </div>
                          <div className="mb-2 font-medium break-words">Q: {card.question}</div>
                          <div className="mb-4 break-words">A: {card.answer}</div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                // Set loading state for this specific card
                                setMarkingReviewed(prev => new Set(prev).add(card.originalIndex));

                                try {
                                  // Always check for search flashcard session and call correct API
                                  const searchSessionInfo = localStorage.getItem('memo-spark-search-session-info');
                                  const isSearchFlashcardSession = !!searchSessionInfo; // Simplified check - just check if search session exists

                                  if (isSearchFlashcardSession && user && session && card.id !== undefined) {
                                    try {
                                      const searchInfo = JSON.parse(searchSessionInfo);
                                      const searchService = new SearchFlashcardsService();

                                      // Record a 'good' review for this card to remove it from difficult status
                                      // This simulates the user marking it as reviewed (equivalent to good rating)
                                      await searchService.recordReview(
                                        searchInfo.search_id,
                                        card.id,
                                        'good', // Mark as 'good' to remove from difficult cards
                                        1, // minimal study time for review action
                                        searchInfo.session_id?.toString(), // Use search session ID
                                        session
                                      );

                                      // Update local state using originalIndex
                                      const newSet = new Set(reviewedDifficult);
                                      newSet.add(card.originalIndex);
                                      setReviewedDifficult(newSet);

                                      // Remove from difficult cards set locally
                                      setDifficultCardIds(prev => {
                                        const newSet = new Set(prev);
                                        newSet.delete(card.id);
                                        return newSet;
                                      });

                                      // Refresh the difficult cards count from the review system
                                      await refreshDifficultCardsCount();

                                      // Also increment the correct count for marking as reviewed
                                      setSessionStats(prev => ({
                                        correct: prev.correct + 1, // Increment correct count
                                        difficult: prev.difficult, // Will be updated by refreshDifficultCardsCount
                                        timeSpent: prev.timeSpent
                                      }));

                                      toast({
                                        title: "Success",
                                        description: "Card marked as reviewed successfully!",
                                      });
                                    } catch (e) {
                                      console.error('Failed to mark search flashcard as reviewed:', e);
                                      toast({
                                        title: "Error",
                                        description: "Failed to mark card as reviewed",
                                        variant: "destructive"
                                      });
                                    }
                                  } else if (user && session && card.id !== undefined) {
                                    // Handle regular deck flashcard review
                                    try {
                                      const result = await recordFlashcardReview(card.id, 'good', 1, session);

                                      // Update local state using originalIndex
                                      const newSet = new Set(reviewedDifficult);
                                      newSet.add(card.originalIndex);
                                      setReviewedDifficult(newSet);

                                      // Update session ratings to remove this card from difficult cards
                                      setSessionRatings(prev => {
                                        const updated = [...prev];
                                        updated[card.originalIndex] = 'good'; // Update from 'hard' to 'good'
                                        return updated;
                                      });

                                      // Update both correct and difficult counts for mark reviewed
                                      if (result && result.success && result.sessionStats) {
                                        setSessionStats(prev => ({
                                          correct: prev.correct + 1, // Increment correct count
                                          difficult: result.sessionStats.hard_count || 0, // Update difficult count from backend
                                          timeSpent: prev.timeSpent // Keep time unchanged
                                        }));
                                      } else {
                                        // Fallback: manually increment correct and decrement difficult counts
                                        setSessionStats(prev => ({
                                          correct: prev.correct + 1, // Increment correct count
                                          difficult: Math.max(0, prev.difficult - 1), // Decrement difficult count
                                          timeSpent: prev.timeSpent // Keep time unchanged
                                        }));
                                      }

                                      toast({
                                        title: "Success",
                                        description: "Card marked as reviewed successfully!",
                                      });
                                    } catch (e) {
                                      console.error('Failed to mark reviewed', e);
                                      toast({
                                        title: "Error",
                                        description: "Failed to mark card as reviewed",
                                        variant: "destructive"
                                      });
                                    }
                                  } else {
                                    // For guest users, just update the session ratings using originalIndex
                                    setSessionRatings(prev => {
                                      const updated = [...prev];
                                      updated[card.originalIndex] = 'good'; // Update from 'hard' to 'good'
                                      return updated;
                                    });

                                    const newSet = new Set(reviewedDifficult);
                                    newSet.add(card.originalIndex);
                                    setReviewedDifficult(newSet);

                                    // Manually increment correct and decrement difficult counts for guest users
                                    setSessionStats(prev => ({
                                      correct: prev.correct + 1, // Increment correct count
                                      difficult: Math.max(0, prev.difficult - 1), // Decrement difficult count
                                      timeSpent: prev.timeSpent // Keep time unchanged
                                    }));

                                    toast({
                                      title: "Success",
                                      description: "Card marked as reviewed successfully!",
                                    });
                                  }
                                } finally {
                                  // Remove loading state after operation completes
                                  setMarkingReviewed(prev => {
                                    const newSet = new Set(prev);
                                    newSet.delete(card.originalIndex);
                                    return newSet;
                                  });
                                }
                              }}
                              disabled={reviewedDifficult.has(card.originalIndex) || markingReviewed.has(card.originalIndex)}
                            >
                              {markingReviewed.has(card.originalIndex) ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  Marking...
                                </>
                              ) : (
                                reviewedDifficult.has(card.originalIndex) ? 'Reviewed' : 'Mark Reviewed'
                              )}
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                // Capture current session stats before tab change
                                const currentStats = { ...sessionStats };

                                // Jump to this card in flashcards tab using originalIndex
                                setCurrentCard(card.originalIndex);
                                setSessionComplete(false);
                                setIsFlipped(false);
                                setCardStudyStartTime(studyTime);
                                setIsReStudyingFromReview(true); // Mark that we're re-studying from review

                                // Prevent the tab-change effect from zeroing session counts
                                skipResetOnTabChange.current = true;

                                // Ensure stats are preserved immediately
                                setSessionStats(prev => ({
                                  correct: currentStats.correct,
                                  difficult: currentStats.difficult,
                                  timeSpent: studyTime
                                }));

                                handleTabSwitch('flashcards');

                                console.log('Study Again: Preserving stats:', currentStats);
                              }}
                            >
                              Study Again
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action Buttons */}
        {tab === 'flashcards' && isFlipped && flashcards.length > 0 && !isGuestUser && !sessionComplete && (
          <div className="max-w-full sm:max-w-4xl lg:max-w-5xl mx-auto px-4">
            <div className="text-center mb-3 sm:mb-4">
              <p className="text-sm text-muted-foreground">How well did you know this?</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {['again', 'hard', 'good', 'easy'].map((rating, idx) => {
                const icons = [X, RotateCcw, Check, Heart];
                const colors = [
                  'h-4 w-4 sm:h-5 sm:w-5 text-red-600 mb-1',
                  'h-4 w-4 sm:h-5 sm:w-5 text-orange-600 mb-1',
                  'h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mb-1',
                  'h-4 w-4 sm:h-5 sm:w-5 text-green-600 mb-1',
                ];
                const labels = ['Again', 'Hard', 'Good', 'Easy'];
                const intervals = ['<1m', '6m', '10m', '4d'];
                const Icon = icons[idx];

                // explicit classes so Tailwind can pick them up (no dynamic interpolation)
                const borderLight = ['border-red-200', 'border-orange-200', 'border-blue-200', 'border-green-200'];
                const borderDark = ['dark:border-red-700', 'dark:border-orange-700', 'dark:border-blue-700', 'dark:border-green-700'];
                const hoverLight = ['hover:!bg-red-50', 'hover:!bg-orange-50', 'hover:!bg-blue-50', 'hover:!bg-green-50'];
                const hoverDark = ['dark:hover:!bg-red-800/30', 'dark:hover:!bg-orange-800/30', 'dark:hover:!bg-blue-800/30', 'dark:hover:!bg-green-800/30'];

                const btnClasses = `flex flex-col items-center p-3 sm:p-4 h-auto ${borderLight[idx]} ${borderDark[idx]} ${hoverLight[idx]} ${hoverDark[idx]} transition-colors duration-150 text-xs sm:text-sm`;

                return (
                  <Button
                    key={rating}
                    variant="outline"
                    className={btnClasses}
                    onClick={() => handleNextCard(rating as 'again' | 'hard' | 'good' | 'easy')}
                    disabled={ratingInProgress !== null}
                  >
                    {ratingInProgress === rating ? (
                      <div className="h-4 w-4 sm:h-5 sm:w-5 mb-1">
                        <div className="animate-spin h-3 w-3 sm:h-4 sm:w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                      </div>
                    ) : (
                      <Icon className={colors[idx]} />
                    )}
                    <span className="text-xs sm:text-sm">{labels[idx]}</span>
                    <span className="text-xs text-muted-foreground">{intervals[idx]}</span>
                  </Button>
                );
              })}
            </div>
            <div className="text-center mt-3 sm:mt-4">
              <p className="text-xs text-muted-foreground px-2">
                Based on your response, this card will appear again at the shown interval
              </p>
            </div>
          </div>
        )}
        {tab === 'flashcards' && isFlipped && flashcards.length > 0 && isGuestUser && !sessionComplete && (
          <div className="max-w-full sm:max-w-4xl mx-auto text-center mt-4 px-4">
            <p className="text-sm text-muted-foreground mb-4">
              Sign up to track your progress and unlock spaced repetition!
            </p>
            <Button
              variant="outline"
              onClick={() => handleNextCard('good')}
              className="w-full sm:w-auto mt-2"
            >
              Next
            </Button>
          </div>
        )}

        {/* Study Controls */}
        <div className="max-w-2xl mx-auto mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center sm:space-x-4 sm:max-w-4xl">
          <Button variant="outline" onClick={handleRestartSession}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Restart Session
          </Button>
          <Button variant="outline" onClick={() => setShowSettings(true)}>
            Settings
          </Button>
          {isGuestUser ? (
            <Link to="/register">
              <Button variant="outline" className="border-green-500 text-green-700 hover:bg-green-50">
                <UserPlus className="h-4 w-4 mr-2" />
                Save Progress
              </Button>
            </Link>
          ) : (
            <Button variant="outline" onClick={handleExportProgress}>
              <FileText className="h-4 w-4 mr-2" />
              Export PDF Report
            </Button>
          )}
        </div>
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-8 shadow-lg max-w-sm w-full">
              <h2 className="text-lg font-bold mb-4">Settings</h2>
              <p className="mb-4 text-muted-foreground">Settings functionality coming soon!</p>
              <Button variant="outline" onClick={() => setShowSettings(false)}>Close</Button>
            </div>
          </div>
        )}

        {/* Study Stats */}
        <div className="max-w-full sm:max-w-4xl mx-auto mt-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-foreground">
                  Session Stats
                  {isGuestUser && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      Temporary
                    </Badge>
                  )}
                </h3>

                {/* Activity Study Timer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-xs text-muted-foreground mr-2">Current Activity:</span>
                    <StudyTimer
                      key={timerKey}
                      isActive={isStudying && !sessionComplete && !isTimerPaused}
                      initialTime={studyTime}
                      onTimeUpdate={setStudyTime}
                      className="text-sm font-medium bg-muted/30 px-2 py-1 rounded"
                    />
                    {isTimerPaused && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Paused
                      </Badge>
                    )}
                  </div>

                  {/* Timer Control Buttons */}
                  <div className="flex items-center gap-1">
                    {!isTimerPaused ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePauseTimer}
                        disabled={!isStudying || isOverallComplete}
                        className="text-xs px-2 py-1 h-7"
                        title="Pause timer"
                      >
                        <Pause className="h-3 w-3" />
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResumeTimer}
                        className="text-xs px-2 py-1 h-7"
                        title="Resume timer"
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleStopTimer}
                      disabled={!isStudying}
                      className="text-xs px-2 py-1 h-7"
                      title="Stop timer"
                    >
                      <Square className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetTimer}
                      className="text-xs px-2 py-1 h-7"
                      title="Reset timer"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">{sessionStats.correct}</div>
                  <div className="text-sm text-muted-foreground">Correct</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">{sessionStats.difficult}</div>
                  <div className="text-sm text-muted-foreground">Marked Difficult</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{formatTime(overallStudyTime)}</div>
                  <div className="text-sm text-muted-foreground">Total Time</div>
                </div>
              </div>

              {isGuestUser && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Create an account to save your study statistics and track long-term progress!
                  </p>
                </div>
              )}

              {!isGuestUser && user && (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowStatsPanel(!showStatsPanel)}
                  >
                    {showStatsPanel ? 'Hide Study Statistics' : 'View Study Statistics'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Study Statistics Panel */}
          {showStatsPanel && !isGuestUser && user && (
            <div className="mt-4">
              <StudyStatsPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Study;
