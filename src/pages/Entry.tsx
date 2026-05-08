import React, { useState, useRef, useEffect } from 'react';
import { Camera, CheckCircle2, Layers, Activity, Video, Cpu } from 'lucide-react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import { QRCodeSVG } from 'qrcode.react';
import { getAuthHeaders } from '../utils/auth';

interface SessionData {
  id: number;
  transaction_id: string;
  plate_number: string;
  entry_time: string;
  exit_time?: string;
  duration_minutes?: number;
  entry_photo_url?: string;
  exit_photo_url?: string;
  status: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export default function Entry() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [error, setError] = useState('');
  const [fps, setFps] = useState(30);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const cameraRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ticketRef = useRef<HTMLDivElement>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  // Simulasi FPS
  useEffect(() => {
    const interval = setInterval(() => {
      setFps(28 + Math.floor(Math.random() * 4));
    }, 800);
    return () => clearInterval(interval);
  }, []);

  // Inisialisasi kamera
  useEffect(() => {
    let mediaStream: MediaStream | null = null;
    let isMounted = true;

    const initCamera = async () => {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (!isMounted) {
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }
        if (cameraRef.current) {
          cameraRef.current.srcObject = mediaStream;
          setCameraActive(true);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Gagal mengakses kamera:', err);
          setCameraActive(false);
        }
      }
    };

    initCamera();

    return () => {
      isMounted = false;
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const capturePhoto = (): string | null => {
    if (!cameraRef.current || !canvasRef.current || !cameraActive) {
      return null;
    }

    const video = cameraRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      return null;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    return imageDataUrl;
  };

  const downloadTicketAsPNG = async (data: SessionData) => {
    setTimeout(async () => {
      if (!ticketRef.current) return;
      try {
        const canvas = await html2canvas(ticketRef.current, {
          backgroundColor: '#FFFFFF',
          scale: 2,
        });
        const link = document.createElement('a');
        link.download = `karcis-${data.plate_number}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } catch (err) {
        console.error('Gagal generate PNG:', err);
        toast.error('Gagal mendownload karcis PNG');
      }
    }, 800);
  };

  // Generate MTR-XXXXXX format di frontend sebagai fallback
  const generateMTRNumberFrontend = (sessionId: number): string => {
    return `MTR-${String(sessionId).padStart(6, '0')}`;
  };

  const handleEntry = async () => {
    try {
      setIsProcessing(true);
      setError('');

      const photoData = capturePhoto();

      // ⚠️ KEY FIX: kirim plate_number: 'AUTO' agar tidak trigger validasi "tidak boleh kosong"
      // Backend harus cek: jika plate_number === 'AUTO' → generate MTR-XXXXXX
      const response = await fetch('/api/parking-sessions', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          plate_number: 'AUTO',
          entry_photo_url: photoData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal mencatat motor masuk');
      }

      const data = await response.json();
      let newSession = data.data;
      
      // 🔧 FIX: Jika backend mengembalikan 'AUTO', generate MTR-XXXXXX di frontend
      if (newSession.plate_number === 'AUTO') {
        newSession = {
          ...newSession,
          plate_number: generateMTRNumberFrontend(newSession.id)
        };
      }
      
      setSessionData(newSession);
      setCapturedImage(photoData);

      downloadTicketAsPNG(newSession);

      setShowSuccessPopup(true);
      toast.success(`✅ Karcis ${newSession.plate_number} berhasil dicetak`);

      setTimeout(() => {
        setShowSuccessPopup(false);
        setSessionData(null);
        setCapturedImage(null);
      }, 5000);

    } catch (err: any) {
      setError(err.message);
      toast.error(`❌ ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Entri Motor Baru</h1>
            <p className="text-white/40 text-sm">Sistem pencatatan masuk kendaraan bermotor</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
              <div className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-matcha animate-pulse' : 'bg-red-500'}`} />
              <span className="text-xs text-white/60">{cameraActive ? 'Kamera Aktif' : 'Kamera Offline'}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
              <Cpu size={14} className="text-matcha" />
              <span className="text-xs text-white/60">Node-01</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* ─── Camera Panel ─── */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <Video size={18} className="text-matcha" />
              <span className="text-sm font-medium text-white">Live Preview</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Activity size={12} className="text-matcha" />
                <span className="text-xs text-white/40">{fps} FPS</span>
              </div>
              <span className="text-xs px-2 py-1 bg-matcha/20 text-matcha rounded-lg border border-matcha/30">
                ● RECORDING
              </span>
            </div>
          </div>

          <div className="relative bg-black/40" style={{ aspectRatio: '16/9' }}>
            <video
              ref={cameraRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {!cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
                <Camera size={56} className="text-white/20 mb-4" />
                <p className="text-white/40 font-medium">Kamera Tidak Tersedia</p>
                <p className="text-xs text-white/20 mt-2">Periksa izin kamera pada browser</p>
              </div>
            )}

            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0" style={{
                backgroundImage: 'linear-gradient(rgba(163,197,133,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(163,197,133,0.05) 1px, transparent 1px)',
                backgroundSize: '30px 30px'
              }} />
              <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-matcha/60" />
              <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-matcha/60" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-matcha/60" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-matcha/60" />
            </div>

            <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

            <motion.div
              animate={{ top: ['0%', '100%', '0%'] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
              className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-matcha to-transparent pointer-events-none"
              style={{ boxShadow: '0 0 20px rgba(163,197,133,0.5)' }}
            />
          </div>

          <div className="grid grid-cols-4 border-t border-white/10">
            {[
              { icon: '🎯', label: 'Status', value: cameraActive ? 'READY' : 'OFFLINE', accent: cameraActive },
              { icon: '📡', label: 'Sensor', value: 'ACTIVE', accent: true },
              { icon: '🚧', label: 'Palang', value: 'CLOSED', accent: false },
              { icon: '📊', label: 'FPS', value: String(fps), accent: true },
            ].map((item, idx) => (
              <div key={idx} className="px-5 py-4 border-r border-white/10 last:border-r-0">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">{item.label}</p>
                <p className={`text-sm font-bold ${item.accent ? 'text-matcha' : 'text-white/40'}`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Side Panel ─── */}
        <div className="space-y-5">
          {/* Status Sistem (Moved here) */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 skeuo-depth">
            <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold mb-4">Status Sistem</p>
            <div className="flex justify-between items-center bg-black/20 rounded-2xl p-4 skeuo-inset">
              <div>
                <p className={`text-xl font-black ${cameraActive ? 'text-matcha' : 'text-red-400'}`}>{cameraActive ? 'ONLINE' : 'OFFLINE'}</p>
                <p className="text-[10px] text-white/20 uppercase tracking-widest font-medium mt-1">Koneksi Kamera</p>
              </div>
              <div className="w-px h-10 bg-white/5" />
              <div className="text-right">
                <p className="text-xl font-black text-white">{new Date().getHours()}:{String(new Date().getMinutes()).padStart(2, '0')}</p>
                <p className="text-[10px] text-white/20 uppercase tracking-widest font-medium mt-1">Waktu Server</p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/30 rounded-xl p-4"
            >
              <p className="text-red-400 text-sm">{error}</p>
            </motion.div>
          )}

          {/* Tombol Utama */}
          <button
            onClick={handleEntry}
            disabled={isProcessing}
            className={`
              w-full rounded-2xl transition-all overflow-hidden
              ${isProcessing
                ? 'bg-white/5 cursor-not-allowed'
                : 'bg-matcha hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-matcha/20'}
            `}
          >
            <div className="px-6 py-7 flex flex-col items-center gap-2">
              {isProcessing ? (
                <>
                  <div className="w-6 h-6 border-2 border-white/20 border-t-matcha rounded-full animate-spin" />
                  <span className="text-white/40 font-medium tracking-wide">MEMPROSES...</span>
                </>
              ) : (
                <>
                  <span className="text-black font-bold text-xl tracking-wider">TEKAN UNTUK MASUK</span>
                  <span className="text-black/50 text-xs tracking-[0.2em] uppercase">SISTEM FREE FLOW</span>
                </>
              )}
            </div>
          </button>

          {/* Info Card */}
          <div className="bg-gradient-to-r from-matcha/10 to-transparent border border-matcha/20 rounded-2xl p-5">
            <div className="flex gap-4">
              <div className="p-2 bg-matcha/20 rounded-xl h-fit">
                <Layers size={18} className="text-matcha" />
              </div>
              <div>
                <h4 className="text-white font-semibold text-sm mb-1">Informasi Sistem</h4>
                <p className="text-white/40 text-xs leading-relaxed">
                  Motor berhenti di garis sensor. Karcis akan di-generate otomatis dengan format MTR-XXXXXX.
                  Tekan tombol untuk mencatat masuk.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-[10px] text-white/20 tracking-wider">
          BERI KOPI · SISTEM PARKIR · v2.0
        </p>
      </div>

      {/* ─── HIDDEN RECEIPT (HITAM PUTIH) ─── */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div
          ref={ticketRef}
          className="p-10 w-[400px] border-2 border-black"
          style={{
            fontFamily: "'Courier New', Courier, monospace",
            backgroundColor: '#FFFFFF',
            color: '#000000'
          }}
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black mb-2" style={{ color: '#000000' }}>BERI KOPI</h2>
            <p className="text-sm" style={{ color: '#333333' }}>Jalan Pahlawan - Bandung</p>
          </div>

          <div className="border-t-2 border-dashed mb-6" style={{ borderColor: '#000000' }}></div>

          <div className="space-y-5 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-xs uppercase" style={{ color: '#000000' }}>Ticket No</span>
              <span className="text-2xl font-black tracking-widest" style={{ color: '#000000' }}>
                {sessionData?.plate_number || 'MTR-000000'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs" style={{ color: '#000000' }}>Waktu Masuk</span>
              <span className="text-sm font-mono font-bold" style={{ color: '#000000' }}>
                {sessionData ? new Date(sessionData.entry_time).toLocaleString('id-ID', {
                  day: 'numeric',
                  month: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                }) : '--/--/----, --:--:--'}
              </span>
            </div>
          </div>

          <div className="border-t-2 border-dashed mb-6" style={{ borderColor: '#000000' }}></div>

          <div className="flex flex-col items-center space-y-3">
            <QRCodeSVG
              value={sessionData?.transaction_id || 'placeholder'}
              size={160}
              bgColor="#FFFFFF"
              fgColor="#000000"
              level="M"
              includeMargin={false}
            />
            <span className="text-xs font-mono font-bold" style={{ color: '#000000' }}>
              {sessionData?.transaction_id || '---'}
            </span>
          </div>

          <div className="border-t-2 border-dashed mt-6 mb-4" style={{ borderColor: '#000000' }}></div>

          <p className="text-center text-[10px] uppercase tracking-wider" style={{ color: '#000000' }}>
            SIMPAN KARCIS INI UNTUK KELUAR
          </p>
          <p className="text-center text-[8px] uppercase tracking-wider mt-1" style={{ color: '#FF0000', fontWeight: 'bold' }}>
            ⚠️ JANGAN SAMPAI HILANG ATAU DENDA 5.000 RUPIAH ⚠️
          </p>
        </div>
      </div>

      {/* ─── SUCCESS POPUP ─── */}
      <AnimatePresence>
        {showSuccessPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: 20, opacity: 0 }}
              className="max-w-md w-full text-center"
            >
              <div className="relative mb-8 flex justify-center">
                <motion.div
                  initial={{ rotate: -45, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="w-24 h-24 rounded-full border-4 border-matcha flex items-center justify-center bg-matcha/10"
                >
                  <CheckCircle2 size={48} className="text-matcha" />
                </motion.div>
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-matcha/20 rounded-full blur-2xl -z-10"
                />
              </div>

              <h2 className="text-4xl font-bold text-white mb-4">Motor Berhasil Masuk</h2>
              <p className="text-white/50 text-lg leading-relaxed mb-2">
                Karcis telah dicetak
              </p>
              <p className="text-matcha text-2xl font-bold tracking-widest mb-2">
                {sessionData?.plate_number}
              </p>
              <p className="text-white/30 text-sm">
                Simpan karcis digital untuk keluar nanti
              </p>

              <div className="mt-12 h-1 bg-white/10 rounded-full overflow-hidden w-48 mx-auto">
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 5, ease: "linear" }}
                  className="h-full bg-matcha shadow-[0_0_10px_rgba(163,197,133,0.5)]"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}