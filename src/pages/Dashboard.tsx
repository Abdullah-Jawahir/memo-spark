import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Target, TrendingUp, Clock, Plus, Search, LogOut, Loader2, RefreshCw, User, Eye, EyeOff, Edit } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ThemeSwitcher from '@/components/layout/ThemeSwitcher';
import { API_ENDPOINTS, API_BASE_URL } from '@/config/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SearchFlashcardsService } from '@/integrations/searchFlashcardsService';
import { useToast } from '@/hooks/use-toast';
import GoalManagementModal from '@/components/GoalManagementModal';

// Type definitions based on the API response
interface UserInfo {
  id: string;
  name: string;
  email: string;
  user_type: string;
  display_name: string;
  user_tag: string;
}

interface Metrics {
  cards_studied_today: number;
  current_streak: number;
  overall_progress: number;
  study_time: string;
}

interface RecentDeck {
  id?: number;
  name: string;
  card_count: number;
  last_studied: string;
  progress: number;
}

interface TodaysGoal {
  studied: number;
  goal: number;
  remaining: number;
  progress_percentage: number;
  goal_type: string;
  goal_description: string;
  is_completed: boolean;
  message: string;
}

interface UserGoalProgress {
  id: string;
  goal_type: {
    id: string;
    name: string;
    description: string;
    unit: string;
    category: string;
  };
  target_value: number;
  current_value: number;
  progress_percentage: number;
  is_completed: boolean;
  is_active: boolean;
}

interface DashboardData {
  user: UserInfo;
  metrics: Metrics;
  recent_decks: RecentDeck[];
  todays_goal: TodaysGoal;
  user_goals?: UserGoalProgress[];
}

interface Achievement {
  title: string;
  description: string;
  icon: string;
  earned_at?: string;
  points?: number;
  progress?: number;
  total?: number;
}

const DASHBOARD_DATA_KEY = 'memo-spark-dashboard-data';
const DASHBOARD_ACHIEVEMENTS_KEY = 'memo-spark-dashboard-achievements';
const DASHBOARD_LAST_FETCH_KEY = 'memo-spark-dashboard-last-fetch';

const Dashboard = () => {
  const { profile, signOut, session } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Goal management modal state
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [selectedGoalType, setSelectedGoalType] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Profile modal states
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState({
    name: '',
    email: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Search form state
  const [searchTopic, setSearchTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');

  // Flashcard generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>('');
  const [searchId, setSearchId] = useState<number | null>(null);

  // Services
  const searchService = new SearchFlashcardsService();
  const { toast } = useToast();

  // Function to fetch dashboard data - only called explicitly
  const fetchDashboardData = async (forceRefresh = false) => {
    // Only allow one fetch operation at a time
    if ((loading && !forceRefresh) || isRefreshing) {
      return;
    }

    const accessToken = session?.access_token;
    if (!accessToken) {
      setError('You need to be logged in to view this page');
      setLoading(false);
      return;
    }

    // If we're forcing a refresh, show the refreshing indicator
    // Otherwise show the main loading indicator
    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    // Create fallback data to show something if the API call fails
    const fallbackData: DashboardData = {
      user: {
        id: profile?.id || 'unknown',
        name: profile?.full_name || 'Student',
        email: '',
        user_type: 'student',
        display_name: profile?.full_name || 'Student',
        user_tag: 'Student'
      },
      metrics: {
        cards_studied_today: 0,
        current_streak: 0,
        overall_progress: 0,
        study_time: '0h 0m'
      },
      recent_decks: [],
      todays_goal: {
        studied: 0,
        goal: 0,
        remaining: 0,
        progress_percentage: 0,
        goal_type: 'cards_studied',
        goal_description: 'No active goal',
        is_completed: false,
        message: 'No active goal'
      }
    };

    try {
      // Fetch directly rather than dynamic import to simplify
      // First try direct fetch for debugging
      const response = await fetch(API_ENDPOINTS.DASHBOARD.MAIN, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details');
        console.error(`API error: ${response.status} - ${errorText}`);
        throw new Error(`API error: ${response.status}`);
      }

      try {
        const data = await response.json();

        // Check if the data has the expected structure
        if (!data || !data.metrics) {
          console.warn('Received invalid dashboard data format', data);
          throw new Error('Invalid data format received from server');
        }

        // Store in state and localStorage
        setDashboardData(data);
        localStorage.setItem(DASHBOARD_DATA_KEY, JSON.stringify(data));

        // Update last fetch time
        const now = new Date();
        setLastUpdated(now);
        localStorage.setItem(DASHBOARD_LAST_FETCH_KEY, now.toISOString());
      } catch (parseError) {
        console.error('Error parsing dashboard response:', parseError);
        throw new Error('Could not parse server response');
      }

      // Also fetch achievements
      try {
        const achievementsResponse = await fetch(API_ENDPOINTS.DASHBOARD.ACHIEVEMENTS, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (achievementsResponse.ok) {
          const achievementsData = await achievementsResponse.json();

          // Handle different response formats
          let list = [];
          if (Array.isArray(achievementsData)) {
            list = achievementsData;
          } else if (achievementsData.achievements && Array.isArray(achievementsData.achievements)) {
            list = achievementsData.achievements;
          } else if (typeof achievementsData === 'object' && achievementsData !== null) {
            // Convert object with numeric keys to array
            list = Object.values(achievementsData);
          }

          setAchievements(list);
          localStorage.setItem(DASHBOARD_ACHIEVEMENTS_KEY, JSON.stringify(list));
        } else {
          console.warn('Failed to fetch achievements, status:', achievementsResponse.status);
        }
      } catch (achievementErr) {
        console.error('Failed to fetch achievements:', achievementErr);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(`Failed to load dashboard data: ${err instanceof Error ? err.message : 'Unknown error'}`);

      // Use fallback data if we have nothing
      if (!dashboardData) {
        setDashboardData(fallbackData);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Always fetch fresh data on initial load; hydrate from cache first for UX
  useEffect(() => {
    if (!session?.access_token) {
      return;
    }

    const cachedData = localStorage.getItem(DASHBOARD_DATA_KEY);
    const cachedAchievements = localStorage.getItem(DASHBOARD_ACHIEVEMENTS_KEY);
    const lastFetchTime = localStorage.getItem(DASHBOARD_LAST_FETCH_KEY);
    if (cachedData) {
      try {
        setDashboardData(JSON.parse(cachedData));
        if (cachedAchievements) {
          const parsedAchievements = JSON.parse(cachedAchievements);

          // Ensure it's an array
          const achievementsList = Array.isArray(parsedAchievements)
            ? parsedAchievements
            : Object.values(parsedAchievements || {});

          setAchievements(achievementsList);
        }
        if (lastFetchTime) setLastUpdated(new Date(lastFetchTime));
        setLoading(false);
      } catch { }
    }

    // Always fetch fresh
    fetchDashboardData(true);
  }, [session?.access_token]);

  // Job polling effect for flashcard generation
  useEffect(() => {
    if (!currentJobId || !session?.access_token) return;

    const pollJob = async () => {
      try {
        const response = await searchService.checkJobStatus(currentJobId, session);

        if (response.success) {
          setJobStatus(response.data.status);

          // Store search_id when available
          if (response.data.search_id) {
            setSearchId(response.data.search_id);
          }

          if (response.data.status === 'completed') {
            setIsGenerating(false);
            setCurrentJobId(null);

            toast({
              title: "Flashcards Generated!",
              description: "Your flashcards are ready. Redirecting to study page...",
            });

            // Navigate to study page with search_id
            setTimeout(() => {
              if (searchId || response.data.search_id) {
                const id = searchId || response.data.search_id;
                navigate(`/study?source=search_flashcards&search_id=${id}`);
              } else {
                // Fallback navigation without search_id
                navigate(`/study?source=search_flashcards`);
              }
            }, 1500);
          } else if (response.data.status === 'failed') {
            setIsGenerating(false);
            setCurrentJobId(null);
            setJobStatus('');
            setSearchId(null);

            toast({
              title: "Generation Failed",
              description: response.data.message || "Failed to generate flashcards. Please try again.",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error);
      }
    };

    // Poll every 3 seconds for job status
    const interval = setInterval(pollJob, 3000);

    // Initial poll
    pollJob();

    return () => clearInterval(interval);
  }, [currentJobId, session?.access_token]);

  // Goal management handlers
  const handleOpenGoalModal = (goalData?: any, isEditing = false) => {
    if (isEditing && goalData) {
      // When editing, pass the complete user goal data
      setSelectedGoalType(goalData);
    } else {
      // When creating new, pass just the goal type
      setSelectedGoalType(goalData);
    }
    setGoalModalOpen(true);
  };

  const handleGoalUpdated = () => {
    // Refresh dashboard data when goals are updated
    fetchDashboardData(true);
  };

  // Handle flashcard generation
  const handleGenerateFlashcards = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchTopic.trim()) {
      toast({
        title: "Topic Required",
        description: "Please enter a topic for your flashcards.",
        variant: "destructive",
      });
      return;
    }

    if (!session?.access_token) {
      toast({
        title: "Authentication Required",
        description: "Please log in to generate flashcards.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGenerating(true);

      const searchForm = {
        topic: searchTopic,
        difficulty: difficulty,
        count: 10 // Default count as requested
      };

      const response = await searchService.generateFlashcards(searchForm, session);

      if (response.success) {
        if (response.data.job_id) {
          // Job-based generation (async)
          setCurrentJobId(response.data.job_id);
          setJobStatus(response.data.status || 'queued');

          toast({
            title: "Generation Started",
            description: "Your flashcards are being generated. This may take a few moments.",
          });
        }
      } else {
        setIsGenerating(false);
        toast({
          title: "Generation Failed",
          description: response.message || "Failed to generate flashcards. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error generating flashcards:', error);
      setIsGenerating(false);
      toast({
        title: "Error",
        description: "Failed to generate flashcards. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusMessage = () => {
    switch (jobStatus) {
      case 'queued':
        return 'Your request is in queue...';
      case 'processing':
        return 'Generating your flashcards...';
      case 'completed':
        return 'Flashcards generated successfully!';
      case 'failed':
        return 'Generation failed. Please try again.';
      default:
        return '';
    }
  };

  // Fallback data for when API data is not available
  const fallbackStats = [
    { label: "Cards Studied Today", value: 0, icon: BookOpen, color: "text-blue-600" },
    { label: "Current Streak", value: 0, icon: Target, color: "text-green-600" },
    { label: "Overall Progress", value: 0, icon: TrendingUp, color: "text-purple-600" },
    { label: "Study Time", value: "0h 0m", icon: Clock, color: "text-orange-600" }
  ];

  // Stats data from API or fallback
  const studyStats = dashboardData ? [
    { label: "Cards Studied Today", value: dashboardData.metrics.cards_studied_today, icon: BookOpen, color: "text-blue-600" },
    { label: "Current Streak", value: dashboardData.metrics.current_streak, icon: Target, color: "text-green-600" },
    { label: "Overall Progress", value: dashboardData.metrics.overall_progress, icon: TrendingUp, color: "text-purple-600" },
    { label: "Study Time", value: dashboardData.metrics.study_time, icon: Clock, color: "text-orange-600" }
  ] : fallbackStats;

  // Recent decks from API or fallback
  const recentDecks = dashboardData?.recent_decks || [];

  // Check for query param indicating return from upload
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we just returned from upload with a new document
    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get('refresh') === 'true') {
      // Remove the query param
      navigate(location.pathname, { replace: true });
      // Fetch fresh data
      fetchDashboardData(true);
    }
  }, [location]);

  // Direct API test on mount
  useEffect(() => {
    const testApiConnection = async () => {
      if (!session?.access_token) return;

      try {
        // Make a simple test request to validate API connectivity
        const testResponse = await fetch(`${API_BASE_URL}/api/ping`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (testResponse.ok) {
          const pingData = await testResponse.text();
        } else {
          console.error(`API test failed: ${testResponse.status}`);
        }
      } catch (err) {
        console.error('API connection test error:', err);
      }
    };

    testApiConnection();
  }, []);

  // Format the last updated date
  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Never';

    // If it's today, show time
    const now = new Date();
    const isToday = lastUpdated.getDate() === now.getDate() &&
      lastUpdated.getMonth() === now.getMonth() &&
      lastUpdated.getFullYear() === now.getFullYear();

    if (isToday) {
      return `Today at ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      // If it's within the last week, show day and time
      const diffDays = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 7) {
        return `${lastUpdated.toLocaleDateString([], { weekday: 'long' })} at ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      } else {
        // Otherwise show full date
        return lastUpdated.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
      }
    }
  };

  // Profile management functions
  const openProfileModal = async () => {
    setProfileModalOpen(true);
    setProfileError(null);
    setProfileSuccess(null);

    // Pre-fill with current profile data
    setProfileData({
      name: profile?.full_name || dashboardData?.user?.name || '',
      email: dashboardData?.user?.email || ''
    });

    // Reset password fields
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  const updateProfile = async () => {
    if (!session?.access_token) return;

    setProfileLoading(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/profile/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: profileData.name,
          email: profileData.email
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        // Handle Laravel validation errors
        if (response.status === 422 && errorData?.errors) {
          const errorMessages = Object.values(errorData.errors).flat();
          throw new Error(errorMessages.join(', '));
        }

        throw new Error(errorData?.message || errorData?.error || 'Failed to update profile');
      }

      setProfileSuccess('Profile updated successfully!');
      // Refresh dashboard data to show updated info
      setTimeout(() => {
        fetchDashboardData(true);
      }, 1000);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const updatePassword = async () => {
    if (!session?.access_token) return;

    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setProfileError('All password fields are required');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setProfileError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setProfileError('New password must be at least 8 characters long');
      return;
    }

    setProfileLoading(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/profile/password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          current_password: passwordData.currentPassword,
          new_password: passwordData.newPassword,
          new_password_confirmation: passwordData.confirmPassword
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        // Handle Laravel validation errors
        if (response.status === 422 && errorData?.errors) {
          const errorMessages = Object.values(errorData.errors).flat();
          throw new Error(errorMessages.join(', '));
        }

        throw new Error(errorData?.message || errorData?.error || 'Failed to update password');
      }

      setProfileSuccess('Password updated successfully!');
      // Reset password fields
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Failed to update password');
    } finally {
      setProfileLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="student">
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-800">
        {/* Fixed Header */}
        <div className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <Link to="/" className="flex items-center space-x-3 group">
                <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl group-hover:scale-105 transition-transform shadow-lg">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  MemoSpark
                </span>
              </Link>

              {/* Header Actions */}
              <div className="flex items-center space-x-3">
                <ThemeSwitcher />
                <Link to="/upload">
                  <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Deck
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={openProfileModal}>
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Button>
                <Button variant="outline" size="sm" onClick={signOut}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-6">

          {/* Error State */}
          {error && (
            <Alert className="mb-4 sm:mb-6 border-red-200 bg-red-50 dark:bg-red-900/20">
              <AlertDescription className="text-sm sm:text-base">{error}</AlertDescription>
              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Use fallback data
                    const fallbackData: DashboardData = {
                      user: {
                        id: profile?.id || 'unknown',
                        name: profile?.full_name || 'Student',
                        email: '',
                        user_type: 'student',
                        display_name: profile?.full_name || 'Student',
                        user_tag: 'Student'
                      },
                      metrics: {
                        cards_studied_today: 0,
                        current_streak: 0,
                        overall_progress: 0,
                        study_time: '0h 0m'
                      },
                      recent_decks: [],
                      todays_goal: {
                        studied: 0,
                        goal: 0,
                        remaining: 0,
                        progress_percentage: 0,
                        goal_type: 'cards_studied',
                        goal_description: 'No active goal',
                        is_completed: false,
                        message: 'No active goal'
                      }
                    };
                    setDashboardData(fallbackData);
                    setError(null);
                    setLoading(false);
                    setLastUpdated(new Date());
                  }}
                >
                  Continue in Offline Mode
                </Button>
              </div>
            </Alert>
          )}

          {/* Loading State */}
          {loading && (
            <div className="space-y-6 py-8 sm:py-12">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header skeleton */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
                    <div className="space-y-2">
                      <div className="h-6 w-64 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                      <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="h-9 w-36 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                    <div className="h-9 w-36 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                  </div>
                </div>

                {/* Stats cards skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-4 sm:p-6 bg-card/50 rounded-lg">
                      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-3 animate-pulse" />
                      <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </div>
                  ))}
                </div>

                {/* Main content skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                  <div className="lg:col-span-2 space-y-3">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <div key={idx} className="p-4 sm:p-6 bg-card/50 rounded-lg">
                        <div className="h-5 w-1/3 bg-gray-200 dark:bg-gray-700 rounded mb-3 animate-pulse" />
                        <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse" />
                        <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-card/50 rounded-lg">
                      <div className="h-6 w-1/2 bg-gray-200 dark:bg-gray-700 rounded mb-3 animate-pulse" />
                      <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse" />
                      <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </div>

                    <div className="p-4 bg-card/50 rounded-lg">
                      <div className="h-6 w-2/3 bg-gray-200 dark:bg-gray-700 rounded mb-3 animate-pulse" />
                      <div className="space-y-2">
                        <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Content - only show when not loading */}
          {!loading && (
            <>
              {/* Welcome Section */}
              <div className="mb-8">
                <div className="text-center mb-6">
                  <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                    Welcome back, {dashboardData?.user?.display_name || profile?.full_name || 'Student'}! 👋
                  </h1>
                  <p className="text-lg text-muted-foreground mb-4">Ready to continue your learning journey?</p>
                  <div className="flex justify-center">
                    <Badge variant="secondary" className="bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/50 dark:to-purple-900/50 text-blue-800 dark:text-blue-200 px-4 py-1 text-sm font-medium">
                      {dashboardData?.user?.user_tag || 'Student'}
                    </Badge>
                  </div>
                </div>

                {/* Data refresh info - more subtle */}
                <div className="flex items-center justify-center text-sm text-muted-foreground bg-card/30 rounded-full px-4 py-2 w-fit mx-auto">
                  <Clock className="h-4 w-4 mr-2 opacity-70" />
                  Last updated: {formatLastUpdated()}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchDashboardData(true)}
                    disabled={isRefreshing}
                    className="ml-3 h-6 px-2"
                  >
                    {isRefreshing ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Stats Cards - Enhanced Design */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
                {studyStats.map((stat, index) => (
                  <Card key={index} className="relative overflow-hidden hover:shadow-xl transition-all duration-300 group border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 group-hover:from-blue-500/10 group-hover:to-purple-500/10 transition-all duration-300" />
                    <CardContent className="p-6 relative">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">{stat.label}</p>
                          <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                        </div>
                        <div className={`p-3 rounded-2xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-700 dark:to-gray-800 shadow-lg group-hover:scale-110 transition-transform duration-300 ${stat.color}`}>
                          <stat.icon className="h-6 w-6" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Main Content Grid */}
              <div className="space-y-8">
                {/* Top Row - Recent Decks and Today's Goal */}
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                  {/* Recent Decks - Takes 3 columns */}
                  <div className="xl:col-span-3">
                    <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50">
                      <CardHeader className="pb-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Recent Study Decks
                          </CardTitle>
                          <div className="flex items-center space-x-3 w-full sm:w-auto">
                            <div className="relative flex-1 sm:flex-none">
                              <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                              <Input
                                placeholder="Search decks..."
                                className="pl-10 w-full sm:w-64 border-0 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 transition-colors"
                              />
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {recentDecks.length === 0 ? (
                          <div className="text-center py-12">
                            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/50 dark:to-purple-900/50 rounded-full flex items-center justify-center">
                              <BookOpen className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-foreground mb-2">No study decks yet</h3>
                            <p className="text-muted-foreground mb-6 max-w-md mx-auto">Create your first deck to start your learning journey and track your progress</p>
                            <Link to="/upload">
                              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                                <Plus className="h-4 w-4 mr-2" /> Create Your First Deck
                              </Button>
                            </Link>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {recentDecks.map((deck, index) => (
                              <div key={index} className="group p-5 bg-gradient-to-r from-white to-gray-50/80 dark:from-gray-700/50 dark:to-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-700 hover:shadow-lg transition-all duration-300">
                                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-lg text-foreground mb-2 group-hover:text-blue-600 transition-colors">{deck.name}</h3>
                                    <div className="flex flex-wrap items-center space-x-4 text-sm text-muted-foreground mb-3">
                                      <div className="flex items-center">
                                        <BookOpen className="h-4 w-4 mr-1" />
                                        <span>{deck.card_count} cards</span>
                                      </div>
                                      <div className="flex items-center">
                                        <Clock className="h-4 w-4 mr-1" />
                                        <span>{deck.last_studied}</span>
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-muted-foreground">Progress</span>
                                        <span className="text-sm font-bold text-foreground">{deck.progress}%</span>
                                      </div>
                                      <Progress value={deck.progress} className="h-2 bg-gray-200 dark:bg-gray-700" />
                                    </div>
                                  </div>
                                  <Link to={deck.id ? `/study?deckId=${deck.id}` : `/study?deck=${encodeURIComponent(deck.name)}`} className="lg:ml-6">
                                    <Button className="w-full lg:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg">
                                      <Target className="h-4 w-4 mr-2" />
                                      Study Now
                                    </Button>
                                  </Link>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Today's Goals - Takes 1 column */}
                  <div className="xl:col-span-1">
                    <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50 h-full">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-xl font-bold text-center bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                          Today's Goals
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="h-[500px] overflow-hidden">
                        <div
                          className="h-full overflow-y-auto pr-2 scrollbar-gradient"
                        >
                          {dashboardData?.todays_goal ? (
                            <div className="space-y-4">
                              {/* Primary Goal (Daily Flashcards) */}
                              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 relative group">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => {
                                    // Create a user goal object for Daily Flashcards
                                    const dailyFlashcardsGoal = {
                                      id: 'daily-flashcards',
                                      target_value: dashboardData?.todays_goal?.goal || 50,
                                      current_value: dashboardData?.todays_goal?.studied || 0,
                                      goal_type: {
                                        id: 'daily-flashcards-type',
                                        name: 'Daily Flashcards',
                                        category: 'study',
                                        unit: 'cards',
                                        default_value: dashboardData?.todays_goal?.goal || 50,
                                        min_value: 1,
                                        max_value: 500
                                      }
                                    };
                                    handleOpenGoalModal(dailyFlashcardsGoal, true);
                                  }}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <div className="text-center space-y-3">
                                  <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                    Daily Flashcards
                                  </div>
                                  <div className="text-2xl font-bold text-blue-600">
                                    {dashboardData.todays_goal.studied}/{dashboardData.todays_goal.goal}
                                  </div>
                                  <Progress
                                    value={dashboardData.todays_goal.progress_percentage}
                                    className="h-2"
                                  />
                                  <div className="text-xs text-blue-600 dark:text-blue-400">
                                    {dashboardData.todays_goal.progress_percentage}% Complete
                                  </div>
                                  {dashboardData.todays_goal.is_completed && (
                                    <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                                      🎉 Completed!
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Additional User Goals */}
                              {dashboardData.user_goals && dashboardData.user_goals.length > 0 && (
                                <>
                                  {dashboardData.user_goals.slice(0, 4).map((userGoal) => (
                                    <div key={userGoal.id} className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800 relative group">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => handleOpenGoalModal(userGoal, true)}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <div className="text-center space-y-3">
                                        <div className="text-sm font-medium text-green-700 dark:text-green-300">
                                          {userGoal.goal_type.name}
                                        </div>
                                        <div className="text-xl font-bold text-green-600">
                                          {userGoal.current_value}/{userGoal.target_value} {userGoal.goal_type.unit}
                                        </div>
                                        <Progress
                                          value={userGoal.progress_percentage}
                                          className="h-2"
                                        />
                                        <div className="text-xs text-green-600 dark:text-green-400">
                                          {Math.round(userGoal.progress_percentage)}% Complete
                                        </div>
                                        {userGoal.is_completed && (
                                          <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                                            🎉 Completed!
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </>
                              )}

                              {/* Single Placeholder Card - Show only one at a time until 5 total goals */}
                              {(() => {
                                const userGoalsCount = dashboardData.user_goals ? dashboardData.user_goals.length : 0;
                                const totalGoals = 1 + userGoalsCount; // 1 for Daily Flashcards + user goals
                                const canAddMore = totalGoals < 5;

                                // Show only one placeholder card if user can add more goals
                                if (canAddMore) {
                                  return (
                                    <div
                                      className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 border-dashed cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors group"
                                      onClick={() => handleOpenGoalModal(null, false)}
                                    >
                                      <div className="text-center space-y-2">
                                        <div className="text-2xl text-gray-400 group-hover:text-blue-500 transition-colors">
                                          <Plus className="h-6 w-6 mx-auto" />
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300">
                                          Add New Goal
                                        </div>
                                        <div className="text-xs text-gray-400 dark:text-gray-500 group-hover:text-blue-500">
                                          Click to set goal
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center">
                                <Target className="h-8 w-8 text-gray-400" />
                              </div>
                              <p className="text-muted-foreground">No active goals found</p>
                            </div>
                          )}
                        </div>

                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Bottom Section - Better Organized */}
                <div className="space-y-8">
                  {/* Achievements Row */}
                  <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50">
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                          Recent Achievements
                        </CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            localStorage.removeItem(DASHBOARD_ACHIEVEMENTS_KEY);
                            fetchDashboardData(true);
                          }}
                          className="border-0 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {achievements.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/50 dark:to-orange-900/50 rounded-full flex items-center justify-center">
                            <span className="text-2xl">🏆</span>
                          </div>
                          <p className="text-muted-foreground">Keep studying to earn achievements!</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-80 overflow-y-auto">
                          {achievements.map((achievement, index) => {
                            const getIconDisplay = (icon: string) => {
                              const iconMap: { [key: string]: string } = {
                                'lightning-bolt': '⚡',
                                'target': '🎯',
                                'trophy': '🏆',
                                'rocket': '🚀',
                                'brain': '🧠',
                                'medal': '🥇'
                              };
                              return iconMap[icon] || icon || "🏆";
                            };

                            return (
                              <div key={index} className="flex items-start space-x-3 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl border border-yellow-200/50 dark:border-yellow-800/50">
                                <div className="w-10 h-10 bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-800 dark:to-orange-800 rounded-full flex items-center justify-center text-lg flex-shrink-0">
                                  {getIconDisplay(achievement.icon)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-foreground text-sm truncate">{achievement.title}</p>
                                  <p className="text-xs text-muted-foreground line-clamp-2">{achievement.description}</p>
                                  {achievement.earned_at && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {new Date(achievement.earned_at).toLocaleDateString()}
                                    </p>
                                  )}
                                  <Badge variant="secondary" className="bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 mt-2 text-xs">
                                    {achievement.points || 0} pts
                                  </Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Search Section - Full Width */}
                  <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                        Search & Explore Flashcards
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Compact Search Form */}
                      <form onSubmit={handleGenerateFlashcards} className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                          <div className="lg:col-span-2">
                            <Input
                              value={searchTopic}
                              onChange={(e) => setSearchTopic(e.target.value)}
                              placeholder="Enter topic (e.g., Machine Learning, Python Programming)"
                              className="h-11"
                            />
                          </div>
                          <div>
                            <select
                              value={difficulty}
                              onChange={(e) => setDifficulty(e.target.value as 'beginner' | 'intermediate' | 'advanced')}
                              className="w-full h-11 px-3 border border-input bg-background rounded-md text-sm"
                            >
                              <option value="beginner">Beginner</option>
                              <option value="intermediate">Intermediate</option>
                              <option value="advanced">Advanced</option>
                            </select>
                          </div>
                          <Button
                            type="submit"
                            disabled={isGenerating}
                            className="h-11 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                          >
                            {isGenerating ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                {getStatusMessage()}
                              </>
                            ) : (
                              <>
                                <Search className="h-4 w-4 mr-2" />
                                Generate
                              </>
                            )}
                          </Button>
                        </div>

                        {/* Quick Action Links */}
                        <div className="flex flex-wrap gap-2 pt-2">
                          <p className="text-sm text-muted-foreground mr-2">Quick topics:</p>
                          {['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'History'].map((topic) => (
                            <Badge
                              key={topic}
                              variant="secondary"
                              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
                              onClick={() => setSearchTopic(topic)}
                            >
                              {topic}
                            </Badge>
                          ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                          <Link to="/search" className="flex-1">
                            <Button variant="outline" className="w-full h-10">
                              <Search className="h-4 w-4 mr-2" />
                              Advanced Search
                            </Button>
                          </Link>
                          <Link to="/search?tab=recent" className="flex-1">
                            <Button variant="outline" className="w-full h-10">
                              <Clock className="h-4 w-4 mr-2" />
                              Recent Searches
                            </Button>
                          </Link>
                          <Link to="/search?tab=stats" className="flex-1">
                            <Button variant="outline" className="w-full h-10">
                              <TrendingUp className="h-4 w-4 mr-2" />
                              Study Statistics
                            </Button>
                          </Link>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Profile Modal */}
        <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
              <DialogDescription>
                Update your profile information and change your password securely.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Alert Messages */}
              {profileError && (
                <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
                  <AlertDescription className="text-red-800 dark:text-red-200">
                    {profileError}
                  </AlertDescription>
                </Alert>
              )}

              {profileSuccess && (
                <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    {profileSuccess}
                  </AlertDescription>
                </Alert>
              )}

              {/* Profile Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Profile Information</h3>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="profile-name">Full Name</Label>
                    <Input
                      id="profile-name"
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter your full name"
                      disabled={profileLoading}
                    />
                  </div>

                  <div>
                    <Label htmlFor="profile-email">Email Address</Label>
                    <Input
                      id="profile-email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter your email address"
                      disabled={profileLoading}
                    />
                  </div>

                  <Button
                    onClick={updateProfile}
                    disabled={profileLoading || !profileData.name.trim() || !profileData.email.trim()}
                    className="w-full"
                  >
                    {profileLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Updating Profile...
                      </>
                    ) : (
                      'Update Profile'
                    )}
                  </Button>
                </div>
              </div>

              {/* Password Change Section */}
              <div className="space-y-4 border-t pt-6">
                <h3 className="text-lg font-semibold">Change Password</h3>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="current-password">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="current-password"
                        type={showCurrentPassword ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        placeholder="Enter your current password"
                        disabled={profileLoading}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        disabled={profileLoading}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showNewPassword ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="Enter your new password (min. 8 characters)"
                        disabled={profileLoading}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        disabled={profileLoading}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Confirm your new password"
                        disabled={profileLoading}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={profileLoading}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button
                    onClick={updatePassword}
                    disabled={profileLoading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                    variant="outline"
                    className="w-full"
                  >
                    {profileLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Updating Password...
                      </>
                    ) : (
                      'Change Password'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Goal Management Modal */}
        <GoalManagementModal
          open={goalModalOpen}
          onOpenChange={setGoalModalOpen}
          selectedGoalType={selectedGoalType}
          onGoalUpdated={handleGoalUpdated}
        />
      </div>
    </ProtectedRoute>
  );
};

export default Dashboard;
