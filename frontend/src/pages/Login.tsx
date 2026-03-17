import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { BetaliLogo } from '../components/ui/BetaliLogo';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const navigate = useNavigate();
  const query = useQuery();
  const { signIn, user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    const messageParam = query.get('message');
    const verifyParam = query.get('verify');
    
    if (verifyParam === 'true') {
      setMessage('Registration successful! Please check your email and click the confirmation link to log in.');
    } else if (messageParam) {
      setMessage(messageParam);
    }
  }, [query]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await signIn(email, password);

      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Login error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100 flex items-center justify-center p-4">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-250px] left-[-100px] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-success-200/20 to-success-300/20 blur-3xl" />
        <div className="absolute bottom-[-350px] right-[-100px] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-primary-200/20 to-primary-300/20 blur-3xl" />
      </div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8 flex flex-col items-center">
          <BetaliLogo variant="icon" size="xl" className="mb-4" />
          <h1 className="text-2xl font-semibold text-gray-900">Betali</h1>
          <p className="text-gray-500 mt-1">Business inventory management</p>
        </div>

        {message && (
          <div className="mb-4 rounded-md bg-green-50 border border-green-200 p-4">
            <div className="text-sm text-green-700">{message}</div>
          </div>
        )}

        <Card className="bg-white/90 backdrop-blur-xl border border-neutral-200/50 shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-semibold text-center text-neutral-900">
              Sign In
            </CardTitle>
            <CardDescription className="text-center text-neutral-600">
              Enter your credentials to access the panel
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-md border border-danger-500/30 bg-danger-500/10 p-4">
                <h3 className="text-sm font-semibold text-danger-600">Error</h3>
                <div className="mt-1 text-sm text-danger-500">{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-neutral-700">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="h-11 border-neutral-200 focus:ring-primary-500"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-neutral-700">
                    Password
                  </Label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-neutral-500 hover:text-primary-600 transition-colors"
                  >
                    Forgot your password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="h-11 border-neutral-200 focus:ring-primary-500"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={rememberMe}
                  onCheckedChange={checked => setRememberMe(checked as boolean)}
                  id="remember"
                />
                <label
                  htmlFor="remember"
                  className="text-sm text-neutral-700 font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Remember me
                </label>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white"
              >
                {loading ? 'Loading...' : 'Sign In'}{' '}
                {!loading && <ArrowRight className="ml-2 h-4 w-4 text-white" />}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 border-t border-gray-100 bg-gray-50 rounded-b-lg pt-6">
            <div className="text-center text-neutral-700 text-sm">
              Don't have an account?
              <span className="ml-1"></span>
              <Link to="/register" className="font-medium text-primary-600 hover:text-primary-700">
                Create account
              </Link>
            </div>
            <div className="text-center text-xs text-gray-500">
              By signing in, you accept our
              <span className="ml-1"></span>
              <Link to="/terms" className="underline hover:text-gray-700">
                Terms of service
              </Link>
              <span className="ml-1"></span>
              <Link to="/privacy" className="underline hover:text-gray-700">
                Privacy policy
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
