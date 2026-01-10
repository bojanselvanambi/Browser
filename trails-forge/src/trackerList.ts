/**
 * Curated list of known tracker and telemetry domains
 * These will be blocked via webRequest.onBeforeRequest
 */

export const TRACKER_DOMAINS = [
  // Google Analytics & Ads
  'google-analytics.com',
  'googletagmanager.com',
  'googleadservices.com',
  'googlesyndication.com',
  'doubleclick.net',
  'googletagservices.com',
  'google.com/pagead',
  'adservice.google.com',
  
  // Facebook
  'facebook.net',
  'connect.facebook.net',
  'pixel.facebook.com',
  'facebook.com/tr',
  
  // Twitter/X
  'analytics.twitter.com',
  't.co/i/adsct',
  'platform.twitter.com/widgets',
  
  // Microsoft
  'clarity.ms',
  'bat.bing.com',
  
  // Amazon
  'amazon-adsystem.com',
  'assoc-amazon.com',
  
  // Other common trackers
  'hotjar.com',
  'fullstory.com',
  'mixpanel.com',
  'segment.io',
  'segment.com',
  'amplitude.com',
  'heapanalytics.com',
  'crazyegg.com',
  'mouseflow.com',
  'clicktale.net',
  'luckyorange.com',
  'optimizely.com',
  'kissmetrics.com',
  'hubspot.com/track',
  'intercom.io',
  'drift.com',
  'crisp.chat',
  'tawk.to',
  'zendesk.com/embeddable',
  'onetrust.com',
  'cookiebot.com',
  'quantserve.com',
  'scorecardresearch.com',
  'comscore.com',
  'chartbeat.com',
  'parsely.com',
  'newrelic.com',
  'nr-data.net',
  'bugsnag.com',
  'sentry.io',
  'rollbar.com',
  'logrocket.com',
  'smartlook.com',
  'adroll.com',
  'criteo.com',
  'outbrain.com',
  'taboola.com',
  'sharethrough.com',
  'pubmatic.com',
  'rubiconproject.com',
  'openx.net',
  'bidswitch.net',
  'casalemedia.com',
  'advertising.com',
  'adnxs.com',
  'adsrvr.org',
  'demdex.net',
  'krxd.net',
  'bluekai.com',
  'exelator.com',
  'tapad.com',
  'liveramp.com',
  'rlcdn.com',
  'pippio.com',
  'mediamath.com',
  'mathtag.com',
  'turn.com',
  'agkn.com',
  'everesttech.net',
  'flashtalking.com',
  'serving-sys.com',
  'sizmek.com',
  'adform.net',
  'eyeota.net',
  'adsymptotic.com',
  'bidgear.com',
  'contextweb.com',
  'yieldmo.com',
  'yldbt.com',
  'plista.com',
  'revcontent.com',
  'mgid.com',
  'zergnet.com',
];

// Fingerprinting-related domains
export const FINGERPRINT_DOMAINS = [
  'fingerprintjs.com',
  'fpjs.io',
  'deviceidentitylabs.com',
  'threatmetrix.com',
  'iovation.com',
  'cdn.jsdelivr.net/npm/@aspect-analytics',
];

// Generate URL patterns for blocking
export function getBlockPatterns(): string[] {
  const patterns: string[] = [];
  
  for (const domain of TRACKER_DOMAINS) {
    patterns.push(`*://*.${domain}/*`);
    patterns.push(`*://${domain}/*`);
  }
  
  for (const domain of FINGERPRINT_DOMAINS) {
    patterns.push(`*://*.${domain}/*`);
    patterns.push(`*://${domain}/*`);
  }
  
  return patterns;
}

// Check if a URL should be blocked
export function shouldBlockUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    for (const domain of [...TRACKER_DOMAINS, ...FINGERPRINT_DOMAINS]) {
      if (hostname === domain || hostname.endsWith(`.${domain}`)) {
        return true;
      }
    }
    
    return false;
  } catch {
    return false;
  }
}
