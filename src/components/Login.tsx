import React, { useState } from 'react';
import { KeyRound, User as UserIcon, Lock, Library, Info } from 'lucide-react';
import { User, Pengaturan } from '../types';
import { INITIAL_USERS } from '../initialData';

interface LoginProps {
  settings: Pengaturan;
  users: User[];
  onLoginSuccess: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ settings, users, onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123'); // For simulated offline login
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const foundUser = users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    );

    if (foundUser) {
      const correctPassword = foundUser.password || (foundUser.role === 'Administrator' ? 'admin123' : 'petugas123');
      if (password === correctPassword) {
        onLoginSuccess(foundUser);
        setError('');
      } else {
        setError(`Password salah! Ganti dengan password yang sesuai.`);
      }
    } else {
      setError(`Username tidak terdaftar!`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          {settings.logoSekolah ? (
            <img
              src={settings.logoSekolah}
              alt="Logo Sekolah"
              className="w-20 h-20 rounded-full object-cover shadow-md border-2 border-blue-500"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-md">
              <Library size={36} />
            </div>
          )}
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Sistem Perpustakaan
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 font-medium">
          {settings.namaSekolah}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-slate-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 text-xs text-red-700 rounded-r-lg">
                <p className="font-semibold">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-700">
                Username
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="admin / petugas"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="admin123 / petugas123"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all cursor-pointer"
              >
                <KeyRound className="w-4 h-4 mr-2" />
                Masuk ke Sistem
              </button>
            </div>
          </form>

          <div className="mt-6 bg-blue-50 rounded-xl p-4 border border-blue-100 flex gap-3 text-xs text-blue-800">
            <Info className="w-5 h-5 text-blue-500 shrink-0" />
            <div>
              <p className="font-semibold mb-1">Informasi Login (Offline):</p>
              <ul className="list-disc pl-4 space-y-1">
                {users.map((u) => (
                  <li key={u.username}>
                    Username: <span className="font-mono bg-blue-100 px-1 rounded font-bold">{u.username}</span> | Password:{' '}
                    <span className="font-mono bg-blue-100 px-1 rounded font-bold">
                      {u.password || (u.role === 'Administrator' ? 'admin123' : 'petugas123')}
                    </span>{' '}
                    ({u.nama})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
