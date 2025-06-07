
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  Globe, 
  Repeat, 
  Trophy, 
  Users, 
  Cloud, 
  Shield, 
  Smartphone 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const Features = () => {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Flashcard Creation",
      description: "Transform any document into interactive flashcards using advanced AI. Support for PDFs, images, and text files with intelligent content extraction.",
      benefits: ["Automatic question generation", "Smart content analysis", "Multiple card formats"]
    },
    {
      icon: Globe,
      title: "Multilingual Learning Support",
      description: "Native support for English, Sinhala, and Tamil with OCR capabilities. Perfect for diverse learning communities and multilingual education.",
      benefits: ["Three language support", "OCR for local scripts", "Cultural inclusivity"]
    },
    {
      icon: Repeat,
      title: "Adaptive Spaced Repetition",
      description: "Scientific learning algorithm that adapts to your progress. Cards appear at optimal intervals to maximize retention and minimize study time.",
      benefits: ["Personalized scheduling", "Memory optimization", "Progress tracking"]
    },
    {
      icon: Trophy,
      title: "Gamified Study Experience",
      description: "Stay motivated with achievements, streaks, and leaderboards. Turn studying into an engaging game with rewards and social competition.",
      benefits: ["Achievement badges", "Study streaks", "Community leaderboards"]
    },
    {
      icon: Users,
      title: "Collaborative Deck Sharing",
      description: "Share your study decks with classmates or the global community. Discover high-quality content created by educators and fellow learners.",
      benefits: ["Public deck library", "Community ratings", "Collaborative editing"]
    },
    {
      icon: Cloud,
      title: "Seamless Cloud Sync",
      description: "Access your flashcards anywhere with automatic cloud synchronization. Import directly from Google Drive and Dropbox for convenience.",
      benefits: ["Cross-device sync", "Cloud integration", "Automatic backups"]
    },
    {
      icon: Shield,
      title: "Privacy & Security First",
      description: "Your data is protected with enterprise-grade security. GDPR compliant with transparent data practices and user control.",
      benefits: ["Data encryption", "GDPR compliance", "User privacy controls"]
    },
    {
      icon: Smartphone,
      title: "Progressive Web App",
      description: "Works seamlessly across all devices - desktop, tablet, and mobile. Install as an app for native-like experience and offline access.",
      benefits: ["Cross-platform support", "Offline functionality", "App-like experience"]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header currentLanguage="en" />
      
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Powerful Features for
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Smart Learning</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Discover how MemoSpark revolutionizes the way you create, study, and share flashcards with cutting-edge AI and multilingual support.
          </p>
          <Link to="/register">
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-3">
              Start Learning Today
            </Button>
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {features.map((feature, index) => (
            <Card key={index} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-8">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg group-hover:scale-110 transition-transform">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                    <p className="text-gray-600 mb-4">{feature.description}</p>
                    <ul className="space-y-2">
                      {feature.benefits.map((benefit, benefitIndex) => (
                        <li key={benefitIndex} className="flex items-center text-sm text-gray-500">
                          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-3"></div>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Learning?</h2>
          <p className="text-xl mb-8 opacity-90">Join thousands of students already using MemoSpark to study smarter, not harder.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3">
                Get Started Free
              </Button>
            </Link>
            <Link to="/pricing">
              <Button variant="outline" className="border-white text-white hover:bg-white/10 px-8 py-3">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Features;
