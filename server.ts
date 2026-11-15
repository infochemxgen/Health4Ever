import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { getEnvironmentData, getSpaceSourcesData } from './lib/apiHandlers.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'health4ever-digital-twin-proxy',
      timestamp: new Date().toISOString(),
    });
  });

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

    const payload = await getEnvironmentData(lat, lon);
    res.json(payload);
  });

  app.get('/api/space-sources', async (req, res) => {
    const rawQuery = String(req.query.q ?? 'spaceflight human physiology');
    const payload = await getSpaceSourcesData(rawQuery);
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
