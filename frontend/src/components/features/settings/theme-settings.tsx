import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, ThemePreference } from '../../../contexts/ThemeContext';
import { useTranslation } from '../../../contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Label } from '../../ui/label';

const THEME_OPTIONS: {
  value: ThemePreference;
  icon: React.ElementType;
  labelKey: string;
  descKey: string;
}[] = [
  { value: 'light', icon: Sun,     labelKey: 'theme.light',  descKey: 'theme.lightDesc' },
  { value: 'dark',  icon: Moon,    labelKey: 'theme.dark',   descKey: 'theme.darkDesc' },
  { value: 'system',icon: Monitor, labelKey: 'theme.system', descKey: 'theme.systemDesc' },
];

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Sun className="h-5 w-5" />
          {t('theme.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm font-medium mb-3 block">
            {t('theme.description')}
          </Label>
          <div className="space-y-2">
            {THEME_OPTIONS.map(option => {
              const Icon = option.icon;
              return (
                <label
                  key={option.value}
                  className={`
                    flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all
                    ${
                      theme === option.value
                        ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-600'
                        : 'border-neutral-200 hover:border-primary-300 hover:bg-neutral-50'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="theme"
                      value={option.value}
                      checked={theme === option.value}
                      onChange={() => setTheme(option.value)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300"
                    />
                    <Icon className="h-4 w-4 text-neutral-500" />
                    <div>
                      <p className="font-medium text-sm">{t(option.labelKey as any)}</p>
                      <p className="text-xs text-neutral-500">{t(option.descKey as any)}</p>
                    </div>
                  </div>
                  {theme === option.value && (
                    <span className="text-xs font-medium text-primary-700 bg-primary-100 px-2 py-1 rounded">
                      {t('common.active')}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>

        <div className="pt-2">
          <p className="text-xs text-neutral-500 leading-relaxed">
            {t('theme.note')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
