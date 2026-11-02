import React, { useState, useMemo } from 'react';
import { Heart, Search, ExternalLink, Trash2, X, Globe, RotateCw, Zap, Download, CheckCircle2 } from 'lucide-react';

export interface LikedSite {
  id: string;
  url: string;
  host: string;
  query: string;
  platform: string;
  likedAt: number;
}

interface LikedSitesModalProps {
  likedSites: LikedSite[];
  offlineUrls: string[];
  onSelectSite: (site: LikedSite) => void;
  onRemoveSite: (id: string) => void;
  onClearAll: () => void;
  onDownloadOffline: (site: LikedSite) => Promise<void>;
  onCacheAllOffline: () => Promise<void>;
  isCachingAll: boolean;
  cachingProgress: { current: number; total: number } | null;
  onClose: () => void;
}

export const LikedSitesModal: React.FC<LikedSitesModalProps> = ({
  likedSites,
  offlineUrls,
  onSelectSite,
  onRemoveSite,
  onClearAll,
  onDownloadOffline,
  onCacheAllOffline,
  isCachingAll,
  cachingProgress,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cachingUrl, setCachingUrl] = useState<string | null>(null);

  const filteredSites = useMemo(() => {
    if (!searchTerm.trim()) return likedSites;
    const q = searchTerm.toLowerCase().trim();
    return likedSites.filter(
      (s) =>
        s.host.toLowerCase().includes(q) ||
        s.query.toLowerCase().includes(q) ||
        s.platform.toLowerCase().includes(q)
    );
  }, [likedSites, searchTerm]);

  const handleDownloadSingle = async (e: React.MouseEvent, site: LikedSite) => {
    e.stopPropagation();
    setCachingUrl(site.url);
    await onDownloadOffline(site);
    setCachingUrl(null);
  };

  const uncachedCount = likedSites.filter((s) => !offlineUrls.includes(s.url)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="w-full max-w-xl max-h-[85vh] rounded-2xl bg-[#171a21] border border-[#262b36] shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#262b36] flex-none">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
              <Heart className="w-4 h-4 fill-red-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-white text-sm sm:text-base leading-tight">
                  Liked Sites History
                </h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-emerald-400" />
                  Offline Support
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Kul {likedSites.length} sites ({offlineUrls.length} offline ready)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {likedSites.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Kya aap sach me saari liked sites delete karna chahte hain?')) {
                    onClearAll();
                  }
                }}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-red-500/10 transition"
                title="Saari list clear karein"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear All</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Batch Offline Download Bar if any site needs caching */}
        {likedSites.length > 0 && uncachedCount > 0 && (
          <div className="px-4 py-2 bg-emerald-950/40 border-b border-emerald-500/30 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-300">
              <Download className="w-3.5 h-3.5" />
              <span>
                {uncachedCount} sites abhi offline ke liye bachi hain
              </span>
            </div>
            <button
              onClick={onCacheAllOffline}
              disabled={isCachingAll}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-semibold rounded-lg transition flex items-center gap-1 text-[11px]"
            >
              {isCachingAll ? (
                <>
                  <RotateCw className="w-3 h-3 animate-spin" />
                  <span>
                    Saving {cachingProgress ? `${cachingProgress.current}/${cachingProgress.total}` : '...'}
                  </span>
                </>
              ) : (
                <>
                  <Zap className="w-3 h-3 fill-white" />
                  <span>Sabhi Ko Offline Save Karein</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Search filter for large lists (60-300+ sites) */}
        {likedSites.length > 3 && (
          <div className="p-3 border-b border-[#262b36]/60 bg-[#12151c]">
            <div className="flex items-center bg-[#0f1115] border border-[#262b36] focus-within:border-[#4f8cff] rounded-xl px-3 py-1.5 transition">
              <Search className="w-4 h-4 text-slate-500 mr-2 flex-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Liked sites search karein (e.g. vercel, portfolio)..."
                className="w-full bg-transparent text-xs sm:text-sm text-slate-200 focus:outline-none placeholder:text-slate-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-slate-500 hover:text-white text-xs px-1"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        {/* Sites List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredSites.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Heart className="w-10 h-10 mx-auto text-slate-700 mb-2 stroke-[1.5]" />
              {likedSites.length === 0 ? (
                <>
                  <p className="text-sm font-medium text-slate-400">Abhi koi site like nahi ki gayi hai</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Site kholkar bottom-left par bane ❤️ icon ko click karein. Ye offline bina data ke bhi khulegi!
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-400">&apos;{searchTerm}&apos; ke liye koi site nahi mili.</p>
              )}
            </div>
          ) : (
            filteredSites.map((site) => {
              const isOfflineReady = offlineUrls.includes(site.url);
              const isDownloading = cachingUrl === site.url;

              return (
                <div
                  key={site.id}
                  className="group flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-[#0f1115] hover:bg-[#1a1e27] border border-[#262b36] hover:border-blue-500/30 transition-all shadow-sm"
                >
                  {/* Clickable site entry */}
                  <div
                    onClick={() => onSelectSite(site)}
                    className="flex-1 min-w-0 cursor-pointer pr-3"
                    title="Click karke is site ko reload karein (Deta band me bhi khulegi)"
                  >
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Globe className="w-3.5 h-3.5 text-blue-400 flex-none" />
                      <span className="font-semibold text-xs sm:text-sm text-white group-hover:text-blue-400 transition truncate">
                        {site.host}
                      </span>
                      <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 flex-none">
                        {site.platform}
                      </span>

                      {/* Offline Ready Badge */}
                      {isOfflineReady ? (
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5 flex-none">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                          Offline Ready
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 flex-none">
                          Save Pending
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono truncate">
                      <span className="truncate">{site.url}</span>
                      <span className="text-slate-600 flex-none">•</span>
                      <span className="text-slate-500 text-[10px] flex-none">
                        {new Date(site.likedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-none">
                    {/* Offline cache button if not cached yet */}
                    {!isOfflineReady && (
                      <button
                        onClick={(e) => handleDownloadSingle(e, site)}
                        disabled={isDownloading}
                        className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20 transition"
                        title="Deta band ke liye offline save karein"
                      >
                        <Download className={`w-3.5 h-3.5 ${isDownloading ? 'animate-bounce' : ''}`} />
                      </button>
                    )}

                    <button
                      onClick={() => onSelectSite(site)}
                      className="p-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white transition"
                      title="Reload site in app"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => window.open(site.url, '_blank', 'noopener,noreferrer')}
                      className="p-1.5 rounded-lg bg-[#171a21] hover:bg-[#262b36] text-slate-400 hover:text-white transition"
                      title="Naye tab me kholo ↗"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onRemoveSite(site.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition"
                      title="Unlike / Delete karein"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        {likedSites.length > 0 && (
          <div className="px-4 py-2 border-t border-[#262b36] bg-[#12151c] text-[11px] text-slate-400 flex items-center justify-between">
            <span>Deta band hone par bhi Offline Ready sites bina internet ke khulengi</span>
            <span className="font-mono text-slate-500">{filteredSites.length} items</span>
          </div>
        )}
      </div>
    </div>
  );
};
