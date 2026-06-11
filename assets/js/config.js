// Mara Akụkọ site config — THE launch lever.
//
// At launch: set the two store URLs below, bump the ?v= query params in
// index.html + both fallback pages, commit, push. Every store badge on
// every page (hero, final CTA, drawer, sticky banner, article/creator
// fallbacks) flips from "Coming soon" to a live link. Nothing else to do.
//
// posthogKey is the PUBLIC client key (same one shipped inside the app
// binary) — safe to expose. Analytics run cookieless (memory persistence).
window.MARA = {
  appStoreUrl: null, // e.g. 'https://apps.apple.com/app/id0000000000'
  playUrl: null,     // e.g. 'https://play.google.com/store/apps/details?id=com.panafrocore.panafrocore'
  posthogKey: 'phc_vPeheQ9SxejR5MGivQVSyAqcEUYgTa8rEtSbDFzjfUe2',
  posthogHost: 'https://eu.i.posthog.com'
};
