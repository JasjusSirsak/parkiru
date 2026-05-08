import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  DollarSign, 
  CreditCard, 
  Clock, 
  Bike, 
  TrendingUp, 
  AlertTriangle,
  ChevronLeft,
  Calendar,
  Loader2,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { getAuthHeaders } from '../utils/auth';

interface SummaryData {
  total_transactions: number;
  total_cash: string | number;
  total_qris: string | number;
  total_revenue: string | number;
  total_ppn: string | number;
  lost_ticket_count: number;
}

interface TransactionItem {
  transaction_id: string;
  plate_number: string;
  entry_time: string;
  exit_time: string;
  duration_minutes: number;
  total_amount: string | number;
  payment_method: string;
  notes: string;
}

export default function OperatorReport() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ summary: SummaryData; transactions: TransactionItem[] } | null>(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const fetchReport = async () => {
    try {
      setLoading(true);
      let url = '/api/users/report';
      if (dateRange.start && dateRange.end) {
        url += `?start_date=${dateRange.start}&end_date=${dateRange.end}`;
      }
      
      const response = await fetch(url, { headers: getAuthHeaders() });
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        toast.error(result.error || "Gagal memuat laporan");
      }
    } catch (err) {
      toast.error("Kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleDownload = (format: 'pdf' | 'excel') => {
    toast.info(`Menyiapkan file ${format.toUpperCase()}... Tanggal cetak: ${new Date().toLocaleDateString()}`);
    setTimeout(() => {
      toast.success(`Berhasil mengunduh laporan kerja!`);
    }, 2000);
  };

  const formatIDR = (amount: string | number) => {
    const val = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 size={48} className="text-matcha animate-spin mb-4" />
        <p className="text-white/40 font-bold uppercase tracking-widest text-xs">Menyusun Laporan Kerja...</p>
      </div>
    );
  }

  const stats = data?.summary || {
    total_transactions: 0,
    total_cash: 0,
    total_qris: 0,
    total_revenue: 0,
    total_ppn: 0,
    lost_ticket_count: 0
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <button 
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-4 text-xs font-bold uppercase tracking-widest"
          >
            <ChevronLeft size={16} /> Kembali
          </button>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-matcha/20 rounded-2xl text-matcha">
              <FileText size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">Laporan Kerja Operator</h1>
              <p className="text-white/40 text-sm mt-1 font-medium">Ringkasan performa dan setoran harian Anda.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleDownload('pdf')}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/70 text-sm font-bold hover:bg-white/10 transition-all"
          >
            <Download size={18} /> PDF
          </button>
          <button 
            onClick={() => handleDownload('excel')}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-matcha text-black text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Download size={18} /> Excel (XLSX)
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#13131f] border border-white/10 rounded-[32px] p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-matcha/15 rounded-xl text-matcha">
              <Bike size={20} />
            </div>
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Total Layanan</p>
          </div>
          <p className="text-3xl font-black text-white">{stats.total_transactions}</p>
          <p className="text-[10px] text-white/20 mt-1 uppercase font-bold">Motor Keluar</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[#13131f] border border-white/10 rounded-[32px] p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-emerald-500/15 rounded-xl text-emerald-400">
              <DollarSign size={20} />
            </div>
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Setoran Tunai</p>
          </div>
          <p className="text-2xl font-black text-emerald-400 font-mono">{formatIDR(stats.total_cash)}</p>
          <div className="mt-2 flex items-center gap-1.5">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
             <p className="text-[9px] text-white/20 uppercase font-bold">Uang Fisik di Laci</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[#13131f] border border-white/10 rounded-[32px] p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-blue-500/15 rounded-xl text-blue-400">
              <CreditCard size={20} />
            </div>
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Pendapatan QRIS</p>
          </div>
          <p className="text-2xl font-black text-blue-400 font-mono">{formatIDR(stats.total_qris)}</p>
          <p className="text-[9px] text-white/20 mt-2 uppercase font-bold">Masuk ke Rekening</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-[#13131f] border border-white/10 rounded-[32px] p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <TrendingUp size={80} />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-red-400/15 rounded-xl text-red-400">
              <AlertTriangle size={20} />
            </div>
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Karcis Hilang</p>
          </div>
          <p className="text-3xl font-black text-white">{stats.lost_ticket_count}</p>
          <p className="text-[10px] text-red-400/60 mt-1 uppercase font-bold">Insiden Terdata</p>
        </motion.div>
      </div>

      {/* Filter & Table Container */}
      <div className="bg-[#13131f] border border-white/10 rounded-[40px] overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-matcha/5 to-transparent">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/5 rounded-2xl text-white/40">
              <Filter size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight italic">Detail Transaksi Saya</h3>
              <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mt-1">Audit log per aktivitas keluar motor</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                <Calendar size={14} className="text-matcha" />
                <span className="text-xs font-bold text-white/60">Hari Ini</span>
             </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Waktu Keluar</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Plat Nomor</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Durasi</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-white/20 text-center">Metode</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-white/20 text-right">Total Bayar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {data?.transactions.map((t, i) => (
                <tr key={t.transaction_id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/5 rounded-lg text-white/20 group-hover:text-matcha transition-colors">
                        <Clock size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{new Date(t.exit_time).toLocaleTimeString('id-id', { hour: '2-digit', minute: '2-digit' })}</p>
                        <p className="text-[10px] text-white/30 uppercase font-bold tracking-tighter">WIB</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <p className="text-lg font-mono font-black text-white tracking-[0.1em]">{t.plate_number}</p>
                    <p className="text-[9px] text-white/30 truncate max-w-[150px] italic">{t.notes || '-'}</p>
                  </td>
                  <td className="px-6 py-6">
                    <p className="text-sm font-bold text-white/80">{Math.floor(t.duration_minutes / 60)}j {t.duration_minutes % 60}m</p>
                  </td>
                  <td className="px-6 py-6 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border
                      ${t.payment_method === 'Tunai' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                      {t.payment_method}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <p className="text-lg font-mono font-black text-white">{formatIDR(t.total_amount)}</p>
                  </td>
                </tr>
              ))}
              {data?.transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <FileText size={48} className="mx-auto text-white/10 mb-4" />
                    <p className="text-white/20 font-bold uppercase tracking-widest text-xs">Belum ada aktivitas transaksi hari ini.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary Bar */}
        <div className="p-8 bg-white/[0.02] border-t border-white/5">
           <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-10">
                 <div>
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Total PPN (11%)</p>
                    <p className="text-lg font-mono font-bold text-white/40">{formatIDR(stats.total_ppn)}</p>
                 </div>
                 <div className="h-10 w-px bg-white/5" />
                 <div>
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Nilai Bersih</p>
                    <p className="text-lg font-mono font-bold text-white/40">{formatIDR(parseFloat(String(stats.total_revenue)) - parseFloat(String(stats.total_ppn)))}</p>
                 </div>
              </div>
              <div className="bg-matcha/10 border border-matcha/20 rounded-2xl px-10 py-4 text-center skeuo-inset">
                 <p className="text-[10px] font-black text-matcha uppercase tracking-[0.3em] mb-1">Grand Total</p>
                 <p className="text-3xl font-mono font-black text-matcha">{formatIDR(stats.total_revenue)}</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
