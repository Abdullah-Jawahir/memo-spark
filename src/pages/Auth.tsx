import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import SignInForm from '@/components/auth/SignInForm';
import SignUpForm from '@/components/auth/SignUpForm';
import DemoAccountsPanel from '@/components/auth/DemoAccountsPanel';
import ThemeSwitcher from '@/components/layout/ThemeSwitcher';

const Auth = () => {
  const { user, profile, signIn, signUp, resetPassword } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  if (user && profile) {
    const redirectPath = profile.role === 'admin' ? '/admin' : '/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  const handleSignIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await signIn(email, password);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (fullName: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      await signUp(email, password, fullName);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (email: string) => {
    setIsLoading(true);
    try {
      await resetPassword(email);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await signIn(email, password);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-800 flex items-center justify-center p-6">
      <div className="absolute top-4 right-4 z-50"><ThemeSwitcher /></div>
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center space-x-2 mb-8 group">
          <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg group-hover:scale-105 transition-transform">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            MemoSpark
          </span>
        </Link>

        <Card className="border border-border shadow-2xl bg-card/90 dark:bg-gray-900/95 dark:border-blue-700 dark:shadow-blue-900/40 backdrop-blur-md animate-fade-in">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-foreground">Welcome to MemoSpark</CardTitle>
            <CardDescription className="text-muted-foreground">
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-4">
                <SignInForm 
                  onSubmit={handleSignIn}
                  onForgotPassword={handleForgotPassword}
                  isLoading={isLoading}
                />
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4">
                <SignUpForm 
                  onSubmit={handleSignUp}
                  isLoading={isLoading}
                />
              </TabsContent>
            </Tabs>

            {/* Demo Accounts Section */}
            <DemoAccountsPanel 
              onDemoLogin={handleDemoLogin}
              isLoading={isLoading}
            />

            <div className="text-center text-sm text-muted-foreground mt-4">
              <Link to="/" className="text-blue-600 hover:underline">
                ← Back to home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
