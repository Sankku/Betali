import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { BetaliLogo } from '../components/ui/BetaliLogo';
import { supabase } from '../lib/supabase';

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'One uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', ok: /[a-z]/.test(password) },
    { label: 'One number', ok: /\d/.test(password) },
  ];

  const passed = checks.filter(c => c.ok).length;
  const strength = passed <= 1 ? 'weak' : passed <= 2 ? 'fair' : passed === 3 ? 'good' : 'strong';
  const colors = { weak: 'bg-red-400', fair: 'bg-orange-400', good: 'bg-yellow-400', strong: 'bg-green-500' };
  const labels = { weak: 'Weak', fair: 'Fair', good: 'Good', strong: 'Strong' };

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= passed ? colors[strength] : 'bg-neutral-200'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${
        strength === 'strong' ? 'text-green-600' :
        strength === 'good' ? 'text-yellow-600' :
        strength === 'fair' ? 'text-orange-500' : 'text-red-500'
      }`}>
        {labels[strength]}
      </p>
      <ul className="space-y-1">
        {checks.map(c => (
          <li key={c.label} className={`text-xs flex items-center gap-1.5 ${c.ok ? 'text-green-600' : 'text-neutral-400'}`}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${c.ok ? 'bg-green-500' : 'bg-neutral-300'}`} />
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  // Session can come from two sources:
  // 1. Recovery link → Supabase fires PASSWORD_RECOVERY on auth state change
  // 2. OTP code verified in ForgotPassword → session is already set when we navigate here
  useEffect(() => {
    // Check if session already exists (OTP flow)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    // Also listen for the PASSWORD_RECOVERY event (magic link flow)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setSessionReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    const { error } = await updatePassword(password);

    if (error) {
      setError(error.message || 'Could not update password. Try requesting a new link.');
    } else {
      setDone(true);
    }

    setLoading(false);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md z-10">
          <div className="text-center mb-8 flex flex-col items-center">
            <BetaliLogo variant="icon" size="xl" className="mb-4" />
          </div>
          <Card className="bg-white/90 backdrop-blur-xl border border-neutral-200/50 shadow-xl">
            <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8">
              <div className="rounded-full bg-green-50 p-4">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </div>
              <h2 className="text-xl font-semibold text-neutral-900">Password updated!</h2>
              <p className="text-sm text-neutral-600 text-center">
                Your password has been changed successfully. You can now sign in with your new password.
              </p>
              <Button
                className="w-full h-11 bg-primary-600 hover:bg-primary-700 text-white font-medium mt-2"
                onClick={() => navigate('/login')}
              >
                Go to Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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

        <Card className="bg-white/90 backdrop-blur-xl border border-neutral-200/50 shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex justify-center mb-2">
              <div className="rounded-full bg-primary-50 p-3">
                <ShieldCheck className="h-6 w-6 text-primary-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-semibold text-center text-neutral-900">
              Set new password
            </CardTitle>
            <CardDescription className="text-center text-neutral-600">
              Choose a strong password to protect your account
            </CardDescription>
          </CardHeader>

          <CardContent>
            {!sessionReady && (
              <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 p-3">
                <p className="text-xs text-amber-700">
                  Waiting for your recovery link to be validated... If this message persists, try clicking the link from your email again.
                </p>
              </div>
            )}

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
                <Label htmlFor="password" className="text-neutral-700">
                  New password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="h-11 bg-neutral-50/50 border-neutral-200 focus:ring-primary-500 pr-10"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
                    onClick={() => setShowPassword(v => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <PasswordStrength password={password} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-neutral-700">
                  Confirm new password
                </Label>
                <div className="relative">
                  <Input
                    id="confirm"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className={`h-11 bg-neutral-50/50 border-neutral-200 focus:ring-primary-500 pr-10 ${
                      confirmPassword && confirmPassword !== password
                        ? 'border-red-400 focus:ring-red-400'
                        : ''
                    }`}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
                    onClick={() => setShowConfirm(v => !v)}
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-xs text-red-500">Passwords do not match</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-primary-600 hover:bg-primary-700 text-white font-medium"
                disabled={loading || !sessionReady}
              >
                {loading ? 'Updating...' : 'Update password'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="text-sm text-neutral-500 hover:text-primary-600 transition-colors"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
