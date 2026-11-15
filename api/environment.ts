import { getEnvironmentData } from '../lib/apiHandlers';

interface ApiRequest {
  query?: Record<string, string | string[] | undefined>;
}

interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const rawLat = Array.isArray(req.query?.lat) ? req.query?.lat[0] : req.query?.lat;
  const rawLon = Array.isArray(req.query?.lon) ? req.query?.lon[0] : req.query?.lon;

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

  const payload = await getEnvironmentData(lat, lon);
  res.status(200).json(payload);
}
