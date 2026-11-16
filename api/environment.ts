interface ApiRequest {
  url?: string;
  query?: Record<string, string | string[] | undefined>;
}

interface ApiResponse {
  setHeader?: (name: string, value: string) => void;
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
}

interface CacheEntry {
  expiresAt: number;
  data: Record<string, unknown>;
}

const apiCache = new Map<string, CacheEntry>();
const lastGoodCache = new Map<string, Record<string, unknown>>();

function getCached(key: string): Record<string, unknown> | null {
  const entry = apiCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    apiCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key: string, data: Record<string, unknown>, ttlMs = 5 * 60 * 1000) {
  apiCache.set(key, { expiresAt: Date.now() + ttlMs, data });
  lastGoodCache.set(key, data);
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 6500): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Health4Ever-OS/1.0 (OpenScienceDigitalTwin)',
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${new URL(url).hostname}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function formatYyyymmdd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function readQueryParam(req: ApiRequest, name: string): string | undefined {
  const fromQuery = req.query?.[name];
  if (Array.isArray(fromQuery)) return fromQuery[0];
  if (typeof fromQuery === 'string') return fromQuery;
  if (req.url) {
    try {
      const parsed = new URL(req.url, 'http://localhost');
      return parsed.searchParams.get(name) ?? undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader?.('Cache-Control', 's-maxage=120, stale-while-revalidate=300');

  try {
    const rawLat = readQueryParam(req, 'lat');
    const rawLon = readQueryParam(req, 'lon');

    const lat = Number(rawLat ?? 29.5593);
    const lon = Number(rawLon ?? -95.09);

    if (
      Number.isNaN(lat) ||
      Number.isNaN(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      res.status(400).json({ error: 'Invalid latitude or longitude coordinates.' });
      return;
    }

    const cacheKey = `env:${lat.toFixed(2)},${lon.toFixed(2)}`;
    const cached = getCached(cacheKey);
    if (cached) {
      res.status(200).json(cached);
      return;
    }

    const endDate = new Date(Date.now() - 2 * 86400 * 1000);
    const startDate = new Date(endDate.getTime() - 9 * 86400 * 1000);
    const startStr = formatYyyymmdd(startDate);
    const endStr = formatYyyymmdd(endDate);

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,uv_index&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,uv_index&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,uv_index_max&timezone=auto&forecast_days=7`;
    const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,ozone`;
    const nasaPowerUrl = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,RH2M,ALLSKY_SFC_SW_DWN&community=RE&longitude=${lon}&latitude=${lat}&start=${startStr}&end=${endStr}&format=JSON`;

    const [weatherRes, aqRes, nasaPowerRes] = await Promise.allSettled([
      fetchJsonWithTimeout(weatherUrl, 6000),
      fetchJsonWithTimeout(aqUrl, 6000),
      fetchJsonWithTimeout(nasaPowerUrl, 7000),
    ]);

    if (weatherRes.status === 'rejected') {
      const stale = lastGoodCache.get(cacheKey);
      if (stale) {
        res.status(200).json({
          ...stale,
          stale: true,
          sourceStatus: {
            ...(stale.sourceStatus as Record<string, string>),
            openMeteoWeather: 'stale-cache',
          },
        });
        return;
      }

      res.status(200).json({
        fetchedAt: new Date().toISOString(),
        coordinates: { lat, lon },
        weather: null,
        airQuality: aqRes.status === 'fulfilled' ? (aqRes.value as Record<string, unknown>) : null,
        nasaPower:
          nasaPowerRes.status === 'fulfilled'
            ? (nasaPowerRes.value as Record<string, unknown>)
            : null,
        sourceStatus: {
          openMeteoWeather: 'unavailable',
          openMeteoAirQuality: aqRes.status === 'fulfilled' ? 'ok' : 'unavailable',
          nasaPower: nasaPowerRes.status === 'fulfilled' ? 'ok' : 'unavailable',
        },
        error: `Open-Meteo weather API unreachable: ${String(weatherRes.reason)}`,
      });
      return;
    }

    const weatherData = weatherRes.value as Record<string, unknown>;
    const aqData = aqRes.status === 'fulfilled' ? (aqRes.value as Record<string, unknown>) : null;
    const powerData =
      nasaPowerRes.status === 'fulfilled' ? (nasaPowerRes.value as Record<string, unknown>) : null;

    const payload: Record<string, unknown> = {
      fetchedAt: new Date().toISOString(),
      coordinates: { lat, lon },
      weather: weatherData,
      airQuality: aqData,
      nasaPower: powerData,
      stale: false,
      sourceStatus: {
        openMeteoWeather: 'ok',
        openMeteoAirQuality: aqRes.status === 'fulfilled' ? 'ok' : 'unavailable',
        nasaPower: nasaPowerRes.status === 'fulfilled' ? 'ok' : 'unavailable',
      },
    };

    setCached(cacheKey, payload, 5 * 60 * 1000);
    res.status(200).json(payload);
  } catch (err) {
    res.status(200).json({
      fetchedAt: new Date().toISOString(),
      coordinates: { lat: 29.5593, lon: -95.09 },
      weather: null,
      airQuality: null,
      nasaPower: null,
      stale: false,
      sourceStatus: {
        openMeteoWeather: 'unavailable',
        openMeteoAirQuality: 'unavailable',
        nasaPower: 'unavailable',
      },
      error: err instanceof Error ? err.message : 'Unexpected environment handler error',
    });
  }
}
