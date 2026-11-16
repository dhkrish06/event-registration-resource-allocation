import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { guard, assertCanManage } from '@/lib/auth';
import { fail, handleError } from '@/lib/api';
import { logActivity } from '@/lib/mongo';

// Allocate a resource; DB trigger checks stock and deducts it
export async function POST(req, { params }) {
  try {
    const user = await guard('admin', 'organizer');
    await assertCanManage(user, params.id);
    const { resource_id, quantity } = await req.json();
    const qty = parseInt(quantity, 10);
    if (!resource_id || !qty || qty < 1) return fail('Resource and a quantity of at least 1 are required');
    await query('INSERT INTO resource_allocation (event_id, resource_id, quantity) VALUES ($1,$2,$3)',
      [params.id, resource_id, qty]);
    await logActivity(user, 'RESOURCE_ALLOCATED', { event_id: Number(params.id), resource_id, qty });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) { return handleError(e); }
}

// DELETE /api/events/:id/resources?allocationId=..  (trigger returns stock)
export async function DELETE(req, { params }) {
  try {
    const user = await guard('admin', 'organizer');
    await assertCanManage(user, params.id);
    const aid = new URL(req.url).searchParams.get('allocationId');
    const r = await query('DELETE FROM resource_allocation WHERE allocation_id=$1 AND event_id=$2', [aid, params.id]);
    if (!r.rowCount) return fail('Allocation not found', 404);
    await logActivity(user, 'RESOURCE_DEALLOCATED', { event_id: Number(params.id), allocation_id: Number(aid) });
    return NextResponse.json({ ok: true });
  } catch (e) { return handleError(e); }
}
