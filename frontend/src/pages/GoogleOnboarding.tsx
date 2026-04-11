import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Eye, EyeOff, Building2, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { BetaliLogo } from '../components/ui/BetaliLogo';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export default function GoogleOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [organizationName, setOrganizationName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || '';
  const userEmail = user?.email || '';

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    try {
      // Step 1: Set password in Supabase Auth
      const { error: passwordError } = await supabase.auth.updateUser({ password });
      if (passwordError) throw new Error(`Error al establecer contraseña: ${passwordError.message}`);

      // Step 2: Complete signup — create organization in our DB
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/complete-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user!.id,
          email: userEmail,
          name: userName,
          organization_name: organizationName.trim() || `${userName}'s Organization`,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || result.error || 'Error al completar el registro');
      }

      // Invalidate org query so ProtectedRoute doesn't redirect back here
      await queryClient.invalidateQueries({ queryKey: ['user-organizations'] });
      navigate('/dashboard?welcome=true', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Error inesperado');
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
          <h1 className="text-2xl font-semibold text-gray-900">¡Bienvenido a Betali!</h1>
          <p className="text-gray-500 mt-1">Solo faltan unos pasos para empezar</p>
        </div>

        <Card className="bg-white/90 backdrop-blur-xl border border-neutral-200/50 shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-semibold text-center text-neutral-900">
              Configurá tu cuenta
            </CardTitle>
            <CardDescription className="text-center text-neutral-600">
              Iniciaste sesión como <strong>{userEmail}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-md border border-danger-500/30 bg-danger-500/10 p-4">
                <div className="text-sm text-danger-600">{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Organization name */}
              <div className="space-y-2">
                <Label htmlFor="organizationName" className="text-neutral-700 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  Nombre de tu negocio u organización
                </Label>
                <Input
                  id="organizationName"
                  type="text"
                  placeholder={`${userName}'s Organization`}
                  value={organizationName}
                  onChange={e => setOrganizationName(e.target.value)}
                  className="h-11 border-neutral-200"
                />
                <p className="text-xs text-neutral-500">
                  Podés cambiarlo después desde Configuración
                </p>
              </div>

              {/* Password — required */}
              <div className="space-y-4">
                <div className="flex items-center gap-1.5">
                  <KeyRound className="h-4 w-4 text-neutral-700" />
                  <span className="text-sm font-medium text-neutral-700">Establecer contraseña</span>
                </div>
                <p className="text-xs text-neutral-500 -mt-2">
                  Necesaria para poder iniciar sesión con email y contraseña, además de Google.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-neutral-700 text-sm">
                    Contraseña
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="h-11 border-neutral-200 pr-10"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-neutral-700 text-sm">
                    Confirmar contraseña
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Repetí la contraseña"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="h-11 border-neutral-200 pr-10"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Configurando...
                  </div>
                ) : (
                  <>
                    Entrar al dashboard
                    <ArrowRight className="ml-2 h-4 w-4 text-white" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
