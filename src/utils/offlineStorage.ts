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
 * Downloads and archives the site HTML into IndexedDB so it can be opened
 * completely offline when internet data is turned off.
 */
export async function downloadSiteForOffline(
  url: string,
  title: string,
  platform: string
): Promise<boolean> {
  if (!navigator.onLine) {
    return false; // Can only archive when online
  }

  try {
    // Fetch through backend proxy or directly
    let html = '';
    try {
      const res = await fetch(`/api/cache-site?url=${encodeURIComponent(url)}`);
      if (res.ok) {
        html = await res.text();
      }
    } catch {
      // Direct fallback
    }

    if (!html) {
      try {
        const directRes = await fetch(url, { mode: 'cors' });
        if (directRes.ok) {
          html = await directRes.text();
        }
      } catch {
        // CORS blocked
      }
    }

    if (html) {
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
