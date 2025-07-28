import { CellConfig } from '../../types/table';
import {
  TextCell,
  NumberCell,
  DateCell,
  BadgeCell,
  IconTextCell,
  CompoundCell,
  StatusCell,
  ImageCell,
  LinkCell,
  ActionsCell,
  ProgressCell,
} from './cells';

interface GenericCellProps {
  value: any;
  row: any;
  config: CellConfig;
  onAction?: (action: string, row: any) => void;
}

export const GenericCell: React.FC<GenericCellProps> = ({ value, row, config, onAction }) => {
  if (config.dataType === 'actions') {
    return <ActionsCell row={row} config={config.actionsConfig} onAction={onAction} />;
  }

  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    return <span className="text-neutral-400">—</span>;
  }

  switch (config.dataType) {
    case 'text':
      return <TextCell value={value} config={config.textConfig} />;

    case 'number':
    case 'currency':
    case 'percentage':
      return <NumberCell value={value} config={config.numberConfig} />;

    case 'date':
    case 'datetime':
      return <DateCell value={value} config={config.dateConfig} />;

    case 'boolean':
      return (
        <BadgeCell
          value={value}
          config={{
            ...config.badgeConfig,
            variantMap: { true: 'success', false: 'danger' },
            labelMap: { true: 'Yes', false: 'No' },
          }}
        />
      );

    case 'badge':
      return <BadgeCell value={value} config={config.badgeConfig} />;

    case 'icon-text':
      return <IconTextCell value={value} row={row} config={config} />;

    case 'compound':
      return <CompoundCell row={row} config={config.compoundConfig} />;

    case 'status':
      return (
        <StatusCell value={value} row={row} config={config.statusConfig} onAction={onAction} />
      );

    case 'image':
    case 'avatar':
      return <ImageCell value={value} config={config.imageConfig} />;

    case 'link':
      return <LinkCell value={value} config={config.linkConfig} />;

    case 'progress':
      return <ProgressCell value={value} config={config.progressConfig} />;

    default:
      return <TextCell value={String(value)} />;
  }
};
