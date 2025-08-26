import { useState, useEffect, useMemo } from 'react';
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
  Clock, RefreshCw, CheckSquare, Layers as LayersIcon, Pencil as PencilIcon
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ThemeSwitcher from '@/components/layout/ThemeSwitcher';
import { AnimatePresence, motion } from 'framer-motion';
import StudyTimer from '@/components/study/StudyTimer';
import StudyStatsPanel from '@/components/study/StudyStatsPanel';
import { startStudySession, recordFlashcardReview, getCurrentStudySession, clearCurrentStudySession } from '@/utils/studyTracking';
import { API_ENDPOINTS } from '@/config/api';

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

  // Study tracking specific state
  const [studyTime, setStudyTime] = useState(0);  // Time spent on current activity (flashcards, quiz, exercises)
  const [overallStudyTime, setOverallStudyTime] = useState(0);  // Total time spent across all activities
  const [isStudying, setIsStudying] = useState(false);
  const [cardStudyStartTime, setCardStudyStartTime] = useState(0);
  const [studySession, setStudySession] = useState<any>(null);
  const [showStatsPanel, setShowStatsPanel] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const [overallTimerKey, setOverallTimerKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [ratingInProgress, setRatingInProgress] = useState<'again' | 'hard' | 'good' | 'easy' | null>(null);

  const isGuestUser = !user && generatedContent !== null;

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
      setGeneratedContent(parsed);
      setFlashcards(parsed.flashcards || []);
      setQuizzes(parsed.quizzes || []);
      setExercises(parsed.exercises || []);
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
    }
  };

  useEffect(() => {
    // Initial load only
    const data = localStorage.getItem('generatedContent');
    const deckId = searchParams.get('deckId');
    const deckName = searchParams.get('deck');
    if (deckId || deckName) {
      fetchMaterials(false);
    } else if (data) {
      const parsed: GeneratedContent = JSON.parse(data);
      setGeneratedContent(parsed);
      setFlashcards(parsed.flashcards || []);
      setQuizzes(parsed.quizzes || []);
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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

    if (isStudying && !sessionComplete) {
      timer = setInterval(() => {
        setOverallStudyTime(prevTime => prevTime + 1);
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isStudying, sessionComplete]);

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
  }, [quizzes, tab]);

  // Reset exercise state when exercises change or tab switches
  useEffect(() => {
    setExerciseStep(0);
    setExerciseAnswers(Array(exercises.length).fill(null));
    setExerciseCompleted(false);
    setShowExerciseAnswers(false);
  }, [exercises, tab]);

  // Reset review state when flashcards change or when switching to review tab
  useEffect(() => {
    if (tab === 'review') {
      setReviewedDifficult(new Set()); // Reset reviewed state when entering review tab
    }
  }, [flashcards, tab]);

  // For Review tab: filter difficult cards using useMemo to recalculate when ratings change
  const difficultCards = useMemo(() => {
    const filtered = flashcards.filter((_, idx) => {
      // Only include cards that are currently marked as 'hard'
      return sessionRatings[idx] === 'hard';
    });

    return filtered;
  }, [flashcards, sessionRatings, tab]); // Recalculate when tab changes or ratings update

  // Loading state while fetching materials
  if (isLoadingMaterials) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-800">
        <div className="absolute top-4 right-4 z-50"><ThemeSwitcher /></div>
        <div className="max-w-full sm:max-w-4xl mx-auto px-6 py-16 text-center">
          <BookOpen className="h-16 w-16 text-blue-500 mx-auto mb-4 animate-pulse" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Loading study materials...</h1>
          <p className="text-muted-foreground">Please wait while we fetch your deck content.</p>
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
            <h1 className="text-2xl font-bold text-foreground mb-4">No Study Materials Found</h1>
            <p className="text-muted-foreground mb-6">We couldn't find flashcards, quizzes, or exercises for this deck.</p>
            <Link to="/upload">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
                Upload Document
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
            <h1 className="text-2xl font-bold text-foreground mb-4">No Flashcards Available</h1>
            <p className="text-muted-foreground mb-6">
              No flashcards were generated from your uploaded document. Please try uploading a different document.
            </p>
            <Link to="/upload">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
                Upload Document
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
        // Record the flashcard review using our utility
        const result = await recordFlashcardReview(
          currentCardData.id || `card-${currentCard}`,
          rating,
          studyTimeForCard,
          session
        );

        // If we received session stats from the backend, use them to update our UI
        if (result.success && result.sessionStats) {

          // Update session stats with the values from the backend
          setSessionStats({
            correct: result.sessionStats.good_or_easy_count || 0,
            difficult: result.sessionStats.hard_count || 0,
            timeSpent: studyTime // Keep the existing time
          });
        } else {
          // Fall back to the previous behavior if we don't have server stats
          if (rating === 'good' || rating === 'easy') {
            setSessionStats(prev => ({ ...prev, correct: prev.correct + 1 }));
          } else if (rating === 'hard') {
            setSessionStats(prev => ({ ...prev, difficult: prev.difficult + 1 }));
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
    } else {
      setSessionComplete(true);
      setIsStudying(false); // Stop the timer
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
      bookmarkedCards,
      time: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'memo-spark-session.json';
    a.click();
    URL.revokeObjectURL(url);
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
        <div className="container mx-auto px-4 py-2 flex justify-between items-center">
          <Link to="/dashboard" className="flex items-center space-x-2 group">
            <div className="p-1.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg group-hover:scale-105 transition-transform">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              MemoSpark
            </span>
          </Link>

          <div className="flex items-center space-x-3">
            {/* Overall study time always shown in nav bar */}
            <div className="hidden sm:flex items-center mr-2 text-sm">
              <Clock className={`h-4 w-4 ${isStudying ? 'text-green-500' : 'text-blue-600'} mr-1`} />
              <span className="font-medium">{formatTime(overallStudyTime)}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchMaterials(true)}
              disabled={isRefreshing}
              className="bg-white/80 dark:bg-gray-800/80 mr-2"
            >
              {isRefreshing ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </span>
                  Refreshing
                </span>
              ) : (
                <span className="flex items-center">
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Refresh
                </span>
              )}
            </Button>
            <div className="border-l border-gray-200 dark:border-gray-700 h-6 mx-1"></div>
            <ThemeSwitcher />
          </div>
        </div>
      </div>

      <div className="max-w-full sm:max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-8 pt-24 mt-10">
        {/* Guest Warning Banner */}
        {isGuestUser && (
          <Alert className="mb-6 border-orange-200 bg-gradient-to-r from-orange-50 to-red-50 text-sm sm:text-base shadow-sm">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Guest Session:</strong> These flashcards are for temporary use only—create a free account to save them and track your progress!
              <Link to="/register" className="ml-2 underline font-medium hover:text-orange-600">
                Sign up now to unlock full features →
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Study Header */}
        <div className="text-center mb-8">
          <div className="flex flex-col items-center justify-center mb-4">
            <div className="flex items-center space-x-2 mb-3">
              <div className="p-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full">
                <BookOpen className="h-7 w-7 text-blue-600" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">
                {user ? 'Your Study Session' : 'Uploaded Content'}
              </h1>
              {isGuestUser && (
                <Badge variant="outline" className="text-orange-600 border-orange-300 ml-2">
                  Guest Mode
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
            <div className="bg-card dark:bg-card/30 rounded-lg p-3 max-w-md mx-auto mb-5 shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between px-2 mb-2">
                <div className="flex items-center">
                  <Badge className={getDifficultyColor(currentCardData.difficulty) + " mr-2 px-2 py-0.5"}>
                    {capitalize(currentCardData.difficulty)}
                  </Badge>
                  <Badge variant="outline" className="px-2 py-0.5">{currentCardData.type}</Badge>
                </div>
                <span className="text-sm font-medium bg-gray-50 dark:bg-gray-800/40 px-2 py-1 rounded-md">
                  Card {currentCard + 1} of {flashcards.length}
                </span>
              </div>
              <div className="mt-3">
                <Progress
                  value={progress}
                  className="h-2.5"
                  indicatorClassName="bg-gradient-to-r from-blue-500 to-purple-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Tab Selector */}
        <div className="flex justify-center mb-6">
          <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 w-full max-w-md shadow-sm border border-gray-100 dark:border-gray-700">
            <Button
              className={`flex-1 rounded-md transition-all duration-300 ${tab === 'flashcards' ?
                'bg-gradient-to-r from-blue-500/90 to-purple-500/90 text-white shadow-md' :
                'bg-transparent text-foreground hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              variant="ghost"
              onClick={() => setTab('flashcards')}
              size="sm"
            >
              <LayersIcon className={`h-4 w-4 mr-1.5 ${tab === 'flashcards' ? 'text-white' : 'text-blue-500 dark:text-blue-400'}`} />
              Flashcards
            </Button>
            <Button
              className={`flex-1 rounded-md transition-all duration-300 ${tab === 'quiz' ?
                'bg-gradient-to-r from-blue-500/90 to-purple-500/90 text-white shadow-md' :
                'bg-transparent text-foreground hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              variant="ghost"
              onClick={() => setTab('quiz')}
              size="sm"
            >
              <CheckSquare className={`h-4 w-4 mr-1.5 ${tab === 'quiz' ? 'text-white' : 'text-blue-500 dark:text-blue-400'}`} />
              Quiz
            </Button>
            <Button
              className={`flex-1 rounded-md transition-all duration-300 ${tab === 'exercises' ?
                'bg-gradient-to-r from-blue-500/90 to-purple-500/90 text-white shadow-md' :
                'bg-transparent text-foreground hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              variant="ghost"
              onClick={() => setTab('exercises')}
              size="sm"
            >
              <PencilIcon className={`h-4 w-4 mr-1.5 ${tab === 'exercises' ? 'text-white' : 'text-blue-500 dark:text-blue-400'}`} />
              Exercises
            </Button>
            <Button
              className={`flex-1 rounded-md transition-all duration-300 ${tab === 'review' ?
                'bg-gradient-to-r from-blue-500/90 to-purple-500/90 text-white shadow-md' :
                'bg-transparent text-foreground hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              variant="ghost"
              onClick={() => setTab('review')}
              size="sm"
            >
              <RotateCcw className={`h-4 w-4 mr-1.5 ${tab === 'review' ? 'text-white' : 'text-blue-500 dark:text-blue-400'}`} />
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
                <div className="max-w-full sm:max-w-4xl mx-auto mb-8 sm:px-4">
                  {sessionComplete && (
                    <motion.div
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -40 }}
                      transition={{ duration: 0.5 }}
                      className="max-w-full sm:max-w-4xl mx-auto text-center mt-16 sm:mt-24 mb-16 sm:mb-24 py-8 sm:py-16"
                    >
                      <h2 className="text-2xl font-bold mb-4">🎉 Session Complete!</h2>
                      <p className="text-muted-foreground mb-6">
                        You've reviewed all flashcards for this session.
                      </p>

                      {/* Summary of the study session */}
                      <div className="mb-8">
                        <Card>
                          <CardContent className="p-6">
                            <h3 className="font-semibold text-xl mb-4">Session Summary</h3>
                            <div className="grid grid-cols-3 gap-4 text-center">
                              <div>
                                <div className="text-3xl font-bold text-green-600">
                                  {sessionStats.correct}
                                </div>
                                <div className="text-sm text-muted-foreground">Cards Mastered</div>
                              </div>
                              <div>
                                <div className="text-3xl font-bold text-blue-600">
                                  {flashcards.length}
                                </div>
                                <div className="text-sm text-muted-foreground">Total Cards</div>
                              </div>
                              <div>
                                <div className="text-3xl font-bold text-purple-600">
                                  {studyTime > 0 ? formatTime(studyTime) : '0:00'}
                                </div>
                                <div className="text-sm text-muted-foreground">Study Time</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
                        <Button onClick={handleRestartSession}>
                          Restart Session
                        </Button>
                        <Link to="/dashboard?refresh=true">
                          <Button variant="outline">
                            Go to Dashboard
                          </Button>
                        </Link>
                        <Button variant="outline" onClick={() => setTab('review')}>
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
                      className="h-fit sm:h-96 cursor-pointer transform-gpu transition-all duration-300 hover:scale-105 mt-2 sm:mt-0 "
                      onClick={handleCardFlip}
                    >
                      <CardContent className="h-full flex flex-col justify-center items-center p-2 sm:p-8 text-center">
                        {!isFlipped ? (
                          <div className="space-y-4">
                            <div className="text-sm text-muted-foreground mb-4">Question</div>
                            <h2 className="text-1xl sm:text-2xl font-semibold text-foreground leading-relaxed">
                              {currentCardData.question}
                            </h2>
                            <div className="mt-8">
                              <p className="text-sm text-muted-foreground">Click to reveal answer</p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="text-sm text-muted-foreground mb-4">Answer</div>
                            <h2 className="text-1xl sm:text-2xl font-medium text-foreground leading-relaxed">
                              {currentCardData.answer}
                            </h2>
                            <div className="mt-8 flex items-center justify-center space-x-4">
                              <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); handlePlayAudio(currentCardData.answer); }}>
                                <Volume2 className="h-4 w-4 mr-2" />
                                Play Audio
                              </Button>
                              <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); handleBookmark(currentCard); }}>
                                <Star className={`h-4 w-4 mr-2 ${bookmarkedCards.includes(currentCard) ? 'text-yellow-400 fill-yellow-400' : ''}`} />
                                {isGuestUser ? 'Sign up to Bookmark' : (bookmarkedCards.includes(currentCard) ? 'Bookmarked' : 'Bookmark')}
                              </Button>
                            </div>
                          </div>
                        )}
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
                <div className="max-w-full sm:max-w-4xl px-1 sm:mx-auto mb-8 flex flex-col justify-center rounded-md sm:rounded-lg">
                  {quizzes.length === 0 ? (
                    <div className="text-center">
                      <AlertCircle className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <h2 className="text-lg font-semibold mb-2">No Quizzes Available</h2>
                      <p className="text-muted-foreground">No quizzes were generated for this document. Try uploading a different document or check back later.</p>
                    </div>
                  ) : quizCompleted ? (
                    <div className="text-center">
                      {/* Quiz Results Summary */}
                      <Card className="mb-6 bg-card shadow-lg border border-border">
                        <CardContent className="flex flex-col items-center p-3 sm:p-6 text-sm sm:text-base">
                          <div className="text-3xl font-bold mb-2 text-foreground">
                            {(() => {
                              const correct = quizzes.filter((q, idx) => quizAnswers[idx] === q.correct_answer_option).length;
                              if (correct === quizzes.length) return '🏆 Perfect!';
                              if (correct / quizzes.length >= 0.8) return '🎉 Great Job!';
                              if (correct / quizzes.length >= 0.5) return '👍 Good Effort!';
                              return '💡 Keep Practicing!';
                            })()}
                          </div>
                          <div className="text-2xl font-bold mb-1 text-foreground">
                            {quizzes.filter((q, idx) => quizAnswers[idx] === q.correct_answer_option).length} / {quizzes.length}
                          </div>
                          <div className="text-base mb-2 text-muted-foreground">
                            Score
                          </div>
                          <Progress value={100 * quizzes.filter((q, idx) => quizAnswers[idx] === q.correct_answer_option).length / quizzes.length} className="w-full max-w-xs mb-2" />
                          <div className="text-sm text-muted-foreground">
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
                      <div className="mb-6 grid gap-4">
                        {quizzes.map((quiz, idx) => {
                          const userAnswer = quizAnswers[idx];
                          const isCorrect = userAnswer === quiz.correct_answer_option;
                          return (
                            <Card key={idx} className={`mb-2 shadow border-l-4 bg-card text-card-foreground ${isCorrect ? 'border-primary' : 'border-destructive'}`}>
                              <CardContent className="p-2 sm:p-4 text-sm sm:text-base">
                                <div className="flex items-center mb-2">
                                  <span className={`mr-2 text-lg ${isCorrect ? 'text-primary' : 'text-destructive'}`}>{isCorrect ? '✔️' : '❌'}</span>
                                  <span className="font-semibold text-card-foreground">Q{idx + 1}: {quiz.question}</span>
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
                                    <span className="text-primary font-semibold">{quiz.correct_answer_option}</span>
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
                          setQuizStep(0);
                          setQuizAnswers(Array(quizzes.length).fill(null));
                          setQuizCompleted(false);
                        }}>
                          Retry Quiz
                        </Button>
                        <Button variant="outline" onClick={() => {
                          setTab('review');
                        }}>
                          Review Incorrect Answers
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center min-h-[400px]">
                      <Card className="w-full mb-4 bg-card shadow-md rounded-md sm:rounded-lg">
                        <CardContent className="p-2 sm:p-6 overflow-x-auto pb-4">
                          <div className="mb-2 flex items-center gap-2">
                            <Badge variant="secondary">Quiz</Badge>
                            <Badge variant="outline">{capitalize(quizzes[quizStep].difficulty) || "Unknown"}</Badge>
                          </div>
                          <div className="mb-4 font-medium break-words break-all whitespace-pre-line text-base sm:text-lg">Q{quizStep + 1}: {quizzes[quizStep].question}</div>
                          <hr className="my-2 border-muted" />
                          <ul className="mb-4 space-y-3 break-words">
                            {quizzes[quizStep].options.map((option, i) => (
                              <li key={i} className="w-full">
                                <Button
                                  variant={quizAnswers[quizStep] === option ? 'default' : 'outline'}
                                  className="w-full justify-start break-words break-all whitespace-pre-line text-left px-3 py-4 text-base sm:px-4 sm:py-5 sm:text-lg min-h-fit border border-muted bg-muted/60 hover:bg-muted/80 transition rounded-md"
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
                          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between w-full mt-2">
                            <Button
                              variant="outline"
                              onClick={() => setQuizStep(s => Math.max(0, s - 1))}
                              disabled={quizStep === 0}
                              className="w-full"
                            >
                              Previous
                            </Button>
                            {quizStep < quizzes.length - 1 ? (
                              <Button
                                onClick={() => setQuizStep(s => Math.min(quizzes.length - 1, s + 1))}
                                disabled={quizAnswers[quizStep] === undefined || quizAnswers[quizStep] === null}
                                className="w-full"
                              >
                                Next
                              </Button>
                            ) : (
                              <Button
                                onClick={() => setQuizCompleted(true)}
                                disabled={quizAnswers.length !== quizzes.length || quizAnswers.includes(null) || quizAnswers.includes(undefined)}
                                className="w-full"
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
                        <Button variant="outline" onClick={() => setTab('review')}>
                          Review Difficult Cards
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
                                onClick={() => setExerciseCompleted(true)}
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
                      <Card key={idx} className="mb-4 bg-card shadow-md">
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
                                // Mark as reviewed: record an 'good' review quickly with 1s
                                if (user && session && card.id !== undefined) {
                                  try {
                                    const result = await recordFlashcardReview(card.id, 'good', 1, session);
                                    const newSet = new Set(reviewedDifficult);
                                    newSet.add(idx);
                                    setReviewedDifficult(newSet);

                                    // Update session ratings to remove this card from difficult cards
                                    // Find the original index of this card in the flashcards array
                                    const originalIndex = flashcards.findIndex(fc =>
                                      fc.question === card.question && fc.answer === card.answer
                                    );
                                    if (originalIndex !== -1) {
                                      setSessionRatings(prev => {
                                        const updated = [...prev];
                                        updated[originalIndex] = 'good'; // Update from 'hard' to 'good'
                                        return updated;
                                      });
                                    }

                                    // Update session stats if available
                                    if (result.success && result.sessionStats) {
                                      setSessionStats({
                                        correct: result.sessionStats.good_or_easy_count || 0,
                                        difficult: result.sessionStats.hard_count || 0,
                                        timeSpent: studyTime
                                      });
                                    }
                                  } catch (e) {
                                    console.error('Failed to mark reviewed', e);
                                  }
                                } else {
                                  // For guest users, just update the session ratings
                                  const originalIndex = flashcards.findIndex(fc =>
                                    fc.question === card.question && fc.answer === card.answer
                                  );
                                  if (originalIndex !== -1) {
                                    setSessionRatings(prev => {
                                      const updated = [...prev];
                                      updated[originalIndex] = 'good'; // Update from 'hard' to 'good'
                                      return updated;
                                    });
                                  }
                                  const newSet = new Set(reviewedDifficult);
                                  newSet.add(idx);
                                  setReviewedDifficult(newSet);
                                }
                              }}
                              disabled={reviewedDifficult.has(idx)}
                            >
                              {reviewedDifficult.has(idx) ? 'Reviewed' : 'Mark Reviewed'}
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                // Jump to this card in flashcards tab
                                const targetIndex = flashcards.findIndex(fc => fc.question === card.question && fc.answer === card.answer);
                                if (targetIndex !== -1) {
                                  setCurrentCard(targetIndex);
                                  setSessionComplete(false);
                                  setIsFlipped(false);
                                  setCardStudyStartTime(studyTime);
                                  setTab('flashcards');
                                }
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
          <div className="max-w-full sm:max-w-4xl mx-auto">
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground">How well did you know this?</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {['again', 'hard', 'good', 'easy'].map((rating, idx) => {
                const icons = [X, RotateCcw, Check, Heart];
                const colors = [
                  'h-5 w-5 text-red-600 mb-1',
                  'h-5 w-5 text-orange-600 mb-1',
                  'h-5 w-5 text-blue-600 mb-1',
                  'h-5 w-5 text-green-600 mb-1',
                ];
                const labels = ['Again', 'Hard', 'Good', 'Easy'];
                const intervals = ['<1m', '6m', '10m', '4d'];
                const Icon = icons[idx];
                return (
                  <Button
                    key={rating}
                    variant="outline"
                    className={`flex flex-col items-center p-4 h-auto border-${['red', 'orange', 'blue', 'green'][idx]}-200 hover:bg-${['red', 'orange', 'blue', 'green'][idx]}-50`}
                    onClick={() => handleNextCard(rating as 'again' | 'hard' | 'good' | 'easy')}
                    disabled={ratingInProgress !== null}
                  >
                    {ratingInProgress === rating ? (
                      <div className="h-5 w-5 mb-1">
                        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                      </div>
                    ) : (
                      <Icon className={colors[idx]} />
                    )}
                    <span className="text-xs">{labels[idx]}</span>
                    <span className="text-xs text-muted-foreground">{intervals[idx]}</span>
                  </Button>
                );
              })}
            </div>
            <div className="text-center mt-4">
              <p className="text-xs text-muted-foreground">
                Based on your response, this card will appear again at the shown interval
              </p>
            </div>
          </div>
        )}
        {tab === 'flashcards' && isFlipped && flashcards.length > 0 && isGuestUser && !sessionComplete && (
          <div className="max-w-full sm:max-w-4xl mx-auto text-center mt-4">
            <p className="text-sm text-muted-foreground mb-4">
              Sign up to track your progress and unlock spaced repetition!
            </p>
            <Button
              variant="outline"
              onClick={() => handleNextCard('good')}
              className="mt-2"
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
              Export Progress
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
                <div className="flex items-center">
                  <span className="text-xs text-muted-foreground mr-2">Current Activity:</span>
                  <StudyTimer
                    key={timerKey}
                    isActive={isStudying && !sessionComplete}
                    initialTime={studyTime}
                    onTimeUpdate={setStudyTime}
                    className="text-sm font-medium bg-muted/30 px-2 py-1 rounded"
                  />
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
