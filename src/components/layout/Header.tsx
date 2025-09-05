import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Menu, X, User, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ThemeSwitcher from './ThemeSwitcher';
import LanguageToggle from '@/components/common/LanguageToggle';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const { t } = useTranslation();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border shadow-sm">
      <div className="relative w-full py-3 md:py-2">{/* Added more padding on mobile */}
        {/* Logo pinned to left corner */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg group-hover:scale-105 transition-transform">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              MemoSpark
            </span>
          </Link>
        </div>

        {/* Centered nav/content (keeps previous max width) */}
        <div className={`max-w-7xl mx-auto px-6 flex items-center justify-center ${isMenuOpen ? 'lg:py-4' : 'py-4'}`}>
          <nav className="hidden lg:flex items-center space-x-8">
            <Link to="/features" className="text-muted-foreground hover:text-primary transition-colors font-medium">
              {t('nav.features')}
            </Link>
            <Link to="/pricing" className="text-muted-foreground hover:text-primary transition-colors font-medium">
              {t('nav.pricing')}
            </Link>
            <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors font-medium">
              {t('nav.about')}
            </Link>
            <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors font-medium">
              {t('nav.contact')}
            </Link>
          </nav>
        </div>

        {/* Profile / Auth pinned to right corner */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center space-x-4">
          <div className="hidden md:block">
            <LanguageToggle />
          </div>
          <ThemeSwitcher />

          {/* Mobile Menu Button (kept near right) */}
          <button
            className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors border border-border"
            onClick={toggleMenu}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMenuOpen ? <X className="h-6 w-6 text-foreground" /> : <Menu className="h-6 w-6 text-foreground" />}
          </button>

          {/* Profile / Auth area */}
          {user && profile ? (
            <Link to="/dashboard" className="hidden lg:flex items-center space-x-3 px-4 py-2 bg-muted/50 rounded-lg border border-border min-w-0 hover:bg-muted transition-colors">
              <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full flex-shrink-0">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-foreground leading-tight truncate">
                  {profile.full_name}
                </span>
                <Badge
                  variant={profile.role === 'admin' ? 'destructive' : 'secondary'}
                  className="text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize w-fit mt-0.5"
                >
                  {profile.role}
                </Badge>
              </div>
            </Link>
          ) : (
            <div className="hidden lg:flex items-center space-x-3">
              <Link to="/auth">
                <Button
                  variant="ghost"
                  className="text-muted-foreground hover:text-primary hover:bg-muted px-4 py-2"
                >
                  Sign In
                </Button>
              </Link>
              <Link to="/auth">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Navigation Overlay */}
        {isMenuOpen && (
          <div className="lg:hidden">
            {/* Overlay background to close menu when clicked */}
            <div
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
              onClick={() => setIsMenuOpen(false)}
            />

            {/* Menu content */}
            <div className="relative z-50 pb-4 border-t border-border bg-background/95 backdrop-blur-sm rounded-lg shadow-lg">
              {/* Close button at top of menu */}
              <div className="flex justify-end p-3 border-b border-border">
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors border border-border"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              <nav className="flex flex-col space-y-4 mt-4 px-2">
                {/* Theme Switcher and Language Toggle for Mobile */}
                <div className="flex justify-between items-center mb-2">
                  <LanguageToggle />
                  <ThemeSwitcher />
                </div>

                <Link
                  to="/features"
                  className="text-muted-foreground hover:text-primary transition-colors font-medium py-2 px-3 rounded-lg hover:bg-muted"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Features
                </Link>
                <Link
                  to="/pricing"
                  className="text-muted-foreground hover:text-primary transition-colors font-medium py-2 px-3 rounded-lg hover:bg-muted"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Pricing
                </Link>
                <Link
                  to="/about"
                  className="text-muted-foreground hover:text-primary transition-colors font-medium py-2 px-3 rounded-lg hover:bg-muted"
                  onClick={() => setIsMenuOpen(false)}
                >
                  About
                </Link>
                <Link
                  to="/contact"
                  className="text-muted-foreground hover:text-primary transition-colors font-medium py-2 px-3 rounded-lg hover:bg-muted"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Contact
                </Link>

                {user && profile ? (
                  <div className="flex flex-col space-y-3 pt-4 border-t border-border">
                    {/* User Info Section for Mobile - Clickable to go to Dashboard */}
                    <Link to="/dashboard" onClick={() => setIsMenuOpen(false)}>
                      <div className="flex items-center space-x-3 px-3 py-3 bg-muted/50 rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer">
                        <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">
                            {profile.full_name}
                          </span>
                          <Badge
                            variant={profile.role === 'admin' ? 'destructive' : 'secondary'}
                            className="text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize w-fit mt-1"
                          >
                            {profile.role}
                          </Badge>
                        </div>
                      </div>
                    </Link>

                    <Button
                      variant="outline"
                      onClick={() => { signOut(); setIsMenuOpen(false); }}
                      className="w-full justify-start border-border hover:bg-muted"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-3 pt-4 border-t border-border">
                    <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-primary hover:bg-muted">
                        Sign In
                      </Button>
                    </Link>
                    <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                      <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                        Get Started
                      </Button>
                    </Link>
                  </div>
                )}
              </nav>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
