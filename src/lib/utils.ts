// Common utility functions across Lyra

export const getQualityColor = (quality: number): string => {
  switch (quality) {
    case 0:
      return 'text-slate-500';
    case 1:
      return 'text-slate-800 font-bold';
    case 2:
      return 'text-emerald-600 font-bold';
    case 3:
      return 'text-blue-600 font-bold';
    case 4:
      return 'text-purple-600 font-bold';
    case 5:
      return 'text-amber-600 font-bold';
    case 6:
      return 'text-orange-600 font-bold';
    default:
      return 'text-slate-800';
  }
};

// SQL value handling lives in ./sql; re-exported here so existing imports keep
// resolving to the single hardened implementation.
export {
  escapeSqlString,
  quoteSqlString,
  formatSqlValue,
  formatSqlInt,
  formatSqlFloat,
  sqlValuesEqual,
} from './sql';
export type { SqlColumnFormat, SqlValueKind } from './sql';

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};
