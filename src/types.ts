export interface Buku {
  id?: number;
  kodeBuku: string;
  isbn: string;
  barcode: string;
  judul: string;
  pengarang: string;
  penerbit: string;
  tahun: number;
  kategoriId: number;
  rakId: number;
  jumlahBuku: number;
  jumlahTersedia: number;
  jumlahDipinjam: number;
  coverBuku?: string; // Base64 or standard URL
  status: 'Tersedia' | 'Habis' | 'Terbatas';
}

export interface Anggota {
  id?: number;
  nis: string;
  nama: string;
  kelas: string;
  jenisKelamin: 'Laki-laki' | 'Perempuan';
  alamat: string;
  nomorHp: string;
  foto?: string; // Base64 or standard URL
  barcodeAnggota: string;
}

export interface Kategori {
  id: number;
  nama: string;
}

export interface Rak {
  id: number;
  nama: string;
}

export interface Peminjaman {
  id: number;
  nis: string;
  namaAnggota: string; // denormalized for speed
  tanggalPinjam: string;
  tanggalKembali: string; // due date
  status: 'Dipinjam' | 'Selesai' | 'Terlambat';
  listBuku: {
    kodeBuku: string;
    judul: string;
    tanggalKembaliAktual?: string;
    denda?: number;
    status: 'Dipinjam' | 'Dikembalikan';
  }[];
}

export interface Pengembalian {
  id: number;
  peminjamanId: number;
  nis: string;
  kodeBuku: string;
  tanggalKembaliAktual: string;
  hariKeterlambatan: number;
  denda: number;
}

export interface User {
  id?: number;
  username: string;
  password?: string;
  nama: string;
  role: 'Administrator' | 'Petugas';
}

export interface Pengaturan {
  namaSekolah: string;
  logoSekolah?: string;
  alamat: string;
  nomorTelepon: string;
  lamaPinjamDefault: number; // in days
  dendaPerHari: number; // Rupiah
  tema: 'blue' | 'slate' | 'green';
  darkMode: boolean;
}
