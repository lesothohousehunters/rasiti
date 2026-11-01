/* Rasiti front end. Works online (API + Neon) or offline (local mock data only). */
(() => {
"use strict";

/* ================= helpers ================= */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const M = n => 'M' + Math.round(n).toLocaleString('en-US');
const DAY = 86400000, MIN = 60000;
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const pad = n => String(n).padStart(2, '0');
const fT = t => { const d = new Date(t); return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const fD = t => { const d = new Date(t); return d.getDate() + ' ' + MON[d.getMonth()]; };
const hm = t => { const d = new Date(t); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const mask = p => p ? ('+266 ' + p.slice(3, 4) + '••• •' + p.slice(-3)) : 'no phone';
const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const hashStr = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

const BH_LOGO = 'img/bohlale-96.png';
const TILL_SVG = `<svg class="till" viewBox="0 0 200 222" xmlns="http://www.w3.org/2000/svg"><g class="ld-rc"><path d="M72 0H128V58l-4 4-4-4-4 4-4-4-4 4-4-4-4 4-4-4-4 4-4-4-4 4-4-4-4 4-4-4z" fill="#fffdf8" stroke="#c9c3b5" stroke-width="1.2"/><rect x="82" y="8" width="36" height="5" rx="1.5" fill="#e8793a"/><rect x="80" y="19" width="40" height="2.5" rx="1" fill="#b9b4a8"/><rect x="80" y="25" width="28" height="2.5" rx="1" fill="#b9b4a8"/><rect x="80" y="31" width="34" height="2.5" rx="1" fill="#b9b4a8"/><path d="M82 40v10M85 40v10M87 40v10M91 40v10M93 40v10M96 40v10M100 40v10M102 40v10M106 40v10M109 40v10M111 40v10M115 40v10M118 40v10" stroke="#23262d" stroke-width="1.3"/></g><g class="ld-note"><rect x="58" y="108" width="84" height="44" rx="3" fill="#2f8f5b" stroke="#1f6b42"/><rect x="61.5" y="111.5" width="77" height="37" rx="2" fill="none" stroke="#a8dcbc" stroke-width="1"/><path d="M66 140q10-8 20 0t20 0 20 0" fill="none" stroke="#5fbf8a" stroke-width="1.2"/><circle cx="100" cy="128" r="11" fill="#e8793a"/><text x="100" y="132.5" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#fff" text-anchor="middle">M</text><text x="66" y="120" font-family="Arial, sans-serif" font-size="7.5" font-weight="700" fill="#e7f6ec">100</text><text x="134" y="146" font-family="Arial, sans-serif" font-size="7.5" font-weight="700" fill="#e7f6ec" text-anchor="end">100</text></g><rect x="34" y="60" width="132" height="96" rx="14" fill="#1a1b2e" stroke="#3a3d57" stroke-width="1.5"/><rect x="58" y="54" width="84" height="10" rx="5" fill="#2c2e45"/><rect x="64" y="58" width="72" height="2.5" rx="1.2" fill="#0b0c15"/><rect x="48" y="74" width="104" height="30" rx="6" fill="#0e2a1d"/><text class="ld-scr" x="100" y="95" font-family="ui-monospace, Menlo, monospace" font-size="15" font-weight="700" fill="#5cc994" text-anchor="middle">M 100.00</text><circle class="ld-led" cx="148" cy="66.5" r="2.6" fill="#3a3d57"/><g fill="#3a3d57"><rect x="50" y="114" width="20" height="9" rx="3"/><rect x="76" y="114" width="20" height="9" rx="3"/><rect x="102" y="114" width="20" height="9" rx="3"/><rect x="50" y="128" width="20" height="9" rx="3"/><rect x="76" y="128" width="20" height="9" rx="3"/><rect x="102" y="128" width="20" height="9" rx="3"/></g><rect x="128" y="114" width="22" height="23" rx="4" fill="#e8793a"/><rect x="54" y="150" width="92" height="10" rx="5" fill="#2c2e45"/><rect x="60" y="153.5" width="80" height="2.5" rx="1.2" fill="#0b0c15"/></svg>`;
let NOW = Date.now();
let clock = NOW;
const tick = () => (clock = Math.max(Date.now(), clock + 1000));
const monthStart = () => { const d = new Date(clock); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); };
const drawDay = () => { const d = new Date(clock); return new Date(d.getFullYear(), d.getMonth() + 1, 0); };
const dueDate = () => { const d = new Date(clock); return '20 ' + MON[(d.getMonth() + 1) % 12]; };
const lastMonthName = () => { const d = new Date(clock); d.setDate(1); d.setMonth(d.getMonth() - 1); return ['January','February','March','April','May','June','July','August','September','October','November','December'][d.getMonth()]; };

/* ================= places (approximate, Maseru) ================= */
const AREAS = {
  'Sefika taxi rank': [-29.3176, 27.4846], 'Maseru Main Market': [-29.3121, 27.4752], 'Pitso Ground': [-29.3149, 27.4893],
  'Kingsway': [-29.3157, 27.4805], 'Ha Hoohlo': [-29.3053, 27.5052], 'Maseru Mall parking': [-29.3398, 27.5126], 'Ha Thetsane': [-29.3534, 27.5232]
};
const CENTER = [-29.325, 27.497];
function placeLatLng(key, area) {
  const c = AREAS[area] || CENTER; const h = hashStr(key);
  return [c[0] + (((h & 1023) / 1023) - .5) * .0026, c[1] + ((((h >> 10) & 1023) / 1023) - .5) * .0026];
}

/* ================= receipt codes ================= */
const AL = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function chk(body){let s=0;for(let i=0;i<body.length;i++)s+=(i+1)*body.charCodeAt(i)*(i%2?3:7);return AL[s%31]}
const used = new Set();
function mkCode(no, rnd){let c;do{let r='';for(let i=0;i<4;i++)r+=AL[Math.floor(rnd()*31)];c=`RS-${no}-${r}-${chk(no+r)}`}while(used.has(c));used.add(c);return c}
function parseCode(raw){const c=String(raw).toUpperCase().replace(/[^A-Z0-9]/g,'');const m=c.match(/^RS(\d{4})([A-Z0-9]{4})([A-Z0-9])$/);
  if(!m)return{ok:false,why:'format'};const code=`RS-${m[1]}-${m[2]}-${m[3]}`;
  if(chk(m[1]+m[2])!==m[3])return{ok:false,why:'forged',code};return{ok:true,code,no:m[1]}}

/* ================= state ================= */
const S = { customers:{'26658123301':{name:'Lerato'}, '26662345118':{name:'Tumelo'}}, traders:[], receipts:[], claims:[], reports:[], fakes:[], feed:[], reviews:{}, invited:new Set(), visits:new Set(), done:new Set(), draws:[], lastReceipt:null, filter:'all', eval:{} };
const tByNo = no => S.traders.find(t => t.no === no);
const PERSONAS = [{ph:'26658123301',name:'Lerato'},{ph:'26662345118',name:'Tumelo'},{ph:'26657000999',name:'New customer'}];
const API = { online:false, user:null, dbEmpty:false, setupNeeded:false };
const randPhone = r => '266' + (r() < .5 ? '5' : '6') + String(Math.floor(r() * 1e7)).padStart(7, '0');
const traderLL = t => (t.lat != null ? [t.lat, t.lng] : placeLatLng('T' + t.no, t.market));

/* ================= mock seed ================= */
function seed() {
  NOW = Date.now(); clock = NOW;
  const rnd = mulberry32(2026);
  S.traders = [
    {no:'3307',name:'Ntate Thabo L.',trade:'Snacks & cold drinks',market:'Sefika taxi rank',status:'registered',tin:'200-338-114',joined:120,via:true,avg:18,perDay:9,decl:0.97,ph:'26658440017'},
    {no:'4821',name:'Mme Palesa M.',trade:'Fruit & vegetables',market:'Maseru Main Market',status:'enrolled',joined:42,avg:34,perDay:7,ph:'26663120554'},
    {no:'5140',name:"Mme 'Mathabo S.",trade:'Makoenya & cooked food',market:'Pitso Ground',status:'registered',tin:'200-412-907',joined:200,avg:22,perDay:10,decl:0,ph:'26658907731'},
    {no:'2264',name:'Ntate Lebohang M.',trade:'Shoe repair',market:'Ha Hoohlo',status:'registered',tin:'200-127-550',joined:300,avg:40,perDay:.04,decl:0,ph:'26657712208'},
    {no:'6018',name:'Mme Lineo N.',trade:'Hair salon',market:'Maseru Mall parking',status:'registered',tin:'200-560-221',joined:90,avg:90,perDay:.6,decl:1.1,ph:'26662981145'},
    {no:'7735',name:'Ntate Teboho R.',trade:'Phone repairs',market:'Kingsway',status:'enrolled',joined:14,avg:120,perDay:1.3,ph:'26659230876'},
    {no:'3902',name:'Mme Nthabiseng K.',trade:'Second-hand clothes',market:'Maseru Main Market',status:'registered',tin:'200-301-845',joined:150,via:true,avg:80,perDay:3,decl:0.9,ph:'26663557019'}
  ];
  S.traders.forEach(t => { const ll = placeLatLng('T' + t.no, t.market); t.lat = ll[0]; t.lng = ll[1]; });
  S.receipts = []; S.reports = []; S.fakes = []; S.claims = [];
  const global = []; for (let i = 0; i < 160; i++) global.push(randPhone(rnd));
  for (const tr of S.traders) {
    const pool = []; for (let i = 0; i < 30; i++) pool.push(global[Math.floor(rnd() * 160)]);
    if (tr.no === '3307' || tr.no === '4821') pool.push(PERSONAS[0].ph, PERSONAS[1].ph, PERSONAS[0].ph);
    const days = Math.min(59, tr.joined);
    for (let d = days; d >= 0; d--) {
      let n = tr.perDay < 1 ? (rnd() < tr.perDay ? 1 : 0) : Math.round(tr.perDay * (0.55 + 0.9 * rnd()));
      if (d === 0) n = Math.round(n * 0.35);
      for (let i = 0; i < n; i++) {
        const t = d === 0 ? NOW - Math.floor(rnd() * 4 * 3600000) - MIN : NOW - d * DAY - Math.floor(rnd() * 11 * 3600000);
        const amt = Math.max(2, Math.round(tr.avg * (0.4 + 1.2 * rnd())));
        const ch = rnd() < .55 ? 'momo' : 'cash';
        let ph = rnd() < .85 ? pool[Math.floor(rnd() * pool.length)] : global[Math.floor(rnd() * 160)];
        if (ch === 'cash' && rnd() < .12) ph = null;
        S.receipts.push({code:mkCode(tr.no, rnd), no:tr.no, amt, ch, ph, t});
      }
    }
  }
  const PV = '26657311420';
  for (let i = 0; i < 6; i++) S.receipts.push({code:mkCode('3307', rnd), no:'3307', amt:8, ch:'momo', ph:PV, t:NOW - 2 * DAY + i * 2 * MIN});
  for (const p of ['26662100481','26662100937','26658800362']) for (let i = 0; i < 10; i++) S.receipts.push({code:mkCode('6018', rnd), no:'6018', amt:100 + Math.round(rnd() * 100), ch:'momo', ph:p, t:NOW - Math.floor(rnd() * 27 * DAY) - 3600000});
  S.receipts.push({code:mkCode('7735', rnd), no:'7735', amt:150, ch:'momo', ph:'26659230876', t:NOW - 3 * DAY});
  S.receipts.push({code:mkCode('7735', rnd), no:'7735', amt:200, ch:'momo', ph:'26659230876', t:NOW - 6 * DAY});
  S.receipts.push({code:mkCode('3902', rnd), no:'3902', amt:2400, ch:'cash', ph:global[7], t:NOW - 5 * DAY, note:'Possible bulk bale purchase'});
  S.receipts.sort((a, b) => a.t - b.t);
  for (const tr of S.traders) { tr.joinedAt = NOW - tr.joined * DAY; if (tr.status === 'registered') tr.declared = Math.round(sumWin(tr.no, 59, 30) * tr.decl / 10) * 10; }
  const thaboR = S.receipts.filter(r => r.no === '3307'); const realT = thaboR[thaboR.length - 20];
  const g1 = chk('4821K7PM'); const bad1 = AL[(AL.indexOf(g1) + 5) % 31];
  S.fakes.push({id:rid(), t:NOW - 26 * 3600000, code:`RS-4821-K7PM-${bad1}`, kind:'forged', by:global[11], detail:'Check character does not match. Rasiti never issued this code.'});
  S.fakes.push({id:rid(), t:NOW - 20 * 3600000, code:`RS-9017-QX4N-${chk('9017QX4N')}`, kind:'unknown', by:global[12], detail:'Well-formed code, but seller 9017 does not exist in the register.'});
  S.fakes.push({id:rid(), t:NOW - 9 * 3600000, code:realT.code, kind:'tampered', by:global[13], detail:`Paper receipt shows M${realT.amt * 10}; the register shows ${M(realT.amt)}.`});
  const noPh = S.receipts.find(r => r.no === '3307' && !r.ph && r.t < NOW - 3 * DAY);
  if (noPh) { noPh.ph = global[20]; S.fakes.push({id:rid(), t:NOW - 30 * 3600000, code:noPh.code, kind:'duplicate', by:global[21], detail:'Receipt already claimed by another phone. Second claim refused.'}); }
  const rp = (t, ph, type, target) => { const ll = target.place ? placeLatLng(target.place + rid(), target.area) : null; S.reports.push({id:rid(), t, ph, type, target, lat:ll && ll[0], lng:ll && ll[1]}); };
  const sefika = {place:'sefika-p3', label:'Chisa nyama stall, Sefika rank platform 3', area:'Sefika taxi rank', kind:'Informal'};
  rp(NOW - 8 * DAY, global[30], 'none', sefika); rp(NOW - 4 * DAY, global[31], 'unlisted', sefika);
  rp(NOW - 6 * DAY, global[40], 'unlisted', {place:'thetsane-gate', label:'Vegetable seller, Ha Thetsane gate', area:'Ha Thetsane', kind:'Informal'});
  rp(NOW - 12 * DAY, global[50], 'extra', {no:'5140'}); rp(NOW - 7 * DAY, global[51], 'extra', {no:'5140'}); rp(NOW - 3 * DAY, global[52], 'extra', {no:'5140'});
  const spam = '26659990001';
  [['3307'],['3902'],['4821'],['6018'],[null,'kingsway-x','Phone seller, Kingsway','Kingsway'],[null,'pitso-y','Food stall, Pitso Ground','Pitso Ground']].forEach((x, i) =>
    rp(NOW - DAY - i * 15 * MIN, spam, 'none', x[0] ? {no:x[0]} : {place:x[1], label:x[2], area:x[3], kind:'Informal'}));
  const SHOPS = [
    {place:'kingsway-hw',label:'Hardware store, Kingsway',area:'Kingsway',kind:'Formal shop',n:28,rate:.9},
    {place:'thetsane-butch',label:'Butchery, Ha Thetsane',area:'Ha Thetsane',kind:'Formal shop',n:19,rate:.37},
    {place:'pitso-liquor',label:'Liquor outlet, Pitso Ground',area:'Pitso Ground',kind:'Formal shop',n:22,rate:.2},
    {place:'main-tailor',label:'Tailor, Maseru Main Market',area:'Maseru Main Market',kind:'Informal',n:9,rate:.1},
    {place:'kingsway-acc',label:'Phone accessories stall, Kingsway',area:'Kingsway',kind:'Informal',n:14,rate:0},
    {place:'mall-wash',label:'Car wash, Maseru Mall parking',area:'Maseru Mall parking',kind:'Informal',n:11,rate:.05}];
  for (const sh of SHOPS) { const {n, rate, ...tg} = sh; const ll = placeLatLng(tg.place, tg.area);
    for (let i = 0; i < n; i++) S.reports.push({id:rid(), t:tradeT(rnd), ph:global[Math.floor(rnd() * 160)], type:rnd() < rate ? 'got' : (rnd() < .6 ? 'none' : 'unlisted'), target:tg, lat:ll[0], lng:ll[1]}); }
  const TRATE = {'3307':[22,.95],'4821':[14,.8],'5140':[17,.55],'6018':[8,.9],'7735':[6,.7],'3902':[12,.85],'2264':[1,1]};
  for (const no in TRATE) { const [n, rate] = TRATE[no]; for (let i = 0; i < n; i++) S.reports.push({id:rid(), t:tradeT(rnd), ph:global[Math.floor(rnd() * 160)], type:rnd() < rate ? 'got' : 'none', target:{no}}); }
}
function tradeT(rnd) { const d = new Date(NOW - Math.floor(rnd() * 29) * DAY); d.setHours(6, 30, 0, 0); let t = d.getTime() + Math.floor(rnd() * 12.5 * 3600000); if (t > NOW) t -= DAY; return t; }
function sumWin(no, fromAgo, toAgo) { return S.receipts.filter(r => r.no === no && r.t >= clock - fromAgo * DAY - 12 * 3600000 && r.t < clock - toAgo * DAY + 12 * 3600000).reduce((a, r) => a + r.amt, 0); }

/* ================= API ================= */
let busyN = 0, busyT = null;
function netBusy(on) { const el = $('#busy'); if (!el) return;
  if (on) { if (busyN++ === 0) busyT = setTimeout(() => { el.hidden = false; }, 300); }
  else if (--busyN <= 0) { busyN = 0; clearTimeout(busyT); el.hidden = true; } }
async function api(path, payload, opt) {
  const quiet = opt && opt.quiet; if (!quiet) netBusy(true);
  try { return await apiRaw(path, payload); } finally { if (!quiet) netBusy(false); }
}
async function apiRaw(path, payload) {
  const r = await fetch('/api/' + path, payload ? {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(payload), credentials:'same-origin'} : {credentials:'same-origin'});
  let j = {}; try { j = await r.json(); } catch {}
  if (!r.ok) throw Object.assign(new Error(j.error || ('Request failed (' + r.status + ')')), {status:r.status});
  return j;
}
function persist(payload) {
  if (!API.online || API.dbEmpty) return Promise.resolve();
  return api('event', payload).catch(e => { toast('Not saved: ' + e.message); throw e; });
}
function loadState(st) {
  NOW = Date.now(); clock = NOW;
  S.traders = st.sellers.map(s => ({no:s.no, name:s.name, trade:s.trade, market:s.market, status:s.status, tin:s.tin, joinedAt:Date.parse(s.joined_at || s.created_at),
    joined:Math.max(0, Math.round((NOW - Date.parse(s.joined_at || s.created_at)) / DAY)), via:s.via_rasiti, ph:s.phone,
    declared:s.declared_last == null ? null : Number(s.declared_last), helper:s.helper, regAt:s.registered_at ? Date.parse(s.registered_at) : null, lat:s.lat, lng:s.lng}));
  S.receipts = st.receipts.map(r => ({code:r.code, no:r.seller_no, amt:Number(r.amount), ch:r.channel, ph:r.phone, t:Date.parse(r.issued_at), note:r.note, live:r.source === 'tester' || r.source === 'ussd'}));
  S.receipts.forEach(r => used.add(r.code));
  S.claims = st.claims.map(c => ({id:c.id, no:c.seller_no, amt:Number(c.amount), ph:c.phone, t:Date.parse(c.created_at), state:c.state}));
  S.reports = st.reports.map(r => ({id:r.id, t:Date.parse(r.created_at), ph:r.phone, type:r.type, lat:r.lat, lng:r.lng,
    target:r.seller_no ? {no:r.seller_no} : {place:r.place_key, label:r.place_label, area:r.area, kind:r.kind}}));
  S.fakes = st.fakes.map(f => ({id:f.id, t:Date.parse(f.created_at), code:f.code, kind:f.kind, by:f.phone, detail:f.detail}));
  S.reviews = {}; st.reviews.forEach(r => S.reviews[r.code] = r.decision);
  S.invited = new Set(); S.visits = new Set(); S.done = new Set();
  st.actions.forEach(a => { if (a.kind === 'invite') S.invited.add(a.target); else if (a.kind === 'visit') S.visits.add(a.target); else S.done.add(a.item_id); });
  S.draws = st.draws || [];
}
async function refresh(quiet) {
  if (!API.online) return;
  try {
    const st = await api('state', null, {quiet});
    API.dbEmpty = !!st.empty;
    if (!st.empty) { loadState(st); reEval(); }
    renderAll(); fillSelects(); updateBanner();
    if (!quiet) toast('Up to date');
  } catch (e) { if (!quiet) toast('Could not refresh: ' + e.message); }
}
function exportSeed() {
  const iso = t => new Date(t).toISOString();
  return {
    sellers: S.traders.map(t => ({no:t.no, name:t.name, trade:t.trade, market:t.market, status:t.status, tin:t.tin || null, joined_at:iso(t.joinedAt || NOW), via_rasiti:!!t.via, phone:t.ph, declared_last:t.declared ?? null, lat:t.lat, lng:t.lng})),
    receipts: S.receipts.map(r => ({code:r.code, seller_no:r.no, amount:r.amt, channel:r.ch, phone:r.ph, issued_at:iso(r.t), note:r.note || null})),
    reports: S.reports.map(r => ({id:r.id, phone:r.ph, type:r.type, seller_no:r.target.no || null, place_key:r.target.place || null, place_label:r.target.label || null, area:r.target.area || null, kind:r.target.kind || null, lat:r.lat ?? null, lng:r.lng ?? null, created_at:iso(r.t)})),
    fakes: S.fakes.map(f => ({id:f.id, code:f.code, kind:f.kind, phone:f.by, detail:f.detail, created_at:iso(f.t)}))
  };
}

/* ================= Fraud Shield ================= */
const RULES = [
  {id:'self', name:'Seller buying from themselves', pts:60, what:"The customer phone is the seller's own registered phone."},
  {id:'velocity', name:'One phone, many receipts', pts:35, what:'6 or more receipts from one phone at one seller in a day.'},
  {id:'split', name:'Purchase split up', pts:30, what:'3 or more receipts of M10 or less from one phone within 15 minutes.'},
  {id:'ring', name:'Burst of new heavy buyers', pts:40, what:'3 or more new customers each buy 8 or more times in their first 30 days at an established seller. Long-time regulars are not counted.'},
  {id:'outlier', name:'Unusually large for this seller', pts:30, what:"More than 6 times the seller's typical sale and over M300."}
];
const RULE = Object.fromEntries(RULES.map(r => [r.id, r]));
function evaluate(list, traderPhones, now) {
  const out = {}; const byT = {};
  for (const r of list) { (byT[r.no] = byT[r.no] || []).push(r); out[r.code] = {score:0, flags:[]}; }
  const add = (r, id, why) => { const e = out[r.code]; if (e.flags.some(f => f.id === id)) return; e.flags.push({id, why}); e.score += RULE[id].pts; };
  for (const no in byT) {
    const rs = byT[no]; const amts = rs.map(r => r.amt).sort((a, b) => a - b); const med = amts[Math.floor(amts.length / 2)] || 0;
    const r30 = rs.filter(r => r.ph && r.t > now - 30 * DAY); const cnt = {}; r30.forEach(r => cnt[r.ph] = (cnt[r.ph] || 0) + 1);
    const first = {}; let sFirst = Infinity;
    for (const r of rs) { sFirst = Math.min(sFirst, r.t); if (r.ph) first[r.ph] = Math.min(first[r.ph] ?? Infinity, r.t); }
    const heavy = Object.entries(cnt).filter(x => x[1] >= 8 && first[x[0]] > now - 30 * DAY);
    const ringSet = new Set(heavy.length >= 3 && sFirst < now - 30 * DAY ? heavy.map(x => x[0]) : []);
    const day = {}; const byPh = {};
    for (const r of rs) {
      if (!r.ph) continue;
      if (r.ph === traderPhones[no]) add(r, 'self', "Paid from the seller's own phone.");
      const k = r.ph + '|' + new Date(r.t).toDateString(); (day[k] = day[k] || []).push(r); (byPh[r.ph] = byPh[r.ph] || []).push(r);
      if (ringSet.has(r.ph) && r.t > now - 30 * DAY) add(r, 'ring', `${heavy.length} new customers each bought ${Math.min(...heavy.map(x => x[1]))}+ times here within their first 30 days.`);
      if (r.amt > 6 * med && r.amt > 300) add(r, 'outlier', `${M(r.amt)} against a typical sale of ${M(med)}.`);
    }
    for (const k in day) if (day[k].length >= 6) day[k].forEach(r => add(r, 'velocity', `${day[k].length} receipts from this phone at this seller on one day.`));
    for (const p in byPh) { const small = byPh[p].filter(r => r.amt <= 10).sort((a, b) => a.t - b.t);
      for (let i = 0; i + 2 < small.length; i++) if (small[i + 2].t - small[i].t <= 15 * MIN) { let j = i; while (j + 1 < small.length && small[j + 1].t - small[i].t <= 15 * MIN) j++;
        for (let x = i; x <= j; x++) add(small[x], 'split', `${j - i + 1} receipts of M10 or less within 15 minutes.`); } }
  }
  for (const c in out) { const e = out[c]; e.state = e.score >= 60 ? 'blocked' : e.score >= 30 ? 'held' : 'clear'; }
  return out;
}
function reEval() { const tp = {}; S.traders.forEach(t => tp[t.no] = t.ph); S.eval = evaluate(S.receipts, tp, clock); }
function shieldState(r) { const e = S.eval[r.code] || {state:'clear'}; const rv = S.reviews[r.code]; if (rv === 'approved') return 'approved'; if (rv === 'rejected') return 'rejected'; return e.state; }
const baseEntries = r => r.ph ? Math.max(1, Math.min(5, Math.floor(r.amt / 10))) : 0;
const entriesFor = r => { const tr = tByNo(r.no); return baseEntries(r) * (tr && tr.status === 'registered' ? 2 : 1); };
function drawStatus(r) { const s = shieldState(r); if (!r.ph) return 'none'; if (s === 'blocked' || s === 'rejected') return 'excluded'; if (s === 'held') return 'held'; return 'active'; }

/* ================= feed / toast ================= */
function log(kind, text) { S.feed.unshift({t:clock, kind, text}); renderFeed(); }
let toastT; function toast(m) { const el = $('#toast'); el.textContent = m; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => el.hidden = true, 2800); }
function narrate(html) { $('#narr').innerHTML = html; }

/* ================= actions ================= */
const REPTYPE = {got:'Gave a receipt', none:'No receipt given', extra:'Charged extra for a receipt', unlisted:'Seller not on Rasiti', fake:'Fake receipt'};
function issue(no, amt, ch, ph, silent) {
  const code = mkCode(no, Math.random); const r = {code, no, amt:Math.round(amt), ch, ph:ph || null, t:tick(), live:true};
  S.receipts.push(r); reEval(); S.lastReceipt = r;
  persist({kind:'receipt', code, seller_no:no, amount:r.amt, channel:ch, phone:r.ph}).catch(() => {});
  const st = shieldState(r); const tr = tByNo(no);
  if (!silent) log(st === 'clear' ? 'ok' : st === 'held' ? 'warn' : 'bad', `Receipt ${code} · ${tr.name} · ${M(r.amt)} by ${ch === 'momo' ? 'mobile money' : 'cash'}${st !== 'clear' ? ' · Shield: ' + st : ''}`);
  renderReceipt(); renderAll(); return r;
}
function addFake(f) { const x = {id:rid(), t:tick(), ...f}; S.fakes.push(x); persist({kind:'fake', id:x.id, code:x.code, fkind:x.kind, phone:x.by, detail:x.detail}).catch(() => {}); }
function addReport(ph, type, target, ll) {
  const r = {id:rid(), t:tick(), ph, type, target, lat:ll ? ll[0] : (target.place ? placeLatLng(target.place + rid(), target.area)[0] : null), lng:ll ? ll[1] : null};
  if (!ll && target.place) { const p = placeLatLng(target.place + r.id, target.area); r.lat = p[0]; r.lng = p[1]; }
  S.reports.push(r);
  persist({kind:'report', id:r.id, phone:ph, type, seller_no:target.no || null, place_key:target.place, place_label:target.label, area:target.area, place_kind:target.kind, lat:r.lat, lng:r.lng}).catch(() => {});
  log('info', `Customer rating: ${REPTYPE[type]} · ${target.no ? tByNo(target.no).name : target.label}`); renderAll();
}

/* ================= report analysis ================= */
function spamPhones() { const by = {}; S.reports.forEach(r => (by[r.ph] = by[r.ph] || []).push(r)); const out = new Set();
  for (const p in by) { const rs = by[p].filter(x => x.type !== 'got').sort((a, b) => a.t - b.t); for (let i = 0; i < rs.length; i++) { const win = rs.filter(x => x.t >= rs[i].t && x.t - rs[i].t <= DAY);
    const tg = new Set(win.map(x => x.target.no || x.target.place)); if (win.length >= 5 && tg.size >= 3) { out.add(p); break; } } } return out; }
function reportGroups() { const spam = spamPhones(); const g = {};
  for (const r of S.reports) { const k = r.target.no ? 'T' + r.target.no : 'P' + r.target.place;
    const e = g[k] = g[k] || {key:k, target:r.target, list:[], phones:new Set(), discounted:0, pos:0, lls:[]}; e.list.push(r); if (r.lat != null) e.lls.push([r.lat, r.lng]);
    if (spam.has(r.ph)) e.discounted++; else if (r.type === 'got') e.pos++; else e.phones.add(r.ph); }
  return Object.values(g).map(e => ({...e, indep:e.phones.size})); }
function matchPlace(text) { const stop = new Set(['the','and','near','stall','seller','rank','by','at','of','shop']);
  const toks = s => s.toLowerCase().split(/[^a-z0-9']+/).filter(w => (w.length >= 3 && !stop.has(w)) || /^\d+$/.test(w));
  const tw = new Set(toks(text)); let best = null, bs = 0;
  for (const r of S.reports) if (r.target.place && r.target.label) { const o = toks(r.target.label).filter(w => tw.has(w)).length; if (o > bs) { bs = o; best = r.target; } }
  return bs >= 2 ? best : null; }
function guessArea(text) { const t = text.toLowerCase(); for (const a in AREAS) if (t.includes(a.split(' ')[0].toLowerCase().replace("'", ''))) return a; return 'Area not given'; }

/* ================= phones ================= */
const PH = { t:{who:'3307', st:'home', d:{}, mode:'ussd', last:'', u:'idle', w:'home', dial:''}, c:{who:PERSONAS[0].ph, st:'home', d:{}, mode:'wa', last:'', u:'idle', w:'home', dial:''} };
const IC = {
  ussd:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M10 7h4M10 11h4M10 15h4"/></svg>',
  wa:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/><path d="M9 9.5c.3 2 2.5 4.2 4.5 4.5l1.2-1.2 1.8.9-.4 1.5c-3.5.4-7.8-3.9-7.4-7.4l1.5-.4.9 1.8z" fill="currentColor" stroke="none"/></svg>',
  verified:'<svg viewBox="0 0 24 24"><path d="M12 1.5l2.6 2 3.3-.3.9 3.2 2.9 1.6-1 3.1 1 3.1-2.9 1.6-.9 3.2-3.3-.3-2.6 2-2.6-2-3.3.3-.9-3.2L2.2 14.2l1-3.1-1-3.1 2.9-1.6.9-3.2 3.3.3z" fill="#25d366"/><path d="M8 12.3l2.6 2.5L16.2 9" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  video:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/></svg>',
  call:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>',
  smile:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0"/><circle cx="9" cy="10" r=".8" fill="currentColor"/><circle cx="15" cy="10" r=".8" fill="currentColor"/></svg>',
  clip:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 11.5l-8 8a5 5 0 0 1-7-7l8.5-8.5a3.5 3.5 0 0 1 5 5L10 17.5a2 2 0 0 1-3-3l7.5-7.5"/></svg>',
  cam:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  send:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 20l18-8L3 4v6l12 2-12 2z"/></svg>',
  list:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  status:'<span class="ic"><svg viewBox="0 0 18 10"><rect x="0" y="7" width="3" height="3" rx=".5" fill="currentColor"/><rect x="5" y="5" width="3" height="5" rx=".5" fill="currentColor"/><rect x="10" y="2.5" width="3" height="7.5" rx=".5" fill="currentColor"/><rect x="15" y="0" width="3" height="10" rx=".5" fill="currentColor"/></svg>4G<svg viewBox="0 0 26 12"><rect x=".5" y=".5" width="22" height="11" rx="3" fill="none" stroke="currentColor" opacity=".5"/><rect x="2" y="2" width="16" height="8" rx="1.6" fill="currentColor"/><rect x="23.5" y="4" width="2" height="4" rx="1" fill="currentColor" opacity=".5"/></svg></span>'
};
const RASITI_CODE = '*999#';
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const APPS = [
  ['phone','Phone','#34c759','<path d="M6.5 3.5h3l1.5 4-2 1.3a10 10 0 0 0 5.2 5.2l1.3-2 4 1.5v3a2 2 0 0 1-2 2A15.5 15.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2z" fill="#fff"/>'],
  ['messages','Messages','#34c759','<path d="M12 4c5 0 8.5 3.1 8.5 7S17 18 12 18c-1 0-2-.1-2.9-.4L5 19.5l1.3-3.3C4.5 14.9 3.5 13.1 3.5 11 3.5 7.1 7 4 12 4z" fill="#fff"/>'],
  ['camera','Camera','#8e8e93','<path d="M4 8h3l1.8-2.5h6.4L17 8h3v11H4z" fill="#fff"/><circle cx="12" cy="13" r="3.4" fill="#8e8e93"/>'],
  ['photos','Photos','#ffffff','<g transform="translate(12 12)">'+[0,45,90,135,180,225,270,315].map((r,i)=>`<ellipse rx="2.6" ry="5.6" cy="-4.6" transform="rotate(${r})" fill="${['#f4b400','#f57c00','#e53935','#d81b60','#8e24aa','#3949ab','#039be5','#43a047'][i]}" opacity=".85"/>`).join('')+'</g>'],
  ['money','Mobile Money','#e8793a','<rect x="4" y="7" width="16" height="11" rx="2" fill="#fff"/><path d="M6 7l9-3 1.4 3" fill="none" stroke="#fff" stroke-width="1.6"/><circle cx="16" cy="12.5" r="1.4" fill="#e8793a"/>'],
  ['whatsapp','WhatsApp','#25d366','<path d="M12 3.5a8.5 8.5 0 0 0-7.3 12.8L3.6 20.4l4.2-1.1A8.5 8.5 0 1 0 12 3.5z" fill="#fff"/><path d="M9.2 8.3c.3 2.3 2.6 4.6 4.9 4.9l1.1-1.1 1.7.8-.3 1.5c-3.4.5-7.4-3.5-6.9-6.9l1.5-.3.8 1.7z" fill="#25d366"/>'],
  ['maps','Maps','#4fae5e','<path d="M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2z" fill="#fff"/><path d="M9 4v14M15 6v14" stroke="#4fae5e" stroke-width="1.4"/>'],
  ['clock','Clock','#1c1c1e','<circle cx="12" cy="12" r="8" fill="#fff"/><path d="M12 7v5l3 2" stroke="#1c1c1e" stroke-width="1.8" fill="none" stroke-linecap="round"/>'],
  ['calendar','Calendar','#ffffff','<text x="12" y="9" text-anchor="middle" font-size="5" font-weight="700" fill="#e53935" font-family="Arial">SAT</text><text x="12" y="19" text-anchor="middle" font-size="10" font-weight="700" fill="#1c1c1e" font-family="Arial">31</text>'],
  ['browser','Browser','#0a84ff','<circle cx="12" cy="12" r="8" fill="none" stroke="#fff" stroke-width="1.6"/><path d="M4 12h16M12 4c3 3 3 13 0 16M12 4c-3 3-3 13 0 16" stroke="#fff" stroke-width="1.3" fill="none"/>'],
  ['calculator','Calculator','#3a3a3c','<rect x="7" y="4" width="10" height="16" rx="2" fill="#fff"/><path d="M9 7.5h6" stroke="#3a3a3c" stroke-width="1.6"/><g fill="#e8793a"><circle cx="9.5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="14.5" cy="12" r="1"/><circle cx="9.5" cy="15.5" r="1"/><circle cx="12" cy="15.5" r="1"/><circle cx="14.5" cy="15.5" r="1"/></g>'],
  ['settings','Settings','#8e8e93','<circle cx="12" cy="12" r="6.5" fill="none" stroke="#fff" stroke-width="2.4" stroke-dasharray="2.2 1.6"/><circle cx="12" cy="12" r="2.6" fill="#fff"/>']
];
const appIcon = id => { const a = APPS.find(x => x[0] === id); return `<button type="button" class="papp" data-app="${a[0]}"><i style="background:${a[2]}"><svg viewBox="0 0 24 24">${a[3]}</svg></i><span>${a[1]}</span></button>`; };
const OTHER_CHATS = [
  ['MM', "Mme 'Mamosa", 'See you at the market tomorrow', '08:12', '#7f66ff'],
  ['SR', 'Sefika rank traders', 'Ntate Tumo: Meeting on Monday at 10', 'Yesterday', '#00a884'],
  ['NL', 'Ntate Lehlohonolo', 'Thanks, received 👍', 'Thu', '#e8793a']
];
function buildPhone(k) {
  const isT = k === 't';
  $('#col-' + k).innerHTML = `
    <div class="phone-head"><label for="${k}Sel">${isT ? "Seller's phone" : "Customer's phone"}</label><select id="${k}Sel"></select>
      <div class="chan" role="group" aria-label="Channel"><button type="button" data-m="ussd">${IC.ussd}USSD ${RASITI_CODE}</button><button type="button" data-m="wa">${IC.wa}WhatsApp</button></div></div>
    <div class="fphone" id="${k}U"><div class="fp-face">
      <div class="fp-ear"></div>
      <div class="fp-screen">
        <div class="fp-status"><span class="sig"><i></i><i></i><i></i><i></i></span><b id="${k}Net">LS-NET</b><span class="bat"><i></i></span></div>
        <pre class="fp-msg" id="${k}Screen"></pre>
        <form class="fp-in" id="${k}UForm"><input id="${k}In" type="text" autocomplete="off" aria-label="USSD reply" inputmode="numeric"></form>
        <div class="fp-soft"><span></span><span>Reply</span><span>Back</span></div>
        <div class="u-busy" id="${k}Busy" hidden><div><i></i><span id="${k}BusyT">Sending…</span></div></div>
      </div>
      <div class="fp-nav">
        <button type="button" class="fp-sk l" data-u="send" aria-label="Left soft key"></button>
        <button type="button" class="fp-dpad" data-u="send" aria-label="OK"><i></i></button>
        <button type="button" class="fp-sk r" data-u="back" aria-label="Right soft key: back or clear"></button>
        <button type="button" class="fp-call g" data-u="send" aria-label="Call key: dial or send"><svg viewBox="0 0 24 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 9.5C6 5 18 5 21 9.5l-.6 2.3-4.2-.9-.4-2.3c-2.6-.8-5-.8-7.6 0l-.4 2.3-4.2.9z"/></svg></button>
        <button type="button" class="fp-call r" data-u="end" aria-label="End key: hang up"><svg viewBox="0 0 24 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="7.5" r="5"/><path d="M12 1v5"/></svg></button>
      </div></div>
      <div class="fp-keys">${[['1','oo'],['2','abc'],['3','def'],['4','ghi'],['5','jkl'],['6','mno'],['7','pqrs'],['8','tuv'],['9','wxyz'],['*','+'],['0','⎵'],['#','⇧']].map(([d, l]) => `<button type="button" data-k="${d}" aria-label="Key ${d}"><b>${d}</b><small>${l}</small></button>`).join('')}</div>
    </div>
    <div class="device" id="${k}Dev" hidden><div class="island"></div>
      <div class="scr wa" id="${k}W">
        <div class="sbar"><span>9:41</span>${IC.status}</div>
        <div class="wv hs" id="${k}VHome">
          <div class="hs-clock"><b id="${k}Clock">9:41</b><span id="${k}Date"></span></div>
          <div class="hs-tip">Open <b>WhatsApp</b> and chat to <b>Rasiti</b></div>
          <div class="hs-grid">${['phone','messages','camera','photos','money','whatsapp','maps','clock','calendar','browser','calculator','settings'].map(appIcon).join('')}</div>
          <div class="hs-dock">${['phone','messages','whatsapp','camera'].map(appIcon).join('')}</div>
        </div>
        <div class="wv wc" id="${k}VChats" hidden>
          <div class="wc-top"><b>WhatsApp</b><span class="acts">${IC.cam}<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg></span></div>
          <div class="wc-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></svg>Search</div>
          <div class="wc-chips"><span class="on">All</span><span>Unread</span><span>Favourites</span><span>Groups</span></div>
          <div class="wc-list" id="${k}ChatList"></div>
          <button type="button" class="wc-fab" data-wa="contacts" aria-label="New chat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 18l1-3.2A7.5 7.5 0 1 1 8 18z"/><path d="M12 8v6M9 11h6"/></svg></button>
          <div class="wc-tabs"><span class="on">Chats</span><span>Updates</span><span>Communities</span><span>Calls</span></div>
        </div>
        <div class="wv wk" id="${k}VContacts" hidden>
          <div class="wk-top"><button type="button" data-wa="chats" aria-label="Back">‹</button><div><b>Select contact</b><small>5 contacts</small></div></div>
          <div class="wk-list">
            <button type="button" class="wk-row" data-toast="1"><span class="av" style="background:#00a884">+</span><span><b>New group</b></span></button>
            <button type="button" class="wk-row" data-toast="1"><span class="av" style="background:#00a884">+</span><span><b>New contact</b></span></button>
            <div class="wk-h">Contacts on WhatsApp</div>
            <button type="button" class="wk-row" data-open="rasiti"><span class="av rasiti"><svg viewBox="0 0 24 24"><use href="#ic-receipt"/></svg></span><span><b>Rasiti ${IC.verified}</b><small>Receipts that reward · business account</small></span></button>
            ${OTHER_CHATS.map(c => `<button type="button" class="wk-row" data-toast="1"><span class="av" style="background:${c[4]}">${c[0]}</span><span><b>${esc(c[1])}</b><small>Hey there! I am using WhatsApp.</small></span></button>`).join('')}
          </div>
        </div>
        <div class="wv wchat" id="${k}VChat" hidden>
          <div class="wa-top"><button type="button" class="back" data-wa="chats" aria-label="Back to chats">‹</button><span class="wa-av"><svg viewBox="0 0 24 24"><use href="#ic-receipt"/></svg></span>
            <div class="wa-id"><b>Rasiti ${IC.verified}</b><small>Business account</small></div><span class="acts">${IC.video}${IC.call}</span></div>
          <div class="wa-log" id="${k}Log"></div>
          <form class="wa-bar" id="${k}WForm"><div class="wa-in">${IC.smile}<input id="${k}WIn" type="text" autocomplete="off" placeholder="Message" aria-label="WhatsApp message">${IC.clip}${IC.cam}</div><button class="wa-send" type="submit" aria-label="Send">${IC.send}</button></form>
          <div class="sheet-bg" id="${k}Sheet" hidden></div>
        </div>
        <button type="button" class="homebar" data-wa="home" aria-label="Home"><i></i></button>
        <div class="hs-toast" id="${k}Toast" hidden></div>
      </div>
    </div>`;
  const col = $('#col-' + k);
  col.querySelector('.chan').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (b) setMode(k, b.dataset.m); });
  col.querySelector('.fp-keys').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) uKey(k, b.dataset.k); });
  col.querySelector('.fp-nav').addEventListener('click', e => { const b = e.target.closest('[data-u]'); if (b) uNav(k, b.dataset.u); });
  $('#' + k + 'UForm').addEventListener('submit', e => { e.preventDefault(); uNav(k, 'send'); });
  $('#' + k + 'W').addEventListener('click', e => {
    const nav = e.target.closest('[data-wa]'); if (nav) { waView(k, nav.dataset.wa); return; }
    const app = e.target.closest('[data-app]'); if (app) { if (app.dataset.app === 'whatsapp') waView(k, 'chats'); else phoneToast(k, 'Demo phone: only WhatsApp opens here.'); return; }
    if (e.target.closest('[data-open]')) { openChat(k, false); return; }
    if (e.target.closest('[data-toast]')) phoneToast(k, 'Demo phone: only the Rasiti chat works.');
  });
  $('#' + k + 'WForm').addEventListener('submit', e => { e.preventDefault(); const i = $('#' + k + 'WIn'); const v = i.value; i.value = ''; waSend(k, v); });
  $('#' + k + 'Log').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) waSend(k, b.dataset.v, b.dataset.l); const l = e.target.closest('[data-list]'); if (l) openSheet(k, JSON.parse(l.dataset.list)); });
  $('#' + k + 'Sheet').addEventListener('click', e => { const r = e.target.closest('[data-v]'); if (r) { closeSheet(k); waSend(k, r.dataset.v, r.dataset.l); } else if (e.target.closest('[data-x]') || e.target.id === k + 'Sheet') closeSheet(k); });
  $('#' + k + 'Sel').addEventListener('change', e => { resetPhone(k, k === 't' ? (e.target.value === 'new' ? null : e.target.value) : e.target.value); });
}
let phoneToastT = {};
function phoneToast(k, m) { const t = $('#' + k + 'Toast'); t.textContent = m; t.hidden = false; clearTimeout(phoneToastT[k]); phoneToastT[k] = setTimeout(() => t.hidden = true, 1800); }
function nowLabel() { const d = new Date(); return [pad(d.getHours()) + ':' + pad(d.getMinutes()), DAYS[d.getDay()] + ', ' + d.getDate() + ' ' + ['January','February','March','April','May','June','July','August','September','October','November','December'][d.getMonth()]]; }
function resetPhone(k, who) {
  const p = PH[k]; if (k === 't') p.who = who; else p.who = who;
  p.st = 'home'; p.d = {}; p.live = null; p.u = 'idle'; p.dial = '';
  $('#' + k + 'Log').innerHTML = ''; uRender(k); waView(k, 'home');
}

/* ----- WhatsApp smartphone ----- */
function waView(k, v) {
  const p = PH[k]; p.w = v;
  const map = {home:'VHome', chats:'VChats', contacts:'VContacts', chat:'VChat'};
  for (const x in map) $('#' + k + map[x]).hidden = x !== v;
  $('#' + k + 'W').classList.toggle('on-home', v === 'home');
  const [t, d] = nowLabel(); $('#' + k + 'W').querySelector('.sbar span').textContent = t;
  if (v === 'home') { $('#' + k + 'Clock').textContent = t; $('#' + k + 'Date').textContent = d; }
  if (v === 'chats') renderChatList(k);
  if (v === 'chat') { const l = $('#' + k + 'Log'); l.scrollTop = l.scrollHeight; }
}
function renderChatList(k) {
  const bots = $('#' + k + 'Log').querySelectorAll('.bb'); const last = bots.length ? bots[bots.length - 1] : null;
  const rasiti = last ? `<button type="button" class="wc-row" data-open="rasiti"><span class="av rasiti"><svg viewBox="0 0 24 24"><use href="#ic-receipt"/></svg></span><span class="wc-mid"><b>Rasiti ${IC.verified}</b><small>${esc((last.dataset.q || last.textContent).slice(0, 38))}</small></span><span class="wc-time">${hm(clock)}</span></button>` : '';
  $('#' + k + 'ChatList').innerHTML = rasiti + OTHER_CHATS.map(c => `<button type="button" class="wc-row" data-toast="1"><span class="av" style="background:${c[4]}">${c[0]}</span><span class="wc-mid"><b>${esc(c[1])}</b><small>${esc(c[2])}</small></span><span class="wc-time">${c[3]}</span></button>`).join('')
    + (rasiti ? '' : '<p class="wc-hint">Tap the green button to start a chat with Rasiti.</p>');
}
const isCustomer = ph => !!S.customers[ph];
function openChat(k, auto) {
  waView(k, 'chat');
  const log = $('#' + k + 'Log'); if (log.children.length) return;
  const p = PH[k];
  if (k === 't') { waBot(k, 'Lumela! 👋 This is Rasiti for sellers: your free sales book and receipts in one chat. Same service as ' + RASITI_CODE + '.'); if (!auto) home(k); return; }
  if (isCustomer(p.who)) { waBot(k, `Lumela ${S.customers[p.who].name}! 👋 Welcome back to Rasiti. Get receipts, check them, rate shops and win in the monthly draw. Type "menu" any time.`); if (!auto) home(k); }
  else if (!auto) home(k);
}

/* ----- USSD keypad phone ----- */
function uRender(k) {
  const p = PH[k]; const scr = $('#' + k + 'Screen'); const soft = $('#' + k + 'U').querySelector('.fp-soft').children;
  const set = (a, b) => { soft[1].textContent = a; soft[2].textContent = b; };
  $('#' + k + 'UForm').hidden = !(p.u === 'session' || p.u === 'live');
  $('#' + k + 'Net').textContent = p.u === 'live' ? 'USSD ' + RASITI_CODE : 'LS-NET';
  if (p.u === 'idle') { const [t, d] = nowLabel(); scr.className = 'fp-msg idle'; scr.innerHTML = `<span class="fp-time">${t}</span><span class="fp-date">${d}</span><span class="fp-hint">Dial <b>${RASITI_CODE}</b> and press the green key for Rasiti</span>`; set('Menu', 'Names'); }
  else if (p.u === 'dial') { scr.className = 'fp-msg dial'; scr.textContent = p.dial; set('Call', 'Clear'); }
  else if (p.u === 'ended') { scr.className = 'fp-msg'; set('OK', ''); }
  else { scr.className = 'fp-msg'; set('Reply', 'Back'); }
}
function uKey(k, d) {
  const p = PH[k];
  if (p.u === 'idle' || p.u === 'dial' || p.u === 'ended') { if (p.u !== 'dial') p.dial = ''; p.u = 'dial'; p.dial = (p.dial + d).slice(0, 20); uRender(k); }
  else $('#' + k + 'In').value += d;
}
function uNav(k, a) {
  const p = PH[k]; const i = $('#' + k + 'In');
  if (a === 'end') { if (p.live) log('info', 'USSD session ended'); p.live = null; p.u = 'idle'; p.dial = ''; i.value = ''; uRender(k); return; }
  if (p.u === 'idle') { if (a === 'send') phoneToastU(k); return; }
  if (p.u === 'dial') { if (a === 'back') { p.dial = p.dial.slice(0, -1); if (!p.dial) p.u = 'idle'; uRender(k); } else uDial(k); return; }
  if (p.u === 'ended') { p.u = 'idle'; uRender(k); return; }
  if (a === 'back') { if (i.value) i.value = i.value.slice(0, -1); return; }
  ussdSend(k);
}
function phoneToastU(k) { const s = $('#' + k + 'Screen'); s.querySelector('.fp-hint')?.classList.add('flash'); }
function uDial(k) {
  const p = PH[k]; const code = p.dial.replace(/\s/g, ''); p.dial = '';
  if (code === RASITI_CODE) { $('#' + k + 'BusyT').textContent = 'Running USSD code…'; busy(k, () => { $('#' + k + 'BusyT').textContent = 'Sending…'; startUssd(k); }, 900); return; }
  p.u = 'ended'; uRender(k);
  $('#' + k + 'Screen').textContent = /^\*.*#$/.test(code) ? `USSD code not recognised.\n\nDial ${RASITI_CODE} for Rasiti.` : `This demo phone cannot make calls.\n\nDial ${RASITI_CODE} for Rasiti.`;
}
const phoneOf = k => { if (k === 'c') return PH.c.who; const tr = tByNo(PH.t.who); return tr ? tr.ph : (PH.t.newPh = PH.t.newPh || randPhone(Math.random)); };
function startUssd(k) {
  const p = PH[k];
  if (API.online && !API.dbEmpty) { p.u = 'live'; p.live = {sid:'demo-' + rid(), parts:[]}; uRender(k); log('info', `USSD ${RASITI_CODE} dialled on the ${k === 't' ? "seller's" : "customer's"} phone (live server session)`); liveStep(k, null); }
  else { p.u = 'session'; uRender(k); home(k); }
}
async function liveStep(k, v) {
  const p = PH[k]; if (!p.live) return; if (v !== null) p.live.parts.push(v);
  try {
    const r = await fetch('/api/ussd', {method:'POST', headers:{'content-type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({sessionId:p.live.sid, serviceCode:RASITI_CODE, phoneNumber:'+' + phoneOf(k), text:p.live.parts.join('*')})});
    const t = await r.text(); const body = t.replace(/^(CON|END) /, '');
    if (!t.startsWith('CON ')) { p.live = null; p.u = 'ended'; uRender(k); $('#' + k + 'Screen').textContent = body; refresh(true); return; }
    $('#' + k + 'Screen').textContent = body;
  } catch { p.live = null; p.u = 'ended'; uRender(k); $('#' + k + 'Screen').textContent = 'Network problem. Please try again.'; }
}
function busy(k, fn, ms) { const b = $('#' + k + 'Busy'); b.hidden = false; setTimeout(() => { b.hidden = true; fn(); }, ms || 380); }
function ussdSend(k) { const i = $('#' + k + 'In'); const v = i.value; i.value = ''; if (PH[k].u === 'live') busy(k, () => liveStep(k, v)); else busy(k, () => (k === 't' ? tStep : cStep)(v)); }
function setMode(k, m) {
  PH[k].mode = m;
  $('#col-' + k).querySelectorAll('.chan button').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === m));
  $('#' + k + 'U').hidden = m !== 'ussd'; $('#' + k + 'Dev').hidden = m !== 'wa';
  if (m === 'wa') waView(k, PH[k].w || 'home'); else uRender(k);
}
function show(k, text) {
  const p = PH[k]; p.last = text;
  if (p.u !== 'live') { if (p.u !== 'session') { p.u = 'session'; uRender(k); } $('#' + k + 'Screen').textContent = ussdText(text); }
  if (p.mode === 'wa') { if (p.w !== 'chat') openChat(k, true); waBot(k, text); }
}
const ussdText = t => t.replace(/[\u{1F300}-\u{1FAFF}\u2705\u274C]\uFE0F?\s?/gu, '');
function waBot(k, text) {
  const opts = [], body = [];
  for (const l of text.split('\n')) { const m = l.match(/^\s*(\d)\. (.+)$/); if (m) opts.push([m[1], m[2]]); else body.push(l); }
  const log = $('#' + k + 'Log'); const b = document.createElement('div'); b.className = 'bb bot';
  const txt = body.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  const real = opts.filter(o => o[0] !== '0');
  let inner = esc(txt);
  if (real.length > 3) inner += `<button type="button" class="wa-list" data-list='${esc(JSON.stringify(opts))}'>${IC.list} Choose an option</button>`;
  b.innerHTML = inner + `<time>${hm(clock)}</time>`; b.dataset.q = txt.split('\n')[0];
  log.appendChild(b);
  if (opts.length && real.length <= 3) {
    const w = document.createElement('div'); w.className = 'qr-btns';
    w.innerHTML = opts.map(o => `<button type="button" data-v="${o[0]}" data-l="${esc(o[0] === '0' ? 'Menu' : o[1])}">${esc(o[0] === '0' ? 'Menu' : o[1])}</button>`).join('');
    log.appendChild(w);
  }
  log.scrollTop = log.scrollHeight;
}
function waMe(k, text, quote) {
  const log = $('#' + k + 'Log'); const b = document.createElement('div'); b.className = 'bb me';
  const who = k === 't' ? 'Rasiti Seller' : 'Rasiti';
  b.innerHTML = (quote ? `<div class="quote"><b>${who}</b>${esc(quote)}</div>` : '') + esc(text) + `<time>${hm(clock)} <span class="tk">✓✓</span></time>`;
  log.appendChild(b); log.scrollTop = log.scrollHeight;
}
function waSend(k, v, label) {
  if (!String(v).trim()) return;
  const bots = $('#' + k + 'Log').querySelectorAll('.bb.bot'); const q = label && bots.length ? bots[bots.length - 1].dataset.q : null;
  waMe(k, label || v, q);
  if (/^(hi|hello|menu|lumela|dumela|start)$/i.test(String(v).trim())) { home(k); return; }
  setTimeout(() => (k === 't' ? tStep : cStep)(v), 250);
}
function openSheet(k, opts) {
  const s = $('#' + k + 'Sheet');
  s.innerHTML = `<div class="sheet"><div class="grab"></div><h4>Choose an option<button type="button" data-x aria-label="Close">×</button></h4>${opts.map(o => `<button type="button" class="row" data-v="${o[0]}" data-l="${esc(o[0] === '0' ? 'Menu' : o[1])}"><span>${esc(o[0] === '0' ? 'Back to menu' : o[1])}</span><i></i></button>`).join('')}</div>`;
  s.hidden = false;
}
function closeSheet(k) { $('#' + k + 'Sheet').hidden = true; }
function home(k) { PH[k].st = 'home'; PH[k].d = {};
  if (k === 'c' && !isCustomer(PH.c.who)) { PH.c.st = 'c_reg0'; show('c', REG_PROMPT); return; }
  show(k, k === 't' ? tHome() : cHome()); }
const REG_PROMPT = 'Lumela! 👋 Welcome to Rasiti, the receipt lottery.\nRegister free to get receipts and win in the monthly draw.\n\n1. Register now\n2. How does it work?';
const statusLbl = t => t.status === 'registered' ? 'Registered · SBT' : 'Enrolled · not yet registered';

function tHome() { const tr = tByNo(PH.t.who);
  if (!tr) return 'Lumela! Rasiti keeps a free\nsales book on your phone and\nbrings customers who want\nreceipts.\n\n1. Join Rasiti (2 minutes)\n2. What do I get?';
  const pend = S.claims.filter(c => c.no === tr.no && c.state === 'pending').length;
  return `Lumela ${tr.name.split(' ').slice(0, 2).join(' ')}\nCode ${tr.no} · ${statusLbl(tr)}\n\n1. Record cash sale\n2. Confirm receipts (${pend})\n3. My sales book\n4. ${tr.status === 'enrolled' ? 'Register for tax' : 'My tax & badge'}\n5. Help`; }
function cHome() { return 'Rasiti receipts\n\n1. Get receipt for cash\n2. Check a receipt\n3. Rate a shop\n4. My draw entries\n5. Shops that give receipts'; }

function tStep(inp) { const p = PH.t, tr = tByNo(p.who), v = String(inp).trim();
  if (v === '0' && p.st !== 't_amt_ph') { home('t'); return; }
  switch (p.st) {
  case 'home':
    if (!tr) { if (v === '1') { p.st = 'j_name'; show('t', 'Join Rasiti\n\nYour name:'); }
      else if (v === '2') { p.st = 'end'; show('t', 'With Rasiti you get:\n- a free sales book\n- customers drawn by the\n  prize draw sign\n- a record banks can see\n- simple tax, no queues\n\n0. Back'); } return; }
    if (v === '1') { p.st = 't_amt'; show('t', 'Record cash sale\n\nAmount (M):'); }
    else if (v === '2') { const list = S.claims.filter(c => c.no === tr.no && c.state === 'pending').slice(0, 3); p.d.list = list;
      if (!list.length) { p.st = 'end'; show('t', 'No receipts waiting.\n\n0. Menu'); return; }
      p.st = 't_pick'; show('t', 'Customers asking for receipts\n\n' + list.map((c, i) => `${i + 1}. ${M(c.amt)} · ${mask(c.ph)} · ${hm(c.t)}`).join('\n') + '\n\n0. Menu'); }
    else if (v === '3') { const rs = S.receipts.filter(r => r.no === tr.no); const d0 = new Date(clock); d0.setHours(0, 0, 0, 0);
      const today = rs.filter(r => r.t >= d0.getTime()); const w = rs.filter(r => r.t > clock - 7 * DAY); const m = rs.filter(r => r.t > clock - 30 * DAY);
      const sm = a => a.reduce((x, r) => x + r.amt, 0); p.st = 'end';
      show('t', `My sales book\n\nToday: ${today.length} sales, ${M(sm(today))}\n7 days: ${w.length} sales, ${M(sm(w))}\n30 days: ${m.length} sales, ${M(sm(m))}\nMobile money ${M(sm(m.filter(r => r.ch === 'momo')))} · cash ${M(sm(m.filter(r => r.ch === 'cash')))}\n\n0. Menu`); }
    else if (v === '4') { const m = S.receipts.filter(r => r.no === tr.no && r.t > clock - 30 * DAY).reduce((x, r) => x + r.amt, 0);
      if (tr.status === 'enrolled') { p.st = 't_reg'; show('t', `Register for tax\n\nSales last 30 days: ${M(m)}\nYearly estimate: ${M(m * 12)}\nYou fit Simplified Business\nTax (under M2,000,000).\n\nRegistered sellers get double\ndraw entries for customers,\nbigger seller prizes and a\nbadge banks recognise.\n\n1. Register now\n2. Ask a helper to call me\n0. Menu`); }
      else { p.st = 'end'; show('t', `TIN ${tr.tin} · SBT\nBadge: ${tr.via ? 'Rasiti Gold' : 'Rasiti Silver'}\nSales on Rasiti, 30 days: ${M(m)}\nReturn due ${dueDate()}, prefilled\nfrom your sales book.\n\n0. Menu`); } }
    else if (v === '5') { p.st = 'end'; show('t', "Help\n\nYour customers' numbers are\nnever shown to you or anyone\nelse. Ask a market tax helper\nor visit any RSL office.\n\n0. Menu"); }
    return;
  case 'j_name': if (!v) return; p.d.name = v.slice(0, 60); p.st = 'j_mkt'; show('t', 'Where do you trade?\n(e.g. Sefika rank)'); return;
  case 'j_mkt': if (!v) return; p.d.mkt = v.slice(0, 60); p.st = 'j_trade'; show('t', 'What do you sell?'); return;
  case 'j_trade': { if (!v) return; let no; do { no = String(7000 + Math.floor(Math.random() * 2999)); } while (tByNo(no));
    const area = Object.keys(AREAS).find(a => p.d.mkt.toLowerCase().includes(a.split(' ')[0].toLowerCase())) || p.d.mkt;
    const ll = placeLatLng('T' + no, area);
    const tr2 = {no, name:p.d.name, trade:v.slice(0, 60), market:p.d.mkt, status:'enrolled', joined:0, joinedAt:clock, ph:randPhone(Math.random), lat:ll[0], lng:ll[1]};
    S.traders.push(tr2); persist({kind:'seller_join', no, name:tr2.name, trade:tr2.trade, market:tr2.market, phone:tr2.ph, lat:ll[0], lng:ll[1]}).catch(() => {});
    log('ok', `New seller enrolled: ${tr2.name} (${tr2.market}), code ${no}`); p.who = no; fillSelects(); p.st = 'end';
    show('t', `Welcome ${tr2.name}!\nYour seller code: ${no}\n\nPut the Rasiti sticker where\ncustomers can see it. You\ncan give receipts now.\nNo tax number needed yet.\n\n0. Menu`); renderAll(); return; }
  case 't_amt': { const a = parseFloat(v); if (!(a > 0)) { show('t', 'Amount (M), numbers only:'); return; } p.d.amt = a; p.st = 't_amt_ph'; show('t', `Sale ${M(a)}\n\nCustomer phone for their\nreceipt SMS (or 0 to skip):`); return; }
  case 't_amt_ph': { let ph = null; if (v !== '0') { const d = v.replace(/\D/g, ''); ph = d.length === 8 ? '266' + d : d.length === 11 ? d : null; if (!ph) { show('t', 'Phone: 8 digits, or 0 to skip:'); return; } }
    const r = issue(tr.no, p.d.amt, 'cash', ph); p.st = 'end';
    show('t', `Recorded ${M(r.amt)}\nReceipt ${r.code}\n${ph ? 'Customer gets it by SMS.' : 'Give the code to the customer.'}\n\n0. Menu`); return; }
  case 't_pick': { const c = p.d.list[parseInt(v) - 1]; if (!c) return; p.d.c = c; p.st = 't_conf'; show('t', `${M(c.amt)} from ${mask(c.ph)} at ${hm(c.t)}\n\n1. Yes, this was my sale\n2. Not my sale\n0. Menu`); return; }
  case 't_conf': { const c = p.d.c;
    if (v === '1') { c.state = 'confirmed'; persist({kind:'claim_state', id:c.id, state:'confirmed'}).catch(() => {}); const r = issue(c.no, c.amt, 'cash', c.ph); p.st = 'end';
      show('t', `Confirmed. Receipt\n${r.code}\nsent to the customer.\n\n0. Menu`);
      if (PH.c.who === c.ph) { PH.c.st = 'end'; show('c', `SMS from Rasiti\n\n${tr.name} confirmed your\nreceipt ${r.code}\n${M(r.amt)} · +${entriesFor(r)} draw entries${tr.status === 'registered' ? '\n(double: registered seller)' : ''}\n\n0. Menu`); }
      narrate("Seller confirmed. The receipt is now in the seller's sales book and the customer has their entries."); }
    else if (v === '2') { c.state = 'rejected'; persist({kind:'claim_state', id:c.id, state:'rejected'}).catch(() => {}); log('warn', `Seller ${tr.no} rejected a receipt request of ${M(c.amt)}.`); p.st = 'end'; show('t', 'Noted. The customer is told\nyou did not confirm.\n\n0. Menu'); renderAll(); }
    return; }
  case 't_reg':
    if (v === '1') { p.st = 't_id'; show('t', 'Enter your ID number:'); }
    else if (v === '2') { tr.helper = true; persist({kind:'seller_helper', no:tr.no}).catch(() => {}); log('info', `${tr.name} asked a tax helper to call`); p.st = 'end'; show('t', 'A tax helper will call you\nwithin 2 working days.\n\n0. Menu'); renderAll(); }
    return;
  case 't_id': { if (v.replace(/\D/g, '').length < 6) { show('t', 'ID number (at least 6 digits):'); return; }
    const tin = '200-' + String(100 + Math.floor(Math.random() * 899)) + '-' + String(100 + Math.floor(Math.random() * 899));
    tr.status = 'registered'; tr.via = true; tr.tin = tin; tr.declared = null; tr.regAt = clock;
    persist({kind:'seller_register', no:tr.no, tin}).catch(() => {});
    log('ok', `${tr.name} registered through Rasiti · TIN ${tin} · customers now earn double entries`); fillSelects(); p.st = 'end';
    show('t', `Done! TIN ${tin}\nYou are a registered seller.\n\nYour customers now earn\ndouble draw entries.\nFirst return due ${dueDate()},\nprefilled from your book.\n\n0. Menu`);
    narrate(`<b>Tax net widened.</b> ${esc(tr.name)} registered from her own phone. Her customers keep their entries and now earn double, which gives them a reason to choose her stall.`); renderAll(); return; }
  case 'end': home('t'); return;
  } }

function cStep(inp) { const p = PH.c, v = String(inp).trim();
  if (v === '0' && !['c_amt', 'c_paper', 'c_place', 'c_reg0', 'c_reg_name'].includes(p.st)) { home('c'); return; }
  switch (p.st) {
  case 'c_reg0':
    if (v === '1') { p.st = 'c_reg_name'; show('c', 'Great! What is your first name?'); }
    else if (v === '2') show('c', 'Every Rasiti receipt is a free ticket in the monthly prize draw: 1 entry per M10, double at registered sellers.\nAsk for a receipt every time you buy.\n\n1. Register now');
    else show('c', REG_PROMPT);
    return;
  case 'c_reg_name': { const n = v.replace(/[^A-Za-z' -]/g, '').trim().slice(0, 30); if (!n) { show('c', 'Please type your first name:'); return; }
    S.customers[p.who] = {name:n}; log('ok', `New customer registered: ${n} (${mask(p.who)})`);
    show('c', `Thank you, ${n}! ✅ You are registered.\nYour phone number is your Rasiti ID. Ask every seller for a Rasiti receipt.`);
    p.st = 'home'; show('c', cHome()); return; }
  case 'home':
    if (v === '1') { p.st = 'c_seller'; show('c', 'Get a receipt\n\nSeller code (on the sticker):'); }
    else if (v === '2') { p.st = 'c_check'; show('c', 'Check a receipt\n\nEnter the receipt code:'); }
    else if (v === '3') { p.st = 'c_rtype'; show('c', 'Rate a shop you bought from\n\n1. I got a receipt\n2. No receipt given\n3. Charged extra for receipt\n4. Shop not on Rasiti\n5. Fake receipt\n0. Menu'); }
    else if (v === '4') { const mine = S.receipts.filter(r => r.ph === p.who && r.t >= monthStart()); const sum = s => mine.filter(r => drawStatus(r) === s).reduce((x, r) => x + entriesFor(r), 0);
      const f = drawDay(); p.st = 'end'; show('c', `My draw entries (this month)\n\nLive: ${sum('active')}\nBeing checked: ${sum('held')}\n\nNext draw: ${f.getDate()} ${MON[f.getMonth()]}\nTip: registered sellers give\ndouble entries.\n\n0. Menu`); }
    else if (v === '5') { const good = shopStats().filter(x => x.badge).slice(0, 5); p.st = 'end'; show('c', 'Shops that give receipts\n(rated by customers)\n\n' + good.map(x => '✓ ' + x.label).join('\n') + '\n\n0. Menu'); }
    return;
  case 'c_seller': { const tr = tByNo(v.replace(/\D/g, ''));
    if (!tr) { p.st = 'c_unk'; show('c', `Seller ${v} is not on Rasiti.\n\n1. Tell RSL about this seller\n0. Menu`); return; }
    p.d.no = tr.no; p.st = 'c_amt'; show('c', `${tr.name}\n${tr.market}\n\nAmount you paid (M):`); return; }
  case 'c_unk': if (v === '1') { p.d.type = 'unlisted'; askPlace(); } return;
  case 'c_amt': { const a = parseFloat(v); if (!(a > 0)) return; const tr = tByNo(p.d.no);
    const c = {id:rid(), no:tr.no, amt:a, ph:p.who, t:tick(), state:p.offline ? 'queued' : 'pending'}; S.claims.push(c);
    if (p.offline) { p.st = 'end'; show('c', 'No network.\nYour request is saved and\nwill send when the signal\nreturns.\n\n0. Menu'); log('warn', 'Customer request saved offline (no signal)'); return; }
    persist({kind:'claim', id:c.id, seller_no:c.no, amount:c.amt, phone:c.ph, state:'pending'}).catch(() => {});
    log('info', `Receipt request ${M(a)} sent to ${tr.name}`); p.st = 'end';
    show('c', `Sent to ${tr.name}.\nYou get your receipt by SMS\nwhen they confirm.\n\n0. Menu`); if (PH.t.who === tr.no && PH.t.st === 'home') show('t', tHome()); return; }
  case 'c_check': { const res = verify(v, p.who); p.d.res = res; p.st = res.genuine ? 'c_ok' : 'c_bad'; show('c', res.text); return; }
  case 'c_ok': { const r = p.d.res.r;
    if (v === '1' && !r.ph) { r.ph = p.who; reEval(); persist({kind:'receipt_phone', code:r.code, phone:p.who}).catch(() => {}); log('ok', `Receipt ${r.code} added to ${mask(p.who)}'s entries`); p.st = 'end'; show('c', `Added. +${entriesFor(r)} entries.\n\n0. Menu`); renderAll(); }
    else if (v === '1' && r.ph && r.ph !== p.who) { addFake({code:r.code, kind:'duplicate', by:p.who, detail:'Receipt already belongs to another phone. Second claim refused.'}); log('bad', `Duplicate claim refused: ${r.code}`); p.st = 'end'; show('c', 'This receipt already belongs\nto another phone. It cannot\nbe claimed twice.\n\n0. Menu'); renderAll(); }
    else if (v === '2') { p.st = 'c_paper'; show('c', 'Amount printed on your\npaper receipt (M):'); }
    return; }
  case 'c_paper': { const a = parseFloat(v); const r = p.d.res.r; if (!(a > 0)) return;
    if (Math.round(a) !== r.amt) { addFake({code:r.code, kind:'tampered', by:p.who, detail:`Paper shows ${M(a)}; the register shows ${M(r.amt)}.`}); log('bad', `Altered receipt reported: ${r.code}`);
      p.st = 'end'; show('c', `Amounts do not match.\nReal sale: ${M(r.amt)}\nYour paper: ${M(a)}\nReported to RSL. Thank you.\n\n0. Menu`); renderAll(); }
    else { p.st = 'end'; show('c', 'Amounts match. All good.\n\n0. Menu'); } return; }
  case 'c_bad': if (v === '1') { p.d.type = 'fake'; askPlace(); } return;
  case 'c_rtype': { const t = {1:'got', 2:'none', 3:'extra', 4:'unlisted', 5:'fake'}[v]; if (!t) return; p.d.type = t; askPlace(); return; }
  case 'c_place': {
    if (v === '9' && p.mode === 'wa') { shareLocation(); return; }
    if (!v) return; const no = v.replace(/\D/g, ''); let target;
    if (no.length === 4 && tByNo(no)) target = {no}; else target = matchPlace(v) || {place:'u-' + v.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60), label:v.slice(0, 100), area:guessArea(v), kind:'Informal'};
    finishRating(target, null); return; }
  case 'c_pname': { if (!v) return; const target = matchPlace(v) || {place:'u-' + v.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60), label:v.slice(0, 100), area:nearestArea(p.d.ll), kind:'Informal'}; finishRating(target, p.d.ll); return; }
  case 'end': home('c'); return;
  } }
function askPlace() { const p = PH.c; p.st = 'c_place';
  show('c', 'Which shop? Type the seller code,\nor the shop name and where it is.' + (p.mode === 'wa' ? '\n\n9. 📍 Share my location' : '')); }
function nearestArea(ll) { if (!ll) return 'Area not given'; let best = 'Area not given', bd = 1; for (const a in AREAS) { const d = Math.hypot(AREAS[a][0] - ll[0], AREAS[a][1] - ll[1]); if (d < bd) { bd = d; best = a; } } return bd < .03 ? best : 'Elsewhere in Lesotho'; }
function shareLocation() {
  const p = PH.c;
  const done = (ll, real) => { p.d.ll = ll; p.st = 'c_pname'; waMe('c', `📍 Location ${ll[0].toFixed(4)}, ${ll[1].toFixed(4)}${real ? '' : ' (demo)'}`); show('c', 'Got your location. What is the\nshop called?'); };
  const demo = () => { const keys = Object.keys(AREAS); const a = AREAS[keys[Math.floor(Math.random() * keys.length)]]; done([a[0] + (Math.random() - .5) * .003, a[1] + (Math.random() - .5) * .003], false); };
  if (navigator.geolocation) navigator.geolocation.getCurrentPosition(pos => { const ll = [pos.coords.latitude, pos.coords.longitude]; (ll[0] > -30.8 && ll[0] < -28.5 && ll[1] > 26.9 && ll[1] < 29.6) ? done(ll, true) : demo(); }, demo, {timeout:6000});
  else demo();
}
function finishRating(target, ll) { const p = PH.c; addReport(p.who, p.d.type, target, ll); p.st = 'end';
  if (p.d.type === 'got') show('c', 'Thank you.\nShops that give receipts earn a\npublic "Gives receipts" badge.\n\n0. Menu');
  else show('c', 'Thank you.\nYour number is never shown to\nthe seller. RSL acts when\nseveral customers report the\nsame shop.\n\n0. Menu'); }
function verify(raw, who) { const pc = parseCode(raw);
  if (!pc.ok && pc.why === 'format') return {genuine:false, text:'That is not a Rasiti code.\nCodes look like RS-1234-ABCD-X\n\n0. Menu'};
  if (!pc.ok) { addFake({code:pc.code, kind:'forged', by:who, detail:'Check character does not match. Rasiti never issued this code.'}); log('bad', `Forged code checked and stopped: ${pc.code}`); renderAll();
    return {genuine:false, text:`❌ NOT GENUINE\n${pc.code}\nRasiti never issued this code.\nDo not accept it.\n\n1. Report the seller\n0. Menu`}; }
  const r = S.receipts.find(x => x.code === pc.code);
  if (!r) { addFake({code:pc.code, kind:'unknown', by:who, detail:'Well-formed code that is not in the register.'}); log('bad', `Unknown code stopped: ${pc.code}`); renderAll();
    return {genuine:false, text:`❌ NOT GENUINE\n${pc.code}\nThis code is not in the\nRasiti register.\n\n1. Report the seller\n0. Menu`}; }
  const tr = tByNo(r.no);
  return {genuine:true, r, text:`✅ GENUINE\n${tr.name}\n${tr.market}\n${M(r.amt)} · ${fT(r.t)}\n${r.ph ? `Entries: ${entriesFor(r)} (${drawStatus(r)})` : 'Not linked to a phone yet'}\n\n${r.ph ? '' : '1. Add to my draw entries\n'}2. Paper amount looks wrong?\n0. Menu`}; }

function fillSelects() {
  const ts = $('#tSel'); if (!ts) return;
  ts.innerHTML = S.traders.map(t => `<option value="${t.no}">${esc(t.name)} · ${esc(t.trade)} (${t.status})</option>`).join('') + '<option value="new">Someone not on Rasiti yet</option>';
  ts.value = PH.t.who || 'new';
  $('#qrSeller').innerHTML = S.traders.map(t => `<option value="${t.no}">${esc(t.name)} · ${t.no}</option>`).join('');
  $('#cSel').innerHTML = PERSONAS.map(p => `<option value="${p.ph}">${p.name} · ${mask(p.ph)}</option>`).join(''); $('#cSel').value = PH.c.who;
}
function setT(no) { if (PH.t.who !== no) resetPhone('t', no); $('#tSel').value = no; home('t'); }
function setC(ph) { if (PH.c.who !== ph) resetPhone('c', ph); $('#cSel').value = ph; home('c'); }

/* ================= receipt card ================= */
function renderReceipt() { const r = S.lastReceipt; if (!r) return; const tr = tByNo(r.no);
  $('#receiptCard').innerHTML = `<div class="receipt"><div class="rh"><svg viewBox="0 0 176 100" role="img" aria-label="Rasiti"><use href="#rasiti-mark"/></svg></div>
    <div>${esc(tr.name)}<br>${esc(tr.trade)} · ${esc(tr.market)}</div>
    <div class="row"><span>Seller code</span><span>${tr.no}</span></div>
    <div class="row"><span>${fT(r.t)}</span><span>${r.ch === 'momo' ? 'Mobile money' : 'Cash'}</span></div>
    <div class="row" style="font-weight:600;font-size:.9rem;margin-top:4px"><span>TOTAL</span><span>${M(r.amt)}.00</span></div>
    <canvas width="21" height="21" id="qrc" aria-label="Pattern standing in for a QR code"></canvas>
    <div class="code">${r.code}</div>
    <div class="row"><span>Draw entries</span><span>${entriesFor(r)} · ${drawStatus(r)}</span></div>
    <div class="foot">Check it: dial *999#, or WhatsApp Rasiti<br>QR pattern is illustrative</div></div>`;
  const c = $('#qrc').getContext('2d'); const rr = mulberry32(hashStr(r.code));
  c.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--paper-ink').trim() || '#222';
  for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) { const f = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
    if (f) { const ax = x > 13 ? x - 14 : x, ly = y > 13 ? y - 14 : y; if (Math.max(Math.abs(ax - 3), Math.abs(ly - 3)) !== 2) c.fillRect(x, y, 1, 1); } else if (rr() < .5) c.fillRect(x, y, 1, 1); } }
function renderFeed() { $('#feed').innerHTML = S.feed.slice(0, 40).map(f => `<li><time>${hm(f.t)}</time><span><span class="k-${f.kind}">●</span> ${esc(f.text)}</span></li>`).join('') || '<li><span></span><span class="note">Nothing yet.</span></li>'; }

/* ================= Fraud Shield view ================= */
const STATEPILL = {clear:'<span class="pill p-ok">Clear</span>', approved:'<span class="pill p-ok">Approved</span>', held:'<span class="pill p-warn">Held for review</span>', blocked:'<span class="pill p-bad">Blocked</span>', rejected:'<span class="pill p-bad">Rejected</span>'};
const FAKEPILL = {forged:'Forged code', unknown:'Not in register', tampered:'Altered amount', duplicate:'Claimed twice'};
function renderShield() {
  fillSel('#sfSeller', [['all', 'All sellers'], ...S.traders.map(t => [t.no, `${t.name} (${t.no})`])], SF.seller);
  fillSel('#sfRule', [['all', 'All rules'], ...RULES.map(r => [r.id, r.name])], SF.rule);
  const all = shieldRows(); $('#sfNote').textContent = 'Showing: ' + shieldLabel() + '. Counts and the receipt list follow these filters.'; const st = r => shieldState(r); const n = s => all.filter(r => st(r) === s).length;
  $('#shieldKpis').innerHTML = [[all.length.toLocaleString('en-US'), 'Receipts scored'], [n('clear') + n('approved'), 'Clear'], [n('held'), 'Held for an officer'], [n('blocked') + n('rejected'), 'Blocked from the draw'], [S.fakes.length, 'Fake or misused codes stopped']].map(kpi).join('');
  const hits = {}; for (const c in S.eval) S.eval[c].flags.forEach(f => hits[f.id] = (hits[f.id] || 0) + 1);
  $('#rulesTbl').innerHTML = '<tr><th>Rule</th><th class="num">Points</th><th class="num">Hits</th></tr>' + RULES.map(r => `<tr><td><b>${r.name}</b><div class="note">${r.what}</div></td><td class="num">${r.pts}</td><td class="num">${hits[r.id] || 0}</td></tr>`).join('') +
    '<tr><td colspan="3" class="note">Every code a customer enters is also checked: the check character, the register, the amount on paper, and whether another phone already claimed it.</td></tr>';
  $('#fakesTbl').innerHTML = '<tr><th>When</th><th>Code</th><th>What happened</th></tr>' + S.fakes.slice().sort((a, b) => b.t - a.t).slice(0, 30).map(f => `<tr><td class="mono">${fT(f.t)}</td><td class="mono">${esc(f.code)}</td><td><span class="pill p-bad">${FAKEPILL[f.kind]}</span><div class="note">${esc(f.detail)}</div></td></tr>`).join('');
  const F = [['all', 'Flagged'], ['held', 'Held'], ['blocked', 'Blocked'], ['live', 'Latest'], ['every', 'All receipts']];
  $('#streamFilters').innerHTML = F.map(f => `<button type="button" data-f="${f[0]}" aria-pressed="${S.filter === f[0]}">${f[1]}</button>`).join('');
  const rows = shieldStreamRows(all);
  const shown = rows.slice(0, 60);
  $('#streamTbl').innerHTML = '<tr><th>Receipt</th><th>Seller</th><th class="num">Amount</th><th>Phone</th><th>Score</th><th>Why</th></tr>' + shown.map(r => { const e = S.eval[r.code]; const tr = tByNo(r.no) || {name:r.no};
    return `<tr${r.live ? ' class="flash"' : ''}><td class="mono">${r.code}<div class="note">${fT(r.t)}</div></td><td>${esc(tr.name)}</td><td class="num">${M(r.amt)}</td><td class="mono">${mask(r.ph)}</td><td>${STATEPILL[st(r)]}<div class="note">${e.score} pts</div></td><td>${e.flags.map(f => `<span class="flag">${RULE[f.id].name}</span>`).join('')}${e.flags.length ? '<ul class="why">' + e.flags.map(f => `<li>${esc(f.why)}</li>`).join('') + '</ul>' : '<span class="note">No rule fired</span>'}${r.note ? `<div class="note">Officer hint: ${esc(r.note)}</div>` : ''}</td></tr>`; }).join('') + (shown.length ? '' : '<tr><td colspan="6" class="note">Nothing in this filter.</td></tr>');
  $('#streamNote').textContent = rows.length > 60 ? `Showing 60 of ${rows.length}.` : '';
}
const kpi = k => `<div class="kpi"><div class="v">${k[0]}</div><div class="l">${k[1]}</div></div>`;
function runTest(seedv) {
  const r = mulberry32(seedv); const sellers = []; const list = []; const truth = {};
  for (let i = 0; i < 25; i++) sellers.push({no:String(8000 + i), ph:randPhone(r), avg:15 + Math.floor(r() * 135), perDay:1 + Math.floor(r() * 11), pool:Array.from({length:35}, () => randPhone(r))});
  const T0 = Date.now(); let k = 0; const code = no => `T-${no}-${k++}`;
  for (const s of sellers) for (let d = 59; d >= 0; d--) { const n = Math.round(s.perDay * (0.55 + 0.9 * r())); for (let i = 0; i < n; i++) {
    const c = code(s.no); list.push({code:c, no:s.no, amt:Math.max(2, Math.round(s.avg * (0.4 + 1.2 * r()))), ph:r() < .9 ? s.pool[Math.floor(r() * 35)] : randPhone(r), t:T0 - d * DAY - 4 * 3600000 + Math.floor(r() * 11 * 3600000)}); truth[c] = {type:'genuine'}; } }
  const ev = []; const pick = () => sellers[Math.floor(r() * 25)];
  const plant = (type, n, fn) => { for (let i = 0; i < n; i++) { const id = type + i; ev.push({id, type}); fn(id, i); } };
  plant('self', 20, id => { const s = pick(); const c = code(s.no); list.push({code:c, no:s.no, amt:Math.round(s.avg * (1 + r())), ph:s.ph, t:T0 - Math.floor(r() * 29) * DAY}); truth[c] = {type:'self', ev:id}; });
  plant('velocity', 20, id => { const s = pick(); const p = randPhone(r); const t0 = T0 - Math.floor(r() * 29) * DAY - 2 * 3600000; const n = 6 + Math.floor(r() * 4); for (let j = 0; j < n; j++) { const c = code(s.no); list.push({code:c, no:s.no, amt:Math.round(s.avg * (0.5 + r())), ph:p, t:t0 + j * Math.floor(5 + r() * 40) * MIN}); truth[c] = {type:'velocity', ev:id}; } });
  plant('split', 15, id => { const s = pick(); const p = randPhone(r); const t0 = T0 - Math.floor(r() * 29) * DAY - 3 * 3600000; for (let j = 0; j < 4; j++) { const c = code(s.no); list.push({code:c, no:s.no, amt:5 + Math.floor(r() * 5), ph:p, t:t0 + j * 3 * MIN}); truth[c] = {type:'split', ev:id}; } });
  plant('ring', 10, (id, i) => { const s = sellers[(i * 3 + 1) % 25]; const ps = [randPhone(r), randPhone(r), randPhone(r)]; const per = 5 + Math.floor(r() * 10); for (const p of ps) for (let j = 0; j < per; j++) { const c = code(s.no); list.push({code:c, no:s.no, amt:Math.round(s.avg * (1 + r())), ph:p, t:T0 - Math.floor(r() * 28) * DAY - 3600000}); truth[c] = {type:'ring', ev:id}; } });
  plant('bulk', 15, id => { const s = pick(); const c = code(s.no); list.push({code:c, no:s.no, amt:Math.max(320, Math.round(s.avg * (7 + r() * 5))), ph:s.pool[0], t:T0 - Math.floor(r() * 29) * DAY}); truth[c] = {type:'bulk', ev:id}; });
  const tp = {}; sellers.forEach(s => tp[s.no] = s.ph); const res = evaluate(list, tp, T0 + DAY);
  const caught = {}; for (const c in truth) { const t = truth[c]; if (t.ev && res[c].state !== 'clear') caught[t.ev] = 1; }
  const types = [['self', 'Seller buying from own phone'], ['velocity', 'One phone farming entries'], ['split', 'Purchase split into tiny receipts'], ['ring', 'Group of new heavy buyers']];
  let rows = '', tot = 0, got = 0;
  for (const [t, l] of types) { const es = ev.filter(e => e.type === t); const c = es.filter(e => caught[e.id]).length; tot += es.length; got += c; rows += `<tr><td>${l}</td><td class="num">${es.length}</td><td class="num">${c}</td><td class="num">${es.length - c}</td><td class="num">${Math.round(c / es.length * 100)}%</td></tr>`; }
  const gen = Object.keys(truth).filter(c => truth[c].type === 'genuine'); const gf = gen.filter(c => res[c].state !== 'clear').length;
  const bulk = ev.filter(e => e.type === 'bulk'); const bh = bulk.filter(e => caught[e.id]).length;
  $('#testOut').innerHTML = `<div class="kpis">${[[list.length.toLocaleString('en-US'), 'Synthetic receipts'], [`${got}/${tot}`, `Fraud cases caught (${Math.round(got / tot * 100)}%)`], [gf, `Ordinary receipts wrongly flagged (${(gf / gen.length * 100).toFixed(2)}%)`], [`${bh}/${bulk.length}`, 'Genuine bulk buys sent to an officer']].map(kpi).join('')}</div>
    <div class="tbl-wrap"><table><tr><th>Planted pattern</th><th class="num">Cases</th><th class="num">Caught</th><th class="num">Missed</th><th class="num">Rate</th></tr>${rows}</table></div>
    <p class="note">Seed ${seedv}. Genuine bulk purchases are planted on purpose: the Shield holds them for a person instead of rejecting them. Groups whose members buy fewer than 8 times a month slip under the threshold, which is a setting to tune in the pilot.</p>`;
  $('#runTest2').hidden = false;
}

/* ================= maps ================= */
const MAPS = {};
const SIGCOL = {good:'#1d9e57', mid:'#3b82f6', low:'#f0a020', lead:'#d93025', few:'#9aa0ad'};
function getMap(id) {
  if (!window.L) { const el = $('#' + id); if (el && !el.dataset.nomap) { el.dataset.nomap = 1; el.innerHTML = '<div class="map-note">Map library did not load</div>'; } return null; }
  if (MAPS[id]) return MAPS[id];
  const el = $('#' + id); if (!el || el.offsetParent === null) return null;
  const map = L.map(el, {scrollWheelZoom:false, zoomControl:true}).setView(CENTER, 13);
  const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {maxZoom:19, attribution:'Imagery © Esri, Maxar, Earthstar Geographics'});
  const labels = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {maxZoom:19});
  const streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19, attribution:'© OpenStreetMap contributors'});
  const satGroup = L.layerGroup([sat, labels]).addTo(map);
  L.control.layers({'Satellite':satGroup, 'Streets':streets}, null, {position:'topright'}).addTo(map);
  let errs = 0; sat.on('tileerror', () => { if (++errs === 4) { const n = document.createElement('div'); n.className = 'map-note'; n.textContent = 'Satellite imagery is blocked here. It loads on the hosted site.'; el.appendChild(n); } });
  const layer = L.layerGroup().addTo(map);
  MAPS[id] = {map, layer};
  return MAPS[id];
}
function renderLeadMap(wl) {
  const m = getMap('leadMap'); if (!m) return; m.layer.clearLayers();
  for (const i of wl) { if (!i.ll) continue; const col = i.pri >= 3 ? '#d93025' : i.pri === 2 ? '#f0a020' : '#9aa0ad';
    L.circleMarker(i.ll, {radius:9, color:'#fff', weight:2, fillColor:col, fillOpacity:1}).bindPopup(`<b>${esc(i.subj.name)}</b>${esc(i.act)}`).addTo(m.layer); }
  setTimeout(() => m.map.invalidateSize(), 50);
}

/* ================= Community watch: analytics ================= */
const WF = {days:30, area:'all', who:'all', sig:'all', ctype:'all'};
const WA = {last:null, busy:false};
const repArea = r => { if (r.target.no) { const t = tByNo(r.target.no); return t ? t.market : null; } return r.target.area || 'Area not given'; };
function watchReports(f) { f = f || {days:30, area:'all', who:'all'}; const spam = spamPhones(); const from = clock - f.days * DAY;
  return S.reports.filter(r => r.t >= from && !spam.has(r.ph) && (!r.target.no || tByNo(r.target.no)) && (f.area === 'all' || repArea(r) === f.area) && (f.who === 'all' || (f.who === 'on') === !!r.target.no)); }
function shopStats(f) { const by = {};
  for (const r of watchReports(f)) { const k = r.target.no ? 'T' + r.target.no : 'P' + r.target.place; const tr = r.target.no && tByNo(r.target.no);
    const e = by[k] = by[k] || {label:tr ? `${tr.name} · ${tr.trade}` : r.target.label, area:repArea(r), on:!!tr, kind:tr ? 'On Rasiti' : (r.target.kind || 'Informal'), got:0, neg:0, people:new Set(), negP:new Set(), lls:[], tr, types:{}};
    if (r.type === 'got') e.got++; else { e.neg++; e.negP.add(r.ph); } e.types[r.type] = (e.types[r.type] || 0) + 1; e.people.add(r.ph); if (r.lat != null) e.lls.push([r.lat, r.lng]); }
  return Object.values(by).map(e => { const n = e.got + e.neg; const rate = e.people.size >= 3 ? e.got / n : null;
    const sig = rate === null ? 'few' : (!e.on && e.negP.size >= 3) ? 'lead' : rate >= .8 ? 'good' : rate < .5 ? 'low' : 'mid';
    const ll = e.tr ? traderLL(e.tr) : e.lls.length ? [e.lls.reduce((a, x) => a + x[0], 0) / e.lls.length, e.lls.reduce((a, x) => a + x[1], 0) / e.lls.length] : null;
    return {...e, n, rate, sig, badge:sig === 'good', ll}; }).sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1)); }
const SIG = {good:'<span class="pill p-ok">Gives receipts</span>', mid:'<span class="pill p-info">Mixed</span>', low:'<span class="pill p-warn">Low receipts</span>', lead:'<span class="pill p-bad">New lead</span>', few:'<span class="pill p-mute">Too few to judge</span>'};
const SIGTXT = {good:'Gives receipts', mid:'Mixed', low:'Low receipts', lead:'New lead, not on Rasiti', few:'Too few to judge'};
const REPSHORT = {got:'Gave a receipt', none:'No receipt', extra:'Charged extra', unlisted:'Not on Rasiti', fake:'Fake receipt'};
const HOURS = [['6–9', 6, 9], ['9–12', 9, 12], ['12–15', 12, 15], ['15–18', 15, 18], ['18–21', 18, 21], ['Night', 21, 30]];
const pct = (a, b) => b ? Math.round(a / b * 100) : null;
function watchData(f) {
  f = f || WF; const rs = watchReports(f); const st = shopStats(f);
  const d0 = new Date(clock); d0.setHours(0, 0, 0, 0); const first = d0.getTime() - (f.days - 1) * DAY;
  const days = Array.from({length:f.days}, (_, i) => ({t:first + i * DAY, got:0, no:0}));
  for (const r of rs) { const i = Math.floor((r.t - first) / DAY); if (i >= 0 && i < f.days) days[i][r.type === 'got' ? 'got' : 'no']++; }
  const types = Object.keys(REPTYPE).map(k => ({k, label:REPTYPE[k], n:rs.filter(r => r.type === k).length}));
  const hours = HOURS.map(([label]) => ({label, got:0, no:0}));
  for (const r of rs) { const h = new Date(r.t).getHours(); const i = h < 6 || h >= 21 ? 5 : HOURS.findIndex(x => h >= x[1] && h < x[2]); hours[i][r.type === 'got' ? 'got' : 'no']++; }
  hours.forEach(h => h.missed = pct(h.no, h.got + h.no));
  const half = clock - f.days * DAY / 2; const ar = {};
  for (const x of st) { const a = ar[x.area] = ar[x.area] || {area:x.area, shops:0, off:0, n:0, got:0, leads:0, low:0, good:0}; a.shops++; if (!x.on) a.off++; a.n += x.n; a.got += x.got; if (x.sig === 'lead') a.leads++; if (x.sig === 'low') a.low++; if (x.sig === 'good') a.good++; }
  for (const r of rs) { const a = ar[repArea(r)]; if (!a) continue; const k = r.t < half ? 'p1' : 'p2'; a[k + 'n'] = (a[k + 'n'] || 0) + 1; if (r.type === 'got') a[k + 'g'] = (a[k + 'g'] || 0) + 1; }
  const areas = Object.values(ar).map(a => ({...a, rate:pct(a.got, a.n), early:pct(a.p1g || 0, a.p1n || 0), late:pct(a.p2g || 0, a.p2n || 0)})).sort((a, b) => a.rate - b.rate);
  const got = rs.filter(r => r.type === 'got').length; const early = rs.filter(r => r.t < half), late = rs.filter(r => r.t >= half);
  const kp = {ratings:rs.length, people:new Set(rs.map(r => r.ph)).size, shops:st.length, off:st.filter(x => !x.on).length, leads:st.filter(x => x.sig === 'lead').length, rate:pct(got, rs.length),
    early:pct(early.filter(r => r.type === 'got').length, early.length), late:pct(late.filter(r => r.type === 'got').length, late.length)};
  return {f:{...f}, rs, st, days, types, hours, areas, kp};
}
const fLabel = f => `Last ${f.days} days · ${f.area === 'all' ? 'all areas' : f.area} · ${f.who === 'all' ? 'all shops' : f.who === 'on' ? 'Rasiti sellers only' : 'shops not on Rasiti only'}`;

/* ---- charts (SVG strings; one builder for screen and PDF) ---- */
const PAL = {light:{got:'#2a78d6', no:'#eb6834', bar:'#2a78d6', ink:'#1a1b2e', muted:'#5f6475', grid:'#e6e7ec', surf:'#ffffff'},
  dark:{got:'#3987e5', no:'#d95926', bar:'#3987e5', ink:'#eceef4', muted:'#a3a7b9', grid:'#2d2f44', surf:'#1a1b2a'}};
const isDark = () => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim().toLowerCase() === '#11121c';
const svgOpen = (W, H, p) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Inter, Arial, sans-serif" role="img"><rect width="${W}" height="${H}" fill="${p.surf}"/>`;
const barPath = (x, y, w, h, r) => { r = Math.min(r, w / 2, h); return h <= 0 ? '' : `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`; };
function niceMax(v) { if (v <= 5) return 5; const p = Math.pow(10, Math.floor(Math.log10(v))); for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p; return v; }
function chartDaily(days, p, W) { W = W || 640; const H = 230, L = 34, R = 10, T = 34, B = 28; const cw = W - L - R, ch = H - T - B;
  const mx = niceMax(Math.max(1, ...days.map(d => d.got + d.no))); const bw = cw / days.length; const g = Math.max(1, Math.min(4, bw * .25));
  let s = svgOpen(W, H, p);
  s += `<rect x="${L}" y="8" width="10" height="10" rx="2" fill="${p.got}"/><text x="${L + 15}" y="17" font-size="11.5" fill="${p.ink}">Got a receipt</text><rect x="${L + 112}" y="8" width="10" height="10" rx="2" fill="${p.no}"/><text x="${L + 127}" y="17" font-size="11.5" fill="${p.ink}">No receipt or a problem</text>`;
  for (let i = 0; i <= 2; i++) { const v = mx * i / 2, y = T + ch - ch * i / 2; s += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="${p.grid}"/><text x="${L - 6}" y="${y + 4}" font-size="10.5" text-anchor="end" fill="${p.muted}">${v}</text>`; }
  days.forEach((d, i) => { const x = L + i * bw + g / 2, w = bw - g; const hg = ch * d.got / mx, hn = ch * d.no / mx; const yb = T + ch;
    if (hg) s += `<path d="${hg && !hn ? barPath(x, yb - hg, w, hg, 3) : `M${x},${yb}V${yb - hg}H${x + w}V${yb}Z`}" fill="${p.got}"/>`;
    if (hn) s += `<path d="${barPath(x, yb - hg - hn - (hg ? 2 : 0), w, hn, 3)}" fill="${p.no}"/>`;
    s += `<rect x="${L + i * bw}" y="${T}" width="${bw}" height="${ch}" fill="transparent" data-tip="${esc(fD(d.t))}: ${d.got + d.no} ratings · ${d.got} got a receipt · ${d.no} no receipt or a problem"/>`;
    const step = days.length > 20 ? 7 : days.length > 10 ? 3 : 1; if (i % step === 0 || i === days.length - 1 && days.length <= 10) s += `<text x="${x + w / 2}" y="${H - 9}" font-size="10.5" text-anchor="middle" fill="${p.muted}">${esc(fD(d.t))}</text>`; });
  return s + '</svg>'; }
function chartHBars(items, p, W, fmt) { W = W || 420; const rowH = 30, T = 6, H = T + items.length * rowH + 4, LW = Math.min(190, W * .42), R = 44; const mx = Math.max(1, ...items.map(i => i.v));
  let s = svgOpen(W, H, p);
  items.forEach((it, i) => { const y = T + i * rowH; const w = (W - LW - R) * it.v / mx;
    s += `<text x="${LW - 8}" y="${y + 18}" font-size="11.5" text-anchor="end" fill="${p.ink}">${esc(it.label)}</text><rect x="${LW}" y="${y + 6}" width="${W - LW - R}" height="16" rx="3" fill="${p.grid}" opacity=".45"/>`;
    if (w > 0) s += `<path d="M${LW},${y + 6}H${LW + w - 3}Q${LW + w},${y + 6} ${LW + w},${y + 9}V${y + 19}Q${LW + w},${y + 22} ${LW + w - 3},${y + 22}H${LW}Z" fill="${p.bar}"/>`;
    s += `<text x="${LW + w + 6}" y="${y + 18}" font-size="11.5" font-weight="600" fill="${p.ink}">${fmt ? fmt(it.v) : it.v}</text><rect x="0" y="${y}" width="${W}" height="${rowH}" fill="transparent" data-tip="${esc(it.tip || it.label + ': ' + it.v)}"/>`; });
  return s + '</svg>'; }
function chartHours(hours, p, W) { W = W || 420; const H = 220, L = 34, R = 8, T = 14, B = 30; const cw = W - L - R, ch = H - T - B; const bw = cw / hours.length;
  let s = svgOpen(W, H, p);
  for (let i = 0; i <= 2; i++) { const y = T + ch - ch * i / 2; s += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="${p.grid}"/><text x="${L - 6}" y="${y + 4}" font-size="10.5" text-anchor="end" fill="${p.muted}">${i * 50}%</text>`; }
  hours.forEach((h, i) => { const x = L + i * bw + bw * .18, w = bw * .64, v = h.missed ?? 0, hh = ch * v / 100;
    if (hh) s += `<path d="${barPath(x, T + ch - hh, w, hh, 4)}" fill="${p.no}"/>`;
    if (h.got + h.no) s += `<text x="${x + w / 2}" y="${T + ch - hh - 5}" font-size="10.5" text-anchor="middle" fill="${p.ink}" font-weight="600">${h.missed}%</text>`;
    s += `<text x="${x + w / 2}" y="${H - 10}" font-size="10.5" text-anchor="middle" fill="${p.muted}">${h.label}</text><rect x="${L + i * bw}" y="${T}" width="${bw}" height="${ch}" fill="transparent" data-tip="${h.label}: ${h.got + h.no} ratings · ${h.missed ?? 0}% had no receipt or a problem"/>`; });
  return s + '</svg>'; }
function chartSchematic(st, p, W) { W = W || 640; const H = Math.round(W * .62); const pts = st.filter(x => x.ll); const all = [...pts.map(x => x.ll), ...Object.values(AREAS)];
  const la = all.map(x => x[0]), lo = all.map(x => x[1]); const a0 = Math.min(...la) - .004, a1 = Math.max(...la) + .004, o0 = Math.min(...lo) - .006, o1 = Math.max(...lo) + .006;
  const X = v => 20 + (v - o0) / (o1 - o0) * (W - 40), Y = v => 20 + (a1 - v) / (a1 - a0) * (H - 40);
  let s = svgOpen(W, H, p) + `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" fill="none" stroke="${p.grid}"/>`;
  for (const [n, c] of Object.entries(AREAS)) s += `<circle cx="${X(c[1])}" cy="${Y(c[0])}" r="26" fill="${p.grid}" opacity=".5"/><text x="${X(c[1])}" y="${Y(c[0]) - 30}" font-size="10.5" text-anchor="middle" fill="${p.muted}">${esc(n)}</text>`;
  for (const x of pts) s += `<circle cx="${X(x.ll[1])}" cy="${Y(x.ll[0])}" r="5.5" fill="${SIGCOL[x.sig]}" stroke="#fff" stroke-width="2"/>`;
  let lx = 14; for (const k of ['good', 'mid', 'low', 'lead', 'few']) { s += `<circle cx="${lx + 5}" cy="${H - 14}" r="5" fill="${SIGCOL[k]}" stroke="#fff" stroke-width="1.5"/><text x="${lx + 14}" y="${H - 10}" font-size="10.5" fill="${p.ink}">${SIGTXT[k].split(',')[0]}</text>`; lx += 30 + SIGTXT[k].split(',')[0].length * 6; }
  return s + '</svg>'; }

/* ---- maps ---- */
function renderWatchMaps(a) {
  const sel = a.st.filter(x => WF.sig === 'all' || x.sig === WF.sig);
  const m = getMap('watchMap'); if (m) { m.layer.clearLayers();
    for (const x of sel) { if (!x.ll) continue;
      L.circleMarker(x.ll, {radius:x.on ? 8 : 7, color:'#fff', weight:2, fillColor:SIGCOL[x.sig], fillOpacity:1}).bindPopup(`<b>${esc(x.label)}</b>${esc(x.kind)} · ${esc(x.area)}<br>${x.n} ratings from ${x.people.size} people<br>${x.rate === null ? 'Too few ratings to judge' : Math.round(x.rate * 100) + '% got a receipt'}`).addTo(m.layer); }
    setTimeout(() => m.map.invalidateSize(), 50); }
  const h = getMap('hotMap'); if (h) { h.layer.clearLayers();
    for (const r of a.rs) { if (r.type === 'got' || (WF.ctype !== 'all' && r.type !== WF.ctype)) continue; let ll = r.lat != null ? [r.lat, r.lng] : null;
      if (!ll && r.target.no) { const t = tByNo(r.target.no); const b = t && traderLL(t); if (b) { const j = hashStr(r.id); ll = [b[0] + ((j % 100) - 50) / 90000, b[1] + (((j >> 8) % 100) - 50) / 90000]; } }
      if (!ll) continue;
      L.circleMarker(ll, {radius:6, stroke:false, fillColor:'#eb6834', fillOpacity:.35}).bindPopup(`<b>${esc(REPTYPE[r.type])}</b>${esc(r.target.no ? tByNo(r.target.no).name : r.target.label)}<br>${fT(r.t)}`).addTo(h.layer); }
    if (!h.fitted) { h.fitted = true; h.map.fitBounds(L.latLngBounds(Object.values(AREAS)).pad(.15)); }
    setTimeout(() => h.map.invalidateSize(), 50); }
  const am = getMap('areaMap'); if (am) { am.layer.clearLayers();
    for (const x of a.areas) { const c = AREAS[x.area]; if (!c || x.rate == null) continue; const col = x.rate >= 80 ? '#1d9e57' : x.rate < 50 ? '#f0a020' : '#3b82f6';
      L.circle(c, {radius:140 + x.n * 5, color:'#fff', weight:2, fillColor:col, fillOpacity:.45}).bindTooltip(`${x.rate}%`, {permanent:true, direction:'center', className:'area-tip'})
        .bindPopup(`<b>${esc(x.area)}</b>${x.n} ratings · ${x.rate}% got a receipt<br>${x.shops} shops, ${x.off} not on Rasiti, ${x.leads} new leads<br>First half of period: ${x.early ?? '–'}% · second half: ${x.late ?? '–'}%`).addTo(am.layer); }
    if (!am.fitted) { am.fitted = true; am.map.fitBounds(L.latLngBounds(Object.values(AREAS)).pad(.15)); }
    setTimeout(() => am.map.invalidateSize(), 50); }
}

/* ---- page ---- */
function renderWatch() {
  if (!$('#wfArea')) return;
  const areas = [...new Set(S.reports.map(repArea).filter(Boolean))].sort();
  const opt = (v, l, cur) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(l)}</option>`;
  $('#wfArea').innerHTML = opt('all', 'All areas', WF.area) + areas.map(x => opt(x, x, WF.area)).join('');
  if (WF.area !== 'all' && !areas.includes(WF.area)) WF.area = 'all';
  const a = watchData(); const k = a.kp;
  const trend = k.early != null && k.late != null ? (k.late - k.early) : null;
  $('#watchKpis').innerHTML = [[k.ratings, 'Shop ratings'], [k.people, 'People taking part'], [k.shops, 'Shops seen'], [k.off, 'Shops not on Rasiti'], [(k.rate ?? '–') + '%', 'Purchases with a receipt'],
    [trend == null ? '–' : (trend > 0 ? '+' : '') + trend + ' pts', 'Change: 2nd half vs 1st half']].map(kpi).join('');
  $('#wfNote').textContent = fLabel(WF) + '. Ratings from phones flagged as spam are left out.';
  const p = PAL[isDark() ? 'dark' : 'light'];
  const cw = id => Math.max(300, Math.round($(id).clientWidth || 0)) || 600;
  $('#chDaily').innerHTML = chartDaily(a.days, p, cw('#chDaily'));
  $('#chTypes').innerHTML = chartHBars(a.types.map(t => ({label:REPSHORT[t.k], v:t.n, tip:`${t.label}: ${t.n} (${pct(t.n, k.ratings) ?? 0}% of ratings)`})), p, cw('#chTypes'));
  $('#chHours').innerHTML = chartHours(a.hours, p, cw('#chHours'));
  $('#areaTbl').innerHTML = '<tr><th>Area</th><th class="num">Shops</th><th class="num">Not on Rasiti</th><th>Got a receipt</th><th class="num">Change</th><th class="num">Leads</th></tr>' + a.areas.map(x => { const pc = x.rate ?? 0; const ch = x.early != null && x.late != null && x.p1n >= 3 && x.p2n >= 3 ? x.late - x.early : null;
    return `<tr><td>${esc(x.area)}<div class="note">${x.n} ratings</div></td><td class="num">${x.shops}</td><td class="num">${x.off}</td><td style="min-width:130px"><div class="fn" style="grid-template-columns:1fr 40px"><span class="bar"><i style="width:${pc}%;background:${pc >= 80 ? 'var(--green)' : pc < 50 ? 'var(--warn)' : 'var(--accent)'}"></i></span><b>${pc}%</b></div></td><td class="num">${ch == null ? '–' : (ch > 0 ? '▲ +' : ch < 0 ? '▼ ' : '') + ch}</td><td class="num">${x.leads}</td></tr>`; }).join('') || '<tr><td>No ratings match these filters.</td></tr>';
  const F = [['all', 'All'], ['lead', 'New leads'], ['low', 'Low receipts'], ['mid', 'Mixed'], ['good', 'Gives receipts']];
  $('#shopFilters').innerHTML = F.map(f => `<button type="button" data-sf="${f[0]}" aria-pressed="${WF.sig === f[0]}">${f[1]}</button>`).join('');
  const shops = a.st.filter(x => WF.sig === 'all' || x.sig === WF.sig);
  $('#shopTbl').innerHTML = '<tr><th>Shop</th><th>Type</th><th class="num">People</th><th class="num">Got receipt</th><th>Signal</th></tr>' + shops.map(x => `<tr><td>${esc(x.label)}<div class="note">${esc(x.area)}</div></td><td>${esc(x.kind)}</td><td class="num">${x.people.size}</td><td class="num">${x.rate === null ? '–' : Math.round(x.rate * 100) + '%'}</td><td>${SIG[x.sig]}</td></tr>`).join('') || '<tr><td>No shops match these filters.</td></tr>';
  const latest = a.rs.slice().sort((x, y) => y.t - x.t).slice(0, 40);
  $('#rateTbl').innerHTML = '<tr><th>When</th><th>Shop</th><th>Area</th><th>Rating</th><th>Customer</th></tr>' + latest.map(r => `<tr><td style="white-space:nowrap">${fT(r.t)}</td><td>${esc(r.target.no ? tByNo(r.target.no).name : r.target.label)}</td><td>${esc(repArea(r))}</td><td>${r.type === 'got' ? '<span class="pill p-ok">Gave a receipt</span>' : `<span class="pill p-warn">${esc(REPTYPE[r.type])}</span>`}</td><td class="note">${mask(r.ph)}</td></tr>`).join('');
  $('#rateCount').textContent = a.rs.length > 40 ? `Latest 40 of ${a.rs.length}. Download the CSV for all of them.` : `${a.rs.length} ratings.`;
  if (currentView() === 'watch') renderWatchMaps(a);
}

/* ---- Bohlale as the data analyst ---- */
const WA_TASKS = [
  {id:'w_sum', label:'Summarise this view', ask:'Summarise what this data shows, like a data analyst would: the main numbers, the trend, the best and worst areas, and anything unusual.'},
  {id:'w_act', label:'Where should RSL act first?', ask:'Based on this data, where should RSL act first (visits, invitations, education), and why? Rank up to 5 actions.'},
  {id:'w_cmp', label:'Compare areas', ask:'Compare the areas: which improved, which got worse between the first and second half of the period, and what might explain it?'},
  {id:'w_time', label:'Explain the time of day pattern', ask:'Explain the time-of-day pattern for purchases without a receipt, and suggest when tax helpers should visit.'}
];
function watchContext(a) {
  return {view:'Community watch analytics', filters:fLabel(a.f), today:new Date(clock).toDateString(), kpis:{...a.kp, rate_change_points:a.kp.early != null && a.kp.late != null ? a.kp.late - a.kp.early : null},
    explain:{rate:'% of ratings where the customer got a receipt', early:'receipt rate in first half of the period', late:'receipt rate in second half', leads:'shops not on Rasiti with 3+ different customers reporting no receipt'},
    daily:a.days.map(d => ({date:fD(d.t), got_receipt:d.got, no_receipt_or_problem:d.no})),
    rating_types:a.types.map(t => ({type:t.label, count:t.n})), time_of_day:a.hours.map(h => ({hours:h.label, ratings:h.got + h.no, pct_without_receipt:h.missed})),
    areas:a.areas.map(x => ({area:x.area, shops:x.shops, not_on_rasiti:x.off, ratings:x.n, receipt_rate_pct:x.rate, first_half_pct:x.early, second_half_pct:x.late, new_leads:x.leads, low_receipt_shops:x.low, badge_shops:x.good})),
    shops:a.st.slice(0, 40).map(x => ({shop:x.label, area:x.area, on_rasiti:x.on, people:x.people.size, ratings:x.n, receipt_rate_pct:x.rate == null ? null : Math.round(x.rate * 100), signal:SIGTXT[x.sig]})),
    note:'Mock data for the RSL Taxathon demo. Customer phone numbers are not included.'};
}
function watchTemplate(task, a) {
  const k = a.kp, L = []; const ar = a.areas.filter(x => x.rate != null && x.n >= 5);
  const worst = ar[0], best = ar[ar.length - 1]; const tr = k.early != null && k.late != null ? k.late - k.early : null;
  const hrs = a.hours.filter(h => h.got + h.no >= 5).sort((x, y) => y.missed - x.missed); const top = a.types.filter(t => t.k !== 'got').sort((x, y) => y.n - x.n)[0];
  const leads = a.st.filter(x => x.sig === 'lead'), low = a.st.filter(x => x.sig === 'low');
  if (!k.ratings) return 'No ratings match these filters. Widen the period or choose all areas.';
  if (task === 'w_sum' || task === 'ask') {
    L.push(`**Summary** (${fLabel(a.f)})`, '', `- ${k.ratings} ratings from ${k.people} people about ${k.shops} shops.`, `- **${k.rate}%** of purchases came with a receipt${tr != null ? `, ${tr > 0 ? 'up' : tr < 0 ? 'down' : 'no change'} ${tr ? Math.abs(tr) + ' points ' : ''}from the first half of the period to the second` : ''}.`);
    if (worst && best && worst !== best) L.push(`- Lowest area: **${worst.area}** (${worst.rate}%). Highest: **${best.area}** (${best.rate}%).`);
    if (top && top.n) L.push(`- Most common problem: ${top.label.toLowerCase()} (${top.n} ratings).`);
    if (hrs[0]) L.push(`- Receipts are missed most at ${hrs[0].label === 'Night' ? 'night' : hrs[0].label + 'h'} (${hrs[0].missed}% without a receipt).`);
    L.push(`- ${leads.length} new leads (shops not on Rasiti) and ${low.length} sellers with low receipt rates.`);
    if (task === 'ask') L.push('', '*Template mode can only summarise. Add an AI key to ask your own questions.*');
    L.push('', 'Based on: community watch ratings with the filters shown.');
  } else if (task === 'w_act') {
    L.push('**Where to act first**', ''); let i = 1;
    leads.slice(0, 2).forEach(x => L.push(`${i++}. Visit **${x.label}**${x.label.includes(x.area) ? '' : ` (${x.area})`}: ${x.negP.size} different customers say it does not give receipts and it is not on Rasiti. Invite it to join.`));
    low.slice(0, 2).forEach(x => L.push(`${i++}. Call **${x.label}**: only ${Math.round(x.rate * 100)}% of ${x.people.size} customers got a receipt. Remind them that customers lose draw entries.`));
    if (worst) L.push(`${i++}. Run a market-day talk in **${worst.area}**, the area with the lowest receipt rate (${worst.rate}%).`);
    L.push('', 'These are suggestions. Officers decide, and no single rating leads to action.', '', 'Based on: shop signals and area receipt rates.');
  } else if (task === 'w_cmp') {
    L.push('**Areas compared** (first half → second half of the period)', '');
    ar.forEach(x => L.push(`- **${x.area}**: ${x.rate}% overall; ${x.early ?? '–'}% → ${x.late ?? '–'}%${x.early != null && x.late != null ? ` (${x.late - x.early >= 0 ? '+' : ''}${x.late - x.early})` : ''}. ${x.off} shops not on Rasiti.`));
    L.push('', 'Small areas can swing a lot with a few ratings. Treat changes under 10 points with care.', '', 'Based on: area ratings split by date.');
  } else if (task === 'w_time') {
    L.push('**Time of day**', ''); a.hours.forEach(h => { if (h.got + h.no) L.push(`- ${h.label}: ${h.got + h.no} ratings, ${h.missed}% without a receipt.`); });
    if (hrs[0]) L.push('', `Suggested visit time: **${hrs[0].label}**, when receipts are missed most often.`);
    L.push('', 'Based on: the time each rating was made.');
  }
  return L.join('\n');
}
async function bhCall(task, question, ctx, history) {
  const out = {answer:null, mode:'template', model:'', note:''};
  if (API.online && API.user) {
    try { const r = await api('bohlale', {task, question, context:ctx, history:history || []}, {quiet:true}); out.mode = r.mode; out.answer = r.answer || null; out.model = r.model || ''; out.note = r.note || ''; }
    catch (e) { out.note = 'Could not reach Bohlale on the server (' + e.message + '). Showing a template answer.'; }
  }
  if (!out.answer) out.mode = 'template';
  return out;
}
const tillMini = () => `<span class="till-mini" aria-hidden="true">${TILL_SVG}</span>`;
async function watchAsk(task, question) {
  if (WA.busy) return; WA.busy = true; const a = watchData();
  $('#waOut').innerHTML = `<div class="bh-msg ai"><img class="bh-av" src="${BH_LOGO}" alt=""><div class="bh-bubble">${tillMini()} Bohlale is analysing ${a.kp.ratings} ratings…</div></div>`;
  const wctx = Object.assign(bhContextFor(question, null, false), {community_watch:watchContext(a)}); delete wctx.areas; delete wctx.shops_flagged;
  const r = await bhCall(task, question, task === 'ask' ? wctx : watchContext(a), []);
  const answer = r.answer || (task === 'ask' ? bhLocal(question, Object.assign(bhContextFor(question, null, true), {community_watch:watchContext(a)})) : watchTemplate(task, a));
  WA.last = {question, answer, mode:r.mode, model:r.model, filters:fLabel(a.f), at:Date.now()};
  const meta = (r.mode === 'ai' ? `AI answer · ${esc(r.model)} · check before acting` : 'Built-in answer from the data') + (r.note ? ` · ${esc(r.note)}` : '');
  $('#waOut').innerHTML = `<div class="bh-msg me"><div class="bh-bubble">${esc(question)}</div></div><div class="bh-msg ai"><img class="bh-av" src="${BH_LOGO}" alt=""><div class="bh-bubble">${bhFormat(answer)}<div class="bh-meta">${meta} · <button type="button" class="bh-copy" data-wa="copy">Copy</button><button type="button" class="bh-copy" data-wa="pdf">Download PDF</button></div></div></div>`;
  log('info', 'Bohlale AI analysed community watch: ' + question.slice(0, 50));
  WA.busy = false;
}

/* ---- downloads ---- */
function csvCell(v) { let s = v == null ? '' : String(v); if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s; return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
function downloadCSV(name, cols, rows) {
  const txt = '﻿' + [cols.map(c => csvCell(c[0])).join(','), ...rows.map(r => cols.map(c => csvCell(c[1](r))).join(','))].join('\r\n');
  saveBlob(new Blob([txt], {type:'text/csv;charset=utf-8'}), name); toast('Downloaded ' + name);
}
function saveBlob(blob, name) { const u = URL.createObjectURL(blob); const l = document.createElement('a'); l.href = u; l.download = name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }
const stamp = () => { const d = new Date(); return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()); };
const isoT = t => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const maskCsv = p => p ? p.slice(0, 4) + '****' + p.slice(-3) : '';
function watchCSV(kind) { const a = watchData();
  if (kind === 'ratings') downloadCSV(`rasiti-ratings-${stamp()}.csv`, [['Date and time', r => isoT(r.t)], ['Shop', r => r.target.no ? tByNo(r.target.no).name : r.target.label], ['Seller code', r => r.target.no || ''], ['On Rasiti', r => r.target.no ? 'Yes' : 'No'], ['Shop type', r => r.target.no ? tByNo(r.target.no).trade : (r.target.kind || '')], ['Area', r => repArea(r)], ['Rating', r => REPTYPE[r.type]], ['Customer (masked)', r => maskCsv(r.ph)], ['Latitude', r => r.lat == null ? '' : (+r.lat).toFixed(5)], ['Longitude', r => r.lng == null ? '' : (+r.lng).toFixed(5)]], a.rs.slice().sort((x, y) => y.t - x.t));
  if (kind === 'shops') downloadCSV(`rasiti-shops-${stamp()}.csv`, [['Shop', x => x.label], ['Area', x => x.area], ['On Rasiti', x => x.on ? 'Yes' : 'No'], ['Type', x => x.kind], ['Ratings', x => x.n], ['Different people', x => x.people.size], ['Got a receipt', x => x.got], ['Receipt rate %', x => x.rate == null ? '' : Math.round(x.rate * 100)], ['Signal', x => SIGTXT[x.sig]], ['Latitude', x => x.ll ? x.ll[0].toFixed(5) : ''], ['Longitude', x => x.ll ? x.ll[1].toFixed(5) : '']], a.st.filter(x => WF.sig === 'all' || x.sig === WF.sig));
  if (kind === 'areas') downloadCSV(`rasiti-areas-${stamp()}.csv`, [['Area', x => x.area], ['Shops', x => x.shops], ['Not on Rasiti', x => x.off], ['Ratings', x => x.n], ['Receipt rate %', x => x.rate], ['First half %', x => x.early], ['Second half %', x => x.late], ['New leads', x => x.leads], ['Low-receipt shops', x => x.low], ['Badge shops', x => x.good]], a.areas);
}
let jspdfP = null;
const JSPDF_SRC = 'vendor/jspdf.umd.min.js';
function loadJsPDF() { if (window.jspdf) return Promise.resolve(window.jspdf);
  return jspdfP = jspdfP || new Promise((ok, no) => { const s = document.createElement('script'); s.src = JSPDF_SRC; s.onload = () => window.jspdf ? ok(window.jspdf) : no(new Error('PDF library did not load')); s.onerror = () => { jspdfP = null; no(new Error('PDF library did not load')); }; document.head.appendChild(s); }); }
function svgToPng(svg, scale) { scale = scale || 2; return new Promise((ok, no) => { const m = svg.match(/width="(\d+(?:\.\d+)?)" height="(\d+(?:\.\d+)?)"/); const w = +m[1], h = +m[2];
  const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = w * scale; c.height = h * scale; const x = c.getContext('2d'); x.scale(scale, scale); x.drawImage(img, 0, 0, w, h); ok({src:c.toDataURL('image/png'), w, h}); };
  img.onerror = () => no(new Error('Chart image failed')); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace(/font-family="[^"]*"/, 'font-family="Arial, Helvetica, sans-serif"')); }); }
const pdfTxt = s => String(s ?? '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/[•]/g, '-').replace(/…/g, '...').replace(/[▲]/g, '+').replace(/[▼]/g, '').replace(/→/g, '->').replace(/[^\x09\x0a\x20-\x7e\xa0-\xff]/g, '');
async function makePdf(file, title, blocks) {
  const {jsPDF} = await loadJsPDF(); const doc = new jsPDF({unit:'mm', format:'a4'});
  const W = 210, MX = 14, CW = W - 2 * MX, BOT = 282; let y = 0;
  const header = () => { doc.setFillColor(26, 27, 46); doc.rect(0, 0, W, 15, 'F'); doc.setFillColor(232, 121, 58); doc.rect(0, 15, W, 1.2, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('RASITI', MX, 10); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.text('Revenue Services Lesotho · RSL Taxathon 2026 · mock data', W - MX, 10, {align:'right'}); y = 25; };
  const need = h => { if (y + h > BOT) { doc.addPage(); header(); } };
  const ink = () => doc.setTextColor(26, 27, 46), mut = () => doc.setTextColor(95, 100, 117);
  header(); ink(); doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.text(pdfTxt(title), MX, y); y += 8;
  blocks.forEach((b, bi) => { const nx = blocks[bi + 1] || {};
    if (b.t === 'meta') { doc.setFont('helvetica', 'normal'); doc.setFontSize(9); mut(); for (const l of doc.splitTextToSize(pdfTxt(b.v), CW)) { need(5); doc.text(l, MX, y); y += 4.4; } y += 2; }
    else if (b.t === 'h') { need(12 + (nx.t === 'img' ? Math.min(CW * nx.v.h / nx.v.w, 120) + 4 : nx.t === 'table' ? 18 : 10)); y += 3; ink(); doc.setFont('helvetica', 'bold'); doc.setFontSize(12.5); doc.text(pdfTxt(b.v), MX, y); doc.setDrawColor(232, 121, 58); doc.setLineWidth(.5); doc.line(MX, y + 1.8, MX + 14, y + 1.8); y += 7; }
    else if (b.t === 'p' || b.t === 'md') {
      doc.setFontSize(10); const lines = String(b.v).split('\n');
      for (let raw of lines) { raw = raw.replace(/\s+$/, ''); if (!raw.trim()) { y += 2; continue; }
        const bul = raw.match(/^\s*[-•]\s+(.*)/), num = raw.match(/^\s*(\d+)[.)]\s+(.*)/); let txt = bul ? bul[1] : num ? num[2] : raw.replace(/^#{1,4}\s+/, '');
        const bold = /^\*\*[^*]+\*\*\s*(\(.*\))?$/.test(txt.trim()) || /^#{1,4}\s/.test(raw); txt = pdfTxt(txt.replace(/\*\*(.+?)\*\*/g, '$1').replace(/(^|\s)\*(\S[^*]*?)\*/g, '$1$2'));
        const ind = bul || num ? 5 : 0; doc.setFont('helvetica', bold ? 'bold' : 'normal'); if (/^Based on:/i.test(txt)) mut(); else ink();
        const parts = doc.splitTextToSize(txt, CW - ind);
        parts.forEach((l, i) => { need(5.2); if (i === 0 && bul) doc.text('-', MX + 1, y); if (i === 0 && num) doc.text(num[1] + '.', MX, y); doc.text(l, MX + ind, y); y += 4.8; }); }
      y += 2; }
    else if (b.t === 'kpis') { const per = 3, bw = (CW - (per - 1) * 4) / per, bh = 16;
      b.v.forEach((k, i) => { if (i % per === 0) { need(bh + 4); if (i) y += bh + 4; } const x = MX + (i % per) * (bw + 4);
        doc.setFillColor(245, 246, 248); doc.setDrawColor(230, 231, 236); doc.roundedRect(x, y, bw, bh, 2, 2, 'FD'); doc.setFillColor(232, 121, 58); doc.rect(x, y, 1.2, bh, 'F');
        ink(); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text(pdfTxt(k[0]), x + 5, y + 7); mut(); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.text(pdfTxt(k[1]), x + 5, y + 12.5); });
      y += bh + 6; }
    else if (b.t === 'img') { const h = Math.min(CW * b.v.h / b.v.w, 120), w = h * b.v.w / b.v.h; need(h + 4); doc.addImage(b.v.src, 'PNG', MX, y, w, h); y += h + 4; }
    else if (b.t === 'table') { const cols = b.cols, tw = cols.reduce((s, c) => s + c[1], 0); const ws = cols.map(c => c[1] / tw * CW);
      const head = () => { need(8); doc.setFillColor(26, 27, 46); doc.rect(MX, y - 4.5, CW, 7, 'F'); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); let x = MX; cols.forEach((c, i) => { doc.text(pdfTxt(c[0]), c[2] ? x + ws[i] - 2 : x + 2, y, c[2] ? {align:'right'} : undefined); x += ws[i]; }); y += 6; };
      head(); doc.setFontSize(8.5);
      b.rows.forEach((r, ri) => { const cells = r.map((v, i) => doc.splitTextToSize(pdfTxt(v), ws[i] - 4).slice(0, 2)); const h = Math.max(...cells.map(c => c.length)) * 3.8 + 2.4;
        if (y + h > BOT) { doc.addPage(); header(); head(); doc.setFontSize(8.5); }
        if (ri % 2) { doc.setFillColor(245, 246, 248); doc.rect(MX, y - 4, CW, h, 'F'); }
        ink(); doc.setFont('helvetica', 'normal'); let x = MX; cells.forEach((c, i) => { c.forEach((l, li) => doc.text(l, cols[i][2] ? x + ws[i] - 2 : x + 2, y + li * 3.8, cols[i][2] ? {align:'right'} : undefined)); x += ws[i]; }); y += h; });
      y += 4; }
  });
  const n = doc.getNumberOfPages(); const who = API.user ? API.user.name || API.user.email : 'demo user';
  for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); mut(); doc.text(pdfTxt(`Generated ${isoT(Date.now())} by ${who} · Rasiti`), MX, 291); doc.text(`Page ${i} of ${n}`, W - MX, 291, {align:'right'}); }
  doc.save(file);
}
async function withBusy(fn, msg) { netBusy(true); try { await fn(); toast(msg); } catch (e) { toast('Could not make the PDF: ' + e.message); } finally { netBusy(false); } }
function watchPDF() { return withBusy(async () => {
  const a = watchData(); const k = a.kp; const p = PAL.light;
  const imgs = await Promise.all([svgToPng(chartDaily(a.days, p, 640)), svgToPng(chartHBars(a.types.map(t => ({label:REPSHORT[t.k], v:t.n})), p, 560)), svgToPng(chartHours(a.hours, p, 560)), svgToPng(chartSchematic(a.st.filter(x => WF.sig === 'all' || x.sig === WF.sig), p, 640))]);
  const tr = k.early != null && k.late != null ? k.late - k.early : null;
  const finding = WA.last && WA.last.filters === fLabel(a.f) ? WA.last : {question:'Summarise this view', answer:watchTemplate('w_sum', a), mode:'template'};
  await makePdf(`rasiti-community-watch-${stamp()}.pdf`, 'Community watch report', [
    {t:'meta', v:`Filters: ${fLabel(a.f)}${WF.sig !== 'all' ? ' · shop signal: ' + SIGTXT[WF.sig] : ''}. Customer phone numbers are not shown. Spam ratings are left out.`},
    {t:'kpis', v:[[k.ratings, 'Shop ratings'], [k.people, 'People taking part'], [k.shops, 'Shops seen'], [k.off, 'Shops not on Rasiti'], [(k.rate ?? '-') + '%', 'Purchases with a receipt'], [tr == null ? '-' : (tr > 0 ? '+' : '') + tr + ' pts', 'Change, 2nd vs 1st half']]},
    {t:'h', v:'Findings from Bohlale AI'}, {t:'meta', v:`Question: ${finding.question} · ${finding.mode === 'ai' ? 'AI answer (' + finding.model + '), checked by an officer before acting' : 'Built-in answer from the data'}`}, {t:'md', v:finding.answer},
    {t:'h', v:'Ratings per day'}, {t:'img', v:imgs[0]},
    {t:'h', v:'What customers reported'}, {t:'img', v:imgs[1]},
    {t:'h', v:'Purchases without a receipt, by time of day'}, {t:'img', v:imgs[2]},
    {t:'h', v:'Shop positions (schematic map)'}, {t:'img', v:imgs[3]},
    {t:'h', v:'By area'}, {t:'table', cols:[['Area', 34], ['Shops', 10, 1], ['Not on Rasiti', 15, 1], ['Ratings', 11, 1], ['Receipt rate', 14, 1], ['1st half', 11, 1], ['2nd half', 11, 1], ['Leads', 10, 1]],
      rows:a.areas.map(x => [x.area, x.shops, x.off, x.n, (x.rate ?? '-') + '%', x.early == null ? '-' : x.early + '%', x.late == null ? '-' : x.late + '%', x.leads])},
    {t:'h', v:'By shop'}, {t:'table', cols:[['Shop', 40], ['Area', 26], ['Type', 18], ['People', 10, 1], ['Receipt rate', 13, 1], ['Signal', 22]],
      rows:a.st.filter(x => WF.sig === 'all' || x.sig === WF.sig).map(x => [x.label, x.area, x.kind, x.people.size, x.rate == null ? '-' : Math.round(x.rate * 100) + '%', SIGTXT[x.sig]])}
  ]);
}, 'PDF report downloaded'); }
function answerPDF(question, answer, mode, model, title) { return withBusy(() => makePdf(`rasiti-bohlale-${stamp()}.pdf`, title || 'Bohlale AI answer', [
  {t:'meta', v:`${mode === 'ai' ? 'AI answer (' + model + '). Check the figures before acting.' : 'Built-in answer from Rasiti data.'} Bohlale suggests; officers decide.`},
  {t:'h', v:'Question'}, {t:'p', v:question}, {t:'h', v:'Answer'}, {t:'md', v:answer}]), 'PDF downloaded'); }
function worklistCSV() { const wl = worklist(); const P = {3:'High', 2:'Medium', 1:'Low', 0:'Watching', [-1]:'No action'};
  downloadCSV(`rasiti-worklist-${stamp()}.csv`, [['Priority', i => P[i.pri]], ['Seller', i => i.subj.name], ['Seller code', i => i.subj.no || ''], ['Trade', i => i.subj.trade || ''], ['Market', i => i.subj.market || ''], ['Recommended action', i => i.act], ['Why', i => i.why.join(' | ')]], wl); }

/* ================= report filters and downloads on every RSL page ================= */
const SF = {days:'30', seller:'all', rule:'all'};
const OF = {pri:'all', area:'all', status:'all'};
const PRITXT = {3:'High', 2:'Medium', 1:'Low', 0:'Watching', [-1]:'No action'};
const optHtml = (list, cur) => list.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(cur) ? ' selected' : ''}>${esc(l)}</option>`).join('');
function fillSel(id, list, cur) { const el = $(id); if (!el) return; const h = optHtml(list, cur); if (el.dataset.h !== h) { el.innerHTML = h; el.dataset.h = h; } }
/* Fraud Shield */
function shieldRows() { const from = SF.days === 'all' ? 0 : clock - (+SF.days) * DAY;
  return S.receipts.filter(r => r.t >= from && (SF.seller === 'all' || r.no === SF.seller) && (SF.rule === 'all' || (S.eval[r.code] && S.eval[r.code].flags.some(f => f.id === SF.rule)))); }
const shieldLabel = () => `${SF.days === 'all' ? 'All dates' : 'Last ' + SF.days + ' days'} · ${SF.seller === 'all' ? 'all sellers' : (tByNo(SF.seller) || {}).name} · ${SF.rule === 'all' ? 'all rules' : RULE[SF.rule].name}`;
function shieldStreamRows(all) { const st = r => shieldState(r);
  if (S.filter === 'live') return all.slice(-25).reverse();
  if (S.filter === 'every') return all.slice().reverse();
  return all.filter(r => { const s = st(r); return S.filter === 'all' ? s !== 'clear' : S.filter === 'held' ? s === 'held' : (s === 'blocked' || s === 'rejected'); }).reverse(); }
function shieldCSV() { const rows = shieldStreamRows(shieldRows());
  downloadCSV(`rasiti-fraud-shield-${stamp()}.csv`, [['Date and time', r => isoT(r.t)], ['Receipt code', r => r.code], ['Seller', r => (tByNo(r.no) || {}).name || r.no], ['Seller code', r => r.no], ['Amount (M)', r => r.amt], ['Paid by', r => r.ch === 'momo' ? 'Mobile money' : 'Cash'], ['Customer (masked)', r => maskCsv(r.ph)], ['Status', r => shieldState(r)], ['Score', r => S.eval[r.code].score], ['Reasons', r => S.eval[r.code].flags.map(f => RULE[f.id].name).join(' | ')]], rows); }
function fakesCSV() { downloadCSV(`rasiti-fake-codes-${stamp()}.csv`, [['Date and time', f => isoT(f.t)], ['Code', f => f.code], ['What happened', f => FAKEPILL[f.kind] || f.kind], ['Detail', f => f.detail], ['Reported by (masked)', f => maskCsv(f.by)]], S.fakes.slice().sort((a, b) => b.t - a.t)); }
function shieldPDF() { return withBusy(async () => { const all = shieldRows(); const n = s => all.filter(r => shieldState(r) === s).length; const rows = shieldStreamRows(all);
  const hits = {}; all.forEach(r => S.eval[r.code].flags.forEach(f => hits[f.id] = (hits[f.id] || 0) + 1));
  await makePdf(`rasiti-fraud-shield-${stamp()}.pdf`, 'Fraud Shield report', [
    {t:'meta', v:`Filters: ${shieldLabel()} · list: ${({all:'flagged', held:'held', blocked:'blocked', live:'latest', every:'all receipts'})[S.filter]}. Customer phone numbers are masked.`},
    {t:'kpis', v:[[all.length.toLocaleString('en-US'), 'Receipts scored'], [n('clear') + n('approved'), 'Clear'], [n('held'), 'Held for an officer'], [n('blocked') + n('rejected'), 'Blocked from the draw'], [S.fakes.length, 'Fake codes stopped'], [M(all.reduce((a, r) => a + r.amt, 0)), 'Value of receipts']]},
    {t:'p', v:'A score of 30 or more holds the draw entries for an officer; 60 or more blocks them. The sale always stays in the seller\'s sales book.'},
    {t:'h', v:'Rules'}, {t:'table', cols:[['Rule', 40], ['What it looks for', 70], ['Points', 12, 1], ['Hits', 12, 1]], rows:RULES.map(r => [r.name, r.what, r.pts, hits[r.id] || 0])},
    {t:'h', v:`Receipts (${rows.length}${rows.length > 150 ? ', first 150 shown' : ''})`}, {t:'table', cols:[['When', 22], ['Code', 28], ['Seller', 26], ['Amount', 14, 1], ['Status', 16], ['Score', 10, 1], ['Why', 44]],
      rows:rows.slice(0, 150).map(r => [isoT(r.t), r.code, (tByNo(r.no) || {}).name || r.no, M(r.amt), shieldState(r), S.eval[r.code].score, S.eval[r.code].flags.map(f => RULE[f.id].name).join(', ') || '-'])},
    {t:'h', v:'Fake and misused codes'}, {t:'table', cols:[['When', 24], ['Code', 30], ['What happened', 26], ['Detail', 60]], rows:S.fakes.slice().sort((a, b) => b.t - a.t).map(f => [isoT(f.t), f.code, FAKEPILL[f.kind] || f.kind, f.detail || ''])}
  ]); }, 'PDF report downloaded'); }
/* Officer console */
const itemArea = i => i.subj.market || '';
const itemStatus = i => i.subj.no ? i.subj.status : i.id === 'held' || i.id === 'spam' ? 'system' : 'off';
function officerItems() { return worklist().filter(i => (OF.pri === 'all' || String(i.pri) === OF.pri) && (OF.area === 'all' || itemArea(i) === OF.area) && (OF.status === 'all' || itemStatus(i) === OF.status)); }
const officerLabel = () => `${OF.pri === 'all' ? 'all priorities' : PRITXT[OF.pri] + ' priority'} · ${OF.area === 'all' ? 'all areas' : OF.area} · ${({all:'all sellers', registered:'registered sellers', enrolled:'on Rasiti, not registered', off:'shops not on Rasiti', system:'system alerts'})[OF.status]}`;
function heldGroups() { const hr = S.receipts.filter(r => shieldState(r) === 'held').reverse(); const grp = {};
  for (const r of hr) { const tr = tByNo(r.no); if (OF.area !== 'all' && (!tr || tr.market !== OF.area)) continue; if (OF.status !== 'all' && OF.status !== 'system' && (!tr || tr.status !== OF.status)) continue;
    const ids = S.eval[r.code].flags.map(f => f.id).sort(); const k = r.no + '|' + ids.join(',') + '|' + (ids.includes('ring') ? '' : r.ph + '|' + (ids.includes('outlier') ? r.code : '')); (grp[k] = grp[k] || []).push(r); }
  return Object.values(grp); }
function complaintGroups() { return reportGroups().filter(g => (g.indep > 0 || g.discounted > 0)).filter(g => { const tr = g.target.no && tByNo(g.target.no); const area = tr ? tr.market : g.target.area;
  return (OF.area === 'all' || area === OF.area) && (OF.status === 'all' || (tr ? tr.status === OF.status : OF.status === 'off')); }).sort((a, b) => b.indep - a.indep); }
const cgName = g => g.target.no ? (tByNo(g.target.no) || {}).name : g.target.label;
function officerCSV(kind) {
  if (kind === 'work') downloadCSV(`rasiti-worklist-${stamp()}.csv`, [['Priority', i => PRITXT[i.pri]], ['Seller or shop', i => i.subj.name], ['Seller code', i => i.subj.no || ''], ['Trade', i => i.subj.trade || ''], ['Area', i => itemArea(i)], ['Recommended action', i => i.act], ['Why', i => i.why.join(' | ')]], officerItems());
  if (kind === 'review') downloadCSV(`rasiti-review-queue-${stamp()}.csv`, [['Seller', g => (tByNo(g[0].no) || {}).name], ['Seller code', g => g[0].no], ['Receipts', g => g.length], ['Amount (M)', g => g.reduce((a, r) => a + r.amt, 0)], ['Phones', g => new Set(g.map(r => r.ph)).size], ['Latest', g => isoT(g[0].t)], ['Why held', g => S.eval[g[0].code].flags.map(f => f.why).join(' | ')], ['Codes', g => g.map(r => r.code).join(' ')]], heldGroups());
  if (kind === 'complaints') downloadCSV(`rasiti-complaints-${stamp()}.csv`, [['Seller or shop', g => cgName(g)], ['On Rasiti', g => g.target.no ? 'Yes' : 'No'], ['Area', g => g.target.no ? (tByNo(g.target.no) || {}).market : g.target.area], ['Different customers', g => g.indep], ['Discounted reports', g => g.discounted], ['Gave a receipt reports', g => g.pos], ['Problems reported', g => [...new Set(g.list.filter(x => x.type !== 'got').map(x => REPTYPE[x.type]))].join(' | ')], ['Status', g => g.indep >= 3 ? 'Action' : 'Watching']], complaintGroups());
}
function officerPDF() { return withBusy(async () => { const wl = officerItems(); const hg = heldGroups(); const cg = complaintGroups();
  const on = S.traders.length, reg = S.traders.filter(t => t.status === 'registered').length, via = S.traders.filter(t => t.via).length; const r30 = S.receipts.filter(r => r.t > clock - 30 * DAY);
  await makePdf(`rasiti-officer-report-${stamp()}.pdf`, 'Officer console report', [
    {t:'meta', v:`Filters: ${officerLabel()}. Prepared for RSL General Clients. A nil return is never treated as non-compliance on its own; every action needs an officer's decision.`},
    {t:'kpis', v:[[on, 'Sellers on Rasiti'], [reg, 'Registered for tax'], [via, 'Registered through Rasiti'], [M(r30.reduce((a, r) => a + r.amt, 0)), 'Receipted sales, 30 days'], [r30.length.toLocaleString('en-US'), 'Receipts, 30 days'], [hg.reduce((a, g) => a + g.length, 0), 'Receipts held for review']]},
    {t:'h', v:`Worklist (${wl.length} items)`}, {t:'table', cols:[['Priority', 18], ['Seller or shop', 34], ['Area', 26], ['Recommended action', 44], ['Why', 60]], rows:wl.map(i => [PRITXT[i.pri], i.subj.name + (i.subj.no ? ' (' + i.subj.no + ')' : ''), itemArea(i), i.act, i.why.join('; ')])},
    {t:'h', v:`Review queue: held draw entries (${hg.length} cases)`}, {t:'table', cols:[['Seller', 30], ['Receipts', 12, 1], ['Amount', 16, 1], ['Why it was held', 80]], rows:hg.map(g => [(tByNo(g[0].no) || {}).name, g.length, M(g.reduce((a, r) => a + r.amt, 0)), S.eval[g[0].code].flags.map(f => f.why).join('; ')])},
    {t:'h', v:`Complaints from customers (${cg.length})`}, {t:'table', cols:[['Seller or shop', 40], ['Customers', 14, 1], ['Discounted', 14, 1], ['Problems', 50], ['Status', 16]], rows:cg.map(g => [cgName(g), g.indep, g.discounted, [...new Set(g.list.filter(x => x.type !== 'got').map(x => REPTYPE[x.type]))].join(', '), g.indep >= 3 ? 'Action' : 'Watching'])}
  ]); }, 'PDF report downloaded'); }
/* Monthly draw */
function drawEntries() { const per = drawPeriod(); const {by} = pool(per); return Object.entries(by).map(([ph, x]) => ({ph, e:x.e, n:x.rs.length, sellers:[...new Set(x.rs.map(r => (tByNo(r.no) || {}).name))].join(' | ')})).sort((a, b) => b.e - a.e); }
function lastDrawData() { if (S.lastDraw) return {when:'Just now', seed:S.lastDraw.seed, live:S.lastDraw.live, winners:S.lastDraw.winners};
  const d = S.draws[0]; return d ? {when:fT(Date.parse(d.run_at)), seed:d.seed, live:d.live_entries, winners:d.winners || []} : null; }
function drawCSV(kind) {
  if (kind === 'entries') downloadCSV(`rasiti-draw-entries-${stamp()}.csv`, [['Customer (masked)', x => maskCsv(x.ph)], ['Entries', x => x.e], ['Receipts', x => x.n], ['Sellers', x => x.sellers]], drawEntries());
  if (kind === 'winners') { const d = lastDrawData(); if (!d) { toast('Run the draw first'); return; }
    downloadCSV(`rasiti-draw-winners-${stamp()}.csv`, [['Place', w => w.place], ['Prize', w => w.prize], ['Customer (masked)', w => String(w.phone).replace(/^\+/, '')], ['Entries', w => w.entries], ['Winning receipt', w => w.code], ['Seller', w => w.seller], ['Seller bonus', w => w.bonus || ''], ['Draw seed', () => d.seed]], d.winners); }
}
function drawPDF() { const d = lastDrawData(); const per = drawPeriod(); const {o, by} = pool(per);
  return withBusy(async () => { await makePdf(`rasiti-draw-report-${stamp()}.pdf`, 'Monthly draw report', [
    {t:'meta', v:`${per.title}. Customer phone numbers are masked. Each phone can win only once per draw.`},
    {t:'kpis', v:[[o.active.toLocaleString('en-US'), 'Live entries'], [Object.keys(by).length, 'Customers in the draw'], [o.reg.toLocaleString('en-US'), 'From registered sellers'], [o.held, 'Held for review'], [o.excluded, 'Excluded by Fraud Shield'], ['M10,800', 'Prize pool']]},
    {t:'p', v:'Rules: 1 entry per M10 spent, at least 1 and at most 5 per receipt. Entries double at sellers registered for tax. Prizes: 1st M5,000 (seller bonus M500), 2nd M2,000 (M200), 3rd M1,000 (M100), plus 20 x M100 airtime.'},
    ...(d ? [{t:'h', v:`Winners (draw run ${d.when})`}, {t:'meta', v:`Seed ${d.seed} from ${Number(d.live).toLocaleString('en-US')} live entries. Publishing the seed and the entry list lets anyone re-run the draw and get the same winners.`},
      {t:'table', cols:[['Place', 12], ['Prize', 22], ['Customer', 24], ['Entries', 12, 1], ['Winning receipt', 30], ['Seller', 30]], rows:d.winners.map(w => [w.place, w.prize, w.phone, w.entries, w.code, w.seller])}]
      : [{t:'h', v:'Winners'}, {t:'p', v:'The draw has not been run yet for this period.'}]),
    {t:'h', v:'Top customers by entries'}, {t:'table', cols:[['Customer', 30], ['Entries', 14, 1], ['Receipts', 14, 1], ['Sellers', 70]], rows:drawEntries().slice(0, 40).map(x => [mask(x.ph), x.e, x.n, x.sellers.replace(/ \| /g, ', ')])}
  ]); }, 'PDF report downloaded'); }
/* Users and activity */
let ACT = [];
function activityCSV() { downloadCSV(`rasiti-activity-log-${stamp()}.csv`, [['When', a => isoT(Date.parse(a.at))], ['Who', a => a.user_email || 'system'], ['Action', a => a.action.replace(/_/g, ' ')], ['Detail', a => a.detail ? JSON.stringify(a.detail) : '']], ACT.filter(a => !$('#actWho') || $('#actWho').value === 'all' || (a.user_email || 'system') === $('#actWho').value)); }

/* ================= Officer console ================= */
const canWork = () => !API.online || (API.user && ['owner', 'admin', 'officer'].includes(API.user.role));
function worklist() {
  const items = []; const groups = reportGroups(); const spam = spamPhones(); const gT = no => groups.find(g => g.key === 'T' + no);
  const mon = lastMonthName();
  for (const tr of S.traders) {
    const rs = S.receipts.filter(r => r.no === tr.no); const r30 = rs.filter(r => r.t > clock - 30 * DAY); const s30 = r30.reduce((a, r) => a + r.amt, 0);
    const g = gT(tr.no); const extra = g ? g.list.filter(x => x.type === 'extra' && !spam.has(x.ph)).length : 0; const ll = traderLL(tr);
    if (tr.status === 'enrolled') {
      if (tr.helper) items.push({id:'help' + tr.no, pri:3, subj:tr, ll, act:'Call back: seller asked for help registering', why:['Requested from the phone menu', `${r30.length} receipts worth ${M(s30)} in 30 days`], btn:'Mark called', kind:'done'});
      if (S.invited.has(tr.no)) items.push({id:'inv' + tr.no, pri:0, subj:tr, ll, act:'Invitation sent, waiting for seller', why:['Seller can register from the phone menu, option 4']});
      else if (s30 >= 1500) items.push({id:'inv' + tr.no, pri:s30 > 5000 ? 3 : 2, subj:tr, ll, act:'Invite to register for Simplified Business Tax', why:[`On Rasiti for ${tr.joined} days, ${r30.length} receipts worth ${M(s30)} in 30 days`, `Yearly estimate ${M(s30 * 12)}, well under the M2,000,000 SBT ceiling`, "Selling point: registering doubles the seller's customers' draw entries"], btn:'Send invitation', kind:'invite', target:tr.no});
    } else {
      const rec = sumWin(tr.no, 59, 30);
      if (tr.declared == null) { if (tr.regAt) items.push({id:'new' + tr.no, pri:-1, subj:tr, ll, act:'Newly registered through Rasiti. No action', why:['Registered from the phone menu', `First return due ${dueDate()}, prefilled from the sales book`]}); continue; }
      if (tr.declared === 0 && rec > 1000) items.push({id:'dec' + tr.no, pri:3, subj:tr, ll, act:`Ask about the ${mon} nil return`, why:[`Declared nil for ${mon}`, `Rasiti shows receipts worth ${M(rec)} in the same month. Receipts are a minimum, not total sales`, ...(extra ? [`${extra} customers separately said they were charged extra for a receipt`] : []), 'A phone call first: a nil return can be a mistake, not evasion'], btn:'Mark contacted', kind:'done'});
      else if (tr.declared === 0 && rec < 300) items.push({id:'nil' + tr.no, pri:-1, subj:tr, ll, act:'No action: activity matches the nil return', why:[`Declared nil for ${mon}`, `Only ${M(rec)} in receipts that month`, 'Looks like genuinely paused or seasonal trade, not hidden sales']});
      else if (tr.declared < rec * 0.8) items.push({id:'und' + tr.no, pri:2, subj:tr, ll, act:'Check under-declaration', why:[`Declared ${M(tr.declared)} for ${mon}; receipts show ${M(rec)}`], btn:'Mark contacted', kind:'done'});
    }
  }
  for (const g of groups) { if (!g.target.place) continue;
    const neg = g.list.filter(x => x.type !== 'got').length, tot = g.list.length; const formal = g.target.kind === 'Formal shop';
    const ll = g.lls.length ? [g.lls.reduce((a, x) => a + x[0], 0) / g.lls.length, g.lls.reduce((a, x) => a + x[1], 0) / g.lls.length] : null;
    const subj = {name:g.target.label, trade:(formal ? 'Formal shop' : 'Informal') + ', not on Rasiti', market:g.target.area || ''};
    if (g.indep >= 3 && formal) items.push({id:'v' + g.key, pri:2, subj, ll, act:S.visits.has(g.key) ? 'Referred to compliance team' : 'Refer to compliance team: low receipt rate', why:[`Customers got a receipt ${Math.round((tot - neg) / tot * 100)}% of the time (${tot} ratings)`, `${g.indep} different customers said no receipt was given`, "Check the shop's registration and VAT records before any visit"], btn:S.visits.has(g.key) ? null : 'Refer', kind:'visit', target:g.key});
    else if (g.indep >= 3) items.push({id:'v' + g.key, pri:3, subj, ll, act:S.visits.has(g.key) ? 'Field visit booked' : 'Assisted enrolment visit by a market tax helper', why:[`${g.indep} different customers reported this seller in ${Math.max(1, Math.round((Math.max(...g.list.map(x => x.t)) - Math.min(...g.list.map(x => x.t))) / DAY))} days`, ...new Set(g.list.filter(x => x.type !== 'got').map(x => REPTYPE[x.type]))], btn:S.visits.has(g.key) ? null : 'Book visit', kind:'visit', target:g.key});
    else if (g.indep > 0) items.push({id:'w' + g.key, pri:0, subj, ll, act:`Watching: ${g.indep} of 3 independent reports`, why:['No action until more customers report the same seller']}); }
  const held = S.receipts.filter(r => shieldState(r) === 'held').length;
  if (held) items.push({id:'held', pri:2, subj:{name:'Fraud Shield', trade:'', market:''}, act:`Review ${held} held receipts`, why:['Entries are paused, sales are not affected', 'See the review queue below']});
  if (spam.size) items.push({id:'spam', pri:1, subj:{name:'Report pattern', trade:'', market:''}, act:'Reports discounted: one number reported many sellers', why:[...spam].map(p => `${mask(p)} filed ${S.reports.filter(r => r.ph === p).length} reports against different sellers within a day`).concat(['These reports are not counted until an officer looks at them'])});
  return items.filter(i => !S.done.has(i.id)).sort((a, b) => b.pri - a.pri);
}
const PRI = {3:'<span class="pill p-bad">High</span>', 2:'<span class="pill p-warn">Medium</span>', 1:'<span class="pill p-info">Low</span>', 0:'<span class="pill p-mute">Watching</span>', [-1]:'<span class="pill p-ok">No action</span>'};
function renderOfficer() {
  const on = S.traders.length; const reg = S.traders.filter(t => t.status === 'registered').length; const via = S.traders.filter(t => t.via).length;
  const r30 = S.receipts.filter(r => r.t > clock - 30 * DAY); const s30 = r30.reduce((a, r) => a + r.amt, 0);
  const groups = reportGroups(); const unlisted = groups.filter(g => g.target.place && g.indep > 0).length; const held = S.receipts.filter(r => shieldState(r) === 'held').length;
  $('#offKpis').innerHTML = [[on, 'Sellers on Rasiti'], [via, 'Registered through Rasiti'], [M(s30), 'Receipted sales, 30 days'], [r30.length.toLocaleString('en-US'), 'Receipts, 30 days'], [unlisted, 'Unlisted shops reported'], [held, 'Receipts held for review']].map(kpi).join('');
  const enrolled = S.traders.filter(t => t.status === 'enrolled').length; const filed = S.traders.filter(t => t.status === 'registered' && t.declared != null).length;
  const steps = [['Reported by customers', unlisted], ['Enrolled, sales book only', enrolled], ['Registered for tax', reg], ['Filed last month', filed]]; const mx = Math.max(...steps.map(s => s[1]), 1);
  $('#funnel').innerHTML = steps.map(s => `<div class="fn"><span>${s[0]}</span><span class="bar"><i style="width:${s[1] / mx * 100}%"></i></span><b>${s[1]}</b></div>`).join('');
  $('#reportsTbl').innerHTML = '<tr><th>Shop</th><th class="num">Customers</th><th class="num">Discounted</th><th>Status</th></tr>' + complaintGroups().slice(0, 12).map(g => { const nm = g.target.no ? (tByNo(g.target.no) || {name:g.target.no}).name : g.target.label;
    return `<tr><td>${esc(nm)}<div class="note">${[...new Set(g.list.filter(x => x.type !== 'got').map(x => REPTYPE[x.type]))].join(', ')}</div></td><td class="num">${g.indep}</td><td class="num">${g.discounted}</td><td>${g.indep >= 3 ? '<span class="pill p-bad">Act</span>' : g.indep > 0 ? '<span class="pill p-mute">Watching</span>' : '<span class="pill p-mute">Discounted</span>'}</td></tr>`; }).join('');
  fillSel('#ofArea', [['all', 'All areas'], ...[...new Set([...S.traders.map(t => t.market), ...S.reports.map(r => r.target.area).filter(Boolean)])].sort().map(a => [a, a])], OF.area);
  $('#ofNote').textContent = 'Showing: ' + officerLabel() + '. The worklist, map, review queue and complaints follow these filters.';
  const wl = officerItems(); const dis = canWork() ? '' : ' disabled title="Viewers cannot take actions"';
  $('#workTbl').innerHTML = '<tr><th>Priority</th><th>Seller</th><th>Recommended action and why</th><th></th></tr>' + wl.map(i => `<tr><td>${PRI[i.pri]}</td><td><b>${esc(i.subj.name)}</b><div class="note">${esc([i.subj.trade, i.subj.market].filter(Boolean).join(' · '))}${i.subj.no ? ' · code ' + i.subj.no : ''}</div></td><td>${esc(i.act)}<ul class="why">${i.why.map(w => `<li>${esc(w)}</li>`).join('')}</ul></td><td style="white-space:nowrap">${i.btn ? `<button class="btn small" data-w="${esc(i.id)}"${dis}>${i.btn}</button> ` : ''}${i.subj.no ? `<button class="btn small bh-ask" data-ask="${i.subj.no}" title="Ask Bohlale AI to explain this case">Ask Bohlale</button>` : ''}</td></tr>`).join('');
  $('#reviewTbl').innerHTML = '<tr><th>Case</th><th>Seller</th><th class="num">Amount</th><th>Why it was held</th><th>Decision</th></tr>' + heldGroups().map(rs => { const r = rs[0]; const e = S.eval[r.code]; const tr = tByNo(r.no) || {name:r.no}; const phs = new Set(rs.map(x => x.ph)); const codes = rs.map(x => x.code).join(',');
    return `<tr><td><b>${rs.length} receipt${rs.length > 1 ? 's' : ''}</b><div class="note">${phs.size} phone${phs.size > 1 ? 's' : ''} · latest ${fT(r.t)}</div><details><summary>Codes</summary><div class="mono">${rs.map(x => x.code + ' ' + mask(x.ph)).join('<br>')}</div></details></td><td>${esc(tr.name)}</td><td class="num">${M(rs.reduce((a, x) => a + x.amt, 0))}</td><td><ul class="why" style="margin:0">${e.flags.map(f => `<li>${esc(f.why)}</li>`).join('')}</ul>${r.note ? `<div class="note">Hint: ${esc(r.note)}</div>` : ''}</td><td style="white-space:nowrap"><button class="btn small" data-rv="approved" data-c="${codes}"${dis}>Approve entries</button> <button class="btn small" data-rv="rejected" data-c="${codes}"${dis}>Reject</button></td></tr>`; }).join('') + (heldGroups().length ? '<tr><td colspan="5" class="note">Either way, the sale stays in the seller\'s sales book. Only draw entries are decided here.</td></tr>' : '<tr><td colspan="5" class="note">Queue empty.</td></tr>');
  if (currentView() === 'officer') renderLeadMap(wl);
}

/* ================= Draw ================= */
function pool(per) { const from = per ? per.from : monthStart(), to = per ? per.to : Infinity; const wk = S.receipts.filter(r => r.t >= from && r.t < to); const o = {active:0, reg:0, held:0, excluded:0}; const by = {};
  for (const r of wk) { const s = drawStatus(r); if (s === 'none') continue; const e = entriesFor(r); o[s] += e; if (s === 'active') { const tr = tByNo(r.no); if (tr && tr.status === 'registered') o.reg += e; (by[r.ph] = by[r.ph] || {e:0, rs:[]}).e += e; by[r.ph].rs.push(r); } } return {o, by}; }
/* Early in a month the new month has few entries, so the draw shown is the one for the month that just ended. */
function drawPeriod() { const ms = monthStart(); const cur = {from:ms, to:Infinity, title:`This month's draw (${fD(ms)} to ${fD(drawDay())})`, name:'this month'};
  if (new Date(clock).getDate() > 7 || Object.keys(pool(cur).by).length >= 23) return cur;
  const d = new Date(ms); const pm = new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime(); const nm = MONTHS_FULL[new Date(pm).getMonth()];
  return {from:pm, to:ms, title:`${nm} draw (${fD(pm)} to ${fD(ms - DAY)}), held in the first days of ${MONTHS_FULL[d.getMonth()]}`, name:nm}; }
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
function renderDraw() { const per = drawPeriod(); const {o, by} = pool(per);
  $('#drawTitle').textContent = per.title;
  $('#drawKpis').innerHTML = [[o.active.toLocaleString('en-US'), 'Live entries'], [Object.keys(by).length, 'Customers in the draw'], [o.reg.toLocaleString('en-US'), 'From registered sellers (double)'], [o.held, 'Held for review'], [o.excluded, 'Excluded by Fraud Shield']].map(kpi).join('');
  $('#runDraw').disabled = !canWork();
  const pd = $('#pastDrawsPanel'); pd.hidden = !S.draws.length;
  $('#pastDraws').innerHTML = '<tr><th>When</th><th class="num">Live entries</th><th>Seed</th><th>Winners</th></tr>' + S.draws.map(d => `<tr><td>${fT(Date.parse(d.run_at))}</td><td class="num">${d.live_entries}</td><td class="mono">${d.seed}</td><td>${(d.winners || []).slice(0, 3).map(w => esc(w.phone) + ' (' + esc(w.prize) + ')').join('<br>')}${(d.winners || []).length > 3 ? `<div class="note">+ ${d.winners.length - 3} airtime winners (M100 each)</div>` : ''}</td></tr>`).join(''); }
const saved = () => API.online && !API.dbEmpty;
const sleep = ms => new Promise(r => setTimeout(r, ms));
function showLoader(text) { const ld = $('#loader'); ld.querySelector('.ld-txt span').textContent = text; ld.hidden = false; ld.classList.remove('out'); }
function hideLoader() { const ld = $('#loader'); ld.classList.add('out'); setTimeout(() => { ld.hidden = true; ld.querySelector('.ld-txt span').textContent = 'Turning receipts into rewards…'; }, 450); }
function pickWinners(by, seedv) { const r = mulberry32(seedv); const phones = Object.keys(by).sort(); const pick = [];
  for (let i = 0; i < 23 && phones.length; i++) { const tot = phones.reduce((a, p) => a + by[p].e, 0); let x = r() * tot; let ch = phones[phones.length - 1]; for (const p of phones) { x -= by[p].e; if (x <= 0) { ch = p; break; } } pick.push(ch); phones.splice(phones.indexOf(ch), 1); }
  const prizes = [['1st', 'M5,000 cash', 'M500'], ['2nd', 'M2,000 cash', 'M200'], ['3rd', 'M1,000 cash', 'M100']];
  return pick.map((p, i) => { const rr = by[p].rs[Math.floor(r() * by[p].rs.length)]; const tr = tByNo(rr.no);
    return i < 3 ? {place:prizes[i][0], prize:prizes[i][1], bonus:prizes[i][2], phone:mask(p), entries:by[p].e, code:rr.code, seller:tr.name, market:tr.market}
      : {place:'#' + (i + 1), prize:'M100 airtime', phone:mask(p), entries:by[p].e, code:rr.code, seller:tr.name, market:tr.market}; }); }
function showWinners(d) {
  if (!d) { $('#winners').innerHTML = ''; $('#airtime').innerHTML = ''; $('#airtimePanel').hidden = true; $('#drawAudit').textContent = ''; return; }
  const top = d.winners.slice(0, 3), air = d.winners.slice(3);
  $('#winners').innerHTML = top.map(w => `<div class="win"><div class="place">${w.place} prize</div><div class="prize">${w.prize}</div><div>${w.phone} · ${w.entries} entries</div><div class="note">Winning receipt ${w.code}<br>Seller bonus ${w.bonus} to ${esc(w.seller)}, ${esc(w.market)}</div></div>`).join('');
  $('#airtimePanel').hidden = !air.length;
  $('#airtimeTitle').textContent = `${air.length} airtime winners · M100 each (M${(air.length * 100).toLocaleString('en-US')} in total)`;
  $('#airtime').innerHTML = air.map((w, i) => `<div class="air"><span class="air-n">${i + 4}</span><div><b>${w.phone}</b><div class="note">${w.entries} entries · ${esc(w.seller)}</div></div></div>`).join('');
  $('#drawAudit').textContent = `Audit record: seed ${d.seed}, ${d.live} live entries, ${d.out} entries left out by the Fraud Shield. Each phone can win only once per draw. Publishing the seed and entry list lets anyone re-run the draw and get the same winners.`; }
async function saveDraw(d) { if (!saved()) return null; const r = await api('admin', {op:'draw', seed:d.seed, live:d.live, winners:d.winners}); await refresh(true); return r.id; }
async function runDraw() {
  const btn = $('#runDraw'); if (btn.disabled) return; btn.disabled = true;
  const per = drawPeriod(); const {o, by} = pool(per); if (!Object.keys(by).length) { toast('No live entries in this draw period yet'); btn.disabled = false; return; }
  const seedv = (Date.now() % 1e9) >>> 0; const d = {seed:seedv, live:o.active, out:o.held + o.excluded, winners:pickWinners(by, seedv)};
  showLoader(per.name === 'this month' ? 'Drawing this month\'s winners…' : `Drawing the ${per.name} winners…`); const t0 = Date.now();
  let id = null; try { id = await saveDraw(d); } catch (e) { toast('Draw not saved: ' + e.message); }
  await sleep(Math.max(0, 3600 - (Date.now() - t0))); hideLoader();
  S.lastDraw = d; showWinners(d); btn.disabled = false;
  log('ok', `Draw run (${per.name}): 3 cash winners and ${Math.max(0, d.winners.length - 3)} airtime winners from ${o.active} live entries`);
  const ref = {id};
  pushHist({label:'monthly draw', undo:async () => { if (ref.id) { await api('admin', {op:'undraw', id:ref.id}); await refresh(true); } S.lastDraw = null; showWinners(null); },
    redo:async () => { ref.id = await saveDraw(d); S.lastDraw = d; showWinners(d); }});
}
/* ================= undo / redo ================= */
const HIST = {u:[], r:[]};
function pushHist(e) { HIST.u.push(e); if (HIST.u.length > 50) HIST.u.shift(); HIST.r = []; renderHist(); }
async function histStep(from, to, fn, word) { const e = from.pop(); if (!e) return; renderHist(true);
  try { await e[fn](); to.push(e); toast(`${word}: ${e.label}`); log('info', `${word}: ${e.label}`); }
  catch (er) { from.push(e); toast(`Could not ${word.toLowerCase()}: ${er.message}`); }
  renderAll(); renderHist(); }
const undo = () => histStep(HIST.u, HIST.r, 'undo', 'Undone');
const redo = () => histStep(HIST.r, HIST.u, 'redo', 'Redone');
function renderHist(busyNow) { const u = $('#undoBtn'), r = $('#redoBtn'); if (!u) return;
  const show = RSL_VIEWS.includes(currentView()) && canWork(); u.hidden = r.hidden = !show;
  const lu = HIST.u[HIST.u.length - 1], lr = HIST.r[HIST.r.length - 1];
  u.disabled = busyNow || !lu; r.disabled = busyNow || !lr;
  u.title = lu ? 'Undo ' + lu.label + ' (Ctrl+Z)' : 'Nothing to undo'; r.title = lr ? 'Redo ' + lr.label + ' (Ctrl+Y)' : 'Nothing to redo'; }
async function setReview(cs, d) { if (saved()) await api('admin', d ? {op:'review', codes:cs, decision:d} : {op:'unreview', codes:cs}); cs.forEach(c => { if (d) S.reviews[c] = d; else delete S.reviews[c]; }); }
const ITEMSETS = it => it.kind === 'invite' ? [S.invited, it.target] : it.kind === 'visit' ? [S.visits, it.target] : [S.done, it.id];
async function setAction(it, on) {
  if (saved()) await api('admin', on ? {op:'action', item_id:it.id, kind:it.kind || 'done', target:it.target || '', label:it.act} : {op:'unaction', item_id:it.id});
  const [set, key] = ITEMSETS(it); if (on) set.add(key); else set.delete(key); }

/* ================= guided cases ================= */
const CASES = [
 {tag:'Ordinary', cls:'', t:'Customer pays by QR', d:'Lerato pays Ntate Thabo M30. The receipt issues itself.', run() {
   setC(PERSONAS[0].ph); setT('3307'); const r = issue('3307', 30, 'momo', PERSONAS[0].ph); PH.c.st = 'end';
   show('c', `M-Pesa: You paid M30.00 to\n${tByNo('3307').name} (3307)\n\n🧾 Rasiti receipt\n${r.code}\n+${entriesFor(r)} draw entries\n\n0. Menu`); PH.t.st = 'home'; tStep('3');
   narrate(`<b>Ordinary case.</b> Payment and receipt are one step. The sale lands in Thabo's sales book and Lerato gets ${entriesFor(r)} entries, double because Thabo is registered. The Fraud Shield scored it clear.`); }},
 {tag:'Exception', cls:'ex', t:'Cash sale, no signal', d:"Tumelo pays M45 cash at Thabo's with no network. The request waits, then the seller confirms.", run() {
   setC(PERSONAS[1].ph); setT('3307'); PH.c.offline = true; PH.c.st = 'c_amt'; PH.c.d = {no:'3307'}; cStep('45');
   narrate('<b>Exception.</b> No signal at the rank. The request is saved on the phone…');
   setTimeout(() => { PH.c.offline = false; S.claims.filter(c => c.state === 'queued').forEach(c => { c.state = 'pending'; persist({kind:'claim', id:c.id, seller_no:c.no, amount:c.amt, phone:c.ph, state:'pending'}).catch(() => {}); });
     log('info', 'Signal back: queued receipt request sent to Ntate Thabo');
     PH.c.st = 'end'; show('c', 'Signal back.\nRequest sent to Ntate Thabo L.\nYou get your receipt by SMS\nwhen he confirms.\n\n0. Menu'); PH.t.st = 'home'; tStep('2');
     narrate("<b>Exception, continued.</b> Signal is back and the request reached Thabo. On the seller's phone, choose the request, then confirm it."); renderAll(); }, 1600); }},
 {tag:'Review', cls:'hr', t:'7 receipts from one phone', d:"One number collects 7 receipts at Mme Nthabiseng's stall in 30 minutes.", run() {
   const p = '2666' + String(Math.floor(Math.random() * 1e7)).padStart(7, '0'); for (let i = 0; i < 7; i++) issue('3902', 35 + Math.round(Math.random() * 20), 'momo', p, true);
   log('warn', 'Fraud Shield held 7 receipts from one phone at Mme Nthabiseng K.'); S.filter = 'held';
   narrate('<b>Human review.</b> The Shield cannot know if this is a reseller stocking up or someone farming entries, so it holds the entries for an officer. Open the <a href="#officer">officer console</a> to decide, or see the reasons in the <a href="#shield">Fraud Shield</a>.'); renderAll(); }},
 {tag:'Fraud', cls:'hr', t:'Customer checks a fake receipt', d:'Someone shows a printed code. The customer checks it on the phone.', run() {
   setC(PERSONAS[0].ph); const g = chk('3307ZZ8Q'); const bad = AL[(AL.indexOf(g) + 7) % 31]; PH.c.st = 'c_check'; if (PH.c.mode === 'wa') waMe('c', `RS-3307-ZZ8Q-${bad}`); cStep(`RS-3307-ZZ8Q-${bad}`);
   narrate('<b>Fake receipt.</b> The check character does not match, so the phone says NOT GENUINE at once. Choose "Report the seller" to report it.'); }},
 {tag:'New taxpayer', cls:'nx', t:'Mme Palesa registers', d:'An enrolled fruit seller registers from her phone. Her customers start earning double entries.', run() {
   const tr = tByNo('4821'); if (!tr || tr.status === 'registered') { narrate('Mme Palesa is already registered. Pick another enrolled seller, or ask an owner to reset the demo data.'); return; }
   setT('4821'); PH.t.st = 'home'; tStep('4');
   narrate('<b>Widening the tax net.</b> Palesa has used the free sales book for 6 weeks. On her phone, choose Register now, then enter any ID number such as <b>0123456789</b>.'); }},
 {tag:'New lead', cls:'nx', t:'Third report on an unlisted stall', d:'Lerato reports the chisa nyama stall at Sefika rank. It crosses the 3-reporter line.', run() {
   setC(PERSONAS[0].ph); PH.c.st = 'c_rtype'; PH.c.d = {type:'unlisted'}; finishRating({place:'sefika-p3', label:'Chisa nyama stall, Sefika rank platform 3', area:'Sefika taxi rank', kind:'Informal'}, null);
   narrate('<b>New lead.</b> Three different customers have now named the same stall. It moves from Watching to an assisted enrolment visit in the <a href="#officer">officer console</a>, and appears on the map. The reporter stays anonymous.'); }}
];

/* ================= users view ================= */
async function renderUsers() {
  if (!API.online || !API.user || !['owner', 'admin'].includes(API.user.role)) return;
  try {
    const {users, activity} = await api('users');
    const me = API.user;
    const roleSel = u => `<select data-role="${u.id}" ${u.id === me.uid || (me.role !== 'owner' && ['owner', 'admin'].includes(u.role)) ? 'disabled' : ''}>${['owner', 'admin', 'officer', 'viewer'].map(r => `<option value="${r}"${u.role === r ? ' selected' : ''}${me.role !== 'owner' && ['owner', 'admin'].includes(r) ? ' disabled' : ''}>${r[0].toUpperCase() + r.slice(1)}</option>`).join('')}</select>`;
    $('#usersTbl').innerHTML = '<tr><th>Name</th><th>Role</th><th>Status</th><th>Last sign-in</th><th></th></tr>' + users.map(u => {
      const locked = u.id === me.uid || (me.role !== 'owner' && ['owner', 'admin'].includes(u.role));
      return `<tr><td><b>${esc(u.name)}</b>${u.id === me.uid ? ' <span class="pill p-info">You</span>' : ''}<div class="note">${esc(u.email)}</div></td><td>${roleSel(u)}</td><td>${u.active ? '<span class="pill p-ok">Active</span>' : '<span class="pill p-mute">Switched off</span>'}</td><td class="note">${u.last_login ? fT(Date.parse(u.last_login)) : 'Never'}</td>
        <td style="white-space:nowrap">${locked ? '' : `<button class="btn small" data-act="${u.id}" data-on="${u.active ? 0 : 1}">${u.active ? 'Switch off' : 'Switch on'}</button> <button class="btn small" data-reset="${u.id}">Reset password</button>`}</td></tr>`; }).join('');
    ACT = activity; fillSel('#actWho', [['all', 'Everyone'], ...[...new Set(activity.map(a => a.user_email || 'system'))].map(w => [w, w])], $('#actWho').value || 'all');
    $('#activityTbl').innerHTML = '<tr><th>When</th><th>Who</th><th>What</th></tr>' + activity.filter(a => $('#actWho').value === 'all' || (a.user_email || 'system') === $('#actWho').value).map(a => `<tr><td class="mono">${fT(Date.parse(a.at))}</td><td>${esc(a.user_email || 'system')}</td><td>${esc(a.action.replace(/_/g, ' '))}<div class="note">${esc(Object.entries(a.detail || {}).filter(([, v]) => v != null).map(([k, v]) => k + ': ' + v).join(' · '))}</div></td></tr>`).join('');
    $('#dataPanel').hidden = me.role !== 'owner';
  } catch (e) { $('#usersTbl').innerHTML = `<tr><td class="err">${esc(e.message)}</td></tr>`; }
}
const genPass = () => { const a = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'; const b = new Uint32Array(14); crypto.getRandomValues(b); return Array.from(b, x => a[x % a.length]).join('') + '!'; };

/* ================= Bohlale AI (officer assistant) ================= */
const BH = { history: [], status: null, busy: false };
const BH_TASKS = [
  {id:'briefing', label:"Today's briefing", ask:'Give me a short briefing for today: what needs my attention first, and why.'},
  {id:'explain', label:'Explain a case', pick:'seller', ask:s => `Explain the case of seller ${s.name} (code ${s.no}) in plain language. What do the receipts, returns and customer ratings show, and what is a fair first step?`},
  {id:'invite', label:'Draft invitation SMS', pick:'enrolled', ask:s => `Draft a short, friendly SMS (under 300 characters) inviting ${s.name} (code ${s.no}) to register for Simplified Business Tax. Mention the benefits shown in the data. Give an English version and a Sesotho version.`},
  {id:'call', label:'Call script for a nil return', pick:'nil', ask:s => `Write a polite phone-call script for an RSL officer calling ${s.name} (code ${s.no}) about last month's nil return. Do not accuse. Ask questions, explain options, and agree a next step.`},
  {id:'review', label:'Summarise held receipts', ask:'Summarise the receipts held by the Fraud Shield. For each group, say what looks unusual, what an officer should check, and what innocent explanation might exist.'},
  {id:'areas', label:'Where are receipts lowest?', ask:'Which areas and shops have the lowest receipt rates in the last 30 days? Suggest where tax helpers should visit first, and why.'},
  {id:'report', label:'Monthly report for management', ask:'Write a one-page monthly report for the Deputy Commissioner, General Clients: key numbers, progress in widening the tax net, risks found, and recommended next steps.'},
  {id:'sbt', label:'Does this seller fit SBT?', pick:'seller', ask:s => `Based on the receipts in the data, does ${s.name} (code ${s.no}) appear to fall under the Simplified Business Tax income limit? Show the simple calculation and say what is uncertain.`}
];
function bhPickList(kind) {
  const ts = S.traders.filter(t => kind === 'enrolled' ? t.status === 'enrolled' : kind === 'nil' ? (t.status === 'registered' && t.declared === 0) : true);
  return ts.length ? ts : S.traders;
}
function bhContext(focusNo) {
  const sum = a => a.reduce((x, r) => x + r.amt, 0);
  const sellers = S.traders.map(t => {
    const rs = S.receipts.filter(r => r.no === t.no); const r30 = rs.filter(r => r.t > clock - 30 * DAY);
    const g = reportGroups().find(x => x.key === 'T' + t.no);
    return {code:t.no, name:t.name, trade:t.trade, market:t.market, status:t.status, days_on_rasiti:t.joined,
      receipts_30d:r30.length, sales_30d:Math.round(sum(r30)), yearly_estimate:Math.round(sum(r30) * 12),
      declared_last_month:t.declared ?? null, receipts_last_month:Math.round(sumWin(t.no, 59, 30)),
      customer_complaints:g ? g.indep : 0, complaint_types:g ? [...new Set(g.list.filter(x => x.type !== 'got').map(x => REPTYPE[x.type]))] : [],
      held_receipts:rs.filter(r => shieldState(r) === 'held').length, asked_for_helper:!!t.helper};
  });
  const hr = S.receipts.filter(r => shieldState(r) === 'held'); const groups = {};
  for (const r of hr) { const ids = S.eval[r.code].flags.map(f => f.id).sort().join(','); const k = r.no + '|' + ids; const gg = groups[k] = groups[k] || {seller:(tByNo(r.no) || {}).name, code:r.no, receipts:0, amount:0, reasons:S.eval[r.code].flags.map(f => f.why), hint:r.note || null}; gg.receipts++; gg.amount += r.amt; }
  const st = shopStats();
  const areas = {}; for (const x of st) { const a = areas[x.area] = areas[x.area] || {area:x.area, shops:0, not_on_rasiti:0, ratings:0, got_receipt:0}; a.shops++; if (!x.on) a.not_on_rasiti++; a.ratings += x.n; a.got_receipt += x.got; }
  const {o} = pool();
  return {
    today: new Date(clock).toDateString(), last_month: lastMonthName(), sbt_income_limit_per_year: 2000000,
    kpis: {sellers_on_rasiti:S.traders.length, registered:S.traders.filter(t => t.status === 'registered').length, registered_through_rasiti:S.traders.filter(t => t.via).length,
      receipts_30d:S.receipts.filter(r => r.t > clock - 30 * DAY).length, receipted_sales_30d:Math.round(sum(S.receipts.filter(r => r.t > clock - 30 * DAY))),
      receipts_held:hr.length, fake_codes_stopped:S.fakes.length, draw_live_entries_this_month:o.active},
    worklist: worklist().slice(0, 14).map(i => ({priority:{3:'High',2:'Medium',1:'Low',0:'Watching',[-1]:'No action'}[i.pri], seller:i.subj.name, code:i.subj.no || null, action:i.act, reasons:i.why})),
    sellers, focus_seller: focusNo || null,
    held_receipt_groups: Object.values(groups).map(g => ({...g, amount:Math.round(g.amount)})),
    areas: Object.values(areas).map(a => ({...a, receipt_rate_pct:a.ratings ? Math.round(a.got_receipt / a.ratings * 100) : null})),
    shops_flagged: st.filter(x => x.sig === 'lead' || x.sig === 'low').map(x => ({shop:x.label, area:x.area, type:x.kind, people:x.people.size, receipt_rate_pct:x.rate === null ? null : Math.round(x.rate * 100), signal:x.sig === 'lead' ? 'new lead, not on Rasiti' : 'low receipts'})),
    note: 'All phone numbers are masked. This is mock data for the RSL Taxathon demo.'
  };
}
/* ---- Bohlale: the rest of the data, so it can answer any question ---- */
function bhExtra() {
  const sum = a => a.reduce((x, r) => x + r.amt, 0); const since = d => S.receipts.filter(r => r.t > clock - d * DAY);
  const d0 = new Date(clock); d0.setHours(0, 0, 0, 0); const today = S.receipts.filter(r => r.t >= d0.getTime());
  const r30 = since(30), r7 = since(7);
  const daily = Array.from({length:14}, (_, i) => { const a = d0.getTime() - (13 - i) * DAY; const rs = S.receipts.filter(r => r.t >= a && r.t < a + DAY); return {date:fD(a), receipts:rs.length, value:Math.round(sum(rs))}; });
  const states = {}; S.receipts.forEach(r => { const k = shieldState(r); states[k] = (states[k] || 0) + 1; });
  const hits = {}; for (const c in S.eval) S.eval[c].flags.forEach(f => hits[f.id] = (hits[f.id] || 0) + 1);
  const per = drawPeriod(); const {o, by} = pool(per); const last = S.draws[0];
  const rev = Object.values(S.reviews);
  const sellerX = S.traders.map(t => { const rs = S.receipts.filter(r => r.no === t.no); const a30 = rs.filter(r => r.t > clock - 30 * DAY);
    return {code:t.no, name:t.name, receipts_today:rs.filter(r => r.t >= d0.getTime()).length, receipts_7d:rs.filter(r => r.t > clock - 7 * DAY).length,
      average_sale:a30.length ? Math.round(sum(a30) / a30.length) : 0, mobile_money_pct:pct(a30.filter(r => r.ch === 'momo').length, a30.length),
      receipts_without_phone:a30.filter(r => !r.ph).length, pending_requests:S.claims.filter(c => c.no === t.no && c.state === 'pending').length,
      tin:t.tin || null, registered_through_rasiti:!!t.via, invited:S.invited.has(t.no), visit_planned:S.visits.has(t.no)}; });
  return {
    receipts:{today:{count:today.length, value:Math.round(sum(today))}, last_7_days:{count:r7.length, value:Math.round(sum(r7))}, last_30_days:{count:r30.length, value:Math.round(sum(r30)), average_sale:r30.length ? Math.round(sum(r30) / r30.length) : 0},
      by_payment_30d:{mobile_money:r30.filter(r => r.ch === 'momo').length, cash:r30.filter(r => r.ch === 'cash').length}, daily_last_14_days:daily},
    seller_details:sellerX,
    fraud_shield:{how_it_works:'Each receipt gets points from the rules. 30 or more: draw entries held for an officer. 60 or more: blocked. The sale always stays in the seller\'s book.',
      receipts_by_state:states, rules:RULES.map(r => ({rule:r.name, points:r.pts, what:r.what, receipts_hit:hits[r.id] || 0})),
      fake_or_misused_codes:S.fakes.slice(-15).map(f => ({date:fD(f.t), code:f.code, kind:f.kind, detail:f.detail || ''})),
      officer_reviews:{approved:rev.filter(x => x === 'approved').length, rejected:rev.filter(x => x === 'rejected').length}},
    draw:{period:per.title, live_entries:o.active, customers_in_draw:Object.keys(by).length, entries_from_registered_sellers:o.reg, held_for_review:o.held, excluded_by_fraud_shield:o.excluded,
      rules:'1 entry per M10 spent, minimum 1 and maximum 5 per receipt; double at registered sellers; monthly draw; each phone can win once per draw.',
      prizes:'1st M5,000 (seller bonus M500), 2nd M2,000 (seller M200), 3rd M1,000 (seller M100), plus 20 x M100 airtime. M10,800 a month.',
      last_draw:last ? {when:fT(Date.parse(last.run_at)), live_entries:last.live_entries, seed:last.seed, cash_winners:(last.winners || []).slice(0, 3).map(w => ({place:w.place, prize:w.prize, phone:w.phone, entries:w.entries, seller:w.seller})), airtime_winners:(last.winners || []).slice(3).map(w => ({phone:w.phone, entries:w.entries, seller:w.seller}))}
        : S.lastDraw ? {when:'this session', cash_winners:S.lastDraw.winners.slice(0, 3), airtime_winners:S.lastDraw.winners.slice(3).map(w => ({phone:w.phone, entries:w.entries, seller:w.seller}))} : null},
    customer_requests:{pending:S.claims.filter(c => c.state === 'pending').length, queued_offline:S.claims.filter(c => c.state === 'queued').length},
    officer_actions:{invitations_sent:S.invited.size, visits_planned:S.visits.size, items_marked_done:S.done.size},
    community_watch:watchContext(watchData({days:30, area:'all', who:'all', sig:'all', ctype:'all'})),
    recent_activity:S.feed.slice(0, 10).map(f => fT(f.t) + ' ' + f.text)
  };
}
const BH_TOPICS = {
  receipts:/receipt|sale|sold|sell|cash|mobile|momo|m-?pesa|ecocash|today|yesterday|week|trend|value|amount|average|busiest|day/i,
  seller_details:/seller|shop|stall|trader|tin|phone|request|pending|invite|visit|average|cash|mobile/i,
  fraud_shield:/fraud|fake|forg|tamper|held|hold|shield|flag|review|block|suspic|ring|velocity|split|outlier|self|reject|approv/i,
  draw:/draw|winner|win|prize|airtime|entr|lottery|jackpot|seed|budget/i,
  customer_requests:/request|claim|pending|queue|confirm/i,
  officer_actions:/invit|visit|contact|done|action|officer|follow/i,
  community_watch:/area|rating|rate|communit|watch|complain|report|market|hotspot|time of day|hour|lead|badge|unlisted|extra|where/i,
  recent_activity:/recent|just|latest|happen|activity|log/i
};
function bhContextFor(question, focusNo, full) {
  const base = bhContext(focusNo); const ex = bhExtra();
  const keys = Object.keys(BH_TOPICS).filter(k => full || BH_TOPICS[k].test(question));
  const qn = String(question).toLowerCase().replace(/['’]/g, '');
  const namesSeller = S.traders.some(t => new RegExp('\\b(' + t.no + '|' + t.name.toLowerCase().replace(/^(ntate|mme)\s+/, '').replace(/['’]/g, '').split(/\s+/)[0] + ')\\b').test(qn));
  if (!keys.length && namesSeller) keys.push('seller_details', 'receipts', 'customer_requests');
  for (const k of (keys.length ? keys : Object.keys(BH_TOPICS))) base[k] = ex[k];
  return base;
}

/* ---- Built-in answers for typed questions (works with no AI key) ---- */
function bhLocal(q, c) {
  const t = q.toLowerCase(); const L = []; const sel = c.sellers; const sx = c.seller_details || [];
  const has = re => re.test(t); const used = []; const sec = (h, lines, src) => { if (L.length) L.push(''); L.push(`**${h}**`, ...lines); used.push(src || h.replace(/\s*\(.*$/, '').toLowerCase()); };
  const nameKey = n => n.toLowerCase().replace(/^(ntate|mme|ms|mr)\s+/, '').replace(/['’]/g, '').split(/\s+/)[0];
  const tn = t.replace(/['’]/g, ''); const sNamed = sel.filter(s => new RegExp('\\b(' + s.code + '|' + nameKey(s.name) + ')\\b').test(tn));
  const AREA_STOP = new Set(['maseru', 'main', 'market', 'parking', 'taxi', 'rank', 'ground']);
  const areas = c.community_watch ? c.community_watch.areas : []; const aNamed = areas.filter(a => { const n = a.area.toLowerCase(); return t.includes(n) || (n === 'maseru main market' && t.includes('main market')) || n.split(' ').some(w => w.length > 3 && !AREA_STOP.has(w) && t.includes(w)); });
  const shops = c.community_watch ? c.community_watch.shops : []; const SHOP_STOP = new Set(['seller', 'sellers', 'shop', 'shops', 'stall', 'store', 'outlet', 'stand', 'gate', 'near', 'rank', 'platform', 'parking', 'taxi', 'market', 'main']);
  const shNamed = shops.filter(s => !s.on_rasiti && s.shop.toLowerCase().split(',')[0].split(/\s+/).some(w => w.length > 3 && !SHOP_STOP.has(w) && new RegExp('\\b' + w + '\\b').test(t)));
  const low = has(/lowest|least|worst|smallest|bottom|fewest|poor/), top = has(/top|best|most|highest|biggest|largest|leading/) && !low;
  const metric = has(/complain/) ? 'customer_complaints' : has(/receipts?\b/) && !has(/sales|value|money|income|revenue/) ? 'receipts_30d' : 'sales_30d';
  const mName = {sales_30d:'sales in the last 30 days', receipts_30d:'receipts in the last 30 days', customer_complaints:'customer complaints'}[metric];
  const fmtv = (s, m) => m === 'sales_30d' ? M(s[m]) : s[m];
  for (const s of sNamed.slice(0, 2)) { const x = sx.find(y => y.code === s.code) || {};
    sec(`${s.name} (code ${s.code}), ${s.trade}, ${s.market}`, [
      `- ${s.status === 'registered' ? 'Registered for tax' + (x.tin ? ' (TIN ' + x.tin + ')' : '') + (x.registered_through_rasiti ? ', registered through Rasiti' : '') : 'On Rasiti, not yet registered for tax'}; on Rasiti for ${s.days_on_rasiti} days.`,
      `- Receipts: ${x.receipts_today ?? '-'} today, ${x.receipts_7d ?? '-'} in 7 days, ${s.receipts_30d} in 30 days worth ${M(s.sales_30d)} (average sale ${M(x.average_sale || 0)}; ${x.mobile_money_pct ?? 0}% by mobile money).`,
      `- Yearly estimate from receipts: ${M(s.yearly_estimate)} (SBT limit M2,000,000).`,
      s.declared_last_month != null ? `- ${c.last_month} return: declared ${M(s.declared_last_month)}; receipts showed ${M(s.receipts_last_month)}.` : '- No return on record for last month.',
      `- Customer complaints: ${s.customer_complaints}${s.complaint_types.length ? ' (' + s.complaint_types.join(', ').toLowerCase() + ')' : ''}. Held receipts: ${s.held_receipts}. Pending customer requests: ${x.pending_requests ?? 0}.`], `seller ${s.code} records`); }
  for (const a of aNamed.slice(0, 2)) sec(`${a.area} (last 30 days)`, [`- ${a.ratings} ratings, ${a.receipt_rate_pct}% got a receipt (first half ${a.first_half_pct ?? '-'}%, second half ${a.second_half_pct ?? '-'}%).`, `- ${a.shops} shops rated, ${a.not_on_rasiti} not on Rasiti, ${a.new_leads} new lead${a.new_leads === 1 ? '' : 's'}, ${a.low_receipt_shops} with low receipts.`], 'community watch ratings');
  for (const s of shNamed.slice(0, 2)) sec(s.shop, [`- Not on Rasiti. ${s.ratings} ratings from ${s.people} people; receipt rate ${s.receipt_rate_pct ?? '-'}%. Signal: ${s.signal}.`], 'community watch ratings');
  if (!sNamed.length && (top || low) && has(/seller|trader|stall|vendor|who/) && !has(/area|place|location/)) { const rk = sel.slice().sort((a, b) => low ? a[metric] - b[metric] : b[metric] - a[metric]);
    sec(`Sellers ranked by ${mName} (${low ? 'lowest' : 'highest'} first)`, rk.slice(0, 5).map((s, i) => `${i + 1}. ${s.name} (${s.code}), ${s.market}: ${fmtv(s, metric)}`)); }
  if (!aNamed.length && has(/area|market|where|place/) && has(/worse|better|improv|drop|declin|fell|rose|change|trend/) && areas.length) {
    const ch = areas.filter(a => a.first_half_pct != null && a.second_half_pct != null).map(a => ({...a, d:a.second_half_pct - a.first_half_pct})).sort((a, b) => has(/better|improv|rose/) ? b.d - a.d : a.d - b.d);
    sec(`Change in receipt rate, first half vs second half of the last 30 days (${has(/better|improv|rose/) ? 'most improved' : 'biggest drop'} first)`, ch.map(a => `- ${a.area}: ${a.first_half_pct}% → ${a.second_half_pct}% (${a.d >= 0 ? '+' : ''}${a.d} points, ${a.ratings} ratings).`).concat(['- Areas with few ratings can swing a lot; treat small changes with care.']), 'community watch ratings'); }
  else if (!aNamed.length && has(/area|market|where|place|location/) && areas.length) {
 const ar = areas.slice().sort((a, b) => low || !top ? a.receipt_rate_pct - b.receipt_rate_pct : b.receipt_rate_pct - a.receipt_rate_pct);
    sec(`Areas by receipt rate (${low || !top ? 'lowest' : 'highest'} first)`, ar.slice(0, 7).map(a => `- ${a.area}: ${a.receipt_rate_pct}% of ${a.ratings} ratings got a receipt; ${a.new_leads} new lead${a.new_leads === 1 ? '' : 's'}.`), 'community watch ratings'); }
  if (has(/how many|number of|count/) && has(/seller|trader/)) { const k = c.kpis;
    sec('Sellers', [`- ${k.sellers_on_rasiti} sellers on Rasiti; ${k.registered} registered for tax (${k.registered_through_rasiti} registered through Rasiti); ${k.sellers_on_rasiti - k.registered} not yet registered.`, ...sel.map(s => `- ${s.name} (${s.code}): ${s.status}`)]); }
  const specific = has(/fraud|fake|forg|tamper|held|shield|draw|winner|prize|area|complain|nil|declar|regist|request|pending/) || aNamed.length || shNamed.length;
  if (c.receipts && !sNamed.length && (has(/sale|sold|cash|mobile|momo|payment|today|week|trend|average|busiest|value|revenue/) || (has(/receipt/) && !specific))) { const r = c.receipts; const busy = r.daily_last_14_days.slice().sort((a, b) => b.receipts - a.receipts)[0];
    sec('Receipts', [`- Today: ${r.today.count} receipts worth ${M(r.today.value)}.`, `- Last 7 days: ${r.last_7_days.count} worth ${M(r.last_7_days.value)}. Last 30 days: ${r.last_30_days.count} worth ${M(r.last_30_days.value)}, average sale ${M(r.last_30_days.average_sale)}.`,
      `- Payment (30 days): ${r.by_payment_30d.mobile_money} by mobile money, ${r.by_payment_30d.cash} cash.`, `- Busiest day in the last 2 weeks: ${busy.date} (${busy.receipts} receipts).`]); }
  if (c.fraud_shield && has(/fraud|fake|forg|tamper|held|hold|shield|flag|review|block|suspic|ring|reject|approv/)) { const f = c.fraud_shield; const st = f.receipts_by_state;
    sec('Fraud Shield', [`- Receipts: ${st.clear || 0} clear, ${st.held || 0} held for review, ${st.blocked || 0} blocked, ${st.approved || 0} approved and ${st.rejected || 0} rejected by officers.`,
      ...f.rules.filter(r => r.receipts_hit).map(r => `- ${r.rule}: ${r.receipts_hit} receipts (${r.points} points).`),
      `- Fake or misused codes stopped: ${c.kpis.fake_codes_stopped}.${f.fake_or_misused_codes.length ? ' Latest: ' + f.fake_or_misused_codes.slice(-3).map(x => `${x.code} (${x.kind}, ${x.date})`).join('; ') + '.' : ''}`,
      ...c.held_receipt_groups.slice(0, 4).map(g => `- Held: ${g.seller}, ${g.receipts} receipt${g.receipts === 1 ? '' : 's'} (${M(g.amount)}). ${g.reasons[0]}`)]); }
  if (c.draw && has(/draw|winner|win|prize|airtime|entr|lottery|jackpot/)) { const d = c.draw; const lines = [`- ${d.period}: ${d.live_entries.toLocaleString('en-US')} live entries from ${d.customers_in_draw} customers (${d.entries_from_registered_sellers.toLocaleString('en-US')} from registered sellers, doubled). ${d.held_for_review} held, ${d.excluded_by_fraud_shield} excluded.`, `- Prizes: ${d.prizes}`];
    if (d.last_draw) lines.push(`- Last draw (${d.last_draw.when}): ${d.last_draw.cash_winners.map(w => `${w.place} ${w.phone}`).join(', ')}; plus ${d.last_draw.airtime_winners.length} airtime winners.`); else lines.push('- No draw has been run yet for this period.');
    sec('Monthly draw', lines); }
  if (has(/nil|declar|return|under|evad|evasion|hiding/)) { const n = sel.filter(s => s.declared_last_month === 0), u = sel.filter(s => s.declared_last_month > 0 && s.declared_last_month < s.receipts_last_month * 0.8);
    sec(`Returns for ${c.last_month}`, [...n.map(s => `- ${s.name} (${s.code}) declared nil; receipts showed ${M(s.receipts_last_month)}.`), ...u.map(s => `- ${s.name} (${s.code}) declared ${M(s.declared_last_month)}; receipts showed ${M(s.receipts_last_month)}.`), ...(n.length + u.length ? ['- A nil or low return is a reason to ask, not proof of wrongdoing.'] : ['- No nil or low returns stand out.'])]); }
  if (has(/regist|enrol|tin|sbt|simplified|tax net|not yet/) && !sNamed.length) { const e = sel.filter(s => s.status !== 'registered');
    sec('Widening the tax net', [`- Not yet registered: ${e.map(s => `${s.name} (${s.code}, yearly estimate ${M(s.yearly_estimate)})`).join('; ') || 'none'}.`, `- Registered through Rasiti: ${c.kpis.registered_through_rasiti}.`]); }
  if (c.customer_requests && has(/request|claim|pending|queue/)) sec('Customer receipt requests', [`- ${c.customer_requests.pending} waiting for the seller to confirm; ${c.customer_requests.queued_offline} saved offline.`]);
  if (has(/complain|rating|communit|watch|lead|unlisted|badge|extra/) && c.community_watch && !aNamed.length) { const w = c.community_watch.kpis;
    sec('Community watch (30 days)', [`- ${w.ratings} ratings from ${w.people} people about ${w.shops} shops; ${w.rate}% got a receipt.`, `- ${w.leads} new leads (shops not on Rasiti that several customers reported).`,
      ...c.shops_flagged.slice(0, 4).map(s => `- ${s.shop} (${s.area}): ${s.signal}, ${s.people} people.`)]); }
  if (has(/brief|attention|priorit|worklist|first|urgent|todo|to do/)) sec('Worklist', c.worklist.slice(0, 6).map(w => `- ${w.priority}, ${w.seller}: ${w.action}.`));
  if (has(/recent|just|latest|happen|activity/) && !L.length && c.recent_activity) { const ra = c.recent_activity.filter(x => !/Bohlale/.test(x)).slice(0, 6); sec('Recent activity', ra.length ? ra.map(x => '- ' + x) : ['- Nothing new in this session yet.']); }
  if (!L.length) { const k = c.kpis;
    L.push('**Overview**', `- ${k.sellers_on_rasiti} sellers on Rasiti, ${k.registered} registered for tax.`, `- ${k.receipts_30d.toLocaleString('en-US')} receipts in 30 days worth ${M(k.receipted_sales_30d)}.`, `- ${k.receipts_held} receipts held for review; ${k.fake_codes_stopped} fake codes stopped.`,
      '', 'I could not match your question to a specific part of the data. Try naming a seller (e.g. "Thabo" or "3307"), an area (e.g. "Sefika"), or a topic: receipts, draw, fraud, returns, registration, complaints, worklist.');
  }
  L.push('', `Based on: ${[...new Set(used)].join(', ') || 'dashboard figures'}.`);
  return L.join('\n');
}

/* Template answers, used when no AI key is set or the AI service is unavailable */
function bhTemplate(task, ctx, s) {
  const L = [];
  const sel = s ? ctx.sellers.find(x => x.code === s.no) : null;
  if (task === 'briefing') {
    const hi = ctx.worklist.filter(w => w.priority === 'High');
    L.push(`**Today's briefing** (${ctx.today})`, '', `${hi.length} high-priority items, ${ctx.kpis.receipts_held} receipts held for review, ${ctx.kpis.fake_codes_stopped} fake codes stopped.`, '');
    ctx.worklist.slice(0, 5).forEach(w => L.push(`- **${w.priority}, ${w.seller}:** ${w.action}. ${w.reasons[0] || ''}`));
    L.push('', 'Suggested order: start with the High items, then the review queue.', '', 'Based on: worklist, Fraud Shield totals.');
  } else if (task === 'explain' && sel) {
    L.push(`**${sel.name}** (code ${sel.code}), ${sel.trade}, ${sel.market}`, '',
      `- Status: ${sel.status === 'registered' ? 'registered for tax' : 'on Rasiti, not yet registered'}, on Rasiti for ${sel.days_on_rasiti} days.`,
      `- Last 30 days: ${sel.receipts_30d} receipts worth ${M(sel.sales_30d)} (yearly estimate ${M(sel.yearly_estimate)}).`,
      sel.declared_last_month != null ? `- Last month: declared ${M(sel.declared_last_month)}; receipts showed ${M(sel.receipts_last_month)}.` : '- No return on record for last month.',
      `- Customer complaints: ${sel.customer_complaints}${sel.complaint_types.length ? ' (' + sel.complaint_types.join(', ') + ')' : ''}.`,
      `- Receipts held by the Fraud Shield: ${sel.held_receipts}.`, '');
    const w = ctx.worklist.find(x => x.code === sel.code);
    L.push(w ? `Suggested first step: **${w.action}**. ${w.reasons.slice(-1)[0] || ''}` : 'No action is suggested for this seller right now.', '', `Based on: seller ${sel.code} receipts, returns and ratings.`);
  } else if (task === 'invite' && sel) {
    L.push(`**Draft SMS to ${sel.name}**`, '', `Lumela ${sel.name.split(' ').slice(0, 2).join(' ')}. Your Rasiti sales book shows steady trade. Register for Simplified Business Tax on *999# (option 4): it is free, your customers earn double draw entries, and you get a badge banks recognise. Questions? Reply HELP. RSL`, '',
      '*A Sesotho version needs AI mode. Please check any Sesotho text with a fluent speaker.*', '', `Based on: seller ${sel.code} sales (${M(sel.sales_30d)} in 30 days).`);
  } else if (task === 'call' && sel) {
    L.push(`**Call script: ${sel.name}** (code ${sel.code})`, '', '1. Greet and introduce yourself: "Lumela, this is [name] from RSL. Is now a good time?"',
      `2. Explain kindly: "Your return for ${ctx.last_month} showed no sales, but Rasiti receipts show about ${M(sel.receipts_last_month)} that month."`,
      '3. Ask, do not accuse: "Could you help me understand? Was the shop closed, or could the return have a mistake?"',
      '4. Offer help: explain how to correct a return, and that receipts can prefill the next one.',
      sel.complaint_types.length ? `5. Mention gently that some customers said: ${sel.complaint_types.join(', ').toLowerCase()}.` : '5. Thank them for using Rasiti receipts.',
      '6. Agree a next step and a date, and note it in the worklist.', '', `Based on: seller ${sel.code} return and receipts.`);
  } else if (task === 'review') {
    L.push('**Held receipts**', '');
    if (!ctx.held_receipt_groups.length) L.push('Nothing is held right now.');
    ctx.held_receipt_groups.forEach(g => L.push(`- **${g.seller}**: ${g.receipts} receipt${g.receipts === 1 ? '' : 's'}, ${M(g.amount)}. ${g.reasons[0]}${g.hint ? ' Possible innocent reason: ' + g.hint.toLowerCase() + '.' : ''}`));
    L.push('', 'Check each group in the review queue. The sale stays in the seller\'s book whatever you decide.', '', 'Based on: Fraud Shield held receipts.');
  } else if (task === 'areas') {
    const ar = ctx.areas.filter(a => a.receipt_rate_pct != null).sort((a, b) => a.receipt_rate_pct - b.receipt_rate_pct);
    L.push('**Lowest receipt rates, last 30 days**', '');
    ar.slice(0, 4).forEach(a => L.push(`- **${a.area}**: ${a.receipt_rate_pct}% of ${a.ratings} ratings got a receipt; ${a.not_on_rasiti} shop${a.not_on_rasiti === 1 ? '' : 's'} not on Rasiti.`));
    if (ctx.shops_flagged.length) L.push('', 'Shops to visit first:', ...ctx.shops_flagged.slice(0, 4).map(x => `- ${x.shop} (${x.signal}, ${x.people} customers)`));
    L.push('', 'Based on: Community watch ratings.');
  } else if (task === 'report') {
    const k = ctx.kpis;
    L.push(`**Rasiti monthly report** (${ctx.today})`, '', `- Sellers on Rasiti: ${k.sellers_on_rasiti}; registered for tax: ${k.registered}; registered through Rasiti: ${k.registered_through_rasiti}.`,
      `- Receipts in 30 days: ${k.receipts_30d.toLocaleString('en-US')} worth ${M(k.receipted_sales_30d)}.`,
      `- Fraud Shield: ${k.receipts_held} receipts held for review; ${k.fake_codes_stopped} fake or misused codes stopped.`,
      `- Live draw entries this month: ${k.draw_live_entries_this_month.toLocaleString('en-US')}.`, '', '**Recommended next steps**',
      ...ctx.worklist.filter(w => w.priority === 'High').slice(0, 3).map(w => `- ${w.action}: ${w.seller}.`), '', 'Based on: dashboard figures and worklist.');
  } else if (task === 'sbt' && sel) {
    const ok = sel.yearly_estimate < ctx.sbt_income_limit_per_year;
    L.push(`**${sel.name}** (code ${sel.code})`, '', `- Receipts in 30 days: ${M(sel.sales_30d)} × 12 months = about **${M(sel.yearly_estimate)}** a year.`,
      `- SBT limit from the call for innovation: ${M(ctx.sbt_income_limit_per_year)} a year.`, '',
      ok ? 'On receipts alone, the seller appears to be **under** the limit.' : 'On receipts alone, the seller appears to be **over** the limit. Check with the SBT team.',
      'Uncertain: receipts are a minimum (not every sale gets a receipt), trade can be seasonal, and SBT also depends on the sector.', '', `Based on: seller ${sel.code} receipts.`);
  } else {
    L.push('Template mode can answer the buttons on the right. To ask anything in your own words, the administrator needs to add an AI key (see the README).');
  }
  return L.join('\n');
}
function bhFormat(text) {
  const lines = esc(text).split('\n'); let out = '', inList = false, inOl = false;
  const inline = s => s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<i>$2</i>');
  for (const l of lines) {
    const ul = l.match(/^\s*[-•]\s+(.*)/), ol = l.match(/^\s*\d+[.)]\s+(.*)/);
    if (ul) { if (inOl) { out += '</ol>'; inOl = false; } if (!inList) { out += '<ul>'; inList = true; } out += `<li>${inline(ul[1])}</li>`; continue; }
    if (ol) { if (inList) { out += '</ul>'; inList = false; } if (!inOl) { out += '<ol>'; inOl = true; } out += `<li>${inline(ol[1])}</li>`; continue; }
    if (inList) { out += '</ul>'; inList = false; } if (inOl) { out += '</ol>'; inOl = false; }
    const h = l.match(/^#{1,4}\s+(.*)/);
    if (h) out += `<p><b>${inline(h[1])}</b></p>`;
    else if (/^Based on:/i.test(l.trim())) out += `<p class="bh-src">${inline(l)}</p>`;
    else if (l.trim()) out += `<p>${inline(l)}</p>`;
  }
  if (inList) out += '</ul>'; if (inOl) out += '</ol>';
  return out;
}
function bhAdd(role, html, meta) {
  const log = $('#bhLog'); const d = document.createElement('div'); d.className = 'bh-msg ' + role;
  d.innerHTML = (role === 'ai' ? `<img class="bh-av" src="${BH_LOGO}" alt="">` : '') + `<div class="bh-bubble">${html}${meta ? `<div class="bh-meta">${meta}</div>` : ''}</div>`;
  log.appendChild(d); log.scrollTop = log.scrollHeight; return d;
}
async function bhAsk(task, question, seller) {
  if (BH.busy) return; BH.busy = true; $('#bhSend').disabled = true;
  bhAdd('me', esc(question));
  const wait = bhAdd('ai', tillMini() + ' Bohlale is reading the data…');
  const ctx = bhContextFor(question, seller && seller.no, false);
  let answer = null, mode = 'template', model = '', note = '';
  ({answer, mode, model, note} = await bhCall(task, question, ctx, BH.history.slice(-6)));
  if (!answer) { answer = task === 'ask' ? bhLocal(question, bhContextFor(question, seller && seller.no, true)) : bhTemplate(task, ctx, seller); mode = 'template'; }
  wait.remove();
  const meta = (mode === 'ai' ? `AI answer · ${esc(model)} · check before acting` : 'Built-in answer from the data') + (note ? ` · ${esc(note)}` : '');
  const el = bhAdd('ai', bhFormat(answer), meta + ' · <button type="button" class="bh-copy">Copy</button><button type="button" class="bh-copy bh-pdf">Download PDF</button>');
  el.querySelector('.bh-pdf').addEventListener('click', () => answerPDF(question, answer, mode, model));
  el.querySelector('.bh-copy').addEventListener('click', () => { const t = answer; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Copied'), () => toast('Select the text to copy it')); });
  BH.history.push({role:'user', content:question}, {role:'assistant', content:answer});
  log('info', `Bohlale AI answered: ${question.slice(0, 60)}${question.length > 60 ? '…' : ''}`);
  BH.busy = false; $('#bhSend').disabled = false;
}
function bhRunTask(id, sellerNo) {
  const t = BH_TASKS.find(x => x.id === id); if (!t) return;
  if (t.pick) {
    const list = bhPickList(t.pick); let s = tByNo(sellerNo) || tByNo($('#bhSeller').value) || list[0];
    if (t.pick !== 'seller' && !list.includes(s)) { s = list[0]; $('#bhSeller').value = s.no; toast(t.pick === 'nil' ? `Using ${s.name}, who filed a nil return` : `Using ${s.name}, who is not yet registered`); }
    bhAsk(t.id, t.ask(s), s);
  } else bhAsk(t.id, t.ask, null);
}
async function renderBohlale() {
  const sel = $('#bhSeller'); const cur = sel.value;
  sel.innerHTML = S.traders.map(t => `<option value="${t.no}">${esc(t.name)} · ${t.no} (${t.status})</option>`).join('');
  if (cur && tByNo(cur)) sel.value = cur;
  const chip = $('#bhModel');
  if (!API.online) { chip.textContent = 'Offline demo · built-in answers'; chip.className = 'chip'; }
  else if (API.user) {
    try { BH.status = await api('bohlale'); chip.textContent = BH.status.configured ? `AI on · ${BH.status.model} via ${BH.status.provider}` : 'Built-in answers · add an AI key for full answers'; chip.className = 'chip' + (BH.status.configured ? ' ok' : ''); }
    catch { chip.textContent = 'Template mode'; chip.className = 'chip'; }
  }
  if (!$('#bhLog').children.length) bhAdd('ai', bhFormat(`Lumela! I am **Bohlale**, your assistant for Rasiti.\nI read the worklist, receipts, ratings and Fraud Shield results, and I help you understand cases, draft messages and write reports.\nI only suggest. **You decide.** Phone numbers stay masked, and every question is logged.\nAsk me anything about the data: a seller, an area, receipts, the draw, fraud, returns or registration. Or pick a task on the right.`));
}

/* ================= shell: nav, auth, routing ================= */
const NAVICONS = {guide:'<circle cx="12" cy="12" r="9"/><path d="M10 8l6 4-6 4z"/>', phones:'<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>', shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>', watch:'<circle cx="12" cy="12" r="3"/><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/>', officer:'<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>', draw:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>', bohlale:'<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>', users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>'};
const TITLES = {guide:'Start here', phones:'Phones', shield:'Fraud Shield', watch:'Community watch', officer:'Officer console · General Clients', draw:'Monthly draw', bohlale:'Bohlale AI · officer assistant', users:'Users and activity'};
const RSL_VIEWS = ['shield', 'watch', 'officer', 'draw', 'bohlale', 'users'];
const VIEWS = ['guide', 'phones', ...RSL_VIEWS];
function renderNav() {
  const ic = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${NAVICONS[k]}</svg>`;
  const a = k => `<a href="#${k}">${k === 'bohlale' ? `<img class="nav-img" src="${BH_LOGO}" alt="">` : ic(k)}${TITLES[k].split(' ·')[0]}</a>`;
  const showUsers = API.online && API.user && ['owner', 'admin'].includes(API.user.role);
  $('#nav').innerHTML = '<div class="grp">Try it</div>' + a('guide') + a('phones') + '<div class="grp">RSL side' + (API.online && !API.user ? ' · sign in' : '') + '</div>' + a('shield') + a('watch') + a('officer') + a('draw') + a('bohlale') + (showUsers ? a('users') : '');
  const f = $('#sideFoot');
  if (!API.online) f.innerHTML = '<b>Offline demo</b>Not connected to the database.<br>Data resets on reload.';
  else if (API.user) f.innerHTML = `<b>${esc(API.user.name)}</b>${esc(API.user.role[0].toUpperCase() + API.user.role.slice(1))} · ${esc(API.user.email)}<br><button type="button" id="logoutBtn">Sign out</button>`;
  else f.innerHTML = '<b>Public tester</b>Phones are open to everyone.<br><button type="button" id="loginBtn">Officer sign in</button>';
  $('#avatar').textContent = API.user ? API.user.name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() : 'RSL';
  $('#modeChip').textContent = API.online ? 'Live database · mock data' : 'Offline demo · mock data';
  $('#modeChip').className = 'chip' + (API.online ? ' ok' : '');
  $('#refreshBtn').hidden = !API.online;
}
function updateBanner() {
  const b = $('#dbBanner'), t = $('#dbBannerText'), s = $('#seedBtn');
  if (API.online && API.dbEmpty) { b.hidden = false;
    const can = API.user && ['owner', 'admin'].includes(API.user.role);
    t.textContent = can ? 'The database is empty. Load the demo dataset so testers and officers share the same data.' : 'The database is empty, so you are seeing local demo data that is not saved. An owner or admin needs to sign in and load the demo dataset.';
    s.hidden = !can; }
  else b.hidden = true;
}
const currentView = () => { const h = location.hash.slice(1); return VIEWS.includes(h) ? h : 'guide'; };
function route() {
  const v = currentView();
  const needLogin = API.online && RSL_VIEWS.includes(v) && !API.user;
  const noAccess = v === 'users' && !(API.online && API.user && ['owner', 'admin'].includes(API.user.role));
  $('#login').hidden = !needLogin;
  const show = noAccess ? 'guide' : v;
  document.querySelectorAll('[data-view]').forEach(s => s.hidden = s.dataset.view !== show);
  document.querySelectorAll('#nav a').forEach(a => a.setAttribute('aria-current', a.getAttribute('href') === '#' + show ? 'page' : 'false'));
  $('#pageTitle').textContent = TITLES[show];
  if (needLogin) setTimeout(() => $('#lEmail').focus(), 50);
  if (show === 'watch') setTimeout(renderWatch, 0);
  if (show === 'officer') renderOfficer();
  if (show === 'users') renderUsers();
  renderHist();
  if (show === 'bohlale') renderBohlale();
  window.scrollTo(0, 0);
}
function renderAll() { reEvalIfNeeded(); renderShield(); renderWatch(); renderOfficer(); renderDraw(); }
function reEvalIfNeeded() { if (!S.eval || Object.keys(S.eval).length !== S.receipts.length) reEval(); }

/* ================= events ================= */
function wire() {
  $('#cases').innerHTML = CASES.map((c, i) => `<button type="button" class="case" data-case="${i}"><span class="tag ${c.cls}">${c.tag}</span><b>${c.t}</b><small>${c.d}</small></button>`).join('');
  $('#cases').addEventListener('click', e => { const b = e.target.closest('[data-case]'); if (b) CASES[+b.dataset.case].run(); });
  $('#qrForm').addEventListener('submit', e => { e.preventDefault(); const no = $('#qrSeller').value; const a = parseFloat($('#qrAmt').value); if (!(a > 0)) return;
    const r = issue(no, a, 'momo', PH.c.who); PH.c.st = 'end'; show('c', `M-Pesa: paid ${M(a)} to\n${tByNo(no).name} (${no})\n\n🧾 Rasiti receipt\n${r.code}\n+${entriesFor(r)} draw entries\n\n0. Menu`); toast('Receipt issued: ' + r.code); });
  $('#streamFilters').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) { S.filter = b.dataset.f; renderShield(); } });
  $('#shopFilters').addEventListener('click', e => { const b = e.target.closest('[data-sf]'); if (b) { WF.sig = b.dataset.sf; renderWatch(); } });
  $('#wfType').innerHTML = '<option value="all">All problems</option>' + Object.entries(REPTYPE).filter(x => x[0] !== 'got').map(x => `<option value="${x[0]}">${x[1]}</option>`).join('');
  const wfSet = () => { WF.days = +$('#wfDays').value; WF.area = $('#wfArea').value; WF.who = $('#wfWho').value; WF.ctype = $('#wfType').value; renderWatch(); };
  ['#wfDays', '#wfArea', '#wfWho', '#wfType'].forEach(id => $(id).addEventListener('change', wfSet));
  $('#wfReset').addEventListener('click', () => { Object.assign(WF, {days:30, area:'all', who:'all', sig:'all', ctype:'all'}); $('#wfDays').value = '30'; $('#wfWho').value = 'all'; $('#wfType').value = 'all'; renderWatch(); });
  document.querySelector('section[data-view="watch"]').addEventListener('click', e => { const c = e.target.closest('[data-csv]'); if (c) watchCSV(c.dataset.csv); });
  $('#wfPdf').addEventListener('click', watchPDF);
  $('#waTasks').innerHTML = WA_TASKS.map(t => `<button type="button" data-wt="${t.id}">${t.label}</button>`).join('');
  $('#waTasks').addEventListener('click', e => { const b = e.target.closest('[data-wt]'); if (b) { const t = WA_TASKS.find(x => x.id === b.dataset.wt); watchAsk(t.id, t.ask); } });
  $('#waForm').addEventListener('submit', e => { e.preventDefault(); const v = $('#waIn').value.trim(); if (!v) return; $('#waIn').value = ''; watchAsk('ask', v); });
  $('#waOut').addEventListener('click', e => { const b = e.target.closest('[data-wa]'); if (!b || !WA.last) return; const l = WA.last;
    if (b.dataset.wa === 'pdf') answerPDF(l.question + ' (' + l.filters + ')', l.answer, l.mode, l.model, 'Bohlale AI: community watch analysis');
    else (navigator.clipboard ? navigator.clipboard.writeText(l.answer) : Promise.reject()).then(() => toast('Copied'), () => toast('Select the text to copy it')); });
  const onSel = (id, fn) => $(id).addEventListener('change', e => { fn(e.target.value); });
  onSel('#sfDays', v => { SF.days = v; renderShield(); }); onSel('#sfSeller', v => { SF.seller = v; renderShield(); }); onSel('#sfRule', v => { SF.rule = v; renderShield(); });
  $('#sfReset').addEventListener('click', () => { Object.assign(SF, {days:'30', seller:'all', rule:'all'}); S.filter = 'all'; $('#sfDays').value = '30'; renderShield(); });
  onSel('#ofPri', v => { OF.pri = v; renderOfficer(); }); onSel('#ofArea', v => { OF.area = v; renderOfficer(); }); onSel('#ofStatus', v => { OF.status = v; renderOfficer(); });
  $('#ofReset').addEventListener('click', () => { Object.assign(OF, {pri:'all', area:'all', status:'all'}); $('#ofPri').value = 'all'; $('#ofStatus').value = 'all'; renderOfficer(); });
  onSel('#actWho', () => renderUsers());
  document.addEventListener('click', e => { const b = e.target.closest('[data-dl]'); if (!b) return; const k = b.dataset.dl;
    ({'shield-csv':shieldCSV, 'fakes-csv':fakesCSV, 'shield-pdf':shieldPDF, 'work-csv':() => officerCSV('work'), 'review-csv':() => officerCSV('review'), 'complaints-csv':() => officerCSV('complaints'), 'officer-pdf':officerPDF,
      'entries-csv':() => drawCSV('entries'), 'winners-csv':() => drawCSV('winners'), 'draw-pdf':drawPDF, 'activity-csv':activityCSV})[k](); });
  const tip = $('#vizTip');
  document.addEventListener('mousemove', e => { const t = e.target.closest && e.target.closest('.chart [data-tip]'); if (!t) { tip.hidden = true; return; }
    tip.textContent = t.getAttribute('data-tip'); tip.hidden = false; const w = tip.offsetWidth; tip.style.left = Math.min(window.innerWidth - w - 8, e.clientX + 14) + 'px'; tip.style.top = (e.clientY + 16) + 'px'; });
  $('#reviewTbl').addEventListener('click', async e => { const b = e.target.closest('[data-rv]'); if (!b) return; const cs = b.dataset.c.split(','); const d = b.dataset.rv;
    const prev = Object.fromEntries(cs.map(c => [c, S.reviews[c] || '']));
    try { await setReview(cs, d); } catch (er) { toast(er.message); return; }
    pushHist({label:`${d === 'approved' ? 'approval' : 'rejection'} of ${cs.length} receipt${cs.length > 1 ? 's' : ''}`,
      undo:async () => { const g = {}; cs.forEach(c => (g[prev[c]] = g[prev[c]] || []).push(c)); for (const k in g) await setReview(g[k], k || null); },
      redo:() => setReview(cs, d)});
    log(d === 'approved' ? 'ok' : 'bad', `Officer ${d} entries for ${cs.length} receipt${cs.length > 1 ? 's' : ''}`); toast(API.online ? 'Decision saved and logged' : 'Decision recorded (offline)'); renderAll(); });
  $('#bhTasks').innerHTML = BH_TASKS.map(t => `<button type="button" class="bh-task" data-task="${t.id}">${t.label}${t.pick ? ' <small>uses the seller below</small>' : ''}</button>`).join('');
  $('#bhTasks').addEventListener('click', e => { const b = e.target.closest('[data-task]'); if (b) bhRunTask(b.dataset.task); });
  $('#bhForm').addEventListener('submit', e => { e.preventDefault(); const i = $('#bhIn'); const v = i.value.trim(); if (!v) return; i.value = ''; bhAsk('ask', v, tByNo($('#bhSeller').value)); });
  $('#workTbl').addEventListener('click', e => { const a = e.target.closest('[data-ask]'); if (!a) return; location.hash = '#bohlale'; setTimeout(() => { $('#bhSeller').value = a.dataset.ask; bhRunTask('explain', a.dataset.ask); }, 150); });
  $('#workTbl').addEventListener('click', async e => { const b = e.target.closest('[data-w]'); if (!b) return; const it = worklist().find(i => i.id === b.dataset.w); if (!it) return;
    try { await setAction(it, true); } catch (er) { toast(er.message); return; }
    pushHist({label:`"${it.btn}" for ${it.subj.name}`, undo:() => setAction(it, false), redo:() => setAction(it, true)});
    if (it.kind === 'invite') toast('Invitation SMS sent (simulated)');
    else if (it.kind === 'visit') toast(it.btn === 'Refer' ? 'Referred to the compliance team' : "Visit added to the market tax helper's route");
    else toast('Marked done');
    log('info', `${it.act}: ${it.btn}`); renderAll(); });
  $('#runTest').addEventListener('click', () => runTest(2026));
  $('#runTest2').addEventListener('click', () => runTest((Date.now() % 1e6) >>> 0));
  $('#runDraw').addEventListener('click', runDraw);
  $('#undoBtn').addEventListener('click', undo); $('#redoBtn').addEventListener('click', redo);
  document.addEventListener('keydown', e => { if (!(e.ctrlKey || e.metaKey) || e.altKey) return; const tg = e.target; if (tg.closest && tg.closest('input,textarea,select,[contenteditable]')) return;
    if (!RSL_VIEWS.includes(currentView()) || !canWork()) return; const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); } else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); redo(); } });
  $('#clearForm').addEventListener('submit', async e => { e.preventDefault(); $('#clearErr').textContent = '';
    if ($('#clearIn').value.trim() !== 'CLEAR') { $('#clearErr').textContent = 'Type CLEAR in capital letters to confirm.'; return; }
    showLoader('Clearing all data…'); const t0 = Date.now();
    try { const r = await api('admin', {op:'clear', confirm:'CLEAR'}); $('#clearIn').value = ''; HIST.u = []; HIST.r = []; S.lastDraw = null; showWinners(null);
      API.dbEmpty = true; seed(); reEval(); renderAll(); fillSelects(); updateBanner(); renderUsers(); renderHist();
      await sleep(Math.max(0, 2400 - (Date.now() - t0))); toast(`All data cleared${r.users_removed ? ', ' + r.users_removed + ' other users removed' : ''}`); }
    catch (er) { $('#clearErr').textContent = er.message; } finally { hideLoader(); } });
  $('#refreshBtn').addEventListener('click', () => refresh(false));
  $('#seedBtn').addEventListener('click', async () => { const b = $('#seedBtn'); b.disabled = true; b.textContent = 'Loading…';
    try { seed(); const res = await api('admin', {op:'seed', data:exportSeed()}); toast(`Loaded ${res.counts.receipts} receipts and ${res.counts.sellers} sellers`); await refresh(true); }
    catch (e) { toast(e.message); } finally { b.disabled = false; b.textContent = 'Load demo dataset'; } });
  document.addEventListener('click', async e => {
    if (e.target.id === 'loginBtn') { location.hash = '#officer'; }
    if (e.target.id === 'logoutBtn') { await api('auth', {op:'logout'}).catch(() => {}); API.user = null; renderNav(); updateBanner(); location.hash = '#guide'; route(); toast('Signed out'); }
  });
  $('#loginForm').addEventListener('submit', async e => { e.preventDefault(); $('#loginErr').textContent = '';
    try { const {user} = await api('auth', {op:'login', email:$('#lEmail').value, password:$('#lPass').value}); API.user = user; $('#lPass').value = '';
      renderNav(); updateBanner(); await refresh(true); route(); toast('Signed in as ' + user.name); }
    catch (er) { $('#loginErr').textContent = er.message; } });
  $('#lEye').addEventListener('click', () => { const i = $('#lPass'); i.type = i.type === 'password' ? 'text' : 'password'; });
  $('#genPass').addEventListener('click', () => { $('#uPass').value = genPass(); });
  $('#userForm').addEventListener('submit', async e => { e.preventDefault(); $('#userErr').textContent = '';
    try { await api('users', {op:'create', name:$('#uName').value, email:$('#uEmail').value, role:$('#uRole').value, password:$('#uPass').value});
      toast(`Added ${$('#uName').value}. Share the temporary password with them privately.`); e.target.reset(); renderUsers(); }
    catch (er) { $('#userErr').textContent = er.message; } });
  $('#usersTbl').addEventListener('change', async e => { const s = e.target.closest('[data-role]'); if (!s) return;
    try { await api('users', {op:'update', id:+s.dataset.role, role:s.value}); toast('Role changed'); } catch (er) { toast(er.message); } renderUsers(); });
  $('#usersTbl').addEventListener('click', async e => {
    const a = e.target.closest('[data-act]'); const r = e.target.closest('[data-reset]');
    try {
      if (a) { await api('users', {op:'update', id:+a.dataset.act, active:a.dataset.on === '1'}); toast(a.dataset.on === '1' ? 'User switched on' : 'User switched off'); renderUsers(); }
      if (r) { const p = genPass(); await api('users', {op:'reset', id:+r.dataset.reset, password:p}); r.outerHTML = `<span class="codebox">${p}</span>`; toast('New temporary password shown. Share it privately.'); }
    } catch (er) { toast(er.message); } });
  $('#pwForm').addEventListener('submit', async e => { e.preventDefault(); $('#pwErr').textContent = '';
    try { await api('auth', {op:'password', current:$('#pwCur').value, next:$('#pwNew').value}); e.target.reset(); toast('Password changed'); } catch (er) { $('#pwErr').textContent = er.message; } });
  let armed = 0; $('#resetBtn').addEventListener('click', async () => { const b = $('#resetBtn');
    if (Date.now() - armed > 4000) { armed = Date.now(); b.textContent = 'Click again to delete all demo data'; setTimeout(() => b.textContent = 'Reset demo data', 4000); return; }
    try { await api('admin', {op:'reset'}); toast('Demo data deleted'); API.dbEmpty = true; seed(); reEval(); renderAll(); fillSelects(); updateBanner(); renderUsers(); } catch (er) { toast(er.message); } b.textContent = 'Reset demo data'; });
  window.addEventListener('hashchange', route);
  let rzT; window.addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(() => { if (currentView() === 'watch') renderWatch(); }, 250); });
  setInterval(() => { if (API.online && API.user && RSL_VIEWS.includes(currentView()) && !document.hidden) refresh(true); }, 30000);
}

/* ================= boot ================= */
async function boot() {
  $('#busy').innerHTML = TILL_SVG + '<span>Working…</span>';
  buildPhone('t'); buildPhone('c'); wire();
  try {
    const st = await api('state'); API.online = true; API.dbEmpty = !!st.empty;
    if (st.empty) seed(); else loadState(st);
    try { const a = await api('auth'); API.user = a.user; API.setupNeeded = a.setupNeeded; } catch {}
  } catch { API.online = false; seed(); }
  reEval(); fillSelects();
  for (const k of ['t', 'c']) uRender(k);
  setMode('t', 'ussd'); setMode('c', 'wa');
  renderNav(); updateBanner(); renderFeed(); renderAll(); route();
  const r = S.receipts.find(x => x.no === '3307' && !x.ph && x.t > clock - 10 * DAY) || S.receipts.find(x => x.no === '3307');
  if (r) $('#sampleCode').textContent = r.code;
  const g = chk('3307ZZ8Q'); $('#sampleFake').textContent = 'RS-3307-ZZ8Q-' + AL[(AL.indexOf(g) + 7) % 31];
  const ld = $('#loader'); setTimeout(() => { ld.classList.add('out'); setTimeout(() => { ld.hidden = true; }, 450); }, Math.max(0, 4800 - performance.now()));
  log('info', API.online ? (API.dbEmpty ? 'Connected. Database is empty, using local demo data.' : `Connected to the database: ${S.traders.length} sellers, ${S.receipts.length.toLocaleString('en-US')} receipts`) : 'Offline demo: mock data in your browser only');
}
boot();
})();
