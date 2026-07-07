import customtkinter as ctk
from database.db import get_connection
import datetime

class DashboardFrame(ctk.CTkFrame):
    def __init__(self, parent, controller):
        super().__init__(parent)
        self.controller = controller
        
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(2, weight=1)

        # Header Title
        self.header = ctk.CTkLabel(self, text="DASHBOARD UTAMA PERPUSTAKAAN", font=ctk.CTkFont(size=20, weight="bold"))
        self.header.grid(row=0, column=0, padx=20, pady=15, sticky="w")

        # 1. Cards Container
        self.cards_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.cards_frame.grid(row=1, column=0, padx=20, pady=10, sticky="ew")
        for i in range(5):
            self.cards_frame.grid_columnconfigure(i, weight=1)

        # 2. Tables/Charts Container
        self.data_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.data_frame.grid(row=2, column=0, padx=20, pady=10, sticky="nsew")
        self.data_frame.grid_columnconfigure(0, weight=2)
        self.data_frame.grid_columnconfigure(1, weight=1)
        self.data_frame.grid_rowconfigure(0, weight=1)

        self.refresh_dashboard()

    def refresh_dashboard(self):
        # Fetch metrics from SQLite
        conn = get_connection()
        cursor = conn.cursor()

        # Count total books and titles
        cursor.execute("SELECT SUM(jumlah_buku), COUNT(kode_buku) FROM buku;")
        books_sum, books_titles = cursor.fetchone()
        books_sum = books_sum or 0

        # Count total members
        cursor.execute("SELECT COUNT(*) FROM anggota;")
        members_cnt = cursor.fetchone()[0]

        # Count currently borrowed books
        cursor.execute("SELECT COUNT(*) FROM detail_peminjaman WHERE status = 'Dipinjam';")
        borrowed_cnt = cursor.fetchone()[0]

        # Count overdue books
        cursor.execute("""
        SELECT COUNT(*) FROM peminjaman p
        JOIN detail_peminjaman d ON p.id = d.peminjaman_id
        WHERE d.status = 'Dipinjam' AND p.tanggal_kembali < ?;
        """, (datetime.date.today().isoformat(),))
        overdue_cnt = cursor.fetchone()[0]

        # 10 latest transactions
        cursor.execute("""
        SELECT p.id, a.nama, p.tanggal_pinjam, p.tanggal_kembali, p.status 
        FROM peminjaman p
        JOIN anggota a ON p.nis = a.nis
        ORDER BY p.id DESC LIMIT 10;
        """)
        last_txs = cursor.fetchall()

        # Top 5 books
        cursor.execute("""
        SELECT b.judul, COUNT(d.kode_buku) as cnt 
        FROM detail_peminjaman d
        JOIN buku b ON d.kode_buku = b.kode_buku
        GROUP BY d.kode_buku ORDER BY cnt DESC LIMIT 5;
        """)
        top_books = cursor.fetchall()
        conn.close()

        # Render Metrics Cards
        self.create_card(0, "Jumlah Buku", str(books_sum), "#2563eb") # blue
        self.create_card(1, "Jumlah Judul", str(books_titles), "#4f46e5") # indigo
        self.create_card(2, "Jumlah Anggota", str(members_cnt), "#059669") # green
        self.create_card(3, "Buku Dipinjam", str(borrowed_cnt), "#d97706") # orange
        self.create_card(4, "Buku Terlambat", str(overdue_cnt), "#dc2626") # red

        # Table 1: Latest Transactions (Left)
        tx_card = ctk.CTkFrame(self.data_frame, border_width=1, border_color="#e2e8f0")
        tx_card.grid(row=0, column=0, padx=(0, 10), pady=0, sticky="nsew")
        tx_title = ctk.CTkLabel(tx_card, text="10 Transaksi Terakhir", font=ctk.CTkFont(size=14, weight="bold"))
        tx_title.pack(anchor="w", padx=15, pady=10)

        # Simple scrollable textbox listing latest txs
        tx_list = ctk.CTkTextbox(tx_card, height=300)
        tx_list.pack(fill="both", expand=True, padx=15, pady=10)
        tx_list.insert("end", f"{'ID':<6} | {'Nama Siswa':<22} | {'Tgl Pinjam':<12} | {'Tempo':<12} | {'Status'}\n")
        tx_list.insert("end", "-" * 70 + "\n")
        for tx in last_txs:
            tx_list.insert("end", f"#{tx['id']:<5} | {tx['nama'][:20]:<22} | {tx['tanggal_pinjam']:<12} | {tx['tanggal_kembali']:<12} | {tx['status']}\n")
        tx_list.configure(state="disabled")

        # Table 2: Top Popular Books (Right)
        pop_card = ctk.CTkFrame(self.data_frame, border_width=1, border_color="#e2e8f0")
        pop_card.grid(row=0, column=1, padx=(10, 0), pady=0, sticky="nsew")
        pop_title = ctk.CTkLabel(pop_card, text="Buku Terpopuler", font=ctk.CTkFont(size=14, weight="bold"))
        pop_title.pack(anchor="w", padx=15, pady=10)

        pop_list = ctk.CTkTextbox(pop_card, height=300)
        pop_list.pack(fill="both", expand=True, padx=15, pady=10)
        pop_list.insert("end", f"{'No':<4} | {'Judul Buku':<25} | {'Dipinjam'}\n")
        pop_list.insert("end", "-" * 40 + "\n")
        for idx, book in enumerate(top_books):
            pop_list.insert("end", f"{idx+1:<4} | {book['judul'][:22]:<25} | {book['cnt']}x\n")
        pop_list.configure(state="disabled")

    def create_card(self, col, title, value, color):
        card = ctk.CTkFrame(self.cards_frame, fg_color=color, corner_radius=12)
        card.grid(row=0, column=col, padx=5, pady=5, sticky="ew")
        
        lbl_title = ctk.CTkLabel(card, text=title, font=ctk.CTkFont(size=11), text_color="white")
        lbl_title.pack(pady=(12, 2))
        
        lbl_val = ctk.CTkLabel(card, text=value, font=ctk.CTkFont(size=24, weight="bold"), text_color="white")
        lbl_val.pack(pady=(0, 12))
