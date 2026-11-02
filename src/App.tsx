import React, { useState, useEffect, useRef } from 'react';
import { Heart, WifiOff, Zap } from 'lucide-react';
import { PLATFORMS, toUrl } from './platforms';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { LikedSitesModal, LikedSite } from './components/LikedSitesModal';
import {
  getSiteSnapshot,
  downloadSiteForOffline,
  deleteSiteSnapshot,
  getAllOfflineUrls,
  cacheAllLikedSites,
} from './utils/offlineStorage';

export default function App() {
  const [siteQuery, setSiteQuery] = useState<string>('');
  const [platform, setPlatform] = useState<string>('vercel');
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [progressWidth, setProgressWidth] = useState<number>(0);
  const [showLikedModal, setShowLikedModal] = useState<boolean>(false);
  const [justLiked, setJustLiked] = useState<boolean>(false);

  // Offline support states
  const [isOfflineSnapshotLoaded, setIsOfflineSnapshotLoaded] = useState<boolean>(false);
  const [offlineHtml, setOfflineHtml] = useState<string>('');
  const [offlineUrls, setOfflineUrls] = useState<string[]>([]);
  const [hasFailedOnline, setHasFailedOnline] = useState<boolean>(false);
  const [isCachingAll, setIsCachingAll] = useState<boolean>(false);
  const [cachingProgress, setCachingProgress] = useState<{ current: number; total: number } | null>(null);

  // Liked sites saved and synced in localStorage
  const [likedSites, setLikedSites] = useState<LikedSite[]>(() => {
    try {
      const saved = localStorage.getItem('site_opener_liked_sites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);

  // Load offline urls cache on mount and start background auto-caching of all liked sites
  useEffect(() => {
    getAllOfflineUrls().then((urls) => {
      setOfflineUrls(urls);
      // Auto cache any liked sites that are not yet cached
      if (typeof navigator !== 'undefined' && navigator.onLine && likedSites.length > 0) {
        cacheAllLikedSites(likedSites).then(() => {
          getAllOfflineUrls().then(setOfflineUrls).catch(() => {});
        }).catch(() => {});
      }
    }).catch(() => {});
  }, [likedSites]);

  // Sync liked sites to localStorage whenever changed
  useEffect(() => {
    try {
      localStorage.setItem('site_opener_liked_sites', JSON.stringify(likedSites));
    } catch {
      // ignore
    }
  }, [likedSites]);

  // Load initial state from URL or localStorage
  useEffect(() => {
    try {
      const savedPlat = localStorage.getItem('site_opener_platform');
      const params = new URLSearchParams(window.location.search);
      const urlPlat = params.get('p');
      const urlSite = params.get('site');

      const initialPlat = urlPlat || savedPlat || 'vercel';
      if (PLATFORMS.some((p) => p.key === initialPlat)) {
        setPlatform(initialPlat);
      }

      if (urlSite) {
        setSiteQuery(urlSite);
        openSite(urlSite, initialPlat);
      }
    } catch {
      // ignore
    }
  }, []);

  // Listen to network status change
  useEffect(() => {
    const handleOnlineStatus = () => {
      getAllOfflineUrls().then(setOfflineUrls).catch(() => {});
      if (navigator.onLine && likedSites.length > 0) {
        cacheAllLikedSites(likedSites).then(() => {
          getAllOfflineUrls().then(setOfflineUrls).catch(() => {});
        }).catch(() => {});
      }
    };
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, [likedSites]);

  const openSite = async (raw: string, platKey: string = platform, forceOffline = false) => {
    const url = toUrl(raw, platKey);
    if (!url) {
      inputRef.current?.focus();
      return;
    }

    setCurrentUrl(url);
    setProgressWidth(70);
    setHasFailedOnline(false);

    const host = url.replace('https://', '');
    document.title = host;

    try {
      window.history.replaceState(null, '', `?site=${encodeURIComponent(raw.trim())}&p=${encodeURIComponent(platKey)}`);
      localStorage.setItem('site_opener_platform', platKey);
    } catch {
      // ignore
    }

    inputRef.current?.blur();

    // Check if offline snapshot exists for this site
    const snapshot = await getSiteSnapshot(url);

    // If device is offline (data is OFF) or forceOffline is requested:
    if (!navigator.onLine || forceOffline) {
      if (snapshot && snapshot.html) {
        setOfflineHtml(snapshot.html);
        setIsOfflineSnapshotLoaded(true);
        setProgressWidth(100);
        setTimeout(() => setProgressWidth(0), 300);
        return;
      } else {
        // Site not yet cached
        setIsOfflineSnapshotLoaded(false);
        setHasFailedOnline(true);
        setProgressWidth(100);
        setTimeout(() => setProgressWidth(0), 300);
        return;
      }
    }

    // When online: normal load
    setIsOfflineSnapshotLoaded(false);
    setOfflineHtml('');

    // If online, silently update offline snapshot so it is ready for when data is off
    downloadSiteForOffline(url, host, platKey).then((saved) => {
      if (saved) {
        getAllOfflineUrls().then(setOfflineUrls).catch(() => {});
      }
    }).catch(() => {});
  };

  const handleFrameLoad = () => {
    setProgressWidth(100);
    setTimeout(() => {
      setProgressWidth(0);
    }, 300);
  };

  const handleFrameError = async () => {
    // If live load fails or internet disconnected, attempt offline fallback from IndexedDB
    if (currentUrl) {
      const snapshot = await getSiteSnapshot(currentUrl);
      if (snapshot && snapshot.html) {
        setOfflineHtml(snapshot.html);
        setIsOfflineSnapshotLoaded(true);
      } else {
        setHasFailedOnline(true);
      }
    }
  };

  const handlePlatformChange = (newPlat: string) => {
    setPlatform(newPlat);
    try {
      localStorage.setItem('site_opener_platform', newPlat);
    } catch {
      // ignore
    }

    if (siteQuery.trim()) {
      openSite(siteQuery, newPlat);
    } else {
      inputRef.current?.focus();
    }
  };

  const handleOpenExternal = () => {
    const url = currentUrl || toUrl(siteQuery, platform);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Check if currently open site is liked
  const isCurrentLiked = currentUrl ? likedSites.some((s) => s.url === currentUrl) : false;

  const toggleLikeCurrentSite = async () => {
    if (!currentUrl) {
      if (siteQuery.trim()) {
        openSite(siteQuery, platform);
      } else {
        setShowLikedModal(true);
      }
      return;
    }
    const host = currentUrl.replace('https://', '');

    if (isCurrentLiked) {
      setLikedSites((prev) => prev.filter((s) => s.url !== currentUrl));
      deleteSiteSnapshot(currentUrl).catch(() => {});
      setOfflineUrls((prev) => prev.filter((u) => u !== currentUrl));
      setJustLiked(false);
    } else {
      const newLiked: LikedSite = {
        id: `like-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        url: currentUrl,
        host: host,
        query: siteQuery || host,
        platform: platform,
        likedAt: Date.now(),
      };
      setLikedSites((prev) => [newLiked, ...prev]);
      setJustLiked(true);
      setTimeout(() => setJustLiked(false), 700);

      // Automatically download and save for offline use!
      if (navigator.onLine) {
        const saved = await downloadSiteForOffline(currentUrl, host, platform);
        if (saved) {
          setOfflineUrls((prev) => [...prev, currentUrl]);
        }
      }
    }
  };

  const handleSelectLikedSite = async (site: LikedSite) => {
    setSiteQuery(site.query);
    setPlatform(site.platform);
    // If offline, force offline snapshot load immediately
    const forceOffline = !navigator.onLine;
    await openSite(site.query, site.platform, forceOffline);
    setShowLikedModal(false);
  };

  const handleRemoveLikedSite = async (id: string) => {
    const target = likedSites.find((s) => s.id === id);
    if (target) {
      await deleteSiteSnapshot(target.url);
      setOfflineUrls((prev) => prev.filter((u) => u !== target.url));
    }
    setLikedSites((prev) => prev.filter((s) => s.id !== id));
  };

  const handleClearAllLiked = async () => {
    for (const site of likedSites) {
      await deleteSiteSnapshot(site.url);
    }
    setLikedSites([]);
    setOfflineUrls([]);
  };

  const handleDownloadOfflineSite = async (site: LikedSite) => {
    const saved = await downloadSiteForOffline(site.url, site.host, site.platform);
    if (saved) {
      setOfflineUrls((prev) => [...prev, site.url]);
    }
  };

  const handleCacheAllOffline = async () => {
    if (isCachingAll || !navigator.onLine) return;
    setIsCachingAll(true);
    setCachingProgress({ current: 0, total: likedSites.length });

    await cacheAllLikedSites(likedSites, (current, total) => {
      setCachingProgress({ current, total });
    });

    const updated = await getAllOfflineUrls();
    setOfflineUrls(updated);
    setIsCachingAll(false);
    setCachingProgress(null);
  };

  const currentPlatformObj = PLATFORMS.find((p) => p.key === platform) || PLATFORMS[0];
  const suffix = currentPlatformObj.suffix;
  const placeholder = suffix ? `site ka naam, jaise gitscan` : `poora domain, jaise mysite.com`;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0f1115] text-[#e8eaf0] overflow-hidden select-none font-sans">
      {/* Topnav with Searchbar, Integrated Dropdown, Like History, and External Button */}
      <header className="flex-none h-14 bg-[#171a21] border-b border-[#262b36] z-20 flex items-center gap-2 px-2.5 sm:px-3">
        {/* Search Field with Prefix, Input, and Integrated Dropdown */}
        <div className="flex-1 min-w-0 flex items-center h-10 bg-[#0f1115] border border-[#262b36] focus-within:border-[#4f8cff] rounded-xl pl-3 pr-1 transition-all">
          <span className="text-[#8b93a7] text-sm hidden sm:inline select-none whitespace-nowrap mr-0.5">
            https://
          </span>

          <input
            ref={inputRef}
            type="text"
            value={siteQuery}
            onChange={(e) => setSiteQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                openSite(siteQuery, platform);
              }
            }}
            placeholder={placeholder}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck="false"
            enterKeyHint="go"
            className="flex-1 min-w-0 bg-transparent text-[#e8eaf0] text-sm focus:outline-none placeholder:text-[#555d6f] px-1"
          />

          {/* Integrated Platform Dropdown Button inside Search Bar */}
          <select
            aria-label="Platform"
            value={platform}
            onChange={(e) => handlePlatformChange(e.target.value)}
            className="bg-[#171a21] hover:bg-[#202530] text-[#4f8cff] font-semibold text-xs sm:text-sm rounded-lg h-[30px] px-2 outline-none border-0 cursor-pointer max-w-[130px] sm:max-w-[180px] truncate transition ml-1"
          >
            {PLATFORMS.map((p) => (
              <option key={p.key} value={p.key} className="bg-[#171a21] text-[#e8eaf0]">
                {p.suffix ? p.suffix : p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Top Nav Like History Button with Offline status indicator */}
        <button
          onClick={() => setShowLikedModal(true)}
          className={`h-10 px-2.5 flex items-center justify-center gap-1.5 rounded-xl border transition active:scale-95 flex-none ${
            likedSites.length > 0
              ? 'bg-[#0f1115] hover:bg-[#262b36] text-red-400 border-[#262b36]'
              : 'bg-[#0f1115] hover:bg-[#262b36] text-slate-400 border-[#262b36]'
          }`}
          title="Liked Sites History (Offline Storage) dekhein"
        >
          <Heart className={`w-4 h-4 ${likedSites.length > 0 ? 'fill-red-500 text-red-500' : ''}`} />
          {likedSites.length > 0 && (
            <span className="text-xs font-bold text-white font-mono bg-red-500/20 px-1.5 py-0.5 rounded-md border border-red-500/30 flex items-center gap-1">
              <span>{likedSites.length}</span>
              {offlineUrls.length > 0 && (
                <Zap className="w-2.5 h-2.5 fill-emerald-400 text-emerald-400 inline" />
              )}
            </span>
          )}
        </button>

        {/* Open in New Tab Button */}
        <button
          onClick={handleOpenExternal}
          className="h-10 w-10 flex items-center justify-center rounded-xl bg-[#0f1115] hover:bg-[#262b36] active:scale-95 text-[#e8eaf0] border border-[#262b36] transition font-bold text-base flex-none"
          title="Naye tab me kholo (↗)"
        >
          ↗
        </button>

        {/* PWA Download / Install Button */}
        <PWAInstallButton compact={true} />
      </header>

      {/* Main Stage */}
      <main className="flex-1 relative w-full h-[calc(100vh-56px)] bg-[#0f1115] overflow-hidden">
        {/* Animated Progress Bar */}
        <div
          className="absolute top-0 left-0 h-[2px] bg-[#4f8cff] transition-all duration-300 z-30"
          style={{ width: `${progressWidth}%` }}
        />

        {/* Offline indicator banner when rendering cached snapshot */}
        {isOfflineSnapshotLoaded && (
          <div className="absolute top-0 left-0 right-0 z-30 bg-emerald-950/95 border-b border-emerald-500/50 text-emerald-300 text-xs py-1.5 px-3 flex items-center justify-between backdrop-blur-md shadow-md">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 fill-emerald-400 text-emerald-400" />
              <span className="font-medium">
                <strong>Offline Mode Active:</strong> Deta band hai, saved copy chal rahi hai.
              </span>
            </div>
            {navigator.onLine && (
              <button
                onClick={() => openSite(siteQuery, platform, false)}
                className="text-[11px] bg-emerald-500/20 hover:bg-emerald-500/30 px-2.5 py-0.5 rounded text-emerald-200 border border-emerald-500/30 font-semibold transition"
              >
                Live Switch Karein
              </button>
            )}
          </div>
        )}

        {/* Fullscreen Iframe: loads live url or offline srcdoc seamlessly */}
        {currentUrl ? (
          isOfflineSnapshotLoaded && offlineHtml ? (
            <iframe
              ref={frameRef}
              srcDoc={offlineHtml}
              title="site-offline"
              onLoad={handleFrameLoad}
              allow="clipboard-write; fullscreen"
              className="w-full h-full border-0 bg-white block"
            />
          ) : (
            <iframe
              ref={frameRef}
              src={currentUrl}
              title="site"
              onLoad={handleFrameLoad}
              onError={handleFrameError}
              allow="clipboard-write; fullscreen"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full border-0 bg-white block"
            />
          )
        ) : (
          /* Pure Clean Empty Stage: No extra text or clutter */
          <div className="w-full h-full bg-[#0f1115]" />
        )}

        {/* Offline fallback prompt if live site failed and snapshot exists or doesn't */}
        {hasFailedOnline && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0f1115]/95 p-4 text-center">
            <WifiOff className="w-12 h-12 text-amber-400 mb-3 animate-pulse" />
            <h3 className="text-base font-bold text-white mb-1">Deta Band Hai</h3>
            <p className="text-xs text-slate-400 max-w-sm mb-4">
              Internet connection nahi hai.
            </p>
            {offlineUrls.includes(currentUrl) ? (
              <button
                onClick={async () => {
                  const snap = await getSiteSnapshot(currentUrl);
                  if (snap?.html) {
                    setOfflineHtml(snap.html);
                    setIsOfflineSnapshotLoaded(true);
                    setHasFailedOnline(false);
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg transition active:scale-95"
              >
                <Zap className="w-4 h-4 fill-white" />
                Offline Saved Copy Kholein
              </button>
            ) : (
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl max-w-sm text-xs text-slate-300">
                Is site ka offline snapshot save nahi hua tha. Jab internet on ho, tab ek baar Like (❤️) karein taaki ye hamesha ke liye offline save ho jaye.
              </div>
            )}
          </div>
        )}

        {/* Liked Sites Modal */}
        {showLikedModal && (
          <LikedSitesModal
            likedSites={likedSites}
            offlineUrls={offlineUrls}
            onSelectSite={handleSelectLikedSite}
            onRemoveSite={handleRemoveLikedSite}
            onClearAll={handleClearAllLiked}
            onDownloadOffline={handleDownloadOfflineSite}
            onCacheAllOffline={handleCacheAllOffline}
            isCachingAll={isCachingAll}
            cachingProgress={cachingProgress}
            onClose={() => setShowLikedModal(false)}
          />
        )}

        {/* Offline notification if network disconnects */}
        <OfflineIndicator />
      </main>

      {/* Bottom Left Pure Floating Like Icon (Zero background, only icon) */}
      <button
        onClick={toggleLikeCurrentSite}
        className="fixed bottom-5 left-5 z-[999] p-2 bg-transparent border-0 outline-none cursor-pointer transition-all duration-300 active:scale-75 flex items-center justify-center"
        title={
          currentUrl
            ? isCurrentLiked
              ? 'Liked! (Click karke unlike karein)'
              : 'Is site ko Like karein'
            : 'Liked Sites List dekhein'
        }
        aria-label="Like button"
      >
        <Heart
          className={`w-7 h-7 transition-all duration-300 ${
            isCurrentLiked
              ? 'fill-[#ff2d55] text-[#ff2d55] scale-115 drop-shadow-[0_2px_14px_rgba(255,45,85,0.95)]'
              : 'fill-transparent text-white/90 hover:text-[#ff2d55] stroke-[2.2] drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] hover:scale-110'
          } ${justLiked ? 'scale-130' : ''}`}
        />
      </button>
    </div>
  );
}
