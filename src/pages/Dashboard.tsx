import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Target, TrendingUp, Clock, Plus, Search, LogOut, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Link } from 'react-router-dom';
import ThemeSwitcher from '@/components/layout/ThemeSwitcher';
import { API_ENDPOINTS } from '@/config/api';
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
  progress?: number;
  total?: number;
}

const Dashboard = () => {
  const { profile, signOut, session } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTabVisible, setIsTabVisible] = useState(true); // Track tab visibility

  // Fetch dashboard data
  useEffect(() => {
    // Track whether the component is mounted
    let isMounted = true;

    // Store the access token to avoid re-fetching on session object reference changes
    const accessToken = session?.access_token;

    // Skip fetching if there's no access token
    if (!accessToken) {
      setError('You need to be logged in to view this page');
      setLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      // Skip if component unmounted or no longer active
      if (!isMounted) return;

      setLoading(true);
      setError(null);

      try {
        // Import the fetchWithAuth utility
        const { fetchWithAuth } = await import('@/config/api');

        // Fetch main dashboard data using the utility
        const data = await fetchWithAuth(
          API_ENDPOINTS.DASHBOARD.MAIN,
          {},
          { access_token: accessToken }
        );

        if (isMounted) {
          setDashboardData(data);
        }

        // Also fetch achievements
        try {
          const achievementsData = await fetchWithAuth(
            API_ENDPOINTS.DASHBOARD.ACHIEVEMENTS,
            {},
            { access_token: accessToken }
          );

          if (isMounted) {
            setAchievements(achievementsData.achievements || []);
          }
        } catch (achievementErr) {
          console.error('Failed to fetch achievements:', achievementErr);
          // Don't set the main error state for achievement failures
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        if (isMounted) {
          setError('Failed to load dashboard data. Please try again later.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Initial data fetch
    fetchDashboardData();

    // Set up polling for real-time updates (every 5 minutes)
    const pollingInterval = setInterval(() => {
      // Skip polling if component is unmounted, session is gone, or tab is not visible
      if (!isMounted || !accessToken || !isTabVisible) return;

      const fetchUpdates = async () => {
        try {
          const { fetchWithAuth } = await import('@/config/api');

          // Fetch overview data
          const overviewData = await fetchWithAuth(
            API_ENDPOINTS.DASHBOARD.OVERVIEW,
            {},
            { access_token: accessToken }
          );

          // Fetch goal data
          const goalData = await fetchWithAuth(
            API_ENDPOINTS.DASHBOARD.TODAYS_GOAL,
            {},
            { access_token: accessToken }
          );

          // Update only the metrics and goal parts of the dashboard data
          if (isMounted) {
            setDashboardData(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                metrics: overviewData.metrics,
                todays_goal: goalData
              };
            });
          }
        } catch (err) {
          console.error('Failed to fetch updates:', err);
        }
      };

      fetchUpdates();
    }, 300000); // 5 minutes

    // Clean up function
    return () => {
      isMounted = false;
      clearInterval(pollingInterval);
    };
  }, [session?.access_token, isTabVisible]); // Include tab visibility in dependencies

  // Add event listener for tab visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };

    // Add visibility change event listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Clean up
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

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

  return (
    <ProtectedRoute requiredRole="student">
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-800">
        <div className="absolute top-4 right-4 z-50"><ThemeSwitcher /></div>
        <div className="max-w-7xl mx-auto px-6 py-8">

          {/* Error State */}
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50 dark:bg-red-900/20">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
              <p className="text-lg text-muted-foreground">Loading your dashboard data...</p>
            </div>
          )}

          {/* Content - only show when not loading */}
          {!loading && (
            <>
              {/* Header */}
              <div className="flex justify-between items-center mb-8">
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
                              <Link to={`/study?deck=${deck.name}`}>
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
                      <CardTitle>Recent Achievements</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {achievements.length === 0 ? (
                        <div className="text-center py-6">
                          <p className="text-muted-foreground">Keep studying to earn achievements!</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {achievements.slice(0, 3).map((achievement, index) => (
                            <div key={index} className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                                {achievement.icon || "🏆"}
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{achievement.title}</p>
                                <p className="text-sm text-muted-foreground">{achievement.description}</p>
                              </div>
                            </div>
                          ))}
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
