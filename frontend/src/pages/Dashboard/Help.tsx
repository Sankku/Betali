import React, { useState } from 'react';
import { toast } from '@/lib/toast';
import { Helmet } from 'react-helmet-async';
import {
  HelpCircle,
  ChevronDown,
  Book,
  MessageCircle,
  Video,
  Box,
  ShoppingCart,
  TrendingUp,
  Users,
  Search,
  ArrowRight,
  Database,
  Building2,
  PackageSearch
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/Dashboard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOnboarding } from '@/contexts/OnboardingContext';

interface CapabilityItem {
  title: string;
  icon: React.ReactNode;
  description: string;
  features: string[];
  color: string;
}

const systemCapabilities: CapabilityItem[] = [
  {
    title: 'Ventas y Clientes',
    icon: <TrendingUp className="w-6 h-6" />,
    description: 'Gestión integral del ciclo de ventas, desde la orden hasta la entrega.',
    color: 'from-blue-500 to-indigo-600',
    features: [
      'Creación de órdenes de venta con validación de stock en tiempo real',
      'Flujo de estados: Borrador → En Proceso → Completado / Cancelado',
      'Reserva automática de inventario al procesar ventas de los almacenes asociados',
      'Base de datos de clientes con historial y control de datos fiscales'
    ]
  },
  {
    title: 'Compras y Proveedores',
    icon: <ShoppingCart className="w-6 h-6" />,
    description: 'Reabastecimiento de inventario y control de costos de adquisición.',
    color: 'from-emerald-500 to-teal-600',
    features: [
      'Generación de órdenes de compra a proveedores',
      'Recepción de mercancía que impacta automáticamente en tu inventario',
      'Flujo de aprobación para compras',
      'Catálogo de proveedores con información de contacto y términos'
    ]
  },
  {
    title: 'Inventario y Productos',
    icon: <PackageSearch className="w-6 h-6" />,
    description: 'El núcleo de tu negocio. Control exacto de lo que vendes y reduces.',
    color: 'from-purple-500 to-fuchsia-600',
    features: [
      'Catálogo de productos (Insumos, Finales o Servicios)',
      'Gestión de fórmulas/recetas (Productos finales compuestos por insumos)',
      'Control de costos y múltiples márgenes de precios',
      'Importación masiva mediante archivos CSV con pre-validación inteligente'
    ]
  },
  {
    title: 'Almacenes y Movimientos',
    icon: <Box className="w-6 h-6" />,
    description: 'Trazabilidad total de la ubicación y estado físico de tu mercancía.',
    color: 'from-orange-500 to-red-600',
    features: [
      'Esquema multi-almacén (bodegas físicas o sucursales)',
      'Inventarios y ajustes manuales (entradas, salidas, pérdidas)',
      'Transferencias de stock entre distintos almacenes',
      'Registro histórico con trazabilidad de movimientos mediante auditoría'
    ]
  },
  {
    title: 'Organización e Impuestos',
    icon: <Building2 className="w-6 h-6" />,
    description: 'Estructuración financiera y organizativa.',
    color: 'from-pink-500 to-rose-600',
    features: [
      'Configuración de múltiples niveles de impuestos (IVA, etc)',
      'Gestión de listas de precios flexibles',
      'Definición de moneda (ej: UYU, USD, ARS)',
      'Múltiples unidades de negocio para separación de contabilidad'
    ]
  },
  {
    title: 'Usuarios y Permisos',
    icon: <Users className="w-6 h-6" />,
    description: 'Seguridad y control de accesos para tu equipo de trabajo.',
    color: 'from-amber-500 to-orange-600',
    features: [
      'Roles jerárquicos: Owner, Admin, Manager, Employee, Viewer',
      'Invitación y revocación segura de acceso a trabajadores',
      'Aislamiento de datos por empresa, nadie puede ver tus transacciones'
    ]
  }
];

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQItem[] = [
  {
    category: 'Primeros Pasos',
    question: '¿Cómo creo mi primera orden de venta?',
    answer: 'Para crear una orden de venta: 1) Ve a "Ventas". 2) Haz clic en "Nueva Venta". 3) Selecciona el cliente, almacén y productos. 4) El sistema validará automáticamente el stock disponible. 5) Haz clic en "Crear".',
  },
  {
    category: 'Primeros Pasos',
    question: '¿Cómo agrego productos a mi inventario?',
    answer: 'Ve a "Productos", haz clic en "Agregar Producto" y completa nombre, SKU, precio de costo y venta. Puedes importar cientos de productos de una vez usando la función "Importar CSV".',
  },
  {
    category: 'Inventario',
    question: '¿Cómo funciona el sistema de reservas de stock?',
    answer: 'Cuando una orden de venta pasa a estado "En Proceso", el sistema reserva preventivamente el stock. Esto previene sobreventa y garantiza que tu stock esté resguardado hasta que entregues. Al cancelar la venta, el stock se libera.',
  },
  {
    category: 'Soporte',
    question: '¿Cómo obtengo ayuda si tengo un problema?',
    answer: 'Puedes revisar esta sección de capacidades, usar los tooltips (?) en los formularios del sistema que te brindan tips contextuales, o ponerte en contacto directamente por correo.',
  },
];

export default function HelpPage() {
  const { startOnboarding } = useOnboarding();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'capacities' | 'faq'>('capacities');

  const filteredFAQs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <Helmet>
        <title>Centro de Ayuda Premium - Betali</title>
      </Helmet>

      <div className="space-y-8 pb-12">
        {/* Premium Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-950 p-8 sm:p-12 text-white shadow-xl">
          <div className="absolute top-0 right-0 -m-32 h-[400px] w-[400px] rounded-full bg-white/10 dark:bg-indigo-500/20 blur-3xl" />
          <div className="absolute bottom-0 left-0 -m-32 h-[400px] w-[400px] rounded-full bg-white/10 dark:bg-purple-500/20 blur-3xl" />

          <div className="relative z-10 max-w-2xl">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 text-white">
              Domina <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-purple-200 dark:from-indigo-400 dark:to-purple-400">Betali</span>
            </h1>
            <p className="text-lg text-white/80 dark:text-neutral-300 mb-8 leading-relaxed">
              Descubre todo el potencial de tu plataforma. Conoce módulo por módulo cómo está estructurado el sistema de gestión para acelerar el crecimiento de tu negocio.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button
                onClick={startOnboarding}
                size="lg"
                variant="default"
                className="bg-white text-indigo-700 hover:bg-white/90 shadow-lg font-medium transition-all dark:bg-primary dark:text-white dark:hover:bg-primary/90"
              >
                <Book className="w-5 h-5 mr-2" />
                Iniciar Tour Guiado
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-white/40 text-white hover:bg-white/10 hover:text-white rounded-xl"
                onClick={() => document.getElementById('search-help')?.focus()}
              >
                <Search className="w-5 h-5 mr-2" />
                Buscar Ayuda
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Contact & Resources */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm shadow-blue-900/5 hover:shadow-xl hover:shadow-blue-900/10 transition-all duration-300 overflow-hidden group rounded-2xl bg-card">
            <CardContent className="p-0 border-l-4 border-blue-500 h-full">
              <div className="p-6 h-full flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-700 transition-colors duration-300">
                    <Video className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">Tutoriales en Video</h3>
                  <p className="text-muted-foreground text-sm">Aprende paso a paso con nuestros ejemplos visuales interactivos. (Próximamente)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-sm shadow-purple-900/5 hover:shadow-xl hover:shadow-purple-900/10 transition-all duration-300 overflow-hidden group rounded-2xl cursor-pointer bg-card" onClick={() => setActiveTab('faq')}>
            <CardContent className="p-0 border-l-4 border-purple-500 h-full">
              <div className="p-6 h-full flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 bg-purple-600 text-white rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-700 transition-colors duration-300">
                    <HelpCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">Preguntas Frecuentes</h3>
                  <p className="text-muted-foreground text-sm">Respuestas instantáneas a las dudas habituales de nuestra comunidad.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="border-none shadow-sm shadow-amber-900/5 hover:shadow-xl hover:shadow-amber-900/10 transition-all duration-300 overflow-hidden group rounded-2xl cursor-pointer bg-card"
            onClick={() => {
              navigator.clipboard.writeText('betali.business@gmail.com');
              toast.success('Email betali.business@gmail.com copiado al portapapeles');
            }}
          >
            <CardContent className="p-0 border-l-4 border-amber-500 h-full">
              <div className="p-6 h-full flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 bg-amber-600 text-white rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-700 transition-colors duration-300">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">Soporte Humano</h3>
                  <p className="text-muted-foreground text-sm">¿Tu duda es muy específica? Contáctanos y nuestro equipo te ayudará rápido.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-200">
          <button 
            className={`pb-4 px-6 text-sm font-bold transition-all relative ${activeTab === 'capacities' ? 'text-indigo-700' : 'text-neutral-600 hover:text-neutral-900'}`}
            onClick={() => setActiveTab('capacities')}
          >
            Capacidades del Sistema
            {activeTab === 'capacities' && <span className="absolute bottom-0 left-0 w-full h-1 bg-indigo-700 rounded-t-full" />}
          </button>
          <button 
            className={`pb-4 px-6 text-sm font-bold transition-all relative ${activeTab === 'faq' ? 'text-indigo-700' : 'text-neutral-600 hover:text-neutral-900'}`}
            onClick={() => setActiveTab('faq')}
          >
            Preguntas Frecuentes
            {activeTab === 'faq' && <span className="absolute bottom-0 left-0 w-full h-1 bg-indigo-700 rounded-t-full" />}
          </button>
        </div>

        {/* Tab Content: System Capacities */}
        {activeTab === 'capacities' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground">Módulo por Módulo</h2>
              <p className="text-muted-foreground">Explora de qué es capaz cada sección de nuestra plataforma para maximizar tu eficiencia.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {systemCapabilities.map((cap, idx) => (
                <div key={idx} className="bg-card rounded-3xl p-6 shadow-sm border border-border hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${cap.color} flex items-center justify-center text-white mb-6 shadow-lg`}>
                    {cap.icon}
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{cap.title}</h3>
                  <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                    {cap.description}
                  </p>
                  <ul className="space-y-3">
                    {cap.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-start text-sm text-foreground/80">
                        <ArrowRight className="w-4 h-4 text-indigo-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="leading-tight">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Content: FAQ */}
        {activeTab === 'faq' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Search */}
            <div className="max-w-2xl">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="search-help"
                  placeholder="Escribe tu duda o palabra clave..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 py-6 rounded-2xl border-border bg-card shadow-sm focus-visible:ring-primary text-lg"
                />
              </div>
            </div>

            {/* FAQs List */}
            <div className="space-y-4 max-w-4xl">
              {filteredFAQs.length > 0 ? (
                filteredFAQs.map((faq, index) => {
                  const isExpanded = expandedFAQ === index;
                  return (
                    <div 
                      key={index} 
                      className={`border rounded-2xl overflow-hidden transition-all duration-300 bg-card ${isExpanded ? 'border-primary shadow-md ring-1 ring-primary/10' : 'border-border hover:border-border/80'}`}
                    >
                      <button
                        onClick={() => setExpandedFAQ(isExpanded ? null : index)}
                        className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-primary uppercase tracking-wider mb-1">{faq.category}</span>
                          <span className={`text-base font-bold ${isExpanded ? 'text-primary' : 'text-foreground'}`}>
                            {faq.question}
                          </span>
                        </div>
                        <div className={`ml-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isExpanded ? 'bg-primary/10' : 'bg-muted'}`}>
                          <ChevronDown className={`h-5 w-5 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-primary' : 'text-muted-foreground'}`} />
                        </div>
                      </button>
                      
                      <div className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-96 pb-6 opacity-100' : 'max-h-0 pb-0 opacity-0'}`}>
                        <p className="text-muted-foreground leading-relaxed border-t border-border pt-4">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 bg-card rounded-2xl border border-border">
                  <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-foreground">No encontramos resultados</h3>
                  <p className="text-muted-foreground">Intenta con otras palabras o contacta a soporte.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
