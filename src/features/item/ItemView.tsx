// Item module coordinator.
//
// Routes between the select screen, the item editor and the sub-views, and
// resolves the effective item by layering SQL hotfixes over the DB2 base.

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/ipc';
import { escapeSqlString } from '../../lib/sql';
import { ItemViewProps } from './types';
import { ItemSelectScreen } from './components/ItemSelectScreen';
import { ItemDetailEditor } from './components/ItemDetailEditor';
import { ItemEffectsView } from './components/ItemEffectsView';
import { ItemEnchantmentView } from './components/ItemEnchantmentView';
import { ItemLootView } from './components/ItemLootView';

export const ItemView: React.FC<ItemViewProps> = ({
  selectedItem: propSelectedItem,
  onSelectItem: propOnSelectItem,
  activeSubTab = 'select',
  onNavigateSubItem,
  onSetDirty,
  onOpenSettings,
}) => {
  // DB2 & ClientData State
  const [catalogStats, setCatalogStats] = useState<any>({
    db2_base_items: 0,
    sql_hotfix_items: 0,
    effective_items_count: 0,
  });

  // Search & Catalog Filter State
  const [searchId, setSearchId] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchLimit, setSearchLimit] = useState(50);
  const [filterQuality, setFilterQuality] = useState<number | undefined>(undefined);
  const [filterClass, setFilterClass] = useState<number | undefined>(undefined);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);

  // Editor State
  const defaultItem = {
    entry: 158075,
    class: 4, // Armor
    subclass: 0,
    name: 'Heart of Azeroth',
    displayid: 175240,
    Quality: 6, // Artifact
    Flags: 0,
    FlagsExtra: 0,
    BuyCount: 1,
    BuyPrice: 0,
    SellPrice: 0,
    InventoryType: 2, // Neck
    AllowableClass: -1,
    AllowableRace: -1,
    ItemLevel: 50,
    RequiredLevel: 110,
    RequiredSkill: 0,
    RequiredSkillRank: 0,
    RequiredReputationFaction: 0,
    RequiredReputationRank: 0,
    maxcount: 0,
    stackable: 1,
    ContainerSlots: 0,
    StatsCount: 0,
    bonding: 1,
    description: '',
    pageText: 0,
    LanguageID: 0,
    PageMaterial: 0,
    startquest: 0,
    lockid: 0,
    Material: 4,
    sheath: 0,
    RandomProperty: 0,
    RandomSuffix: 0,
    itemset: 0,
    MaxDurability: 0,
    area: 0,
    Map: 0,
    BagFamily: 0,
    TotemCategory: 0,
    socketColor_1: 0,
    socketContent_1: 0,
    socketColor_2: 0,
    socketContent_2: 0,
    socketColor_3: 0,
    socketContent_3: 0,
    socketBonus: 0,
    GemProperties: 0,
    RequiredDisenchantSkill: -1,
    ArmorDamageModifier: 0,
    Duration: 0,
    ItemLimitCategory: 0,
    HolidayId: 0,
    StatScalingFactor: 0,
    CurrencySubstitutionId: 0,
    CurrencySubstitutionCount: 0,
    ItemNameDescriptionID: 0,
    flags_custom: 0,
    dmg_variance: 0,
    duration_in_inventory: 0,
    quality_modifier: 0,
    item_range: 0,
    price_variance: 0,
    price_random_value: 0,
    faction_related: 0,
    required_transmog_holiday: 0,
    instance_bound: 0,
    zone_bound_1: 0,
    zone_bound_2: 0,
    scaling_stat_distribution_id: 0,
    min_faction_id: 0,
    required_pvp_medal: 0,
    required_pvp_rank: 0,
    damage_damage_type: 0,
    sound_override_subclass_id: 0,
    item_group_sounds_id: 0,
    artifact_id: 0,
  };

  const [item, setItem] = useState<any>(propSelectedItem || defaultItem);
  const [initialItem, setInitialItem] = useState<any>(propSelectedItem ? JSON.parse(JSON.stringify(propSelectedItem)) : null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (propSelectedItem) {
      setItem(propSelectedItem);
      setInitialItem(JSON.parse(JSON.stringify(propSelectedItem)));
    }
  }, [propSelectedItem]);

  useEffect(() => {
    onSetDirty?.('items:template', isDirty);
  }, [isDirty, onSetDirty]);

  // Initial load of catalog stats
  const loadStats = async () => {
    try {
      const stats = await api.getCatalogStats([]);
      if (stats) setCatalogStats(stats);
    } catch (e) {
      console.error('Failed to load DB2 catalog stats:', e);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const getSearchQuery = () => {
    // Display-only snippet for the select screen's query bar; execution is
    // handled by the Rust EffectiveItemRepository (single merge point).
    let whereClauses: string[] = [];
    if (searchId.trim()) {
      whereClauses.push(`(s.\`ID\` LIKE '%${searchId.trim()}%')`);
    }
    if (searchName.trim()) {
      const safe = escapeSqlString(searchName.trim());
      whereClauses.push(`(s.\`Display\` LIKE '%${safe}%')`);
    }
    const whereSql = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : '';
    const limit = Number(searchLimit) || 50;
    return {
      sql: `SELECT s.\`ID\`, s.\`Display\`, s.\`OverallQualityID\`, s.\`ItemLevel\`, s.\`RequiredLevel\`, s.\`InventoryType\`, i.\`ClassID\` as class, i.\`SubclassID\` as subclass, COALESCE(NULLIF(i.\`IconFileDataID\`, 0), app.\`ItemDisplayInfoID\`, app.\`DefaultIconFileDataID\`, 0) as displayid FROM \`item_sparse\` s LEFT JOIN \`item\` i ON s.\`ID\` = i.\`ID\` LEFT JOIN \`item_modified_appearance\` ima ON ima.\`ItemID\` = s.\`ID\` LEFT JOIN \`item_appearance\` app ON app.\`ID\` = ima.\`ItemAppearanceID\`${whereSql} GROUP BY s.\`ID\` ORDER BY s.\`ID\` ASC LIMIT ${limit};`,
      hasWhere: whereClauses.length > 0,
      whereText: whereClauses.join(' AND '),
      limit,
    };
  };

  const handleSearch = async () => {
    setSearching(true);
    try {
      // Delegates SQL fetch + DB2 merge to the Rust EffectiveItemRepository.
      const effectiveResults = await api.searchEffectiveItems({
        search_id: searchId,
        search_name: searchName,
        limit: Number(searchLimit) || 50,
        quality: filterQuality,
        class_id: filterClass,
      }) as any[];

      const finalMapped = effectiveResults.map((r: any) => ({
        entry: r.entry,
        name: r.name,
        displayid: r.displayid || 0,
        class: r.class_id ?? r.class ?? null,
        subclass: r.subclass_id ?? r.subclass ?? null,
        Quality: r.quality ?? r.Quality ?? 1,
        ItemLevel: r.item_level ?? r.ItemLevel ?? 0,
        RequiredLevel: r.required_level ?? r.RequiredLevel ?? 0,
        InventoryType: r.inventory_type ?? r.InventoryType ?? 0,
        source_kind: r.source_kind ?? 'Db2Base',
        source_badge: r.source_badge ?? 'DB2 Base',
      }));

      setSearchResults(finalMapped);
    } catch (e) {
      console.error('Failed to search items in effective catalog:', e);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectExistingItem = async (selectedRow: any) => {
    try {
      // Single merge point: EffectiveItemRepository fetches SQL hotfix rows and
      // blends them over the DB2 base, returning all provenance layers.
      const eff = await api.getEffectiveItem(selectedRow.entry);
      if (!eff) {
        // Neither SQL nor DB2 resolved the item; keep whatever the row carried.
        const fallback = { ...item, ...selectedRow };
        setItem(fallback);
        setInitialItem(JSON.parse(JSON.stringify(fallback)));
        setIsDirty(false);
        if (propOnSelectItem) propOnSelectItem(fallback);
        if (onNavigateSubItem) onNavigateSubItem('template');
        return;
      }

      // SQL overlay wins per-field; DB2 base fills the gaps.
      const sp = eff.sql_sparse ?? eff.db2_sparse;
      const it = eff.sql_item ?? eff.db2_item;
      const resolvedClass = it?.class_id !== undefined && it.class_id !== null ? Number(it.class_id) : (selectedRow.class ?? null);
      const resolvedSubclass = it?.subclass_id !== undefined && it.subclass_id !== null ? Number(it.subclass_id) : (selectedRow.subclass ?? null);
      const resolvedDisplayId = eff.displayid || (it && it.icon_file_data_id) || selectedRow.displayid || selectedRow.display_id || 0;

      const loaded = {
        ...item,
        entry: eff.entry,
        name: eff.name,
        description: sp?.description || '',
        Quality: eff.quality,
        ItemLevel: eff.item_level,
        RequiredLevel: eff.required_level,
        InventoryType: it ? Number(it.inventory_type) : (sp?.inventory_type ?? 0),
        BuyPrice: eff.buy_price,
        SellPrice: eff.sell_price,
        BuyCount: sp?.vendor_stack_count || 1,
        stackable: eff.stackable,
        maxcount: eff.max_count,
        bonding: eff.bonding,
        AllowableClass: sp?.allowable_class ?? -1,
        AllowableRace: sp?.allowable_race ?? -1,
        class: resolvedClass,
        subclass: resolvedSubclass,
        displayid: resolvedDisplayId,
        Material: it ? Number(it.material) : (sp?.material || 0),
        sheath: it ? Number(it.sheathe_type) : (sp?.sheathe_type || 0),
        Flags: sp?.flags ? (sp.flags[0] ?? 0) : 0,
        FlagsExtra: sp?.flags ? (sp.flags[1] ?? 0) : 0,
        BagFamily: sp?.bag_family || 0,
        ContainerSlots: eff.container_slots,
        Duration: sp?.duration_in_inventory || 0,
        startquest: sp?.start_quest_id || 0,
        itemset: sp?.item_set || 0,
        lockid: sp?.lock_id || 0,
        PageText: sp?.page_id || 0,
        PageMaterial: sp?.page_material_id || 0,
        LanguageID: sp?.language_id || 0,
        TotemCategory: sp?.totem_category_id || 0,
        ItemLimitCategory: sp?.limit_category || 0,
        GemProperties: sp?.gem_properties || 0,
        RequiredSkill: sp?.required_skill || 0,
        RequiredSkillRank: sp?.required_skill_rank || 0,
        RequiredReputationFaction: sp?.min_faction_id || 0,
        RequiredReputationRank: sp?.min_reputation || 0,
        StatScalingFactor: sp?.scaling_stat_distribution_id || 0,
        stat_type1: sp?.stat_modifier_bonus_stat ? (sp.stat_modifier_bonus_stat[0] ?? 0) : 0,
        stat_value1: sp?.stat_percent_editor ? (sp.stat_percent_editor[0] ?? 0) : 0,
        stat_type2: sp?.stat_modifier_bonus_stat ? (sp.stat_modifier_bonus_stat[1] ?? 0) : 0,
        stat_value2: sp?.stat_percent_editor ? (sp.stat_percent_editor[1] ?? 0) : 0,
        stat_type3: sp?.stat_modifier_bonus_stat ? (sp.stat_modifier_bonus_stat[2] ?? 0) : 0,
        stat_value3: sp?.stat_percent_editor ? (sp.stat_percent_editor[2] ?? 0) : 0,
        stat_type4: sp?.stat_modifier_bonus_stat ? (sp.stat_modifier_bonus_stat[3] ?? 0) : 0,
        stat_value4: sp?.stat_percent_editor ? (sp.stat_percent_editor[3] ?? 0) : 0,
        socketColor_1: sp?.socket_type ? (sp.socket_type[0] ?? 0) : 0,
        socketColor_2: sp?.socket_type ? (sp.socket_type[1] ?? 0) : 0,
        socketColor_3: sp?.socket_type ? (sp.socket_type[2] ?? 0) : 0,
        socketBonus: sp?.socket_match_enchantment_id || 0,
        // Provenance + full merged base layers so the SQL generators can emit a
        // diff-only overlay (overwrite nothing the user didn't touch) instead of
        // a default-wiping full override.
        has_db2_base: Boolean(eff.has_db2_base || eff.is_custom === false),
        has_sql_override: Boolean(eff.has_sql_override),
        is_custom: Boolean(eff.is_custom),
        source_kind: eff.source_kind,
        _itemBase: it,
        _sparseBase: sp,
      };
      setItem(loaded);
      setInitialItem(JSON.parse(JSON.stringify(loaded)));
      setIsDirty(false);
      if (propOnSelectItem) propOnSelectItem(loaded);
      if (onNavigateSubItem) onNavigateSubItem('template');
    } catch (err) {
      console.error('Failed to load item detail from effective catalog:', err);
      setItem(selectedRow);
      setInitialItem(JSON.parse(JSON.stringify(selectedRow)));
      setIsDirty(false);
      if (propOnSelectItem) propOnSelectItem(selectedRow);
    }
  };

  const handleCreateNewItem = (selectedId: number) => {
    const blank = {
      entry: selectedId,
      class: 4, // Armor
      subclass: 0,
      name: `New Item (${selectedId})`,
      displayid: 0,
      Quality: 1, // Common
      Flags: 0,
      FlagsExtra: 0,
      BuyCount: 1,
      BuyPrice: 0,
      SellPrice: 0,
      InventoryType: 0,
      AllowableClass: -1,
      AllowableRace: -1,
      ItemLevel: 1,
      RequiredLevel: 1,
      RequiredSkill: 0,
      RequiredSkillRank: 0,
      RequiredSpell: 0,
      RequiredHonorRank: 0,
      RequiredCityRank: 0,
      RequiredReputationFaction: 0,
      RequiredReputationRank: 0,
      maxcount: 0,
      stackable: 1,
      ContainerSlots: 0,
      stat_type1: 0,
      stat_value1: 0,
      stat_type2: 0,
      stat_value2: 0,
      stat_type3: 0,
      stat_value3: 0,
      stat_type4: 0,
      stat_value4: 0,
      armor: 0,
      bonding: 0,
      description: '',
      PageText: 0,
      LanguageID: 0,
      PageMaterial: 0,
      startquest: 0,
      lockid: 0,
      Material: 4,
      sheath: 0,
      itemset: 0,
      BagFamily: 0,
      TotemCategory: 0,
      socketColor_1: 0,
      socketColor_2: 0,
      socketColor_3: 0,
      socketBonus: 0,
      GemProperties: 0,
      Duration: 0,
      ItemLimitCategory: 0,
      HolidayId: 0,
      StatScalingFactor: 0,
      artifact_id: 0,
      _isNew: true,
    };
    setItem(blank);
    setInitialItem({ ...blank });
    setIsDirty(true);
    if (propOnSelectItem) propOnSelectItem(blank);
    if (onNavigateSubItem) onNavigateSubItem('template');
  };

  // Select Item Screen
  if (activeSubTab === 'select' || !propSelectedItem) {
    return (
      <>
        <ItemSelectScreen
          catalogStats={catalogStats}
          searchId={searchId}
          setSearchId={setSearchId}
          searchName={searchName}
          setSearchName={setSearchName}
          searchLimit={searchLimit}
          setSearchLimit={setSearchLimit}
          filterQuality={filterQuality}
          setFilterQuality={setFilterQuality}
          filterClass={filterClass}
          setFilterClass={setFilterClass}
          searchResults={searchResults}
          searching={searching}
          onSearch={handleSearch}
          onSelectExistingItem={handleSelectExistingItem}
          onCreateNewItem={handleCreateNewItem}
          onOpenDb2Settings={onOpenSettings || (() => {})}
          getSearchQueryInfo={getSearchQuery}
        />
      </>
    );
  }

  // Item Effects / Spells
  if (activeSubTab === 'effects') {
    return (
      <ItemEffectsView
        item={item}
        onNavigateBack={() => {
          if (onNavigateSubItem) onNavigateSubItem('template');
        }}
        onSetDirty={(dirty) => onSetDirty?.('items:effects', dirty)}
      />
    );
  }

  // Enchantments
  if (activeSubTab === 'enchantment' || activeSubTab === 'enchantments') {
    return (
      <ItemEnchantmentView
        item={item}
        onNavigateBack={() => {
          if (onNavigateSubItem) onNavigateSubItem('template');
        }}
      />
    );
  }

  // Loot sub-tabs: loot, disenchant, prospecting, milling and scrapping
  if (
    activeSubTab === 'loot' ||
    activeSubTab === 'disenchant' ||
    activeSubTab === 'prospecting' ||
    activeSubTab === 'milling' ||
    activeSubTab === 'scrapping'
  ) {
    return (
      <ItemLootView
        item={item}
        lootType={activeSubTab as any}
        onNavigateBack={() => {
          if (onNavigateSubItem) onNavigateSubItem('template');
        }}
        onSetDirty={(dirty) => onSetDirty?.(`items:${activeSubTab}`, dirty)}
      />
    );
  }

  // Default view: the item template detail editor
  return (
    <ItemDetailEditor
      item={item}
      setItem={setItem}
      initialItem={initialItem}
      setInitialItem={setInitialItem}
      isDirty={isDirty}
      setIsDirty={setIsDirty}
      onNavigateBack={() => {
        if (propOnSelectItem) propOnSelectItem(null);
        if (onNavigateSubItem) onNavigateSubItem('select');
      }}
    />
  );
};
export default ItemView;
