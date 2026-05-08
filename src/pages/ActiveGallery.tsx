import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bike, 
  Clock, 
  ChevronLeft, 
  AlertTriangle, 
  ShieldCheck, 
  CreditCard, 
  Hash, 
  FileText,
  Camera,
  Filter,
  ArrowRight,
  Sun,
  CloudSun,
  Sunset,
  Moon,
  ChevronRight,
  X,
  DollarSign,
  QrCode
} from 'lucide-react';
import { toast } from 'react-toastify';
import { getAuthHeaders } from '../utils/auth';
import AdminScanner from '../components/AdminScanner';

// ═══════════════════════════════════════════════════════
//  TYPES 
// ═══════════════════════════════════════════════════════

interface ActiveMotor {
  id: number;
  transaction_id: string;
  plate_number: string;
  entry_time: string;
  entry_photo_url: string;
  duration_seconds: number;
}

interface TimeSlot {
  id: string;
  label: string;
  sublabel: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  period: 'pagi' | 'siang' | 'sore' | 'malam';
  rangeMinutes: number;
}

// ═══════════════════════════════════════════════════════
//  CONSTANTS & HELPERS
// ═══════════════════════════════════════════════════════

const humanizeTime = (hour: number, minute: number): string => {
  if (minute === 0) return `Jam ${hour}`;
  if (minute === 30) return `Setengah ${hour + 1}`;
  if (minute === 15) return `Lebih ${hour}`;
  if (minute === 45) return `Kurang ${hour + 1}`;
  return `${hour}.${minute.toString().padStart(2, '0')}`;
};

const humanizeRange = (sH: number, sM: number, eH: number, eM: number): string => {
  return `${humanizeTime(sH, sM)} - ${humanizeTime(eH, eM)}`;
};

const getPeriod = (hour: number): 'pagi' | 'siang' | 'sore' | 'malam' => {
  if (hour < 10) return 'pagi';
  if (hour < 14) return 'siang';
  if (hour < 18) return 'sore';
  return 'malam';
};

const PERIOD_CONFIG = {
  pagi: {
    Icon: Sun, label: 'PAGI',
    gradient: 'from-amber-500/20 to-orange-500/20',
    borderActive: 'border-amber-500/50',
    textColor: 'text-amber-400',
    bgActive: 'bg-amber-500/20',
  },
  siang: {
    Icon: CloudSun, label: 'SIANG',
    gradient: 'from-yellow-500/20 to-lime-500/20',
    borderActive: 'border-yellow-500/50',
    textColor: 'text-yellow-400',
    bgActive: 'bg-yellow-500/20',
  },
  sore: {
    Icon: Sunset, label: 'SORE',
    gradient: 'from-orange-500/20 to-red-500/20',
    borderActive: 'border-orange-500/50',
    textColor: 'text-orange-400',
    bgActive: 'bg-orange-500/20',
  },
  malam: {
    Icon: Moon, label: 'MALAM',
    gradient: 'from-indigo-500/20 to-purple-500/20',
    borderActive: 'border-indigo-500/50',
    textColor: 'text-indigo-400',
    bgActive: 'bg-indigo-500/20',
  },
} as const;

type PeriodKey = keyof typeof PERIOD_CONFIG;

const generateTimeSlots = (openTime: string, closeTime: string): TimeSlot[] => {
  if (!openTime || !closeTime) return [];
  const [openH, openM] = openTime.split(':').map(Number);
  const [closeH, closeM] = closeTime.split(':').map(Number);
  const slots: TimeSlot[] = [];
  let cH = openH, cM = openM;

  while (cH < closeH || (cH === closeH && cM < closeM)) {
    const nH = cM === 0 ? cH + 1 : cH;
    const nM = cM === 0 ? 0 : 30;
    if (nH > closeH || (nH === closeH && nM > closeM)) break;

    slots.push({
      id: `slot-${cH}-${cM}`,
      label: humanizeRange(cH, cM, nH, nM),
      sublabel: `Kira-kira ${humanizeTime(cH, cM)}`,
      startHour: cH, startMinute: cM,
      endHour: nH, endMinute: nM,
      period: getPeriod(cH),
      rangeMinutes: 60,
    });
    cH = nH; cM = nM;
  }
  return slots;
};

const generateSpecificSlots = (openTime: string, closeTime: string): TimeSlot[] => {
  if (!openTime || !closeTime) return [];
  const [openH, openM] = openTime.split(':').map(Number);
  const [closeH, closeM] = closeTime.split(':').map(Number);
  const slots: TimeSlot[] = [];
  let cH = openH, cM = openM;

  if (cM > 0 && cM < 30) cM = 30;
  else if (cM > 30) { cH += 1; cM = 0; }

  while (cH < closeH || (cH === closeH && cM < closeM)) {
    const nH = cM === 0 ? cH : cH + 1;
    const nM = cM === 0 ? 30 : 0;
    if (nH > closeH || (nH === closeH && nM > closeM)) break;

    slots.push({
      id: `spec-${cH}-${cM}`,
      label: humanizeTime(cH, cM),
      sublabel: `${humanizeTime(cH, cM)} - ${humanizeTime(nH, nM)}`,
      startHour: cH, startMinute: cM,
      endHour: nH, endMinute: nM,
      period: getPeriod(cH),
      rangeMinutes: 30,
    });
    cH = nH; cM = nM;
  }
  return slots;
};

// ═══════════════════════════════════════════════════════
//  SUB-COMPONENT: TimelineVisualizer
// ═══════════════════════════════════════════════════════

function TimelineVisualizer({
  openTime, closeTime, selectedSlot,
}: {
  openTime: string;
  closeTime: string;
  selectedSlot: TimeSlot | null;
}) {
  const [openH, openM] = openTime.split(':').map(Number);
  const [closeH, closeM] = closeTime.split(':').map(Number);
  const totalMin = (closeH * 60 + closeM) - (openH * 60 + openM);

  const pct = (h: number, m: number) => ((h * 60 + m) - (openH * 60 + openM)) / totalMin * 100;

  const markers: number[] = [];
  for (let h = openH; h <= closeH; h++) markers.push(h);

  const range = selectedSlot
    ? { start: pct(selectedSlot.startHour, selectedSlot.startMinute), end: pct(selectedSlot.endHour, selectedSlot.endMinute) }
    : null;

  return (
    <div className="relative pt-1">
      <div className="h-2 rounded-full bg-white/5 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 via-yellow-500/20 via-orange-500/20 to-indigo-500/20" />
        <AnimatePresence>
          {range && (
            <motion.div
              initial={{ left: range.start, width: 0, opacity: 0 }}
              animate={{ left: range.start, width: range.end - range.start, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
              className="absolute top-0 h-full bg-matcha/60 rounded-full"
              style={{ boxShadow: '0 0 12px rgba(106,205,130,0.4)' }}
            />
          )}
        </AnimatePresence>
      </div>
      <div className="relative mt-1.5 h-6">
        {markers.map(h => (
          <div key={h} className="absolute -translate-x-1/2" style={{ left: `${pct(h, 0)}%` }}>
            <div className="w-px h-1.5 bg-white/10 mx-auto" />
            <span className="text-[8px] text-foreground/30 font-medium block text-center mt-0.5 whitespace-nowrap">
              {h.toString().padStart(2, '0')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  SUB-COMPONENT: HumanTimeFilter
// ═══════════════════════════════════════════════════════

function HumanTimeFilter({
  openTime, closeTime, selectedSlotId, onSelect,
}: {
  openTime: string;
  closeTime: string;
  selectedSlotId: string | null;
  onSelect: (slot: TimeSlot | null) => void;
}) {
  const [showSpecific, setShowSpecific] = useState(false);

  const mainSlots = useMemo(() => generateTimeSlots(openTime || '07:00', closeTime || '22:00'), [openTime, closeTime]);
  const specSlots = useMemo(() => generateSpecificSlots(openTime || '07:00', closeTime || '22:00'), [openTime, closeTime]);
  const currentSlots = showSpecific ? specSlots : mainSlots;

  const grouped = useMemo(() => {
    const g: Record<string, TimeSlot[]> = { pagi: [], siang: [], sore: [], malam: [] };
    currentSlots.forEach(s => g[s.period].push(s));
    return g;
  }, [currentSlots]);

  const selectedData = [...mainSlots, ...specSlots].find(s => s.id === selectedSlotId) || null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-matcha/15 rounded-lg">
            <Clock size={16} className="text-matcha" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Kira-kira Kapan Masuk?</h3>
            <p className="text-[10px] text-foreground/50 font-medium tracking-tight">Pilih perkiraan waktu kendaraaan masuk</p>
          </div>
        </div>
        {selectedData && (
          <button onClick={() => onSelect(null)}
            className="text-[10px] text-foreground/40 hover:text-foreground/70 font-bold uppercase tracking-widest px-2 py-1 rounded-md hover:bg-white/5">
            Reset
          </button>
        )}
      </div>

      {/* Selected Badge */}
      <AnimatePresence>
        {selectedData && (
          <motion.div initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -10, height: 0 }} className="overflow-hidden">
            <div className={`rounded-xl px-4 py-2.5 border bg-gradient-to-r ${PERIOD_CONFIG[selectedData.period].gradient} ${PERIOD_CONFIG[selectedData.period].borderActive}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {(() => { const C = PERIOD_CONFIG[selectedData.period].Icon; return <C size={14} className={PERIOD_CONFIG[selectedData.period].textColor} />; })()}
                  <span className={`text-xs font-bold ${PERIOD_CONFIG[selectedData.period].textColor}`}>{selectedData.label}</span>
                </div>
                <span className="text-[10px] text-foreground/50 font-medium">Rentang {selectedData.rangeMinutes} menit</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Period Sections */}
      <div className="space-y-3">
        {(['pagi', 'siang', 'sore', 'malam'] as PeriodKey[]).map(period => {
          const cfg = PERIOD_CONFIG[period];
          const slots = grouped[period];
          if (!slots.length) return null;

          return (
            <div key={period}>
              <div className="flex items-center gap-2 mb-2">
                <cfg.Icon size={12} className={`${cfg.textColor} opacity-60`} />
                <span className={`text-[10px] font-bold tracking-widest uppercase ${cfg.textColor} opacity-60`}>{cfg.label}</span>
                <div className="flex-1 h-px bg-white/5" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {slots.map(slot => {
                  const active = selectedSlotId === slot.id;
                  return (
                    <motion.button key={slot.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => onSelect(active ? null : slot)}
                      className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 border
                        ${active
                          ? `${cfg.bgActive} ${cfg.borderActive} ${cfg.textColor} shadow-lg`
                          : 'bg-white/[0.03] border-white/[0.06] text-foreground/60 hover:bg-white/[0.06] hover:border-white/[0.1] hover:text-foreground/80'}`}>
                      {slot.label}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Toggle Specific */}
      <div className="relative pt-2">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5" /></div>
        <div className="relative flex justify-center">
          <button onClick={() => setShowSpecific(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold tracking-wider uppercase bg-[#13131f] border border-white/10 rounded-full text-foreground/40 hover:text-foreground/70 hover:border-white/20 transition-all">
            {showSpecific ? 'Pilih Rentang Jam' : 'Pilih Waktu Spesifik'}
            <motion.div animate={{ rotate: showSpecific ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronRight size={10} />
            </motion.div>
          </button>
        </div>
      </div>

      {/* Timeline */}
      <TimelineVisualizer openTime={openTime || '07:00'} closeTime={closeTime || '22:00'} selectedSlot={selectedData} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  MAIN COMPONENT: ActiveGallery
// ═══════════════════════════════════════════════════════

export default function ActiveGallery() {
  const [motors, setMotors] = useState<ActiveMotor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [showFilter, setShowFilter] = useState(true);
  const [selectedMotor, setSelectedMotor] = useState<ActiveMotor | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminData, setAdminData] = useState<any>(null);
  const [stnkNumber, setStnkNumber] = useState('');
  const [reason, setReason] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<number | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [cafeProfile, setCafeProfile] = useState<any>(null);

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [sessionsRes, settingsRes, profileRes] = await Promise.all([
        fetch('/api/parking-sessions/active', { headers: getAuthHeaders() }),
        fetch('/api/settings/parking', { headers: getAuthHeaders() }),
        fetch('/api/settings/profile', { headers: getAuthHeaders() })
      ]);
      
      const sData = await sessionsRes.json();
      const stData = await settingsRes.json();
      const pData = await profileRes.json();
      
      if (sData.success) setMotors(sData.data);
      if (stData.success) setSettings(stData.data);
      if (pData.success) setCafeProfile(pData.data);
    } catch (err) {
      toast.error("Gagal memuat data dari server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredMotors = useMemo(() => {
    if (!selectedSlot) return motors;
    const sMin = selectedSlot.startHour * 60 + selectedSlot.startMinute;
    const eMin = selectedSlot.endHour * 60 + selectedSlot.endMinute;
    return motors.filter(motor => {
      const d = new Date(motor.entry_time);
      const m = d.getHours() * 60 + d.getMinutes();
      return m >= sMin && m < eMin;
    });
  }, [motors, selectedSlot]);

  const [isProcessingScan, setIsProcessingScan] = useState(false);

  const handleAdminScan = async (decodedText: string) => {
    if (isProcessingScan) return;
    setIsProcessingScan(true);

    try {
      const response = await fetch('/api/users/verify-key', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ master_key: decodedText.trim() })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setAdminData(result.data);
        setIsAuthorized(true);
        setShowScanner(false);
        toast.success(`Otorisasi Berhasil: Admin ${result.data.full_name}`);
      } else {
        toast.error(result.error || "Otorisasi Gagal: QR tidak valid");
      }
    } catch (err) {
      toast.error("Format QR tidak valid atau kesalahan server");
    } finally {
      setIsProcessingScan(false);
    }
  };

  const handleProcessPayment = async () => {
    if (!stnkNumber || !reason) {
      toast.warn("Harap isi Nomor STNK dan Alasan Kehilangan");
      return;
    }

    if (!selectedMotor) return;

    try {
      const response = await fetch(`/api/parking-sessions/${selectedMotor.id}/lost-ticket`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          admin_id: adminData.id,
          stnk_number: stnkNumber,
          reason: reason,
          payment_method_id: paymentMethod
        })
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Transaksi Berhasil Diproses");
        setSelectedMotor(null);
        setIsAuthorized(false);
        setAdminData(null);
        setStnkNumber('');
        setReason('');
        setPaymentMethod(null);
        fetchData();
      } else {
        toast.error(result.error || "Gagal memproses transaksi");
      }
    } catch (err) {
      toast.error("Kesalahan jaringan");
    }
  };

  const calculateTotal = (motor: ActiveMotor) => {
    if (!settings) return 0;
    const durHours = Math.ceil(motor.duration_seconds / 3600);
    let parkingFee = durHours * settings.hourly_rate;
    if (parkingFee > settings.max_daily_rate) parkingFee = settings.max_daily_rate;
    
    const fine = settings.lost_ticket_fine || 5000;
    const base = parkingFee + fine;
    const ppn = (base * settings.ppn_percentage) / 100;
    return Math.round(base + ppn);
  };

  const openTime = cafeProfile?.operating_hours_open || '07:00';
  const closeTime = cafeProfile?.operating_hours_close || '22:00';

  return (
    <div className="space-y-6 animate-fade-in p-6 max-w-[1400px] mx-auto pb-20">
      {/* Header & Filter Card */}
      <div className="bg-[#13131f] rounded-[32px] overflow-hidden border border-white/10 shadow-2xl">
        <div className="p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <button 
                onClick={() => window.location.href = '/live'}
                className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-4 text-xs font-bold uppercase tracking-widest"
              >
                <ChevronLeft size={16} /> Kembali ke Live Monitor
              </button>
              <div className="flex items-center gap-4">
                <h1 className="text-3xl font-black text-white tracking-tight">Galeri Kendaraan</h1>
                <div className="px-3 py-1 rounded-full bg-red-500/15 border border-red-500/20 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  <span className="text-[10px] font-bold text-red-400 tracking-wider">LOST TICKET MODE</span>
                </div>
              </div>
              <p className="text-white/40 text-sm mt-2 max-w-sm font-medium">Temukan bukti visual kendaraan yang kehilangan karcis parkir.</p>
            </div>

            <button onClick={() => setShowFilter(v => !v)}
              className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-black transition-all shadow-lg
                ${showFilter 
                  ? 'bg-matcha text-black shadow-matcha/10' 
                  : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 shadow-black/20'}`}>
              <Filter size={16} /> 
              {showFilter ? 'Sembunyikan Filter' : 'Filter Waktu Masuk'}
            </button>
          </div>
        </div>

        {/* Humanized Filter Panel */}
        <AnimatePresence>
          {showFilter && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }} className="overflow-hidden">
              <div className="px-8 pb-8 border-t border-white/5 pt-8">
                <HumanTimeFilter
                  openTime={openTime}
                  closeTime={closeTime}
                  selectedSlotId={selectedSlot?.id || null}
                  onSelect={setSelectedSlot}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Result Meta */}
      <div className="flex items-center justify-between px-2">
        <p className="text-xs text-white/40 font-bold uppercase tracking-widest">
          {selectedSlot
            ? `Ditemukan ${filteredMotors.length} Kendaraan (${selectedSlot.label})`
            : `Menampilkan Semua ${motors.length} Kendaraan`}
        </p>
        {selectedSlot && (
          <button onClick={() => setSelectedSlot(null)} className="flex items-center gap-1.5 text-xs font-bold text-matcha hover:opacity-70 transition-opacity">
            <X size={14} /> Reset Filter
          </button>
        )}
      </div>

      {/* Grid Gallery */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="aspect-[4/3] bg-white/5 rounded-3xl animate-pulse border border-white/5" />
          ))}
        </div>
      ) : filteredMotors.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredMotors.map((motor) => (
            <motion.div
              layoutId={`motor-${motor.id}`}
              key={motor.id}
              whileHover={{ y: -8, scale: 1.02 }}
              onClick={() => setSelectedMotor(motor)}
              className={`group cursor-pointer relative aspect-[4/3] bg-[#0d0d18] border rounded-[32px] overflow-hidden shadow-2xl transition-all
                ${selectedSlot ? 'border-matcha/20' : 'border-white/10'}`}
            >
              {motor.entry_photo_url ? (
                <img 
                  src={window.location.origin + '/' + motor.entry_photo_url} 
                  alt={motor.plate_number} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white/5">
                  <Camera size={48} strokeWidth={1} />
                  <span className="text-[10px] mt-4 font-mono font-bold uppercase tracking-[0.3em]">No Image</span>
                </div>
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent flex flex-col justify-end p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-mono font-black text-white tracking-[0.15em]">{motor.plate_number}</p>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-0.5">
                      {new Date(motor.entry_time).toLocaleTimeString('id-id', { hour: '2-digit', minute: '2-digit' })} WIB
                    </p>
                  </div>
                  <div className="p-2.5 bg-matcha/10 text-matcha rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight size={18} />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="py-40 flex flex-col items-center justify-center bg-white/[0.02] border-2 border-dashed border-white/5 rounded-[48px]">
          <div className="p-6 bg-white/5 rounded-full mb-6">
            <Clock size={48} className="text-white/12" />
          </div>
          <h3 className="text-white/40 text-xl font-bold uppercase tracking-widest">Tidak Ada Data</h3>
          <p className="text-white/20 text-sm mt-2">Coba pilih rentang waktu atau jam masuk lainnya.</p>
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedMotor && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
            <motion.div 
              layoutId={`motor-${selectedMotor.id}`}
              className="bg-[#13131f] border border-white/10 rounded-[48px] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-[0_0_100px_rgba(0,0,0,0.8)]"
            >
              {/* Left: Evidence Image */}
              <div className="md:w-[55%] bg-black relative flex items-center justify-center">
                {selectedMotor.entry_photo_url ? (
                  <img 
                    src={window.location.origin + '/' + selectedMotor.entry_photo_url} 
                    alt={selectedMotor.plate_number} 
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center text-white/10">
                    <Camera size={120} strokeWidth={0.5} />
                    <p className="mt-4 font-mono uppercase tracking-[0.5em] text-xs">Evidence Missing</p>
                  </div>
                )}
                
                <div className="absolute top-8 left-8">
                  <div className="px-6 py-3 bg-black/60 backdrop-blur-2xl rounded-3xl border border-white/10">
                    <p className="text-[10px] text-white/40 uppercase font-black tracking-[0.2em] leading-none mb-2">Identitas Plat</p>
                    <p className="text-2xl font-mono font-black text-white tracking-[0.2em]">{selectedMotor.plate_number}</p>
                  </div>
                </div>

                <button 
                  onClick={() => { setSelectedMotor(null); setIsAuthorized(false); }}
                  className="absolute top-8 right-8 p-3 bg-white/5 hover:bg-white/10 rounded-full text-white/60 transition-all border border-white/10"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Right: Lost Ticket Form */}
              <div className="md:w-[45%] p-10 overflow-y-auto bg-gradient-to-b from-[#13131f] to-[#0d0d18]">
                <div className="flex items-center gap-4 mb-10">
                  <div className="p-4 bg-red-500/10 rounded-2xl text-red-500 shadow-lg shadow-red-500/5">
                    <AlertTriangle size={32} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-white tracking-tight leading-none uppercase italic">Lost Ticket</h2>
                    <p className="text-white/30 text-xs mt-2 font-black uppercase tracking-widest">Verifikasi Identitas Manual</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/3 rounded-3xl p-5 border border-white/5">
                      <p className="text-[10px] uppercase font-black tracking-widest text-white/20 mb-2">Masuk Jam</p>
                      <p className="text-lg font-mono font-black text-white">{new Date(selectedMotor.entry_time).toLocaleTimeString('id-id', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div className="bg-white/3 rounded-3xl p-5 border border-white/5">
                      <p className="text-[10px] uppercase font-black tracking-widest text-white/20 mb-2">Parkir Selama</p>
                      <p className="text-lg font-mono font-black text-white">{Math.floor(selectedMotor.duration_seconds / 3600)}j {Math.floor((selectedMotor.duration_seconds % 3600) / 60)}m</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] uppercase font-black tracking-[0.2em] text-white/30 block mb-3 ml-1">Keterangan STNK / Nama Pemilik</label>
                      <div className="relative">
                        <Hash className="absolute left-5 top-1/2 -translate-y-1/2 text-matcha" size={18} />
                        <input 
                          type="text" 
                          placeholder="B xxxx XXX - Pemilik"
                          value={stnkNumber}
                          onChange={(e) => setStnkNumber(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-sm text-white focus:ring-1 focus:ring-matcha/50 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-black tracking-[0.2em] text-white/30 block mb-3 ml-1">Kronologi Kehilangan</label>
                      <div className="relative">
                        <FileText className="absolute left-5 top-5 text-matcha" size={18} />
                        <textarea 
                          rows={2}
                          placeholder="Tulis alasan kehilangan karcis..."
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-sm text-white focus:ring-1 focus:ring-matcha/50 outline-none transition-all resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pricing Summary */}
                  <div className="bg-matcha/5 border border-matcha/20 rounded-[40px] p-8">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-white/40 text-xs font-black uppercase tracking-[0.2em]">
                        <span>Estimasi Tarif</span>
                        <span className="font-mono">Rp {(calculateTotal(selectedMotor) - (settings?.lost_ticket_fine || 20000)).toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between items-center text-red-500 text-xs font-black uppercase tracking-[0.2em]">
                        <span>Denda Kehilangan</span>
                        <span className="font-mono">+ Rp {(settings?.lost_ticket_fine || 20000).toLocaleString('id-ID')}</span>
                      </div>
                      <div className="h-px bg-white/10 my-4" />
                      <div className="flex justify-between items-end">
                        <span className="text-[11px] font-black text-white/20 uppercase tracking-[0.4em]">Total Bayar</span>
                        <span className="text-4xl font-mono font-black text-matcha tracking-tighter">
                          <span className="text-base mr-1 opacity-50">Rp</span>
                          {calculateTotal(selectedMotor).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Auth & Payment Buttons */}
                  <div className="space-y-4 pt-4">
                    {(() => {
                      const currentUser = JSON.parse(localStorage.getItem('parkiru:auth-user') || '{}');
                      const isAdmin = currentUser.role === 'admin';

                      if (isAuthorized) {
                        return (
                          <div className="flex items-center gap-4 p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-[28px] text-emerald-400">
                            <ShieldCheck size={28} />
                            <div>
                              <p className="text-sm font-black uppercase tracking-wider">Otorisasi Disetujui</p>
                              <p className="text-[10px] uppercase font-bold opacity-60 mt-1">LID: {adminData?.id} · ADMIN: {adminData?.full_name}</p>
                            </div>
                          </div>
                        );
                      }

                      if (isAdmin) {
                        return (
                          <button 
                            onClick={() => setShowScanner(true)}
                            className="w-full py-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[28px] text-white transition-all flex items-center justify-center gap-3 font-black text-[11px] uppercase tracking-[0.2em]"
                          >
                            <ShieldCheck size={20} className="text-matcha" />
                            Otorisasi Admin Dibutuhkan
                          </button>
                        );
                      }

                      return (
                        <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-[28px] text-center">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400 mb-1">Butuh Otorisasi Admin</p>
                          <p className="text-[10px] text-white/30 font-medium">Minta Admin untuk melakukan scan kartu otorisasi mereka di sini.</p>
                        </div>
                      );
                    })()}

                    {/* Payment Method Selection */}
                    {isAuthorized && (
                      <div className="space-y-4 animate-slide-up">
                        <label className="text-[10px] uppercase font-black tracking-[0.2em] text-white/30 block ml-1">Pilih Metode Pembayaran</label>
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            onClick={() => setPaymentMethod(1)}
                            className={`py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all border flex items-center justify-center gap-2
                              ${paymentMethod === 1 
                                ? 'bg-matcha/20 border-matcha text-matcha shadow-[0_0_20px_rgba(126,217,87,0.15)]' 
                                : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:border-white/20'}`}
                          >
                            <DollarSign size={16} /> Tunai
                          </button>
                          <button
                            onClick={() => setPaymentMethod(2)}
                            className={`py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all border flex items-center justify-center gap-2
                              ${paymentMethod === 2 
                                ? 'bg-matcha/20 border-matcha text-matcha shadow-[0_0_20px_rgba(126,217,87,0.15)]' 
                                : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:border-white/20'}`}
                          >
                            <QrCode size={16} /> QRIS
                          </button>
                        </div>
                      </div>
                    )}

                    <button 
                      disabled={!isAuthorized || !paymentMethod}
                      onClick={handleProcessPayment}
                      className={`w-full py-6 rounded-[32px] font-black text-xl transition-all shadow-2xl uppercase tracking-widest flex items-center justify-center gap-4
                        ${(isAuthorized && paymentMethod)
                        ? 'bg-matcha text-black hover:scale-[1.02] active:scale-[0.98]' 
                        : 'bg-white/5 text-white/10 cursor-not-allowed grayscale'}`}
                    >
                      <CreditCard size={24} />
                      Selesaikan Transaksi
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Scanner Overlay */}
      {showScanner && (
        <AdminScanner 
          onScan={handleAdminScan} 
          onClose={() => setShowScanner(false)} 
        />
      )}
    </div>
  );
}