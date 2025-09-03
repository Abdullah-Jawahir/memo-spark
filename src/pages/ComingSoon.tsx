import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Clock,
  Sparkles,
  Rocket,
  Bell,
  Mail,
  Calendar,
  BookOpen,
  Settings,
  BarChart3
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ThemeSwitcher from '@/components/layout/ThemeSwitcher';

const ComingSoon = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine the feature name based on the current route
  const getFeatureName = (pathname: string) => {
    if (pathname.includes('analytics')) return 'Analytics Dashboard';
    if (pathname.includes('settings')) return 'Admin Settings';
    if (pathname.includes('admin')) return 'Admin Feature';
    return 'Feature';
  };

  // Get appropriate icon based on route
  const getFeatureIcon = (pathname: string) => {
    if (pathname.includes('analytics')) return BarChart3;
    if (pathname.includes('settings')) return Settings;
    return BookOpen;
  };

  const featureName = getFeatureName(location.pathname);
  const FeatureIcon = getFeatureIcon(location.pathname);

  const handleGoBack = () => {
    if (location.pathname.startsWith('/admin')) {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  const upcomingFeatures = [
    {
      name: "Advanced Analytics",
      description: "Detailed insights into learning patterns and progress",
      icon: BarChart3,
      estimatedDate: "Q1 2025"
    },
    {
      name: "Admin Settings",
      description: "Comprehensive system configuration and user management",
      icon: Settings,
      estimatedDate: "Q1 2025"
    },
    {
      name: "Study Reminders",
      description: "Smart notifications to keep you on track",
      icon: Bell,
      estimatedDate: "Q2 2025"
    },
    {
      name: "Collaborative Learning",
      description: "Study with friends and share flashcard decks",
      icon: Mail,
      estimatedDate: "Q2 2025"
    }
  ];

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-950 dark:to-gray-800 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-950 dark:to-gray-800">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              MemoSpark
            </span>
          </Link>

          <div className="flex items-center space-x-4">
            {user && (
              <Badge variant="secondary" className="hidden sm:flex">
                {user.email}
              </Badge>
            )}
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={handleGoBack}
            className="mb-8 group hover:bg-white/50 dark:hover:bg-gray-800/50"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Go Back
          </Button>

          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mb-8 animate-pulse">
              <FeatureIcon className="w-12 h-12 text-white" />
            </div>

            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-6">
              Coming Soon!
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-4">
              {featureName} is under development
            </p>

            <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-8">
              We're working hard to bring you amazing new features that will make your learning experience even better.
              Stay tuned for updates!
            </p>

            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <Clock className="w-4 h-4" />
              <span>Expected launch: Q1 2025</span>
            </div>
          </div>

          {/* Features Grid */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-800 dark:text-gray-200">
              What's Coming Next
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              {upcomingFeatures.map((feature, index) => (
                <Card
                  key={index}
                  className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-0 shadow-lg"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <feature.icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                          {feature.name}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-3">
                          {feature.description}
                        </p>
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <Badge variant="outline" className="text-xs">
                            {feature.estimatedDate}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <Card className="bg-gradient-to-r from-blue-500 to-purple-600 border-0 text-white">
            <CardContent className="p-8 text-center">
              <Rocket className="w-16 h-16 mx-auto mb-6 animate-bounce" />
              <h3 className="text-2xl font-bold mb-4">
                Want to be notified when it's ready?
              </h3>
              <p className="text-blue-100 mb-6 max-w-md mx-auto">
                Continue using MemoSpark and you'll be among the first to experience these new features!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={handleGoBack}
                  variant="secondary"
                  size="lg"
                  className="bg-white text-blue-600 hover:bg-gray-100"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Continue Learning
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white text-white hover:bg-white/10"
                  onClick={() => navigate('/dashboard')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-gray-200 dark:border-gray-700 bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-gray-600 dark:text-gray-400">
            <p>&copy; 2025 MemoSpark. Building the future of learning.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ComingSoon;
