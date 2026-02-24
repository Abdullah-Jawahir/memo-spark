import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/config/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Users, Target, TrendingUp, Settings, Plus, Edit, Trash2, Search, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GoalType {
  id: string;
  name: string;
  description: string;
  unit: string;
  category: 'study' | 'engagement' | 'achievement' | 'time';
  is_active: boolean;
  default_value: number;
  min_value: number;
  max_value: number;
  created_at: string;
}

interface UserGoal {
  id: string;
  user_id: string;
  goal_type_id: string;
  target_value: number;
  current_value: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    name: string;
    email: string;
    user_type: string;
  };
  goal_type?: GoalType;
}

interface GoalTemplate {
  id: string;
  name: string;
  description: string;
  user_type: 'student' | 'admin' | 'all';
  goal_types: Array<{
    goal_type_id: string;
    default_value: number;
    goal_type: GoalType;
  }>;
}

interface GoalOverview {
  total_users_with_goals: number;
  total_users_without_goals: number;
  average_daily_goal: number;
  goal_distribution: Array<{
    goal_range: string;
    count: number;
  }>;
  recent_goal_updates: number;
  total_users: number;
}

interface GoalStatistics {
  goals_by_user_type: Array<{
    user_type: string;
    goals_count: number;
    avg_goal: number;
  }>;
  goal_trends: Array<{
    month: string;
    goals_created: number;
    avg_goal: number;
  }>;
  active_users: Array<{
    name: string;
    email: string;
    daily_goal: number;
    updated_at: string;
  }>;
}

const GoalSettings: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<number>(0);
  const [overview, setOverview] = useState<GoalOverview | null>(null);
  const [statistics, setStatistics] = useState<GoalStatistics | null>(null);

  // New state for enhanced goal management
  const [goalTypes, setGoalTypes] = useState<GoalType[]>([]);
  const [userGoals, setUserGoals] = useState<UserGoal[]>([]);
  const [goalTemplates, setGoalTemplates] = useState<GoalTemplate[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [searchEmail, setSearchEmail] = useState('');
  const [users, setUsers] = useState<Array<{ id: string, name: string, email: string, user_type: string }>>([]);

  // Dialog states
  const [isGoalTypeDialogOpen, setIsGoalTypeDialogOpen] = useState(false);
  const [isUserGoalDialogOpen, setIsUserGoalDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isEditUserGoalDialogOpen, setIsEditUserGoalDialogOpen] = useState(false);
  const [isDeleteConfirmDialogOpen, setIsDeleteConfirmDialogOpen] = useState(false);
  const [editingGoalType, setEditingGoalType] = useState<GoalType | null>(null);
  const [editingUserGoal, setEditingUserGoal] = useState<UserGoal | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ id: string, name: string, type: 'goal-type' | 'user-goal' } | null>(null);

  // Form states
  const [newGoalType, setNewGoalType] = useState({
    name: '',
    description: '',
    unit: '',
    category: 'study' as 'study' | 'engagement' | 'achievement' | 'time',
    default_value: 0,
    min_value: 0,
    max_value: 1000
  });

  const [newUserGoal, setNewUserGoal] = useState({
    user_id: '',
    goal_type_id: '',
    target_value: 0
  });

  const [editTargetValue, setEditTargetValue] = useState(0);

  const [defaultGoals, setDefaultGoals] = useState({
    student_default: 50,
    admin_default: 25
  });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchGoalData(true); // Initial load only
  }, [user, navigate]); const fetchGoalData = async (isInitialLoad = false) => {
    // Throttle API calls - don't allow refresh more than once every 2 seconds
    const now = Date.now();
    if (!isInitialLoad && now - lastRefresh < 2000) {
      return;
    }

    try {
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setRefreshing(true);
        setLastRefresh(now);
      }

      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No authentication token');
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      // Fetch all goal-related data in parallel
      const [overviewRes, statisticsRes, goalTypesRes, userGoalsRes, usersRes, defaultsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/goals/overview`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/goals/statistics`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/goal-types`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/user-goals`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/users`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/goals/defaults`, { headers })
      ]);

      if (!overviewRes.ok || !statisticsRes.ok) {
        throw new Error('Failed to fetch basic goal data');
      }

      const [overviewData, statisticsData] = await Promise.all([
        overviewRes.json(),
        statisticsRes.json()
      ]);

      setOverview(overviewData);
      setStatistics(statisticsData);

      // Handle optional new endpoints
      if (goalTypesRes.ok) {
        const goalTypesData = await goalTypesRes.json();
        setGoalTypes(goalTypesData);
      }

      if (userGoalsRes.ok) {
        const userGoalsData = await userGoalsRes.json();
        setUserGoals(userGoalsData);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        // Handle Laravel pagination format
        const usersArray = Array.isArray(usersData) ? usersData : (usersData.data || []);
        setUsers(usersArray);
      }

      if (defaultsRes.ok) {
        const defaultsData = await defaultsRes.json();
        setDefaultGoals({
          student_default: defaultsData.student_default || 50,
          admin_default: defaultsData.admin_default || 25
        });
      }

    } catch (error) {
      console.error('Error fetching goal data:', error);
      if (!overview) { // Only show toast error if this is initial load
        toast.error('Failed to load goal settings');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Goal Type Management Functions
  const handleCreateGoalType = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No authentication token');

      const response = await fetch(`${API_BASE_URL}/api/admin/goal-types`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newGoalType)
      });

      if (!response.ok) throw new Error('Failed to create goal type');

      toast.success('Goal type created successfully');
      setIsGoalTypeDialogOpen(false);
      setNewGoalType({
        name: '',
        description: '',
        unit: '',
        category: 'study',
        default_value: 0,
        min_value: 0,
        max_value: 1000
      });
      fetchGoalData(false);
    } catch (error) {
      console.error('Error creating goal type:', error);
      toast.error('Failed to create goal type');
    }
  };

  const handleUpdateGoalType = async () => {
    if (!editingGoalType) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No authentication token');

      const response = await fetch(`${API_BASE_URL}/api/admin/goal-types/${editingGoalType.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newGoalType)
      });

      if (!response.ok) throw new Error('Failed to update goal type');

      toast.success('Goal type updated successfully');
      setIsGoalTypeDialogOpen(false);
      setEditingGoalType(null);
      fetchGoalData(false);
    } catch (error) {
      console.error('Error updating goal type:', error);
      toast.error('Failed to update goal type');
    }
  };

  const handleDeleteGoalType = async (goalTypeId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No authentication token');

      const response = await fetch(`${API_BASE_URL}/api/admin/goal-types/${goalTypeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to delete goal type');

      toast.success('Goal type deleted successfully');
      fetchGoalData(false);
      setIsDeleteConfirmDialogOpen(false);
      setDeletingItem(null);
    } catch (error) {
      console.error('Error deleting goal type:', error);
      toast.error('Failed to delete goal type');
    }
  };

  const handleDeleteUserGoal = async (userGoalId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No authentication token');

      const response = await fetch(`${API_BASE_URL}/api/admin/user-goals/${userGoalId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to delete user goal');

      toast.success('User goal deleted successfully');
      fetchGoalData(false);
      setIsDeleteConfirmDialogOpen(false);
      setDeletingItem(null);
    } catch (error) {
      console.error('Error deleting user goal:', error);
      toast.error('Failed to delete user goal');
    }
  };

  const confirmDelete = () => {
    if (!deletingItem) return;

    if (deletingItem.type === 'goal-type') {
      handleDeleteGoalType(deletingItem.id);
    } else {
      handleDeleteUserGoal(deletingItem.id);
    }
  };

  const handleEditUserGoal = async () => {
    if (!editingUserGoal) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No authentication token');

      const response = await fetch(`${API_BASE_URL}/api/admin/user-goals/${editingUserGoal.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ target_value: editTargetValue })
      });

      if (!response.ok) throw new Error('Failed to update user goal');

      toast.success('User goal updated successfully');
      setIsEditUserGoalDialogOpen(false);
      setEditingUserGoal(null);
      fetchGoalData(false);
    } catch (error) {
      console.error('Error updating user goal:', error);
      toast.error('Failed to update user goal');
    }
  };

  // User Goal Management Functions
  const handleCreateUserGoal = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No authentication token');

      const response = await fetch(`${API_BASE_URL}/api/admin/user-goals`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newUserGoal)
      });

      if (!response.ok) throw new Error('Failed to create user goal');

      toast.success('User goal created successfully');
      setIsUserGoalDialogOpen(false);
      setNewUserGoal({
        user_id: '',
        goal_type_id: '',
        target_value: 0
      });
      fetchGoalData(false);
    } catch (error) {
      console.error('Error creating user goal:', error);
      toast.error('Failed to create user goal');
    }
  };

  const handleUpdateUserGoal = async (userGoalId: string, targetValue: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No authentication token');

      const response = await fetch(`${API_BASE_URL}/api/admin/user-goals/${userGoalId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ target_value: targetValue })
      });

      if (!response.ok) throw new Error('Failed to update user goal');

      toast.success('User goal updated successfully');
      fetchGoalData(false);
    } catch (error) {
      console.error('Error updating user goal:', error);
      toast.error('Failed to update user goal');
    }
  };

  const handleUpdateDefaults = async () => {
    try {
      setUpdating(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/goals/defaults`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(defaultGoals)
      });

      if (!response.ok) {
        throw new Error('Failed to update default goals');
      }

      toast.success('Default goals updated successfully');
      // Refresh the data to show updated values
      fetchGoalData(false);
    } catch (error) {
      console.error('Error updating defaults:', error);
      toast.error('Failed to update default goals');
    } finally {
      setUpdating(false);
    }
  };

  if (loading && !overview) {
    return (
      <div className="container mx-auto p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/admin')} className="shrink-0">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold">Goal Settings</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-3 sm:p-6 max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <Button variant="ghost" onClick={() => navigate('/admin')} className="shrink-0">
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 min-w-0">
            <span className="truncate">Goal Settings</span>
            {refreshing && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary opacity-60 shrink-0"></div>
            )}
          </h1>
        </div>
        <Button
          variant="outline"
          onClick={() => fetchGoalData(false)}
          disabled={refreshing || (Date.now() - lastRefresh < 2000)}
          className="flex items-center gap-2 shrink-0 w-full sm:w-auto"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
          <span className="sm:hidden">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6 w-full max-w-full">
        <div className="w-full overflow-x-auto">
          <TabsList className="flex w-full min-w-max sm:grid sm:grid-cols-5 gap-1 sm:gap-0 h-auto sm:h-10 p-1 bg-muted rounded-lg">
            <TabsTrigger
              value="overview"
              className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm px-3 py-2 min-w-[80px] sm:min-w-0 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground shadow-none data-[state=active]:shadow-sm transition-all"
            >
              <Target className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Overview</span>
              <span className="sm:hidden">Stats</span>
            </TabsTrigger>
            <TabsTrigger
              value="statistics"
              className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm px-3 py-2 min-w-[80px] sm:min-w-0 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground shadow-none data-[state=active]:shadow-sm transition-all"
            >
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Statistics</span>
              <span className="sm:hidden">Trends</span>
            </TabsTrigger>
            <TabsTrigger
              value="goal-types"
              className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm px-3 py-2 min-w-[80px] sm:min-w-0 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground shadow-none data-[state=active]:shadow-sm transition-all"
            >
              <Settings className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Goal Types</span>
              <span className="sm:hidden">Types</span>
            </TabsTrigger>
            <TabsTrigger
              value="user-goals"
              className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm px-3 py-2 min-w-[80px] sm:min-w-0 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground shadow-none data-[state=active]:shadow-sm transition-all"
            >
              <Users className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline">User Goals</span>
              <span className="sm:hidden">Users</span>
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm px-3 py-2 min-w-[80px] sm:min-w-0 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground shadow-none data-[state=active]:shadow-sm transition-all"
            >
              <Settings className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Settings</span>
              <span className="sm:hidden">Config</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
          {overview && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full">
                <Card className="w-full">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl font-bold">{overview.total_users}</div>
                    <p className="text-xs text-muted-foreground">
                      {overview.total_users_with_goals} with goals set
                    </p>
                  </CardContent>
                </Card>

                <Card className="w-full">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average Daily Goal</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl font-bold">{overview.average_daily_goal}</div>
                    <p className="text-xs text-muted-foreground">
                      flashcards per day
                    </p>
                  </CardContent>
                </Card>

                <Card className="w-full sm:col-span-2 lg:col-span-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Recent Updates</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl font-bold">{overview.recent_goal_updates}</div>
                    <p className="text-xs text-muted-foreground">
                      in the last 30 days
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="w-full">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Goal Distribution</CardTitle>
                  <CardDescription className="text-sm">
                    How users are distributed across different daily goal ranges
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 sm:space-y-4">
                    {overview.goal_distribution.map((range, index) => (
                      <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                          <Badge variant="outline" className="shrink-0 text-xs">{range.goal_range} cards</Badge>
                          <span className="text-sm text-muted-foreground truncate">
                            {range.count} users
                          </span>
                        </div>
                        <div className="w-full sm:w-20 bg-muted rounded-full h-2 shrink-0">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min((range.count / overview.total_users_with_goals) * 100, 100)}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
          {statistics && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Goals by User Type</CardTitle>
                    <CardDescription className="text-sm">
                      Goal setting patterns across different user types
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 sm:space-y-4">
                      {statistics.goals_by_user_type.map((type, index) => (
                        <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                          <div>
                            <Badge variant="secondary" className="capitalize text-xs">
                              {type.user_type}
                            </Badge>
                          </div>
                          <div className="text-left sm:text-right">
                            <div className="text-sm font-medium">{type.goals_count} goals</div>
                            <div className="text-xs text-muted-foreground">
                              Avg: {type.avg_goal ? Math.round(type.avg_goal) : 0} cards/day
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Top Active Users</CardTitle>
                    <CardDescription className="text-sm">
                      Users with the highest daily goals set
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {statistics.active_users.slice(0, 5).map((user, index) => (
                        <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{user.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                          </div>
                          <div className="shrink-0">
                            <Badge className="text-xs">{user.daily_goal} cards/day</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Goal Trends</CardTitle>
                  <CardDescription className="text-sm">
                    Goal creation and average goal trends over the last 6 months
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 sm:space-y-4">
                    {statistics.goal_trends.map((trend, index) => (
                      <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                        <div className="text-sm font-medium shrink-0">{trend.month}</div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Goals created:</span> <span className="font-medium">{trend.goals_created}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Avg goal:</span> <span className="font-medium">{Math.round(trend.avg_goal)} cards/day</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="goal-types" className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
            <h2 className="text-xl sm:text-2xl font-bold">Goal Types Management</h2>
            <Dialog open={isGoalTypeDialogOpen} onOpenChange={setIsGoalTypeDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingGoalType(null);
                  setNewGoalType({
                    name: '',
                    description: '',
                    unit: '',
                    category: 'study',
                    default_value: 0,
                    min_value: 0,
                    max_value: 1000
                  });
                }} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Add Goal Type</span>
                  <span className="sm:hidden">Add Type</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] w-[calc(100vw-2rem)] max-w-[500px] mx-auto max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl">{editingGoalType ? 'Edit Goal Type' : 'Create New Goal Type'}</DialogTitle>
                  <DialogDescription className="text-sm">
                    Define a new type of goal that users can set for themselves.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="goal-name" className="text-sm font-medium">Goal Name</Label>
                    <Input
                      id="goal-name"
                      value={newGoalType.name}
                      onChange={(e) => setNewGoalType(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Daily Flashcards"
                      style={{
                        boxShadow: 'none',
                        outline: 'none',
                        transition: 'none'
                      }}
                      onFocus={(e) => {
                        e.target.style.outline = 'none';
                        e.target.style.boxShadow = 'none';
                        e.target.style.borderColor = 'none';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'none';
                      }}
                    />
                  </div>

                  <div>
                    <Label htmlFor="goal-description" className="text-sm font-medium">Description</Label>
                    <Input
                      id="goal-description"
                      value={newGoalType.description}
                      onChange={(e) => setNewGoalType(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="e.g., Number of flashcards to review daily"
                      style={{
                        boxShadow: 'none',
                        outline: 'none',
                        transition: 'none'
                      }}
                      onFocus={(e) => {
                        e.target.style.outline = 'none';
                        e.target.style.boxShadow = 'none';
                        e.target.style.borderColor = 'none';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'none';
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="goal-unit" className="text-sm font-medium">Unit</Label>
                      <Input
                        id="goal-unit"
                        value={newGoalType.unit}
                        onChange={(e) => setNewGoalType(prev => ({ ...prev, unit: e.target.value }))}
                        placeholder="e.g., cards, minutes, points"
                        style={{
                          boxShadow: 'none',
                          outline: 'none',
                          transition: 'none'
                        }}
                        onFocus={(e) => {
                          e.target.style.outline = 'none';
                          e.target.style.boxShadow = 'none';
                          e.target.style.borderColor = 'none';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'none';
                        }}
                      />
                    </div>

                    <div>
                      <Label htmlFor="goal-category" className="text-sm font-medium">Category</Label>
                      <Select value={newGoalType.category} onValueChange={(value) => setNewGoalType(prev => ({ ...prev, category: value as any }))}>
                        <SelectTrigger className="focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none" style={{ boxShadow: 'none', outline: 'none' }}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="study">Study</SelectItem>
                          <SelectItem value="engagement">Engagement</SelectItem>
                          <SelectItem value="achievement">Achievement</SelectItem>
                          <SelectItem value="time">Time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="default-value" className="text-sm font-medium">Default Value</Label>
                      <Input
                        id="default-value"
                        type="number"
                        value={newGoalType.default_value}
                        onChange={(e) => setNewGoalType(prev => ({ ...prev, default_value: parseInt(e.target.value) || 0 }))}
                        style={{
                          boxShadow: 'none',
                          outline: 'none',
                          transition: 'none'
                        }}
                        onFocus={(e) => {
                          e.target.style.outline = 'none';
                          e.target.style.boxShadow = 'none';
                          e.target.style.borderColor = 'none';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'none';
                        }}
                      />
                    </div>

                    <div>
                      <Label htmlFor="min-value" className="text-sm font-medium">Min Value</Label>
                      <Input
                        id="min-value"
                        type="number"
                        value={newGoalType.min_value}
                        onChange={(e) => setNewGoalType(prev => ({ ...prev, min_value: parseInt(e.target.value) || 0 }))}
                        style={{
                          boxShadow: 'none',
                          outline: 'none',
                          transition: 'none'
                        }}
                        onFocus={(e) => {
                          e.target.style.outline = 'none';
                          e.target.style.boxShadow = 'none';
                          e.target.style.borderColor = 'none';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'none';
                        }}
                      />
                    </div>

                    <div>
                      <Label htmlFor="max-value" className="text-sm font-medium">Max Value</Label>
                      <Input
                        id="max-value"
                        type="number"
                        value={newGoalType.max_value}
                        onChange={(e) => setNewGoalType(prev => ({ ...prev, max_value: parseInt(e.target.value) || 1000 }))}
                        style={{
                          boxShadow: 'none',
                          outline: 'none',
                          transition: 'none'
                        }}
                        onFocus={(e) => {
                          e.target.style.outline = 'none';
                          e.target.style.boxShadow = 'none';
                          e.target.style.borderColor = 'none';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'none';
                        }}
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => setIsGoalTypeDialogOpen(false)} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                  <Button onClick={editingGoalType ? handleUpdateGoalType : handleCreateGoalType} className="w-full sm:w-auto">
                    {editingGoalType ? 'Update' : 'Create'} Goal Type
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Available Goal Types</CardTitle>
              <CardDescription className="text-sm">
                Manage the different types of goals users can set for themselves.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Category</TableHead>
                      <TableHead className="hidden md:table-cell">Unit</TableHead>
                      <TableHead className="hidden lg:table-cell">Default</TableHead>
                      <TableHead className="hidden lg:table-cell">Range</TableHead>
                      <TableHead className="hidden sm:table-cell">Status</TableHead>
                      <TableHead className="text-right w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {goalTypes.map((goalType) => (
                      <TableRow key={goalType.id}>
                        <TableCell className="min-w-[150px]">
                          <div>
                            <div className="font-medium text-sm">{goalType.name}</div>
                            <div className="text-xs text-muted-foreground sm:hidden">
                              {goalType.category} • {goalType.unit}
                            </div>
                            <div className="text-xs text-muted-foreground line-clamp-2">{goalType.description}</div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline" className="capitalize text-xs">{goalType.category}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{goalType.unit}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">{goalType.default_value}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">{goalType.min_value} - {goalType.max_value}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant={goalType.is_active ? "default" : "secondary"} className="text-xs">
                            {goalType.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingGoalType(goalType);
                                setNewGoalType({
                                  name: goalType.name,
                                  description: goalType.description,
                                  unit: goalType.unit,
                                  category: goalType.category,
                                  default_value: goalType.default_value,
                                  min_value: goalType.min_value,
                                  max_value: goalType.max_value
                                });
                                setIsGoalTypeDialogOpen(true);
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDeletingItem({
                                  id: goalType.id,
                                  name: goalType.name,
                                  type: 'goal-type'
                                });
                                setIsDeleteConfirmDialogOpen(true);
                              }}
                              className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="user-goals" className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
            <h2 className="text-xl sm:text-2xl font-bold">User Goals Management</h2>
            <Dialog open={isUserGoalDialogOpen} onOpenChange={setIsUserGoalDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Assign Goal to User</span>
                  <span className="sm:hidden">Assign Goal</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] w-[calc(100vw-2rem)] max-w-[500px] mx-auto max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl">Assign Goal to User</DialogTitle>
                  <DialogDescription className="text-sm">
                    Set a specific goal for a user.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="user-select" className="text-sm font-medium">Select User</Label>
                    <Select value={newUserGoal.user_id} onValueChange={(value) => setNewUserGoal(prev => ({ ...prev, user_id: value }))}>
                      <SelectTrigger className="focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none" style={{ boxShadow: 'none', outline: 'none' }}>
                        <SelectValue placeholder="Choose a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(users) && users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.email}) - {user.user_type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="goal-type-select" className="text-sm font-medium">Select Goal Type</Label>
                    <Select value={newUserGoal.goal_type_id} onValueChange={(value) => setNewUserGoal(prev => ({ ...prev, goal_type_id: value }))}>
                      <SelectTrigger className="focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none" style={{ boxShadow: 'none', outline: 'none' }}>
                        <SelectValue placeholder="Choose a goal type" />
                      </SelectTrigger>
                      <SelectContent>
                        {goalTypes.filter(gt => gt.is_active).map((goalType) => (
                          <SelectItem key={goalType.id} value={goalType.id}>
                            {goalType.name} ({goalType.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="target-value" className="text-sm font-medium">Target Value</Label>
                    <Input
                      id="target-value"
                      type="number"
                      value={newUserGoal.target_value}
                      onChange={(e) => setNewUserGoal(prev => ({ ...prev, target_value: parseInt(e.target.value) || 0 }))}
                      placeholder="Enter target value"
                      style={{
                        boxShadow: 'none',
                        outline: 'none',
                        transition: 'none'
                      }}
                      onFocus={(e) => {
                        e.target.style.outline = 'none';
                        e.target.style.boxShadow = 'none';
                        e.target.style.borderColor = 'none';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'none';
                      }}
                    />
                  </div>
                </div>

                <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => setIsUserGoalDialogOpen(false)} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                  <Button onClick={handleCreateUserGoal} className="w-full sm:w-auto">
                    Assign Goal
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex flex-col gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="search-email" className="text-sm font-medium">Search by Email</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-email"
                  placeholder="Enter user email to filter..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="pl-9"
                  style={{
                    boxShadow: 'none',
                    outline: 'none',
                    transition: 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.outline = 'none';
                    e.target.style.boxShadow = 'none';
                    e.target.style.borderColor = 'none';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'none';
                  }}
                />
              </div>
            </div>

            <div className="w-full sm:w-48">
              <Label htmlFor="user-filter" className="text-sm font-medium">Filter by User</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-full focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none" style={{ boxShadow: 'none', outline: 'none' }}>
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  {Array.isArray(users) && users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">User Goals</CardTitle>
              <CardDescription className="text-sm">
                View and manage goals assigned to users.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">User</TableHead>
                      <TableHead className="hidden md:table-cell">Goal Type</TableHead>
                      <TableHead className="hidden sm:table-cell">Target</TableHead>
                      <TableHead className="hidden sm:table-cell">Current</TableHead>
                      <TableHead className="hidden lg:table-cell">Progress</TableHead>
                      <TableHead className="hidden sm:table-cell">Status</TableHead>
                      <TableHead className="text-right w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userGoals
                      .filter(goal => goal.user && goal.goal_type) // Filter out goals with missing user or goal_type
                      .filter(goal => {
                        if (selectedUser && selectedUser !== "all" && goal.user_id !== selectedUser) return false;
                        if (searchEmail && goal.user && !goal.user.email.toLowerCase().includes(searchEmail.toLowerCase())) return false;
                        return true;
                      })
                      .map((userGoal) => {
                        const progress = userGoal.target_value > 0 ? (userGoal.current_value / userGoal.target_value) * 100 : 0;
                        return (
                          <TableRow key={userGoal.id}>
                            <TableCell className="min-w-[200px]">
                              <div>
                                <div className="font-medium text-sm">{userGoal.user?.name || 'Unknown User'}</div>
                                <div className="text-xs text-muted-foreground truncate">{userGoal.user?.email || 'No email'}</div>
                                <div className="flex flex-wrap items-center gap-1 mt-1">
                                  <Badge variant="outline" className="text-xs">{userGoal.user?.user_type || 'Unknown'}</Badge>
                                  <div className="md:hidden text-xs text-muted-foreground">
                                    {userGoal.goal_type?.name || 'Unknown Goal Type'}
                                  </div>
                                </div>
                                <div className="sm:hidden mt-1 text-xs">
                                  <span className="text-muted-foreground">Target:</span> {userGoal.target_value} {userGoal.goal_type?.unit || ''}
                                  <span className="ml-2 text-muted-foreground">Current:</span> {userGoal.current_value} {userGoal.goal_type?.unit || ''}
                                </div>
                                <div className="lg:hidden sm:block mt-1">
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 sm:w-20 bg-muted rounded-full h-1.5 sm:h-2">
                                      <div
                                        className="bg-primary h-1.5 sm:h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${Math.min(progress, 100)}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-xs">{Math.round(progress)}%</span>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div>
                                <div className="font-medium text-sm">{userGoal.goal_type?.name || 'Unknown Goal Type'}</div>
                                <div className="text-xs text-muted-foreground">{userGoal.goal_type?.category || 'N/A'}</div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-sm">{userGoal.target_value} {userGoal.goal_type?.unit || ''}</TableCell>
                            <TableCell className="hidden sm:table-cell text-sm">{userGoal.current_value} {userGoal.goal_type?.unit || ''}</TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <div className="flex items-center gap-2">
                                <div className="w-20 bg-muted rounded-full h-2">
                                  <div
                                    className="bg-primary h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min(progress, 100)}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm">{Math.round(progress)}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <Badge variant={userGoal.is_active ? "default" : "secondary"} className="text-xs">
                                {userGoal.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingUserGoal(userGoal);
                                    setEditTargetValue(userGoal.target_value);
                                    setIsEditUserGoalDialogOpen(true);
                                  }}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setDeletingItem({
                                      id: userGoal.id,
                                      name: `${userGoal.user?.name || 'User'}'s ${userGoal.goal_type?.name || 'Goal'}`,
                                      type: 'user-goal'
                                    });
                                    setIsDeleteConfirmDialogOpen(true);
                                  }}
                                  className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Default Goal Recommendations</CardTitle>
              <CardDescription className="text-sm">
                Set default daily goal recommendations for new users by type
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="student_default" className="text-sm font-medium">Student Default (cards/day)</Label>
                  <Input
                    id="student_default"
                    type="number"
                    min="1"
                    max="200"
                    value={defaultGoals.student_default}
                    onChange={(e) => setDefaultGoals(prev => ({
                      ...prev,
                      student_default: parseInt(e.target.value) || 1
                    }))}
                    style={{
                      boxShadow: 'none',
                      outline: 'none',
                      transition: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.outline = 'none';
                      e.target.style.boxShadow = 'none';
                      e.target.style.borderColor = 'none';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'none';
                    }}
                  />
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Recommended daily goal for new student users
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin_default" className="text-sm font-medium">Admin Default (cards/day)</Label>
                  <Input
                    id="admin_default"
                    type="number"
                    min="1"
                    max="200"
                    value={defaultGoals.admin_default}
                    onChange={(e) => setDefaultGoals(prev => ({
                      ...prev,
                      admin_default: parseInt(e.target.value) || 1
                    }))}
                    style={{
                      boxShadow: 'none',
                      outline: 'none',
                      transition: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.outline = 'none';
                      e.target.style.boxShadow = 'none';
                      e.target.style.borderColor = 'none';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'none';
                    }}
                  />
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Recommended daily goal for new admin users
                  </p>
                </div>
              </div>

              <Button
                onClick={handleUpdateDefaults}
                disabled={updating}
                className="w-full md:w-auto"
              >
                {updating ? 'Updating...' : 'Update Default Goals'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Goal Modal */}
      <Dialog open={isEditUserGoalDialogOpen} onOpenChange={setIsEditUserGoalDialogOpen}>
        <DialogContent className="sm:max-w-[500px] w-[calc(100vw-2rem)] max-w-[500px] mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Edit User Goal</DialogTitle>
            <DialogDescription className="text-sm">
              Update the target value for {editingUserGoal?.user?.name}'s {editingUserGoal?.goal_type?.name} goal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-target-value" className="text-sm font-medium">Target Value ({editingUserGoal?.goal_type?.unit})</Label>
              <Input
                id="edit-target-value"
                type="number"
                value={editTargetValue}
                onChange={(e) => setEditTargetValue(parseInt(e.target.value) || 0)}
                placeholder="Enter target value"
                min={editingUserGoal?.goal_type?.min_value || 0}
                max={editingUserGoal?.goal_type?.max_value || 1000}
                style={{
                  boxShadow: 'none',
                  outline: 'none',
                  transition: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.outline = 'none';
                  e.target.style.boxShadow = 'none';
                  e.target.style.borderColor = 'none';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'none';
                }}
              />
              {editingUserGoal?.goal_type && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Range: {editingUserGoal.goal_type.min_value} - {editingUserGoal.goal_type.max_value} {editingUserGoal.goal_type.unit}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsEditUserGoalDialogOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleEditUserGoal} className="w-full sm:w-auto">
              Update Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteConfirmDialogOpen} onOpenChange={setIsDeleteConfirmDialogOpen}>
        <DialogContent className="sm:max-w-[425px] w-[calc(100vw-2rem)] max-w-[425px] mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Confirm Deletion</DialogTitle>
            <DialogDescription className="text-sm">
              Are you sure you want to delete "{deletingItem?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => {
              setIsDeleteConfirmDialogOpen(false);
              setDeletingItem(null);
            }} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} className="w-full sm:w-auto">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GoalSettings;