import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useJobs';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoggingIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      await login({ email, password });
      navigate('/jobs');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Paralee Admin</h1>
          <p className="text-slate-400">Book Conversion Manager</p>
        </div>
        
        <Card className="p-8">
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <Input
                id="email"
                type="email"
                label="Email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              
              <Input
                id="password"
                type="password"
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              
              {error && (
                <div className="alert alert-error">
                  <span>{error}</span>
                </div>
              )}
              
              <Button
                type="submit"
                className="btn-primary w-full"
                size="lg"
                isLoading={isLoggingIn}
              >
                Sign In
              </Button>
            </div>
          </form>
        </Card>
        
        <p className="text-center text-slate-500 mt-6 text-sm">
          Authorized personnel only
        </p>
      </div>
    </div>
  );
}
