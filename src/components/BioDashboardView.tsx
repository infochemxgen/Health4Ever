import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Download,
  Droplets,
  Info,
  Lock,
  PhoneCall,
  RefreshCw,
  Thermometer,
  Wind,
} from 'lucide-react';
import { MONITORING_STATIONS, NASA_STD_3001 } from '../data/spaceAgencyData';
import {
  BioStatus,
  EnvironmentApiResponse,
  GarmentItem,
  MetricKey,
  TimeframeKey,
} from '../types/health4ever';
import {
  buildLiveTelemetrySeries,
  classifyNasaStatus,
  computeSampleFromWeather,
} from '../utils/physiologicalModel';
import { HeroStatusRing } from './HeroStatusRing';
import { LongitudinalChart } from './LongitudinalChart';

interface BioDashboardViewProps {
  stationId: string;
  onChangeStation: (id: string) => void;
  envData: EnvironmentApiResponse | null;
  envLoading: boolean;
  envError: string | null;
  onRefreshEnv: () => void;
  activeGarment: GarmentItem;
  isPro: boolean;
  onNavigateToPlans: () => void;
  onNavigateToSpaceLab: () => void;
  onOpenGarmentSelect: () => void;
  manualOverride: BioStatus | null;
  onChangeManualOverride: (status: BioStatus | null) => void;
}

const EMERGENCY_STEPS = [
  'Cease physical exertion immediately and relocate to a shaded or climate-controlled space.',
  'Unfasten collar vent and outer layer to maximize evaporative cooling across torso yarns.',
  'Ingest 400–500 mL chilled electrolyte fluid in steady sips over 10 minutes.',
  'Confirm projected heat storage falls below the NASA-STD-3001 +3.0 kJ/kg ceiling.',
];

export function BioDashboardView({
  stationId,
  onChangeStation,
  envData,
  envLoading,
  envError,
  onRefreshEnv,
  activeGarment,
  isPro,
  onNavigateToPlans,
  onNavigateToSpaceLab,
  onOpenGarmentSelect,
  manualOverride,
  onChangeManualOverride,
}: BioDashboardViewProps) {
  const [timeframe, setTimeframe] = useState<TimeframeKey>('24h');
  const [metric, setMetric] = useState<MetricKey>('coreTemp');
  const [metabolicWatts, setMetabolicWatts] = useState<number>(280);
  const [hydrationOffsetMl, setHydrationOffsetMl] = useState(0);
  const [checkedSteps, setCheckedSteps] = useState<number[]>([]);
  const [emergencyElapsedSec, setEmergencyElapsedSec] = useState(0);
  const [sosNotified, setSosNotified] = useState(false);
  const [exportConfirmation, setExportConfirmation] = useState<string | null>(null);

  // Manual environmental fallback inputs used ONLY if live public weather APIs fail or are rate-limited
  const [fallbackTempC, setFallbackTempC] = useState<number>(24);
  const [fallbackHumidityPct, setFallbackHumidityPct] = useState<number>(55);

  const station =
    MONITORING_STATIONS.find((s) => s.id === stationId) ?? MONITORING_STATIONS[0];

  const liveWeatherAvailable = Boolean(envData?.weather?.current);
  const isDegradedEnv = !envLoading && !liveWeatherAvailable;

  const currentSample = useMemo(() => {
    const cur = envData?.weather?.current;
    if (cur) {
      return computeSampleFromWeather({
        label: 'Now',
        timestamp: cur.time,
        ambientTempC: cur.temperature_2m,
        apparentTempC: cur.apparent_temperature,
        relativeHumidityPct: cur.relative_humidity_2m,
        uvIndex: cur.uv_index,
        metabolicWatts,
        garmentClo: activeGarment.thermalResistanceClo,
        hydrationLoggedMl: hydrationOffsetMl,
      });
    }
    if (isDegradedEnv) {
      const approxApparent = fallbackTempC + (fallbackHumidityPct - 45) * 0.08;
      return computeSampleFromWeather({
        label: 'Manual Input',
        timestamp: 'Offline Manual Simulation',
        ambientTempC: fallbackTempC,
        apparentTempC: approxApparent,
        relativeHumidityPct: fallbackHumidityPct,
        uvIndex: 3,
        metabolicWatts,
        garmentClo: activeGarment.thermalResistanceClo,
        hydrationLoggedMl: hydrationOffsetMl,
      });
    }
    return null;
  }, [
    envData,
    isDegradedEnv,
    fallbackTempC,
    fallbackHumidityPct,
    metabolicWatts,
    activeGarment.thermalResistanceClo,
    hydrationOffsetMl,
  ]);

  const series = useMemo(
    () =>
      buildLiveTelemetrySeries(
        envData,
        timeframe,
        metabolicWatts,
        activeGarment.thermalResistanceClo,
        hydrationOffsetMl
      ),
    [envData, timeframe, metabolicWatts, activeGarment.thermalResistanceClo, hydrationOffsetMl]
  );

  const computedStatus = classifyNasaStatus(currentSample ?? series[series.length - 1]);
  const effectiveStatus = manualOverride ?? computedStatus;

  useEffect(() => {
    if (effectiveStatus !== 'critical') {
      setEmergencyElapsedSec(0);
      setCheckedSteps([]);
      setSosNotified(false);
      return;
    }
    const timer = window.setInterval(() => {
      setEmergencyElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [effectiveStatus]);

  const handleDrinkElectrolytes = () => {
    setHydrationOffsetMl((prev) => prev + 350);
    if (manualOverride === 'drift') {
      onChangeManualOverride(null);
    }
  };

  const toggleEmergencyStep = (index: number) => {
    setCheckedSteps((prev) =>
      prev.includes(index) ? prev.filter((item) => item !== index) : [...prev, index]
    );
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleExportCsv = () => {
    if (!isPro) {
      onNavigateToPlans();
      return;
    }
    if (series.length === 0) return;
    const header =
      'timestamp,station,ambient_temp_c,apparent_temp_c,relative_humidity_pct,uv_index,modeled_core_temp_c,heat_storage_kj_kg,required_hydration_ml_hr\n';
    const rows = series
      .map(
        (p) =>
          `${p.timestamp},"${station.name}",${p.ambientTempC},${p.apparentTempC},${p.relativeHumidityPct},${p.uvIndex},${p.projectedCoreTempC},${p.heatStorageKjKg},${p.requiredHydrationMlHr}`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `health4ever-digital-twin-${station.id}-${timeframe}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportConfirmation(`Exported ${series.length} Digital Twin projection rows (.CSV)`);
    window.setTimeout(() => setExportConfirmation(null), 4000);
  };

  const sourceLabel =
    timeframe === 'nasaPower'
      ? 'NASA POWER Satellite Climatology API'
      : 'Open-Meteo Meteorological API';

  const latestAir = envData?.airQuality?.current;
  const latestWeather = envData?.weather?.current;
  const displaySample = currentSample ?? series[series.length - 1];

  if (effectiveStatus === 'critical') {
    return (
      <div className="space-y-6">
        <div className="bg-rose-950 text-white rounded-2xl p-6 sm:p-8 border border-rose-800">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-rose-800/80">
            <div>
              <div className="flex items-center gap-2 text-rose-200 text-xs font-mono">
                <Lock className="w-4 h-4" />
                <span>
                  EMERGENCY GUIDANCE MODE LOCKED · {NASA_STD_3001.standardCode} DIGITAL TWIN THRESHOLD
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mt-2 text-balance">
                ✖ Critical Alert: Projected Thermal Strain Exceeds Ceiling
              </h1>
              <p className="text-sm text-rose-100/90 mt-1.5 max-w-2xl">
                Secondary navigation is locked. Follow the stabilization steps below until modeled body heat storage drops below +{NASA_STD_3001.heatStorageMaxKjKg.toFixed(1)} kJ/kg.
              </p>
            </div>

            <div className="bg-rose-900/70 border border-rose-700 rounded-xl px-5 py-3.5 shrink-0">
              <p className="text-xs font-mono text-rose-200">Stabilization Timer</p>
              <p className="text-3xl font-mono font-semibold tabular-nums mt-0.5">
                {formatTimer(emergencyElapsedSec)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="bg-rose-900/40 border border-rose-800 rounded-xl p-5 space-y-4">
              <p className="text-xs font-mono text-rose-200">
                Digital Twin Projection · {station.name} ({activeGarment.name})
              </p>
              {displaySample && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-rose-200">Modeled Core Temp</p>
                    <p className="text-2xl font-mono font-semibold tabular-nums mt-0.5">
                      {displaySample.projectedCoreTempC.toFixed(2)}{' '}
                      <span className="text-xs text-rose-300">°C</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-rose-200">Heat Storage</p>
                    <p className="text-2xl font-mono font-semibold tabular-nums mt-0.5">
                      {displaySample.heatStorageKjKg.toFixed(2)}{' '}
                      <span className="text-xs text-rose-300">kJ/kg</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-rose-200">Required Hydration</p>
                    <p className="text-2xl font-mono font-semibold tabular-nums mt-0.5">
                      {displaySample.requiredHydrationMlHr}{' '}
                      <span className="text-xs text-rose-300">mL/hr</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-rose-200">Ambient Air</p>
                    <p className="text-2xl font-mono font-semibold tabular-nums mt-0.5">
                      {displaySample.ambientTempC.toFixed(1)}{' '}
                      <span className="text-xs text-rose-300">°C</span>
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-rose-800/80 space-y-2.5">
                <button
                  type="button"
                  onClick={() => setSosNotified(true)}
                  disabled={sosNotified}
                  className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors min-h-[44px] ${
                    sosNotified
                      ? 'bg-emerald-600 text-white cursor-default'
                      : 'bg-white text-rose-950 hover:bg-rose-50'
                  }`}
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>{sosNotified ? 'Emergency Contact Dispatched' : 'Alert Emergency Contact'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onChangeManualOverride(null);
                    setMetabolicWatts(180);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl text-sm font-medium bg-rose-900 text-rose-100 border border-rose-700 hover:bg-rose-800 transition-colors min-h-[44px]"
                >
                  Acknowledge &amp; Exit Emergency Mode
                </button>
              </div>
            </div>

            <div className="lg:col-span-2 bg-rose-900/30 border border-rose-800 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <p className="text-sm font-semibold text-white">
                    Physiological Stabilization Protocol
                  </p>
                  <span className="text-xs font-mono text-rose-200 tabular-nums">
                    {checkedSteps.length} / {EMERGENCY_STEPS.length} Completed
                  </span>
                </div>

                <div className="space-y-2.5">
                  {EMERGENCY_STEPS.map((step, index) => {
                    const done = checkedSteps.includes(index);
                    return (
                      <button
                        key={step}
                        type="button"
                        onClick={() => toggleEmergencyStep(index)}
                        className={`w-full text-left p-3.5 rounded-xl border flex items-start gap-3 transition-colors min-h-[48px] ${
                          done
                            ? 'bg-emerald-950/60 border-emerald-700 text-emerald-100'
                            : 'bg-rose-950/60 border-rose-800 text-rose-50 hover:bg-rose-900/50'
                        }`}
                      >
                        <CheckCircle2
                          className={`w-5 h-5 shrink-0 mt-0.5 ${
                            done ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        />
                        <span className="text-sm leading-snug">{step}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {checkedSteps.length === EMERGENCY_STEPS.length && (
                <div className="mt-4 pt-4 border-t border-rose-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-xs text-emerald-200">
                    All stabilization actions confirmed. Return to Digital Twin monitoring.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onChangeManualOverride(null);
                      setMetabolicWatts(180);
                    }}
                    className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 text-xs font-semibold hover:bg-emerald-400 transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
                  >
                    Restore Digital Twin Monitoring
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Live Controls */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Digital Twin &amp; Predictive Telemetry Simulator · {station.name} ({station.agencyContext}) · {activeGarment.name} ({activeGarment.thermalResistanceClo} clo)
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight mt-1 text-balance">
            Autonomous Biometric Digital Twin
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label htmlFor="station-select" className="sr-only">
            Monitoring Station
          </label>
          <select
            id="station-select"
            value={stationId}
            onChange={(e) => onChangeStation(e.target.value)}
            className="px-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg min-h-[40px]"
          >
            {MONITORING_STATIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.agencyContext}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onRefreshEnv}
            disabled={envLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${envLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Live APIs</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isPro ? 'Export Twin CSV' : 'Unlock Pro CSV'}</span>
          </button>
        </div>
      </div>

      {/* Clear Digital Twin Architecture Boundary Disclosure */}
      <div className="bg-slate-100/80 border border-slate-200 rounded-xl px-4 py-3 flex items-start gap-3 text-xs text-slate-700">
        <Info className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="font-semibold text-slate-900">Digital Twin Boundary:</strong>{' '}
          Environmental inputs (ambient heat, humidity, UV, air quality, and solar irradiance) are fetched live from public Open-Meteo and NASA POWER APIs. Physical bio-yarn garment hardware is in prototype stage; biometric outputs (core temp rise, body heat storage, and hydration demand) are deterministic analytical projections computed from NASA-STD-3001 Vol. 2 equations.
        </p>
      </div>

      {/* Graceful Degradation Banner + Manual Environmental Input Fallback if Upstream Weather API is Unavailable */}
      {(isDegradedEnv || envError || envData?.stale) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-950">
                {envData?.stale
                  ? 'Upstream API Rate-Limited — Serving Last-Known-Good Cached Telemetry'
                  : 'Upstream Weather API Temporarily Unavailable — Offline Digital Twin Fallback Active'}
              </p>
              <p className="text-xs text-amber-900 mt-0.5">
                {envError ||
                  envData?.error ||
                  'Use the manual environmental inputs below to continue testing the NASA-STD-3001 physiological model.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onRefreshEnv}
              className="px-3.5 py-2 text-xs font-semibold text-amber-950 bg-white border border-amber-300 rounded-lg hover:bg-amber-100 whitespace-nowrap shrink-0 self-start sm:self-center"
            >
              Retry Live APIs
            </button>
          </div>

          {isDegradedEnv && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-amber-200/80">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-amber-950">Manual Ambient Temp</span>
                  <span className="font-mono font-semibold tabular-nums">{fallbackTempC} °C</span>
                </div>
                <input
                  type="range"
                  min={-10}
                  max={45}
                  step={1}
                  value={fallbackTempC}
                  onChange={(e) => setFallbackTempC(Number(e.target.value))}
                  className="w-full accent-amber-700"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-amber-950">Manual Relative Humidity</span>
                  <span className="font-mono font-semibold tabular-nums">{fallbackHumidityPct}%</span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={95}
                  step={5}
                  value={fallbackHumidityPct}
                  onChange={(e) => setFallbackHumidityPct(Number(e.target.value))}
                  className="w-full accent-amber-700"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {exportConfirmation && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-xl px-4 py-3">
          {exportConfirmation}
        </div>
      )}

      {/* Drift Preventative Hydration Prompt */}
      {effectiveStatus === 'drift' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-950">
                ▲ Drift Detected: Preventative Hydration &amp; Thermal Load Prompt
              </p>
              <p className="text-xs text-amber-900/90 mt-1 max-w-2xl leading-relaxed">
                Combined ambient heat ({displaySample?.ambientTempC.toFixed(1) ?? '--'} °C) and metabolic load ({metabolicWatts} W) push modeled thermal strain toward the NASA-STD-3001 +0.6 °C impairment onset. Log 350 mL fluid intake or reduce exertion.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleDrinkElectrolytes}
              className="px-4 py-2 text-xs font-semibold text-white bg-amber-700 rounded-lg hover:bg-amber-800 transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
            >
              Log 350 mL Electrolyte Intake
            </button>
            <button
              type="button"
              onClick={() => onChangeManualOverride('critical')}
              className="px-3.5 py-2 text-xs font-medium text-rose-700 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
            >
              Test Critical Lock
            </button>
          </div>
        </div>
      )}

      {/* Main Split: Hero Status Ring + Live Environmental & Modeled KPI Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-5">
          <HeroStatusRing
            status={effectiveStatus}
            manualOverride={manualOverride}
            onSelectOverride={onChangeManualOverride}
            projectedCoreTempC={displaySample?.projectedCoreTempC ?? NASA_STD_3001.restingCoreTempC}
            heatStorageKjKg={displaySample?.heatStorageKjKg ?? 0}
            hydrationOffsetMl={hydrationOffsetMl}
            stationName={station.name}
          />
        </div>

        <div className="lg:col-span-7 flex flex-col justify-between gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  {liveWeatherAvailable ? 'Live Ambient Temp (Open-Meteo)' : 'Manual Ambient Temp'}
                </span>
                <Thermometer className="w-4 h-4 text-slate-400" />
              </div>
              <div className="my-2.5">
                <span className="text-3xl font-mono font-semibold text-slate-900 tabular-nums">
                  {latestWeather
                    ? latestWeather.temperature_2m.toFixed(1)
                    : isDegradedEnv
                    ? fallbackTempC.toFixed(1)
                    : '--'}
                </span>
                <span className="text-xs font-mono text-slate-400 ml-1.5">°C</span>
              </div>
              <p className="text-xs font-mono text-slate-600 tabular-nums">
                {latestWeather
                  ? `Apparent ${latestWeather.apparent_temperature.toFixed(1)} °C · RH ${latestWeather.relative_humidity_2m}%`
                  : isDegradedEnv
                  ? `Fallback RH ${fallbackHumidityPct}%`
                  : 'Loading meteorological input...'}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Projected Core Temp (NASA-STD-3001 Model)
                </span>
                <Activity className="w-4 h-4 text-slate-400" />
              </div>
              <div className="my-2.5">
                <span className="text-3xl font-mono font-semibold text-slate-900 tabular-nums">
                  {displaySample ? displaySample.projectedCoreTempC.toFixed(2) : '--'}
                </span>
                <span className="text-xs font-mono text-slate-400 ml-1.5">°C</span>
              </div>
              <p className="text-xs font-mono text-slate-600 tabular-nums">
                Δ {displaySample ? `${displaySample.coreTempDeltaC >= 0 ? '+' : ''}${displaySample.coreTempDeltaC.toFixed(2)}` : '--'} °C · Impairment +{NASA_STD_3001.coreTempRiseImpairmentC.toFixed(1)} °C
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Projected Hydration Need (Model)
                </span>
                <Droplets className="w-4 h-4 text-slate-400" />
              </div>
              <div className="my-2.5">
                <span className="text-3xl font-mono font-semibold text-slate-900 tabular-nums">
                  {displaySample ? displaySample.requiredHydrationMlHr : '--'}
                </span>
                <span className="text-xs font-mono text-slate-400 ml-1.5">mL/hr</span>
              </div>
              <p className="text-xs font-mono text-slate-600 tabular-nums">
                NASA-STD-3001 Floor: {NASA_STD_3001.minHydrationMlPerHour} mL/hr (8 fl oz/hr)
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Live Air Quality (Open-Meteo AQI)
                </span>
                <Wind className="w-4 h-4 text-slate-400" />
              </div>
              <div className="my-2.5">
                <span className="text-3xl font-mono font-semibold text-slate-900 tabular-nums">
                  {latestAir?.us_aqi ?? '--'}
                </span>
                <span className="text-xs font-mono text-slate-400 ml-1.5">US AQI</span>
              </div>
              <p className="text-xs font-mono text-slate-600 tabular-nums">
                PM2.5 {latestAir?.pm2_5?.toFixed(1) ?? '--'} μg/m³ · O₃ {latestAir?.ozone?.toFixed(0) ?? '--'} μg/m³
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Digital Twin Metabolic Input (NASA-STD-3001 Envelope: 147–617 W)
                </p>
                <p className="text-sm font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
                  {metabolicWatts} W ({Math.round(metabolicWatts * 3.6)} kJ/hr) · Garment {activeGarment.name} ({activeGarment.thermalResistanceClo} clo)
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onOpenGarmentSelect}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap"
                >
                  Switch Garment Layer
                </button>
                <button
                  type="button"
                  onClick={handleDrinkElectrolytes}
                  className="px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors whitespace-nowrap"
                >
                  + 350 mL Intake
                </button>
              </div>
            </div>
            <input
              type="range"
              aria-label="Metabolic exertion in Watts"
              min={NASA_STD_3001.metabolicRangeWatts.min}
              max={NASA_STD_3001.metabolicRangeWatts.max}
              step={10}
              value={metabolicWatts}
              onChange={(e) => setMetabolicWatts(Number(e.target.value))}
              className="w-full accent-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Longitudinal Chart */}
      <LongitudinalChart
        data={series}
        loading={envLoading}
        error={
          envError ||
          (isDegradedEnv
            ? 'Live weather chart unavailable while upstream API is unreachable; switch to NASA POWER 10-Day or use the manual Digital Twin controls above.'
            : null)
        }
        timeframe={timeframe}
        onChangeTimeframe={setTimeframe}
        metric={metric}
        onChangeMetric={setMetric}
        sourceLabel={sourceLabel}
      />

      {/* Live Multi-Source Status Strip */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500">
            Live Environmental Telemetry + Deterministic NASA-STD-3001 Modeling
          </p>
          <p className="text-xs text-slate-700 font-mono">
            Open-Meteo Weather: {envData?.sourceStatus.openMeteoWeather ?? 'loading'} · Air Quality:{' '}
            {envData?.sourceStatus.openMeteoAirQuality ?? 'loading'} · NASA POWER Climatology:{' '}
            {envData?.sourceStatus.nasaPower ?? 'loading'}
          </p>
        </div>

        <button
          type="button"
          onClick={onNavigateToSpaceLab}
          className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 self-start md:self-center min-h-[38px]"
        >
          Open Space Data Lab (OSDR, ISS, PubMed, Crossref)
        </button>
      </div>
    </div>
  );
}
