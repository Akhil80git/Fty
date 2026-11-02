import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // API endpoint to fetch, inline styles, and package website for 100% offline viewing
  app.get('/api/cache-site', async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl || !targetUrl.startsWith('http')) {
      return res.status(400).json({ error: 'Valid URL is required' });
    }

    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        redirect: 'follow',
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: `Failed to fetch: ${response.statusText}` });
      }

      let html = await response.text();

      // Ensure base tag so relative resources resolve
      const baseTag = `<base href="${targetUrl}">`;
      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>${baseTag}`);
      } else if (html.includes('<head ')) {
        html = html.replace(/<head[^>]*>/, `$&${baseTag}`);
      } else {
        html = `${baseTag}${html}`;
      }

      // Inline external CSS stylesheets so page renders completely offline without internet
      const linkRegex = /<link[^>]+rel=["']stylesheet["'][^>]*>/gi;
      const hrefRegex = /href=["']([^"']+)["']/i;
      const matches = html.match(linkRegex) || [];

      // Download and inline up to 10 stylesheets
      for (const linkTag of matches.slice(0, 10)) {
        const hrefMatch = linkTag.match(hrefRegex);
        if (hrefMatch && hrefMatch[1]) {
          let cssUrl = hrefMatch[1];
          try {
            if (!cssUrl.startsWith('http')) {
              cssUrl = new URL(cssUrl, targetUrl).href;
            }
            const cssRes = await fetch(cssUrl, {
              headers: { 'User-Agent': 'Mozilla/5.0' },
              signal: AbortSignal.timeout(3500),
            });
            if (cssRes.ok) {
              const cssText = await cssRes.text();
              html = html.replace(linkTag, `<style data-offline-inlined="true">\n${cssText}\n</style>`);
            }
          } catch {
            // Keep original link tag if stylesheet fetch times out
          }
        }
      }

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    } catch (err: any) {
      console.error('Error fetching site for offline caching:', err);
      return res.status(500).json({ error: err.message || 'Error fetching site' });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
