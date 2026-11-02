/* Simulated RSL e-services link (demo only).
   RSL does not give outside teams access to its live systems, so Rasiti shows how the link WOULD work:
   1. TIN check: is this ID number already on RSL's taxpayer register?
   2. Return sent to RSL: RSL e-services answers with an acknowledgement number.
   3. Payment: RSL e-services answers with an official receipt number.
   Nothing here talks to RSL. In a pilot these three calls are replaced by RSL's real e-services API.
   Demo rule: ID numbers ending in 00 are treated as "already on RSL's register". */
(function (w) {
  const AL = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; }
  function code(s, n) { let h = hash(s), out = ''; for (let i = 0; i < (n || 6); i++) { out += AL[h % AL.length]; h = Math.floor(h / AL.length) || hash(out + s); } return out; }
  const tinFrom = s => { const h = hash('tin' + s); return '200-' + (100 + h % 900) + '-' + (100 + Math.floor(h / 900) % 900); };
  w.RASITI_RSL = {
    simulated: true,
    // 1. TIN check against the (simulated) RSL taxpayer register.
    lookup(idNo) { const d = String(idNo || '').replace(/\D/g, ''); return d.length >= 6 && d.endsWith('00') ? { found: true, tin: tinFrom(d) } : { found: false }; },
    // A new TIN issued by RSL e-services after the check finds none.
    newTin(idNo) { return tinFrom('new' + String(idNo || '').replace(/\D/g, '')); },
    // 2. Acknowledgement for a return sent to RSL. Same id always gives the same number.
    ack(id) { return 'RSL-ACK-' + code('ack' + id); },
    // 3. Official RSL receipt for a tax payment.
    receipt(id) { return 'RSL-RCP-' + code('rcp' + id); },
    note: 'Simulated link: no connection to live RSL systems.'
  };
})(typeof window !== 'undefined' ? window : globalThis);
