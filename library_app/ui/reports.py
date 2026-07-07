import customtkinter as ctk
from database.db import get_connection
import openpyxl
from tkinter import filedialog, messagebox
import datetime
import os
from PIL import Image, ImageDraw, ImageFont

try:
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, KeepTogether
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False
    print("Reportlab tidak ditemukan. Ekspor PDF berjalan dalam mode pencetakan teks sederhana.")

INDONESIAN_MONTHS = {
    1: "Januari", 2: "Februari", 3: "Maret", 4: "April", 5: "Mei", 6: "Juni",
    7: "Juli", 8: "Agustus", 9: "September", 10: "Oktober", 11: "November", 12: "Desember"
}

def format_date_indo(date_str):
    if not date_str or date_str == "-":
        return "-"
    try:
        dt = datetime.date.fromisoformat(date_str)
        return f"{dt.day:02d} {INDONESIAN_MONTHS[dt.month]} {dt.year}"
    except:
        return date_str

def generate_monthly_chart(data_points, filepath):
    """Menggambar grafik peminjaman bulanan menggunakan PIL dan menyimpannya sebagai JPG."""
    width, height = 800, 320
    img = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(img)
    
    # Grid margins
    margin_left = 60
    margin_right = 40
    margin_top = 40
    margin_bottom = 50
    
    plot_width = width - margin_left - margin_right
    plot_height = height - margin_top - margin_bottom
    
    # Draw title
    try:
        font = ImageFont.load_default()
    except:
        font = None
        
    draw.text((width // 2 - 120, 10), "GRAFIK TREN PEMINJAMAN BULANAN", fill="#1e293b", font=font)
    
    # Draw axes
    draw.line([margin_left, margin_top, margin_left, height - margin_bottom], fill="#94a3b8", width=2) # Y axis
    draw.line([margin_left, height - margin_bottom, width - margin_right, height - margin_bottom], fill="#94a3b8", width=2) # X axis
    
    if not data_points:
        draw.text((width // 2 - 100, height // 2), "Tidak ada data transaksi peminjaman", fill="#94a3b8", font=font)
        img.save(filepath, "JPEG")
        return filepath
        
    # Find max transaction value
    max_val = max(item[1] for item in data_points)
    if max_val <= 0:
        max_val = 10
        
    # Draw horizontal grid lines & labels
    num_ticks = 4
    for i in range(num_ticks + 1):
        val = int(max_val * i / num_ticks)
        y = height - margin_bottom - int(plot_height * i / num_ticks)
        draw.line([margin_left, y, width - margin_right, y], fill="#e2e8f0", width=1)
        draw.text((margin_left - 40, y - 6), f"{val:3d}", fill="#64748b", font=font)
        
    # Draw bars
    num_bars = len(data_points)
    bar_width = int(plot_width / max(1, num_bars)) - 12
    bar_width = max(10, min(bar_width, 50))
    
    for idx, (month, total) in enumerate(data_points):
        # Calculate bar placement
        x = margin_left + idx * (plot_width / num_bars) + (plot_width / num_bars - bar_width) / 2
        y_top = height - margin_bottom - int(plot_height * total / max_val)
        y_bottom = height - margin_bottom
        
        # Draw bar rectangle
        draw.rectangle([x, y_top, x + bar_width, y_bottom], fill="#3b82f6") # blue bar
        
        # Draw total label on top of bar
        draw.text((x + bar_width // 2 - 8, y_top - 14), str(total), fill="#1e3a8a", font=font)
        
        # Draw month label below X axis
        try:
            parts = month.split("-")
            month_name = INDONESIAN_MONTHS[int(parts[1])][:3] + " " + parts[0][2:]
        except:
            month_name = month
        draw.text((x + bar_width // 2 - 15, y_bottom + 8), month_name, fill="#475569", font=font)
        
    img.save(filepath, "JPEG")
    return filepath

class ReportsFrame(ctk.CTkFrame):
    def __init__(self, parent, controller):
        super().__init__(parent)
        self.controller = controller

        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(2, weight=1)

        # Header Title
        self.header = ctk.CTkLabel(self, text="LAPORAN DATA DAN TRANSAKSI PERPUSTAKAAN", font=ctk.CTkFont(size=20, weight="bold"))
        self.header.grid(row=0, column=0, padx=20, pady=15, sticky="w")

        # 1. Filters Panel
        self.filter_panel = ctk.CTkFrame(self, border_width=1, border_color="#e2e8f0")
        self.filter_panel.grid(row=1, column=0, padx=20, pady=5, sticky="ew")

        # Label Report Type
        ctk.CTkLabel(self.filter_panel, text="Kategori:").pack(side="left", padx=(10, 2), pady=10)
        self.cmb_type = ctk.CTkComboBox(self.filter_panel, values=["Peminjaman", "Pengembalian", "Data Buku", "Data Anggota", "Buku Terlambat"], command=lambda e: self.on_type_changed(), width=130)
        self.cmb_type.pack(side="left", padx=5, pady=10)
        self.cmb_type.set("Peminjaman")

        # Filter Frekuensi Laporan
        ctk.CTkLabel(self.filter_panel, text="Periode:").pack(side="left", padx=(10, 2), pady=10)
        self.cmb_freq = ctk.CTkComboBox(self.filter_panel, values=["Kustom Tanggal", "Laporan Harian", "Laporan Mingguan", "Laporan Bulanan", "Laporan Tahunan"], command=self.on_freq_changed, width=150)
        self.cmb_freq.pack(side="left", padx=5, pady=10)
        self.cmb_freq.set("Laporan Tahunan")

        # Date controls
        self.lbl_start = ctk.CTkLabel(self.filter_panel, text="Mulai:")
        self.lbl_start.pack(side="left", padx=5, pady=10)
        self.ent_start = ctk.CTkEntry(self.filter_panel, placeholder_text="YYYY-MM-DD", width=100)
        self.ent_start.pack(side="left", padx=5, pady=10)
        
        self.lbl_end = ctk.CTkLabel(self.filter_panel, text="Sampai:")
        self.lbl_end.pack(side="left", padx=5, pady=10)
        self.ent_end = ctk.CTkEntry(self.filter_panel, placeholder_text="YYYY-MM-DD", width=100)
        self.ent_end.pack(side="left", padx=5, pady=10)

        # Action exports
        self.btn_export_xls = ctk.CTkButton(self.filter_panel, text="Export Excel", fg_color="#059669", hover_color="#047857", command=self.export_excel, width=100)
        self.btn_export_xls.pack(side="right", padx=5, pady=10)

        self.btn_export_pdf = ctk.CTkButton(self.filter_panel, text="⬇ Download PDF", fg_color="#dc2626", hover_color="#991b1b", command=self.export_pdf, width=130)
        self.btn_export_pdf.pack(side="right", padx=5, pady=10)

        # 2. Preview Grid Panel
        self.preview_frame = ctk.CTkFrame(self)
        self.preview_frame.grid(row=2, column=0, padx=20, pady=10, sticky="nsew")
        self.preview_frame.grid_columnconfigure(0, weight=1)
        self.preview_frame.grid_rowconfigure(0, weight=1)

        self.preview_txt = ctk.CTkTextbox(self.preview_frame, font=ctk.CTkFont(family="monospace", size=11))
        self.preview_txt.grid(row=0, column=0, padx=15, pady=15, sticky="nsew")

        # Initial dates population based on Tahunan
        self.on_freq_changed()

    def on_freq_changed(self, choice=None):
        freq = self.cmb_freq.get()
        today = datetime.date.today()
        
        if freq == "Laporan Harian":
            start_date = today
            end_date = today
        elif freq == "Laporan Mingguan":
            start_date = today - datetime.timedelta(days=today.weekday())
            end_date = start_date + datetime.timedelta(days=6)
        elif freq == "Laporan Bulanan":
            start_date = today.replace(day=1)
            # Find last day of current month
            next_month = today.replace(day=28) + datetime.timedelta(days=4)
            end_date = next_month - datetime.timedelta(days=next_month.day)
        elif freq == "Laporan Tahunan":
            start_date = today.replace(month=1, day=1)
            end_date = today.replace(month=12, day=31)
        else:
            return # kustom, let user edit

        self.ent_start.configure(state="normal")
        self.ent_end.configure(state="normal")
        
        self.ent_start.delete(0, "end")
        self.ent_start.insert(0, start_date.isoformat())
        self.ent_end.delete(0, "end")
        self.ent_end.insert(0, end_date.isoformat())
        
        self.load_preview()

    def on_type_changed(self):
        rep = self.cmb_type.get()
        # Toggle date filters visibility depending on type
        if rep in ["Data Buku", "Data Anggota"]:
            self.ent_start.configure(state="disabled")
            self.ent_end.configure(state="disabled")
            self.cmb_freq.configure(state="disabled")
        else:
            self.ent_start.configure(state="normal")
            self.ent_end.configure(state="normal")
            self.cmb_freq.configure(state="normal")
            
        self.load_preview()

    def compile_report_data(self):
        """Mengambil dan menstrukturkan data laporan untuk ditabulasikan."""
        rep_type = self.cmb_type.get()
        start = self.ent_start.get().strip()
        end = self.ent_end.get().strip()

        conn = get_connection()
        cursor = conn.cursor()

        headers = []
        rows = []

        if rep_type == "Peminjaman":
            headers = ["No", "Tanggal Pinjam", "Tanggal Kembali", "Nama Anggota", "NIS", "Kelas", "Kode Buku", "Judul Buku", "Pengarang", "Kategori", "Status", "Keterangan"]
            cursor.execute("""
            SELECT 
                p.tanggal_pinjam,
                COALESCE(dp.tanggal_kembali_aktual, p.tanggal_kembali) as tgl_kembali,
                a.nama as nama_anggota,
                a.nis,
                a.kelas,
                dp.kode_buku,
                b.judul as judul_buku,
                b.pengarang,
                k.nama as nama_kategori,
                dp.status,
                dp.denda,
                p.tanggal_kembali as tgl_tempo
            FROM peminjaman p
            JOIN detail_peminjaman dp ON p.id = dp.peminjaman_id
            JOIN anggota a ON p.nis = a.nis
            JOIN buku b ON dp.kode_buku = b.kode_buku
            LEFT JOIN kategori k ON b.kategori_id = k.id
            WHERE p.tanggal_pinjam BETWEEN ? AND ?
            ORDER BY p.tanggal_pinjam ASC, p.id ASC;
            """, (start, end))
            
            db_rows = cursor.fetchall()
            for idx, r in enumerate(db_rows, start=1):
                status_str = r['status']
                tgl_tempo = datetime.date.fromisoformat(r['tgl_tempo'])
                today = datetime.date.today()
                
                # Check real overdue status
                if status_str == 'Dipinjam' and today > tgl_tempo:
                    status_str = 'Terlambat'
                
                # Format Keterangan
                keterangan = "-"
                if r['denda'] and r['denda'] > 0:
                    keterangan = f"Denda: Rp {int(r['denda']):,}"
                elif status_str == 'Terlambat':
                    days = (today - tgl_tempo).days
                    keterangan = f"Terlambat {days} hari"
                
                rows.append([
                    idx,
                    format_date_indo(r['tanggal_pinjam']),
                    format_date_indo(r['tgl_kembali']) if r['status'] == 'Dikembalikan' else "Belum Kembali",
                    r['nama_anggota'],
                    r['nis'],
                    r['kelas'],
                    r['kode_buku'],
                    r['judul_buku'],
                    r['pengarang'],
                    r['nama_kategori'] or "-",
                    status_str,
                    keterangan
                ])

        elif rep_type == "Pengembalian":
            headers = ["No", "Tanggal Pinjam", "Tanggal Kembali", "Nama Anggota", "NIS", "Kelas", "Kode Buku", "Judul Buku", "Kategori", "Keterlambatan", "Denda"]
            cursor.execute("""
            SELECT 
                p.tanggal_pinjam,
                ret.tanggal_kembali_aktual,
                a.nama as nama_anggota,
                a.nis,
                a.kelas,
                ret.kode_buku,
                b.judul as judul_buku,
                k.nama as nama_kategori,
                ret.hari_keterlambatan,
                ret.denda
            FROM pengembalian ret
            JOIN peminjaman p ON ret.peminjaman_id = p.id
            JOIN anggota a ON p.nis = a.nis
            JOIN buku b ON ret.kode_buku = b.kode_buku
            LEFT JOIN kategori k ON b.kategori_id = k.id
            WHERE ret.tanggal_kembali_aktual BETWEEN ? AND ?
            ORDER BY ret.tanggal_kembali_aktual ASC;
            """, (start, end))
            
            db_rows = cursor.fetchall()
            for idx, r in enumerate(db_rows, start=1):
                rows.append([
                    idx,
                    format_date_indo(r['tanggal_pinjam']),
                    format_date_indo(r['tanggal_kembali_aktual']),
                    r['nama_anggota'],
                    r['nis'],
                    r['kelas'],
                    r['kode_buku'],
                    r['judul_buku'],
                    r['nama_kategori'] or "-",
                    f"{r['hari_keterlambatan']} Hari",
                    f"Rp {int(r['denda']):,}" if r['denda'] > 0 else "-"
                ])

        elif rep_type == "Data Buku":
            headers = ["No", "Kode Buku", "ISBN", "Judul Buku", "Pengarang", "Penerbit", "Tahun", "Kategori", "Rak", "Total Stok", "Tersedia"]
            cursor.execute("""
            SELECT b.kode_buku, b.isbn, b.judul, b.pengarang, b.penerbit, b.tahun, k.nama as nama_kategori, r.nama as nama_rak, b.jumlah_buku, b.jumlah_tersedia
            FROM buku b
            LEFT JOIN kategori k ON b.kategori_id = k.id
            LEFT JOIN rak r ON b.rak_id = r.id
            ORDER BY b.kode_buku ASC;
            """)
            db_rows = cursor.fetchall()
            for idx, r in enumerate(db_rows, start=1):
                rows.append([
                    idx,
                    r['kode_buku'],
                    r['isbn'],
                    r['judul'],
                    r['pengarang'],
                    r['penerbit'],
                    r['tahun'],
                    r['nama_kategori'] or "-",
                    r['nama_rak'] or "-",
                    r['jumlah_buku'],
                    r['jumlah_tersedia']
                ])

        elif rep_type == "Data Anggota":
            headers = ["No", "NIS", "Nama Anggota", "Kelas", "Gender", "No HP", "Alamat", "Barcode ID"]
            cursor.execute("SELECT nis, nama, kelas, jenis_kelamin, nomor_hp, alamat, barcode_anggota FROM anggota ORDER BY nis ASC;")
            db_rows = cursor.fetchall()
            for idx, r in enumerate(db_rows, start=1):
                rows.append([
                    idx,
                    r['nis'],
                    r['nama'],
                    r['kelas'],
                    r['jenis_kelamin'],
                    r['nomor_hp'] or "-",
                    r['alamat'] or "-",
                    r['barcode_anggota']
                ])

        elif rep_type == "Buku Terlambat":
            headers = ["No", "Tanggal Pinjam", "Tanggal Tempo", "Nama Anggota", "NIS", "Kelas", "Kode Buku", "Judul Buku", "Terlambat"]
            cursor.execute("""
            SELECT p.id, p.tanggal_pinjam, p.tanggal_kembali, a.nama as nama_anggota, a.nis, a.kelas, dp.kode_buku, b.judul as judul_buku
            FROM peminjaman p
            JOIN detail_peminjaman dp ON p.id = dp.peminjaman_id
            JOIN anggota a ON p.nis = a.nis
            JOIN buku b ON dp.kode_buku = b.kode_buku
            WHERE dp.status = 'Dipinjam' AND p.tanggal_kembali < date('now')
            ORDER BY p.tanggal_kembali ASC;
            """)
            db_rows = cursor.fetchall()
            today = datetime.date.today()
            for idx, r in enumerate(db_rows, start=1):
                tgl_tempo = datetime.date.fromisoformat(r['tanggal_kembali'])
                late_days = (today - tgl_tempo).days
                rows.append([
                    idx,
                    format_date_indo(r['tanggal_pinjam']),
                    format_date_indo(r['tanggal_kembali']),
                    r['nama_anggota'],
                    r['nis'],
                    r['kelas'],
                    r['kode_buku'],
                    r['judul_buku'],
                    f"{late_days} Hari"
                ])

        conn.close()
        return headers, rows

    def load_preview(self):
        self.preview_txt.configure(state="normal")
        self.preview_txt.delete("1.0", "end")

        headers, rows = self.compile_report_data()
        
        # Draw text-table preview
        if len(rows) == 0:
            self.preview_txt.insert("end", "Tidak ada data laporan yang ditemukan untuk parameter dan periode saat ini.")
            self.preview_txt.configure(state="disabled")
            return

        # Estimate column widths
        col_widths = [len(h) for h in headers]
        for r in rows:
            for idx, val in enumerate(r):
                col_widths[idx] = max(col_widths[idx], len(str(val)))

        # Format row
        header_line = " | ".join(f"{headers[i]:<{col_widths[i]}}" for i in range(len(headers)))
        self.preview_txt.insert("end", header_line + "\n")
        self.preview_txt.insert("end", "-" * len(header_line) + "\n")

        for r in rows:
            line = " | ".join(f"{str(r[i]):<{col_widths[i]}}" for i in range(len(r)))
            self.preview_txt.insert("end", line + "\n")

        self.preview_txt.configure(state="disabled")

    def export_excel(self):
        filepath = filedialog.asksaveasfilename(defaultextension=".xlsx", filetypes=[("Excel Files", "*.xlsx")])
        if not filepath:
            return

        headers, rows = self.compile_report_data()
        
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = self.cmb_type.get()
        ws.append(headers)

        for r in rows:
            ws.append(r)

        wb.save(filepath)
        messagebox.showinfo("Sukses", f"Laporan Excel berhasil diekspor ke {filepath}")

    def fetch_summary_metrics(self, start_date, end_date):
        """Mengambil seluruh data ringkasan kumulatif dari database untuk halaman terakhir PDF."""
        conn = get_connection()
        cursor = conn.cursor()
        
        # 1. Total Transaksi (Detail Pinjam)
        cursor.execute("""
            SELECT COUNT(dp.id) FROM detail_peminjaman dp 
            JOIN peminjaman p ON dp.peminjaman_id = p.id
            WHERE p.tanggal_pinjam BETWEEN ? AND ?;
        """, (start_date, end_date))
        total_tx = cursor.fetchone()[0] or 0
        
        # 2. Jumlah Buku Dipinjam (Outstanding)
        cursor.execute("""
            SELECT COUNT(dp.id) FROM detail_peminjaman dp 
            JOIN peminjaman p ON dp.peminjaman_id = p.id
            WHERE dp.status = 'Dipinjam' AND p.tanggal_pinjam BETWEEN ? AND ?;
        """, (start_date, end_date))
        total_dipinjam = cursor.fetchone()[0] or 0
        
        # 3. Jumlah Buku Dikembalikan
        cursor.execute("""
            SELECT COUNT(dp.id) FROM detail_peminjaman dp 
            JOIN peminjaman p ON dp.peminjaman_id = p.id
            WHERE dp.status = 'Dikembalikan' AND p.tanggal_pinjam BETWEEN ? AND ?;
        """, (start_date, end_date))
        total_dikembalikan = cursor.fetchone()[0] or 0
        
        # 4. Jumlah Buku Terlambat (Outstanding & past tempo)
        cursor.execute("""
            SELECT COUNT(dp.id) FROM detail_peminjaman dp 
            JOIN peminjaman p ON dp.peminjaman_id = p.id
            WHERE dp.status = 'Dipinjam' AND p.tanggal_kembali < date('now') AND p.tanggal_pinjam BETWEEN ? AND ?;
        """, (start_date, end_date))
        total_terlambat = cursor.fetchone()[0] or 0
        
        # 5. Jumlah Denda
        cursor.execute("""
            SELECT SUM(dp.denda) FROM detail_peminjaman dp 
            JOIN peminjaman p ON dp.peminjaman_id = p.id
            WHERE p.tanggal_pinjam BETWEEN ? AND ?;
        """, (start_date, end_date))
        total_denda = cursor.fetchone()[0] or 0.0
        
        # 6. Anggota Aktif
        cursor.execute("""
            SELECT COUNT(DISTINCT nis) FROM peminjaman 
            WHERE tanggal_pinjam BETWEEN ? AND ?;
        """, (start_date, end_date))
        anggota_aktif = cursor.fetchone()[0] or 0

        # 7. 10 Buku Terpopuler
        cursor.execute("""
            SELECT b.judul, COUNT(dp.id) as total FROM detail_peminjaman dp 
            JOIN buku b ON dp.kode_buku = b.kode_buku 
            JOIN peminjaman p ON dp.peminjaman_id = p.id 
            WHERE p.tanggal_pinjam BETWEEN ? AND ? 
            GROUP BY b.kode_buku 
            ORDER BY total DESC LIMIT 10;
        """, (start_date, end_date))
        populer_buku = cursor.fetchall()

        # 8. 10 Anggota Teraktif
        cursor.execute("""
            SELECT a.nama, COUNT(p.id) as total FROM peminjaman p 
            JOIN anggota a ON p.nis = a.nis 
            WHERE p.tanggal_pinjam BETWEEN ? AND ? 
            GROUP BY p.nis 
            ORDER BY total DESC LIMIT 10;
        """, (start_date, end_date))
        teraktif_anggota = cursor.fetchall()

        # 9. Monthly borrowing counts for Chart
        cursor.execute("""
            SELECT strftime('%Y-%m', p.tanggal_pinjam) as bulan, COUNT(dp.id) as total 
            FROM detail_peminjaman dp 
            JOIN peminjaman p ON dp.peminjaman_id = p.id 
            WHERE p.tanggal_pinjam BETWEEN ? AND ? 
            GROUP BY bulan 
            ORDER BY bulan ASC;
        """, (start_date, end_date))
        monthly_trend = cursor.fetchall()
        
        conn.close()
        
        return {
            "total_tx": total_tx,
            "total_dipinjam": total_dipinjam,
            "total_dikembalikan": total_dikembalikan,
            "total_terlambat": total_terlambat,
            "total_denda": total_denda,
            "anggota_aktif": anggota_aktif,
            "populer_buku": populer_buku,
            "teraktif_anggota": teraktif_anggota,
            "monthly_trend": monthly_trend
        }

    def get_school_settings(self):
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT key, value FROM pengaturan;")
            rows = cursor.fetchall()
            conn.close()
            return {r['key']: r['value'] for r in rows}
        except:
            return {}

    def export_pdf(self):
        """Menghasilkan file PDF profesional dengan logo sekolah, header formal, detail transaksi,
        dan halaman ringkasan komprehensif berisi grafik trend, buku terpopuler, dan anggota teraktif.
        """
        start = self.ent_start.get().strip()
        end = self.ent_end.get().strip()
        rep_type = self.cmb_type.get()
        
        # 1. Determine automatic file name & ensure reports/ folder exists
        os.makedirs("reports", exist_ok=True)
        
        # Filename based on date selection
        filename = f"Laporan_01-01-2026_sd_31-12-2026.pdf"
        try:
            dt_start = datetime.date.fromisoformat(start)
            dt_end = datetime.date.fromisoformat(end)
            
            # Format dates
            start_fmt = dt_start.strftime("%d-%m-%Y")
            end_fmt = dt_end.strftime("%d-%m-%Y")
            
            if dt_start.month == 1 and dt_start.day == 1 and dt_end.month == 12 and dt_end.day == 31:
                filename = f"Laporan_Peminjaman_{dt_start.year}.pdf"
            elif dt_start.month == dt_end.month and dt_start.year == dt_end.year and dt_start.day == 1:
                # find end of month
                next_m = dt_start.replace(day=28) + datetime.timedelta(days=4)
                last_d = next_m - datetime.timedelta(days=next_m.day)
                if dt_end.day == last_d.day:
                    month_name = INDONESIAN_MONTHS[dt_start.month]
                    filename = f"Laporan_{month_name}_{dt_start.year}.pdf"
                else:
                    filename = f"Laporan_{start_fmt}_sd_{end_fmt}.pdf"
            else:
                filename = f"Laporan_{start_fmt}_sd_{end_fmt}.pdf"
        except Exception as e:
            print("Error parsing dates for filename:", e)
            filename = f"Laporan_Peminjaman_Kustom.pdf"

        filepath = os.path.join("reports", filename)

        headers, rows = self.compile_report_data()

        if len(rows) == 0:
            messagebox.showwarning("Peringatan", "Tidak ada data transaksi untuk dicetak pada periode ini.")
            return

        if not REPORTLAB_AVAILABLE:
            # Fallback simple text printer
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(f"LAPORAN {rep_type.upper()} PERPUSTAKAAN\n")
                f.write("="*60 + "\n")
                f.write(" | ".join(headers) + "\n")
                for r in rows:
                    f.write(" | ".join(str(val) for val in r) + "\n")
            messagebox.showinfo("Sukses (Teks)", f"Laporan berhasil disimpan ke {filepath} (ReportLab tidak terpasang).")
            return

        try:
            # Setup Doc - landscape orientation A4 for wide table columns layout
            doc = SimpleDocTemplate(
                filepath, 
                pagesize=landscape(A4), 
                rightMargin=30, 
                leftMargin=30, 
                topMargin=30, 
                bottomMargin=30
            )
            
            styles = getSampleStyleSheet()
            
            # Custom Paragraph styles for table cell wrap
            style_cell = ParagraphStyle(
                'Cell',
                parent=styles['Normal'],
                fontName='Helvetica',
                fontSize=8,
                leading=10,
                textColor=colors.HexColor('#1e293b')
            )
            style_cell_bold = ParagraphStyle(
                'CellBold',
                parent=style_cell,
                fontName='Helvetica-Bold'
            )
            style_header_cell = ParagraphStyle(
                'HeaderCell',
                parent=styles['Normal'],
                fontName='Helvetica-Bold',
                fontSize=8,
                leading=10,
                textColor=colors.whitesmoke
            )
            style_school = ParagraphStyle(
                'SchoolTitle',
                parent=styles['Normal'],
                fontName='Helvetica-Bold',
                fontSize=18,
                leading=22,
                textColor=colors.HexColor('#1e3a8a')
            )
            style_perpus = ParagraphStyle(
                'PerpusTitle',
                parent=styles['Normal'],
                fontName='Helvetica-Bold',
                fontSize=14,
                leading=16,
                textColor=colors.HexColor('#d97706') # Amber gold
            )
            style_alamat = ParagraphStyle(
                'AlamatSub',
                parent=styles['Normal'],
                fontName='Helvetica',
                fontSize=9,
                leading=11,
                textColor=colors.HexColor('#475569')
            )
            
            story = []
            
            # --- 1. CORPORATE SCHOOL BRANDING HEADER ---
            settings = self.get_school_settings()
            nama_sekolah = settings.get('nama_sekolah', 'SMA Negeri 1 Jaya Raya').upper()
            nama_perpus = "PERPUSTAKAAN WIDYA PUSTAKA"
            alamat = settings.get('alamat', 'Jl. Pendidikan No. 1, Jakarta Selatan, DKI Jakarta')
            telp = settings.get('telepon', '(021) 7654321')
            
            # Left Logo and Right Text setup using a borderless table
            logo_element = ""
            logo_path = settings.get('logo_sekolah', '')
            
            header_text_cells = [
                Paragraph(nama_sekolah, style_school),
                Paragraph(nama_perpus, style_perpus),
                Paragraph(f"{alamat}  |  Tlp: {telp}", style_alamat)
            ]
            
            # Render logo if present
            logo_ok = False
            if logo_path and os.path.exists(logo_path):
                try:
                    rl_logo = RLImage(logo_path, width=60, height=60)
                    logo_ok = True
                except:
                    pass
            
            if logo_ok:
                header_data = [[rl_logo, header_text_cells]]
                header_table = Table(header_data, colWidths=[70, 712])
            else:
                # Draw a simple decorative green circular emblem cell
                header_data = [["", header_text_cells]]
                header_table = Table(header_data, colWidths=[10, 772])
                
            header_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ]))
            story.append(header_table)
            
            # Decorative horizontal solid rule
            story.append(Spacer(1, 2))
            rule_table = Table([[""]], colWidths=[782])
            rule_table.setStyle(TableStyle([
                ('LINEABOVE', (0, 0), (-1, -1), 2, colors.HexColor('#1e3a8a')),
                ('LINEBELOW', (0, 0), (-1, -1), 1, colors.HexColor('#d97706')),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
            ]))
            story.append(rule_table)
            story.append(Spacer(1, 15))
            
            # --- 2. REPORT TITLE & METADATA BLOCK ---
            judul_laporan = f"LAPORAN REKAPITULASI TRANSAKSI {rep_type.upper()}"
            period_str = f"Periode Laporan: {format_date_indo(start)} s.d. {format_date_indo(end)}"
            cetak_str = f"Tanggal Cetak: {format_date_indo(datetime.date.today().isoformat())}"
            petugas_str = f"Nama Petugas: {self.controller.active_user['nama']}"
            
            meta_style_left = ParagraphStyle('MetaL', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10, leading=14, textColor=colors.HexColor('#0f172a'))
            meta_style_right = ParagraphStyle('MetaR', parent=styles['Normal'], fontName='Helvetica', fontSize=9, leading=14, textColor=colors.HexColor('#475569'), alignment=2) # align right
            
            meta_data = [
                [Paragraph(judul_laporan, meta_style_left), Paragraph(cetak_str, meta_style_right)],
                [Paragraph(period_str, ParagraphStyle('MetaP', parent=meta_style_left, fontSize=9, fontName='Helvetica')), Paragraph(petugas_str, meta_style_right)]
            ]
            meta_table = Table(meta_data, colWidths=[391, 391])
            meta_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 15),
            ]))
            story.append(meta_table)
            
            # --- 3. TRANSACTION DATA TABLE ---
            # Columns widths and layout fitting within 782pt printable space
            col_widths_map = {
                "Peminjaman": [25, 60, 60, 80, 45, 40, 40, 110, 80, 75, 55, 112],
                "Pengembalian": [25, 70, 70, 90, 50, 45, 45, 120, 85, 72, 110],
                "Data Buku": [25, 55, 80, 150, 95, 95, 40, 80, 70, 47, 45],
                "Data Anggota": [25, 60, 150, 60, 80, 80, 200, 127],
                "Buku Terlambat": [30, 80, 80, 120, 60, 55, 55, 202, 100]
            }
            
            col_widths = col_widths_map.get(rep_type, [782 / len(headers)] * len(headers))
            
            table_data = []
            # Header Row
            header_row = [Paragraph(h, style_header_cell) for h in headers]
            table_data.append(header_row)
            
            # Values Row
            for r in rows:
                row_cells = []
                for idx, val in enumerate(r):
                    is_num = (idx == 0 or isinstance(val, int))
                    row_cells.append(Paragraph(str(val), style_cell_bold if is_num else style_cell))
                table_data.append(row_cells)
                
            pdf_table = Table(table_data, colWidths=col_widths, repeatRows=1)
            pdf_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a8a')),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('LEFTPADDING', (0, 0), (-1, -1), 4),
                ('RIGHTPADDING', (0, 0), (-1, -1), 4),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')])
            ]))
            story.append(pdf_table)
            
            # --- 4. SUMMARY LAST PAGE (Halaman Terakhir Ringkasan Otomatis) ---
            # Forced Page Break to start summary neatly on its own single page!
            from reportlab.platypus import PageBreak
            story.append(PageBreak())
            
            # Header of Summary Page
            summary_title = ParagraphStyle('SumTitle', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=14, leading=18, textColor=colors.HexColor('#1e3a8a'))
            story.append(Paragraph("RINGKASAN AKUMULATIF DATA PERPUSTAKAAN", summary_title))
            story.append(Spacer(1, 2))
            
            # Small Rule
            sum_rule = Table([[""]], colWidths=[200])
            sum_rule.setStyle(TableStyle([
                ('LINEBELOW', (0, 0), (-1, -1), 2, colors.HexColor('#d97706')),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
            ]))
            story.append(sum_rule)
            story.append(Spacer(1, 15))
            
            # Fetch summary stats from database
            stats = self.fetch_summary_metrics(start, end)
            
            # Create cumulative metrics table (2-rows, 3-columns cards layout)
            stat_label_style = ParagraphStyle('StatL', parent=styles['Normal'], fontName='Helvetica', fontSize=8, leading=10, textColor=colors.HexColor('#475569'))
            stat_val_style = ParagraphStyle('StatV', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=14, leading=18, textColor=colors.HexColor('#0f172a'))
            
            metrics_data = [
                [
                    [Paragraph("Jumlah Transaksi", stat_label_style), Paragraph(str(stats['total_tx']), stat_val_style)],
                    [Paragraph("Buku Sedang Dipinjam", stat_label_style), Paragraph(str(stats['total_dipinjam']), stat_val_style)],
                    [Paragraph("Buku Telah Kembali", stat_label_style), Paragraph(str(stats['total_dikembalikan']), stat_val_style)]
                ],
                [
                    [Paragraph("Buku Mengalami Terlambat", stat_label_style), Paragraph(str(stats['total_terlambat']), stat_val_style)],
                    [Paragraph("Akumulasi Total Denda", stat_label_style), Paragraph(f"Rp {int(stats['total_denda']):,}", stat_val_style)],
                    [Paragraph("Jumlah Anggota Aktif", stat_label_style), Paragraph(str(stats['anggota_aktif']), stat_val_style)]
                ]
            ]
            
            metrics_table = Table(metrics_data, colWidths=[260, 260, 262])
            metrics_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f1f5f9')),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
                ('LEFTPADDING', (0, 0), (-1, -1), 15),
                ('GRID', (0, 0), (-1, -1), 1, colors.white), # white borders to split grid
            ]))
            story.append(metrics_table)
            story.append(Spacer(1, 20))
            
            # Compile trend monthly chart and save as tmp file
            chart_file = "reports/temp_chart.jpg"
            generate_monthly_chart(stats['monthly_trend'], chart_file)
            
            # Build two side-by-side tables for Top 10 Books & Top 10 Active Members
            # Top Books Table
            top_books_cells = [[Paragraph("<b>Rank</b>", style_header_cell), Paragraph("<b>10 Buku Terpopuler</b>", style_header_cell), Paragraph("<b>Pinjam</b>", style_header_cell)]]
            for idx, r in enumerate(stats['populer_buku'], start=1):
                top_books_cells.append([
                    Paragraph(str(idx), style_cell_bold),
                    Paragraph(r['judul'][:35], style_cell),
                    Paragraph(f"{r['total']}x", style_cell_bold)
                ])
            # fill empty rows to make height matches
            while len(top_books_cells) <= 10:
                top_books_cells.append([Paragraph("-", style_cell), Paragraph("-", style_cell), Paragraph("-", style_cell)])
                
            top_books_table = Table(top_books_cells, colWidths=[30, 210, 40])
            top_books_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')])
            ]))
            
            # Top Members Table
            top_memb_cells = [[Paragraph("<b>Rank</b>", style_header_cell), Paragraph("<b>10 Anggota Paling Aktif</b>", style_header_cell), Paragraph("<b>Aktivitas</b>", style_header_cell)]]
            for idx, r in enumerate(stats['teraktif_anggota'], start=1):
                top_memb_cells.append([
                    Paragraph(str(idx), style_cell_bold),
                    Paragraph(r['nama'][:35], style_cell),
                    Paragraph(f"{r['total']}x", style_cell_bold)
                ])
            while len(top_memb_cells) <= 10:
                top_memb_cells.append([Paragraph("-", style_cell), Paragraph("-", style_cell), Paragraph("-", style_cell)])
                
            top_memb_table = Table(top_memb_cells, colWidths=[30, 210, 40])
            top_memb_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')])
            ]))
            
            # Combine Side-by-side: [10 Buku Terpopuler, 10 Anggota Teraktif]
            table_row_data = [[top_books_table, "", top_memb_table]]
            side_by_side_tables = Table(table_row_data, colWidths=[280, 22, 280])
            side_by_side_tables.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ]))
            
            # Combine side tables with monthly trend chart using a master layout row
            chart_rl_img = RLImage(chart_file, width=200, height=180) # small thumbnail
            
            # We want the monthly chart to be beautiful and big, let's stack them nicely
            # Left block: Top 10 Tables, Right block: Monthly Trend Chart
            trend_title = Paragraph("<b>GRAFIK TREN PEMINJAMAN BULANAN (Visualisasi)</b>", ParagraphStyle('Tr', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10, textColor=colors.HexColor('#1e3a8a'), alignment=1))
            right_block = [
                trend_title,
                Spacer(1, 5),
                RLImage(chart_file, width=200, height=120),
                Spacer(1, 15),
                Paragraph("<b>TANDA TANGAN PETUGAS</b>", ParagraphStyle('SigTitle', parent=styles['Normal'], fontSize=8, fontName='Helvetica-Bold', alignment=1)),
                Spacer(1, 30),
                Paragraph(f"<u><b>{self.controller.active_user['nama']}</b></u>", ParagraphStyle('SigName', parent=styles['Normal'], fontSize=9, fontName='Helvetica-Bold', alignment=1)),
                Paragraph(f"NIP / Kode Staff: {self.controller.active_user['username']}", ParagraphStyle('SigRole', parent=styles['Normal'], fontSize=8, alignment=1))
            ]
            
            summary_master_data = [[side_by_side_tables, right_block]]
            summary_master_table = Table(summary_master_data, colWidths=[582, 200])
            summary_master_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (1, 0), (1, 0), 15),
            ]))
            
            story.append(summary_master_table)
            
            # Build PDF!
            doc.build(story)
            
            # Delete temp chart file
            if os.path.exists(chart_file):
                try:
                    os.remove(chart_file)
                except:
                    pass
            
            messagebox.showinfo("Sukses PDF", f"Laporan PDF profesional berhasil dibuat!\nFile disimpan di: {filepath}")
        except Exception as e:
            import traceback
            traceback.print_exc()
            messagebox.showerror("Error PDF", f"Gagal membuat PDF: {e}")
