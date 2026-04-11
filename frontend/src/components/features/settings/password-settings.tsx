import { useState } from 'react';
import { KeyRound, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';

export function PasswordSettings() {
  const { user, signIn } = useAuth();

  const isOAuthOnly = !user?.identities?.some(i => i.provider === 'email');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    try {
      // For email users: verify current password first
      if (!isOAuthOnly) {
        if (!currentPassword) {
          setError('Ingresá tu contraseña actual');
          setLoading(false);
          return;
        }
        const { error: signInError } = await signIn(user!.email!, currentPassword);
        if (signInError) {
          setError('La contraseña actual es incorrecta');
          setLoading(false);
          return;
        }
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw new Error(updateError.message);

      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          {isOAuthOnly ? 'Establecer contraseña' : 'Cambiar contraseña'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isOAuthOnly && (
          <p className="text-sm text-neutral-600 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            Tu cuenta usa Google para iniciar sesión. Podés establecer una contraseña para
            también poder ingresar con email y contraseña.
          </p>
        )}

        {success && (
          <div className="mb-4 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 p-3 rounded-lg">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            {isOAuthOnly
              ? 'Contraseña establecida correctamente. Ya podés iniciar sesión con email y contraseña.'
              : 'Contraseña actualizada correctamente.'}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-md border border-danger-500/30 bg-danger-500/10 p-3">
            <p className="text-sm text-danger-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current password — only for email users */}
          {!isOAuthOnly && (
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-sm text-neutral-700">
                Contraseña actual
              </Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Tu contraseña actual"
                  className="h-10 border-neutral-200 pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
                  onClick={() => setShowCurrent(!showCurrent)}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-sm text-neutral-700">
              {isOAuthOnly ? 'Nueva contraseña' : 'Nueva contraseña'}
            </Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="h-10 border-neutral-200 pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
                onClick={() => setShowNew(!showNew)}
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmNewPassword" className="text-sm text-neutral-700">
              Confirmar nueva contraseña
            </Label>
            <div className="relative">
              <Input
                id="confirmNewPassword"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repetí la contraseña"
                className="h-10 border-neutral-200 pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="bg-primary-600 hover:bg-primary-700 text-white"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Guardando...
              </div>
            ) : (
              isOAuthOnly ? 'Establecer contraseña' : 'Cambiar contraseña'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
