// Diff and full query generation for the item and item_sparse hotfix tables.
//
// Items are DB2-overlay records: a physical base exists in Item.db2 and
// ItemSparse.db2, with an optional SQL override row in the hotfix item and
// item_sparse tables. The write policy follows from that:
//
// - an existing SQL override diffs as a targeted UPDATE of the changed columns
// - editing a DB2-only item materialises a full overlay INSERT carrying the
//   complete effective row, DB2 base plus the edit, because a bare UPDATE would
//   match no SQL row and silently discard the change
// - a full query is a DELETE plus INSERT built from the same complete effective
//   values, so it can never wipe a DB2-backed column back to a default
// - every write also registers both table hashes in hotfix_data so the client
//   rebuilds the override

import { TABLE_HASH_ITEM, TABLE_HASH_ITEM_SPARSE } from '../../../constants/hotfixData';
import { escapeSqlString } from '../../../lib/sql';


/** Escapes a value for a single-quoted literal using the shared rules. */
const sqlStr = (value: any): string =>
  escapeSqlString(value === null || value === undefined ? '' : String(value));

const sqlNum = (value: any): number => {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const sparseLayer = (item: any): any => item?._sparseBase ?? {};
const itemLayer = (item: any): any => item?._itemBase ?? {};

/**
 * Resolve a single `item_sparse` column: prefer the editor value, then the merged
 * DB2/SQL sparse base layer, then the schema default. This preserves complete DB2
 * base records when materializing a SQL override.
 */
const sparseCol = (item: any, editorValue: any, baseExpr: any, fallback: number | string | null): string => {
  const resolved = editorValue !== null && editorValue !== undefined && editorValue !== ''
    ? editorValue
    : baseExpr !== null && baseExpr !== undefined && baseExpr !== ''
      ? baseExpr
      : fallback;
  if (typeof resolved === 'string') return `'${sqlStr(resolved)}'`;
  if (resolved === null) return 'NULL';
  return String(sqlNum(resolved));
};

/** Full `item` overlay row value tuple (ID..VerifiedBuild). */
/** Full `item` overlay row value tuple (ID..VerifiedBuild). */
const itemInsertValues = (item: any): string => {
  const lb = itemLayer(item);
  return `(${sqlNum(item.entry)}, ${sqlNum(item.class ?? lb.class_id)}, ${sqlNum(item.subclass ?? lb.subclass_id)}, ${sqlNum(item.Material ?? lb.material)}, ${sqlNum(item.InventoryType ?? lb.inventory_type)}, ${sqlNum(item.sheath ?? lb.sheathe_type)}, ${sqlNum(item.SoundOverride ?? lb.sound_override_subclass_id)}, ${sqlNum(item.displayid ?? lb.icon_file_data_id)}, ${sqlNum(lb.item_group_sounds_id)}, 35662)`;
};

const ITEM_SPARSE_COLUMNS = `\`ID\`, \`AllowableRace\`, \`Description\`, \`Display3\`, \`Display2\`, \`Display1\`, \`Display\`, \`DmgVariance\`, \`DurationInInventory\`, \`QualityModifier\`, \`BagFamily\`, \`ItemRange\`, \`StatPercentageOfSocket1\`, \`StatPercentageOfSocket2\`, \`StatPercentageOfSocket3\`, \`StatPercentageOfSocket4\`, \`StatPercentageOfSocket5\`, \`StatPercentageOfSocket6\`, \`StatPercentageOfSocket7\`, \`StatPercentageOfSocket8\`, \`StatPercentageOfSocket9\`, \`StatPercentageOfSocket10\`, \`StatPercentEditor1\`, \`StatPercentEditor2\`, \`StatPercentEditor3\`, \`StatPercentEditor4\`, \`StatPercentEditor5\`, \`StatPercentEditor6\`, \`StatPercentEditor7\`, \`StatPercentEditor8\`, \`StatPercentEditor9\`, \`StatPercentEditor10\`, \`Stackable\`, \`MaxCount\`, \`RequiredAbility\`, \`SellPrice\`, \`BuyPrice\`, \`VendorStackCount\`, \`PriceVariance\`, \`PriceRandomValue\`, \`Flags1\`, \`Flags2\`, \`Flags3\`, \`Flags4\`, \`FactionRelated\`, \`ItemNameDescriptionID\`, \`RequiredTransmogHoliday\`, \`RequiredHoliday\`, \`LimitCategory\`, \`GemProperties\`, \`SocketMatchEnchantmentId\`, \`TotemCategoryID\`, \`InstanceBound\`, \`ZoneBound1\`, \`ZoneBound2\`, \`ItemSet\`, \`LockID\`, \`StartQuestID\`, \`PageID\`, \`ItemDelay\`, \`ScalingStatDistributionID\`, \`MinFactionID\`, \`RequiredSkillRank\`, \`RequiredSkill\`, \`ItemLevel\`, \`AllowableClass\`, \`ExpansionID\`, \`ArtifactID\`, \`SpellWeight\`, \`SpellWeightCategory\`, \`SocketType1\`, \`SocketType2\`, \`SocketType3\`, \`SheatheType\`, \`Material\`, \`PageMaterialID\`, \`LanguageID\`, \`Bonding\`, \`DamageDamageType\`, \`StatModifierBonusStat1\`, \`StatModifierBonusStat2\`, \`StatModifierBonusStat3\`, \`StatModifierBonusStat4\`, \`StatModifierBonusStat5\`, \`StatModifierBonusStat6\`, \`StatModifierBonusStat7\`, \`StatModifierBonusStat8\`, \`StatModifierBonusStat9\`, \`StatModifierBonusStat10\`, \`ContainerSlots\`, \`MinReputation\`, \`RequiredPVPMedal\`, \`RequiredPVPRank\`, \`RequiredLevel\`, \`InventoryType\`, \`OverallQualityID\`, \`VerifiedBuild\``;

/**
 * Complete `item_sparse` overlay row value tuple. Every value resolves
 * editor-over-merged-base so an INSERT never default-wipes a DB2-backed column.
 */
const itemSparseInsertValues = (item: any): string => {
  const sp = sparseLayer(item);
  const arr = (key: string): any[] => (sp?.[key] ?? []) as any[];
  const flags = arr('flags');
  const sockets = arr('socket_type');
  const statSockets = arr('stat_percentage_of_socket');
  const statEditors = arr('stat_percent_editor');
  const statMods = arr('stat_modifier_bonus_stat');
  const zones = arr('zone_bound');
  const v = (editorValue: any, baseExpr: any, fallback: number | string | null): string =>
    sparseCol(item, editorValue, baseExpr, fallback);

  const values: string[] = [
    String(sqlNum(item.entry)),
    v(item.AllowableRace, sp?.allowable_race, -1),
    v(item.description, sp?.description, ''),
    v(null, sp?.display3, null),
    v(null, sp?.display2, null),
    v(null, sp?.display1, null),
    v(item.name, sp?.display, ''),
    v(null, sp?.dmg_variance, 0),
    v(item.Duration, sp?.duration_in_inventory, 0),
    v(null, sp?.quality_modifier, 0),
    v(item.BagFamily, sp?.bag_family, 0),
    v(null, sp?.item_range, 0),
    ...Array.from({ length: 10 }, (_, i) => v(null, statSockets[i], 0)),
    v(item.stat_value1, statEditors[0], 0),
    v(item.stat_value2, statEditors[1], 0),
    v(item.stat_value3, statEditors[2], 0),
    v(item.stat_value4, statEditors[3], 0),
    v(null, statEditors[4], 0),
    v(null, statEditors[5], 0),
    v(null, statEditors[6], 0),
    v(null, statEditors[7], 0),
    v(null, statEditors[8], 0),
    v(null, statEditors[9], 0),
    v(item.stackable, sp?.stackable, 1),
    v(item.maxcount, sp?.max_count, 0),
    v(null, sp?.required_ability, 0),
    v(item.SellPrice, sp?.sell_price, 0),
    v(item.BuyPrice, sp?.buy_price, 0),
    v(item.BuyCount, sp?.vendor_stack_count, 1),
    v(null, sp?.price_variance, 0),
    v(null, sp?.price_random_value, 0),
    v(item.Flags, flags[0], 0),
    v(item.FlagsExtra, flags[1], 0),
    v(null, flags[2], 0),
    v(null, flags[3], 0),
    v(null, sp?.faction_related, 0),
    v(null, sp?.item_name_description_id, 0),
    v(null, sp?.required_transmog_holiday, 0),
    v(item.HolidayId, sp?.required_holiday, 0),
    v(item.ItemLimitCategory, sp?.limit_category, 0),
    v(item.GemProperties, sp?.gem_properties, 0),
    v(item.socketBonus, sp?.socket_match_enchantment_id, 0),
    v(item.TotemCategory, sp?.totem_category_id, 0),
    v(null, sp?.instance_bound, 0),
    v(null, zones[0], 0),
    v(null, zones[1], 0),
    v(item.itemset, sp?.item_set, 0),
    v(item.lockid, sp?.lock_id, 0),
    v(item.startquest, sp?.start_quest_id, 0),
    v(item.PageText, sp?.page_id, 0),
    v(null, sp?.item_delay, 0),
    v(item.StatScalingFactor, sp?.scaling_stat_distribution_id, 0),
    v(item.RequiredReputationFaction, sp?.min_faction_id, 0),
    v(item.RequiredSkillRank, sp?.required_skill_rank, 0),
    v(item.RequiredSkill, sp?.required_skill, 0),
    v(item.ItemLevel, sp?.item_level, 1),
    v(item.AllowableClass, sp?.allowable_class, -1),
    v(null, sp?.expansion_id, 0),
    v(item.artifact_id, sp?.artifact_id, 0),
    v(null, sp?.spell_weight, 0),
    v(null, sp?.spell_weight_category, 0),
    v(item.socketColor_1, sockets[0], 0),
    v(item.socketColor_2, sockets[1], 0),
    v(item.socketColor_3, sockets[2], 0),
    v(item.sheath, sp?.sheathe_type, 0),
    v(item.Material, sp?.material, 0),
    v(item.PageMaterial, sp?.page_material_id, 0),
    v(item.LanguageID, sp?.language_id, 0),
    v(item.bonding, sp?.bonding, 0),
    v(null, sp?.damage_damage_type, 0),
    v(item.stat_type1, statMods[0], 0),
    v(item.stat_type2, statMods[1], 0),
    v(item.stat_type3, statMods[2], 0),
    v(item.stat_type4, statMods[3], 0),
    v(null, statMods[4], 0),
    v(null, statMods[5], 0),
    v(null, statMods[6], 0),
    v(null, statMods[7], 0),
    v(null, statMods[8], 0),
    v(null, statMods[9], 0),
    v(item.ContainerSlots, sp?.container_slots, 0),
    v(item.RequiredReputationRank, sp?.min_reputation, 0),
    v(null, sp?.required_pvp_medal, 0),
    v(item.RequiredHonorRank, sp?.required_pvp_rank, 0),
    v(item.RequiredLevel, sp?.required_level, 1),
    v(item.InventoryType, sp?.inventory_type, 0),
    v(item.Quality, sp?.overall_quality_id, 1),
    '35662',
  ];

  return `(${values.join(', ')})`;
};

export const generateDiffQuery = (initialItem: any, item: any): string => {
  if (!initialItem || !item) return '';
  if (item._isNew) return generateFullQuery(item);

  const safeName = sqlStr(item.name || '');
  const safeDesc = sqlStr(item.description || '');

  const itemDiffs: string[] = [];
  if (item.class !== initialItem.class) itemDiffs.push(`\`ClassID\` = ${item.class || 0}`);
  if (item.subclass !== initialItem.subclass) itemDiffs.push(`\`SubclassID\` = ${item.subclass || 0}`);
  if (item.Material !== initialItem.Material) itemDiffs.push(`\`Material\` = ${item.Material || 0}`);
  if (item.InventoryType !== initialItem.InventoryType) itemDiffs.push(`\`InventoryType\` = ${item.InventoryType || 0}`);
  if (item.sheath !== initialItem.sheath) itemDiffs.push(`\`SheatheType\` = ${item.sheath || 0}`);
  if (item.displayid !== initialItem.displayid) itemDiffs.push(`\`IconFileDataID\` = ${item.displayid || 0}`);
  if (item.SoundOverride !== initialItem.SoundOverride) itemDiffs.push(`\`SoundOverrideSubclassID\` = ${item.SoundOverride || 0}`);

  const sparseDiffs: string[] = [];
  if (item.name !== initialItem.name) sparseDiffs.push(`\`Display\` = '${safeName}'`);
  if (item.description !== initialItem.description) sparseDiffs.push(`\`Description\` = '${safeDesc}'`);
  if (item.Quality !== initialItem.Quality) sparseDiffs.push(`\`OverallQualityID\` = ${item.Quality || 0}`);
  if (item.ItemLevel !== initialItem.ItemLevel) sparseDiffs.push(`\`ItemLevel\` = ${item.ItemLevel || 1}`);
  if (item.RequiredLevel !== initialItem.RequiredLevel) sparseDiffs.push(`\`RequiredLevel\` = ${item.RequiredLevel || 1}`);
  if (item.InventoryType !== initialItem.InventoryType) sparseDiffs.push(`\`InventoryType\` = ${item.InventoryType || 0}`);
  if (item.BuyPrice !== initialItem.BuyPrice) sparseDiffs.push(`\`BuyPrice\` = ${item.BuyPrice || 0}`);
  if (item.SellPrice !== initialItem.SellPrice) sparseDiffs.push(`\`SellPrice\` = ${item.SellPrice || 0}`);
  if (item.BuyCount !== initialItem.BuyCount) sparseDiffs.push(`\`VendorStackCount\` = ${item.BuyCount || 1}`);
  if (item.stackable !== initialItem.stackable) sparseDiffs.push(`\`Stackable\` = ${item.stackable || 1}`);
  if (item.maxcount !== initialItem.maxcount) sparseDiffs.push(`\`MaxCount\` = ${item.maxcount || 0}`);
  if (item.bonding !== initialItem.bonding) sparseDiffs.push(`\`Bonding\` = ${item.bonding || 0}`);
  if (item.AllowableClass !== initialItem.AllowableClass) sparseDiffs.push(`\`AllowableClass\` = ${item.AllowableClass ?? -1}`);
  if (item.AllowableRace !== initialItem.AllowableRace) sparseDiffs.push(`\`AllowableRace\` = ${item.AllowableRace ?? -1}`);
  if (item.Flags !== initialItem.Flags) sparseDiffs.push(`\`Flags1\` = ${item.Flags || 0}`);
  if (item.FlagsExtra !== initialItem.FlagsExtra) sparseDiffs.push(`\`Flags2\` = ${item.FlagsExtra || 0}`);
  if (item.BagFamily !== initialItem.BagFamily) sparseDiffs.push(`\`BagFamily\` = ${item.BagFamily || 0}`);
  if (item.ContainerSlots !== initialItem.ContainerSlots) sparseDiffs.push(`\`ContainerSlots\` = ${item.ContainerSlots || 0}`);
  if (item.Duration !== initialItem.Duration) sparseDiffs.push(`\`DurationInInventory\` = ${item.Duration || 0}`);
  if (item.startquest !== initialItem.startquest) sparseDiffs.push(`\`StartQuestID\` = ${item.startquest || 0}`);
  if (item.itemset !== initialItem.itemset) sparseDiffs.push(`\`ItemSet\` = ${item.itemset || 0}`);
  if (item.lockid !== initialItem.lockid) sparseDiffs.push(`\`LockID\` = ${item.lockid || 0}`);
  if (item.PageText !== initialItem.PageText) sparseDiffs.push(`\`PageID\` = ${item.PageText || 0}`);
  if (item.PageMaterial !== initialItem.PageMaterial) sparseDiffs.push(`\`PageMaterialID\` = ${item.PageMaterial || 0}`);
  if (item.LanguageID !== initialItem.LanguageID) sparseDiffs.push(`\`LanguageID\` = ${item.LanguageID || 0}`);
  if (item.TotemCategory !== initialItem.TotemCategory) sparseDiffs.push(`\`TotemCategoryID\` = ${item.TotemCategory || 0}`);
  if (item.ItemLimitCategory !== initialItem.ItemLimitCategory) sparseDiffs.push(`\`LimitCategory\` = ${item.ItemLimitCategory || 0}`);
  if (item.GemProperties !== initialItem.GemProperties) sparseDiffs.push(`\`GemProperties\` = ${item.GemProperties || 0}`);
  if (item.RequiredSkill !== initialItem.RequiredSkill) sparseDiffs.push(`\`RequiredSkill\` = ${item.RequiredSkill || 0}`);
  if (item.RequiredSkillRank !== initialItem.RequiredSkillRank) sparseDiffs.push(`\`RequiredSkillRank\` = ${item.RequiredSkillRank || 0}`);
  if (item.RequiredReputationFaction !== initialItem.RequiredReputationFaction) sparseDiffs.push(`\`MinFactionID\` = ${item.RequiredReputationFaction || 0}`);
  if (item.RequiredReputationRank !== initialItem.RequiredReputationRank) sparseDiffs.push(`\`MinReputation\` = ${item.RequiredReputationRank || 0}`);
  if (item.StatScalingFactor !== initialItem.StatScalingFactor) sparseDiffs.push(`\`ScalingStatDistributionID\` = ${item.StatScalingFactor || 0}`);

  if (item.stat_type1 !== initialItem.stat_type1) sparseDiffs.push(`\`StatModifierBonusStat1\` = ${item.stat_type1 || 0}`);
  if (item.stat_value1 !== initialItem.stat_value1) sparseDiffs.push(`\`StatPercentEditor1\` = ${item.stat_value1 || 0}`);
  if (item.stat_type2 !== initialItem.stat_type2) sparseDiffs.push(`\`StatModifierBonusStat2\` = ${item.stat_type2 || 0}`);
  if (item.stat_value2 !== initialItem.stat_value2) sparseDiffs.push(`\`StatPercentEditor2\` = ${item.stat_value2 || 0}`);
  if (item.stat_type3 !== initialItem.stat_type3) sparseDiffs.push(`\`StatModifierBonusStat3\` = ${item.stat_type3 || 0}`);
  if (item.stat_value3 !== initialItem.stat_value3) sparseDiffs.push(`\`StatPercentEditor3\` = ${item.stat_value3 || 0}`);
  if (item.stat_type4 !== initialItem.stat_type4) sparseDiffs.push(`\`StatModifierBonusStat4\` = ${item.stat_type4 || 0}`);
  if (item.stat_value4 !== initialItem.stat_value4) sparseDiffs.push(`\`StatPercentEditor4\` = ${item.stat_value4 || 0}`);

  if (item.socketColor_1 !== initialItem.socketColor_1) sparseDiffs.push(`\`SocketType1\` = ${item.socketColor_1 || 0}`);
  if (item.socketColor_2 !== initialItem.socketColor_2) sparseDiffs.push(`\`SocketType2\` = ${item.socketColor_2 || 0}`);
  if (item.socketColor_3 !== initialItem.socketColor_3) sparseDiffs.push(`\`SocketType3\` = ${item.socketColor_3 || 0}`);
  if (item.socketBonus !== initialItem.socketBonus) sparseDiffs.push(`\`SocketMatchEnchantmentId\` = ${item.socketBonus || 0}`);

  const queries: string[] = [];

  const hasSqlOverride = Boolean(item.has_sql_override) || item._isNew;
  if (!hasSqlOverride) {
    if (itemDiffs.length === 0 && sparseDiffs.length === 0) return '';
    queries.push(`REPLACE INTO \`item\` (\`ID\`, \`ClassID\`, \`SubclassID\`, \`Material\`, \`InventoryType\`, \`SheatheType\`, \`SoundOverrideSubclassID\`, \`IconFileDataID\`, \`ItemGroupSoundsID\`, \`VerifiedBuild\`) VALUES ${itemInsertValues(item)};`);
    queries.push(`REPLACE INTO \`item_sparse\` (${ITEM_SPARSE_COLUMNS}) VALUES ${itemSparseInsertValues(item)};`);
  } else {
    if (itemDiffs.length > 0) {
      queries.push(`UPDATE \`item\` SET ${itemDiffs.join(', ')} WHERE (\`ID\` = ${item.entry});`);
    }
    if (sparseDiffs.length > 0) {
      queries.push(`UPDATE \`item_sparse\` SET ${sparseDiffs.join(', ')} WHERE (\`ID\` = ${item.entry});`);
    }
  }
  if (queries.length > 0) {
    queries.push(`REPLACE INTO \`hotfix_data\` (\`Id\`, \`TableHash\`, \`RecordId\`, \`Deleted\`, \`VerifiedBuild\`) VALUES (${item.entry}, ${TABLE_HASH_ITEM}, ${item.entry}, 0, 35662), (${item.entry}, ${TABLE_HASH_ITEM_SPARSE}, ${item.entry}, 0, 35662);`);
  }

  return queries.join('\n');
};

export const isItemModified = (initialItem: any, item: any): boolean => {
  if (!item) return false;
  if (!initialItem) return false;
  if (initialItem._isNew) return true;
  return generateDiffQuery(initialItem, item).trim().length > 0;
};

export const generateFullQuery = (item: any): string => {
  if (!item) return '';

  return `DELETE FROM \`item\` WHERE (\`ID\` = ${item.entry});
INSERT INTO \`item\` (\`ID\`, \`ClassID\`, \`SubclassID\`, \`Material\`, \`InventoryType\`, \`SheatheType\`, \`SoundOverrideSubclassID\`, \`IconFileDataID\`, \`ItemGroupSoundsID\`, \`VerifiedBuild\`)
VALUES ${itemInsertValues(item)};

DELETE FROM \`item_sparse\` WHERE (\`ID\` = ${item.entry});
INSERT INTO \`item_sparse\` (${ITEM_SPARSE_COLUMNS})
VALUES ${itemSparseInsertValues(item)};

DELETE FROM \`hotfix_data\` WHERE (\`Id\` = ${item.entry} AND \`TableHash\` IN (${TABLE_HASH_ITEM}, ${TABLE_HASH_ITEM_SPARSE}));
INSERT INTO \`hotfix_data\` (\`Id\`, \`TableHash\`, \`RecordId\`, \`Deleted\`, \`VerifiedBuild\`) VALUES
(${item.entry}, ${TABLE_HASH_ITEM}, ${item.entry}, 0, 35662),
(${item.entry}, ${TABLE_HASH_ITEM_SPARSE}, ${item.entry}, 0, 35662);`;
};
