import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { API_ENDPOINTS, fetchWithAuth } from '@/config/api';
import { BookOpen, Clock, Calendar, TrendingUp } from 'lucide-react';

interface StudyStats {
  today: {
    cards_studied: number;
    study_time: string;
  };
  this_week: {
    cards_studied: number;
    study_time: string;
  };
  overall: {
    total_cards_studied: number;
    total_study_time: string;
    average_time_per_card: string;
  };
}

const StudyStatsPanel = () => {
  const [stats, setStats] = useState<StudyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { session } = useAuth();

  useEffect(() => {
    const fetchStudyStats = async () => {
      try {
        if (!session) return;
        setLoading(true);

        const data = await fetchWithAuth(
          API_ENDPOINTS.STUDY.STATS,
          { method: 'GET' },
          session
        );

        setStats(data);
      } catch (error) {
        console.error('Error fetching study stats:', error);
        toast({
          title: 'Error',
          description: 'Could not load study statistics',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStudyStats();
  }, [session, toast]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Study Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-6 sm:py-8">
            <div className="animate-pulse flex flex-col w-full space-y-3 sm:space-y-4">
              <div className="h-3 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="h-3 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              <div className="h-3 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Study Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground text-sm sm:text-base">No statistics available yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">Study Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-card/50 rounded-lg p-3 sm:p-4 flex flex-col justify-center items-center text-center min-h-[120px] sm:min-h-[140px]">
            <div className="flex items-center mb-2">
              <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 mr-2" />
              <h3 className="font-medium text-sm sm:text-base">Today</h3>
            </div>
            <p className="text-xl sm:text-2xl font-semibold">{stats.today.cards_studied} cards</p>
            <p className="text-xs sm:text-sm text-muted-foreground">{stats.today.study_time} study time</p>
          </div>

          <div className="bg-card/50 rounded-lg p-3 sm:p-4 flex flex-col justify-center items-center text-center min-h-[120px] sm:min-h-[140px]">
            <div className="flex items-center mb-2">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mr-2" />
              <h3 className="font-medium text-sm sm:text-base">This Week</h3>
            </div>
            <p className="text-xl sm:text-2xl font-semibold">{stats.this_week.cards_studied} cards</p>
            <p className="text-xs sm:text-sm text-muted-foreground">{stats.this_week.study_time} study time</p>
          </div>

          <div className="bg-card/50 rounded-lg p-3 sm:p-4 flex flex-col justify-center items-center text-center min-h-[120px] sm:min-h-[140px] sm:col-span-2 lg:col-span-1">
            <div className="flex items-center mb-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500 mr-2" />
              <h3 className="font-medium text-sm sm:text-base">Overall</h3>
            </div>
            <p className="text-xl sm:text-2xl font-semibold">{stats.overall.total_cards_studied} cards</p>
            <p className="text-xs sm:text-sm text-muted-foreground">{stats.overall.total_study_time} total time</p>
            <p className="text-xs text-muted-foreground mt-1">Avg. {stats.overall.average_time_per_card}/card</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StudyStatsPanel;
