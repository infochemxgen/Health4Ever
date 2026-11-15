import { getSpaceSourcesData } from '../lib/apiHandlers';

interface ApiRequest {
  query?: Record<string, string | string[] | undefined>;
}

interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const rawQ = Array.isArray(req.query?.q) ? req.query?.q[0] : req.query?.q;
  const payload = await getSpaceSourcesData(String(rawQ ?? 'spaceflight human physiology'));
  res.status(200).json(payload);
}
