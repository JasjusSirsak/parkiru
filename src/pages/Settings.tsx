import React, { useState, useEffect } from 'react';
import { Save, Bike, Clock, Coffee, MapPin, Phone, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { getAuthHeaders } from '../utils/auth';

interface ParkingSettings {
  hourly_rate: number;
  max_daily_rate: number;
  operating_hours_open: string;
  operating_hours_close: string;
  grace_period_hours: number;
  ppn_percentage: number;
}

interface CafeProfile {
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  operating_hours_open: string;
  operating_hours_close: string;
  description: string;
  logo_url: string;
}

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [parkingSettings, setParkingSettings] = useState<ParkingSettings>({
    hourly_rate: 3000,
    max_daily_rate: 20000,
    operating_hours_open: '07:00',
    operating_hours_close: '22:00',
    grace_period_hours: 1,
    ppn_percentage: 11
  });
  const [cafeProfile, setCafeProfile] = useState<CafeProfile>({
    name: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    operating_hours_open: '07:00',
    operating_hours_close: '22:00',
    description: '',
    logo_url: ''
  });

  // Fetch settings data on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [parkingResponse, profileResponse] = await Promise.all([
          fetch('/api/settings/parking', { headers: getAuthHeaders() }),
          fetch('/api/settings/profile', { headers: getAuthHeaders() })
        ]);

        const parkingData = await parkingResponse.json();
        const profileData = await profileResponse.json();

        if (parkingData.success) {
          setParkingSettings(parkingData.data);
        }

        if (profileData.success) {
          setCafeProfile(profileData.data);
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
        toast.error('Gagal memuat pengaturan');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSaveParkingSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const response = await fetch('/api/settings/parking', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(parkingSettings),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Pengaturan parkir berhasil disimpan');
      } else {
        toast.error(data.error || 'Gagal menyimpan pengaturan parkir');
      }
    } catch (error) {
      console.error('Failed to save parking settings:', error);
      toast.error('Gagal menyimpan pengaturan parkir');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCafeProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const response = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(cafeProfile),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Profil café berhasil disimpan');
      } else {
        toast.error(data.error || 'Gagal menyimpan profil café');
      }
    } catch (error) {
      console.error('Failed to save cafe profile:', error);
      toast.error('Gagal menyimpan profil café');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const [parkingResponse, profileResponse] = await Promise.all([
        fetch('/api/settings/parking', {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(parkingSettings),
        }),
        fetch('/api/settings/profile', {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(cafeProfile),
        })
      ]);

      const parkingData = await parkingResponse.json();
      const profileData = await profileResponse.json();
      
      if (parkingData.success && profileData.success) {
        toast.success('Semua pengaturan berhasil disimpan');
      } else {
        toast.error('Beberapa pengaturan gagal disimpan');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

      if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-matcha" size={40} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Pengaturan Sistem</h1>
        <p className="text-foreground/60">Konfigurasi tarif, jam operasional, dan profil café.</p>
      </div>

      <form onSubmit={handleSaveAll} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Section 1: Tarif */}
          <div className="glass-card p-8 rounded-3xl space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-matcha/20 rounded-lg text-matcha">
                <Bike size={20} />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Tarif Parkir Motor</h2>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-foreground/70">Tarif per Jam (Motor)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40">Rp</span>
                  <input 
                    type="number" 
                    value={parkingSettings.hourly_rate}
                    onChange={(e) => setParkingSettings({...parkingSettings, hourly_rate: parseInt(e.target.value) || 0})}
                    className="w-full bg-white/5 border border-border/15 rounded-xl py-3 pl-12 pr-4 text-foreground focus:ring-2 focus:ring-matcha/50 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-foreground/70">Tarif Maksimal Harian</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40">Rp</span>
                  <input 
                    type="number" 
                    value={parkingSettings.max_daily_rate}
                    onChange={(e) => setParkingSettings({...parkingSettings, max_daily_rate: parseInt(e.target.value) || 0})}
                    className="w-full bg-white/5 border border-border/15 rounded-xl py-3 pl-12 pr-4 text-foreground focus:ring-2 focus:ring-matcha/50 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-foreground/70">Masa Tenggang (jam)</label>
                <input 
                  type="number" 
                  value={parkingSettings.grace_period_hours}
                  onChange={(e) => setParkingSettings({...parkingSettings, grace_period_hours: parseInt(e.target.value) || 0})}
                  className="w-full bg-white/5 border border-border/15 rounded-xl py-3 px-4 text-foreground focus:ring-2 focus:ring-matcha/50 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-foreground/70">PPN (%)</label>
                <input 
                  type="number" 
                  value={parkingSettings.ppn_percentage}
                  onChange={(e) => setParkingSettings({...parkingSettings, ppn_percentage: parseInt(e.target.value) || 0})}
                  className="w-full bg-white/5 border border-border/15 rounded-xl py-3 px-4 text-foreground focus:ring-2 focus:ring-matcha/50 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Jam Operasional */}
          <div className="glass-card p-8 rounded-3xl space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-matcha/20 rounded-lg text-matcha">
                <Clock size={20} />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Jam Operasional</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-foreground/70">Jam Buka</label>
                <input 
                  type="time" 
                  value={parkingSettings.operating_hours_open}
                  onChange={(e) => setParkingSettings({...parkingSettings, operating_hours_open: e.target.value})}
                  className="w-full bg-white/5 border border-border/15 rounded-xl py-3 px-4 text-foreground focus:ring-2 focus:ring-matcha/50 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-foreground/70">Jam Tutup</label>
                <input 
                  type="time" 
                  value={parkingSettings.operating_hours_close}
                  onChange={(e) => setParkingSettings({...parkingSettings, operating_hours_close: e.target.value})}
                  className="w-full bg-white/5 border border-border/15 rounded-xl py-3 px-4 text-foreground focus:ring-2 focus:ring-matcha/50 outline-none transition-all"
                />
              </div>
            </div>
            <div className="p-4 bg-white/5 rounded-xl border border-border/15">
              <p className="text-xs text-foreground/50 leading-relaxed">
                Sistem akan otomatis menolak entri baru di luar jam operasional yang ditentukan.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Profil Cafe */}
        <div className="glass-card p-8 rounded-3xl space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-matcha/20 rounded-lg text-matcha">
              <Coffee size={20} />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Profil Café</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-foreground/70">Nama Café</label>
                <div className="relative">
                  <Coffee className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" size={18} />
                  <input 
                    type="text" 
                    value={cafeProfile.name}
                    onChange={(e) => setCafeProfile({...cafeProfile, name: e.target.value})}
                    className="w-full bg-white/5 border border-border/15 rounded-xl py-3 pl-12 pr-4 text-foreground focus:ring-2 focus:ring-matcha/50 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-foreground/70">Nomor Telepon</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" size={18} />
                  <input 
                    type="tel" 
                    value={cafeProfile.phone}
                    onChange={(e) => setCafeProfile({...cafeProfile, phone: e.target.value})}
                    className="w-full bg-white/5 border border-border/15 rounded-xl py-3 pl-12 pr-4 text-foreground focus:ring-2 focus:ring-matcha/50 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-foreground/70">Email</label>
                <input 
                  type="email" 
                  value={cafeProfile.email}
                  onChange={(e) => setCafeProfile({...cafeProfile, email: e.target.value})}
                  className="w-full bg-white/5 border border-border/15 rounded-xl py-3 px-4 text-foreground focus:ring-2 focus:ring-matcha/50 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-foreground/70">Kota</label>
                <input 
                  type="text" 
                  value={cafeProfile.city}
                  onChange={(e) => setCafeProfile({...cafeProfile, city: e.target.value})}
                  className="w-full bg-white/5 border border-border/15 rounded-xl py-3 px-4 text-foreground focus:ring-2 focus:ring-matcha/50 outline-none transition-all"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-foreground/70">Alamat Lengkap</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 text-foreground/40" size={18} />
                  <textarea 
                    value={cafeProfile.address}
                    onChange={(e) => setCafeProfile({...cafeProfile, address: e.target.value})}
                    className="w-full h-[116px] bg-white/5 border border-border/15 rounded-xl py-3 pl-12 pr-4 text-foreground focus:ring-2 focus:ring-matcha/50 outline-none transition-all resize-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-foreground/70">Deskripsi</label>
                <textarea 
                  value={cafeProfile.description}
                  onChange={(e) => setCafeProfile({...cafeProfile, description: e.target.value})}
                  className="w-full h-[80px] bg-white/5 border border-border/15 rounded-xl py-3 px-4 text-foreground focus:ring-2 focus:ring-matcha/50 outline-none transition-all resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button 
            type="button"
            onClick={handleSaveParkingSettings}
            disabled={saving}
            className="flex items-center gap-3 px-8 py-4 bg-white/10 text-foreground font-bold rounded-2xl hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Simpan Parkir
          </button>
          <button 
            type="button"
            onClick={handleSaveCafeProfile}
            disabled={saving}
            className="flex items-center gap-3 px-8 py-4 bg-white/10 text-foreground font-bold rounded-2xl hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Simpan Profil
          </button>
          <button 
            type="submit"
            disabled={saving}
            className="flex items-center gap-3 px-12 py-4 bg-matcha text-black font-bold text-lg rounded-2xl hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_30px_rgba(163,197,133,0.2)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Simpan Semua
          </button>
        </div>
      </form>
    </div>
  );
    }