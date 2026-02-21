import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { BetaliLogo } from '../components/ui/BetaliLogo';

const LAST_UPDATED = '21 de febrero de 2026';
const CONTACT_EMAIL = 'betali.business@gmail.com';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-neutral-900 mb-3 pb-2 border-b border-neutral-100">
        {title}
      </h2>
      <div className="space-y-3 text-sm text-neutral-700 leading-relaxed">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="hover:opacity-80 transition-opacity">
            <BetaliLogo variant="full" size="sm" />
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-primary-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Política de Privacidad</h1>
          <p className="text-sm text-neutral-500">Última actualización: {LAST_UPDATED}</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-sm text-amber-800">
          <strong>Marco legal:</strong> Esta política se rige por la{' '}
          <strong>Ley 25.326 de Protección de los Datos Personales</strong> de la República Argentina y sus normas reglamentarias dictadas por la Agencia de Acceso a la Información Pública (AAIP).
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-8">

          <Section title="1. Responsable del tratamiento">
            <p>
              Betali es responsable del tratamiento de los datos personales recabados a través de la Plataforma. Para cualquier consulta relacionada con el tratamiento de sus datos, puede contactarnos en:{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary-600 hover:underline font-medium">
                {CONTACT_EMAIL}
              </a>
            </p>
          </Section>

          <Section title="2. Datos que recopilamos">
            <p>Recopilamos los siguientes tipos de datos personales:</p>
            <div className="space-y-4 mt-2">
              <div className="rounded-lg border border-neutral-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-semibold text-neutral-700 w-1/3">Categoría</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-neutral-700 w-1/3">Datos</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-neutral-700">Finalidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    <tr>
                      <td className="px-4 py-3 text-neutral-700 font-medium">Datos de cuenta</td>
                      <td className="px-4 py-3 text-neutral-600">Nombre, email, contraseña (hasheada)</td>
                      <td className="px-4 py-3 text-neutral-600">Autenticación y gestión de acceso</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-neutral-700 font-medium">Datos de organización</td>
                      <td className="px-4 py-3 text-neutral-600">Nombre de empresa, sector, slug</td>
                      <td className="px-4 py-3 text-neutral-600">Identificación y configuración del tenant</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-neutral-700 font-medium">Datos de uso</td>
                      <td className="px-4 py-3 text-neutral-600">Logs de actividad, IP, dispositivo</td>
                      <td className="px-4 py-3 text-neutral-600">Seguridad, soporte y mejora del servicio</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-neutral-700 font-medium">Datos de facturación</td>
                      <td className="px-4 py-3 text-neutral-600">Historial de pagos (no almacenamos datos de tarjetas)</td>
                      <td className="px-4 py-3 text-neutral-600">Gestión de suscripciones</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-neutral-700 font-medium">Datos de negocio</td>
                      <td className="px-4 py-3 text-neutral-600">Productos, clientes, proveedores, stock</td>
                      <td className="px-4 py-3 text-neutral-600">Prestación del servicio contratado</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Section>

          <Section title="3. Finalidad y base legal del tratamiento">
            <p>Tratamos sus datos con las siguientes bases legales:</p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>
                <strong>Ejecución del contrato:</strong> Para prestar el servicio contratado (gestión del inventario, organizaciones, usuarios).
              </li>
              <li>
                <strong>Consentimiento:</strong> Para el envío de comunicaciones de marketing o actualizaciones del producto, que pueden revocarse en cualquier momento.
              </li>
              <li>
                <strong>Interés legítimo:</strong> Para la seguridad de la Plataforma, prevención del fraude y mejora del servicio.
              </li>
              <li>
                <strong>Obligación legal:</strong> Cuando así lo exija la normativa argentina aplicable.
              </li>
            </ul>
          </Section>

          <Section title="4. Almacenamiento y seguridad">
            <p>
              Los datos son almacenados en servidores seguros provistos por <strong>Supabase</strong> (infraestructura sobre AWS), con cifrado en tránsito (TLS) y en reposo. Las contraseñas se almacenan exclusivamente en formato hasheado mediante bcrypt y nunca en texto plano.
            </p>
            <p>
              Implementamos controles de acceso por roles, aislamiento de datos por organización (multi-tenant) y auditorías de seguridad periódicas para proteger su información.
            </p>
          </Section>

          <Section title="5. Transferencia internacional de datos">
            <p>
              Dado que utilizamos proveedores de infraestructura (Supabase/AWS) con servidores que pueden estar ubicados fuera de Argentina, sus datos pueden ser transferidos internacionalmente. Estas transferencias se realizan con las salvaguardas adecuadas conforme al artículo 12 de la Ley 25.326 y las disposiciones de la AAIP.
            </p>
          </Section>

          <Section title="6. Compartición de datos con terceros">
            <p>No vendemos ni alquilamos sus datos personales a terceros. Podemos compartirlos únicamente con:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong>Proveedores de servicios:</strong> Supabase (base de datos y autenticación), procesadores de pago para gestión de suscripciones.</li>
              <li><strong>Autoridades competentes:</strong> Cuando así lo exija una orden judicial o normativa legal aplicable.</li>
              <li><strong>Sucesores comerciales:</strong> En caso de fusión, adquisición o venta de activos, con notificación previa a los usuarios.</li>
            </ul>
          </Section>

          <Section title="7. Retención de datos">
            <p>Conservamos sus datos durante el tiempo que su cuenta esté activa y, tras la cancelación:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Datos de cuenta: 30 días tras la cancelación, luego eliminados.</li>
              <li>Datos de facturación: 5 años por obligación tributaria argentina.</li>
              <li>Logs de seguridad: 1 año por razones de seguridad.</li>
            </ul>
          </Section>

          <Section title="8. Sus derechos (Ley 25.326)">
            <p>
              Conforme a la Ley 25.326 de Protección de los Datos Personales, usted tiene derecho a:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong>Acceso:</strong> Conocer qué datos personales suyos tratamos.</li>
              <li><strong>Rectificación:</strong> Corregir datos inexactos o incompletos.</li>
              <li><strong>Supresión:</strong> Solicitar la eliminación de sus datos cuando no sean necesarios para la finalidad para la que fueron recabados.</li>
              <li><strong>Confidencialidad:</strong> Solicitar que sus datos no sean cedidos a terceros no autorizados.</li>
            </ul>
            <p>
              Para ejercer estos derechos, envíe un email a{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary-600 hover:underline font-medium">
                {CONTACT_EMAIL}
              </a>{' '}
              indicando su nombre, email de registro y el derecho que desea ejercer. Responderemos en un plazo máximo de 5 días hábiles conforme a la normativa vigente.
            </p>
            <p>
              Si considera que el tratamiento de sus datos infringe la normativa, tiene derecho a presentar una reclamación ante la{' '}
              <strong>Agencia de Acceso a la Información Pública (AAIP)</strong> en{' '}
              <a href="https://www.argentina.gob.ar/aaip" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                www.argentina.gob.ar/aaip
              </a>.
            </p>
          </Section>

          <Section title="9. Cookies y tecnologías de seguimiento">
            <p>
              Betali utiliza cookies de sesión estrictamente necesarias para el funcionamiento de la autenticación. No utilizamos cookies de rastreo publicitario ni compartimos datos de navegación con redes de publicidad.
            </p>
          </Section>

          <Section title="10. Menores de edad">
            <p>
              La Plataforma no está dirigida a menores de 18 años. No recopilamos conscientemente datos personales de menores. Si toma conocimiento de que un menor ha proporcionado datos sin autorización parental, contáctenos para proceder a su eliminación.
            </p>
          </Section>

          <Section title="11. Cambios a esta política">
            <p>
              Podemos actualizar esta Política de Privacidad periódicamente. Los cambios sustanciales serán notificados por email con al menos 15 días de anticipación. La fecha de "última actualización" al inicio del documento indica cuándo fue revisada por última vez.
            </p>
          </Section>

          <Section title="12. Contacto">
            <p>
              Para cualquier consulta, solicitud o reclamo relacionado con el tratamiento de sus datos personales:
            </p>
            <p>
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary-600 hover:underline font-medium text-base">
                {CONTACT_EMAIL}
              </a>
            </p>
          </Section>
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/register"
            className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-primary-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al registro
          </Link>
        </div>
      </main>
    </div>
  );
}
