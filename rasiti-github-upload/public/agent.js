/* Mohlomi AI: Rasiti's test agent (owners and admins only). Mohlomi means "the wise one".
   You type what to test; the AI (or a built-in plan) turns it into steps; this file runs the steps on Rasiti's own pages
   and demo phones while you watch, then reports what passed and failed and writes the run to the system log.
   Safety: "Look only" never uses the phones or buttons that change data; clearing, resetting, switching users off
   and passwords are always blocked. Downloads are produced and checked, but not saved. */
(function () {
  const A = window.RASITI_APP; if (!A) return;
  const {TITLES, PH, RASITI_CODE, currentView, setMode, uNav, uRender, uDial, ussdSend, openChat, waSend, api, esc, fT, stamp, makePdf, withBusy, toast} = A;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const norm = s => String(s || '').toLowerCase().replace(/[’'"“”]/g, '').replace(/\s+/g, ' ').trim();
  const q = s => document.querySelector(s);
  const ALWAYS_BLOCK = /clear entire|clear all|reset demo|reset password|switch off|delete|change password|sign out|my password/i;
  const CHANGES = /draw \d|draw winners|pay as|pay now|approve|reject|send|add user|generate|mark contacted|book visit|refer|load demo|subscribe|confirm|show contacts|hide contacts|undo|redo|reminder/i;
  const PHONE = {customer:'c', seller:'t'};
  const PAGE_NAME = v => (TITLES[v] || v).split(' ·')[0];

  /* ---------- built-in plans (used for the quick buttons, and when the AI is not available) ---------- */
  const go = (page, say) => ({do:'go', page, say:say || `Open ${PAGE_NAME(page)}`});
  const see = (text, say, where) => ({do:'expect', text, where:where || 'page', say:say || `Check that "${text}" is shown`});
  const dl = (text, say) => ({do:'download', text, say:say || `Download "${text}"`});
  const BUILTIN = {
    health: {title:'Quick health check of every page', changes:false, steps:[
      go('dash'), see('Needs attention', 'Dashboard shows the "Needs attention" list'),
      go('shield'), see('Rules', 'Fraud Shield shows its rules'),
      go('watch'), see('Map of shop ratings', 'Community watch shows the ratings map'),
      go('officer'), see('Worklist', 'Officer console shows the worklist'), see('RSL e-services link', 'The simulated RSL e-services link is there'),
      go('draw'), see('Draw 3 winners', 'Monthly draw page is ready'),
      go('bohlale'), see('Rules Bohlale follows', 'Bohlale AI page opens'),
      go('users'), see('Add a user', 'Users and activity opens'),
      go('logs'), see('Download', 'System log opens'),
      go('phones'), see('Guided cases', 'Phones page opens with the guided cases'),
      go('guide'), see('Steps', 'Start here opens')]},
    downloads: {title:'Check every download and report', changes:false, steps:[
      go('shield'), dl('Receipts CSV'), dl('Fake codes CSV'), dl('PDF report', 'Fraud Shield PDF report'),
      go('watch'), dl('Ratings CSV'),
      go('officer'), dl('Worklist CSV'),
      go('draw'), dl('Entries CSV'),
      go('logs'), dl('Log CSV'), dl('Log PDF')]},
    phones: {title:'Test the phones: USSD and WhatsApp', changes:true, steps:[
      go('phones'),
      {do:'ussd', phone:'customer', inputs:[], say:'Customer dials *999#'}, see('I am a customer', 'The main menu appears', 'customer'),
      {do:'ussd', phone:'customer', inputs:['3', '3'], say:'Customer opens Questions, then Tip of the day'}, see('Tip of the day', 'Tip of the day is shown', 'customer'),
      {do:'ussd', phone:'seller', inputs:['2', '3307', '2580'], say:'Seller 3307 signs in on *999# with code and PIN'}, see('Record cash sale', 'The seller menu appears', 'seller'),
      {do:'ussd', phone:'seller', inputs:['2', '3307', '0000'], say:'A wrong PIN is refused'}, see('Wrong PIN', 'Rasiti refuses the wrong PIN', 'seller'),
      {do:'ussd', phone:'seller', inputs:['2', '3307', '2580', '3'], say:'Seller opens My sales book'}, see('Sales', 'Sales totals are shown', 'seller'),
      {do:'select', field:'mmSeller', option:'Ntate Thabo', say:'Choose seller Ntate Thabo'}, {do:'select', field:'mmNet', option:'M-Pesa', say:'Choose M-Pesa'},
      {do:'click', text:'Pay as the customer', say:'Customer pays M30 to a seller\'s M-Pesa merchant code'}, see('Rasiti receipt', 'The receipt arrives by itself', 'customer'),
      {do:'whatsapp', phone:'customer', message:'TIP', say:'Customer sends TIP on WhatsApp'}, see('Tip of the day', 'Rasiti replies with the tip', 'customer')]},
    privacy: {title:'Check show and hide contacts', changes:true, steps:[
      go('draw'), {do:'click', text:'Show contacts', say:'Admin clicks Show contacts'}, see('Hide contacts', 'Full numbers are now shown'),
      go('logs'), see('Showed full phone numbers', 'The system log recorded it'),
      go('draw'), {do:'click', text:'Hide contacts', say:'Admin hides the numbers again'}, see('Show contacts', 'Numbers are hidden again')]}
  };
  function pickBuiltin(text, allow) {
    const t = norm(text);
    if (/contact|privacy|phone number|mask/.test(t)) return allow ? 'privacy' : 'health';
    if (/ussd|whatsapp|\*999|phone|customer|seller|tip|sms|receipt/.test(t)) return allow ? 'phones' : 'health';
    if (/download|pdf|csv|report|export/.test(t)) return 'downloads';
    return 'health';
  }

  /* ---------- what the AI may use: the real headings, buttons and fields of every page ---------- */
  function fieldName(el) {
    if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
    if (el.placeholder) return el.placeholder;
    const l = el.labels && el.labels[0]; if (l) { const t = [...l.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(' ').trim(); if (t) return t; }
    return el.id ? '#' + el.id : '';
  }
  function uiMap() {
    const out = {}; const txt = e => e.textContent.replace(/\s+/g, ' ').trim(); const uniq = a => [...new Set(a.filter(Boolean))];
    document.querySelectorAll('section[data-view]').forEach(sec => { const v = sec.dataset.view; if (v === 'agent') return;
      out[v] = {title:PAGE_NAME(v), headings:uniq([...sec.querySelectorAll('h3')].map(txt)).slice(0, 16),
        buttons:uniq([...sec.querySelectorAll('button,a.btn,[data-dl],[data-csv]')].map(txt).filter(x => x.length > 1 && x.length < 40 && !/^[\d*#]$/.test(x))).slice(0, 36),
        fields:uniq([...sec.querySelectorAll('input:not([type=hidden]),select,textarea')].map(fieldName)).slice(0, 16)}; });
    out.topbar = {buttons:['Show contacts', 'Hide contacts', 'Undo', 'Redo', 'Refresh']};
    return out;
  }

  /* ---------- finding things on screen ---------- */
  const visible = e => !!(e && (e.offsetWidth || e.offsetHeight || e.getClientRects().length)) && getComputedStyle(e).visibility !== 'hidden';
  const roots = () => [...document.querySelectorAll('section[data-view]:not([hidden]), .topbar, #login:not([hidden]), #dbBanner:not([hidden])')];
  const mine = e => e.closest('.ag-live') || e.closest('section[data-view="agent"]');
  function findClick(text) {
    const want = norm(text); let best = null, score = 0;
    for (const r of roots()) r.querySelectorAll('button,a,[role=button],summary,[data-dl],[data-csv],.wk-row,.wc-row').forEach(e => {
      if (mine(e) || !visible(e)) return;
      const t = norm(e.textContent || e.getAttribute('aria-label') || e.value);
      const s = t === want ? 3 : t.startsWith(want) ? 2 : t.includes(want) ? 1 : 0;
      if (s > score) { score = s; best = e; } });
    return best;
  }
  function findField(name) {
    if (/^#[\w-]+$/.test(name) && q(name)) return q(name);
    if (/^[\w-]+$/.test(name) && document.getElementById(name)) return document.getElementById(name);
    const want = norm(name); let best = null;
    for (const r of roots()) r.querySelectorAll('input:not([type=hidden]),select,textarea').forEach(e => { if (best || mine(e) || !visible(e)) return;
      const t = norm(fieldName(e) + ' ' + (e.labels && e.labels[0] ? e.labels[0].textContent : ''));
      if (t.includes(want)) best = e; });
    return best;
  }
  function flash(e) { try { e.scrollIntoView({block:'center', behavior:'smooth'}); e.classList.add('ag-hl'); setTimeout(() => e.classList.remove('ag-hl'), 1200); } catch {} }
  function pageText() { return roots().map(r => r.innerText).join('\n') + '\n' + (q('#pageTitle')?.textContent || '') + '\n' + RUN.toasts.join('\n'); }
  function phoneText(k) {
    if (PH[k].mode === 'ussd') return q('#' + k + 'Screen').textContent;
    return [...q('#' + k + 'Log').querySelectorAll('.bb.bot')].slice(-3).map(b => b.innerText).join('\n');
  }

  /* ---------- running one step ---------- */
  async function waitScreen(k, prev) {
    const t0 = Date.now();
    while (Date.now() - t0 < 12000) { await sleep(150);
      const busy = !q('#' + k + 'Busy').hidden; const now = q('#' + k + 'Screen').textContent;
      if (!busy && now !== prev && !/Running USSD|Sending/.test(now)) { await sleep(250); return q('#' + k + 'Screen').textContent; } }
    throw new Error('The phone did not answer within 12 seconds.');
  }
  async function needPhones() { if (currentView() !== 'phones') { location.hash = '#phones'; await sleep(700); } }
  const short = s => String(s || '').replace(/\s*\n\s*/g, ' | ').slice(0, 220);

  async function runStep(st) {
    const allow = RUN.allow;
    switch (st.do) {
      case 'go': {
        location.hash = '#' + st.page; await sleep(800);
        if (!q('#login').hidden) throw new Error('This page asks for a sign-in.');
        const sec = q(`section[data-view="${st.page}"]`);
        if (!sec || sec.hidden) throw new Error(`${PAGE_NAME(st.page)} did not open (no access for this account?).`);
        return `Opened "${q('#pageTitle').textContent}"`;
      }
      case 'click': {
        if (ALWAYS_BLOCK.test(st.text)) return {blocked:`"${st.text}" is always blocked for Mohlomi AI.`};
        if (!allow && CHANGES.test(st.text)) return {blocked:`"${st.text}" changes data. Choose "Allow test changes" to let Mohlomi AI press it.`};
        const e = findClick(st.text); if (!e) throw new Error(`Could not find "${st.text}" on this page.`);
        if (ALWAYS_BLOCK.test(e.textContent)) return {blocked:`"${e.textContent.trim()}" is always blocked for Mohlomi AI.`};
        flash(e); await sleep(250); e.click(); await sleep(900);
        return `Clicked "${e.textContent.replace(/\s+/g, ' ').trim().slice(0, 60)}"`;
      }
      case 'type': case 'select': {
        const e = findField(st.field); if (!e) throw new Error(`Could not find the box "${st.field}".`);
        if (/pass/i.test(e.type + e.id + st.field)) return {blocked:'Password boxes are always blocked for Mohlomi AI.'};
        flash(e);
        if (st.do === 'select') { const o = [...e.options].find(o => norm(o.textContent).includes(norm(st.option)));
          if (!o) throw new Error(`"${st.option}" is not one of the choices.`); e.value = o.value; }
        else e.value = st.value;
        e.dispatchEvent(new Event('input', {bubbles:true})); e.dispatchEvent(new Event('change', {bubbles:true})); await sleep(500);
        return st.do === 'select' ? `Chose "${st.option}"` : `Typed "${st.value}"`;
      }
      case 'ussd': {
        if (!allow) return {blocked:'Phone tests can create demo records. Choose "Allow test changes" to run them.'};
        await needPhones(); const k = PHONE[st.phone] || 'c';
        setMode(k, 'ussd'); uNav(k, 'end'); await sleep(200);
        const p = PH[k]; p.u = 'dial'; p.dial = RASITI_CODE; uRender(k);
        let txt = await waitScreen(k, (uDial(k), q('#' + k + 'Screen').textContent));
        for (const v of st.inputs || []) {
          if (!(PH[k].u === 'live' || PH[k].u === 'session')) return `Session ended before "${v}": ${short(txt)}`;
          const prev = q('#' + k + 'Screen').textContent; q('#' + k + 'In').value = v; ussdSend(k); txt = await waitScreen(k, prev);
        }
        return `Screen: ${short(txt)}`;
      }
      case 'whatsapp': {
        if (!allow) return {blocked:'Phone tests can create demo records. Choose "Allow test changes" to run them.'};
        await needPhones(); const k = PHONE[st.phone] || 'c';
        setMode(k, 'wa'); if (PH[k].w !== 'chat') { openChat(k, true); await sleep(600); }
        const n = q('#' + k + 'Log').querySelectorAll('.bb.bot').length; waSend(k, st.message);
        const t0 = Date.now(); while (q('#' + k + 'Log').querySelectorAll('.bb.bot').length <= n && Date.now() - t0 < 10000) await sleep(150);
        await sleep(400); const bots = q('#' + k + 'Log').querySelectorAll('.bb.bot');
        if (bots.length <= n) throw new Error('Rasiti did not reply within 10 seconds.');
        return `Reply: ${short(bots[bots.length - 1].innerText)}`;
      }
      case 'expect': case 'expectNot': {
        const hay = st.where === 'page' ? pageText() : phoneText(PHONE[st.where] || 'c');
        const has = norm(hay).includes(norm(st.text));
        if (st.do === 'expect' && !has) throw new Error(`"${st.text}" was not found${st.where === 'page' ? ' on the page' : ' on the ' + st.where + ' phone'}.`);
        if (st.do === 'expectNot' && has) throw new Error(`"${st.text}" was found but should not be there.`);
        return st.do === 'expect' ? `Found "${st.text}"` : `"${st.text}" is not there, as expected`;
      }
      case 'download': {
        const e = findClick(st.text); if (!e) throw new Error(`Could not find the "${st.text}" button on this page.`);
        const n = RUN.files.length; flash(e); e.click();
        const t0 = Date.now(); while (RUN.files.length <= n && Date.now() - t0 < 25000) await sleep(200);
        if (RUN.files.length <= n) throw new Error('No file was produced within 25 seconds.');
        await sleep(300); return `Produced ${RUN.files[RUN.files.length - 1]}`;
      }
      case 'wait': await sleep((st.seconds || 1) * 1000); return `Waited ${st.seconds || 1} s`;
    }
    throw new Error('Unknown step.');
  }

  /* ---------- a run: hooks for downloads, toasts and errors, then the steps ---------- */
  const RUN = {on:false, stop:false, files:[], toasts:[], errors:[], allow:false};
  function hooks(on) {
    if (on) {
      A.HOOK.save = name => RUN.files.push(name);
      A.HOOK.toast = m => { RUN.toasts.push(String(m)); if (RUN.toasts.length > 6) RUN.toasts.shift(); };
      RUN.onErr = ev => RUN.errors.push(ev.message || String(ev.reason && ev.reason.message || ev.reason));
      window.addEventListener('error', RUN.onErr); window.addEventListener('unhandledrejection', RUN.onErr);
    } else { A.HOOK.save = null; A.HOOK.toast = null;
      if (RUN.onErr) { window.removeEventListener('error', RUN.onErr); window.removeEventListener('unhandledrejection', RUN.onErr); } }
  }
  const ICON = {ok:'✓', bad:'✗', blk:'!', run:'…', wait:''};
  function stepsHtml(steps) {
    return steps.map((s, i) => `<li><span class="ag-ic ${s.st || ''}" aria-label="${s.st === 'ok' ? 'passed' : s.st === 'bad' ? 'failed' : s.st === 'blk' ? 'blocked' : s.st === 'run' ? 'running' : 'waiting'}">${s.st ? ICON[s.st] : i + 1}</span>`
      + `<div><div class="what">${esc(s.say || s.do)}</div>${s.det ? `<div class="det">${esc(s.det)}</div>` : ''}</div><span class="t">${s.ms != null ? (s.ms / 1000).toFixed(1) + 's' : ''}</span></li>`).join('');
  }
  function live(plan) {
    let box = q('.ag-live');
    if (!plan) { box?.remove(); return; }
    if (!box) { box = document.createElement('div'); box.className = 'ag-live'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite');
      box.innerHTML = '<header><img src="img/mohlomi-96.png" alt="" style="width:22px;height:22px;border-radius:50%;background:#fff"><span></span><button type="button" data-stop>Stop</button></header><ol class="ag-steps"></ol>'; document.body.appendChild(box);
      box.querySelector('[data-stop]').onclick = () => { RUN.stop = true; }; }
    const done = plan.steps.filter(s => s.st && s.st !== 'run').length;
    box.querySelector('header span').textContent = `Mohlomi AI · ${done}/${plan.steps.length} · ${plan.title}`;
    const ol = box.querySelector('ol'); ol.innerHTML = stepsHtml(plan.steps);
    const cur = ol.querySelector('.ag-ic.run'); if (cur) cur.closest('li').scrollIntoView({block:'nearest'});
  }

  let LAST = null;
  async function run(instruction, opts) {
    if (RUN.on) return; opts = opts || {};
    const allow = q('input[name=agMode]:checked')?.value === 'change';
    const status = t => { const s = q('#agStatus'); if (s) s.textContent = t; };
    let plan = null, mode = 'builtin', note = '', finished = false;
    RUN.on = true; RUN.stop = false; q('#agRun').disabled = true; q('#agStop').hidden = false;
    try {
      if (opts.builtin) { plan = BUILTIN[opts.builtin]; note = 'Built-in test plan.'; }
      else {
        status('Planning the test…');
        try { const r = await api('agent', {op:'plan', instruction, allowChanges:allow, ui:uiMap()});
          if (r.mode === 'ai' && r.plan) { plan = r.plan; mode = 'ai'; note = `Planned by AI${r.model ? ' (' + r.model + ')' : ''} from your words.`; }
          else note = r.note || ''; }
        catch (e) { note = e.message + '. Using a built-in test plan.'; }
        if (!plan) { const k = pickBuiltin(instruction, allow); plan = BUILTIN[k]; note = (note ? note + ' ' : '') + `Built-in plan: ${plan.title}.`; }
      }
      if (plan.changes && !allow) note += ' This plan uses the phones or changes data, so those steps are blocked in "Look only".';
      plan = {title:plan.title, steps:plan.steps.map(s => ({...s}))};
      RUN.files = []; RUN.toasts = []; RUN.errors = []; RUN.allow = allow; hooks(true);
      const t0 = Date.now(); live(plan); status('Running… you can watch it work.');
      for (const s of plan.steps) {
        if (RUN.stop) { s.st = 'blk'; s.det = 'Stopped by you.'; continue; }
        const prev = plan.steps[plan.steps.indexOf(s) - 1];
        if (prev && prev.st === 'blk' && /^expect/.test(s.do)) { s.st = 'blk'; s.det = 'Skipped: the step before it was blocked.'; live(plan); continue; }
        s.st = 'run'; live(plan); const a = Date.now(); const errs = RUN.errors.length;
        try { const r = await runStep(s); if (r && r.blocked) { s.st = 'blk'; s.det = r.blocked; } else { s.st = 'ok'; s.det = r || ''; } }
        catch (e) { s.st = 'bad'; s.det = e.message; }
        if (RUN.errors.length > errs) { s.st = 'bad'; s.det = (s.det ? s.det + '\n' : '') + 'Page error: ' + RUN.errors.slice(errs).join('; ').slice(0, 200); }
        s.ms = Date.now() - a; live(plan);
      }
      const secs = Math.round((Date.now() - t0) / 1000);
      const c = st => plan.steps.filter(s => s.st === st).length;
      LAST = {instruction:instruction || plan.title, title:plan.title, steps:plan.steps, mode, note, allow, secs, passed:c('ok'), failed:c('bad'), blocked:c('blk'), at:new Date()};
      api('agent', {op:'report', instruction:LAST.instruction, title:plan.title, passed:LAST.passed, failed:LAST.failed, blocked:LAST.blocked, allowChanges:allow, mode, seconds:secs}, {quiet:true}).catch(() => {});
      HIST.unshift(LAST); HIST.length = Math.min(HIST.length, 8); finished = true;
    } catch (e) { toast('Mohlomi AI could not run: ' + e.message);
    } finally {
      hooks(false); RUN.on = false; q('#agRun').disabled = false; q('#agStop').hidden = true; status('');
      setTimeout(() => live(null), 2500);
      if (finished) { location.hash = '#agent'; setTimeout(render, 50); toast(LAST.failed ? `Mohlomi AI finished: ${LAST.failed} step${LAST.failed === 1 ? '' : 's'} failed` : 'Mohlomi AI finished: all checks passed'); }
    }
  }

  /* ---------- the Test agent page ---------- */
  const HIST = [];
  function render() {
    const ch = q('#agChips'); if (ch && !ch.children.length) ch.innerHTML = '<span class="note" style="align-self:center">Quick tests:</span>' + Object.entries(BUILTIN).map(([k, b]) => `<button type="button" class="btn small" data-b="${k}">${esc(b.title)}${b.changes ? ' *' : ''}</button>`).join('')
      + '<span class="note" style="align-self:center">* needs "Allow test changes"</span>';
    const r = q('#agResult');
    if (LAST) { r.hidden = false; q('#agTitle').textContent = LAST.title;
      q('#agSum').innerHTML = `<span class="pill p-ok">${LAST.passed} passed</span><span class="pill ${LAST.failed ? 'p-bad' : 'p-mute'}">${LAST.failed} failed</span><span class="pill ${LAST.blocked ? 'p-warn' : 'p-mute'}">${LAST.blocked} blocked</span><span class="pill p-info">${LAST.secs} s</span><span class="pill p-mute">${LAST.allow ? 'Test changes allowed' : 'Look only'}</span>`;
      q('#agNote').textContent = LAST.note; q('#agSteps').innerHTML = stepsHtml(LAST.steps); }
    const h = q('#agHist');
    if (h) h.innerHTML = HIST.length ? '<tr><th>When</th><th>Test</th><th>Result</th></tr>' + HIST.map(x => `<tr><td>${fT(x.at.getTime())}</td><td>${esc(x.title)}</td><td>${x.failed ? `<span class="pill p-bad">${x.failed} failed</span>` : '<span class="pill p-ok">Passed</span>'}</td></tr>`).join('')
      : '<tr><td class="note">No runs yet in this session. Past runs are in the system log ("Ran Mohlomi AI tests").</td></tr>';
  }
  function reportText(x) {
    return `Mohlomi AI test report (Rasiti)\n${x.title}\nAsked: ${x.instruction}\nWhen: ${x.at.toLocaleString()} · ${x.secs} s · ${x.allow ? 'test changes allowed' : 'look only'}\nResult: ${x.passed} passed, ${x.failed} failed, ${x.blocked} blocked\n${x.note}\n\n`
      + x.steps.map((s, i) => `${i + 1}. [${s.st === 'ok' ? 'PASS' : s.st === 'bad' ? 'FAIL' : 'BLOCKED'}] ${s.say || s.do}${s.det ? '\n   ' + s.det.replace(/\n/g, '\n   ') : ''}`).join('\n');
  }
  function pdf(x) {
    return withBusy(() => makePdf(`rasiti-mohlomi-test-${stamp()}.pdf`, 'Mohlomi AI test report', [
      {t:'h', v:x.title},
      {t:'p', v:`Asked: ${x.instruction}. Run on ${x.at.toLocaleString()} in ${x.secs} seconds (${x.allow ? 'test changes allowed' : 'look only'}). ${x.note}`},
      {t:'kpis', v:[[x.passed, 'Passed'], [x.failed, 'Failed'], [x.blocked, 'Blocked'], [x.steps.length, 'Steps']]},
      {t:'table', cols:[['#', 10], ['Result', 22], ['Step', 70], ['Details', 80]], rows:x.steps.map((s, i) => [String(i + 1), s.st === 'ok' ? 'Passed' : s.st === 'bad' ? 'Failed' : 'Blocked', s.say || s.do, (s.det || '').slice(0, 220)])}
    ]), 'PDF downloaded');
  }
  function init() {
    const sec = q('section[data-view="agent"]'); if (!sec) return;
    q('#agRun').onclick = () => { const t = q('#agQ').value.trim(); if (!t) { toast('Type what you want Mohlomi AI to test, or pick a quick test.'); q('#agQ').focus(); return; } run(t); };
    q('#agStop').onclick = () => { RUN.stop = true; };
    q('#agQ').addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) q('#agRun').click(); });
    q('#agChips').addEventListener('click', e => { const b = e.target.closest('[data-b]'); if (b) run(BUILTIN[b.dataset.b].title, {builtin:b.dataset.b}); });
    q('#agAgain').onclick = () => { if (!LAST) return; const k = Object.keys(BUILTIN).find(k => BUILTIN[k].title === LAST.instruction); k ? run(LAST.instruction, {builtin:k}) : run(LAST.instruction); };
    q('#agCopy').onclick = () => { if (!LAST) return; navigator.clipboard?.writeText(reportText(LAST)).then(() => toast('Report copied'), () => toast('Could not copy')); };
    q('#agPdf').onclick = () => { if (LAST) pdf(LAST); };
    render();
  }
  window.AGENT = {render, run, builtin:BUILTIN, uiMap};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
