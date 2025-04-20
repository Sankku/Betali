import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, Package } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Checkbox } from "../../components/ui/checkbox";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const navigate = useNavigate();
  const query = useQuery();
  const { signIn, user } = useAuth();

  // Redirigir si el usuario ya está autenticado
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  // Verificar si hay un mensaje en la URL (por ejemplo, después de registrarse)
  useEffect(() => {
    const messageParam = query.get("message");
    if (messageParam) {
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

      // La redirección se maneja en el useEffect que observa el usuario
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
      {/* Círculos decorativos estilo macOS */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-250px] left-[-100px] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-green-200/20 to-green-300/20 blur-3xl" />
        <div className="absolute bottom-[-350px] right-[-100px] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-blue-200/20 to-blue-300/20 blur-3xl" />
      </div>

      <div className="w-full max-w-md z-10">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-md mb-4">
            <div className="rounded-full bg-gradient-to-br from-green-400 to-green-600 p-3">
              <Package className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">AgroPanel</h1>
          <p className="text-gray-500 mt-1">Gestión de productos agrícolas</p>
        </div>

        {/* Mensaje de éxito (por ejemplo, después de registrarse) */}
        {message && (
          <div className="mb-4 rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <div className="text-sm text-green-700">{message}</div>
              </div>
            </div>
          </div>
        )}

        {/* Tarjeta de inicio de sesión */}
        <Card className="bg-white/80 backdrop-blur-xl border border-gray-200/50 shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-semibold text-center">
              Iniciar Sesión
            </CardTitle>
            <CardDescription className="text-center">
              Ingresa tus credenciales para acceder al panel
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-1 text-sm text-red-700">{error}</div>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 bg-gray-50/50 border-gray-200 focus-visible:ring-green-500"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-gray-500 hover:text-green-600 transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 bg-gray-50/50 border-gray-200 pr-10 focus-visible:ring-green-500"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={rememberMe}
                  onCheckedChange={(checked) =>
                    setRememberMe(checked as boolean)
                  }
                  id="remember"
                  className="data-[checked=true]:bg-green-600 data-[checked=true]:border-green-600"
                />
                <label
                  htmlFor="remember"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  onClick={() => setRememberMe(!rememberMe)}
                >
                  Recordarme
                </label>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
              >
                {loading ? "Cargando..." : "Iniciar Sesión"}{" "}
                {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 border-t border-gray-100 bg-gray-50/50 rounded-b-lg pt-6">
            <div className="text-center text-sm">
              ¿No tienes una cuenta?{" "}
              <Link
                to="/register"
                className="font-medium text-green-600 hover:text-green-700"
              >
                Crear cuenta
              </Link>
            </div>
            <div className="text-center text-xs text-gray-500">
              Al iniciar sesión, aceptas nuestros{" "}
              <Link to="/terms" className="underline hover:text-gray-700">
                Términos de servicio
              </Link>{" "}
              y{" "}
              <Link to="/privacy" className="underline hover:text-gray-700">
                Política de privacidad
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
