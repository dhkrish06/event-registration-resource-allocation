import pg from 'pg';

// Return DATE as 'YYYY-MM-DD' string and bigint (COUNT) as number
pg.types.setTypeParser(1082, (v) => v);
pg.types.setTypeParser(20, (v) => parseInt(v, 10));

const g = globalThis;
export const pool = g._pgPool || (g._pgPool = new pg.Pool({ connectionString: process.env.DATABASE_URL }));
export const query = (text, params) => pool.query(text, params);
