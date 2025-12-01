import React from 'react';
import { Globe } from 'lucide-react';
import { useTranslation } from '../../../contexts/LanguageContext';
import { Locale } from '../../../locales';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Label } from '../../ui/label';

const LANGUAGE_OPTIONS: { value: Locale; label: string; nativeName: string }[] = [
  { value: 'es', label: 'Spanish', nativeName: 'Español' },
  { value: 'en', label: 'English', nativeName: 'English' },
];

export function LanguageSettings() {
  const { locale, setLocale, t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Globe className="h-5 w-5" />
          {t('settings.language.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm font-medium mb-3 block">
            {t('settings.language.description')}
          </Label>
          <div className="space-y-2">
            {LANGUAGE_OPTIONS.map(option => (
              <label
                key={option.value}
                className={`
                  flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all
                  ${
                    locale === option.value
                      ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-600'
                      : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="language"
                    value={option.value}
                    checked={locale === option.value}
                    onChange={e => setLocale(e.target.value as Locale)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                  />
                  <div>
                    <p className="font-medium text-sm">{option.nativeName}</p>
                    <p className="text-xs text-gray-500">{option.label}</p>
                  </div>
                </div>
                {locale === option.value && (
                  <span className="text-xs font-medium text-primary-700 bg-primary-100 px-2 py-1 rounded">
                    {t('common.active')}
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>

        <div className="pt-2">
          <p className="text-xs text-gray-500 leading-relaxed">
            <strong>{t('settings.dateFormat.note').split(':')[0]}:</strong>{' '}
            {t('settings.language.note')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
