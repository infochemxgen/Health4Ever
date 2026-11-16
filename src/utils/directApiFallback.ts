import {
  EnvironmentApiResponse,
  SpaceSourcesApiResponse,
} from '../types/health4ever';

async function fetchJsonWithTimeout(url: string, timeoutMs = 8000): Promise<unknown> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  } finally {
    window.clearTimeout(timer);
  }
}

async function tryProxyJson<T>(url: string): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 9500);
    try {
      const res = await fetch(url, { signal: controller.signal });
      const contentType = res.headers.get('content-type') ?? '';
      if (!res.ok || !contentType.includes('application/json')) {
        return null;
      }
      return (await res.json()) as T;
    } finally {
      window.clearTimeout(timer);
    }
  } catch {
    return null;
  }
}

function formatYyyymmdd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

export async function fetchEnvironmentResilient(
  lat: number,
  lon: number
): Promise<EnvironmentApiResponse> {
  const proxied = await tryProxyJson<EnvironmentApiResponse>(
    `/api/environment?lat=${lat}&lon=${lon}`
  );
  if (proxied && proxied.sourceStatus) {
    return proxied;
  }

  // Direct CORS browser fallback (Open-Meteo Weather, Open-Meteo AQI & NASA POWER all allow Origin *)
  const endDate = new Date(Date.now() - 2 * 86400 * 1000);
  const startDate = new Date(endDate.getTime() - 9 * 86400 * 1000);
  const startStr = formatYyyymmdd(startDate);
  const endStr = formatYyyymmdd(endDate);

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,uv_index&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,uv_index&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,uv_index_max&timezone=auto&forecast_days=7`;
  const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,ozone`;
  const nasaPowerUrl = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,RH2M,ALLSKY_SFC_SW_DWN&community=RE&longitude=${lon}&latitude=${lat}&start=${startStr}&end=${endStr}&format=JSON`;

  const [weatherRes, aqRes, powerRes] = await Promise.allSettled([
    fetchJsonWithTimeout(weatherUrl, 8000),
    fetchJsonWithTimeout(aqUrl, 8000),
    fetchJsonWithTimeout(nasaPowerUrl, 9000),
  ]);

  const weather =
    weatherRes.status === 'fulfilled'
      ? (weatherRes.value as EnvironmentApiResponse['weather'])
      : null;
  const airQuality =
    aqRes.status === 'fulfilled'
      ? (aqRes.value as EnvironmentApiResponse['airQuality'])
      : null;
  const nasaPower =
    powerRes.status === 'fulfilled'
      ? (powerRes.value as EnvironmentApiResponse['nasaPower'])
      : null;

  return {
    fetchedAt: new Date().toISOString(),
    coordinates: { lat, lon },
    weather,
    airQuality,
    nasaPower,
    stale: false,
    sourceStatus: {
      openMeteoWeather: weather ? 'ok' : 'unavailable',
      openMeteoAirQuality: airQuality ? 'ok' : 'unavailable',
      nasaPower: nasaPower ? 'ok' : 'unavailable',
    },
    error: weather
      ? undefined
      : 'Live meteorological endpoints are unreachable from this network; offline Digital Twin fallback is active.',
  };
}

export async function fetchSpaceSourcesResilient(
  rawQuery: string
): Promise<SpaceSourcesApiResponse> {
  const query = rawQuery.trim().slice(0, 120) || 'spaceflight human physiology';
  const proxied = await tryProxyJson<SpaceSourcesApiResponse>(
    `/api/space-sources?q=${encodeURIComponent(query)}`
  );
  if (proxied && proxied.sourceStatus) {
    return proxied;
  }

  // Direct CORS browser fallback (WhereTheISS, NCBI PubMed, Crossref allow Origin *)
  const issUrl = 'https://api.wheretheiss.at/v1/satellites/25544';
  const pubmedSearchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=6&sort=relevance`;
  const crossrefUrl = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=6&select=DOI,title,published,container-title,author`;

  const [issRes, pubmedSearchRes, crossrefRes] = await Promise.allSettled([
    fetchJsonWithTimeout(issUrl, 6000),
    fetchJsonWithTimeout(pubmedSearchUrl, 6000),
    fetchJsonWithTimeout(crossrefUrl, 7000),
  ]);

  const pubmedPapers: SpaceSourcesApiResponse['pubmedPapers'] = [];
  if (pubmedSearchRes.status === 'fulfilled') {
    const searchJson = pubmedSearchRes.value as { esearchresult?: { idlist?: string[] } };
    const idList = searchJson?.esearchresult?.idlist ?? [];
    if (idList.length > 0) {
      try {
        const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${idList.join(',')}&retmode=json`;
        const summaryJson = (await fetchJsonWithTimeout(summaryUrl, 6000)) as {
          result?: Record<
            string,
            {
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
        // Ignore PubMed summary errors
      }
    }
  }

  const crossrefWorks: SpaceSourcesApiResponse['crossrefWorks'] = [];
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
      ? (issRes.value as SpaceSourcesApiResponse['issTelemetry'])
      : null;

  return {
    fetchedAt: new Date().toISOString(),
    query,
    osdrStudies: [],
    pubmedPapers,
    crossrefWorks,
    issTelemetry,
    sourceStatus: {
      nasaOsdr: 'unavailable',
      whereTheIss: issRes.status === 'fulfilled' ? 'ok' : 'unavailable',
      ncbiPubmed: pubmedSearchRes.status === 'fulfilled' ? 'ok' : 'unavailable',
      crossref: crossrefRes.status === 'fulfilled' ? 'ok' : 'unavailable',
    },
  };
}
