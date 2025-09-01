import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Sparkles, BookOpen, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import SearchFlashcardsService, {
  SearchFlashcardRequest,
} from '@/integrations/searchFlashcardsService';
import { useToast } from '@/hooks/use-toast';

interface SearchFlashcardsFormProps {
  className?: string;
  suggestedTopic?: string;
}

const SearchFlashcardsForm: React.FC<SearchFlashcardsFormProps> = ({ className = '', suggestedTopic }) => {
  const { session } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [searchForm, setSearchForm] = useState<SearchFlashcardRequest>({
    topic: '',
    description: '',
    difficulty: 'beginner',
    count: 10
  });

  // Update topic when suggestedTopic prop changes
  useEffect(() => {
    if (suggestedTopic) {
      setSearchForm(prev => ({ ...prev, topic: suggestedTopic }));
    }
  }, [suggestedTopic]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>('idle');
  const [error, setError] = useState<string | null>(null);

  const searchService = new SearchFlashcardsService();

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

  const pollJobStatus = async () => {
    if (!currentJobId || !session?.access_token) {
      console.log('No job ID or session, stopping polling');
      return;
    }

    try {
      console.log(`Polling job status for: ${currentJobId}`);
      const response = await searchService.checkJobStatus(currentJobId, session);

      if (response.success) {
        const newStatus = response.data.status;
        console.log(`Job ${currentJobId} status: ${newStatus}`);
        setJobStatus(newStatus);

        if (newStatus === 'completed') {
          console.log(`Job ${currentJobId} completed successfully`);
          setIsGenerating(false);
          setCurrentJobId(null);
          setJobStatus('idle');
          setError(null);

          toast({
            title: "Success!",
            description: "Your flashcards have been generated successfully.",
          });

          // Verify the search details are available before navigating
          if (response.data.search_id) {
            const verifyAndNavigate = async () => {
              try {
                // Wait a moment and then verify the data is available
                await new Promise(resolve => setTimeout(resolve, 1000));

                const searchDetails = await searchService.getSearchDetails(response.data.search_id, session);

                if (searchDetails.success && searchDetails.data.flashcards.length > 0) {
                  navigate(`/study?source=search_flashcards&search_id=${response.data.search_id}`);
                } else {
                  // If data is not ready, wait a bit more and try again
                  setTimeout(() => {
                    navigate(`/study?source=search_flashcards&search_id=${response.data.search_id}`);
                  }, 2000);
                }
              } catch (error) {
                console.error('Error verifying search details:', error);
                // Navigate anyway - the Study page will handle the loading
                navigate(`/study?source=search_flashcards&search_id=${response.data.search_id}`);
              }
            };

            verifyAndNavigate();
          }
        } else if (newStatus === 'failed') {
          console.log(`Job ${currentJobId} failed`);
          setError(response.data.message || "Failed to generate flashcards. Please try again.");
          setIsGenerating(false);
          setCurrentJobId(null);
          setJobStatus('idle');

          toast({
            title: "Generation Failed",
            description: response.data.message || "Failed to generate flashcards. Please try again.",
            variant: "destructive",
          });
        }
      } else {
        console.error('Failed to get job status:', response.message);
      }
    } catch (error) {
      console.error('Error polling job status:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!searchForm.topic.trim()) {
      setError('Please enter a topic for your flashcards');
      return;
    }

    if (!session?.access_token) {
      toast({
        title: "Authentication Required",
        description: "Please log in to generate flashcards.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGenerating(true);
      console.log('Submitting flashcard generation request:', searchForm);

      const response = await searchService.generateFlashcards(searchForm, session);

      if (response.success) {
        console.log('Flashcard generation started:', response.data);

        if (response.data.job_id) {
          // Job-based generation (async)
          setCurrentJobId(response.data.job_id);
          setJobStatus(response.data.status || 'queued');

          toast({
            title: "Generation Started",
            description: "Your flashcards are being generated. This may take a few moments.",
          });
        }
      } else {
        setError(response.message || 'Failed to generate flashcards');
        setIsGenerating(false);
        toast({
          title: "Generation Failed",
          description: response.message || "Failed to generate flashcards. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error generating flashcards:', error);
      setError('Failed to generate flashcards. Please try again.');
      setIsGenerating(false);
      toast({
        title: "Error",
        description: "Failed to generate flashcards. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusMessage = () => {
    switch (jobStatus) {
      case 'queued':
        return 'Your request is in queue...';
      case 'processing':
        return 'Generating your flashcards...';
      case 'completed':
        return 'Flashcards generated successfully!';
      case 'failed':
        return 'Generation failed. Please try again.';
      default:
        return '';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Topic Input */}
        <div className="space-y-2">
          <Label htmlFor="topic" className="text-sm font-semibold text-foreground">Topic *</Label>
          <Input
            id="topic"
            type="text"
            placeholder="e.g., Machine Learning, Python Programming, Quantum Physics"
            value={searchForm.topic}
            onChange={(e) => setSearchForm(prev => ({ ...prev, topic: e.target.value }))}
            className="bg-white dark:bg-gray-950 border-2 border-blue-200 dark:border-cyan-800 focus:border-blue-500 dark:focus:border-cyan-400"
            disabled={isGenerating}
            required
          />
        </div>

        {/* Description Input */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-semibold text-foreground">Description (Optional)</Label>
          <Textarea
            id="description"
            placeholder="Add more context about what you want to learn..."
            value={searchForm.description}
            onChange={(e) => setSearchForm(prev => ({ ...prev, description: e.target.value }))}
            className="bg-white dark:bg-gray-950 border-2 border-blue-200 dark:border-cyan-800 focus:border-blue-500 dark:focus:border-cyan-400 min-h-[80px]"
            disabled={isGenerating}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Difficulty Level */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">Difficulty Level</Label>
            <Select
              value={searchForm.difficulty}
              onValueChange={(value) => setSearchForm(prev => ({ ...prev, difficulty: value as 'beginner' | 'intermediate' | 'advanced' }))}
              disabled={isGenerating}
            >
              <SelectTrigger className="bg-white dark:bg-gray-950 border-2 border-blue-200 dark:border-cyan-800 focus:border-blue-500 dark:focus:border-cyan-400">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-950 border-blue-200 dark:border-cyan-800">
                <SelectItem value="beginner" className="hover:bg-blue-50 dark:hover:bg-cyan-900/20">Beginner</SelectItem>
                <SelectItem value="intermediate" className="hover:bg-blue-50 dark:hover:bg-cyan-900/20">Intermediate</SelectItem>
                <SelectItem value="advanced" className="hover:bg-blue-50 dark:hover:bg-cyan-900/20">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Number of Flashcards */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">Number of Flashcards</Label>
            <Select
              value={searchForm.count.toString()}
              onValueChange={(value) => setSearchForm(prev => ({ ...prev, count: parseInt(value) }))}
              disabled={isGenerating}
            >
              <SelectTrigger className="bg-white dark:bg-gray-950 border-2 border-blue-200 dark:border-cyan-800 focus:border-blue-500 dark:focus:border-cyan-400">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-950 border-blue-200 dark:border-cyan-800">
                <SelectItem value="5" className="hover:bg-blue-50 dark:hover:bg-cyan-900/20">5 cards</SelectItem>
                <SelectItem value="10" className="hover:bg-blue-50 dark:hover:bg-cyan-900/20">10 cards</SelectItem>
                <SelectItem value="15" className="hover:bg-blue-50 dark:hover:bg-cyan-900/20">15 cards</SelectItem>
                <SelectItem value="20" className="hover:bg-blue-50 dark:hover:bg-cyan-900/20">20 cards</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Status Display */}
        {(isGenerating || jobStatus !== 'idle') && (
          <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                {getStatusMessage()}
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isGenerating || !searchForm.topic.trim()}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-3 transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Generating Flashcards...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Flashcards
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default SearchFlashcardsForm;
