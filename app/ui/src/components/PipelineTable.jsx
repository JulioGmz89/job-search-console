/**
 * The pipeline table.
 *
 * Feature-parity target is upstream's Go TUI (PROJECT_PLAN.md §5): filter tabs,
 * several sort modes, links to report and PDF. Filters come from the server's
 * state vocabulary rather than from whichever statuses this tracker happens to
 * contain, so a status that appears for the first time still gets a tab.
 *
 * The Status column is the one editable cell (PROJECT_PLAN.md §8, M2); see
 * StatusCell for why it stops its own clicks from opening the row.
 */

import StatusCell from './StatusCell.jsx';

const COLUMNS = [
  { key: 'id', label: '#', className: 'id num', sortable: true },
  { key: 'date', label: 'Date', className: 'date', sortable: true },
  { key: 'company', label: 'Company', className: 'company', sortable: true },
  { key: 'role', label: 'Role', className: 'role', sortable: true },
  { key: 'score', label: 'Score', className: 'num', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'decision', label: 'Decision', sortable: true },
  { key: 'comp', label: 'Comp' },
  { key: 'pdf', label: 'PDF', className: 'num' },
];

/** Score formatting: the API sends a JS number, so 4.0 arrives as 4. */
const formatScore = (score) => (typeof score === 'number' ? score.toFixed(1) : '—');

export default function PipelineTable({ rows, statuses, sort, onSortChange, selectedId, onSelect, onStatusChanged }) {
  const toggleSort = (key) => {
    // Numbers and dates are most useful highest-first; text A–Z.
    const numeric = key === 'score' || key === 'id' || key === 'date';
    if (sort.key === key) onSortChange({ key, dir: sort.dir === 'asc' ? 'desc' : 'asc' });
    else onSortChange({ key, dir: numeric ? 'desc' : 'asc' });
  };

  if (rows.length === 0) {
    return <div className="table-wrap"><p className="empty">No applications match these filters.</p></div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className={[col.className, col.sortable ? 'sortable' : ''].filter(Boolean).join(' ')}
                onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                aria-sort={sort.key === col.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                {col.label}
                {sort.key === col.key ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              aria-selected={row.id === selectedId}
              onClick={() => onSelect(row)}
            >
              <td className="id num">{row.id}</td>
              <td className="date muted">{row.date ?? '—'}</td>
              <td className="company">{row.company ?? '—'}</td>
              <td className="role">
                {row.role ?? '—'}
                {row.via ? <span className="muted"> · via {row.via}</span> : null}
              </td>
              <td className="num">
                <span className={`score ${row.scoreBand ?? ''}`}>{formatScore(row.score)}</span>
              </td>
              <td>
                <StatusCell row={row} statuses={statuses} onChanged={onStatusChanged} />
              </td>
              <td>{row.report?.decision ?? <span className="muted">—</span>}</td>
              <td className="notes">{row.report?.advertisedComp ?? <span className="muted">not stated</span>}</td>
              <td className="num">
                <span className={`dot ${row.pdf ? 'yes' : ''}`}>{row.pdf ? '●' : '○'}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
