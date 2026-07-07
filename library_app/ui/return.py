import customtkinter as ctk
from database.models import MemberModel, TransactionModel
from database.db import get_connection
from barcode.scanner import BarcodeScanner
from tkinter import messagebox
import datetime
import os

class ReturnFrame(ctk.CTkFrame):
    def __init__(self, parent, controller):
        super().__init__(parent)
        self.controller = controller

        self.grid_columnconfigure(0, weight=1)
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(2, weight=1)

        # Active states
        self.active_member = None
        self.outstanding_loans = []
        self.checked_returns = {} # maps detail_peminjaman compound identifiers to bool

        self.scanner = BarcodeScanner()
        self.camera_on = False

        # Header Title
        self.header = ctk.CTkLabel(self, text="TRANSAKSI PENGEMBALIAN BUKU", font=ctk.CTkFont(size=20, weight="bold"))
        self.header.grid(row=0, column=0, columnspan=2, padx=20, pady=15, sticky="w")

        # 1. Left input scanner
        self.left_panel = ctk.CTkFrame(self, border_width=1, border_color="#e2e8f0")
        self.left_panel.grid(row=1, column=0, rowspan=2, padx=(20, 10), pady=10, sticky="nsew")

        self.cam_label = ctk.CTkLabel(self.left_panel, text="Kamera Mati", fg_color="black", text_color="white", height=180, width=280, corner_radius=8)
        self.cam_label.pack(padx=20, pady=(15, 2))

        # Status indicator label
        self.lbl_scan_status = ctk.CTkLabel(self.left_panel, text="STATUS: Kamera Mati", font=ctk.CTkFont(weight="bold", size=11), text_color="gray")
        self.lbl_scan_status.pack(padx=20, pady=(2, 10))

        self.btn_cam = ctk.CTkButton(self.left_panel, text="Scan Kartu Anggota (Kamera)", command=self.start_live_scan)
        self.btn_cam.pack(fill="x", padx=20, pady=5)

        ctk.CTkLabel(self.left_panel, text="-- ATAU MASUKKAN MANUAL --", font=ctk.CTkFont(size=10, weight="bold"), text_color="gray").pack(pady=8)

        self.ent_member = ctk.CTkEntry(self.left_panel, placeholder_text="NIS / Barcode Anggota...")
        self.ent_member.pack(fill="x", padx=20, pady=5)
        self.ent_member.bind("<Return>", lambda e: self.lookup_member(self.ent_member.get()))

        self.member_summary = ctk.CTkLabel(self.left_panel, text="Siswa: (Belum dipilih)", font=ctk.CTkFont(weight="bold", size=12))
        self.member_summary.pack(pady=15)

        # 2. Right Outstanding checklist panel
        self.right_panel = ctk.CTkFrame(self, border_width=1, border_color="#e2e8f0")
        self.right_panel.grid(row=1, column=1, rowspan=2, padx=(10, 20), pady=10, sticky="nsew")
        self.right_panel.grid_columnconfigure(0, weight=1)
        self.right_panel.grid_rowconfigure(1, weight=1)

        self.loans_title = ctk.CTkLabel(self.right_panel, text="Buku yang Sedang Dipinjam", font=ctk.CTkFont(size=14, weight="bold"))
        self.loans_title.grid(row=0, column=0, padx=15, pady=10, sticky="w")

        self.loans_frame = ctk.CTkScrollableFrame(self.right_panel)
        self.loans_frame.grid(row=1, column=0, padx=15, pady=5, sticky="nsew")

        self.btn_process = ctk.CTkButton(self.right_panel, text="PROSES PENGEMBALIAN BUKU", command=self.process_returns, fg_color="#059669", hover_color="#047857")
        self.btn_process.grid(row=2, column=0, padx=15, pady=15, sticky="ew")

        self.refresh_loans()

    def start_live_scan(self):
        if self.camera_on:
            self.stop_live_scan()
            return
        if not self.scanner.start():
            messagebox.showerror("Error Kamera", "Kamera laptop gagal diaktifkan.")
            return

        self.camera_on = True
        self.btn_cam.configure(text="Matikan Kamera", fg_color="#dc2626")
        self.lbl_scan_status.configure(text="🟢 Kamera Aktif", text_color="#059669")
        self.scan_loop()

    def stop_live_scan(self):
        self.camera_on = False
        self.scanner.stop()
        self.cam_label.configure(text="Kamera Mati", image=None)
        self.btn_cam.configure(text="Scan Kartu Anggota (Kamera)", fg_color=["#3b82f6", "#1d4ed8"])
        self.lbl_scan_status.configure(text="STATUS: Kamera Mati", text_color="gray")

    def scan_loop(self):
        if not self.camera_on:
            return
        img_tk, code = self.scanner.get_frame()
        if img_tk:
            self.cam_label.configure(image=img_tk, text="")
            self.cam_label.image = img_tk
        if code:
            self.lbl_scan_status.configure(text="🟢 QR Code Berhasil Dibaca", text_color="#059669")
            self.stop_live_scan()
            
            # Fetch member from database
            member = MemberModel.get_by_barcode(code)
            if not member:
                messagebox.showerror("Error", "Data anggota tidak ditemukan.")
                self.lbl_scan_status.configure(text="STATUS: Anggota tidak ditemukan", text_color="#dc2626")
            else:
                from ui.member_dialog import MemberDetailDialog
                def select_member_cb(m):
                    self.ent_member.delete(0, "end")
                    self.ent_member.insert(0, m['barcode_anggota'])
                    self.lookup_member(m['barcode_anggota'])
                
                MemberDetailDialog(self, member, on_use_callback=select_member_cb)
            return
        self.after(30, self.scan_loop)

    def lookup_member(self, barcode):
        barcode_val = barcode.strip()
        if not barcode_val:
            return

        self.lbl_scan_status.configure(text="STATUS: Memproses barcode...", text_color="#d97706")
        self.active_member = MemberModel.get_by_barcode(barcode_val)
        
        if self.active_member:
            self.member_summary.configure(text=f"Siswa: {self.active_member['nama']} ({self.active_member['kelas']})")
            self.lbl_scan_status.configure(text="STATUS: Profil Anggota Ditemukan!", text_color="#059669")
            self.load_loans()
        else:
            self.member_summary.configure(text="Siswa: Tidak Terdaftar!")
            self.lbl_scan_status.configure(text="STATUS: Barcode Tidak Terdaftar!", text_color="#dc2626")
            self.outstanding_loans = []
            self.refresh_loans()
            
            if messagebox.askyesno("Barcode Tidak Terdaftar", f"Barcode Anggota '{barcode_val}' tidak terdaftar di database.\n\nApakah Anda ingin mendaftarkannya sekarang?"):
                self.open_quick_member_reg(barcode_val)

    def open_quick_member_reg(self, barcode):
        dialog = ctk.CTkToplevel(self)
        dialog.title("Registrasi Anggota Cepat")
        dialog.geometry("350x420")
        dialog.transient(self)
        dialog.grab_set()
        
        ctk.CTkLabel(dialog, text="REGISTRASI SISWA BARU (CEPAT)", font=ctk.CTkFont(size=14, weight="bold")).pack(pady=15)
        
        frame = ctk.CTkFrame(dialog, fg_color="transparent")
        frame.pack(fill="both", expand=True, padx=20)
        
        ctk.CTkLabel(frame, text="NIS (Nomor Induk Siswa) *").pack(anchor="w")
        ent_nis = ctk.CTkEntry(frame)
        ent_nis.pack(fill="x", pady=(0, 10))
        # Prefill if barcode is numeric
        prefill_nis = "".join(filter(str.isdigit, barcode))
        if prefill_nis:
            ent_nis.insert(0, prefill_nis)
        else:
            ent_nis.insert(0, barcode)
            
        ctk.CTkLabel(frame, text="Nama Lengkap Siswa *").pack(anchor="w")
        ent_nama = ctk.CTkEntry(frame)
        ent_nama.pack(fill="x", pady=(0, 10))
        
        ctk.CTkLabel(frame, text="Kelas *").pack(anchor="w")
        ent_kelas = ctk.CTkEntry(frame, placeholder_text="X-IPA-1")
        ent_kelas.pack(fill="x", pady=(0, 10))
        
        ctk.CTkLabel(frame, text="Jenis Kelamin").pack(anchor="w")
        cmb_gender = ctk.CTkComboBox(frame, values=["Laki-laki", "Perempuan"])
        cmb_gender.pack(fill="x", pady=(0, 15))
        
        def save():
            nis = ent_nis.get().strip()
            nama = ent_nama.get().strip()
            kelas = ent_kelas.get().strip()
            gender = cmb_gender.get()
            
            if not nis or not nama or not kelas:
                messagebox.showerror("Error", "Wajib mengisi seluruh field bertanda *")
                return
                
            success = MemberModel.add(nis, nama, kelas, gender, "", "", "", barcode)
            if success:
                messagebox.showinfo("Sukses", f"Siswa {nama} berhasil didaftarkan!")
                dialog.destroy()
                self.lookup_member(barcode)
            else:
                messagebox.showerror("Error", "Gagal mendaftarkan anggota baru.")
                
        ctk.CTkButton(dialog, text="Daftarkan Anggota", command=save, fg_color="#059669").pack(pady=15)

    def load_loans(self):
        if not self.active_member:
            return
        self.outstanding_loans = TransactionModel.get_outstanding_loans(self.active_member['nis'])
        self.checked_returns = {f"{item['peminjaman_id']}_{item['kode_buku']}": False for item in self.outstanding_loans}
        self.refresh_loans()

    def refresh_loans(self):
        for child in self.loans_frame.winfo_children():
            child.destroy()

        if len(self.outstanding_loans) == 0:
            lbl = ctk.CTkLabel(self.loans_frame, text="Tidak ada peminjaman aktif.", text_color="gray")
            lbl.pack(pady=40)
            return

        # Fetch denda per hari
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM pengaturan WHERE key = 'denda_per_hari';")
        denda_per_hari = float(cursor.fetchone()['value'])
        conn.close()

        today = datetime.date.today()

        for item in self.outstanding_loans:
            row = ctk.CTkFrame(self.loans_frame)
            row.pack(fill="x", pady=5)

            # calculate late days
            due_date = datetime.date.fromisoformat(item['tanggal_kembali'])
            late_days = 0
            fine = 0
            if today > due_date:
                late_days = (today - due_date).days
                fine = late_days * denda_per_hari

            # Checkbox
            key = f"{item['peminjaman_id']}_{item['kode_buku']}"
            cb = ctk.CTkCheckBox(row, text=f"{item['judul'][:20]} ({item['kode_buku']})", command=lambda k=key: self.toggle_check(k))
            cb.pack(side="left", padx=10, pady=5)

            # Info late days and fine label
            if late_days > 0:
                lbl_late = ctk.CTkLabel(row, text=f"Terlambat {late_days} hari (Denda: Rp{int(fine):,})", text_color="#dc2626", font=ctk.CTkFont(size=10, weight="bold"))
                lbl_late.pack(side="right", padx=10, pady=5)
            else:
                lbl_late = ctk.CTkLabel(row, text="Aman", text_color="#059669", font=ctk.CTkFont(size=10, weight="bold"))
                lbl_late.pack(side="right", padx=10, pady=5)

    def toggle_check(self, key):
        if key in self.checked_returns:
            self.checked_returns[key] = not self.checked_returns[key]

    def process_returns(self):
        if not self.active_member:
            return

        to_return = [k for k, checked in self.checked_returns.items() if checked]
        if len(to_return) == 0:
            messagebox.showerror("Error", "Pilih minimal satu buku yang ingin dikembalikan!")
            return

        # Get denda rate
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM pengaturan WHERE key = 'denda_per_hari';")
        denda_per_hari = float(cursor.fetchone()['value'])
        conn.close()

        success_count = 0
        total_fine = 0.0

        for identifier in to_return:
            pid, code = identifier.split("_")
            success, fine = TransactionModel.process_return(int(pid), code, denda_per_hari)
            if success:
                success_count += 1
                total_fine += fine

        if success_count > 0:
            msg = f"Berhasil memproses pengembalian {success_count} buku."
            if total_fine > 0:
                msg += f"\nTotal denda yang harus dibayar: Rp {int(total_fine):,}"
            messagebox.showinfo("Sukses Pengembalian", msg)

            # Reload
            self.load_loans()
        else:
            messagebox.showerror("Error", "Gagal memproses transaksi pengembalian.")
