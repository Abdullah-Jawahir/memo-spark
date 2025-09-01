import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, BookOpen, Target, Clock, TrendingUp, BarChart3, Calendar, Award, AlertCircle } from 'lucide-react';
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
  const [difficultCardsCount, setDifficultCardsCount] = useState(0);

  const searchService = new SearchFlashcardsService();

  useEffect(() => {
    if (session?.access_token) {
      loadStats();
      loadDifficultCardsCount();
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

  const loadDifficultCardsCount = async () => {
    if (!session?.access_token) return;

    try {
      const response = await searchService.getDifficultCardsCount(session);
      if (response.success && response.data) {
        setDifficultCardsCount(response.data.difficult_cards_count);
      }
    } catch (error) {
      console.error('Failed to load difficult cards count:', error);
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Search Flashcards Study Statistics
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Time Range:</span>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(Number(e.target.value))}
              className="text-sm border rounded px-2 py-1"
              aria-label="Select time range for statistics"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={loadStats}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <TrendingUp className="h-4 w-4" />
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
                <div className="text-center p-4 border rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <BookOpen className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-blue-600">{stats.total_sessions}</div>
                  <div className="text-sm text-muted-foreground">Total Sessions</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {stats.completed_sessions} completed
                  </div>
                </div>

                {/* Total Flashcards Studied */}
                <div className="text-center p-4 border rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <Target className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">{stats.total_flashcards_studied}</div>
                  <div className="text-sm text-muted-foreground">Flashcards Studied</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {stats.recent_sessions} recent sessions
                  </div>
                </div>

                {/* Overall Accuracy */}
                <div className="text-center p-4 border rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <Award className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="text-2xl font-bold text-purple-600">{stats.overall_accuracy}%</div>
                  <div className="text-sm text-muted-foreground">Overall Accuracy</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {stats.total_correct_answers} correct
                  </div>
                </div>

                {/* Total Study Time */}
                <div className="text-center p-4 border rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <Clock className="h-8 w-8 text-orange-600" />
                  </div>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatTime(stats.total_study_time_seconds)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Study Time</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {stats.period_days} days
                  </div>
                </div>

                {/* Difficult Cards */}
                <div className="text-center p-4 border rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <AlertCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <div className="text-2xl font-bold text-red-600">
                    {difficultCardsCount}
                  </div>
                  <div className="text-sm text-muted-foreground">Difficult Cards</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Need Review
                  </div>
                </div>
              </div>

              {/* Popular Topics */}
              {stats.popular_topics && stats.popular_topics.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Most Studied Topics
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stats.popular_topics.map((topic: any, index: number) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">{topic.topic}</h4>
                          <Badge variant="secondary" className="text-xs">
                            #{index + 1}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex justify-between">
                            <span>Sessions:</span>
                            <span className="font-medium">{topic.sessions_count}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Flashcards:</span>
                            <span className="font-medium">{topic.total_flashcards}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Accuracy:</span>
                            <span className="font-medium">{topic.average_accuracy.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Activity Summary */}
              <div className="mt-8 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Activity Summary</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Period:</span>
                    <span className="ml-2 font-medium">Last {stats.period_days} days</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Recent Sessions:</span>
                    <span className="ml-2 font-medium">{stats.recent_sessions}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Success Rate:</span>
                    <span className="ml-2 font-medium">
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
