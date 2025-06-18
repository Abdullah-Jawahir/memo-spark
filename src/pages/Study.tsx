import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RotateCcw, Heart, X, Check, Volume2, BookOpen, Star, AlertCircle, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ThemeSwitcher from '@/components/layout/ThemeSwitcher';

interface Flashcard {
  id: number;
  question: string;
  answer: string;
  difficulty: string;
  subject: string;
  type: string;
}

interface GeneratedCard {
  type: string;
  question: string;
  answer: string;
  difficulty: string;
}

const Study = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studyMode, setStudyMode] = useState('flashcard');
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    difficult: 0,
    timeSpent: 0
  });

  // Get guest cards from localStorage if available
  const getGuestCardsFromStorage = () => {
    try {
      const storedCards = localStorage.getItem('guestCards');
      console.log('Stored cards from localStorage:', storedCards);
      return storedCards ? JSON.parse(storedCards) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  };

  const guestCardsFromStorage = getGuestCardsFromStorage();
  
  // Determine if user is guest - check authentication first, then localStorage
  const isGuestUser = !user && guestCardsFromStorage !== null;
  
  console.log('Guest detection:', {
    user: user ? 'Signed in' : 'Not signed in',
    hasLocalStorageCards: guestCardsFromStorage !== null,
    finalIsGuest: isGuestUser
  });

  // Parse cards - handle both signed-in users and guests
  const flashcards = (() => {
    // If user is signed in and has cards in localStorage, use them
    if (user && guestCardsFromStorage) {
      try {
        console.log('Signed-in user with uploaded cards');
        const mappedCards = guestCardsFromStorage.map((card: GeneratedCard, index: number): Flashcard => ({
          ...card,
          id: index + 1,
          subject: 'Uploaded Content'
        }));
        return mappedCards;
      } catch (error) {
        console.error('Error parsing cards for signed-in user:', error);
        return [];
      }
    }
    
    // If user is guest and has cards in localStorage, use them
    if (isGuestUser && guestCardsFromStorage) {
      try {
        console.log('Guest user with uploaded cards');
        const mappedCards = guestCardsFromStorage.map((card: GeneratedCard, index: number): Flashcard => ({
          ...card,
          id: index + 1,
          subject: 'Uploaded Content'
        }));
        return mappedCards;
      } catch (error) {
        console.error('Error parsing guest cards:', error);
        return [];
      }
    }
    
    console.log('No cards available');
    return [];
  })();

  const currentCardData = flashcards[currentCard];
  const progress = ((currentCard + 1) / flashcards.length) * 100;

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
        // Clear localStorage after a delay to allow navigation (only for guests)
        setTimeout(() => {
          localStorage.removeItem('guestCards');
        }, 1000);
      }
    };
  }, [isGuestUser]);

  // Handle case where no cards are available
  if (flashcards.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-800">
        <div className="absolute top-4 right-4 z-50"><ThemeSwitcher /></div>
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="text-center">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-4">No Flashcards Available</h1>
            <p className="text-muted-foreground mb-6">
              {isGuestUser && guestCardsFromStorage 
                ? "No cards were generated from your uploaded document. Please try uploading a different document."
                : "No flashcards are available for study. Please create or upload some flashcards first."
              }
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
    console.log(`Card ${currentCard} rated as: ${rating}`);
    
    // Update stats
    if (rating === 'good' || rating === 'easy') {
      setSessionStats(prev => ({ ...prev, correct: prev.correct + 1 }));
    } else if (rating === 'hard') {
      setSessionStats(prev => ({ ...prev, difficult: prev.difficult + 1 }));
    }

    if (currentCard < flashcards.length - 1) {
      setCurrentCard(currentCard + 1);
      setIsFlipped(false);
    } else {
      // Study session complete
      console.log('Study session completed!');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Hard': return 'bg-red-100 text-red-800';
      default: return 'bg-card text-card-foreground';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-800">
      <div className="absolute top-4 right-4 z-50"><ThemeSwitcher /></div>
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Logo Header */}
        <div className="absolute top-4 left-4 z-50">
          <Link to="/dashboard" className="flex items-center space-x-2 group">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg group-hover:scale-105 transition-transform">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              MemoSpark
            </span>
          </Link>
        </div>

        {/* Guest Warning Banner */}
        {isGuestUser && (
          <Alert className="mb-6 border-orange-200 bg-gradient-to-r from-orange-50 to-red-50">
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
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <BookOpen className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-foreground">
              {user ? 'Your Study Session' : (guestCardsFromStorage ? 'Uploaded Content' : 'Demo Flashcards')}
            </h1>
            {isGuestUser && (
              <Badge variant="outline" className="text-orange-600 border-orange-300">
                Guest Mode
              </Badge>
            )}
          </div>
          <div className="flex items-center justify-center space-x-4 mb-4">
            <Badge className={getDifficultyColor(currentCardData.difficulty)}>
              {currentCardData.difficulty}
            </Badge>
            <Badge variant="outline">{currentCardData.subject}</Badge>
            <Badge variant="outline">{currentCardData.type}</Badge>
            <span className="text-sm text-muted-foreground">
              Card {currentCard + 1} of {flashcards.length}
            </span>
          </div>
          <Progress value={progress} className="max-w-md mx-auto" />
        </div>

        {/* Study Mode Selector */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-card rounded-lg p-1">
            <Button
              variant={studyMode === 'flashcard' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setStudyMode('flashcard')}
            >
              Flashcards
            </Button>
            <Button
              variant={studyMode === 'quiz' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setStudyMode('quiz')}
            >
              Quiz
            </Button>
            <Button
              variant={studyMode === 'review' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setStudyMode('review')}
            >
              Review
            </Button>
          </div>
        </div>

        {/* Flashcard */}
        <div className="max-w-2xl mx-auto mb-8">
          <Card 
            className="h-96 cursor-pointer transform-gpu transition-all duration-300 hover:scale-105"
            onClick={handleCardFlip}
          >
            <CardContent className="h-full flex flex-col justify-center items-center p-8 text-center">
              {!isFlipped ? (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground mb-4">Question</div>
                  <h2 className="text-2xl font-semibold text-foreground leading-relaxed">
                    {currentCardData.question}
                  </h2>
                  <div className="mt-8">
                    <p className="text-sm text-muted-foreground">Click to reveal answer</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground mb-4">Answer</div>
                  <h2 className="text-xl font-medium text-foreground leading-relaxed">
                    {currentCardData.answer}
                  </h2>
                  <div className="mt-8 flex items-center justify-center space-x-4">
                    <Button variant="outline" size="sm">
                      <Volume2 className="h-4 w-4 mr-2" />
                      Play Audio
                    </Button>
                    <Button variant="outline" size="sm">
                      <Star className="h-4 w-4 mr-2" />
                      {isGuestUser ? 'Sign up to Bookmark' : 'Bookmark'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        {isFlipped && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground">How well did you know this?</p>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <Button
                variant="outline"
                className="flex flex-col items-center p-4 h-auto border-red-200 hover:bg-red-50"
                onClick={() => handleNextCard('again')}
              >
                <X className="h-5 w-5 text-red-600 mb-1" />
                <span className="text-xs">Again</span>
                <span className="text-xs text-muted-foreground">{'<1m'}</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col items-center p-4 h-auto border-orange-200 hover:bg-orange-50"
                onClick={() => handleNextCard('hard')}
              >
                <RotateCcw className="h-5 w-5 text-orange-600 mb-1" />
                <span className="text-xs">Hard</span>
                <span className="text-xs text-muted-foreground">6m</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col items-center p-4 h-auto border-blue-200 hover:bg-blue-50"
                onClick={() => handleNextCard('good')}
              >
                <Check className="h-5 w-5 text-blue-600 mb-1" />
                <span className="text-xs">Good</span>
                <span className="text-xs text-muted-foreground">10m</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col items-center p-4 h-auto border-green-200 hover:bg-green-50"
                onClick={() => handleNextCard('easy')}
              >
                <Heart className="h-5 w-5 text-green-600 mb-1" />
                <span className="text-xs">Easy</span>
                <span className="text-xs text-muted-foreground">4d</span>
              </Button>
            </div>
            <div className="text-center mt-4">
              <p className="text-xs text-muted-foreground">
                Based on your response, this card will appear again at the shown interval
                {isGuestUser && ' (Sign up to enable spaced repetition!)'}
              </p>
            </div>
          </div>
        )}

        {/* Study Controls */}
        <div className="max-w-2xl mx-auto mt-8 flex justify-center space-x-4">
          <Button variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            Restart Session
          </Button>
          <Button variant="outline">
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
            <Button variant="outline">
              Export Progress
            </Button>
          )}
        </div>

        {/* Study Stats */}
        <div className="max-w-2xl mx-auto mt-8">
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
