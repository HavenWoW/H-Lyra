# Lyra (HavenCore 8.3.7.35662 Database Editor)

Lyra is a desktop database editor and content tool built for HavenCore (World of Warcraft: Battle for Azeroth 8.3.7.35662).

It runs on Tauri v2 with a Rust backend and a React/TypeScript frontend.

## Features

### SQL Editor & Database Integration
* Connects to the world and hotfix databases (`bfa_world`, `bfa_hotfixes`), both configurable on the connection screen.
* Atomic transaction execution for multi-statement operations (e.g. DELETE followed by INSERT).
* Dedicated SQL console with query execution, line numbers, table schema inspection, and live status.
* Statements are routed to the correct database by their target table, with a manual override.
* Every editor shares one query bar: Diff/Full query modes, a monospace preview, copy, execute, execute &amp; copy, and reload.

### Creature Editor
* Complete coverage of creature template tables and relationships:
  * Base Template and Addon (`creature_template`, `creature_template_addon`)
  * Scaling properties and model records (`creature_template_model`)
  * Equipped items, trainer spells, vendor items, on-kill rewards, and gossip/quest relations
  * Loot tables (creature, pickpocketing, and skinning)
  * World spawns, spawn addons, and formation groups
  * Embedded SmartAI scripts and creature texts

### Quest Editor
* Full 123-column `quest_template` schema support.
* Normalized `quest_objectives` management covering all 18 BFA objective types.
* Sub-tabs for Addon, Objectives, Rewards, Offer Reward, Request Items, Relations, and POI locations.

### GameObject Editor
* Full GameObject template management with contextual decoding for `Data0` through `Data33` across all 58 GameObject types.
* Sub-tabs for Addon, Quest Items, Loot, Spawns, Spawn Addon, and embedded SmartAI scripts.

### Item Editor and DB2 Server Catalog
* High-performance in-memory DB2 reader for server binary data (`Item.db2`, `ItemSparse.db2`, `ItemEffect.db2`, `Faction.db2`, `FactionTemplate.db2`, `Emotes.db2`, `EmotesText.db2`) with header validation (FileDataId, TableHash, LayoutHash).
* Unified merge layer that reads base server DB2 data and overlays live SQL overrides from `bfa_hotfixes.item` and `bfa_hotfixes.item_sparse`.
* Item effect editor with `ParentItemID` relational binding and `hotfix_data` registration.
* Dynamic entity selectors backed by both base DB2 datasets and MySQL hotfixes (factions, faction templates, emotes, spell names, display models).

### SmartAI Editor
* Full support for BFA 8.3.7 parameter structures:
  * Events: 0 to 81
  * Actions: 0 to 142, 201 to 215, 1005
  * Targets: 0 to 29, 100
* Real-time parameter tooltips and contextual labels based on event and action types.
* Line reordering, duplication, and dual Diff/Full SQL query generation.

## Project Structure

```
Lyra/
├── src/                          # Frontend Application (React, TypeScript, Tailwind)
│   ├── components/               # Shared UI elements and selector dialogs
│   ├── features/                 # Editor modules
│   │   ├── auth/                 # Database connection screen
│   │   ├── creature/             # Creature editor module
│   │   ├── quest/                # Quest editor module
│   │   ├── gameobject/           # GameObject editor module
│   │   ├── item/                 # Item editor and DB2 merge viewer
│   │   ├── smartai/              # SmartAI script editor
│   │   ├── loot/                 # Loot template editor
│   │   ├── hotfixes/             # DB2 and hotfix table inspector
│   │   ├── dashboard/            # Landing view
│   │   ├── tools/                # Utility views
│   │   └── sql-editor/           # SQL console
│   ├── lib/                      # IPC bindings and the shared SQL, schema and bitmask helpers
│   └── types/                    # Data models and schema definitions
├── src-tauri/                    # Backend (Rust, Tauri v2)
│   ├── src/
│   │   ├── db/                   # Connection pool and query runner (sqlx)
│   │   ├── db2/                  # DB2 binary parser and effective item repository
│   │   ├── generators/           # SQL generators
│   │   └── lib.rs                # Tauri command handlers
│   ├── Cargo.toml
│   └── tauri.conf.json
├── docs/                         # Verified reference notes on the schema and client data
├── package.json
└── README.md
```

## Reference Documentation

`docs/` holds verified technical notes gathered while building the editors:
database table layouts with signedness and nullability, DB2/WDC3 container and
record decoding, the hotfix overlay model, and the implementation rules the
editors follow. Start at [docs/INDEX.md](docs/INDEX.md).

## Building from Source

### Prerequisites
* Node.js (v18.0.0 or higher)
* Rust toolchain (`rustc` and `cargo` 1.75+)
* Visual Studio C++ Build Tools and WebView2 (Windows)

### Commands
```bash
# Install frontend dependencies
npm install

# Run frontend in development mode
npm run dev

# Run Tauri desktop application in development mode
npm run tauri dev

# Build production bundle
npm run build
```

## Credits
Lyra was created by Harkon for the HavenCore community to assist in the development of the core.
Lyra is open source and released under the GNU General Public License v3.0.

## License
Licensed under the GNU General Public License v3.0.
