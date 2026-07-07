from database.db import get_connection
import datetime

class BookModel:
    @staticmethod
    def get_all(search_query="", category_id=None, rack_id=None):
        conn = get_connection()
        cursor = conn.cursor()
        
        query = """
        SELECT b.*, k.nama as nama_kategori, r.nama as nama_rak 
        FROM buku b
        LEFT JOIN kategori k ON b.kategori_id = k.id
        LEFT JOIN rak r ON b.rak_id = r.id
        WHERE 1=1
        """
        params = []
        if search_query:
            query += " AND (b.judul LIKE ? OR b.pengarang LIKE ? OR b.kode_buku LIKE ? OR b.isbn LIKE ?)"
            term = f"%{search_query}%"
            params.extend([term, term, term, term])
        if category_id:
            query += " AND b.kategori_id = ?"
            params.append(category_id)
        if rack_id:
            query += " AND b.rak_id = ?"
            params.append(rack_id)
            
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        return rows

    @staticmethod
    def add(kode_buku, isbn, barcode, judul, pengarang, penerbit, tahun, kategori_id, rak_id, jumlah_buku, cover_buku=""):
        conn = get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("""
            INSERT INTO buku (kode_buku, isbn, barcode, judul, pengarang, penerbit, tahun, kategori_id, rak_id, jumlah_buku, jumlah_tersedia, jumlah_dipinjam, cover_buku, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'Tersedia');
            """, (kode_buku, isbn, barcode, judul, pengarang, penerbit, tahun, kategori_id, rak_id, jumlah_buku, jumlah_buku, cover_buku))
            conn.commit()
            return True
        except Exception as e:
            print("DB Error:", e)
            return False
        finally:
            conn.close()

    @staticmethod
    def update(kode_buku, isbn, barcode, judul, pengarang, penerbit, tahun, kategori_id, rak_id, jumlah_buku, cover_buku=""):
        conn = get_connection()
        cursor = conn.cursor()
        try:
            # check current quantities
            cursor.execute("SELECT jumlah_dipinjam FROM buku WHERE kode_buku = ?;", (kode_buku,))
            row = cursor.fetchone()
            dipinjam = row['jumlah_dipinjam'] if row else 0
            tersedia = max(0, jumlah_buku - dipinjam)
            status = 'Tersedia' if tersedia > 0 else 'Habis'

            cursor.execute("""
            UPDATE buku 
            SET isbn = ?, barcode = ?, judul = ?, pengarang = ?, penerbit = ?, tahun = ?, kategori_id = ?, rak_id = ?, jumlah_buku = ?, jumlah_tersedia = ?, status = ?, cover_buku = ?
            WHERE kode_buku = ?;
            """, (isbn, barcode, judul, pengarang, penerbit, tahun, kategori_id, rak_id, jumlah_buku, tersedia, status, cover_buku, kode_buku))
            conn.commit()
            return True
        except Exception as e:
            print("DB Error:", e)
            return False
        finally:
            conn.close()

    @staticmethod
    def delete(kode_buku):
        conn = get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("DELETE FROM buku WHERE kode_buku = ?;", (kode_buku,))
            conn.commit()
            return True
        except Exception as e:
            print("DB Error:", e)
            return False
        finally:
            conn.close()


class MemberModel:
    @staticmethod
    def get_all(search_query=""):
        conn = get_connection()
        cursor = conn.cursor()
        query = "SELECT * FROM anggota WHERE 1=1"
        params = []
        if search_query:
            query += " AND (nama LIKE ? OR nis LIKE ? OR kelas LIKE ?)"
            term = f"%{search_query}%"
            params.extend([term, term, term])
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        return rows

    @staticmethod
    def get_by_barcode(barcode):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM anggota WHERE barcode_anggota = ? OR nis = ?;", (barcode, barcode))
        row = cursor.fetchone()
        conn.close()
        return row

    @staticmethod
    def add(nis, nama, kelas, jenis_kelamin, alamat, nomor_hp, foto, barcode_anggota):
        conn = get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("""
            INSERT INTO anggota (nis, nama, kelas, jenis_kelamin, alamat, nomor_hp, foto, barcode_anggota)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
            """, (nis, nama, kelas, jenis_kelamin, alamat, nomor_hp, foto, barcode_anggota))
            conn.commit()
            return True
        except Exception as e:
            print("DB Error:", e)
            return False
        finally:
            conn.close()

    @staticmethod
    def update(nis, nama, kelas, jenis_kelamin, alamat, nomor_hp, foto, barcode_anggota):
        conn = get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("""
            UPDATE anggota 
            SET nama = ?, kelas = ?, jenis_kelamin = ?, alamat = ?, nomor_hp = ?, foto = ?, barcode_anggota = ?
            WHERE nis = ?;
            """, (nama, kelas, jenis_kelamin, alamat, nomor_hp, foto, barcode_anggota, nis))
            conn.commit()
            return True
        except Exception as e:
            print("DB Error:", e)
            return False
        finally:
            conn.close()

    @staticmethod
    def delete(nis):
        conn = get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("DELETE FROM anggota WHERE nis = ?;", (nis,))
            conn.commit()
            return True
        except Exception as e:
            print("DB Error:", e)
            return False
        finally:
            conn.close()


class TransactionModel:
    @staticmethod
    def check_has_overdue(nis):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
        SELECT COUNT(*) FROM peminjaman 
        WHERE nis = ? AND status = 'Terlambat';
        """, (nis,))
        cnt = cursor.fetchone()[0]
        conn.close()
        return cnt > 0

    @staticmethod
    def borrow_books(nis, book_codes, duration_days):
        conn = get_connection()
        cursor = conn.cursor()
        try:
            today = datetime.date.today()
            due_date = today + datetime.timedelta(days=duration_days)

            # Insert master peminjaman
            cursor.execute("""
            INSERT INTO peminjaman (nis, tanggal_pinjam, tanggal_kembali, status)
            VALUES (?, ?, ?, 'Dipinjam');
            """, (nis, today.isoformat(), due_date.isoformat()))
            peminjaman_id = cursor.lastrowid

            # Insert detail & update stocks
            for code in book_codes:
                cursor.execute("""
                INSERT INTO detail_peminjaman (peminjaman_id, kode_buku, status, denda)
                VALUES (?, ?, 'Dipinjam', 0);
                """, (peminjaman_id, code))

                # Decrement stock
                cursor.execute("SELECT jumlah_tersedia, jumlah_dipinjam FROM buku WHERE kode_buku = ?;", (code,))
                b_row = cursor.fetchone()
                if b_row:
                    next_tersedia = max(0, b_row['jumlah_tersedia'] - 1)
                    next_dipinjam = b_row['jumlah_dipinjam'] + 1
                    status = 'Tersedia' if next_tersedia > 0 else 'Habis'
                    cursor.execute("""
                    UPDATE buku SET jumlah_tersedia = ?, jumlah_dipinjam = ?, status = ? WHERE kode_buku = ?;
                    """, (next_tersedia, next_dipinjam, status, code))
            
            conn.commit()
            return True
        except Exception as e:
            print("Borrow DB Error:", e)
            conn.rollback()
            return False
        finally:
            conn.close()

    @staticmethod
    def get_outstanding_loans(nis):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
        SELECT p.id as peminjaman_id, p.tanggal_pinjam, p.tanggal_kembali, d.kode_buku, b.judul 
        FROM peminjaman p
        JOIN detail_peminjaman d ON p.id = d.peminjaman_id
        JOIN buku b ON d.kode_buku = b.kode_buku
        WHERE p.nis = ? AND d.status = 'Dipinjam';
        """, (nis,))
        rows = cursor.fetchall()
        conn.close()
        return rows

    @staticmethod
    def process_return(peminjaman_id, kode_buku, denda_per_hari):
        conn = get_connection()
        cursor = conn.cursor()
        try:
            today = datetime.date.today()
            
            # Get due date
            cursor.execute("SELECT tanggal_kembali FROM peminjaman WHERE id = ?;", (peminjaman_id,))
            due_row = cursor.fetchone()
            if not due_row:
                return False
                
            due_date = datetime.date.fromisoformat(due_row['tanggal_kembali'])
            late_days = 0
            fine = 0.0

            if today > due_date:
                late_days = (today - due_date).days
                fine = float(late_days * denda_per_hari)

            # Update detail peminjaman
            cursor.execute("""
            UPDATE detail_peminjaman 
            SET status = 'Dikembalikan', tanggal_kembali_aktual = ?, denda = ?
            WHERE peminjaman_id = ? AND kode_buku = ?;
            """, (today.isoformat(), fine, peminjaman_id, kode_buku))

            # Record Return History
            cursor.execute("""
            INSERT INTO pengembalian (peminjaman_id, kode_buku, tanggal_kembali_aktual, hari_keterlambatan, denda)
            VALUES (?, ?, ?, ?, ?);
            """, (peminjaman_id, kode_buku, today.isoformat(), late_days, fine))

            # Restock book
            cursor.execute("SELECT jumlah_tersedia, jumlah_dipinjam FROM buku WHERE kode_buku = ?;", (kode_buku,))
            b_row = cursor.fetchone()
            if b_row:
                next_tersedia = b_row['jumlah_tersedia'] + 1
                next_dipinjam = max(0, b_row['jumlah_dipinjam'] - 1)
                status = 'Tersedia' if next_tersedia > 0 else 'Habis'
                cursor.execute("""
                UPDATE buku SET jumlah_tersedia = ?, jumlah_dipinjam = ?, status = ? WHERE kode_buku = ?;
                """, (next_tersedia, next_dipinjam, status, kode_buku))

            # Check if all books in this borrow are now returned
            cursor.execute("SELECT COUNT(*) FROM detail_peminjaman WHERE peminjaman_id = ? AND status = 'Dipinjam';", (peminjaman_id,))
            still_borrowed = cursor.fetchone()[0]
            if still_borrowed == 0:
                cursor.execute("UPDATE peminjaman SET status = 'Selesai' WHERE id = ?;", (peminjaman_id,))

            conn.commit()
            return True, fine
        except Exception as e:
            print("Return DB Error:", e)
            conn.rollback()
            return False, 0
        finally:
            conn.close()
