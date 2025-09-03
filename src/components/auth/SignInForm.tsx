
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SignInFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  onForgotPassword: (email: string) => Promise<void>;
  isLoading: boolean;
}

const SignInForm = ({ onSubmit, onForgotPassword, isLoading }: SignInFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(email, password);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      await onForgotPassword(email);
      setShowForgotPassword(false);
    }
  };

  if (showForgotPassword) {
    return (
      <form onSubmit={handleForgotPassword} className="space-y-4">
        <Alert>
          <AlertDescription>
            Enter your email address and we'll send you a link to reset your password.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="reset-email">Email</Label>
          <Input
            id="reset-email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12"
            style={{
              boxShadow: 'none',
              outline: 'none',
              transition: 'none'
            }}
            onFocus={(e) => {
              e.target.style.outline = 'none';
              e.target.style.boxShadow = 'none';
              e.target.style.borderColor = 'none';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'none';
            }}
          />
        </div>

        <div className="flex gap-2">
          <Button
            type="submit"
            className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            disabled={isLoading || !email}
            style={{
              boxShadow: 'none',
              outline: 'none',
              transition: 'none'
            }}
            onFocus={(e) => {
              e.target.style.outline = 'none';
              e.target.style.boxShadow = 'none';
              e.target.style.borderColor = 'none';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'none';
            }}
          >
            {isLoading ? "Sending..." : "Send Reset Link"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-12"
            onClick={() => setShowForgotPassword(false)}
            style={{
              boxShadow: 'none',
              outline: 'none',
              transition: 'none'
            }}
            onFocus={(e) => {
              e.target.style.outline = 'none';
              e.target.style.boxShadow = 'none';
              e.target.style.borderColor = 'none';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'none';
            }}
          >
            Back to Sign In
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signin-email">Email</Label>
        <Input
          id="signin-email"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-12"
          style={{
            boxShadow: 'none',
            outline: 'none',
            transition: 'none'
          }}
          onFocus={(e) => {
            e.target.style.outline = 'none';
            e.target.style.boxShadow = 'none';
            e.target.style.borderColor = 'none';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'none';
          }}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="signin-password">Password</Label>
        <Input
          id="signin-password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="h-12"
          style={{
            boxShadow: 'none',
            outline: 'none',
            transition: 'none'
          }}
          onFocus={(e) => {
            e.target.style.outline = 'none';
            e.target.style.boxShadow = 'none';
            e.target.style.borderColor = 'none';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'none';
          }}
        />
      </div>

      <Button
        type="submit"
        className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold"
        disabled={isLoading}
        style={{
          boxShadow: 'none',
          outline: 'none',
          transition: 'none'
        }}
        onFocus={(e) => {
          e.target.style.outline = 'none';
          e.target.style.boxShadow = 'none';
          e.target.style.borderColor = 'none';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'none';
        }}
      >
        {isLoading ? "Signing in..." : "Sign In"}
      </Button>

      <div className="text-center">
        <button
          type="button"
          className="text-sm text-blue-600 hover:underline"
          onClick={() => setShowForgotPassword(true)}
          style={{
            boxShadow: 'none',
            outline: 'none',
            transition: 'none'
          }}
          onFocus={(e) => {
            e.target.style.outline = 'none';
            e.target.style.boxShadow = 'none';
            e.target.style.borderColor = 'none';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'none';
          }}
        >
          Forgot your password?
        </button>
      </div>
    </form>
  );
};

export default SignInForm;
