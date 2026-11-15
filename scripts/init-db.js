// Usage: npm run db:init   (creates tables, sample data, login accounts, Mongo indexes)
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
const fs = require('fs');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  await pg.query(fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8'));
  await pg.query(fs.readFileSync(path.join(__dirname, '..', 'db', 'seed.sql'), 'utf8'));

  const adminHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@123', 10);
  const demoHash = await bcrypt.hash(process.env.DEMO_PASSWORD || 'Password@123', 10);
  await pg.query(
    `INSERT INTO app_user (email, password_hash, role, student_id, organizer_id) VALUES
     ('admin@event.local', $1, 'admin', NULL, NULL),
     ('anita.rao@pes.edu', $2, 'organizer', NULL, 1),
     ('dhawal@pes.edu',    $2, 'student', 1, NULL),
     ('hari@pes.edu',      $2, 'student', 2, NULL)`,
    [adminHash, demoHash]
  );
  await pg.end();
  console.log('PostgreSQL ready (schema + seed + users).');

  const mongo = await MongoClient.connect(process.env.MONGODB_URI);
  const db = mongo.db(process.env.MONGODB_DB || 'event_mgmt');
  await db.collection('feedback').createIndex({ event_id: 1, student_id: 1 }, { unique: true });
  await db.collection('feedback').createIndex({ event_id: 1 });
  await db.collection('activity_logs').createIndex({ timestamp: -1 });
  await db.collection('activity_logs').createIndex({ action: 1 });
  await mongo.close();
  console.log('MongoDB indexes ready.');
  console.log('Logins: admin@event.local (ADMIN_PASSWORD); anita.rao@pes.edu, dhawal@pes.edu, hari@pes.edu (DEMO_PASSWORD)');
})().catch((e) => { console.error(e); process.exit(1); });
