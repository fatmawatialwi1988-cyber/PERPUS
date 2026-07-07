import React, { useState } from 'react';
import { Search, Plus, Edit, Trash2, Printer, Download, Upload, Barcode as BarcodeIcon, Filter, X, Image as ImageIcon } from 'lucide-react';
import { Buku, Kategori, Rak } from '../types';
import { Barcode } from './Barcode';

interface BooksProps {
  books: Buku[];
  categories: Kategori[];
  racks: Rak[];
  userRole: string;
  onUpdateBooks: (books: Buku[]) => void;
}

export const Books: React.FC<BooksProps> = ({
  books,
  categories,
  racks,
  userRole,
  onUpdateBooks,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterRack, setFilterRack] = useState<string>('');
  
  // Modal State
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingBook, setEditingBook] = useState<Buku | null>(null);
  const [barcodePrintBook, setBarcodePrintBook] = useState<Buku | null>(null);

  // Form State
  const [formData, setFormData] = useState<Omit<Buku, 'jumlahDipinjam' | 'jumlahTersedia' | 'status'>>({
    kodeBuku: '',
    isbn: '',
    barcode: '',
    judul: '',
    pengarang: '',
    penerbit: '',
    tahun: 2026,
    kategoriId: 1,
    rakId: 1,
    jumlahBuku: 5,
    coverBuku: '',
  });

  const resetForm = () => {
    setFormData({
      kodeBuku: '',
      isbn: '',
      barcode: '',
      judul: '',
      pengarang: '',
      penerbit: '',
      tahun: 2026,
      kategoriId: categories[0]?.id || 1,
      rakId: racks[0]?.id || 1,
      jumlahBuku: 5,
      coverBuku: '',
    });
    setEditingBook(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    // Auto-generate Kode Buku based on current count
    const nextCode = `B00${books.length + 1}`;
    setFormData(prev => ({
      ...prev,
      kodeBuku: nextCode,
      barcode: nextCode, // Default barcode same as code
    }));
    setShowFormModal(true);
  };

  const handleOpenEditModal = (book: Buku) => {
    setEditingBook(book);
    setFormData({
      kodeBuku: book.kodeBuku,
      isbn: book.isbn,
      barcode: book.barcode,
      judul: book.judul,
      pengarang: book.pengarang,
      penerbit: book.penerbit,
      tahun: book.tahun,
      kategoriId: book.kategoriId,
      rakId: book.rakId,
      jumlahBuku: book.jumlahBuku,
      coverBuku: book.coverBuku || '',
    });
    setShowFormModal(true);
  };

  const handleSaveBook = (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (!formData.kodeBuku || !formData.judul || !formData.isbn) {
      alert('Isi data wajib (Kode, ISBN, Judul)');
      return;
    }

    // Check duplicate ISBN/Barcode
    const isDuplicateISBN = books.some(
      b => b.isbn === formData.isbn && b.kodeBuku !== formData.kodeBuku
    );
    if (isDuplicateISBN) {
      alert('Error: ISBN sudah terdaftar pada buku lain!');
      return;
    }

    if (editingBook) {
      // Update
      const updated = books.map(b => {
        if (b.kodeBuku === editingBook.kodeBuku) {
          const delta = formData.jumlahBuku - b.jumlahBuku;
          const newDipinjam = b.jumlahDipinjam;
          const newTersedia = Math.max(0, formData.jumlahBuku - newDipinjam);
          return {
            ...b,
            ...formData,
            jumlahDipinjam: newDipinjam,
            jumlahTersedia: newTersedia,
            status: newTersedia > 0 ? ('Tersedia' as const) : ('Habis' as const),
          };
        }
        return b;
      });
      onUpdateBooks(updated);
    } else {
      // Create new
      const isDuplicateCode = books.some(b => b.kodeBuku === formData.kodeBuku);
      if (isDuplicateCode) {
        alert('Error: Kode Buku sudah digunakan!');
        return;
      }

      const newBook: Buku = {
        ...formData,
        jumlahDipinjam: 0,
        jumlahTersedia: formData.jumlahBuku,
        status: formData.jumlahBuku > 0 ? 'Tersedia' : 'Habis',
      };
      onUpdateBooks([...books, newBook]);
    }

    setShowFormModal(false);
    resetForm();
  };

  const handleDeleteBook = (kodeBuku: string) => {
    if (userRole !== 'Administrator') {
      alert('Hanya Administrator yang memiliki wewenang menghapus data!');
      return;
    }
    if (confirm(`Apakah Anda yakin ingin menghapus buku dengan kode ${kodeBuku}?`)) {
      const filtered = books.filter(b => b.kodeBuku !== kodeBuku);
      onUpdateBooks(filtered);
    }
  };

  // Search and Filter implementation
  const filteredBooks = books.filter(b => {
    const matchesSearch =
      b.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.pengarang.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.kodeBuku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.isbn.includes(searchQuery);

    const matchesCategory = filterCategory === '' || b.kategoriId === parseInt(filterCategory);
    const matchesRack = filterRack === '' || b.rakId === parseInt(filterRack);

    return matchesSearch && matchesCategory && matchesRack;
  });

  // Export CSV/Excel
  const handleExportCSV = () => {
    const headers = 'Kode Buku,ISBN,Barcode,Judul,Pengarang,Penerbit,Tahun,Jumlah,Tersedia,Dipinjam,Status\n';
    const rows = filteredBooks
      .map(
        b =>
          `"${b.kodeBuku}","${b.isbn}","${b.barcode}","${b.judul}","${b.pengarang}","${b.penerbit}",${b.tahun},${b.jumlahBuku},${b.jumlahTersedia},${b.jumlahDipinjam},"${b.status}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Data_Buku_Perpustakaan.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import CSV simulation
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim() !== '');
        if (lines.length <= 1) return;

        const newBooksList = [...books];
        let importedCount = 0;

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
          if (cols.length < 5) continue;

          const [kodeBuku, isbn, barcode, judul, pengarang, penerbit, tahunStr, jmlStr] = cols;
          
          // skip if code exists
          if (newBooksList.some(b => b.kodeBuku === kodeBuku)) continue;

          const jumlahBuku = parseInt(jmlStr) || 1;
          const newBook: Buku = {
            kodeBuku,
            isbn,
            barcode: barcode || kodeBuku,
            judul,
            pengarang,
            penerbit: penerbit || 'Penerbit Utama',
            tahun: parseInt(tahunStr) || 2026,
            kategoriId: categories[0]?.id || 1,
            rakId: racks[0]?.id || 1,
            jumlahBuku,
            jumlahTersedia: jumlahBuku,
            jumlahDipinjam: 0,
            status: jumlahBuku > 0 ? 'Tersedia' : 'Habis',
          };
          newBooksList.push(newBook);
          importedCount++;
        }

        if (importedCount > 0) {
          onUpdateBooks(newBooksList);
          alert(`Sukses mengimpor ${importedCount} buku baru dari berkas CSV.`);
        } else {
          alert('Tidak ada buku baru yang diimpor (mungkin kode buku sudah terdaftar).');
        }
      } catch (err) {
        alert('Format file CSV tidak valid.');
      }
    };
    reader.readAsText(file);
  };

  // Print list
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const tableRows = filteredBooks
      .map(
        b => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; font-family: monospace;">${b.kodeBuku}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${b.judul}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${b.pengarang}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${b.penerbit}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${b.tahun}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${b.jumlahBuku}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${b.jumlahTersedia}</td>
      </tr>
    `
      )
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Laporan Data Buku Perpustakaan</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            h2 { text-align: center; margin-bottom: 5px; }
            h4 { text-align: center; margin-top: 0; color: #666; font-weight: normal; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f3f4f6; padding: 10px; border: 1px solid #ddd; text-align: left; }
          </style>
        </head>
        <body>
          <h2>Laporan Data Buku Perpustakaan</h2>
          <h4>SMA Negeri 1 Jaya Raya</h4>
          <table>
            <thead>
              <tr>
                <th>Kode</th>
                <th>Judul Buku</th>
                <th>Pengarang</th>
                <th>Penerbit</th>
                <th style="text-align: center;">Tahun</th>
                <th style="text-align: center;">Stok</th>
                <th style="text-align: center;">Tersedia</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Action Header bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-4 rounded-2xl shadow-xs border border-slate-100">
        <div className="flex-1 flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari Judul, Pengarang, ISBN..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Categories filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="py-2 px-3 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none"
            >
              <option value="">Semua Kategori</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nama}
                </option>
              ))}
            </select>
          </div>

          {/* Racks filter */}
          <select
            value={filterRack}
            onChange={e => setFilterRack(e.target.value)}
            className="py-2 px-3 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none"
          >
            <option value="">Semua Rak</option>
            {racks.map(r => (
              <option key={r.id} value={r.id}>
                {r.nama}
              </option>
            ))}
          </select>
        </div>

        {/* Right side buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-2 px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold cursor-pointer text-slate-700 transition-colors">
            <Upload className="w-4 h-4" />
            Impor CSV
            <input
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              className="hidden"
            />
          </label>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer transition-colors"
          >
            <Download className="w-4 h-4" />
            Ekspor CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer transition-colors"
          >
            <Printer className="w-4 h-4" />
            Cetak List
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tambah Buku
          </button>
        </div>
      </div>

      {/* Book Catalog Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cover</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Kode / ISBN</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Judul Buku</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Pengarang & Penerbit</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Tahun</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Stok (Tersedia/Total)</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBooks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-sm text-slate-400 font-medium">
                    Tidak ada data buku yang sesuai pencarian atau filter.
                  </td>
                </tr>
              ) : (
                filteredBooks.map(b => (
                  <tr key={b.kodeBuku} className="hover:bg-slate-50 transition-colors">
                    {/* Cover Preview */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {b.coverBuku ? (
                        <img
                          src={b.coverBuku}
                          alt={b.judul}
                          className="w-10 h-14 object-cover rounded-md shadow-xs border border-slate-200"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-14 bg-slate-100 rounded-md border border-slate-200 flex items-center justify-center text-slate-400">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                      )}
                    </td>

                    {/* Kode/ISBN */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md inline-block">
                        {b.kodeBuku}
                      </p>
                      <p className="text-xs font-mono text-slate-400 mt-1">ISBN: {b.isbn}</p>
                    </td>

                    {/* Judul */}
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-900">{b.judul}</p>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">
                        {categories.find(c => c.id === b.kategoriId)?.nama || 'Umum'} · {racks.find(r => r.id === b.rakId)?.nama || 'Rak Utama'}
                      </p>
                    </td>

                    {/* Pengarang/Penerbit */}
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-800">{b.pengarang}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{b.penerbit}</p>
                    </td>

                    {/* Tahun */}
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-mono text-slate-600">
                      {b.tahun}
                    </td>

                    {/* Stok Status */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <p className="text-sm font-bold text-slate-800">
                        {b.jumlahTersedia} <span className="text-slate-400 font-normal">/ {b.jumlahBuku}</span>
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{b.jumlahDipinjam} Dipinjam</p>
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                          b.status === 'Tersedia'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>

                    {/* Action buttons */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setBarcodePrintBook(b)}
                          title="Cetak Barcode"
                          className="p-1.5 bg-slate-50 text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
                        >
                          <BarcodeIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(b)}
                          title="Ubah Buku"
                          className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg cursor-pointer transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBook(b.kodeBuku)}
                          title="Hapus Buku"
                          className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ADD/EDIT FORM MODAL */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-scale-up">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">
                {editingBook ? 'Edit Data Buku' : 'Tambah Buku Baru'}
              </h3>
              <button
                onClick={() => setShowFormModal(false)}
                className="p-1 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBook} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Kode Buku (Unik) *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={editingBook !== null}
                    value={formData.kodeBuku}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        kodeBuku: e.target.value.toUpperCase(),
                        barcode: e.target.value.toUpperCase(),
                      }))
                    }
                    className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    ISBN *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.isbn}
                    onChange={e => setFormData(prev => ({ ...prev, isbn: e.target.value }))}
                    className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Judul Buku *
                </label>
                <input
                  type="text"
                  required
                  value={formData.judul}
                  onChange={e => setFormData(prev => ({ ...prev, judul: e.target.value }))}
                  className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Pengarang *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.pengarang}
                    onChange={e => setFormData(prev => ({ ...prev, pengarang: e.target.value }))}
                    className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Penerbit *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.penerbit}
                    onChange={e => setFormData(prev => ({ ...prev, penerbit: e.target.value }))}
                    className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Tahun Terbit
                  </label>
                  <input
                    type="number"
                    value={formData.tahun}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, tahun: parseInt(e.target.value) || 2026 }))
                    }
                    className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Jumlah Stok
                  </label>
                  <input
                    type="number"
                    value={formData.jumlahBuku}
                    min={0}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        jumlahBuku: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Barcode ID
                  </label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={e => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                    className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm text-center font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Kategori Buku
                  </label>
                  <select
                    value={formData.kategoriId}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, kategoriId: parseInt(e.target.value) }))
                    }
                    className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nama}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Penempatan Rak
                  </label>
                  <select
                    value={formData.rakId}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, rakId: parseInt(e.target.value) }))
                    }
                    className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm"
                  >
                    {racks.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.nama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  URL Cover Buku (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.coverBuku}
                  onChange={e => setFormData(prev => ({ ...prev, coverBuku: e.target.value }))}
                  className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer"
                >
                  Simpan Buku
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: BARCODE VIEW MODAL */}
      {barcodePrintBook && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden animate-scale-up">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">Barcode Buku</h3>
              <button
                onClick={() => setBarcodePrintBook(null)}
                className="p-1 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center justify-center space-y-4">
              <p className="text-sm font-semibold text-slate-800 text-center">
                {barcodePrintBook.judul}
              </p>
              <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200">
                <Barcode value={barcodePrintBook.barcode || barcodePrintBook.kodeBuku} />
              </div>
              <button
                onClick={() => {
                  const printWindow = window.open('', '_blank');
                  if (!printWindow) return;
                  printWindow.document.write(`
                    <html>
                      <head>
                        <title>Cetak Barcode - ${barcodePrintBook.judul}</title>
                        <style>
                          body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: monospace; }
                          h4 { margin-bottom: 10px; font-family: sans-serif; }
                        </style>
                      </head>
                      <body>
                        <h4>${barcodePrintBook.judul} (${barcodePrintBook.kodeBuku})</h4>
                        <div style="border:1px solid #ccc; padding:10px; border-radius:5px;">
                          <svg width="250" height="80">
                            <!-- Draw code lines manually for reliable local printing -->
                            <rect x="20" y="5" width="210" height="50" fill="black"/>
                            <text x="125" y="72" text-anchor="middle" font-size="14" font-weight="bold">${barcodePrintBook.barcode}</text>
                          </svg>
                        </div>
                        <script>window.onload = function() { window.print(); window.close(); }</script>
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer transition-colors"
              >
                <Printer className="w-4 h-4" />
                Cetak Barcode
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
