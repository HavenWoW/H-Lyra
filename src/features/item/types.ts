// Types for the item module and its sub-tables.

import { SelectOption, FlagOption } from '../../constants/itemOptions';
import { SelectorType } from '../../components/EntitySelectorModal';

export interface ItemViewProps {
  selectedItem?: any;
  onSelectItem?: (item: any) => void;
  activeSubTab?: string;
  onNavigateSubItem?: (subItem: string) => void;
  onSetDirty?: (subKey: string, isDirty: boolean) => void;
  onOpenSettings?: () => void;
}

export interface SelectorModalState {
  type: 'single' | 'flags';
  title: string;
  field: string;
  options?: SelectOption[];
  flags?: FlagOption[];
  selectedValue?: number;
  currentValue?: number | string;
  isBigInt?: boolean;
  /** Storage width of a flags column; overrides `isBigInt` when given. */
  width?: 16 | 32 | 64;
  /** True for signed flags columns, so a fully set field is stored as `-1`. */
  signed?: boolean;
}

export interface EntitySelectorState {
  isOpen: boolean;
  type: SelectorType;
  targetField: string;
  title: string;
}

export const ITEM_CLASS_LABELS: Record<number, string> = {
  0: 'Consumable',
  1: 'Container',
  2: 'Weapon',
  3: 'Gem',
  4: 'Armor',
  5: 'Reagent',
  6: 'Projectile',
  7: 'Trade Goods',
  9: 'Recipe',
  11: 'Quiver',
  12: 'Quest',
  13: 'Key',
  15: 'Miscellaneous',
  16: 'Glyph',
  17: 'Battle Pets',
  18: 'WoW Token',
};

export const ITEM_SUBCLASS_LABELS: Record<number, Record<number, string>> = {
  0: { 0: 'Consumable', 1: 'Potion', 2: 'Elixir', 3: 'Flask', 4: 'Scroll', 5: 'Food & Drink', 7: 'Bandage', 8: 'Other' },
  1: { 0: 'Bag', 1: 'Soul Bag', 2: 'Herb Bag', 3: 'Enchanting Bag', 4: 'Engineering Bag', 5: 'Gem Bag', 6: 'Mining Bag', 7: 'Leatherworking Bag', 8: 'Inscription Bag' },
  2: { 0: '1H Axe', 1: '2H Axe', 2: 'Bow', 3: 'Gun', 4: '1H Mace', 5: '2H Mace', 6: 'Polearm', 7: '1H Sword', 8: '2H Sword', 10: 'Staff', 13: 'Fist Weapon', 14: 'Misc', 15: 'Dagger', 16: 'Thrown', 18: 'Crossbow', 19: 'Wand', 20: 'Fishing Pole' },
  3: { 0: 'Red', 1: 'Blue', 2: 'Yellow', 3: 'Purple', 4: 'Green', 5: 'Orange', 6: 'Meta', 7: 'Simple', 8: 'Prismatic' },
  4: { 0: 'Misc', 1: 'Cloth', 2: 'Leather', 3: 'Mail', 4: 'Plate', 5: 'Buckler', 6: 'Shield', 7: 'Libram', 8: 'Idol', 9: 'Totem', 10: 'Sigil', 11: 'Relic' },
  5: { 0: 'Reagent' },
  6: { 2: 'Arrow', 3: 'Bullet' },
  7: { 0: 'Trade Goods', 1: 'Parts', 4: 'Jewelcrafting', 5: 'Cloth', 6: 'Leather', 7: 'Metal & Stone', 8: 'Cooking', 9: 'Herb', 10: 'Elemental', 11: 'Other', 12: 'Enchanting', 16: 'Inscription' },
  9: { 0: 'Book', 1: 'Leatherworking', 2: 'Tailoring', 3: 'Engineering', 4: 'Blacksmithing', 5: 'Cooking', 6: 'Alchemy', 7: 'First Aid', 8: 'Enchanting', 9: 'Fishing', 10: 'Jewelcrafting', 11: 'Inscription' },
  12: { 0: 'Quest' },
  13: { 0: 'Key', 1: 'Lockpick' },
  15: { 0: 'Junk', 1: 'Reagent', 2: 'Companion Pets', 3: 'Holiday', 4: 'Other', 5: 'Mount' },
  16: { 1: 'Warrior', 2: 'Paladin', 3: 'Hunter', 4: 'Rogue', 5: 'Priest', 6: 'Death Knight', 7: 'Shaman', 8: 'Mage', 9: 'Warlock', 10: 'Monk', 11: 'Druid', 12: 'Demon Hunter' },
};

export const getQualityColor = (quality: number) => {
  switch (quality) {
    case 0: return 'text-[#9d9d9d] font-normal'; // Poor (Gray)
    case 1: return 'text-slate-800 font-bold';   // Common (White/Dark)
    case 2: return 'text-[#1eff00] font-bold';   // Uncommon (Green)
    case 3: return 'text-[#0070dd] font-bold';   // Rare (Blue)
    case 4: return 'text-[#a335ee] font-bold';   // Epic (Purple)
    case 5: return 'text-[#ff8000] font-bold';   // Legendary (Orange)
    case 6: return 'text-[#e6cc80] font-bold';   // Artifact (Gold)
    case 7: return 'text-[#00ccff] font-bold';   // Heirloom (Cyan)
    default: return 'text-slate-800 font-bold';
  }
};
