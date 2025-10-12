import React from 'react';
import { Calendar } from 'lucide-react';
import { useDateFormat, DateFormatPattern } from '../../../contexts/DateFormatContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Label } from '../../ui/label';

const DATE_FORMAT_OPTIONS: { value: DateFormatPattern; label: string; example: string }[] = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY', example: '31/12/2024' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY', example: '12/31/2024' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD', example: '2024-12-31' },
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY', example: '31-12-2024' },
  { value: 'MM-DD-YYYY', label: 'MM-DD-YYYY', example: '12-31-2024' },
];

export function DateFormatSettings() {
  const { datePattern, setDatePattern, formatDate } = useDateFormat();

  const currentDate = new Date();
  const preview = formatDate(currentDate);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Formato de Fecha
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm font-medium mb-3 block">
            Selecciona cómo quieres ver las fechas en toda la aplicación
          </Label>
          <div className="space-y-2">
            {DATE_FORMAT_OPTIONS.map(option => (
              <label
                key={option.value}
                className={`
                  flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all
                  ${
                    datePattern === option.value
                      ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-600'
                      : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="dateFormat"
                    value={option.value}
                    checked={datePattern === option.value}
                    onChange={e => setDatePattern(e.target.value as DateFormatPattern)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                  />
                  <div>
                    <p className="font-medium text-sm">{option.label}</p>
                    <p className="text-xs text-gray-500">Ejemplo: {option.example}</p>
                  </div>
                </div>
                {datePattern === option.value && (
                  <span className="text-xs font-medium text-primary-700 bg-primary-100 px-2 py-1 rounded">
                    Activo
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-600 mb-2">Vista previa con fecha actual:</p>
            <p className="text-2xl font-semibold text-gray-900 tabular-nums">{preview}</p>
          </div>
        </div>

        <div className="pt-2">
          <p className="text-xs text-gray-500 leading-relaxed">
            <strong>Nota:</strong> Este formato se aplica visualmente en todas las tablas, reportes
            y vistas de la aplicación.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
