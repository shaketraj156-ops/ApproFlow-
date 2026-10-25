import React, { useMemo, useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

/**
 * Table with optional sortable columns.
 * A column with a `sortValue(row)` function can be sorted: click its header to sort ascending,
 * again for descending, a third time to go back to the original order.
 * `defaultSort` is `{ index, dir }` and starts the table sorted by that column.
 */
export function DataTable({ columns, data, onRowClick, loading = false, emptyMessage = "No records found", defaultSort = null }) {
  const [sort, setSort] = useState(defaultSort);

  const rows = useMemo(() => {
    if (!data) return data;
    const col = sort ? columns[sort.index] : null;
    if (!col?.sortValue) return data;
    const dir = sort.dir === 'desc' ? -1 : 1;
    return [...data].sort((a, b) => {
      const x = col.sortValue(a);
      const y = col.sortValue(b);
      // Empty values always go last, whichever way the column is sorted.
      if (x === null || x === undefined) return y === null || y === undefined ? 0 : 1;
      if (y === null || y === undefined) return -1;
      if (typeof x === 'string' || typeof y === 'string') return dir * String(x).localeCompare(String(y));
      return dir * (x - y);
    });
  }, [data, columns, sort]);

  function toggle(index) {
    setSort((current) => {
      if (!current || current.index !== index) return { index, dir: 'asc' };
      if (current.dir === 'asc') return { index, dir: 'desc' };
      return null;
    });
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-card p-4 space-y-3" role="status" aria-label="Loading records">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="py-12 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300">
        <p className="text-sm font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
      <table className="w-full text-left text-sm text-slate-700">
        <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <tr>
            {columns.map((col, idx) => {
              const sortable = !!col.sortValue;
              const active = sort?.index === idx;
              const ariaSort = active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : sortable ? 'none' : undefined;
              const Icon = active ? (sort.dir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown;
              return (
                <th key={idx} scope="col" aria-sort={ariaSort} className={`px-4 py-3 ${col.className || ''}`}>
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => toggle(idx)}
                      className={`inline-flex items-center gap-1 uppercase tracking-wider font-semibold hover:text-slate-900 transition ${active ? 'text-emerald-700' : ''}`}
                    >
                      {col.header}
                      <Icon className={`w-3.5 h-3.5 ${active ? '' : 'opacity-50'}`} aria-hidden="true" />
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, rowIdx) => (
            <tr
              key={row.id || rowIdx}
              onClick={() => onRowClick && onRowClick(row)}
              onKeyDown={onRowClick ? (e) => {
                if (e.target !== e.currentTarget) return; // let buttons inside the row handle their own keys
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onRowClick(row);
                }
              } : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              className={`transition hover:bg-emerald-50/40 ${onRowClick ? 'cursor-pointer focus:outline-none focus-visible:bg-emerald-50/60' : ''}`}
            >
              {columns.map((col, colIdx) => (
                <td key={colIdx} className={`px-4 py-3.5 whitespace-nowrap ${col.className || ''}`}>
                  {col.render ? col.render(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
