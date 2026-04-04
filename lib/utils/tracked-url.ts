export function getTrackedQrUrl(link: string, refValue = 'blurb') {
  try {
    const url = new URL(link);
    url.searchParams.set('ref', refValue);
    return url.toString();
  } catch {
    return link;
  }
}
