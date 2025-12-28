import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Book,
  MessageCircle,
  Video,
  Mail,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/Dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useTranslation } from '@/contexts/LanguageContext';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQItem[] = [
  {
    category: 'Primeros Pasos',
    question: '¿Cómo creo mi primera orden de venta?',
    answer:
      'Para crear una orden de venta: 1) Ve a la sección "Ventas" en el menú. 2) Haz clic en "Nueva Venta". 3) Selecciona el cliente, almacén y productos. 4) El sistema validará automáticamente el stock disponible. 5) Haz clic en "Crear" para completar.',
  },
  {
    category: 'Primeros Pasos',
    question: '¿Cómo agrego productos a mi inventario?',
    answer:
      'Ve a "Productos" en el menú lateral, haz clic en "Agregar Producto" y completa la información básica: nombre, SKU, precio de costo y venta. Puedes agregar más detalles como categoría, código de barras y fechas de vencimiento.',
  },
  {
    category: 'Inventario',
    question: '¿Cómo funciona el sistema de reservas de stock?',
    answer:
      'Cuando una orden de venta pasa a estado "En Proceso", el sistema reserva automáticamente el stock. Esto previene sobreventa y garantiza que el stock esté disponible cuando se envíe el pedido. Al cancelar la orden, el stock se libera automáticamente.',
  },
  {
    category: 'Inventario',
    question: '¿Cómo registro la entrada de mercadería?',
    answer:
      'Puedes registrar entradas de dos formas: 1) Creando una Orden de Compra y marcándola como "Recibida" (crea movimientos automáticamente), o 2) Manualmente desde "Movimientos" > "Agregar Movimiento" > Tipo "Entrada".',
  },
  {
    category: 'Compras',
    question: '¿Cuál es el flujo de una orden de compra?',
    answer:
      'El flujo es: Borrador → Pendiente de Aprobación → Aprobado → Recibido. En estado "Borrador" puedes editar libremente. Al enviar para aprobación pasa a "Pendiente". Una vez aprobada, cuando recibes la mercadería y marcas como "Recibido", el sistema crea automáticamente los movimientos de entrada al almacén.',
  },
  {
    category: 'Organizaciones',
    question: '¿Puedo tener múltiples organizaciones?',
    answer:
      'Sí, un usuario puede pertenecer a múltiples organizaciones. Usa el selector de organización en la parte superior derecha para cambiar entre ellas. Cada organización tiene sus propios datos completamente aislados.',
  },
  {
    category: 'Usuarios y Permisos',
    question: '¿Qué roles existen y qué puede hacer cada uno?',
    answer:
      'Existen 5 roles: Owner (control total), Admin (gestión de usuarios y datos), Manager (gestión de empleados), Employee (operaciones estándar) y Viewer (solo lectura). El Owner es el único que puede eliminar la organización y gestionar billing.',
  },
  {
    category: 'Multi-Almacén',
    question: '¿Puedo gestionar múltiples almacenes?',
    answer:
      'Sí, puedes crear todos los almacenes que necesites. Cada almacén mantiene su propio stock independiente. Al crear órdenes o movimientos, seleccionas de qué almacén se originan. También puedes hacer transferencias entre almacenes.',
  },
  {
    category: 'Reportes',
    question: '¿Cómo exporto mis datos?',
    answer:
      'Actualmente puedes ver estadísticas en el Dashboard. La funcionalidad de exportación a Excel/CSV estará disponible próximamente. Mientras tanto, puedes copiar los datos directamente de las tablas.',
  },
  {
    category: 'Soporte',
    question: '¿Cómo obtengo ayuda si tengo un problema?',
    answer:
      'Puedes: 1) Revisar esta página de ayuda. 2) Usar los tooltips (?) en los formularios. 3) Contactarnos por email. 4) Si eres cliente premium, tienes soporte prioritario.',
  },
];

export default function HelpPage() {
  const { t } = useTranslation();
  const { startOnboarding } = useOnboarding();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const filteredFAQs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = Array.from(new Set(faqs.map((faq) => faq.category)));

  return (
    <DashboardLayout>
      <Helmet>
        <title>Ayuda y Soporte - Betali</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Centro de Ayuda</h1>
          <p className="text-neutral-600 mt-1">
            Encuentra respuestas rápidas y recursos útiles
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={startOnboarding}>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Book className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-1 text-neutral-900">Tour Guiado</h3>
              <p className="text-sm text-neutral-600">Recorre las funcionalidades principales</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <HelpCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold mb-1 text-neutral-900">FAQ</h3>
              <p className="text-sm text-neutral-600">Preguntas frecuentes</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Video className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-1 text-neutral-900">Video Tutoriales</h3>
              <p className="text-sm text-neutral-600">Próximamente</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="font-semibold mb-1 text-neutral-900">Contacto</h3>
              <p className="text-sm text-neutral-600">Habla con soporte</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-6">
            <div className="relative">
              <HelpCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Busca en las preguntas frecuentes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* FAQs by Category */}
        {categories.map((category) => {
          const categoryFAQs = filteredFAQs.filter((faq) => faq.category === category);
          if (categoryFAQs.length === 0) return null;

          return (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-xl text-neutral-900">{category}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categoryFAQs.map((faq, index) => {
                    const globalIndex = faqs.indexOf(faq);
                    const isExpanded = expandedFAQ === globalIndex;

                    return (
                      <div key={globalIndex} className="border rounded-lg">
                        <button
                          onClick={() =>
                            setExpandedFAQ(isExpanded ? null : globalIndex)
                          }
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                          <span className="font-medium text-left text-neutral-900">{faq.question}</span>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                          )}
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-3 text-neutral-600">
                            <p>{faq.answer}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Contact Support */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-neutral-900">
              <Mail className="h-5 w-5" />
              ¿No encuentras lo que buscas?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-neutral-600 mb-4">
              Nuestro equipo está aquí para ayudarte. Contáctanos y responderemos lo antes posible.
            </p>
            <Button>
              <Mail className="h-4 w-4 mr-2" />
              Contactar Soporte
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
