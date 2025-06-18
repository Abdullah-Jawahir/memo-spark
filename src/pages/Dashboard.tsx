import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Target, TrendingUp, Clock, Plus, Search, LogOut } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Link } from 'react-router-dom';
import ThemeSwitcher from '@/components/layout/ThemeSwitcher';

const Dashboard = () => {
  const { profile, signOut } = useAuth();

  const studyStats = [
    { label: "Cards Studied Today", value: 47, icon: BookOpen, color: "text-blue-600" },
    { label: "Current Streak", value: 12, icon: Target, color: "text-green-600" },
    { label: "Overall Progress", value: 68, icon: TrendingUp, color: "text-purple-600" },
    { label: "Study Time", value: "2h 15m", icon: Clock, color: "text-orange-600" }
  ];

  const recentDecks = [
    { name: "Spanish Vocabulary", cards: 125, progress: 75, lastStudied: "2 hours ago" },
    { name: "History Facts", cards: 89, progress: 45, lastStudied: "Yesterday" },
    { name: "Math Formulas", cards: 67, progress: 90, lastStudied: "3 days ago" }
  ];

  return (
    <ProtectedRoute requiredRole="student">
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-800">
        <div className="absolute top-4 right-4 z-50"><ThemeSwitcher /></div>
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-3xl font-bold text-foreground">Welcome back, {profile?.full_name || 'Student'}!</h1>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Student
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
                  <div className="space-y-4">
                    {recentDecks.map((deck, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-card rounded-lg hover:bg-muted transition-colors">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground mb-1">{deck.name}</h3>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>{deck.cards} cards</span>
                            <span>•</span>
                            <span>Last studied {deck.lastStudied}</span>
                          </div>
                          <div className="mt-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-muted-foreground">Progress</span>
                              <span className="text-xs text-foreground">{deck.progress}%</span>
                            </div>
                            <Progress value={deck.progress} className="h-2" />
                          </div>
                        </div>
                        <Link to="/study">
                          <Button variant="outline" className="ml-4">
                            Study
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Study Goals & Achievements */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Today's Goal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="mb-4">
                      <div className="text-3xl font-bold text-blue-600 mb-1">47/50</div>
                      <p className="text-sm text-muted-foreground">Cards studied</p>
                    </div>
                    <Progress value={94} className="mb-4" />
                    <p className="text-sm text-muted-foreground">3 more cards to reach your daily goal!</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Achievements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                        🏆
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Study Streak</p>
                        <p className="text-sm text-muted-foreground">10 days in a row</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        ⚡
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Speed Learner</p>
                        <p className="text-sm text-muted-foreground">Completed 100 cards</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        📚
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Deck Master</p>
                        <p className="text-sm text-muted-foreground">Created 5 decks</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Dashboard;
