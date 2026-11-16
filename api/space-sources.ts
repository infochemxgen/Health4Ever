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

async function fetchJsonWithTimeout(url: string, timeoutMs = 6000): Promise<unknown> {
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

  const rawQuery = readQueryParam(req, 'q') ?? 'spaceflight human physiology';
  const query = rawQuery.trim().slice(0, 120) || 'spaceflight human physiology';

  try {
    const cacheKey = `space:${query.toLowerCase()}`;
    const cached = getCached(cacheKey);
    if (cached) {
      res.status(200).json(cached);
      return;
    }

    const osdrUrl = `https://osdr.nasa.gov/osdr/data/search?term=${encodeURIComponent(query)}&size=8&type=cgene`;
    const issUrl = 'https://api.wheretheiss.at/v1/satellites/25544';
    const pubmedSearchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=6&sort=relevance`;
    const crossrefUrl = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=6&select=DOI,title,published,container-title,author`;

    const [osdrRes, issRes, pubmedSearchRes, crossrefRes] = await Promise.allSettled([
      fetchJsonWithTimeout(osdrUrl, 6000),
      fetchJsonWithTimeout(issUrl, 5000),
      fetchJsonWithTimeout(pubmedSearchUrl, 5000),
      fetchJsonWithTimeout(crossrefUrl, 6000),
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
          const summaryJson = (await fetchJsonWithTimeout(summaryUrl, 3000)) as {
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
          // Leave pubmedPapers empty if summary step times out
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
        res.status(200).json({ ...stale, stale: true });
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
    res.status(200).json(payload);
  } catch {
    res.status(200).json({
      fetchedAt: new Date().toISOString(),
      query,
      stale: false,
      osdrStudies: [],
      pubmedPapers: [],
      crossrefWorks: [],
      issTelemetry: null,
      sourceStatus: {
        nasaOsdr: 'unavailable',
        whereTheIss: 'unavailable',
        ncbiPubmed: 'unavailable',
        crossref: 'unavailable',
      },
    });
  }
}
