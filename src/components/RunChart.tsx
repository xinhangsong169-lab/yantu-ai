import { useState } from 'react';

type Metric = 'recall' | 'ndcg';
type Key = 'baseline' | 'hard' | 'rerank';

const SERIES: { key: Key; name: string; color: string }[] = [
  { key: 'baseline', name: '基线', color: '#8aafa0' },
  { key: 'hard', name: '难负样本', color: '#43816b' },
  { key: 'rerank', name: '重排序', color: '#315d49' }
];

const RUNS: { label: string; recall: Record<Key, number | null>; ndcg: Record<Key, number | null> }[] = [
  { label: '10/14', recall: { baseline: 31.2, hard: 31.0, rerank: null }, ndcg: { baseline: 28.4, hard: 28.1, rerank: null } },
  { label: '10/21', recall: { baseline: 31.4, hard: 33.6, rerank: 34.2 }, ndcg: { baseline: 28.6, hard: 30.4, rerank: 31.0 } },
  { label: '10/28', recall: { baseline: 31.8, hard: 35.1, rerank: 36.8 }, ndcg: { baseline: 28.9, hard: 31.8, rerank: 33.2 } },
  { label: '11/04', recall: { baseline: 32.0, hard: 36.4, rerank: 38.0 }, ndcg: { baseline: 29.0, hard: 32.6, rerank: 34.4 } },
  { label: '11/11', recall: { baseline: 32.1, hard: 36.2, rerank: 38.5 }, ndcg: { baseline: 29.1, hard: 32.1, rerank: 34.9 } }
];

const WIDTH = 720;
const HEIGHT = 320;
const PAD = { l: 46, r: 18, t: 22, b: 36 };

function extent(metric: Metric) {
  const values = RUNS.flatMap((run) => SERIES.map((series) => run[metric][series.key])).filter((value): value is number => value != null);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return { min: Math.floor(min) - 1, max: Math.ceil(max) + 1 };
}

function areaPath(metric: Metric, yOf: (value: number) => number, xOf: (index: number) => number) {
  const points = RUNS.map((run, index) => [index, run[metric].rerank] as const).filter((pair): pair is readonly [number, number] => pair[1] != null);
  if (points.length < 2) return '';
  const line = points.map(([index, value], order) => `${order ? 'L' : 'M'}${xOf(index)},${yOf(value)}`).join('');
  return `${line}L${xOf(points[points.length - 1][0])},${HEIGHT - PAD.b}L${xOf(points[0][0])},${HEIGHT - PAD.b}Z`;
}

function linePath(metric: Metric, key: Key, yOf: (value: number) => number, xOf: (index: number) => number) {
  let path = '';
  let drawing = false;
  RUNS.forEach((run, index) => {
    const value = run[metric][key];
    if (value == null) {
      drawing = false;
      return;
    }
    path += `${drawing ? 'L' : 'M'}${xOf(index)},${yOf(value)}`;
    drawing = true;
  });
  return path;
}

export function RunChart() {
  const [metric, setMetric] = useState<Metric>('recall');
  const [hover, setHover] = useState<number | null>(null);
  const { min, max } = extent(metric);
  const innerW = WIDTH - PAD.l - PAD.r;
  const innerH = HEIGHT - PAD.t - PAD.b;
  const xOf = (index: number) => PAD.l + (index / (RUNS.length - 1)) * innerW;
  const yOf = (value: number) => PAD.t + ((max - value) / (max - min)) * innerH;
  const ticks = Array.from({ length: max - min + 1 }, (_, index) => min + index).filter((tick) => tick % 2 === 0);
  const active = hover == null ? RUNS.length - 1 : hover;
  const metricName = metric === 'recall' ? 'Recall@10' : 'nDCG@10';

  return (
    <figure className="lab-chart">
      <div className="lab-head">
        <div>
          <h3>历次方法对照</h3>
          <p>固定数据划分下的演示曲线。11 月 11 日难负样本有一次回落，图上保留了。</p>
        </div>
        <div className="lab-switch" role="group" aria-label="指标">
          <button type="button" aria-pressed={metric === 'recall'} onClick={() => setMetric('recall')}>
            Recall@10
          </button>
          <button type="button" aria-pressed={metric === 'ndcg'} onClick={() => setMetric('ndcg')}>
            nDCG@10
          </button>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`${metricName} 的三次方法对照，共五次运行`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const x = ((event.clientX - rect.left) / rect.width) * WIDTH;
          const index = Math.round((x - PAD.l) / (innerW / (RUNS.length - 1)));
          setHover(Math.max(0, Math.min(RUNS.length - 1, index)));
        }}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line className="lab-grid" x1={PAD.l} x2={WIDTH - PAD.r} y1={yOf(tick)} y2={yOf(tick)} />
            <text className="lab-tick" x={PAD.l - 8} y={yOf(tick) + 4} textAnchor="end">
              {tick}
            </text>
          </g>
        ))}
        {RUNS.map((run, index) => (
          <text key={run.label} className="lab-tick" x={xOf(index)} y={HEIGHT - 12} textAnchor="middle">
            {run.label}
          </text>
        ))}
        {hover != null && <line className="lab-guide" x1={xOf(hover)} x2={xOf(hover)} y1={PAD.t} y2={HEIGHT - PAD.b} />}
        <path className="lab-area" d={areaPath(metric, yOf, xOf)} />
        {SERIES.map((series) => (
          <path key={series.key} className="lab-line" d={linePath(metric, series.key, yOf, xOf)} stroke={series.color} />
        ))}
        {SERIES.map((series) =>
          RUNS.map((run, index) => {
            const value = run[metric][series.key];
            if (value == null) return null;
            const hot = index === active;
            return <circle key={`${series.key}-${run.label}`} cx={xOf(index)} cy={yOf(value)} r={hot ? 5 : 3.2} fill={series.color} />;
          })
        )}
      </svg>
      <div className="lab-readout">
        <strong>{RUNS[active].label}</strong>
        {SERIES.map((series) => {
          const value = RUNS[active][metric][series.key];
          return (
            <span key={series.key}>
              <i style={{ background: series.color }} />
              {series.name} {value == null ? '尚未跑' : value.toFixed(1)}
            </span>
          );
        })}
      </div>
      <ul className="lab-legend">
        {SERIES.map((series) => (
          <li key={series.key}>
            <i style={{ background: series.color }} />
            {series.name}
          </li>
        ))}
        <li>纵轴是 {metricName}，单位是百分比。演示数据，不是真实实验结果。</li>
      </ul>
    </figure>
  );
}
