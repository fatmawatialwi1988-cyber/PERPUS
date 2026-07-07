import sqlite3
import os

DB_NAME = "library.db"

def get_connection():
    """Membuka koneksi ke database SQLite dengan Foreign Key diaktifkan."""
    conn = sqlite3.connect(DB_NAME)
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Menginisialisasi seluruh tabel relasional dan data awal (seeding)."""
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Tabel Kategori
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS kategori (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nama TEXT UNIQUE NOT NULL
    );
    """)

    # 2. Tabel Rak Penempatan
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS rak (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nama TEXT UNIQUE NOT NULL
    );
    """)

    # 3. Tabel User (Autentikasi & Otorisasi)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user (
        username TEXT PRIMARY KEY,
        password TEXT NOT NULL,
        nama TEXT NOT NULL,
        role TEXT CHECK(role IN ('Administrator', 'Petugas')) NOT NULL
    );
    """)

    # 4. Tabel Buku
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS buku (
        kode_buku TEXT PRIMARY KEY,
        isbn TEXT UNIQUE NOT NULL,
        barcode TEXT UNIQUE NOT NULL,
        judul TEXT NOT NULL,
        pengarang TEXT NOT NULL,
        penerbit TEXT NOT NULL,
        tahun INTEGER NOT NULL,
        kategori_id INTEGER,
        rak_id INTEGER,
        jumlah_buku INTEGER DEFAULT 0,
        jumlah_tersedia INTEGER DEFAULT 0,
        jumlah_dipinjam INTEGER DEFAULT 0,
        cover_buku TEXT, -- path file lokal
        status TEXT CHECK(status IN ('Tersedia', 'Habis')) DEFAULT 'Tersedia',
        FOREIGN KEY (kategori_id) REFERENCES kategori(id) ON DELETE SET NULL,
        FOREIGN KEY (rak_id) REFERENCES rak(id) ON DELETE SET NULL
    );
    """)

    # 5. Tabel Anggota
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS anggota (
        nis TEXT PRIMARY KEY,
        nama TEXT NOT NULL,
        kelas TEXT NOT NULL,
        jenis_kelamin TEXT CHECK(jenis_kelamin IN ('Laki-laki', 'Perempuan')) NOT NULL,
        alamat TEXT,
        nomor_hp TEXT,
        foto TEXT, -- path file foto lokal
        barcode_anggota TEXT UNIQUE NOT NULL
    );
    """)

    # 6. Tabel Peminjaman (Transaksi Utama)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS peminjaman (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nis TEXT NOT NULL,
        tanggal_pinjam DATE NOT NULL,
        tanggal_kembali DATE NOT NULL, -- batas tempo
        status TEXT CHECK(status IN ('Dipinjam', 'Selesai', 'Terlambat')) DEFAULT 'Dipinjam',
        FOREIGN KEY (nis) REFERENCES anggota(nis) ON DELETE CASCADE
    );
    """)

    # 7. Tabel Detail Peminjaman (Relasi Many-to-Many Buku & Peminjaman)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS detail_peminjaman (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        peminjaman_id INTEGER NOT NULL,
        kode_buku TEXT NOT NULL,
        status TEXT CHECK(status IN ('Dipinjam', 'Dikembalikan')) DEFAULT 'Dipinjam',
        tanggal_kembali_aktual DATE,
        denda REAL DEFAULT 0,
        FOREIGN KEY (peminjaman_id) REFERENCES peminjaman(id) ON DELETE CASCADE,
        FOREIGN KEY (kode_buku) REFERENCES buku(kode_buku) ON DELETE RESTRICT
    );
    """)

    # 8. Tabel Pengembalian (Riwayat denda & pengembalian buku)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS pengembalian (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        peminjaman_id INTEGER NOT NULL,
        kode_buku TEXT NOT NULL,
        tanggal_kembali_aktual DATE NOT NULL,
        hari_keterlambatan INTEGER DEFAULT 0,
        denda REAL DEFAULT 0,
        FOREIGN KEY (peminjaman_id) REFERENCES peminjaman(id) ON DELETE CASCADE,
        FOREIGN KEY (kode_buku) REFERENCES buku(kode_buku) ON DELETE RESTRICT
    );
    """)

    # 9. Tabel Riwayat Denda
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS denda (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nis TEXT NOT NULL,
        jumlah REAL NOT NULL,
        tanggal_bayar DATE NOT NULL,
        keterangan TEXT,
        FOREIGN KEY (nis) REFERENCES anggota(nis) ON DELETE CASCADE
    );
    """)

    # 10. Tabel Pengaturan Aplikasi
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS pengaturan (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );
    """)

    # --- SEEDING INITIAL DATA ---
    # Tambah User Bawaan jika kosong
    cursor.execute("SELECT COUNT(*) FROM user;")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO user VALUES ('admin', 'admin123', 'Suhartono, M.Pd.', 'Administrator');")
        cursor.execute("INSERT INTO user VALUES ('petugas', 'petugas123', 'Indah Permata', 'Petugas');")

    # Tambah Kategori Bawaan jika kosong
    cursor.execute("SELECT COUNT(*) FROM kategori;")
    if cursor.fetchone()[0] == 0:
        kats = [('Karya Umum',), ('Filsafat & Psikologi',), ('Agama',), ('Ilmu Sosial',), 
                ('Bahasa',), ('Sains & Matematika',), ('Teknologi & Terapan',), 
                ('Seni & Rekreasi',), ('Sastra & Fiksi',), ('Sejarah & Geografi',)]
        cursor.executemany("INSERT INTO kategori (nama) VALUES (?);", kats)

    # Tambah Rak Bawaan jika kosong
    cursor.execute("SELECT COUNT(*) FROM rak;")
    if cursor.fetchone()[0] == 0:
        raks = [('Rak A1 - Fiksi',), ('Rak A2 - Novel',), ('Rak B1 - Sains',), 
                ('Rak B2 - Matematika',), ('Rak C1 - Agama',), ('Rak C2 - Sosial',)]
        cursor.executemany("INSERT INTO rak (nama) VALUES (?);", raks)

    # Tambah Pengaturan Awal
    cursor.execute("SELECT COUNT(*) FROM pengaturan;")
    if cursor.fetchone()[0] == 0:
        configs = [
            ('nama_sekolah', 'SMA Negeri 1 Jaya Raya'),
            ('logo_sekolah', ''),
            ('alamat', 'Jl. Pendidikan No. 1, Jakarta Selatan, DKI Jakarta'),
            ('telepon', '(021) 7654321'),
            ('lama_pinjam', '7'),
            ('denda_per_hari', '2000'),
            ('tema', 'blue'),
            ('dark_mode', 'False')
        ]
        cursor.executemany("INSERT INTO pengaturan (key, value) VALUES (?, ?);", configs)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database SQLite terinisialisasi dengan sukses.")
