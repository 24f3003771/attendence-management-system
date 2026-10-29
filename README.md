# QR-Based Employee Attendance Management System

A production-grade, three-tier Attendance Management System featuring dynamic QR code generation, GPS geofencing, selfie photo capture with tamper-proof watermarking, and real-time admin monitoring.

---

## 🏗️ Architecture

```
├── backend/        # Node.js + Express + Prisma ORM (Supabase PostgreSQL)
├── admin-panel/    # React + Vite + Tailwind CSS + TanStack Query
└── mobile/         # React Native (Expo) Employee Attendance App
```

---

## 🚀 Key Features

1. **Dynamic Rotating QR Codes**: Office QR codes rotate periodically with HMAC verification to prevent photo sharing.
2. **GPS Geofencing**: Strict validation ensuring employees are physically within the office geofence radius.
3. **Mock Location Detection**: Flags and prevents mock GPS/spoofing attempts.
4. **Selfie Capture & Tamper-Proof Watermarking**:
   - Captures employee selfie during punch.
   - Watermarked with Employee Name, Employee Code, Server Time (IST), Office Name, and GPS coordinates.
   - Date-wise storage organized by employee name: `${name}_${code}_${type}_${time}.jpg`.
5. **Bulk ZIP Photo Download**: One-click download of all watermarked photos for any specific date.
6. **Supabase PostgreSQL Integration**: Fully synced with Supabase for cloud database management.

---

## 🛠️ Setup Instructions

### 1. Backend (`backend/`)
```bash
cd backend
npm install
cp .env.example .env
# Fill DATABASE_URL with your Supabase credentials
npx prisma db push
npm run dev
```

### 2. Admin Panel (`admin-panel/`)
```bash
cd admin-panel
npm install
cp .env.example .env
npm run dev
```

### 3. Mobile App (`mobile/`)
```bash
cd mobile
npm install
npx expo start
```
