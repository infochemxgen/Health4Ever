interface ApiRequest {
  url?: string;
  query?: Record<string, string | string[] | undefined>;
}

interface ApiResponse {
  setHeader?: (name: string, value: string) => void;
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
}

export default async function handler(_req: ApiRequest, res: ApiResponse) {
  res.setHeader?.('Cache-Control', 'no-store');
  res.status(200).json({
    status: 'ok',
    service: 'health4ever-digital-twin-proxy',
    runtime: 'vercel-serverless',
    timestamp: new Date().toISOString(),
  });
}
