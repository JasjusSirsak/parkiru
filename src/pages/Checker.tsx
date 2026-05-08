import React, { useState, useRef, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, QrCode, Bike, Clock, CreditCard, CheckCircle, AlertCircle, DollarSign, ArrowRight, User, Activity, X, Loader, Scan } from 'lucide-react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { getAuthHeaders } from '../utils/auth';

interface ParkingSession {
  id: number;
  transaction_id: string;
  plate_number: string;
  entry_time: string;
  exit_time?: string;
  duration_seconds: number;
  entry_photo_url?: string;
  status: 'active' | 'completed' | 'cancelled';
}

interface ParkingSettings {
  hourly_rate: number;
  max_daily_rate: number;
  grace_period_minutes: number;
  ppn_percentage: number;
}

interface PaymentCalculation {
  duration_minutes: number;
  chargeable_minutes: number;
  billable_hours: number;
  base_amount: number;
  ppn_amount: number;
  total_amount: number;
  duration_text: string;
}

export default function Checker() {
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scannedSession, setScannedSession] = useState<ParkingSession | null>(null);
  const [paymentCalculation, setPaymentCalculation] = useState<PaymentCalculation | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'qris' | 'cash' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [parkingSettings, setParkingSettings] = useState<ParkingSettings>({
    hourly_rate: 3000,
    max_daily_rate: 20000,
    grace_period_minutes: 15,
    ppn_percentage: 11
  });

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanError, setScanError] = useState('');

  useEffect(() => {
    fetchParkingSettings();
    return () => {
      stopScanner();
    };
  }, []);

  const fetchParkingSettings = async () => {
    try {
      const response = await fetch('/api/settings/parking', {
        headers: getAuthHeaders()
      });
      const result = await response.json();
      if (result.success) {
        setParkingSettings(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch parking settings:', error);
    }
  };

  const startScanner = () => {
    setIsScanning(true);
    setScannedSession(null);
    setPaymentCalculation(null);
    setSelectedPaymentMethod(null);
    setScanError('');
    
    setTimeout(async () => {
      try {
        const container = document.getElementById('checker-camera');
        if (!container) {
          throw new Error('Scanner container not found');
        }
        
        html5QrCodeRef.current = new Html5Qrcode('checker-camera');
        setCameraActive(true);
        
        await html5QrCodeRef.current.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.85);
              return { width: size, height: size };
            }
          },
          async (decodedText) => {
            await stopScanner();
            await handleScanSuccess(decodedText);
          },
          (errorMessage) => {
            if (!errorMessage?.includes('No QR code found')) {
              console.debug('Scan:', errorMessage);
            }
          }
        );
        
      } catch (error) {
        console.error('Camera access error:', error);
        setScanError('Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.');
        toast.error('Gagal mengakses kamera');
      }
    }, 300);
  };
  
  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (error) {
        console.error('Error stopping QR scanner:', error);
      }
      html5QrCodeRef.current = null;
    }
    
    setIsScanning(false);
    setCameraActive(false);
  };

  const handleScanSuccess = async (transactionId: string) => {
    setIsLoading(true);
    
    try {
      const response = await fetch(
        `/api/parking-sessions/transaction/${transactionId}`,
        {
          headers: getAuthHeaders()
        }
      );
      
      const result = await response.json();
      
      if (result.success && result.data) {
        const session = result.data;
        
        if (session.status === 'completed') {
          toast.error('Kendaraan sudah keluar! Transaksi ini sudah selesai.');
          setTimeout(() => startScanner(), 2000);
          return;
        }
        
        if (session.status !== 'active') {
          toast.error('Status transaksi tidak valid untuk diproses keluar.');
          setTimeout(() => startScanner(), 2000);
          return;
        }
        
        setScannedSession(session);
        const calculation = calculatePayment(session);
        setPaymentCalculation(calculation);
      } else {
        toast.error(result.error || 'Transaksi tidak ditemukan atau sudah tidak aktif');
        setTimeout(() => startScanner(), 2000);
      }
    } catch (error) {
      console.error('Error fetching session:', error);
      toast.error('Gagal mengambil data transaksi');
      setTimeout(() => startScanner(), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  const calculatePayment = (session: ParkingSession): PaymentCalculation => {
    const gracePeriodMinutes = parkingSettings.grace_period_minutes || 15;
    const durationMinutes = Math.floor(session.duration_seconds / 60);
    
    const chargeableMinutes = Math.max(0, durationMinutes - gracePeriodMinutes);
    const billableHours = Math.max(1, Math.ceil(chargeableMinutes / 60));
    
    let baseAmount = billableHours * parkingSettings.hourly_rate;
    
    if (parkingSettings.max_daily_rate && baseAmount > parkingSettings.max_daily_rate) {
      baseAmount = parkingSettings.max_daily_rate;
    }
    
    const ppnAmount = (baseAmount * (parkingSettings.ppn_percentage || 0)) / 100;
    const totalAmount = baseAmount + ppnAmount;
    
    const durationText = formatDuration(session.duration_seconds);
    
    return {
      duration_minutes: durationMinutes,
      chargeable_minutes: chargeableMinutes,
      billable_hours: billableHours,
      base_amount: Math.round(baseAmount),
      ppn_amount: Math.round(ppnAmount),
      total_amount: Math.round(totalAmount),
      duration_text: durationText
    };
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours} jam ${minutes > 0 ? minutes + ' menit' : ''}`;
    }
    return `${minutes} menit`;
  };

  const handlePaymentConfirm = async () => {
    if (!selectedPaymentMethod || !scannedSession || !paymentCalculation) {
      toast.error('Pilih metode pembayaran terlebih dahulu');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch(
        `/api/parking-sessions/${scannedSession.id}/complete`,
        {
          method: 'PUT',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            payment_method_id: selectedPaymentMethod === 'qris' ? 1 : 2,
            payment_method: selectedPaymentMethod,
            hourly_rate: parkingSettings.hourly_rate,
            base_amount: paymentCalculation.base_amount,
            ppn_amount: paymentCalculation.ppn_amount,
            ppn_percentage: parkingSettings.ppn_percentage,
            total_amount: paymentCalculation.total_amount,
            duration_minutes: paymentCalculation.duration_minutes,
            chargeable_minutes: paymentCalculation.chargeable_minutes,
            billable_hours: paymentCalculation.billable_hours
          })
        }
      );

      const result = await response.json();

      if (result.success) {
        setShowSuccess(true);
        toast.success('Pembayaran berhasil! Kendaraan diproses keluar.');
        
        setTimeout(() => {
          setShowSuccess(false);
          setScannedSession(null);
          setPaymentCalculation(null);
          setSelectedPaymentMethod(null);
          startScanner();
        }, 3000);
      } else {
        toast.error(result.error || 'Gagal memproses pembayaran');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Gagal memproses pembayaran. Silakan coba lagi.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelPayment = () => {
    setScannedSession(null);
    setPaymentCalculation(null);
    setSelectedPaymentMethod(null);
    setTimeout(() => startScanner(), 500);
  };

  const handleCancelScan = () => {
    stopScanner();
    setScannedSession(null);
    setPaymentCalculation(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Pemindaian & Validasi Keluar</h1>
        <p className="text-white/50">Scan QR code dari struk untuk memproses pembayaran parkir.</p>
      </div>

      {/* Scanner Section */}
      <div className="relative">
        {!isScanning ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
            <div className="p-6 bg-white/5 rounded-full mb-4">
              <QrCode size={48} className="text-white/20" />
            </div>
            <h3 className="text-xl font-semibold text-white/60 mb-4">Scanner Siap</h3>
            <button
              onClick={startScanner}
              className="px-8 py-3 bg-matcha text-black font-bold rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
            >
              <Camera size={20} />
              MULAI SCAN QR
            </button>
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">
                {isLoading ? 'Memproses...' : 'Arahkan kamera ke QR Code'}
              </h3>
              <button
                onClick={handleCancelScan}
                className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                disabled={isLoading}
              >
                <CameraOff size={20} />
              </button>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader size={48} className="text-matcha animate-spin" />
              </div>
            ) : (
              <div className="flex justify-center">
                <div 
                  id="checker-camera" 
                  className="relative rounded-2xl overflow-hidden bg-black w-full max-w-md aspect-square"
                >
                  
                  {/* Scanning overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Corner markers - posisi 8% dari tepi */}
                    <div className="absolute top-[8%] left-[8%] w-8 h-8 border-l-[3px] border-t-[3px] border-matcha rounded-tl-lg" />
                    <div className="absolute top-[8%] right-[8%] w-8 h-8 border-r-[3px] border-t-[3px] border-matcha rounded-tr-lg" />
                    <div className="absolute bottom-[8%] left-[8%] w-8 h-8 border-l-[3px] border-b-[3px] border-matcha rounded-bl-lg" />
                    <div className="absolute bottom-[8%] right-[8%] w-8 h-8 border-r-[3px] border-b-[3px] border-matcha rounded-br-lg" />
                    
                    {/* Center scanning frame - kotak perfect */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-[84%] h-[84%] border border-matcha/40 rounded-xl relative">
                        {/* Animated scanning line */}
                        <motion.div
                          animate={{ top: ['0%', '100%', '0%'] }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                          className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-matcha to-transparent"
                        />
                      </div>
                    </div>
                    
                    {/* Status text */}
                    <div className="absolute bottom-3 left-0 right-0 text-center">
                      <p className="text-white/80 text-xs bg-black/60 backdrop-blur-sm inline-flex items-center gap-2 px-4 py-1.5 rounded-full">
                        {cameraActive ? (
                          <>
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-matcha opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-matcha"></span>
                            </span>
                            Scan QR Code...
                          </>
                        ) : (
                          <>
                            <Loader size={12} className="animate-spin" />
                            Meminta akses kamera...
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  {/* Error message */}
                  {scanError && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                      <div className="text-center p-6">
                        <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
                        <p className="text-white mb-4">{scanError}</p>
                        <button
                          onClick={startScanner}
                          className="px-4 py-2 bg-matcha text-black rounded-lg font-medium"
                        >
                          Coba Lagi
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scanned Session Info & Payment Modal */}
      <AnimatePresence>
        {scannedSession && paymentCalculation && !showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={handleCancelPayment}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-gray-900 to-gray-800 border border-white/10 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-gradient-to-br from-gray-900 to-gray-800 border-b border-white/10 p-6 flex justify-between items-start z-10">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Konfirmasi Pembayaran</h2>
                  <p className="text-white/60 text-sm">Periksa detail dan pilih metode pembayaran</p>
                </div>
                <button
                  onClick={handleCancelPayment}
                  disabled={isProcessing}
                  className="p-2 bg-white/10 text-white/60 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Session Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-white/5 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-matcha/20 rounded-full flex items-center justify-center">
                          <Bike size={24} className="text-matcha" />
                        </div>
                        <div>
                          <p className="text-white/40 text-xs">Plat Nomor</p>
                          <p className="text-white font-mono font-bold text-lg">{scannedSession.plate_number}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-white/60 text-sm">ID Transaksi</span>
                          <span className="text-white/60 text-sm font-mono">{scannedSession.transaction_id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60 text-sm">Waktu Masuk</span>
                          <span className="text-white">
                            {new Date(scannedSession.entry_time).toLocaleString('id-ID')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60 text-sm">Durasi</span>
                          <span className="text-white font-medium">{paymentCalculation.duration_text}</span>
                        </div>
                      </div>
                    </div>

                    {scannedSession.entry_photo_url && (
                      <div className="bg-white/5 rounded-xl p-4">
                        <p className="text-white/40 text-xs mb-2">Foto Saat Masuk</p>
                        <img 
                          src={window.location.origin + '/' + scannedSession.entry_photo_url}
                          alt="Entry Photo"
                          className="w-full rounded-lg"
                        />
                      </div>
                    )}
                  </div>

                  {/* Payment Calculation */}
                  <div className="space-y-4">
                    <div className="bg-white/5 rounded-xl p-4">
                      <p className="text-white/40 text-xs mb-3">Rincian Biaya</p>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-white/60 text-sm">Durasi Parkir</span>
                          <span className="text-white">{paymentCalculation.duration_minutes} menit</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60 text-sm">Masa Grace Period</span>
                          <span className="text-white">{parkingSettings.grace_period_minutes} menit</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60 text-sm">Durasi Terhitung</span>
                          <span className="text-white">{paymentCalculation.chargeable_minutes} menit ({paymentCalculation.billable_hours} jam)</span>
                        </div>
                        <div className="border-t border-white/10 my-2"></div>
                        <div className="flex justify-between">
                          <span className="text-white/60 text-sm">Tarif Dasar</span>
                          <span className="text-white">Rp {parkingSettings.hourly_rate.toLocaleString()}/jam</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60 text-sm">Biaya Dasar</span>
                          <span className="text-white">Rp {paymentCalculation.base_amount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60 text-sm">PPN {parkingSettings.ppn_percentage}%</span>
                          <span className="text-white">Rp {paymentCalculation.ppn_amount.toLocaleString()}</span>
                        </div>
                        <div className="border-t border-white/10 my-2"></div>
                        <div className="flex justify-between items-center">
                          <span className="text-white font-bold">Total Tagihan</span>
                          <span className="text-2xl font-bold text-matcha">Rp {paymentCalculation.total_amount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Method Selection */}
                    <div className="space-y-2">
                      <p className="text-white/60 text-sm font-medium">Metode Pembayaran</p>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setSelectedPaymentMethod('qris')}
                          disabled={isProcessing}
                          className={`p-4 rounded-xl border-2 transition-all ${
                            selectedPaymentMethod === 'qris'
                              ? 'border-matcha bg-matcha/20 text-matcha'
                              : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <CreditCard size={24} className="mx-auto mb-2" />
                          <span className="text-sm font-medium">QRIS</span>
                        </button>
                        <button
                          onClick={() => setSelectedPaymentMethod('cash')}
                          disabled={isProcessing}
                          className={`p-4 rounded-xl border-2 transition-all ${
                            selectedPaymentMethod === 'cash'
                              ? 'border-matcha bg-matcha/20 text-matcha'
                              : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <DollarSign size={24} className="mx-auto mb-2" />
                          <span className="text-sm font-medium">Tunai</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-white/10">
                  <button
                    onClick={handlePaymentConfirm}
                    disabled={!selectedPaymentMethod || isProcessing}
                    className="flex-1 py-4 bg-matcha text-black font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  >
                    {isProcessing ? (
                      <>
                        <Loader size={20} className="animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={20} />
                        Konfirmasi Pembayaran
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCancelPayment}
                    disabled={isProcessing}
                    className="px-6 py-4 bg-white/10 text-white/60 rounded-xl hover:bg-white/20 transition-all disabled:opacity-50"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Animation */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-gradient-to-br from-matcha to-green-400 rounded-full p-8"
            >
              <CheckCircle size={80} className="text-white" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="absolute bottom-20 text-center"
            >
              <h2 className="text-3xl font-bold text-white mb-2">Pembayaran Berhasil!</h2>
              <p className="text-white/60">Kendaraan telah diproses keluar</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}