import customtkinter as ctk
import os
from PIL import Image, ImageTk
from database.db import get_connection
from database.models import TransactionModel

class MemberDetailDialog(ctk.CTkToplevel):
    def __init__(self, parent, member, on_use_callback=None):
        super().__init__(parent)
        self.title("Detail Anggota - Hasil Pemindaian")
        self.geometry("560x580")
        self.resizable(False, False)
        self.transient(parent)
        self.grab_set()

        # Main Layout Frame
        self.main_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.main_frame.pack(fill="both", expand=True, padx=20, pady=20)

        # Title
        title_lbl = ctk.CTkLabel(self.main_frame, text="🟢 QR Code Berhasil Dibaca", font=ctk.CTkFont(size=16, weight="bold"), text_color="#059669")
        title_lbl.pack(pady=(0, 15))

        # Upper Card Frame (Photo + Details)
        upper_frame = ctk.CTkFrame(self.main_frame, fg_color="#f8fafc", border_width=1, border_color="#e2e8f0")
        upper_frame.pack(fill="x", pady=(0, 15), padx=2)

        # Photo layout
        photo_frame = ctk.CTkFrame(upper_frame, fg_color="transparent")
        photo_frame.pack(side="left", padx=15, pady=15)

        photo_w, photo_h = 120, 160
        photo_path = member.get('foto', '')
        photo_loaded = False
        
        if photo_path and os.path.exists(photo_path):
            try:
                pil_img = Image.open(photo_path)
                pil_img = pil_img.resize((photo_w, photo_h), Image.Resampling.LANCZOS)
                tk_img = ImageTk.PhotoImage(image=pil_img)
                lbl_photo = ctk.CTkLabel(photo_frame, image=tk_img, text="")
                lbl_photo.image = tk_img
                lbl_photo.pack()
                photo_loaded = True
            except Exception as e:
                print("Error loading member photo in dialog:", e)

        if not photo_loaded:
            # Vector placeholder avatar
            lbl_photo_placeholder = ctk.CTkLabel(photo_frame, text="No Photo", fg_color="#cbd5e1", width=photo_w, height=photo_h, corner_radius=6, font=ctk.CTkFont(weight="bold"))
            lbl_photo_placeholder.pack()

        # Details layout (Right Side of photo)
        details_frame = ctk.CTkFrame(upper_frame, fg_color="transparent")
        details_frame.pack(side="left", fill="both", expand=True, padx=(5, 15), pady=15)

        # Retrieve status
        has_overdue = TransactionModel.check_has_overdue(member['nis'])
        status_text = "🔴 DITANGGUHKAN (Ada Tunggakan)" if has_overdue else "🟢 AKTIF"
        status_color = "#dc2626" if has_overdue else "#059669"

        info_rows = [
            ("Nama Lengkap", member['nama'].upper()),
            ("No. Anggota", member['barcode_anggota']),
            ("NIS", member['nis']),
            ("Kelas", member['kelas'].upper()),
            ("Status Keanggotaan", status_text, status_color)
        ]

        for idx, row in enumerate(info_rows):
            lbl_name = ctk.CTkLabel(details_frame, text=row[0], font=ctk.CTkFont(size=10, weight="bold"), text_color="#64748b")
            lbl_name.grid(row=idx*2, column=0, sticky="w", pady=(2, 0))
            
            val_color = row[2] if len(row) > 2 else "#0f172a"
            val_font = ctk.CTkFont(size=13, weight="bold") if row[0] in ["Nama Lengkap", "Status Keanggotaan"] else ctk.CTkFont(size=12)
            lbl_val = ctk.CTkLabel(details_frame, text=row[1], font=val_font, text_color=val_color)
            lbl_val.grid(row=idx*2+1, column=0, sticky="w", pady=(0, 2))

        # Bottom Section (Riwayat Peminjaman)
        ctk.CTkLabel(self.main_frame, text="Riwayat Peminjaman Buku (5 Transaksi Terakhir)", font=ctk.CTkFont(size=12, weight="bold"), text_color="#475569").pack(anchor="w", pady=(0, 5))

        history_frame = ctk.CTkScrollableFrame(self.main_frame, height=180)
        history_frame.pack(fill="both", expand=True, pady=(0, 15))

        # Fetch history from database
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT p.tanggal_pinjam, p.tanggal_kembali, d.status, d.denda, b.judul 
                FROM peminjaman p
                JOIN detail_peminjaman d ON p.id = d.peminjaman_id
                JOIN buku b ON d.kode_buku = b.kode_buku
                WHERE p.nis = ?
                ORDER BY p.id DESC LIMIT 5;
            """, (member['nis'],))
            history_rows = cursor.fetchall()
            conn.close()
        except Exception as e:
            print("Error fetching history:", e)
            history_rows = []

        if not history_rows:
            ctk.CTkLabel(history_frame, text="Tidak ada riwayat peminjaman.", font=ctk.CTkFont(slant="italic"), text_color="gray").pack(pady=20)
        else:
            # Render headers
            header_box = ctk.CTkFrame(history_frame, fg_color="transparent")
            header_box.pack(fill="x", pady=2)
            ctk.CTkLabel(header_box, text="Buku", width=200, anchor="w", font=ctk.CTkFont(weight="bold", size=11)).pack(side="left", padx=5)
            ctk.CTkLabel(header_box, text="Pinjam", width=80, anchor="w", font=ctk.CTkFont(weight="bold", size=11)).pack(side="left", padx=5)
            ctk.CTkLabel(header_box, text="Tempo", width=80, anchor="w", font=ctk.CTkFont(weight="bold", size=11)).pack(side="left", padx=5)
            ctk.CTkLabel(header_box, text="Status", width=80, anchor="w", font=ctk.CTkFont(weight="bold", size=11)).pack(side="left", padx=5)

            for h in history_rows:
                row_box = ctk.CTkFrame(history_frame, fg_color="transparent")
                row_box.pack(fill="x", pady=2)
                
                # Title
                title_txt = h['judul'][:24] + "..." if len(h['judul']) > 24 else h['judul']
                ctk.CTkLabel(row_box, text=title_txt, width=200, anchor="w", font=ctk.CTkFont(size=11)).pack(side="left", padx=5)
                
                # Dates
                ctk.CTkLabel(row_box, text=h['tanggal_pinjam'], width=80, anchor="w", font=ctk.CTkFont(size=10)).pack(side="left", padx=5)
                ctk.CTkLabel(row_box, text=h['tanggal_kembali'], width=80, anchor="w", font=ctk.CTkFont(size=10)).pack(side="left", padx=5)
                
                # Status
                st = h['status']
                st_color = "#059669" if st == "Kembali" else ("#dc2626" if st == "Terlambat" else "#d97706")
                ctk.CTkLabel(row_box, text=st, width=80, anchor="w", text_color=st_color, font=ctk.CTkFont(weight="bold", size=10)).pack(side="left", padx=5)

        # Footer Actions
        footer_frame = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        footer_frame.pack(fill="x")

        def close_dialog():
            self.destroy()

        def use_member():
            if on_use_callback:
                on_use_callback(member)
            self.destroy()

        if on_use_callback:
            use_btn = ctk.CTkButton(footer_frame, text="Pilih Anggota Ini", command=use_member, fg_color="#2563eb", hover_color="#1d4ed8", font=ctk.CTkFont(weight="bold"))
            use_btn.pack(side="right", padx=5)

        close_btn = ctk.CTkButton(footer_frame, text="Tutup", command=close_dialog, fg_color="#64748b", hover_color="#475569")
        close_btn.pack(side="right", padx=5)
