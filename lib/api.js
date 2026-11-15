import { NextResponse } from 'next/server';

export class HttpError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}
export const fail = (msg, status = 400) => NextResponse.json({ error: msg }, { status });

// Readable messages for named database constraints
const CONSTRAINT_MESSAGES = {
  chk_event_time: 'End time must be after the start time',
  chk_student_phone: 'Phone number must be exactly 10 digits',
  chk_student_email: 'Email address format is invalid',
  uq_student_event: 'You are already registered for this event',
  uq_event_resource: 'This resource is already allocated to this event; remove it first to change the quantity',
  event_resource_available_quantity_check: 'Quantity cannot be negative',
  resource_allocation_quantity_check: 'Quantity must be at least 1',
  venue_capacity_check: 'Venue capacity must be greater than 0',
  registration_registration_status_check: 'Invalid registration status',
  venue_venue_name_key: 'A venue with this name already exists',
  event_resource_resource_name_key: 'A resource with this name already exists',
  student_email_key: 'This email is already registered',
  organizer_email_key: 'This email is already registered',
  app_user_email_key: 'This email is already registered',
};

// Converts PostgreSQL / app errors into clean JSON responses
export function handleError(e) {
  if (e?.status) return fail(e.message, e.status);
  const named = CONSTRAINT_MESSAGES[e?.constraint];
  switch (e?.code) {
    case '23505': return fail(named || 'Duplicate entry: this record already exists', 409);
    case '23503': return fail('Cannot complete: this record is linked to other data (e.g. a venue or resource that is in use)', 409);
    case '23514': return fail(named || 'Data violates a database validation rule', 400);
    case '23502': return fail('A required field is missing', 400);
    case 'P0001': return fail(e.message, 400); // RAISE EXCEPTION from triggers
    case '22P02': case '22007': case '22008': return fail('Invalid input format', 400);
  }
  console.error(e);
  return fail('Internal server error', 500);
}