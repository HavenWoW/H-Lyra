// Structural definition of the `gameobject_template_addon` table.
//
// One row per template, keyed by `entry`, loaded separately from the template
// by the core. Written as an entry-scoped DELETE + INSERT of zero or one row
// through the shared collection generator.

import { CollectionColumn } from '../../../lib/collectionSql';

export const GAMEOBJECT_TEMPLATE_ADDON_TABLE = 'gameobject_template_addon';
export const GAMEOBJECT_TEMPLATE_ADDON_SCOPE_COLUMN = 'entry';

export const GAMEOBJECT_TEMPLATE_ADDON_COLUMNS: CollectionColumn[] = [
  { name: 'entry', kind: 'int' },
  { name: 'faction', kind: 'int' },
  { name: 'flags', kind: 'int' },
  { name: 'mingold', kind: 'int' },
  { name: 'maxgold', kind: 'int' },
  { name: 'WorldEffectID', kind: 'int' },
  { name: 'AIAnimKitID', kind: 'int' },
];
