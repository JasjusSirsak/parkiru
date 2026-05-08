import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, Bike, Zap, Shield, Coffee, Car, ParkingCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import parkiruLogo from '../assets/parkiru.svg';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!isLogin) {
        toast.info('Fitur sign up belum tersedia. Silakan login menggunakan akun yang sudah ada.');
        return;
      }

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        toast.error(json?.error || 'Login gagal');
        return;
      }

      localStorage.setItem('parkiru:auth-user', JSON.stringify(json.data));
      toast.success('Selamat datang kembali!');
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      toast.error('Terjadi kesalahan saat login');
    } finally {
      setIsLoading(false);
    }
  };

  // Parking slot animation variants
  const parkingSlots = Array.from({ length: 6 }, (_, i) => i);

  return (
    <div className="min-h-screen w-full flex bg-[#0A0C0E] relative overflow-hidden">
      {/* Animated Parking Grid Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(90deg, rgba(163,197,133,0.2) 1px, transparent 1px),
              linear-gradient(0deg, rgba(163,197,133,0.2) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            transform: `translate(${mousePosition.x * 0.02}px, ${mousePosition.y * 0.02}px)`,
          }}
        />
        
        {/* Animated Parking Lines */}
        <div className="absolute bottom-0 left-0 right-0 h-32 opacity-30">
          {parkingSlots.map((_, i) => (
            <motion.div
              key={i}
              className="absolute bottom-0 w-16 h-24 border-l-2 border-r-2 border-matcha/40"
              style={{ left: `${i * 80 + 20}px` }}
              animate={{
                y: [0, -5, 0],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 3,
                delay: i * 0.3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>

      {/* Left Side - Form Section */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12 relative z-10">
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-[440px]"
        >
            {/* Greeting Header */}
            <div className="flex items-center gap-4 mb-2">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl lg:text-5xl font-bold"
              >
                <span className="bg-gradient-to-r from-white to-matcha/70 bg-clip-text text-transparent">
                  {isLogin ? "Welcome back" : "Create an account"}
                </span>
              </motion.h2>

              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="relative"
              >
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Coffee className="text-matcha/60" size={32} strokeWidth={1.5} />
                </motion.div>
                {/* Steam animation */}
                <motion.div
                  className="absolute -top-2 left-1/2 w-0.5 h-3 bg-matcha/30 rounded-full"
                  animate={{ y: [-8, -16], opacity: [0.5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                />
              </motion.div>
            </div>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-white/40 text-lg mb-12"
            >
              {isLogin 
                ? "Sign in to manage your parking space" 
                : "Join Beri Kopi today"}
            </motion.p>

          {/* Form Card with Glassmorphism + Border Animation */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative group"
          >
            {/* Animated border gradient */}
            <div className="absolute -inset-[1px] bg-gradient-to-r from-matcha/30 via-matcha/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10 group-hover:border-matcha/20 transition-all duration-300">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/60 flex items-center gap-2">
                    <Mail size={14} />
                    Email Address
                  </label>
                  <div className="relative group/input">
                    <input 
                      type="email" 
                      placeholder="admin@parkiru.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-matcha/50 focus:border-matcha/50 outline-none transition-all placeholder:text-white/20"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-matcha/0 via-matcha/50 to-matcha/0 scale-x-0 group-focus-within/input:scale-x-100 transition-transform duration-300" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-white/60 flex items-center gap-2">
                      <Lock size={14} />
                      Password
                    </label>
                    {isLogin && (
                      <button type="button" className="text-xs text-matcha/60 hover:text-matcha transition-colors">
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative group/input">
                    <input 
                      type="password" 
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-matcha/50 focus:border-matcha/50 outline-none transition-all placeholder:text-white/20"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-matcha/0 via-matcha/50 to-matcha/0 scale-x-0 group-focus-within/input:scale-x-100 transition-transform duration-300" />
                  </div>
                </div>

                <motion.button 
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 bg-gradient-to-r from-matcha to-matcha/80 text-black font-semibold rounded-xl hover:from-matcha/90 hover:to-matcha/70 transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group/btn"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    ) : (
                      <>
                        {isLogin ? 'Sign In' : 'Sign Up'}
                        <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                      </>
                    )}
                  </span>
                </motion.button>
              </form>
            </div>
          </motion.div>

          {/* Status Indicator - Like parking slot availability */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-6 flex items-center justify-center gap-4 text-xs text-white/30"
          >
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>System Online</span>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Right Side - Enhanced Feature Section */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        {/* Dynamic Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-matcha/30 via-matcha/10 to-transparent">
          {/* Animated blob */}
          <motion.div
            className="absolute top-1/4 -right-20 w-96 h-96 bg-matcha/20 rounded-full blur-3xl"
            animate={{
              x: [0, 30, 0],
              y: [0, -20, 0],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>
        
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo Section with Animation */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col items-start"
          >
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="relative mb-6"
            >
              <div className="absolute inset-0 bg-matcha/30 rounded-2xl blur-xl" />
              <div className="relative p-4 bg-gradient-to-br from-matcha/20 to-matcha/5 rounded-2xl border border-matcha/30">
                <div 
                  className="w-12 h-12 bg-matcha"
                  style={{
                    WebkitMaskImage: `url(${parkiruLogo})`,
                    maskImage: `url(${parkiruLogo})`,
                    WebkitMaskRepeat: 'no-repeat',
                    maskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center',
                    maskPosition: 'center',
                    WebkitMaskSize: 'contain',
                    maskSize: 'contain'
                  }}
                />
              </div>
            </motion.div>
            
            <div className="relative">
              <h1 className="text-6xl font-bold text-white mb-2 tracking-tight">
                BERI KOPI
                <span className="text-matcha text-3xl ml-1">®</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="h-px w-8 bg-matcha/50" />
                <p className="text-matcha text-xs uppercase tracking-[0.2em] font-medium">PARKIRU</p>
                <div className="h-px w-8 bg-matcha/50" />
              </div>
            </div>
          </motion.div>

          {/* Feature Cards with Hover Effects */}
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              whileHover={{ x: -8 }}
              className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10 hover:border-matcha/30 transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="p-2 bg-matcha/20 rounded-xl group-hover:scale-110 transition-transform">
                  <Zap className="text-matcha" size={22} />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-base mb-1">Move Fast. Break Nothing</h3>
                  <p className="text-white/40 text-sm leading-relaxed">
                    Release testing and approvals are the most common bottleneck for tech, but you can now remove that
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              whileHover={{ x: -8 }}
              className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10 hover:border-matcha/30 transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="p-2 bg-matcha/20 rounded-xl">
                  <Shield className="text-matcha" size={22} />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-base mb-1">Access Risk Analysis</h3>
                  <p className="text-white/40 text-sm leading-relaxed">
                    Machine learning & static analysis to assess risk, automate release management
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Bottom Section with Parking Themed Status */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="space-y-3"
          >
            {/* Parking slot visualization */}
            <div className="flex justify-center gap-2">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-8 h-12 border border-matcha/30 rounded-md bg-matcha/5"
                  animate={{ opacity: [0.4, 0.8, 0.4] }}
                  transition={{ duration: 2, delay: i * 0.2, repeat: Infinity }}
                />
              ))}
            </div>
            <p className="text-white/20 text-[10px] tracking-[0.3em] uppercase text-center font-mono">
              SECURE PARKING MANAGEMENT SYSTEM V2.0
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}