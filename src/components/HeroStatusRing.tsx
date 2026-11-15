import { NASA_STD_3001 } from '../data/spaceAgencyData';
import { BioStatus } from '../types/health4ever';

interface HeroStatusRingProps {
  status: BioStatus;
  manualOverride: BioStatus | null;
  onSelectOverride: (status: BioStatus | null) => void;
  projectedCoreTempC: number;
  heatStorageKjKg: number;
  hydrationOffsetMl: number;
  stationName: string;
}

const STATUS_META: Record<
  BioStatus,
  {
    glyph: string;
    label: string;
    summary: string;
    strokeColor: string;
    trackColor: string;
    textColor: string;
    surfaceBg: string;
    borderClass: string;
  }
> = {
  nominal: {
    glyph: '●',
    label: 'Nominal',
    summary:
      'Projected heat storage and core temperature delta remain within NASA-STD-3001 nominal operational bounds.',
    strokeColor: '#059669',
    trackColor: '#D1FAE5',
    textColor: 'text-emerald-700',
    surfaceBg: 'bg-emerald-50/70',
    borderClass: 'border-emerald-200',
  },
  drift: {
    glyph: '▲',
    label: 'Drift Detected',
    summary:
      'Thermal load approaches or exceeds +0.6 °C NASA-STD-3001 impairment threshold. Preventative hydration advised.',
    strokeColor: '#D97706',
    trackColor: '#FEF3C7',
    textColor: 'text-amber-700',
    surfaceBg: 'bg-amber-50/70',
    borderClass: 'border-amber-200',
  },
  critical: {
    glyph: '✖',
    label: 'Critical Alert',
    summary:
      'Heat storage exceeds NASA-STD-3001 +3.0 kJ/kg ceiling. Emergency guidance mode engaged.',
    strokeColor: '#E11D48',
    trackColor: '#FFE4E6',
    textColor: 'text-rose-700',
    surfaceBg: 'bg-rose-50/80',
    borderClass: 'border-rose-200',
  },
};

export function HeroStatusRing({
  status,
  manualOverride,
  onSelectOverride,
  projectedCoreTempC,
  heatStorageKjKg,
  hydrationOffsetMl,
  stationName,
}: HeroStatusRingProps) {
  const meta = STATUS_META[status];

  // Express margin cleanly as % of NASA-STD-3001 +3.0 kJ/kg heat storage headroom remaining
  const headroomPct = Math.max(
    0,
    Math.min(100, Math.round((1 - Math.max(0, heatStorageKjKg) / NASA_STD_3001.heatStorageMaxKjKg) * 100))
  );
  const effectivePct = status === 'critical' ? Math.min(20, headroomPct) : headroomPct;

  const radius = 92;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (effectivePct / 100) * circumference;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between h-full">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-xs font-medium text-slate-500">
            NASA-STD-3001 Thermal Margin · {stationName}
          </p>
          <div className={`mt-1 flex items-center gap-2 text-sm font-semibold ${meta.textColor}`}>
            <span aria-hidden="true">{meta.glyph}</span>
            <span>{meta.label}</span>
          </div>
        </div>

        <div
          className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200/80"
          role="group"
          aria-label="Status mode selector"
        >
          {(
            [
              { id: null, label: 'Live Model' },
              { id: 'nominal', label: 'Nominal' },
              { id: 'drift', label: 'Drift' },
              { id: 'critical', label: 'Critical' },
            ] as { id: BioStatus | null; label: string }[]
          ).map((item) => {
            const active = manualOverride === item.id;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => onSelectOverride(item.id)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 min-h-[32px] ${
                  active
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center my-2">
        <div className="relative w-56 h-56 flex items-center justify-center">
          <svg
            viewBox="0 0 220 220"
            className="w-full h-full -rotate-90"
            aria-label={`Thermal headroom ${effectivePct} percent, state ${meta.label}`}
          >
            <circle
              cx="110"
              cy="110"
              r={radius}
              fill="none"
              stroke={meta.trackColor}
              strokeWidth="14"
            />
            <circle
              cx="110"
              cy="110"
              r={radius}
              fill="none"
              stroke={meta.strokeColor}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{
                transition:
                  'stroke-dashoffset 450ms cubic-bezier(0.16, 1, 0.3, 1), stroke 250ms ease',
              }}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <span className="text-xs font-medium text-slate-500">Thermal Headroom</span>
            <span className="text-4xl font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
              {effectivePct}%
            </span>
            <span className="text-xs font-mono text-slate-500 mt-1 tabular-nums">
              {projectedCoreTempC.toFixed(2)} °C · {heatStorageKjKg.toFixed(2)} kJ/kg
            </span>
          </div>
        </div>
      </div>

      <div className={`mt-4 rounded-xl border p-3.5 ${meta.surfaceBg} ${meta.borderClass}`}>
        <p className="text-xs leading-relaxed text-slate-700">{meta.summary}</p>
        {hydrationOffsetMl > 0 && (
          <p className="text-xs font-mono text-emerald-700 mt-1.5 tabular-nums">
            Intake Logged: +{hydrationOffsetMl} mL electrolytes applied to model
          </p>
        )}
      </div>
    </div>
  );
}
