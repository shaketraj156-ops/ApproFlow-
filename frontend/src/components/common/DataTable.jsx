import React, { useMemo, useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

/**
 * Table with optional sortable columns.
 * A column with a `sortValue(row)` function can be sorted: click its header to sort ascending,
 * again for descending, a third time to go back to the original order.
 * `defaultSort` is `{ index, dir }` and starts the table sorted by that column.
 * `pageSize` shows only that many rows at first, with a "Show more" button for the rest.
 * A column with `hideOnMobile: true` is hidden below the md breakpoint.
 */
export function DataTable({ columns, data, onRowClick, loading = false, emptyMessage = "No records found", defaultSort = null, pageSize = null }) {
  const [sort, setSort] = useState(defaultSort);
  const [shownCount, setShownCount] = useState(pageSize);

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

  const visibleRows = shownCount ? rows.slice(0, shownCount) : rows;
  const remaining = rows.length - visibleRows.length;
  const mobileClass = (col) =>
    `${col.hideOnMobile ? 'hidden md:table-cell' : ''} ${col.wrapOnMobile ? 'whitespace-normal md:whitespace-nowrap' : ''}`;

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
                <th key={idx} scope="col" aria-sort={ariaSort} className={`px-3 sm:px-4 py-3 ${mobileClass(col)} ${col.className || ''}`}>
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
          {visibleRows.map((row, rowIdx) => (
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
                <td key={colIdx} className={`px-3 sm:px-4 py-3.5 ${col.wrapOnMobile ? '' : 'whitespace-nowrap'} ${mobileClass(col)} ${col.className || ''}`}>
                  {col.render ? col.render(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {remaining > 0 && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setShownCount((c) => c + pageSize)}
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
          >
            Show {Math.min(pageSize, remaining)} more
          </button>
          <span className="text-xs text-slate-400">{remaining} hidden</span>
        </div>
      )}
    </div>
  );
}
