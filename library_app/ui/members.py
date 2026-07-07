import customtkinter as ctk
from database.models import MemberModel
from database.db import get_connection
from barcode.generator import BarcodeGenerator
import openpyxl
from tkinter import filedialog, messagebox
import os

class MembersFrame(ctk.CTkFrame):
    def __init__(self, parent, controller):
        super().__init__(parent)
        self.controller = controller

        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(2, weight=1)

        # Header Title
        self.header_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.header_frame.grid(row=0, column=0, padx=20, pady=15, sticky="ew")
        
        self.header_label = ctk.CTkLabel(self.header_frame, text="REKAPITULASI DATA ANGGOTA SISWA", font=ctk.CTkFont(size=20, weight="bold"))
        self.header_label.pack(side="left")

        # Toolbar
        self.toolbar = ctk.CTkFrame(self, fg_color="transparent")
        self.toolbar.grid(row=1, column=0, padx=20, pady=5, sticky="ew")

        self.search_entry = ctk.CTkEntry(self.toolbar, placeholder_text="Cari NIS, nama siswa...")
        self.search_entry.pack(side="left", padx=5)
        self.search_entry.bind("<KeyRelease>", lambda e: self.load_members())

        # Right buttons
        self.btn_add = ctk.CTkButton(self.toolbar, text="+ Registrasi Anggota", command=self.open_add_dialog, width=120)
        self.btn_add.pack(side="right", padx=5)

        self.btn_export = ctk.CTkButton(self.toolbar, text="Ekspor Excel", fg_color="#059669", hover_color="#047857", command=self.export_excel, width=100)
        self.btn_export.pack(side="right", padx=5)

        self.btn_import = ctk.CTkButton(self.toolbar, text="Impor Excel", fg_color="#10b981", hover_color="#059669", command=self.import_excel, width=100)
        self.btn_import.pack(side="right", padx=5)

        # Main List frame
        self.list_frame = ctk.CTkScrollableFrame(self)
        self.list_frame.grid(row=2, column=0, padx=20, pady=10, sticky="nsew")

        self.load_members()

    def load_members(self):
        # Clear existing
        for child in self.list_frame.winfo_children():
            child.destroy()

        search = self.search_entry.get().strip()
        members = MemberModel.get_all(search)

        headers = ["NIS", "Nama Lengkap", "Kelas", "Jenis Kelamin", "No. HP", "Barcode ID", "Aksi"]
        for col_idx, h in enumerate(headers):
            lbl = ctk.CTkLabel(self.list_frame, text=h, font=ctk.CTkFont(weight="bold", size=12))
            lbl.grid(row=0, column=col_idx, padx=15, pady=5, sticky="w")

        for row_idx, m in enumerate(members):
            ctk.CTkLabel(self.list_frame, text=m['nis'], font=ctk.CTkFont(family="monospace")).grid(row=row_idx+1, column=0, padx=15, pady=3, sticky="w")
            ctk.CTkLabel(self.list_frame, text=m['nama'], font=ctk.CTkFont(weight="bold")).grid(row=row_idx+1, column=1, padx=15, pady=3, sticky="w")
            ctk.CTkLabel(self.list_frame, text=m['kelas']).grid(row=row_idx+1, column=2, padx=15, pady=3, sticky="w")
            ctk.CTkLabel(self.list_frame, text=m['jenis_kelamin']).grid(row=row_idx+1, column=3, padx=15, pady=3, sticky="w")
            ctk.CTkLabel(self.list_frame, text=m['nomor_hp'] or "-").grid(row=row_idx+1, column=4, padx=15, pady=3, sticky="w")
            ctk.CTkLabel(self.list_frame, text=m['barcode_anggota'], font=ctk.CTkFont(family="monospace")).grid(row=row_idx+1, column=5, padx=15, pady=3, sticky="w")

            # Actions
            act_box = ctk.CTkFrame(self.list_frame, fg_color="transparent")
            act_box.grid(row=row_idx+1, column=6, padx=15, pady=3, sticky="e")

            ctk.CTkButton(act_box, text="Edit", width=40, command=lambda memb=m: self.open_edit_dialog(memb)).pack(side="left", padx=2)
            ctk.CTkButton(act_box, text="Hapus", width=40, fg_color="#dc2626", hover_color="#991b1b", command=lambda n=m['nis']: self.delete_member(n)).pack(side="left", padx=2)
            ctk.CTkButton(act_box, text="Download Kartu JPG", width=125, fg_color="#4f46e5", hover_color="#4338ca", command=lambda nm=m['nama'], n=m['nis'], kl=m['kelas'], bc=m['barcode_anggota']: self.print_card(nm, n, kl, bc)).pack(side="left", padx=2)

    def delete_member(self, nis):
        if self.controller.active_user['role'] != 'Administrator':
            messagebox.showerror("Akses Ditolak", "Hanya Administrator yang memiliki wewenang menghapus data anggota!")
            return
        if messagebox.askyesno("Hapus Anggota", f"Hapus anggota dengan NIS {nis}?"):
            if MemberModel.delete(nis):
                messagebox.showinfo("Sukses", "Data anggota berhasil dihapus.")
                self.load_members()
            else:
                messagebox.showerror("Error", "Gagal menghapus anggota.")

    def print_card(self, nama, nis, kelas, barcode):
        # Fetch actual member record to get foto path
        member = MemberModel.get_by_barcode(barcode)
        foto_path = member['foto'] if member else ""
        
        # Create output directories
        os.makedirs("cards", exist_ok=True)
        os.makedirs("cards/jpg", exist_ok=True)
        
        # Define paths
        # Format filename: NamaAnggota_NIS.jpg
        jpg_path = f"cards/jpg/{nama}_{nis}.jpg"
        
        # Generate card JPG with embedded QR Code
        try:
            BarcodeGenerator.generate_member_card_jpg(nis, nama, kelas, barcode, foto_path, jpg_path)
            messagebox.showinfo("Download Kartu JPG", f"Kartu Anggota untuk {nama} (NIS: {nis}) berhasil diunduh!\n\nSimpan ke: {jpg_path}")
        except Exception as e:
            messagebox.showerror("Error", f"Gagal mengunduh Kartu Anggota: {e}")

    def open_add_dialog(self):
        self.open_member_form(None)

    def open_edit_dialog(self, member):
        self.open_member_form(member)

    def open_member_form(self, member_data=None):
        dialog = ctk.CTkToplevel(self)
        dialog.title("Form Data Anggota")
        dialog.geometry("400x580")
        dialog.transient(self)
        dialog.grab_set()

        ctk.CTkLabel(dialog, text="FORM DATA ANGGOTA SISWA", font=ctk.CTkFont(size=16, weight="bold")).pack(pady=15)

        frame = ctk.CTkFrame(dialog, fg_color="transparent")
        frame.pack(fill="both", expand=True, padx=20, pady=5)

        # Fields
        lbl_nis = ctk.CTkLabel(frame, text="NIS (Nomor Induk Siswa) *")
        lbl_nis.pack(anchor="w")
        ent_nis = ctk.CTkEntry(frame, placeholder_text="2026001")
        ent_nis.pack(fill="x", pady=(0, 10))
        if member_data:
            ent_nis.insert(0, member_data['nis'])
            ent_nis.configure(state="disabled")

        lbl_nama = ctk.CTkLabel(frame, text="Nama Lengkap Siswa *")
        lbl_nama.pack(anchor="w")
        ent_nama = ctk.CTkEntry(frame, placeholder_text="Budi Santoso")
        ent_nama.pack(fill="x", pady=(0, 10))
        if member_data:
            ent_nama.insert(0, member_data['nama'])

        lbl_kelas = ctk.CTkLabel(frame, text="Kelas *")
        lbl_kelas.pack(anchor="w")
        ent_kelas = ctk.CTkEntry(frame, placeholder_text="X-IPA-1")
        ent_kelas.pack(fill="x", pady=(0, 10))
        if member_data:
            ent_kelas.insert(0, member_data['kelas'])

        lbl_gender = ctk.CTkLabel(frame, text="Jenis Kelamin")
        lbl_gender.pack(anchor="w")
        cmb_gender = ctk.CTkComboBox(frame, values=["Laki-laki", "Perempuan"])
        cmb_gender.pack(fill="x", pady=(0, 10))
        if member_data:
            cmb_gender.set(member_data['jenis_kelamin'])

        lbl_phone = ctk.CTkLabel(frame, text="No. HP")
        lbl_phone.pack(anchor="w")
        ent_phone = ctk.CTkEntry(frame, placeholder_text="081234567890")
        ent_phone.pack(fill="x", pady=(0, 10))
        if member_data:
            ent_phone.insert(0, member_data['nomor_hp'] or "")

        lbl_alamat = ctk.CTkLabel(frame, text="Alamat")
        lbl_alamat.pack(anchor="w")
        ent_alamat = ctk.CTkEntry(frame, placeholder_text="Jl. Pemuda No. 12")
        ent_alamat.pack(fill="x", pady=(0, 10))
        if member_data:
            ent_alamat.insert(0, member_data['alamat'] or "")

        lbl_foto = ctk.CTkLabel(frame, text="Foto Anggota (Lokal)")
        lbl_foto.pack(anchor="w")
        foto_row = ctk.CTkFrame(frame, fg_color="transparent")
        foto_row.pack(fill="x", pady=(0, 10))
        ent_foto = ctk.CTkEntry(foto_row, placeholder_text="Path file foto (.jpg, .png)...")
        ent_foto.pack(side="left", fill="x", expand=True, padx=(0, 5))
        if member_data:
            ent_foto.insert(0, member_data['foto'] or "")

        def browse_foto():
            fp = filedialog.askopenfilename(filetypes=[("Image Files", "*.png;*.jpg;*.jpeg")])
            if fp:
                ent_foto.delete(0, "end")
                ent_foto.insert(0, fp)

        btn_browse = ctk.CTkButton(foto_row, text="Pilih", width=50, command=browse_foto)
        btn_browse.pack(side="right")

        def save():
            nis = ent_nis.get().strip()
            nama = ent_nama.get().strip()
            kelas = ent_kelas.get().strip()
            gender = cmb_gender.get()
            phone = ent_phone.get().strip()
            alamat = ent_alamat.get().strip()
            foto = ent_foto.get().strip()

            if not nis or not nama or not kelas:
                messagebox.showerror("Error", "Isi seluruh kolom bertanda wajib (*)")
                return

            barcode = f"M{nis}"

            if member_data:
                success = MemberModel.update(nis, nama, kelas, gender, alamat, phone, foto, barcode)
            else:
                success = MemberModel.add(nis, nama, kelas, gender, alamat, phone, foto, barcode)

            if success:
                messagebox.showinfo("Sukses", "Data anggota berhasil disimpan!")
                self.load_members()
                dialog.destroy()
            else:
                messagebox.showerror("Error", "Gagal menyimpan data anggota. NIS atau Barcode mungkin duplikat.")

        btn_save = ctk.CTkButton(dialog, text="Registrasi", command=save)
        btn_save.pack(pady=15)

    def export_excel(self):
        filepath = filedialog.asksaveasfilename(defaultextension=".xlsx", filetypes=[("Excel Files", "*.xlsx")])
        if not filepath:
            return

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Daftar Anggota"

        headers = ["NIS", "Nama Lengkap", "Kelas", "Jenis Kelamin", "Alamat", "No. HP", "Barcode ID"]
        ws.append(headers)

        members = MemberModel.get_all()
        for m in members:
            ws.append([
                m['nis'], m['nama'], m['kelas'], m['jenis_kelamin'], m['alamat'], m['nomor_hp'], m['barcode_anggota']
            ])

        wb.save(filepath)
        messagebox.showinfo("Ekspor Excel", f"Data anggota berhasil diekspor ke {filepath}")

    def import_excel(self):
        filepath = filedialog.askopenfilename(filetypes=[("Excel Files", "*.xlsx")])
        if not filepath:
            return

        try:
            wb = openpyxl.load_workbook(filepath)
            ws = wb.active
            rows = list(ws.rows)
            if len(rows) <= 1:
                messagebox.showerror("Error", "Berkas Excel kosong!")
                return

            conn = get_connection()
            cursor = conn.cursor()
            imported = 0

            for r in rows[1:]:
                vals = [cell.value for cell in r]
                if len(vals) < 3 or not vals[0]: continue
                
                # Check duplicate
                cursor.execute("SELECT COUNT(*) FROM anggota WHERE nis = ?;", (str(vals[0]).strip(),))
                if cursor.fetchone()[0] > 0: continue

                nis_str = str(vals[0]).strip()
                cursor.execute("""
                INSERT INTO anggota (nis, nama, kelas, jenis_kelamin, alamat, nomor_hp, barcode_anggota)
                VALUES (?, ?, ?, ?, ?, ?, ?);
                """, (
                    nis_str,
                    str(vals[1] or 'Nama').strip(),
                    str(vals[2] or 'Kelas').strip(),
                    str(vals[3] or 'Laki-laki').strip(),
                    str(vals[4] or 'Alamat').strip(),
                    str(vals[5] or '').strip(),
                    f"M{nis_str}"
                ))
                imported += 1

            conn.commit()
            conn.close()
            messagebox.showinfo("Impor Berhasil", f"Berhasil mengimpor {imported} anggota baru.")
            self.load_members()
        except Exception as e:
            messagebox.showerror("Error Impor", f"Gagal membaca Excel: {e}")
