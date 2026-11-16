import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { guard } from '@/lib/auth';
import { fail, handleError } from '@/lib/api';
import { logActivity } from '@/lib/mongo';

export async function GET() {
  try {
    await guard();
    const r = await query('SELECT * FROM v_resource_usage ORDER BY resource_name');
    return NextResponse.json({ resources: r.rows });
  } catch (e) { return handleError(e); }
}

export async function POST(req) {
  try {
    const user = await guard('admin');
    const { resource_name, resource_type, available_quantity } = await req.json();
    const qty = parseInt(available_quantity, 10);
    if (!resource_name?.trim() || !resource_type?.trim() || !(qty >= 0)) return fail('Name, type and quantity (0 or more) are required');
    await query('INSERT INTO event_resource (resource_name, resource_type, available_quantity) VALUES ($1,$2,$3)',
      [resource_name.trim(), resource_type.trim(), qty]);
    await logActivity(user, 'RESOURCE_CREATED', { resource_name });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) { return handleError(e); }
}

// Restock: adds units to the available quantity
export async function PUT(req) {
  try {
    const user = await guard('admin');
    const { resource_id, add } = await req.json();
    const n = parseInt(add, 10);
    if (!resource_id || !n) return fail('Resource and a non-zero quantity are required');
    await query('UPDATE event_resource SET available_quantity = available_quantity + $1 WHERE resource_id = $2', [n, resource_id]);
    await logActivity(user, 'RESOURCE_RESTOCKED', { resource_id, add: n });
    return NextResponse.json({ ok: true });
  } catch (e) { return handleError(e); }
}

export async function DELETE(req) {
  try {
    const user = await guard('admin');
    const id = new URL(req.url).searchParams.get('id');
    await query('DELETE FROM event_resource WHERE resource_id = $1', [id]); // blocked by FK if allocated
    await logActivity(user, 'RESOURCE_DELETED', { resource_id: Number(id) });
    return NextResponse.json({ ok: true });
  } catch (e) { return handleError(e); }
}
