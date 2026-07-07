import customtkinter as ctk
from database.db import get_connection, DB_NAME
from tkinter import filedialog, messagebox
import shutil
import os

class SettingsFrame(ctk.CTkFrame):
    def __init__(self, parent, controller):
        super().__init__(parent)
        self.controller = controller

        # Layout configuration (Two columns for a wider 1080x680 screen)
        self.grid_columnconfigure(0, weight=1)
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(2, weight=1)

        # Title
        self.header = ctk.CTkLabel(self, text="PENGATURAN & PEMELIHARAAN SISTEM", font=ctk.CTkFont(size=20, weight="bold"))
        self.header.grid(row=0, column=0, columnspan=2, padx=20, pady=15, sticky="w")

        # 1. Configuration Panel (Left Column, Top)
        self.config_panel = ctk.CTkFrame(self, border_width=1, border_color="#e2e8f0")
        self.config_panel.grid(row=1, column=0, padx=(20, 10), pady=10, sticky="nsew")

        ctk.CTkLabel(self.config_panel, text="Konfigurasi Aturan Perpustakaan", font=ctk.CTkFont(size=14, weight="bold")).grid(row=0, column=0, columnspan=2, padx=15, pady=10, sticky="w")

        # School Name Entry
        ctk.CTkLabel(self.config_panel, text="Nama Sekolah / Perpustakaan:").grid(row=1, column=0, padx=15, pady=5, sticky="w")
        self.ent_nama = ctk.CTkEntry(self.config_panel, width=250)
        self.ent_nama.grid(row=1, column=1, padx=15, pady=5, sticky="w")

        # Phone Number
        ctk.CTkLabel(self.config_panel, text="No. Telepon Instansi:").grid(row=2, column=0, padx=15, pady=5, sticky="w")
        self.ent_telp = ctk.CTkEntry(self.config_panel, width=250)
        self.ent_telp.grid(row=2, column=1, padx=15, pady=5, sticky="w")

        # Default checkout duration
        ctk.CTkLabel(self.config_panel, text="Batas Lama Pinjam Default (Hari):").grid(row=3, column=0, padx=15, pady=5, sticky="w")
        self.ent_dur = ctk.CTkEntry(self.config_panel, width=100)
        self.ent_dur.grid(row=3, column=1, padx=15, pady=5, sticky="w")

        # Late fee rate per day
        ctk.CTkLabel(self.config_panel, text="Denda Keterlambatan per Hari (Rp):").grid(row=4, column=0, padx=15, pady=5, sticky="w")
        self.ent_denda = ctk.CTkEntry(self.config_panel, width=100)
        self.ent_denda.grid(row=4, column=1, padx=15, pady=5, sticky="w")

        # Save Configuration Button
        self.btn_save = ctk.CTkButton(self.config_panel, text="Simpan Konfigurasi", command=self.save_settings, fg_color="#2563eb", hover_color="#1d4ed8")
        self.btn_save.grid(row=5, column=1, padx=15, pady=15, sticky="e")

        # 2. Database Backup and Restore Operations (Left Column, Bottom)
        self.db_panel = ctk.CTkFrame(self, border_width=1, border_color="#e2e8f0")
        self.db_panel.grid(row=2, column=0, padx=(20, 10), pady=10, sticky="nsew")

        ctk.CTkLabel(self.db_panel, text="Pemeliharaan Database SQLite Lokal", font=ctk.CTkFont(size=14, weight="bold")).grid(row=0, column=0, columnspan=2, padx=15, pady=10, sticky="w")

        # Backup DB
        self.btn_backup = ctk.CTkButton(self.db_panel, text="Cadangkan Database (.db)", command=self.backup_db, fg_color="#4f46e5", hover_color="#4338ca")
        self.btn_backup.grid(row=1, column=0, padx=15, pady=10, sticky="w")

        # Restore DB
        self.btn_restore = ctk.CTkButton(self.db_panel, text="Pulihkan Database Backup", command=self.restore_db, fg_color="#10b981", hover_color="#059669")
        self.btn_restore.grid(row=1, column=1, padx=15, pady=10, sticky="w")

        # Note about offline
        self.lbl_note = ctk.CTkLabel(self.db_panel, text="* Seluruh data disimpan secara lokal di library.db pada direktori aplikasi.", font=ctk.CTkFont(size=11), text_color="gray")
        self.lbl_note.grid(row=2, column=0, columnspan=2, padx=15, pady=10, sticky="w")

        # 3. User Management Panel (Right Column, spans both rows)
        self.user_panel = ctk.CTkFrame(self, border_width=1, border_color="#e2e8f0")
        self.user_panel.grid(row=1, column=1, rowspan=2, padx=(10, 20), pady=10, sticky="nsew")
        
        # Adjust weight for user panel inner layout
        self.user_panel.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(self.user_panel, text="Manajemen Akun Petugas & Admin", font=ctk.CTkFont(size=14, weight="bold")).pack(padx=15, pady=10, anchor="w")

        # Selector for user to edit
        ctk.CTkLabel(self.user_panel, text="Pilih Akun Pengguna untuk Diedit:").pack(padx=15, pady=(5, 2), anchor="w")
        self.cmb_user_select = ctk.CTkComboBox(self.user_panel, values=["admin", "petugas"], command=self.on_user_select)
        self.cmb_user_select.pack(fill="x", padx=15, pady=5)

        # Username Field (Primary Key - Non Editable)
        ctk.CTkLabel(self.user_panel, text="Username (ID Login):").pack(padx=15, pady=(5, 2), anchor="w")
        self.ent_user_username = ctk.CTkEntry(self.user_panel)
        self.ent_user_username.pack(fill="x", padx=15, pady=5)

        # Nama Lengkap Field
        ctk.CTkLabel(self.user_panel, text="Nama Lengkap / Tampilan:").pack(padx=15, pady=(5, 2), anchor="w")
        self.ent_user_nama = ctk.CTkEntry(self.user_panel)
        self.ent_user_nama.pack(fill="x", padx=15, pady=5)

        # Password Field
        ctk.CTkLabel(self.user_panel, text="Password Akun:").pack(padx=15, pady=(5, 2), anchor="w")
        self.ent_user_password = ctk.CTkEntry(self.user_panel, show="*")
        self.ent_user_password.pack(fill="x", padx=15, pady=5)

        # Role ComboBox
        ctk.CTkLabel(self.user_panel, text="Hak Akses (Role):").pack(padx=15, pady=(5, 2), anchor="w")
        self.cmb_user_role = ctk.CTkComboBox(self.user_panel, values=["Administrator", "Petugas"])
        self.cmb_user_role.pack(fill="x", padx=15, pady=5)

        # Save Button
        self.btn_save_user = ctk.CTkButton(self.user_panel, text="Simpan Perubahan Akun", command=self.save_user_changes, fg_color="#10b981", hover_color="#059669")
        self.btn_save_user.pack(fill="x", padx=15, pady=15)

        # Load initial settings and default user details
        self.load_settings()
        self.on_user_select("admin")

    def load_settings(self):
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT key, value FROM pengaturan;")
        rows = cursor.fetchall()
        conn.close()

        for r in rows:
            if r['key'] == 'nama_sekolah':
                self.ent_nama.delete(0, "end")
                self.ent_nama.insert(0, r['value'])
            elif r['key'] == 'telepon':
                self.ent_telp.delete(0, "end")
                self.ent_telp.insert(0, r['value'])
            elif r['key'] == 'lama_pinjam':
                self.ent_dur.delete(0, "end")
                self.ent_dur.insert(0, r['value'])
            elif r['key'] == 'denda_per_hari':
                self.ent_denda.delete(0, "end")
                self.ent_denda.insert(0, r['value'])

    def save_settings(self):
        nama = self.ent_nama.get().strip()
        telp = self.ent_telp.get().strip()
        dur = self.ent_dur.get().strip()
        denda = self.ent_denda.get().strip()

        if not nama or not dur or not denda:
            messagebox.showerror("Error", "Semua kolom kecuali telepon wajib diisi!")
            return

        conn = get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("UPDATE pengaturan SET value = ? WHERE key = 'nama_sekolah';", (nama,))
            cursor.execute("UPDATE pengaturan SET value = ? WHERE key = 'telepon';", (telp,))
            cursor.execute("UPDATE pengaturan SET value = ? WHERE key = 'lama_pinjam';", (dur,))
            cursor.execute("UPDATE pengaturan SET value = ? WHERE key = 'denda_per_hari';", (denda,))
            conn.commit()
            messagebox.showinfo("Sukses", "Konfigurasi sekolah berhasil diperbarui.")
        except Exception as e:
            messagebox.showerror("Error", f"Gagal memperbarui pengaturan: {e}")
        finally:
            conn.close()

    def backup_db(self):
        if not os.path.exists(DB_NAME):
            messagebox.showerror("Error", "Database utama belum terbentuk!")
            return

        filepath = filedialog.asksaveasfilename(defaultextension=".db", filetypes=[("SQLite DB Files", "*.db")])
        if not filepath:
            return

        try:
            shutil.copy(DB_NAME, filepath)
            messagebox.showinfo("Backup Selesai", f"Database berhasil dicadangkan ke:\n{filepath}")
        except Exception as e:
            messagebox.showerror("Gagal Backup", f"Gagal mencadangkan berkas database: {e}")

    def restore_db(self):
        if self.controller.active_user['role'] != 'Administrator':
            messagebox.showerror("Akses Ditolak", "Hanya Administrator yang diperbolehkan memulihkan database!")
            return

        filepath = filedialog.askopenfilename(filetypes=[("SQLite DB Files", "*.db")])
        if not filepath:
            return

        if messagebox.askyesno("Restore Database", "Apakah Anda yakin ingin menimpa seluruh database aktif saat ini dengan file backup pilihan Anda?"):
            try:
                # Close connection, overwrite and force restart simulation
                shutil.copy(filepath, DB_NAME)
                messagebox.showinfo("Restore Sukses", "Database berhasil dipulihkan dari file backup! Silakan muat ulang aplikasi.")
            except Exception as e:
                messagebox.showerror("Gagal Restore", f"Gagal memulihkan database: {e}")

    def on_user_select(self, username):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM user WHERE username = ?;", (username,))
        row = cursor.fetchone()
        conn.close()

        if row:
            self.ent_user_username.configure(state="normal")
            self.ent_user_username.delete(0, "end")
            self.ent_user_username.insert(0, row['username'])
            self.ent_user_username.configure(state="disabled")

            self.ent_user_nama.delete(0, "end")
            self.ent_user_nama.insert(0, row['nama'])

            self.ent_user_password.delete(0, "end")
            self.ent_user_password.insert(0, row['password'])

            self.cmb_user_role.set(row['role'])

    def save_user_changes(self):
        username = self.cmb_user_select.get()
        nama = self.ent_user_nama.get().strip()
        password = self.ent_user_password.get().strip()
        role = self.cmb_user_role.get()

        if not nama or not password:
            messagebox.showerror("Error", "Nama Lengkap dan Password tidak boleh kosong!")
            return

        conn = get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("""
                UPDATE user 
                SET nama = ?, password = ?, role = ? 
                WHERE username = ?;
            """, (nama, password, role, username))
            conn.commit()
            messagebox.showinfo("Sukses", f"Akun pengguna '{username}' berhasil diperbarui.")
            
            # If the edited user is the current active session user, update the controller's active_user info too!
            if self.controller.active_user and self.controller.active_user['username'] == username:
                self.controller.active_user['nama'] = nama
                self.controller.active_user['role'] = role
                
                if role != self.controller.active_user['role']:
                    messagebox.showinfo("Hak Akses Berubah", "Perubahan hak akses Anda terdeteksi. Silakan masuk ulang untuk menyesuaikan hak akses.")
                    self.controller.show_login_screen()
                
        except Exception as e:
            messagebox.showerror("Error", f"Gagal memperbarui akun pengguna: {e}")
        finally:
            conn.close()
