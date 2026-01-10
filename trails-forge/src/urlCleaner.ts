export const TRACKING_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'gclsrc',
  'dclid',
  'msclkid',
  'mc_eid',
  'ref',
  'yclid',
  '_hsenc',
  '_hsmi',
  'hmb_campaign',
  'hmb_medium',
  'hmb_source',
  'ns_source',
  'ns_mchannel',
  'ns_campaign',
  'ns_linkname',
  'ns_fee',
  'sr_share'
];

export function cleanUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    let changed = false;

    TRACKING_PARAMS.forEach(param => {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.delete(param);
        changed = true;
      }
    });

    if (changed) {
      return urlObj.toString();
    }
  } catch (e) {
    // Invalid URL, ignore
  }
  return url;
}
