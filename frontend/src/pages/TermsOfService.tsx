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

export default function TermsOfService() {
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
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Términos y Condiciones</h1>
          <p className="text-sm text-neutral-500">Última actualización: {LAST_UPDATED}</p>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-8">

          <Section title="1. Aceptación de los términos">
            <p>
              Al acceder o utilizar Betali ("la Plataforma"), usted acepta quedar vinculado por estos Términos y Condiciones ("Términos"). Si no está de acuerdo con alguna parte de estos Términos, no podrá acceder a la Plataforma.
            </p>
            <p>
              Estos Términos se aplican a todos los usuarios, incluidos visitantes, usuarios registrados y clientes que utilizan los servicios de Betali.
            </p>
          </Section>

          <Section title="2. Descripción del servicio">
            <p>
              Betali es una plataforma SaaS (Software como Servicio) de gestión de inventario y negocios diseñada para empresas de todo tipo. Permite a las organizaciones gestionar productos, almacenes, movimientos de stock, órdenes de venta y compra, proveedores, clientes y más, bajo un modelo multi-tenant con aislamiento de datos por organización.
            </p>
            <p>
              El servicio se presta a través de internet y puede incluir funcionalidades premium sujetas a planes de suscripción.
            </p>
          </Section>

          <Section title="3. Registro y cuentas de usuario">
            <p>
              Para utilizar la Plataforma debe crear una cuenta proporcionando información veraz, completa y actualizada. Usted es responsable de:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Mantener la confidencialidad de sus credenciales de acceso.</li>
              <li>Todas las actividades que ocurran bajo su cuenta.</li>
              <li>Notificar inmediatamente a Betali ante cualquier uso no autorizado de su cuenta a <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary-600 hover:underline">{CONTACT_EMAIL}</a>.</li>
            </ul>
            <p>
              Betali no será responsable de pérdidas derivadas del uso no autorizado de su cuenta cuando dicho uso sea consecuencia de la negligencia del usuario en la custodia de sus credenciales.
            </p>
          </Section>

          <Section title="4. Organizaciones y multi-tenancy">
            <p>
              Al registrarse, el usuario crea automáticamente una organización de la que es titular ("Owner"). Cada organización opera como un espacio de trabajo aislado. El Owner puede invitar a otros usuarios con diferentes roles (Administrador, Manager, Empleado).
            </p>
            <p>
              El Owner de la organización es responsable de las actividades de todos los usuarios bajo su organización y de asegurar que el uso de la Plataforma cumpla con estos Términos.
            </p>
          </Section>

          <Section title="5. Uso aceptable">
            <p>Usted acepta no utilizar la Plataforma para:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Actividades ilegales o que violen derechos de terceros.</li>
              <li>Transmitir contenido malicioso, difamatorio o que infrinja derechos de propiedad intelectual.</li>
              <li>Intentar acceder sin autorización a sistemas o datos de otros usuarios.</li>
              <li>Realizar ingeniería inversa, descompilar o intentar extraer el código fuente de la Plataforma.</li>
              <li>Sobrecargar o interferir con la infraestructura de la Plataforma mediante ataques automatizados o scraping masivo.</li>
            </ul>
            <p>
              Betali se reserva el derecho de suspender o cancelar cuentas que violen estas condiciones sin previo aviso.
            </p>
          </Section>

          <Section title="6. Planes y pagos">
            <p>
              Betali ofrece planes de suscripción con diferentes niveles de funcionalidad. Los precios y características de cada plan están disponibles en la sección de Precios de la Plataforma.
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Los pagos son procesados de forma segura a través de proveedores de pago externos.</li>
              <li>Las suscripciones se renuevan automáticamente salvo que el usuario las cancele antes del período de facturación.</li>
              <li>No se realizan reembolsos por períodos ya facturados, salvo en casos establecidos por la legislación argentina aplicable.</li>
              <li>Betali se reserva el derecho de modificar los precios con un preaviso de 30 días.</li>
            </ul>
          </Section>

          <Section title="7. Propiedad intelectual">
            <p>
              La Plataforma, incluyendo su diseño, código, marcas, logotipos y contenido, es propiedad exclusiva de Betali y está protegida por las leyes de propiedad intelectual de la República Argentina y tratados internacionales aplicables.
            </p>
            <p>
              El usuario conserva todos los derechos sobre los datos que carga en la Plataforma. Betali no reclama propiedad sobre el contenido del usuario.
            </p>
          </Section>

          <Section title="8. Disponibilidad y mantenimiento">
            <p>
              Betali hace sus mejores esfuerzos para mantener la Plataforma disponible de forma continua, pero no garantiza un uptime del 100%. Pueden existir interrupciones por mantenimiento programado (notificado con anticipación), fallas técnicas imprevistas o causas de fuerza mayor.
            </p>
          </Section>

          <Section title="9. Limitación de responsabilidad">
            <p>
              En la máxima medida permitida por la ley aplicable, Betali no será responsable por daños indirectos, incidentales, especiales, consecuentes o punitivos derivados del uso o imposibilidad de uso de la Plataforma.
            </p>
            <p>
              La responsabilidad total de Betali frente a un usuario no superará el monto pagado por dicho usuario en los 3 meses previos al evento que dio lugar al reclamo.
            </p>
          </Section>

          <Section title="10. Modificaciones a los términos">
            <p>
              Betali puede modificar estos Términos en cualquier momento. Los cambios sustanciales serán notificados por email con al menos 15 días de anticipación. El uso continuado de la Plataforma tras dicha notificación implica la aceptación de los nuevos Términos.
            </p>
          </Section>

          <Section title="11. Rescisión">
            <p>
              El usuario puede cancelar su cuenta en cualquier momento desde la configuración de su perfil. Betali puede suspender o cancelar cuentas por incumplimiento de estos Términos, actividad fraudulenta o falta de pago.
            </p>
            <p>
              Ante la cancelación, los datos del usuario serán conservados por 30 días antes de ser eliminados de forma permanente, salvo obligación legal de conservarlos.
            </p>
          </Section>

          <Section title="12. Ley aplicable y jurisdicción">
            <p>
              Estos Términos se rigen por las leyes de la República Argentina. Cualquier controversia derivada de estos Términos se someterá a la jurisdicción ordinaria de los tribunales competentes de la Ciudad Autónoma de Buenos Aires, con renuncia expresa a cualquier otro fuero que pudiera corresponder.
            </p>
          </Section>

          <Section title="13. Contacto">
            <p>
              Para consultas sobre estos Términos, comuníquese con nosotros a:{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary-600 hover:underline font-medium">
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
