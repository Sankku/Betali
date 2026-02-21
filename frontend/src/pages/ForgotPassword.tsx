import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, CheckCircle2, KeyRound } from 'lucide-react';
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

const OTP_LENGTH = 6;

function OtpInput({ onComplete, disabled }: { onComplete: (code: string) => void; disabled: boolean }) {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    // Accept paste of full code
    if (value.length > 1) {
      const clean = value.replace(/\D/g, '').slice(0, OTP_LENGTH);
      const next = Array(OTP_LENGTH).fill('');
      clean.split('').forEach((c, i) => { next[i] = c; });
      setDigits(next);
      const focusIdx = Math.min(clean.length, OTP_LENGTH - 1);
      inputs.current[focusIdx]?.focus();
      if (clean.length === OTP_LENGTH) onComplete(clean);
      return;
    }

    const clean = value.replace(/\D/g, '');
    const next = [...digits];
    next[index] = clean;
    setDigits(next);

    if (clean && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }

    if (next.every(d => d !== '')) {
      onComplete(next.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={d}
          disabled={disabled}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onFocus={e => e.target.select()}
          className={`w-11 h-14 text-center text-xl font-semibold rounded-lg border-2 transition-colors outline-none
            ${d ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-neutral-200 bg-neutral-50 text-neutral-900'}
            focus:border-primary-500 focus:ring-2 focus:ring-primary-200
            disabled:opacity-50 disabled:cursor-not-allowed`}
        />
      ))}
    </div>
  );
}

type Step = 'email' | 'sent' | 'otp' | 'verifying';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<Step>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { sendPasswordResetEmail, verifyPasswordOtp } = useAuth();
  const navigate = useNavigate();

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await sendPasswordResetEmail(email);

    if (error) {
      setError(error.message || 'Error sending recovery email. Try again.');
    } else {
      setStep('sent');
    }

    setLoading(false);
  };

  const handleOtpComplete = async (code: string) => {
    setStep('verifying');
    setError(null);

    const { error } = await verifyPasswordOtp(email, code);

    if (error) {
      setError(error.message || 'Invalid or expired code. Try again.');
      setStep('otp');
    } else {
      // Session is now set — go to reset password form
      navigate('/reset-password');
    }
  };

  const resetFlow = () => {
    setStep('email');
    setEmail('');
    setError(null);
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

        <Card className="bg-white/90 backdrop-blur-xl border border-neutral-200/50 shadow-xl">
          {/* ── STEP: email form ── */}
          {step === 'email' && (
            <>
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-2xl font-semibold text-center text-neutral-900">
                  Forgot your password?
                </CardTitle>
                <CardDescription className="text-center text-neutral-600">
                  Enter your email and we'll send you a recovery code and link
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSend} className="space-y-4">
                  {error && (
                    <div className="rounded-md bg-danger-50 p-4">
                      <p className="text-sm text-danger-700">{error}</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-neutral-700">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="example@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="h-11 pl-10 bg-neutral-50/50 border-neutral-200 focus:ring-primary-500"
                        required
                        autoFocus
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 bg-primary-600 hover:bg-primary-700 text-white font-medium"
                    disabled={loading}
                  >
                    {loading ? 'Sending...' : 'Send recovery email'}
                  </Button>
                </form>
              </CardContent>
            </>
          )}

          {/* ── STEP: email sent — choose path ── */}
          {step === 'sent' && (
            <>
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-2xl font-semibold text-center text-neutral-900">
                  Check your email
                </CardTitle>
                <CardDescription className="text-center text-neutral-600">
                  We sent a recovery link and code to <span className="font-medium text-neutral-800">{email}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Option A: use the link */}
                <div className="rounded-xl border border-neutral-200 p-4 flex gap-3 items-start">
                  <div className="rounded-full bg-green-50 p-2 shrink-0 mt-0.5">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">Click the link in the email</p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Open the email and click "Reset password". It will redirect you here automatically.
                    </p>
                  </div>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-neutral-200" />
                  <span className="text-xs text-neutral-400 font-medium">or</span>
                  <div className="flex-1 h-px bg-neutral-200" />
                </div>

                {/* Option B: enter the code */}
                <div className="rounded-xl border border-primary-100 bg-primary-50/40 p-4 flex gap-3 items-start">
                  <div className="rounded-full bg-primary-100 p-2 shrink-0 mt-0.5">
                    <KeyRound className="h-4 w-4 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-neutral-900">Enter the 6-digit code</p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      The email also includes a one-time code you can type here directly.
                    </p>
                    <Button
                      className="mt-3 h-9 px-4 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium"
                      onClick={() => setStep('otp')}
                    >
                      Enter code
                    </Button>
                  </div>
                </div>

                <button
                  type="button"
                  className="w-full text-xs text-neutral-400 hover:text-neutral-600 transition-colors pt-1"
                  onClick={resetFlow}
                >
                  Use a different email
                </button>
              </CardContent>
            </>
          )}

          {/* ── STEP: OTP input ── */}
          {(step === 'otp' || step === 'verifying') && (
            <>
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-2xl font-semibold text-center text-neutral-900">
                  Enter your code
                </CardTitle>
                <CardDescription className="text-center text-neutral-600">
                  Type the 6-digit code from the email sent to <span className="font-medium text-neutral-800">{email}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {error && (
                  <div className="rounded-md bg-danger-50 p-3">
                    <p className="text-sm text-danger-700">{error}</p>
                  </div>
                )}

                <OtpInput
                  onComplete={handleOtpComplete}
                  disabled={step === 'verifying'}
                />

                {step === 'verifying' && (
                  <p className="text-center text-sm text-neutral-500 animate-pulse">Verifying code...</p>
                )}

                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    className="text-xs text-neutral-400 hover:text-primary-600 transition-colors"
                    onClick={() => setStep('sent')}
                    disabled={step === 'verifying'}
                  >
                    ← Back
                  </button>
                </div>
              </CardContent>
            </>
          )}
        </Card>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-primary-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
