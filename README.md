# Titik Temu

What, Apa

Produk: WebGIS bernama Transit Vitality, menghasilkan Skor Vitalitas Transit untuk tiap kawasan di sekitar titik transportasi massal

Empat komponen skor: kepadatan dan aktivitas pasar properti, kesenjangan layanan transportasi, keragaman aktivitas ekonomi termasuk UMKM, aksesibilitas ke titik transit

Tiga sudut pandang: satu mesin skor yang sama ditampilkan beda tekanan untuk investor, pemerintah atau operator transportasi, and pelaku usaha kecil (menggabungkan)

Nilai tambah inovasi: clustering otomatis tipe kawasan, prediksi tren skor ke depan, dan deteksi anomali peluang tersembunyi, ketiganya pakai machine learning (regresi linear sederhana) ringan tanpa training model gambar

Why, Mengapa/Urgensi

Riset TOD di Indonesia (MRT Jakarta, Commuter Line Bogor-Jakarta Kota) sudah banyak tapi berhenti jadi kajian ilmiah, belum jadi layanan interaktif publik

Kajian aksesibilitas DKI Jakarta menunjukkan pergerakan warga pakai angkutan massal masih jauh di bawah target RITJ karena cakupan tidak merata dan rute tidak terhubung, tapi belum pernah divisualisasikan spasial

Pemetaan UMKM berbasis GIS sudah ada di Palembang dan Semarang, tapi belum dikaitkan dengan kedekatan ke titik transit

Ketentuan resmi kompetisi 2026 mewajibkan fitur AI dalam antarmuka dan insight, bukan data mentah, produk ini dirancang memenuhi itu sejak awal

Who, Siapa

Target pengguna

Investor dan calon pemilik properti

Pemerintah daerah dan operator transportasi

Pelaku usaha kecil dan menengah

Pemangku kepentingan

Kementerian Perhubungan, Dinas Perhubungan

PT KAI, MRT Jakarta, LRT, TransJakarta

Pemerintah daerah, asosiasi UMKM

Where, Di Mana

Pilot utama: Bandung Raya, koridor Stasiun Bandung, Stasiun Kiaracondong, dan Trans Metro Pasundan, dipilih karena kelayakan survei lapangan tim

Alternatif: MRT Jakarta koridor Dukuh Atas sampai Bundaran HI, dasar akademik paling kuat tapi biaya survei lebih besar

How, Bagaimana

Pengumpulan data

Data dasar panitia, Community Maps, Property Go, Struk Go, Menu Go lewat GEO MAPID (sudah di coba, di petakan, target 200 m (maksimal paling berdekatan perasaan dimi)) datanya bersifat internal (diliat hanya ngasih score) liat dari ide dan berita kasaran ide (gaada buat validasi bisa memastikan bahwa akurasi dari model).

Data sekunder resmi, batas wilayah, jaringan jalan, statistik dari BIG, BPS, SIGITA Dephub, OSM, Open Data Bandung/Jabar

Data primer wajib, survei MAPID Apps di lokasi pilot, termasuk catat manual harga properti karena Property Go resmi tidak punya kolom harga, hanya foto spanduk promosi

Pengolahan

Satukan data dari berbagai sumber berdasarkan grid lokasi sekitar 200 meter, hasil akhirnya satu tabel, satu baris per kawasan (DI PAKE MINIMAL DAN MAKSIMAL)

Hitung Skor Vitalitas Transit pakai indeks berbobot, adaptasi metode TOD Singh 2015, bukan machine learning berat

Nilai tambah, clustering k-means untuk tipe kawasan, regresi sederhana untuk prediksi tren, deteksi anomali untuk peluang tersembunyi, semua pakai scikit-learn, ringan tanpa GPU

Peran AI

Mesin skor dan bobot adaptif, menyesuaikan penekanan skor sesuai peran pengguna yang aktif

Panel insight dan chat assistant, pakai large language model lewat API seperti Google AI Studio, mengubah data jadi ringkasan bahasa natural dan jawaban interaktif, tidak perlu training

Fitur Utama WebGIS

1. Peta Interaktif dengan Pemilih Peran

Fungsi, warna kawasan berubah sesuai skor, tampilan menyesuaikan peran pengguna yang aktif

Dataset, tabel hasil agregasi per kawasan yang sudah berisi kolom Skor Vitalitas Transit dan skor per komponen

Cara, import tabel sebagai layer di GEO MAPID, atur simbolisasi warna berdasarkan kolom skor, buat tombol pemilih peran di antarmuka yang memicu perhitungan ulang bobot lalu me-refresh warna peta

2. Layer dan Filter Data

Fungsi, menyalakan atau mematikan lapisan data seperti properti, ekonomi, layanan transportasi, dan titik transit

Dataset, Property Go, Struk Go, Menu Go, Community Activity, ditambah data sekunder jaringan jalan dan rute dari BIG, OSM, dan SIGITA Dephub

Cara, tiap sumber data diimpor sebagai layer terpisah di GEO MAPID lewat menu Import Data, lalu diaktifkan fitur layer control dan filter atribut bawaan GEO MAPID

3. Panel AI Insight

Fungsi, ringkasan otomatis berbahasa natural yang menjelaskan alasan suatu kawasan mendapat skor tertentu

Dataset, baris data kawasan terpilih, berisi skor total dan skor tiap komponen

Cara, kirim data baris tersebut ke API large language model seperti Google AI Studio, dengan prompt yang meminta model merangkum angka menjadi penjelasan naratif singkat

4. AI Chat Assistant

Fungsi, tanya jawab bebas dari pengguna berdasarkan seluruh data kawasan yang tersedia

Dataset, seluruh tabel kawasan sebagai basis konteks

Cara, saat pengguna bertanya, sistem mencari baris data kawasan yang relevan dengan pertanyaan, mengirim data itu sebagai konteks ke API model bahasa, lalu menampilkan jawabannya di kotak chat

5. Dashboard Perbandingan Kawasan

Fungsi, grafik dan tabel yang membandingkan beberapa kawasan sekaligus dari sisi keempat komponen skor

Dataset, tabel kawasan, difilter ke beberapa kawasan yang dipilih pengguna

Cara, gunakan library chart seperti Chart.js atau Recharts untuk menampilkan grafik batang atau radar dari kolom kolom skor komponen antar kawasan terpilih

6. Simulasi Dampak Penambahan Layanan

Fungsi, memperkirakan perubahan skor kesenjangan layanan apabila ditambah satu rute atau armada baru

Dataset, komponen skor kesenjangan layanan pada kawasan terpilih

Cara, logika pemrograman sederhana, menaikkan nilai komponen kesenjangan layanan sesuai asumsi penambahan kapasitas, menghitung ulang skor total, lalu menampilkan perbandingan skor sebelum dan sesudah

7. Halaman Survei Lapangan

Fungsi, menampilkan dokumentasi data primer yang dikumpulkan tim di lokasi pilot

Dataset, data Community Maps hasil survei tim sendiri, berisi judul, deskripsi, foto, dan koordinat

Cara, tampilkan sebagai galeri atau daftar berbasis lokasi, diambil langsung dari data activity yang tersimpan di MAPID Apps

8. Halaman Metodologi dan Sumber Data

Fungsi, menjelaskan seluruh data, proses pengolahan, metode skor, dan penggunaan AI secara transparan

Dataset, tidak berupa data teknis, melainkan dokumentasi tertulis dari seluruh sumber data dan metode yang dipakai

Cara, halaman statis berisi penjelasan naratif, mencantumkan tautan sumber data sekunder dan referensi akademik sesuai daftar pustaka

Sumber Dataset Kunci

Sampel data MAPID: mapid.co.id/SamplePropertiGo, SampleStrukGo, SampleMenuGo, SampleActivityMAPIDAPPS

MAPID Data Catalogue: mapid.co.id/data-catalog

Ina Geoportal BIG: tanahair.indonesia.go.id

BPS dan SIG BPS: bps.go.id, sig.bps.go.id

SIGITA Kemenhub: sigita.dephub.go.id

OpenStreetMap: openstreetmap.org

Open Data Bandung dan Jabar: opendata.bandung.go.id, opendata.jabarprov.go.id

Satudata dan Jakarta Satu: satudata.jakarta.go.id, jakartasatu.jakarta.go.id

Daftar Pustaka Singkat

Singh (2015), metode indeks TOD. Siburian dkk (2020) dan Legowo, TOD Jakarta dan Bogor-Jakarta Kota. Hasibuan (2014), TOD dan keberlanjutan Jabodetabek.

Kezia (2021), aksesibilitas dan skala layanan angkutan massal DKI Jakarta.

Agustini, pemetaan UMKM GIS Palembang. Tim penulis (2025), pemetaan UMKM berbasis web Semarang.

Fitur Standout Tambahan dan Metode Teknisnya (tambahan sebagai pembeda dan menjual)

Empat fitur berikut diusulkan sebagai pembeda utama Transit Vitality dari WebGIS sejenis, disusun beserta metode teknis supaya tim bisa langsung menilai kelayakan eksekusinya sebelum masuk pengembangan.

1. Skor Dinamis Berdasarkan Waktu (data set nya sanagat di pengaruhi oleh waktu, terutama yang UMKM) lebih asli dan sesuai keadaan lapangan 

Konsep: peta yang bisa digeser slider waktunya, menunjukkan kondisi kawasan berubah dari pagi sampai malam, bukan angka statis satu waktu

Metode: agregasi data berdasarkan kolom waktu yang sudah tersedia di skema resmi Menu Go dan Community Activity, dikelompokkan per rentang waktu seperti pagi, siang, sore, malam, lalu skor dihitung ulang untuk tiap rentang. Tidak perlu machine learning, cukup pengelompokan dan agregasi berbasis waktu

Kelebihan: datanya sudah tersedia di struktur data resmi panitia, risiko implementasi paling rendah, dan belum pernah dipakai kompetitor sebelumnya





2. Simulator Alokasi Anggaran untuk Pemerintah (Lanjutan)

Konsep: pengguna dari pihak pemerintah memasukkan angka anggaran, sistem merekomendasikan kombinasi kawasan yang paling optimal diperbaiki lebih dulu supaya total kenaikan skor paling besar

Metode: adaptasi dari knapsack problem, algoritma optimasi klasik ilmu komputer. Tiap kawasan diperlakukan sebagai item dengan dua atribut, estimasi biaya perbaikan dan proyeksi kenaikan skor. Untuk implementasi yang lebih ringan, pakai pendekatan greedy algorithm, urutkan kawasan berdasarkan rasio kenaikan skor dibanding biaya, ambil dari rasio tertinggi sampai anggaran habis

Data yang dibutuhkan: estimasi biaya perbaikan per kawasan, bisa memakai referensi biaya standar infrastruktur publik dengan asumsi yang didokumentasikan secara transparan sebagai estimasi kasar, bukan angka RAB resmi

Catatan: paling relevan untuk sudut pandang pemerintah dan operator seperti KAI dan Dishub

3. Kalkulator ROI untuk Investor

Konsep: investor memasukkan budget dan preferensi, sistem mengeluarkan daftar kawasan terurut berdasarkan proyeksi imbal hasil investasi, bukan sekadar skor pasif

Metode: regresi linear sederhana memakai scikit-learn untuk memproyeksikan tren skor atau harga ke depan dari data historis, dikombinasikan dengan rumus ROI, yaitu proyeksi nilai masa depan dikurangi estimasi biaya sekarang, dibagi estimasi biaya sekarang

Data yang dibutuhkan: histori harga properti per kawasan dari beberapa titik waktu, idealnya dari survei berkala tim atau data historis terbuka, karena Property Go resmi tidak memiliki kolom harga, hanya foto spanduk promosi

4. Vitality Twin, Perbandingan Dua Kawasan oleh AI

Konsep: pengguna memilih dua kawasan, panel AI otomatis menjelaskan dalam bahasa natural mengapa satu kawasan lebih unggul dari yang lain pada komponen tertentu

Metode: tidak perlu machine learning, cukup ambil data atribut dua kawasan, hitung selisih tiap komponen skor, kirim data terstruktur ini ke API large language model dengan instruksi menjelaskan perbedaannya

Kelebihan: paling ringan diimplementasikan dari keempat fitur ini, karena memanfaatkan ulang panel AI insight yang sudah direncanakan, hanya perlu diberi dua data sekaligus

AI DAN DATA SET SUSAH JADI GATAU UNTUK 1 BULAN UNTUK NAMBAH FITUR INI





Rekomendasi Prioritas

Fitur 1 (skor dinamis waktu) disarankan menjadi andalan utama karena paling orisinal dan datanya sudah tersedia di skema resmi. Fitur 4 (Vitality Twin) disarankan sebagai pelengkap karena implementasinya paling ringan. Fitur 2 dan 3 tetap kuat secara nilai jual namun lebih berat secara teknis, sehingga dapat diposisikan sebagai rencana pengembangan lanjutan yang disampaikan sebagai visi produk dalam presentasi, apabila waktu lima minggu tidak cukup untuk merampungkan semuanya.



## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
