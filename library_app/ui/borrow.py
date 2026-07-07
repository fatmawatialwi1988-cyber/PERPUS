import customtkinter as ctk
from database.models import MemberModel, BookModel, TransactionModel
from database.db import get_connection
from barcode.scanner import BarcodeScanner
from tkinter import messagebox
import datetime
import os

class BorrowFrame(ctk.CTkFrame):
    def __init__(self, parent, controller):
        super().__init__(parent)
        self.controller = controller

        self.grid_columnconfigure(0, weight=1)
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(2, weight=1)

        # Active Member and Book state
        self.active_member = None
        self.active_book = None
        self.cart_items = [] # list of books in cart
        
        # Camera instance
        self.scanner = BarcodeScanner()
        self.camera_on = False

        # Header Title
        self.header = ctk.CTkLabel(self, text="TRANSAKSI PEMINJAMAN BUKU (CHECKOUT)", font=ctk.CTkFont(size=20, weight="bold"))
        self.header.grid(row=0, column=0, columnspan=2, padx=20, pady=15, sticky="w")

        # 1. Scanner Inputs Panel (Left)
        self.left_panel = ctk.CTkFrame(self, border_width=1, border_color="#e2e8f0")
        self.left_panel.grid(row=1, column=0, rowspan=2, padx=(20, 10), pady=10, sticky="nsew")
        self.left_panel.grid_columnconfigure(0, weight=1)

        # Camera frame viewport
        self.cam_label = ctk.CTkLabel(self.left_panel, text="Kamera Mati", fg_color="black", text_color="white", height=180, width=280, corner_radius=8)
        self.cam_label.pack(padx=20, pady=(10, 2))

        # Status indicator label
        self.lbl_scan_status = ctk.CTkLabel(self.left_panel, text="STATUS: Kamera Mati", font=ctk.CTkFont(weight="bold", size=11), text_color="gray")
        self.lbl_scan_status.pack(padx=20, pady=(2, 10))

        # Control camera scan
        self.btn_cam_m = ctk.CTkButton(self.left_panel, text="Scan Barcode Anggota (Kamera)", command=lambda: self.start_live_scan("member"))
        self.btn_cam_m.pack(fill="x", padx=20, pady=5)

        self.btn_cam_b = ctk.CTkButton(self.left_panel, text="Scan Barcode Buku (Kamera)", command=lambda: self.start_live_scan("book"))
        self.btn_cam_b.pack(fill="x", padx=20, pady=5)

        # Text Inputs alternative
        ctk.CTkLabel(self.left_panel, text="-- ATAU MASUKKAN MANUAL --", font=ctk.CTkFont(size=10, weight="bold"), text_color="gray").pack(pady=8)
        
        self.ent_member = ctk.CTkEntry(self.left_panel, placeholder_text="NIS / Barcode Anggota...")
        self.ent_member.pack(fill="x", padx=20, pady=2)
        self.ent_member.bind("<Return>", lambda e: self.lookup_member(self.ent_member.get()))

        self.ent_book = ctk.CTkEntry(self.left_panel, placeholder_text="Kode Buku / Barcode Buku...")
        self.ent_book.pack(fill="x", padx=20, pady=2)
        self.ent_book.bind("<Return>", lambda e: self.lookup_book(self.ent_book.get()))

        # Member Profile Summary
        self.member_summary = ctk.CTkLabel(self.left_panel, text="Siswa: (Belum dipilih)", font=ctk.CTkFont(weight="bold", size=12))
        self.member_summary.pack(pady=10)

        # 2. Cart Panel (Right)
        self.right_panel = ctk.CTkFrame(self, border_width=1, border_color="#e2e8f0")
        self.right_panel.grid(row=1, column=1, rowspan=2, padx=(10, 20), pady=10, sticky="nsew")
        self.right_panel.grid_columnconfigure(0, weight=1)
        self.right_panel.grid_rowconfigure(1, weight=1)

        # Cart Title
        self.cart_title = ctk.CTkLabel(self.right_panel, text="Daftar Keranjang Pinjam Buku", font=ctk.CTkFont(size=14, weight="bold"))
        self.cart_title.grid(row=0, column=0, padx=15, pady=10, sticky="w")

        # Cart list frame
        self.cart_frame = ctk.CTkScrollableFrame(self.right_panel)
        self.cart_frame.grid(row=1, column=0, padx=15, pady=5, sticky="nsew")

        # Checkout CTAs
        self.checkout_frame = ctk.CTkFrame(self.right_panel, fg_color="transparent")
        self.checkout_frame.grid(row=2, column=0, padx=15, pady=15, sticky="ew")

        self.btn_add_to_cart = ctk.CTkButton(self.checkout_frame, text="+ Tambah ke Keranjang", command=self.add_to_cart, fg_color="#4f46e5", hover_color="#4338ca")
        self.btn_add_to_cart.pack(fill="x", pady=2)

        self.btn_save_tx = ctk.CTkButton(self.checkout_frame, text="SIMPAN TRANSAKSI PINJAMAN", command=self.save_transaction, fg_color="#2563eb", hover_color="#1d4ed8")
        self.btn_save_tx.pack(fill="x", pady=2)

        self.refresh_cart()

    def start_live_scan(self, type_scan):
        if self.camera_on:
            self.stop_live_scan()
            return

        if not self.scanner.start():
            messagebox.showerror("Error Kamera", "Kamera laptop tidak terdeteksi atau sedang digunakan aplikasi lain.")
            return

        self.camera_on = True
        self.type_scan = type_scan
        
        self.btn_cam_m.configure(state="disabled")
        self.btn_cam_b.configure(state="disabled")
        
        self.lbl_scan_status.configure(text="🟢 Kamera Aktif", text_color="#059669")
        
        self.scan_loop()

    def stop_live_scan(self):
        self.camera_on = False
        self.scanner.stop()
        self.cam_label.configure(text="Kamera Mati", image=None)
        
        self.btn_cam_m.configure(state="normal")
        self.btn_cam_b.configure(state="normal")
        self.lbl_scan_status.configure(text="STATUS: Kamera Mati", text_color="gray")

    def scan_loop(self):
        if not self.camera_on:
            return

        img_tk, code = self.scanner.get_frame()
        if img_tk:
            self.cam_label.configure(image=img_tk, text="")
            self.cam_label.image = img_tk  # keep reference

        if code:
            print(f"QR/Barcode Terdeteksi: {code}")
            
            if self.type_scan == "member":
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
            elif self.type_scan == "book":
                self.lbl_scan_status.configure(text="🟢 QR Code Berhasil Dibaca", text_color="#059669")
                self.stop_live_scan()
                self.ent_book.delete(0, "end")
                self.ent_book.insert(0, code)
                self.lookup_book(code)
            return

        self.after(30, self.scan_loop)

    def lookup_member(self, barcode):
        barcode_val = barcode.strip()
        if not barcode_val:
            return
            
        self.lbl_scan_status.configure(text="STATUS: Memproses data anggota...", text_color="#d97706")
        self.active_member = MemberModel.get_by_barcode(barcode_val)
        
        if self.active_member:
            has_overdue = TransactionModel.check_has_overdue(self.active_member['nis'])
            if has_overdue:
                messagebox.showerror("Anggota Ditangguhkan", f"Siswa {self.active_member['nama']} memiliki pinjaman buku terlambat! Transaksi pinjam ditolak.")
                self.active_member = None
                self.member_summary.configure(text="Siswa: Terblokir (Ada Tunggakan)")
                self.lbl_scan_status.configure(text="STATUS: Anggota Ditangguhkan (Tunggakan)", text_color="#dc2626")
                return

            self.member_summary.configure(text=f"Siswa: {self.active_member['nama']} ({self.active_member['kelas']})")
            self.lbl_scan_status.configure(text="STATUS: Anggota Berhasil Ditemukan!", text_color="#059669")
        else:
            self.member_summary.configure(text="Siswa: Tidak Terdaftar!")
            self.lbl_scan_status.configure(text="STATUS: Barcode Tidak Terdaftar!", text_color="#dc2626")
            
            if messagebox.askyesno("Barcode Tidak Terdaftar", f"Barcode Anggota '{barcode_val}' tidak terdaftar di database.\n\nApakah Anda ingin mendaftarkannya sekarang?"):
                self.open_quick_member_reg(barcode_val)

    def lookup_book(self, barcode):
        barcode_val = barcode.strip()
        if not barcode_val:
            return
            
        self.lbl_scan_status.configure(text="STATUS: Memproses data buku...", text_color="#d97706")
        
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM buku WHERE barcode = ? OR kode_buku = ?;", (barcode_val, barcode_val))
        self.active_book = cursor.fetchone()
        conn.close()

        if self.active_book:
            if self.active_book['jumlah_tersedia'] <= 0:
                messagebox.showerror("Stok Habis", f"Buku '{self.active_book['judul']}' sedang tidak tersedia.")
                self.active_book = None
                self.lbl_scan_status.configure(text="STATUS: Stok Buku Habis!", text_color="#dc2626")
                return
            self.btn_add_to_cart.configure(text=f"Tambah: '{self.active_book['judul'][:18]}...'")
            self.lbl_scan_status.configure(text="STATUS: Data Buku Ditemukan!", text_color="#059669")
        else:
            self.lbl_scan_status.configure(text="STATUS: Barcode Tidak Terdaftar!", text_color="#dc2626")
            if messagebox.askyesno("Barcode Tidak Terdaftar", f"Barcode Buku '{barcode_val}' tidak terdaftar di database.\n\nApakah Anda ingin menambahkannya sebagai buku baru sekarang?"):
                self.open_quick_book_reg(barcode_val)

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

    def open_quick_book_reg(self, barcode):
        dialog = ctk.CTkToplevel(self)
        dialog.title("Tambah Buku Cepat")
        dialog.geometry("350x480")
        dialog.transient(self)
        dialog.grab_set()
        
        ctk.CTkLabel(dialog, text="TAMBAH BUKU BARU (CEPAT)", font=ctk.CTkFont(size=14, weight="bold")).pack(pady=15)
        
        frame = ctk.CTkFrame(dialog, fg_color="transparent")
        frame.pack(fill="both", expand=True, padx=20)
        
        ctk.CTkLabel(frame, text="Kode Buku (Unik) *").pack(anchor="w")
        ent_kode = ctk.CTkEntry(frame)
        ent_kode.pack(fill="x", pady=(0, 10))
        ent_kode.insert(0, f"B{datetime.date.today().year}{barcode[-3:]}") # creative prefilled code
        
        ctk.CTkLabel(frame, text="ISBN *").pack(anchor="w")
        ent_isbn = ctk.CTkEntry(frame)
        ent_isbn.pack(fill="x", pady=(0, 10))
        ent_isbn.insert(0, barcode)
        
        ctk.CTkLabel(frame, text="Judul Buku *").pack(anchor="w")
        ent_judul = ctk.CTkEntry(frame)
        ent_judul.pack(fill="x", pady=(0, 10))
        
        ctk.CTkLabel(frame, text="Pengarang *").pack(anchor="w")
        ent_author = ctk.CTkEntry(frame)
        ent_author.pack(fill="x", pady=(0, 10))
        
        ctk.CTkLabel(frame, text="Penerbit *").pack(anchor="w")
        ent_pub = ctk.CTkEntry(frame)
        ent_pub.pack(fill="x", pady=(0, 10))
        
        def save():
            kode = ent_kode.get().strip().upper()
            isbn = ent_isbn.get().strip()
            judul = ent_judul.get().strip()
            author = ent_author.get().strip()
            pub = ent_pub.get().strip()
            
            if not kode or not isbn or not judul or not author or not pub:
                messagebox.showerror("Error", "Seluruh field bertanda * wajib diisi!")
                return
                
            success = BookModel.add(kode, isbn, barcode, judul, author, pub, datetime.date.today().year, 1, 1, 5)
            if success:
                messagebox.showinfo("Sukses", f"Buku '{judul}' berhasil ditambahkan ke katalog!")
                dialog.destroy()
                self.lookup_book(barcode)
            else:
                messagebox.showerror("Error", "Gagal menyimpan buku baru.")
                
        ctk.CTkButton(dialog, text="Simpan Buku", command=save, fg_color="#059669").pack(pady=15)

    def add_to_cart(self):
        if not self.active_member:
            messagebox.showerror("Error", "Harap scan atau isi NIS Siswa dahulu!")
            return

        if not self.active_book:
            messagebox.showerror("Error", "Harap scan atau masukkan buku terlebih dahulu!")
            return

        # Check duplicate in cart
        if any(item['kode_buku'] == self.active_book['kode_buku'] for item in self.cart_items):
            messagebox.showerror("Error", "Buku tersebut sudah berada di dalam antrean peminjaman.")
            return

        self.cart_items.append(self.active_book)
        self.active_book = None
        self.ent_book.delete(0, "end")
        self.btn_add_to_cart.configure(text="+ Tambah ke Keranjang")
        self.refresh_cart()

    def refresh_cart(self):
        for child in self.cart_frame.winfo_children():
            child.destroy()

        if len(self.cart_items) == 0:
            lbl = ctk.CTkLabel(self.cart_frame, text="Keranjang kosong.", text_color="gray")
            lbl.pack(pady=40)
            return

        for idx, item in enumerate(self.cart_items):
            row = ctk.CTkFrame(self.cart_frame)
            row.pack(fill="x", pady=3)

            lbl_title = ctk.CTkLabel(row, text=f"{item['kode_buku']} - {item['judul'][:25]}", font=ctk.CTkFont(size=12, weight="semibold"))
            lbl_title.pack(side="left", padx=10, pady=5)

            btn_del = ctk.CTkButton(row, text="Hapus", width=50, fg_color="#dc2626", hover_color="#991b1b", command=lambda x=idx: self.remove_cart_item(x))
            btn_del.pack(side="right", padx=10, pady=5)

    def remove_cart_item(self, idx):
        self.cart_items.pop(idx)
        self.refresh_cart()

    def save_transaction(self):
        if not self.active_member:
            messagebox.showerror("Error", "Harap pilih siswa dahulu!")
            return

        if len(self.cart_items) == 0:
            messagebox.showerror("Error", "Keranjang buku masih kosong!")
            return

        # Get default duration
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM pengaturan WHERE key = 'lama_pinjam';")
        dur_days = int(cursor.fetchone()['value'])
        conn.close()

        book_codes = [item['kode_buku'] for item in self.cart_items]

        # Execute Transaction
        success = TransactionModel.borrow_books(self.active_member['nis'], book_codes, dur_days)
        if success:
            messagebox.showinfo("Transaksi Berhasil", "Sistem berhasil merekam transaksi peminjaman buku.")
            
            # Reset States
            self.active_member = None
            self.active_book = None
            self.cart_items = []
            
            self.ent_member.delete(0, "end")
            self.ent_book.delete(0, "end")
            self.member_summary.configure(text="Siswa: (Belum dipilih)")
            self.refresh_cart()
        else:
            messagebox.showerror("Transaksi Gagal", "Database SQLite menolak transaksi karena pelanggaran integritas.")
