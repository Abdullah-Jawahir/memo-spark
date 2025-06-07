
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="col-span-1">
            <Link to="/" className="flex items-center space-x-2 mb-6">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold">MemoSpark</span>
            </Link>
            <p className="text-gray-400 mb-6">
              Empowering learners worldwide with AI-driven flashcards and multilingual support.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <div className="space-y-3">
              <Link to="/features" className="block text-gray-400 hover:text-white transition-colors">Features</Link>
              <Link to="/pricing" className="block text-gray-400 hover:text-white transition-colors">Pricing</Link>
              <Link to="/demo" className="block text-gray-400 hover:text-white transition-colors">Demo</Link>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <div className="space-y-3">
              <Link to="/about" className="block text-gray-400 hover:text-white transition-colors">About</Link>
              <Link to="/contact" className="block text-gray-400 hover:text-white transition-colors">Contact</Link>
              <Link to="/careers" className="block text-gray-400 hover:text-white transition-colors">Careers</Link>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <div className="space-y-3">
              <Link to="/help" className="block text-gray-400 hover:text-white transition-colors">Help Center</Link>
              <Link to="/privacy" className="block text-gray-400 hover:text-white transition-colors">Privacy</Link>
              <Link to="/terms" className="block text-gray-400 hover:text-white transition-colors">Terms</Link>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
          <p>&copy; 2024 MemoSpark. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
