import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bike, DollarSign, Activity, TrendingUp, TrendingDown, Camera, Scan, Loader2, Calendar } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, BarChart, Bar, Legend 
} from 'recharts';
import { getAuthHeaders } from '../utils/auth';

const API_BASE = '/api/dashboard';

// Define interfaces for your data types
interface RecentEntry {
  plat: string;
  masuk: string;
  durasi: string;
  status: string;
}

interface PeakHour {
  time: string;
  count: number;
}

interface WeeklyTrend {
  day: string;
  masuk: number;
  keluar: number;
}

interface Stats {
  motor_masuk_hari_ini: number;
  motor_aktif: number;
  pendapatan_hari_ini: number;
  motor_masuk_kemarin: number;
  pendapatan_kemarin: number;
}

interface DashboardDataType {
  peakHours: PeakHour[];
  weeklyTrend: WeeklyTrend[];
  recentEntries: RecentEntry[];
  stats: Stats;
}

// Helper function to format currency
const formatRupiah = (amount: number) => {
  if (amount >= 1000000) {
    return `Rp ${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `Rp ${(amount / 1000).toFixed(0)}k`;
  } else {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  }
};

// Helper: generate complete hour slots 07:00-21:00
const ensureHoursRange = (data: PeakHour[]) => {
  const baseHours: PeakHour[] = [];
  for (let h = 7; h <= 22; h++) {
    const time = `${h.toString().padStart(2, '0')}:00`;
    baseHours.push({ time, count: 0 });
  }

  const mapByTime = new Map<string, number>();
  data?.forEach((item) => {
    const key = item.time.length === 2 ? `${item.time}:00` : item.time;
    const normalizedKey = key.slice(0, 5);
    mapByTime.set(normalizedKey, (mapByTime.get(normalizedKey) ?? 0) + item.count);
  });

  return baseHours.map((slot) => ({
    time: slot.time,
    count: mapByTime.get(slot.time) ?? 0
  }));
};

// Helper: format entry_time to local WIB string
const formatToWib = (value: string) => {
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return `${new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
      hour12: false
    }).format(date)} WIB`;
  } catch {
    return value;
  }
};

// Helper: format duration from seconds
const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours} jam ${minutes} menit`;
  } else {
    return `${minutes} menit`;
  }
};

// Default data for loading state
const defaultPeakHoursData: PeakHour[] = Array.from({ length: 16 }, (_, i) => ({
  time: `${(i + 7).toString().padStart(2, '0')}:00`,
  count: 0
}));

const defaultWeeklyTrendData: WeeklyTrend[] = [
  { day: 'Sen', masuk: 0, keluar: 0 },
  { day: 'Sel', masuk: 0, keluar: 0 },
  { day: 'Rab', masuk: 0, keluar: 0 },
  { day: 'Kam', masuk: 0, keluar: 0 },
  { day: 'Jum', masuk: 0, keluar: 0 },
  { day: 'Sab', masuk: 0, keluar: 0 },
  { day: 'Min', masuk: 0, keluar: 0 },
];

const defaultRecentEntries: RecentEntry[] = [];
const defaultStats: Stats = {
  motor_masuk_hari_ini: 0,
  motor_aktif: 0,
  pendapatan_hari_ini: 0,
  motor_masuk_kemarin: 0,
  pendapatan_kemarin: 0
};

const StatCard = ({ title, value, icon: Icon, trend, subtext }: any) => (
  <motion.div 
    whileHover={{ y: -4 }}
    className="glass-card rounded-2xl relative overflow-hidden group p-5 border-t border-white/10"
  >
    {/* Decorative skeuomorphic element */}
    <div className="absolute top-0 left-0 w-full h-1 plain-gradient opacity-20" />
    
    <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
      <Icon size={120} className="text-matcha" />
    </div>
    
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 skeuo-depth rounded-xl text-matcha bg-matcha/5">
          <Icon size={20} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg skeuo-depth ${trend > 0 ? 'text-matcha bg-matcha/5' : 'text-red-400 bg-red-400/5'}`}>
            {trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-[0.2em]">{title}</span>
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl font-black text-foreground tracking-tight">{value}</h3>
          <span className="text-[10px] text-foreground/30 font-medium mb-1">{subtext}</span>
        </div>
      </div>
    </div>
  </motion.div>
);

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardDataType>({
    peakHours: defaultPeakHoursData,
    weeklyTrend: defaultWeeklyTrendData,
    recentEntries: defaultRecentEntries,
    stats: defaultStats
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchDashboardData = async (start = '', end = '') => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (start) params.set('start_date', start);
      if (end) params.set('end_date', end);

      const response = await fetch(`${API_BASE}?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        console.log(result.data?.peakHours);
        const normalizedPeakHours = ensureHoursRange(result.data.peakHours || []);
        const normalizedRecentEntries = (result.data.recentEntries || [])
          .slice(0, 5)
          .map((entry: any) => ({
            plat: entry.plate_number || '-',
            masuk: formatToWib(entry.entry_time || ''),
            durasi: formatDuration(entry.duration_seconds || 0),
            status: entry.status || 'Parkir'
          }));

        setDashboardData({
          peakHours: normalizedPeakHours,
          weeklyTrend: result.data.weeklyTrend || defaultWeeklyTrendData,
          recentEntries: normalizedRecentEntries,
          stats: result.data.stats || defaultStats
        });
      } else {
        throw new Error(result.error || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      // Do not set default data on error, let UI show error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Set default dates to today if not set
    if (!startDate || !endDate) {
      const today = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
      if (!startDate) setStartDate(today);
      if (!endDate) setEndDate(today);
    } else {
      fetchDashboardData(startDate, endDate);
    }
  }, [startDate, endDate]);

  const { peakHours, weeklyTrend, recentEntries, stats } = dashboardData;

  // ADDED THE MISSING RETURN STATEMENT HERE
  return (
    <div className="space-y-6 animate-fade-in max-w-[1600px] mx-auto px-4">
      {/* Header */}
      <div className="glass-card rounded-2xl overflow-hidden border border-border/10">
        <div className="p-6 md:p-7">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-widest text-matcha/80 uppercase">Parkiru Overview</p>
              <h1 className="mt-2 text-3xl font-bold text-foreground tracking-tight">Dashboard</h1>
              <p className="mt-1 text-foreground/60 text-sm font-medium">Selamat datang kembali, Admin Café.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="px-4 py-2 bg-white/5 border border-border/15 rounded-xl text-xs text-foreground/70 font-medium">
                Senin, 14 Juli 2025
              </div>

              <div className="flex gap-2">
                <Link
                  to="/entry"
                  className="px-5 py-2.5 rounded-xl skeuo-btn text-matcha text-xs font-black uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
                >
                  <Camera size={14} />
                  Entri
                </Link>
                <Link
                  to="/checker"
                  className="px-5 py-2.5 rounded-xl skeuo-depth text-foreground/80 text-xs font-black uppercase tracking-wider hover:bg-white/10 active:scale-95 transition-all flex items-center gap-2"
                >
                  <Scan size={14} />
                  Scan
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="h-px bg-white/10" />
        <div className="px-6 md:px-7 py-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={16} />
              <input
                type="date"
                aria-label="Tanggal mulai"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white/5 border border-border/15 rounded-lg py-2 pl-10 pr-4 text-sm text-foreground outline-none"
              />
            </div>
            <span className="text-foreground/40">s/d</span>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={16} />
              <input
                type="date"
                aria-label="Tanggal akhir"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white/5 border border-border/15 rounded-lg py-2 pl-10 pr-4 text-sm text-foreground outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3 Stat Cards - Compact and Side by Side */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loading ? (
          <>
            <div className="glass-card rounded-xl p-4 flex items-center justify-center">
              <Loader2 className="animate-spin text-matcha" size={24} />
            </div>
            <div className="glass-card rounded-xl p-4 flex items-center justify-center">
              <Loader2 className="animate-spin text-matcha" size={24} />
            </div>
            <div className="glass-card rounded-xl p-4 flex items-center justify-center">
              <Loader2 className="animate-spin text-matcha" size={24} />
            </div>
          </>
        ) : error ? (
          <>
            <div className="glass-card rounded-xl p-4 flex items-center justify-center">
              <div className="text-center text-red-400">
                <p className="text-sm font-medium">Error loading data</p>
                <p className="text-xs text-red-300 mt-1">{error}</p>
              </div>
            </div>
            <div className="glass-card rounded-xl p-4 flex items-center justify-center">
              <div className="text-center text-red-400">
                <p className="text-sm font-medium">Error loading data</p>
                <p className="text-xs text-red-300 mt-1">{error}</p>
              </div>
            </div>
            <div className="glass-card rounded-xl p-4 flex items-center justify-center">
              <div className="text-center text-red-400">
                <p className="text-sm font-medium">Error loading data</p>
                <p className="text-xs text-red-300 mt-1">{error}</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <StatCard 
              title="Total Motor Masuk" 
              value={stats.motor_masuk_hari_ini.toString()} 
              icon={Bike} 
              trend={stats.motor_masuk_hari_ini > 0 ? Math.round((stats.motor_aktif / stats.motor_masuk_hari_ini) * 100) : 0} 
              subtext="Hari ini" 
            />
            <StatCard 
              title="Pendapatan Live" 
              value={formatRupiah(stats.pendapatan_hari_ini)} 
              icon={DollarSign} 
              trend={Math.round(((stats.pendapatan_hari_ini - stats.pendapatan_kemarin) / (stats.pendapatan_kemarin || 1)) * 100)} 
              subtext="Estimasi hari ini" 
            />
            <StatCard 
              title="Motor Aktif" 
              value={stats.motor_aktif.toString()} 
              icon={Activity} 
              subtext="Sedang parkir" 
            />
          </>
        )}
      </div>

      {/* Charts: Left larger, Right smaller */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Chart - Larger (takes 2/3) */}
        <motion.div whileHover={{ y: -2 }} className="lg:col-span-2 glass-card p-5 rounded-2xl border border-border/10">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-foreground">Jam Puncak Kunjungan</h2>
            <p className="text-xs text-foreground/50">Distribusi kedatangan motor per jam</p>
          </div>
          <div className="h-[280px] w-full">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin text-matcha" size={32} />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={peakHours}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#A3C585" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#A3C585" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" vertical={false} />
                  <XAxis dataKey="time" stroke="rgba(148,163,184,0.9)" fontSize={10} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                  <YAxis stroke="rgba(148,163,184,0.9)" fontSize={10} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(17, 17, 17, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(10px)', fontSize: '12px' }}
                    itemStyle={{ color: '#A3C585' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#A3C585" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Right Chart - Smaller (takes 1/3) */}
        <motion.div whileHover={{ y: -2 }} className="lg:col-span-1 glass-card p-5 rounded-2xl border border-border/10">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-foreground">Tren Mingguan</h2>
            <p className="text-xs text-foreground/50">Masuk vs Keluar</p>
          </div>
          <div className="h-[280px] w-full">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin text-matcha" size={32} />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyTrend} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" horizontal={false} />
                  <XAxis type="number" stroke="rgba(148,163,184,0.9)" fontSize={10} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="day" stroke="rgba(148,163,184,0.9)" fontSize={10} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} width={30} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(17, 17, 17, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(10px)', fontSize: '12px' }}
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '10px', fontSize: '10px' }} />
                  <Bar dataKey="masuk" fill="#A3C585" radius={[0, 4, 4, 0]} name="Masuk" barSize={12} />
                  <Bar dataKey="keluar" fill="rgba(163, 197, 133, 0.3)" radius={[0, 4, 4, 0]} name="Keluar" barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>
      </div>

      {/* Recent Motor Table */}
      <motion.div whileHover={{ y: -2 }} className="glass-card rounded-2xl overflow-hidden border border-border/10">
        <div className="px-6 py-4 border-b border-border/10 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Motor Terbaru Hari Ini</h2>
            <p className="text-[10px] text-foreground/40 font-medium">Menampilkan 5 aktivitas kendaraan terakhir hari ini</p>
          </div>
          
          <Link 
            to="/live" 
            className="text-xs text-matcha hover:underline transition-all duration-200"
          >
            Lihat Semua
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 text-foreground/50 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold">ID Motor</th>
                <th className="px-6 py-3 font-semibold">Waktu Masuk</th>
                <th className="px-6 py-3 font-semibold">Durasi</th>
                <th className="px-6 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center">
                    <Loader2 className="animate-spin text-matcha mx-auto" size={24} />
                    <p className="text-sm text-foreground/50 mt-2">Memuat data...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-red-400">
                    <p className="text-sm font-medium">Gagal memuat data</p>
                    <p className="text-xs text-red-300 mt-1">{error}</p>
                  </td>
                </tr>
              ) : recentEntries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-foreground/50">
                    <p className="text-sm">Tidak ada motor baru yang terdaftar hari ini</p>
                  </td>
                </tr>
              ) : (
                recentEntries.map((entry, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-3 text-foreground font-mono font-bold text-sm">{entry.plat}</td>
                    <td className="px-6 py-3 text-foreground/60 text-sm">{entry.masuk}</td>
                    <td className="px-6 py-3 text-foreground/60 text-sm">{entry.durasi}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        entry.status === 'Parkir' ? 'bg-amber-400/20 text-amber-400' : 'bg-matcha/20 text-matcha'
                      }`}>
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}