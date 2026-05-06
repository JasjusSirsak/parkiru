import React from 'react';
import { motion } from 'framer-motion';
import { ShieldX, Home, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function Forbidden() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <div className="glass-card rounded-3xl p-8 text-center border border-border/10 relative overflow-hidden">
          {/* Background glow effect */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-red-500/10 rounded-full blur-3xl -translate-y-1/2" />

          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="relative z-10 mx-auto w-20 h-20 rounded-2xl bg-red-500/20 flex items-center justify-center mb-6"
          >
            <ShieldX className="text-red-400" size={40} />
          </motion.div>

          {/* Content */}
          <div className="relative z-10">
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold text-foreground mb-2"
            >
              403 Forbidden
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-foreground/60 text-sm mb-8"
            >
              Maaf, Anda tidak memiliki izin untuk mengakses halaman ini.
              Hubungi administrator jika Anda membutuhkan akses.
            </motion.p>

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <button
                onClick={() => navigate(-1)}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-border/15 text-foreground/80 hover:bg-white/10 hover:text-foreground transition-all font-medium text-sm"
              >
                <ArrowLeft size={16} />
                Kembali
              </button>

              <Link
                to="/"
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-matcha text-black font-bold hover:bg-matcha/90 transition-all text-sm"
              >
                <Home size={16} />
                Dashboard
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Additional info */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-foreground/40 text-xs mt-6"
        >
          Error Code: 403 | Insufficient Permissions
        </motion.p>
      </motion.div>
    </div>
  );
}
