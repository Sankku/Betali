import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Settings as SettingsIcon } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/Dashboard/DashboardLayout';
import { DateFormatSettings } from '../../components/features/settings/date-format-settings';
import { LanguageSettings } from '../../components/features/settings/language-settings';
import { ThemeSettings } from '../../components/features/settings/theme-settings';
import { useTranslation } from '../../contexts/LanguageContext';

export default function Settings() {
  const { t } = useTranslation();

  return (
    <DashboardLayout>
      <Helmet>
        <title>{t('settings.title')} - Betali</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <SettingsIcon className="h-6 w-6 text-primary-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
              <p className="text-sm text-gray-600 mt-1">{t('settings.subtitle')}</p>
            </div>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          <LanguageSettings />
          <ThemeSettings />
          <DateFormatSettings />
        </div>
      </div>
    </DashboardLayout>
  );
}
