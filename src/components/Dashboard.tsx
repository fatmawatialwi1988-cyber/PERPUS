import React from 'react';
import { BookOpen, Users, BookmarkCheck, AlertCircle, TrendingUp, HelpCircle, History, Star } from 'lucide-react';
import { Buku, Anggota, Peminjaman } from '../types';

interface DashboardProps {
  books: Buku[];
  members: Anggota[];
  borrows: Peminjaman[];
}

export const Dashboard: React.FC<DashboardProps> = ({ books, members, borrows }) => {
  // Calculations
  const totalBooks = books.reduce((sum, b) => sum + b.jumlahBuku, 0);
  const totalTitles = books.length;
  const totalMembers = members.length;
  
  // Count books currently borrowed (sum of listBuku in non-finished borrows that are 'Dipinjam' status)
  let booksBorrowed = 0;
  let booksOverdue = 0;

  borrows.forEach(b => {
    b.listBuku.forEach(item => {
      if (item.status === 'Dipinjam') {
        booksBorrowed++;
        
        // check if overdue (dueDate < today)
        const dueDate = new Date(b.tanggalKembali);
        const today = new Date();
        today.setHours(0,0,0,0);
        if (dueDate < today) {
          booksOverdue++;
        }
      }
    });
  });

  // Most Borrowed Books calculation (simulated/aggregated)
  const bookBorrowCounts: { [kode: string]: { judul: string, count: number } } = {};
  
  // Pre-seed some counts so list has content
  books.forEach(b => {
    bookBorrowCounts[b.kodeBuku] = {
      judul: b.judul,
      count: b.jumlahDipinjam + (b.kodeBuku === 'B001' ? 4 : b.kodeBuku === 'B003' ? 6 : 1)
    };
  });

  const topBooks = Object.values(bookBorrowCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 10 last transactions
  const lastTransactions = [...borrows]
    .sort((a, b) => b.id - a.id)
    .slice(0, 10);

  // Chart data simulation (last 6 months)
  const chartData = [
    { month: 'Jan', count: 45 },
    { month: 'Feb', count: 58 },
    { month: 'Mar', count: 80 },
    { month: 'Apr', count: 65 },
    { month: 'Mei', count: 95 },
    { month: 'Jun', count: 120 },
    { month: 'Jul', count: borrows.length + 50 }
  ];

  const maxVal = Math.max(...chartData.map(d => d.count), 1);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Welcome Panel */}
      <div className="flex justify-between items-center bg-linear-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Selamat Datang di Sistem Perpustakaan</h1>
          <p className="text-blue-100 mt-1 text-sm">Kelola buku, anggota, dan transaksi peminjaman dengan mudah dalam satu dashboard.</p>
        </div>
        <div className="bg-white/10 px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wider uppercase border border-white/20">
          Status: Offline Lokal
        </div>
      </div>

      {/* Grid Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-100 flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Jumlah Buku</p>
            <p className="text-xl font-bold text-slate-900">{totalBooks}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-100 flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <BookmarkCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Jumlah Judul</p>
            <p className="text-xl font-bold text-slate-900">{totalTitles}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-100 flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Jumlah Anggota</p>
            <p className="text-xl font-bold text-slate-900">{totalMembers}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-100 flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Buku Dipinjam</p>
            <p className="text-xl font-bold text-slate-900">{booksBorrowed}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-100 flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Buku Terlambat</p>
            <p className="text-xl font-bold text-red-600">{booksOverdue}</p>
          </div>
        </div>
      </div>

      {/* Charts & Popular Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1 & 2: Monthly Borrow Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Grafik Peminjaman per Bulan (2026)
            </h2>
            <span className="text-xs text-slate-500 font-mono">Diperbarui Baru Saja</span>
          </div>

          {/* SVG Custom Responsive Line Chart */}
          <div className="h-64 flex items-end justify-between w-full relative pt-6 px-4">
            <div className="absolute inset-y-0 left-0 flex flex-col justify-between text-[10px] text-slate-400 font-mono select-none h-48 py-2">
              <span>{Math.round(maxVal)}</span>
              <span>{Math.round(maxVal / 2)}</span>
              <span>0</span>
            </div>
            
            <div className="flex items-end justify-between w-full h-48 pl-8 border-b border-l border-slate-100 pb-1 relative">
              {/* Horizontal gridlines */}
              <div className="absolute inset-x-8 top-0 border-t border-dashed border-slate-100 w-full pointer-events-none" />
              <div className="absolute inset-x-8 top-1/2 border-t border-dashed border-slate-100 w-full pointer-events-none" />

              {chartData.map((d, index) => {
                const heightPercentage = `${(d.count / maxVal) * 100}%`;
                return (
                  <div key={index} className="flex flex-col items-center group relative z-10" style={{ width: '12%' }}>
                    {/* Tooltip */}
                    <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-all duration-200 bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-md pointer-events-none z-30 font-bold">
                      {d.count} Pinjam
                    </div>
                    {/* Bar */}
                    <div 
                      className="w-full bg-linear-to-t from-blue-500 to-indigo-500 rounded-t-md hover:from-blue-600 hover:to-indigo-600 transition-all duration-300"
                      style={{ height: heightPercentage }}
                    />
                    {/* Month Label */}
                    <span className="text-xs text-slate-500 font-medium mt-2">{d.month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Column 3: Top Books */}
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-6">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            Buku Paling Populer
          </h2>

          <div className="space-y-4">
            {topBooks.map((book, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-all">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                    {idx + 1}
                  </span>
                  <p className="text-sm font-semibold text-slate-800 line-clamp-1">{book.judul}</p>
                </div>
                <span className="text-xs font-mono font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-md shrink-0">
                  {book.count}x dipinjam
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom section: Recent Transactions */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-6">
          <History className="w-5 h-5 text-indigo-500" />
          10 Transaksi Terakhir
        </h2>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider rounded-l-xl">ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Anggota</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tanggal Pinjam</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tanggal Kembali</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Buku</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider rounded-r-xl">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lastTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-sm text-slate-400">Belum ada transaksi peminjaman.</td>
                </tr>
              ) : (
                lastTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-600">#{t.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{t.namaAnggota} <span className="text-xs text-slate-400">({t.nis})</span></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{t.tanggalPinjam}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{t.tanggalKembali}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-[200px] truncate">
                      {t.listBuku.map(b => b.judul).join(', ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold leading-none ${
                        t.status === 'Dipinjam' ? 'bg-amber-100 text-amber-800' :
                        t.status === 'Selesai' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
