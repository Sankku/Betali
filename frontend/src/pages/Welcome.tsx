import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowRight, 
  Box, 
  BarChart3, 
  ShieldCheck, 
  Zap, 
  Store, 
  TrendingUp, 
  Users, 
  Smartphone,
  CheckCircle2,
  Clock
} from 'lucide-react';

export default function Welcome() {
  const { user, loading } = useAuth();
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);

    try {
      // TODO: Reemplaza TU_ID_DE_FORMSPREE con el ID real que te den en formspree.io
      await fetch("https://formspree.io/f/xgongbqq", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: data,
      });
      
      setDemoSubmitted(true);
      setTimeout(() => {
        setShowDemoModal(false);
        setDemoSubmitted(false);
        form.reset();
      }, 3000);
    } catch (error) {
      console.error("Error enviando el formulario:", error);
      // Fallback para cerrar y limpiar si falla la conexión
      setDemoSubmitted(true);
      setTimeout(() => {
        setShowDemoModal(false);
        setDemoSubmitted(false);
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white relative overflow-hidden selection:bg-primary-500/30">
      {/* Dynamic Background Gradients */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary-600/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary-400/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="fixed top-[40%] left-[60%] w-[30%] h-[30%] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />

      {/* Navigation */}
      <nav className="relative z-20 w-full px-6 py-6 max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
           <Zap className="text-primary-400 w-8 h-8" />
           <span className="text-2xl font-bold tracking-tighter text-white">Betali</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-white/70 hover:text-white transition-colors font-medium">Entrar</Link>
          <Link to="/register" className="px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full text-white font-medium transition-all hover:scale-105 backdrop-blur-sm">Comenzar gratis</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-16 pb-24 md:pt-24 md:pb-32 flex flex-col items-center animate-fade-in">
        <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full border border-primary-500/30 bg-primary-500/10 text-primary-300 backdrop-blur-md animate-slide-in-bottom">
          <SparklesIcon size={16} className="animate-pulse" />
          <span className="text-sm font-semibold tracking-wide uppercase">El sistema operativo para tu negocio</span>
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-center mb-8 animate-slide-in-bottom leading-[1.1]" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
          Escala tus ventas, <br className="hidden md:block"/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-300 via-primary-400 to-purple-400">
            conecta tus sucursales
          </span>
        </h1>
        
        <p className="text-xl md:text-2xl text-white/60 text-center mb-12 max-w-3xl leading-relaxed animate-slide-in-bottom" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
          Betali centraliza tu inventario, empodera a tu equipo y te da el control total de tus operaciones en tiempo real. Diseñado para restaurantes y comercios que buscan crecer sin límites.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center items-center animate-slide-in-bottom" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
          <Link 
            to="/login" 
            className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-primary-500 text-white rounded-full font-bold text-lg overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_40px_-10px_var(--color-primary-500)] w-full sm:w-auto"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary-400 to-primary-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out" />
            <span className="relative">Acceder al sistema</span>
            <ArrowRight size={24} className="relative group-hover:translate-x-1.5 transition-transform" />
          </Link>
          <button 
            onClick={() => setShowDemoModal(true)}
            className="px-8 py-4 rounded-full font-bold text-lg text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-colors w-full sm:w-auto backdrop-blur-sm"
          >
            Agendar Demo
          </button>
        </div>

        {/* Value Proposition Grid */}
        <div className="mt-32 w-full max-w-6xl mx-auto">
          <div className="text-center mb-16 px-4">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Todo lo que necesitas para operar</h2>
            <p className="text-lg text-white/60 max-w-2xl mx-auto">Funcionalidades diseñadas por expertos en la industria para eliminar el caos operativo.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<Box />}
              title="Inventario Multi-Sucursal"
              description="Sincroniza el stock entre todas tus ubicaciones en tiempo real y evita quiebres."
              delay="100ms"
            />
            <FeatureCard 
              icon={<Store />}
              title="Puntos de Venta (POS)"
              description="Interfaz rápida e intuitiva para tus vendedores. Funciona incluso sin conexión."
              delay="200ms"
            />
            <FeatureCard 
              icon={<BarChart3 />}
              title="Reportes Avanzados"
              description="Analiza márgenes, productos más vendidos y rendimiento del personal con un clic."
              delay="300ms"
            />
            <FeatureCard 
              icon={<Users />}
              title="Gestión de Personal"
              description="Controla roles, permisos y turnos para mantener tu operación segura y eficiente."
              delay="400ms"
            />
            <FeatureCard 
              icon={<Smartphone />}
              title="Acceso Móvil"
              description="Supervisa tu negocio desde cualquier lugar. Tu oficina está en tu bolsillo."
              delay="500ms"
            />
            <FeatureCard 
              icon={<ShieldCheck />}
              title="Seguridad Bancaria"
              description="Backups automáticos y encriptación de extremo a extremo para proteger tus datos."
              delay="600ms"
            />
          </div>
        </div>

        {/* Benefits Section */}
        <div className="mt-32 w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold mb-8 leading-tight">Deja de perder tiempo en tareas manuales</h2>
              <ul className="space-y-6">
                <BenefitItem title="Automatización inteligente" desc="Las compras y alertas de stock bajo se generan solas." />
                <BenefitItem title="Cierre de caja en minutos" desc="Conciliación automática de efectivo, tarjetas y transferencias." />
                <BenefitItem title="Escalabilidad comprobada" desc="Abre nuevas sucursales con un par de clics y todo configurado." />
              </ul>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-primary-500/20 blur-[100px] rounded-full pointer-events-none" />
              <div className="relative bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-md">
                 <div className="space-y-4">
                   <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                     <div className="flex items-center gap-3">
                       <Clock className="text-primary-400" />
                       <span className="font-medium">Tiempo ahorrado/mes</span>
                     </div>
                     <span className="text-2xl font-bold text-primary-300">45 hrs</span>
                   </div>
                   <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                     <div className="flex items-center gap-3">
                       <TrendingUp className="text-green-400" />
                       <span className="font-medium">Aumento en ventas</span>
                     </div>
                     <span className="text-2xl font-bold text-green-300">+22%</span>
                   </div>
                 </div>
              </div>
            </div>
        </div>

        {/* CTA Bottom Section */}
        <div className="mt-32 w-full max-w-5xl mx-auto bg-gradient-to-br from-primary-900/40 to-neutral-900 border border-primary-500/20 p-12 rounded-3xl text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/20 blur-[80px] rounded-full pointer-events-none" />
          <h2 className="text-3xl md:text-5xl font-bold mb-6 relative z-10">¿Listo para transformar tu negocio?</h2>
          <p className="text-lg text-white/70 mb-8 max-w-2xl mx-auto relative z-10">
            Únete a los negocios que ya optimizan su operación con Betali. 
          </p>
          <Link 
            to="/register" 
            className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-neutral-950 rounded-full font-bold text-lg transition-transform hover:scale-105 relative z-10"
          >
            Empezar ahora gratis
          </Link>
        </div>

      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/10 mt-12 py-8 flex flex-col md:flex-row items-center justify-between px-6 max-w-7xl mx-auto text-white/40 text-sm z-20 relative">
         <p>© {new Date().getFullYear()} Betali. Todos los derechos reservados.</p>
         <div className="flex gap-4 mt-4 md:mt-0">
           <a href="#" className="hover:text-white transition-colors">Términos</a>
           <a href="#" className="hover:text-white transition-colors">Privacidad</a>
           <a href="#" className="hover:text-white transition-colors">Soporte</a>
         </div>
      </footer>

      {/* Demo Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-neutral-900 border border-white/10 rounded-3xl p-8 max-w-md w-full relative shadow-2xl animate-slide-in-bottom">
            <button 
              onClick={() => setShowDemoModal(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
            >
              ✕
            </button>
            <h3 className="text-2xl font-bold mb-2">Agendar una Demo</h3>
            <p className="text-white/60 mb-6">Déjanos tus datos y nos pondremos en contacto contigo para mostrarte Betali en acción.</p>
            
            {demoSubmitted ? (
              <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-xl flex items-center gap-3">
                <CheckCircle2 />
                <span>¡Gracias! Hemos recibido tu solicitud. Te contactaremos pronto.</span>
              </div>
            ) : (
              <form onSubmit={handleDemoSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Tu Nombre</label>
                  <input name="nombre" required type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all" placeholder="Juan Pérez" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Email de contacto</label>
                  <input name="email" required type="email" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all" placeholder="juan@ejemplo.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Tipo de Negocio</label>
                  <select name="tipo_negocio" defaultValue="" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all appearance-none cursor-pointer">
                    <option value="" disabled>Selecciona una opción</option>
                    <option value="restaurante" className="bg-neutral-900">Restaurante / Gastronomía</option>
                    <option value="retail" className="bg-neutral-900">Retail / Tienda física</option>
                    <option value="ecommerce" className="bg-neutral-900">E-commerce</option>
                    <option value="otro" className="bg-neutral-900">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Cuéntanos un poco sobre tu negocio (Opcional)</label>
                  <textarea name="comentarios" rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all resize-none" placeholder="Ej. Tenemos 3 sucursales y necesitamos controlar el stock y los proveedores..." />
                </div>
                <button type="submit" className="w-full py-4 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold text-lg mt-2 transition-colors">
                  Solicitar Demo
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SparklesIcon(props: React.SVGProps<SVGSVGElement> & { size?: number }) {
  const { size = 24, ...rest } = props;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
      <path d="M5 3v4"/>
      <path d="M19 17v4"/>
      <path d="M3 5h4"/>
      <path d="M17 19h4"/>
    </svg>
  )
}

function FeatureCard({ icon, title, description, delay }: { icon: React.ReactNode, title: string, description: string, delay: string }) {
  return (
    <div
      className="p-8 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-sm self-stretch flex flex-col items-start group transition-all duration-300 hover:border-primary-500/30 hover:bg-white/5 cursor-pointer"
      style={{ animationDelay: delay, animationFillMode: 'both' }}
    >
      <div className="p-4 rounded-xl bg-primary-500/10 text-primary-400 mb-6 group-hover:scale-110 group-hover:bg-primary-500/20 group-hover:text-primary-300 transition-all duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-white group-hover:text-primary-100 transition-colors">{title}</h3>
      <p className="text-white/50 leading-relaxed text-sm">{description}</p>
    </div>
  );
}

function BenefitItem({ title, desc }: { title: string, desc: string }) {
  return (
    <li className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400">
        <CheckCircle2 size={18} />
      </div>
      <div>
        <h4 className="font-bold text-lg mb-1">{title}</h4>
        <p className="text-white/60">{desc}</p>
      </div>
    </li>
  )
}
