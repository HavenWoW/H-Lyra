// Typed wrapper around the Tauri commands.
//
// Multi-statement SQL is split and run inside one transaction, so a generated
// DELETE plus INSERT either applies completely or not at all. Every helper
// degrades to a safe empty result when the application runs outside Tauri.

import { invoke } from '@tauri-apps/api/core';
import type {
  DbConfig,
  QueryResult,
  TableColumnInfo,
  TableSummary,
  SmartActionDefinition,
  SmartEventDefinition,
  SmartScriptRow,
  SmartTargetDefinition,
} from '../types';

export const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

export const api = {
  connectDatabases: async (config: DbConfig): Promise<void> => {
    if (isTauri()) {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Connection timed out after 4 seconds connecting to MySQL at ${config.host}:${config.port}. Please verify that MySQL is active.`)),
          4000
        )
      );
      await Promise.race([
        invoke('connect_databases', { config }),
        timeoutPromise,
      ]);
    }
  },

  validateDatabaseSchema: async (): Promise<any> => {
    if (isTauri()) {
      return await invoke<any>('validate_database_schema');
    }
    return {
      passed_count: 3,
      warning_count: 0,
      failed_count: 0,
      items: [
        { name: "SmartAI Parameters", table: "smart_scripts", status: "PASSED", message: "Parameter schema active" },
        { name: "Creature Display Models", table: "creature_template_model", status: "PASSED", message: "Model schema active" },
        { name: "Quest Objectives", table: "quest_objectives", status: "PASSED", message: "Objective schema active" },
      ],
    };
  },

  executeSql: async (dbType: string, sql: string): Promise<QueryResult> => {
    if (isTauri()) {
      // If the query contains multiple statements (e.g. DELETE + INSERT + REPLACE),
      // execute them atomically inside a single database transaction via execute_sql_batch.
      const statements = sql
        .split(/;\s*[\r\n]+/)
        .map((s) => s.trim().replace(/;$/, ''))
        .filter((s) => s.length > 0 && !s.startsWith('--'));

      if (statements.length > 1) {
        const res = await invoke<QueryResult>('execute_sql_batch', { dbType, statements });
        if (!res.success) {
          throw new Error(res.error || `Batch transaction query failed on \`${dbType}\`.`);
        }
        return res;
      }

      const res = await invoke<QueryResult>('execute_sql', { dbType, sql });
      if (!res.success) {
        throw new Error(res.error || `Database query failed on \`${dbType}\`.`);
      }
      return res;
    }
    return {
      success: true,
      columns: ['id', 'name', 'status'],
      rows: [[1, 'Mock Entry 1', 'Active'], [2, 'Mock Entry 2', 'Testing']],
      affected_rows: 2,
      execution_time_ms: 12,
    };
  },

  executeBatch: async (dbType: string, statements: string[]): Promise<QueryResult> => {
    if (isTauri()) {
      const res = await invoke<QueryResult>('execute_sql_batch', { dbType, statements });
      if (!res.success) {
        throw new Error(res.error || `Batch query failed on \`${dbType}\`.`);
      }
      return res;
    }
    return {
      success: true,
      columns: [],
      rows: [],
      affected_rows: 0,
      execution_time_ms: 0,
    };
  },

  getDatabaseTables: async (dbType: string): Promise<TableSummary[]> => {
    if (isTauri()) {
      return await invoke<TableSummary[]>('get_database_tables', { dbType });
    }
    return [
      { table_name: 'creature_template', row_count: 50420, data_size_bytes: 32000000 },
      { table_name: 'smart_scripts', row_count: 145000, data_size_bytes: 15000000 },
      { table_name: 'quest_template', row_count: 22000, data_size_bytes: 18000000 },
      { table_name: 'conditions', row_count: 8500, data_size_bytes: 700000 },
    ];
  },

  getTableSchema: async (dbType: string, tableName: string): Promise<TableColumnInfo[]> => {
    if (isTauri()) {
      return await invoke<TableColumnInfo[]>('get_table_schema', { dbType, tableName });
    }
    return [
      { name: 'entry', data_type: 'mediumint(8) unsigned', is_nullable: false, column_key: 'PRI', default_value: '0', comment: '' },
      { name: 'name', data_type: 'char(200)', is_nullable: false, column_key: '', default_value: '', comment: '' },
    ];
  },

  getSmartEvents: async (): Promise<SmartEventDefinition[]> => {
    if (isTauri()) {
      return await invoke<SmartEventDefinition[]>('get_smart_events');
    }
    return [];
  },

  getSmartActions: async (): Promise<SmartActionDefinition[]> => {
    if (isTauri()) {
      return await invoke<SmartActionDefinition[]>('get_smart_actions');
    }
    return [];
  },

  getSmartTargets: async (): Promise<SmartTargetDefinition[]> => {
    if (isTauri()) {
      return await invoke<SmartTargetDefinition[]>('get_smart_targets');
    }
    return [];
  },

  generateSmartAiSql: async (
    entryorguid: number,
    sourceType: number,
    rows: SmartScriptRow[]
  ): Promise<string> => {
    if (isTauri()) {
      return await invoke<string>('generate_smart_ai_sql', {
        entryorguid,
        sourceType,
        rows,
      });
    }
    return `-- Generated SmartScript SQL for Entry/GUID ${entryorguid}\nDELETE FROM smart_scripts WHERE entryorguid=${entryorguid} AND source_type=${sourceType};\n`;
  },

  createMigrationFile: async (
    description: string,
    author: string,
    sqlBody: string
  ): Promise<[string, string]> => {
    if (isTauri()) {
      return await invoke<[string, string]>('create_migration_file', {
        description,
        author,
        sqlBody,
      });
    }
    const filename = `2026_08_15_01_${description.toLowerCase().replace(/ /g, '_')}.sql`;
    return [filename, sqlBody];
  },

  openUrl: async (url: string): Promise<void> => {
    if (!isTauri()) {
      window.open(url, '_blank');
      return;
    }
    try {
      await invoke('open_url', { url });
    } catch {
      window.open(url, '_blank');
    }
  },

  saveAppConfig: async (payload: {
    config: DbConfig;
    save_password: boolean;
    remember_me: boolean;
  }): Promise<void> => {
    if (isTauri()) {
      try {
        await invoke('save_app_config', { payload });
      } catch (e) {
        console.error('Failed to save app config to AppData:', e);
      }
    }
  },

  loadAppConfig: async (): Promise<{
    config: DbConfig;
    save_password: boolean;
    remember_me: boolean;
  } | null> => {
    if (isTauri()) {
      try {
        const res = await invoke<any>('load_app_config');
        if (res) return res;
      } catch (e) {
        console.error('Failed to load app config from AppData:', e);
      }
    }
    return null;
  },

  clearAppConfig: async (): Promise<void> => {
    if (isTauri()) {
      try {
        await invoke('clear_app_config');
      } catch (e) {
        console.error('Failed to clear app config from AppData:', e);
      }
    }
  },

  minimizeWindow: async (): Promise<void> => {
    if (isTauri()) {
      try {
        await invoke('minimize_window');
        return;
      } catch {}
    }
  },

  toggleFullscreen: async (): Promise<void> => {
    if (isTauri()) {
      try {
        await invoke('toggle_fullscreen');
        return;
      } catch {}
    }
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  },

  toggleDevtools: async (): Promise<void> => {
    if (isTauri()) {
      try {
        await invoke('toggle_devtools');
        return;
      } catch {}
    }
    console.log('Toggle Developer Tools');
  },

  getDb2Config: async (): Promise<{
    data_dir: string;
    locale: string;
    detected_path?: string;
    item_db2_found: boolean;
    item_sparse_db2_found: boolean;
    status_message: string;
  }> => {
    if (isTauri()) {
      try {
        return await invoke('get_db2_config');
      } catch {}
    }
    return {
      data_dir: '.\\ClientData',
      locale: 'enUS',
      detected_path: '.\\ClientData\\dbc\\enUS',
      item_db2_found: false,
      item_sparse_db2_found: false,
      status_message: 'Physical DB2 files read-only catalog (BFA 8.3.7.35662)',
    };
  },

  setDb2Config: async (
    dataDir: string,
    locale: string
  ): Promise<{
    data_dir: string;
    locale: string;
    detected_path?: string;
    item_db2_found: boolean;
    item_sparse_db2_found: boolean;
    status_message: string;
  }> => {
    if (isTauri()) {
      try {
        return await invoke('set_db2_config', { dataDir, locale });
      } catch {}
    }
    return {
      data_dir: dataDir,
      locale,
      detected_path: `${dataDir}\\dbc\\${locale}`,
      item_db2_found: false,
      item_sparse_db2_found: false,
      status_message: `Configured path ${dataDir}\\dbc\\${locale}`,
    };
  },

  getCatalogStats: async (
    sqlHotfixIds: number[]
  ): Promise<{
    db2_base_items: number;
    sql_hotfix_items: number;
    effective_items_count: number;
    data_dir: string;
    locale: string;
    is_db2_loaded: boolean;
  }> => {
    if (isTauri()) {
      try {
        return await invoke('get_catalog_stats', { sqlHotfixIds });
      } catch {}
    }
    const uniqueIds = new Set(sqlHotfixIds);
    return {
      db2_base_items: 0,
      sql_hotfix_items: uniqueIds.size,
      effective_items_count: uniqueIds.size,
      data_dir: '.\\ClientData',
      locale: 'enUS',
      is_db2_loaded: false,
    };
  },

  // The Rust EffectiveItemRepository owns the SQL fetch + DB2 merge; only the
  // filter query is sent over IPC.
  searchEffectiveItems: async (query: {
    search_id?: string;
    search_name?: string;
    limit?: number;
    class_id?: number;
    subclass_id?: number;
    quality?: number;
  }): Promise<any[]> => {
    if (isTauri()) {
      try {
        return await invoke<any[]>('search_effective_items', { query });
      } catch {}
    }
    return [];
  },

  searchEffectiveFactions: async (term: string): Promise<any[]> => {
    if (isTauri()) {
      try {
        return await invoke<any[]>('search_effective_factions', { term });
      } catch {}
    }
    return [];
  },

  searchEffectiveFactionTemplates: async (term: string): Promise<[number, string, number][]> => {
    if (isTauri()) {
      try {
        return await invoke<[number, string, number][]>('search_effective_faction_templates', { term });
      } catch {}
    }
    return [];
  },

  searchEffectiveEmotes: async (term: string): Promise<[number, string][]> => {
    if (isTauri()) {
      try {
        return await invoke<[number, string][]>('search_effective_emotes', { term });
      } catch {}
    }
    return [];
  },

  getEffectiveItem: async (itemId: number): Promise<any> => {
    if (isTauri()) {
      try {
        return await invoke<any>('get_effective_item', { itemId });
      } catch {}
    }
    return null;
  },

  getItemEffects: async (itemId: number): Promise<any[]> => {
    if (isTauri()) {
      try {
        return await invoke<any[]>('get_item_effects', { itemId });
      } catch {}
    }
    return [];
  },

  getNextEffectId: async (): Promise<number> => {
    if (isTauri()) {
      try {
        return await invoke<number>('get_next_effect_id');
      } catch {}
    }
    return 0;
  },

  getNextEntityId: async (dbType: string, tableName: string, idColumn: string): Promise<number> => {
    if (isTauri()) {
      try {
        return await invoke<number>('get_next_entity_id', { dbType, tableName, idColumn });
      } catch (e) {
        console.warn('Backend get_next_entity_id failed, falling back to SQL query:', e);
      }
    }
    // Fallback: run query directly
    try {
      const res = await api.executeSql(dbType, `SELECT COALESCE(MAX(\`${idColumn}\`), 0) + 1 AS next_id FROM \`${tableName}\`;`);
      if (res && res.rows && res.rows.length > 0) {
        return Number(res.rows[0][0]) || 1;
      }
    } catch {}
    return 1;
  },

  selectFolder: async (): Promise<string | null> => {
    if (isTauri()) {
      try {
        return await invoke<string | null>('select_folder');
      } catch (e) {
        console.error('Failed to select folder:', e);
      }
    }
    return null;
  },

  openExternalUrl: async (url: string): Promise<void> => {
    try {
      if (isTauri()) {
        await invoke('open_url', { url });
        return;
      }
    } catch (e) {
      console.warn('Failed to open URL via Tauri command, falling back to window.open:', e);
    }
    window.open(url, '_blank');
  },

  exitApp: async (): Promise<void> => {
    if (isTauri()) {
      try {
        await invoke('exit_app');
        return;
      } catch {}
    }
    window.close();
  },
};
