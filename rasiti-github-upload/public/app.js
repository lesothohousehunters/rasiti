/* Rasiti front end. Works online (API + Neon) or offline (local mock data only). */
(() => {
"use strict";
// Hooks used by Mohlomi AI while it tests: it sees toasts and file names instead of saving downloads.
const HOOK = {save:null, toast:null};

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
let SHOWPH = false; // owners and admins can show full numbers; every switch is logged
const fullPh = p => '+266 ' + p.slice(3, 7) + ' ' + p.slice(7);
const mask = p => p ? (SHOWPH ? fullPh(p) : '+266 ' + p.slice(3, 4) + '••• •' + p.slice(-3)) : 'no phone';
const phNote = () => SHOWPH ? 'Full customer phone numbers are shown because an admin chose to show contacts; handle this report as confidential.' : 'Customer phone numbers are masked.';
const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const hashStr = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

const BH_LOGO = 'img/bohlale-96.png';
const MH_LOGO = 'img/mohlomi-96.png';
const TILL_SVG = `<svg class="till" viewBox="0 0 200 222" xmlns="http://www.w3.org/2000/svg"><g class="ld-rc"><path d="M72 0H128V58l-4 4-4-4-4 4-4-4-4 4-4-4-4 4-4-4-4 4-4-4-4 4-4-4-4 4-4-4z" fill="#fffdf8" stroke="#c9c3b5" stroke-width="1.2"/><rect x="82" y="8" width="36" height="5" rx="1.5" fill="#e8793a"/><rect x="80" y="19" width="40" height="2.5" rx="1" fill="#b9b4a8"/><rect x="80" y="25" width="28" height="2.5" rx="1" fill="#b9b4a8"/><rect x="80" y="31" width="34" height="2.5" rx="1" fill="#b9b4a8"/><path d="M82 40v10M85 40v10M87 40v10M91 40v10M93 40v10M96 40v10M100 40v10M102 40v10M106 40v10M109 40v10M111 40v10M115 40v10M118 40v10" stroke="#23262d" stroke-width="1.3"/></g><g class="ld-note"><rect x="58" y="108" width="84" height="44" rx="3" fill="#2f8f5b" stroke="#1f6b42"/><rect x="61.5" y="111.5" width="77" height="37" rx="2" fill="none" stroke="#a8dcbc" stroke-width="1"/><path d="M66 140q10-8 20 0t20 0 20 0" fill="none" stroke="#5fbf8a" stroke-width="1.2"/><circle cx="100" cy="128" r="11" fill="#e8793a"/><text x="100" y="132.5" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#fff" text-anchor="middle">M</text><text x="66" y="120" font-family="Arial, sans-serif" font-size="7.5" font-weight="700" fill="#e7f6ec">100</text><text x="134" y="146" font-family="Arial, sans-serif" font-size="7.5" font-weight="700" fill="#e7f6ec" text-anchor="end">100</text></g><rect x="34" y="60" width="132" height="96" rx="14" fill="#1a1b2e" stroke="#3a3d57" stroke-width="1.5"/><rect x="58" y="54" width="84" height="10" rx="5" fill="#2c2e45"/><rect x="64" y="58" width="72" height="2.5" rx="1.2" fill="#0b0c15"/><rect x="48" y="74" width="104" height="30" rx="6" fill="#0e2a1d"/><text class="ld-scr" x="100" y="95" font-family="ui-monospace, Menlo, monospace" font-size="15" font-weight="700" fill="#5cc994" text-anchor="middle">M 100.00</text><circle class="ld-led" cx="148" cy="66.5" r="2.6" fill="#3a3d57"/><g fill="#3a3d57"><rect x="50" y="114" width="20" height="9" rx="3"/><rect x="76" y="114" width="20" height="9" rx="3"/><rect x="102" y="114" width="20" height="9" rx="3"/><rect x="50" y="128" width="20" height="9" rx="3"/><rect x="76" y="128" width="20" height="9" rx="3"/><rect x="102" y="128" width="20" height="9" rx="3"/></g><rect x="128" y="114" width="22" height="23" rx="4" fill="#e8793a"/><rect x="54" y="150" width="92" height="10" rx="5" fill="#2c2e45"/><rect x="60" y="153.5" width="80" height="2.5" rx="1.2" fill="#0b0c15"/></svg>`;
let NOW = Date.now();
let clock = NOW;
const tick = () => (clock = Math.max(Date.now(), clock + 1000));
const monthStart = () => { const d = new Date(clock); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); };
const drawDay = () => { const d = new Date(clock); return new Date(d.getFullYear(), d.getMonth() + 1, 0); };
const dueDate = () => { const d = new Date(clock); return '20 ' + MON[(Math.floor(d.getMonth() / 3) * 3 + 3) % 12]; }; // first return: this quarter, due the 20th after it ends
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
const S = { customers:{'26658123301':{name:'Lerato'}, '26662345118':{name:'Tumelo'}}, traders:[], receipts:[], returns:[], payments:[], claims:[], reports:[], fakes:[], feed:[], reviews:{}, invited:new Set(), visits:new Set(), done:new Set(), draws:[], lastReceipt:null, filter:'all', eval:{} };
const tByNo = no => S.traders.find(t => t.no === no);
const PERSONAS = [{ph:'26658123301',name:'Lerato',card:'4471'},{ph:'26662345118',name:'Tumelo',card:'9035'},{ph:'26657000999',name:'New customer',card:'2286'}];
const BANKS = {slb:'Standard Lesotho Bank', fnb:'FNB Lesotho', nedbank:'Nedbank Lesotho', postbank:'Lesotho PostBank'};
// Receipts come from payments a network or bank saw (M-Pesa, EcoCash, card machine), or from cash sales the SELLER confirmed.
// A buyer's cash claim is only pending until the seller says yes, so nobody can put a sale into a seller's book from home.
// A reversed payment, or one paid back to the buyer, does not count.
const counts = r => !r.flag;
const PAYNAME = r => r.ch === 'card' ? 'Card' : r.ch === 'cash' ? 'Cash (seller confirmed)' : r.net ? NETNAME[r.net] : 'Mobile money';
/* Cash claims: the buyer says "I paid cash" (seller code + amount). Pending claims are not in the sales book, not taxed and give no
   entry. The seller confirms (receipt + 1 entry, 2 at a registered seller) or rejects. Unanswered for 3 days = expired. */
const CASH = {maxAmount:5000, perPhoneDay:5, expireDays:3};
const claimState = c => c.state === 'pending' && c.t < clock - CASH.expireDays * DAY ? 'expired' : c.state;
const pendingOf = no => S.claims.filter(c => c.no === no && claimState(c) === 'pending').sort((a, b) => a.t - b.t);
const API = { online:false, user:null, dbEmpty:false, setupNeeded:false };
const randPhone = r => '266' + (r() < .5 ? '5' : '6') + String(Math.floor(r() * 1e7)).padStart(7, '0');
const traderLL = t => (t.lat != null ? [t.lat, t.lng] : placeLatLng('T' + t.no, t.market));

/* ================= mock seed ================= */
function seed() {
  NOW = Date.now(); clock = NOW;
  const rnd = mulberry32(2026);
  S.traders = [
    {no:'3307',name:'Ntate Thabo L.',trade:'Snacks & cold drinks',market:'Sefika taxi rank',status:'registered',tin:'200-338-114',joined:120,via:true,avg:18,perDay:9,decl:0.97,ph:'26658440017',mp:'584112',ec:'20931'},
    {no:'4821',name:'Mme Palesa M.',trade:'Fruit & vegetables',market:'Maseru Main Market',status:'enrolled',joined:42,avg:34,perDay:7,ph:'26663120554',mp:'584297',ec:'20456'},
    {no:'5140',name:"Mme 'Mathabo S.",trade:'Makoenya & cooked food',market:'Pitso Ground',status:'registered',tin:'200-412-907',joined:200,avg:22,perDay:10,decl:0,ph:'26658907731',mp:'585021',ec:'21468'},
    {no:'2264',name:'Ntate Lebohang M.',trade:'Shoe repair',market:'Ha Hoohlo',status:'registered',tin:'200-127-550',joined:300,avg:40,perDay:.04,decl:0,ph:'26657712208',mp:'584765',ec:'21190'},
    {no:'6018',name:'Mme Lineo N.',trade:'Hair salon',market:'Maseru Mall parking',status:'registered',tin:'200-560-221',joined:90,avg:90,perDay:.6,decl:1.1,ph:'26662981145',mp:'585530',ec:'22075',pos:'SLB60181',bank:'slb'},
    {no:'7735',name:'Ntate Teboho R.',trade:'Phone repairs',market:'Kingsway',status:'enrolled',joined:14,avg:120,perDay:1.3,ph:'26659230876',mp:'586004',ec:'22389',pos:'FNB77350',bank:'fnb'},
    {no:'3902',name:'Mme Nthabiseng K.',trade:'Second-hand clothes',market:'Maseru Main Market',status:'registered',tin:'200-301-845',joined:150,via:true,avg:80,perDay:3,decl:0.9,ph:'26663557019',mp:'586371',ec:'22713',pos:'NED39021',bank:'nedbank'}
  ];
  S.traders.forEach(t => { const ll = placeLatLng('T' + t.no, t.market); t.lat = ll[0]; t.lng = ll[1]; });
  S.receipts = []; S.reports = []; S.fakes = []; S.claims = [];
  const global = []; for (let i = 0; i < 160; i++) global.push(randPhone(rnd));
  for (const tr of S.traders) {
    const pool = []; for (let i = 0; i < 30; i++) pool.push(global[Math.floor(rnd() * 160)]);
    if (tr.no === '3307' || tr.no === '4821') pool.push(PERSONAS[0].ph, PERSONAS[1].ph, PERSONAS[0].ph);
    const days = Math.min(100, tr.joined);
    for (let d = days; d >= 0; d--) {
      let n = tr.perDay < 1 ? (rnd() < tr.perDay ? 1 : 0) : Math.round(tr.perDay * (0.55 + 0.9 * rnd()));
      if (d === 0) n = Math.round(n * 0.35);
      for (let i = 0; i < n; i++) {
        const t = d === 0 ? NOW - Math.floor(rnd() * 4 * 3600000) - MIN : NOW - d * DAY - Math.floor(rnd() * 11 * 3600000);
        const amt = Math.max(2, Math.round(tr.avg * (0.4 + 1.2 * rnd())));
        const x = rnd(); const ch = x < .4 ? 'cash' : tr.pos && x < .62 ? 'card' : 'momo';
        let ph = rnd() < .85 ? pool[Math.floor(rnd() * pool.length)] : global[Math.floor(rnd() * 160)];
        // cash: the buyer claimed it, the seller answered. Mme 'Mathabo (5140) filed nil returns and rejects or ignores most cash claims.
        if (ch === 'cash') { const id = rid(), refuse = tr.no === '5140' && rnd() < .8;
          const c = {id, no:tr.no, amt, ph, t, state:refuse ? (rnd() < .5 ? 'rejected' : 'pending') : 'confirmed', dt:t + Math.floor(rnd() * 5 * 3600000)};
          if (refuse && c.state === 'pending' && t > NOW - 4 * DAY) c.state = 'rejected';
          S.claims.push(c); if (refuse) continue; c.code = mkCode(tr.no, rnd); S.receipts.push({code:c.code, no:tr.no, amt, ch:'cash', ph, t:c.dt, note:'claim:' + id}); continue; }
        const r = {code:mkCode(tr.no, rnd), no:tr.no, amt, ch, ph, t};
        // card: the bank does not know the buyer's phone; 6 in 10 card buyers claimed their receipt on *999#
        if (ch === 'card') { r.c4 = cardOf(ph); if (rnd() < .4) r.ph = null; } else { r.net = rnd() < .6 ? 'mpesa' : 'ecocash'; r.note = r.net + ':S' + r.code.slice(8, 12); }
        S.receipts.push(r);
      }
    }
  }
  const PV = '26657311420';
  for (let i = 0; i < 6; i++) S.receipts.push({code:mkCode('3307', rnd), no:'3307', amt:8, ch:'momo', ph:PV, t:NOW - 2 * DAY + i * 2 * MIN});
  for (const p of ['26662100481','26662100937','26658800362']) for (let i = 0; i < 10; i++) S.receipts.push({code:mkCode('6018', rnd), no:'6018', amt:100 + Math.round(rnd() * 100), ch:'momo', ph:p, t:NOW - Math.floor(rnd() * 27 * DAY) - 3600000});
  S.receipts.push({code:mkCode('7735', rnd), no:'7735', amt:150, ch:'momo', ph:'26659230876', t:NOW - 3 * DAY});
  S.receipts.push({code:mkCode('7735', rnd), no:'7735', amt:200, ch:'momo', ph:'26659230876', t:NOW - 6 * DAY});
  S.receipts.push({code:mkCode('3902', rnd), no:'3902', amt:2400, ch:'momo', net:'mpesa', ph:global[7], t:NOW - 5 * DAY, note:'Possible bulk bale purchase'});
  /* Digital payment fraud (every case below involves real money moving through a network or bank):
     1. Round trip: a buyer pays Mme Palesa (4821) by M-Pesa and she sends the same money back to his phone. M-Pesa reports it.
     2. Reversal: an EcoCash payment to her is reversed after the receipt was sent.
     3. SIM farm: 6 phones that never paid anyone before each pay Mme Nthabiseng (3902) exactly M100 within 40 minutes.
     4. Card claims: one phone claims card payments from 4 different cards at Mme Lineo's salon (6018) in 6 days. */
  const CO = '26658123399';
  S.receipts.push({code:mkCode('4821', rnd), no:'4821', amt:300, ch:'momo', net:'mpesa', ph:CO, t:NOW - 2 * DAY - 3 * 3600000, flag:'payback'});
  S.receipts.push({code:mkCode('4821', rnd), no:'4821', amt:300, ch:'momo', net:'mpesa', ph:CO, t:NOW - 5 * DAY - 2 * 3600000, flag:'payback'});
  S.receipts.push({code:mkCode('4821', rnd), no:'4821', amt:500, ch:'momo', net:'ecocash', ph:CO, t:NOW - 3 * DAY - 5 * 3600000, flag:'reversed'});
  const farm0 = NOW - DAY - 4 * 3600000; for (let i = 0; i < 6; i++) S.receipts.push({code:mkCode('3902', rnd), no:'3902', amt:100, ch:'momo', net:'ecocash', ph:'2666210' + String(5100 + i).padStart(4, '0'), t:farm0 + i * 7 * MIN});
  const CC = '26657700112'; ['1180', '5523', '7741', '3069'].forEach((c4, i) => S.receipts.push({code:mkCode('6018', rnd), no:'6018', amt:150 + 20 * i, ch:'card', c4, ph:CC, t:NOW - (i * 1.5 + 0.5) * DAY}));
  // Cash claims waiting for Ntate Thabo (3307) today: he confirms them on *999# > 1.
  [[25, 50], [40, 95], [15, 140]].forEach(([amt, ago], i) => S.claims.push({id:rid(), no:'3307', amt, ph:global[60 + i], t:NOW - ago * MIN, state:'pending'}));
  S.receipts.sort((a, b) => a.t - b.t); S.claims.sort((a, b) => a.t - b.t);
  for (const tr of S.traders) { tr.joinedAt = NOW - tr.joined * DAY; if (tr.status === 'registered') tr.declared = Math.round(perEstimate(tr.no, lastPer()) * tr.decl / 10) * 10; }
  seedTax(rnd);
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
// A card buyer always pays with the same card: a stable last 4 digits for each phone (demo).
function cardOf(ph) { const per = PERSONAS.find(x => x.ph === ph); if (per) return per.card; let h = 7; for (const ch of String(ph || 'x')) h = (h * 31 + ch.charCodeAt(0)) % 9973; return String(1000 + h % 9000); }
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
    declared:s.declared_last == null ? null : Number(s.declared_last), helper:s.helper, regAt:s.registered_at ? Date.parse(s.registered_at) : null, lat:s.lat, lng:s.lng, mp:s.mpesa_code || null, ec:s.ecocash_code || null, pos:s.card_terminal || null, bank:s.card_bank || null}));
  S.receipts = st.receipts.map(r => { const x = {code:r.code, no:r.seller_no, amt:Number(r.amount), ch:r.channel, ph:r.phone, t:Date.parse(r.issued_at), note:r.note, live:['tester', 'ussd', 'mpesa', 'ecocash', 'card'].includes(r.source)};
    const m = /^(mpesa|ecocash):/.exec(r.note || ''); if (m) x.net = m[1]; else if (r.source === 'mpesa' || r.source === 'ecocash') x.net = r.source;
    if (r.card_last4) x.c4 = r.card_last4; if (r.flag) x.flag = r.flag; return x; });
  S.receipts.forEach(r => used.add(r.code));
  S.claims = (st.claims || []).map(c => ({id:c.id, no:c.seller_no, amt:Number(c.amount), ph:c.phone, t:Date.parse(c.created_at), state:c.state === 'expired' ? 'pending' : c.state, dt:c.decided_at ? Date.parse(c.decided_at) : null, code:c.receipt_code || null}));
  S.reports = st.reports.map(r => ({id:r.id, t:Date.parse(r.created_at), ph:r.phone, type:r.type, lat:r.lat, lng:r.lng,
    target:r.seller_no ? {no:r.seller_no} : {place:r.place_key, label:r.place_label, area:r.area, kind:r.kind}}));
  S.fakes = st.fakes.map(f => ({id:f.id, t:Date.parse(f.created_at), code:f.code, kind:f.kind, by:f.phone, detail:f.detail}));
  S.reviews = {}; st.reviews.forEach(r => S.reviews[r.code] = r.decision);
  S.invited = new Set(); S.visits = new Set(); S.done = new Set();
  st.actions.forEach(a => { if (a.kind === 'invite') S.invited.add(a.target); else if (a.kind === 'visit') S.visits.add(a.target); else S.done.add(a.item_id); });
  S.draws = st.draws || [];
  S.returns = (st.returns || []).map(r => ({id:r.id, no:r.seller_no, period:r.period, sales:Number(r.sales) || 0, declared:Number(r.declared), nil:r.nil_reason, tax:Number(r.tax_due), ch:r.channel, t:Date.parse(r.filed_at)}));
  S.tipSubs = Number(st.tip_subscribers) || 0;
  S.payments = (st.payments || []).map(x => ({id:x.id, no:x.seller_no, period:x.period, amt:Number(x.amount), ref:x.ref, ch:x.channel, t:Date.parse(x.paid_at)}));
  S.traders.forEach(t => { const s0 = st.sellers.find(x => x.no === t.no); t.reminders = s0 ? s0.reminders !== false : true; });
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
    sellers: S.traders.map(t => ({no:t.no, name:t.name, trade:t.trade, market:t.market, status:t.status, tin:t.tin || null, joined_at:iso(t.joinedAt || NOW), via_rasiti:!!t.via, phone:t.ph, declared_last:t.declared ?? null, lat:t.lat, lng:t.lng, mpesa_code:t.mp || null, ecocash_code:t.ec || null, card_terminal:t.pos || null, card_bank:t.bank || null})),
    receipts: S.receipts.map(r => ({code:r.code, seller_no:r.no, amount:r.amt, channel:r.ch, phone:r.ph, issued_at:iso(r.t), note:r.note || null, source:'demo', card_last4:r.c4 || null, flag:r.flag || null})),
    reports: S.reports.map(r => ({id:r.id, phone:r.ph, type:r.type, seller_no:r.target.no || null, place_key:r.target.place || null, place_label:r.target.label || null, area:r.target.area || null, kind:r.target.kind || null, lat:r.lat ?? null, lng:r.lng ?? null, created_at:iso(r.t)})),
    fakes: S.fakes.map(f => ({id:f.id, code:f.code, kind:f.kind, phone:f.by, detail:f.detail, created_at:iso(f.t)})),
    returns: S.returns.map(r => ({id:r.id, seller_no:r.no, period:r.period, sales:r.sales, declared:r.declared, nil_reason:r.nil, tax_due:r.tax, channel:r.ch, filed_at:iso(r.t)})),
    payments: S.payments.map(x => ({id:x.id, seller_no:x.no, period:x.period, amount:x.amt, ref:x.ref, channel:x.ch, paid_at:iso(x.t)})),
    claims: S.claims.map(c => ({id:c.id, seller_no:c.no, amount:c.amt, phone:c.ph, state:c.state, created_at:iso(c.t), decided_at:c.dt ? iso(c.dt) : null, receipt_code:c.code || null}))
  };
}


/* ================= Filing and paying (sustained compliance) ================= */
// Demo schedule: one return a quarter, for the quarter that just ended, due on the 20th of the next month
// (Jan–Mar by 20 Apr, Apr–Jun by 20 Jul, Jul–Sep by 20 Oct, Oct–Dec by 20 Jan). Demo tax rate 3% of declared sales,
// always labelled: RSL sets the real Simplified Business Tax rate and schedule.
const TAXRATE = 0.03;
const perOf = t => { const d = new Date(t); return d.getFullYear() + '-Q' + (Math.floor(d.getMonth() / 3) + 1); };
const perYQ = p => p.split('-Q').map(Number);
const perBack = k => { const d = new Date(clock); const i = d.getFullYear() * 4 + Math.floor(d.getMonth() / 3) - k; return Math.floor(i / 4) + '-Q' + (i % 4 + 1); };
const lastPer = () => perBack(1);
const isQ = p => /-Q[1-4]$/.test(p || ''); // older records may hold a month (YYYY-MM): still shown correctly
const perShort = p => { if (!isQ(p)) return MON[+String(p).slice(5) - 1] || String(p); const [, q] = perYQ(p); return MON[(q - 1) * 3] + '–' + MON[(q - 1) * 3 + 2]; };
const perName = p => perShort(p) + ' ' + String(p).slice(0, 4);
const perDueT = p => { if (!isQ(p)) { const [y, m] = String(p).split('-').map(Number); return new Date(y, m, 20, 23, 59).getTime(); } const [y, q] = perYQ(p); return new Date(y, q * 3, 20, 23, 59).getTime(); };
const perDue = p => fD(perDueT(p));
const perStart = p => { const [y, q] = perYQ(p); return new Date(y, (q - 1) * 3, 1).getTime(); };
const perSales = (no, p) => { const a = perStart(p), b = perStart(perOfNext(p)); return S.receipts.filter(r => r.no === no && counts(r) && r.t >= a && r.t < b).reduce((x, r) => x + r.amt, 0); };
const perOfNext = p => { const [y, q] = perYQ(p); return perOf(new Date(y, q * 3, 1)); };
// Receipts may cover only part of a quarter (the demo keeps about 100 days): scale up to a full-quarter estimate.
const perEstimate = (no, p) => { const a = perStart(p), b = Math.min(perStart(perOfNext(p)), clock); const rs = S.receipts.filter(r => r.no === no);
  const first = rs.length ? Math.max(a, Math.min(...rs.map(r => r.t))) : b; const cov = Math.max(DAY, b - first); return perSales(no, p) * Math.min(4, (perStart(perOfNext(p)) - a) / cov); };
function seedTax(rnd) {
  S.returns = []; S.payments = [];
  const prof = {'3307':'good', '5140':'nilLast', '2264':'nil', '6018':'late', '3902':'arrears'};
  for (const tr of S.traders) { const pf = prof[tr.no]; if (!pf || tr.status !== 'registered' || tr.declared == null) continue;
    const base = Math.max(900, perEstimate(tr.no, lastPer()) / Math.max(.5, tr.decl || 1));
    for (let k = 4; k >= 1; k--) { const per = perBack(k); const due = perDueT(per); const isDue = due < NOW;
      if (pf === 'arrears' && k === 1) { tr.declared = null; continue; }   // has not filed last quarter yet
      let dec = k === 1 ? tr.declared : Math.round(base * (0.85 + 0.3 * rnd()) / 10) * 10; if (pf === 'nil') dec = 0; if (pf === 'nilLast' && k === 1) dec = 0;
      const filed = isDue ? due - Math.floor((1 + rnd() * 9) * DAY) : NOW - Math.floor((2 + rnd() * 8) * 3600000);
      const tax = Math.round(dec * TAXRATE);
      S.returns.push({id:rid(), no:tr.no, period:per, sales:perSales(tr.no, per) ? Math.round(perSales(tr.no, per)) : dec, declared:dec, nil:dec ? null : (pf === 'nil' ? 'stall closed' : 'other'), tax, ch:'USSD', t:filed});
      if (!tax) continue;
      if (k === 1 && !isDue && pf !== 'good') continue;          // last quarter not due yet: most have not paid
      if (pf === 'arrears' && (k === 2 || k === 3)) { if (k === 3) S.payments.push({id:rid(), no:tr.no, period:per, amt:Math.round(tax * .4), ref:'PY' + rid().slice(0, 6).toUpperCase(), ch:'USSD', t:due - 2 * DAY}); continue; }
      const late = pf === 'late' && k === 3;
      S.payments.push({id:rid(), no:tr.no, period:per, amt:tax, ref:'PY' + rid().slice(0, 6).toUpperCase(), ch:rnd() < .5 ? 'USSD' : 'WhatsApp', t:late ? due + 5 * DAY : Math.min(NOW - 3600000, filed + Math.floor(rnd() * 3 * DAY))});
    } } }
// Everything about one seller's filing and payments.
function taxOf(no) {
  const rets = S.returns.filter(r => r.no === no).sort((a, b) => a.period < b.period ? -1 : 1); const pays = S.payments.filter(x => x.no === no);
  const paid = p => pays.filter(x => x.period === p).reduce((a, x) => a + x.amt, 0);
  const owedOf = r => Math.max(0, r.tax - paid(r.period));
  const owed = Math.round(rets.reduce((a, r) => a + owedOf(r), 0));
  const overdue = rets.filter(r => owedOf(r) > 0.5 && perDueT(r.period) < clock); const overdueAmt = Math.round(overdue.reduce((a, r) => a + owedOf(r), 0));
  const onTimeFile = r => r.t <= perDueT(r.period);
  const onTimePay = r => r.tax <= 0 || (paid(r.period) >= r.tax - 0.5 && pays.filter(x => x.period === r.period).every(x => x.t <= perDueT(r.period)));
  let streak = 0; for (let i = rets.length - 1; i >= 0; i--) { const r = rets[i]; if (perDueT(r.period) > clock && owedOf(r) > 0) continue; if (onTimeFile(r) && onTimePay(r)) streak++; else break; }
  const lp = lastPer(); const missing = S.traders.find(t => t.no === no && t.status === 'registered') && !rets.some(r => r.period === lp) && perDueT(lp) < clock ? lp : null;
  return {rets, pays, paid, owedOf, owed, overdue, overdueAmt, streak, onTimeFile, onTimePay, last:rets.find(r => r.period === lp), missing, oldest:rets.find(r => owedOf(r) > 0.5)};
}
function fileReturn(no, declared, nil, ch) { const tr = tByNo(no); const per = lastPer(); const tax = Math.round(declared * TAXRATE); const sales = Math.round(perSales(no, per));
  S.returns = S.returns.filter(r => !(r.no === no && r.period === per)); const r = {id:rid(), no, period:per, sales, declared, nil, tax, ch, t:tick()}; r.ack = RSLM.ack(r.id); S.returns.push(r); tr.declared = declared;
  persist({kind:'return_filed', id:r.id, no, period:per, sales, declared, nil_reason:nil, tax_due:tax, channel:ch, last:true, ack:r.ack}).catch(() => {});
  log(declared ? 'ok' : 'info', `${tr.name} filed the ${perName(per)} return: ${declared ? M(declared) : 'nil (' + nil + ')'}${tax ? ', tax ' + M(tax) : ''}`); renderAll(); return r; }
function payTax(no, amt, ch) { const t = taxOf(no); const per = (t.oldest || t.last || {period:lastPer()}).period; const ref = 'PY' + rid().slice(0, 6).toUpperCase();
  const x = {id:rid(), no, period:per, amt:Math.round(amt), ref, ch, t:tick()}; x.rcpt = RSLM.receipt(x.id); S.payments.push(x);
  persist({kind:'tax_paid', id:x.id, no, period:per, amount:x.amt, ref, channel:ch, rcpt:x.rcpt}).catch(() => {});
  log('ok', `${tByNo(no).name} paid ${M(amt)} tax by mobile money (ref ${ref})`); renderAll(); return x; }
function taxMenu(tr) { const t = taxOf(tr.no); const lp = lastPer();
  return `My tax · TIN ${tr.tin || '-'}\nBadge: ${t.streak >= 3 ? 'Reliable taxpayer (' + t.streak + ' quarters on time)' : tr.via ? 'Rasiti Gold' : 'Registered seller'}\n\n1. File ${perName(lp)} return${t.last ? ' (done)' : ''}\n2. Pay tax (${M(t.owed)} due)\n3. My tax record\n4. Reminders: ${tr.reminders === false ? 'OFF' : 'ON'}\n0. Menu`; }

/* ================= Fraud Shield ================= */
const RULES = [
  {id:'self', name:'Seller buying from themselves', pts:60, what:"The customer phone is the seller's own registered phone."},
  {id:'velocity', name:'One phone, many receipts', pts:35, what:'6 or more receipts from one phone at one seller in a day.'},
  {id:'split', name:'Purchase split up', pts:30, what:'3 or more receipts of M10 or less from one phone within 15 minutes.'},
  {id:'ring', name:'Burst of new heavy buyers', pts:40, what:'3 or more new customers each buy 8 or more times in their first 30 days at an established seller. Long-time regulars are not counted.'},
  {id:'outlier', name:'Unusually large for this seller', pts:30, what:"More than 6 times the seller's typical sale and over M300."},
  // Digital payment fraud: every receipt is real money that a network or bank moved, so these rules look for money that did not stay moved,
  // phones made only to farm entries, and people claiming other people's card payments.
  {id:'reversed', name:'Payment reversed or paid back', pts:60, what:'The network or the bank told Rasiti the payment was reversed or refunded, or the seller sent the same money back to the payer within 24 hours (a round trip). The receipt leaves the draw and the sales book.'},
  {id:'farm', name:'New phones paying the same amount', pts:40, what:'5 or more phones that never paid any seller before each pay one seller the same amount within an hour (a SIM-card farm).'},
  {id:'cardclaims', name:'One phone claims many cards', pts:30, what:'One phone claims card payments made with 3 or more different cards in 7 days.'}
];
const RULE = Object.fromEntries(RULES.map(r => [r.id, r]));
function evaluate(list, traderPhones, now) {
  const out = {}; const byT = {}; const firstAny = {};
  for (const r of list) { (byT[r.no] = byT[r.no] || []).push(r); out[r.code] = {score:0, flags:[]}; if (r.ph) firstAny[r.ph] = Math.min(firstAny[r.ph] ?? Infinity, r.t); }
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
      if (r.flag) add(r, 'reversed', r.flag === 'reversed' ? 'The network or bank reversed this payment after the receipt was sent.' : 'The seller sent the same amount back to this phone within 24 hours.');
      const k = r.ph + '|' + new Date(r.t).toDateString(); (day[k] = day[k] || []).push(r); (byPh[r.ph] = byPh[r.ph] || []).push(r);
      if (ringSet.has(r.ph) && r.t > now - 30 * DAY) add(r, 'ring', `${heavy.length} new customers each bought ${Math.min(...heavy.map(x => x[1]))}+ times here within their first 30 days.`);
      if (r.amt > 6 * med && r.amt > 300) add(r, 'outlier', `${M(r.amt)} against a typical sale of ${M(med)}.`);
    }
    for (const k in day) if (day[k].length >= 6) day[k].forEach(r => add(r, 'velocity', `${day[k].length} receipts from this phone at this seller on one day.`));
    for (const p in byPh) { const small = byPh[p].filter(r => r.amt <= 10).sort((a, b) => a.t - b.t);
      for (let i = 0; i + 2 < small.length; i++) if (small[i + 2].t - small[i].t <= 15 * MIN) { let j = i; while (j + 1 < small.length && small[j + 1].t - small[i].t <= 15 * MIN) j++;
        for (let x = i; x <= j; x++) add(small[x], 'split', `${j - i + 1} receipts of M10 or less within 15 minutes.`); } }
    // SIM farm: brand-new phones (this is their first payment to anyone) paying one seller the same amount within an hour.
    const fresh = {}; rs.forEach(r => { if (r.ph && firstAny[r.ph] === r.t) (fresh[r.amt] = fresh[r.amt] || []).push(r); });
    for (const a in fresh) { const xs = fresh[a].sort((x, y) => x.t - y.t);
      for (let i = 0; i + 4 < xs.length; i++) if (xs[i + 4].t - xs[i].t <= 60 * MIN) { let j = i + 4; while (j + 1 < xs.length && xs[j + 1].t - xs[i].t <= 60 * MIN) j++;
        for (let x = i; x <= j; x++) add(xs[x], 'farm', `${j - i + 1} phones paying for the first time, each exactly ${M(+a)}, within an hour.`); } }
  }
  // One phone claiming card payments made with many different cards (someone trying to collect other people's card receipts).
  const cards = {}; list.forEach(r => { if (r.ch === 'card' && r.ph && r.c4 && r.t > now - 7 * DAY) (cards[r.ph] = cards[r.ph] || []).push(r); });
  for (const ph in cards) { const n = new Set(cards[ph].map(r => r.c4)).size; if (n >= 3) cards[ph].forEach(r => add(r, 'cardclaims', `This phone claimed card payments from ${n} different cards in 7 days.`)); }
  for (const c in out) { const e = out[c]; e.state = e.score >= 60 ? 'blocked' : e.score >= 30 ? 'held' : 'clear'; }
  return out;
}
function reEval() { const tp = {}; S.traders.forEach(t => tp[t.no] = t.ph); S.eval = evaluate(S.receipts, tp, clock); }
function shieldState(r) { const e = S.eval[r.code] || {state:'clear'}; const rv = S.reviews[r.code]; if (rv === 'approved') return 'approved'; if (rv === 'rejected') return 'rejected'; return e.state; }
// 1 entry per M10 by mobile money or card (1 to 5 a receipt); a cash receipt the seller confirmed is always 1 entry, so inflating a cash amount wins nothing.
const baseEntries = r => !r.ph ? 0 : r.ch === 'cash' ? 1 : Math.max(1, Math.min(5, Math.floor(r.amt / 10)));
const entriesFor = r => { const tr = tByNo(r.no); return baseEntries(r) * (tr && tr.status === 'registered' ? 2 : 1); };
/* Only the seller's own confirmation, the seller's own return, or a payment a network or bank saw can create tax. Everything a buyer says
   (a cash claim, a rating) is evidence for review, never a bill. So a person at home who claims cash sales at many shops changes nothing:
   each claim waits for the seller, and a rejected or ignored claim never reaches the sales book. A seller who confirms fake cash sales for
   friends pays tax on them, and each one is worth only 1 entry. Every prize is paid only after the payout check (ID and the SIM registered). */
const verifyLabel = r => r.ch === 'card' ? 'Card: confirmed by the bank' : r.ch === 'momo' ? 'Confirmed by the network' : 'Cash: confirmed by the seller';
function drawStatus(r) { const s = shieldState(r); if (!r.ph) return 'none'; if (r.flag) return 'excluded'; if (s === 'blocked' || s === 'rejected') return 'excluded'; if (s === 'held') return 'held'; return 'active'; }

/* ================= feed / toast ================= */
function log(kind, text) { S.feed.unshift({t:clock, kind, text}); renderFeed(); }
let toastT; function toast(m) { if (HOOK.toast) HOOK.toast(m); const el = $('#toast'); el.textContent = m; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => el.hidden = true, 2800); }
function narrate(html) { $('#narr').innerHTML = html; }

/* ================= actions ================= */
const REPTYPE = {got:'Gave a receipt', none:'No receipt given', extra:'Charged extra for a receipt', unlisted:'Seller not on Rasiti', fake:'Fake receipt'};
function issue(no, amt, ch, ph, silent, extra) {
  const code = mkCode(no, Math.random); const r = {code, no, amt:Math.round(amt), ch, ph:ph || null, t:tick(), live:true, ...(extra || {})};
  S.receipts.push(r); reEval(); S.lastReceipt = r;
  persist({kind:'receipt', code, seller_no:no, amount:r.amt, channel:ch, phone:r.ph, card_last4:r.c4 || null}).catch(() => {});
  const st = shieldState(r); const tr = tByNo(no);
  if (!silent) log(st === 'clear' ? 'ok' : st === 'held' ? 'warn' : 'bad', `Receipt ${code} · ${tr.name} · ${M(r.amt)} by ${ch === 'card' ? 'card' : 'mobile money'}${st !== 'clear' ? ' · Shield: ' + st : ''}`);
  renderReceipt(); renderAll(); return r;
}
/* Mobile money: the customer pays the seller's own M-Pesa or EcoCash merchant code. The network notifies Rasiti (/api/momo),
   Rasiti finds the seller who linked that code and sends the receipt and draw entries to the payer. No QR code needed. */
function mmFill() { const tr = tByNo($('#mmSeller').value); if (!tr) return; const net = $('#mmNet').value, card = net === 'card';
  const c = card ? tr.pos : net === 'mpesa' ? tr.mp : tr.ec;
  $('#mmCodeLbl').firstChild.textContent = card ? 'Card machine (terminal ID)' : 'Merchant code'; $('#mmCode').maxLength = card ? 12 : 7; $('#mmCode').inputMode = card ? 'text' : 'numeric';
  $('#mmL4Lbl').hidden = !card; if (card && !$('#mmL4').value) $('#mmL4').value = (PERSONAS.find(x => x.ph === PH.c.who) || PERSONAS[0]).card;
  $('#mmCode').value = c || '';
  $('#mmNote').textContent = card ? (c ? `${tr.name}'s card machine is ${c} (${BANKS[tr.bank] || 'bank'}). The bank tells Rasiti about the payment; the buyer then claims the receipt on *999# with the last 4 digits of the card.` : `${tr.name} has no card machine linked. Most informal sellers have none: they use M-Pesa or EcoCash. Choose Mme Lineo, Ntate Teboho or Mme Nthabiseng.`)
    : c ? `${tr.name}'s ${NETNAME[net]} merchant code is ${c}.` : `${tr.name} has not linked a ${NETNAME[net]} merchant code. Try the other network, or type any code to see what happens.`; }
/* Card (speed point): the buyer taps or swipes at the seller's card machine. The bank tells Rasiti (/api/card) the terminal, the amount and
   the last 4 digits of the card, but rarely the buyer's phone. So the receipt waits, and the buyer claims it on *999# (Customer > 2)
   with the seller code, the amount and the last 4 digits of the card, within 3 days. No reference number to type. */
async function payCard(term, amt, l4) {
  term = String(term || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); amt = Math.round(amt); l4 = String(l4 || '').replace(/\D/g, '');
  if (!/^[A-Z0-9]{6,12}$/.test(term)) { toast('A terminal ID has 6 to 12 letters or digits.'); return null; }
  if (!/^\d{4}$/.test(l4)) { toast('Enter the last 4 digits of the card.'); return null; }
  const tr = S.traders.find(t => t.pos === term);
  const slip = `💳 Card payment approved\n${M(amt)}.00 · card ••${l4}\nTerminal ${term}`;
  let r;
  if (saved()) {
    let j; try { const res = await fetch('/api/card', {method:'POST', headers:{'content-type':'application/json', 'x-rasiti-demo':'1'}, body:JSON.stringify({bank:(tr && tr.bank) || 'slb', terminal_id:term, amount:amt, card_last4:l4, txn:'DEMO' + rid().toUpperCase()})}); j = await res.json(); if (!res.ok) throw new Error(j.error || res.status); }
    catch (e) { toast('Payment not recorded: ' + e.message); return null; }
    if (!j.receipt) { PH.c.st = 'end'; show('c', `${slip}\n\nThis card machine is not on Rasiti,\nso no receipt or draw entries.\n\n0. Menu`); log('warn', j.reason); return null; }
    const x = j.receipt; r = {code:x.code, no:x.seller_no, amt:x.amount, ch:'card', ph:null, c4:l4, t:tick(), live:true}; S.receipts.push(r); used.add(r.code); reEval(); S.lastReceipt = r; renderReceipt(); renderAll();
  } else {
    if (!tr) { PH.c.st = 'end'; show('c', `${slip}\n\nThis card machine is not on Rasiti,\nso no receipt or draw entries.\n\n0. Menu`); log('warn', `Card machine ${term} is not linked to a Rasiti seller: no receipt`); return null; }
    r = issue(tr.no, amt, 'card', null, true, {c4:l4});
  }
  const t2 = tByNo(r.no); log('ok', `Card payment at ${t2.name} (${term}) · ${M(amt)} · card ••${l4} · receipt waiting to be claimed`);
  PH.c.st = 'c_card_now'; PH.c.d = {no:r.no, amt, l4};
  show('c', `${slip}\n(${t2.name})\n\nGet your Rasiti receipt:\n*999# > 2 > seller code ${t2.no}\n> amount > last 4 digits.\n\n1. Claim it now\n0. Menu`); return r; }
// Match a card payment: same seller, same amount, same last 4 digits, in the last 3 days, not reversed. 3 misses a day and the phone waits.
async function claimCard(no, amt, l4) { const p = PH.c, who = p.who; amt = Math.round(amt);
  const misses = S.fakes.filter(f => f.kind === 'cardmiss' && f.by === who && f.t > clock - DAY).length;
  if (misses >= 3) return {text:'Too many card claims that did\nnot match today. Try again\ntomorrow.'};
  const tr = tByNo(no);
  if (saved()) { let j; try { j = await api('event', {kind:'card_claim', seller_no:no, amount:amt, last4:l4, phone:who}, {quiet:true}); } catch (e) { return {text:e.message}; }
    if (j.ok) { const r = S.receipts.find(x => x.code === j.code); if (r) { r.ph = who; reEval(); renderAll(); } return {r, text:`Receipt ${j.code}\n${tr.name} · ${M(amt)} by card\n+${r ? entriesFor(r) : ''} draw entries\n\n0. Menu`}; }
    if (j.reason === 'taken') return {text:'This card payment already\nbelongs to another phone.\nIt cannot be claimed twice.\n\n0. Menu'};
    S.fakes.push({id:rid(), t:tick(), code:null, kind:'cardmiss', by:who, detail:`Card claim at seller ${no}: ${M(amt)}, card ending ${l4}. No card payment matched.`}); renderAll();
    return {text:`No card payment of ${M(amt)}\nwith card ••${l4} at ${tr.name}\nin the last 3 days.\nCheck the slip and try again.\n\n0. Menu`}; }
  const cand = S.receipts.filter(r => r.no === no && r.ch === 'card' && r.amt === amt && r.c4 === l4 && !r.flag && r.t > clock - 3 * DAY).sort((a, b) => (!a.ph) - (!b.ph) || b.t - a.t);
  const r = cand.find(x => !x.ph) || cand[0];
  if (!r) { addFake({code:null, kind:'cardmiss', by:who, detail:`Card claim at seller ${no}: ${M(amt)}, card ending ${l4}. No card payment matched.`}); log('warn', `Card claim did not match: ${tr.name}, ${M(amt)}, card ••${l4}`); renderAll();
    return {text:`No card payment of ${M(amt)}\nwith card ••${l4} at ${tr.name}\nin the last 3 days.\nCheck the slip and try again.\n\n0. Menu`}; }
  if (r.ph && r.ph !== who) { addFake({code:r.code, kind:'duplicate', by:who, detail:'Card payment already claimed by another phone. Second claim refused.'}); log('bad', `Second claim refused: ${r.code}`); renderAll(); return {text:'This card payment already\nbelongs to another phone.\nIt cannot be claimed twice.\n\n0. Menu'}; }
  r.ph = who; reEval(); persist({kind:'receipt_phone', code:r.code, phone:who}).catch(() => {}); S.lastReceipt = r; renderReceipt();
  log('ok', `Card receipt ${r.code} claimed by ${mask(who)} · ${tr.name} · ${M(amt)}`); renderAll();
  return {r, text:`Receipt ${r.code}\n${tr.name} · ${M(amt)} by card\n+${entriesFor(r)} draw entries\n\n0. Menu`}; }
async function payMerchant(net, code, amt) {
  const ph = PH.c.who, key = net === 'mpesa' ? 'mp' : 'ec', name = NETNAME[net]; amt = Math.round(amt);
  if (!/^\d{5,7}$/.test(code)) { toast('A merchant code has 5 to 7 digits.'); return null; }
  const paid = `${name}: You paid ${M(amt)}.00\nto merchant ${code}`;
  if (saved()) {
    let j; try { const r = await fetch('/api/momo', {method:'POST', headers:{'content-type':'application/json', 'x-rasiti-demo':'1'}, body:JSON.stringify({network:net, merchant_code:code, amount:amt, msisdn:ph, txn:(payMerchant.txn = 'DEMO' + rid().toUpperCase())})}); j = await r.json(); if (!r.ok) throw new Error(j.error || r.status); }
    catch (e) { toast('Payment not recorded: ' + e.message); return null; }
    if (!j.receipt) { PH.c.st = 'end'; show('c', `${paid}\n\nThis merchant is not on Rasiti,\nso no receipt or draw entries.\nAsk the seller to join Rasiti.\n\n0. Menu`); log('warn', j.reason); return null; }
    const x = j.receipt; const r = {code:x.code, no:x.seller_no, amt:x.amount, ch:'momo', ph, t:tick(), live:true, net, txn:payMerchant.txn, note:net + ':' + payMerchant.txn};
    S.receipts.push(r); used.add(r.code); reEval(); S.lastReceipt = r; renderReceipt(); renderAll();
    log('ok', `${name} payment to merchant ${code} · receipt ${r.code} · ${x.seller} · ${M(amt)}`);
    PH.c.st = 'end'; show('c', `${paid}\n(${x.seller})\n\n🧾 Rasiti receipt\n${r.code}\n+${entriesFor(r)} draw entries\n\n0. Menu`); return r;
  }
  const tr = S.traders.find(t => t[key] === code);
  if (!tr) { PH.c.st = 'end'; show('c', `${paid}\n\nThis merchant is not on Rasiti,\nso no receipt or draw entries.\nAsk the seller to join Rasiti.\n\n0. Menu`); log('warn', `${name} merchant code ${code} is not linked to a Rasiti seller: no receipt`); return null; }
  const r = issue(tr.no, amt, 'momo', ph, false, {net}); PH.c.st = 'end';
  show('c', `${paid}\n(${tr.name})\n\n🧾 Rasiti receipt\n${r.code}\n+${entriesFor(r)} draw entries\n\n0. Menu`); return r;
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
  p.st = 'home'; p.d = {}; p.live = null; p.u = 'idle'; p.dial = ''; p.auth = false; p.pin = null; p.pinFails = 0;
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
  else { p.u = 'session'; if (k === 't') p.auth = false; uRender(k); home(k); }
}
async function liveStep(k, v) {
  const p = PH[k]; if (!p.live) return; if (v !== null) p.live.parts.push(v);
  try {
    const r = await fetch('/api/ussd', {method:'POST', headers:{'content-type':'application/x-www-form-urlencoded', 'x-rasiti-demo':'1'},
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
  const p = PH[k]; text = I18N.tr(text, p.lang); p.last = text;
  if (p.u !== 'live') { if (p.u !== 'session') { p.u = 'session'; uRender(k); } $('#' + k + 'Screen').textContent = ussdText(text); }
  if (p.mode === 'wa') { if (p.w !== 'chat') openChat(k, true); waBot(k, text); }
}
const ussdText = t => t.replace(/[\u{1F300}-\u{1FAFF}\u2705\u274C]\uFE0F?\s?/gu, '');
function waBot(k, text) {
  const opts = [], body = [];
  for (const l of text.split('\n')) { const m = l.match(/^\s*(\d{1,2})\. (.+)$/); if (m) opts.push([m[1], m[2]]); else body.push(l); }
  const log = $('#' + k + 'Log'); const b = document.createElement('div'); b.className = 'bb bot';
  const txt = body.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  const real = opts.filter(o => o[0] !== '0');
  let inner = esc(txt).replace(/\*([^*\n]+)\*/g, '<b>$1</b>'); // WhatsApp shows *text* in bold
  if (real.length > 3) inner += `<button type="button" class="wa-list" data-list='${esc(JSON.stringify(opts))}'>${IC.list} ${PH[k].lang === 'st' ? 'Khetha' : 'Choose an option'}</button>`;
  b.innerHTML = inner + `<time>${hm(clock)}</time>`; b.dataset.q = txt.split('\n')[0];
  log.appendChild(b);
  if (opts.length && real.length <= 3) {
    const w = document.createElement('div'); w.className = 'qr-btns';
    w.innerHTML = opts.map(o => `<button type="button" data-v="${o[0]}" data-l="${esc(o[0] === '0' ? (PH[k].lang === 'st' ? 'Lethathamo' : 'Menu') : o[1])}">${esc(o[0] === '0' ? (PH[k].lang === 'st' ? 'Lethathamo' : 'Menu') : o[1])}</button>`).join('');
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
  if (k === 't' && !label && /^(t_pin|j_pin|j_pin2)$/.test(PH.t.st) && /^\d{4}$/.test(String(v).trim())) label = '••••'; // a PIN is never shown in the chat
  const bots = $('#' + k + 'Log').querySelectorAll('.bb.bot'); const q = label && bots.length ? bots[bots.length - 1].dataset.q : null;
  waMe(k, label || v, q);
  if (/^(sesotho|se-sotho|puo ea sesotho)$/i.test(String(v).trim())) { setLang(k, 'st'); home(k); return; }
  if (/^(english|senyesemane)$/i.test(String(v).trim())) { setLang(k, 'en'); home(k); return; }
  if (/^(hi|hello|menu|lumela|dumela|start|lethathamo)$/i.test(String(v).trim())) { home(k); return; }
  if (/^(tip|tips|keletso)$/i.test(String(v).trim())) { tipMsg(k); return; }
  if (/^(subscribe|ingolise)$/i.test(String(v).trim())) { tipSub(k, true); return; }
  if (/^(stop|emisa)$/i.test(String(v).trim())) { tipSub(k, false); return; }
  setTimeout(() => (k === 't' ? tStep : cStep)(v), 250);
}
function openSheet(k, opts) {
  const s = $('#' + k + 'Sheet');
  s.innerHTML = `<div class="sheet"><div class="grab"></div><h4>${PH[k].lang === 'st' ? 'Khetha' : 'Choose an option'}<button type="button" data-x aria-label="Close">×</button></h4>${opts.map(o => `<button type="button" class="row" data-v="${o[0]}" data-l="${esc(o[0] === '0' ? 'Menu' : o[1])}"><span>${esc(o[0] === '0' ? 'Back to menu' : o[1])}</span><i></i></button>`).join('')}</div>`;
  s.hidden = false;
}
function closeSheet(k) { $('#' + k + 'Sheet').hidden = true; }
// Tip of the day on WhatsApp: free to send while the person is chatting, and posted daily on the free Rasiti WhatsApp Channel.
function tipMsg(k) { const p = PH[k]; const t = TIPS.forDate(new Date(clock), k === 't' ? 'seller' : null); p.tipDay = new Date(clock).toDateString();
  show(k, '💡 Tip of the day\n' + TIPS.text(t, p.lang) + '\n\n' + (p.lang === 'st' ? 'Mohloli' : 'Source') + ': ' + t.src + '\nType TIP any day for a new tip.\n' + (p.tipSub ? '' : 'Get this tip every day by SMS for M2.00 a day: send SUBSCRIBE.\n') + '0. Menu'); }
// Optional daily tip by SMS: the subscriber pays M2.00 a day (billed to airtime by the network in a pilot).
function tipSub(k, on) { const p = PH[k]; const ph = phoneOf(k); if (!!p.tipSub !== on) S.tipSubs = Math.max(0, (S.tipSubs || 0) + (on ? 1 : -1)); p.tipSub = on;
  if (ph) persist({kind:'tip_sub', phone:ph, on}).catch(() => {});
  log('info', `${k === 'c' ? 'Customer' : 'Seller'} phone ${on ? 'subscribed to' : 'stopped'} the daily tip by SMS (M2.00 a day)`);
  show(k, (on ? 'Subscribed to the daily tip by SMS (M2.00 a day). Send STOP to end it.' : 'Daily tip by SMS stopped. You will not be charged.') + '\n0. Menu'); renderAll(); }
function home(k) { PH[k].st = 'home'; PH[k].d = {};
  if (PH[k].mode === 'wa' && PH[k].tipDay !== new Date(clock).toDateString() && (k === 't' ? tByNo(PH.t.who) : isCustomer(PH.c.who))) tipMsg(k);
  if (k === 'c' && !isCustomer(PH.c.who)) { PH.c.st = 'c_reg0'; show('c', regPrompt()); return; }
  if (k === 't' && tByNo(PH.t.who) && !PH.t.auth) { PH.t.st = 't_pin'; const tr = tByNo(PH.t.who); show('t', `${tr.name}\nSeller code ${tr.no}\n\nEnter your 4-digit PIN:`); return; }
  show(k, k === 't' ? tHome() : cHome()); }
/* Language: English or Sesotho, chosen on each phone with 9 (or by typing "Sesotho" / "English" on WhatsApp). Saved per phone number, so the real USSD menu uses it too. */
const I18N = window.RASITI_I18N;
const langOpt = k => PH[k].lang === 'st' ? '9. English' : '9. Sesotho';
function setLang(k, lang) { const p = PH[k]; p.lang = lang; const ph = phoneOf(k);
  if (ph) persist({kind:'lang', phone:ph, lang}).catch(() => {});
  log('info', `${k === 'c' ? 'Customer' : 'Seller'} phone switched to ${lang === 'st' ? 'Sesotho' : 'English'}`); }
// Seller sign-in: seller code + 4-digit PIN. Merchant codes (M-Pesa from Vodacom, EcoCash from Econet) only say which seller was paid.
const DEMO_PIN = '2580'; // all demo sellers; real sellers choose their own when they join
const WEAK_PINS = ['0000','1111','2222','3333','4444','5555','6666','7777','8888','9999','1234','4321','0123','9876'];
const pinProblem = v => !/^\d{4}$/.test(v) ? 'The PIN must be 4 digits.' : WEAK_PINS.includes(v) ? 'That PIN is too easy to guess.\nChoose another.' : null;
const NETNAME = {mpesa:'M-Pesa', ecocash:'EcoCash'};
const REG_PROMPT = 'Lumela! 👋 Welcome to Rasiti, the receipt lottery.\nRegister free to get receipts and win in the monthly draw.\n\n1. Register now\n2. How does it work?';
const regPrompt = () => REG_PROMPT + '\n' + langOpt('c');
const statusLbl = t => t.status === 'registered' ? 'Registered · SBT' : 'Enrolled · not yet registered';

function tHome() { const tr = tByNo(PH.t.who);
  if (!tr) return 'Lumela! Rasiti keeps a free\nsales book on your phone and\nbrings customers who want\nreceipts.\n\n1. Join Rasiti (2 minutes)\n2. What do I get?\n3. Questions & tax help\n' + langOpt('t');
  return `Lumela ${tr.name.split(' ').slice(0, 2).join(' ')}\nCode ${tr.no} · ${statusLbl(tr)}\n\n1. Confirm cash sales (${pendingOf(tr.no).length})\n2. My sales book\n3. ${tr.status === 'enrolled' ? 'Register for tax' : 'My tax & badge'}\n4. Payment codes\n5. Questions & tax help\n${langOpt('t')}`; }
function cHome() { return 'Rasiti receipts\n\n1. I paid cash\n2. I paid by card\n3. Check a receipt\n4. Rate a shop\n5. My draw entries\n6. Questions & answers\n' + langOpt('c'); }
/* ---- cash: the buyer claims, the seller confirms ---- */
const short = ph => ph ? '…' + String(ph).slice(-3) : 'no phone';
const hhmm = t => { const d = new Date(t); return (new Date(clock).toDateString() === d.toDateString() ? '' : fD(t) + ' ') + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
async function cashClaim(no, amt, from) { const who = from || PH.c.who, tr = tByNo(no); amt = Math.round(amt);
  if (!(amt >= 1 && amt <= CASH.maxAmount)) return `Cash amount must be M1 to\n${M(CASH.maxAmount)}. Bigger sales: pay by\nM-Pesa, EcoCash or card.\n\n0. Menu`;
  if (tr.ph === who) return 'You cannot claim a sale at\nyour own shop.\n\n0. Menu';
  if (S.claims.filter(c => c.ph === who && c.t > clock - DAY).length >= CASH.perPhoneDay) return `You can claim ${CASH.perPhoneDay} cash sales a\nday. Try again tomorrow.\n\n0. Menu`;
  if (S.claims.some(c => c.ph === who && c.no === no && c.amt === amt && c.state === 'pending' && c.t > clock - 10 * MIN)) return 'You already sent this claim.\nWait for the seller to confirm.\n\n0. Menu';
  let id = rid();
  if (saved()) { let j; try { j = await api('event', {kind:'cash_claim', seller_no:no, amount:amt, phone:who}, {quiet:true}); } catch (e) { return e.message + '\n\n0. Menu'; }
    if (!j.ok) return j.msg + '\n\n0. Menu'; id = j.id; }
  S.claims.push({id, no, amt, ph:who, t:tick(), state:'pending'});
  log('info', `Cash claim: ${mask(who)} says they paid ${tr.name} ${M(amt)} cash · waiting for the seller (SMS sent)`); renderAll();
  if (PH.t.who === no && PH.t.auth && ['home', 'end'].includes(PH.t.st)) show('t', tHome());
  return `Sent to ${tr.name}\nto confirm: ${M(amt)} cash.\n\nWhen the seller confirms, you\nget your receipt and draw\nentry by SMS. Nothing counts\nuntil then.\n\n0. Menu`; }
function cashList(tr) { const open = pendingOf(tr.no); const list = open.slice(-5).reverse(); PH.t.d.list = list.map(c => c.id);
  return `Cash sales to confirm: ${open.length}\n\n` + list.map((c, i) => `${i + 1}. ${M(c.amt)} ${short(c.ph)} ${hhmm(c.t)}`).join('\n') + `\n9. Confirm all ${open.length}\n0. Menu`; }
async function cashDecide(tr, ids, decision) { const pick = ids === 'all' ? pendingOf(tr.no) : pendingOf(tr.no).filter(c => ids.includes(c.id)); if (!pick.length) return [];
  let codes = {};
  if (saved()) { let j; try { j = await api('event', {kind:'cash_decide', no:tr.no, pin:PH.t.pin, ids:ids === 'all' ? 'all' : ids, decision}, {quiet:true}); } catch (e) { toast(e.message); return []; }
    j.done.forEach(d => codes[d.id] = d.code || true); }
  else pick.forEach(c => codes[c.id] = decision === 'confirm' ? mkCode(tr.no, Math.random) : true);
  const out = [];
  for (const c of pick) { if (!codes[c.id]) continue; c.dt = tick();
    if (decision === 'confirm') { c.state = 'confirmed'; c.code = codes[c.id]; const r = {code:c.code, no:tr.no, amt:c.amt, ch:'cash', ph:c.ph, t:clock, live:true, note:'claim:' + c.id}; S.receipts.push(r); used.add(r.code); out.push(r); S.lastReceipt = r; }
    else { c.state = 'rejected'; out.push(c); } }
  reEval(); renderReceipt(); renderAll();
  log(decision === 'confirm' ? 'ok' : 'info', `${tr.name} ${decision === 'confirm' ? 'confirmed' : 'rejected'} ${out.length} cash sale${out.length === 1 ? '' : 's'} (${M(out.reduce((a, x) => a + x.amt, 0))})${decision === 'confirm' ? ': receipts sent to the buyers' : ': not in the sales book, not taxed'}`);
  const mine = decision === 'confirm' && out.find(r => r.ph === PH.c.who);
  if (mine && ['home', 'end'].includes(PH.c.st)) { PH.c.st = 'end'; show('c', `Rasiti: ${tr.name} confirmed\nyour cash sale of ${M(mine.amt)}.\n\n🧾 Receipt ${mine.code}\n+${entriesFor(mine)} draw entr${entriesFor(mine) === 1 ? 'y' : 'ies'}\n\n0. Menu`); }
  return out; }
/* Questions and answers (public/faq.js): short pages on USSD, whole answers on WhatsApp */
const FAQ = window.RASITI_FAQ;
const RSLM = window.RASITI_RSL, TIPS = window.RASITI_TIPS; // simulated RSL e-services link; daily education messages
const ackOf = r => r.ack || RSLM.ack(r.id), rcptOf = x => x.rcpt || RSLM.receipt(x.id);
function faqStart(k, set) { const p = PH[k]; p.st = 'faq'; p.d = {fset:set, parts:[]}; show(k, p.mode === 'wa' ? FAQ.chatList(set, p.lang) + (p.lang === 'st' ? '\n\nKapa ngola potso ea hau.' : '\n\nOr just type your question.') + '\n0. Menu' : FAQ.ussd(set, [], p.lang) + '\n0. Menu'); }
function faqStep(k, v) { const p = PH[k]; const set = p.d.fset;
  if (p.mode === 'wa') { const n = /^\d{1,2}$/.test(v) ? +v : FAQ.match(set, v); const a = n && FAQ.chatAnswer(set, n, p.lang);
    show(k, (a || (p.lang === 'st' ? 'Tšoarelo, ha ke na karabo ea seo hajoale. Khetha nomoro lenaneng, kapa letsetsa desk ea PR ea RSL ho 62112502.' : "Sorry, I don't have an answer for that yet. Choose a number from the list, or call the RSL PR desk on 62112502.")) + (p.lang === 'st' ? '\n\nAraba ka nomoro e nngoe kapa potso.' : '\n\nReply with another number or question.') + '\n0. Menu'); return; }
  p.d.parts.push(v); show(k, FAQ.ussd(set, p.d.parts, p.lang) + '\n0. Menu'); }
function faqFree(k, set, v) { const n = FAQ.match(set, v); if (!n) return false; const p = PH[k]; p.st = 'faq'; p.d = {fset:set, parts:[]};
  show(k, FAQ.chatAnswer(set, n, p.lang) + (p.lang === 'st' ? '\n\nLipotso tse ling? Li ngole, kapa araba ka nomoro lenaneng:\n' : '\n\nMore questions? Type them, or reply with a number from the list:\n') + FAQ.chatList(set, p.lang).split('\n').slice(3).join('\n') + '\n0. Menu'); return true; }

function tStep(inp) { const p = PH.t, tr = tByNo(p.who), v = String(inp).trim();
  if (v === '0' && p.st !== 't_amt_ph') { home('t'); return; }
  switch (p.st) {
  case 'faq': faqStep('t', v); return;
  case 'home':
    if (v === '9') { setLang('t', p.lang === 'st' ? 'en' : 'st'); show('t', (p.lang === 'st' ? 'Language: Sesotho\n\n' : 'Language: English\n\n') + tHome()); return; }
    if (!tr) { if (v === '1') { p.st = 'j_name'; show('t', 'Join Rasiti\n\nYour name:'); }
      else if (v === '3') faqStart('t', 'seller');
      else if (p.mode === 'wa' && !/^\d+$/.test(v)) { if (!faqFree('t', 'seller', v)) show('t', tHome()); }
      else if (v === '2') { p.st = 'end'; show('t', 'With Rasiti you get:\n- a free sales book\n- customers drawn by the\n  prize draw sign\n- a record banks can see\n- simple tax, no queues\n\n0. Back'); } return; }
    if (v === '1') { if (!pendingOf(tr.no).length) { p.st = 'end'; show('t', 'No cash sales to confirm.\n\nWhen a customer says they paid\nyou cash, you get an SMS and\nthe sale shows here.\n\n0. Menu'); return; }
      p.st = 't_cash'; show('t', cashList(tr)); }
    else if (v === '2') { const rs = S.receipts.filter(r => r.no === tr.no && counts(r)); const d0 = new Date(clock); d0.setHours(0, 0, 0, 0);
      const today = rs.filter(r => r.t >= d0.getTime()); const w = rs.filter(r => r.t > clock - 7 * DAY); const m = rs.filter(r => r.t > clock - 30 * DAY);
      const sm = a => a.reduce((x, r) => x + r.amt, 0); p.st = 'end';
      show('t', `My sales book\n\nToday: ${today.length} sales, ${M(sm(today))}\n7 days: ${w.length} sales, ${M(sm(w))}\n30 days: ${m.length} sales, ${M(sm(m))}\nCash ${M(sm(m.filter(r => r.ch === 'cash')))} · mobile ${M(sm(m.filter(r => r.ch === 'momo')))} · card ${M(sm(m.filter(r => r.ch === 'card')))}\nMobile money and card come by\nthemselves. Cash: confirm with 1.\n\n0. Menu`); }
    else if (v === '3') { const m = S.receipts.filter(r => r.no === tr.no && counts(r) && r.t > clock - 30 * DAY).reduce((x, r) => x + r.amt, 0);
      if (tr.status === 'enrolled') { p.st = 't_reg'; show('t', `Register for tax\n\nSales last 30 days: ${M(m)}\nYearly estimate: ${M(m * 12)}\nYou fit Simplified Business\nTax (under M2,000,000).\n\nRegistered sellers get double\ndraw entries for customers,\nbigger seller prizes and a\nbadge banks recognise.\n\n1. Register now\n2. Ask a helper to call me\n0. Menu`); }
      else { p.st = 't_tax'; show('t', taxMenu(tr)); } }
    else if (v === '5') faqStart('t', 'seller');
    else if (v === '4') { p.st = 't_mc'; show('t', `Payment codes\nM-Pesa: ${tr.mp || 'not linked'}\nEcoCash: ${tr.ec || 'not linked'}\nCard machine: ${tr.pos || 'not linked'}\n\n1. Link M-Pesa merchant code\n2. Link EcoCash merchant code\n3. Link card machine\n\n0. Menu`); }
    else if (p.mode === 'wa' && !/^\d+$/.test(v)) { if (!faqFree('t', 'seller', v)) show('t', tHome()); }
    return;
  case 't_cash': { if (v === '9') { p.st = 'end'; cashDecide(tr, 'all', 'confirm').then(o => show('t', `Confirmed ${o.length} cash sale${o.length === 1 ? '' : 's'}:\n${M(o.reduce((a, x) => a + x.amt, 0))}.\n\nYour customers got their\nreceipts. The sales are in your\nsales book.\n\n0. Menu`)); return; }
    const id = (p.d.list || [])[+v - 1]; const c = id && S.claims.find(x => x.id === id); if (!c) { show('t', cashList(tr)); return; }
    p.d.cid = id; p.st = 't_cash_one'; show('t', `${M(c.amt)} cash from ${short(c.ph)}\n${hhmm(c.t)}\n\n1. Yes, I sold this\n2. No, reject\n0. Menu`); return; }
  case 't_cash_one': { if (v !== '1' && v !== '2') return; p.st = 'end';
    cashDecide(tr, [p.d.cid], v === '1' ? 'confirm' : 'reject').then(o => { const r = o[0];
      show('t', !r ? 'This claim was already answered.\n\n0. Menu' : v === '1' ? `Confirmed. Receipt ${r.code}\nsent to the customer.\nIn your sales book: ${M(r.amt)}.\n\n` + (pendingOf(tr.no).length ? '1. Next cash sale\n0. Menu' : '0. Menu') : 'Rejected. It is not in your\nsales book and not taxed.\n\n0. Menu');
      if (r && pendingOf(tr.no).length) p.st = 't_cash_next'; }); return; }
  case 't_cash_next': if (v === '1') { p.st = 't_cash'; show('t', cashList(tr)); } else home('t'); return;
  case 'j_name': if (!v) return; p.d.name = v.slice(0, 60); p.st = 'j_mkt'; show('t', 'Where do you trade?\n(e.g. Sefika rank)'); return;
  case 'j_mkt': if (!v) return; p.d.mkt = v.slice(0, 60); p.st = 'j_trade'; show('t', 'What do you sell?'); return;
  case 'j_trade': if (!v) return; p.d.trade = v.slice(0, 60); p.st = 'j_pin'; show('t', 'Choose a 4-digit PIN.\nYou need it every time you open\nyour seller menu. Do not share it.'); return;
  case 'j_pin': { const bad = pinProblem(v); if (bad) { show('t', bad + '\n\nChoose a 4-digit PIN:'); return; } p.d.pin = v; p.st = 'j_pin2'; show('t', 'Enter the PIN again:'); return; }
  case 'j_pin2': if (v !== p.d.pin) { p.st = 'j_pin'; show('t', 'The two PINs are different.\n\nChoose a 4-digit PIN:'); return; }
  { let no; do { no = String(7000 + Math.floor(Math.random() * 2999)); } while (tByNo(no));
    const area = Object.keys(AREAS).find(a => p.d.mkt.toLowerCase().includes(a.split(' ')[0].toLowerCase())) || p.d.mkt;
    const ll = placeLatLng('T' + no, area);
    const tr2 = {no, name:p.d.name, trade:p.d.trade, market:p.d.mkt, status:'enrolled', joined:0, joinedAt:clock, ph:randPhone(Math.random), lat:ll[0], lng:ll[1]};
    S.traders.push(tr2); tr2.pin = p.d.pin; persist({kind:'seller_join', no, pin:p.d.pin, name:tr2.name, trade:tr2.trade, market:tr2.market, phone:tr2.ph, lat:ll[0], lng:ll[1]}).catch(() => {});
    log('ok', `New seller enrolled: ${tr2.name} (${tr2.market}), code ${no}`); p.who = no; p.auth = true; p.pin = p.d.pin; fillSelects(); p.st = 'end';
    show('t', `Welcome ${tr2.name}!\nYour seller code: ${no}\nKeep your PIN secret.\n\nPut the Rasiti sticker where\ncustomers can see it. Then\nlink your payment codes:\noption 4.\nNo tax number needed yet.\n\n0. Menu`); renderAll(); return; }
  case 't_tax': { const t = taxOf(tr.no); const lp = lastPer(), pn = perName(lp);
    if (v === '1') { if (t.last) { p.st = 'end'; show('t', `${pn} return filed: ${M(t.last.declared)}${t.last.nil ? ' (nil)' : ''}\nTax due ${M(t.last.tax)} by ${perDue(lp)}.\n\n2. Pay tax\n0. Menu`); p.st = 't_tax'; return; }
      p.st = 't_file'; show('t', `${pn} return\n\nSales book for ${pn}:\n${M(perSales(tr.no, lp))} (cash you confirmed,\nmobile money and card)\n\n1. File this amount\n2. Enter a different total\n3. I did not trade (nil)\n0. Menu`); }
    else if (v === '2') { if (t.owed <= 0) { show('t', 'Nothing to pay. Thank you for\npaying on time! ✅\n\n0. Menu'); return; }
      p.st = 't_pay'; show('t', `Tax due: ${M(t.owed)}${t.overdueAmt ? `\n(${M(t.overdueAmt)} is overdue)` : ''}\nDemo rate ${TAXRATE * 100}% of declared sales.\n\n1. Pay all by mobile money\n2. Pay part now (pay a little\n   each week before the date)\n0. Menu`); }
    else if (v === '3') { p.st = 't_tax'; show('t', 'My tax record\n\n' + (t.rets.slice(-4).map(r => `${perShort(r.period)}: ${r.declared ? M(r.declared) : 'nil'} · ${r.tax <= 0 ? 'no tax' : t.owedOf(r) <= .5 ? 'paid ✓' : 'owes ' + M(t.owedOf(r))}${t.onTimeFile(r) ? '' : ' · late'}`).join('\n') || 'No returns yet.') + `\n\nOn-time quarters in a row: ${t.streak}\n\n0. Menu`); }
    else if (v === '4') { tr.reminders = tr.reminders === false; persist({kind:'reminders', no:tr.no, on:tr.reminders}).catch(() => {}); log('info', `${tr.name} turned tax reminders ${tr.reminders ? 'on' : 'off'}`);
      show('t', (tr.reminders ? 'Reminders ON. We will SMS you\n3 days before each due date.' : 'Reminders OFF. You can turn\nthem on again here.') + '\n\n' + taxMenu(tr).split('\n\n').slice(1).join('\n\n')); }
    return; }
  case 't_file': { const lp = lastPer();
    if (v === '1') { const r = fileReturn(tr.no, Math.round(perSales(tr.no, lp)), null, p.mode === 'wa' ? 'wa' : 'ussd'); p.st = 't_filed'; show('t', `Filed! ✅ ${perName(lp)}: ${M(r.declared)}\nSent to RSL e-services ✓\nRSL ack ${ackOf(r)}\nTax due ${M(r.tax)} by ${perDue(lp)}\n(demo rate ${TAXRATE * 100}%).\n\n1. Pay now\n0. Menu`); }
    else if (v === '2') { p.st = 't_file_amt'; show('t', `Your total sales for\n${perName(lp)} (M):`); }
    else if (v === '3') { p.st = 't_file_nil'; show('t', 'Why no trading?\n\n1. Stall was closed\n2. I was ill or away\n3. Other reason\n0. Menu'); }
    return; }
  case 't_file_amt': { const a = Math.round(parseFloat(v)); if (!(a >= 0 && a < 2000000)) { show('t', 'Amount (M), numbers only:'); return; }
    const r = fileReturn(tr.no, a, a ? null : 'other', p.mode === 'wa' ? 'wa' : 'ussd'); p.st = 't_filed'; show('t', `Filed! ✅ ${perName(lastPer())}: ${M(a)}\nSent to RSL e-services ✓\nRSL ack ${ackOf(r)}\nTax due ${M(r.tax)} by ${perDue(lastPer())}\n(demo rate ${TAXRATE * 100}%).\n\n1. Pay now\n0. Menu`); return; }
  case 't_file_nil': { const why = {1:'stall closed', 2:'ill or away', 3:'other'}[v]; if (!why) return;
    const rn = fileReturn(tr.no, 0, why, p.mode === 'wa' ? 'wa' : 'ussd'); p.st = 'end'; show('t', `Nil return filed for ${perName(lastPer())}.\nSent to RSL e-services ✓\nRSL ack ${ackOf(rn)}\nReason: ${why}. Thank you.\nA nil return is fine when you\ndid not trade.\n\n0. Menu`); return; }
  case 't_filed': if (v === '1') { p.st = 't_tax'; tStep('2'); } return;
  case 't_pay': { const t = taxOf(tr.no);
    if (v === '1') { p.d.payAmt = t.owed; p.st = 't_pay_ok'; show('t', `Mobile money: approve payment\nof ${M(t.owed)} to RSL on your\nphone (M-Pesa or EcoCash).\n\n1. I approved it\n0. Cancel`); }
    else if (v === '2') { p.st = 't_pay_amt'; show('t', `Amount to pay now (M)\n(up to ${M(t.owed)}):`); }
    return; }
  case 't_pay_amt': { const t = taxOf(tr.no); const a = Math.round(parseFloat(v)); if (!(a > 0 && a <= t.owed)) { show('t', `Enter M1 to ${M(t.owed)}:`); return; }
    p.d.payAmt = a; p.st = 't_pay_ok'; show('t', `Mobile money: approve payment\nof ${M(a)} to RSL on your\nphone (M-Pesa or EcoCash).\n\n1. I approved it\n0. Cancel`); return; }
  case 't_pay_ok': if (v === '1') { const x = payTax(tr.no, p.d.payAmt, p.mode === 'wa' ? 'wa' : 'ussd'); const t = taxOf(tr.no); p.st = 'end';
      show('t', `Paid ${M(x.amt)} ✅\nRef ${x.ref}\nRSL receipt ${rcptOf(x)}\n${t.owed > 0 ? 'Still due: ' + M(t.owed) + (t.overdueAmt ? '\n(' + M(t.overdueAmt) + ' overdue: pay it\nfirst to restart your streak)' : ' by ' + perDue(lastPer())) : 'All paid. Thank you!'}\nOn-time quarters in a row: ${t.streak}\n\n0. Menu`); } return;
  case 't_reg':
    if (v === '1') { p.st = 't_id'; show('t', 'Enter your ID number:'); }
    else if (v === '2') { tr.helper = true; persist({kind:'seller_helper', no:tr.no}).catch(() => {}); log('info', `${tr.name} asked a tax helper to call`); p.st = 'end'; show('t', 'A tax helper will call you\nwithin 2 working days.\n\n0. Menu'); renderAll(); }
    return;
  case 't_id': { if (v.replace(/\D/g, '').length < 6) { show('t', 'ID number (at least 6 digits):'); return; }
    const look = RSLM.lookup(v); const tin = look.found ? look.tin : RSLM.newTin(v); // simulated RSL e-services TIN check
    tr.status = 'registered'; tr.via = true; tr.tin = tin; tr.declared = null; tr.regAt = clock; tr.tinFound = look.found;
    persist({kind:'seller_register', no:tr.no, tin}).catch(() => {});
    log('ok', `${tr.name} registered through Rasiti · TIN ${tin} · customers now earn double entries`); fillSelects(); p.st = 'end';
    show('t', `Checking RSL register...\n${look.found ? 'Found on RSL register.' : 'RSL issued your TIN.'}\nTIN ${tin}\nYou are a registered seller.\n\nYour customers now earn\ndouble draw entries.\nFirst return due ${dueDate()},\nprefilled from your book.\n\n0. Menu`);
    narrate(`<b>Tax net widened.</b> ${esc(tr.name)} registered from her own phone. Her customers keep their entries and now earn double, which gives them a reason to choose her stall.`); renderAll(); return; }
  case 't_pin': {
    if (!/^\d{4}$/.test(v)) { show('t', 'The PIN has 4 digits.\n\nEnter your 4-digit PIN:'); return; }
    if (tr.lockUntil > clock) { p.st = 'end'; show('t', 'Too many wrong PINs.\nTry again in 15 minutes, or call\nthe Rasiti help line 6808 8101.'); return; }
    if (saved()) { api('event', {kind:'seller_pin', no:tr.no, pin:v}, {quiet:true}).then(r => pinDone(r.ok, r.msg, v)).catch(e => show('t', e.message)); return; }
    const ok = v === (tr.pin || DEMO_PIN); p.pinFails = ok ? 0 : (p.pinFails || 0) + 1;
    if (!ok && p.pinFails >= 3) { tr.lockUntil = clock + 15 * MIN; p.pinFails = 0; pinDone(false, 'Wrong PIN 3 times. The seller menu is locked for 15 minutes.', v); return; }
    pinDone(ok, ok ? '' : `Wrong PIN. ${3 - p.pinFails} ${3 - p.pinFails === 1 ? 'try' : 'tries'} left.`, v); return; }
  case 't_mc': if (v === '3') { p.st = 't_pos_bank'; show('t', 'Your card machine bank\n\n1. Standard Lesotho Bank\n2. FNB Lesotho\n3. Nedbank Lesotho\n4. Lesotho PostBank\n\n0. Menu'); return; }
    if (v !== '1' && v !== '2') { show('t', 'Choose 1, 2 or 3, or 0 for the menu.'); return; }
    p.d.net = v === '1' ? 'mpesa' : 'ecocash'; p.st = 't_mc_code'; show('t', `Your ${NETNAME[p.d.net]} merchant code\n(5 to 7 digits, from ${p.d.net === 'mpesa' ? 'Vodacom' : 'Econet'}):`); return;
  case 't_mc_code': { const mc = v.replace(/\D/g, ''); const key = p.d.net === 'mpesa' ? 'mp' : 'ec', net = NETNAME[p.d.net];
    if (!/^\d{5,7}$/.test(mc)) { show('t', 'A merchant code has 5 to 7 digits.\n\nYour merchant code:'); return; }
    const other = S.traders.find(x => x.no !== tr.no && x[key] === mc);
    const done = () => { tr[key] = mc; p.st = 'end'; log('ok', `${tr.name} linked ${net} merchant code ${mc} (network check simulated)`);
      show('t', `${net} code ${mc} linked.\n${p.d.net === 'mpesa' ? 'Vodacom' : 'Econet'} confirmed it is yours\n(simulated).\n\nPayments to this code now give\nyour customers receipts by themselves.\n\n0. Menu`); renderAll(); };
    if (other) { p.st = 'end'; log('warn', `${net} code ${mc} is already linked to seller ${other.no}: RSL to check`); show('t', `This ${net} code is already\nlinked to another Rasiti seller.\nRSL will check it.\n\n0. Menu`); return; }
    if (saved()) { api('event', {kind:'merchant_link', no:tr.no, pin:p.pin, network:p.d.net, code:mc}, {quiet:true}).then(done).catch(e => { p.st = 'end'; show('t', e.message + '\n\n0. Menu'); }); return; }
    done(); return; }
  case 't_pos_bank': { const bank = {1:'slb', 2:'fnb', 3:'nedbank', 4:'postbank'}[v]; if (!bank) { show('t', 'Choose 1 to 4, or 0 for the menu.'); return; }
    p.d.bank = bank; p.st = 't_pos_id'; show('t', `Terminal ID\n(6 to 12 letters or digits,\non the ${BANKS[bank]} slip):`); return; }
  case 't_pos_id': { const term = v.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!/^[A-Z0-9]{6,12}$/.test(term)) { show('t', 'A terminal ID has 6 to 12\nletters or digits.\n\nTerminal ID:'); return; }
    const other = S.traders.find(x => x.no !== tr.no && x.pos === term);
    if (other) { p.st = 'end'; log('warn', `Card machine ${term} is already linked to seller ${other.no}: RSL to check`); show('t', 'This card machine is already\nlinked to another Rasiti seller.\nRSL will check it.\n\n0. Menu'); return; }
    const done = () => { tr.pos = term; tr.bank = p.d.bank; p.st = 'end'; log('ok', `${tr.name} linked card machine ${term} at ${BANKS[p.d.bank]} (bank check simulated)`);
      show('t', `Card machine ${term} linked.\n${BANKS[p.d.bank]} confirmed it\nis yours (simulated).\n\nCard payments now give your\ncustomers receipts.\n\n0. Menu`); renderAll(); fillSelects(); };
    if (saved()) { api('event', {kind:'card_link', no:tr.no, pin:p.pin, bank:p.d.bank, terminal:term}, {quiet:true}).then(done).catch(e => { p.st = 'end'; show('t', e.message + '\n\n0. Menu'); }); return; }
    done(); return; }
  case 'end': home('t'); return;
  } }
function pinDone(ok, msg, v) { const p = PH.t, tr = tByNo(p.who);
  if (ok) { p.auth = true; p.pin = v; p.st = 'home'; log('info', `${tr.name} signed in to the seller menu with a PIN`); show('t', tHome()); return; }
  if (/locked|Too many/.test(msg)) { p.st = 'end'; log('warn', `Seller menu ${tr.no} locked after 3 wrong PINs`); show('t', msg + '\n\nCall the Rasiti help line 6808 8101 if you forgot it.'); return; }
  show('t', msg + '\n\nEnter your 4-digit PIN:'); }

function cStep(inp) { const p = PH.c, v = String(inp).trim();
  if (v === '0' && !['c_camt', 'c_cl4', 'c_cash_amt', 'c_paper', 'c_place', 'c_reg0', 'c_reg_name'].includes(p.st)) { home('c'); return; }
  switch (p.st) {
  case 'faq': faqStep('c', v); return;
  case 'c_reg0':
    if (v === '9') { setLang('c', p.lang === 'st' ? 'en' : 'st'); show('c', regPrompt()); return; }
    if (v === '1') { p.st = 'c_reg_name'; show('c', 'Great! What is your first name?'); }
    else if (v === '2') show('c', 'Every Rasiti receipt is a free ticket in the monthly prize draw: 1 entry per M10 by M-Pesa, EcoCash or card, 1 entry for cash the seller confirms, double at registered sellers.\nPaid cash? Claim it: menu 1.\n\n1. Register now');
    else show('c', regPrompt());
    return;
  case 'c_reg_name': { const n = v.replace(/[^A-Za-z' -]/g, '').trim().slice(0, 30); if (!n) { show('c', 'Please type your first name:'); return; }
    S.customers[p.who] = {name:n}; log('ok', `New customer registered: ${n} (${mask(p.who)})`);
    show('c', `Thank you, ${n}! ✅ You are registered.\nYour phone number is your Rasiti ID. Ask every seller for a Rasiti receipt.`);
    p.st = 'home'; show('c', cHome()); return; }
  case 'home':
    if (v === '9') { setLang('c', p.lang === 'st' ? 'en' : 'st'); show('c', (p.lang === 'st' ? 'Language: Sesotho\n\n' : 'Language: English\n\n') + cHome()); return; }
    if (v === '1') { p.st = 'c_cash_seller'; show('c', 'I paid cash\n\nSeller code (on the sticker):'); }
    else if (v === '2') { p.st = 'c_seller'; show('c', 'I paid by card\n\nSeller code (on the sticker):'); }
    else if (v === '3') { p.st = 'c_check'; show('c', 'Check a receipt\n\nEnter the receipt code:'); }
    else if (v === '4') { p.st = 'c_rtype'; show('c', 'Rate a shop you bought from\n\n1. I got a receipt\n2. No receipt given\n3. Charged extra for receipt\n4. Shop not on Rasiti\n5. Fake receipt\n6. Shops that give receipts\n0. Menu'); }
    else if (v === '5') { const mine = S.receipts.filter(r => r.ph === p.who && r.t >= monthStart()); const wait = S.claims.filter(c => c.ph === p.who && claimState(c) === 'pending').length; const sum = s => mine.filter(r => drawStatus(r) === s).reduce((x, r) => x + entriesFor(r), 0);
      const live = (pool({from:monthStart(), to:Infinity}).by[p.who] || {e:0}).e;
      const f = drawDay(); p.st = 'end'; show('c', `My draw entries (this month)\n\nLive: ${live}\nBeing checked: ${sum('held')}${wait ? `\nCash claims waiting for the\nseller: ${wait}` : ''}\n\nNext draw: ${f.getDate()} ${MON[f.getMonth()]}\nEvery receipt plays for\nevery prize.\n\n0. Menu`); }
    else if (v === '6') faqStart('c', 'buyer');
    else if (p.mode === 'wa' && !/^\d+$/.test(v)) { if (!faqFree('c', 'buyer', v)) show('c', cHome()); }
    return;
  case 'c_seller': { const tr = tByNo(v.replace(/\D/g, ''));
    if (!tr) { p.st = 'c_unk'; show('c', `Seller ${v} is not on Rasiti.\n\n1. Tell RSL about this seller\n0. Menu`); return; }
    p.d.no = tr.no; p.st = 'c_camt'; show('c', `${tr.name}\n${tr.market}\n\nAmount paid by card (M):`); return; }
  case 'c_unk': if (v === '1') { p.d.type = 'unlisted'; askPlace(); } return;
  case 'c_cash_seller': { const tr = tByNo(v.replace(/\D/g, ''));
    if (!tr) { p.st = 'c_unk'; show('c', `Seller ${v} is not on Rasiti.\n\n1. Tell RSL about this seller\n0. Menu`); return; }
    p.d.no = tr.no; p.st = 'c_cash_amt'; show('c', `${tr.name}\n${tr.market}\n\nAmount you paid in cash (M):`); return; }
  case 'c_cash_amt': { const a = Math.round(parseFloat(v)); if (!(a > 0)) { show('c', 'Amount (M), numbers only:'); return; }
    p.st = 'end'; cashClaim(p.d.no, a).then(t => show('c', t)); return; }
  case 'c_camt': { const a = Math.round(parseFloat(v)); if (!(a > 0)) { show('c', 'Amount (M), numbers only:'); return; } p.d.amt = a; p.st = 'c_cl4'; show('c', 'Last 4 digits of your card\n(on the card and the slip):'); return; }
  case 'c_cl4': { const l4 = v.replace(/\D/g, ''); if (!/^\d{4}$/.test(l4)) { show('c', 'The last 4 digits of the card\nnumber, e.g. 4471:'); return; }
    p.st = 'end'; claimCard(p.d.no, p.d.amt, l4).then(x => show('c', x.text)); return; }
  case 'c_card_now': if (v === '1') { const d = p.d; p.st = 'end'; claimCard(d.no, d.amt, d.l4).then(x => show('c', x.text)); } return;
  case 'c_check': { const res = verify(v, p.who); p.d.res = res; p.st = res.genuine ? 'c_ok' : 'c_bad'; show('c', res.text); return; }
  case 'c_ok': { const r = p.d.res.r;
    if (v === '1' && !r.ph && r.ch !== 'card') { r.ph = p.who; reEval(); persist({kind:'receipt_phone', code:r.code, phone:p.who}).catch(() => {}); log('ok', `Receipt ${r.code} added to ${mask(p.who)}'s entries`); p.st = 'end'; show('c', `Added. +${entriesFor(r)} entries.\n\n0. Menu`); renderAll(); }
    else if (v === '1' && r.ph && r.ph !== p.who) { addFake({code:r.code, kind:'duplicate', by:p.who, detail:'Receipt already belongs to another phone. Second claim refused.'}); log('bad', `Duplicate claim refused: ${r.code}`); p.st = 'end'; show('c', 'This receipt already belongs\nto another phone. It cannot\nbe claimed twice.\n\n0. Menu'); renderAll(); }
    else if (v === '2') { p.st = 'c_paper'; show('c', 'Amount printed on your\npaper receipt (M):'); }
    return; }
  case 'c_paper': { const a = parseFloat(v); const r = p.d.res.r; if (!(a > 0)) return;
    if (Math.round(a) !== r.amt) { addFake({code:r.code, kind:'tampered', by:p.who, detail:`Paper shows ${M(a)}; the register shows ${M(r.amt)}.`}); log('bad', `Altered receipt reported: ${r.code}`);
      p.st = 'end'; show('c', `Amounts do not match.\nReal sale: ${M(r.amt)}\nYour paper: ${M(a)}\nReported to RSL. Thank you.\n\n0. Menu`); renderAll(); }
    else { p.st = 'end'; show('c', 'Amounts match. All good.\n\n0. Menu'); } return; }
  case 'c_bad': if (v === '1') { p.d.type = 'fake'; askPlace(); } return;
  case 'c_rtype': { if (v === '6') { const good = shopStats().filter(x => x.badge).slice(0, 5); p.st = 'end'; show('c', 'Shops that give receipts\n(rated by customers)\n\n' + good.map(x => '✓ ' + x.label).join('\n') + '\n\n0. Menu'); return; }
    const t = {1:'got', 2:'none', 3:'extra', 4:'unlisted', 5:'fake'}[v]; if (!t) return; p.d.type = t; askPlace(); return; }
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
  const cardWait = r.ch === 'card' && !r.ph;
  return {genuine:true, r, text:`✅ GENUINE\n${tr.name}\n${tr.market}\n${M(r.amt)} · ${PAYNAME(r)} · ${fT(r.t)}${r.flag ? '\n⚠ Payment ' + (r.flag === 'reversed' ? 'reversed' : 'paid back') + ': no entries' : ''}\n${r.ph ? `Entries: ${entriesFor(r)} (${drawStatus(r)})` : cardWait ? 'Card payment: claim it with\nCustomer > 1 and your card' : 'Not linked to a phone yet'}\n\n${r.ph || cardWait ? '' : '1. Add to my draw entries\n'}2. Paper amount looks wrong?\n0. Menu`}; }

function fillSelects() {
  const ts = $('#tSel'); if (!ts) return;
  ts.innerHTML = S.traders.map(t => `<option value="${t.no}">${esc(t.name)} · ${esc(t.trade)} (${t.status})</option>`).join('') + '<option value="new">Someone not on Rasiti yet</option>';
  ts.value = PH.t.who || 'new';
  const ms = $('#mmSeller'); if (ms) { const keep = ms.value; ms.innerHTML = S.traders.map(t => `<option value="${t.no}">${esc(t.name)} · ${t.no}</option>`).join(''); ms.value = keep && tByNo(keep) ? keep : (S.traders.find(t => t.mp) || S.traders[0] || {}).no || ''; mmFill(); }
  $('#cSel').innerHTML = PERSONAS.map(p => `<option value="${p.ph}">${p.name} · ${mask(p.ph)}</option>`).join(''); $('#cSel').value = PH.c.who;
}
// Guided cases sign the seller in with the demo PIN, as the seller would.
function caseSeller(no) { setT(no); PH.t.auth = true; PH.t.pin = DEMO_PIN; PH.t.st = 'home'; show('t', tHome()); }
function setT(no) { if (PH.t.who !== no) resetPhone('t', no); $('#tSel').value = no; home('t'); }
function setC(ph) { if (PH.c.who !== ph) resetPhone('c', ph); $('#cSel').value = ph; home('c'); }

/* ================= receipt card ================= */
function renderReceipt() { const r = S.lastReceipt; if (!r) return; const tr = tByNo(r.no);
  $('#receiptCard').innerHTML = `<div class="receipt"><div class="rh"><svg viewBox="0 0 176 100" role="img" aria-label="Rasiti"><use href="#rasiti-mark"/></svg></div>
    <div>${esc(tr.name)}<br>${esc(tr.trade)} · ${esc(tr.market)}</div>
    <div class="row"><span>Seller code</span><span>${tr.no}</span></div>
    <div class="row"><span>${fT(r.t)}</span><span>${PAYNAME(r)}${r.c4 ? ' ••' + r.c4 : ''}</span></div>
    <div class="row" style="font-weight:600;font-size:.9rem;margin-top:4px"><span>TOTAL</span><span>${M(r.amt)}.00</span></div>
    <div class="code">${r.code}</div>
    <div class="row"><span>Draw entries</span><span>${entriesFor(r)} · ${drawStatus(r)}</span></div>
    <div class="foot">Check it: dial *999#, or WhatsApp Rasiti</div></div>`; }
function renderFeed() { $('#feed').innerHTML = S.feed.slice(0, 40).map(f => `<li><time>${hm(f.t)}</time><span><span class="k-${f.kind}">●</span> ${esc(f.text)}</span></li>`).join('') || '<li><span></span><span class="note">Nothing yet.</span></li>'; }

/* ================= Fraud Shield view ================= */
const STATEPILL = {clear:'<span class="pill p-ok">Clear</span>', approved:'<span class="pill p-ok">Approved</span>', held:'<span class="pill p-warn">Held for review</span>', blocked:'<span class="pill p-bad">Blocked</span>', rejected:'<span class="pill p-bad">Rejected</span>'};
const FAKEPILL = {forged:'Forged code', unknown:'Not in register', tampered:'Altered amount', duplicate:'Claimed twice', cardmiss:'Card claim did not match'};
function renderShield() {
  fillSel('#sfSeller', [['all', 'All sellers'], ...S.traders.map(t => [t.no, `${t.name} (${t.no})`])], SF.seller);
  fillSel('#sfRule', [['all', 'All rules'], ...RULES.map(r => [r.id, r.name])], SF.rule);
  const all = shieldRows(); $('#sfNote').textContent = 'Showing: ' + shieldLabel() + '. Counts and the receipt list follow these filters.'; const st = r => shieldState(r); const n = s => all.filter(r => st(r) === s).length;
  $('#shieldKpis').innerHTML = [[all.length.toLocaleString('en-US'), 'Receipts scored'], [n('clear') + n('approved'), 'Clear'], [n('held'), 'Held for an officer'], [n('blocked') + n('rejected'), 'Blocked from the draw'], [S.fakes.length, 'Fake or misused codes stopped']].map(kpi).join('');
  const hits = {}; for (const c in S.eval) S.eval[c].flags.forEach(f => hits[f.id] = (hits[f.id] || 0) + 1);
  $('#rulesTbl').innerHTML = '<tr><th>Rule</th><th class="num">Points</th><th class="num">Hits</th></tr>' + RULES.map(r => `<tr><td><b>${r.name}</b><div class="note">${r.what}</div></td><td class="num">${r.pts}</td><td class="num">${hits[r.id] || 0}</td></tr>`).join('') +
    '<tr><td colspan="3" class="note">Every code a customer enters is also checked: the check character, the register, the amount on paper, and whether another phone already claimed it.</td></tr>';
  $('#fakesTbl').innerHTML = '<tr><th>When</th><th>Code</th><th>What happened</th></tr>' + S.fakes.slice().sort((a, b) => b.t - a.t).slice(0, 30).map(f => `<tr><td class="mono">${fT(f.t)}</td><td class="mono">${f.code ? esc(f.code) : '–'}</td><td><span class="pill p-bad">${FAKEPILL[f.kind]}</span><div class="note">${esc(f.detail)}</div></td></tr>`).join('');
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
function watchContext(a) { const was = SHOWPH; SHOWPH = false; try { return watchContext2(a); } finally { SHOWPH = was; } }
function watchContext2(a) {
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
function saveBlob(blob, name) { if (HOOK.save) { HOOK.save(name); return; } const u = URL.createObjectURL(blob); const l = document.createElement('a'); l.href = u; l.download = name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }
const stamp = () => { const d = new Date(); return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()); };
const isoT = t => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const maskCsv = p => p ? (SHOWPH ? p : p.slice(0, 4) + '****' + p.slice(-3)) : '';
function watchCSV(kind) { const a = watchData();
  if (kind === 'ratings') downloadCSV(`rasiti-ratings-${stamp()}.csv`, [['Date and time', r => isoT(r.t)], ['Shop', r => r.target.no ? tByNo(r.target.no).name : r.target.label], ['Seller code', r => r.target.no || ''], ['On Rasiti', r => r.target.no ? 'Yes' : 'No'], ['Shop type', r => r.target.no ? tByNo(r.target.no).trade : (r.target.kind || '')], ['Area', r => repArea(r)], ['Rating', r => REPTYPE[r.type]], [SHOWPH ? 'Customer phone' : 'Customer (masked)', r => maskCsv(r.ph)], ['Latitude', r => r.lat == null ? '' : (+r.lat).toFixed(5)], ['Longitude', r => r.lng == null ? '' : (+r.lng).toFixed(5)]], a.rs.slice().sort((x, y) => y.t - x.t));
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
const pdfTxt = s => String(s ?? '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/[•]/g, '*').replace(/…/g, '...').replace(/[▲]/g, '+').replace(/[▼]/g, '').replace(/→/g, '->').replace(/[^\x09\x0a\x20-\x7e\xa0-\xff]/g, '');
async function makePdf(file, title, blocks) {
  const {jsPDF} = await loadJsPDF(); const doc = new jsPDF({unit:'mm', format:'a4'});
  const W = 210, MX = 14, CW = W - 2 * MX, BOT = 282; let y = 0;
  const header = () => { doc.setFillColor(26, 27, 46); doc.rect(0, 0, W, 15, 'F'); doc.setFillColor(232, 121, 58); doc.rect(0, 15, W, 1.2, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('RASITI', MX, 10); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.text('RSL Taxathon 2026 · demo: all names and numbers are fictional', W - MX, 10, {align:'right'}); y = 25; };
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
    else if (b.t === 'desc') { doc.setFont('helvetica', 'normal'); doc.setFontSize(9.2); const ls = doc.splitTextToSize(pdfTxt(b.v), CW - 7);
      need(Math.min(14, 5 + ls.length * 4.3)); doc.setFillColor(232, 121, 58); doc.rect(MX, y - 3.2, 0.9, 4.4, 'F');
      doc.setFont('helvetica', 'bold'); doc.setTextColor(191, 90, 31); doc.text('About this', MX + 4, y); y += 4.6; doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 64, 76);
      for (const l of ls) { need(4.6); doc.setFillColor(232, 121, 58); doc.rect(MX, y - 3.2, 0.9, 4.4, 'F'); doc.setTextColor(60, 64, 76); doc.text(l, MX + 4, y); y += 4.3; } y += 3.5; }
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
  if (HOOK.save) HOOK.save(file); else doc.save(file);
}
async function withBusy(fn, msg) { netBusy(true); try { await fn(); toast(msg); } catch (e) { toast('Could not make the PDF: ' + e.message); } finally { netBusy(false); } }
/* ---- Real map images for PDF reports: satellite tiles drawn on a canvas, markers on top ---- */
// Our own server fetches the tiles first (same address, so the browser lets us draw them into the PDF);
// direct requests to the map servers are the backup. Satellite first, street map if satellite is not available.
const TILE_SOURCES = [
  {url:(z, x, y) => `/api/tile?s=sat&z=${z}&x=${x}&y=${y}`, credit:'Imagery © Esri, Maxar, Earthstar Geographics', dark:true, own:true},
  {url:(z, x, y) => `/api/tile?s=street&z=${z}&x=${x}&y=${y}`, credit:'© OpenStreetMap contributors', dark:false, own:true},
  {url:(z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`, credit:'Imagery © Esri, Maxar, Earthstar Geographics', dark:true},
  {url:(z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`, credit:'© OpenStreetMap contributors', dark:false}
];
const lx = (lon, z) => (lon + 180) / 360 * 256 * 2 ** z;
const ly = (lat, z) => { const s = Math.sin(lat * Math.PI / 180); return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * 256 * 2 ** z; };
function loadTile(src) { return new Promise((ok, no) => { const im = new Image(); im.crossOrigin = 'anonymous'; const t = setTimeout(() => { im.src = ''; no(new Error('timeout')); }, 9000);
  im.onload = () => { clearTimeout(t); ok(im); }; im.onerror = () => { clearTimeout(t); no(new Error('tile')); }; im.src = src; }); }
function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
// spec: {points:[{ll,color,r}], circles:[{ll,color,meters,label}], labels:[{ll,text}], legend:[[color,text]], title}
async function mapImage(spec) {
  const W = 1200, H = 760, PAD = 70;
  const lls = [...spec.points.map(p => p.ll), ...(spec.circles || []).map(c => c.ll), ...(spec.labels || []).map(l => l.ll)].filter(Boolean);
  if (!lls.length) throw new Error('nothing to map');
  const la = lls.map(x => x[0]), lo = lls.map(x => x[1]);
  // fractional zoom that fills the frame: tiles come from the next whole zoom level and are drawn slightly smaller (stays sharp)
  const sx = Math.max(1e-9, lx(Math.max(...lo), 0) - lx(Math.min(...lo), 0)), sy = Math.max(1e-9, ly(Math.min(...la), 0) - ly(Math.max(...la), 0));
  const zf = Math.min(17, Math.log2((W - 2 * PAD) / sx), Math.log2((H - 2 * PAD - 60) / sy)); const z = Math.max(3, Math.ceil(zf)); const sc = 2 ** (zf - z), T = 256 * sc;
  const X = lon => lx(lon, z) * sc, Y = lat => ly(lat, z) * sc;
  const cx = (X(Math.max(...lo)) + X(Math.min(...lo))) / 2, cy = (Y(Math.min(...la)) + Y(Math.max(...la))) / 2 + 10;
  const ox = cx - W / 2, oy = cy - H / 2; const P = ll => [X(ll[1]) - ox, Y(ll[0]) - oy];
  for (const src of TILE_SOURCES.filter(t => !t.own || API.online)) {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
    const tiles = []; for (let tx = Math.floor(ox / T); tx <= Math.floor((ox + W) / T); tx++) for (let ty = Math.floor(oy / T); ty <= Math.floor((oy + H) / T); ty++) tiles.push([tx, ty]);
    c.imageSmoothingQuality = 'high';
    const res = await Promise.allSettled(tiles.map(([tx, ty]) => loadTile(src.url(z, tx, ty)).then(im => c.drawImage(im, tx * T - ox, ty * T - oy, T + .5, T + .5))));
    if (res.filter(r => r.status === 'fulfilled').length < tiles.length * 0.7) continue;
    try { drawOverlay(c, spec, P, zf, W, H, src); return {src:cv.toDataURL('image/jpeg', 0.88), w:W, h:H, real:true, credit:src.credit}; } catch { continue; }
  }
  return null; // tiles blocked: caller falls back to the schematic drawing
}
function drawOverlay(c, spec, P, z, W, H, src) {
  if (src.dark) { c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(0, 0, W, H); }
  const mpp = 156543.03 * Math.cos(-29.32 * Math.PI / 180) / 2 ** z; // metres per pixel in Maseru
  for (const ci of spec.circles || []) { const [x, y] = P(ci.ll); const r = Math.max(14, ci.meters / mpp);
    c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = ci.color + '66'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#fff'; c.stroke(); }
  for (const p of spec.points) { const [x, y] = P(p.ll); c.beginPath(); c.arc(x, y, p.r || 10, 0, 7); c.fillStyle = p.color; c.globalAlpha = p.alpha || 1; c.fill(); c.globalAlpha = 1;
    if (!p.noRing) { c.lineWidth = 3.5; c.strokeStyle = '#fff'; c.stroke(); } }
  const placed = spec.points.map(p => { const [x, y] = P(p.ll); const r = (p.r || 10) + 3; return [x - r, y - r, 2 * r, 2 * r]; }); c.font = 'bold 21px Arial, Helvetica, sans-serif'; c.textBaseline = 'middle';
  for (const l of spec.labels || []) { const [x, y] = P(l.ll); const tw = c.measureText(l.text).width + 18, th = 32;
    const tries = [[x - tw / 2, y - 66], [x - tw / 2, y + 34], [x + 30, y - th / 2], [x - tw - 30, y - th / 2], [x - tw / 2, y - 104], [x - tw / 2, y + 72], [x + 30, y - 52], [x - tw - 30, y + 20], [x + 30, y + 20], [x - tw - 30, y - 52]];
    let pos = tries.find(([a, b]) => a > 4 && b > 4 && a + tw < W - 4 && b + th < H - 60 && !placed.some(q => a < q[0] + q[2] && a + tw > q[0] && b < q[1] + q[3] && b + th > q[1])) || tries[0];
    placed.push([pos[0], pos[1], tw, th]); roundRect(c, pos[0], pos[1], tw, th, 8); c.fillStyle = 'rgba(26,27,46,.86)'; c.fill(); c.fillStyle = '#fff'; c.fillText(l.text, pos[0] + 9, pos[1] + th / 2 + 1); }
  c.font = '19px Arial, Helvetica, sans-serif'; let lw = 24; for (const [, t] of spec.legend) lw += c.measureText(t).width + 50;
  roundRect(c, 14, H - 54, Math.min(lw, W - 28), 40, 10); c.fillStyle = 'rgba(255,255,255,.93)'; c.fill();
  let x = 32; for (const [col, t] of spec.legend) { c.beginPath(); c.arc(x, H - 34, 9, 0, 7); c.fillStyle = col; c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#fff'; c.stroke(); c.fillStyle = '#1a1b2e'; c.fillText(t, x + 16, H - 33); x += c.measureText(t).width + 50; }
  c.font = '15px Arial, sans-serif'; const cr = src.credit + ' · positions approximate'; const cw = c.measureText(cr).width + 16;
  roundRect(c, W - cw - 10, 10, cw, 26, 6); c.fillStyle = 'rgba(255,255,255,.85)'; c.fill(); c.fillStyle = '#333'; c.fillText(cr, W - cw - 2, 24);
}
async function mapOrSchematic(spec, fallbackSvg) { try { const m = await mapImage(spec); if (m) return m; } catch {} const s = await svgToPng(fallbackSvg); return {...s, real:false}; }
const SIGLEG = [['#1d9e57', 'Gives receipts'], ['#3b82f6', 'Mixed'], ['#f0a020', 'Low receipts'], ['#d93025', 'New lead'], ['#9aa0ad', 'Too few to judge']];
function shopMapSpec(st) { return {points:st.filter(x => x.ll).map(x => ({ll:x.ll, color:SIGCOL[x.sig], r:x.on ? 11 : 10})), labels:Object.entries(AREAS).filter(([n]) => st.some(x => x.area === n)).map(([n, ll]) => ({ll, text:n})), legend:SIGLEG}; }
function hotMapSpec(rs) { const pts = []; for (const r of rs) { if (r.type === 'got') continue; let ll = r.lat != null ? [r.lat, r.lng] : null;
    if (!ll && r.target.no) { const t = tByNo(r.target.no); const b = t && traderLL(t); if (b) { const j = hashStr(r.id); ll = [b[0] + ((j % 100) - 50) / 90000, b[1] + (((j >> 8) % 100) - 50) / 90000]; } }
    if (ll) pts.push({ll, color:'#eb6834', r:9, alpha:.55, noRing:true}); }
  return {points:pts, labels:Object.entries(AREAS).map(([n, ll]) => ({ll, text:n})), legend:[['#eb6834', 'One rating with no receipt or a problem (darker = more)']]}; }
function areaMapSpec(areas) { const col = r => r >= 80 ? '#1d9e57' : r < 50 ? '#f0a020' : '#3b82f6';
  return {points:[], circles:areas.filter(a => AREAS[a.area] && a.rate != null).map(a => ({ll:AREAS[a.area], color:col(a.rate), meters:90 + a.n * 4})),
    labels:areas.filter(a => AREAS[a.area] && a.rate != null).map(a => ({ll:AREAS[a.area], text:`${a.area}: ${a.rate}%`})), legend:[['#1d9e57', '80% or more got a receipt'], ['#3b82f6', '50 to 79%'], ['#f0a020', 'Under 50%']]}; }
function leadMapSpec(wl) { const col = p => p >= 3 ? '#d93025' : p === 2 ? '#f0a020' : '#9aa0ad';
  return {points:wl.filter(i => i.ll).map(i => ({ll:i.ll, color:col(i.pri), r:11})), labels:Object.entries(AREAS).filter(([n]) => wl.some(i => i.subj.market === n)).map(([n, ll]) => ({ll, text:n})), legend:[['#d93025', 'High priority'], ['#f0a020', 'Medium'], ['#9aa0ad', 'Low or watching']]}; }
function schematicFrom(spec, W) { W = W || 640; const H = Math.round(W * .62); const p = PAL.light; const all = [...spec.points.map(x => x.ll), ...(spec.circles || []).map(x => x.ll), ...Object.values(AREAS)];
  const la = all.map(x => x[0]), lo = all.map(x => x[1]); const a0 = Math.min(...la) - .004, a1 = Math.max(...la) + .004, o0 = Math.min(...lo) - .006, o1 = Math.max(...lo) + .006;
  const X = v => 30 + (v - o0) / (o1 - o0) * (W - 60), Y = v => 40 + (a1 - v) / (a1 - a0) * (H - 90);
  let s = svgOpen(W, H, p) + `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" fill="#eef2ee" stroke="${p.grid}"/>`;
  for (const ci of spec.circles || []) s += `<circle cx="${X(ci.ll[1])}" cy="${Y(ci.ll[0])}" r="${Math.min(40, 10 + ci.meters / 25)}" fill="${ci.color}" fill-opacity=".45" stroke="#fff" stroke-width="2"/>`;
  for (const x of spec.points) s += `<circle cx="${X(x.ll[1])}" cy="${Y(x.ll[0])}" r="5.5" fill="${x.color}" fill-opacity="${x.alpha || 1}" ${x.noRing ? '' : 'stroke="#fff" stroke-width="2"'}/>`;
  const placed = []; for (const l of spec.labels || []) { const x = X(l.ll[1]), y = Y(l.ll[0]); const w = l.text.length * 6.2 + 10;
    const tries = [[x - w / 2, y - 34], [x - w / 2, y + 16], [x + 14, y - 9], [x - w - 14, y - 9], [x - w / 2, y - 54]]; const pos = tries.find(([a, b]) => !placed.some(q => a < q[0] + q[2] && a + w > q[0] && b < q[1] + 18 && b + 18 > q[1])) || tries[0];
    placed.push([pos[0], pos[1], w]); s += `<rect x="${pos[0]}" y="${pos[1]}" width="${w}" height="18" rx="4" fill="#1a1b2e" fill-opacity=".85"/><text x="${pos[0] + 5}" y="${pos[1] + 13}" font-size="11" fill="#fff">${esc(l.text)}</text>`; }
  let lx2 = 14; for (const [col, t] of spec.legend) { s += `<circle cx="${lx2 + 5}" cy="${H - 14}" r="5" fill="${col}"/><text x="${lx2 + 14}" y="${H - 10}" font-size="10.5" fill="${p.ink}">${esc(t)}</text>`; lx2 += 30 + t.length * 5.8; }
  return s + '</svg>'; }
const mapImg = spec => mapOrSchematic(spec, schematicFrom(spec));
const mapNote = m => m.real ? `Map: ${m.credit}. Shop positions in the mock data are approximate places in Maseru.` : 'Map tiles could not be loaded on this connection, so this is a simple drawing of the same positions.';

/* ---- plain-language descriptions for every figure in the PDF reports ---- */
const pl = (n, w, ws) => `${n} ${n === 1 ? w : (ws || w + 's')}`;
const pctS = (a, b) => b ? Math.round(a / b * 100) + '%' : '0%';
function watchDescs(a) { const k = a.kp, tr = k.early != null && k.late != null ? k.late - k.early : null; const D = {};
  D.kpis = `What these numbers mean. Shop ratings (${k.ratings}): each time a customer told Rasiti whether a shop gave them a receipt, in the period and areas chosen. People taking part (${k.people}): different customers who sent ratings; no single person can drive a result. Shops seen (${k.shops}): shops that received at least one rating. Shops not on Rasiti (${k.off}): shops customers rated that have not joined Rasiti yet, which are possible new taxpayers. Purchases with a receipt (${k.rate ?? '-'}%): the share of ratings where the customer got a receipt. Change (${tr == null ? '-' : (tr > 0 ? '+' : '') + tr + ' points'}): the receipt rate in the second half of the period minus the first half; ${tr == null ? 'there is not enough data to compare' : tr > 0 ? 'a positive number means receipts are becoming more common' : tr < 0 ? 'a negative number means receipts are becoming less common' : 'no change'}.`;
  const sig = s => a.st.filter(x => x.sig === s).length; const leadAreas = Object.entries(a.st.filter(x => x.sig === 'lead').reduce((o, x) => (o[x.area] = (o[x.area] || 0) + 1, o), {})).sort((x, y) => y[1] - x[1]);
  const vb = (n, one, many) => n === 1 ? one : many;
  D.shopMap = `Each dot is one shop, placed where customers rated it and coloured by its receipt signal. ${pl(sig('good'), 'shop')} ${vb(sig('good'), 'gives', 'give')} receipts (green, 80% or more), ${pl(sig('mid'), 'shop')} ${vb(sig('mid'), 'is', 'are')} mixed (blue), ${pl(sig('low'), 'shop')} ${vb(sig('low'), 'gives', 'give')} few receipts (orange, under 50%), ${pl(sig('lead'), 'new lead')} ${vb(sig('lead'), 'is a shop', 'are shops')} not on Rasiti that 3 or more different customers reported (red), and ${pl(sig('few'), 'shop')} ${vb(sig('few'), 'has', 'have')} too few ratings to judge (grey). ${leadAreas.length ? `New leads are concentrated in ${leadAreas.slice(0, 2).map(x => x[0] + ' (' + x[1] + ')').join(' and ')}.` : 'There are no new leads in this view.'} Red dots are the best places to send a market tax helper.`;
  const neg = a.rs.filter(r => r.type !== 'got'); const byA = Object.entries(neg.reduce((o, r) => { const ar = repArea(r); o[ar] = (o[ar] || 0) + 1; return o; }, {})).sort((x, y) => y[1] - x[1]);
  D.hotMap = `Each dot is one customer rating where no receipt was given or another problem was reported (charged extra, seller not on Rasiti). Dots are see-through, so darker clusters mean many complaints in the same place. There are ${neg.length} such ratings in this view${byA.length ? `; the most are in ${byA.slice(0, 3).map(x => x[0] + ' (' + x[1] + ')').join(', ')}` : ''}. Use this map to decide where awareness campaigns and visits will have the most effect.`;
  const ar = a.areas.filter(x => x.rate != null); const best = ar[ar.length - 1], worst = ar[0];
  D.areaMap = `Each circle is a trading area. The number is the share of ratings in that area where the customer got a receipt; the colour shows the band (green 80% or more, blue 50 to 79%, orange under 50%) and a bigger circle means more ratings. ${worst && best && worst !== best ? `The lowest is ${worst.area} at ${worst.rate}% and the highest is ${best.area} at ${best.rate}%.` : ''} Areas with few ratings can change quickly, so read small circles with care.`;
  const tot = a.days.reduce((s, d) => s + d.got + d.no, 0); const busy = a.days.slice().sort((x, y) => (y.got + y.no) - (x.got + x.no))[0]; const worstD = a.days.filter(d => d.got + d.no >= 4).sort((x, y) => y.no / (y.got + y.no) - x.no / (x.got + x.no))[0];
  D.daily = `Each bar is one day. Blue is ratings where the customer got a receipt; orange stacked on top is ratings with no receipt or a problem. Over ${a.days.length} days there were ${tot} ratings, about ${(tot / a.days.length).toFixed(1)} a day. The busiest day was ${busy ? fD(busy.t) + ' with ' + (busy.got + busy.no) + ' ratings' : '-'}${worstD ? `, and the day with the highest share of missing receipts was ${fD(worstD.t)} (${pctS(worstD.no, worstD.got + worstD.no)} of ${worstD.got + worstD.no} ratings)` : ''}. A rising blue share over time means more customers are getting receipts.`;
  D.types = `How customers described their purchase. ${a.types.map(t => `${t.label}: ${t.n} (${pctS(t.n, k.ratings)})`).join('; ')}. "No receipt given" and "Charged extra for a receipt" point to sellers who need a visit or reminder. "Seller not on Rasiti" points to possible new taxpayers. Fake receipts are counted separately by the Fraud Shield.`;
  const hs = a.hours.filter(h => h.got + h.no >= 5).sort((x, y) => y.missed - x.missed);
  D.hours = `Each bar shows, for one time of day, the share of ratings where the customer got no receipt or reported a problem. A higher bar means receipts are missed more often then. ${hs.length ? `The worst time is ${hs[0].label}h (${hs[0].missed}% missed, from ${hs[0].got + hs[0].no} ratings) and the best is ${hs[hs.length - 1].label}h (${hs[hs.length - 1].missed}%).` : 'There are too few ratings to compare times.'} Visits and reminders work best when they match the worst time.`;
  const ch = a.areas.filter(x => x.early != null && x.late != null).map(x => ({...x, d:x.late - x.early})).sort((x, y) => x.d - y.d);
  D.areaTbl = `One row per area. Shops: shops rated there. Not on Rasiti: of those, how many have not joined. Ratings: number of customer ratings. Receipt rate: share that came with a receipt. 1st half and 2nd half: the receipt rate in each half of the period, to show the trend. Leads: shops not on Rasiti reported by 3 or more different customers. ${ch.length ? `Biggest drop: ${ch[0].area} (${ch[0].d >= 0 ? '+' : ''}${ch[0].d} points). Biggest improvement: ${ch[ch.length - 1].area} (${ch[ch.length - 1].d >= 0 ? '+' : ''}${ch[ch.length - 1].d} points).` : ''}`;
  D.shopTbl = `One row per shop. People: different customers who rated it. Receipt rate: share of their purchases that came with a receipt (shown once 3 or more people have rated it). Signal: Gives receipts (80% or more, earns the public badge), Mixed (50 to 79%), Low receipts (under 50%), New lead (not on Rasiti and reported by 3 or more people) or Too few to judge. No single rating ever leads to action.`;
  return D; }

function watchPDF() { return withBusy(async () => {
  const a = watchData(); const k = a.kp; const p = PAL.light; const D = watchDescs(a); const st = a.st.filter(x => WF.sig === 'all' || x.sig === WF.sig);
  const imgs = await Promise.all([svgToPng(chartDaily(a.days, p, 640)), svgToPng(chartHBars(a.types.map(t => ({label:REPSHORT[t.k], v:t.n})), p, 560)), svgToPng(chartHours(a.hours, p, 560)),
    mapImg(shopMapSpec(st)), mapImg(hotMapSpec(a.rs.filter(r => WF.ctype === 'all' || r.type === WF.ctype))), mapImg(areaMapSpec(a.areas))]);
  const tr = k.early != null && k.late != null ? k.late - k.early : null;
  const finding = WA.last && WA.last.filters === fLabel(a.f) ? WA.last : {question:'Summarise this view', answer:watchTemplate('w_sum', a), mode:'template'};
  await makePdf(`rasiti-community-watch-${stamp()}.pdf`, 'Community watch report', [
    {t:'meta', v:`Filters: ${fLabel(a.f)}${WF.sig !== 'all' ? ' · shop signal: ' + SIGTXT[WF.sig] : ''}. ${phNote()} Ratings from phones flagged as spam are left out.`},
    {t:'desc', v:'Community watch turns customer ratings into a picture of where trade happens and which shops give receipts. Customers rate a shop after buying; RSL looks at patterns across many customers, never at one report alone. This report shows the key figures, maps, charts and tables for the filters above, each with a short note on how to read it.'},
    {t:'h', v:'Key figures'}, {t:'kpis', v:[[k.ratings, 'Shop ratings'], [k.people, 'People taking part'], [k.shops, 'Shops seen'], [k.off, 'Shops not on Rasiti'], [(k.rate ?? '-') + '%', 'Purchases with a receipt'], [tr == null ? '-' : (tr > 0 ? '+' : '') + tr + ' pts', 'Change, 2nd vs 1st half']]}, {t:'desc', v:D.kpis},
    {t:'h', v:'Findings from Bohlale AI'}, {t:'meta', v:`Question: ${finding.question} · ${finding.mode === 'ai' ? 'AI answer (' + finding.model + '), to be checked by an officer before acting' : 'Built-in answer from the data'}`}, {t:'md', v:finding.answer},
    {t:'h', v:'Map 1: Shop ratings'}, {t:'img', v:imgs[3]}, {t:'meta', v:mapNote(imgs[3])}, {t:'desc', v:D.shopMap},
    {t:'h', v:'Map 2: Hotspots of purchases without a receipt'}, {t:'img', v:imgs[4]}, {t:'meta', v:mapNote(imgs[4])}, {t:'desc', v:D.hotMap},
    {t:'h', v:'Map 3: Receipt rate by area'}, {t:'img', v:imgs[5]}, {t:'meta', v:mapNote(imgs[5])}, {t:'desc', v:D.areaMap},
    {t:'h', v:'Ratings per day'}, {t:'img', v:imgs[0]}, {t:'desc', v:D.daily},
    {t:'h', v:'What customers reported'}, {t:'img', v:imgs[1]}, {t:'desc', v:D.types},
    {t:'h', v:'Purchases without a receipt, by time of day'}, {t:'img', v:imgs[2]}, {t:'desc', v:D.hours},
    {t:'h', v:'By area'}, {t:'desc', v:D.areaTbl}, {t:'table', cols:[['Area', 34], ['Shops', 10, 1], ['Not on Rasiti', 15, 1], ['Ratings', 11, 1], ['Receipt rate', 14, 1], ['1st half', 11, 1], ['2nd half', 11, 1], ['Leads', 10, 1]],
      rows:a.areas.map(x => [x.area, x.shops, x.off, x.n, (x.rate ?? '-') + '%', x.early == null ? '-' : x.early + '%', x.late == null ? '-' : x.late + '%', x.leads])},
    {t:'h', v:'By shop'}, {t:'desc', v:D.shopTbl}, {t:'table', cols:[['Shop', 40], ['Area', 26], ['Type', 18], ['People', 10, 1], ['Receipt rate', 13, 1], ['Signal', 22]],
      rows:st.map(x => [x.label, x.area, x.kind, x.people.size, x.rate == null ? '-' : Math.round(x.rate * 100) + '%', SIGTXT[x.sig]])}
  ]);
}, 'PDF report downloaded'); }
function answerPDF(question, answer, mode, model, title) { return withBusy(() => makePdf(`rasiti-bohlale-${stamp()}.pdf`, title || 'Bohlale AI answer', [
  {t:'meta', v:`${mode === 'ai' ? 'AI answer (' + model + '). Check the figures before acting.' : 'Built-in answer from Rasiti data.'} Bohlale suggests; officers decide.`},
  {t:'desc', v:mode === 'ai' ? 'This answer was written by Bohlale AI, an assistant for RSL officers, using the current Rasiti data. AI can make mistakes, so check the figures against the dashboards before acting. Bohlale suggests; officers decide.' : 'This answer was built directly from the current Rasiti data by Bohlale\'s built-in rules, without an AI model. The figures come straight from the dashboards.'},
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
  downloadCSV(`rasiti-fraud-shield-${stamp()}.csv`, [['Date and time', r => isoT(r.t)], ['Receipt code', r => r.code], ['Seller', r => (tByNo(r.no) || {}).name || r.no], ['Seller code', r => r.no], ['Amount (M)', r => r.amt], ['Paid by', r => PAYNAME(r)], ['Network notice', r => r.flag ? SXF[r.flag] : ''], [SHOWPH ? 'Customer phone' : 'Customer (masked)', r => maskCsv(r.ph)], ['Status', r => shieldState(r)], ['Score', r => S.eval[r.code].score], ['Reasons', r => S.eval[r.code].flags.map(f => RULE[f.id].name).join(' | ')]], rows); }
function fakesCSV() { downloadCSV(`rasiti-fake-codes-${stamp()}.csv`, [['Date and time', f => isoT(f.t)], ['Code', f => f.code], ['What happened', f => FAKEPILL[f.kind] || f.kind], ['Detail', f => f.detail], [SHOWPH ? 'Reported by' : 'Reported by (masked)', f => maskCsv(f.by)]], S.fakes.slice().sort((a, b) => b.t - a.t)); }
function shieldPDF() { return withBusy(async () => { const all = shieldRows(); const n = s => all.filter(r => shieldState(r) === s).length; const rows = shieldStreamRows(all);
  const hits = {}; all.forEach(r => S.eval[r.code].flags.forEach(f => hits[f.id] = (hits[f.id] || 0) + 1)); const topRule = RULES.slice().sort((a, b) => (hits[b.id] || 0) - (hits[a.id] || 0))[0];
  const val = all.reduce((a, r) => a + r.amt, 0); const bySel = Object.entries(rows.reduce((o, r) => (o[r.no] = (o[r.no] || 0) + 1, o), {})).sort((a, b) => b[1] - a[1]);
  const fk = S.fakes.reduce((o, f) => (o[f.kind] = (o[f.kind] || 0) + 1, o), {}); const listName = ({all:'flagged receipts (not clear)', held:'receipts held for review', blocked:'blocked or rejected receipts', live:'the latest 25 receipts', every:'all receipts'})[S.filter];
  await makePdf(`rasiti-fraud-shield-${stamp()}.pdf`, 'Fraud Shield report', [
    {t:'meta', v:`Filters: ${shieldLabel()} · list: ${listName}. ${phNote()}`},
    {t:'desc', v:'The Fraud Shield protects the monthly draw. It scores every receipt against simple, published rules. A score of 30 or more holds the receipt\'s draw entries until an officer looks at them; 60 or more blocks them. The sale itself always stays in the seller\'s sales book, so honest sellers never lose their records. Every code a customer types is also checked for forgery, tampering and double claims.'},
    {t:'h', v:'Key figures'}, {t:'kpis', v:[[all.length.toLocaleString('en-US'), 'Receipts scored'], [n('clear') + n('approved'), 'Clear'], [n('held'), 'Held for an officer'], [n('blocked') + n('rejected'), 'Blocked from the draw'], [S.fakes.length, 'Fake codes stopped'], [M(val), 'Value of receipts']]},
    {t:'desc', v:`Receipts scored (${all.length}): every receipt issued in the chosen period and for the chosen seller, worth ${M(val)} in total. Clear (${n('clear') + n('approved')}, ${pctS(n('clear') + n('approved'), all.length)}): no rule fired, or an officer approved it; these entries take part in the draw. Held (${n('held')}): at least one rule fired and the entries wait for an officer's decision. Blocked (${n('blocked') + n('rejected')}): a strong rule fired, such as a seller buying from themselves, or an officer rejected the entries. Fake codes stopped (${S.fakes.length}): codes customers typed that were forged, altered, unknown or already claimed.`},
    {t:'h', v:'Rules'}, {t:'desc', v:`Each rule adds points to a receipt when it fires; the Hits column counts how many receipts in this view triggered it. ${topRule && hits[topRule.id] ? `The rule that fired most is "${topRule.name}" (${hits[topRule.id]} receipts). ` : ''}A rule firing is a reason to look, not proof of fraud: a family buying for a funeral or a reseller stocking up can look unusual too.`},
    {t:'table', cols:[['Rule', 40], ['What it looks for', 70], ['Points', 12, 1], ['Hits', 12, 1]], rows:RULES.map(r => [r.name, r.what, r.pts, hits[r.id] || 0])},
    {t:'h', v:`Receipts (${rows.length}${rows.length > 150 ? ', first 150 shown' : ''})`},
    {t:'desc', v:`This list shows ${listName}, newest first. Each row gives the receipt code, the seller, the amount, the Shield's decision (clear, held, blocked, approved or rejected), the score and the rules that fired. ${bySel.length ? `Most rows here come from ${bySel.slice(0, 2).map(([no, c]) => ((tByNo(no) || {}).name || no) + ' (' + c + ')').join(' and ')}.` : 'The list is empty for these filters.'} Officers decide held cases in the officer console.`},
    {t:'table', cols:[['When', 22], ['Code', 28], ['Seller', 26], ['Amount', 14, 1], ['Status', 16], ['Score', 10, 1], ['Why', 44]],
      rows:rows.slice(0, 150).map(r => [isoT(r.t), r.code, (tByNo(r.no) || {}).name || r.no, M(r.amt), shieldState(r), S.eval[r.code].score, S.eval[r.code].flags.map(f => RULE[f.id].name).join(', ') || '-'])},
    {t:'h', v:'Fake and misused codes'}, {t:'desc', v:`Codes that customers typed to check a receipt but that failed a check. ${Object.entries(fk).map(([kd, c]) => `${FAKEPILL[kd] || kd}: ${c}`).join('; ') || 'None so far'}. Forged code: the check letter at the end does not match, so the code was made up. Not in register: the code looks valid but was never issued. Altered amount: the paper shows a different amount from the register. Claimed twice: another phone already claimed the receipt.`},
    {t:'table', cols:[['When', 24], ['Code', 30], ['What happened', 26], ['Detail', 60]], rows:S.fakes.slice().sort((a, b) => b.t - a.t).map(f => [isoT(f.t), f.code || '–', FAKEPILL[f.kind] || f.kind, f.detail || ''])}
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
  const pc = q => wl.filter(i => i.pri === q).length; const map = await mapImg(leadMapSpec(wl)); const act = cg.filter(g => g.indep >= 3).length; const heldN = hg.reduce((a, g) => a + g.length, 0);
  await makePdf(`rasiti-officer-report-${stamp()}.pdf`, 'Officer console report', [
    {t:'meta', v:`Filters: ${officerLabel()}. Prepared for RSL General Clients.`},
    {t:'desc', v:'The officer console turns receipts, tax returns and customer ratings into a short, ranked list of things to do. Every item says why it is there. A nil return is never treated as non-compliance on its own, and nothing happens to a seller without an officer\'s decision.'},
    {t:'h', v:'Key figures'}, {t:'kpis', v:[[on, 'Sellers on Rasiti'], [reg, 'Registered for tax'], [via, 'Registered through Rasiti'], [M(r30.reduce((a, r) => a + r.amt, 0)), 'Receipted sales, 30 days'], [r30.length.toLocaleString('en-US'), 'Receipts, 30 days'], [heldN, 'Receipts held for review']]},
    {t:'desc', v:`Sellers on Rasiti (${on}): sellers who give Rasiti receipts. Registered for tax (${reg}): of those, how many have a TIN. Registered through Rasiti (${via}): sellers who registered from the phone menu, which shows Rasiti widening the tax net. Receipted sales (${M(r30.reduce((a, r) => a + r.amt, 0))}) and receipts (${r30.length}) in the last 30 days: the value and number of sales customers received receipts for; this is a minimum, as not every sale gets a receipt. Receipts held (${heldN}): draw entries waiting for an officer.`},
    {t:'h', v:'Leads on the map'}, {t:'img', v:map}, {t:'meta', v:mapNote(map)},
    {t:'desc', v:`Each dot is a worklist item with a known place, coloured by priority: red is high (${pc(3)}), orange is medium (${pc(2)}), grey is low or watching. Clusters of red show where a single field trip can cover several cases.`},
    {t:'h', v:`Worklist (${wl.length} items)`},
    {t:'desc', v:`Ranked list of suggested actions: ${pc(3)} high, ${pc(2)} medium, ${pc(1)} low, ${pc(0)} watching and ${pc(-1)} needing no action. Typical actions are inviting a seller to register for Simplified Business Tax, asking politely about a nil or low return when receipts show trade, sending a market tax helper to shops customers reported, and reviewing held receipts. The Why column lists the facts behind each item so the officer can check them.`},
    {t:'table', cols:[['Priority', 18], ['Seller or shop', 34], ['Area', 26], ['Recommended action', 44], ['Why', 60]], rows:wl.map(i => [PRITXT[i.pri], i.subj.name + (i.subj.no ? ' (' + i.subj.no + ')' : ''), itemArea(i), i.act, i.why.join('; ')])},
    {t:'h', v:`Review queue: held draw entries (${hg.length} cases)`},
    {t:'desc', v:`Receipts the Fraud Shield held, grouped into cases so an officer decides once per pattern. ${hg.length} cases cover ${heldN} receipts. Approving releases the draw entries; rejecting removes them from the draw. Either way the sale stays in the seller's sales book.`},
    {t:'table', cols:[['Seller', 30], ['Receipts', 12, 1], ['Amount', 16, 1], ['Why it was held', 80]], rows:hg.map(g => [(tByNo(g[0].no) || {}).name, g.length, M(g.reduce((a, r) => a + r.amt, 0)), S.eval[g[0].code].flags.map(f => f.why).join('; ')])},
    {t:'h', v:'Filing and payments'},
    {t:'desc', v:(() => { const regs = S.traders.filter(t => t.status === 'registered'); const xs = regs.map(t => taxOf(t.no)); const rets = xs.flatMap(x => x.rets); const due = rets.filter(r => perDueT(r.period) < clock);
      return `How registered sellers are keeping up. Over the last ${rets.length ? 4 : 0} quarters ${rets.length} returns were filed, ${pctS(rets.filter(r => r.t <= perDueT(r.period)).length, rets.length)} on time, and ${pctS(due.filter(r => xs.find(x => x.rets.includes(r)).onTimePay(r)).length, due.length)} of the tax that was due was paid on time. ${xs.filter(x => x.overdueAmt).length} ${xs.filter(x => x.overdueAmt).length === 1 ? 'seller has' : 'sellers have'} overdue tax (${M(xs.reduce((a, x) => a + x.overdueAmt, 0))} in total); the worklist suggests a payment plan, not a penalty. Streak is the number of quarters in a row filed and paid on time. Tax amounts use a demo rate of ${TAXRATE * 100}% of declared sales; RSL sets the real SBT rate.`; })()},
    {t:'table', cols:[['Seller', 34], ['Last return', 24], ['Filed on time', 18, 1], ['Overdue', 18, 1], ['Streak', 12, 1], ['Reminders', 16]], rows:S.traders.filter(t => t.status === 'registered').map(t => { const x = taxOf(t.no); return [t.name, x.last ? (x.last.declared ? M(x.last.declared) : 'Nil') : 'Not filed', x.rets.length ? x.rets.filter(x.onTimeFile).length + '/' + x.rets.length : '-', x.overdueAmt ? M(x.overdueAmt) : '-', x.streak, t.reminders === false ? 'Off' : 'On']; })},
    {t:'h', v:`Complaints from customers (${cg.length})`},
    {t:'desc', v:`Shops that customers reported for not giving a receipt, charging extra or not being on Rasiti. Customers: different people who reported the shop; action starts at 3, so ${act} of these ${cg.length} shops are ready for action and the rest are being watched. Discounted: reports from phones that reported many shops in a short time, which are ignored. Reporters are never shown to sellers.`},
    {t:'table', cols:[['Seller or shop', 40], ['Customers', 14, 1], ['Discounted', 14, 1], ['Problems', 50], ['Status', 16]], rows:cg.map(g => [cgName(g), g.indep, g.discounted, [...new Set(g.list.filter(x => x.type !== 'got').map(x => REPTYPE[x.type]))].join(', '), g.indep >= 3 ? 'Action' : 'Watching'])}
  ]); }, 'PDF report downloaded'); }
/* Monthly draw */
function drawEntries() { const per = drawPeriod(); const {by} = pool(per); return Object.entries(by).map(([ph, x]) => ({ph, e:x.e, n:x.rs.length, sellers:[...new Set(x.rs.map(r => (tByNo(r.no) || {}).name))].join(' | ')})).sort((a, b) => b.e - a.e); }
const winPh = w => w.ph || ((S.receipts.find(r => r.code === w.code) || {}).ph) || null; // older draws only stored a masked number: find it from the winning receipt
const wph = w => winPh(w) ? mask(winPh(w)) : w.phone; // winners keep the raw number so 'Show contacts' works; shown masked unless an admin shows contacts
const wphCsv = w => winPh(w) ? maskCsv(winPh(w)) : String(w.phone).replace(/^\+/, '');
function lastDrawData() { if (S.lastDraw) return {when:'just now', seed:S.lastDraw.seed, live:S.lastDraw.live, winners:S.lastDraw.winners};
  const d = S.draws[0]; return d ? {when:fT(Date.parse(d.run_at)), seed:d.seed, live:d.live_entries, winners:d.winners || []} : null; }
function drawCSV(kind) {
  if (kind === 'entries') downloadCSV(`rasiti-draw-entries-${stamp()}.csv`, [[SHOWPH ? 'Customer phone' : 'Customer (masked)', x => maskCsv(x.ph)], ['Entries', x => x.e], ['Receipts', x => x.n], ['Sellers', x => x.sellers]], drawEntries());
  if (kind === 'winners') { const d = lastDrawData(); if (!d) { toast('Run the draw first'); return; }
    downloadCSV(`rasiti-draw-winners-${stamp()}.csv`, [['Place', w => w.place], ['Prize', w => w.prize], [SHOWPH ? 'Customer phone' : 'Customer (masked)', wphCsv], ['Entries', w => w.entries], ['Winning receipt', w => w.code], ['Seller', w => w.seller], ['Seller bonus', w => w.bonus || ''], ['Payout check', w => w.verify || ''], ['Draw seed', () => d.seed]], d.winners); }
}
function drawPDF() { const d = lastDrawData(); const per = drawPeriod(); const {o, by} = pool(per); const ent = drawEntries(); const tot = ent.reduce((a, x) => a + x.e, 0); const top10 = ent.slice(0, 10).reduce((a, x) => a + x.e, 0);
  return withBusy(async () => { await makePdf(`rasiti-draw-report-${stamp()}.pdf`, 'Monthly draw report', [
    {t:'meta', v:`${per.title}. ${phNote()} Each phone can win only once per draw.`},
    {t:'desc', v:'The monthly draw is the reward that makes customers ask for receipts. Every receipt with a phone number earns entries; the Fraud Shield removes suspicious entries before the draw; winners are picked at random in proportion to their entries, with a published seed so anyone can repeat the draw and get the same result.'},
    {t:'h', v:'Key figures'}, {t:'kpis', v:[[o.active.toLocaleString('en-US'), 'Live entries'], [Object.keys(by).length, 'Customers in the draw'], [o.reg.toLocaleString('en-US'), 'From registered sellers'], [o.held, 'Held for review'], [o.excluded, 'Excluded by Fraud Shield'], ['M10,800', 'Prize pool']]},
    {t:'desc', v:`Live entries (${o.active.toLocaleString('en-US')}): entries that take part in this draw. Customers in the draw (${Object.keys(by).length}): different phone numbers holding those entries. From registered sellers (${o.reg.toLocaleString('en-US')}, ${pctS(o.reg, o.active)}): entries earned at sellers registered for tax, which count double, a direct reward for registering. Held for review (${o.held}) and excluded (${o.excluded}): entries the Fraud Shield paused or removed; they do not take part. Prize pool (M10,800): M8,000 in cash prizes, M800 in seller bonuses and M2,000 in airtime each month.`},
    {t:'h', v:'Rules'}, {t:'p', v:'1 entry per M10 paid by mobile money or card, at least 1 and at most 5 per receipt; 1 entry for each cash sale the seller confirmed. Entries double at sellers registered for tax. Prizes: 1st M5,000 (seller bonus M500), 2nd M2,000 (M200), 3rd M1,000 (M100), plus 20 x M100 airtime.'},
    ...(d ? [{t:'h', v:`Winners (draw run ${d.when})`}, {t:'desc', v:`${d.winners.length} winners were drawn from ${Number(d.live).toLocaleString('en-US')} live entries using seed ${d.seed}. Places 1st to 3rd win cash, and the seller who issued the winning receipt receives a bonus, so sellers also want their customers to ask for receipts. Places 4 to ${d.winners.length} win M100 airtime each. The winning receipt code lets RSL confirm the purchase with the seller before paying out.`},
      {t:'table', cols:[['Place', 12], ['Prize', 22], ['Customer', 24], ['Entries', 12, 1], ['Winning receipt', 30], ['Seller', 30]], rows:d.winners.map(w => [w.place, w.prize, wph(w), w.entries, w.code, w.seller])}]
      : [{t:'h', v:'Winners'}, {t:'desc', v:'The draw has not been run yet for this period. Click "Run the monthly draw" on the Monthly draw page, then download this report again to include the winners.'}]),
    {t:'h', v:'Top customers by entries'},
    {t:'desc', v:`The customers holding the most entries, with masked numbers. The top 10 hold ${pctS(top10, tot)} of all live entries, so ${top10 / Math.max(1, tot) > .5 ? 'a few heavy buyers dominate and the Fraud Shield ring and velocity rules matter' : 'chances are spread widely across many customers'}. Entries come from buying at Rasiti sellers; the more receipts a customer asks for, the better their chance.`},
    {t:'table', cols:[['Customer', 30], ['Entries', 14, 1], ['Receipts', 14, 1], ['Sellers', 70]], rows:ent.slice(0, 40).map(x => [mask(x.ph), x.e, x.n, x.sellers.replace(/ \| /g, ', ')])}
  ]); }, 'PDF report downloaded'); }
/* Filing and payments */
function remindTargets() { const lp = lastPer(); return S.traders.filter(t => t.status === 'registered' && t.reminders !== false).filter(t => { const x = taxOf(t.no); return !x.last || x.owed > 0; }); }
async function sendReminders() { const ts = remindTargets(); if (!ts.length) return; const lp = lastPer();
  try { if (saved()) await api('admin', {op:'reminders', count:ts.length, period:lp, due:perDue(lp)}); } catch (e) { toast(e.message); return; }
  log('info', `Reminder SMS sent to ${ts.length} sellers: ${perName(lp)} return and payment due ${perDue(lp)} (simulated)`);
  toast(`Reminder SMS sent to ${ts.length} sellers (simulated). Example: "Lumela! Your ${perName(lp)} return is due ${perDue(lp)}. Dial *999#, choose 2 (seller), sign in, then 3 > 1 to file from your sales book."`); }
function taxCSV() { downloadCSV(`rasiti-filing-payments-${stamp()}.csv`, [['Seller', r => (tByNo(r.no) || {}).name], ['Seller code', r => r.no], ['TIN', r => (tByNo(r.no) || {}).tin || ''], ['Period', r => r.period], ['Sales book (M)', r => r.sales], ['Declared (M)', r => r.declared], ['Nil reason', r => r.nil || ''], ['Tax due (M, demo rate)', r => r.tax], ['Paid (M)', r => taxOf(r.no).paid(r.period)], ['Filed', r => isoT(r.t)], ['Filed on time', r => r.t <= perDueT(r.period) ? 'Yes' : 'No'], ['Due date', r => perDue(r.period)], ['Channel', r => r.ch]],
  S.returns.filter(r => OF.area === 'all' || (tByNo(r.no) || {}).market === OF.area).slice().sort((a, b) => a.no === b.no ? (a.period < b.period ? -1 : 1) : a.no < b.no ? -1 : 1)); }
/* Users and activity */
let ACT = [];
function cashCSV() { const ST = {pending:'Waiting for the seller', confirmed:'Confirmed by the seller', rejected:'Rejected by the seller', expired:'Ignored (expired after 3 days)'};
  downloadCSV(`rasiti-cash-claims-${stamp()}.csv`, [['Claimed', c => isoT(c.t)], ['Seller', c => (tByNo(c.no) || {}).name], ['Seller code', c => c.no], ['Market', c => (tByNo(c.no) || {}).market], ['Amount (M)', c => c.amt],
    ['Customer', c => maskCsv(c.ph)], ['Status', c => ST[claimState(c)]], ['Answered', c => c.dt ? isoT(c.dt) : ''], ['Receipt', c => c.code || ''], ['Counts for tax', c => c.state === 'confirmed' ? 'Yes' : 'No']],
    S.claims.slice().sort((a, b) => b.t - a.t)); }
function activityCSV() { downloadCSV(`rasiti-activity-log-${stamp()}.csv`, [['When', a => isoT(Date.parse(a.at))], ['Who', a => a.user_email || 'system'], ['Action', a => a.action.replace(/_/g, ' ')], ['Detail', a => a.detail ? JSON.stringify(a.detail) : '']], ACT.filter(a => !$('#actWho') || $('#actWho').value === 'all' || (a.user_email || 'system') === $('#actWho').value)); }

/* ================= Officer console ================= */
const canWork = () => !API.online || (API.user && ['owner', 'admin', 'officer'].includes(API.user.role));
/* Cash claims per seller: what buyers said they paid in cash, and what the seller did with it. A refusal is a reason to look, never a bill.
   "Established" buyers are phones that also paid someone by mobile money or card, so a phone made up for the purpose does not count. */
function cashStats(no, days) { const from = clock - (days || 30) * DAY; const cs = S.claims.filter(c => c.no === no && c.t > from);
  const est = new Set(S.receipts.filter(r => r.ph && r.ch !== 'cash').map(r => r.ph));
  const refused = cs.filter(c => ['rejected', 'expired'].includes(claimState(c)));
  return {claims:cs.length, confirmed:cs.filter(c => c.state === 'confirmed').length, pending:cs.filter(c => claimState(c) === 'pending').length, refused:refused.length,
    refusedBuyers:new Set(refused.filter(c => est.has(c.ph)).map(c => c.ph)).size, value:cs.filter(c => c.state === 'confirmed').reduce((a, c) => a + c.amt, 0)}; }
function worklist() {
  const items = []; const groups = reportGroups(); const spam = spamPhones(); const gT = no => groups.find(g => g.key === 'T' + no);
  const mon = perName(lastPer());
  for (const tr of S.traders) {
    const rs = S.receipts.filter(r => r.no === tr.no); const r30 = rs.filter(r => r.t > clock - 30 * DAY); const s30 = r30.reduce((a, r) => a + r.amt, 0);
    const g = gT(tr.no); const extra = g ? g.list.filter(x => x.type === 'extra' && !spam.has(x.ph)).length : 0; const ll = traderLL(tr);
    const cs = cashStats(tr.no, 30);
    if (cs.refusedBuyers >= 3 && cs.refused >= cs.claims / 2) items.push({id:'cash' + tr.no, pri:2, subj:tr, ll, act:'Visit: customers say they paid cash, the seller did not confirm',
      why:[`${cs.refused} of ${cs.claims} cash claims in 30 days were rejected or ignored, from ${cs.refusedBuyers} different customers who also pay by mobile money or card`, 'Never a bill on its own: a claim is what a buyer says, not proof', 'Explain cash confirmations, then look at the sales book and the return together'], btn:'Mark visited', kind:'done'});
    if (tr.status === 'enrolled') {
      if (tr.helper) items.push({id:'help' + tr.no, pri:3, subj:tr, ll, act:'Call back: seller asked for help registering', why:['Requested from the phone menu', `${r30.length} receipts worth ${M(s30)} in 30 days`], btn:'Mark called', kind:'done'});
      if (S.invited.has(tr.no)) items.push({id:'inv' + tr.no, pri:0, subj:tr, ll, act:'Invitation sent, waiting for seller', why:['Seller can register from the phone menu, option 3']});
      else if (s30 >= 1500) items.push({id:'inv' + tr.no, pri:s30 > 5000 ? 3 : 2, subj:tr, ll, act:'Invite to register for Simplified Business Tax', why:[`On Rasiti for ${tr.joined} days, ${r30.length} receipts worth ${M(s30)} in 30 days`, `Yearly estimate ${M(s30 * 12)}, well under the M2,000,000 SBT ceiling`, "Selling point: registering doubles the seller's customers' draw entries"], btn:'Send invitation', kind:'invite', target:tr.no});
    } else {
      const rec = Math.round(perSales(tr.no, lastPer()));
      const tx = taxOf(tr.no);
      if (tx.overdueAmt > 0) items.push({id:'arr' + tr.no + tx.overdue.map(r => r.period).join(''), pri:2, subj:tr, ll, act:`Offer a payment plan: ${M(tx.overdueAmt)} overdue`, why:[`Unpaid tax for ${tx.overdue.map(r => perName(r.period)).join(', ')}`, ...(tx.pays.length ? [`Has paid ${M(tx.pays.reduce((a, x) => a + x.amt, 0))} through Rasiti before, so the business is trading`] : []), 'A call first: small weekly payments by mobile money are allowed'], btn:'Mark contacted', kind:'done'});
      if (tx.missing) items.push({id:'mis' + tr.no + tx.missing, pri:2, subj:tr, ll, act:`Remind to file the ${perName(tx.missing)} return`, why:[`Due ${perDue(tx.missing)}; not filed yet`, `Sales book shows ${M(perSales(tr.no, tx.missing))} for ${perName(tx.missing)}, ready to prefill`], btn:'Mark reminded', kind:'done'});
      if (tx.streak >= 3 && !(tr.declared === 0 && rec > 1000)) items.push({id:'rel' + tr.no, pri:-1, subj:tr, ll, act:`Reliable taxpayer: ${tx.streak} quarters filed and paid on time`, why:['No action. The "Reliable taxpayer" badge shows on their phone and on Rasiti']});
      if (tr.declared == null) { if (tr.regAt) items.push({id:'new' + tr.no, pri:-1, subj:tr, ll, act:'Newly registered through Rasiti. No action', why:['Registered from the phone menu', `First return due ${dueDate()}, prefilled from the sales book`]}); continue; }
      if (tr.declared === 0 && rec > 1000) items.push({id:'dec' + tr.no, pri:3, subj:tr, ll, act:`Ask about the ${mon} nil return`, why:[`Declared nil for ${mon}`, `Rasiti shows receipts worth ${M(rec)} in the same quarter. Receipts are a minimum, not total sales`, ...(extra ? [`${extra} customers separately said they were charged extra for a receipt`] : []), 'A phone call first: a nil return can be a mistake, not evasion'], btn:'Mark contacted', kind:'done'});
      else if (tr.declared === 0 && rec < 300) items.push({id:'nil' + tr.no, pri:-1, subj:tr, ll, act:'No action: activity matches the nil return', why:[`Declared nil for ${mon}`, `Only ${M(rec)} in receipts that quarter`, 'Looks like genuinely paused or seasonal trade, not hidden sales']});
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
  const c30 = S.claims.filter(c => c.t > clock - 30 * DAY && claimState(c) !== 'pending'); const cOk = c30.filter(c => c.state === 'confirmed').length;
  $('#offKpis').innerHTML = [[on, 'Sellers on Rasiti'], [via, 'Registered through Rasiti'], [M(s30), 'Receipted sales, 30 days'], [c30.length ? Math.round(cOk / c30.length * 100) + '%' : '–', 'Cash claims confirmed, 30 days'], [unlisted, 'Unlisted shops reported'], [held, 'Receipts held for review']].map(kpi).join('');
  $('#reportsTbl').innerHTML = '<tr><th>Shop</th><th class="num">Customers</th><th class="num">Discounted</th><th>Status</th></tr>' + complaintGroups().slice(0, 12).map(g => { const nm = g.target.no ? (tByNo(g.target.no) || {name:g.target.no}).name : g.target.label;
    return `<tr><td>${esc(nm)}<div class="note">${[...new Set(g.list.filter(x => x.type !== 'got').map(x => REPTYPE[x.type]))].join(', ')}</div></td><td class="num">${g.indep}</td><td class="num">${g.discounted}</td><td>${g.indep >= 3 ? '<span class="pill p-bad">Act</span>' : g.indep > 0 ? '<span class="pill p-mute">Watching</span>' : '<span class="pill p-mute">Discounted</span>'}</td></tr>`; }).join('');
  fillSel('#ofArea', [['all', 'All areas'], ...[...new Set([...S.traders.map(t => t.market), ...S.reports.map(r => r.target.area).filter(Boolean)])].sort().map(a => [a, a])], OF.area);
  $('#ofNote').textContent = 'Showing: ' + officerLabel() + '. The worklist, map, review queue and complaints follow these filters.';
  const wl = officerItems(); const dis = canWork() ? '' : ' disabled title="Viewers cannot take actions"';
  $('#workTbl').innerHTML = '<tr><th>Priority</th><th>Seller</th><th>Recommended action and why</th><th></th></tr>' + wl.map(i => `<tr><td>${PRI[i.pri]}</td><td><b>${esc(i.subj.name)}</b><div class="note">${esc([i.subj.trade, i.subj.market].filter(Boolean).join(' · '))}${i.subj.no ? ' · code ' + i.subj.no : ''}</div></td><td>${esc(i.act)}<ul class="why">${i.why.map(w => `<li>${esc(w)}</li>`).join('')}</ul></td><td style="white-space:nowrap">${i.btn ? `<button class="btn small" data-w="${esc(i.id)}"${dis}>${i.btn}</button> ` : ''}${i.subj.no ? `<button class="btn small bh-ask" data-ask="${i.subj.no}" title="Ask Bohlale AI to explain this case">Ask Bohlale</button>` : ''}</td></tr>`).join('');
  $('#reviewTbl').innerHTML = '<tr><th>Case</th><th>Seller</th><th class="num">Amount</th><th>Why it was held</th><th>Decision</th></tr>' + heldGroups().map(rs => { const r = rs[0]; const e = S.eval[r.code]; const tr = tByNo(r.no) || {name:r.no}; const phs = new Set(rs.map(x => x.ph)); const codes = rs.map(x => x.code).join(',');
    return `<tr><td><b>${rs.length} receipt${rs.length > 1 ? 's' : ''}</b><div class="note">${phs.size} phone${phs.size > 1 ? 's' : ''} · latest ${fT(r.t)}</div><details><summary>Codes</summary><div class="mono">${rs.map(x => x.code + ' ' + mask(x.ph)).join('<br>')}</div></details></td><td>${esc(tr.name)}</td><td class="num">${M(rs.reduce((a, x) => a + x.amt, 0))}</td><td><ul class="why" style="margin:0">${e.flags.map(f => `<li>${esc(f.why)}</li>`).join('')}</ul>${r.note ? `<div class="note">Hint: ${esc(r.note)}</div>` : ''}</td><td style="white-space:nowrap"><button class="btn small" data-rv="approved" data-c="${codes}"${dis}>Approve entries</button> <button class="btn small" data-rv="rejected" data-c="${codes}"${dis}>Reject</button></td></tr>`; }).join('') + (heldGroups().length ? '<tr><td colspan="5" class="note">Either way, the sale stays in the seller\'s sales book. Only draw entries are decided here.</td></tr>' : '<tr><td colspan="5" class="note">Queue empty.</td></tr>');
  const regs = S.traders.filter(t => t.status === 'registered' && (OF.area === 'all' || t.market === OF.area));
  $('#taxTbl').innerHTML = '<tr><th>Seller</th><th>' + esc(perName(lastPer())) + ' return</th><th class="num">Filed on time</th><th class="num">Paid on time</th><th class="num">Overdue</th><th class="num">Streak</th><th>Reminders</th></tr>' + regs.map(t => { const x = taxOf(t.no); const n = x.rets.length;
    return `<tr><td>${esc(t.name)}<div class="note">${esc(t.market)} · TIN ${esc(t.tin || '-')}</div></td><td>${x.last ? (x.last.declared ? M(x.last.declared) : 'Nil') + `<div class="note">${x.last.tax ? 'tax ' + M(x.last.tax) + (x.owedOf(x.last) > .5 ? ', unpaid' : ', paid') : 'no tax'}</div>` : `<span class="pill p-warn">Not filed</span><div class="note">due ${perDue(lastPer())}</div>`}</td><td class="num">${n ? x.rets.filter(x.onTimeFile).length + '/' + n : '–'}</td><td class="num">${n ? x.rets.filter(r => perDueT(r.period) < clock).filter(x.onTimePay).length + '/' + x.rets.filter(r => perDueT(r.period) < clock).length : '–'}</td><td class="num">${x.overdueAmt ? `<b style="color:var(--bad)">${M(x.overdueAmt)}</b>` : '–'}</td><td class="num">${x.streak}</td><td>${t.reminders === false ? 'Off' : 'On'}</td></tr>`; }).join('');
  const dueN = remindTargets().length; $('#remBtn').textContent = `Send reminders (${dueN})`; $('#remBtn').disabled = !canWork() || !dueN;
  if (currentView() === 'officer') renderLeadMap(wl);
}

/* ================= Draw ================= */
function pool(per) { const from = per ? per.from : monthStart(), to = per ? per.to : Infinity; const wk = S.receipts.filter(r => r.t >= from && r.t < to).sort((a, b) => a.t - b.t); const o = {active:0, reg:0, held:0, excluded:0, waiting:0}; const by = {};
  for (const r of wk) { const s = drawStatus(r); if (s === 'none') { if (r.ch === 'card') o.waiting++; continue; } const e = entriesFor(r);
    o[s] += e; if (s === 'active') { const tr = tByNo(r.no); if (tr && tr.status === 'registered') o.reg += e; (by[r.ph] = by[r.ph] || {e:0, rs:[]}).e += e; by[r.ph].rs.push(r); } } return {o, by}; }
/* Early in a month the new month has few entries, so the draw shown is the one for the month that just ended. */
function drawPeriod() { const ms = monthStart(); const cur = {from:ms, to:Infinity, title:`This month's draw (${fD(ms)} to ${fD(drawDay())})`, name:'this month'};
  if (new Date(clock).getDate() > 7 || Object.keys(pool(cur).by).length >= 28) return cur;
  const d = new Date(ms); const pm = new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime(); const nm = MONTHS_FULL[new Date(pm).getMonth()];
  return {from:pm, to:ms, title:`${nm} draw (${fD(pm)} to ${fD(ms - DAY)}), held in the first days of ${MONTHS_FULL[d.getMonth()]}`, name:nm}; }
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
/* Prize calendar (amounts to be agreed with RSL). Every entry counts in its month, and again in the quarter, half-year and year draws.
   Every receipt is a payment a network or bank saw, or a cash sale the seller confirmed, so every receipt plays for every prize.
   The seller motorbike goes to a registered seller who filed and paid the quarter on time. */
const PRIZE_LADDER = [
  {draw:'Monthly', when:'Last day of each month', prizes:'M5,000, M2,000 and M1,000 cash · 5 smartphones · 20 × M100 airtime', who:'Every receipt with your phone number (cash the seller confirmed, M-Pesa, EcoCash or card)', months:1},
  {draw:'Quarterly', when:'End of March, June, September, December', prizes:'3 motorbikes: 2 for customers, 1 for a registered seller', who:'Every receipt in the quarter; sellers who filed and paid the quarter on time', months:3},
  {draw:'Every 6 months', when:'End of June and December', prizes:'M100,000 cash', who:'Every receipt in the 6 months', months:6},
  {draw:'Every year', when:'December', prizes:'A car', who:'Every receipt in the year', months:12}];
function ladderEntries(x) { if (x.months === 1) { const {o, by} = pool({from:monthStart(), to:Infinity}); return {e:o.active, people:Object.keys(by).length}; } const d = new Date(clock); const m0 = Math.floor(d.getMonth() / x.months) * x.months; const from = new Date(d.getFullYear(), m0, 1).getTime();
  let e = 0; const ph = new Set(); for (const r of S.receipts) { if (r.t < from || drawStatus(r) !== 'active') continue; e += entriesFor(r); ph.add(r.ph); } return {e, people:ph.size}; }
function renderLadder() { const el = $('#ladderTbl'); if (!el) return;
  const okSellers = S.traders.filter(t => t.status === 'registered' && (() => { const x = taxOf(t.no); return x && !x.overdueAmt; })()).length;
  el.innerHTML = '<tr><th>Draw</th><th>When</th><th>Prizes (to agree with RSL)</th><th>Who can win</th><th class="num">Entries now</th></tr>' + PRIZE_LADDER.map(x => { const n = ladderEntries(x);
    return `<tr><td><b>${x.draw}</b></td><td>${x.when}</td><td>${x.prizes}</td><td>${x.who}</td><td class="num">${n.e.toLocaleString('en-US')}<div class="note">${n.people} people${x.months === 3 ? ` · ${okSellers} sellers` : ''}</div></td></tr>`; }).join(''); }
function renderDraw() { renderLadder(); const per = drawPeriod(); const {o, by} = pool(per);
  $('#drawTitle').textContent = per.title;
  $('#drawKpis').innerHTML = [[o.active.toLocaleString('en-US'), 'Live entries'], [Object.keys(by).length, 'Customers in the draw'], [o.reg.toLocaleString('en-US'), 'From registered sellers (double)'], [o.held, 'Held for review'], [o.excluded, 'Excluded (Fraud Shield, reversed or paid back)'], [o.waiting, 'Card payments not claimed yet'], [S.claims.filter(c => claimState(c) === 'pending').length, 'Cash claims waiting for the seller']].map(kpi).join('');
  $('#runDraw').disabled = !canWork();
  const pd = $('#pastDrawsPanel'); pd.hidden = !S.draws.length;
  $('#pastDraws').innerHTML = '<tr><th>When</th><th class="num">Live entries</th><th>Seed</th><th>Winners</th></tr>' + S.draws.map(d => `<tr><td>${fT(Date.parse(d.run_at))}</td><td class="num">${d.live_entries}</td><td class="mono">${d.seed}</td><td>${(d.winners || []).slice(0, 3).map(w => esc(wph(w)) + ' (' + esc(w.prize) + ')').join('<br>')}${(d.winners || []).length > 3 ? `<div class="note">+ ${d.winners.length - 3} airtime winners (M100 each)</div>` : ''}</td></tr>`).join(''); }
const saved = () => API.online && !API.dbEmpty;
const sleep = ms => new Promise(r => setTimeout(r, ms));
function showLoader(text) { const ld = $('#loader'); ld.querySelector('.ld-txt span').textContent = text; ld.hidden = false; ld.classList.remove('out'); }
function hideLoader() { const ld = $('#loader'); ld.classList.add('out'); setTimeout(() => { ld.hidden = true; ld.querySelector('.ld-txt span').textContent = 'Turning receipts into rewards…'; }, 450); }
function pickWinners(by, seedv) { const was = SHOWPH; SHOWPH = false; try { return pickWinners2(by, seedv); } finally { SHOWPH = was; } }
function pickWinners2(by, seedv) { const r = mulberry32(seedv); const phones = Object.keys(by).sort(); const pick = [];
  for (let i = 0; i < 28 && phones.length; i++) { const tot = phones.reduce((a, p) => a + by[p].e, 0); let x = r() * tot; let ch = phones[phones.length - 1]; for (const p of phones) { x -= by[p].e; if (x <= 0) { ch = p; break; } } pick.push(ch); phones.splice(phones.indexOf(ch), 1); }
  const prizes = [['1st', 'M5,000 cash', 'M500'], ['2nd', 'M2,000 cash', 'M200'], ['3rd', 'M1,000 cash', 'M100']];
  return pick.map((p, i) => { const rr = by[p].rs[Math.floor(r() * by[p].rs.length)]; const tr = tByNo(rr.no);
    const base = {phone:mask(p), ph:p, entries:by[p].e, code:rr.code, seller:tr.name, market:tr.market, verify:verifyLabel(rr)};
    return i < 3 ? {...base, place:prizes[i][0], prize:prizes[i][1], bonus:prizes[i][2]} : i < 8 ? {...base, place:'#' + (i + 1), prize:'Smartphone'} : {...base, place:'#' + (i + 1), prize:'M100 airtime'}; }); }
function showWinners(d) {
  if (!d) { $('#winners').innerHTML = ''; $('#airtime').innerHTML = ''; $('#airtimePanel').hidden = true; $('#phonePanel').hidden = true; $('#drawAudit').textContent = ''; return; }
  const top = d.winners.slice(0, 3), phn = d.winners.filter(w => w.prize === 'Smartphone'), air = d.winners.filter(w => w.prize === 'M100 airtime');
  $('#phonePanel').hidden = !phn.length; $('#phoneTitle').textContent = `${phn.length} smartphone winners`;
  $('#phonesWin').innerHTML = phn.map(w => `<div class="air"><span class="air-n">${w.place.slice(1)}</span><div><b>${esc(wph(w))}</b><div class="note">${w.entries} entries · ${esc(w.seller)}${w.verify ? ' · ' + esc(w.verify) : ''}</div></div></div>`).join('');
  $('#winners').innerHTML = top.map(w => `<div class="win"><div class="place">${w.place} prize</div><div class="prize">${w.prize}</div><div>${esc(wph(w))} · ${w.entries} entries</div><div class="note">Winning receipt ${w.code}${w.verify ? ' · ' + esc(w.verify) : ''}<br>Seller bonus ${w.bonus} to ${esc(w.seller)}, ${esc(w.market)}</div></div>`).join('');
  $('#airtimePanel').hidden = !air.length;
  $('#airtimeTitle').textContent = `${air.length} airtime winners · M100 each (M${(air.length * 100).toLocaleString('en-US')} in total)`;
  $('#airtime').innerHTML = air.map((w, i) => `<div class="air"><span class="air-n">${w.place.slice(1)}</span><div><b>${esc(wph(w))}</b><div class="note">${w.entries} entries · ${esc(w.seller)}</div></div></div>`).join('');
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
 {tag:'Ordinary', cls:'', t:'Customer pays cash', d:"Lerato pays Ntate Thabo M40 in cash and claims it on her phone. Thabo confirms it on his: only then does it count.", async run() {
   setC(PERSONAS[0].ph); caseSeller('3307'); const tr = tByNo('3307');
   const text = await cashClaim('3307', 40); PH.c.st = 'end'; show('c', text);
   if (!/^Sent to/.test(text)) { narrate(`<b>Cash claim not sent.</b> ${esc(text.split('\n\n')[0].replace(/\n/g, ' '))}`); return; }
   if (PH.t.auth) { PH.t.st = 't_cash'; show('t', cashList(tr)); }
   narrate(`<b>Ordinary cash sale.</b> Lerato dialled *999#, chose <b>1. I paid cash</b>, typed Thabo's seller code and M40. That makes a <b>pending claim</b>: it is not in Thabo's sales book, not taxed and gives no entry yet. Thabo got an SMS. On <b>his</b> phone${PH.t.auth ? '' : ' (sign in with PIN 2580, then 1)'}, choose the claim and <b>1. Yes, I sold this</b>, or <b>9</b> to confirm all at once. Lerato then gets receipt and entry, and the M40 lands in his sales book, ready for filing.`); }},
 {tag:'Ordinary', cls:'', t:'Customer pays with M-Pesa', d:"Lerato pays M30 to Ntate Thabo's M-Pesa merchant code as usual. The receipt issues itself.", async run() {
   setC(PERSONAS[0].ph); caseSeller('3307'); const tr = tByNo('3307'); const r = await payMerchant('mpesa', tr.mp || '584112', 30); if (!r) return;
   narrate(`<b>Ordinary case.</b> Lerato paid Thabo's own M-Pesa merchant code (${esc(tr.mp || '584112')}) as she always does. M-Pesa told Rasiti, Rasiti found the seller who linked that code, and Lerato got receipt ${esc(r.code)} with ${entriesFor(r)} entries (double, because Thabo is registered). Nobody typed anything.`); }},
 {tag:'Ordinary', cls:'', t:'Customer pays by card', d:"Tumelo pays M250 by card at Mme Lineo's salon, then claims the receipt with the last 4 digits of his card.", async run() {
   setC(PERSONAS[1].ph); caseSeller('6018'); const tr = tByNo('6018'); if (!tr || !tr.pos) { narrate('Mme Lineo has no card machine linked in this data. Reset and load the demo data first.'); return; }
   const r = await payCard(tr.pos, 250, PERSONAS[1].card); if (!r) return;
   narrate(`<b>Card payment.</b> The bank told Rasiti the terminal (${esc(tr.pos)}), the amount and the last 4 digits of the card, but not Tumelo's phone. On his phone choose <b>1. Claim it now</b>: Rasiti matches seller, amount and card ending (••${PERSONAS[1].card}). He can also do it later on *999# > 2 within 3 days.`); }},
 {tag:'Exception', cls:'hr', t:'Fake cash claims from home', d:'Someone at home claims cash sales at 3 shops to make them pay tax. Nothing counts unless a seller says yes.', async run() {
   const prank = '26657444' + String(100 + Math.floor(Math.random() * 899));
   for (const [no, a] of [['3307', 300], ['4821', 250], ['3902', 400]]) await cashClaim(no, a, prank);
   const tr = tByNo('3307'); caseSeller('3307'); const c = pendingOf('3307').find(x => x.ph === prank);
   if (c) { PH.t.st = 't_cash'; show('t', cashList(tr)); }
   narrate(`<b>Exception: the loophole is closed.</b> A phone that never bought anything claimed M300, M250 and M400 "cash" at three shops. Each claim only <b>waits</b> for the seller. On Thabo's phone, open the M300 claim and choose <b>2. No, reject</b>. It never reaches his sales book or his tax. If he simply ignores it, it expires after ${CASH.expireDays} days. A phone can send at most ${CASH.perPhoneDay} claims a day, and refused claims only help RSL see where to look, never create a bill.`); renderAll(); }},
 {tag:'Human review', cls:'hr', t:'7 receipts from one phone', d:"One number collects 7 receipts at Mme Nthabiseng's stall in 30 minutes.", run() {
   const p = '2666' + String(Math.floor(Math.random() * 1e7)).padStart(7, '0'); for (let i = 0; i < 7; i++) issue('3902', 35 + Math.round(Math.random() * 20), 'momo', p, true);
   log('warn', 'Fraud Shield held 7 receipts from one phone at Mme Nthabiseng K.'); S.filter = 'held';
   narrate('<b>Human review.</b> The Shield cannot know if this is a reseller stocking up or someone farming entries, so it holds the entries for an officer. Open the <a href="#officer">officer console</a> to decide, or see the reasons in the <a href="#shield">Fraud Shield</a>.'); renderAll(); }},
 {tag:'New taxpayer', cls:'nx', t:'Mme Palesa registers', d:'An enrolled fruit seller registers from her phone. Her customers start earning double entries.', run() {
   const tr = tByNo('4821'); if (!tr || tr.status === 'registered') { narrate('Mme Palesa is already registered. Pick another enrolled seller, or ask an owner to reset the demo data.'); return; }
   caseSeller('4821'); tStep('3');
   narrate('<b>Widening the tax net.</b> Palesa has used the free sales book for 6 weeks. On her phone, choose Register now, then enter any ID number such as <b>0123456789</b>.'); }},
 {tag:'New lead', cls:'nx', t:'Third report on an unlisted stall', d:'Lerato reports the chisa nyama stall at Sefika rank. It crosses the 3-reporter line.', run() {
   setC(PERSONAS[0].ph); PH.c.st = 'c_rtype'; PH.c.d = {type:'unlisted'}; finishRating({place:'sefika-p3', label:'Chisa nyama stall, Sefika rank platform 3', area:'Sefika taxi rank', kind:'Informal'}, null);
   narrate('<b>New lead.</b> Three different customers have now named the same stall. It moves from Watching to an assisted enrolment visit in the <a href="#officer">officer console</a>, and appears on the map. The reporter stays anonymous.'); }},
 {tag:'Sustained payment', cls:'', t:'Mme Nthabiseng catches up', d:'A seller with overdue tax files from her sales book and pays part by mobile money.', run() {
   const tr = tByNo('3902'); if (!tr || tr.status !== 'registered') { narrate('Mme Nthabiseng is not a registered seller in this data. Reset and load the demo data first.'); return; }
   caseSeller('3902'); tStep('3');
   const x = taxOf('3902');
   narrate(`<b>Sustained payment.</b> Nthabiseng owes ${M(x.owed)}${x.overdueAmt ? `, of which ${M(x.overdueAmt)} is overdue` : ''}. On her phone, choose <b>1</b> to file the ${perName(lastPer())} return straight from her sales book (cash she confirmed, mobile money and card), then <b>2</b> to pay part now. The officer console suggests a payment plan, not a penalty.`); }}
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
    ACT = activity;
    $('#dataPanel').hidden = me.role !== 'owner';
  } catch (e) { $('#usersTbl').innerHTML = `<tr><td class="err">${esc(e.message)}</td></tr>`; }
}
const genPass = () => { const a = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'; const b = new Uint32Array(14); crypto.getRandomValues(b); return Array.from(b, x => a[x % a.length]).join('') + '!'; };

/* ================= Bohlale AI (officer assistant) ================= */
const BH = { history: [], status: null, busy: false, lastDataQ: '', checked: false };
const BH_TASKS = [
  {id:'briefing', label:"Today's briefing", ask:'Give me a short briefing for today: what needs my attention first, and why.'},
  {id:'explain', label:'Explain a case', pick:'seller', ask:s => `Explain the case of seller ${s.name} (code ${s.no}) in plain language. What do the receipts, returns and customer ratings show, and what is a fair first step?`},
  {id:'invite', label:'Draft invitation SMS', pick:'enrolled', ask:s => `Draft a short, friendly SMS (under 300 characters) inviting ${s.name} (code ${s.no}) to register for Simplified Business Tax. Mention the benefits shown in the data. Give an English version and a Sesotho version.`},
  {id:'call', label:'Call script for a nil return', pick:'nil', ask:s => `Write a polite phone-call script for an RSL officer calling ${s.name} (code ${s.no}) about the nil return for the last quarter. Do not accuse. Ask questions, explain options, and agree a next step.`},
  {id:'cash', label:'Cash claims not confirmed', ask:'Which sellers rejected or ignored many cash claims in the last 30 days? For each, give the numbers, an innocent explanation that could fit, and a friendly first step. Remember a claim is not proof.'},
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
      declared_last_quarter:t.declared ?? null, receipts_last_quarter:Math.round(perSales(t.no, lastPer())),
      customer_complaints:g ? g.indep : 0, complaint_types:g ? [...new Set(g.list.filter(x => x.type !== 'got').map(x => REPTYPE[x.type]))] : [],
      held_receipts:rs.filter(r => shieldState(r) === 'held').length, asked_for_helper:!!t.helper,
      cash_claims_30d:(c => ({claims:c.claims, confirmed:c.confirmed, rejected_or_ignored:c.refused, waiting:c.pending, refusing_buyers_who_also_pay_digitally:c.refusedBuyers}))(cashStats(t.no, 30))};
  });
  const hr = S.receipts.filter(r => shieldState(r) === 'held'); const groups = {};
  for (const r of hr) { const ids = S.eval[r.code].flags.map(f => f.id).sort().join(','); const k = r.no + '|' + ids; const gg = groups[k] = groups[k] || {seller:(tByNo(r.no) || {}).name, code:r.no, receipts:0, amount:0, reasons:S.eval[r.code].flags.map(f => f.why), hint:r.note || null}; gg.receipts++; gg.amount += r.amt; }
  const st = shopStats();
  const areas = {}; for (const x of st) { const a = areas[x.area] = areas[x.area] || {area:x.area, shops:0, not_on_rasiti:0, ratings:0, got_receipt:0}; a.shops++; if (!x.on) a.not_on_rasiti++; a.ratings += x.n; a.got_receipt += x.got; }
  const {o} = pool();
  return {
    today: new Date(clock).toDateString(), last_quarter: perName(lastPer()), sbt_income_limit_per_year: 2000000,
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
      average_sale:a30.length ? Math.round(sum(a30) / a30.length) : 0, mobile_money_pct:pct(a30.filter(r => r.ch === 'momo').length, a30.length), cash_pct:pct(a30.filter(r => r.ch === 'cash').length, a30.length),
      card_receipts_not_claimed:a30.filter(r => !r.ph).length, cash_claims_waiting:pendingOf(t.no).length,
      tin:t.tin || null, registered_through_rasiti:!!t.via, invited:S.invited.has(t.no), visit_planned:S.visits.has(t.no)}; });
  return {
    receipts:{today:{count:today.length, value:Math.round(sum(today))}, last_7_days:{count:r7.length, value:Math.round(sum(r7))}, last_30_days:{count:r30.length, value:Math.round(sum(r30)), average_sale:r30.length ? Math.round(sum(r30) / r30.length) : 0},
      by_payment_30d:{cash_confirmed_by_seller:r30.filter(r => r.ch === 'cash').length, mobile_money:r30.filter(r => r.ch === 'momo').length, card:r30.filter(r => r.ch === 'card').length, reversed_or_paid_back:r30.filter(r => r.flag).length}, daily_last_14_days:daily},
    seller_details:sellerX,
    fraud_shield:{how_it_works:'Each receipt gets points from the rules. 30 or more: draw entries held for an officer. 60 or more: blocked. The sale always stays in the seller\'s book.',
      receipts_by_state:states, rules:RULES.map(r => ({rule:r.name, points:r.pts, what:r.what, receipts_hit:hits[r.id] || 0})),
      fake_or_misused_codes:S.fakes.slice(-15).map(f => ({date:fD(f.t), code:f.code, kind:f.kind, detail:f.detail || ''})),
      officer_reviews:{approved:rev.filter(x => x === 'approved').length, rejected:rev.filter(x => x === 'rejected').length}},
    draw:{period:per.title, live_entries:o.active, customers_in_draw:Object.keys(by).length, entries_from_registered_sellers:o.reg, held_for_review:o.held, excluded_by_fraud_shield:o.excluded,
      rules:'1 entry per M10 paid by mobile money or card, minimum 1 and maximum 5 per receipt; 1 entry per cash receipt the seller confirmed; double at registered sellers; monthly draw; each phone can win once per draw.',
      prizes:'Monthly: 1st M5,000 (seller bonus M500), 2nd M2,000 (seller M200), 3rd M1,000 (seller M100), 5 smartphones and 20 x M100 airtime. Quarterly: 3 motorbikes (2 for customers, 1 for a registered seller who filed and paid on time). Every 6 months: M100,000. Every year: a car. Every receipt is a payment a network or bank saw, or a cash sale the seller confirmed, so every receipt plays for every prize. A reversed payment, or one paid back to the buyer, gets no entries. All prize amounts to be agreed with RSL.',
      last_draw:last ? {when:fT(Date.parse(last.run_at)), live_entries:last.live_entries, seed:last.seed, cash_winners:(last.winners || []).slice(0, 3).map(w => ({place:w.place, prize:w.prize, phone:w.phone, entries:w.entries, seller:w.seller})), airtime_winners:(last.winners || []).slice(3).map(w => ({phone:w.phone, entries:w.entries, seller:w.seller}))}
        : S.lastDraw ? {when:'this session', cash_winners:S.lastDraw.winners.slice(0, 3).map(w => ({place:w.place, prize:w.prize, phone:w.phone, entries:w.entries, seller:w.seller})), airtime_winners:S.lastDraw.winners.slice(3).map(w => ({phone:w.phone, entries:w.entries, seller:w.seller}))} : null},
    cash_claims:(() => { const c30 = S.claims.filter(c => c.t > clock - 30 * DAY); return {how_it_works:`The buyer claims a cash sale on *999# (seller code and amount). It counts only when the seller confirms it; rejected claims and claims ignored for ${CASH.expireDays} days never reach the sales book or the tax. Limits: ${CASH.perPhoneDay} claims per phone a day, M${CASH.maxAmount} a claim, 1 draw entry per cash receipt.`,
      waiting_now:S.claims.filter(c => claimState(c) === 'pending').length, last_30_days:{claims:c30.length, confirmed:c30.filter(c => c.state === 'confirmed').length, rejected:c30.filter(c => c.state === 'rejected').length, ignored_expired:c30.filter(c => claimState(c) === 'expired').length}}; })(),
    officer_actions:{invitations_sent:S.invited.size, visits_planned:S.visits.size, items_marked_done:S.done.size},
    filing_and_payments:{note:`Demo schedule: one return a quarter for the quarter just ended, due on the 20th of the next month; demo tax rate ${TAXRATE * 100}% of declared sales (RSL sets the real SBT rate).`, current_period:perName(lastPer()) + ' (due ' + perDue(lastPer()) + ')',
      sellers:S.traders.filter(t => t.status === 'registered').map(t => { const x = taxOf(t.no); return {code:t.no, name:t.name, last_return:x.last ? {declared:x.last.declared, nil_reason:x.last.nil, tax_due:x.last.tax, paid:x.paid(x.last.period)} : 'not filed', returns_12m:x.rets.length, filed_on_time:x.rets.filter(x.onTimeFile).length, overdue_tax:x.overdueAmt, overdue_quarters:x.overdue.map(r => perName(r.period)), on_time_streak:x.streak, reminders:t.reminders !== false}; }),
      total_paid_12m:S.payments.reduce((a, x) => a + x.amt, 0)},
    community_watch:watchContext(watchData({days:30, area:'all', who:'all', sig:'all', ctype:'all'})),
    recent_activity:S.feed.slice(0, 10).map(f => fT(f.t) + ' ' + f.text)
  };
}
const BH_TOPICS = {
  receipts:/receipt|sale|sold|sell|cash|mobile|momo|m-?pesa|ecocash|today|yesterday|week|trend|value|amount|average|busiest|day/i,
  seller_details:/seller|shop|stall|trader|tin|phone|request|pending|invite|visit|average|cash|mobile/i,
  fraud_shield:/fraud|fake|forg|tamper|held|hold|shield|flag|review|block|suspic|ring|velocity|split|outlier|self|reject|approv/i,
  draw:/draw|winner|win|prize|airtime|entr|lottery|jackpot|seed|budget/i,
  cash_claims:/cash|claim|pending|confirm|request|reject|refus|ignor/i,
  officer_actions:/invit|visit|contact|done|action|officer|follow/i,
  community_watch:/area|rating|rate|communit|watch|complain|report|market|hotspot|time of day|hour|lead|badge|unlisted|extra|where/i,
  recent_activity:/recent|just|latest|happen|activity|log/i,
  filing_and_payments:/fil|return|pay|arrear|overdue|owe|debt|reminder|streak|on time|late|sbt|tax due|plan/i
};
function bhContextFor(question, focusNo, full) {
  const was = SHOWPH; SHOWPH = false; // Bohlale never sees full phone numbers
  try { return bhContextFor2(question, focusNo, full); } finally { SHOWPH = was; } }
function bhContextFor2(question, focusNo, full) {
  const base = bhContext(focusNo); const ex = bhExtra();
  const keys = Object.keys(BH_TOPICS).filter(k => full || BH_TOPICS[k].test(question));
  const qn = String(question).toLowerCase().replace(/['’]/g, '');
  const namesSeller = S.traders.some(t => new RegExp('\\b(' + t.no + '|' + t.name.toLowerCase().replace(/^(ntate|mme)\s+/, '').replace(/['’]/g, '').split(/\s+/)[0] + ')\\b').test(qn));
  if (!keys.length && namesSeller) keys.push('seller_details', 'receipts', 'cash_claims');
  for (const k of (keys.length ? keys : Object.keys(BH_TOPICS))) base[k] = ex[k];
  return base;
}

/* ---- Conversation without an AI key: greetings, small talk, how-it-works questions and follow-ups ---- */
function bhChat(q) {
  const t = q.toLowerCase().replace(/[!?.,']/g, ' ').replace(/\s+/g, ' ').trim(); const who = API.user && !/^account/i.test(API.user.name) ? API.user.name.split(' ')[0] : '';
  const is = re => re.test(t);
  if (is(/^(hi|hello|hey|lumela|dumela|good (morning|afternoon|evening)|howzit|hallo)( bohlale)?$/) || is(/^(hi|hello|hey|lumela) (there|ntate|mme|bohlale)$/))
    return `Lumela${who ? ' ' + who : ''}! 👋 Good to see you. What would you like to look at today? I can tell you about a seller, an area, today's receipts, the draw or anything the Fraud Shield caught.`;
  if (is(/how are you|o kae|u phela joang|how is it going/)) return `Ke teng, thank you for asking! I'm ready to dig into the data. ${S.receipts.filter(r => r.t > clock - DAY).length} receipts came in over the last 24 hours. Want a quick briefing?`;
  if (is(/^(thanks|thank you|kea leboha|ke a leboha|cool|great|nice|perfect|ok|okay)( so much| bohlale)?$/)) return 'Kea leboha! Ask me anything else whenever you need it.';
  if (is(/^(bye|goodbye|sala hantle|see you)/)) return 'Sala hantle! Your questions are saved in the activity log if you need them later.';
  if (is(/who are you|what are you|your name|introduce yourself/)) return 'I am **Bohlale**, which means "wisdom" in Sesotho. I am the assistant for RSL officers inside Rasiti. I read the receipts, the sellers\' sales books, customer ratings and Fraud Shield results, and I help you understand cases, spot patterns, draft messages and write reports. I only suggest. You decide.';
  if (is(/what can you do|help me|how can you help|what (can|should) i ask|examples?/)) return 'Here are some things you can ask me:\n- "Tell me about Thabo" or "Compare Palesa and Mathabo"\n- "How many receipts came in today?"\n- "Which area has the lowest receipt rate?"\n- "Who won the draw?"\n- "What did the Fraud Shield catch?"\n- "Who declared nil returns?"\nYou can also ask follow-ups like "and Palesa?" and I will keep the topic.';
  if (is(/what is rasiti|how does rasiti work|explain rasiti/)) return 'Rasiti is a **receipt lottery**. Customers ask for a receipt on every purchase, by USSD or WhatsApp, and each receipt gives them entries in a monthly draw. Sellers get a free digital sales book, and their customers earn double entries once the seller registers for tax. RSL gets a live, honest picture of informal trade, plus a Fraud Shield and community watch to keep it clean.';
  if (is(/how does the draw work|draw rules|how (do|are) (winners|entries)|how many entries/)) return 'The main draw runs **once a month**. Customers earn 1 entry for every M10 paid by mobile money or card (at least 1, at most 5 per receipt) and 1 entry for each cash sale the seller confirmed, and entries **double** at sellers who are registered for tax. Cash receipts count for at most 10 entries a month at one shop and 20 in total; mobile money is not capped. Monthly prizes: M5,000, M2,000 and M1,000 in cash (the seller of the winning receipt gets a 10% bonus), 5 smartphones and 20 prizes of M100 airtime. Motorbikes (quarterly), M100,000 (every 6 months) and a car (yearly) need receipts paid by M-Pesa or EcoCash. Each phone can win only once per draw, and the seed is published so anyone can check the result.';
  if (is(/what is the fraud shield|how does the fraud shield|explain the (fraud )?shield/)) return 'The **Fraud Shield** scores every receipt against simple rules: a seller buying from themselves, one phone collecting many receipts, a sale split into small ones, a burst of new heavy buyers, and unusually large sales. At 30 points the draw entries wait for an officer; at 60 they are blocked. The sale always stays in the seller\'s book, so honest sellers never lose their records.';
  if (is(/what is (sbt|simplified business tax)|explain sbt/)) return '**Simplified Business Tax (SBT)** is for small businesses with annual income below M2,000,000 in specific sectors, according to the call for innovation. Rasiti helps by estimating a seller\'s yearly income from their receipts, so officers can invite the right sellers to register. Rates and deadlines come from RSL, so please check those with the SBT team.';
  if (is(/what is community watch|how does community watch/)) return '**Community watch** lets customers rate any shop after buying: did they get a receipt, were they charged extra, or is the seller not on Rasiti? RSL looks at patterns, not single reports. Action starts only when 3 or more different customers report the same shop, and spam reporters are discounted.';
  return null;
}
const BH_OPEN = ['Here is what I found.', 'Sure, here you go.', 'Good question. Here is the picture.', 'Let me pull that up.', 'Here is what the data shows.'];
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
      s.declared_last_quarter != null ? `- ${c.last_quarter} return: declared ${M(s.declared_last_quarter)}; receipts showed ${M(s.receipts_last_quarter)}.` : '- No return on record for last quarter.',
      `- Customer complaints: ${s.customer_complaints}${s.complaint_types.length ? ' (' + s.complaint_types.join(', ').toLowerCase() + ')' : ''}. Held receipts: ${s.held_receipts}.`,
      `- Cash claims (30 days): ${s.cash_claims_30d.claims}, of which ${s.cash_claims_30d.confirmed} confirmed by the seller, ${s.cash_claims_30d.rejected_or_ignored} rejected or ignored, ${s.cash_claims_30d.waiting} waiting.`], `seller ${s.code} records`); }
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
  if (c.receipts && !sNamed.length && !has(/claim|reject|ignor|refus/) && (has(/sale|sold|cash|mobile|momo|payment|today|week|trend|average|busiest|value|revenue/) || (has(/receipt/) && !specific))) { const r = c.receipts; const busy = r.daily_last_14_days.slice().sort((a, b) => b.receipts - a.receipts)[0];
    sec('Receipts', [`- Today: ${r.today.count} receipts worth ${M(r.today.value)}.`, `- Last 7 days: ${r.last_7_days.count} worth ${M(r.last_7_days.value)}. Last 30 days: ${r.last_30_days.count} worth ${M(r.last_30_days.value)}, average sale ${M(r.last_30_days.average_sale)}.`,
      `- Payment (30 days): ${r.by_payment_30d.cash_confirmed_by_seller} cash (confirmed by the seller), ${r.by_payment_30d.mobile_money} by mobile money, ${r.by_payment_30d.card} by card${r.by_payment_30d.reversed_or_paid_back ? `; ${r.by_payment_30d.reversed_or_paid_back} reversed or paid back (no entries)` : ''}.`, `- Busiest day in the last 2 weeks: ${busy.date} (${busy.receipts} receipts).`]); }
  if (c.fraud_shield && !has(/claim/) && has(/fraud|fake|forg|tamper|held|hold|shield|flag|review|block|suspic|ring|reject|approv/)) { const f = c.fraud_shield; const st = f.receipts_by_state;
    sec('Fraud Shield', [`- Receipts: ${st.clear || 0} clear, ${st.held || 0} held for review, ${st.blocked || 0} blocked, ${st.approved || 0} approved and ${st.rejected || 0} rejected by officers.`,
      ...f.rules.filter(r => r.receipts_hit).map(r => `- ${r.rule}: ${r.receipts_hit} receipts (${r.points} points).`),
      `- Fake or misused codes stopped: ${c.kpis.fake_codes_stopped}.${f.fake_or_misused_codes.length ? ' Latest: ' + f.fake_or_misused_codes.slice(-3).map(x => `${x.code} (${x.kind}, ${x.date})`).join('; ') + '.' : ''}`,
      ...c.held_receipt_groups.slice(0, 4).map(g => `- Held: ${g.seller}, ${g.receipts} receipt${g.receipts === 1 ? '' : 's'} (${M(g.amount)}). ${g.reasons[0]}`)]); }
  if (c.draw && has(/draw|winner|win|prize|airtime|entr|lottery|jackpot/)) { const d = c.draw; const lines = [`- ${d.period}: ${d.live_entries.toLocaleString('en-US')} live entries from ${d.customers_in_draw} customers (${d.entries_from_registered_sellers.toLocaleString('en-US')} from registered sellers, doubled). ${d.held_for_review} held, ${d.excluded_by_fraud_shield} excluded.`, `- Prizes: ${d.prizes}`];
    if (d.last_draw) lines.push(`- Last draw (${d.last_draw.when}): ${d.last_draw.cash_winners.map(w => `${w.place} ${w.phone}`).join(', ')}; plus ${d.last_draw.airtime_winners.length} airtime winners.`); else lines.push('- No draw has been run yet for this period.');
    sec('Monthly draw', lines); }
  if (has(/nil|declar|return|under|evad|evasion|hiding/)) { const n = sel.filter(s => s.declared_last_quarter === 0), u = sel.filter(s => s.declared_last_quarter > 0 && s.declared_last_quarter < s.receipts_last_quarter * 0.8);
    sec(`Returns for ${c.last_quarter}`, [...n.map(s => `- ${s.name} (${s.code}) declared nil; receipts showed ${M(s.receipts_last_quarter)}.`), ...u.map(s => `- ${s.name} (${s.code}) declared ${M(s.declared_last_quarter)}; receipts showed ${M(s.receipts_last_quarter)}.`), ...(n.length + u.length ? ['- A nil or low return is a reason to ask, not proof of wrongdoing.'] : ['- No nil or low returns stand out.'])]); }
  if (has(/regist|enrol|tin|sbt|simplified|tax net|not yet/) && !sNamed.length) { const e = sel.filter(s => s.status !== 'registered');
    sec('Widening the tax net', [`- Not yet registered: ${e.map(s => `${s.name} (${s.code}, yearly estimate ${M(s.yearly_estimate)})`).join('; ') || 'none'}.`, `- Registered through Rasiti: ${c.kpis.registered_through_rasiti}.`]); }
  if (c.cash_claims && has(/cash|claim|pending|confirm|request|reject|refus|ignor/)) { const k = c.cash_claims, l = k.last_30_days;
    sec('Cash claims', [`- Waiting for the seller now: ${k.waiting_now}.`, `- Last 30 days: ${l.claims} claims; ${l.confirmed} confirmed, ${l.rejected} rejected, ${l.ignored_expired} ignored (expired).`,
      ...sel.filter(s => s.cash_claims_30d.refusing_buyers_who_also_pay_digitally >= 3).map(s => `- ${s.name} (${s.code}): ${s.cash_claims_30d.rejected_or_ignored} of ${s.cash_claims_30d.claims} cash claims rejected or ignored. A reason for a friendly visit, not proof.`),
      '- Only the seller\'s confirmation, the seller\'s return or a network or bank payment can create tax. A buyer\'s claim never does.'], 'cash claim records'); }
  if (has(/complain|rating|communit|watch|lead|unlisted|badge|extra/) && c.community_watch && !aNamed.length) { const w = c.community_watch.kpis;
    sec('Community watch (30 days)', [`- ${w.ratings} ratings from ${w.people} people about ${w.shops} shops; ${w.rate}% got a receipt.`, `- ${w.leads} new leads (shops not on Rasiti that several customers reported).`,
      ...c.shops_flagged.slice(0, 4).map(s => `- ${s.shop} (${s.area}): ${s.signal}, ${s.people} people.`)]); }
  if (c.filing_and_payments && has(/fil|pay|arrear|overdue|owe|reminder|streak|on time|late|tax due|plan/) && !has(/nil|declar/)) { const f = c.filing_and_payments;
    sec(`Filing and payments (${f.current_period})`, [...f.sellers.map(x => `- ${x.name} (${x.code}): ${x.last_return === 'not filed' ? 'not filed yet' : 'filed ' + (x.last_return.declared ? M(x.last_return.declared) : 'nil')}; on time ${x.filed_on_time}/${x.returns_12m}; streak ${x.on_time_streak}${x.overdue_tax ? `; ${M(x.overdue_tax)} overdue (${x.overdue_quarters.join(', ')})` : ''}.`), `- Paid through Rasiti in 12 months: ${M(f.total_paid_12m)}. ${f.note}`], 'filing and payment records'); }
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
      sel.declared_last_quarter != null ? `- Last quarter: declared ${M(sel.declared_last_quarter)}; receipts showed ${M(sel.receipts_last_quarter)}.` : '- No return on record for last quarter.',
      `- Customer complaints: ${sel.customer_complaints}${sel.complaint_types.length ? ' (' + sel.complaint_types.join(', ') + ')' : ''}.`,
      `- Receipts held by the Fraud Shield: ${sel.held_receipts}.`,
      `- Cash claims in 30 days: ${sel.cash_claims_30d.claims} (${sel.cash_claims_30d.confirmed} confirmed by the seller, ${sel.cash_claims_30d.rejected_or_ignored} rejected or ignored).`, '');
    const w = ctx.worklist.find(x => x.code === sel.code);
    L.push(w ? `Suggested first step: **${w.action}**. ${w.reasons.slice(-1)[0] || ''}` : 'No action is suggested for this seller right now.', '', `Based on: seller ${sel.code} receipts, returns and ratings.`);
  } else if (task === 'invite' && sel) {
    L.push(`**Draft SMS to ${sel.name}**`, '', `Lumela ${sel.name.split(' ').slice(0, 2).join(' ')}. Your Rasiti sales book shows steady trade. Register for Simplified Business Tax on *999# (option 3): it is free, your customers earn double draw entries, and you get a badge banks recognise. Questions? Reply HELP. RSL`, '',
      '*A Sesotho version needs AI mode. Please check any Sesotho text with a fluent speaker.*', '', `Based on: seller ${sel.code} sales (${M(sel.sales_30d)} in 30 days).`);
  } else if (task === 'call' && sel) {
    L.push(`**Call script: ${sel.name}** (code ${sel.code})`, '', '1. Greet and introduce yourself: "Lumela, this is [name] from RSL. Is now a good time?"',
      `2. Explain kindly: "Your return for ${ctx.last_quarter} showed no sales, but Rasiti receipts show about ${M(sel.receipts_last_quarter)} that quarter."`,
      '3. Ask, do not accuse: "Could you help me understand? Was the shop closed, or could the return have a mistake?"',
      '4. Offer help: explain how to correct a return, and that receipts can prefill the next one.',
      sel.complaint_types.length ? `5. Mention gently that some customers said: ${sel.complaint_types.join(', ').toLowerCase()}.` : '5. Thank them for using Rasiti receipts.',
      '6. Agree a next step and a date, and note it in the worklist.', '', `Based on: seller ${sel.code} return and receipts.`);
  } else if (task === 'cash') {
    const bad = ctx.sellers.filter(x => x.cash_claims_30d.refusing_buyers_who_also_pay_digitally >= 3 && x.cash_claims_30d.rejected_or_ignored >= x.cash_claims_30d.claims / 2);
    L.push('**Cash claims the seller did not confirm** (last 30 days)', '');
    if (!bad.length) L.push('No seller stands out: most cash claims are confirmed.');
    bad.forEach(x => L.push(`- **${x.name}** (code ${x.code}): ${x.cash_claims_30d.rejected_or_ignored} of ${x.cash_claims_30d.claims} claims rejected or ignored, from ${x.cash_claims_30d.refusing_buyers_who_also_pay_digitally} different customers who also pay by mobile money or card.`,
      '  Innocent explanation that could fit: the seller does not understand the SMS, or customers typed the wrong seller code.', '  Friendly first step: a visit by a market tax helper to explain cash confirmations, then look at the sales book and the return together.'));
    L.push('', 'A claim is what a buyer says, not proof. Only the seller\'s confirmation, the seller\'s return or a network or bank payment can create tax.', '', 'Based on: cash claim records.');
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
  if (!answer) { mode = 'template';
    if (task !== 'ask') answer = bhTemplate(task, ctx, seller);
    else { answer = bhChat(question);
      const prevA = (BH.history.filter(m => m.role === 'assistant').slice(-1)[0] || {}).content || ''; const prevCode = (prevA.match(/\((\d{4})[),]/) || [])[1];
      if (!answer && /^(why|how come|explain( that| more)?|tell me more|more|details?|go on)\W*$/i.test(question.trim()) && prevCode) {
        answer = 'Let me show the details behind that, starting with the top one.\n\n' + bhLocal('tell me about ' + prevCode, bhContextFor(prevCode, prevCode, true)) + '\n\n*Built-in answers show the figures. With an AI key I can also explain the reasons in my own words.*'; }
      if (!answer) { const full = bhContextFor(question, seller && seller.no, true); let a = bhLocal(question, full);
        if (/could not match/.test(a) && BH.lastDataQ) { const b = bhLocal(BH.lastDataQ + ' ' + question, bhContextFor(BH.lastDataQ + ' ' + question, seller && seller.no, true)); if (!/could not match/.test(b)) a = b; }
        else if (!/could not match/.test(a)) BH.lastDataQ = question;
        answer = /could not match/.test(a) ? a : BH_OPEN[hashStr(question) % BH_OPEN.length] + '\n\n' + a; } } }
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
    try { const admin = ['owner', 'admin'].includes(API.user.role); const test = admin && !BH.checked; BH.checked = true;
      BH.status = await api('bohlale' + (test ? '?check=1' : ''), null, {quiet:true});
      if (BH.status.configured && BH.status.ok === false) { chip.textContent = 'AI problem · built-in answers for now'; chip.className = 'chip bad'; chip.title = BH.status.error; bhAdd('ai', bhFormat(`**The AI connection needs attention.** ${BH.status.error}.\nUntil it is fixed I will answer with built-in answers from the data.`)); return; }
      chip.title = '';
      chip.textContent = BH.status.configured ? `AI on · ${BH.status.model} via ${BH.status.provider}` : 'Built-in answers · add an AI key for full answers'; chip.className = 'chip' + (BH.status.configured ? ' ok' : ''); }
    catch { chip.textContent = 'Template mode'; chip.className = 'chip'; }
  }
  if (!$('#bhLog').children.length) bhAdd('ai', bhFormat(`Lumela${API.user && !/^account/i.test(API.user.name) ? ' ' + API.user.name.split(' ')[0] : ''}! I am **Bohlale**, your assistant for Rasiti.\nI read the worklist, receipts, ratings and Fraud Shield results, and I help you understand cases, draft messages and write reports.\nI only suggest. **You decide.** Phone numbers stay masked, and every question is logged.\nAsk me anything about the data: a seller, an area, receipts, the draw, fraud, returns or registration. Or pick a task on the right.`));
}


/* ================= Dashboard: bird's-eye view of everything ================= */
let DASHD = 30;
function dashData(days) { days = days || DASHD;
  const now = clock, from = now - days * DAY, pfrom = now - 2 * days * DAY; const inP = (t, a, b) => t >= a && t < b;
  const rs = S.receipts.filter(r => inP(r.t, from, now + DAY)), prs = S.receipts.filter(r => inP(r.t, pfrom, from));
  const sum = a => a.reduce((x, r) => x + r.amt, 0); const cust = a => new Set(a.filter(r => r.ph).map(r => r.ph)).size;
  const w = watchData({days:Math.min(30, days), area:'all', who:'all', sig:'all', ctype:'all'});
  const held = S.receipts.filter(r => shieldState(r) === 'held').length; const fakes = S.fakes.filter(f => f.t >= from).length;
  const d0 = new Date(now); d0.setHours(0, 0, 0, 0); const first = d0.getTime() - (days - 1) * DAY;
  const daily = Array.from({length:days}, (_, i) => { const a = first + i * DAY; const x = S.receipts.filter(r => r.t >= a && r.t < a + DAY); return {t:a, n:x.length, v:Math.round(sum(x))}; });
  const per = drawPeriod(); const {o, by} = pool(per);
  const reg = S.traders.filter(t => t.status === 'registered').length, via = S.traders.filter(t => t.via).length;
  const enrolled = S.traders.filter(t => t.status === 'enrolled').length; const filed = S.traders.filter(t => t.status === 'registered' && t.declared != null).length;
  const wl = worklist(); const top = S.traders.map(t => { const x = rs.filter(r => r.no === t.no); return {t, n:x.length, v:sum(x)}; }).sort((a, b) => b.v - a.v);
  const chg = (a, b) => b ? Math.round((a - b) / b * 100) : null;
  return {days, rs, prs, w, held, fakes, daily, per, o, by, reg, via, enrolled, filed, wl, top,
    k:{receipts:rs.length, receiptsChg:chg(rs.length, prs.length), value:sum(rs), valueChg:chg(sum(rs), sum(prs)), customers:cust(rs), customersChg:chg(cust(rs), cust(prs)),
      sellers:S.traders.length, reg, via, rate:w.kp.rate, leads:w.kp.leads, held, fakes, entries:o.active, pending:S.claims.filter(c => c.state === 'pending').length,
      high:wl.filter(i => i.pri >= 3).length, ...(() => { const xs = S.traders.filter(t => t.status === 'registered').map(t => taxOf(t.no)); const rets = xs.flatMap(x => x.rets);
        return {onTime:pctS(rets.filter(r => r.t <= perDueT(r.period)).length, rets.length), returns:rets.length, taxPaid:S.payments.filter(x => x.t >= from).reduce((a, x) => a + x.amt, 0), overdue:xs.reduce((a, x) => a + x.overdueAmt, 0)}; })()}}; }
const dChg = (c, word) => c == null ? `<span class="d">no earlier data</span>` : `<span class="d ${c > 0 ? 'up' : c < 0 ? 'down' : ''}">${c > 0 ? '▲' : c < 0 ? '▼' : '■'} ${Math.abs(c)}% ${word}</span>`;
const dkpi = (v, l, extra, go) => `<a class="kpi dk" href="#${go}"><div class="v">${v}</div><div class="l">${l}</div>${extra || ''}</a>`;
function chartCount(daily, p, W) { W = W || 640; const H = 210, L = 34, R = 10, T = 14, B = 28; const cw = W - L - R, ch = H - T - B; const mx = niceMax(Math.max(1, ...daily.map(d => d.n))); const bw = cw / daily.length, g = Math.max(1, Math.min(4, bw * .25));
  let s = svgOpen(W, H, p);
  for (let i = 0; i <= 2; i++) { const y = T + ch - ch * i / 2; s += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="${p.grid}"/><text x="${L - 6}" y="${y + 4}" font-size="10.5" text-anchor="end" fill="${p.muted}">${mx * i / 2}</text>`; }
  daily.forEach((d, i) => { const x = L + i * bw + g / 2, w = bw - g, h = ch * d.n / mx; if (h) s += `<path d="${barPath(x, T + ch - h, w, h, 3)}" fill="${p.bar}"/>`;
    s += `<rect x="${L + i * bw}" y="${T}" width="${bw}" height="${ch}" fill="transparent" data-tip="${esc(fD(d.t))}: ${d.n} receipts worth ${M(d.v)}"/>`;
    const step = daily.length > 20 ? 7 : daily.length > 10 ? 3 : 1; if (i % step === 0) s += `<text x="${x + w / 2}" y="${H - 9}" font-size="10.5" text-anchor="middle" fill="${p.muted}">${esc(fD(d.t))}</text>`; });
  return s + '</svg>'; }
function dashMapSpec(D) { const pts = [];
  for (const t of S.traders) { const ll = traderLL(t); if (ll) pts.push({ll, color:t.status === 'registered' ? '#1d9e57' : '#3b82f6', r:11}); }
  for (const x of D.w.st) if (!x.on && x.ll && (x.sig === 'lead' || x.sig === 'low')) pts.push({ll:x.ll, color:x.sig === 'lead' ? '#d93025' : '#f0a020', r:10});
  return {points:pts, labels:Object.entries(AREAS).map(([n, ll]) => ({ll, text:n})), legend:[['#1d9e57', 'Registered seller'], ['#3b82f6', 'On Rasiti, not registered'], ['#d93025', 'New lead (not on Rasiti)'], ['#f0a020', 'Low receipts']]}; }
function renderDash() {
  if (!$('#dashKpis')) return; const D = dashData(); const k = D.k; const p = PAL[isDark() ? 'dark' : 'light'];
  $('#dashFilters').innerHTML = [[7, 'Last 7 days'], [14, 'Last 14 days'], [30, 'Last 30 days']].map(([v, l]) => `<button type="button" data-dd="${v}" aria-pressed="${DASHD === v}">${l}</button>`).join('');
  $('#dashKpis').innerHTML = [
    dkpi(k.receipts.toLocaleString('en-US'), 'Receipts issued', dChg(k.receiptsChg, 'vs previous'), 'shield'),
    dkpi(M(k.value), 'Receipted sales', dChg(k.valueChg, 'vs previous'), 'officer'),
    dkpi(k.customers.toLocaleString('en-US'), 'Customers asking for receipts', dChg(k.customersChg, 'vs previous'), 'draw'),
    dkpi(`${k.reg}<small> / ${k.sellers}</small>`, 'Sellers registered for tax', `<span class="d up">${k.via} registered through Rasiti</span>`, 'officer'),
    dkpi((k.rate ?? '-') + '%', 'Purchases with a receipt (customer ratings)', `<span class="d">${k.leads} new leads found</span>`, 'watch'),
    dkpi(k.held, 'Receipts held for review', `<span class="d ${k.fakes ? 'down' : ''}">${k.fakes} fake codes caught</span>`, 'shield'),
    dkpi(k.entries.toLocaleString('en-US'), 'Live draw entries', `<span class="d">${Object.keys(D.by).length} customers in the ${esc(D.per.name)} draw</span>`, 'draw'),
    dkpi(k.high, 'High-priority actions', `<span class="d">${k.pending} receipt requests waiting for sellers</span>`, 'officer'),
    dkpi(k.onTime, 'Returns filed on time', `<span class="d">${k.returns} returns in the last 12 months</span>`, 'officer'),
    dkpi(M(k.taxPaid), 'Tax paid through Rasiti', `<span class="d ${k.overdue ? 'down' : 'up'}">${k.overdue ? M(k.overdue) + ' overdue' : 'nothing overdue'}</span>`, 'officer')].join('');
  $('#dashChart').innerHTML = chartCount(D.daily, p, Math.max(300, Math.round($('#dashChart').clientWidth || 600)));
  const busy = D.daily.slice().sort((a, b) => b.n - a.n)[0];
  $('#dashChartNote').textContent = `${D.k.receipts.toLocaleString('en-US')} receipts in ${D.days} days, about ${Math.round(D.k.receipts / D.days)} a day. Busiest day: ${busy ? fD(busy.t) + ' (' + busy.n + ')' : '-'}.`;
  const steps = [['Reported by customers', D.w.st.filter(x => !x.on && x.negP.size > 0).length], ['On Rasiti, sales book only', D.enrolled], ['Registered for tax', D.reg], ['Filed last quarter', D.filed]]; const mx = Math.max(...steps.map(s => s[1]), 1);
  $('#dashFunnel').innerHTML = steps.map(s => `<div class="fn"><span>${s[0]}</span><span class="bar"><i style="width:${s[1] / mx * 100}%"></i></span><b>${s[1]}</b></div>`).join('');
  $('#dashAttn').innerHTML = D.wl.filter(i => i.pri >= 2).slice(0, 6).map(i => `<li><span class="pill ${i.pri >= 3 ? 'p-bad' : 'p-warn'}">${PRITXT[i.pri]}</span><div><b>${esc(i.subj.name)}</b><div class="note">${esc(i.act)}</div></div></li>`).join('') || '<li class="note">Nothing urgent. Well done.</li>';
  $('#dashAreas').innerHTML = '<tr><th>Area</th><th class="num">Receipt rate</th><th class="num">Leads</th></tr>' + D.w.areas.filter(a => a.rate != null).map(a => `<tr><td>${esc(a.area)}</td><td class="num"><b style="color:${a.rate >= 80 ? 'var(--green)' : a.rate < 50 ? 'var(--warn)' : 'inherit'}">${a.rate}%</b></td><td class="num">${a.leads}</td></tr>`).join('');
  $('#dashTop').innerHTML = '<tr><th>Seller</th><th class="num">Receipts</th><th class="num">Sales</th></tr>' + D.top.slice(0, 6).map(x => `<tr><td>${esc(x.t.name)}<div class="note">${esc(x.t.market)} · ${x.t.status === 'registered' ? 'registered' : 'not yet registered'}</div></td><td class="num">${x.n}</td><td class="num">${M(x.v)}</td></tr>`).join('');
  const last = lastDrawData();
  $('#dashDraw').innerHTML = `<div class="fn"><span>Live entries</span><span></span><b>${D.o.active.toLocaleString('en-US')}</b></div><p class="note" style="margin:6px 0 0">${esc(D.per.title)}. ${last ? `Last draw: ${esc(last.when)}, ${last.winners.length} winners.` : 'Not drawn yet.'} Prize pool M10,800 a month.</p>`;
  if (currentView() === 'dash') { renderDashMap(D); renderDashActivity(); }
}
function renderDashMap(D) { const m = getMap('dashMap'); if (!m) return; m.layer.clearLayers(); const spec = dashMapSpec(D);
  for (const x of spec.points) L.circleMarker(x.ll, {radius:7, color:'#fff', weight:2, fillColor:x.color, fillOpacity:1}).addTo(m.layer);
  if (!m.fitted) { m.fitted = true; m.map.fitBounds(L.latLngBounds(Object.values(AREAS)).pad(.12)); } setTimeout(() => m.map.invalidateSize(), 50); }
async function renderDashActivity() { const el = $('#dashAct'); const admin = API.online && API.user && ['owner', 'admin'].includes(API.user.role);
  if (admin) { try { const r = await api('logs?limit=8', null, {quiet:true}); el.innerHTML = r.rows.map(x => `<li><time>${hm(Date.parse(x.at))}</time><span><b>${esc(logWho(x))}</b> ${esc(ACTLABEL(x.action).toLowerCase())}</span></li>`).join('') || '<li class="note">No activity yet.</li>'; $('#dashActLink').hidden = false; return; } catch {} }
  $('#dashActLink').hidden = true; el.innerHTML = S.feed.slice(0, 8).map(f => `<li><time>${hm(f.t)}</time><span>${esc(f.text)}</span></li>`).join('') || '<li class="note">No activity yet in this session.</li>'; }
function dashPDF() { return withBusy(async () => { const D = dashData(); const k = D.k;
  const [chart, map] = await Promise.all([svgToPng(chartCount(D.daily, PAL.light, 640)), mapImg(dashMapSpec(D))]);
  const busy = D.daily.slice().sort((a, b) => b.n - a.n)[0]; const ch = c => c == null ? 'no earlier data to compare' : `${c > 0 ? 'up' : c < 0 ? 'down' : 'no change'} ${Math.abs(c)}% on the previous ${D.days} days`;
  await makePdf(`rasiti-dashboard-${stamp()}.pdf`, 'Rasiti dashboard', [
    {t:'meta', v:`Bird's-eye view of the last ${D.days} days, prepared ${new Date(clock).toDateString()}. ${phNote()}`},
    {t:'desc', v:'This page brings the whole programme onto one sheet: receipts and sales, sellers joining and registering, what customers report, the Fraud Shield, the monthly draw and the actions officers should take next. Each figure links back to a detailed page in the RSL console.'},
    {t:'h', v:'Key figures'}, {t:'kpis', v:[[k.receipts.toLocaleString('en-US'), 'Receipts issued'], [M(k.value), 'Receipted sales'], [k.customers, 'Customers asking for receipts'], [`${k.reg} / ${k.sellers}`, 'Sellers registered for tax'], [(k.rate ?? '-') + '%', 'Purchases with a receipt'], [k.high, 'High-priority actions'], [k.onTime, 'Returns filed on time'], [M(k.taxPaid), 'Tax paid through Rasiti'], [M(k.overdue), 'Tax overdue']]},
    {t:'desc', v:`Returns filed on time (${k.onTime}): share of the ${k.returns} returns registered sellers filed through Rasiti in the last 12 months that arrived by the due date. Tax paid through Rasiti (${M(k.taxPaid)}): mobile money payments in the period. Tax overdue (${M(k.overdue)}): unpaid tax past its due date; the officer worklist suggests payment plans first. Tax amounts use a demo rate of ${TAXRATE * 100}% of declared sales.`},
    {t:'desc', v:`Receipts issued (${k.receipts}): receipts customers received in the period, ${ch(k.receiptsChg)}. Receipted sales (${M(k.value)}): their total value, ${ch(k.valueChg)}; this is a minimum, as not every sale gets a receipt. Customers (${k.customers}): different phone numbers that asked for receipts, ${ch(k.customersChg)}. Sellers registered (${k.reg} of ${k.sellers}): ${k.via} of them registered through Rasiti. Purchases with a receipt (${k.rate ?? '-'}%): from customer ratings in community watch, which also found ${k.leads} new leads. High-priority actions (${k.high}): items at the top of the officer worklist. ${k.held} receipts are held for review and ${k.fakes} fake codes were caught in the period.`},
    {t:'h', v:'Receipts per day'}, {t:'img', v:chart}, {t:'desc', v:`Each bar is one day's number of receipts. There were ${k.receipts} receipts in ${D.days} days, about ${Math.round(k.receipts / D.days)} a day; the busiest day was ${busy ? fD(busy.t) + ' with ' + busy.n : '-'}. A rising trend means more customers are asking for receipts and more trade is visible to RSL.`},
    {t:'h', v:'Everything on one map'}, {t:'img', v:map}, {t:'meta', v:mapNote(map)}, {t:'desc', v:`Green dots are sellers registered for tax (${k.reg}); blue dots are sellers on Rasiti who have not registered yet (${D.enrolled}), the next people to invite. Red dots are shops not on Rasiti that several customers reported, and orange dots are shops with low receipt rates. Together they show where the tax net is growing and where field visits will help most.`},
    {t:'h', v:'Widening the tax net'}, {t:'table', cols:[['Step', 70], ['Sellers or shops', 30, 1]], rows:[['Reported by customers, not on Rasiti', D.w.st.filter(x => !x.on && x.negP.size > 0).length], ['On Rasiti, sales book only', D.enrolled], ['Registered for tax', D.reg], ['Filed last quarter', D.filed]]},
    {t:'desc', v:'Each step is a group of sellers today. Rasiti moves sellers from the left to the right: customers report shops, shops join with a free sales book, then register for Simplified Business Tax and file using their sales book.'},
    {t:'h', v:'Needs attention'}, {t:'table', cols:[['Priority', 18], ['Seller or shop', 40], ['Action', 70]], rows:D.wl.filter(i => i.pri >= 2).slice(0, 10).map(i => [PRITXT[i.pri], i.subj.name, i.act])},
    {t:'desc', v:'The highest-priority items from the officer worklist. The officer console report has the full list with the reasons behind each item.'},
    {t:'h', v:'Areas'}, {t:'table', cols:[['Area', 50], ['Receipt rate', 25, 1], ['New leads', 25, 1]], rows:D.w.areas.filter(a => a.rate != null).map(a => [a.area, a.rate + '%', a.leads])},
    {t:'desc', v:'Receipt rate is the share of customer ratings in each area where the customer got a receipt, lowest first. New leads are shops there that are not on Rasiti and that several customers reported.'},
    {t:'h', v:'Top sellers by receipted sales'}, {t:'table', cols:[['Seller', 50], ['Status', 30], ['Receipts', 20, 1], ['Sales', 22, 1]], rows:D.top.slice(0, 8).map(x => [x.t.name, x.t.status === 'registered' ? 'Registered' : 'Not yet registered', x.n, M(x.v)])},
    {t:'desc', v:'The sellers whose customers asked for the most receipts by value. High sellers who are not yet registered are strong candidates for an invitation to Simplified Business Tax.'}
  ]); }, 'PDF downloaded'); }

/* ================= System log: who did what, and when ================= */
const LG = {rows:[], total:0, offset:0, busy:false};
const ACTLABEL = a => ({rsl_tin_check:'RSL TIN check (simulated)', rsl_return_sent:'Return sent to RSL (simulated)', education_sms_sent:'Education SMS sent (simulated)', seller_pin_set:'Seller created a PIN', seller_pin_locked:'Seller menu locked (3 wrong PINs)', merchant_code_linked:'Linked a mobile-money merchant code', merchant_code_conflict:'Merchant code already linked to another seller', momo_unlinked:'Paid a merchant code not on Rasiti', test_agent_run:'Ran Mohlomi AI tests', tip_subscribed:'Subscribed to daily tip SMS', tip_unsubscribed:'Stopped daily tip SMS', login:'Signed in', logout:'Signed out', login_failed:'Failed sign-in', password_changed:'Changed own password', password_reset:'Reset a user\'s password', user_created:'Added a user', user_updated:'Changed a user',
  review:'Decided held receipts', undo_review:'Undid a review decision', worklist_done:'Marked a worklist item done', worklist_invite:'Sent a registration invitation', worklist_visit:'Booked a visit or referral', undo_worklist:'Undid a worklist action',
  draw_run:'Ran the monthly draw', undo_draw:'Undid a draw', demo_data_loaded:'Loaded the demo data', demo_data_reset:'Reset the demo data', all_data_cleared:'Cleared all data',
  bohlale_ask:'Asked Bohlale AI', contacts_shown:'Showed full phone numbers', contacts_hidden:'Hid phone numbers', receipt_issued:'Receipt issued', receipt_claimed:'Receipt claimed by a customer',
  receipt_requested:'Customer asked for a receipt', receipt_request_confirmed:'Seller confirmed a receipt request', receipt_request_rejected:'Seller rejected a receipt request', receipt_request_pending:'Receipt request sent',
  shop_rated:'Customer rated a shop', fake_code_caught:'Fake code caught', seller_joined:'New seller joined', seller_registered_for_tax:'Seller registered for tax', seller_asked_for_help:'Seller asked for help registering'})[a] || a.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
const logWho = r => r.user_email || r.actor || 'System';
const logDetail = r => Object.entries(r.detail || {}).filter(([k, v]) => v != null && v !== '' && k !== 'actor' && k !== 'channel').map(([k, v]) => `${k.replace(/_/g, ' ')}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ');
function logQuery(extra) { const p = new URLSearchParams({who:$('#lgWho').value, action:$('#lgAct').value, days:$('#lgDays').value, q:$('#lgQ').value.trim(), ...extra}); return 'logs?' + p.toString(); }
async function renderLogs(reset) {
  if (!(API.online && API.user && ['owner', 'admin'].includes(API.user.role))) return;
  if (LG.busy) return; LG.busy = true;
  try {
    if (reset) { LG.rows = []; LG.offset = 0; }
    const r = await api(logQuery({limit:100, offset:LG.offset}));
    LG.total = r.total; LG.rows = LG.rows.concat(r.rows); LG.offset = LG.rows.length;
    fillSel('#lgAct', [['', 'All actions'], ...r.actions.map(a => [a.action, `${ACTLABEL(a.action)} (${a.n})`])], $('#lgAct').value);
    fillSel('#lgWho', [['', 'Everyone'], ['staff', 'RSL staff only'], ['public', 'Phone users only (customers and sellers)'], ...r.people.map(p => [p, p])], $('#lgWho').value);
    $('#lgTbl').innerHTML = '<tr><th>When</th><th>Who</th><th>What</th><th>Details</th></tr>' + (LG.rows.map(x => `<tr><td class="mono" style="white-space:nowrap">${fT(Date.parse(x.at))}</td><td>${esc(logWho(x))}${x.user_email ? '<div class="note">RSL staff</div>' : x.detail && x.detail.channel ? `<div class="note">${esc(x.detail.channel)}</div>` : ''}</td><td><b>${esc(ACTLABEL(x.action))}</b></td><td class="note">${esc(logDetail(x))}</td></tr>`).join('') || '<tr><td colspan="4" class="note">No log entries match these filters.</td></tr>');
    $('#lgCount').textContent = `Showing ${LG.rows.length.toLocaleString('en-US')} of ${LG.total.toLocaleString('en-US')} log entries, newest first.`;
    $('#lgMore').hidden = LG.rows.length >= LG.total;
  } catch (e) { toast(e.message); } finally { LG.busy = false; }
}
async function logsAll() { const r = await api(logQuery({limit:5000, offset:0})); return r.rows; }
async function logsCSV() { try { const rows = await logsAll(); downloadCSV(`rasiti-system-log-${stamp()}.csv`, [['When', x => isoT(Date.parse(x.at))], ['Who', logWho], ['Staff or phone user', x => x.user_email ? 'RSL staff' : (x.detail && x.detail.channel) || 'System'], ['What', x => ACTLABEL(x.action)], ['Action code', x => x.action], ['Details', logDetail]], rows); } catch (e) { toast(e.message); } }
function logsPDF() { return withBusy(async () => { const rows = await logsAll(); const staff = rows.filter(x => x.user_email).length;
  const top = Object.entries(rows.reduce((o, x) => (o[ACTLABEL(x.action)] = (o[ACTLABEL(x.action)] || 0) + 1, o), {})).sort((a, b) => b[1] - a[1]).slice(0, 4);
  await makePdf(`rasiti-system-log-${stamp()}.pdf`, 'System log', [
    {t:'meta', v:`Filters: ${$('#lgWho').selectedOptions[0].text} · ${$('#lgAct').selectedOptions[0].text} · ${$('#lgDays').selectedOptions[0].text}${$('#lgQ').value.trim() ? ' · search "' + $('#lgQ').value.trim() + '"' : ''}. ${rows.length} entries${rows.length >= 5000 ? ' (first 5,000)' : ''}.`},
    {t:'desc', v:`The system log records who did what and when. Staff actions (${staff}) show the officer's email: sign-ins, review decisions, worklist actions, draws, user changes, data resets, questions to Bohlale AI and every time someone showed or hid full phone numbers. Phone actions (${rows.length - staff}) show a masked customer number or a seller code: receipts, receipt requests, shop ratings, fake codes caught and sellers joining or registering. ${top.length ? 'The most common entries here are ' + top.map(([k, v]) => `${k.toLowerCase()} (${v})`).join(', ') + '.' : ''} Entries cannot be edited from the platform.`},
    {t:'table', cols:[['When', 24], ['Who', 40], ['What', 42], ['Details', 70]], rows:rows.map(x => [isoT(Date.parse(x.at)), logWho(x), ACTLABEL(x.action), logDetail(x)])}
  ]); }, 'PDF downloaded'); }
async function toggleContacts() {
  const show = !SHOWPH;
  try { if (API.online) await api('admin', {op:'contacts', show, page:currentView()}); } catch (e) { toast(e.message); return; }
  SHOWPH = show; try { sessionStorage.setItem('rasitiShowPh', show ? '1' : ''); } catch {}
  renderContactsBtn(); renderAll(); if (S.lastDraw) showWinners(S.lastDraw); route(); toast(show ? 'Full phone numbers shown. This was written to the system log.' : 'Phone numbers hidden');
}
function renderContactsBtn() { const b = $('#phBtn'); if (!b) return; const can = API.online ? !!(API.user && ['owner', 'admin'].includes(API.user.role)) : true;
  if (!can && SHOWPH) { SHOWPH = false; }
  b.hidden = !(can && RSL_VIEWS.includes(currentView())); b.textContent = SHOWPH ? 'Hide contacts' : 'Show contacts'; b.setAttribute('aria-pressed', SHOWPH); b.classList.toggle('on', SHOWPH); }

/* ================= Transaction search (whole history) ================= */
// Signed in to the live database: the server searches every receipt, return and payment ever recorded (/api/search).
// Offline demo: the same filters run over the data in this browser.
const SX = {rows:[], total:0, sum:null, busy:false, seq:0};
const SXK = {receipt:'Receipt', return:'Tax return', payment:'Tax payment'};
const SXP = {cash:'Cash (seller confirmed)', momo:'Mobile money', mpesa:'M-Pesa', ecocash:'EcoCash', card:'Card'};
const SXR = {seller:'Seller', network:'Network', bank:'Bank'};
const SXF = {reversed:'Payment reversed', payback:'Money sent back to the payer'};
const SHL = {clear:'Clear', held:'Held for review', blocked:'Blocked', approved:'Approved by an officer', rejected:'Rejected by an officer'};
function sxParams() { const v = id => ($(id) || {}).value || ''; return {q:v('#sxQ').trim(), kind:v('#sxKind'), paid:v('#sxPaid'), rec:v('#sxRec'), flag:v('#sxFlag'), seller:v('#sxSeller'), market:v('#sxMarket'), from:v('#sxFrom'), to:v('#sxTo'), min:v('#sxMin'), max:v('#sxMax'), sort:v('#sxSort') || 'new'}; }
const sxPaidOf = r => r.ch === 'cash' ? 'cash' : r.ch === 'card' ? 'card' : r.net || (/^mpesa:/.test(r.note || '') ? 'mpesa' : /^ecocash:/.test(r.note || '') ? 'ecocash' : 'momo');
function sxLocalRows() { const iso = t => new Date(t).toISOString(); const out = [];
  for (const r of S.receipts) { const tr = tByNo(r.no) || {}; out.push({kind:'receipt', ref:r.code, seller_no:r.no, seller_name:tr.name, market:tr.market, amount:r.amt, at:iso(r.t), paid:sxPaidOf(r), rec:r.ch === 'momo' ? 'network' : r.ch === 'card' ? 'bank' : 'seller', flag:r.flag || null, card_last4:r.c4 || null, phone:r.ph, period:null, note:r.note && !/^(confirmed|disputed|mpesa:|ecocash:|card:|claim:)/.test(r.note) ? r.note : null}); }
  for (const x of S.returns) { const tr = tByNo(x.no) || {}; out.push({kind:'return', ref:x.id, seller_no:x.no, seller_name:tr.name, market:tr.market, amount:x.declared, at:iso(x.t), paid:null, rec:'seller', flag:null, phone:null, period:x.period, note:x.declared ? 'Tax due M' + Math.round(x.tax) : 'Nil return' + (x.nil ? ': ' + x.nil : '')}); }
  for (const x of S.payments) { const tr = tByNo(x.no) || {}; out.push({kind:'payment', ref:x.ref || x.id, seller_no:x.no, seller_name:tr.name, market:tr.market, amount:x.amt, at:iso(x.t), paid:'momo', rec:'seller', flag:null, phone:null, period:x.period, note:'Tax payment by ' + (x.ch === 'wa' ? 'WhatsApp' : x.ch === 'ussd' ? 'USSD' : x.ch || 'mobile money')}); }
  return out; }
function sxLocal(p, limit, offset) {
  const t = p.q.toLowerCase(), an = p.q.replace(/[^A-Za-z0-9]/g, '').toLowerCase(), dg = p.q.replace(/\D/g, ''), onlyDigits = dg.length >= 3 && dg.length === p.q.replace(/[\s+-]/g, '').length;
  const from = p.from ? Date.parse(p.from + 'T00:00') : -Infinity, to = p.to ? Date.parse(p.to + 'T00:00') + DAY : Infinity;
  let rows = sxLocalRows().filter(r => {
    if (t && ![r.ref, r.seller_no, r.seller_name, r.market, r.period, r.note].some(v => String(v || '').toLowerCase().includes(t)) && !(an.length >= 4 && String(r.ref).replace(/[^A-Za-z0-9]/g, '').toLowerCase().includes(an)) && !(onlyDigits && r.phone && r.phone.endsWith(dg))) return false;
    if (p.kind && r.kind !== p.kind) return false;
    if (p.paid && !(p.paid === 'momo' ? ['momo', 'mpesa', 'ecocash'].includes(r.paid) : r.paid === p.paid)) return false;
    if (p.rec && r.rec !== p.rec) return false; if (p.flag && (p.flag === 'any' ? !r.flag : r.flag !== p.flag)) return false;
    if (p.seller && r.seller_no !== p.seller) return false; if (p.market && r.market !== p.market) return false;
    const at = Date.parse(r.at); if (at < from || at >= to) return false;
    if (p.min !== '' && r.amount < +p.min) return false; if (p.max !== '' && r.amount > +p.max) return false; return true; });
  const cmp = {new:(a, b) => b.at.localeCompare(a.at), old:(a, b) => a.at.localeCompare(b.at), big:(a, b) => b.amount - a.amount || b.at.localeCompare(a.at), small:(a, b) => a.amount - b.amount || b.at.localeCompare(a.at)}[p.sort] || ((a, b) => b.at.localeCompare(a.at));
  rows.sort(cmp); const ats = rows.map(r => r.at).sort();
  const sum = {n:rows.length, receipts:rows.filter(r => r.kind === 'receipt').length, returns:rows.filter(r => r.kind === 'return').length, payments:rows.filter(r => r.kind === 'payment').length,
    receipts_value:rows.filter(r => r.kind === 'receipt').reduce((a, r) => a + r.amount, 0), tax_paid:rows.filter(r => r.kind === 'payment').reduce((a, r) => a + r.amount, 0), first:ats[0] || null, last:ats[ats.length - 1] || null};
  return {total:rows.length, summary:sum, rows:rows.slice(offset, offset + limit), local:true}; }
async function sxFetch(limit, offset) { const p = sxParams();
  if (!saved() || !API.user) return sxLocal(p, limit, offset);
  const qs = new URLSearchParams({...p, limit, offset, ...(SHOWPH ? {reveal:'1'} : {})}); return api('search?' + qs.toString()); }
const sxPh = ph => !ph ? '–' : /^\d+$/.test(ph) ? mask(ph) : ph;
const sxWhen = r => { const d = new Date(r.at); return `${fD(d)} ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
function sxStatus(r) { if (r.kind !== 'receipt') return r.note || ''; const known = S.receipts.find(x => x.code === r.ref);
  return [r.flag ? SXF[r.flag] + ': no entries' : '', known ? 'Fraud Shield: ' + SHL[shieldState(known)] : '', r.rec === 'network' ? 'Paid through the network' : r.rec === 'bank' ? `Card ••${r.card_last4 || '????'}${r.phone ? '' : ', not claimed yet'}` : r.kind === 'receipt' && r.paid === 'cash' ? 'Confirmed by the seller' : '', r.note && !/^(mpesa|ecocash|card|claim):/.test(r.note) ? r.note : ''].filter(Boolean).join(' · '); }
function sxWhat(r) { return r.kind === 'receipt' ? `Receipt · ${SXP[r.paid] || ''}` : r.kind === 'return' ? `Tax return · ${r.period ? perName(r.period) : ''}` : `Tax payment · ${r.period ? perName(r.period) : ''}`; }
function sxFillOptions(j) { const sellers = j.sellers || S.traders.map(t => ({no:t.no, name:t.name})).sort((a, b) => a.name < b.name ? -1 : 1);
  const markets = j.markets || [...new Set(S.traders.map(t => t.market).filter(Boolean))].sort();
  fillSel('#sxSeller', [['', 'All sellers'], ...sellers.map(x => [x.no, `${x.name} (${x.no})`])], $('#sxSeller').value);
  fillSel('#sxMarket', [['', 'All areas'], ...markets.map(m => [m, m])], $('#sxMarket').value); }
async function renderSearch(reset) { if (!$('#sxTbl')) return; const my = ++SX.seq;
  if (reset) { SX.rows = []; }
  try { const j = await sxFetch(50, reset ? 0 : SX.rows.length); if (my !== SX.seq) return;
    SX.rows = reset ? j.rows : SX.rows.concat(j.rows); SX.total = j.total; SX.sum = j.summary; sxFillOptions(j);
    const sm = j.summary;
    $('#sxKpis').innerHTML = [[sm.n.toLocaleString('en-US'), 'Transactions found'], [sm.receipts.toLocaleString('en-US'), 'Receipts'], [M(sm.receipts_value), 'Value of those receipts'], [sm.returns.toLocaleString('en-US'), 'Tax returns'], [M(sm.tax_paid), 'Tax paid']].map(kpi).join('');
    $('#sxTbl').innerHTML = '<tr><th>When</th><th>What</th><th>Reference</th><th>Seller</th><th>Recorded by</th><th class="num">Amount</th><th>Customer</th><th>Checks and notes</th></tr>' +
      (SX.rows.map(r => `<tr><td class="mono">${esc(sxWhen(r))}</td><td>${esc(sxWhat(r))}</td><td class="mono">${esc(r.ref)}</td><td>${esc(r.seller_name || r.seller_no)}<div class="note">code ${esc(r.seller_no)}${r.market ? ' · ' + esc(r.market) : ''}</div></td><td>${esc(SXR[r.rec] || '')}</td><td class="num">${M(r.amount)}</td><td class="mono">${esc(sxPh(r.phone))}</td><td class="note">${esc(sxStatus(r))}</td></tr>`).join('') || '<tr><td colspan="8" class="note">No transactions match. Clear a filter or check the spelling.</td></tr>');
    const span = sm.first ? ` from ${fD(Date.parse(sm.first))} ${new Date(sm.first).getFullYear()} to ${fD(Date.parse(sm.last))} ${new Date(sm.last).getFullYear()}` : '';
    $('#sxCount').textContent = `Showing ${SX.rows.length.toLocaleString('en-US')} of ${SX.total.toLocaleString('en-US')} transactions${span}. ${j.local ? 'Offline demo: searching the data in this browser.' : 'Searching the full history in the database.'}`;
    $('#sxMore').hidden = SX.rows.length >= SX.total;
  } catch (e) { if (my === SX.seq) toast(e.message); } }
function sxFilterText() { const p = sxParams(); const sel = id => $(id).value ? $(id).selectedOptions[0].text : null;
  return ['#sxKind', '#sxPaid', '#sxRec', '#sxFlag', '#sxSeller', '#sxMarket'].map(sel).filter(Boolean).concat(p.q ? [`search "${p.q}"`] : [], p.from || p.to ? [`dates ${p.from || 'start'} to ${p.to || 'today'}`] : [], p.min || p.max ? [`amount M${p.min || 0} to ${p.max ? 'M' + p.max : 'any'}`] : []).join(' · ') || 'No filters: everything'; }
async function searchCSV() { try { const j = await sxFetch(5000, 0);
  downloadCSV(`rasiti-transactions-${stamp()}.csv`, [['When', r => isoT(Date.parse(r.at))], ['Type', r => SXK[r.kind]], ['Reference', r => r.ref], ['Seller code', r => r.seller_no], ['Seller', r => r.seller_name || ''], ['Market', r => r.market || ''], ['Tax period', r => r.period ? perName(r.period) : ''], ['Paid by', r => SXP[r.paid] || ''], ['Recorded by', r => SXR[r.rec] || ''], ['Amount (M)', r => r.amount], ['Customer phone', r => !r.phone ? '' : /^\d+$/.test(r.phone) ? maskCsv(r.phone) : r.phone], ['Checks and notes', sxStatus]], j.rows); } catch (e) { toast(e.message); } }
function searchPDF() { return withBusy(async () => { const j = await sxFetch(5000, 0); const sm = j.summary;
  await makePdf(`rasiti-transactions-${stamp()}.pdf`, 'Transaction search', [
    {t:'meta', v:`Filters: ${sxFilterText()}. ${sm.n.toLocaleString('en-US')} transactions${sm.n > 5000 ? ' (first 5,000 shown)' : ''}.`},
    {t:'desc', v:`Receipts (${sm.receipts}) worth ${M(sm.receipts_value)}, tax returns (${sm.returns}) and tax payments (${sm.payments}) worth ${M(sm.tax_paid)} that match the filters${j.local ? ', from the offline demo data in this browser' : ', from the full history in the database'}. "Recorded by" says who created each record: the customer (a cash buy they reported), the seller, or the network (an M-Pesa or EcoCash payment to a linked merchant code). Phone numbers are masked unless an admin chose to show contacts, which is written to the system log.`},
    {t:'table', cols:[['When', 22], ['Type', 18], ['Reference', 26], ['Seller', 30], ['By', 14], ['Amount', 14, 1], ['Customer', 20], ['Checks and notes', 40]], rows:j.rows.map(r => [isoT(Date.parse(r.at)), SXK[r.kind] + (r.paid && r.kind === 'receipt' ? ' · ' + SXP[r.paid] : ''), r.ref, (r.seller_name || '') + ' (' + r.seller_no + ')', SXR[r.rec] || '', M(r.amount), !r.phone ? '' : /^\d+$/.test(r.phone) ? maskCsv(r.phone) : r.phone, sxStatus(r)])}
  ]); }, 'PDF downloaded'); }

/* ================= shell: nav, auth, routing ================= */
const NAVICONS = {reports:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>', search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', dash:'<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>', logs:'<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>', guide:'<circle cx="12" cy="12" r="9"/><path d="M10 8l6 4-6 4z"/>', phones:'<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>', shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>', watch:'<circle cx="12" cy="12" r="3"/><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/>', officer:'<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>', draw:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>', bohlale:'<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>', agent:'<rect x="4" y="7" width="16" height="12" rx="3"/><path d="M12 3v4M9 12h.01M15 12h.01M9 16h6"/>', users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>'};
const TITLES = {guide:'Start here', phones:'Phones', shield:'Fraud Shield', watch:'Community watch', officer:'Officer console · General Clients', draw:'Monthly draw', bohlale:'Bohlale AI · officer assistant', users:'Users', logs:'System log', search:'Search · full history', reports:'Reports · every download', agent:'Mohlomi AI · test agent', dash:'Dashboard · bird\'s-eye view'};
const RSL_VIEWS = ['dash', 'officer', 'shield', 'watch', 'draw', 'search', 'reports', 'bohlale', 'users', 'logs', 'agent'];
const VIEWS = ['guide', 'phones', ...RSL_VIEWS];
function renderNav() {
  const ic = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${NAVICONS[k]}</svg>`;
  const a = k => `<a href="#${k}">${k === 'bohlale' ? `<img class="nav-img" src="${BH_LOGO}" alt="">` : k === 'agent' ? `<img class="nav-img" src="${MH_LOGO}" alt="">` : ic(k)}${TITLES[k].split(' ·')[0]}</a>`;
  const showUsers = API.online && API.user && ['owner', 'admin'].includes(API.user.role);
  $('#nav').innerHTML = '<div class="grp">Try it</div>' + a('guide') + a('phones') + '<div class="grp">RSL daily work' + (API.online && !API.user ? ' · sign in' : '') + '</div>' + a('dash') + a('officer') + a('shield') + a('watch') + a('draw') + '<div class="grp">Find and report</div>' + a('search') + a('reports') + a('bohlale') + (showUsers ? '<div class="grp">Admin</div>' + a('users') + a('logs') + a('agent') : '');
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
  const noAccess = (v === 'users' || v === 'logs' || v === 'agent') && !(API.online && API.user && ['owner', 'admin'].includes(API.user.role));
  $('#login').hidden = !needLogin;
  const show = noAccess ? 'guide' : v;
  document.querySelectorAll('[data-view]').forEach(s => s.hidden = s.dataset.view !== show);
  document.querySelectorAll('#nav a').forEach(a => a.setAttribute('aria-current', a.getAttribute('href') === '#' + show ? 'page' : 'false'));
  $('#pageTitle').textContent = TITLES[show];
  if (needLogin) setTimeout(() => $('#lEmail').focus(), 50);
  if (show === 'watch') setTimeout(renderWatch, 0);
  if (show === 'officer') renderOfficer();
  if (show === 'dash') setTimeout(renderDash, 0);
  if (show === 'users') renderUsers();
  if (show === 'logs') renderLogs(true);
  if (show === 'search') renderSearch(true);
  renderHist(); renderContactsBtn(); $('#repBtn').hidden = !(RSL_VIEWS.includes(show) && show !== 'reports' && !needLogin);
  if (show === 'bohlale') renderBohlale();
  if (show === 'agent' && window.AGENT) AGENT.render();
  window.scrollTo(0, 0);
}
/* Simulated RSL e-services link: every registration, return and payment, with the answer RSL e-services would give. */
function rslEvents() {
  const ev = [];
  for (const t of S.traders) if (t.status === 'registered' && t.tin) ev.push({t:t.regAt || t.joinedAt || clock, no:t.no, what:'TIN check', detail:t.tinFound === true ? 'Already on RSL register: TIN linked' : t.tinFound === false ? 'Not on RSL register: new TIN issued' : 'TIN confirmed on RSL register', ref:t.tin});
  for (const r of S.returns) ev.push({t:r.t, no:r.no, what:'Return sent to RSL', detail:`${perName(r.period)}: ${r.declared ? M(r.declared) : 'nil'}`, ref:ackOf(r)});
  for (const x of S.payments) ev.push({t:x.t, no:x.no, what:'Payment receipt from RSL', detail:`${M(x.amt)} for ${perName(x.period)}`, ref:rcptOf(x)});
  return ev.sort((a, b) => b.t - a.t);
}
function renderRsl() { const el = $('#rslTbl'); if (!el) return; const ev = rslEvents(); const n = w => ev.filter(e => e.what === w).length;
  $('#rslKpis').innerHTML = [[n('TIN check'), 'TIN checks'], [n('Return sent to RSL'), 'Returns acknowledged'], [n('Payment receipt from RSL'), 'Payments with RSL receipt'], ['0', 'Failed or waiting']].map(kpi).join('');
  el.innerHTML = '<tr><th>When</th><th>Seller</th><th>Exchange</th><th>Details</th><th>RSL reference</th><th>Status</th></tr>' + ev.slice(0, 12).map(e => `<tr><td>${fT(e.t)}</td><td>${esc((tByNo(e.no) || {}).name || e.no)}<div class="note">code ${esc(e.no)}</div></td><td>${e.what}</td><td>${esc(e.detail)}</td><td class="mono">${esc(e.ref)}</td><td><span class="pill p-ok">Accepted</span></td></tr>`).join('') + (ev.length ? '' : '<tr><td colspan="6" class="note">No exchanges yet.</td></tr>'); }
/* Daily education message: today's tip in English and Sesotho, how it is sent, what it costs, and the next 7 days. */
function eduAudience() { return { sellers:S.traders.filter(t => t.status === 'registered').length, enrolled:S.traders.length, customers:new Set(S.receipts.filter(r => r.ph).map(r => r.ph)).size }; }
const M2 = n => 'M' + Number(n).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
function tipEconomics(n) { const days = 30, gross = n * TIPS.subPrice * days, share = gross * TIPS.networkShare, sms = n * TIPS.smsPrice * days; return {gross, share, sms, net:gross - share - sms}; }
function renderTips() { const el = $('#tipToday'); if (!el) return; const t = TIPS.forDate(new Date(clock)); const n = S.tipSubs ?? Math.round(eduAudience().customers / 8); const e = tipEconomics(n);
  el.innerHTML = `<div class="lang">English</div>${esc(t.en)}<div class="lang">Sesotho</div>${esc(t.st)}<div class="lang">Source</div><span class="note">${esc(t.src)}</span>`;
  const rows = [['WhatsApp Channel post (anyone can follow)', 'Every day', 'Free'], ['Tip of the day in the USSD and WhatsApp menus', 'Every day', 'Free'], [`Daily SMS for subscribers (${n})`, 'Every day, optional', `${M2(TIPS.subPrice)} a day, paid by the subscriber`]];
  $('#tipCost').innerHTML = '<tr><th>Channel</th><th>How often</th><th class="num">Cost</th></tr>' + rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="num">${r[2]}</td></tr>`).join('');
  $('#tipNote').textContent = `Daily SMS is optional: people subscribe on USSD (*999# > 3 > 4) or by sending SUBSCRIBE on WhatsApp, and pay ${M2(TIPS.subPrice)} a day from airtime. With ${n} subscriber${n === 1 ? '' : 's'}, a month brings in ${M2(e.gross)}; the network keeps about ${Math.round(TIPS.networkShare * 100)}% for billing (${M2(e.share)}) and the SMS cost about ${M2(e.sms)}, leaving ${M2(e.net)}. All three figures are assumptions to agree with Econet and Vodacom.`;
  $('#tipNext').innerHTML = '<tr><th>Date</th><th>For</th><th>Message (English)</th></tr>' + TIPS.schedule(new Date(clock + 86400000), 7).map(d => `<tr><td>${fD(d.date.getTime())}</td><td>${d.tip.for === 'seller' ? 'Sellers' : 'Everyone'}</td><td>${esc(d.tip.en)}</td></tr>`).join('');
  const b = $('#tipSmsBtn'); if (b) { b.textContent = `Send today's SMS tip to subscribers (${n})`; b.hidden = API.online && !(API.user && ['owner', 'admin', 'officer'].includes(API.user.role)); } }
async function sendTipSms() { const n = S.tipSubs ?? Math.round(eduAudience().customers / 8); const t = TIPS.forDate(new Date(clock)); const cost = n * TIPS.smsPrice;
  if (!n) { toast('No subscribers yet. People subscribe on *999# > 3 > 4 or by sending SUBSCRIBE on WhatsApp.'); return; }
  try { if (API.online && API.user) await api('admin', {op:'tip_sms', count:n, cost:Math.round(cost * 100) / 100, tip:t.en.slice(0, 160)}); } catch (e) { toast(e.message); return; }
  log('ok', `Daily SMS tip sent to ${n} subscribers (SMS cost about ${M2(cost)}, income ${M2(n * TIPS.subPrice)}): "${t.en}"`); toast(`SMS tip sent to ${n} subscribers (simulated). Written to the system log.`); }
function renderAll() { reEvalIfNeeded(); renderShield(); renderWatch(); renderOfficer(); renderRsl(); renderTips(); renderDraw(); if (currentView() === 'dash') renderDash(); }
function reEvalIfNeeded() { if (!S.eval || Object.keys(S.eval).length !== S.receipts.length) reEval(); }

/* ================= events ================= */
function wire() {
  $('#cases').innerHTML = CASES.map((c, i) => `<button type="button" class="case" data-case="${i}"><span class="tag ${c.cls}">${c.tag}</span><b>${c.t}</b><small>${c.d}</small></button>`).join('');
  $('#cases').addEventListener('click', e => { const b = e.target.closest('[data-case]'); if (b) CASES[+b.dataset.case].run(); });
  $('#mmForm').addEventListener('submit', e => { e.preventDefault(); const a = parseFloat($('#mmAmt').value); if (!(a > 0)) return;
    if ($('#mmNet').value === 'card') payCard($('#mmCode').value.trim(), a, $('#mmL4').value.trim()); else payMerchant($('#mmNet').value, $('#mmCode').value.trim(), a); });
  $('#mmSeller').addEventListener('change', mmFill); $('#mmNet').addEventListener('change', mmFill);
  $('#streamFilters').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) { S.filter = b.dataset.f; renderShield(); } });
  $('#shopFilters').addEventListener('click', e => { const b = e.target.closest('[data-sf]'); if (b) { WF.sig = b.dataset.sf; renderWatch(); } });
  $('#wfType').innerHTML = '<option value="all">All problems</option>' + Object.entries(REPTYPE).filter(x => x[0] !== 'got').map(x => `<option value="${x[0]}">${x[1]}</option>`).join('');
  const wfSet = () => { WF.days = +$('#wfDays').value; WF.area = $('#wfArea').value; WF.who = $('#wfWho').value; WF.ctype = $('#wfType').value; renderWatch(); };
  ['#wfDays', '#wfArea', '#wfWho', '#wfType'].forEach(id => $(id).addEventListener('change', wfSet));
  $('#wfReset').addEventListener('click', () => { Object.assign(WF, {days:30, area:'all', who:'all', sig:'all', ctype:'all'}); $('#wfDays').value = '30'; $('#wfWho').value = 'all'; $('#wfType').value = 'all'; renderWatch(); });
  document.addEventListener('click', e => { const c = e.target.closest('[data-csv]'); if (c) watchCSV(c.dataset.csv); });
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
  document.addEventListener('click', e => { const b = e.target.closest('[data-dl]'); if (!b) return; const k = b.dataset.dl;
    ({'shield-csv':shieldCSV, 'fakes-csv':fakesCSV, 'shield-pdf':shieldPDF, 'work-csv':() => officerCSV('work'), 'review-csv':() => officerCSV('review'), 'complaints-csv':() => officerCSV('complaints'), 'tax-csv':taxCSV, 'officer-pdf':officerPDF,
      'entries-csv':() => drawCSV('entries'), 'winners-csv':() => drawCSV('winners'), 'draw-pdf':drawPDF, 'activity-csv':activityCSV, 'cash-csv':cashCSV})[k](); });
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
  $('#phBtn').addEventListener('click', toggleContacts);
  $('#tipSmsBtn').addEventListener('click', sendTipSms);
  $('#remBtn').addEventListener('click', sendReminders);
  $('#dashFilters').addEventListener('click', e => { const b = e.target.closest('[data-dd]'); if (b) { DASHD = +b.dataset.dd; renderDash(); } });
  $('#dashPdf').addEventListener('click', dashPDF);
  $('#dashBrief').addEventListener('click', () => { location.hash = '#bohlale'; setTimeout(() => bhRunTask('briefing'), 300); });
  ['#lgWho', '#lgAct', '#lgDays'].forEach(id => $(id).addEventListener('change', () => renderLogs(true)));
  let lgT; $('#lgQ').addEventListener('input', () => { clearTimeout(lgT); lgT = setTimeout(() => renderLogs(true), 350); });
  ['#sxKind', '#sxPaid', '#sxRec', '#sxFlag', '#sxSeller', '#sxMarket', '#sxFrom', '#sxTo', '#sxSort'].forEach(id => $(id).addEventListener('change', () => renderSearch(true)));
  let sxT; ['#sxQ', '#sxMin', '#sxMax'].forEach(id => $(id).addEventListener('input', () => { clearTimeout(sxT); sxT = setTimeout(() => renderSearch(true), 350); }));
  $('#sxReset').addEventListener('click', () => { ['#sxQ', '#sxKind', '#sxPaid', '#sxRec', '#sxFlag', '#sxSeller', '#sxMarket', '#sxFrom', '#sxTo', '#sxMin', '#sxMax'].forEach(id => $(id).value = ''); $('#sxSort').value = 'new'; renderSearch(true); });
  $('#sxMore').addEventListener('click', () => renderSearch(false)); $('#sxCsv').addEventListener('click', searchCSV); $('#sxPdf').addEventListener('click', searchPDF);
  $('#lgMore').addEventListener('click', () => renderLogs(false)); $('#lgCsv').addEventListener('click', logsCSV); $('#lgPdf').addEventListener('click', logsPDF);
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
  let rzT; window.addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(() => { if (currentView() === 'watch') renderWatch(); if (currentView() === 'dash') renderDash(); }, 250); });
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
// What Mohlomi AI (public/agent.js) may use. Everything else stays private to this file.
window.RASITI_APP = {HOOK, TITLES, PH, RASITI_CODE, currentView, setMode, uNav, uRender, uDial, ussdSend, openChat, waSend,
  api, esc, fT, stamp, makePdf, withBusy, toast, user:() => API.user};
boot();
})();
