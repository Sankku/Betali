import { useTranslation } from '../contexts/LanguageContext';
import { useDateFormat } from '../contexts/DateFormatContext';

export function useDateTranslations() {
  const { t } = useTranslation();
  const dateFormat = useDateFormat();

  const formatDateWithTranslation = (
    date: Date | string,
    style?: 'short' | 'medium' | 'long' | 'relative'
  ): string => {
    const dateObj = date instanceof Date ? date : new Date(date);

    if (isNaN(dateObj.getTime())) {
      return t('dateContext.invalidDate');
    }

    // Handle relative dates with translations
    if (style === 'relative') {
      const now = new Date();
      const diffTime = now.getTime() - dateObj.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return t('dateContext.today');
      if (diffDays === 1) return t('dateContext.yesterday');
      if (diffDays < 7) return t('dateContext.daysAgo', { days: diffDays.toString() });
      // Fall through to normal formatting for older dates
    }

    // Use the existing date format function for other styles
    return dateFormat.formatDate(date, style);
  };

  return {
    ...dateFormat,
    formatDate: formatDateWithTranslation,
  };
}
