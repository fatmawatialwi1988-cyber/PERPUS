import cv2
from PIL import Image, ImageTk

try:
    from pyzbar import pyzbar
    PYZBAR_AVAILABLE = True
except ImportError:
    PYZBAR_AVAILABLE = False
    print("Pyzbar tidak ditemukan. Deteksi kamera dijalankan dalam mode simulasi.")

class BarcodeScanner:
    def __init__(self, camera_idx=0):
        self.camera_idx = camera_idx
        self.cap = None
        self.is_running = False

    def start(self):
        self.cap = cv2.VideoCapture(self.camera_idx)
        if not self.cap.isOpened():
            print("Gagal membuka kamera.")
            return False
        self.is_running = True
        return True

    def stop(self):
        self.is_running = False
        if self.cap:
            self.cap.release()
            self.cap = None

    def get_frame(self):
        """Membaca frame dari kamera, mencari barcode, dan mengembalikan (PhotoTkImage, DecodedString)."""
        if not self.is_running or not self.cap:
            return None, None

        ret, frame = self.cap.read()
        if not ret:
            return None, None

        # Mirror frame
        frame = cv2.flip(frame, 1)
        decoded_text = None

        # Detect and decode barcode if Pyzbar is available
        if PYZBAR_AVAILABLE:
            barcodes = pyzbar.decode(frame)
            for barcode in barcodes:
                decoded_text = barcode.data.decode("utf-8")
                # Draw boundary rectangle around barcode
                (x, y, w, h) = barcode.rect
                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
                cv2.putText(frame, decoded_text, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
                break  # scan first match and return

        # Draw decorative laser scope overlay
        h, w, _ = frame.shape
        cv2.line(frame, (10, h // 2), (w - 10, h // 2), (0, 0, 255), 1)  # Laser line
        cv2.rectangle(frame, (w // 4, h // 4), (3 * w // 4, 3 * h // 4), (255, 0, 0), 2)  # Target box

        # Convert image to RGB PIL -> ImageTk format
        cv2_img = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        pil_img = Image.fromarray(cv2_img)
        # Resize to fit scanner container (e.g., 320x240)
        pil_img = pil_img.resize((320, 240), Image.Resampling.LANCZOS)
        tk_img = ImageTk.PhotoImage(image=pil_img)

        return tk_img, decoded_text
