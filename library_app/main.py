import customtkinter as ctk
from database.db import init_db, get_connection
from ui.dashboard import DashboardFrame
from ui.books import BooksFrame
from ui.members import MembersFrame
from ui.borrow import BorrowFrame
from ui.return import ReturnFrame
from ui.reports import ReportsFrame
from ui.settings import SettingsFrame
from tkinter import messagebox
import os

# Set global appearance theme
ctk.set_appearance_mode("light") # Default light mode
ctk.set_default_color_theme("blue") # Blue color scheme

class LibraryDesktopApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("SISTEM INFORMASI PERPUSTAKAAN SEKOLAH - OFFLINE")
        self.geometry("1080x680")
        self.minsize(1000, 600)

        # Active Session state
        self.active_user = None

        # Container for screens/views
        self.container = ctk.CTkFrame(self)
        self.container.pack(side="top", fill="both", expand=True)
        self.container.grid_rowconfigure(0, weight=1)
        self.container.grid_columnconfigure(0, weight=1)

        # Dict mapping view names to frame instances
        self.frames = {}

        # Show login portal first
        self.show_login_screen()

    def show_login_screen(self):
        # Clear container
        for child in self.container.winfo_children():
            child.destroy()

        login_frame = ctk.CTkFrame(self.container, width=400, height=350, corner_radius=15, border_width=1, border_color="#e2e8f0")
        login_frame.place(relx=0.5, rely=0.5, anchor="center")

        ctk.CTkLabel(login_frame, text="SI PERPUS LOGIN PORTAL", font=ctk.CTkFont(size=18, weight="bold")).pack(pady=(25, 20))

        lbl_user = ctk.CTkLabel(login_frame, text="Username")
        lbl_user.pack(anchor="w", padx=40)
        ent_user = ctk.CTkEntry(login_frame, placeholder_text="Masukkan username...")
        ent_user.pack(fill="x", padx=40, pady=(0, 15))
        ent_user.insert(0, "admin") # default help

        lbl_pass = ctk.CTkLabel(login_frame, text="Password")
        lbl_pass.pack(anchor="w", padx=40)
        ent_pass = ctk.CTkEntry(login_frame, show="*", placeholder_text="Masukkan password...")
        ent_pass.pack(fill="x", padx=40, pady=(0, 20))
        ent_pass.insert(0, "admin123") # default help

        def authenticate():
            uname = ent_user.get().strip()
            upass = ent_pass.get().strip()

            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM user WHERE username = ? AND password = ?;", (uname, upass))
            user = cursor.fetchone()
            conn.close()

            if user:
                self.active_user = {
                    "username": user["username"],
                    "nama": user["nama"],
                    "role": user["role"]
                }
                messagebox.showinfo("Login Berhasil", f"Selamat datang kembali, {user['nama']} ({user['role']})!")
                self.show_main_app_shell()
            else:
                messagebox.showerror("Gagal Autentikasi", "Kombinasi Username dan Password Anda salah!")

        btn_login = ctk.CTkButton(login_frame, text="Masuk ke Sistem", command=authenticate, font=ctk.CTkFont(weight="bold"))
        btn_login.pack(fill="x", padx=40, pady=10)

        lbl_hint = ctk.CTkLabel(login_frame, text="Default Admin: admin / admin123\nDefault Petugas: petugas / petugas123", font=ctk.CTkFont(size=10), text_color="gray")
        lbl_hint.pack(pady=10)

    def show_main_app_shell(self):
        # Clear container
        for child in self.container.winfo_children():
            child.destroy()

        # Grid configuration for main shell: Column 0: Sidebar, Column 1: Main Viewport
        self.container.grid_columnconfigure(0, weight=0) # Sidebar does not stretch
        self.container.grid_columnconfigure(1, weight=1) # Main viewport stretches fully

        # 1. Sidebar Navigation panel (Left)
        sidebar = ctk.CTkFrame(self.container, width=220, fg_color="#0f172a", corner_radius=0)
        sidebar.grid(row=0, column=0, sticky="nsew")

        # School branding header
        lbl_logo = ctk.CTkLabel(sidebar, text="SI PERPUS LOKAL", text_color="white", font=ctk.CTkFont(size=15, weight="bold"))
        lbl_logo.pack(pady=(25, 2), padx=20, anchor="w")
        lbl_sub = ctk.CTkLabel(sidebar, text="Database SQLite Offline", text_color="#94a3b8", font=ctk.CTkFont(size=10))
        lbl_sub.pack(pady=(0, 20), padx=20, anchor="w")

        # List of pages and views
        pages = [
            ("🏠 Dashboard", DashboardFrame),
            ("📚 Data Buku", BooksFrame),
            ("👨‍🎓 Data Anggota", MembersFrame),
            ("📖 Peminjaman", BorrowFrame),
            ("🔄 Pengembalian", ReturnFrame),
            ("📊 Laporan", ReportsFrame),
            ("⚙️ Pengaturan", SettingsFrame)
        ]

        self.nav_buttons = {}

        # Viewport frame on the right side of sidebar
        self.viewport = ctk.CTkFrame(self.container, fg_color="transparent")
        self.viewport.grid(row=0, column=1, sticky="nsew", padx=15, pady=15)
        self.viewport.grid_rowconfigure(0, weight=1)
        self.viewport.grid_columnconfigure(0, weight=1)

        # Instantiate all frames in dictionary
        for name, frame_class in pages:
            frame = frame_class(parent=self.viewport, controller=self)
            self.frames[frame_class.__name__] = frame
            frame.grid(row=0, column=0, sticky="nsew")

        # Define navigation callback
        def show_frame(frame_name, btn_ref):
            # Select frame
            for f in self.frames.values():
                f.grid_remove()
            
            selected_frame = self.frames[frame_name]
            selected_frame.grid()
            
            # If dashboard or list frames, call refresh hooks
            if hasattr(selected_frame, "refresh_dashboard"):
                selected_frame.refresh_dashboard()
            elif hasattr(selected_frame, "load_books"):
                selected_frame.load_books()
            elif hasattr(selected_frame, "load_members"):
                selected_frame.load_members()
                
            # Update button highlights
            for btn in self.nav_buttons.values():
                btn.configure(fg_color="transparent", text_color="#94a3b8")
            btn_ref.configure(fg_color="#2563eb", text_color="white")

        # Render nav list
        for name, frame_class in pages:
            btn = ctk.CTkButton(
                sidebar, 
                text=name, 
                fg_color="transparent", 
                text_color="#94a3b8", 
                anchor="w", 
                height=35,
                corner_radius=8,
                font=ctk.CTkFont(size=12, weight="bold")
            )
            btn.pack(fill="x", padx=12, pady=3)
            # Bind navigation target
            btn.configure(command=lambda f=frame_class.__name__, b=btn: show_frame(f, b))
            self.nav_buttons[frame_class.__name__] = btn

        # Signout separator line and button
        ctk.CTkFrame(sidebar, height=1, fg_color="#1e293b").pack(fill="x", padx=15, pady=15)
        
        lbl_uname = ctk.CTkLabel(sidebar, text=f"User: {self.active_user['nama'][:18]}", text_color="#64748b", font=ctk.CTkFont(size=10, weight="bold"))
        lbl_uname.pack(padx=20, anchor="w")

        def logout():
            if messagebox.askyesno("Logout", "Apakah Anda yakin ingin keluar dari sistem?"):
                self.active_user = None
                self.frames.clear()
                self.nav_buttons.clear()
                self.show_login_screen()

        btn_logout = ctk.CTkButton(sidebar, text="🚪 Keluar Sistem", fg_color="transparent", text_color="#f87171", hover_color="#991b1b", anchor="w", command=logout, font=ctk.CTkFont(size=12, weight="bold"))
        btn_logout.pack(fill="x", padx=12, pady=5)

        # Auto select Dashboard Frame first on load
        first_btn = self.nav_buttons["DashboardFrame"]
        show_frame("DashboardFrame", first_btn)

if __name__ == "__main__":
    # Ensure all required directories exist
    required_dirs = [
        "reports",
        "cards",
        "cards/jpg",
        "cards/pdf",
        "barcodes",
        "barcodes/books",
        "barcodes/members",
        "exports",
        "backup"
    ]
    for d in required_dirs:
        os.makedirs(d, exist_ok=True)
    
    # Initialize SQLite database
    init_db()
    
    # Launch Desktop app
    app = LibraryDesktopApp()
    app.mainloop()
