'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client';

export default function Signup() {
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'student', department: '', phone: '' });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault(); setErr('');
    try { await api('/api/auth/signup', { method: 'POST', body: f }); window.location.href = '/login'; }
    catch (e2) { setErr(e2.message); }
  }
  return (
    <div className="card auth">
      <h1>Sign up</h1>
      {err && <div className="error">{err}</div>}
      <form onSubmit={submit}>
        <label>Full name<input required value={f.name} onChange={set('name')} /></label>
        <label>Email<input type="email" required value={f.email} onChange={set('email')} /></label>
        <label>Department<input required value={f.department} onChange={set('department')} /></label>
        <label>Phone (10 digits, optional)<input value={f.phone} onChange={set('phone')} /></label>
        <label>Role
          <select value={f.role} onChange={set('role')}>
            <option value="student">Student</option>
            <option value="organizer">Organizer</option>
          </select>
        </label>
        <label>Password (min 8 characters)<input type="password" required minLength={8} value={f.password} onChange={set('password')} /></label>
        <button type="submit">Create account</button>
      </form>
      <p className="muted">Already have an account? <Link href="/login">Log in</Link></p>
    </div>
  );
}
