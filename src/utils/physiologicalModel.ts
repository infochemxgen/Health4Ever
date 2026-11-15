import { NASA_STD_3001 } from '../data/spaceAgencyData';
import { BioStatus, EnvironmentApiResponse, TelemetryPoint } from '../types/health4ever';

/**
 * Deterministic physiological strain projection derived from:
 * 1) Real-time meteorological inputs (Open-Meteo + NASA POWER)
 * 2) Documented NASA-STD-3001 Vol. 2 metabolic & heat-storage thresholds
 */
export function computeSampleFromWeather(params: {
  label: string;
  timestamp: string;
  ambientTempC: number;
  apparentTempC: number;
  relativeHumidityPct: number;
  uvIndex: number;
  solarIrradianceKwh?: number;
  metabolicWatts: number;
  garmentClo: number;
  hydrationLoggedMl: number;
}): TelemetryPoint {
  const {
    label,
    timestamp,
    ambientTempC,
    apparentTempC,
    relativeHumidityPct,
    uvIndex,
    solarIrradianceKwh,
    metabolicWatts,
    garmentClo,
    hydrationLoggedMl,
  } = params;

  // Environmental thermal stress factor relative to thermoneutral 21 °C
  const thermalDrive = Math.max(0, apparentTempC - 21.0);
  const humidityImpedance = Math.max(0, (relativeHumidityPct - 45) / 55);
  const exertionRatio = Math.max(0, (metabolicWatts - 147) / (617 - 147));

  // Heat storage estimate (kJ/kg) benchmarked to NASA-STD-3001 (-1.9 to +3.0 kJ/kg)
  const rawHeatStorage =
    -0.3 +
    exertionRatio * 1.95 +
    thermalDrive * 0.14 * (1 + humidityImpedance * 0.45) +
    (garmentClo - 0.35) * 1.2 -
    Math.min(0.65, hydrationLoggedMl / 1000);

  const heatStorageKjKg = Number(Math.max(-1.8, Math.min(4.8, rawHeatStorage)).toFixed(2));

  // Core temperature rise (°C) above NASA-STD-3001 resting 37.0 °C (assuming specific heat 3.47 kJ/kg·°C)
  const coreTempDeltaC = Number(Math.max(-0.2, heatStorageKjKg / 3.47).toFixed(2));
  const projectedCoreTempC = Number((NASA_STD_3001.restingCoreTempC + coreTempDeltaC).toFixed(2));

  // Required hourly hydration replenishment (mL/hr) benchmarked to NASA-STD-3001 240 mL/hr minimum
  const requiredHydrationMlHr = Math.round(
    NASA_STD_3001.minHydrationMlPerHour +
      exertionRatio * 460 +
      thermalDrive * 24 +
      (uvIndex > 5 ? 45 : 0)
  );

  return {
    label,
    timestamp,
    ambientTempC: Number(ambientTempC.toFixed(1)),
    apparentTempC: Number(apparentTempC.toFixed(1)),
    relativeHumidityPct: Math.round(relativeHumidityPct),
    uvIndex: Number(uvIndex.toFixed(1)),
    solarIrradianceKwh,
    projectedCoreTempC,
    coreTempDeltaC,
    requiredHydrationMlHr,
    heatStorageKjKg,
    nasaImpairmentTempC: NASA_STD_3001.coreTempImpairmentC,
    nasaHydrationFloorMlHr: NASA_STD_3001.minHydrationMlPerHour,
    nasaHeatStorageCeilingKjKg: NASA_STD_3001.heatStorageMaxKjKg,
  };
}

export function buildLiveTelemetrySeries(
  env: EnvironmentApiResponse | null,
  timeframe: '24h' | '7d' | 'nasaPower',
  metabolicWatts: number,
  garmentClo: number,
  hydrationLoggedMl: number
): TelemetryPoint[] {
  if (!env) return [];

  if (timeframe === '24h' && env.weather?.hourly) {
    const h = env.weather.hourly;
    const count = Math.min(24, h.time.length);
    const points: TelemetryPoint[] = [];
    for (let i = 0; i < count; i += 2) {
      const iso = h.time[i];
      const hourLabel = iso.slice(11, 16);
      points.push(
        computeSampleFromWeather({
          label: hourLabel,
          timestamp: iso.replace('T', ' '),
          ambientTempC: h.temperature_2m[i] ?? 20,
          apparentTempC: h.apparent_temperature[i] ?? h.temperature_2m[i] ?? 20,
          relativeHumidityPct: h.relative_humidity_2m[i] ?? 50,
          uvIndex: h.uv_index[i] ?? 0,
          metabolicWatts,
          garmentClo,
          hydrationLoggedMl,
        })
      );
    }
    return points;
  }

  if (timeframe === '7d' && env.weather?.daily) {
    const d = env.weather.daily;
    return d.time.map((dateStr, i) => {
      const tMax = d.temperature_2m_max[i] ?? 20;
      const appMax = d.apparent_temperature_max[i] ?? tMax;
      const uvMax = d.uv_index_max[i] ?? 0;
      const shortLabel = dateStr.slice(5);
      return computeSampleFromWeather({
        label: shortLabel,
        timestamp: `${dateStr} (Daily Peak)`,
        ambientTempC: tMax,
        apparentTempC: appMax,
        relativeHumidityPct: env.weather?.current?.relative_humidity_2m ?? 55,
        uvIndex: uvMax,
        metabolicWatts,
        garmentClo,
        hydrationLoggedMl,
      });
    });
  }

  if (timeframe === 'nasaPower' && env.nasaPower?.properties?.parameter) {
    const p = env.nasaPower.properties.parameter;
    const t2m = p.T2M ?? {};
    const rh2m = p.RH2M ?? {};
    const sw = p.ALLSKY_SFC_SW_DWN ?? {};
    const keys = Object.keys(t2m).sort();

    return keys
      .filter((k) => t2m[k] !== -999 && rh2m[k] !== -999)
      .map((k) => {
        const temp = t2m[k];
        const rh = rh2m[k];
        const irr = sw[k] !== undefined && sw[k] !== -999 ? sw[k] : undefined;
        const formatted = `${k.slice(4, 6)}-${k.slice(6, 8)}`;
        const apparent = temp + (rh - 45) * 0.06;
        return computeSampleFromWeather({
          label: formatted,
          timestamp: `${k.slice(0, 4)}-${formatted} (NASA POWER)`,
          ambientTempC: temp,
          apparentTempC: apparent,
          relativeHumidityPct: rh,
          uvIndex: irr ? Number((irr * 1.4).toFixed(1)) : 0,
          solarIrradianceKwh: irr,
          metabolicWatts,
          garmentClo,
          hydrationLoggedMl,
        });
      });
  }

  return [];
}

export function classifyNasaStatus(point: TelemetryPoint | undefined): BioStatus {
  if (!point) return 'nominal';
  if (
    point.heatStorageKjKg >= NASA_STD_3001.heatStorageMaxKjKg ||
    point.coreTempDeltaC >= 0.9
  ) {
    return 'critical';
  }
  if (
    point.coreTempDeltaC >= NASA_STD_3001.coreTempRiseImpairmentC ||
    point.heatStorageKjKg >= 2.1
  ) {
    return 'drift';
  }
  return 'nominal';
}
