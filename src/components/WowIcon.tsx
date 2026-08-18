// Resolves and renders a client icon.
//
// Tries an explicit icon name first, then an item id lookup, then a display id
// lookup, then a per-item-class fallback, in that order.

import React, { useState, useEffect } from 'react';
import displayIconsData from '../data/display_icons.json';
import itemIconsData from '../data/item_icons.json';

const displayIcons: Record<string, string> = displayIconsData as Record<string, string>;
const itemIcons: Record<string, string> = itemIconsData as Record<string, string>;

const CLASS_FALLBACK_ICONS: Record<number, string> = {
  0: 'inv_potion_51',              // Consumable
  1: 'inv_misc_bag_08',             // Container
  2: 'inv_sword_04',                // Weapon
  3: 'inv_misc_gem_variety_01',     // Gem
  4: 'inv_chest_cloth_17',          // Armor
  5: 'inv_misc_dust_02',            // Reagent
  6: 'inv_ammo_arrow_02',           // Projectile
  7: 'inv_misc_gem_variety_02',     // Trade Goods
  8: 'inv_misc_enchantedscroll',    // Item Enhancement
  9: 'inv_scroll_03',               // Recipe
  10: 'inv_misc_coin_01',           // Money
  11: 'inv_misc_quiver_01',         // Quiver
  12: 'inv_misc_book_09',           // Quest
  13: 'inv_misc_key_03',            // Key
  14: 'inv_misc_rune_01',           // Permanent
  15: 'inv_misc_gear_01',           // Miscellaneous
  16: 'inv_glyph_majorwarrior',     // Glyph
  17: 'inv_box_petcarrier_01',      // Battle Pets
  18: 'wow_token01',                // WoW Token
};

const ICON_NAME_ALIASES: Record<string, string> = {
  'taxi': 'ability_mount_gryphon_01',
  'taxigossip': 'ability_mount_gryphon_01',
  'taxigossipicon': 'ability_mount_gryphon_01',
  'ability_mount_gyrocopter': 'ability_mount_gryphon_01',
  'flightmaster': 'ability_mount_gryphon_01',
  'ui_taxi': 'ability_mount_gryphon_01',
  'gyrocopter': 'ability_mount_gyrocoptor',
  'gyrocoptor': 'ability_mount_gyrocoptor',
};

interface WowIconProps {
  itemId?: number | string;
  displayId?: number | string;
  classId?: number;
  iconName?: string;
  className?: string;
  alt?: string;
}

export const WowIcon: React.FC<WowIconProps> = ({
  itemId,
  displayId,
  classId,
  iconName,
  className = 'w-7 h-7',
  alt = 'icon',
}) => {
  const resolveIconName = (): string => {
    if (iconName && iconName.trim()) {
      const clean = iconName.toLowerCase().replace('.tga', '').replace('.blp', '').trim();
      return ICON_NAME_ALIASES[clean] || clean;
    }

    // Check item ID mapping
    if (itemId && itemIcons[String(itemId)]) {
      return itemIcons[String(itemId)];
    }

    // Check display ID mapping
    if (displayId && displayIcons[String(displayId)]) {
      return displayIcons[String(displayId)];
    }

    // Check class fallback
    if (classId !== undefined && CLASS_FALLBACK_ICONS[classId]) {
      return CLASS_FALLBACK_ICONS[classId];
    }

    return 'inv_misc_questionmark';
  };

  const [resolvedName, setResolvedName] = useState<string>(resolveIconName);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setResolvedName(resolveIconName());
    setHasError(false);
  }, [itemId, displayId, classId, iconName]);

  const handleError = () => {
    if (!hasError && resolvedName !== 'inv_misc_questionmark') {
      setHasError(true);
      setResolvedName('inv_misc_questionmark');
    }
  };

  const iconUrl = `https://wow.zamimg.com/images/wow/icons/medium/${resolvedName}.jpg`;

  return (
    <div
      className={`${className} rounded border border-slate-700/80 bg-[#111728] overflow-hidden flex items-center justify-center shadow-sm flex-shrink-0 select-none`}
    >
      <img
        src={iconUrl}
        alt={alt}
        onError={handleError}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
  );
};

export default WowIcon;
