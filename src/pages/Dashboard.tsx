import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Target, TrendingUp, Clock, Plus, Search, LogOut, Loader2, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ThemeSwitcher from '@/components/layout/ThemeSwitcher';
import { API_ENDPOINTS, API_BASE_URL } from '@/config/api';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

interface DashboardData {
  user: UserInfo;
  metrics: Metrics;
  recent_decks: RecentDeck[];
  todays_goal: TodaysGoal;
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
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  return (
    <ProtectedRoute requiredRole="student">
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-800">
        <div className="absolute top-4 right-4 z-50"><ThemeSwitcher /></div>
        <div className="max-w-7xl mx-auto px-6 py-8">

          {/* Error State */}
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50 dark:bg-red-900/20">
              <AlertDescription>{error}</AlertDescription>
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
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
              <p className="text-lg text-muted-foreground">Loading your dashboard data...</p>
              <div className="mt-4 p-4 bg-card rounded border text-xs text-left w-full max-w-md">
                <p className="font-semibold mb-2">Debug Info:</p>
                <p>Session: {session ? 'Available' : 'Not available'}</p>
                <p>Token: {session?.access_token ? 'Present' : 'Missing'}</p>
                <p>API URL: {API_ENDPOINTS.DASHBOARD.MAIN}</p>
                <p>Cache: {localStorage.getItem(DASHBOARD_DATA_KEY) ? 'Available' : 'Not available'}</p>
                <div className="mt-2">
                  <Button
                    onClick={() => {
                      // Force exit loading state
                      setLoading(false);
                      setError('Loading manually cancelled. Please refresh the page or try again.');
                    }}
                    variant="destructive"
                    size="sm"
                  >
                    Cancel Loading
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Content - only show when not loading */}
          {!loading && (
            <>
              {/* Header */}
              <div className="flex flex-col mb-8">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <div className="flex items-center gap-4 mb-2">
                      <h1 className="text-3xl font-bold text-foreground">
                        Welcome back, {dashboardData?.user?.display_name || profile?.full_name || 'Student'}!
                      </h1>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        {dashboardData?.user?.user_tag || 'Student'}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">Ready to continue your learning journey?</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Link to="/upload">
                      <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Deck
                      </Button>
                    </Link>
                    <Button variant="outline" onClick={signOut}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </div>

                {/* Data refresh info */}
                <div className="flex items-center justify-between bg-card/50 rounded-lg p-3">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 mr-2 opacity-70" />
                    Last updated: {formatLastUpdated()}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchDashboardData(true)}
                    disabled={isRefreshing}
                    className="text-sm"
                  >
                    {isRefreshing ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <svg
                          className="h-3 w-3 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh Data
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {studyStats.map((stat, index) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">{stat.label}</p>
                          <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                        </div>
                        <div className={`p-3 rounded-full bg-card ${stat.color}`}>
                          <stat.icon className="h-6 w-6" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Decks */}
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle>Recent Study Decks</CardTitle>
                        <div className="flex items-center space-x-2">
                          <div className="relative">
                            <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                            <Input placeholder="Search decks..." className="pl-10 w-64" />
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {recentDecks.length === 0 ? (
                        <div className="text-center py-8">
                          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-lg font-medium text-foreground">No study decks yet</p>
                          <p className="text-sm text-muted-foreground mb-4">Create your first deck to start learning</p>
                          <Link to="/upload">
                            <Button size="sm">
                              <Plus className="h-4 w-4 mr-1" /> Create New Deck
                            </Button>
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {recentDecks.map((deck, index) => (
                            <div key={index} className="flex items-center justify-between p-4 bg-card rounded-lg hover:bg-muted transition-colors">
                              <div className="flex-1">
                                <h3 className="font-semibold text-foreground mb-1">{deck.name}</h3>
                                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                  <span>{deck.card_count} cards</span>
                                  <span>•</span>
                                  <span>{deck.last_studied}</span>
                                </div>
                                <div className="mt-2">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-muted-foreground">Progress</span>
                                    <span className="text-xs text-foreground">{deck.progress}%</span>
                                  </div>
                                  <Progress value={deck.progress} className="h-2" />
                                </div>
                              </div>
                              <Link to={deck.id ? `/study?deckId=${deck.id}` : `/study?deck=${encodeURIComponent(deck.name)}`}>
                                <Button variant="outline" className="ml-4">
                                  Study
                                </Button>
                              </Link>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Study Goals & Achievements */}
                <div className="space-y-6">
                  {/* Today's Goal */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Today's Goal</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {dashboardData?.todays_goal ? (
                        <div className="text-center">
                          <div className="mb-4">
                            <div className="text-3xl font-bold text-blue-600 mb-1">
                              {dashboardData.todays_goal.studied}/{dashboardData.todays_goal.goal}
                            </div>
                            <p className="text-sm text-muted-foreground">{dashboardData.todays_goal.goal_description}</p>
                          </div>
                          <Progress
                            value={dashboardData.todays_goal.progress_percentage}
                            className={`mb-4 ${dashboardData.todays_goal.is_completed ? "bg-green-200" : ""}`}
                          />
                          <p className="text-sm text-muted-foreground">
                            {dashboardData.todays_goal.is_completed
                              ? "Daily goal completed! 🎉"
                              : dashboardData.todays_goal.message}
                          </p>
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <p className="text-muted-foreground">No active goal found</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Achievements */}
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle>Recent Achievements</CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            localStorage.removeItem(DASHBOARD_ACHIEVEMENTS_KEY);
                            fetchDashboardData(true);
                          }}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>

                      {achievements.length === 0 ? (
                        <div className="text-center py-6">
                          <p className="text-muted-foreground">Keep studying to earn achievements!</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {achievements.map((achievement, index) => {
                            // Map text-based icons to emojis
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
                              <div key={index} className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-lg">
                                  {getIconDisplay(achievement.icon)}
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-foreground">{achievement.title}</p>
                                  <p className="text-sm text-muted-foreground">{achievement.description}</p>
                                  {achievement.earned_at && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {new Date(achievement.earned_at).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <Badge variant="secondary" className="text-xs">
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
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Dashboard;
