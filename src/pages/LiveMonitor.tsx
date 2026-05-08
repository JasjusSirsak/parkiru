import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Search,
  Clock,
  Bike,
  Activity,
  X,
  ChevronRight,
  AlertTriangle,
  Timer,
  TrendingUp,
  Hash,
  Image as ImageIcon,
  Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAuthHeaders } from '../utils/auth';

/* ─── Types ─── */
interface MotorData {
  id: number;
  plat: string;
  masuk: string;
  seconds: number;
  spot: string;
  image?: string;
  ticketId?: string;  // transaction_id dari DB — dipakai sebagai nilai QR Code
}

/* ─── Helpers ─── */

function formatToLocalTime(value: string): string {
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Jakarta',
      hour12: false,
    }).format(date);
  } catch {
    return value;
  }
}

function diffSecondsFromNow(entryTimeIso: string): number {
  const t = new Date(entryTimeIso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 1000));
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h > 0 ? h + 'j ' : ''}${m}m ${s}d`;
}

function getDurationLevel(seconds: number, graceHours: number = 1): 'low' | 'mid' | 'high' {
  const graceSeconds = graceHours * 3600;
  if (seconds < graceSeconds) return 'low';
  if (seconds < graceSeconds + 3600) return 'mid';
  return 'high';
}

function getDurationColor(level: 'low' | 'mid' | 'high') {
  switch (level) {
    case 'low':
      return {
        bg: 'bg-emerald-500/15',
        text: 'text-emerald-400',
        dot: 'bg-emerald-400',
        ring: 'ring-emerald-400/30',
        bar: 'bg-emerald-400',
        label: 'Normal',
      };
    case 'mid':
      return {
        bg: 'bg-amber-500/15',
        text: 'text-amber-400',
        dot: 'bg-amber-400',
        ring: 'ring-amber-400/30',
        bar: 'bg-amber-400',
        label: 'Lama',
      };
    case 'high':
      return {
        bg: 'bg-red-500/15',
        text: 'text-red-400',
        dot: 'bg-red-400',
        ring: 'ring-red-400/30',
        bar: 'bg-red-400',
        label: 'Sangat Lama',
      };
  }
}

function getProgressWidth(seconds: number): number {
  return Math.min((seconds / 10800) * 100, 100);
}

function getCapacityLevel(currentCount: number, maxCapacity: number): 'safe' | 'warning' | 'full' {
  const percentage = (currentCount / maxCapacity) * 100;
  if (percentage < 70) return 'safe';
  if (percentage < 100) return 'warning';
  return 'full';
}

function getCapacityColor(level: 'safe' | 'warning' | 'full') {
  switch (level) {
    case 'safe':
      return {
        bg: 'bg-emerald-500/15',
        text: 'text-emerald-400',
        dot: 'bg-emerald-400',
        ring: 'ring-emerald-400/30',
        bar: 'bg-emerald-400',
        label: 'Aman',
      };
    case 'warning':
      return {
        bg: 'bg-amber-500/15',
        text: 'text-amber-400',
        dot: 'bg-amber-400',
        ring: 'ring-amber-400/30',
        bar: 'bg-amber-400',
        label: 'Hampir Penuh',
      };
    case 'full':
      return {
        bg: 'bg-red-500/15',
        text: 'text-red-400',
        dot: 'bg-red-400',
        ring: 'ring-red-400/30',
        bar: 'bg-red-400',
        label: 'Penuh',
      };
  }
}

function getCapacityProgress(currentCount: number, maxCapacity: number): number {
  return Math.min((currentCount / maxCapacity) * 100, 100);
}

/* ═══════════════════════════════════════════════════════════
   DETAIL POPUP MODAL (FIXED DENGAN PORTAL)
   ═══════════════════════════════════════════════════════════ */
function DetailModal({
  motor,
  onClose,
}: {
  motor: MotorData;
  graceHours: number;
  onClose: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const level = getDurationLevel(motor.seconds, graceHours);
  const color = getDurationColor(level);

  /* close on overlay click */
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  /* close on Escape & Lock Scroll */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    // ✅ FIX: Lock body scroll saat modal terbuka
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    
    window.addEventListener('keydown', handler);
    
    return () => {
      window.removeEventListener('keydown', handler);
      // ✅ FIX: Kembalikan scroll saat modal ditutup
      document.body.style.overflow = originalOverflow;
    };
  }, [onClose]);

  // ✅ FIX: Gunakan createPortal untuk melewati parent yang punya transform/filter
  return createPortal(
    <motion.div
      ref={overlayRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 16 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="relative flex flex-row bg-[#13131f] border border-white/10 rounded-3xl shadow-2xl overflow-hidden w-full max-w-2xl"
      >
        {/* ── LEFT: Photo panel ── */}
        <div className="relative w-72 shrink-0 bg-[#0d0d18] overflow-hidden min-h-[420px]">
          {motor.image ? (
            <img
              src={`${window.location.origin}/${motor.image}`}
              alt={`Foto masuk ${motor.plat}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fb = e.currentTarget.parentElement?.querySelector('.photo-fallback') as HTMLElement | null;
                if (fb) fb.style.display = 'flex';
              }}
            />
          ) : null}
          {/* Fallback placeholder */}
          <div
            className="photo-fallback absolute inset-0 flex-col items-center justify-center bg-gradient-to-br from-[#1a1a2e] to-[#16213e]"
            style={{ display: motor.image ? 'none' : 'flex' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="140" height="100" viewBox="0 0 400 260" fill="none">
              <g transform="translate(200,120)" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8">
                <circle cx="-60" cy="30" r="28"/>
                <circle cx="60" cy="30" r="28"/>
                <path d="M-60,30 L-20,-10 L20,-10 L35,10 L60,30"/>
                <path d="M-20,-10 L-5,-40 L15,-40 L20,-10"/>
                <path d="M35,10 L50,10"/>
              </g>
            </svg>
            <span className="text-white/40 font-mono text-sm mt-3">{motor.plat}</span>
          </div>
          {/* Status badge */}
          <div className={`absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 ${color.bg} ${color.text} rounded-full text-xs font-bold`}>
            <span className={`w-2 h-2 rounded-full ${color.dot} animate-pulse`} />
            Parkir Aktif
          </div>
        </div>

        {/* ── RIGHT: Info panel ── */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Tutup"
            title="Tutup"
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
          >
            <X size={18} />
          </button>

          {/* Content */}
          <div className="p-6 space-y-5 flex-1">
            {/* Plate number */}
            <div>
              <p className="text-[11px] uppercase tracking-widest text-white/30 font-semibold mb-1">Plat Nomor</p>
              <h2 className="text-2xl font-mono font-bold text-white tracking-wider">{motor.plat}</h2>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-2xl p-3 text-center">
                <Clock size={16} className="mx-auto mb-1.5 text-emerald-400/70" />
                <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">Waktu Masuk</p>
                <p className="text-sm font-mono font-bold text-white mt-1">{motor.masuk}</p>
                <p className="text-[10px] text-white/30 mt-0.5">WIB</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-3 text-center">
                <Timer size={16} className="mx-auto mb-1.5 text-emerald-400/70" />
                <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">Durasi</p>
                <p className={`text-sm font-mono font-bold ${color.text} mt-1`}>{formatDuration(motor.seconds)}</p>
                <p className={`text-[10px] ${color.text} mt-0.5`}>{color.label}</p>
              </div>
              {/* QR - Ticket No */}
              <div className="bg-white/5 rounded-2xl col-span-2 overflow-hidden">
                <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold text-center pt-2.5 pb-1">
                  QR – Ticket No
                </p>
                <div className="flex items-stretch divide-x divide-white/10">
                  {/* Sisi Kiri: QR Code */}
                  <div className="flex items-center justify-center p-3 shrink-0">
                    {motor.ticketId ? (
                      <div className="p-1.5 bg-white rounded-lg">
                        <QRCodeSVG
                          value={motor.ticketId}
                          size={72}
                          bgColor="#FFFFFF"
                          fgColor="#0d0d18"
                          level="M"
                          includeMargin={false}
                        />
                      </div>
                    ) : (
                      <div className="w-[88px] h-[88px] rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                        <Hash size={24} className="text-white/20" />
                      </div>
                    )}
                  </div>
                  {/* Sisi Kanan: Ticket Number Text */}
                  <div className="flex-1 flex flex-col items-center justify-center p-3 gap-1.5">
                    <p className="text-[9px] uppercase tracking-widest text-white/25 font-semibold">Nomor Tiket</p>
                    {motor.ticketId ? (
                      <p className="text-[11px] font-mono font-bold text-white/80 text-center break-all leading-snug">
                        {motor.ticketId}
                      </p>
                    ) : (
                      <p className="text-xs font-mono text-white/20">Tidak tersedia</p>
                    )}
                    <span className="text-[9px] text-white/20 mt-0.5">Scan untuk keluar</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Duration progress bar */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] uppercase tracking-widest text-white/30 font-semibold">Durasi Parkir</span>
                <span className={`text-[11px] font-bold ${color.text}`}>{Math.round(getProgressWidth(motor.seconds))}%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${color.bar}`}
                  style={{ width: `${getProgressWidth(motor.seconds)}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-white/20">0j</span>
                <span className="text-[10px] text-white/20">1j</span>
                <span className="text-[10px] text-white/20">2j</span>
                <span className="text-[10px] text-white/20">3j</span>
              </div>
            </div>

            {/* Estimated cost */}
            <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-400" />
                <span className="text-xs text-white/50">Estimasi Biaya</span>
              </div>
              <span className="text-lg font-bold text-emerald-400 font-mono">
                Rp {Math.max(2000, Math.ceil(motor.seconds / 3600) * 2000).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body // ✅ RENDER LANGSUNG KE BODY
  );
}

/* ═══════════════════════════════════════════════════════════
   CAPACITY CARD
   ═══════════════════════════════════════════════════════════ */
function CapacityCard({
  currentCount,
  maxCapacity,
}: {
  currentCount: number;
  maxCapacity: number;
}) {
  const level = getCapacityLevel(currentCount, maxCapacity);
  const color = getCapacityColor(level);
  const progress = getCapacityProgress(currentCount, maxCapacity);

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2.5 ${color.bg} rounded-xl ${color.text}`}>
          <Users size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">Kepenuhan</p>
          <p className={`text-xl font-bold ${color.text} leading-tight`}>
            {currentCount}/{maxCapacity}
          </p>
        </div>
      </div>
      
      {/* Progress bar */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-[11px] uppercase tracking-widest text-white/30 font-semibold">Utilisasi</span>
          <span className={`text-[11px] font-bold ${color.text}`}>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${color.bar}`}
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-white/20">0%</span>
          <span className="text-[10px] text-white/20">70%</span>
          <span className="text-[10px] text-white/20">100%</span>
        </div>
      </div>
      
      {/* Status label */}
      <div className="flex items-center gap-2 mt-3">
        <span className={`w-2 h-2 rounded-full ${color.dot} ${level === 'warning' || level === 'full' ? 'animate-pulse' : ''}`} />
        <span className={`text-[11px] font-semibold ${color.text} uppercase`}>{color.label}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STAT CARD
   ═══════════════════════════════════════════════════════════ */
function StatCard({
  icon,
  label,
  value,
  sub,
  accent = 'emerald',
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  const colorMap: Record<string, { iconBg: string; iconText: string; valueText: string }> = {
    emerald: { iconBg: 'bg-emerald-500/15', iconText: 'text-emerald-400', valueText: 'text-emerald-400' },
    amber: { iconBg: 'bg-amber-500/15', iconText: 'text-amber-400', valueText: 'text-amber-400' },
    red: { iconBg: 'bg-red-500/15', iconText: 'text-red-400', valueText: 'text-red-400' },
    blue: { iconBg: 'bg-blue-500/15', iconText: 'text-blue-400', valueText: 'text-blue-400' },
  };
  const c = colorMap[accent] || colorMap.emerald;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
      <div className={`p-2.5 ${c.iconBg} rounded-xl ${c.iconText}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">{label}</p>
        <p className={`text-xl font-bold ${c.valueText} leading-tight`}>{value}</p>
        {sub && <p className="text-[11px] text-white/30 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function LiveMonitor() {
  const [motors, setMotors] = useState<MotorData[]>([]);
  const [selectedMotor, setSelectedMotor] = useState<MotorData | null>(null);
  const [sortBy, setSortBy] = useState<'masuk' | 'durasi'>('masuk');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parkingSettings, setParkingSettings] = useState<any>(null);

  const fetchLiveMonitor = async () => {
    setLoading(true);
    setError(null);

    try {
      const [sessionsResponse, settingsResponse] = await Promise.all([
        fetch('/api/parking-sessions/active', { headers: getAuthHeaders() }),
        fetch('/api/settings/parking', { headers: getAuthHeaders() })
      ]);

      if (!sessionsResponse.ok) throw new Error(`HTTP error! status: ${sessionsResponse.status}`);
      const result = await sessionsResponse.json();
      if (!result.success) throw new Error(result.error || 'Failed to fetch live monitor');

      if (settingsResponse.ok) {
        const settingsResult = await settingsResponse.json();
        if (settingsResult.success) {
          setParkingSettings(settingsResult.data);
        }
      }

      const entries = result.data || [];
      const mapped: MotorData[] = entries.map((s: any) => ({
        id: s.id,
        plat: s.plate_number || '-',
        masuk: formatToLocalTime(s.entry_time),
        seconds: Number(s.duration_seconds ?? diffSecondsFromNow(s.entry_time)),
        spot: '-',
        image: s.entry_photo_url || undefined,
        ticketId: s.transaction_id || undefined,  // QR Code value
      }));

      setMotors(mapped);
    } catch (err) {
      console.error('Error fetching live monitor:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch live monitor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveMonitor();
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchLiveMonitor, 60000);
    return () => clearInterval(interval);
  }, []);

  const sortedMotors = [...motors]
    .sort((a, b) => (sortBy === 'durasi' ? b.seconds - a.seconds : a.seconds - b.seconds));

  const totalActive = motors.length;
  const avgSeconds = motors.length > 0 ? motors.reduce((s, m) => s + m.seconds, 0) / motors.length : 0;
  const longestSeconds = motors.length > 0 ? Math.max(...motors.map((m) => m.seconds)) : 0;
  
  const maxCapacity = parkingSettings?.max_capacity || 150;
  const capacityLevel = getCapacityLevel(totalActive, maxCapacity);
  const capacityColor = getCapacityColor(capacityLevel);
  const capacityProgress = getCapacityProgress(totalActive, maxCapacity);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] uppercase tracking-widest text-emerald-400/70 font-semibold">Real-time</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Pemantauan Karcis Aktif</h1>
          <p className="text-white/40 text-sm mt-1">Pantau status parkir dan durasi kendaraan secara langsung.</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => window.location.href = '/active-gallery'}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold hover:bg-red-500/20 transition-all shrink-0 shadow-lg shadow-red-500/5 group"
          >
            <AlertTriangle size={18} className="group-hover:animate-bounce" />
            Layanan Bantuan Karcis Hilang
          </motion.button>
        </div>
      </div>

      {/* ─── Stats Bar ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Bike size={18} />}
          label="Total Aktif"
          value={totalActive}
          sub="kendaraan"
          accent="emerald"
        />
        <StatCard
          icon={<Activity size={18} />}
          label="Rata-rata Durasi"
          value={formatDuration(Math.round(avgSeconds))}
          accent="blue"
        />
        <CapacityCard
          currentCount={totalActive}
          maxCapacity={maxCapacity}
        />
        <StatCard
          icon={<Timer size={18} />}
          label="Terlama"
          value={formatDuration(longestSeconds)}
          accent="red"
        />
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          Gagal memuat data: {error}
        </div>
      )}

      {/* ─── List Header ─── */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/30 font-semibold uppercase tracking-widest">
          Menampilkan {sortedMotors.length} kendaraan
        </p>
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
          <button
            onClick={() => setSortBy('masuk')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              sortBy === 'masuk' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'
            }`}
          >
            Terbaru
          </button>
          <button
            onClick={() => setSortBy('durasi')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              sortBy === 'durasi' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'
            }`}
          >
            Terlama
          </button>
        </div>
      </div>

      {/* ─── Compact List ─── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/[0.03] rounded-2xl border border-dashed border-white/10">
          <div className="p-4 bg-white/5 rounded-full mb-3">
            <Bike size={36} className="text-white/30" />
          </div>
          <h3 className="text-base font-semibold text-white/40">Memuat daftar motor aktif...</h3>
          <p className="text-sm text-white/20 mt-1">Silakan tunggu sebentar.</p>
        </div>
      ) : sortedMotors.length > 0 ? (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/[0.06]">
          <div className="hidden md:grid md:grid-cols-12 gap-4 px-5 py-2.5 text-xs uppercase tracking-widest text-white/20 font-semibold">
            <div className="col-span-1">No</div>
            <div className="col-span-3">Ticket No</div>
            <div className="col-span-2">Foto Masuk</div>
            <div className="col-span-2">Masuk</div>
            <div className="col-span-3">Durasi</div>
            <div className="col-span-1" />
          </div>

          <AnimatePresence mode="popLayout">
            {sortedMotors.map((motor, idx) => {
              const graceHours = parkingSettings?.grace_period_hours || 1;
              const level = getDurationLevel(motor.seconds, graceHours);
              const color = getDurationColor(level);
              const progress = getProgressWidth(motor.seconds);

              return (
                <motion.button
                  key={motor.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, delay: idx * 0.03 }}
                  onClick={() => setSelectedMotor(motor)}
                  className="w-full md:grid md:grid-cols-12 gap-4 px-5 py-3.5 flex items-center gap-4 hover:bg-white/[0.04] active:bg-white/[0.06] transition-colors text-left group cursor-pointer"
                >
                  <div className="hidden md:flex col-span-1 items-center">
                    <span className="text-xs font-mono text-white/20 font-bold">{String(idx + 1).padStart(2, '0')}</span>
                  </div>

                  <div className="md:col-span-3 flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg ${color.bg} ${color.text} shrink-0`}>
                      <Bike size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-mono font-bold text-white tracking-wider truncate">{motor.plat}</p>
                      <p className="md:hidden text-[11px] text-white/30">
                        {motor.spot} · {motor.masuk}
                      </p>
                    </div>
                  </div>

                  <div className="hidden md:flex col-span-2 items-center">
                    {motor.image ? (
                      <img
                        src={`${window.location.origin}/${motor.image}`}
                        alt={`Foto masuk ${motor.plat}`}
                        className="w-10 h-8 object-cover rounded-md border border-white/10"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const sib = e.currentTarget.nextElementSibling as HTMLElement | null;
                          if (sib) sib.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className="items-center justify-center w-10 h-8 rounded-md bg-white/5 border border-white/10"
                      style={{ display: motor.image ? 'none' : 'flex' }}
                    >
                      <Bike size={12} className="text-white/20" />
                    </div>
                  </div>

                  <div className="hidden md:flex col-span-2 items-center gap-1.5">
                    <Clock size={12} className="text-white/20" />
                    <span className="text-xs text-white/40 font-mono">{motor.masuk}</span>
                  </div>

                  <div className="md:col-span-3 flex items-center gap-3 min-w-0">
                    <div className="flex-1 min-w-0 hidden md:block">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[11px] font-bold ${color.text} font-mono`}>
                          {formatDuration(motor.seconds)}
                        </span>
                        <span className={`text-[10px] ${color.text}/60 font-semibold uppercase`}>{color.label}</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${color.bar}`}
                          style={{ width: `${progress}%` }}
                          transition={{ duration: 0.8 }}
                        />
                      </div>
                    </div>
                    <div className="md:hidden flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${color.dot}`} />
                      <span className={`text-xs font-mono font-bold ${color.text}`}>{formatDuration(motor.seconds)}</span>
                    </div>
                  </div>

                  <div className="hidden md:flex col-span-1 items-center justify-end">
                    <ChevronRight
                      size={16}
                      className="text-white/15 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all"
                    />
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-white/[0.03] rounded-2xl border border-dashed border-white/10">
          <div className="p-4 bg-white/5 rounded-full mb-3">
            <Bike size={36} className="text-white/15" />
          </div>
          <h3 className="text-base font-semibold text-white/40">Tidak ada data ditemukan</h3>
          <p className="text-sm text-white/20 mt-1">Coba ubah kata kunci pencarian Anda.</p>
        </div>
      )}

      {/* ─── Detail Modal ─── */}
      <AnimatePresence>
        {selectedMotor && (
          <DetailModal
            motor={selectedMotor}
            graceHours={parkingSettings?.grace_period_hours || 1}
            onClose={() => setSelectedMotor(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}