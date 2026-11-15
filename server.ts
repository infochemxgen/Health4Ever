import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

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

async function fetchJsonWithTimeout(url: string, timeoutMs = 9000): Promise<unknown> {
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

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'health4ever-digital-twin-proxy', timestamp: new Date().toISOString() });
  });

  // 1. Live Environmental Telemetry (Open-Meteo Weather + Open-Meteo Air Quality + NASA POWER)
  app.get('/api/environment', async (req, res) => {
    const lat = Number(req.query.lat ?? 29.5593);
    const lon = Number(req.query.lon ?? -95.09);

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
      res.json(cached);
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
      fetchJsonWithTimeout(weatherUrl),
      fetchJsonWithTimeout(aqUrl),
      fetchJsonWithTimeout(nasaPowerUrl, 12000),
    ]);

    if (weatherRes.status === 'rejected') {
      const stale = lastGoodCache.get(cacheKey);
      if (stale) {
        res.json({
          ...stale,
          stale: true,
          sourceStatus: {
            ...(stale.sourceStatus as Record<string, string>),
            openMeteoWeather: 'stale-cache',
          },
        });
        return;
      }

      // Return structured degraded JSON (HTTP 200) so frontend falls back cleanly to manual Digital Twin mode
      res.json({
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
    res.json(payload);
  });

  // 2. Live Space Agency Open Science & Literature Feeds
  app.get('/api/space-sources', async (req, res) => {
    const rawQuery = String(req.query.q ?? 'spaceflight human physiology').trim();
    const query = rawQuery.slice(0, 120) || 'spaceflight human physiology';

    const cacheKey = `space:${query.toLowerCase()}`;
    const cached = getCached(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const osdrUrl = `https://osdr.nasa.gov/osdr/data/search?term=${encodeURIComponent(query)}&size=8&type=cgene`;
    const issUrl = 'https://api.wheretheiss.at/v1/satellites/25544';
    const pubmedSearchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=6&sort=relevance`;
    const crossrefUrl = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=6&select=DOI,title,published,container-title,author`;

    const [osdrRes, issRes, pubmedSearchRes, crossrefRes] = await Promise.allSettled([
      fetchJsonWithTimeout(osdrUrl),
      fetchJsonWithTimeout(issUrl, 6000),
      fetchJsonWithTimeout(pubmedSearchUrl),
      fetchJsonWithTimeout(crossrefUrl),
    ]);

    const osdrStudies: Array<{
      accession: string;
      title: string;
      center: string;
      flightProgram: string;
      projectType: string;
      materialType: string;
      url: string;
    }> = [];

    if (osdrRes.status === 'fulfilled') {
      const osdrJson = osdrRes.value as {
        hits?: { hits?: Array<{ _source?: Record<string, unknown> }> };
      };
      const hits = osdrJson?.hits?.hits ?? [];
      for (const h of hits) {
        const src = h._source ?? {};
        const acc = String(src['Accession'] ?? '');
        if (!acc) continue;
        osdrStudies.push({
          accession: acc,
          title: String(src['Study Title'] ?? 'Untitled Study'),
          center: String(src['Managing NASA Center'] ?? 'NASA OSDR'),
          flightProgram: String(src['Flight Program'] ?? 'Open Science Repository'),
          projectType: String(src['Project Type'] ?? 'Space Biology Study'),
          materialType: String(src['Material Type'] ?? ''),
          url: `https://osdr.nasa.gov/bio/repo/data/studies/${encodeURIComponent(acc)}`,
        });
      }
    }

    const pubmedPapers: Array<{
      pmid: string;
      title: string;
      journal: string;
      pubDate: string;
      firstAuthor: string;
      url: string;
    }> = [];

    if (pubmedSearchRes.status === 'fulfilled') {
      const searchJson = pubmedSearchRes.value as {
        esearchresult?: { idlist?: string[] };
      };
      const idList = searchJson?.esearchresult?.idlist ?? [];
      if (idList.length > 0) {
        try {
          const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${idList.join(',')}&retmode=json`;
          const summaryJson = (await fetchJsonWithTimeout(summaryUrl)) as {
            result?: Record<
              string,
              {
                uid?: string;
                title?: string;
                source?: string;
                pubdate?: string;
                authors?: Array<{ name?: string }>;
              }
            >;
          };
          const resultObj = summaryJson?.result ?? {};
          for (const id of idList) {
            const item = resultObj[id];
            if (!item || !item.title) continue;
            pubmedPapers.push({
              pmid: id,
              title: item.title,
              journal: item.source ?? 'PubMed',
              pubDate: item.pubdate ?? '',
              firstAuthor: item.authors?.[0]?.name ?? 'Research Consortium',
              url: `https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(id)}/`,
            });
          }
        } catch {
          // Leave pubmedPapers empty if summary step fails
        }
      }
    }

    const crossrefWorks: Array<{
      doi: string;
      title: string;
      journal: string;
      year: string;
      url: string;
    }> = [];

    if (crossrefRes.status === 'fulfilled') {
      const crJson = crossrefRes.value as {
        message?: {
          items?: Array<{
            DOI?: string;
            title?: string[];
            'container-title'?: string[];
            published?: { 'date-parts'?: number[][] };
          }>;
        };
      };
      const items = crJson?.message?.items ?? [];
      for (const item of items) {
        if (!item.DOI || !item.title?.[0]) continue;
        const yearPart = item.published?.['date-parts']?.[0]?.[0];
        crossrefWorks.push({
          doi: item.DOI,
          title: item.title[0],
          journal: item['container-title']?.[0] ?? 'Peer-Reviewed Journal',
          year: yearPart ? String(yearPart) : '',
          url: `https://doi.org/${item.DOI}`,
        });
      }
    }

    const issTelemetry =
      issRes.status === 'fulfilled'
        ? (issRes.value as {
            latitude: number;
            longitude: number;
            altitude: number;
            velocity: number;
            visibility: string;
            timestamp: number;
          })
        : null;

    const allFailed =
      osdrRes.status === 'rejected' &&
      issRes.status === 'rejected' &&
      pubmedSearchRes.status === 'rejected' &&
      crossrefRes.status === 'rejected';

    if (allFailed) {
      const stale = lastGoodCache.get(cacheKey);
      if (stale) {
        res.json({ ...stale, stale: true });
        return;
      }
    }

    const payload: Record<string, unknown> = {
      fetchedAt: new Date().toISOString(),
      query,
      stale: false,
      osdrStudies,
      pubmedPapers,
      crossrefWorks,
      issTelemetry,
      sourceStatus: {
        nasaOsdr: osdrRes.status === 'fulfilled' ? 'ok' : 'unavailable',
        whereTheIss: issRes.status === 'fulfilled' ? 'ok' : 'unavailable',
        ncbiPubmed: pubmedSearchRes.status === 'fulfilled' ? 'ok' : 'unavailable',
        crossref: crossrefRes.status === 'fulfilled' ? 'ok' : 'unavailable',
      },
    };

    if (!allFailed) {
      setCached(cacheKey, payload, 5 * 60 * 1000);
    }
    res.json(payload);
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Health4Ever OS server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Health4Ever server:', err);
  process.exit(1);
});
