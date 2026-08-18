# HavenCore Knowledge Base

Verified, reusable technical notes about HavenCore BFA, written so they stand on
their own. Each document records behaviour that was checked against the core's
own implementation and, where relevant, against real client data.

This is a research cache, not an authority. Where a document and HavenCore
disagree, HavenCore is right and the document must be corrected.

## DB2 / Client Data

| Document | Covers |
| --- | --- |
| [DB2/WDC3-Format.md](DB2/WDC3-Format.md) | Container layout, block ordering, the six column storage modes, packed data offsets, arrays, strings, id tables, copy tables, parent lookups, encrypted sections, locale masks |
| [DB2/Sparse-Records.md](DB2/Sparse-Records.md) | Offset-map records, per-record field offset walking, stored widths from field entries, inline strings |
| [DB2/Item-ItemSparse-ItemEffect.md](DB2/Item-ItemSparse-ItemEffect.md) | Column layouts of the three item tables, their relationships, the appended parent column, pallet high-bit traps |
| [DB2/Hotfix-Overlay.md](DB2/Hotfix-Overlay.md) | Client base data, hotfix database overrides, effective values, provenance and id allocation |

## Database

| Document | Covers |
| --- | --- |
| [Database/Creature-Template.md](Database/Creature-Template.md) | All 81 `creature_template` columns with types, signedness, nullability and defaults; which columns the core ignores; loader field indices; the values the loader corrects; difficulty-entry consistency rules |
| [Database/Creature-Related-Tables.md](Database/Creature-Related-Tables.md) | The template-keyed versus spawn-keyed split, addon/equip/model/text/trainer/vendor/formation/on-kill layouts, the signed anim-kit and reputation columns, 64-bit guids, and the text columns that need escaping |
| [Database/Quest-Template.md](Database/Quest-Template.md) | All 123 `quest_template` columns with types, signedness, nullability and defaults; loader field indices; `VerifiedBuild` unread; the `RewardItem`/`ItemDrop` SELECT-order quirk; the values the loader corrects; the overloaded FlagsEx world-quest bit; the absence of `ContentTuningID` |
| [Database/Quest-Related-Tables.md](Database/Quest-Related-Tables.md) | Layout and loader behaviour for the addon (and its `quest_mail_sender` join), objectives, visual effects, details, offer reward, request items, greeting, POI and POI points, relation and locale tables; load order; reserved-word columns |
| [Database/GameObject-Template.md](Database/GameObject-Template.md) | All 46 `gameobject_template` columns with types, signedness and all-NOT-NULL text; the polymorphic `Data0`–`Data33` columns and how the 58 GameObject types redefine them; the reference→picker mapping; the loader's validate-and-log helpers and the `chairheight` fix; `VerifiedBuild` unread |
| [Database/GameObject-Related-Tables.md](Database/GameObject-Related-Tables.md) | Layout and loader behaviour for `gameobject_template_addon`, `gameobject_questitem` (composite key), `gameobject_loot_template`, and the `gameobject` spawn table; load order |
| [Database/Item-Tables.md](Database/Item-Tables.md) | The hotfix-database item tables and how an item is assembled from several of them; the signed `AllowableClass` / `AllowableRace` / `Flags1-4` columns and the `-1` "no restriction" sentinel; why `AllowableClass` is 16-bit in `ItemSparse` but 32-bit in `ItemSearchName`; the `32767` clamp signature; nullable text columns |

## SmartAI

| Document | Covers |
| --- | --- |
| [SmartAI/SmartAI-Scripts.md](SmartAI/SmartAI-Scripts.md) | `smart_scripts` layout and composite identity; entry versus negated-guid addressing; the real event/action/target ranges including the 201–215, 1005 and 100 outliers; `event_param5` and `event_param_string`; phase and flag bitmasks; the 8-bit phase-mask read that truncates phases 9–12; loader skip rules |

## Implementation

Lyra-specific requirements derived from HavenCore behavior. Reserve `Core/` for
documents about HavenCore's own mechanics with no Lyra-specific content.

| Document | Covers |
| --- | --- |
| [Implementation/Lyra-DB2-Requirements.md](Implementation/Lyra-DB2-Requirements.md) | DB2 subsystem architecture, validation policy, the decoding traps that fail silently, verification requirements |
| [Implementation/Lyra-SQL-Editor-Requirements.md](Implementation/Lyra-SQL-Editor-Requirements.md) | Schema-driven editors, lossless full queries, NULL versus empty string, escaping, 64-bit and locale-safe numbers, unknown flag-bit preservation, post-execute re-read |

## Conventions

- Documents are self-contained: no local paths, no workstation details, no
  references to unrelated tooling.
- Source references use repository-relative paths and HavenCore symbol names.
- Observations tied to one client build are labelled as such.
