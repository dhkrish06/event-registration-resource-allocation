'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';

function Table({ title, note, rows }) {
  const cols = rows[0] ? Object.keys(rows[0]) : [];
  return (
    <>
      <h2>{title}</h2>
      <p className="muted">{note}</p>
      <div className="scroll">
        <table>
          <thead><tr>{cols.map((c) => <th key={c}>{c.replace(/_/g, ' ')}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => <tr key={i}>{cols.map((c) => <td key={c}>{String(r[c])}</td>)}</tr>)}
            {!rows.length && <tr><td className="muted">No data</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function Reports() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api('/api/reports').then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <div className="error">{err}</div>;
  if (!d) return <p>Loading...</p>;
  return (
    <>
      <h1>Reports</h1>
      <Table title="Registrations per event" note="SQL: JOIN + GROUP BY + FILTER + ORDER BY" rows={d.registrationsPerEvent} />
      <Table title="Active departments" note="SQL: GROUP BY + HAVING (departments with 2+ registrations)" rows={d.activeDepartments} />
      <Table title="Students with no registrations" note="SQL: correlated subquery (NOT EXISTS)" rows={d.inactiveStudents} />
      <Table title="Above-average fill events" note="SQL: subquery over view v_event_summary" rows={d.popularEvents} />
      <Table title="Resource utilisation" note="SQL: view v_resource_usage" rows={d.resourceUsage} />
      <Table title="Average rating per event" note="MongoDB: $group aggregation on feedback collection" rows={d.ratings} />
      <Table title="System activity" note="MongoDB: $group aggregation on activity_logs collection" rows={d.activity} />
    </>
  );
}
