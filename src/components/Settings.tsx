import React, { useState } from 'react';
import { Settings as SettingsIcon, Save, Database, ShieldAlert, Palette, Moon, Sun, Library, User as UserIcon, UploadCloud, X, Image } from 'lucide-react';
import { Pengaturan, User } from '../types';

interface SettingsProps {
  settings: Pengaturan;
  activeUser: User | null;
  onUpdateSettings: (settings: Pengaturan) => void;
  onResetDatabase: () => void;
  users: User[];
  onUpdateUsers: (users: User[]) => void;
}

export const Settings: React.FC<SettingsProps> = ({
  settings,
  activeUser,
  onUpdateSettings,
  onResetDatabase,
  users,
  onUpdateUsers,
}) => {
  const [formData, setFormData] = useState<Pengaturan>({ ...settings });
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('File harus berupa gambar!');
      return;
    }
    // Limit size to 2MB to prevent localStorage overflow
    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran file gambar terlalu besar! Maksimal 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setFormData(prev => ({ ...prev, logoSekolah: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileChange(file);
    }
  };

  // User management states
  const [selectedUsername, setSelectedUsername] = useState(users[0]?.username || 'admin');
  const [userEditForm, setUserEditForm] = useState(() => {
    const defaultUser = users.find(u => u.username === selectedUsername) || users[0];
    return {
      nama: defaultUser?.nama || '',
      password: defaultUser?.password || (defaultUser?.role === 'Administrator' ? 'admin123' : 'petugas123'),
      role: defaultUser?.role || 'Administrator'
    };
  });

  const handleUserSelect = (username: string) => {
    setSelectedUsername(username);
    const selectedUser = users.find(u => u.username === username);
    if (selectedUser) {
      setUserEditForm({
        nama: selectedUser.nama,
        password: selectedUser.password || (selectedUser.role === 'Administrator' ? 'admin123' : 'petugas123'),
        role: selectedUser.role
      });
    }
  };

  const handleSaveUserChanges = () => {
    if (!userEditForm.nama || !userEditForm.password) {
      alert('Nama dan Password tidak boleh kosong!');
      return;
    }

    const updatedUsers = users.map(u => {
      if (u.username === selectedUsername) {
        return {
          ...u,
          nama: userEditForm.nama,
          password: userEditForm.password,
          role: userEditForm.role
        };
      }
      return u;
    });

    onUpdateUsers(updatedUsers);
    alert(`Akun pengguna '${selectedUsername}' berhasil diperbarui!`);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(formData);
    alert('Pengaturan sekolah berhasil diperbarui!');
  };

  const handleBackup = () => {
    // Simulate generating database binary download file
    const backupObj = {
      timestamp: new Date().toISOString(),
      creator: activeUser?.username || 'system',
      version: '1.0.0',
      data: {
        books: localStorage.getItem('lib_books'),
        members: localStorage.getItem('lib_members'),
        borrows: localStorage.getItem('lib_borrows'),
        settings: JSON.stringify(settings),
      }
    };

    const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'database_backup.db');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert('Pencadangan Selesai! Berkas backup database_backup.db berhasil diunduh secara lokal.');
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (activeUser?.role !== 'Administrator') {
      alert('Hanya Administrator yang diperbolehkan memulihkan (Restore) database!');
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    if (confirm('Peringatan: Melakukan pemulihan database akan menimpa semua data transaksi saat ini. Apakah Anda yakin ingin melanjutkan?')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.data) {
            if (parsed.data.books) localStorage.setItem('lib_books', parsed.data.books);
            if (parsed.data.members) localStorage.setItem('lib_members', parsed.data.members);
            if (parsed.data.borrows) localStorage.setItem('lib_borrows', parsed.data.borrows);
            
            alert('Database berhasil dipulihkan dari file backup! Muat ulang sistem untuk menerapkan.');
            window.location.reload();
          } else {
            alert('Format berkas backup tidak sesuai!');
          }
        } catch (err) {
          alert('Gagal mengurai file backup database.');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      {/* COLUMN 1 & 2: CONFIGURATION FORM */}
      <form onSubmit={handleSaveSettings} className="lg:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100 space-y-6">
          <div className="border-b border-slate-100 pb-4 mb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <SettingsIcon className="w-5.5 h-5.5 text-blue-500" />
              Pengaturan Identitas Sekolah
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Nama Sekolah *
              </label>
              <input
                type="text"
                required
                value={formData.namaSekolah}
                onChange={e => setFormData(prev => ({ ...prev, namaSekolah: e.target.value }))}
                className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm bg-slate-50 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Nomor Telepon Sekolah
              </label>
              <input
                type="text"
                value={formData.nomorTelepon}
                onChange={e => setFormData(prev => ({ ...prev, nomorTelepon: e.target.value }))}
                className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm bg-slate-50 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
              Alamat Lengkap Sekolah
            </label>
            <textarea
              rows={2}
              value={formData.alamat}
              onChange={e => setFormData(prev => ({ ...prev, alamat: e.target.value }))}
              className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm bg-slate-50 focus:bg-white resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">
              Logo Sekolah
            </label>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              {/* Preview container */}
              <div className="md:col-span-1 flex flex-col items-center justify-center p-3 bg-slate-50 border border-slate-200 rounded-2xl h-36">
                {formData.logoSekolah ? (
                  <div className="relative group w-full h-full flex flex-col items-center justify-center">
                    <img
                      src={formData.logoSekolah}
                      alt="Logo Sekolah"
                      className="max-w-full max-h-24 object-contain rounded-lg"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, logoSekolah: '' }))}
                      className="absolute -top-1 -right-1 p-1 bg-red-100 hover:bg-red-200 text-red-600 rounded-full transition-colors shadow-sm cursor-pointer"
                      title="Hapus Logo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] text-slate-400 mt-1">Pratinjau Logo</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <Image className="w-8 h-8 mb-1 opacity-40" />
                    <span className="text-[10px] text-center">Belum ada logo</span>
                  </div>
                )}
              </div>

              {/* Upload area */}
              <div className="md:col-span-3">
                <label
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-4 cursor-pointer transition-all h-36 ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50/50'
                      : 'border-slate-200 bg-slate-50/30 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <UploadCloud className={`w-8 h-8 mb-1.5 transition-colors ${isDragging ? 'text-blue-500' : 'text-slate-400'}`} />
                  <p className="text-xs font-semibold text-slate-700 text-center">
                    Tarik & lepas file logo ke sini, atau <span className="text-blue-600">pilih file</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 text-center">
                    Mendukung PNG, JPG, JPEG, SVG (Maks. 2MB)
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleFileChange(file);
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Rules settings */}
          <div className="border-t border-slate-100 pt-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              Aturan Default Peminjaman
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Lama Pinjam Default (Hari)
                </label>
                <input
                  type="number"
                  min={1}
                  value={formData.lamaPinjamDefault}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      lamaPinjamDefault: parseInt(e.target.value) || 7,
                    }))
                  }
                  className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm text-center"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Denda Keterlambatan per Hari (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.dendaPerHari}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      dendaPerHari: parseInt(e.target.value) || 2000,
                    }))
                  }
                  className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm text-center font-bold"
                />
              </div>
            </div>
          </div>

          {/* Palette Customizer */}
          <div className="border-t border-slate-100 pt-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-slate-400" />
              Tema & Gaya Visual Aplikasi
            </h4>
            <div className="flex gap-4">
              {(['blue', 'slate', 'green'] as const).map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, tema: color }))}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border capitalize transition-all cursor-pointer ${
                    formData.tema === color
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Tema {color}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              Simpan Semua Konfigurasi
            </button>
          </div>
        </div>
      </form>

      {/* COLUMN 3: BACKUP / RESTORE DATABASE & USER MANAGEMENT */}
      <div className="space-y-6">
        {/* User management card */}
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-emerald-500" />
            Kelola Akun Petugas & Admin
          </h3>
          <p className="text-xs text-slate-500">
            Pilih salah satu operator atau administrator bawaan di bawah ini untuk mengubah nama tampilan, kata sandi, dan tingkat otorisasi sistem.
          </p>

          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pilih Akun</label>
              <select
                value={selectedUsername}
                onChange={e => handleUserSelect(e.target.value)}
                className="w-full border border-slate-200 px-3 py-2 rounded-lg text-xs bg-slate-50 cursor-pointer"
              >
                {users.map(u => (
                  <option key={u.username} value={u.username}>
                    {u.username} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nama Lengkap / Tampilan</label>
              <input
                type="text"
                value={userEditForm.nama}
                onChange={e => setUserEditForm(prev => ({ ...prev, nama: e.target.value }))}
                className="w-full border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Password Baru</label>
              <input
                type="password"
                value={userEditForm.password}
                onChange={e => setUserEditForm(prev => ({ ...prev, password: e.target.value }))}
                className="w-full border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Hak Akses (Role)</label>
              <select
                value={userEditForm.role}
                onChange={e => setUserEditForm(prev => ({ ...prev, role: e.target.value as 'Administrator' | 'Petugas' }))}
                className="w-full border border-slate-200 px-3 py-1.5 rounded-lg text-xs bg-slate-50 cursor-pointer"
              >
                <option value="Administrator">Administrator</option>
                <option value="Petugas">Petugas</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleSaveUserChanges}
              className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              Simpan Perubahan Akun
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-500" />
            Cadangkan & Pemulihan Data
          </h3>
          <p className="text-xs text-slate-500">
            Amankan data inventaris buku, keanggotaan siswa, dan sejarah peminjaman lokal Anda dengan sekali klik.
          </p>

          <button
            type="button"
            onClick={handleBackup}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Database className="w-4 h-4" />
            Backup Database
          </button>

          <div className="border-t border-slate-100 pt-4">
            <label className="w-full py-2.5 px-4 border border-indigo-200 hover:bg-indigo-50 rounded-lg text-xs font-bold text-indigo-700 transition-all cursor-pointer flex items-center justify-center gap-2">
              <Database className="w-4 h-4" />
              Restore Database (.db)
              <input
                type="file"
                accept=".db,.json"
                onChange={handleRestore}
                className="hidden"
                disabled={activeUser?.role !== 'Administrator'}
              />
            </label>
            {activeUser?.role !== 'Administrator' && (
              <p className="text-[10px] text-amber-600 font-semibold mt-2 bg-amber-50 p-2 rounded-md">
                * Fitur Restore Database terkunci. Hanya Administrator yang dapat memulihkan backup database.
              </p>
            )}
          </div>
        </div>

        {/* Database reset block */}
        {activeUser?.role === 'Administrator' && (
          <div className="bg-red-50 p-6 rounded-2xl border border-red-200 space-y-4 text-red-950">
            <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-red-600 animate-pulse" />
              Danger Zone (Zona Bahaya)
            </h4>
            <p className="text-xs text-red-700 font-medium">
              Tindakan di bawah ini akan menghapus seluruh database dan mengembalikannya ke pengaturan pabrik bawaan.
            </p>

            <button
              type="button"
              onClick={() => {
                if (confirm('PERINGATAN: Anda akan menghapus seluruh data siswa, data buku, dan seluruh sejarah transaksi perpustakaan sekolah. Apakah Anda yakin ingin mengulang database (Reset)?')) {
                  onResetDatabase();
                }
              }}
              className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer transition-colors"
            >
              Kosongkan Database (Reset)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
