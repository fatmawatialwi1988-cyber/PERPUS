import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  ClipboardList,
  RefreshCw,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  Library,
  User as UserIcon,
} from 'lucide-react';

import { Buku, Anggota, Peminjaman, Pengaturan, User } from './types';
import {
  INITIAL_BOOKS,
  INITIAL_MEMBERS,
  INITIAL_BORROWS,
  INITIAL_SETTINGS,
  INITIAL_CATEGORIES,
  INITIAL_RACKS,
  INITIAL_USERS,
} from './initialData';

import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Books } from './components/Books';
import { Members } from './components/Members';
import { Borrow } from './components/Borrow';
import { Return } from './components/Return';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';

export default function App() {
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Load from local storage or fallback to initials
  const [books, setBooks] = useState<Buku[]>(() => {
    const saved = localStorage.getItem('lib_books');
    return saved ? JSON.parse(saved) : INITIAL_BOOKS;
  });

  const [members, setMembers] = useState<Anggota[]>(() => {
    const saved = localStorage.getItem('lib_members');
    return saved ? JSON.parse(saved) : INITIAL_MEMBERS;
  });

  const [borrows, setBorrows] = useState<Peminjaman[]>(() => {
    const saved = localStorage.getItem('lib_borrows');
    return saved ? JSON.parse(saved) : INITIAL_BORROWS;
  });

  const [settings, setSettings] = useState<Pengaturan>(() => {
    const saved = localStorage.getItem('lib_settings');
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('lib_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  // Save to LocalStorage whenever states update
  useEffect(() => {
    localStorage.setItem('lib_books', JSON.stringify(books));
  }, [books]);

  useEffect(() => {
    localStorage.setItem('lib_members', JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem('lib_borrows', JSON.stringify(borrows));
  }, [borrows]);

  useEffect(() => {
    localStorage.setItem('lib_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('lib_users', JSON.stringify(users));
  }, [users]);

  // Handle DB reset
  const handleResetDatabase = () => {
    setBooks(INITIAL_BOOKS);
    setMembers(INITIAL_MEMBERS);
    setBorrows(INITIAL_BORROWS);
    setSettings(INITIAL_SETTINGS);
    setUsers(INITIAL_USERS);
    alert('Database berhasil dikosongkan ke pengaturan default!');
    setActiveTab('dashboard');
  };

  // Login Bypass / Handle Success
  const handleLoginSuccess = (user: User) => {
    setActiveUser(user);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setActiveUser(null);
  };

  if (!activeUser) {
    return <Login settings={settings} users={users} onLoginSuccess={handleLoginSuccess} />;
  }

  // Sidebar Tabs Config
  const sidebarTabs = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'books', name: 'Data Buku', icon: BookOpen },
    { id: 'members', name: 'Data Anggota', icon: Users },
    { id: 'borrow', name: 'Peminjaman', icon: ClipboardList },
    { id: 'return', name: 'Pengembalian', icon: RefreshCw },
    { id: 'reports', name: 'Laporan', icon: BarChart3 },
    { id: 'settings', name: 'Pengaturan', icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col justify-between shrink-0 border-r border-slate-800">
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Header/Logo */}
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            {settings.logoSekolah ? (
              <img
                src={settings.logoSekolah}
                alt="Logo"
                className="w-10 h-10 rounded-full object-cover bg-white"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shrink-0">
                <Library size={20} />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-sm font-bold tracking-tight truncate uppercase">SI PERPUS</h2>
              <p className="text-[10px] text-slate-400 font-medium truncate">{settings.namaSekolah}</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1 flex-1">
            {sidebarTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon size={18} className="shrink-0" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Info & Signout */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
              <UserIcon size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{activeUser.nama}</p>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-900/50 text-blue-300 uppercase">
                {activeUser.role}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-900/10 hover:text-red-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <LogOut size={18} />
            Keluar Sistem
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TOP STATUS BAR */}
        <header className="bg-white h-16 border-b border-slate-100 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-slate-800 capitalize tracking-tight">
              Sistem Informasi Perpustakaan &gt;{' '}
              <span className="text-blue-600">
                {activeTab === 'books' ? 'Katalog Data Buku' : activeTab}
              </span>
            </h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-mono font-bold bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
              Database SQLite: Terkoneksi Lokal (Offline)
            </div>
          </div>
        </header>

        {/* CONTENT STAGE */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-50">
          {activeTab === 'dashboard' && (
            <Dashboard books={books} members={members} borrows={borrows} />
          )}

          {activeTab === 'books' && (
            <Books
              books={books}
              categories={INITIAL_CATEGORIES}
              racks={INITIAL_RACKS}
              userRole={activeUser.role}
              onUpdateBooks={setBooks}
            />
          )}

          {activeTab === 'members' && (
            <Members
              members={members}
              settings={settings}
              userRole={activeUser.role}
              onUpdateMembers={setMembers}
            />
          )}

          {activeTab === 'borrow' && (
            <Borrow
              books={books}
              members={members}
              borrows={borrows}
              settings={settings}
              onUpdateBooks={setBooks}
              onUpdateBorrows={setBorrows}
            />
          )}

          {activeTab === 'return' && (
            <Return
              books={books}
              members={members}
              borrows={borrows}
              settings={settings}
              onUpdateBooks={setBooks}
              onUpdateBorrows={setBorrows}
            />
          )}

          {activeTab === 'reports' && (
            <Reports
              books={books}
              members={members}
              borrows={borrows}
              categories={INITIAL_CATEGORIES}
              settings={settings}
            />
          )}

          {activeTab === 'settings' && (
            <Settings
              settings={settings}
              activeUser={activeUser}
              onUpdateSettings={setSettings}
              onResetDatabase={handleResetDatabase}
              users={users}
              onUpdateUsers={setUsers}
            />
          )}
        </main>
      </div>
    </div>
  );
}
