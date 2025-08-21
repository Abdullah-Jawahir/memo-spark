import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RotateCcw, Heart, X, Check, Volume2, BookOpen, Star, AlertCircle, UserPlus, Edit3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ThemeSwitcher from '@/components/layout/ThemeSwitcher';
import { AnimatePresence, motion } from 'framer-motion';

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
  const { user } = useAuth();
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

  const isGuestUser = !user && generatedContent !== null;

  useEffect(() => {
    const data = localStorage.getItem('generatedContent');
    if (data) {
      const parsed: GeneratedContent = JSON.parse(data);
      setGeneratedContent(parsed);
      setFlashcards(parsed.flashcards || []);
      setQuizzes(parsed.quizzes || []);
      setExercises(parsed.exercises || []);
      setSessionRatings(Array(parsed.flashcards?.length || 0).fill(null));
    }
  }, []);

  const currentCardData = flashcards[currentCard];
  const progress = flashcards.length > 0 ? ((currentCard + 1) / flashcards.length) * 100 : 0;

  // Timer for session stats
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionStats(prev => ({ ...prev, timeSpent: prev.timeSpent + 1 }));
    }, 1000);
    return () => clearInterval(timer);
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

  // Handle case where no cards are available
  if (!generatedContent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-800">
        <div className="absolute top-4 right-4 z-50"><ThemeSwitcher /></div>
        <div className="max-w-full sm:max-w-4xl mx-auto px-6 py-8">
          <div className="text-center">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-4">No Flashcards Available</h1>
            <p className="text-muted-foreground mb-6">
              No flashcards are available for study. Please create or upload some flashcards first.
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
    setIsFlipped(!isFlipped);
  };

  const handleNextCard = (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (rating === 'good' || rating === 'easy') {
      setSessionStats(prev => ({ ...prev, correct: prev.correct + 1 }));
    } else if (rating === 'hard') {
      setSessionStats(prev => ({ ...prev, difficult: prev.difficult + 1 }));
    }
    setSessionRatings(prev => {
      const updated = [...prev];
      updated[currentCard] = rating;
      return updated;
    });
    if (currentCard < flashcards.length - 1) {
      setCurrentCard(currentCard + 1);
      setIsFlipped(false);
    } else {
      setSessionComplete(true);
    }
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
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // For Review tab: filter difficult cards
  const difficultCards = flashcards.filter((_, idx) => {
    // If the card index is less than or equal to currentCard and was marked as difficult
    // We'll need to track which cards were marked as difficult in session
    // Let's add a state to track ratings per card
    return sessionRatings[idx] === 'hard';
  });

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

  const handleRestartSession = () => {
    setCurrentCard(0);
    setIsFlipped(false);
    setSessionStats({ correct: 0, difficult: 0, timeSpent: 0 });
    setSessionRatings(Array(flashcards.length).fill(null));
    setSessionComplete(false);
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
      <div className="absolute top-4 right-4 z-50"><ThemeSwitcher /></div>
      <div className="max-w-full sm:max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        {/* Logo Header */}
        <div className="absolute top-2 left-2 z-50 sm:top-4 sm:left-4">
          <Link to="/dashboard" className="flex items-center space-x-2 group">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg group-hover:scale-105 transition-transform">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <span className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              MemoSpark
            </span>
          </Link>
        </div>

        {/* Guest Warning Banner */}
        {isGuestUser && (
          <Alert className="mb-6 border-orange-200 bg-gradient-to-r from-orange-50 to-red-50 text-sm sm:text-base">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Guest Session:</strong> These flashcards are for temporary use only—create a free account to save them and track your progress!
              <Link to="/register" className="ml-2 underline font-medium hover:text-orange-600">
                Sign up now to unlock full features →
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="text-center mb-8 mt-10 sm:mt-0">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <BookOpen className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-foreground">
              {user ? 'Your Study Session' : 'Uploaded Content'}
            </h1>
            {isGuestUser && (
              <Badge variant="outline" className="text-orange-600 border-orange-300">
                Guest Mode
              </Badge>
            )}
          </div>
          {tab === 'flashcards' && flashcards.length > 0 && (
            <div className="flex items-center justify-center space-x-4 mb-4">
              <Badge className={getDifficultyColor(currentCardData.difficulty)}>
                {capitalize(currentCardData.difficulty)}
              </Badge>
              <Badge variant="outline">{currentCardData.type}</Badge>
              <span className="text-sm text-muted-foreground">
                Card {currentCard + 1} of {flashcards.length}
              </span>
            </div>
          )}
          {tab === 'flashcards' && flashcards.length > 0 && (
            <Progress value={progress} className="max-w-md mx-auto" />
          )}
        </div>

        {/* Tab Selector */}
        <div className="flex justify-center mb-2 sm:mb-8">
          <div className="flex bg-card rounded-lg p-1 w-full max-w-xs">
            <Button
              className={`flex-1 rounded-l-lg transition-all duration-200 ${tab === 'flashcards' ? 'bg-white dark:bg-muted text-black dark:text-foreground shadow' : 'bg-transparent text-foreground hover:bg-white/10 dark:hover:bg-muted/20'}`}
              variant="ghost"
              onClick={() => setTab('flashcards')}
            >
              Flashcards
            </Button>
            <Button
              className={`flex-1 transition-all duration-200 ${tab === 'quiz' ? 'bg-white dark:bg-muted text-black dark:text-foreground shadow' : 'bg-transparent text-foreground hover:bg-white/10 dark:hover:bg-muted/20'}`}
              variant="ghost"
              onClick={() => setTab('quiz')}
            >
              Quiz
            </Button>
            <Button
              className={`flex-1 transition-all duration-200 ${tab === 'exercises' ? 'bg-white dark:bg-muted text-black dark:text-foreground shadow' : 'bg-transparent text-foreground hover:bg-white/10 dark:hover:bg-muted/20'}`}
              variant="ghost"
              onClick={() => setTab('exercises')}
            >
              Exercises
            </Button>
            <Button
              className={`flex-1 rounded-r-lg transition-all duration-200 ${tab === 'review' ? 'bg-white dark:bg-muted text-black dark:text-foreground shadow' : 'bg-transparent text-foreground hover:bg-white/10 dark:hover:bg-muted/20'}`}
              variant="ghost"
              onClick={() => setTab('review')}
            >
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
                      <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
                        <Button onClick={handleRestartSession}>
                          Restart Session
                        </Button>
                        <Link to="/dashboard">
                          <Button variant="outline">
                            Go to Dashboard
                          </Button>
                        </Link>
                        <Button variant="outline" onClick={() => setTab('review')}>
                          Review Difficult Cards
                        </Button>
                      </div>
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
                  <h2 className="text-xl font-bold mb-4 text-foreground">Review: Difficult Cards</h2>
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
                          <div className="mb-2 break-words">A: {card.answer}</div>
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
        {tab === 'flashcards' && isFlipped && flashcards.length > 0 && !isGuestUser && (
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
                    onClick={async () => {
                      // Save review to backend for auth users
                      const card = flashcards[currentCard];
                      if (card && card.id) {
                        try {
                          await fetch('/api/flashcard-reviews', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({
                              study_material_id: card.id,
                              rating,
                              reviewed_at: new Date().toISOString(),
                            }),
                          });
                        } catch (e) {
                          // Optionally handle error
                        }
                      }
                      handleNextCard(rating as 'again' | 'hard' | 'good' | 'easy');
                    }}
                  >
                    <Icon className={colors[idx]} />
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
        {tab === 'flashcards' && isFlipped && flashcards.length > 0 && isGuestUser && (
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
              <h3 className="font-semibold text-foreground mb-4">
                Session Stats
                {isGuestUser && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    Temporary
                  </Badge>
                )}
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">{sessionStats.correct}</div>
                  <div className="text-sm text-muted-foreground">Correct</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">{sessionStats.difficult}</div>
                  <div className="text-sm text-muted-foreground">Difficult</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{formatTime(sessionStats.timeSpent)}</div>
                  <div className="text-sm text-muted-foreground">Time Spent</div>
                </div>
              </div>
              {isGuestUser && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Create an account to save your study statistics and track long-term progress!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Study;
