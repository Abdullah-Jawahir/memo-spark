
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, Zap } from 'lucide-react';

const HeroSection = () => {
  return (
    <section className="relative py-20 px-6 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-2000"></div>
      </div>

      <div className="max-w-7xl mx-auto text-center">
        <Badge variant="secondary" className="mb-6 animate-fade-in bg-gradient-to-r from-green-100 to-blue-100 text-green-800 border-green-200">
          <Zap className="h-3 w-3 mr-1" />
          Try out MemoSpark instantly—no sign-up needed!
        </Badge>
        
        <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-8 animate-fade-in delay-200">
          Learn Smarter with{' '}
          <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
            AI-Powered
          </span>{' '}
          Flashcards
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed animate-fade-in delay-400">
          Transform any document into personalized flashcards instantly. 
          Support for English, Sinhala, and Tamil with adaptive learning that grows with you.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-in delay-600">
          <Link to="/upload">
            <Button size="lg" className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-8 py-4 text-lg font-semibold hover:scale-105 transition-transform">
              <Zap className="h-5 w-5 mr-2" />
              Try It Now - Free!
            </Button>
          </Link>
          <Link to="/register">
            <Button size="lg" variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-4 text-lg font-semibold hover:scale-105 transition-transform">
              Create Account
            </Button>
          </Link>
        </div>

        {/* Instant Try Badge */}
        <div className="mb-8 animate-fade-in delay-700">
          <div className="inline-flex items-center bg-white rounded-full px-6 py-3 shadow-lg border border-gray-200">
            <div className="flex items-center space-x-3 text-sm">
              <div className="flex items-center text-green-600">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                No registration required
              </div>
              <div className="h-4 w-px bg-gray-300"></div>
              <div className="text-gray-600">Upload & generate instantly</div>
              <div className="h-4 w-px bg-gray-300"></div>
              <div className="text-gray-600">Full feature access</div>
            </div>
          </div>
        </div>

        {/* Hero Image/Mockup */}
        <div className="relative max-w-5xl mx-auto animate-fade-in delay-800">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 transform perspective-1000 hover:scale-105 transition-transform duration-500">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 h-96 flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">MS</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Interactive Dashboard Preview</h3>
                <p className="text-gray-600">Beautiful, intuitive interface for effortless learning</p>
                <Link to="/upload">
                  <Button className="mt-4 bg-gradient-to-r from-blue-500 to-purple-500">
                    Try Demo Now
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="mt-16 animate-bounce">
          <ArrowDown className="h-6 w-6 text-gray-400 mx-auto" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
