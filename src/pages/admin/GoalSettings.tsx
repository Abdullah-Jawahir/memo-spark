import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Users, Target, TrendingUp, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [overview, setOverview] = useState<GoalOverview | null>(null);
  const [statistics, setStatistics] = useState<GoalStatistics | null>(null);
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
    fetchGoalData();
  }, [user, navigate]);

  const fetchGoalData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No authentication token');
      }

      // Fetch overview data
      const overviewResponse = await fetch('http://localhost:8000/api/admin/goals/overview', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!overviewResponse.ok) {
        throw new Error('Failed to fetch overview data');
      }

      const overviewData = await overviewResponse.json();
      setOverview(overviewData);

      // Fetch statistics data
      const statisticsResponse = await fetch('http://localhost:8000/api/admin/goals/statistics', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!statisticsResponse.ok) {
        throw new Error('Failed to fetch statistics data');
      }

      const statisticsData = await statisticsResponse.json();
      setStatistics(statisticsData);

    } catch (error) {
      console.error('Error fetching goal data:', error);
      toast.error('Failed to load goal settings');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDefaults = async () => {
    try {
      setUpdating(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No authentication token');
      }

      const response = await fetch('http://localhost:8000/api/admin/goals/defaults', {
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
    } catch (error) {
      console.error('Error updating defaults:', error);
      toast.error('Failed to update default goals');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Goal Settings</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate('/admin')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold">Goal Settings</h1>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="statistics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Statistics
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Default Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {overview && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{overview.total_users}</div>
                    <p className="text-xs text-muted-foreground">
                      {overview.total_users_with_goals} with goals set
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average Daily Goal</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{overview.average_daily_goal}</div>
                    <p className="text-xs text-muted-foreground">
                      flashcards per day
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Recent Updates</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{overview.recent_goal_updates}</div>
                    <p className="text-xs text-muted-foreground">
                      in the last 30 days
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Goal Distribution</CardTitle>
                  <CardDescription>
                    How users are distributed across different daily goal ranges
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {overview.goal_distribution.map((range, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{range.goal_range} cards</Badge>
                          <span className="text-sm text-muted-foreground">
                            {range.count} users
                          </span>
                        </div>
                        <div className="w-24 bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{
                              width: `${(range.count / overview.total_users_with_goals) * 100}%`
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

        <TabsContent value="statistics" className="space-y-6">
          {statistics && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Goals by User Type</CardTitle>
                    <CardDescription>
                      Goal setting patterns across different user types
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {statistics.goals_by_user_type.map((type, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div>
                            <Badge variant="secondary" className="capitalize">
                              {type.user_type}
                            </Badge>
                          </div>
                          <div className="text-right">
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
                    <CardTitle>Top Active Users</CardTitle>
                    <CardDescription>
                      Users with the highest daily goals set
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {statistics.active_users.slice(0, 5).map((user, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">{user.name}</div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                          </div>
                          <div className="text-right">
                            <Badge>{user.daily_goal} cards/day</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Goal Trends</CardTitle>
                  <CardDescription>
                    Goal creation and average goal trends over the last 6 months
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {statistics.goal_trends.map((trend, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="text-sm font-medium">{trend.month}</div>
                        <div className="flex items-center gap-4">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Goals created:</span> {trend.goals_created}
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Avg goal:</span> {Math.round(trend.avg_goal)} cards/day
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

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Default Goal Recommendations</CardTitle>
              <CardDescription>
                Set default daily goal recommendations for new users by type
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="student_default">Student Default (cards/day)</Label>
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
                  />
                  <p className="text-sm text-muted-foreground">
                    Recommended daily goal for new student users
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin_default">Admin Default (cards/day)</Label>
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
                  />
                  <p className="text-sm text-muted-foreground">
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
    </div>
  );
};

export default GoalSettings;