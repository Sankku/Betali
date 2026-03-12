import React from 'react';
import { useGlobalSync } from '../../context/GlobalSyncContext';
import { Loader2 } from 'lucide-react';
import { useTranslation } from '../../contexts/LanguageContext';

export const GlobalLoading: React.FC = () => {
  const { t } = useTranslation();
  const { isLoading, loadingMessage } = useGlobalSync();

  if (!isLoading) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
      <div className="flex items-center gap-2 bg-neutral-900/90 text-white text-xs font-medium px-3 py-2 rounded-full shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-300 shrink-0" />
        <span className="text-neutral-100">
          {loadingMessage || t('globalSync.synchronizing')}
        </span>
      </div>
    </div>
  );
};