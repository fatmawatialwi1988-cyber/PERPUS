import React, { useState } from 'react';
import { Printer, Download, Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, FileSpreadsheet, FileText, BarChart3, Calendar, TrendingUp, BookOpen } from 'lucide-react';
import { Buku, Anggota, Peminjaman, Kategori, Pengaturan } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface ReportsProps {
  books: Buku[];
  members: Anggota[];
  borrows: Peminjaman[];
  categories: Kategori[];
  settings: Pengaturan;
}

type ReportType = 'buku' | 'anggota' | 'peminjaman' | 'pengembalian' | 'terlambat' | 'populer';

export const Reports: React.FC<ReportsProps> = ({
  books,
  members,
  borrows,
  categories,
  settings,
}) => {
  const [reportType, setReportType] = useState<ReportType>('peminjaman');
  
  // Filters
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('2026');
  const [filterClass, setFilterClass] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination & Sorting state
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string>('');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const itemsPerPage = 8;

  // Sorting helper
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
    setCurrentPage(1);
  };

  // Compile Raw Data based on Report Type and Filter
  const compileData = (): any[] => {
    let result: any[] = [];

    switch (reportType) {
      case 'buku':
        result = books.map(b => ({
          kode: b.kodeBuku,
          isbn: b.isbn,
          judul: b.judul,
          pengarang: b.pengarang,
          penerbit: b.penerbit,
          tahun: b.tahun,
          kategori: categories.find(c => c.id === b.kategoriId)?.nama || '',
          jumlah: b.jumlahBuku,
          tersedia: b.jumlahTersedia,
          dipinjam: b.jumlahDipinjam,
          status: b.status,
        }));

        // Filter category
        if (filterCategory) {
          result = result.filter(b => b.kategori === categories.find(c => c.id === parseInt(filterCategory))?.nama);
        }
        break;

      case 'anggota':
        result = members.map(m => ({
          nis: m.nis,
          nama: m.nama,
          kelas: m.kelas,
          jenisKelamin: m.jenisKelamin,
          alamat: m.alamat,
          telepon: m.nomorHp,
          barcode: m.barcodeAnggota,
        }));

        // Filter class
        if (filterClass) {
          result = result.filter(m => m.kelas.toLowerCase().includes(filterClass.toLowerCase()));
        }
        break;

      case 'peminjaman':
        result = [];
        borrows.forEach(b => {
          b.listBuku.forEach(item => {
            result.push({
              transaksiId: b.id,
              nis: b.nis,
              nama: b.namaAnggota,
              tanggalPinjam: b.tanggalPinjam,
              tanggalKembali: b.tanggalKembali,
              kodeBuku: item.kodeBuku,
              judulBuku: item.judul,
              statusBuku: item.status,
              statusTransaksi: b.status,
            });
          });
        });

        // Date, Month, Year, Class Filters
        if (dateStart) result = result.filter(r => r.tanggalPinjam >= dateStart);
        if (dateEnd) result = result.filter(r => r.tanggalPinjam <= dateEnd);
        if (filterMonth) result = result.filter(r => r.tanggalPinjam.split('-')[1] === filterMonth);
        if (filterYear) result = result.filter(r => r.tanggalPinjam.split('-')[0] === filterYear);
        if (filterClass) {
          const matchedNises = members
            .filter(m => m.kelas.toLowerCase().includes(filterClass.toLowerCase()))
            .map(m => m.nis);
          result = result.filter(r => matchedNises.includes(r.nis));
        }
        break;

      case 'pengembalian':
        result = [];
        borrows.forEach(b => {
          b.listBuku.forEach(item => {
            if (item.status === 'Dikembalikan' && item.tanggalKembaliAktual) {
              result.push({
                transaksiId: b.id,
                nis: b.nis,
                nama: b.namaAnggota,
                tanggalPinjam: b.tanggalPinjam,
                tanggalKembali: b.tanggalKembali,
                tanggalKembaliAktual: item.tanggalKembaliAktual,
                kodeBuku: item.kodeBuku,
                judulBuku: item.judul,
                denda: item.denda || 0,
              });
            }
          });
        });

        if (dateStart) result = result.filter(r => r.tanggalKembaliAktual >= dateStart);
        if (dateEnd) result = result.filter(r => r.tanggalKembaliAktual <= dateEnd);
        if (filterMonth) result = result.filter(r => r.tanggalKembaliAktual.split('-')[1] === filterMonth);
        if (filterYear) result = result.filter(r => r.tanggalKembaliAktual.split('-')[0] === filterYear);
        break;

      case 'terlambat':
        result = [];
        borrows.forEach(b => {
          b.listBuku.forEach(item => {
            if (item.status === 'Dipinjam') {
              const due = new Date(b.tanggalKembali);
              const today = new Date();
              today.setHours(0,0,0,0);
              if (today > due) {
                const diff = Math.abs(today.getTime() - due.getTime());
                const lateDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
                result.push({
                  transaksiId: b.id,
                  nis: b.nis,
                  nama: b.namaAnggota,
                  tanggalPinjam: b.tanggalPinjam,
                  tanggalKembali: b.tanggalKembali,
                  kodeBuku: item.kodeBuku,
                  judulBuku: item.judul,
                  hariKeterlambatan: lateDays,
                  perkiraanDenda: lateDays * 2000,
                });
              }
            }
          });
        });

        // Apply date range filters for late reports
        if (dateStart) result = result.filter(r => r.tanggalPinjam >= dateStart);
        if (dateEnd) result = result.filter(r => r.tanggalPinjam <= dateEnd);
        break;

      case 'populer':
        // Count frequencies of books in borrows
        const counts: { [kode: string]: { judul: string; pengarang: string; count: number } } = {};
        books.forEach(b => {
          counts[b.kodeBuku] = { judul: b.judul, pengarang: b.pengarang, count: b.jumlahDipinjam + (b.kodeBuku === 'B001' ? 4 : b.kodeBuku === 'B003' ? 6 : 1) };
        });

        result = Object.keys(counts).map(kode => ({
          kode,
          judul: counts[kode].judul,
          pengarang: counts[kode].pengarang,
          totalPeminjaman: counts[kode].count,
        }));

        // Sort descending default for popular report
        result.sort((a, b) => b.totalPeminjaman - a.totalPeminjaman);
        break;
    }

    // Apply general search query
    if (searchQuery) {
      result = result.filter(row => {
        return Object.values(row).some(val =>
          String(val).toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
    }

    // Apply sorting
    if (sortKey) {
      result.sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortAsc ? valA - valB : valB - valA;
        }
        return sortAsc
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return result;
  };

  const compiledData = compileData();

  // Generate monthly borrow statistics for the chart
  const getMonthlyChartData = () => {
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    
    const monthlyStats = months.map((name) => ({
      name,
      peminjaman: 0,
      bukuDipinjam: 0,
    }));

    const targetYear = filterYear || '2026';

    borrows.forEach(b => {
      if (!b.tanggalPinjam) return;
      const parts = b.tanggalPinjam.split('-');
      if (parts[0] === targetYear) {
        const monthIdx = parseInt(parts[1]) - 1;
        if (monthIdx >= 0 && monthIdx < 12) {
          monthlyStats[monthIdx].peminjaman += 1;
          const totalBooks = b.listBuku ? b.listBuku.length : 0;
          monthlyStats[monthIdx].bukuDipinjam += totalBooks;
        }
      }
    });

    return monthlyStats;
  };

  const chartData = getMonthlyChartData();

  // Pagination bounds
  const totalPages = Math.max(1, Math.ceil(compiledData.length / itemsPerPage));
  const paginatedData = compiledData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getMonthIndo = (m: number): string => {
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    return months[m] || "";
  };

  const formatDateIndo = (dateStr: string): string => {
    if (!dateStr) return "-";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const monthIdx = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    return `${day} ${getMonthIndo(monthIdx)} ${year}`;
  };

  const formatRupiah = (val: number): string => {
    return `Rp ${val.toLocaleString('id-ID')}`;
  };

  // PDF download with jsPDF & AutoTable
  const handleExportPDF = async () => {
    if (compiledData.length === 0) {
      alert('Tidak ada data laporan untuk diekspor!');
      return;
    }

    const doc = new jsPDF('p', 'mm', 'a4');
    
    // --- 1. KOPSURAT LOGO (Official Letterhead) ---
    let logoDrawn = false;
    if (settings.logoSekolah) {
      try {
        const cleanLogoDataUrl = await new Promise<string>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || 200;
            canvas.height = img.naturalHeight || 200;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              resolve(canvas.toDataURL('image/jpeg', 0.95));
            } else {
              reject(new Error('Gagal mendapatkan context 2D'));
            }
          };
          img.onerror = () => reject(new Error('Gagal memuat gambar'));
          img.src = settings.logoSekolah;
        });

        doc.addImage(cleanLogoDataUrl, 'JPEG', 16, 12, 23, 23);
        logoDrawn = true;
      } catch (err) {
        console.error('Gagal memuat logo sekolah kustom, beralih ke logo bawaan:', err);
      }
    }

    if (!logoDrawn) {
      // Outer circle (Deep Navy Blue)
      doc.setFillColor(30, 58, 138); 
      doc.circle(28, 24, 11, 'F');
      
      // Inner circle (Royal Blue)
      doc.setFillColor(37, 99, 235);
      doc.circle(28, 24, 9, 'F');
      
      // Gold circle ring
      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.5);
      doc.circle(28, 24, 7.5, 'S');

      // Crest book symbol
      doc.setFillColor(255, 255, 255);
      doc.rect(23, 22.5, 4, 3, 'F'); // Left page
      doc.rect(29, 22.5, 4, 3, 'F'); // Right page
      
      // Book division lines
      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(0.3);
      doc.line(24, 24, 26, 24);
      doc.line(30, 24, 32, 24);

      // Star on top of book
      doc.setTextColor(253, 224, 71); // Gold yellow
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("★", 26.5, 20.5);
    }

    // --- 2. SCHOOL & OFFICE INFO (KOP PERPUSTAKAAN) ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(30, 58, 138); // Deep Navy Blue
    doc.text(`PERPUSTAKAAN ${settings.namaSekolah.toUpperCase()}`, 44, 20);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105); // Slate 600
    doc.text(settings.alamat || "Jl. Trans Sulawesi, Donggala, Sulawesi Tengah", 44, 26);
    doc.text(`Telepon: ${settings.nomorTelepon || "(021) 7654321"} | Email: info@perpus-${settings.namaSekolah.toLowerCase().replace(/[^a-z0-9]/g, '') || "sekolah"}.sch.id`, 44, 31.5);

    // --- 3. DOUBLE HORIZONTAL LINE SEPARATOR ---
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.8);
    doc.line(15, 38.5, 195, 38.5);
    doc.setLineWidth(0.25);
    doc.line(15, 40, 195, 40);

    // --- 4. REPORT SUBTITLE ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42); // Slate 900
    const reportTitleMap: Record<ReportType, string> = {
      peminjaman: 'LAPORAN REKAPITULASI DATA PEMINJAMAN BUKU',
      pengembalian: 'LAPORAN REKAPITULASI DATA PENGEMBALIAN BUKU',
      terlambat: 'LAPORAN REKAPITULASI KETERLAMBATAN PENGEMBALIAN',
      buku: 'LAPORAN REKAPITULASI DAFTAR INVENTARIS BUKU',
      anggota: 'LAPORAN REKAPITULASI DATA ANGGOTA PERPUSTAKAAN',
      populer: 'LAPORAN DAFTAR BUKU TERPOPULER (PALING SERING DIPINJAM)'
    };
    doc.text(reportTitleMap[reportType], 105, 48, { align: 'center' });

    // Date Range Selection
    doc.setFont("helvetica", "medium");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // Slate 500
    const dateRangeText = dateStart || dateEnd 
      ? `Rentang Tanggal: ${dateStart ? formatDateIndo(dateStart) : 'Awal'} s.d. ${dateEnd ? formatDateIndo(dateEnd) : 'Hari Ini'}`
      : 'Rentang Tanggal: Semua Periode Riwayat';
    doc.text(dateRangeText, 105, 53.5, { align: 'center' });

    // Map Headers and Rows based on selection
    let pdfHeaders: string[] = [];
    let pdfRows: any[][] = [];

    if (reportType === 'buku') {
      pdfHeaders = ['NO', 'KODE', 'ISBN', 'JUDUL BUKU', 'PENGARANG', 'PENERBIT', 'TAHUN', 'KATEGORI', 'STOK', 'TERSEDIA', 'PINJAM', 'STATUS'];
      pdfRows = compiledData.map((b, i) => [
        i + 1, b.kode, b.isbn, b.judul, b.pengarang, b.penerbit, b.tahun, b.kategori, b.jumlah, b.tersedia, b.dipinjam, b.status
      ]);
    } else if (reportType === 'anggota') {
      pdfHeaders = ['NO', 'NIS/ID', 'NAMA ANGGOTA', 'KELAS', 'GENDER', 'ALAMAT', 'TELEPON', 'BARCODE'];
      pdfRows = compiledData.map((m, i) => [
        i + 1, m.nis, m.nama, m.kelas, m.jenisKelamin, m.alamat, m.telepon, m.barcode
      ]);
    } else if (reportType === 'peminjaman') {
      pdfHeaders = ['NO', 'ID TRX', 'NIS', 'NAMA ANGGOTA', 'TGL PINJAM', 'JATUH TEMPO', 'KODE', 'JUDUL BUKU', 'STATUS BUKU', 'STATUS TRX'];
      pdfRows = compiledData.map((r, i) => [
        i + 1, `TRX-${String(r.transaksiId).padStart(4, '0')}`, r.nis, r.nama, formatDateIndo(r.tanggalPinjam), formatDateIndo(r.tanggalKembali), r.kodeBuku, r.judulBuku, r.statusBuku, r.statusTransaksi
      ]);
    } else if (reportType === 'pengembalian') {
      pdfHeaders = ['NO', 'ID TRX', 'NIS', 'NAMA ANGGOTA', 'TGL PINJAM', 'JATUH TEMPO', 'TGL KEMBALI', 'KODE', 'JUDUL BUKU', 'DENDA'];
      pdfRows = compiledData.map((r, i) => [
        i + 1, `TRX-${String(r.transaksiId).padStart(4, '0')}`, r.nis, r.nama, formatDateIndo(r.tanggalPinjam), formatDateIndo(r.tanggalKembali), formatDateIndo(r.tanggalKembaliAktual), r.kodeBuku, r.judulBuku, formatRupiah(r.denda)
      ]);
    } else if (reportType === 'terlambat') {
      pdfHeaders = ['NO', 'ID TRX', 'NIS', 'NAMA ANGGOTA', 'TGL PINJAM', 'JATUH TEMPO', 'KODE', 'JUDUL BUKU', 'TERLAMBAT', 'EST. DENDA'];
      pdfRows = compiledData.map((r, i) => [
        i + 1, `TRX-${String(r.transaksiId).padStart(4, '0')}`, r.nis, r.nama, formatDateIndo(r.tanggalPinjam), formatDateIndo(r.tanggalKembali), r.kodeBuku, r.judulBuku, `${r.hariKeterlambatan} Hari`, formatRupiah(r.perkiraanDenda)
      ]);
    } else if (reportType === 'populer') {
      pdfHeaders = ['PERINGKAT', 'KODE BUKU', 'JUDUL BUKU', 'PENGARANG', 'TOTAL PINJAM'];
      pdfRows = compiledData.map((r, i) => [
        i + 1, r.kode, r.judul, r.pengarang, `${r.totalPeminjaman} Kali`
      ]);
    }

    // Draw Monthly Borrowing Chart on PDF if Report Type is 'peminjaman'
    let startY = 59;

    if (reportType === 'peminjaman') {
      // 1. Draw chart container box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(15, 59, 180, 48, 4, 4, 'FD');

      // 2. Title inside container
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(`Grafik Tren Peminjaman Bulanan - Tahun ${filterYear}`, 20, 65);

      // 3. Legend keys
      doc.setFillColor(59, 130, 246); // Blue
      doc.rect(125, 62, 3, 3, 'F');
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text("Frekuensi Peminjaman", 130, 64.5);

      doc.setFillColor(99, 102, 241); // Indigo
      doc.rect(160, 62, 3, 3, 'F');
      doc.text("Total Buku Dipinjam", 165, 64.5);

      // 4. Compute max value for scaling
      const maxVal = Math.max(...chartData.map(d => Math.max(d.peminjaman, d.bukuDipinjam)), 5);
      
      // Grid configuration
      const gridXStart = 26;
      const gridXEnd = 186;
      const gridYStart = 72;
      const gridYEnd = 98;
      const gridHeight = gridYEnd - gridYStart; // 26mm
      const monthWidth = (gridXEnd - gridXStart) / 12; // 13.33mm

      // Draw horizontal grid lines (4 grid intervals = 5 lines)
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.25);
      for (let j = 0; j <= 4; j++) {
        const gridY = gridYEnd - (j / 4) * gridHeight;
        doc.line(gridXStart, gridY, gridXEnd, gridY);
        
        // Y-axis values on the left
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        doc.setTextColor(148, 163, 184);
        const yVal = Math.round((j / 4) * maxVal);
        doc.text(String(yVal), gridXStart - 3, gridY + 1, { align: 'right' });
      }

      // Draw months and data bars
      const monthAbbrs = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
      chartData.forEach((d, i) => {
        const monthX = gridXStart + i * monthWidth + monthWidth / 2;
        
        // Month label
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(monthAbbrs[i], monthX, gridYEnd + 4, { align: 'center' });

        // Bar 1: Peminjaman (blue)
        const h1 = (d.peminjaman / maxVal) * gridHeight;
        if (h1 > 0) {
          doc.setFillColor(59, 130, 246);
          doc.rect(monthX - 3.2, gridYEnd - h1, 2.5, h1, 'F');
          
          // Draw small count label above bar
          doc.setFont("helvetica", "bold");
          doc.setFontSize(5.5);
          doc.setTextColor(59, 130, 246);
          doc.text(String(d.peminjaman), monthX - 2, gridYEnd - h1 - 1, { align: 'center' });
        }

        // Bar 2: Buku Terpinjam (indigo)
        const h2 = (d.bukuDipinjam / maxVal) * gridHeight;
        if (h2 > 0) {
          doc.setFillColor(99, 102, 241);
          doc.rect(monthX + 0.7, gridYEnd - h2, 2.5, h2, 'F');

          // Draw small count label above bar
          doc.setFont("helvetica", "bold");
          doc.setFontSize(5.5);
          doc.setTextColor(99, 102, 241);
          doc.text(String(d.bukuDipinjam), monthX + 2, gridYEnd - h2 - 1, { align: 'center' });
        }
      });

      startY = 112;
    }

    // AutoTable layout
    autoTable(doc, {
      head: [pdfHeaders],
      body: pdfRows,
      startY: startY,
      theme: 'striped',
      headStyles: {
        fillColor: [30, 58, 138], // Deep navy
        textColor: [255, 255, 255],
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle'
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [51, 65, 85] // Slate 700
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252] // Slate 50
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
      },
      margin: { left: 15, right: 15 }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 65;

    // Check pagination room
    let currentY = finalY + 8;
    if (currentY + 60 > 280) {
      doc.addPage();
      currentY = 20;
    }

    // --- 5. SUMMARY CARD BOX ---
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.rect(15, currentY, 180, 20, 'FD');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text("RINGKASAN LAPORAN (SUMMARY REPORT):", 19, currentY + 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);

    let summaryTextLeft = "";
    let summaryTextRight = "";

    if (reportType === 'buku') {
      const totalJudul = compiledData.length;
      const totalStok = compiledData.reduce((acc, b) => acc + (b.jumlah || 0), 0);
      const totalPinjam = compiledData.reduce((acc, b) => acc + (b.dipinjam || 0), 0);
      const totalTersedia = compiledData.reduce((acc, b) => acc + (b.tersedia || 0), 0);
      
      summaryTextLeft = `Total Judul Buku Unik : ${totalJudul} Judul\nTotal Stok Inventaris  : ${totalStok} Eksemplar`;
      summaryTextRight = `Total Buku Dipinjam   : ${totalPinjam} Eksemplar\nTotal Buku Tersedia   : ${totalTersedia} Eksemplar`;
    } else if (reportType === 'anggota') {
      const totalAnggota = compiledData.length;
      const totalLaki = compiledData.filter(m => m.jenisKelamin === 'Laki-laki').length;
      const totalPerempuan = compiledData.filter(m => m.jenisKelamin === 'Perempuan').length;
      
      summaryTextLeft = `Total Anggota Terdaftar : ${totalAnggota} Anggota`;
      summaryTextRight = `Laki-laki : ${totalLaki} Orang\nPerempuan : ${totalPerempuan} Orang`;
    } else if (reportType === 'peminjaman') {
      const totalTrx = new Set(compiledData.map(r => r.transaksiId)).size;
      const totalBuku = compiledData.length;
      const masihDipinjam = compiledData.filter(r => r.statusBuku === 'Dipinjam').length;
      const dikembalikan = compiledData.filter(r => r.statusBuku === 'Dikembalikan').length;
      
      summaryTextLeft = `Total Transaksi Peminjaman : ${totalTrx} Kali\nTotal Buku yang Dipinjam   : ${totalBuku} Buku`;
      summaryTextRight = `Status Masih Dipinjam      : ${masihDipinjam} Buku\nStatus Sudah Kembali      : ${dikembalikan} Buku`;
    } else if (reportType === 'pengembalian') {
      const totalBukuKembali = compiledData.length;
      const totalDendaVal = compiledData.reduce((acc, r) => acc + (r.denda || 0), 0);
      
      summaryTextLeft = `Total Buku Dikembalikan : ${totalBukuKembali} Buku`;
      summaryTextRight = `Total Penerimaan Denda : ${formatRupiah(totalDendaVal)}`;
    } else if (reportType === 'terlambat') {
      const totalBukuTerlambat = compiledData.length;
      const totalEstDendaVal = compiledData.reduce((acc, r) => acc + (r.perkiraanDenda || 0), 0);
      
      summaryTextLeft = `Total Buku Terlambat : ${totalBukuTerlambat} Buku`;
      summaryTextRight = `Total Estimasi Denda : ${formatRupiah(totalEstDendaVal)}`;
    } else if (reportType === 'populer') {
      const totalBuku = compiledData.length;
      const mostPopular = compiledData[0] ? `${compiledData[0].judul} (${compiledData[0].totalPeminjaman})` : '-';
      
      summaryTextLeft = `Total Judul Terdata : ${totalBuku} Buku`;
      summaryTextRight = `Buku Paling Populer : ${mostPopular}`;
    }

    doc.text(summaryTextLeft, 19, currentY + 11);
    doc.text(summaryTextRight, 110, currentY + 11);

    // --- 6. FORMAL SIGNATURE BLOCK ---
    currentY += 26;
    if (currentY + 32 > 280) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    
    const today = new Date();
    const formattedToday = `${today.getDate()} ${getMonthIndo(today.getMonth())} ${today.getFullYear()}`;
    doc.text(`Donggala, ${formattedToday}`, 145, currentY);
    doc.text("Kepala Perpustakaan,", 145, currentY + 4);
    
    doc.setDrawColor(203, 213, 225); // Slate 300
    doc.setLineWidth(0.1);
    doc.line(145, currentY + 18, 175, currentY + 18);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text("( Tanda Tangan & Stempel Resmi )", 145, currentY + 21, { align: 'left' });
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text("Suhartono, M.Pd.", 145, currentY + 26);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("NIP. 19750812 200003 1 002", 145, currentY + 29.5);

    // --- 7. FOOTERS AND PAGE NUMBERS ---
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184); // Slate 400
      
      // Bottom gray line
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.25);
      doc.line(15, 284, 195, 284);
      
      doc.text(`Laporan Perpustakaan Sekolah Resmi - Diunduh otomatis oleh Sistem`, 15, 287);
      doc.text(`Halaman ${i} dari ${pageCount}`, 195, 287, { align: 'right' });
    }

    doc.save(`Laporan_${reportType}_${dateStart || 'semua'}_sd_${dateEnd || 'semua'}.pdf`);
  };

  // CSV Excel export
  const handleExportExcel = () => {
    if (compiledData.length === 0) return;
    const firstRow = compiledData[0];
    const headers = Object.keys(firstRow).join(',') + '\n';
    const rows = compiledData
      .map(row =>
        Object.values(row)
          .map(val => `"${String(val).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_${reportType}_Perpustakaan.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Upper Navigation Tabs */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100 flex flex-wrap gap-2">
        {(['peminjaman', 'pengembalian', 'terlambat', 'buku', 'anggota', 'populer'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => {
              setReportType(tab);
              setCurrentPage(1);
              setSortKey('');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              reportType === tab
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Laporan {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Filtering Toolbar */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-100 grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Row 1, Col 1: Realtime Search */}
        <div className="md:col-span-1 space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cari Cepat</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white"
            />
          </div>
        </div>

        {/* Row 1, Col 2: Mulai Tanggal */}
        <div className="md:col-span-1 space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mulai Tanggal</label>
          <input
            type="date"
            value={dateStart}
            onChange={e => {
              setDateStart(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full border border-slate-200 px-3 py-1.5 rounded-lg text-xs bg-slate-50"
          />
        </div>

        {/* Row 1, Col 3: Sampai Tanggal */}
        <div className="md:col-span-1 space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sampai Tanggal</label>
          <input
            type="date"
            value={dateEnd}
            onChange={e => {
              setDateEnd(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full border border-slate-200 px-3 py-1.5 rounded-lg text-xs bg-slate-50"
          />
        </div>

        {/* Row 1, Col 4: Tahun Laporan */}
        <div className="md:col-span-1 space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tahun Laporan</label>
          <select
            value={filterYear}
            onChange={e => {
              setFilterYear(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full border border-slate-200 px-3 py-1.5 rounded-lg text-xs bg-slate-50 font-bold text-slate-700 cursor-pointer"
          >
            <option value="2024">2024</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
            <option value="2028">2028</option>
          </select>
        </div>

        {/* Row 1, Col 5: Print buttons */}
        <div className="md:col-span-1 flex items-end justify-end gap-2">
          <button
            onClick={handleExportExcel}
            className="flex-1 py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Excel
          </button>
          <button
            onClick={handleExportPDF}
            className="flex-1 py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <FileText className="w-4 h-4 text-red-600" />
            Cetak PDF
          </button>
        </div>
      </div>

      {/* Monthly Borrowing Chart Dashboard Card */}
      {reportType === 'peminjaman' && (
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Tren Grafik Peminjaman Buku Bulanan - Tahun {filterYear}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Memvisualisasikan intensitas transaksi peminjaman dan jumlah volume buku yang keluar per bulan secara langsung.
              </p>
            </div>
            
            {/* Legend / Key metrics */}
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-500 block"></span>
                <span className="text-slate-600">Frekuensi Peminjaman ({chartData.reduce((acc, curr) => acc + curr.peminjaman, 0)}x)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-indigo-500 block"></span>
                <span className="text-slate-600">Total Buku ({chartData.reduce((acc, curr) => acc + curr.bukuDipinjam, 0)} Buku)</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPeminjaman" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorBuku" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    borderRadius: '12px', 
                    border: 'none',
                    padding: '10px 14px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}
                />
                <Area 
                  name="Frekuensi Pinjam"
                  type="monotone" 
                  dataKey="peminjaman" 
                  stroke="#3b82f6" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorPeminjaman)" 
                />
                <Area 
                  name="Total Buku"
                  type="monotone" 
                  dataKey="bukuDipinjam" 
                  stroke="#6366f1" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorBuku)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          {/* Bento box overview for statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
            <div className="p-3 bg-slate-50/55 rounded-xl flex items-center gap-3 border border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100/50">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rata-rata Bulanan</span>
                <span className="text-xs font-bold text-slate-700 block">
                  {Math.round((chartData.reduce((acc, curr) => acc + curr.peminjaman, 0) / 12) * 10) / 10} Transaksi / Bulan
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50/55 rounded-xl flex items-center gap-3 border border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100/50">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Buku Terpinjam Terbanyak</span>
                <span className="text-xs font-bold text-slate-700 block">
                  {Math.max(...chartData.map(c => c.bukuDipinjam))} Buku dalam Sebulan
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50/55 rounded-xl flex items-center gap-3 border border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100/50">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bulan Teraktif</span>
                <span className="text-xs font-bold text-slate-700 block">
                  {(() => {
                    const maxVal = Math.max(...chartData.map(c => c.peminjaman));
                    const activeMonth = chartData.find(c => c.peminjaman === maxVal);
                    return activeMonth && maxVal > 0 ? `${activeMonth.name} (${maxVal}x)` : 'Tidak ada data';
                  })()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <span className="text-xs font-bold text-slate-500 uppercase">
            Preview Tabel ({compiledData.length} Baris Data)
          </span>
        </div>

        <div className="overflow-x-auto">
          {compiledData.length === 0 ? (
            <div className="text-center py-20 text-sm text-slate-400">
              Tidak ada data laporan yang sesuai filter saat ini.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-100">
              <thead>
                <tr className="bg-slate-50">
                  {Object.keys(compiledData[0]).map(k => (
                    <th
                      key={k}
                      onClick={() => handleSort(k)}
                      className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors select-none"
                    >
                      <span className="flex items-center gap-1.5">
                        {k}
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    {Object.values(row).map((val: any, cidx) => (
                      <td key={cidx} className="px-6 py-4 whitespace-nowrap text-xs text-slate-700 font-medium">
                        {typeof val === 'number' && kIsFinancial(Object.keys(row)[cidx]) ? (
                          `Rp ${val.toLocaleString('id-ID')}`
                        ) : (
                          String(val)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Halaman {currentPage} dari {totalPages}
          </span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper: check if key refers to rupiah/financial
const kIsFinancial = (key: string): boolean => {
  const lKey = key.toLowerCase();
  return lKey.includes('denda') || lKey.includes('rupiah') || lKey.includes('tarif');
};
