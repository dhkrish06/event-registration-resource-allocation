import { MongoClient } from 'mongodb';

export async function getDb() {
  if (!globalThis._mongoPromise) {
    globalThis._mongoPromise = new MongoClient(process.env.MONGODB_URI).connect();
  }
  const client = await globalThis._mongoPromise;
  return client.db(process.env.MONGODB_DB || 'event_mgmt');
}

// Audit/activity log stored in MongoDB. Never breaks the request if Mongo is down.
export async function logActivity(user, action, details = {}) {
  try {
    const db = await getDb();
    await db.collection('activity_logs').insertOne({
      user_id: user?.userId ?? null,
      role: user?.role ?? null,
      action,
      details,
      timestamp: new Date(),
    });
  } catch (e) {
    console.error('Activity log failed:', e.message);
  }
}
