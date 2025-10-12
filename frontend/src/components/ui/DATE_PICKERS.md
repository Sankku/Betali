# Date Pickers Components

## Overview

This folder contains date picker components for filtering and selecting dates in the application.

## Components

### DatePicker

Single date picker with calendar UI.

**Features:**
- Calendar view with month/year navigation
- Today button for quick selection
- Clear button
- Min/max date constraints
- Portal-based rendering (no overflow issues)
- Keyboard navigation (ESC to close)

**Usage:**
```tsx
import { DatePicker } from '@/components/ui/date-picker';

function MyComponent() {
  const [date, setDate] = useState<Date>();

  return (
    <DatePicker
      value={date}
      onChange={setDate}
      placeholder="Select date"
      minDate={new Date('2024-01-01')}
      maxDate={new Date()}
    />
  );
}
```

### DateRangePicker

Date range picker for selecting from/to dates.

**Features:**
- Visual range highlighting
- Click start → Click end workflow
- Quick range buttons (Last 7/30/90 days, This month)
- Portal-based rendering
- Hover preview of range
- Smart range selection (if you click before start, it becomes new start)

**Usage:**
```tsx
import { DateRangePicker, DateRange } from '@/components/ui/date-range-picker';

function MyComponent() {
  const [range, setRange] = useState<DateRange>({ from: undefined, to: undefined });

  return (
    <DateRangePicker
      value={range}
      onChange={setRange}
      placeholder="Select date range"
    />
  );
}
```

## Integration with Column Filters

The `ColumnFilter` component automatically uses these date pickers when you specify the filter type.

**Example in table columns:**

```tsx
// Single date filter
{
  accessorKey: 'created_at',
  header: 'Created',
  cell: ({ row }) => formatDate(row.original.created_at),
  meta: {
    filterType: 'date',
  },
}

// Date range filter
{
  accessorKey: 'order_date',
  header: 'Date',
  cell: ({ row }) => formatDate(row.original.order_date),
  filterFn: (row, columnId, filterValue) => {
    if (!filterValue) return true;

    const rowDate = new Date(row.original.order_date);

    // Date range filter (contains |)
    if (filterValue.includes('|')) {
      const [fromStr, toStr] = filterValue.split('|');
      const from = new Date(fromStr);
      const to = new Date(toStr);

      // Normalize to compare date only (no time)
      const rowDateOnly = new Date(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate());
      const fromOnly = new Date(from.getFullYear(), from.getMonth(), from.getDate());
      const toOnly = new Date(to.getFullYear(), to.getMonth(), to.getDate());

      return rowDateOnly >= fromOnly && rowDateOnly <= toOnly;
    }

    // Single date filter
    const filterDate = new Date(filterValue);
    const rowDateOnly = new Date(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate());
    const filterDateOnly = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate());

    return rowDateOnly.getTime() === filterDateOnly.getTime();
  },
  meta: {
    filterType: 'dateRange',
  },
}
```

## Filter Value Format

When using date filters in columns:

- **Single date**: ISO string (`"2024-12-31T00:00:00.000Z"`)
- **Date range**: Two ISO strings separated by `|` (`"2024-12-01T00:00:00.000Z|2024-12-31T23:59:59.999Z"`)

## Styling

Both components use:
- Tailwind CSS for styling
- Portal rendering to avoid z-index and overflow issues
- Primary color palette for selected dates
- Consistent button and input styles from the design system

## Browser Compatibility

- Uses `Intl.DateTimeFormat()` for locale-aware date formatting
- Tested on modern browsers (Chrome, Firefox, Safari, Edge)
- No external date library dependencies (vanilla JS Date API)

## Examples in the App

**Orders page**: Date range filter on `order_date` column
- [orders-page.tsx](../features/orders/orders-page.tsx:313-315)

## Future Enhancements

Could be extended to support:
- Time picker component
- Date + time range picker
- Preset ranges (Last week, Last month, Last quarter, etc.)
- Multi-date selection (for booking systems, etc.)
- Different calendar views (week view, month view, year view)
- Timezone-aware date selection
