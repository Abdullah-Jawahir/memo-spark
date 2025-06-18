import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, GraduationCap, Shield } from 'lucide-react';

interface DemoAccountsPanelProps {
  onDemoLogin: (email: string, password: string) => void;
  isLoading: boolean;
}

const DemoAccountsPanel = ({ onDemoLogin, isLoading }: DemoAccountsPanelProps) => {
  return (
    <Card className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 dark:from-gray-900 dark:to-gray-800 dark:border-blue-700 dark:shadow-blue-900/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Users className="h-4 w-4" />
          Try MemoSpark with Demo Accounts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs text-muted-foreground mb-3">
          Explore MemoSpark instantly with pre-configured demo accounts:
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs bg-white dark:bg-gray-900 dark:text-foreground dark:hover:bg-blue-900/40 hover:bg-blue-50 border border-blue-200 dark:border-blue-700"
          onClick={() => onDemoLogin('student@example.com', 'studentdemo123')}
          disabled={isLoading}
        >
          <GraduationCap className="h-3 w-3 mr-2" />
          Student Demo: student@example.com
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs bg-white dark:bg-gray-900 dark:text-foreground dark:hover:bg-red-900/40 hover:bg-red-50 border border-red-200 dark:border-red-700"
          onClick={() => onDemoLogin('admin@example.com', 'admindemo123')}
          disabled={isLoading}
        >
          <Shield className="h-3 w-3 mr-2" />
          Admin Demo: admin@example.com
        </Button>
      </CardContent>
    </Card>
  );
};

export default DemoAccountsPanel;
