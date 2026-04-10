import React from 'react';
import { Globe } from 'lucide-react';
import { useDateFormat } from '../../../contexts/DateFormatContext';
import { useTranslation } from '../../../contexts/LanguageContext';
import { Label } from '../../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';

// Common timezones with their labels
const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (ART)' },
  { value: 'America/Mexico_City', label: 'Mexico City (CST)' },
  { value: 'America/Bogota', label: 'Bogotá (COT)' },
  { value: 'America/Lima', label: 'Lima (PET)' },
  { value: 'America/Santiago', label: 'Santiago (CLT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Madrid', label: 'Madrid (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Europe/Rome', label: 'Rome (CET)' },
  { value: 'Europe/Athens', label: 'Athens (EET)' },
  { value: 'Europe/Moscow', label: 'Moscow (MSK)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Bangkok', label: 'Bangkok (ICT)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Seoul', label: 'Seoul (KST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEDT)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZDT)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
];

interface TimezoneSelectorProps {
  value?: string;
  onChange?: (timezone: string) => void;
  compact?: boolean;
}

const AUTO_TZ = '';
const AUTO_TZ_LABEL = `Auto-detect (${Intl.DateTimeFormat().resolvedOptions().timeZone})`;

export function TimezoneSelector({ value, onChange, compact = false }: TimezoneSelectorProps) {
  const { timezone, setTimezone } = useDateFormat();
  const { t } = useTranslation();

  // '' means auto-detect — resolve to browser timezone for display purposes
  const effectiveBrowserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const storedTz = value !== undefined ? value : timezone;
  const currentTimezone = storedTz || effectiveBrowserTz;
  const selectValue = storedTz === '' || storedTz === null || storedTz === undefined ? AUTO_TZ : storedTz;

  const handleChange = (newTimezone: string) => {
    if (onChange) {
      onChange(newTimezone);
    } else {
      setTimezone(newTimezone); // '' = auto-detect
    }
  };

  const getCurrentTime = () => {
    try {
      return new Date().toLocaleTimeString('en-US', {
        timeZone: currentTimezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch (error) {
      return 'Invalid timezone';
    }
  };

  const allOptions = [
    { value: AUTO_TZ, label: AUTO_TZ_LABEL },
    ...COMMON_TIMEZONES,
  ];

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-gray-500" />
        <Select value={selectValue} onValueChange={handleChange}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {allOptions.map(tz => (
              <SelectItem key={tz.value === AUTO_TZ ? '__auto__' : tz.value} value={tz.value} className="text-xs">
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  const isEffectiveTzUTC = currentTimezone === 'UTC' || currentTimezone === 'Etc/UTC';

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium flex items-center gap-2">
        <Globe className="h-4 w-4" />
        {t('profile.timezone.label')}
      </Label>
      <Select value={selectValue} onValueChange={handleChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {allOptions.map(tz => (
            <SelectItem key={tz.value === AUTO_TZ ? '__auto__' : tz.value} value={tz.value}>
              {tz.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isEffectiveTzUTC && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
          <strong>⚠️ {t('profile.timezone.utcWarningTitle')}</strong>{' '}
          {t('profile.timezone.utcWarningBody')}{' '}
          <strong>{t('profile.timezone.utcWarningLocation')}</strong>{' '}
          {t('profile.timezone.utcWarningEnd')}
        </div>
      )}
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs font-medium text-gray-600 mb-1">{t('profile.timezone.currentTimeLabel')}</p>
        <p className="text-lg font-semibold text-gray-900 tabular-nums">{getCurrentTime()}</p>
      </div>
    </div>
  );
}
