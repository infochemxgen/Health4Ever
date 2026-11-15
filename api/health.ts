interface ApiRequest {
  query?: Record<string, string | string[] | undefined>;
}

interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
}

export default async function handler(_req: ApiRequest, res: ApiResponse) {
  res.status(200).json({
    status: 'ok',
    service: 'health4ever-digital-twin-proxy',
    timestamp: new Date().toISOString(),
  });
}
