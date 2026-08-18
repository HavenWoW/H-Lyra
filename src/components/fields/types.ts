// Shared state for the selector modals a field row can open (single-value
// enum picker, bitmask flag picker, entity picker). One definition, re-exported
// by each feature's `types.ts` so existing imports keep resolving.

import { SelectOption, FlagOption } from '../../constants/itemOptions';
import { SelectorType } from '../EntitySelectorModal';

export interface SelectorModalState {
  type: 'single' | 'flags' | 'entity';
  title: string;
  field: string;
  options?: SelectOption[];
  flags?: FlagOption[];
  entityType?: SelectorType;
  selectedValue?: number;
  currentValue?: number | string;
  isBigInt?: boolean;
  /** Storage width of a flags column; overrides `isBigInt` when given. */
  width?: 16 | 32 | 64;
  /** True for signed flags columns, so a fully set field is stored as `-1`. */
  signed?: boolean;
}
