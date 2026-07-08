import React, { useState, useRef, useEffect } from 'react';
import { Camera, User as UserIcon, BookOpen, Plus, Trash2, Calendar, ClipboardCheck, Play, Square, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { Buku, Anggota, Peminjaman, Pengaturan } from '../types';
import jsQR from 'jsqr';

interface BorrowProps {
  books: Buku[];
  members: Anggota[];
  borrows: Peminjaman[];
  settings: Pengaturan;
  onUpdateBooks: (books: Buku[]) => void;
  onUpdateBorrows: (borrows: Peminjaman[]) => void;
}

export const Borrow: React.FC<BorrowProps> = ({
  books,
  members,
  borrows,
  settings,
  onUpdateBooks,
  onUpdateBorrows,
}) => {
  const [selectedMember, setSelectedMember] = useState<Anggota | null>(null);
  const [memberBarcode, setMemberBarcode] = useState('');
  
  const [selectedBook, setSelectedBook] = useState<Buku | null>(null);
  const [bookBarcode, setBookBarcode] = useState('');

  // Cart list
  const [cart, setCart] = useState<{ book: Buku; days: number }[]>([]);

  // Camera Scanner simulation
  const [cameraActive, setCameraActive] = useState(false);
  const [scanType, setScanType] = useState<'member' | 'book' | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Overdue check for active member
  const checkMemberHasOverdue = (nis: string): boolean => {
    return borrows.some(b => {
      if (b.nis === nis && b.status === 'Terlambat') {
        return true;
      }
      return false;
    });
  };

  // Start Camera
  const startCamera = async (type: 'member' | 'book') => {
    setScanType(type);
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Kamera tidak dapat diakses atau diblokir. Mengaktifkan mode simulasi otomatis.", err);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    streamRef.current = null;
    setCameraActive(false);
    setScanType(null);
  };

  // Real-time QR Code scanning loop using jsQR
  useEffect(() => {
    let animationId: number;
    
    const scan = () => {
      if (cameraActive && videoRef.current) {
        const video = videoRef.current;
        
        // Ensure stream is bound and playing
        if (streamRef.current && video.srcObject !== streamRef.current) {
          video.srcObject = streamRef.current;
          video.play().catch(err => console.warn("Video play failed:", err));
        } else if (video.paused && streamRef.current) {
          video.play().catch(err => console.warn("Video play failed:", err));
        }

        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          // Create or reuse an off-screen canvas to process the video frame
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            // Decode the QR Code
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'attemptBoth',
            });
            
            if (code && code.data) {
              // Successfully decoded a QR code! Play beep audio feedback
              try {
                const context = new (window.AudioContext || (window as any).webkitAudioContext)();
                const osc = context.createOscillator();
                const gain = context.createGain();
                osc.connect(gain);
                gain.connect(context.destination);
                osc.frequency.setValueAtTime(800, context.currentTime);
                gain.gain.setValueAtTime(0.1, context.currentTime);
                osc.start();
                osc.stop(context.currentTime + 0.15);
              } catch (e) {
                console.error("Audio beep error:", e);
              }

              const qrVal = code.data.trim();
              if (scanType === 'member') {
                setMemberBarcode(qrVal);
                handleMemberLookup(qrVal);
              } else if (scanType === 'book') {
                handleBookScanResult(qrVal);
              }
              stopCamera();
              return; // End scanning animation loop
            }
          }
        }
        animationId = requestAnimationFrame(scan);
      }
    };

    if (cameraActive) {
      animationId = requestAnimationFrame(scan);
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [cameraActive, scanType, members, books]);

  // Unified Scanner Helper for Books (adds directly to cart)
  const handleBookScanResult = (scannedValue: string) => {
    const cleanBarcode = scannedValue.trim().toUpperCase();
    const cleanCleanBarcode = cleanBarcode.replace(/-/g, '');
    const found = books.find(b => 
      (b.barcode && b.barcode.toUpperCase() === cleanBarcode) || 
      b.kodeBuku.toUpperCase() === cleanBarcode ||
      (b.isbn && b.isbn.toUpperCase() === cleanBarcode) ||
      (b.isbn && b.isbn.replace(/-/g, '').toUpperCase() === cleanCleanBarcode)
    );

    if (found) {
      if (found.jumlahTersedia <= 0) {
        alert(`Gagal: Buku "${found.judul}" saat ini HABIS (Stok 0)!`);
        return;
      }
      
      // Add directly to cart
      setCart(prevCart => {
        if (prevCart.some(item => item.book.kodeBuku === found.kodeBuku)) {
          alert(`Buku "${found.judul}" sudah ada di daftar pinjam.`);
          return prevCart;
        }
        return [...prevCart, { book: found, days: settings.lamaPinjamDefault }];
      });
      setSelectedBook(null);
      setBookBarcode('');
    } else {
      alert(`Buku dengan kode/ISBN/barcode "${scannedValue}" tidak ditemukan.`);
    }
  };

  // Simulate automatic detection in camera
  const triggerSimulatedScan = () => {
    // Play sound beep
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.connect(gain);
      gain.connect(context.destination);
      osc.frequency.setValueAtTime(800, context.currentTime);
      gain.gain.setValueAtTime(0.1, context.currentTime);
      osc.start();
      osc.stop(context.currentTime + 0.15);
    } catch (e) {}

    if (scanType === 'member') {
      // Choose random or first member
      const randomMember = members[Math.floor(Math.random() * members.length)];
      if (randomMember) {
        setMemberBarcode(randomMember.barcodeAnggota);
        handleMemberLookup(randomMember.barcodeAnggota);
      }
    } else if (scanType === 'book') {
      // Choose random available book
      const randBook = books.find(b => b.jumlahTersedia > 0) || books[0];
      if (randBook) {
        const valToScan = randBook.barcode || randBook.kodeBuku || randBook.isbn;
        handleBookScanResult(valToScan);
      }
    }
    stopCamera();
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Lookup Member
  const handleMemberLookup = (barcode: string) => {
    const cleanBarcode = barcode.trim().toUpperCase();
    const found = members.find(m => 
      m.barcodeAnggota.toUpperCase() === cleanBarcode || 
      m.nis.toUpperCase() === cleanBarcode
    );
    if (found) {
      // Check validation: Overdue borrows?
      const hasOverdue = checkMemberHasOverdue(found.nis);
      if (hasOverdue) {
        alert(`Peringatan: Anggota ${found.nama} memiliki peminjaman buku yang TERLAMBAT dan dilarang meminjam sebelum melunasi denda/mengembalikan buku tersebut!`);
      }
      setSelectedMember(found);
    } else {
      setSelectedMember(null);
    }
  };

  const handleSelectMemberDirect = (member: Anggota) => {
    setMemberBarcode(member.nis);
    const hasOverdue = checkMemberHasOverdue(member.nis);
    if (hasOverdue) {
      alert(`Peringatan: Anggota ${member.nama} memiliki peminjaman buku yang TERLAMBAT dan dilarang meminjam sebelum melunasi denda/mengembalikan buku tersebut!`);
    }
    setSelectedMember(member);
  };

  // Lookup Book
  const handleBookLookup = (barcode: string) => {
    const cleanBarcode = barcode.trim().toUpperCase();
    const cleanCleanBarcode = cleanBarcode.replace(/-/g, '');
    const found = books.find(b => 
      (b.barcode && b.barcode.toUpperCase() === cleanBarcode) || 
      b.kodeBuku.toUpperCase() === cleanBarcode ||
      (b.isbn && b.isbn.toUpperCase() === cleanBarcode) ||
      (b.isbn && b.isbn.replace(/-/g, '').toUpperCase() === cleanCleanBarcode)
    );
    if (found) {
      if (found.jumlahTersedia <= 0) {
        alert(`Peringatan: Buku "${found.judul}" saat ini HABIS (Stok 0)!`);
        setSelectedBook(null);
        return;
      }
      setSelectedBook(found);
    } else {
      setSelectedBook(null);
    }
  };

  // Add to Cart
  const handleAddToCart = () => {
    if (!selectedBook) return;
    
    // Check if already in cart
    if (cart.some(item => item.book.kodeBuku === selectedBook.kodeBuku)) {
      alert('Buku ini sudah ditambahkan ke daftar pinjam!');
      return;
    }

    // Check stock limit (ensure we don't exceed available)
    if (selectedBook.jumlahTersedia <= 0) {
      alert('Stok buku tidak tersedia!');
      return;
    }

    setCart([...cart, { book: selectedBook, days: settings.lamaPinjamDefault }]);
    setSelectedBook(null);
    setBookBarcode('');
  };

  // Save transaction directly when student and book are both entered
  const handleDirectSaveTransaction = (book: Buku) => {
    if (!selectedMember) {
      alert('Pilih/Scan barcode Anggota terlebih dahulu!');
      return;
    }

    if (checkMemberHasOverdue(selectedMember.nis)) {
      alert('Transaksi ditolak: Anggota masih memiliki tunggakan/keterlambatan buku!');
      return;
    }

    if (book.jumlahTersedia <= 0) {
      alert(`Stok buku "${book.judul}" tidak tersedia!`);
      return;
    }

    // Create Borrow record
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // default loan period from settings or default 7 days
    const days = settings.lamaPinjamDefault || 7;
    const dueDate = new Date();
    dueDate.setDate(today.getDate() + days);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    const newBorrow: Peminjaman = {
      id: borrows.length + 1,
      nis: selectedMember.nis,
      namaAnggota: selectedMember.nama,
      tanggalPinjam: todayStr,
      tanggalKembali: dueDateStr,
      status: 'Dipinjam',
      listBuku: [{
        kodeBuku: book.kodeBuku,
        judul: book.judul,
        status: 'Dipinjam',
      }],
    };

    // Update book quantities (decrement available, increment dipinjam)
    const updatedBooks = books.map(b => {
      if (b.kodeBuku === book.kodeBuku) {
        const nextTersedia = Math.max(0, b.jumlahTersedia - 1);
        return {
          ...b,
          jumlahTersedia: nextTersedia,
          jumlahDipinjam: b.jumlahDipinjam + 1,
          status: nextTersedia > 0 ? ('Tersedia' as const) : ('Habis' as const),
        };
      }
      return b;
    });

    onUpdateBooks(updatedBooks);
    onUpdateBorrows([...borrows, newBorrow]);

    alert(`Peminjaman buku "${book.judul}" oleh ${selectedMember.nama} BERHASIL disimpan!`);
    
    // reset views
    setSelectedMember(null);
    setMemberBarcode('');
    setSelectedBook(null);
    setBookBarcode('');
    setCart([]);
  };

  // Remove from Cart
  const handleRemoveFromCart = (kodeBuku: string) => {
    setCart(cart.filter(item => item.book.kodeBuku !== kodeBuku));
  };

  // Save Transaction
  const handleSaveTransaction = () => {
    if (!selectedMember) {
      alert('Pilih/Scan barcode Anggota terlebih dahulu!');
      return;
    }

    // Check again if member is overdue
    if (checkMemberHasOverdue(selectedMember.nis)) {
      alert('Transaksi ditolak: Anggota masih memiliki tunggakan/keterlambatan buku!');
      return;
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    let newBorrow: Peminjaman;
    let updatedBooks: Buku[];

    if (cart.length > 0) {
      // calculate due date based on max days in cart
      const maxDays = Math.max(...cart.map(c => c.days), 7);
      const dueDate = new Date();
      dueDate.setDate(today.getDate() + maxDays);
      const dueDateStr = dueDate.toISOString().split('T')[0];

      newBorrow = {
        id: borrows.length + 1,
        nis: selectedMember.nis,
        namaAnggota: selectedMember.nama,
        tanggalPinjam: todayStr,
        tanggalKembali: dueDateStr,
        status: 'Dipinjam',
        listBuku: cart.map(item => ({
          kodeBuku: item.book.kodeBuku,
          judul: item.book.judul,
          status: 'Dipinjam',
        })),
      };

      updatedBooks = books.map(b => {
        const cartItem = cart.find(item => item.book.kodeBuku === b.kodeBuku);
        if (cartItem) {
          const nextTersedia = Math.max(0, b.jumlahTersedia - 1);
          return {
            ...b,
            jumlahTersedia: nextTersedia,
            jumlahDipinjam: b.jumlahDipinjam + 1,
            status: nextTersedia > 0 ? ('Tersedia' as const) : ('Habis' as const),
          };
        }
        return b;
      });
    } else if (selectedBook) {
      if (selectedBook.jumlahTersedia <= 0) {
        alert(`Stok buku "${selectedBook.judul}" tidak tersedia!`);
        return;
      }

      const days = settings.lamaPinjamDefault || 7;
      const dueDate = new Date();
      dueDate.setDate(today.getDate() + days);
      const dueDateStr = dueDate.toISOString().split('T')[0];

      newBorrow = {
        id: borrows.length + 1,
        nis: selectedMember.nis,
        namaAnggota: selectedMember.nama,
        tanggalPinjam: todayStr,
        tanggalKembali: dueDateStr,
        status: 'Dipinjam',
        listBuku: [{
          kodeBuku: selectedBook.kodeBuku,
          judul: selectedBook.judul,
          status: 'Dipinjam',
        }],
      };

      updatedBooks = books.map(b => {
        if (b.kodeBuku === selectedBook.kodeBuku) {
          const nextTersedia = Math.max(0, b.jumlahTersedia - 1);
          return {
            ...b,
            jumlahTersedia: nextTersedia,
            jumlahDipinjam: b.jumlahDipinjam + 1,
            status: nextTersedia > 0 ? ('Tersedia' as const) : ('Habis' as const),
          };
        }
        return b;
      });
    } else {
      alert('Daftar pinjam buku masih kosong dan tidak ada buku terpilih!');
      return;
    }

    onUpdateBooks(updatedBooks);
    onUpdateBorrows([...borrows, newBorrow]);

    alert(`Transaksi peminjaman #${newBorrow.id} berhasil disimpan!`);
    
    // reset views
    setSelectedMember(null);
    setMemberBarcode('');
    setSelectedBook(null);
    setBookBarcode('');
    setCart([]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* COLUMN 1: SCANNER INTERFACE */}
      <div className="lg:col-span-1 space-y-6">
        {/* Member Lookup Card */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-100 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-blue-500" />
              Input No. Anggota / Siswa
            </h3>
          </div>

          <div className="flex gap-2 relative">
            <input
              type="text"
              placeholder="Ketik NIS, No. Kartu, atau Nama..."
              value={memberBarcode}
              onChange={e => {
                setMemberBarcode(e.target.value);
                handleMemberLookup(e.target.value);
              }}
              className="flex-1 border border-slate-200 px-3 py-2 rounded-lg text-sm bg-slate-50 focus:bg-white"
            />
            {memberBarcode && (
              <button
                type="button"
                onClick={() => {
                  setMemberBarcode('');
                  setSelectedMember(null);
                }}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Suggestions Dropdown for Members */}
          {!selectedMember && memberBarcode.trim() && (
            <div className="border border-slate-100 rounded-xl max-h-48 overflow-y-auto bg-white divide-y divide-slate-50 shadow-sm text-xs z-10 relative">
              {members
                .filter(m => 
                  m.nis.toUpperCase().includes(memberBarcode.toUpperCase()) ||
                  m.nama.toUpperCase().includes(memberBarcode.toUpperCase()) ||
                  m.barcodeAnggota.toUpperCase().includes(memberBarcode.toUpperCase())
                )
                .slice(0, 5)
                .map(m => (
                  <button
                    key={m.nis}
                    type="button"
                    onClick={() => handleSelectMemberDirect(m)}
                    className="w-full text-left px-3 py-2.5 hover:bg-blue-50/50 flex justify-between items-center transition-colors font-medium text-slate-700"
                  >
                    <span>{m.nama} ({m.kelas})</span>
                    <span className="font-mono text-slate-400 font-bold shrink-0 ml-2">NIS: {m.nis}</span>
                  </button>
                ))
              }
              {members.filter(m => 
                m.nis.toUpperCase().includes(memberBarcode.toUpperCase()) ||
                m.nama.toUpperCase().includes(memberBarcode.toUpperCase()) ||
                m.barcodeAnggota.toUpperCase().includes(memberBarcode.toUpperCase())
              ).length === 0 && (
                <div className="p-3 text-center text-slate-400">
                  Siswa/Anggota tidak ditemukan
                </div>
              )}
            </div>
          )}

          {selectedMember ? (
            <div className={`p-4 rounded-xl border relative flex gap-3 ${
              checkMemberHasOverdue(selectedMember.nis) 
                ? 'bg-red-50 border-red-200 text-red-900' 
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              <button
                type="button"
                onClick={() => {
                  setSelectedMember(null);
                  setMemberBarcode('');
                }}
                className="absolute right-2 top-2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/50"
                title="Batal pilih"
              >
                <X className="w-4 h-4" />
              </button>
              {selectedMember.foto ? (
                <img
                  src={selectedMember.foto}
                  alt={selectedMember.nama}
                  className="w-12 h-12 rounded-lg object-cover bg-white shadow-xs shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <UserIcon className="w-6 h-6" />
                </div>
              )}
              <div className="space-y-0.5 text-xs pr-6">
                <p className="font-bold">{selectedMember.nama}</p>
                <p className="font-mono text-slate-500">NIS: {selectedMember.nis} · {selectedMember.kelas}</p>
                <div className="flex items-center gap-1 mt-1">
                  {checkMemberHasOverdue(selectedMember.nis) ? (
                    <span className="inline-flex items-center gap-1 font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full text-[10px]">
                      <AlertTriangle className="w-3 h-3" />
                      Ada Tunggakan Terlambat!
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[10px]">
                      <CheckCircle className="w-3 h-3" />
                      Status Bersih (Siap Pinjam)
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 font-medium">
              Belum ada anggota yang terpilih.
            </div>
          )}
        </div>

        {/* Book Lookup Card */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-100 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-500" />
              Pencarian Buku
            </h3>
          </div>

          <div className="flex gap-2 relative">
            <input
              type="text"
              placeholder="Masukkan Kode Buku / Barcode / ISBN..."
              value={bookBarcode}
              onChange={e => {
                setBookBarcode(e.target.value);
                handleBookLookup(e.target.value);
              }}
              className="flex-1 border border-slate-200 px-3 py-2 rounded-lg text-sm bg-slate-50 focus:bg-white"
            />
            {bookBarcode && (
              <button
                type="button"
                onClick={() => {
                  setBookBarcode('');
                  setSelectedBook(null);
                }}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Suggestions Dropdown for Books */}
          {!selectedBook && bookBarcode.trim() && (
            <div className="border border-slate-100 rounded-xl max-h-48 overflow-y-auto bg-white divide-y divide-slate-50 shadow-sm text-xs z-10 relative">
              {books
                .filter(b => 
                  b.kodeBuku.toUpperCase().includes(bookBarcode.toUpperCase()) ||
                  b.judul.toUpperCase().includes(bookBarcode.toUpperCase()) ||
                  (b.isbn && b.isbn.toUpperCase().includes(bookBarcode.toUpperCase()))
                )
                .slice(0, 5)
                .map(b => (
                  <button
                    key={b.kodeBuku}
                    type="button"
                    onClick={() => {
                      setBookBarcode(b.kodeBuku);
                      handleBookLookup(b.kodeBuku);
                    }}
                    className="w-full text-left px-3 py-2.5 hover:bg-indigo-50/50 flex justify-between items-center transition-colors font-medium text-slate-700"
                  >
                    <span className="line-clamp-1">{b.judul}</span>
                    <span className="font-mono text-slate-400 font-bold shrink-0 ml-2">{b.kodeBuku}</span>
                  </button>
                ))
              }
              {books.filter(b => 
                b.kodeBuku.toUpperCase().includes(bookBarcode.toUpperCase()) ||
                b.judul.toUpperCase().includes(bookBarcode.toUpperCase()) ||
                (b.isbn && b.isbn.toUpperCase().includes(bookBarcode.toUpperCase()))
              ).length === 0 && (
                <div className="p-3 text-center text-slate-400">
                  Buku tidak ditemukan
                </div>
              )}
            </div>
          )}

          {selectedBook ? (
            <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl relative flex gap-3 text-xs">
              <button
                type="button"
                onClick={() => {
                  setSelectedBook(null);
                  setBookBarcode('');
                }}
                className="absolute right-2 top-2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/50"
                title="Batal pilih"
              >
                <X className="w-4 h-4" />
              </button>
              {selectedBook.coverBuku ? (
                <img
                  src={selectedBook.coverBuku}
                  alt={selectedBook.judul}
                  className="w-10 h-14 object-cover bg-white shadow-xs rounded shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-14 bg-indigo-100 text-indigo-600 flex items-center justify-center rounded shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
              )}
              <div className="flex-1 space-y-1 pr-6">
                <p className="font-bold text-slate-900 line-clamp-1">{selectedBook.judul}</p>
                <p className="text-slate-500">Oleh {selectedBook.pengarang}</p>
                <p className="font-semibold text-slate-700">Tersedia: {selectedBook.jumlahTersedia} unit</p>
                
                <div className="mt-3 space-y-2">
                  {selectedMember ? (
                    <button
                      type="button"
                      onClick={() => handleDirectSaveTransaction(selectedBook)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer transition-colors animate-pulse"
                    >
                      <ClipboardCheck className="w-4 h-4" />
                      Simpan & Pinjam Sekarang
                    </button>
                  ) : (
                    <div className="text-[10px] text-amber-600 font-semibold bg-amber-50 p-2 rounded-lg border border-amber-100">
                      Silakan pilih Anggota/Siswa terlebih dahulu untuk meminjam buku.
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah ke Daftar Pinjam ({cart.length})
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 font-medium">
              Belum ada buku yang discan/terpilih.
            </div>
          )}
        </div>
      </div>

      {/* COLUMN 2 & 3: BORROW CART & SCHEDULE */}
      <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-between space-y-6">
        <div>
          <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ClipboardCheck className="w-5.5 h-5.5 text-blue-600" />
              Daftar Buku yang Akan Dipinjam
            </h3>
            <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
              {cart.length} Buku Terpilih
            </span>
          </div>

          {/* Cart Table */}
          <div className="overflow-x-auto min-h-[250px]">
            <table className="min-w-full divide-y divide-slate-100">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase rounded-l-lg">Kode</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Judul Buku</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase">Lama Pinjam</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase">Tgl Jatuh Tempo</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase rounded-r-lg">Hapus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-20 text-sm text-slate-400 font-medium">
                      Keranjang peminjaman kosong. Scan barcode buku di samping kiri untuk mengisi.
                    </td>
                  </tr>
                ) : (
                  cart.map(item => {
                    // compute individual due dates
                    const d = new Date();
                    d.setDate(d.getDate() + item.days);
                    const dueStr = d.toISOString().split('T')[0];

                    return (
                      <tr key={item.book.kodeBuku} className="hover:bg-slate-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-mono font-bold text-indigo-600">
                          {item.book.kodeBuku}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-slate-900">{item.book.judul}</p>
                          <p className="text-xs text-slate-400">ISBN: {item.book.isbn}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <select
                            value={item.days}
                            onChange={e => {
                              const nextDays = parseInt(e.target.value);
                              setCart(
                                cart.map(c =>
                                  c.book.kodeBuku === item.book.kodeBuku
                                    ? { ...c, days: nextDays }
                                    : c
                                )
                              );
                            }}
                            className="border border-slate-200 rounded px-2 py-1 text-xs text-center"
                          >
                            <option value={3}>3 Hari</option>
                            <option value={5}>5 Hari</option>
                            <option value={7}>7 Hari</option>
                            <option value={10}>10 Hari</option>
                            <option value={14}>14 Hari</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center text-xs text-slate-600 font-medium">
                          <div className="inline-flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded border border-slate-100 font-bold">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {dueStr}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleRemoveFromCart(item.book.kodeBuku)}
                            className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action button trigger */}
        <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
          <div className="text-xs text-slate-500 font-semibold">
            Status: {selectedMember ? `Siap Transaksi (${selectedMember.nama})` : 'Harap pilih anggota & buku'}
          </div>
          <button
            onClick={handleSaveTransaction}
            disabled={!selectedMember || (cart.length === 0 && !selectedBook) || checkMemberHasOverdue(selectedMember.nis)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-colors flex items-center gap-2"
          >
            <ClipboardCheck className="w-4 h-4" />
            Simpan Transaksi Peminjaman
          </button>
        </div>
      </div>

      {/* MODAL 3: BARCODE SCANNER VIDEO STREAM VIEWPORT */}
      {cameraActive && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 text-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-800">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                <Camera className="w-4 h-4 text-red-500 animate-pulse" />
                Live Scanner ({scanType === 'member' ? 'Kartu Anggota' : 'Buku'})
              </h3>
              <button
                onClick={stopCamera}
                className="p-1 text-slate-400 hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center space-y-6">
              {/* Camera Frame Box */}
              <div className="w-full aspect-video bg-black rounded-xl border-2 border-indigo-500 relative overflow-hidden flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Laser scan lines */}
                <div className="absolute inset-x-0 h-0.5 bg-red-500 shadow-md shadow-red-500/50 animate-bounce top-1/2" />

                {/* Scope borders */}
                <div className="absolute top-4 left-4 w-6 h-6 border-t-4 border-l-4 border-red-500" />
                <div className="absolute top-4 right-4 w-6 h-6 border-t-4 border-r-4 border-red-500" />
                <div className="absolute bottom-4 left-4 w-6 h-6 border-b-4 border-l-4 border-red-500" />
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b-4 border-r-4 border-red-500" />
              </div>

              <div className="w-full flex items-center gap-3">
                <button
                  type="button"
                  onClick={triggerSimulatedScan}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-red-600 hover:bg-red-700 rounded-xl text-xs font-bold text-white cursor-pointer transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Simulasikan Pembacaan Barcode
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
