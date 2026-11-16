import { humanDay } from '../lib/dates';
import type { ExperimentRun } from '../api';

export function RunTable({ rows, onOpen }: { rows: ExperimentRun[]; onOpen?: (row: ExperimentRun) => void }) {
  if (!rows.length) return <p className="quiet">本周科研记录里还没有实验。记下来之后，这里会引用同一行，空着的指标不会补。</p>;
  return (
    <div className="minutes-wrap">
      <table className="minutes">
        <thead>
          <tr>
            <th>日期</th>
            <th>改了什么</th>
            <th>对照</th>
            <th>指标</th>
            <th>相对基线</th>
            <th>没提升的设置</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.date ? humanDay(row.date) : '—'}</td>
              <td>
                {row.change || '—'}
                {onOpen && row.projectId && (
                  <button type="button" className="text-btn" onClick={() => onOpen(row)}>
                    在科研里看
                  </button>
                )}
              </td>
              <td>{row.control || '—'}</td>
              <td>{row.metric || '—'}</td>
              <td>{row.delta || '—'}</td>
              <td>{row.flat || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
