import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Printer, Download, Upload, User as UserIcon, X, CreditCard } from 'lucide-react';
import { Anggota, Pengaturan } from '../types';
import { Barcode } from './Barcode';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';

interface MembersProps {
  members: Anggota[];
  settings: Pengaturan;
  userRole: string;
  onUpdateMembers: (members: Anggota[]) => void;
}

export const Members: React.FC<MembersProps> = ({
  members,
  settings,
  userRole,
  onUpdateMembers,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Anggota | null>(null);
  const [printCardMember, setPrintCardMember] = useState<Anggota | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  useEffect(() => {
    if (printCardMember) {
      QRCode.toDataURL(printCardMember.barcodeAnggota, {
        margin: 1,
        width: 150,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
        .then(url => {
          setQrCodeDataUrl(url);
        })
        .catch(err => {
          console.error('Failed to generate QR Code:', err);
        });
    } else {
      setQrCodeDataUrl('');
    }
  }, [printCardMember]);

  // Form State
  const [formData, setFormData] = useState<Omit<Anggota, 'barcodeAnggota'>>({
    nis: '',
    nama: '',
    kelas: '',
    jenisKelamin: 'Laki-laki',
    alamat: '',
    nomorHp: '',
    foto: '',
  });

  const resetForm = () => {
    setFormData({
      nis: '',
      nama: '',
      kelas: '',
      jenisKelamin: 'Laki-laki',
      alamat: '',
      nomorHp: '',
      foto: '',
    });
    setEditingMember(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    // Auto-generate NIS based on existing
    const nextNis = `202600${members.length + 1}`;
    setFormData(prev => ({
      ...prev,
      nis: nextNis,
    }));
    setShowFormModal(true);
  };

  const handleOpenEditModal = (member: Anggota) => {
    setEditingMember(member);
    setFormData({
      nis: member.nis,
      nama: member.nama,
      kelas: member.kelas,
      jenisKelamin: member.jenisKelamin,
      alamat: member.alamat,
      nomorHp: member.nomorHp,
      foto: member.foto || '',
    });
    setShowFormModal(true);
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nis || !formData.nama || !formData.kelas) {
      alert('Data wajib diisi (NIS, Nama, Kelas)');
      return;
    }

    if (editingMember) {
      // Update
      const updated = members.map(m => {
        if (m.nis === editingMember.nis) {
          return {
            ...m,
            ...formData,
            barcodeAnggota: `M${formData.nis}`,
          };
        }
        return m;
      });
      onUpdateMembers(updated);
    } else {
      // Create
      const isDuplicate = members.some(m => m.nis === formData.nis);
      if (isDuplicate) {
        alert('Error: Anggota dengan NIS tersebut sudah terdaftar!');
        return;
      }

      const newMember: Anggota = {
        ...formData,
        barcodeAnggota: `M${formData.nis}`,
      };
      onUpdateMembers([...members, newMember]);
    }

    setShowFormModal(false);
    resetForm();
  };

  const handleDeleteMember = (nis: string) => {
    if (userRole !== 'Administrator') {
      alert('Hanya Administrator yang memiliki wewenang menghapus data!');
      return;
    }
    if (confirm(`Apakah Anda yakin menghapus anggota dengan NIS ${nis}?`)) {
      const filtered = members.filter(m => m.nis !== nis);
      onUpdateMembers(filtered);
    }
  };

  // Filter & Search
  const filteredMembers = members.filter(m => {
    return (
      m.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.nis.includes(searchQuery) ||
      m.kelas.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Export CSV
  const handleExportCSV = () => {
    const headers = 'NIS,Nama,Kelas,Jenis Kelamin,Alamat,Nomor HP,Barcode\n';
    const rows = filteredMembers
      .map(
        m =>
          `"${m.nis}","${m.nama}","${m.kelas}","${m.jenisKelamin}","${m.alamat}","${m.nomorHp}","${m.barcodeAnggota}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Data_Anggota_Perpustakaan.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate Card JPG using a native HTML5 Canvas (avoiding html2canvas oklch parsing issues)
  const generateCardJPG = async () => {
    if (!printCardMember) return;

    try {
      // 300 DPI high resolution dimensions for CR80 card (standard credit card size: 3.375" x 2.125")
      // 1012 x 638 is standard.
      const canvas = document.createElement('canvas');
      canvas.width = 1012;
      canvas.height = 638;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Diagonal Linear Gradient Background
      const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      bgGrad.addColorStop(0, '#1e1b4b');   // indigo-900
      bgGrad.addColorStop(0.6, '#0c1033'); // indigo-950/deep slate
      bgGrad.addColorStop(1, '#020617');   // slate-950
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Decorative blur-glow circles
      // Top left blue glow
      const topGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 400);
      topGlow.addColorStop(0, 'rgba(59, 130, 246, 0.15)'); // blue-500/15
      topGlow.addColorStop(1, 'rgba(59, 130, 246, 0)');
      ctx.fillStyle = topGlow;
      ctx.beginPath();
      ctx.arc(0, 0, 400, 0, Math.PI * 2);
      ctx.fill();

      // Bottom right indigo glow
      const bottomGlow = ctx.createRadialGradient(canvas.width, canvas.height, 0, canvas.width, canvas.height, 400);
      bottomGlow.addColorStop(0, 'rgba(99, 102, 241, 0.2)'); // indigo-500/20
      bottomGlow.addColorStop(1, 'rgba(99, 102, 241, 0)');
      ctx.fillStyle = bottomGlow;
      ctx.beginPath();
      ctx.arc(canvas.width, canvas.height, 400, 0, Math.PI * 2);
      ctx.fill();

      // Inner card border (subtle indigo stroke)
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      const r = 36;
      if (ctx.roundRect) {
        ctx.roundRect(15, 15, canvas.width - 30, canvas.height - 30, r);
      } else {
        ctx.rect(15, 15, canvas.width - 30, canvas.height - 30);
      }
      ctx.stroke();

      // Helper to load image
      const loadImageSafe = (src: string): Promise<HTMLImageElement | null> => {
        return new Promise((resolve) => {
          if (!src) {
            resolve(null);
            return;
          }
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => {
            console.warn('Could not load image with CORS:', src);
            resolve(null);
          };
          img.src = src;
        });
      };

      // Load school logo and member photo
      const [schoolLogoImg, memberPhotoImg, qrCodeImg] = await Promise.all([
        loadImageSafe(settings.logoSekolah),
        loadImageSafe(printCardMember.foto || ''),
        loadImageSafe(qrCodeDataUrl)
      ]);

      // 3. School Header
      const headerY = 55;
      const marginX = 60;

      // Draw School Logo
      if (schoolLogoImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(marginX + 40, headerY + 40, 40, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(marginX, headerY, 80, 80);
        ctx.drawImage(schoolLogoImg, marginX, headerY, 80, 80);
        ctx.restore();
      } else {
        // Fallback logo
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(marginX + 40, headerY + 40, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1e1b4b';
        ctx.font = 'bold 36px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('P', marginX + 40, headerY + 42);
      }

      // Draw Header Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px "Inter", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('KARTU ANGGOTA PERPUSTAKAAN', marginX + 100, headerY + 12);

      ctx.fillStyle = '#c7d2fe';
      ctx.font = '500 20px "Inter", sans-serif';
      ctx.fillText(settings.namaSekolah, marginX + 100, headerY + 46);

      // Dividing Line below header
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(marginX, headerY + 100);
      ctx.lineTo(canvas.width - marginX, headerY + 100);
      ctx.stroke();

      // 4. Content Area
      const contentY = 190;

      // Member Photo
      const photoWidth = 160;
      const photoHeight = 208;
      if (memberPhotoImg) {
        ctx.save();
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(marginX, contentY, photoWidth, photoHeight, 16);
        } else {
          ctx.rect(marginX, contentY, photoWidth, photoHeight);
        }
        ctx.clip();
        ctx.drawImage(memberPhotoImg, marginX, contentY, photoWidth, photoHeight);
        ctx.restore();
      } else {
        // Fallback user placeholder
        ctx.fillStyle = 'rgba(67, 56, 202, 0.6)'; // indigo-800/60
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(marginX, contentY, photoWidth, photoHeight, 16);
        } else {
          ctx.rect(marginX, contentY, photoWidth, photoHeight);
        }
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw simple avatar icon
        ctx.fillStyle = '#a5b4fc';
        ctx.beginPath();
        ctx.arc(marginX + 80, contentY + 60, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(marginX + 80, contentY + 140, 48, Math.PI, 0);
        ctx.fill();
      }

      // Member Details (Nama, Nomor Anggota, NIS, Kelas)
      const detailsX = marginX + photoWidth + 40; // 60 + 160 + 40 = 260px

      // Nama Lengkap Label & Value
      ctx.fillStyle = '#a5b4fc';
      ctx.font = 'bold 16px "Inter", sans-serif';
      ctx.fillText('NAMA LENGKAP', detailsX, contentY + 10);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px "Inter", sans-serif';
      ctx.fillText(printCardMember.nama, detailsX, contentY + 36);

      // Nomor Anggota Label & Value
      ctx.fillStyle = '#a5b4fc';
      ctx.font = 'bold 16px "Inter", sans-serif';
      ctx.fillText('NOMOR ANGGOTA', detailsX, contentY + 90);

      ctx.fillStyle = '#fcd34d'; // amber-300
      ctx.font = 'bold 22px "JetBrains Mono", "Fira Code", monospace';
      ctx.fillText(printCardMember.barcodeAnggota, detailsX, contentY + 116);

      // NIS & Kelas Side-by-Side
      // NIS Label & Value
      ctx.fillStyle = '#a5b4fc';
      ctx.font = 'bold 16px "Inter", sans-serif';
      ctx.fillText('NIS', detailsX, contentY + 165);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px "JetBrains Mono", "Fira Code", monospace';
      ctx.fillText(printCardMember.nis, detailsX, contentY + 191);

      // Kelas Label & Value (shifted right)
      ctx.fillStyle = '#a5b4fc';
      ctx.font = 'bold 16px "Inter", sans-serif';
      ctx.fillText('KELAS', detailsX + 260, contentY + 165);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px "Inter", sans-serif';
      ctx.fillText(printCardMember.kelas, detailsX + 260, contentY + 191);

      // QR Code Box
      const qrBoxSize = 180;
      const qrX = canvas.width - marginX - qrBoxSize; // 1012 - 60 - 180 = 772px
      const qrY = contentY;

      // White base box
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(qrX, qrY, qrBoxSize, qrBoxSize, 16);
      } else {
        ctx.rect(qrX, qrY, qrBoxSize, qrBoxSize);
      }
      ctx.fill();

      // Border for base box
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // QR Image
      if (qrCodeImg) {
        ctx.drawImage(qrCodeImg, qrX + 10, qrY + 10, qrBoxSize - 20, qrBoxSize - 20);
      } else {
        // Fallback text if QR image not loaded
        ctx.fillStyle = '#1e1b4b';
        ctx.font = 'bold 14px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('SCAN ME', qrX + qrBoxSize / 2, qrY + qrBoxSize / 2);
      }

      // PINDAI QR Text
      ctx.fillStyle = '#c7d2fe';
      ctx.font = 'bold 14px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PINDAI QR', qrX + qrBoxSize / 2, qrY + qrBoxSize + 22);

      // 5. Footer Dividing Line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(marginX, contentY + 250);
      ctx.lineTo(canvas.width - marginX, contentY + 250);
      ctx.stroke();

      // Barcode Base Box (White background)
      const barcodeBoxWidth = 360;
      const barcodeBoxHeight = 80;
      const barcodeBoxX = marginX;
      const barcodeBoxY = contentY + 280;

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(barcodeBoxX, barcodeBoxY, barcodeBoxWidth, barcodeBoxHeight, 8);
      } else {
        ctx.rect(barcodeBoxX, barcodeBoxY, barcodeBoxWidth, barcodeBoxHeight);
      }
      ctx.fill();

      // Render Barcode Pattern inside white box
      const generatePattern = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const pattern: number[] = [];
        const len = 40;
        for (let i = 0; i < len; i++) {
          const bit = (Math.abs(hash) >> (i % 31)) & 1;
          if (i % 2 === 0) {
            pattern.push(bit ? 2 : 1);
          } else {
            pattern.push(bit ? 3 : 1);
          }
        }
        return pattern;
      };

      const pattern = generatePattern(printCardMember.barcodeAnggota);
      let totalPatternWidth = 0;
      pattern.forEach(w => { totalPatternWidth += w; });

      const scaleX = 300 / totalPatternWidth;
      let currentBarX = barcodeBoxX + (barcodeBoxWidth - 300) / 2;
      ctx.fillStyle = '#000000';
      pattern.forEach((w, idx) => {
        const isDark = idx % 2 === 0;
        if (isDark) {
          ctx.fillRect(currentBarX, barcodeBoxY + 10, w * scaleX, barcodeBoxHeight - 20);
        }
        currentBarX += w * scaleX;
      });

      // Barcode ID Text on footer (Right-aligned)
      ctx.fillStyle = '#a5b4fc';
      ctx.font = 'semibold 24px "JetBrains Mono", "Fira Code", monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(printCardMember.barcodeAnggota, canvas.width - marginX, barcodeBoxY + barcodeBoxHeight / 2);

      // 6. Trigger high resolution JPG download
      // Wait for a tiny tick to make sure all canvas updates are complete
      await new Promise(resolve => setTimeout(resolve, 50));

      const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${printCardMember.nama}_${printCardMember.nis}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('Error generating card JPG:', error);
      alert('Gagal mengunduh kartu dalam format JPG.');
    }
  };

  // Import CSV
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim() !== '');
        if (lines.length <= 1) return;

        const newMembersList = [...members];
        let importedCount = 0;

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
          if (cols.length < 3) continue;

          const [nis, nama, kelas, jenisKelamin, alamat, nomorHp] = cols;
          
          if (newMembersList.some(m => m.nis === nis)) continue;

          const newMember: Anggota = {
            nis,
            nama,
            kelas,
            jenisKelamin: (jenisKelamin === 'Perempuan' ? 'Perempuan' : 'Laki-laki') as any,
            alamat: alamat || 'Jakarta',
            nomorHp: nomorHp || '0812345678',
            barcodeAnggota: `M${nis}`,
          };
          newMembersList.push(newMember);
          importedCount++;
        }

        if (importedCount > 0) {
          onUpdateMembers(newMembersList);
          alert(`Sukses mengimpor ${importedCount} anggota baru dari berkas CSV.`);
        } else {
          alert('Tidak ada anggota baru yang diimpor (mungkin NIS sudah terdaftar).');
        }
      } catch (err) {
        alert('Format file CSV tidak valid.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Actions Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-4 rounded-2xl shadow-xs border border-slate-100">
        <div className="flex-1">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari NIS, Nama, Kelas..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

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
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tambah Anggota
          </button>
        </div>
      </div>

      {/* Members Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMembers.length === 0 ? (
          <div className="col-span-full bg-white text-center py-10 rounded-2xl shadow-xs border border-slate-100 text-slate-400 font-medium">
            Tidak ada anggota yang ditemukan.
          </div>
        ) : (
          filteredMembers.map(m => (
            <div
              key={m.nis}
              className="bg-white p-5 rounded-2xl shadow-xs border border-slate-100 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex gap-4">
                {/* Photo */}
                <div className="shrink-0">
                  {m.foto ? (
                    <img
                      src={m.foto}
                      alt={m.nama}
                      className="w-16 h-16 rounded-xl object-cover shadow-xs border border-slate-200"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                      <UserIcon className="w-8 h-8" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase">
                    {m.kelas}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{m.nama}</h4>
                  <p className="text-xs font-mono text-slate-500 font-semibold">NIS: {m.nis}</p>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-1">{m.alamat}</p>
                </div>
              </div>

              {/* Barcode preview and Action block */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100 font-bold">
                  {m.barcodeAnggota}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPrintCardMember(m)}
                    title="Cetak Kartu Anggota"
                    className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg cursor-pointer transition-colors flex items-center gap-1 text-xs font-bold px-2.5"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Kartu
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(m)}
                    className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg cursor-pointer transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteMember(m.nis)}
                    className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL 1: ADD/EDIT FORM */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-scale-up">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">
                {editingMember ? 'Ubah Data Anggota' : 'Registrasi Anggota Baru'}
              </h3>
              <button
                onClick={() => setShowFormModal(false)}
                className="p-1 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    NIS (Nomor Induk) *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={editingMember !== null}
                    value={formData.nis}
                    onChange={e => setFormData(prev => ({ ...prev, nis: e.target.value }))}
                    className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Kelas *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="X-MIPA-1"
                    value={formData.kelas}
                    onChange={e => setFormData(prev => ({ ...prev, kelas: e.target.value }))}
                    className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Nama Lengkap Anggota *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nama}
                  onChange={e => setFormData(prev => ({ ...prev, nama: e.target.value }))}
                  className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={formData.jenisKelamin}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        jenisKelamin: e.target.value as any,
                      }))
                    }
                    className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Nomor Telepon/HP
                  </label>
                  <input
                    type="text"
                    value={formData.nomorHp}
                    onChange={e => setFormData(prev => ({ ...prev, nomorHp: e.target.value }))}
                    className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Alamat Lengkap
                </label>
                <textarea
                  rows={2}
                  value={formData.alamat}
                  onChange={e => setFormData(prev => ({ ...prev, alamat: e.target.value }))}
                  className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  URL Foto Profil (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.foto}
                  onChange={e => setFormData(prev => ({ ...prev, foto: e.target.value }))}
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
                  Registrasi Anggota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PRINT LIBRARY CARD (KARTU ANGGOTA) */}
      {printCardMember && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-scale-up">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-500" />
                Kartu Anggota Perpustakaan
              </h3>
              <button
                onClick={() => setPrintCardMember(null)}
                className="p-1 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center justify-center space-y-6">
              {/* Actual Library Card Layout */}
              <div
                id="library-card-view"
                className="w-full aspect-[1.586/1] rounded-xl p-4 shadow-lg border flex flex-col justify-between relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #1e1b4b 0%, #0c1033 60%, #020617 100%)',
                  color: '#ffffff',
                  borderColor: 'rgba(99, 102, 241, 0.3)'
                }}
              >
                {/* School Header */}
                <div 
                  className="flex items-center gap-3 border-b pb-2 relative z-10"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}
                >
                  <img
                    src={settings.logoSekolah}
                    alt="Logo"
                    className="w-8 h-8 rounded-full object-cover bg-white"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h5 className="text-[10px] font-bold tracking-wider uppercase">
                      KARTU ANGGOTA PERPUSTAKAAN
                    </h5>
                    <p 
                      className="text-[8px] font-medium"
                      style={{ color: '#c7d2fe' }}
                    >
                      {settings.namaSekolah}
                    </p>
                  </div>
                </div>

                {/* Card Content (Photo + Student Details + QR Code) */}
                <div className="flex gap-3 my-2 relative z-10 flex-1 items-center">
                  <div className="shrink-0">
                    {printCardMember.foto ? (
                      <img
                        src={printCardMember.foto}
                        alt="Photo"
                        className="w-14 h-18 rounded-md object-cover border shadow-sm"
                        style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div 
                        className="w-14 h-18 rounded-md flex items-center justify-center border"
                        style={{
                          backgroundColor: 'rgba(67, 56, 202, 0.6)',
                          color: '#a5b4fc',
                          borderColor: 'rgba(255, 255, 255, 0.2)'
                        }}
                      >
                        <UserIcon size={20} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-1 text-left min-w-0">
                    <div>
                      <p 
                        className="text-[7px] font-bold uppercase tracking-wider leading-none"
                        style={{ color: '#a5b4fc' }}
                      >
                        Nama Lengkap
                      </p>
                      <p className="text-xs font-bold leading-tight truncate">{printCardMember.nama}</p>
                    </div>

                    <div>
                      <p 
                        className="text-[7px] font-bold uppercase tracking-wider leading-none"
                        style={{ color: '#a5b4fc' }}
                      >
                        Nomor Anggota
                      </p>
                      <p 
                        className="text-[9px] font-mono font-bold leading-none"
                        style={{ color: '#fcd34d' }}
                      >
                        {printCardMember.barcodeAnggota}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <p 
                          className="text-[7px] font-bold uppercase tracking-wider leading-none"
                          style={{ color: '#a5b4fc' }}
                        >
                          NIS
                        </p>
                        <p className="text-[9px] font-mono font-bold leading-none">{printCardMember.nis}</p>
                      </div>
                      <div>
                        <p 
                          className="text-[7px] font-bold uppercase tracking-wider leading-none"
                          style={{ color: '#a5b4fc' }}
                        >
                          Kelas
                        </p>
                        <p className="text-[9px] font-bold leading-none">{printCardMember.kelas}</p>
                      </div>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="shrink-0 flex flex-col items-center gap-0.5">
                    {qrCodeDataUrl ? (
                      <img
                        src={qrCodeDataUrl}
                        alt="QR Code"
                        className="w-14 h-14 p-1 rounded-md border"
                        style={{
                          backgroundColor: '#ffffff',
                          borderColor: 'rgba(99, 102, 241, 0.3)'
                        }}
                      />
                    ) : (
                      <div 
                        className="w-14 h-14 rounded-md flex items-center justify-center text-[7px]"
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          color: '#a5b4fc'
                        }}
                      >
                        Loading...
                      </div>
                    )}
                    <span 
                      className="text-[7px] font-bold tracking-wider"
                      style={{ color: '#c7d2fe' }}
                    >
                      PINDAI QR
                    </span>
                  </div>
                </div>

                {/* Card Footer (Barcode) */}
                <div 
                  className="flex items-center justify-between border-t pt-2 relative z-10"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
                >
                  <div 
                    className="px-2 py-0.5 rounded max-w-max"
                    style={{ backgroundColor: '#ffffff' }}
                  >
                    <Barcode
                      value={printCardMember.barcodeAnggota}
                      width={120}
                      height={20}
                      showText={false}
                    />
                  </div>
                  <span 
                    className="text-[9px] font-mono font-semibold tracking-widest"
                    style={{ color: '#a5b4fc' }}
                  >
                    {printCardMember.barcodeAnggota}
                  </span>
                </div>

                {/* Decorative glow elements */}
                <div 
                  className="absolute -bottom-10 -right-10 w-24 h-24 rounded-full pointer-events-none" 
                  style={{ backgroundColor: 'rgba(99, 102, 241, 0.2)', filter: 'blur(20px)' }}
                />
                <div 
                  className="absolute -top-10 -left-10 w-24 h-24 rounded-full pointer-events-none" 
                  style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', filter: 'blur(20px)' }}
                />
              </div>

              {/* Action Buttons */}
              <div className="w-full flex flex-col gap-2">
                {/* Download JPG CTA */}
                <button
                  onClick={generateCardJPG}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Kartu JPG
                </button>

                {/* Print CTA */}
                <button
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (!printWindow) return;
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Cetak Kartu Anggota - ${printCardMember.nama}</title>
                          <style>
                            body { display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #fafafa; font-family: sans-serif; }
                            .card { width: 380px; height: 240px; background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); color: white; border-radius: 12px; padding: 15px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; border: 1px solid #4338ca; position: relative; overflow: hidden; }
                            .header { display: flex; align-items: center; gap: 10px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 8px; }
                            .school-logo { width: 35px; height: 35px; border-radius: 50%; object-fit: cover; background: white; }
                            .school-title { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
                            .school-sub { font-size: 8px; color: #c7d2fe; }
                            .body-grid { display: flex; gap: 12px; margin-top: 10px; margin-bottom: 10px; align-items: center; }
                            .photo { width: 65px; height: 85px; border-radius: 6px; object-fit: cover; border: 1px solid rgba(255,255,255,0.3); }
                            .details { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 4px; min-w: 0; }
                            .field-group { display: flex; flex-direction: column; }
                            .label { font-size: 7px; color: #a5b4fc; text-transform: uppercase; font-weight: bold; margin-bottom: 1px; }
                            .val { font-size: 11px; font-weight: bold; margin-bottom: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                            .grid-sub { display: flex; gap: 15px; }
                            .qr-container { display: flex; flex-direction: column; align-items: center; gap: 2px; }
                            .qr-image { width: 60px; height: 60px; background: white; padding: 3px; border-radius: 6px; }
                            .qr-label { font-size: 7px; color: #c7d2fe; font-weight: bold; }
                            .footer { border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px; display: flex; align-items: center; justify-content: space-between; }
                            .barcode-box { background: white; padding: 2px 8px; border-radius: 4px; display: inline-flex; }
                            .barcode-no { font-size: 10px; font-family: monospace; font-weight: bold; letter-spacing: 1px; color: #a5b4fc; }
                          </style>
                        </head>
                        <body>
                          <div class="card">
                            <div class="header">
                              <img src="${settings.logoSekolah}" class="school-logo" />
                              <div>
                                <div class="school-title">KARTU ANGGOTA PERPUSTAKAAN</div>
                                <div class="school-sub">${settings.namaSekolah}</div>
                              </div>
                            </div>
                            <div class="body-grid">
                              <img src="${printCardMember.foto || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150'}" class="photo" />
                              <div class="details">
                                <div class="field-group">
                                  <div class="label">Nama Lengkap</div>
                                  <div class="val">${printCardMember.nama}</div>
                                </div>
                                <div class="field-group">
                                  <div class="label">Nomor Anggota</div>
                                  <div class="val" style="color: #fcd34d;">${printCardMember.barcodeAnggota}</div>
                                </div>
                                <div class="grid-sub">
                                  <div class="field-group">
                                    <div class="label">NIS</div>
                                    <div class="val" style="font-family: monospace;">${printCardMember.nis}</div>
                                  </div>
                                  <div class="field-group">
                                    <div class="label">Kelas</div>
                                    <div class="val">${printCardMember.kelas}</div>
                                  </div>
                                </div>
                              </div>
                              <div class="qr-container">
                                <img src="${qrCodeDataUrl}" class="qr-image" />
                                <div class="qr-label">PINDAI QR</div>
                              </div>
                            </div>
                            <div class="footer">
                              <div class="barcode-box">
                                <div style="font-size: 14px; letter-spacing: 2px; color: black; font-weight: bold; font-family: monospace;">||| ||| | ||| ||</div>
                              </div>
                              <div class="barcode-no">${printCardMember.barcodeAnggota}</div>
                            </div>
                          </div>
                          <script>window.onload = function() { window.print(); window.close(); }</script>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Cetak Fisik Kartu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
