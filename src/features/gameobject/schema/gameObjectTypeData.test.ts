// Sanity and spot-check coverage for the per-type Data metadata. The metadata is
// transcribed from HavenCore's GameObjectData.h union; these tests guard the
// invariants a transcription error would break.

import { describe, expect, it } from 'vitest';
import {
  GAMEOBJECT_TYPE_DATA,
  dataFieldDef,
  dataFieldsForType,
} from './gameObjectTypeData';

const allFields = Object.entries(GAMEOBJECT_TYPE_DATA);

describe('metadata invariants', () => {
  it('keeps every Data index within 0..33', () => {
    for (const [, fields] of allFields) {
      for (const field of fields) {
        expect(field.index).toBeGreaterThanOrEqual(0);
        expect(field.index).toBeLessThanOrEqual(33);
      }
    }
  });

  it('has no duplicate indices within a type', () => {
    for (const [type, fields] of allFields) {
      const indices = fields.map((f) => f.index);
      expect(new Set(indices).size, `type ${type} has duplicate Data indices`).toBe(indices.length);
    }
  });

  it('lists fields in ascending index order', () => {
    for (const [type, fields] of allFields) {
      const indices = fields.map((f) => f.index);
      const sorted = [...indices].sort((a, b) => a - b);
      expect(indices, `type ${type} is not in index order`).toEqual(sorted);
    }
  });

  it('only uses entity pickers that exist in Phase 1', () => {
    const allowed = new Set(['spell', 'gameobject', 'quest', 'item']);
    for (const [, fields] of allFields) {
      for (const field of fields) {
        if (field.editor === 'entity') {
          expect(field.entityType).toBeDefined();
          expect(allowed.has(field.entityType!)).toBe(true);
        }
      }
    }
  });

  it('gives every enum field a non-empty option list', () => {
    for (const [, fields] of allFields) {
      for (const field of fields) {
        if (field.editor === 'enum') {
          expect(field.options && field.options.length).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('known mappings', () => {
  it('type 0 (door) Data0 is startOpen bool', () => {
    const f = dataFieldDef(0, 0);
    expect(f?.name).toBe('startOpen');
    expect(f?.editor).toBe('bool');
  });

  it('type 3 (chest) Data1 is chestLoot and Data8 is a quest picker', () => {
    expect(dataFieldDef(3, 1)?.name).toBe('chestLoot');
    expect(dataFieldDef(3, 8)).toMatchObject({ name: 'questID', editor: 'entity', entityType: 'quest' });
    expect(dataFieldDef(3, 26)).toMatchObject({ name: 'spell', editor: 'entity', entityType: 'spell' });
  });

  it('type 6 (trap) Data3 is a spell picker', () => {
    expect(dataFieldDef(6, 3)).toMatchObject({ editor: 'entity', entityType: 'spell' });
  });

  it('type 7 (chair) Data1 is chairheight int', () => {
    expect(dataFieldDef(7, 1)).toMatchObject({ name: 'chairheight', editor: 'int' });
  });

  it('type 1 (button) Data3 links a gameobject trap', () => {
    expect(dataFieldDef(1, 3)).toMatchObject({ name: 'linkedTrap', editor: 'entity', entityType: 'gameobject' });
  });

  it('type 41 (client item) Data0 is an item picker', () => {
    expect(dataFieldDef(41, 0)).toMatchObject({ editor: 'entity', entityType: 'item' });
  });

  it('type 31 (dungeon difficulty) Data0 is an InstanceType enum', () => {
    expect(dataFieldDef(31, 0)).toMatchObject({ name: 'InstanceType', editor: 'enum' });
  });

  it('returns an empty list for a type with a raw union body', () => {
    // Type 4 (binder) has no named fields.
    expect(dataFieldsForType(4)).toEqual([]);
  });
});
