import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Box, BarChart3, ShieldCheck, Zap } from 'lucide-react';

export default function Welcome() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-950 text-white relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary-400/20 rounded-full blur-[120px] pointer-events-none" />
      
      <main className="relative z-10 w-full max-w-6xl mx-auto px-6 py-12 md:py-24 flex flex-col items-center animate-fade-in">
        <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md animate-slide-in-bottom">
          <Zap size={18} className="text-primary-300" />
          <span className="text-sm text-white font-semibold tracking-wide uppercase">Gestión inteligente de inventario</span>
        </div>

        <h1 className="text-white text-5xl md:text-7xl font-extrabold tracking-tight text-center mb-8 animate-slide-in-bottom" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
          El futuro de tu{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-300 to-primary-500">
            negocio
          </span>
        </h1>
        
        <p className="text-xl md:text-2xl text-white/70 text-center mb-12 max-w-3xl leading-relaxed animate-slide-in-bottom" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
          Betali es la plataforma definitiva para la gestión de inventario, ventas y sucursales. 
          Optimiza tus procesos y toma decisiones basadas en datos reales.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 justify-center w-full animate-slide-in-bottom" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
          <Link 
            to="/login" 
            className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-primary-600 text-white rounded-2xl font-bold text-lg overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_40px_-10px_var(--color-primary-500)]"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            <span className="relative">Acceder al sistema</span>
            <ArrowRight size={24} className="relative text-white group-hover:translate-x-1.5 transition-transform" />
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 w-full animate-slide-in-bottom" style={{ animationDelay: '500ms', animationFillMode: 'both' }}>
          <FeatureCard 
            icon={<Box className="text-primary-500" size={36} />}
            title="Inventario Centralizado"
            description="Control total sobre tus productos, almacenes y movimientos en tiempo real desde una única plataforma."
            delay="600ms"
          />
          <FeatureCard 
            icon={<BarChart3 className="text-primary-500" size={36} />}
            title="Analíticas Detalladas"
            description="Métricas precisas y reportes avanzados para tomar las decisiones más estratégicas para tu crecimiento."
            delay="700ms"
          />
          <FeatureCard 
            icon={<ShieldCheck className="text-primary-500" size={36} />}
            title="Máxima Seguridad"
            description="Tus datos y operaciones protegidos con los más altos estándares de seguridad de la industria."
            delay="800ms"
          />
        </div>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, description, delay }: { icon: React.ReactNode, title: string, description: string, delay: string }) {
  return (
    <div
      className="p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md hover-lift flex flex-col items-center text-center group transition-all duration-300 hover:border-primary-400/40 hover:bg-primary-400/10 cursor-pointer"
      style={{ animationDelay: delay, animationFillMode: 'both' }}
    >
      <div className="p-5 rounded-2xl bg-primary-400/15 mb-6 group-hover:scale-110 group-hover:bg-primary-400/25 transition-all duration-300">
        {icon}
      </div>
      <h3 className="text-2xl font-bold mb-4 text-white">{title}</h3>
      <p className="text-white/60 leading-relaxed">{description}</p>
    </div>
  );
}
