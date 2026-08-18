// Structural definition of the `quest_greeting` table.
//
// Keyed by (ID, Type), where ID is a creature entry (Type 0) or a gameobject
// entry (Type 1). Greeting is a nullable text column. A quest-relation editor
// keys these by the related entity; the scope column is ID.

import { CollectionColumn } from '../../../lib/collectionSql';

export const QUEST_GREETING_TABLE = 'quest_greeting';
export const QUEST_GREETING_SCOPE_COLUMN = 'ID';

export const QUEST_GREETING_COLUMNS: CollectionColumn[] = [
  { name: 'ID', kind: 'int' },
  { name: 'Type', kind: 'int' },
  { name: 'GreetEmoteType', kind: 'int' },
  { name: 'GreetEmoteDelay', kind: 'int' },
  { name: 'Greeting', kind: 'text', nullable: true },
  { name: 'VerifiedBuild', kind: 'int' },
];
