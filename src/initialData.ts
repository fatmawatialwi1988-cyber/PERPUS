import { Buku, Anggota, Kategori, Rak, Peminjaman, User, Pengaturan } from './types';

export const INITIAL_CATEGORIES: Kategori[] = [
  { id: 1, nama: 'Karya Umum' },
  { id: 2, nama: 'Filsafat & Psikologi' },
  { id: 3, nama: 'Agama' },
  { id: 4, nama: 'Ilmu Sosial' },
  { id: 5, nama: 'Bahasa' },
  { id: 6, nama: 'Sains & Matematika' },
  { id: 7, nama: 'Teknologi & Terapan' },
  { id: 8, nama: 'Seni & Rekreasi' },
  { id: 9, nama: 'Sastra & Fiksi' },
  { id: 10, nama: 'Sejarah & Geografi' }
];

export const INITIAL_RACKS: Rak[] = [
  { id: 1, nama: 'Rak A1 - Fiksi' },
  { id: 2, nama: 'Rak A2 - Novel' },
  { id: 3, nama: 'Rak B1 - Sains' },
  { id: 4, nama: 'Rak B2 - Matematika' },
  { id: 5, nama: 'Rak C1 - Agama' },
  { id: 6, nama: 'Rak C2 - Sosial' },
  { id: 7, nama: 'Rak D1 - Teknologi' },
  { id: 8, nama: 'Rak D2 - Bahasa' }
];

export const INITIAL_BOOKS: Buku[] = [
  {
    kodeBuku: 'B001',
    isbn: '9789791234561',
    barcode: '9789791234561',
    judul: 'Laskar Pelangi',
    pengarang: 'Andrea Hirata',
    penerbit: 'Bentang Pustaka',
    tahun: 2005,
    kategoriId: 9,
    rakId: 1,
    jumlahBuku: 5,
    jumlahTersedia: 4,
    jumlahDipinjam: 1,
    status: 'Tersedia',
    coverBuku: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=150&auto=format&fit=crop&q=60'
  },
  {
    kodeBuku: 'B002',
    isbn: '9789791234562',
    barcode: '9789791234562',
    judul: 'Bumi Manusia',
    pengarang: 'Pramoedya Ananta Toer',
    penerbit: 'Hasta Mitra',
    tahun: 1980,
    kategoriId: 9,
    rakId: 2,
    jumlahBuku: 3,
    jumlahTersedia: 3,
    jumlahDipinjam: 0,
    status: 'Tersedia',
    coverBuku: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=150&auto=format&fit=crop&q=60'
  },
  {
    kodeBuku: 'B003',
    isbn: '9789791234563',
    barcode: '9789791234563',
    judul: 'Pengantar Teknologi Informasi',
    pengarang: 'Prof. Richardus Eko Indrajit',
    penerbit: 'Andi Offset',
    tahun: 2018,
    kategoriId: 7,
    rakId: 7,
    jumlahBuku: 4,
    jumlahTersedia: 2,
    jumlahDipinjam: 2,
    status: 'Tersedia',
    coverBuku: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=150&auto=format&fit=crop&q=60'
  },
  {
    kodeBuku: 'B004',
    isbn: '9789791234564',
    barcode: '9789791234564',
    judul: 'Matematika Diskrit',
    pengarang: 'Rinaldi Munir',
    penerbit: 'Informatika Bandung',
    tahun: 2020,
    kategoriId: 6,
    rakId: 4,
    jumlahBuku: 2,
    jumlahTersedia: 0,
    jumlahDipinjam: 2,
    status: 'Habis',
    coverBuku: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=150&auto=format&fit=crop&q=60'
  },
  {
    kodeBuku: 'B005',
    isbn: '9789791234565',
    barcode: '9789791234565',
    judul: 'Sejarah Lengkap Dunia',
    pengarang: 'H.G. Wells',
    penerbit: 'Indoliterasi',
    tahun: 2015,
    kategoriId: 10,
    rakId: 6,
    jumlahBuku: 3,
    jumlahTersedia: 3,
    jumlahDipinjam: 0,
    status: 'Tersedia',
    coverBuku: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=150&auto=format&fit=crop&q=60'
  }
];

export const INITIAL_MEMBERS: Anggota[] = [
  {
    nis: '2026001',
    nama: 'Budi Santoso',
    kelas: 'X-IPA-1',
    jenisKelamin: 'Laki-laki',
    alamat: 'Jl. Pemuda No. 12, Jakarta',
    nomorHp: '081234567890',
    foto: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=60',
    barcodeAnggota: 'M2026001'
  },
  {
    nis: '2026002',
    nama: 'Siti Rahmawati',
    kelas: 'XI-IPS-2',
    jenisKelamin: 'Perempuan',
    alamat: 'Jl. Merdeka No. 45, Jakarta',
    nomorHp: '081298765432',
    foto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=60',
    barcodeAnggota: 'M2026002'
  },
  {
    nis: '2026003',
    nama: 'Ahmad Fauzi',
    kelas: 'XII-IPA-3',
    jenisKelamin: 'Laki-laki',
    alamat: 'Jl. Diponegoro No. 8, Jakarta',
    nomorHp: '082134560099',
    foto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=60',
    barcodeAnggota: 'M2026003'
  },
  {
    nis: '2026004',
    nama: 'Dewi Lestari',
    kelas: 'X-IPS-1',
    jenisKelamin: 'Perempuan',
    alamat: 'Jl. Sudirman No. 100, Jakarta',
    nomorHp: '085712345678',
    foto: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=60',
    barcodeAnggota: 'M2026004'
  }
];

export const INITIAL_BORROWS: Peminjaman[] = [
  {
    id: 1,
    nis: '2026001',
    namaAnggota: 'Budi Santoso',
    tanggalPinjam: '2026-06-25',
    tanggalKembali: '2026-07-02',
    status: 'Terlambat',
    listBuku: [
      { kodeBuku: 'B001', judul: 'Laskar Pelangi', status: 'Dipinjam' }
    ]
  },
  {
    id: 2,
    nis: '2026002',
    namaAnggota: 'Siti Rahmawati',
    tanggalPinjam: '2026-07-01',
    tanggalKembali: '2026-07-08',
    status: 'Dipinjam',
    listBuku: [
      { kodeBuku: 'B003', judul: 'Pengantar Teknologi Informasi', status: 'Dipinjam' }
    ]
  },
  {
    id: 3,
    nis: '2026003',
    namaAnggota: 'Ahmad Fauzi',
    tanggalPinjam: '2026-07-04',
    tanggalKembali: '2026-07-11',
    status: 'Dipinjam',
    listBuku: [
      { kodeBuku: 'B003', judul: 'Pengantar Teknologi Informasi', status: 'Dipinjam' },
      { kodeBuku: 'B004', judul: 'Matematika Diskrit', status: 'Dipinjam' }
    ]
  },
  {
    id: 4,
    nis: '2026004',
    namaAnggota: 'Dewi Lestari',
    tanggalPinjam: '2026-07-05',
    tanggalKembali: '2026-07-12',
    status: 'Dipinjam',
    listBuku: [
      { kodeBuku: 'B004', judul: 'Matematika Diskrit', status: 'Dipinjam' }
    ]
  }
];

export const INITIAL_USERS: User[] = [
  { username: 'admin', nama: 'Suhartono, M.Pd.', role: 'Administrator' },
  { username: 'petugas', nama: 'Indah Permata', role: 'Petugas' }
];

export const INITIAL_SETTINGS: Pengaturan = {
  namaSekolah: 'SMA Negeri 1 Jaya Raya',
  logoSekolah: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=80&auto=format&fit=crop&q=60',
  alamat: 'Jl. Pendidikan No. 1, Jakarta Selatan, DKI Jakarta',
  nomorTelepon: '(021) 7654321',
  lamaPinjamDefault: 7,
  dendaPerHari: 2000,
  tema: 'blue',
  darkMode: false
};
