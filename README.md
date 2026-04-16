# 🚗 PARKIRU - Parking Management System

Sistem manajemen parkir motor modern dengan arsitektur terpisah (Backend + Frontend).

## 🏗️ Arsitektur

- **Backend**: Express.js + PostgreSQL (Port 5001)
- **Frontend**: React + Vite + TypeScript (Port 5173)
- **Database**: PostgreSQL dengan 6 tabel utama

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 13+
- Git

## 🚀 Quick Start

### 1. Clone & Install Dependencies

```bash
git clone <repository-url>
cd parkiru

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2. Setup Database

```bash
# Jalankan script SQL di database.sql
# Atau import ke PostgreSQL kamu
psql -U postgres -d parkiru < database.sql
```

### 3. Environment Variables

Buat file `.env` di folder `backend/`:

```env
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=parkiru
PORT=5001
```

### 4. Jalankan Aplikasi

```bash
# Jalankan backend + frontend bersamaan
npm run dev:full

# Atau jalankan terpisah:
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

### 5. Akses Aplikasi

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5001
- **Health Check**: http://localhost:5001/api/health

## 📊 API Endpoints

### Parking Sessions
- `GET /api/parking-sessions/active` - Motor yang sedang parkir
- `POST /api/parking-sessions` - Entry motor baru
- `PUT /api/parking-sessions/:id/complete` - Exit motor
- `GET /api/parking-sessions/plate/:plate_number` - Cari berdasarkan plat

### Transactions
- `GET /api/transactions/dashboard` - Data dashboard lengkap
- `POST /api/transactions` - Buat transaksi
- `GET /api/transactions/stats/all` - Statistik umum

## 🔧 Development

### Vite Proxy Setup
Frontend menggunakan proxy untuk menghindari CORS issues:
- Semua request ke `/api/*` di-forward ke `http://localhost:5001`

### Database Schema
6 tabel utama:
- `users` - Admin & operator
- `cafe_profile` - Info café
- `parking_settings` - Konfigurasi tarif
- `payment_methods` - Metode pembayaran
- `parking_sessions` - Sesi parkir aktif
- `transactions` - Riwayat transaksi

## 🐛 Troubleshooting

### Port Conflict (5000)
Jika port 5000 konflik dengan Windows service:
- Backend otomatis pakai port 5001
- Vite proxy handle routing

### CORS Issues
- Pastikan Vite proxy aktif
- Atau gunakan `http://localhost:5001` langsung

### Database Connection
```bash
# Test koneksi
cd backend
node -e "require('./db').connect((err) => console.log(err ? 'Error' : 'Connected'))"
```

## 📝 Features

- ✅ Entry motor dengan generate ID unik
- ✅ Live monitoring motor aktif
- ✅ Real-time duration calculation
- ✅ Exit & billing otomatis
- ✅ Dashboard dengan charts Recharts
- ✅ Responsive UI dengan Tailwind CSS

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

MIT License