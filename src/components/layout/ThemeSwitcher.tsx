import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="p-[1px] rounded-md border border-gray-200 dark:border-gray-700 bg-white/10 dark:bg-white/5 shadow-sm flex items-center justify-center transition-colors">
          <button className="p-2 rounded-full focus:outline-none" aria-label="Change theme">
            {theme === 'light' ? <Sun className="h-5 w-5 text-gray-900" /> : theme === 'dark' ? <Moon className="h-5 w-5 text-gray-300" /> : <Monitor className="h-5 w-5 text-gray-400" />}
          </button>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <span className="flex items-center gap-2"><Sun className="h-4 w-4" /> Light</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <span className="flex items-center gap-2"><Moon className="h-4 w-4" /> Dark</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <span className="flex items-center gap-2"><Monitor className="h-4 w-4" /> System</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 