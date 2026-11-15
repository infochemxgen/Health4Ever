import { useMemo, useState } from 'react';
import { MetricKey, TelemetryPoint, TimeframeKey } from '../types/health4ever';

interface LongitudinalChartProps {
  data: TelemetryPoint[];
  loading: boolean;
  error: string | null;
  timeframe: TimeframeKey;
  onChangeTimeframe: (tf: TimeframeKey) => void;
  metric: MetricKey;
  onChangeMetric: (m: MetricKey) => void;
  sourceLabel: string;
}

interface MetricConfig {
  label: string;
  unit: string;
  min: number;
  max: number;
  thresholdLabel: string;
  thresholdValue: number | null;
  accentHex: string;
  decimals: number;
  getValue: (p: TelemetryPoint) => number;
}

const METRIC_CONFIGS: Record<MetricKey, MetricConfig> = {
  coreTemp: {
    label: 'Modeled Core Temp',
    unit: '°C',
    min: 36.2,
    max: 39.0,
    thresholdLabel: 'NASA-STD-3001 Impairment (+0.6 °C / 37.6 °C)',
    thresholdValue: 37.6,
    accentHex: '#059669',
    decimals: 2,
    getValue: (p) => p.projectedCoreTempC,
  },
  heatStorage: {
    label: 'Body Heat Storage',
    unit: 'kJ/kg',
    min: -2.0,
    max: 4.5,
    thresholdLabel: 'NASA-STD-3001 Ceiling (+3.0 kJ/kg)',
    thresholdValue: 3.0,
    accentHex: '#D97706',
    decimals: 2,
    getValue: (p) => p.heatStorageKjKg,
  },
  hydrationRate: {
    label: 'Required Hydration',
    unit: 'mL/hr',
    min: 150,
    max: 950,
    thresholdLabel: 'NASA-STD-3001 Min Floor (240 mL/hr)',
    thresholdValue: 240,
    accentHex: '#0284C7',
    decimals: 0,
    getValue: (p) => p.requiredHydrationMlHr,
  },
  ambientTemp: {
    label: 'Live Ambient Temp',
    unit: '°C',
    min: -65,
    max: 48,
    thresholdLabel: 'Thermoneutral Reference (21.0 °C)',
    thresholdValue: 21.0,
    accentHex: '#4F46E5',
    decimals: 1,
    getValue: (p) => p.ambientTempC,
  },
};

export function LongitudinalChart({
  data,
  loading,
  error,
  timeframe,
  onChangeTimeframe,
  metric,
  onChangeMetric,
  sourceLabel,
}: LongitudinalChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const cfg = METRIC_CONFIGS[metric];

  // Auto-fit ambient temperature range dynamically if Concordia Antarctica (-50 °C) or hot desert
  const { yMin, yMax } = useMemo(() => {
    if (metric !== 'ambientTemp' || data.length === 0) {
      return { yMin: cfg.min, yMax: cfg.max };
    }
    const vals = data.map((d) => d.ambientTempC);
    const minV = Math.min(...vals, 15);
    const maxV = Math.max(...vals, 25);
    return {
      yMin: Math.floor(minV - 4),
      yMax: Math.ceil(maxV + 4),
    };
  }, [metric, data, cfg]);

  const width = 760;
  const height = 270;
  const padLeft = 56;
  const padRight = 24;
  const padTop = 24;
  const padBottom = 38;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const yFor = (val: number) => {
    const ratio = (val - yMin) / Math.max(0.001, yMax - yMin);
    const clamped = Math.max(0, Math.min(1, ratio));
    return padTop + plotH - clamped * plotH;
  };

  const xFor = (idx: number) => {
    if (data.length <= 1) return padLeft + plotW / 2;
    return padLeft + (idx / (data.length - 1)) * plotW;
  };

  const { measuredPath, thresholdY, yTicks } = useMemo(() => {
    const mPts = data.map(
      (d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(cfg.getValue(d)).toFixed(1)}`
    );
    const ty = cfg.thresholdValue !== null ? yFor(cfg.thresholdValue) : null;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
      const v = yMin + t * (yMax - yMin);
      return { value: v, y: yFor(v) };
    });
    return {
      measuredPath: mPts.join(' '),
      thresholdY: ty,
      yTicks: ticks,
    };
  }, [data, cfg, yMin, yMax]);

  const activeIdx =
    hoverIdx !== null && data[hoverIdx] ? hoverIdx : Math.max(0, data.length - 1);
  const activePoint = data[activeIdx];
  const measuredVal = activePoint ? cfg.getValue(activePoint) : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Digital Twin Telemetry: Live Environment + NASA-STD-3001 Projections
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {cfg.label} ({cfg.unit}) · Inputs: {sourceLabel} · Biometric projections: deterministic NASA-STD-3001 equations
          </p>
        </div>

        <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200/80 self-start">
          {(
            [
              { id: '24h', label: '24h Open-Meteo' },
              { id: '7d', label: '7-Day Forecast' },
              { id: 'nasaPower', label: 'NASA POWER 10-Day' },
            ] as { id: TimeframeKey; label: string }[]
          ).map((tf) => (
            <button
              key={tf.id}
              type="button"
              onClick={() => onChangeTimeframe(tf.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 min-h-[32px] ${
                timeframe === tf.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {(Object.keys(METRIC_CONFIGS) as MetricKey[]).map((key) => {
            const item = METRIC_CONFIGS[key];
            const active = metric === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onChangeMetric(key)}
                className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 min-h-[36px] ${
                  active
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {activePoint && (
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2">
            <span className="text-slate-500">{activePoint.timestamp}</span>
            <span className="text-slate-900 font-semibold">
              {measuredVal.toFixed(cfg.decimals)} {cfg.unit}
            </span>
            <span className="text-slate-600">
              Air {activePoint.ambientTempC.toFixed(1)} °C · RH {activePoint.relativeHumidityPct}%
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-[260px] flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-500">
          Fetching live Open-Meteo &amp; NASA POWER telemetry...
        </div>
      ) : error ? (
        <div className="h-[260px] flex items-center justify-center bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 px-6 text-center">
          {error}
        </div>
      ) : data.length === 0 ? (
        <div className="h-[260px] flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
          No telemetry points returned by upstream API for this timeframe.
        </div>
      ) : (
        <div className="relative w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto select-none cursor-crosshair"
            onMouseLeave={() => setHoverIdx(null)}
          >
            {yTicks.map((tick, i) => (
              <g key={i}>
                <line
                  x1={padLeft}
                  y1={tick.y}
                  x2={width - padRight}
                  y2={tick.y}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={tick.y + 4}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-mono tabular-nums"
                >
                  {tick.value.toFixed(cfg.decimals === 2 ? 1 : 0)}
                </text>
              </g>
            ))}

            {thresholdY !== null && (
              <>
                <line
                  x1={padLeft}
                  y1={thresholdY}
                  x2={width - padRight}
                  y2={thresholdY}
                  stroke="#E11D48"
                  strokeWidth="1.5"
                  strokeDasharray="5 4"
                />
                <text
                  x={width - padRight - 4}
                  y={Math.max(14, thresholdY - 6)}
                  textAnchor="end"
                  className="fill-rose-700 text-[10px] font-mono font-medium"
                >
                  {cfg.thresholdLabel}
                </text>
              </>
            )}

            <path
              d={measuredPath}
              fill="none"
              stroke={cfg.accentHex}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {activePoint && (
              <line
                x1={xFor(activeIdx)}
                y1={padTop}
                x2={xFor(activeIdx)}
                y2={padTop + plotH}
                stroke="#0F172A"
                strokeWidth="1"
                strokeDasharray="2 3"
                opacity="0.45"
              />
            )}

            {data.map((d, i) => {
              const cx = xFor(i);
              const cy = yFor(cfg.getValue(d));
              const isSelected = i === activeIdx;
              const colWidth = plotW / Math.max(data.length, 1);

              return (
                <g key={`${d.timestamp}-${i}`}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isSelected ? 5 : 3}
                    fill={cfg.accentHex}
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  />
                  <text
                    x={cx}
                    y={height - 12}
                    textAnchor="middle"
                    className="fill-slate-500 text-[10px] font-mono tabular-nums"
                  >
                    {data.length > 10 && i % 2 === 1 ? '' : d.label}
                  </text>
                  <rect
                    x={cx - colWidth / 2}
                    y={padTop}
                    width={colWidth}
                    height={plotH}
                    fill="transparent"
                    onMouseEnter={() => setHoverIdx(i)}
                    onClick={() => setHoverIdx(i)}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      )}

      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-600">
        <span>
          Source: {sourceLabel} · Model Reference: NASA-STD-3001 Vol. 2
        </span>
        <span className="font-mono text-[11px] text-slate-500">
          All environmental values fetched live; physiological projections calculated deterministically
        </span>
      </div>
    </div>
  );
}
