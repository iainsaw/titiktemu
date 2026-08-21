# Titik Temu: Transit Vitality WebGIS 

Titik Temu adalah platform **WebGIS (Sistem Informasi Geografis Berbasis Web)** interaktif yang mengukur dan memvisualisasikan **Skor Vitalitas Transit (Transit Vitality Score)** pada kawasan-kawasan di sekitar titik transportasi massal (TOD - *Transit Oriented Development*).

Proyek percontohan (pilot) ini berfokus pada wilayah **Bandung Raya**, membantu berbagai *stakeholder* untuk memahami potensi ekonomi, properti, dan kesenjangan layanan di sekitar stasiun dan halte angkutan massal.

---

## Fitur Utama (Core Features)

### 1. Peta Interaktif (Interactive WebGIS)
Memvisualisasikan skor vitalitas kawasan dalam bentuk poligon geospasial. Warna kawasan akan berubah secara dinamis berdasarkan performa skor (Merah untuk tertinggal, Hijau untuk sangat baik).

### 2. Multi-Criteria Analysis (Pembobotan Berbasis Peran)
Tidak semua orang memiliki prioritas pembangunan yang sama. Titik Temu menerapkan prinsip *Multi-Criteria Analysis* di mana bobot skor akan disesuaikan berdasarkan peran pengguna:
- **Pemerintah / Dishub:** Mengutamakan aksesibilitas dan pemerataan fasilitas publik.
- **Developer / Investor:** Mengutamakan valuasi properti dan potensi kawasan.
- **Warga / UMKM:** Mengutamakan keragaman ekonomi lokal dan akses sehari-hari.

### 3. Vitality Twin (Simulasi Dampak Penambahan Layanan)
Platform ini memiliki mesin simulasi deterministik spasial. Pengguna dapat menyimulasikan dampak penambahan **Halte Baru, Rute Feeder, Armada, atau Jalur Pedestrian** dan melihat bagaimana skor kesenjangan layanan suatu kawasan akan membaik. Mesin ini menggunakan logika *Linear Decay* dan *Diminishing Returns* secara *real-time*.

### 4. Ekstraksi Harga Tanah (Property Extraction Method)
Mengintegrasikan metodologi penaksiran properti profesional. Sistem mengekstrak nilai lahan murni dari data harga rumah historis dengan menyusutkan nilai fisik bangunan, menghasilkan peta panas (*heatmap*) valuasi lahan di setiap kawasan transit.

### 5. Analisis Tempat Baru (Dynamic Geocoding)
Pengguna dapat mencari kawasan mana pun di luar stasiun yang sudah dipetakan. Sistem akan memanggil *geocoder* Nominatim secara dinamis, mengekstrak data administratifnya, dan menginjeksi valuasi tanah serta skor properti secara instan.

---

## Metodologi & Sumber Data

Titik Temu mengadaptasi metode saintifik dari jurnal **Measuring TOD around transit nodes - Towards TOD policy (Singh et al., 2017)**. 

Kami merangkum perhitungan rumit menjadi **4 Pilar Utama**:
1. **Pasar Properti** (Valuasi lahan via *Extraction Method*)
2. **Keragaman Ekonomi** (Agregasi jumlah UMKM & Wiraswasta)
3. **Kesenjangan Layanan** (Agregasi fasilitas umum & POI)
4. **Aksesibilitas Transit** (Kedekatan dengan simpul transportasi)

Seluruh agregasi data dihitung menggunakan *Haversine Distance* pada radius pejalan kaki **800 meter** dari pusat transit. Rincian selengkapnya dapat diakses pada menu **Metodologi** di dalam aplikasi.

---

## Teknologi yang Digunakan (Tech Stack)

### Frontend
- **React 18** (UI Library)
- **Vite** (Build Tool & Bundler)
- **TypeScript** (Static Typing)
- **Tailwind CSS & shadcn/ui** (Styling & Component System)
- **TanStack Router** (Client-side Routing)
- **Lucide React** (Iconography)

### Backend & Data Processing
- **Supabase / PostgreSQL** (Database & Single Source of Truth)
- **Node.js Scripts** (Geospatial Data Seeding & ETL)
- **Nominatim API** (OpenStreetMap Geocoding)

---

## Panduan Instalasi (Development Setup)

Pastikan Anda telah menginstal **Node.js** (versi 18+) dan `npm`.

1. **Clone repositori ini:**
   ```bash
   git clone https://github.com/iainsaw/titiktemu.git
   cd titiktemu
   ```

2. **Instal dependensi:**
   ```bash
   npm install
   ```

3. **Konfigurasi Environment Variables:**
   Buat file `.env` di *root directory* dan isi dengan kredensial Supabase Anda:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Jalankan *Development Server*:**
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan secara lokal, biasanya di `http://localhost:5173`.

---

## Target Pengguna
Aplikasi ini dirancang sebagai *Decision Support System* (DSS) untuk:
- Kementerian Perhubungan & Dinas Perhubungan Daerah.
- Operator Transportasi (PT KAI, Trans Metro Pasundan, TransJakarta).
- Investor & Pengembang Real Estat.
- Asosiasi UMKM & Peneliti Tata Kota.
