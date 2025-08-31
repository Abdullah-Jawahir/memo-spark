import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, BookOpen, Clock, TrendingUp, Target, Sparkles, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import SearchFlashcardsService, {
  SearchFlashcardRequest,
  RecentSearchesResponse,
  SearchDetailsResponse
} from '@/integrations/searchFlashcardsService';
import { useToast } from '@/hooks/use-toast';
import SearchFlashcardStats from './SearchFlashcardStats';

interface SearchFlashcardsProps {
  className?: string;
}

const SearchFlashcards: React.FC<SearchFlashcardsProps> = ({ className = '' }) => {
  const { session } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [searchForm, setSearchForm] = useState<SearchFlashcardRequest>({
    topic: '',
    description: '',
    difficulty: 'beginner',
    count: 10
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>('idle');
  const [recentSearches, setRecentSearches] = useState<RecentSearchesResponse['data']>([]);
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchService = new SearchFlashcardsService();

  useEffect(() => {
    loadSuggestedTopics();
    loadRecentSearches();
  }, []);

  useEffect(() => {
    if (currentJobId && (jobStatus === 'queued' || jobStatus === 'processing')) {
      console.log(`Starting polling for job: ${currentJobId}, status: ${jobStatus}`);

      // Start polling immediately
      pollJobStatus();

      // Set up continuous polling every 2 seconds
      const pollInterval = setInterval(() => {
        console.log(`Polling interval triggered for job: ${currentJobId}, current status: ${jobStatus}`);

        // Continue polling as long as we have a job ID and it's not completed/failed
        if (currentJobId && !['completed', 'failed', 'idle'].includes(jobStatus)) {
          pollJobStatus();
        } else {
          console.log(`Stopping polling for job: ${currentJobId}, final status: ${jobStatus}`);
          clearInterval(pollInterval);
        }
      }, 2000);

      // Add timeout to prevent infinite polling (5 minutes)
      const timeoutId = setTimeout(() => {
        console.log(`Timeout reached for job: ${currentJobId}`);
        clearInterval(pollInterval);
        setError("Flashcard generation is taking longer than expected. Please try again later.");
        setJobStatus('idle');
        setCurrentJobId(null);
        toast({
          title: "Timeout",
          description: "Flashcard generation is taking longer than expected. Please try again later.",
          variant: "destructive",
        });
      }, 5 * 60 * 1000); // 5 minutes

      // Cleanup interval and timeout on unmount or when job completes
      return () => {
        console.log(`Cleaning up polling for job: ${currentJobId}`);
        clearInterval(pollInterval);
        clearTimeout(timeoutId);
      };
    }
  }, [currentJobId]); // Only depend on currentJobId, not jobStatus

  const loadSuggestedTopics = async () => {
    if (!session?.access_token) return;

    try {
      setLoadingTopics(true);
      const response = await searchService.getSuggestedTopics(session);
      if (response.success) {
        setSuggestedTopics(response.data);
      }
    } catch (error) {
      console.error('Failed to load suggested topics:', error);
    } finally {
      setLoadingTopics(false);
    }
  };

  const loadRecentSearches = async () => {
    if (!session?.access_token) return;

    try {
      setLoadingRecent(true);
      const response = await searchService.getRecentSearches({ limit: 5, days: 30 }, session);
      if (response.success) {
        setRecentSearches(response.data);
      }
    } catch (error) {
      console.error('Failed to load recent searches:', error);
    } finally {
      setLoadingRecent(false);
    }
  };

  const handleInputChange = (field: keyof SearchFlashcardRequest, value: string | number) => {
    setSearchForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleGenerateFlashcards = async () => {
    if (!searchForm.topic.trim()) {
      toast({
        title: "Topic Required",
        description: "Please enter a topic to generate flashcards.",
        variant: "destructive"
      });
      return;
    }

    if (!session?.access_token) {
      toast({
        title: "Authentication Required",
        description: "Please log in to generate flashcards.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      setCurrentJobId(null);
      setJobStatus('idle');

      const response = await searchService.generateFlashcards(searchForm, session);

      if (response.success && response.data?.job_id) {
        setCurrentJobId(response.data.job_id);
        setJobStatus('queued');

        toast({
          title: "Flashcard Generation Started",
          description: response.data.message,
        });

        // Reset form
        setSearchForm({
          topic: '',
          description: '',
          difficulty: 'beginner',
          count: 10
        });
      } else {
        // Handle case where no job ID is returned
        setError("Failed to start flashcard generation. Please try again.");
        setJobStatus('idle');
        toast({
          title: "Error",
          description: "Failed to start flashcard generation.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Flashcard generation error:', error);
      setError(error.message || 'Failed to start flashcard generation');
      setJobStatus('idle');
      setCurrentJobId(null);
      toast({
        title: "Generation Failed",
        description: error.message || 'Failed to start flashcard generation',
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const pollJobStatus = async () => {
    if (!currentJobId || !session?.access_token) return;

    try {
      const response = await searchService.checkJobStatus(currentJobId, session);
      const status = response.data.status;

      setJobStatus(status);

      if (status === 'completed') {
        toast({
          title: "Flashcards Generated!",
          description: "Your flashcards are ready to study.",
        });

        // Fetch the search details to get the real database IDs
        if (response.data.search_id) {
          try {
            const searchDetailsResponse = await searchService.getSearchDetails(response.data.search_id, session);
            if (searchDetailsResponse.success && searchDetailsResponse.data.flashcards) {
              navigateToStudyWithFlashcards(searchDetailsResponse.data.flashcards, response.data.topic, response.data.search_id);
            } else {
              // Fallback to using generated content if search details fetch fails
              if (response.data.result?.flashcards) {
                navigateToStudyWithFlashcards(response.data.result.flashcards, response.data.topic, response.data.search_id);
              }
            }
          } catch (error) {
            console.error('Failed to fetch search details, using generated content:', error);
            // Fallback to using generated content
            if (response.data.result?.flashcards) {
              navigateToStudyWithFlashcards(response.data.result.flashcards, response.data.topic, response.data.search_id);
            }
          }
        } else {
          // Fallback to using generated content if no search_id
          if (response.data.result?.flashcards) {
            navigateToStudyWithFlashcards(response.data.result.flashcards, response.data.topic, response.data.search_id);
          }
        }

        setCurrentJobId(null);
        setJobStatus('idle');
        loadRecentSearches(); // Refresh recent searches
      } else if (status === 'failed') {
        setError(response.data.message || 'Flashcard generation failed');
        setJobStatus('idle');
        setCurrentJobId(null);
        toast({
          title: "Generation Failed",
          description: response.data.message || 'Flashcard generation failed',
          variant: "destructive",
        });
      } else if (status === 'processing') {
        // Update status message if available
        if (response.data.message) {
          setJobStatus('processing');
        }
      }
    } catch (error) {
      console.error('Error polling job status:', error);
      // Don't immediately fail on polling errors, just log them
      // The timeout will handle cases where the job is truly stuck
    }
  };

  const navigateToStudyWithFlashcards = (flashcards: any[], topic: string, searchId?: number) => {
    // Store flashcards in localStorage for the study page
    const studyData = {
      flashcards: flashcards.map((card, index) => ({
        id: card.id || (index + 1), // Use real database ID if available, fallback to index
        question: card.question,
        answer: card.answer,
        difficulty: card.difficulty,
        subject: topic,
        type: card.type || 'Q&A'
      })),
      source: 'search_flashcards',
      topic: topic,
      search_id: searchId, // Include search ID for study session tracking
      timestamp: new Date().toISOString()
    };

    localStorage.setItem('memo-spark-study-flashcards', JSON.stringify(studyData));

    // Navigate to study page
    navigate('/study?source=search_flashcards');
  };

  const handleRecentSearchClick = async (searchId: number) => {
    if (!session?.access_token) return;

    try {
      const response = await searchService.getSearchDetails(searchId, session);
      if (response.success && response.data.flashcards) {
        navigateToStudyWithFlashcards(response.data.flashcards, response.data.topic, response.data.id);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load search details",
        variant: "destructive"
      });
    }
  };

  const handleTopicSuggestionClick = (topic: string) => {
    setSearchForm(prev => ({
      ...prev,
      topic
    }));
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Generate Flashcards from Topic
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="topic">Topic *</Label>
              <Input
                id="topic"
                placeholder="e.g., Machine Learning, Python Programming, Quantum Physics"
                value={searchForm.topic}
                onChange={(e) => handleInputChange('topic', e.target.value)}
                disabled={isGenerating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty Level</Label>
              <Select
                value={searchForm.difficulty}
                onValueChange={(value) => handleInputChange('difficulty', value)}
                disabled={isGenerating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="count">Number of Flashcards</Label>
              <Select
                value={searchForm.count?.toString()}
                onValueChange={(value) => handleInputChange('count', parseInt(value))}
                disabled={isGenerating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="15">15</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Add more context about what you want to learn..."
                value={searchForm.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                disabled={isGenerating}
                rows={2}
              />
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
              <AlertDescription className="text-red-800 dark:text-red-200">
                {error}
              </AlertDescription>
              <div className="mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setError(null);
                    setJobStatus('idle');
                    setCurrentJobId(null);
                  }}
                >
                  Dismiss
                </Button>
                {jobStatus === 'idle' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateFlashcards}
                    className="ml-2"
                  >
                    Try Again
                  </Button>
                )}
              </div>
            </Alert>
          )}

          <Button
            onClick={handleGenerateFlashcards}
            disabled={isGenerating || !searchForm.topic.trim()}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Flashcards
              </>
            )}
          </Button>

          {/* Job Status Display */}
          {currentJobId && jobStatus !== 'idle' && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">
                  {jobStatus === 'queued' && 'Queued for processing...'}
                  {jobStatus === 'processing' && 'Generating flashcards...'}
                  {jobStatus === 'completed' && 'Flashcards generated successfully!'}
                  {jobStatus === 'failed' && 'Generation failed'}
                </span>
              </div>

              {jobStatus === 'queued' && (
                <div className="text-xs text-muted-foreground">
                  Your request is in the queue. This usually takes 1-3 minutes.
                </div>
              )}

              {jobStatus === 'processing' && (
                <div className="text-xs text-muted-foreground">
                  AI models are generating your flashcards. Please wait...
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Job ID: {currentJobId}
              </div>

              {/* Manual refresh button for stuck jobs */}
              {(jobStatus === 'queued' || jobStatus === 'processing') && (
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={pollJobStatus}
                    className="text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Check Status
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setError("Job cancelled by user");
                      setJobStatus('idle');
                      setCurrentJobId(null);
                    }}
                    className="text-xs text-red-600"
                  >
                    Cancel Job
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suggested Topics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Suggested Topics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTopics ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {suggestedTopics.slice(0, 15).map((topic, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => handleTopicSuggestionClick(topic)}
                >
                  {topic}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Searches */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Searches
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRecent ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : recentSearches.length > 0 ? (
            <div className="space-y-3">
              {recentSearches.map((search) => (
                <div
                  key={search.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleRecentSearchClick(search.id)}
                >
                  <div className="flex-1">
                    <h4 className="font-medium">{search.topic}</h4>
                    {search.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {search.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {search.difficulty}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {search.flashcards_count} cards
                      </Badge>
                      {search.has_been_studied && (
                        <Badge variant="secondary" className="text-xs">
                          Studied
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {new Date(search.created_at).toLocaleDateString()}
                    </div>
                    {search.study_stats && search.study_stats.total_sessions > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <TrendingUp className="h-3 w-3" />
                        {search.study_stats.average_score.toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No recent searches yet</p>
              <p className="text-sm">Start by generating your first set of flashcards!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Flashcard Stats */}
      <SearchFlashcardStats />
    </div>
  );
};

export default SearchFlashcards;
