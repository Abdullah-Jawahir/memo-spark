import { useState } from 'react';
import i18n from '@/i18n';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface LanguageToggleProps {
  currentLanguage?: string;
  onLanguageChange?: (language: string) => void;
}

const LanguageToggle = ({ currentLanguage, onLanguageChange }: LanguageToggleProps) => {
  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'si', name: 'සිංහල', flag: '🇱🇰' },
    { code: 'ta', name: 'தமிழ்', flag: '🇱🇰' }
  ];

  const activeLangCode = currentLanguage || i18n.language || 'en';
  const currentLang = languages.find(lang => lang.code === activeLangCode) || languages[0];

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="bg-card/80 backdrop-blur-sm border border-border hover:bg-muted">
            <span className="mr-2">{currentLang.flag}</span>
            {currentLang.name}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {languages.map((language) => (
            <DropdownMenuItem
              key={language.code}
              onClick={() => { if (onLanguageChange) onLanguageChange(language.code); i18n.changeLanguage(language.code); }}
              className={`cursor-pointer ${activeLangCode === language.code ? 'bg-muted text-foreground' : ''}`}
            >
              <span className="mr-2">{language.flag}</span>
              {language.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default LanguageToggle;
