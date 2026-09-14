var measurementId = 'G-DPP72KHXQ8';

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    __siteAnalyticsConfigured?: boolean;
  }
}

export function getPagePath(): string {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname || '/';
}

export function loadGoogleAnalytics(): void {
  if (typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer!.push(arguments);
  };

  if (!window.dataLayer.some(function (entry) {
    return entry && entry[0] === 'js';
  })) {
    window.gtag('js', new Date());
  }

  if (!document.querySelector('script[data-site-analytics="ga4"]')) {
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
    script.dataset.siteAnalytics = 'ga4';
    document.head.appendChild(script);
  }

  if (!window.__siteAnalyticsConfigured) {
    window.gtag('config', measurementId, {
      page_path: getPagePath(),
      send_page_view: true
    });
    window.__siteAnalyticsConfigured = true;
  }
}

export function sendEvent(name: string, parameters?: Record<string, any>): void {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', name, parameters || {});
  }
}

function getElementName(element: Element | null): string {
  if (!element) {
    return 'unknown';
  }
  return element.id || element.getAttribute('aria-label') || element.tagName.toLowerCase();
}

function getLinkTarget(link: HTMLAnchorElement): string {
  try {
    var url = new URL(link.href, window.location.href);
    return url.origin === window.location.origin ? url.pathname + url.hash : url.origin;
  } catch (error) {
    return 'invalid';
  }
}

var scrollMilestones: Record<number, boolean> = {};
var lastScrollEvent = 0;

function trackClick(event: MouseEvent): void {
  var target = (event.target as Element)?.closest(
    'a, button, input, select, textarea, [role="button"], [role="slider"], .slider, .resize-handle'
  );
  if (!target) {
    return;
  }

  var parameters: Record<string, any> = {
    page_path: getPagePath(),
    element_name: getElementName(target),
    element_type: target.tagName.toLowerCase()
  };

  if (target.matches('a[href]')) {
    var anchor = target as HTMLAnchorElement;
    parameters.link_target = getLinkTarget(anchor);
    parameters.link_text = (anchor.textContent || '').trim().slice(0, 80);
    sendEvent('link_click', parameters);
    return;
  }

  if (target.matches('.slider, input[type="range"], [role="slider"]')) {
    parameters.control = getElementName(target);
    sendEvent('slide_interaction', parameters);
    return;
  }

  sendEvent('ui_click', parameters);
}

function trackInput(event: Event): void {
  var target = event.target as Element;
  if (target && target.matches('input[type="range"], [role="slider"]')) {
    sendEvent('slide_change', {
      page_path: getPagePath(),
      element_name: getElementName(target)
    });
  }
}

function trackScroll(): void {
  var now = Date.now();
  if (now - lastScrollEvent < 250) {
    return;
  }
  lastScrollEvent = now;

  var documentHeight = document.documentElement.scrollHeight - window.innerHeight;
  if (documentHeight <= 0) {
    return;
  }

  var progress = Math.round((window.scrollY / documentHeight) * 100);
  [25, 50, 75, 90, 100].forEach(function (milestone) {
    if (progress >= milestone && !scrollMilestones[milestone]) {
      scrollMilestones[milestone] = true;
      sendEvent('scroll_depth', {
        page_path: getPagePath(),
        percent_scrolled: milestone
      });
    }
  });
}

export function trackVisibleSections(): void {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var target = entry.target as HTMLElement;
      if (entry.isIntersecting && !target.dataset.analyticsSeen) {
        target.dataset.analyticsSeen = 'true';
        sendEvent('section_view', {
          page_path: getPagePath(),
          section_name: target.id || target.className || target.tagName.toLowerCase()
        });
      }
    });
  }, { threshold: 0.35 });

  document.querySelectorAll('main section, section[id], [data-analytics-section]').forEach(function (section) {
    observer.observe(section);
  });
}

export function initAnalytics(): void {
  loadGoogleAnalytics();
  document.addEventListener('click', trackClick, true);
  document.addEventListener('input', trackInput, true);
  window.addEventListener('scroll', trackScroll, { passive: true });
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      trackVisibleSections();
    });
  } else {
    trackVisibleSections();
  }
}

/* Custom Application Telemetry */
export function trackSongSearch(songName: string, artistName: string, isExample: boolean = false): void {
  const searchTerm = artistName ? `${songName} - ${artistName}` : songName;
  sendEvent('search', {
    search_term: searchTerm,
    song_name: songName,
    artist_name: artistName || 'Unknown',
    is_example: isExample,
    page_path: getPagePath()
  });

  sendEvent('song_search', {
    search_term: searchTerm,
    song_name: songName,
    artist_name: artistName || 'Unknown',
    is_example: isExample,
    page_path: getPagePath()
  });
}

export function trackSongView(params: {
  songName: string;
  artistName: string;
  releaseYear?: string;
  totalWordCount?: number;
  hasPreview?: boolean;
}): void {
  const songTitle = params.artistName ? `${params.songName} - ${params.artistName}` : params.songName;
  sendEvent('view_item', {
    item_id: songTitle,
    item_name: params.songName,
    item_category: 'Song Lyrics Matrix',
    artist: params.artistName,
    release_year: params.releaseYear || 'Unknown',
    word_count: params.totalWordCount || 0,
    has_preview: !!params.hasPreview,
    page_path: getPagePath()
  });

  sendEvent('song_view', {
    song_name: params.songName,
    artist_name: params.artistName,
    release_year: params.releaseYear || 'Unknown',
    word_count: params.totalWordCount || 0,
    has_preview: !!params.hasPreview,
    page_path: getPagePath()
  });
}

export function trackSongSearchError(songName: string, artistName: string, errorMessage: string): void {
  sendEvent('song_search_error', {
    song_name: songName,
    artist_name: artistName,
    error_message: errorMessage,
    page_path: getPagePath()
  });
}

export function trackMusicPlayer(action: 'play' | 'pause' | 'ended', songName?: string, artistName?: string): void {
  sendEvent('music_player_interaction', {
    action,
    song_name: songName || 'Unknown',
    artist_name: artistName || 'Unknown',
    page_path: getPagePath()
  });
}

export function trackSnapshot(action: 'download' | 'share' | 'error', songName?: string, artistName?: string): void {
  sendEvent('snapshot_action', {
    action,
    song_name: songName || 'Unknown',
    artist_name: artistName || 'Unknown',
    page_path: getPagePath()
  });
}
