/* Rasiti places: the markets of the pilot and their approximate map positions (Maseru). One file for the browser
   (maps, the seller phone) and the server (USSD "My shop moved"), so a moved shop lands at the same spot everywhere. */
(function (w) {
  const AREAS = {
    'Sefika taxi rank': [-29.3176, 27.4846], 'Maseru Main Market': [-29.3121, 27.4752], 'Pitso Ground': [-29.3149, 27.4893],
    'Kingsway': [-29.3157, 27.4805], 'Ha Hoohlo': [-29.3053, 27.5052], 'Maseru Mall parking': [-29.3398, 27.5126], 'Ha Thetsane': [-29.3534, 27.5232]
  };
  const CENTER = [-29.325, 27.497];
  const hashStr = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  // A stable spot near the market's centre for each seller or shop key.
  function latLng(key, area) { const c = AREAS[area] || CENTER; const h = hashStr(key);
    return [c[0] + (((h & 1023) / 1023) - .5) * .0026, c[1] + ((((h >> 10) & 1023) / 1023) - .5) * .0026]; }
  // The known market a typed place belongs to ("Sefika rank" -> "Sefika taxi rank"), or null.
  function areaOf(text) { const t = String(text || '').toLowerCase(); if (!t) return null;
    for (const a in AREAS) if (t === a.toLowerCase()) return a;
    for (const a in AREAS) if (t.includes(a.split(' ')[a.startsWith('Ha ') || a.startsWith('Maseru ') ? 1 : 0].toLowerCase())) return a;
    return null; }
  w.RASITI_PLACES = { AREAS, CENTER, latLng, areaOf, hashStr, LIST: Object.keys(AREAS) };
})(typeof window !== 'undefined' ? window : globalThis);
