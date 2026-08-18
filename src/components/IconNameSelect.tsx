// Picker for the client cursor names accepted by IconName columns.

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, MessageSquare, MapPin, HelpCircle, ShoppingCart, Sparkles, Settings, Package, Wrench, Shield, Compass, Swords, Crosshair, Navigation, Volume2 } from 'lucide-react';

export interface IconOption {
  value: string;
  label: string;
  imagePath?: string;
  fallbackIcon?: React.ReactNode;
}

export const WOW_CURSOR_ICON_OPTIONS: IconOption[] = [
  { value: '', label: 'None' },
  { value: 'Taxi', label: 'Taxi', imagePath: '/assets/img/creature-icons/Taxi.png', fallbackIcon: <Compass className="w-4 h-4 text-slate-700" /> },
  { value: 'Talk', label: 'Talk / Speak', imagePath: '/assets/img/creature-icons/Speak.png', fallbackIcon: <MessageSquare className="w-4 h-4 text-slate-700" /> },
  { value: 'Attack', label: 'Attack', imagePath: '/assets/img/creature-icons/Attack.png', fallbackIcon: <Swords className="w-4 h-4 text-slate-700" /> },
  { value: 'Directions', label: 'Directions', imagePath: '/assets/img/creature-icons/Directions.png', fallbackIcon: <MapPin className="w-4 h-4 text-slate-700" /> },
  { value: 'Quest', label: 'Quest', imagePath: '/assets/img/creature-icons/Quest.png', fallbackIcon: <HelpCircle className="w-4 h-4 text-amber-600 font-bold" /> },
  { value: 'Buy', label: 'Buy', imagePath: '/assets/img/creature-icons/Buy.png', fallbackIcon: <ShoppingCart className="w-4 h-4 text-slate-700" /> },
  { value: 'Trainer', label: 'Trainer', imagePath: '/assets/img/creature-icons/Trainer.png', fallbackIcon: <Sparkles className="w-4 h-4 text-slate-700" /> },
  { value: 'Interact', label: 'Interact', imagePath: '/assets/img/creature-icons/Interact.png', fallbackIcon: <Settings className="w-4 h-4 text-slate-700" /> },
  { value: 'Pickup', label: 'Pickup', imagePath: '/assets/img/creature-icons/Pickup.png', fallbackIcon: <Package className="w-4 h-4 text-slate-700" /> },
  { value: 'Repair', label: 'Repair', imagePath: '/assets/img/creature-icons/Repair.png', fallbackIcon: <Wrench className="w-4 h-4 text-slate-700" /> },
  { value: 'LootAll', label: 'LootAll', imagePath: '/assets/img/creature-icons/LootAll.png', fallbackIcon: <Shield className="w-4 h-4 text-slate-700" /> },
  { value: 'PVP', label: 'PVP', imagePath: '/assets/img/creature-icons/PVP.png', fallbackIcon: <Crosshair className="w-4 h-4 text-slate-700" /> },
  { value: 'Driver', label: 'Driver', imagePath: '/assets/img/creature-icons/Driver.png', fallbackIcon: <Navigation className="w-4 h-4 text-slate-700" /> },
  { value: 'Gunner', label: 'Gunner', imagePath: '/assets/img/creature-icons/Gunner.png', fallbackIcon: <Crosshair className="w-4 h-4 text-slate-700" /> },
  { value: 'vehichleCursor', label: 'Vehicle Cursor', imagePath: '/assets/img/creature-icons/vehichleCursor.png', fallbackIcon: <Navigation className="w-4 h-4 text-slate-700" /> },
  { value: 'Cast', label: 'Cast', fallbackIcon: <Sparkles className="w-4 h-4 text-slate-700" /> },
  { value: 'Open', label: 'Open', fallbackIcon: <Package className="w-4 h-4 text-slate-700" /> },
];

interface IconNameSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export const IconNameSelect: React.FC<IconNameSelectProps> = ({
  value,
  onChange,
  className = '',
  placeholder = 'None or type icon name...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = WOW_CURSOR_ICON_OPTIONS.find(
    (opt) => opt.value.toLowerCase() === (value || '').toLowerCase()
  );

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Input / Trigger */}
      <div className="relative flex items-center">
        {selectedOption && selectedOption.value && (
          <div className="absolute left-2 flex items-center justify-center pointer-events-none z-10">
            {selectedOption.imagePath ? (
              <img
                src={selectedOption.imagePath}
                alt={selectedOption.label}
                className="w-4 h-4 object-contain"
              />
            ) : (
              selectedOption.fallbackIcon
            )}
          </div>
        )}
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={`w-full bg-white border border-slate-300 text-slate-800 text-xs py-1.5 pr-7 rounded focus:border-blue-500 focus:outline-none transition-colors shadow-2xs font-sans ${
            selectedOption && selectedOption.value ? 'pl-7' : 'pl-2.5'
          }`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setIsOpen((prev) => !prev)}
          className="absolute right-1.5 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-full min-w-[200px] bg-white border border-slate-300 rounded-lg shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100 max-h-64 overflow-y-auto">
          {WOW_CURSOR_ICON_OPTIONS.map((opt) => {
            const isSelected = (value || '').toLowerCase() === opt.value.toLowerCase();
            return (
              <button
                key={opt.value || 'none'}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-1.5 flex items-center gap-2.5 text-xs text-left cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-800 hover:bg-blue-500 hover:text-white'
                }`}
              >
                <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                  {opt.imagePath ? (
                    <img
                      src={opt.imagePath}
                      alt={opt.label}
                      className="w-4 h-4 object-contain"
                    />
                  ) : (
                    opt.fallbackIcon || <span className="text-[10px] opacity-40">-</span>
                  )}
                </div>
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default IconNameSelect;
