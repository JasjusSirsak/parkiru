import React, { useState, useEffect, useRef } from 'react';
import { Menu, Sun, Moon, Palette, LifeBuoy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const THEME_MODE_KEY = 'parkiru:theme-mode';
const THEME_ACCENT_KEY = 'parkiru:theme-accent';

const ACCENTS = {
  matcha: { label: 'Matcha', rgb: '163 197 133', swatchClass: 'bg-[rgb(163,197,133)]' },
  pink: { label: 'Pink', rgb: '244 114 182', swatchClass: 'bg-pink-400' },
  purple: { label: 'Ungu', rgb: '168 85 247', swatchClass: 'bg-purple-500' },
  blue: { label: 'Biru', rgb: '96 165 250', swatchClass: 'bg-blue-400' },
  amber: { label: 'Amber', rgb: '251 191 36', swatchClass: 'bg-amber-400' },
  red: { label: 'Merah', rgb: '239 68 68', swatchClass: 'bg-red-500' },
  cyan: { label: 'Cyan', rgb: '34 211 238', swatchClass: 'bg-cyan-400' },
} as const;

type AccentKey = keyof typeof ACCENTS;

function findAccentKeyByRgb(rgbTriplet: string | null): AccentKey {
  if (!rgbTriplet) return 'matcha';
  const normalized = rgbTriplet.trim().replace(/\s+/g, ' ');
  const found = (Object.keys(ACCENTS) as AccentKey[]).find((k) => ACCENTS[k].rgb === normalized);
  return found ?? 'matcha';
}

function LiveClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');

  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  
  const dayName = dayNames[time.getDay()];
  const date = time.getDate();
  const month = monthNames[time.getMonth()];
  const year = time.getFullYear();

  return (
    <div className="flex items-center gap-3">
      {/* Date */}
      <div className="hidden sm:flex flex-col items-end mr-1">
        <span className="text-[10px] uppercase tracking-widest text-foreground/40 font-semibold leading-tight">{dayName}</span>
        <span className="text-xs text-foreground/60 font-medium leading-tight">{date} {month} {year}</span>
      </div>

      {/* Separator */}
      <div className="hidden sm:block w-px h-8 bg-foreground/10" />

      {/* Clock */}
      <div className="flex items-center gap-1 font-mono">
        <div className="relative group">
          <div className="flex items-center gap-1 p-1 bg-black/20 rounded-xl skeuo-inset border border-white/5">
            <span className="inline-flex items-center justify-center w-9 h-10 rounded-lg bg-neutral-900 border border-white/5 text-lg font-black text-matcha tabular-nums tracking-wider shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)]">
              {hours}
            </span>
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className="text-matcha/40 text-lg font-black mx-[1px]"
            >
              :
            </motion.span>
            <span className="inline-flex items-center justify-center w-9 h-10 rounded-lg bg-neutral-900 border border-white/5 text-lg font-black text-matcha tabular-nums tracking-wider shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)]">
              {minutes}
            </span>
            <div className="w-px h-6 bg-white/5 mx-1" />
            <span className="inline-flex items-center justify-center w-7 h-10 rounded-lg bg-neutral-950/50 border border-white/5 text-xs font-bold text-foreground/30 tabular-nums tracking-wider">
              {seconds}
            </span>
          </div>
          {/* Subtle glow under the clock */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4/5 h-1.5 bg-matcha/30 blur-lg rounded-full opacity-50 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </div>
  );
}

export default function Header({ toggleSidebar }: { toggleSidebar: () => void }) {
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const paletteRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'dark' | 'light'>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );
  const [accentKey, setAccentKey] = useState<AccentKey>(() => {
    const saved = localStorage.getItem(THEME_ACCENT_KEY);
    if (saved) return findAccentKeyByRgb(saved);
    const computed = getComputedStyle(document.documentElement).getPropertyValue('--accent');
    return findAccentKeyByRgb(computed);
  });

  // Close palette on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        setIsPaletteOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const applyMode = (next: 'dark' | 'light') => {
    const root = document.documentElement;
    if (next === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem(THEME_MODE_KEY, next);
    window.dispatchEvent(new Event('parkiru-theme-change'));
    setMode(next);
  };

  const applyAccent = (next: AccentKey) => {
    const triplet = ACCENTS[next].rgb;
    document.documentElement.style.setProperty('--accent', triplet);
    localStorage.setItem(THEME_ACCENT_KEY, triplet);
    window.dispatchEvent(new Event('parkiru-theme-change'));
    setAccentKey(next);
  };

  return (
    <header className="sticky top-0 z-30 w-full backdrop-blur-xl bg-white/[0.02] dark:bg-black/[0.02] border-b border-foreground/[0.06] px-6 py-3 flex items-center justify-between">
      {/* Left: Mobile burger */}
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="lg:hidden p-2.5 text-foreground/70 hover:text-foreground hover:bg-white/10 rounded-xl transition-all active:scale-95"
        >
          <Menu size={22} />
        </button>

        {/* Breadcrumb / status indicator */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-matcha animate-pulse" />
          <span className="text-[11px] uppercase tracking-[0.15em] text-foreground/40 font-semibold">Sistem Aktif</span>
        </div>
      </div>

      {/* Center: Live Clock */}
      <div className="flex-1 flex justify-center">
        <LiveClock />
      </div>

      {/* Right: Theme controls */}
      <div className="flex items-center gap-2">
        {/* Troubleshooting / Hubungi Support */}
        <motion.a
          whileTap={{ scale: 0.9 }}
          href="https://wa.link/2agozs"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2.5 rounded-xl border border-foreground/[0.08] bg-white/5 hover:bg-white/10 transition-all group flex items-center gap-2"
          aria-label="Troubleshooting"
        >
          <LifeBuoy size={17} className="text-foreground/70 group-hover:text-matcha transition-colors" />
          <span className="hidden sm:block text-xs font-bold text-foreground/50 group-hover:text-foreground">Troubleshooting</span>
        </motion.a>

        {/* Dark/Light toggle */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          type="button"
          onClick={() => applyMode(mode === 'dark' ? 'light' : 'dark')}
          className="p-2.5 rounded-xl border border-foreground/[0.08] bg-white/5 hover:bg-white/10 transition-all group"
          aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {mode === 'dark' ? (
            <Sun size={17} className="text-foreground/70 group-hover:text-amber-400 transition-colors" />
          ) : (
            <Moon size={17} className="text-foreground/70 group-hover:text-indigo-400 transition-colors" />
          )}
        </motion.button>

        {/* Palette icon with popup */}
        <div className="relative" ref={paletteRef}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            type="button"
            onClick={() => setIsPaletteOpen(!isPaletteOpen)}
            className={`p-2.5 rounded-xl border transition-all active:scale-95 ${
              isPaletteOpen 
                ? 'bg-matcha/20 shadow-inner border-matcha/40' 
                : 'skeuo-depth hover:bg-white/5'
            }`}
            aria-label="Tema warna"
          >
            <Palette size={17} className={`transition-colors ${isPaletteOpen ? 'text-matcha' : 'text-foreground/70 group-hover:text-matcha'}`} />
          </motion.button>

          <AnimatePresence>
            {isPaletteOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-64 bg-neutral-900/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl p-4 z-50 skeuo-depth"
              >
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold mb-4 px-1">Pilih Warna Aksen</p>
                <div className="grid grid-cols-4 gap-2.5">
                  {(Object.keys(ACCENTS) as AccentKey[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        applyAccent(k);
                      }}
                      className={`relative flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${
                        accentKey === k 
                          ? 'bg-white/10 shadow-inner ring-1 ring-white/20' 
                          : 'hover:bg-white/5 skeuo-depth hover:scale-105'
                      }`}
                      aria-label={`Accent ${ACCENTS[k].label}`}
                    >
                      <span className={`w-9 h-9 rounded-lg ${ACCENTS[k].swatchClass} shadow-lg transition-transform ${
                        accentKey === k ? 'ring-2 ring-white/40 scale-90' : 'skeuo-btn'
                      }`} />
                      <span className="text-[9px] text-white/40 font-bold uppercase tracking-tight">{ACCENTS[k].label}</span>
                      {accentKey === k && (
                        <motion.div
                          layoutId="accent-indicator"
                          className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-white border-2 border-neutral-900 shadow-sm"
                        />
                      )}
                    </button>
                  ))}
                </div>
                {/* Active accent preview */}
                <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[10px] text-white/30 font-semibold">Aktif</span>
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${ACCENTS[accentKey].swatchClass}`} />
                    <span className="text-xs text-white/60 font-medium">{ACCENTS[accentKey].label}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}