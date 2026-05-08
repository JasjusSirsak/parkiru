import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users as UsersIcon, Plus, Edit2, Trash2, Search,
  Shield, UserCheck, UserX, Loader2, CreditCard,
  Download, User, X, Printer
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import type { User as UserType, UserRole } from '@/types/auth';
import { getAuthHeaders } from '../utils/auth';

/* ═══════════════════════════════════════════════════════════════
   ⚠️  SESUAIKAN ini dengan hex warna "matcha" di tailwind.config.ts
   ═══════════════════════════════════════════════════════════════ */
const MATCHA = '#7ED957';

/* ═══════════════════════════════════════════════════════════════
   CANVAS HELPERS — murni Canvas 2D
   ═══════════════════════════════════════════════════════════════ */

function rrPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function spacedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, sp: number) {
  const saved = ctx.textAlign;
  ctx.textAlign = 'left';
  let cx = x;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + sp;
  }
  ctx.textAlign = saved;
}

async function renderCard(canvas: HTMLCanvasElement, user: UserType, qrSrc: string) {
  const ctx = canvas.getContext('2d')!;
  const S = 3;
  const W = 600, H = 340;
  canvas.width = W * S;
  canvas.height = H * S;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.scale(S, S);
  ctx.clearRect(0, 0, W, H);

  /* Background */
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#1a1a2e');
  bg.addColorStop(1, '#0d0d18');
  rrPath(ctx, 0, 0, W, H, 32);
  ctx.fillStyle = bg;
  ctx.fill();

  rrPath(ctx, 0.5, 0.5, W - 1, H - 1, 32);
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.save();
  rrPath(ctx, 0, 0, W, H, 32);
  ctx.clip();

  /* ── Avatar ── */
  const ax = 96, ay = H / 2, ar = 56;
  ctx.save();
  ctx.shadowColor = 'rgba(126,217,87,0.25)';
  ctx.shadowBlur = 60;
  const ag = ctx.createLinearGradient(ax - ar, ay - ar, ax + ar, ay + ar);
  ag.addColorStop(0, MATCHA);
  ag.addColorStop(1, '#166534');
  ctx.beginPath();
  ctx.arc(ax, ay, ar, 0, Math.PI * 2);
  ctx.fillStyle = ag;
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(ax, ay, ar - 4, 0, Math.PI * 2);
  ctx.fillStyle = '#0a0a0f';
  ctx.fill();

  ctx.fillStyle = MATCHA;
  ctx.font = '900 36px system-ui,-apple-system,"Segoe UI",sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(user.full_name.charAt(0).toUpperCase(), ax, ay + 1);

  /* ── Divider ── */
  const dx = 40 + 112 + 32;
  ctx.beginPath();
  ctx.moveTo(dx, 50);
  ctx.lineTo(dx, H - 50);
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  ctx.stroke();

  /* ── Text Info ── */
  const tx = dx + 32;
  let ty = H / 2 - 32;

  ctx.fillStyle = MATCHA;
  ctx.font = '900 10px system-ui,-apple-system,sans-serif';
  ctx.textBaseline = 'alphabetic';
  spacedText(ctx, 'IDENTITAS ADMIN', tx, ty, 4.8);

  ty += 38;
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 30px system-ui,-apple-system,sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(user.full_name, tx, ty);

  ty += 30;
  const roleStr = user.role.toUpperCase();
  ctx.font = '900 10px system-ui,-apple-system,sans-serif';
  const bw = ctx.measureText(roleStr).width + 32;
  const bh = 24;
  rrPath(ctx, tx, ty - bh / 2, bw, bh, 8);
  ctx.fillStyle = 'rgba(168,85,247,0.2)';
  ctx.fill();
  rrPath(ctx, tx + 0.5, ty - bh / 2 + 0.5, bw - 1, bh - 1, 8);
  ctx.strokeStyle = 'rgba(168,85,247,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#c084fc';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(roleStr, tx + 16, ty);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '700 12px ui-monospace,SFMono-Regular,"Cascadia Code",monospace';
  ctx.fillText('#' + user.id.toString().padStart(4, '0'), tx + bw + 12, ty);

  /* ── QR Code ── */
  const qs = 120, qp = 20, qb = qs + qp * 2;
  const qx = W - 40 - qb / 2;
  const qy = H / 2 - 15;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 20;
  rrPath(ctx, qx - qb / 2, qy - qb / 2, qb, qb, 32);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();

  if (qrSrc) {
    try {
      const img = new Image();
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = qrSrc; });
      ctx.drawImage(img, qx - qs / 2, qy - qs / 2, qs, qs);
    } catch (e) { console.error('QR draw fail:', e); }
  }

  const ly = qy + qb / 2 + 18;
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '900 9px system-ui,-apple-system,sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  spacedText(ctx, 'SCAN OTORISASI', qx, ly, 2.7);

  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.font = 'italic 700 7px ui-monospace,SFMono-Regular,monospace';
  ctx.fillText('Parkiru Security System', qx, ly + 14);

  /* ── Decorative ── */
  ctx.save();
  ctx.translate(W + 24, H / 2);
  ctx.rotate(Math.PI / 2);
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  ctx.font = '900 8px system-ui,-apple-system,sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  spacedText(ctx, 'SECURITY CLEARANCE V1.0', 0, 0, 12);
  ctx.restore();

  ctx.restore();
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function Users() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [formData, setFormData] = useState({
    username: '', full_name: '', email: '', phone: '',
    role: 'operator' as UserRole, password: '', is_active: true,
  });

  const [idCardUser, setIdCardUser] = useState<UserType | null>(null);
  const [isIdCardModalOpen, setIsIdCardModalOpen] = useState(false);
  const [cardReady, setCardReady] = useState(false);

  const cardRef = useRef<HTMLCanvasElement>(null);

  const isOnline = (la?: string) => {
    if (!la) return false;
    return (Date.now() - new Date(la).getTime()) < 5 * 60 * 1000;
  };
  const fmtLastSeen = (la?: string) => {
    if (!la) return '';
    const d = Math.floor((Date.now() - new Date(la).getTime()) / 1000);
    if (d < 60) return 'Baru saja';
    if (d < 3600) return `${Math.floor(d / 60)} menit lalu`;
    if (d < 86400) return `${Math.floor(d / 3600)} jam lalu`;
    return new Date(la).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const r = await fetch('/api/users', { headers: getAuthHeaders() });
      const d = await r.json();
      if (d.success) setUsers(d.data);
      else toast.error(d.error || 'Gagal mengambil data users');
    } catch { toast.error('Gagal mengambil data users'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); const iv = setInterval(fetchUsers, 60000); return () => clearInterval(iv); }, []);

  const handleToggleStatus = async (u: UserType) => {
    try {
      const r = await fetch(`/api/users/${u.id}`, {
        method: 'PUT', headers: getAuthHeaders(),
        body: JSON.stringify({ ...u, is_active: !u.is_active }),
      });
      const d = await r.json();
      if (d.success) { toast.success(`User ${!u.is_active ? 'diaktifkan' : 'dinonaktifkan'}`); fetchUsers(); }
    } catch { toast.error('Gagal mengubah status user'); }
  };

  const handleOpenModal = (u?: UserType) => {
    if (u) {
      setEditingUser(u);
      setFormData({ username: u.username, full_name: u.full_name, email: u.email || '', phone: u.phone || '', role: u.role, password: '', is_active: u.is_active ?? true });
    } else {
      setEditingUser(null);
      setFormData({ username: '', full_name: '', email: '', phone: '', role: 'operator', password: '', is_active: true });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({ username: '', full_name: '', email: '', phone: '', role: 'operator', password: '', is_active: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const r = await fetch(url, { method: editingUser ? 'PUT' : 'POST', headers: getAuthHeaders(), body: JSON.stringify(formData) });
      const d = await r.json();
      if (d.success) { toast.success(editingUser ? 'User berhasil diupdate' : 'User berhasil dibuat'); handleCloseModal(); fetchUsers(); }
      else toast.error(d.error || 'Gagal menyimpan user');
    } catch { toast.error('Gagal menyimpan user'); }
  };

  const handleDelete = async (id: number, username: string) => {
    if (!window.confirm(`Hapus user "${username}"?`)) return;
    try {
      const r = await fetch(`/api/users/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
      const d = await r.json();
      if (d.success) { toast.success('User berhasil dihapus'); fetchUsers(); }
      else toast.error(d.error || 'Gagal menghapus user');
    } catch { toast.error('Gagal menghapus user'); }
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /* ── Render card ke canvas ── */
  useEffect(() => {
    if (!isIdCardModalOpen || !idCardUser || !cardRef.current) return;
    let dead = false;

    (async () => {
      setCardReady(false);
      for (let i = 0; i < 10; i++) {
        const qr = document.getElementById('_qr_gen') as HTMLCanvasElement | null;
        if (qr) {
          const src = qr.toDataURL('image/png');
          if (!dead) await renderCard(cardRef.current!, idCardUser, src);
          if (!dead) setCardReady(true);
          return;
        }
        await new Promise(r => setTimeout(r, 100));
      }
      if (!dead) { await renderCard(cardRef.current!, idCardUser, ''); setCardReady(true); }
    })();

    return () => { dead = true; };
  }, [isIdCardModalOpen, idCardUser]);

  const handleDownload = () => {
    if (!cardRef.current || !idCardUser) return;
    const a = document.createElement('a');
    a.download = `Admin-ID-${idCardUser.username}.png`;
    a.href = cardRef.current.toDataURL('image/png', 1.0);
    a.click();
    toast.success('ID Card berhasil didownload!');
  };

  const handlePrint = () => {
    if (!cardRef.current || !idCardUser) return;
    const src = cardRef.current.toDataURL('image/png');
    const w = window.open('', '_blank');
    if (!w) { toast.error('Pop-up diblokir browser'); return; }
    w.document.write(`<!DOCTYPE html><html><head><title>ID Card - ${idCardUser.full_name}</title>
      <style>@page{margin:0}body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fff}img{width:600px;height:auto}</style></head>
      <body><img src="${src}" onload="setTimeout(()=>{print();close()},300)"></body></html>`);
    w.document.close();
  };

  /* ═══════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════ */
  return (
    <>
      <div className="space-y-6 animate-fade-in max-w-[1600px] mx-auto px-4">

        {/* ── Header ── */}
        <div className="glass-card rounded-2xl overflow-hidden border border-border/10">
          <div className="p-6 md:p-7">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-matcha/20 rounded-xl text-matcha"><UsersIcon size={20} /></div>
                  <p className="text-xs font-semibold tracking-widest text-matcha/80 uppercase">Manajemen User</p>
                </div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">Kelola Pengguna</h1>
                <p className="mt-1 text-foreground/60 text-sm font-medium">Kelola akses admin dan operator sistem PARKIRU</p>
              </div>
              <button onClick={() => handleOpenModal()} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-matcha text-black font-bold hover:bg-matcha/90 transition-all">
                <Plus size={18} /> Tambah User
              </button>
            </div>
          </div>
          <div className="px-6 md:px-7 pb-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={18} />
              <input type="text" placeholder="Cari user..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-border/15 rounded-xl py-2.5 pl-10 pr-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-matcha/50 transition-all" />
            </div>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="glass-card rounded-2xl overflow-hidden border border-border/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 text-foreground/50 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">User</th>
                  <th className="px-6 py-4 font-semibold">Role</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Dibuat</th>
                  <th className="px-6 py-4 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="animate-spin text-matcha mx-auto" size={32} />
                    <p className="text-sm text-foreground/50 mt-3">Memuat data users...</p>
                  </td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-foreground/50">
                    <UsersIcon className="mx-auto mb-3 opacity-30" size={48} />
                    <p className="text-sm">Tidak ada user ditemukan</p>
                  </td></tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-matcha/20 flex items-center justify-center text-matcha font-bold text-sm">
                            {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground truncate">{user.full_name}</p>
                            <p className="text-xs text-foreground/50 truncate">@{user.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                          {user.role === 'admin' ? <Shield size={12} /> : <UserCheck size={12} />}{user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          <button onClick={() => handleToggleStatus(user)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit transition-all hover:scale-105 active:scale-95 ${user.is_active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/20 text-red-400 border border-red-500/20'}`}>
                            {user.is_active ? <UserCheck size={12} /> : <UserX size={12} />}{user.is_active ? 'Aktif' : 'Nonaktif'}
                          </button>
                          {user.last_activity && (
                            <div className="flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full ${isOnline(user.last_activity) ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-neutral-600'}`} />
                              <span className="text-[10px] text-foreground/40 font-medium">{isOnline(user.last_activity) ? 'Sedang Online' : fmtLastSeen(user.last_activity)}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-foreground/60">{new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {user.role === 'admin' && (
                            <button
                              onClick={() => { setIdCardUser(user); setIsIdCardModalOpen(true); }}
                              className="p-2 rounded-lg bg-matcha/10 hover:bg-matcha/20 text-matcha transition-all cursor-pointer"
                              title="Admin ID Card"
                            >
                              <CreditCard size={14} />
                            </button>
                          )}
                          <button onClick={() => handleOpenModal(user)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-foreground/60 hover:text-foreground transition-all cursor-pointer" title="Edit">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDelete(user.id, user.username)} className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all cursor-pointer" title="Hapus">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Modal Add/Edit (tetap di dalam layout, AnimatePresence aman di sini) ── */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
            onClick={handleCloseModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-neutral-900 border border-white/10 rounded-[32px] shadow-2xl overflow-hidden w-full max-w-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-white/10">
                <h2 className="text-xl font-bold text-foreground">{editingUser ? 'Edit User' : 'Tambah User Baru'}</h2>
                <p className="text-sm text-foreground/60 mt-1">{editingUser ? 'Update informasi user' : 'Buat user baru untuk akses sistem'}</p>
              </div>
              <form onSubmit={handleSubmit} className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  {[
                    { label: 'Username', key: 'username' as const, type: 'text', req: true },
                    { label: 'Nama Lengkap', key: 'full_name' as const, type: 'text', req: true },
                    { label: 'Email', key: 'email' as const, type: 'email', req: true },
                    { label: 'Nomor Telepon (Opsional)', key: 'phone' as const, type: 'text', req: false },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] mb-2 ml-1">{f.label}</label>
                      <input type={f.type} required={f.req} value={formData[f.key]} onChange={e => setFormData({ ...formData, [f.key]: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-matcha/50 transition-all font-medium" />
                    </div>
                  ))}
                  {!editingUser && (
                    <>
                      <div>
                        <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] mb-2 ml-1">Role</label>
                        <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-matcha/50 transition-all font-bold appearance-none cursor-pointer">
                          <option value="operator" className="bg-[#13131f]">Operator</option>
                          <option value="admin" className="bg-[#13131f]">Admin</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] mb-2 ml-1">Status Akun</label>
                        <div onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                          className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-5 py-3 cursor-pointer hover:bg-white/10 transition-all">
                          <div className={`w-10 h-6 rounded-full relative transition-all duration-300 ${formData.is_active ? 'bg-matcha' : 'bg-white/10'}`}>
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${formData.is_active ? 'left-5' : 'left-1'}`} />
                          </div>
                          <span className={`text-xs font-bold uppercase tracking-wider ${formData.is_active ? 'text-matcha' : 'text-foreground/40'}`}>{formData.is_active ? 'Aktif' : 'Nonaktif'}</span>
                        </div>
                      </div>
                    </>
                  )}
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] mb-2 ml-1">Password {editingUser && '(Opsional)'}</label>
                    <input type="password" required={!editingUser} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-matcha/50 transition-all font-medium" />
                  </div>
                </div>
                <div className="flex gap-4 pt-8 mt-4 border-t border-white/5">
                  <button type="button" onClick={handleCloseModal}
                    className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-foreground/60 hover:bg-white/10 transition-all font-bold text-xs uppercase tracking-widest">Batal</button>
                  <button type="submit"
                    className="flex-1 py-4 rounded-2xl bg-matcha text-black font-black hover:bg-matcha/90 transition-all text-xs uppercase tracking-widest shadow-lg shadow-matcha/10">{editingUser ? 'Update Informasi' : 'Buat Akun Baru'}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════
          ID CARD MODAL — Portal ke body, TANPA AnimatePresence
          (AnimatePresence + createPortal = React reconciliation error)
         ══════════════════════════════════════════════════════════ */}
      {isIdCardModalOpen && idCardUser && createPortal(
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
          style={{ zIndex: 99999 }}
          onClick={() => setIsIdCardModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-[#0f0f18] border border-white/10 rounded-[40px] shadow-2xl overflow-hidden p-10 flex flex-col items-center"
            style={{ animation: 'fadeInUp 0.25s ease-out' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="w-full flex justify-between items-center mb-8 px-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-matcha/10 rounded-xl text-matcha"><User size={20} /></div>
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tight">ID Card Admin Otorisasi</h2>
                  <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.2em]">Sistem Parkiru &bull; High Security</p>
                </div>
              </div>
              <button onClick={() => setIsIdCardModalOpen(false)} className="p-2 text-white/20 hover:text-white transition-colors cursor-pointer">
                <X size={24} />
              </button>
            </div>

            {/* Hidden QR generator — off-screen */}
            <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
              <QRCodeCanvas
                id="_qr_gen"
                key={idCardUser.id}
                value={idCardUser.master_key || 'NO-KEY'}
                size={360}
                level="H"
                includeMargin={false}
              />
            </div>

            {/* Canvas: preview === export (100% identik) */}
            {!cardReady && (
              <div className="w-[600px] h-[340px] rounded-[32px] bg-white/5 flex items-center justify-center">
                <Loader2 className="animate-spin text-matcha" size={28} />
              </div>
            )}
            <canvas
              ref={cardRef}
              style={{
                display: cardReady ? 'block' : 'none',
                borderRadius: '32px',
                boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
              }}
            />

            {/* Buttons */}
            <div className="mt-10 w-full grid grid-cols-3 gap-3">
              <button onClick={() => setIsIdCardModalOpen(false)}
                className="py-4 rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-white/60 transition-all font-black text-[11px] uppercase tracking-widest cursor-pointer">
                Tutup
              </button>
              <button onClick={handlePrint}
                className="py-4 rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-white/60 transition-all font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer">
                <Printer size={15} /> Cetak
              </button>
              <button onClick={handleDownload}
                className="py-4 rounded-2xl bg-matcha text-black font-black hover:bg-matcha/90 transition-all text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-matcha/5 cursor-pointer">
                <Download size={15} /> Download PNG
              </button>
            </div>
          </div>

          {/* Inline keyframes untuk animasi masuk */}
          <style>{`
            @keyframes fadeInUp {
              from { opacity: 0; transform: scale(0.9) translateY(20px); }
              to   { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}</style>
        </div>,
        document.body
      )}
    </>
  );
}