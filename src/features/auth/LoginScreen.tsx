// Connection screen. Collects the database credentials used for every module.

import React, { useState, useEffect } from 'react';
import {
  Server,
  Network,
  User,
  Key,
  Database,
  History,
  RotateCcw,
  AlertCircle,
  RefreshCw,
  Trash2
} from 'lucide-react';
import type { DbConfig } from '../../types';
import { api } from '../../lib/ipc';

interface LoginScreenProps {
  onLoginSuccess: (config: DbConfig) => void;
  initialConfig: DbConfig;
  allowAutoLogin?: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  initialConfig,
  allowAutoLogin = true,
}) => {
  const [savePassword, setSavePassword] = useState<boolean>(true);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [config, setConfig] = useState<DbConfig>(initialConfig);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSavedProfile, setHasSavedProfile] = useState<boolean>(false);
  const [recentMenuOpen, setRecentMenuOpen] = useState<boolean>(false);

  const formatErrorMessage = (rawError: any): string => {
    const msg = typeof rawError === 'string' ? rawError : rawError?.message || String(rawError);
    if (msg.includes('1045') || msg.includes('Access denied')) {
      return `Authentication Failed (MySQL Error 1045): Access denied for user '${config.user}'@'${config.host}'. Please check your username and password.`;
    }
    if (msg.includes('connection refused') || msg.includes('10061') || msg.includes('os error 10061')) {
      return `Connection Refused: Unable to connect to MySQL on ${config.host}:${config.port}. Please verify that your MySQL server is running.`;
    }
    if (msg.includes('1049') || msg.includes('Unknown database')) {
      return `Database Not Found (MySQL Error 1049): Unknown database '${config.world_db}'. Please check the database name.`;
    }
    return msg;
  };

  useEffect(() => {
    const loadSaved = async () => {
      try {
        const saved = await api.loadAppConfig();
        if (saved && saved.config) {
          setConfig(prev => ({
            ...prev,
            ...saved.config,
          }));
          setSavePassword(saved.save_password);
          setRememberMe(saved.remember_me);
          setHasSavedProfile(true);

          // Auto-login condition: Remember Me enabled and config has host and password
          if (allowAutoLogin && saved.remember_me && saved.config.host) {
            setLoading(true);
            try {
              await api.connectDatabases(saved.config);
              onLoginSuccess(saved.config);
            } catch (err: any) {
              setError(formatErrorMessage(err));
            } finally {
              setLoading(false);
            }
          }
        }
      } catch {
        // fallback
      }
    };
    loadSaved();
  }, [allowAutoLogin]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.connectDatabases(config);

      // Persist the connection profile and the user's choices to AppData
      // (%APPDATA%\Lyra\config.json). The profile is always stored on a
      // successful connect so the form pre-fills next launch, and the
      // "Remember me" flag is saved as-is — both on and off — so unchecking it
      // sticks. Auto-connect on launch is gated solely on that stored flag.
      // The password is only written when "Save password" is enabled; the saved
      // profile is wiped only through the explicit "Clear All Saved" action.
      const toSave: DbConfig = {
        ...config,
        password: savePassword ? config.password : '',
      };
      await api.saveAppConfig({
        config: toSave,
        save_password: savePassword,
        remember_me: rememberMe,
      });
      setHasSavedProfile(true);

      onLoginSuccess(config);
    } catch (err: any) {
      setError(formatErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleClearSaved = async () => {
    await api.clearAppConfig();
    setHasSavedProfile(false);
    setRecentMenuOpen(false);
    setConfig({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '',
      world_db: 'bfa_world',
      hotfixes_db: 'bfa_hotfixes',
    });
  };

  const handleLoadDefaults = () => {
    setRecentMenuOpen(false);
    setConfig({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '',
      world_db: 'bfa_world',
      hotfixes_db: 'bfa_hotfixes',
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen w-screen bg-[#070A11] relative overflow-hidden select-none font-sans">
      {/* Background Ambience */}
      <div className="absolute w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[130px] pointer-events-none -top-20 -left-20" />
      <div className="absolute w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[130px] pointer-events-none -bottom-20 -right-20" />

      {/* Centered Login Card */}
      <div className="w-[480px] max-w-[92vw] bg-[#0E1424]/95 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-7 shadow-2xl shadow-black/90 text-white relative z-10 space-y-3.5">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-xl font-bold text-white tracking-wide font-sans">
            Lyra
          </h1>
        </div>

        {/* Error Box */}
        {error && (
          <div className="p-3 bg-red-950/80 border border-red-500/80 rounded-xl text-red-200 text-xs font-sans flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400 mt-0.5" />
            <div className="whitespace-pre-wrap leading-relaxed">{error}</div>
          </div>
        )}

        <form onSubmit={handleConnect} className="space-y-2.5">
          <div className="flex rounded-lg overflow-hidden border border-slate-700/80 focus-within:ring-2 focus-within:ring-blue-500 transition-all shadow-sm">
            <div className="w-36 bg-[#0052a7] text-white px-3.5 py-1.5 flex items-center gap-2.5 font-bold text-xs select-none flex-shrink-0">
              <Server className="w-3.5 h-3.5" />
              <span>Host</span>
            </div>
            <input
              type="text"
              value={config.host}
              onChange={(e) => setConfig({ ...config, host: e.target.value })}
              placeholder="127.0.0.1"
              required
              className="flex-1 bg-white text-slate-900 font-sans text-xs px-3 py-1.5 focus:outline-none placeholder:text-slate-400 font-medium"
            />
          </div>

          <div className="flex rounded-lg overflow-hidden border border-slate-700/80 focus-within:ring-2 focus-within:ring-blue-500 transition-all shadow-sm">
            <div className="w-36 bg-[#0052a7] text-white px-3.5 py-1.5 flex items-center gap-2.5 font-bold text-xs select-none flex-shrink-0">
              <Network className="w-3.5 h-3.5" />
              <span>Port</span>
            </div>
            <input
              type="number"
              value={config.port}
              onChange={(e) => setConfig({ ...config, port: Number(e.target.value) || 3306 })}
              placeholder="3306"
              required
              className="flex-1 bg-white text-slate-900 font-sans text-xs px-3 py-1.5 focus:outline-none placeholder:text-slate-400 font-medium"
            />
          </div>

          <div className="flex rounded-lg overflow-hidden border border-slate-700/80 focus-within:ring-2 focus-within:ring-blue-500 transition-all shadow-sm">
            <div className="w-36 bg-[#0052a7] text-white px-3.5 py-1.5 flex items-center gap-2.5 font-bold text-xs select-none flex-shrink-0">
              <User className="w-3.5 h-3.5" />
              <span>Username</span>
            </div>
            <input
              type="text"
              value={config.user}
              onChange={(e) => setConfig({ ...config, user: e.target.value })}
              placeholder="root"
              required
              className="flex-1 bg-white text-slate-900 font-sans text-xs px-3 py-1.5 focus:outline-none placeholder:text-slate-400 font-medium"
            />
          </div>

          <div className="flex rounded-lg overflow-hidden border border-slate-700/80 focus-within:ring-2 focus-within:ring-blue-500 transition-all shadow-sm">
            <div className="w-36 bg-[#0052a7] text-white px-3.5 py-1.5 flex items-center gap-2.5 font-bold text-xs select-none flex-shrink-0">
              <Key className="w-3.5 h-3.5" />
              <span>Password</span>
            </div>
            <input
              type="password"
              value={config.password}
              onChange={(e) => setConfig({ ...config, password: e.target.value })}
              placeholder="••••••••"
              className="flex-1 bg-white text-slate-900 font-sans text-xs px-3 py-1.5 focus:outline-none placeholder:text-slate-400 font-medium"
            />
          </div>

          {/* World Database */}
          <div className="flex rounded-lg overflow-hidden border border-slate-700/80 focus-within:ring-2 focus-within:ring-blue-500 transition-all shadow-sm">
            <div className="w-36 bg-[#0052a7] text-white px-3.5 py-1.5 flex items-center gap-2.5 font-bold text-xs select-none flex-shrink-0">
              <Database className="w-3.5 h-3.5" />
              <span>World DB</span>
            </div>
            <input
              type="text"
              value={config.world_db}
              onChange={(e) => setConfig({ ...config, world_db: e.target.value })}
              placeholder="bfa_world"
              required
              className="flex-1 bg-white text-slate-900 font-sans text-xs px-3 py-1.5 focus:outline-none placeholder:text-slate-400 font-medium"
            />
          </div>

          {/* Hotfixes Database */}
          <div className="flex rounded-lg overflow-hidden border border-slate-700/80 focus-within:ring-2 focus-within:ring-blue-500 transition-all shadow-sm">
            <div className="w-36 bg-[#0052a7] text-white px-3.5 py-1.5 flex items-center gap-2.5 font-bold text-xs select-none flex-shrink-0">
              <Database className="w-3.5 h-3.5" />
              <span>Hotfixes DB</span>
            </div>
            <input
              type="text"
              value={config.hotfixes_db}
              onChange={(e) => setConfig({ ...config, hotfixes_db: e.target.value })}
              placeholder="bfa_hotfixes"
              required
              className="flex-1 bg-white text-slate-900 font-sans text-xs px-3 py-1.5 focus:outline-none placeholder:text-slate-400 font-medium"
            />
          </div>

          {/* Checkboxes & Load recent button */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <div className="space-y-1.5">
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={savePassword}
                  onChange={(e) => setSavePassword(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#141C30] border-slate-600 text-blue-600 focus:ring-0 cursor-pointer"
                />
                <span className="font-bold text-white text-xs">Save password</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  disabled={!savePassword}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#141C30] border-slate-600 text-blue-600 focus:ring-0 cursor-pointer disabled:opacity-50"
                />
                <span className="font-bold text-white text-xs">Remember me</span>
              </label>
            </div>

            {/* Load recent Button with Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setRecentMenuOpen(!recentMenuOpen)}
                className="bg-[#0052a7] hover:bg-[#0060df] text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition-colors cursor-pointer select-none"
              >
                <History className="w-3.5 h-3.5" />
                <span>Load recent</span>
                <span className="text-[10px]">▲</span>
              </button>

              {recentMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setRecentMenuOpen(false)}
                  />
                  <div className="absolute bottom-full right-0 mb-1.5 w-48 bg-[#0B0F19] border border-slate-700 rounded-xl shadow-2xl py-1 z-50 text-xs text-slate-200">
                    <button
                      type="button"
                      onClick={handleClearSaved}
                      className="w-full text-left px-3 py-2 hover:bg-red-600/80 hover:text-white flex items-center gap-2 transition-colors cursor-pointer text-red-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear All Saved</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadDefaults}
                      className="w-full text-left px-3 py-2 hover:bg-[#0052a7] hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Default Localhost</span>
                    </button>
                    {hasSavedProfile && (
                      <div className="px-3 py-1.5 border-t border-slate-800 text-[11px] text-slate-400 font-mono">
                        {config.host}:{config.port} ({config.user})
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Connect Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0052a7] hover:bg-[#0060df] text-white font-bold text-base py-2.5 rounded-lg shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer active:scale-[0.99] mt-3"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <span>Connect</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;
