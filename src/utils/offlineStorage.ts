// IndexedDB Offline Storage for full-site offline caching

export interface SiteSnapshot {
  url: string;
  html: string;
  title: string;
  platform: string;
  timestamp: number;
}

const DB_NAME = 'site_opener_offline_db';
const STORE_NAME = 'site_snapshots';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db: IDBDatabase = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'url' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveSiteSnapshot(snapshot: SiteSnapshot): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(snapshot);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to save offline snapshot to IndexedDB:', err);
  }
}

export async function getSiteSnapshot(url: string): Promise<SiteSnapshot | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(url);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function hasSiteSnapshot(url: string): Promise<boolean> {
  const snap = await getSiteSnapshot(url);
  return snap !== null && !!snap.html;
}

export async function deleteSiteSnapshot(url: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(url);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}

export async function getAllOfflineUrls(): Promise<string[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAllKeys();
      req.onsuccess = () => resolve((req.result as string[]) || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Downloads and packages the site HTML (with inlined styles)
 * into IndexedDB so it can open 100% offline without internet.
 */
export async function downloadSiteForOffline(
  url: string,
  title: string,
  platform: string
): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }

  try {
    let html = '';

    // First attempt: Server-side inliner proxy
    try {
      const res = await fetch(`/api/cache-site?url=${encodeURIComponent(url)}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        html = await res.text();
      }
    } catch {
      // Server proxy unavailable or offline
    }

    // Direct fallback if CORS permitted
    if (!html) {
      try {
        const directRes = await fetch(url, { mode: 'cors', signal: AbortSignal.timeout(5000) });
        if (directRes.ok) {
          html = await directRes.text();
          const baseTag = `<base href="${url}">`;
          html = html.replace(/<head[^>]*>/i, `$&${baseTag}`);
        }
      } catch {
        // CORS blocked
      }
    }

    if (html && html.trim().length > 10) {
      await saveSiteSnapshot({
        url,
        html,
        title,
        platform,
        timestamp: Date.now(),
      });
      return true;
    }
  } catch (err) {
    console.warn('Could not cache site for offline:', err);
  }

  return false;
}

/**
 * Batch cache all liked sites in the background
 */
export async function cacheAllLikedSites(
  sites: { url: string; host: string; platform: string }[],
  onProgress?: (completed: number, total: number) => void
): Promise<number> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 0;
  }

  const existing = await getAllOfflineUrls();
  let count = 0;
  const toDownload = sites.filter((s) => !existing.includes(s.url));

  for (let i = 0; i < toDownload.length; i++) {
    const site = toDownload[i];
    const success = await downloadSiteForOffline(site.url, site.host, site.platform);
    if (success) count++;
    if (onProgress) {
      onProgress(i + 1, toDownload.length);
    }
    // Small delay between requests to avoid rate limits
    await new Promise((r) => setTimeout(r, 200));
  }

  return count;
}
