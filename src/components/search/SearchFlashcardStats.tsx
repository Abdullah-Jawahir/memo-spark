import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, BookOpen, Target, Clock, TrendingUp, BarChart3, Calendar, Award, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import SearchFlashcardsService from '@/integrations/searchFlashcardsService';
import { useToast } from '@/hooks/use-toast';

interface SearchFlashcardStatsProps {
  className?: string;
}

const SearchFlashcardStats: React.FC<SearchFlashcardStatsProps> = ({ className = '' }) => {
  const { session } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState(30);

  const searchService = new SearchFlashcardsService();

  useEffect(() => {
    if (session?.access_token) {
      loadStats();
    }
  }, [session, timeRange]);

  const loadStats = async () => {
    if (!session?.access_token) return;

    try {
      setLoading(true);
      const response = await searchService.getStudyStats({ days: timeRange }, session);
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to load study stats:', error);
      toast({
        title: "Error",
        description: "Failed to load study statistics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  if (!session?.access_token) {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Search Flashcards Study Statistics
          </CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Time Range:</span>
            <Select value={timeRange.toString()} onValueChange={(value) => setTimeRange(Number(value))}>
              <SelectTrigger className="w-[140px] bg-white dark:bg-gray-950 border-2 border-blue-200 dark:border-blue-800 focus:border-blue-500 dark:focus:border-blue-400">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-950 border-blue-200 dark:border-blue-800">
                <SelectItem value="7" className="hover:bg-blue-50 dark:hover:bg-blue-900/20">Last 7 days</SelectItem>
                <SelectItem value="30" className="hover:bg-blue-50 dark:hover:bg-blue-900/20">Last 30 days</SelectItem>
                <SelectItem value="90" className="hover:bg-blue-50 dark:hover:bg-blue-900/20">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={loadStats}
              disabled={loading}
              className="border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : stats ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Total Sessions */}
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl hover:shadow-lg transition-all duration-200">
                  <div className="flex items-center justify-center mb-2">
                    <BookOpen className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-blue-600">{stats.total_sessions}</div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Sessions</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {stats.completed_sessions} completed
                  </div>
                </div>

                {/* Total Flashcards Studied */}
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-2 border-green-200 dark:border-green-800 rounded-xl hover:shadow-lg transition-all duration-200">
                  <div className="flex items-center justify-center mb-2">
                    <Target className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">{stats.total_flashcards_studied}</div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Flashcards Studied</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {stats.recent_sessions} recent sessions
                  </div>
                </div>

                {/* Overall Accuracy */}
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-100 dark:from-blue-900/20 dark:to-cyan-800/20 border-2 border-blue-200 dark:border-cyan-800 rounded-xl hover:shadow-lg transition-all duration-200">
                  <div className="flex items-center justify-center mb-2">
                    <Award className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-blue-600">{stats.overall_accuracy}%</div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Accuracy</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {stats.total_correct_answers} correct
                  </div>
                </div>

                {/* Total Study Time */}
                <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-2 border-orange-200 dark:border-orange-800 rounded-xl hover:shadow-lg transition-all duration-200">
                  <div className="flex items-center justify-center mb-2">
                    <Clock className="h-8 w-8 text-orange-600" />
                  </div>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatTime(stats.total_study_time_seconds)}
                  </div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Study Time</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {stats.period_days} days
                  </div>
                </div>
              </div>

              {/* Popular Topics */}
              {stats.popular_topics && stats.popular_topics.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Most Studied Topics
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stats.popular_topics.map((topic: any, index: number) => (
                      <div key={index} className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-lg transition-all duration-200 hover:border-blue-400 dark:hover:border-blue-600">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-sm text-foreground">{topic.topic}</h4>
                          <Badge variant="secondary" className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                            #{index + 1}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex justify-between">
                            <span>Sessions:</span>
                            <span className="font-medium text-foreground">{topic.sessions_count}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Flashcards:</span>
                            <span className="font-medium text-foreground">{topic.total_flashcards}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Accuracy:</span>
                            <span className="font-medium text-green-600">{topic.average_accuracy.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Activity Summary */}
              <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-2 border-blue-200 dark:border-cyan-800 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-foreground">Activity Summary</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center justify-between p-2 bg-white/60 dark:bg-gray-800/60 rounded-lg">
                    <span className="text-muted-foreground">Period:</span>
                    <span className="font-semibold text-foreground">Last {stats.period_days} days</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white/60 dark:bg-gray-800/60 rounded-lg">
                    <span className="text-muted-foreground">Recent Sessions:</span>
                    <span className="font-semibold text-foreground">{stats.recent_sessions}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white/60 dark:bg-gray-800/60 rounded-lg">
                    <span className="text-muted-foreground">Success Rate:</span>
                    <span className="font-semibold text-green-600">
                      {stats.total_sessions > 0
                        ? Math.round((stats.completed_sessions / stats.total_sessions) * 100)
                        : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No study statistics available</p>
              <p className="text-sm">Start studying search flashcards to see your progress!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SearchFlashcardStats;
