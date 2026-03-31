import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import { BetaliLogo } from '../components/ui/BetaliLogo';
import { useTranslation } from '../contexts/LanguageContext';

export default function NotFound() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100 flex items-center justify-center p-4">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-250px] left-[-100px] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-primary-200/20 to-primary-300/20 blur-3xl" />
        <div className="absolute bottom-[-350px] right-[-100px] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-primary-200/10 to-primary-300/10 blur-3xl" />
      </div>

      <div className="w-full max-w-md text-center flex flex-col items-center gap-8 z-10">
        <Link to="/dashboard" className="hover:opacity-80 transition-opacity">
          <BetaliLogo variant="full" size="md" />
        </Link>

        {/* Big 404 */}
        <div>
          <p className="text-8xl font-black text-neutral-900 tracking-tight leading-none">
            404
          </p>
          <div className="mt-1 h-1.5 w-16 mx-auto rounded-full bg-primary-500" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">
            {t('notFound.title')}
          </h1>
          <p className="text-neutral-500 text-sm leading-relaxed max-w-xs mx-auto">
            {t('notFound.message')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('notFound.goBack')}
          </button>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
          >
            <Home className="h-4 w-4" />
            {t('notFound.dashboard')}
          </Link>
        </div>
      </div>
    </div>
  );
}
