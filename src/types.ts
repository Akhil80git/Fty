export interface Platform {
  key: string;
  name: string;
  suffix: string;
  color: string;
  badgeBg: string;
  category: 'frontend' | 'fullstack' | 'cloud' | 'search' | 'custom';
  description: string;
  example: string;
}

export interface SiteHistoryItem {
  id: string;
  query: string;
  platform: string;
  url: string;
  title: string;
  timestamp: number;
}

export interface BookmarkItem {
  id: string;
  title: string;
  query: string;
  platform: string;
  url: string;
  addedAt: number;
}

export type ViewportMode = 'responsive' | 'desktop' | 'tablet' | 'mobile';
