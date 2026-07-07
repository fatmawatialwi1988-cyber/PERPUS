from PIL import Image, ImageDraw, ImageFont
import os
from database.db import get_connection

# Code 128 Character Width Patterns (0 to 106)
# Each pattern represents 6 widths of alternating bars and spaces, except 106 (Stop) which has 7.
CODE128_PATTERNS = [
    "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", # 0-9
    "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", # 10-19
    "221231", "213212", "223112", "312131", "311222", "311123", "311321", "321122", "321221", "312212", # 20-29
    "322112", "322211", "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", # 30-39
    "132311", "211313", "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", # 40-49
    "313121", "211331", "231131", "213113", "213311", "213131", "311132", "311312", "331112", "312113", # 50-59
    "312311", "332111", "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", # 60-69
    "141221", "112214", "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", # 70-79
    "241112", "134111", "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", # 80-89
    "421211", "212141", "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", # 90-99
    "411311", "113141", "114131", "311141", "411131", "211412", "211214", "211232", "2331112" # 100-106
]

class BarcodeGenerator:
    @staticmethod
    def encode_code128(text):
        """Mengkodekan teks ASCII ke dalam representasi modul Code 128 Set B.
        Mengembalikan string berisi '1' (batang) dan '0' (spasi).
        """
        # Start B is index 104
        start_val = 104
        encoded_vals = [start_val]
        
        # Encode each character in Set B (ASCII 32 to 127)
        for char in text:
            val = ord(char) - 32
            if 0 <= val <= 95:
                encoded_vals.append(val)
            else:
                # Fallback for non-printable chars
                encoded_vals.append(0)
                
        # Calculate checksum: (start_val + sum(i * val)) % 103
        checksum = start_val
        for idx, val in enumerate(encoded_vals[1:], start=1):
            checksum += idx * val
        checksum = checksum % 103
        encoded_vals.append(checksum)
        
        # Stop character is index 106
        encoded_vals.append(106)
        
        # Convert values to modules ('1' and '0')
        modules = []
        for val in encoded_vals:
            pattern = CODE128_PATTERNS[val]
            is_bar = True
            for char_width in pattern:
                width = int(char_width)
                modules.append(("1" if is_bar else "0") * width)
                is_bar = not is_bar
                
        return "".join(modules)

    @staticmethod
    def generate_code128_image(text, height=100, module_width=2, quiet_zone=15):
        """Menghasilkan PIL Image dari barcode Code 128 yang valid dan terbaca oleh scanner."""
        modules = BarcodeGenerator.encode_code128(text)
        
        # Calculate image dimensions
        img_width = len(modules) * module_width + (quiet_zone * 2)
        img_height = height + 30 # space for text at bottom
        
        img = Image.new("RGB", (img_width, img_height), "white")
        draw = ImageDraw.Draw(img)
        
        # Draw bars
        x = quiet_zone
        for mod in modules:
            if mod == "1":
                draw.rectangle([x, 10, x + module_width - 1, height], fill="black")
            x += module_width
            
        # Draw text at the bottom
        try:
            font = ImageFont.load_default()
        except:
            font = None
            
        text_str = str(text)
        text_x = img_width // 2 - (len(text_str) * 4)
        draw.text((text_x, height + 5), text_str, fill="black", font=font)
        
        return img

    @staticmethod
    def generate_code128(text, filename="barcode.png"):
        """Fungsi pembantu untuk menghasilkan barcode Code 128 sederhana dan menyimpannya."""
        img = BarcodeGenerator.generate_code128_image(text, height=70, module_width=2)
        os.makedirs(os.path.dirname(filename) or ".", exist_ok=True)
        img.save(filename)
        return filename

    @staticmethod
    def get_school_settings():
        """Mendapatkan data pengaturan sekolah dari database."""
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT key, value FROM pengaturan;")
            rows = cursor.fetchall()
            conn.close()
            return {r['key']: r['value'] for r in rows}
        except Exception as e:
            print("Gagal mengambil pengaturan sekolah:", e)
            return {
                'nama_sekolah': 'SMA Negeri 1 Jaya Raya',
                'logo_sekolah': '',
                'alamat': 'Jl. Pendidikan No. 1, Jakarta',
                'telepon': '(021) 7654321',
                'lama_pinjam': '7',
                'denda_per_hari': '2000'
            }

    @staticmethod
    def generate_book_barcode_jpg(kode_buku, judul, isbn, filepath):
        """Menghasilkan file barcode buku JPG resolusi tinggi (300 DPI) untuk dicetak.
        Berisi judul, kode, ISBN, dan visual barcode Code 128 yang presisi.
        """
        # Canvas size for 300 DPI book label (approx 3" x 1.5" -> 900 x 450 pixels)
        width = 900
        height = 450
        
        img = Image.new("RGB", (width, height), "white")
        draw = ImageDraw.Draw(img)
        
        # Outer border
        draw.rectangle([10, 10, width - 11, height - 11], outline="black", width=4)
        
        # Draw header brand
        settings = BarcodeGenerator.get_school_settings()
        nama_perpus = "PERPUSTAKAAN " + settings.get('nama_sekolah', 'SMA NEGERI 1 JAYA RAYA').upper()
        
        try:
            # Fallback font loaders
            font_title = ImageFont.load_default()
            font_sub = ImageFont.load_default()
            font_bold = ImageFont.load_default()
        except:
            font_title = font_sub = font_bold = None
            
        # Draw Title
        draw.text((width // 2 - 180, 30), nama_perpus[:45], fill="navy", font=font_title)
        draw.line([30, 65, width - 30, 65], fill="gray", width=2)
        
        # Book Info
        draw.text((40, 85), f"JUDUL BUKU :", fill="black", font=font_bold)
        judul_display = judul[:40] + ("..." if len(judul) > 40 else "")
        draw.text((180, 85), judul_display, fill="black", font=font_title)
        
        draw.text((40, 120), f"ISBN       :", fill="black", font=font_bold)
        draw.text((180, 120), isbn, fill="black", font=font_title)
        
        draw.text((40, 155), f"KODE BUKU  :", fill="black", font=font_bold)
        draw.text((180, 155), kode_buku, fill="black", font=font_title)
        
        # Generate raw barcode image
        barcode_img = BarcodeGenerator.generate_code128_image(kode_buku, height=150, module_width=4)
        barcode_img = barcode_img.resize((700, 200), Image.Resampling.LANCZOS)
        
        # Paste barcode
        img.paste(barcode_img, (100, 200))
        
        # Save output
        os.makedirs(os.path.dirname(filepath) or ".", exist_ok=True)
        img.save(filepath, "JPEG", quality=100, dpi=(300, 300))
        return filepath

    @staticmethod
    def load_font_custom(font_name_or_path, size):
        """Membuka font TrueType dengan beberapa fallback untuk kestabilan di lintas OS."""
        for path in [
            font_name_or_path,
            f"/usr/share/fonts/truetype/dejavu/{font_name_or_path}.ttf",
            f"/usr/share/fonts/truetype/liberation/{font_name_or_path}.ttf",
            f"/usr/share/fonts/truetype/freefont/{font_name_or_path}.ttf",
            "C:\\Windows\\Fonts\\" + font_name_or_path + ".ttf",
            "/Library/Fonts/" + font_name_or_path + ".ttf",
            "/System/Library/Fonts/Supplemental/" + font_name_or_path + ".ttf"
        ]:
            try:
                return ImageFont.truetype(path, size)
            except IOError:
                continue
        return ImageFont.load_default()

    @staticmethod
    def generate_qr_code_image(text, size=220):
        """Menghasilkan PIL Image dari QR Code berdasarkan data teks."""
        try:
            import qrcode
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_M,
                box_size=10,
                border=1,
            )
            qr.add_data(text)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
            return img.resize((size, size), Image.Resampling.LANCZOS)
        except Exception as e:
            print("Gagal generate QR Code menggunakan library 'qrcode', membuat QR sederhana:", e)
            img = Image.new("RGB", (size, size), "white")
            draw = ImageDraw.Draw(img)
            for x_offset, y_offset in [(10, 10), (size-60, 10), (10, size-60)]:
                draw.rectangle([x_offset, y_offset, x_offset+50, y_offset+50], fill="black")
                draw.rectangle([x_offset+10, y_offset+10, x_offset+40, y_offset+40], fill="white")
                draw.rectangle([x_offset+18, y_offset+18, x_offset+32, y_offset+32], fill="black")
            import random
            random.seed(hash(text))
            for i in range(20, size-20, 8):
                for j in range(20, size-20, 8):
                    if (i < 65 and j < 65) or (i > size-65 and j < 65) or (i < 65 and j > size-65):
                        continue
                    if random.choice([True, False]):
                        draw.rectangle([i, j, i+6, j+6], fill="black")
            return img

    @staticmethod
    def generate_member_card_jpg(nis, nama, kelas, barcode_id, foto_path, filepath):
        """Menghasilkan Kartu Anggota Perpustakaan JPG berkualitas tinggi dengan format standar CR80.
        Berisi nama sekolah, nama perpus, foto, QR Code, dan detail anggota yang crisp.
        """
        # CR80 standard dimensions at 300 DPI: 1012 x 638 pixels
        width = 1012
        height = 638
        
        img = Image.new("RGB", (width, height), "#f8fafc") # slate off-white background
        draw = ImageDraw.Draw(img)
        
        # Load School Settings
        settings = BarcodeGenerator.get_school_settings()
        school_name = settings.get('nama_sekolah', 'SMA NEGERI 1 JAYA RAYA').upper()
        perpus_name = settings.get('nama_perpustakaan', 'PERPUSTAKAAN SEKOLAH')
        if not perpus_name or perpus_name == 'PERPUSTAKAAN SEKOLAH':
            perpus_name = "PERPUSTAKAAN " + school_name
        perpus_name = perpus_name.upper()
        address_text = settings.get('alamat', 'Jl. Pendidikan No. 1, Jakarta')
        
        # Draw deep blue top header
        draw.rectangle([0, 0, width, 150], fill="#1e3a8a") # deep navy header
        draw.rectangle([0, 150, width, 158], fill="#d97706") # yellow/gold accent bar
        
        # Outer card boundary border
        draw.rectangle([0, 0, width - 1, height - 1], outline="#cbd5e1", width=2)
        
        # Draw School Logo
        logo_drawn = False
        logo_path = settings.get('logo_sekolah', '')
        if logo_path and os.path.exists(logo_path):
            try:
                logo_img = Image.open(logo_path).convert("RGBA")
                logo_img = logo_img.resize((100, 100), Image.Resampling.LANCZOS)
                img.paste(logo_img, (40, 25), logo_img)
                logo_drawn = True
            except Exception as e:
                print("Error loading school logo:", e)
                
        if not logo_drawn:
            # Draw beautiful custom vector logo placeholder
            draw.ellipse([40, 25, 140, 125], fill="#10b981", outline="white", width=3) # green ring
            draw.polygon([(90, 45), (75, 85), (105, 85)], fill="#f59e0b") # fire torch
            draw.rectangle([86, 85, 94, 105], fill="#cbd5e1") # handle
            
        # Fonts
        font_school = BarcodeGenerator.load_font_custom("DejaVuSans-Bold", 32)
        font_perpus = BarcodeGenerator.load_font_custom("DejaVuSans-Bold", 24)
        font_address = BarcodeGenerator.load_font_custom("DejaVuSans", 16)
        
        font_label = BarcodeGenerator.load_font_custom("DejaVuSans-Bold", 14)
        font_value = BarcodeGenerator.load_font_custom("DejaVuSans", 20)
        font_value_bold = BarcodeGenerator.load_font_custom("DejaVuSans-Bold", 20)
        
        # Draw School Title Info
        draw.text((160, 25), school_name[:42], fill="white", font=font_school)
        draw.text((160, 70), perpus_name[:50], fill="#fef08a", font=font_perpus) # yellow gold
        draw.text((160, 110), address_text[:75], fill="#e2e8f0", font=font_address) # light gray
        
        # Member Photo Box (Left Side)
        photo_x = 50
        photo_y = 190
        photo_w = 210
        photo_h = 280
        
        # Gray border box for photo
        draw.rectangle([photo_x - 3, photo_y - 3, photo_x + photo_w + 2, photo_y + photo_h + 2], outline="#cbd5e1", width=3)
        
        photo_loaded = False
        if foto_path and os.path.exists(foto_path):
            try:
                memb_photo = Image.open(foto_path)
                memb_photo = memb_photo.resize((photo_w, photo_h), Image.Resampling.LANCZOS)
                img.paste(memb_photo, (photo_x, photo_y))
                photo_loaded = True
            except Exception as e:
                print("Error loading member photo:", e)
                
        if not photo_loaded:
            # Draw beautiful vector placeholder avatar
            draw.rectangle([photo_x, photo_y, photo_x + photo_w, photo_y + photo_h], fill="#f1f5f9")
            draw.ellipse([photo_x + 55, photo_y + 60, photo_x + 155, photo_y + 160], fill="#cbd5e1") # head
            draw.ellipse([photo_x + 15, photo_y + 195, photo_x + 195, photo_y + 320], fill="#cbd5e1") # body
            
        # Member details (Middle Column)
        details_x = 290
        
        rows = [
            ("NAMA LENGKAP", nama.upper(), True),
            ("NOMOR ANGGOTA", barcode_id, True),
            ("NIS", nis, False),
            ("KELAS", kelas.upper(), False),
            ("TAHUN AJARAN", "2026/2027", False)
        ]
        
        curr_y = 190
        for label, val, is_important in rows:
            draw.text((details_x, curr_y), label, fill="#64748b", font=font_label)
            font_v = font_value_bold if is_important else font_value
            draw.text((details_x, curr_y + 22), val, fill="#0f172a", font=font_v)
            curr_y += 65
            
        # Paste QR Code on the Right side
        qr_size = 220
        qr_x = 730
        qr_y = 210
        
        # Generate and paste QR code
        qr_img = BarcodeGenerator.generate_qr_code_image(barcode_id, size=qr_size)
        
        # Draw soft card container around QR code
        draw.rectangle([qr_x - 10, qr_y - 10, qr_x + qr_size + 10, qr_y + qr_size + 10], outline="#e2e8f0", width=2)
        img.paste(qr_img, (qr_x, qr_y))
        
        # Draw "PINDAI KARTU" label centered below the QR code
        qr_label = "PINDAI KARTU"
        font_qr_label = BarcodeGenerator.load_font_custom("DejaVuSans-Bold", 14)
        
        # Simple center alignment calculation
        # Each char is roughly 9 pixels wide at font size 14
        text_w = len(qr_label) * 9
        label_x = qr_x + (qr_size // 2) - (text_w // 2)
        draw.text((label_x, qr_y + qr_size + 20), qr_label, fill="#475569", font=font_qr_label)
        
        # Add decorative footer accent line
        draw.rectangle([0, height - 12, width, height], fill="#1e3a8a")
        
        # Save output
        os.makedirs(os.path.dirname(filepath) or ".", exist_ok=True)
        img.save(filepath, "JPEG", quality=100, dpi=(300, 300))
        return filepath

