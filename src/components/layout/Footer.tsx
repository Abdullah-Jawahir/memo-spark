
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Footer = () => {
  const { t } = useTranslation();

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
            <p className="text-gray-400 mb-6">{t('footer.description')}</p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{t('footer.product')}</h3>
            <div className="space-y-3">
              <Link to="/features" className="block text-gray-400 hover:text-white transition-colors">{t('nav.features')}</Link>
              <Link to="/pricing" className="block text-gray-400 hover:text-white transition-colors">{t('nav.pricing')}</Link>
              <Link to="/demo" className="block text-gray-400 hover:text-white transition-colors">{t('footer.demo')}</Link>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{t('footer.company')}</h3>
            <div className="space-y-3">
              <Link to="/about" className="block text-gray-400 hover:text-white transition-colors">{t('nav.about')}</Link>
              <Link to="/contact" className="block text-gray-400 hover:text-white transition-colors">{t('nav.contact')}</Link>
              <Link to="/careers" className="block text-gray-400 hover:text-white transition-colors">{t('footer.careers')}</Link>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{t('footer.support')}</h3>
            <div className="space-y-3">
              <Link to="/help" className="block text-gray-400 hover:text-white transition-colors">{t('footer.help')}</Link>
              <Link to="/privacy" className="block text-gray-400 hover:text-white transition-colors">{t('footer.privacy')}</Link>
              <Link to="/terms" className="block text-gray-400 hover:text-white transition-colors">{t('footer.terms')}</Link>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
          <p>{t('footer.copy', { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
