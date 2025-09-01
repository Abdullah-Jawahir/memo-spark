import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, ArrowLeft, Search as SearchIcon, Clock, TrendingUp, Target, Sparkles, Loader2 } from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import ThemeSwitcher from '@/components/layout/ThemeSwitcher';
import SearchFlashcardsForm from '@/components/search/SearchFlashcardsForm';
import SearchFlashcardStats from '@/components/search/SearchFlashcardStats';
import { useAuth } from '@/contexts/AuthContext';
import SearchFlashcardsService from '@/integrations/searchFlashcardsService';

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'search';
  const [activeTab, setActiveTab] = useState(initialTab);
  const { session } = useAuth();
  const navigate = useNavigate();

  // State for recent searches tab
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');

  const searchService = new SearchFlashcardsService();

  useEffect(() => {
    const tab = searchParams.get('tab') || 'search';
    setActiveTab(tab);
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === 'recent' && session?.access_token) {
      loadRecentSearches();
    }
    if (activeTab === 'search' && session?.access_token) {
      loadSuggestedTopics();
    }
  }, [activeTab, session]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'search') {
      setSearchParams({});
    } else {
      setSearchParams({ tab: value });
    }
  };

  const loadRecentSearches = async () => {
    if (!session?.access_token) return;

    try {
      setLoadingRecent(true);
      const response = await searchService.getRecentSearches({ limit: 10 }, session);
      if (response.success) {
        setRecentSearches(response.data);
      }
    } catch (error) {
      console.error('Failed to load recent searches:', error);
    } finally {
      setLoadingRecent(false);
    }
  };

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

  const handleRecentSearchClick = async (searchId: number) => {
    // Navigate to the study page with the search_id parameter
    navigate(`/study?source=search_flashcards&search_id=${searchId}`);
  };

  const handleTopicSuggestionClick = (topic: string) => {
    // Set the selected topic to pre-fill the form
    setSelectedTopic(topic);
  };

  const handleQuickSearch = () => {
    if (searchQuery.trim()) {
      // Perform search logic here
      console.log('Quick searching for:', searchQuery);
    }
  };

  return (
    <ProtectedRoute requiredRole="student">
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-800">
        {/* Fixed Header */}
        <div className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              {/* Logo and Back */}
              <div className="flex items-center space-x-4">
                <Link to="/dashboard" className="flex items-center space-x-2 group">
                  <Button variant="ghost" size="sm" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    Back to Dashboard
                  </span>
                </Link>
              </div>

              {/* Logo */}
              <Link to="/" className="flex items-center space-x-3 group">
                <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl group-hover:scale-105 transition-transform shadow-lg">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  MemoSpark
                </span>
              </Link>

              {/* Header Actions */}
              <div className="flex items-center space-x-3">
                <ThemeSwitcher />
                <Link to="/dashboard">
                  <Button variant="outline" size="sm">
                    Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
              Search & Generate Flashcards
            </h1>
            <p className="text-lg text-muted-foreground">
              Create custom flashcards, explore your search history, and track your study progress
            </p>
          </div>

          {/* Tabbed Interface */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8 bg-card/50 backdrop-blur-sm h-12">
              <TabsTrigger
                value="search"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white font-medium"
              >
                <SearchIcon className="h-4 w-4 mr-2" />
                Advanced Search
              </TabsTrigger>
              <TabsTrigger
                value="recent"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white font-medium"
              >
                <Clock className="h-4 w-4 mr-2" />
                Recent Searches
              </TabsTrigger>
              <TabsTrigger
                value="stats"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white font-medium"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Study Statistics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="space-y-6">
              <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50">
                <CardHeader>
                  <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    Generate Custom Flashcards
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SearchFlashcardsForm suggestedTopic={selectedTopic} />
                </CardContent>
              </Card>

              {/* Suggested Topics Section */}
              <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-600" />
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
                          className="cursor-pointer hover:bg-gradient-to-r hover:from-purple-600 hover:to-pink-600 hover:text-white transition-all duration-200 transform hover:scale-105"
                          onClick={() => handleTopicSuggestionClick(topic)}
                        >
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recent" className="space-y-6">
              {/* Quick Search Section */}
              <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50">
                <CardHeader>
                  <CardTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent flex items-center gap-2">
                    <SearchIcon className="h-5 w-5 text-blue-600" />
                    Quick Search
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    <Input
                      type="text"
                      placeholder="Search your previous topics..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 bg-white dark:bg-gray-950 border-2 border-blue-200 dark:border-blue-800 focus:border-blue-500 dark:focus:border-blue-400"
                      onKeyPress={(e) => e.key === 'Enter' && handleQuickSearch()}
                    />
                    <Button
                      size="default"
                      className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
                      onClick={handleQuickSearch}
                    >
                      <SearchIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Searches Section */}
              <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-600" />
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
                          className="flex items-center justify-between p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 cursor-pointer transition-all duration-200 transform hover:scale-[1.02]"
                          onClick={() => handleRecentSearchClick(search.id)}
                        >
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground">{search.topic}</h4>
                            {search.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {search.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700">
                                {search.difficulty}
                              </Badge>
                              <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700">
                                {search.flashcards_count} cards
                              </Badge>
                              {search.has_been_studied && (
                                <Badge variant="secondary" className="text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                                  Studied
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3" />
                              <span className="font-medium">
                                {new Date(search.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            {search.study_stats && search.study_stats.total_sessions > 0 && (
                              <div className="flex items-center gap-1 mt-1">
                                <TrendingUp className="h-3 w-3 text-green-600" />
                                <span className="font-medium text-green-600">
                                  {search.study_stats.average_score.toFixed(1)}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-lg font-medium">No recent searches yet</p>
                      <p className="text-sm">Start by generating your first set of flashcards!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stats" className="space-y-6">
              <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50">
                <CardHeader>
                  <CardTitle className="text-xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Study Statistics & Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SearchFlashcardStats />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Search;
