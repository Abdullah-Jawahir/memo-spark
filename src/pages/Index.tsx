import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, BookOpen, CircleCheck, FileText, Search, User } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import LanguageToggle from '@/components/common/LanguageToggle';
import FeatureCard from '@/components/landing/FeatureCard';
import HeroSection from '@/components/landing/HeroSection';
import StatsSection from '@/components/landing/StatsSection';

const Index = () => {
  const [currentLanguage, setCurrentLanguage] = useState('en');

  const features = [
    {
      icon: FileText,
      title: "Smart Document Processing",
      description: "Upload PDFs, images, or text documents and our AI instantly creates flashcards in multiple languages.",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: BookOpen,
      title: "Adaptive Learning",
      description: "Personalized spaced repetition using the SM-2 algorithm to optimize your learning efficiency.",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: Search,
      title: "Multilingual Support",
      description: "Full support for English, Sinhala, and Tamil with advanced NLP processing.",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: CircleCheck,
      title: "Progress Tracking",
      description: "Beautiful analytics and insights to track your learning journey and achievements.",
      color: "from-orange-500 to-red-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-950 dark:to-gray-800">
      <Header currentLanguage={currentLanguage} />
      
      <main>
        <HeroSection />
        
        {/* Features Section */}
        <section className="py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <Badge variant="secondary" className="mb-4">
                Features
              </Badge>
              <h2 className="text-4xl font-bold text-foreground mb-6">
                Everything you need to learn smarter
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                MemoSpark combines cutting-edge AI with proven learning techniques to create the most effective study experience.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <FeatureCard key={index} feature={feature} index={index} />
              ))}
            </div>
          </div>
        </section>

        <StatsSection />

        {/* CTA Section */}
        <section className="py-20 px-6 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 dark:from-blue-900 dark:via-purple-900 dark:to-indigo-900">
          <div className="max-w-4xl mx-auto text-center text-white dark:text-foreground">
            <h2 className="text-4xl font-bold mb-6">
              Ready to transform your learning?
            </h2>
            <p className="text-xl mb-8 opacity-90 text-white dark:text-muted-foreground">
              Join thousands of students already using MemoSpark to achieve their academic goals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="bg-card text-blue-600 hover:bg-muted px-8 py-3 text-lg font-semibold">
                  Start Free Trial
                </Button>
              </Link>
              <Link to="/demo">
                <Button size="lg" variant="outline" className="border-card text-card-foreground hover:bg-muted hover:text-primary px-8 py-3 text-lg font-semibold">
                  Watch Demo
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <LanguageToggle 
        currentLanguage={currentLanguage} 
        onLanguageChange={setCurrentLanguage} 
      />
    </div>
  );
};

export default Index;
