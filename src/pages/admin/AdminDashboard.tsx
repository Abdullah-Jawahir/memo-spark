import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, BookOpen, TrendingUp, Settings, LogOut, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Link } from 'react-router-dom';
import ThemeSwitcher from '@/components/layout/ThemeSwitcher';
import { useToast } from '@/hooks/use-toast';

interface AdminStats {
  total_users: number;
  active_decks: number;
  total_study_sessions: number;
  monthly_growth: string;
  system_health: string;
}

interface RecentActivity {
  action: string;
  user: string;
  time: string;
  type: string;
  details?: string;
}

// Shimmer loading component
const Shimmer = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] animate-shimmer ${className}`} />
);

// Stats card shimmer
const StatsCardSkeleton = () => (
  <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-gray-300">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Shimmer className="h-4 w-24 mb-2 rounded" />
          <Shimmer className="h-8 w-16 rounded" />
        </div>
        <Shimmer className="h-12 w-12 rounded-full" />
      </div>
    </CardContent>
  </Card>
);

// Activity item shimmer
const ActivityItemSkeleton = () => (
  <div className="flex items-center justify-between p-3 bg-card rounded-lg">
    <div className="flex-1">
      <Shimmer className="h-4 w-32 mb-2 rounded" />
      <Shimmer className="h-3 w-24 mb-1 rounded" />
      <Shimmer className="h-3 w-16 rounded" />
    </div>
    <Shimmer className="h-3 w-16 rounded" />
  </div>
);

const AdminDashboard = () => {
  const { profile, signOut, session, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    // Don't try to fetch data if auth is still loading
    if (authLoading) {
      return;
    }

    if (!session?.access_token) {
      toast({
        title: "Authentication Error",
        description: "Please log in again to access admin data.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Fix admin Supabase user ID if needed (call this first)
      try {
        await fetch('/api/fix-admin-supabase-id', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        // Silently ignore errors from this endpoint
        console.log('Admin ID fix endpoint not available or already fixed');
      }

      // Fetch admin overview stats
      const statsResponse = await fetch('/api/admin/overview', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      // Fetch recent activity
      const activityResponse = await fetch('/api/admin/recent-activity', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setAdminStats(statsData);
      } else {
        console.error('Failed to fetch admin stats:', statsResponse.statusText);
        toast({
          title: "Error",
          description: "Failed to load admin statistics.",
          variant: "destructive",
        });
      }

      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        setRecentActivity(activityData);
      } else {
        console.error('Failed to fetch recent activity:', activityResponse.statusText);
        toast({
          title: "Error",
          description: "Failed to load recent activity.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        title: "Error",
        description: "Failed to load admin dashboard data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch admin data after auth loading is complete and we have a session
    if (!authLoading && session?.access_token) {
      fetchAdminData();
    } else if (!authLoading && !session) {
      // Auth loading is complete but no session found
      setLoading(false);
    } else if (authLoading) {
      // Auth is still loading, keep our loading state true
      setLoading(true);
    }
  }, [session, authLoading]);

  const statsCards = [
    {
      label: "Total Users",
      value: adminStats?.total_users || 0,
      icon: Users,
      color: "text-blue-600"
    },
    {
      label: "Active Decks",
      value: adminStats?.active_decks || 0,
      icon: BookOpen,
      color: "text-green-600"
    },
    {
      label: "Monthly Growth",
      value: adminStats?.monthly_growth || "0%",
      icon: TrendingUp,
      color: "text-purple-600"
    },
    {
      label: "System Health",
      value: adminStats?.system_health || "0%",
      icon: Settings,
      color: "text-orange-600"
    }
  ];

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-950 dark:to-gray-800">
        <div className="absolute top-4 right-4 z-50"><ThemeSwitcher /></div>
        {/* Logo pinned to left corner like main header */}
        <div className="absolute left-4 top-4 z-50">
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg group-hover:scale-105 transition-transform">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              MemoSpark
            </span>
          </Link>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-6 lg:mb-8 space-y-4 lg:space-y-0">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Admin Dashboard</h1>
                <Badge variant="secondary" className="bg-red-100 text-red-800 w-fit">
                  Administrator
                </Badge>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground">Welcome back, {profile?.full_name || 'Admin'}! Monitor and manage MemoSpark.</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              <Link to="/admin/users" className="w-full sm:w-auto">
                <Button className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Manage Users
                </Button>
              </Link>
              <Button variant="outline" onClick={signOut} className="w-full sm:w-auto">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
            {(loading || authLoading) ? (
              // Shimmer loading for stats cards
              Array.from({ length: 4 }).map((_, index) => (
                <StatsCardSkeleton key={index} />
              ))
            ) : (
              statsCards.map((stat, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow border-l-4 border-l-red-500">
                  <CardContent className="p-4 lg:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">{stat.label}</p>
                        <p className="text-xl sm:text-2xl font-bold text-foreground">
                          {stat.value}
                        </p>
                      </div>
                      <div className={`p-2 lg:p-3 rounded-full bg-red-100 ${stat.color}`}>
                        <stat.icon className="h-4 w-4 lg:h-6 lg:w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="space-y-4 max-h-52 overflow-y-auto pr-2"
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#cbd5e1 #f1f5f9'
                  }}
                >
                  <style jsx>{`
                    div::-webkit-scrollbar {
                      width: 6px;
                    }
                    div::-webkit-scrollbar-track {
                      background: #f1f5f9;
                      border-radius: 3px;
                    }
                    div::-webkit-scrollbar-thumb {
                      background: #cbd5e1;
                      border-radius: 3px;
                    }
                    div::-webkit-scrollbar-thumb:hover {
                      background: #94a3b8;
                    }
                    .dark div::-webkit-scrollbar-track {
                      background: #1e293b;
                    }
                    .dark div::-webkit-scrollbar-thumb {
                      background: #475569;
                    }
                    .dark div::-webkit-scrollbar-thumb:hover {
                      background: #64748b;
                    }
                  `}</style>
                  {(loading || authLoading) ? (
                    // Shimmer loading for activity items
                    Array.from({ length: 5 }).map((_, index) => (
                      <ActivityItemSkeleton key={index} />
                    ))
                  ) : recentActivity.length > 0 ? (
                    recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-card rounded-lg border border-border/50 hover:border-border transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm">{activity.action}</p>
                          <p className="text-xs text-muted-foreground truncate">{activity.user}</p>
                          {activity.details && (
                            <p className="text-xs text-gray-500 truncate">{activity.details}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{activity.time}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No recent activity</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Settings className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  <Link to="/admin/users">
                    <Button variant="outline" className="w-full justify-start h-12 text-sm">
                      <Users className="h-4 w-4 mr-3" />
                      User Management
                    </Button>
                  </Link>
                  <Button variant="outline" className="w-full justify-start h-12 text-sm">
                    <BookOpen className="h-4 w-4 mr-3" />
                    Content Moderation
                  </Button>
                  <Button variant="outline" className="w-full justify-start h-12 text-sm">
                    <TrendingUp className="h-4 w-4 mr-3" />
                    Analytics Dashboard
                  </Button>
                  <Button variant="outline" className="w-full justify-start h-12 text-sm">
                    <Settings className="h-4 w-4 mr-3" />
                    System Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Overview */}
          <Card className="mt-6 lg:mt-8">
            <CardHeader>
              <CardTitle className="text-lg">System Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {(loading || authLoading) ? (
                  // Shimmer loading for system overview
                  Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="text-center">
                      <Shimmer className="h-10 w-16 mx-auto mb-2 rounded" />
                      <Shimmer className="h-4 w-32 mx-auto rounded" />
                    </div>
                  ))
                ) : (
                  <>
                    <div className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-2">
                        {adminStats?.total_users || 0}
                      </div>
                      <p className="text-sm text-muted-foreground">Total Registered Users</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-2">
                        {adminStats?.active_decks || 0}
                      </div>
                      <p className="text-sm text-muted-foreground">Active Study Decks</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold text-purple-600 mb-2">
                        {adminStats?.total_study_sessions || 0}
                      </div>
                      <p className="text-sm text-muted-foreground">Total Study Sessions</p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default AdminDashboard;
