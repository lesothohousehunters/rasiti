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
    for (let i = 0; i < n; i++) S.reports.push({id:rid(), t:NOW - Math.floor(rnd() * 29 * DAY) - 3600000, ph:global[Math.floor(rnd() * 160)], type:rnd() < rate ? 'got' : (rnd() < .6 ? 'none' : 'unlisted'), target:tg, lat:ll[0], lng:ll[1]}); }
  const TRATE = {'3307':[22,.95],'4821':[14,.8],'5140':[17,.55],'6018':[8,.9],'7735':[6,.7],'3902':[12,.85],'2264':[1,1]};
  for (const no in TRATE) { const [n, rate] = TRATE[no]; for (let i = 0; i < n; i++) S.reports.push({id:rid(), t:NOW - Math.floor(rnd() * 29 * DAY) - 3600000, ph:global[Math.floor(rnd() * 160)], type:rnd() < rate ? 'got' : 'none', target:{no}}); }
}
function sumWin(no, fromAgo, toAgo) { return S.receipts.filter(r => r.no === no && r.t >= clock - fromAgo * DAY - 12 * 3600000 && r.t < clock - toAgo * DAY + 12 * 3600000).reduce((a, r) => a + r.amt, 0); }

/* ================= API ================= */
async function api(path, payload) {
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
    const st = await api('state');
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
  const all = S.receipts; const st = r => shieldState(r); const n = s => all.filter(r => st(r) === s).length;
  $('#shieldKpis').innerHTML = [[all.length.toLocaleString('en-US'), 'Receipts scored'], [n('clear') + n('approved'), 'Clear'], [n('held'), 'Held for an officer'], [n('blocked') + n('rejected'), 'Blocked from the draw'], [S.fakes.length, 'Fake or misused codes stopped']].map(kpi).join('');
  const hits = {}; for (const c in S.eval) S.eval[c].flags.forEach(f => hits[f.id] = (hits[f.id] || 0) + 1);
  $('#rulesTbl').innerHTML = '<tr><th>Rule</th><th class="num">Points</th><th class="num">Hits</th></tr>' + RULES.map(r => `<tr><td><b>${r.name}</b><div class="note">${r.what}</div></td><td class="num">${r.pts}</td><td class="num">${hits[r.id] || 0}</td></tr>`).join('') +
    '<tr><td colspan="3" class="note">Every code a customer enters is also checked: the check character, the register, the amount on paper, and whether another phone already claimed it.</td></tr>';
  $('#fakesTbl').innerHTML = '<tr><th>When</th><th>Code</th><th>What happened</th></tr>' + S.fakes.slice().sort((a, b) => b.t - a.t).slice(0, 30).map(f => `<tr><td class="mono">${fT(f.t)}</td><td class="mono">${esc(f.code)}</td><td><span class="pill p-bad">${FAKEPILL[f.kind]}</span><div class="note">${esc(f.detail)}</div></td></tr>`).join('');
  const F = [['all', 'Flagged'], ['held', 'Held'], ['blocked', 'Blocked'], ['live', 'Latest']];
  $('#streamFilters').innerHTML = F.map(f => `<button type="button" data-f="${f[0]}" aria-pressed="${S.filter === f[0]}">${f[1]}</button>`).join('');
  let rows; if (S.filter === 'live') rows = all.slice(-25).reverse();
  else rows = all.filter(r => { const s = st(r); return S.filter === 'all' ? s !== 'clear' : S.filter === 'held' ? s === 'held' : (s === 'blocked' || s === 'rejected'); }).reverse();
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
function renderWatchMap(st) {
  const m = getMap('watchMap'); if (!m) return; m.layer.clearLayers();
  const ar = {};
  for (const x of st) { const a = ar[x.area] = ar[x.area] || {n:0, got:0}; a.n += x.n; a.got += x.got; }
  for (const [name, a] of Object.entries(ar)) { const c = AREAS[name]; if (!c) continue; const pc = Math.round(a.got / a.n * 100);
    L.circle(c, {radius:120 + a.n * 6, color:'#fff', weight:1.5, fillColor:pc >= 80 ? '#1d9e57' : pc < 50 ? '#f0a020' : '#3b82f6', fillOpacity:.22}).bindPopup(`<b>${esc(name)}</b>${a.n} ratings · ${pc}% got a receipt`).addTo(m.layer); }
  for (const x of st) { if (!x.ll) continue;
    L.circleMarker(x.ll, {radius:x.on ? 8 : 7, color:'#fff', weight:2, fillColor:SIGCOL[x.sig], fillOpacity:1}).bindPopup(`<b>${esc(x.label)}</b>${esc(x.kind)} · ${esc(x.area)}<br>${x.n} ratings from ${x.people.size} people<br>${x.rate === null ? 'Too few ratings to judge' : Math.round(x.rate * 100) + '% got a receipt'}`).addTo(m.layer); }
  setTimeout(() => m.map.invalidateSize(), 50);
}
function renderLeadMap(wl) {
  const m = getMap('leadMap'); if (!m) return; m.layer.clearLayers();
  for (const i of wl) { if (!i.ll) continue; const col = i.pri >= 3 ? '#d93025' : i.pri === 2 ? '#f0a020' : '#9aa0ad';
    L.circleMarker(i.ll, {radius:9, color:'#fff', weight:2, fillColor:col, fillOpacity:1}).bindPopup(`<b>${esc(i.subj.name)}</b>${esc(i.act)}`).addTo(m.layer); }
  setTimeout(() => m.map.invalidateSize(), 50);
}

/* ================= Community watch ================= */
function shopStats() { const spam = spamPhones(); const by = {};
  for (const r of S.reports) { if (r.t < clock - 30 * DAY || spam.has(r.ph)) continue; const k = r.target.no ? 'T' + r.target.no : 'P' + r.target.place; const tr = r.target.no && tByNo(r.target.no);
    if (r.target.no && !tr) continue;
    const e = by[k] = by[k] || {label:tr ? `${tr.name} · ${tr.trade}` : r.target.label, area:tr ? tr.market : (r.target.area || 'Area not given'), on:!!tr, kind:tr ? 'On Rasiti' : (r.target.kind || 'Informal'), got:0, neg:0, people:new Set(), negP:new Set(), lls:[], tr};
    if (r.type === 'got') e.got++; else { e.neg++; e.negP.add(r.ph); } e.people.add(r.ph); if (r.lat != null) e.lls.push([r.lat, r.lng]); }
  return Object.values(by).map(e => { const n = e.got + e.neg; const rate = e.people.size >= 3 ? e.got / n : null;
    const sig = rate === null ? 'few' : (!e.on && e.negP.size >= 3) ? 'lead' : rate >= .8 ? 'good' : rate < .5 ? 'low' : 'mid';
    const ll = e.tr ? traderLL(e.tr) : e.lls.length ? [e.lls.reduce((a, x) => a + x[0], 0) / e.lls.length, e.lls.reduce((a, x) => a + x[1], 0) / e.lls.length] : null;
    return {...e, n, rate, sig, badge:sig === 'good', ll}; }).sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1)); }
const SIG = {good:'<span class="pill p-ok">Gives receipts</span>', mid:'<span class="pill p-info">Mixed</span>', low:'<span class="pill p-warn">Low receipts</span>', lead:'<span class="pill p-bad">New lead</span>', few:'<span class="pill p-mute">Too few to judge</span>'};
let shopF = 'all';
function renderWatch() { const st = shopStats(); const rs = S.reports.filter(r => r.t > clock - 30 * DAY); const ppl = new Set(rs.map(r => r.ph));
  const got = st.reduce((a, x) => a + x.got, 0), all = st.reduce((a, x) => a + x.n, 0) || 1;
  $('#watchKpis').innerHTML = [[rs.length, 'Shop ratings, 30 days'], [ppl.size, 'People taking part'], [st.length, 'Shops seen'], [st.filter(x => !x.on).length, 'Shops not on Rasiti'], [Math.round(got / all * 100) + '%', 'Purchases with a receipt']].map(kpi).join('');
  const ar = {}; for (const x of st) { const a = ar[x.area] = ar[x.area] || {shops:0, off:0, n:0, got:0, leads:0}; a.shops++; if (!x.on) a.off++; a.n += x.n; a.got += x.got; if (x.sig === 'lead') a.leads++; }
  $('#areaTbl').innerHTML = '<tr><th>Area</th><th class="num">Shops</th><th class="num">Not on Rasiti</th><th>Got a receipt</th><th class="num">Leads</th></tr>' + Object.entries(ar).sort((a, b) => a[1].got / a[1].n - b[1].got / b[1].n).map(([k, a]) => { const pc = Math.round(a.got / a.n * 100);
    return `<tr><td>${esc(k)}<div class="note">${a.n} ratings</div></td><td class="num">${a.shops}</td><td class="num">${a.off}</td><td style="min-width:130px"><div class="fn" style="grid-template-columns:1fr 40px"><span class="bar"><i style="width:${pc}%;background:${pc >= 80 ? 'var(--green)' : pc < 50 ? 'var(--warn)' : 'var(--accent)'}"></i></span><b>${pc}%</b></div></td><td class="num">${a.leads}</td></tr>`; }).join('');
  const F = [['all', 'All'], ['lead', 'New leads'], ['low', 'Low receipts'], ['good', 'Gives receipts']];
  $('#shopFilters').innerHTML = F.map(f => `<button type="button" data-sf="${f[0]}" aria-pressed="${shopF === f[0]}">${f[1]}</button>`).join('');
  $('#shopTbl').innerHTML = '<tr><th>Shop</th><th>Type</th><th class="num">People</th><th class="num">Got receipt</th><th>Signal</th></tr>' + st.filter(x => shopF === 'all' || x.sig === shopF).map(x => `<tr><td>${esc(x.label)}<div class="note">${esc(x.area)}</div></td><td>${esc(x.kind)}</td><td class="num">${x.people.size}</td><td class="num">${x.rate === null ? '–' : Math.round(x.rate * 100) + '%'}</td><td>${SIG[x.sig]}</td></tr>`).join('');
  if (currentView() === 'watch') renderWatchMap(st);
}

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
  $('#reportsTbl').innerHTML = '<tr><th>Shop</th><th class="num">Customers</th><th class="num">Discounted</th><th>Status</th></tr>' + groups.filter(g => g.indep > 0 || g.discounted > 0).sort((a, b) => b.indep - a.indep).slice(0, 8).map(g => { const nm = g.target.no ? (tByNo(g.target.no) || {name:g.target.no}).name : g.target.label;
    return `<tr><td>${esc(nm)}<div class="note">${[...new Set(g.list.filter(x => x.type !== 'got').map(x => REPTYPE[x.type]))].join(', ')}</div></td><td class="num">${g.indep}</td><td class="num">${g.discounted}</td><td>${g.indep >= 3 ? '<span class="pill p-bad">Act</span>' : g.indep > 0 ? '<span class="pill p-mute">Watching</span>' : '<span class="pill p-mute">Discounted</span>'}</td></tr>`; }).join('');
  const wl = worklist(); const dis = canWork() ? '' : ' disabled title="Viewers cannot take actions"';
  $('#workTbl').innerHTML = '<tr><th>Priority</th><th>Seller</th><th>Recommended action and why</th><th></th></tr>' + wl.map(i => `<tr><td>${PRI[i.pri]}</td><td><b>${esc(i.subj.name)}</b><div class="note">${esc([i.subj.trade, i.subj.market].filter(Boolean).join(' · '))}${i.subj.no ? ' · code ' + i.subj.no : ''}</div></td><td>${esc(i.act)}<ul class="why">${i.why.map(w => `<li>${esc(w)}</li>`).join('')}</ul></td><td>${i.btn ? `<button class="btn small" data-w="${esc(i.id)}"${dis}>${i.btn}</button>` : ''}</td></tr>`).join('');
  const hr = S.receipts.filter(r => shieldState(r) === 'held').reverse(); const grp = {};
  for (const r of hr) { const ids = S.eval[r.code].flags.map(f => f.id).sort(); const k = r.no + '|' + ids.join(',') + '|' + (ids.includes('ring') ? '' : r.ph + '|' + (ids.includes('outlier') ? r.code : '')); (grp[k] = grp[k] || []).push(r); }
  $('#reviewTbl').innerHTML = '<tr><th>Case</th><th>Seller</th><th class="num">Amount</th><th>Why it was held</th><th>Decision</th></tr>' + Object.values(grp).map(rs => { const r = rs[0]; const e = S.eval[r.code]; const tr = tByNo(r.no) || {name:r.no}; const phs = new Set(rs.map(x => x.ph)); const codes = rs.map(x => x.code).join(',');
    return `<tr><td><b>${rs.length} receipt${rs.length > 1 ? 's' : ''}</b><div class="note">${phs.size} phone${phs.size > 1 ? 's' : ''} · latest ${fT(r.t)}</div><details><summary>Codes</summary><div class="mono">${rs.map(x => x.code + ' ' + mask(x.ph)).join('<br>')}</div></details></td><td>${esc(tr.name)}</td><td class="num">${M(rs.reduce((a, x) => a + x.amt, 0))}</td><td><ul class="why" style="margin:0">${e.flags.map(f => `<li>${esc(f.why)}</li>`).join('')}</ul>${r.note ? `<div class="note">Hint: ${esc(r.note)}</div>` : ''}</td><td style="white-space:nowrap"><button class="btn small" data-rv="approved" data-c="${codes}"${dis}>Approve entries</button> <button class="btn small" data-rv="rejected" data-c="${codes}"${dis}>Reject</button></td></tr>`; }).join('') + (hr.length ? '<tr><td colspan="5" class="note">Either way, the sale stays in the seller\'s sales book. Only draw entries are decided here.</td></tr>' : '<tr><td colspan="5" class="note">Queue empty.</td></tr>');
  if (currentView() === 'officer') renderLeadMap(wl);
}

/* ================= Draw ================= */
function pool() { const wk = S.receipts.filter(r => r.t >= monthStart()); const o = {active:0, reg:0, held:0, excluded:0}; const by = {};
  for (const r of wk) { const s = drawStatus(r); if (s === 'none') continue; const e = entriesFor(r); o[s] += e; if (s === 'active') { const tr = tByNo(r.no); if (tr && tr.status === 'registered') o.reg += e; (by[r.ph] = by[r.ph] || {e:0, rs:[]}).e += e; by[r.ph].rs.push(r); } } return {o, by}; }
function renderDraw() { const {o, by} = pool();
  $('#drawTitle').textContent = `This month's draw (${fD(monthStart())} to ${fD(drawDay())})`;
  $('#drawKpis').innerHTML = [[o.active.toLocaleString('en-US'), 'Live entries'], [Object.keys(by).length, 'Customers in the draw'], [o.reg.toLocaleString('en-US'), 'From registered sellers (double)'], [o.held, 'Held for review'], [o.excluded, 'Excluded by Fraud Shield']].map(kpi).join('');
  $('#runDraw').disabled = !canWork();
  const pd = $('#pastDrawsPanel'); pd.hidden = !S.draws.length;
  $('#pastDraws').innerHTML = '<tr><th>When</th><th class="num">Live entries</th><th>Seed</th><th>Winners</th></tr>' + S.draws.map(d => `<tr><td>${fT(Date.parse(d.run_at))}</td><td class="num">${d.live_entries}</td><td class="mono">${d.seed}</td><td>${(d.winners || []).map(w => esc(w.phone) + ' (' + esc(w.prize) + ')').join('<br>')}</td></tr>`).join(''); }
function runDraw() { const {o, by} = pool(); const seedv = (Date.now() % 1e9) >>> 0; const r = mulberry32(seedv); const phones = Object.keys(by);
  const prizes = [['1st', 'M5,000 cash', 'M500'], ['2nd', 'M2,000 cash', 'M200'], ['3rd', 'M1,000 cash', 'M100']]; const pick = [];
  for (let i = 0; i < 3 && phones.length; i++) { const tot = phones.reduce((a, p) => a + by[p].e, 0); let x = r() * tot; let ch = phones[0]; for (const p of phones) { x -= by[p].e; if (x <= 0) { ch = p; break; } } pick.push(ch); phones.splice(phones.indexOf(ch), 1); }
  const winners = pick.map((p, i) => { const rr = by[p].rs[Math.floor(r() * by[p].rs.length)]; const tr = tByNo(rr.no); return {place:prizes[i][0], prize:prizes[i][1], bonus:prizes[i][2], phone:mask(p), entries:by[p].e, code:rr.code, seller:tr.name, market:tr.market}; });
  $('#winners').innerHTML = winners.map(w => `<div class="win"><div class="place">${w.place} prize</div><div class="prize">${w.prize}</div><div>${w.phone} · ${w.entries} entries</div><div class="note">Winning receipt ${w.code}<br>Seller bonus ${w.bonus} to ${esc(w.seller)}, ${esc(w.market)}</div></div>`).join('');
  $('#drawAudit').textContent = `Audit record: seed ${seedv}, ${o.active} live entries, ${o.held + o.excluded} entries left out by the Fraud Shield. 20 runner-up prizes of M100 airtime are drawn the same way. Publishing the seed and entry list lets anyone re-run the draw and get the same winners.`;
  log('ok', `Draw run: 3 winners from ${o.active} live entries`);
  if (API.online && !API.dbEmpty) api('admin', {op:'draw', seed:seedv, live:o.active, winners}).then(() => refresh(true)).catch(e => toast('Draw not saved: ' + e.message)); }

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
    $('#activityTbl').innerHTML = '<tr><th>When</th><th>Who</th><th>What</th></tr>' + activity.map(a => `<tr><td class="mono">${fT(Date.parse(a.at))}</td><td>${esc(a.user_email || 'system')}</td><td>${esc(a.action.replace(/_/g, ' '))}<div class="note">${esc(Object.entries(a.detail || {}).filter(([, v]) => v != null).map(([k, v]) => k + ': ' + v).join(' · '))}</div></td></tr>`).join('');
    $('#dataPanel').hidden = me.role !== 'owner';
  } catch (e) { $('#usersTbl').innerHTML = `<tr><td class="err">${esc(e.message)}</td></tr>`; }
}
const genPass = () => { const a = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'; const b = new Uint32Array(14); crypto.getRandomValues(b); return Array.from(b, x => a[x % a.length]).join('') + '!'; };

/* ================= shell: nav, auth, routing ================= */
const NAVICONS = {guide:'<circle cx="12" cy="12" r="9"/><path d="M10 8l6 4-6 4z"/>', phones:'<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>', shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>', watch:'<circle cx="12" cy="12" r="3"/><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/>', officer:'<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>', draw:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>', users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>'};
const TITLES = {guide:'Start here', phones:'Phones', shield:'Fraud Shield', watch:'Community watch', officer:'Officer console · General Clients', draw:'Monthly draw', users:'Users and activity'};
const RSL_VIEWS = ['shield', 'watch', 'officer', 'draw', 'users'];
const VIEWS = ['guide', 'phones', ...RSL_VIEWS];
function renderNav() {
  const ic = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${NAVICONS[k]}</svg>`;
  const a = k => `<a href="#${k}">${ic(k)}${TITLES[k].split(' ·')[0]}</a>`;
  const showUsers = API.online && API.user && ['owner', 'admin'].includes(API.user.role);
  $('#nav').innerHTML = '<div class="grp">Try it</div>' + a('guide') + a('phones') + '<div class="grp">RSL side' + (API.online && !API.user ? ' · sign in' : '') + '</div>' + a('shield') + a('watch') + a('officer') + a('draw') + (showUsers ? a('users') : '');
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
  if (show === 'watch') renderWatch();
  if (show === 'officer') renderOfficer();
  if (show === 'users') renderUsers();
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
  $('#shopFilters').addEventListener('click', e => { const b = e.target.closest('[data-sf]'); if (b) { shopF = b.dataset.sf; renderWatch(); } });
  $('#reviewTbl').addEventListener('click', async e => { const b = e.target.closest('[data-rv]'); if (!b) return; const cs = b.dataset.c.split(','); const d = b.dataset.rv;
    try { if (API.online && !API.dbEmpty) await api('admin', {op:'review', codes:cs, decision:d}); } catch (er) { toast(er.message); return; }
    cs.forEach(c => S.reviews[c] = d); log(d === 'approved' ? 'ok' : 'bad', `Officer ${d} entries for ${cs.length} receipt${cs.length > 1 ? 's' : ''}`); toast(API.online ? 'Decision saved and logged' : 'Decision recorded (offline)'); renderAll(); });
  $('#workTbl').addEventListener('click', async e => { const b = e.target.closest('[data-w]'); if (!b) return; const it = worklist().find(i => i.id === b.dataset.w); if (!it) return;
    try { if (API.online && !API.dbEmpty) await api('admin', {op:'action', item_id:it.id, kind:it.kind || 'done', target:it.target || '', label:it.act}); } catch (er) { toast(er.message); return; }
    if (it.kind === 'invite') { S.invited.add(it.target); toast('Invitation SMS sent (simulated)'); }
    else if (it.kind === 'visit') { S.visits.add(it.target); toast(it.btn === 'Refer' ? 'Referred to the compliance team' : "Visit added to the market tax helper's route"); }
    else { S.done.add(it.id); toast('Marked done'); }
    log('info', `${it.act}: ${it.btn}`); renderAll(); });
  $('#runTest').addEventListener('click', () => runTest(2026));
  $('#runTest2').addEventListener('click', () => runTest((Date.now() % 1e6) >>> 0));
  $('#runDraw').addEventListener('click', runDraw);
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
  setInterval(() => { if (API.online && API.user && RSL_VIEWS.includes(currentView()) && !document.hidden) refresh(true); }, 30000);
}

/* ================= boot ================= */
async function boot() {
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
  log('info', API.online ? (API.dbEmpty ? 'Connected. Database is empty, using local demo data.' : `Connected to the database: ${S.traders.length} sellers, ${S.receipts.length.toLocaleString('en-US')} receipts`) : 'Offline demo: mock data in your browser only');
}
boot();
})();
