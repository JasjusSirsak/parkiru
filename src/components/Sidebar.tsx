import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import parkiruLogo from '../assets/parkiru.svg';
import { 
  LayoutDashboard, 
  Activity, 
  History, 
  Camera, 
  Scan, 
  Settings,
  Bike,
  User,
  LogOut,
  Settings as SettingsIcon,
  Trash2,
  ChevronDown,
  X,
  Users,
  FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import type { User as UserType, UserRole } from '@/types/auth';
import { getAuthHeaders } from '../utils/auth';

interface DailySummary {
  masuk: number;
  aktif: string;
}

interface NavItem {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  path: string;
  allowedRoles?: UserRole[];
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/', allowedRoles: ['admin', 'operator'] },
  { icon: Activity, label: 'Pantau Karcis', path: '/live' },
  { icon: History, label: 'Riwayat', path: '/history' },
  { icon: Camera, label: 'Entri Motor', path: '/entry' },
  { icon: Scan, label: 'Pemindaian', path: '/checker' },
  { icon: Settings, label: 'Pengaturan', path: '/settings', allowedRoles: ['admin'] },
  { icon: Users, label: 'Manajemen User', path: '/users', allowedRoles: ['admin'] },
];

const AUTH_USER_KEY = 'parkiru:auth-user';

const getCurrentUser = (): UserType | null => {
  try {
    const userStr = localStorage.getItem(AUTH_USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

const filterNavItemsByRole = (items: NavItem[], userRole: UserRole): NavItem[] => {
  return items.filter(item => {
    if (!item.allowedRoles) return true;
    return item.allowedRoles.includes(userRole);
  });
};

export default function Sidebar({ isOpen, toggle }: { isOpen: boolean, toggle: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [dailySummary, setDailySummary] = useState<DailySummary>({ masuk: 0, aktif: '0%' });
  const [user, setUser] = useState<UserType | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
  }, []);

  const handleSaveProfile = () => {
    toast.success("Profil berhasil diperbarui");
    setIsProfileOpen(false);
  };

  const handleLogout = () => {
    setIsProfileOpen(false);
    navigate('/login');
  };

  // Fetch daily summary data
  useEffect(() => {
    const fetchDailySummary = async () => {
      try {
        const response = await fetch('/api/dashboard/daily-summary', {
          headers: getAuthHeaders(),
        });
        const data = await response.json();
        if (data.success) {
          setDailySummary(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch daily summary:', error);
        // Keep default values on error
      }
    };

    fetchDailySummary();
    // Refresh every 30 seconds
    const interval = setInterval(fetchDailySummary, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close profile popup on outside click  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={toggle}
        />
      )}
      
      <aside className={`
        fixed top-0 left-0 h-full z-50 transition-transform duration-300 ease-in-out
        w-72 sidebar-surface border-r border-border/10 flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand */}
        <div className="px-6 pt-7 pb-5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-matcha/20 flex items-center justify-center relative overflow-hidden group skeuo-depth">
              <div 
                className="w-7 h-7 bg-matcha relative z-10 group-hover:scale-110 transition-transform"
                style={{
                  maskImage: `url(${parkiruLogo})`,
                  WebkitMaskImage: `url(${parkiruLogo})`,
                  maskRepeat: 'no-repeat',
                  WebkitMaskRepeat: 'no-repeat',
                  maskPosition: 'center',
                  WebkitMaskPosition: 'center',
                  maskSize: 'contain',
                  WebkitMaskSize: 'contain'
                }}
              />
              <div className="absolute inset-0 bg-matcha/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-foreground leading-tight">PARKIRU</h1>
              <p className="text-xs text-foreground/50 font-medium truncate">Sistem Parkir Modern</p>
            </div>
          </div>

          {/* Mini stats card */}
          <div className="mt-5 p-4 rounded-2xl bg-white/[0.04] border border-border/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-matcha/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <p className="text-xs font-semibold text-foreground/70 relative z-10">Ringkasan Hari Ini</p>
            <div className="mt-3 grid grid-cols-2 gap-3 relative z-10">
              <div className="rounded-xl bg-white/[0.04] border border-border/10 p-3 hover:bg-white/[0.06] transition-colors">
                <p className="text-[10px] uppercase tracking-wider text-foreground/50 font-bold">Masuk</p>
                <p className="text-lg font-bold text-foreground mt-0.5">{dailySummary.masuk}</p>
              </div>
              <div className="rounded-xl bg-white/[0.04] border border-border/10 p-3 hover:bg-white/[0.06] transition-colors">
                <p className="text-[10px] uppercase tracking-wider text-foreground/50 font-bold">Aktif</p>
                <p className="text-lg font-bold text-matcha mt-0.5">{dailySummary.aktif}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto scrollbar-thin">
          {user && filterNavItemsByRole(navItems, user.role).map((item) => {
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => window.innerWidth < 1024 && toggle()}
                className={`
                  nav-pill relative flex items-center gap-3 px-3 py-2.5 transition-all duration-200 group
                  ${isActive 
                    ? 'bg-matcha/15 text-foreground border border-matcha/30 shadow-lg shadow-matcha/5' 
                    : 'text-foreground/60 hover:bg-white/5 hover:text-foreground'}
                `}
              >


<span className={`${isActive ? 'text-matcha' : 'text-foreground/80'} group-hover:scale-110 transition-transform`}>
  <item.icon size={18} />
</span>
                <span className="font-semibold text-sm tracking-tight">{item.label}</span>
                <span className="ml-auto text-[10px] text-foreground/40 group-hover:text-foreground/60 group-hover:translate-x-0.5 transition-all">›</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Profile card at bottom — clickable, opens profile popup */}
        <div className="p-5 border-t border-border/10 relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className={`w-full rounded-2xl border p-4 transition-all duration-200 text-left group ${
              isProfileOpen 
                ? 'bg-matcha/10 border-matcha/20' 
                : 'bg-white/[0.04] border-border/10 hover:bg-white/[0.06] hover:border-border/20'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-matcha/25 flex items-center justify-center text-matcha font-bold relative">
                {user ? user.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : 'AC'}
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-neutral-900" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground truncate">{user?.full_name || 'Admin Café'}</p>
                <p className="text-xs text-foreground/40 truncate">{user?.email || 'admin@parkirui.id'}</p>
              </div>
              <ChevronDown 
                size={16} 
                className={`text-foreground/30 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} 
              />
            </div>
          </button>

          {/* Profile Popup — opens above the profile card */}
          <AnimatePresence>
            {isProfileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="absolute left-5 right-5 bottom-[calc(100%+0.5rem)] bg-neutral-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
              >
                {/* Close button */}
                <button
                  onClick={() => setIsProfileOpen(false)}
                  className="absolute top-3 right-3 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all z-10"
                >
                  <X size={14} />
                </button>

                <div className="p-5">
                  {/* Avatar & Name */}
                  <div className="flex flex-col items-center mb-5">
                    <div className="w-16 h-16 rounded-full bg-matcha/20 flex items-center justify-center text-matcha mb-3 relative group cursor-pointer">
                      <User size={32} />
                      <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[9px] text-white font-bold uppercase tracking-wider">
                        Ubah
                      </div>
                    </div>
                    <input 
                      type="text" 
                      defaultValue={user?.full_name || 'Admin Café'}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-center text-white text-sm focus:ring-2 focus:ring-matcha/50 outline-none transition-all"
                    />
                    <p className="text-[11px] text-white/30 mt-1.5">{user?.email || 'admin@parkirui.id'}</p>
                    {user && (
                      <p className="text-[10px] text-matcha/80 mt-1 font-medium uppercase tracking-wider">
                        {user.role}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="space-y-1">
                    <button 
                      onClick={() => { setIsProfileOpen(false); navigate('/operator-report'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 bg-matcha/10 text-matcha hover:bg-matcha/20 rounded-xl transition-all font-bold text-sm mb-1"
                    >
                      <FileText size={16} />
                      <span>Lihat Laporan Kerja</span>
                    </button>
                    <button 
                      onClick={handleSaveProfile}
                      className="w-full py-2.5 bg-white/5 text-white/60 font-bold rounded-xl hover:bg-white/10 transition-all text-sm"
                    >
                      Simpan Perubahan
                    </button>
                    <div className="h-px bg-white/10 my-2" />
                    <button className="w-full flex items-center gap-3 px-4 py-2 text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                      <SettingsIcon size={16} />
                      <span className="text-sm">Pengaturan Akun</span>
                    </button>
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2 text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                    >
                      <LogOut size={16} />
                      <span className="text-sm">Logout</span>
                    </button>
                    <button 
                      onClick={() => toast.error("Konfirmasi hapus akun dikirim ke email")}
                      className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-red-400/10 rounded-xl transition-colors"
                    >
                      <Trash2 size={16} />
                      <span className="text-sm">Hapus Akun</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>
    </>
  );
}