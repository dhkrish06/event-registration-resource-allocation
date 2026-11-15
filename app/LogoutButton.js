'use client';
import { api } from '@/lib/client';

export default function LogoutButton() {
  async function logout() {
    await api('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }
  return <button className="secondary small" onClick={logout}>Logout</button>;
}
