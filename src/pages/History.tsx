import React, { useEffect, useState } from 'react';
    import { Search, Download, Calendar, PieChart as PieIcon, X, Clock, Timer, Bike, Hash, TrendingUp, Eye, Image as ImageIcon, FileText, FileSpreadsheet, RotateCcw } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getAuthHeaders } from '../utils/auth';

    const COLORS = ['#A3C585', 'rgba(163, 197, 133, 0.3)'];
    const currencyFormatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });

    const formatDuration = (minutes = 0) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return hours > 0 ? `${hours}j ${mins}m` : `${mins}m`;
    };

    const formatDate = (value) => {
      if (!value) return '-';
      return new Date(value).toLocaleDateString('id-ID');
    };

    const formatTime = (value) => {
      if (!value) return '-';
      return new Date(value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    };

    function HistoryDetailModal({ data, onClose }) {
      const overlayRef = React.useRef(null);

      React.useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handler);
        return () => {
          window.removeEventListener('keydown', handler);
          document.body.style.overflow = originalOverflow;
        };
      }, [onClose]);

      const handleOverlayClick = (e) => {
        if (e.target === overlayRef.current) onClose();
      };

      return createPortal(
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleOverlayClick}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 16 }}
            className="relative bg-[#13131f] border border-white/10 rounded-3xl shadow-2xl overflow-hidden w-full max-w-4xl flex flex-col md:flex-row"
          >
            {/* Photos Panel */}
            <div className="md:w-[450px] shrink-0 bg-[#0d0d18] grid grid-cols-1 gap-[2px] border-r border-white/10">
              {/* Entry Photo */}
              <div className="relative h-[250px] overflow-hidden group">
                {data.entry_photo_url ? (
                  <img src={data.entry_photo_url} alt="Foto Masuk" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-white/5 opacity-40">
                    <ImageIcon size={32} />
                    <span className="text-[10px] mt-2 uppercase tracking-widest">No Entry Photo</span>
                  </div>
                )}
                <div className="absolute top-4 left-4 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border border-emerald-500/30">
                  Foto Masuk
                </div>
              </div>
              
              {/* Exit Photo */}
              <div className="relative h-[250px] overflow-hidden group">
                {data.closed_photo_url ? (
                  <img src={data.closed_photo_url} alt="Foto Keluar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-white/5 opacity-40">
                    <ImageIcon size={32} />
                    <span className="text-[10px] mt-2 uppercase tracking-widest">No Exit Photo</span>
                  </div>
                )}
                <div className="absolute top-4 left-4 px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border border-red-500/30">
                  Foto Keluar
                </div>
              </div>
            </div>

            {/* Info Panel */}
            <div className="flex-1 flex flex-col p-8 md:p-10 relative">
              <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all">
                <X size={20} />
              </button>

              <div className="mb-8">
                <p className="text-[11px] uppercase tracking-[.25em] text-white/30 font-bold mb-2">Riwayat Transaksi</p>
                <h2 className="text-4xl font-mono font-bold text-white tracking-widest">{data.plate_number}</h2>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3 text-emerald-400/60">
                    <Clock size={16} />
                    <span className="text-[10px] uppercase tracking-widest font-bold">Waktu Masuk</span>
                  </div>
                  <p className="text-lg font-mono font-bold text-white">{formatTime(data.entry_time)}</p>
                  <p className="text-[11px] text-white/30 mt-1">{formatDate(data.entry_time)}</p>
                </div>
                <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3 text-red-400/60">
                    <Clock size={16} />
                    <span className="text-[10px] uppercase tracking-widest font-bold">Waktu Keluar</span>
                  </div>
                  <p className="text-lg font-mono font-bold text-white">{formatTime(data.exit_time)}</p>
                  <p className="text-[11px] text-white/30 mt-1">{formatDate(data.exit_time)}</p>
                </div>
                <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3 text-blue-400/60">
                    <Timer size={16} />
                    <span className="text-[10px] uppercase tracking-widest font-bold">Total Durasi</span>
                  </div>
                  <p className="text-lg font-mono font-bold text-white">{formatDuration(data.duration_minutes)}</p>
                  <p className="text-[11px] text-white/30 mt-1">Selesai</p>
                </div>
                <div className="bg-matcha/10 border border-matcha/20 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3 text-matcha">
                    <TrendingUp size={16} />
                    <span className="text-[10px] uppercase tracking-widest font-bold">Total Bayar</span>
                  </div>
                  <p className="text-lg font-mono font-bold text-matcha">{currencyFormatter.format(data.total_amount ?? 0)}</p>
                  <p className="text-[11px] text-matcha/40 mt-1">{data.payment_method_id === 1 ? 'TUNAI' : 'QRIS'}</p>
                </div>
              </div>

              {/* Transaction ID / QR Section */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mt-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/5 rounded-lg text-white/40">
                      <Hash size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Nomor Transaksi</p>
                      <p className="text-xs font-mono font-bold text-white/80 mt-0.5">{data.transaction_id || data.id}</p>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-white/10 rounded-md text-[10px] font-bold text-white/60 uppercase">
                    Paid
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>,
        document.body
      );
    }

    export default function History() {
      const [history, setHistory] = useState([]);
      const [search, setSearch] = useState('');
      const [startDate, setStartDate] = useState('');
      const [endDate, setEndDate] = useState('');
      const [totalCount, setTotalCount] = useState(0);
      const [page, setPage] = useState(1);
      const [pages, setPages] = useState(1);
      const [limit] = useState(10);
      const [loading, setLoading] = useState(false);
      const [selectedHistory, setSelectedHistory] = useState(null);
      const [showExportOptions, setShowExportOptions] = useState(false);

      const fetchHistory = async (query = {}) => {
        setLoading(true);
        try {
          const searchParams = new URLSearchParams();
          if (query.plate_number) searchParams.set('plate_number', query.plate_number);
          if (query.start_date) searchParams.set('start_date', query.start_date);
          if (query.end_date) searchParams.set('end_date', query.end_date);
          if (query.page) searchParams.set('page', String(query.page));
          if (query.limit) searchParams.set('limit', String(query.limit));

          const response = await fetch(`/api/transactions?${searchParams.toString()}`, {
            headers: getAuthHeaders(),
          });
          const json = await response.json();

          if (!response.ok) {
            console.error('Fetch history error:', json);
            setHistory([]);
            setTotalCount(0);
            return;
          }

          setHistory(json.data || []);
          setTotalCount(json.pagination?.total ?? (json.data?.length ?? 0));
          setPage(json.pagination?.page ?? query.page ?? 1);
          setPages(json.pagination?.pages ?? 1);
        } catch (error) {
          console.error('Error fetching history:', error);
          setHistory([]);
          setTotalCount(0);
          setPages(1);
        } finally {
          setLoading(false);
        }
      };

      useEffect(() => {
        fetchHistory({ page: 1, limit });
      }, []);

      const handleFilter = () => {
        fetchHistory({ plate_number: search.trim(), start_date: startDate, end_date: endDate, page: 1, limit });
      };

      const handlePrevPage = () => {
        if (page <= 1) return;
        fetchHistory({ plate_number: search.trim(), start_date: startDate, end_date: endDate, page: page - 1, limit });
      };

      const handleNextPage = () => {
        if (page >= pages) return;
        fetchHistory({ plate_number: search.trim(), start_date: startDate, end_date: endDate, page: page + 1, limit });
      };

      const handleGoToPage = (nextPage) => {
        if (!nextPage || nextPage < 1 || nextPage > pages || nextPage === page) return;
        fetchHistory({ plate_number: search.trim(), start_date: startDate, end_date: endDate, page: nextPage, limit });
      };

      const handleShowAll = () => {
        setSearch('');
        setStartDate('');
        setEndDate('');
        fetchHistory({ page: 1, limit });
      };

      const handleExport = async (format) => {
        setShowExportOptions(false);
        setLoading(true);
        try {
          // Mengambil semua data sesuai filter (tanpa limit halaman kecil)
          const searchParams = new URLSearchParams();
          if (search) searchParams.set('plate_number', search.trim());
          if (startDate) searchParams.set('start_date', startDate);
          if (endDate) searchParams.set('end_date', endDate);
          searchParams.set('limit', '5000'); // Batasi 5000 baris untuk keamanan

          const response = await fetch(`/api/transactions?${searchParams.toString()}`, {
            headers: getAuthHeaders(),
          });
          const json = await response.json();
          const allData = json.data || [];

          if (format === 'excel') {
            const headers = ['ID Transaksi', 'Tanggal', 'Plat Nomor', 'Masuk', 'Keluar', 'Durasi', 'Total Bayar', 'Metode'];
            const csvRows = [
              headers.join(','),
              ...allData.map(row => [
                row.transaction_id || row.id,
                new Date(row.exit_time).toLocaleDateString('id-ID'),
                row.plate_number,
                new Date(row.entry_time).toLocaleTimeString('id-ID'),
                new Date(row.exit_time).toLocaleTimeString('id-ID'),
                formatDuration(row.duration_minutes),
                row.total_amount,
                row.payment_method_id === 1 ? 'TUNAI' : 'QRIS'
              ].map(v => `"${v}"`).join(','))
            ];
            
            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Laporan_Parkir_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
          } else {
            // PDF simple menggunakan Print browser
            window.print();
          }
        } catch (error) {
          console.error('Export error:', error);
          alert('Gagal mengekspor data');
        } finally {
          setLoading(false);
        }
      };

      const totalRevenueDisplayed = history.reduce((sum, row) => sum + (Number(row.total_amount) || 0), 0);

      const tunaiCount = history.reduce((sum, row) => sum + (row.payment_method_id === 1 ? 1 : 0), 0);
      const qrisCount = history.reduce((sum, row) => sum + (row.payment_method_id === 2 ? 1 : 0), 0);
      const paymentTotal = tunaiCount + qrisCount;
      const tunaiPercent = paymentTotal > 0 ? Math.round((tunaiCount / paymentTotal) * 100) : 0;
      const qrisPercent = paymentTotal > 0 ? 100 - tunaiPercent : 0;
      const paymentData = [
        { name: 'Tunai', value: tunaiCount },
        { name: 'QRIS', value: qrisCount },
      ];

      return (
        <div className="space-y-8 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Riwayat Pengendara</h1>
              <p className="text-foreground/60">Laporan lengkap aktivitas parkir motor.</p>
            </div>
            <div className="flex items-center gap-3 relative">
              <button 
                onClick={() => setShowExportOptions(!showExportOptions)}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-border/15 rounded-xl text-foreground/70 hover:text-foreground hover:bg-white/10 transition-all"
              >
                <Download size={18} />
                <span>Ekspor Laporan</span>
              </button>

              <AnimatePresence>
                {showExportOptions && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowExportOptions(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-full mt-2 w-48 bg-[#13131f] border border-white/10 rounded-2xl shadow-2xl p-2 z-20 backdrop-blur-xl"
                    >
                      <button
                        onClick={() => handleExport('excel')}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-foreground/70 hover:text-white hover:bg-white/5 transition-all text-left"
                      >
                        <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                          <FileSpreadsheet size={16} />
                        </div>
                        Excel (.CSV)
                      </button>
                      <button
                        onClick={() => handleExport('pdf')}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-foreground/70 hover:text-white hover:bg-white/5 transition-all text-left"
                      >
                        <div className="p-1.5 bg-red-500/10 text-red-400 rounded-lg">
                          <FileText size={16} />
                        </div>
                        PDF / Print
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="glass-card p-6 rounded-2xl flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={16} />
                  <input
                    type="text"
                    placeholder="Cari riwayat pengendara..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-white/5 border border-border/15 rounded-lg py-2 pl-10 pr-4 text-sm text-foreground focus:ring-2 focus:ring-matcha/50 outline-none transition-all"
                  />
                </div>
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleFilter}
                    className="px-4 py-2 bg-matcha text-black font-bold rounded-lg text-sm hover:scale-105 transition-all"
                  >
                    Filter
                  </button>
                  <button
                    onClick={handleShowAll}
                    title="Reset Filter"
                    className="p-2 bg-white/5 border border-border/15 rounded-lg text-foreground/40 hover:text-foreground hover:bg-white/10 transition-all"
                  >
                    <RotateCcw size={16} />
                  </button>
                </div>
              </div>

              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-white/5 text-foreground/50 text-xs uppercase tracking-widest font-bold">
                        <th className="px-6 py-4">Tanggal</th>
                        <th className="px-6 py-4">Antre</th>
                        <th className="px-6 py-4">Masuk</th>
                        <th className="px-6 py-4">Keluar</th>
                        <th className="px-6 py-4">Durasi</th>
                        <th className="px-6 py-4 text-right">Total Bayar</th>
                        <th className="px-6 py-4 text-right">Detail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {loading ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-6 text-center text-foreground/60">
                            Memuat data...
                          </td>
                        </tr>
                      ) : history.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-6 text-center text-foreground/60">
                            Tidak ada riwayat parkir untuk filter ini.
                          </td>
                        </tr>
                      ) : (
                        history.map((row) => (
                          <tr 
                            key={row.id} 
                            onClick={() => setSelectedHistory(row)}
                            className="hover:bg-white/5 transition-colors group cursor-pointer"
                          >
                            <td className="px-6 py-4 text-foreground/60 text-sm whitespace-nowrap">{formatDate(row.exit_time)}</td>
                            <td className="px-6 py-4 text-foreground font-mono font-bold">{row.plate_number}</td>
                            <td className="px-6 py-4 text-foreground/70 text-sm">{formatTime(row.entry_time)}</td>
                            <td className="px-6 py-4 text-foreground/70 text-sm">{formatTime(row.exit_time)}</td>
                            <td className="px-6 py-4 text-foreground/70 text-sm whitespace-nowrap">{formatDuration(row.duration_minutes)}</td>
                            <td className="px-6 py-4 text-right text-matcha font-bold whitespace-nowrap">
                              {currencyFormatter.format(row.total_amount ?? 0)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button className="p-2 bg-white/5 rounded-lg text-foreground/40 group-hover:bg-matcha group-hover:text-black transition-all">
                                <Eye size={16} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 border-t border-border/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-sm text-foreground/50">
                  <span>Menampilkan {history.length} dari {totalCount} transaksi</span>
                  <div className="flex gap-2">
                    <button
                      onClick={handlePrevPage}
                      disabled={page <= 1 || loading}
                      className="px-3 py-1 bg-white/5 rounded hover:bg-white/10 transition-colors disabled:opacity-40 disabled:hover:bg-white/5"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => handleGoToPage(page)}
                      className="px-3 py-1 bg-matcha/20 text-matcha rounded"
                    >
                      {page}
                    </button>
                    {page + 1 <= pages && (
                      <button
                        onClick={() => handleGoToPage(page + 1)}
                        disabled={loading}
                        className="px-3 py-1 bg-white/5 rounded hover:bg-white/10 transition-colors disabled:opacity-40 disabled:hover:bg-white/5"
                      >
                        {page + 1}
                      </button>
                    )}
                    <button
                      onClick={handleNextPage}
                      disabled={page >= pages || loading}
                      className="px-3 py-1 bg-white/5 rounded hover:bg-white/10 transition-colors disabled:opacity-40 disabled:hover:bg-white/5"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="glass-card p-8 rounded-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-matcha/20 rounded-lg text-matcha">
                    <PieIcon size={20} />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">Metode Pembayaran</h2>
                </div>
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {paymentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(17, 17, 17, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(10px)' }}
                      />
                      <Legend verticalAlign="bottom" align="center" iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-6 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground/60">Tunai</span>
                    <span className="text-foreground font-bold">{tunaiPercent}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground/60">QRIS</span>
                    <span className="text-foreground font-bold">{qrisPercent}%</span>
                  </div>
                </div>
              </div>

              <div className="bg-matcha/10 border border-matcha/20 p-6 rounded-2xl">
                <h3 className="text-foreground font-bold mb-2">Ringkasan Hari Ini</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-sm text-foreground/70">Total Pendapatan</span>
                    <span className="text-xl font-bold text-matcha">{currencyFormatter.format(totalRevenueDisplayed)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {selectedHistory && (
              <HistoryDetailModal 
                data={selectedHistory} 
                onClose={() => setSelectedHistory(null)} 
              />
            )}
          </AnimatePresence>
        </div>
      );
    }