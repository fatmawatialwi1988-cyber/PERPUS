import React, { useState } from 'react';
import { Camera, User as UserIcon, BookOpen, Clock, AlertTriangle, Calendar, ClipboardCheck, ArrowUpRight, CheckCircle, Info } from 'lucide-react';
import { Buku, Anggota, Peminjaman, Pengaturan } from '../types';

interface ReturnProps {
  books: Buku[];
  members: Anggota[];
  borrows: Peminjaman[];
  settings: Pengaturan;
  onUpdateBooks: (books: Buku[]) => void;
  onUpdateBorrows: (borrows: Peminjaman[]) => void;
}

export const Return: React.FC<ReturnProps> = ({
  books,
  members,
  borrows,
  settings,
  onUpdateBooks,
  onUpdateBorrows,
}) => {
  const [selectedMember, setSelectedMember] = useState<Anggota | null>(null);
  const [memberBarcode, setMemberBarcode] = useState('');

  // Selected books to return
  const [selectedBooksToReturn, setSelectedBooksToReturn] = useState<{ [kodeBuku: string]: boolean }>({});

  // Active borrow record for selected member
  const getActiveBorrows = (nis: string): Peminjaman[] => {
    return borrows.filter(b => b.nis === nis && (b.status === 'Dipinjam' || b.status === 'Terlambat'));
  };

  const handleMemberLookup = (barcode: string) => {
    const cleanBarcode = barcode.trim();
    const found = members.find(m => m.barcodeAnggota === cleanBarcode || m.nis === cleanBarcode);
    if (found) {
      setSelectedMember(found);
      setSelectedBooksToReturn({});
    } else {
      setSelectedMember(null);
    }
  };

  // Helper: calculate late days & fine
  const calculateOverdueInfo = (dueDateStr: string): { lateDays: number; fine: number } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dueDateStr);
    dueDate.setHours(0, 0, 0, 0);

    if (today > dueDate) {
      const diffTime = Math.abs(today.getTime() - dueDate.getTime());
      const lateDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const fine = lateDays * settings.dendaPerHari;
      return { lateDays, fine };
    }
    return { lateDays: 0, fine: 0 };
  };

  const activeBorrows = selectedMember ? getActiveBorrows(selectedMember.nis) : [];

  const handleToggleCheck = (kodeBuku: string) => {
    setSelectedBooksToReturn(prev => ({
      ...prev,
      [kodeBuku]: !prev[kodeBuku],
    }));
  };

  const handleProcessReturn = () => {
    if (!selectedMember) return;
    
    // gather list of checked books
    const checkedCodes = Object.keys(selectedBooksToReturn).filter(code => selectedBooksToReturn[code]);
    if (checkedCodes.length === 0) {
      alert('Pilih minimal satu buku yang dikembalikan!');
      return;
    }

    // copy borrows and books
    let updatedBorrows = [...borrows];
    let updatedBooks = [...books];
    let totalFineIncurred = 0;

    // Process each borrow record that contains these checked codes
    updatedBorrows = updatedBorrows.map(b => {
      if (b.nis === selectedMember.nis && (b.status === 'Dipinjam' || b.status === 'Terlambat')) {
        // map listBuku
        const updatedListBuku = b.listBuku.map(item => {
          if (checkedCodes.includes(item.kodeBuku) && item.status === 'Dipinjam') {
            const { fine } = calculateOverdueInfo(b.tanggalKembali);
            totalFineIncurred += fine;

            // Restock book quantity
            updatedBooks = updatedBooks.map(bk => {
              if (bk.kodeBuku === item.kodeBuku) {
                const nextTersedia = bk.jumlahTersedia + 1;
                return {
                  ...bk,
                  jumlahTersedia: nextTersedia,
                  jumlahDipinjam: Math.max(0, bk.jumlahDipinjam - 1),
                  status: nextTersedia > 0 ? ('Tersedia' as const) : ('Habis' as const),
                };
              }
              return bk;
            });

            return {
              ...item,
              status: 'Dikembalikan' as const,
              tanggalKembaliAktual: new Date().toISOString().split('T')[0],
              denda: fine,
            };
          }
          return item;
        });

        // check if all books are returned
        const allReturned = updatedListBuku.every(item => item.status === 'Dikembalikan');

        return {
          ...b,
          listBuku: updatedListBuku,
          status: allReturned ? ('Selesai' as const) : b.status,
        };
      }
      return b;
    });

    onUpdateBooks(updatedBooks);
    onUpdateBorrows(updatedBorrows);

    if (totalFineIncurred > 0) {
      alert(`Pengembalian Berhasil! Anggota terkena denda keterlambatan sebesar Rp ${totalFineIncurred.toLocaleString('id-ID')} karena terlambat mengembalikan buku.`);
    } else {
      alert('Pengembalian Berhasil! Semua buku dikembalikan tepat waktu tanpa denda.');
    }

    // Reset view selection
    setSelectedMember(null);
    setMemberBarcode('');
    setSelectedBooksToReturn({});
  };

  // Quick action: Simulate scan a member to test return flow
  const handleQuickSelectMember = (nis: string) => {
    const member = members.find(m => m.nis === nis);
    if (member) {
      setMemberBarcode(member.barcodeAnggota);
      handleMemberLookup(member.barcodeAnggota);
    }
  };

  // Find members who have active borrows to help test
  const membersWithOutstanding = members.filter(m => getActiveBorrows(m.nis).length > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* COLUMN 1: MEMBER SCANNER INPUT */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-100 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-blue-500" />
            Scan Barcode Anggota
          </h3>

          <input
            type="text"
            placeholder="Masukkan NIS / Barcode Anggota..."
            value={memberBarcode}
            onChange={e => {
              setMemberBarcode(e.target.value);
              handleMemberLookup(e.target.value);
            }}
            className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm bg-slate-50 focus:bg-white"
          />

          {selectedMember ? (
            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex gap-3 text-xs">
              {selectedMember.foto ? (
                <img
                  src={selectedMember.foto}
                  alt={selectedMember.nama}
                  className="w-12 h-12 rounded-lg object-cover bg-white shadow-xs"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <UserIcon className="w-6 h-6" />
                </div>
              )}
              <div>
                <p className="font-bold text-slate-900">{selectedMember.nama}</p>
                <p className="text-slate-500">NIS: {selectedMember.nis} · {selectedMember.kelas}</p>
                <p className="text-blue-700 font-semibold mt-1">
                  Meminjam {activeBorrows.reduce((sum, b) => sum + b.listBuku.filter(item => item.status === 'Dipinjam').length, 0)} buku aktif
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 font-medium">
              Belum ada anggota yang terpilih. Masukkan NIS atau pilih dari daftar jalan pintas pengujian di bawah.
            </div>
          )}
        </div>

        {/* TEST HELPER BLOCK */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-100 space-y-3">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Info className="w-4 h-4 text-slate-400" />
            Uji Coba Pengembalian
          </h4>
          <p className="text-xs text-slate-400">Pilih salah satu siswa di bawah yang sedang meminjam buku untuk memuat transaksi pengembalian mereka secara instan:</p>

          <div className="space-y-2">
            {membersWithOutstanding.length === 0 ? (
              <p className="text-xs text-amber-600 font-semibold bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                Saat ini belum ada siswa yang memiliki peminjaman aktif. Coba pinjam buku terlebih dahulu di tab Peminjaman!
              </p>
            ) : (
              membersWithOutstanding.map(m => (
                <button
                  key={m.nis}
                  onClick={() => handleQuickSelectMember(m.nis)}
                  className="w-full text-left p-2.5 bg-slate-50 border border-slate-100 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 flex justify-between items-center cursor-pointer transition-colors"
                >
                  <span>{m.nama} ({m.kelas})</span>
                  <ArrowUpRight className="w-4 h-4 text-slate-400" />
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* COLUMN 2 & 3: OUTSTANDING BORROWS */}
      <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-between min-h-[300px]">
        <div>
          <div className="border-b border-slate-100 pb-4 mb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5.5 h-5.5 text-indigo-600" />
              Buku yang Sedang Dipinjam Anggota
            </h3>
          </div>

          {activeBorrows.length === 0 ? (
            <div className="text-center py-20 text-sm text-slate-400 font-medium">
              Tidak ada buku yang sedang dipinjam oleh anggota terpilih.
            </div>
          ) : (
            <div className="space-y-6">
              {activeBorrows.map(borrow => (
                <div key={borrow.id} className="border border-slate-100 rounded-xl overflow-hidden shadow-xs">
                  {/* Borrow Transaction Header */}
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex flex-wrap justify-between items-center text-xs text-slate-600">
                    <div>
                      ID Transaksi: <span className="font-mono font-bold text-slate-950">#{borrow.id}</span>
                    </div>
                    <div className="flex gap-4">
                      <span>Pinjam: <span className="font-bold">{borrow.tanggalPinjam}</span></span>
                      <span>Tempo: <span className="font-bold text-indigo-600">{borrow.tanggalKembali}</span></span>
                    </div>
                  </div>

                  {/* List of Books in this borrow */}
                  <div className="divide-y divide-slate-100 bg-white">
                    {borrow.listBuku
                      .filter(item => item.status === 'Dipinjam')
                      .map(item => {
                        const { lateDays, fine } = calculateOverdueInfo(borrow.tanggalKembali);
                        
                        return (
                          <div key={item.kodeBuku} className="p-4 flex items-center justify-between hover:bg-slate-50/50">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={!!selectedBooksToReturn[item.kodeBuku]}
                                onChange={() => handleToggleCheck(item.kodeBuku)}
                                className="w-4.5 h-4.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                              />
                              <div>
                                <p className="text-sm font-bold text-slate-900">{item.judul}</p>
                                <p className="text-xs font-mono font-bold text-indigo-600">{item.kodeBuku}</p>
                              </div>
                            </div>

                            {/* Overdue alert indicator */}
                            {lateDays > 0 ? (
                              <div className="flex items-center gap-3">
                                <div className="text-right text-xs">
                                  <p className="font-bold text-red-600 flex items-center gap-1 justify-end">
                                    <Clock className="w-3.5 h-3.5" />
                                    Terlambat {lateDays} Hari
                                  </p>
                                  <p className="text-xs font-bold text-slate-800">Denda: Rp {fine.toLocaleString('id-ID')}</p>
                                </div>
                                <span className="p-1.5 bg-red-50 text-red-600 rounded-lg shrink-0">
                                  <AlertTriangle className="w-4 h-4" />
                                </span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                <CheckCircle className="w-3 h-3" />
                                Aman
                              </span>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {selectedMember && activeBorrows.length > 0 && (
          <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
            <span className="text-xs text-slate-500 font-semibold">
              {Object.values(selectedBooksToReturn).filter(Boolean).length} Buku siap dikembalikan.
            </span>
            <button
              onClick={handleProcessReturn}
              disabled={Object.values(selectedBooksToReturn).filter(Boolean).length === 0}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-colors"
            >
              Proses Pengembalian Buku
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
