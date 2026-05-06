import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, ShieldCheck, Camera } from 'lucide-react';
import { motion } from 'framer-motion';

interface AdminScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

const AdminScanner: React.FC<AdminScannerProps> = ({ onScan, onClose }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    let isMounted = true;
    scannerRef.current = new Html5Qrcode("admin-qr-reader");
    
    const startScanner = async () => {
      try {
        await scannerRef.current?.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (data) => {
            if (isMounted) {
              await stopScanner();
              onScan(data);
            }
          },
          () => {} // Silent error for no QR found
        );
      } catch (err) {
        if (isMounted) {
          console.error("Gagal memulai kamera:", err);
        }
      }
    };

    const stopScanner = async () => {
      try {
        if (scannerRef.current?.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        // Silent error as this usually happens on fast unmount
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#13131f] border border-white/10 rounded-[32px] w-full max-w-md overflow-hidden relative shadow-2xl"
      >
        <div className="p-7 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-matcha/5 to-transparent">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-matcha/20 rounded-2xl text-matcha">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="text-white font-black uppercase tracking-tight">Otorisasi Admin</h3>
              <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-black">Scan Kartu Otorisasi</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white/50 transition-all border border-white/10"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8">
          <div className="relative aspect-square overflow-hidden rounded-[32px] border border-white/10 bg-black/60 shadow-inner group">
            <div id="admin-qr-reader" className="w-full h-full object-cover"></div>
            
            {/* Camera Overlay UI */}
            <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
              <div className="w-full h-full border-2 border-matcha/50 rounded-2xl relative">
                  {/* Scanning line animation */}
                  <motion.div 
                    animate={{ top: ['0%', '100%', '0%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-matcha to-transparent shadow-[0_0_15px_#7ED957]"
                  />
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
             <Camera size={18} className="text-matcha/60" />
             <p className="text-[11px] text-white/40 leading-relaxed font-medium">
               Arahkan kamera ke QR Code pada kartu admin untuk memvalidasi transaksi kehilangan karcis.
             </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminScanner;
