import './globals.css';
import Link from 'next/link';
import { getUser } from '@/lib/auth';
import LogoutButton from './LogoutButton';

export const metadata = { title: 'Event Registration & Resource Allocation' };

export default async function RootLayout({ children }) {
  const user = await getUser();
  return (
    <html lang="en">
      <body>
        {user && (
          <nav>
            <span className="brand">Event Manager</span>
            <Link href="/">Events</Link>
            {user.role === 'student' && <Link href="/my-registrations">My Registrations</Link>}
            {user.role !== 'student' && <Link href="/events/new">New Event</Link>}
            <Link href="/resources">Resources</Link>
            <Link href="/venues">Venues</Link>
            {user.role !== 'student' && <Link href="/reports">Reports</Link>}
            <span className="spacer" />
            <span>{user.name} ({user.role})</span>
            <LogoutButton />
          </nav>
        )}
        <main>{children}</main>
      </body>
    </html>
  );
}
