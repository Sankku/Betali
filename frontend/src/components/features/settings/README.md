# Date Format Settings

## Overview

This feature allows users to customize how dates are displayed throughout the application while maintaining ISO 8601 format in the backend.

## Files Created

- `DateFormatContext.tsx` - React context for managing date format preferences
- `date-format-settings.tsx` - UI component for configuring date format
- `/lib/utils.ts` - Added `formatDate()` utility function
- `/pages/Dashboard/Settings.tsx` - Settings page
- Updated `DateCell.tsx` to use the context

## How It Works

1. **Storage**: User preferences are saved in `localStorage` with key `betali_date_format_preferences`
2. **Context**: `DateFormatProvider` wraps the app and provides formatting functions
3. **Utility**: `formatDate()` function in `utils.ts` can be used anywhere without requiring the context
4. **Components**: Tables and date displays use either the context or the utility function

## Available Formats

- `DD/MM/YYYY` (e.g., 31/12/2024)
- `MM/DD/YYYY` (e.g., 12/31/2024)
- `YYYY-MM-DD` (e.g., 2024-12-31)
- `DD-MM-YYYY` (e.g., 31-12-2024)
- `MM-DD-YYYY` (e.g., 12-31-2024)

## Usage

### In Components (with context)

```tsx
import { useDateFormat } from '@/contexts/DateFormatContext';

function MyComponent() {
  const { formatDate } = useDateFormat();
  return <div>{formatDate(new Date())}</div>;
}
```

### In Utilities (without context)

```tsx
import { formatDate } from '@/lib/utils';

const formattedDate = formatDate(new Date());
// or
const formattedDate = formatDate('2024-12-31');
```

### In Table Columns

```tsx
{
  accessorKey: 'created_at',
  header: 'Date',
  cell: ({ row }) => (
    <div className="tabular-nums">{formatDate(row.original.created_at)}</div>
  ),
}
```

## Backend Considerations

- The backend continues to use ISO 8601 format (YYYY-MM-DD)
- This is purely a visual/display customization on the frontend
- No changes needed to API requests/responses
- Database stores dates in standard format

## Future Enhancements

Could be extended to:
- Support time formatting preferences (12h vs 24h)
- Support timezone preferences
- Sync preferences with user profile in backend (instead of just localStorage)
- Organization-level default settings
