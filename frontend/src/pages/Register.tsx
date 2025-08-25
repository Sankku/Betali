import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/card';

import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Input } from '../components/ui/input';

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { signUp, user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!name.trim()) {
      setError('Name is required');
      setLoading(false);
      return;
    }

    if (!agreeTerms) {
      setError('You must accept the terms and conditions to continue');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      // Step 1: Sign up with Supabase Auth
      const { data: authData, error: authError } = await signUp(email, password);

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Signup failed - no user returned');
      }

      // Step 2: Complete SaaS signup by creating organization
      const response = await fetch('http://localhost:4000/api/auth/complete-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: authData.user.id,
          email: authData.user.email,
          name: name.trim(),
          organization_name: organizationName.trim() || `${name.trim()}'s Organization`
        }),
      });

      const signupResult = await response.json();

      if (!response.ok) {
        throw new Error(signupResult.error || 'Failed to complete signup');
      }

      // Success! Redirect to dashboard
      navigate('/dashboard?welcome=true');
      
    } catch (err: any) {
      setError(err.message || 'Registration error');
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
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-md mb-4">
            <div className="rounded-full bg-gradient-to-br from-primary-400 to-primary-600 p-3">
              <Package className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Betali</h1>
          <p className="text-gray-500 mt-1">Business inventory management</p>
        </div>

        <Card className="bg-white/90 backdrop-blur-xl border border-neutral-200/50 shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-semibold text-center text-neutral-900">
              Create Account
            </CardTitle>
            <CardDescription className="text-center text-neutral-600">
              Create your account and start your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-md bg-danger-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-danger-800">Error</h3>
                    <div className="mt-1 text-sm text-danger-700">{error}</div>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-neutral-700">
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="h-11 bg-neutral-50/50 border-neutral-200 focus:ring-primary-500"
                  required
                />
              </div>

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
                  className="h-11 bg-neutral-50/50 border-neutral-200 focus:ring-primary-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="organizationName" className="text-neutral-700">
                  Organization Name
                  <span className="text-xs text-neutral-500 ml-1">(optional)</span>
                </Label>
                <Input
                  id="organizationName"
                  type="text"
                  placeholder="My Company"
                  value={organizationName}
                  onChange={e => setOrganizationName(e.target.value)}
                  className="h-11 bg-neutral-50/50 border-neutral-200 focus:ring-primary-500"
                />
                <p className="text-xs text-neutral-500">
                  Leave empty to use "{name ? `${name}'s Organization` : 'Your Organization'}"
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-neutral-700">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="h-11 bg-neutral-50/50 border-neutral-200 focus:ring-primary-500"
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-neutral-700">
                  Confirm password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="h-11 bg-neutral-50/50 border-neutral-200 focus:ring-primary-500"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={agreeTerms}
                  onCheckedChange={checked => setAgreeTerms(checked as boolean)}
                  id="terms"
                  className="data-[state=checked]:bg-primary-600 data-[state=checked]:border-primary-600"
                />
                <label
                  htmlFor="terms"
                  className="text-sm text-neutral-700 font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  onClick={() => setAgreeTerms(!agreeTerms)}
                >
                  I accept the{' '}
                  <Link to="/terms" className="text-primary-600 hover:text-primary-700 underline">
                    terms and conditions
                  </Link>
                </label>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white"
              >
                {loading ? 'Loading...' : 'Create account'}
                {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 border-t border-neutral-100 bg-neutral-50/50 rounded-b-lg pt-6">
            <div className="text-center text-neutral-700 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700">
                Sign in
              </Link>
            </div>
            <div className="text-center text-xs text-neutral-500">
              By registering, you accept our{' '}
              <Link to="/terms" className="underline hover:text-neutral-700">
                Terms of service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="underline hover:text-neutral-700">
                Privacy policy
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
