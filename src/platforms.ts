export interface Platform {
  key: string;
  name: string;
  suffix: string;
}

export const PLATFORMS: Platform[] = [
  { key: 'vercel', name: 'Vercel', suffix: '.vercel.app' },
  { key: 'netlify', name: 'Netlify', suffix: '.netlify.app' },
  { key: 'render', name: 'Render', suffix: '.onrender.com' },
  { key: 'railway', name: 'Railway', suffix: '.up.railway.app' },
  { key: 'github', name: 'GitHub Pages', suffix: '.github.io' },
  { key: 'cloudflare', name: 'Cloudflare Pages', suffix: '.pages.dev' },
  { key: 'firebase', name: 'Firebase', suffix: '.web.app' },
  { key: 'supabase', name: 'Supabase', suffix: '.supabase.co' },
  { key: 'fly', name: 'Fly.io', suffix: '.fly.dev' },
  { key: 'koyeb', name: 'Koyeb', suffix: '.koyeb.app' },
  { key: 'deno', name: 'Deno Deploy', suffix: '.deno.dev' },
  { key: 'heroku', name: 'Heroku', suffix: '.herokuapp.com' },
  { key: 'replit', name: 'Replit', suffix: '.replit.app' },
  { key: 'glitch', name: 'Glitch', suffix: '.glitch.me' },
  { key: 'surge', name: 'Surge', suffix: '.surge.sh' },
  { key: 'huggingface', name: 'Hugging Face Spaces', suffix: '.hf.space' },
  { key: 'gitlab', name: 'GitLab Pages', suffix: '.gitlab.io' },
  { key: 'cyclic', name: 'Cyclic', suffix: '.cyclic.app' },
  { key: 'digitalocean', name: 'DigitalOcean App', suffix: '.ondigitalocean.app' },
  { key: 'amplify', name: 'AWS Amplify', suffix: '.amplifyapp.com' },
  { key: 'lovable', name: 'Lovable', suffix: '.lovable.app' },
  { key: 'bolt', name: 'Bolt', suffix: '.bolt.host' },
  { key: 'custom', name: 'Custom Domain (Full URL)', suffix: '' },
];

export function toUrl(raw: string, platformKey: string): string {
  let v = raw.trim().toLowerCase()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .replace(/\s+/g, '');

  if (!v || !/^[a-z0-9.-]+$/.test(v)) return '';

  const plat = PLATFORMS.find((p) => p.key === platformKey);
  const s = plat ? plat.suffix : '';

  if (!v.includes('.')) {
    if (!s) return '';
    v += s;
  }

  return 'https://' + v;
}
