'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client';

export default function Login() {
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  async function submit(e) {
    e.preventDefault(); setErr('');
    try { await api('/api/auth/login', { method: 'POST', body: f }); window.location.href = '/'; }
    catch (e2) { setErr(e2.message); }
  }
  return (
    <div className="card auth">
      <h1>Log in</h1>
      {err && <div className="error">{err}</div>}
      <form onSubmit={submit}>
        <label>Email<input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
        <label>Password<input type="password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
        <button type="submit">Log in</button>
      </form>
      <p className="muted">No account? <Link href="/signup">Sign up</Link></p>
    </div>
  );
}
