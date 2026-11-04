/* Rasiti machine learning: small, explainable models that learn from Rasiti's own data every time it changes.
   One file for the browser (charts, Forecasts page, Bohlale) and the server (scheduled email reports and alerts).

   1. Forecast (Holt-Winters, additive, weekly season): learns the level, the trend and the day-of-week pattern of a daily
      series (receipts or sales). Its three smoothing settings are LEARNED by testing many combinations on the history and
      keeping the one with the smallest one-day-ahead error. Gives a forecast with an 80% range.
   2. Backtest: hides the last 14 days, trains on the rest, forecasts the hidden days and reports the error (MAPE), so the
      accuracy shown is measured, not assumed.
   3. Risk of a late return or payment: logistic regression trained on every past return (was it filed and paid on time?)
      with a few plain features. Shows the learned weights, so an officer can see why a seller scores high.
   4. Anomalies: days or sellers far outside what the model expected (z-score), for alerts.
   Nothing here decides anything on its own: forecasts and scores only rank what an officer looks at first. */
(function (w) {
  const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  const sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) * (x - m)))); };

  // Fit additive Holt-Winters with season s. Returns the learned model, or a simple-smoothing model for short series.
  function fit(y, s) {
    s = s || 7; y = y.map(v => Math.max(0, Number(v) || 0));
    if (y.length < 2 * s + 2) { // too short for a weekly pattern: simple exponential smoothing
      let best = null;
      for (const a of [0.1, 0.2, 0.3, 0.5, 0.7]) { let l = y[0] || 0, sse = 0; const res = [];
        for (let t = 1; t < y.length; t++) { const e = y[t] - l; res.push(e); sse += e * e; l = l + a * e; }
        if (!best || sse < best.sse) best = {kind:'ses', alpha:a, beta:0, gamma:0, level:l, trend:0, seas:Array(s).fill(0), s, sse, res, n:y.length}; }
      best.sd = sd(best.res); return best;
    }
    const L0 = mean(y.slice(0, s)), T0 = (mean(y.slice(s, 2 * s)) - L0) / s, S0 = y.slice(0, s).map(v => v - L0);
    let best = null;
    for (const a of [0.05, 0.1, 0.2, 0.3, 0.4, 0.6]) for (const b of [0, 0.02, 0.05, 0.1]) for (const g of [0.05, 0.1, 0.2, 0.3, 0.5]) {
      let l = L0, tr = T0; const se = S0.slice(); let sse = 0; const res = [];
      for (let t = s; t < y.length; t++) {
        const f = l + tr + se[t % s], e = y[t] - f; res.push(e); sse += e * e;
        const lPrev = l; l = a * (y[t] - se[t % s]) + (1 - a) * (l + tr); tr = b * (l - lPrev) + (1 - b) * tr; se[t % s] = g * (y[t] - l) + (1 - g) * se[t % s];
      }
      if (!best || sse < best.sse) best = {kind:'hw', alpha:a, beta:b, gamma:g, level:l, trend:tr, seas:se, s, sse, res, n:y.length};
    }
    best.sd = Math.max(sd(best.res.slice(-28)), sd(best.res)); return best;
  }
  // Forecast h steps after the end of the series. lo/hi = 80% range (1.28 standard errors, widening with the horizon).
  function forecast(m, h) { const out = [];
    for (let k = 1; k <= h; k++) { const t = m.n - 1 + k; const yhat = Math.max(0, m.level + k * m.trend + m.seas[t % m.s]);
      const se = m.sd * Math.sqrt(1 + (k - 1) * m.alpha * m.alpha); out.push({k, yhat, lo:Math.max(0, yhat - 1.28 * se), hi:yhat + 1.28 * se}); }
    return out; }
  // Measured accuracy: train without the last h days, forecast them, compare.
  function backtest(y, h, s) { h = h || 14; if (y.length < h + 2 * (s || 7) + 2) return null;
    const m = fit(y.slice(0, -h), s), f = forecast(m, h), act = y.slice(-h);
    const ape = act.map((v, i) => v > 0 ? Math.abs(v - f[i].yhat) / v : null).filter(x => x != null);
    const inRange = act.filter((v, i) => v >= f[i].lo && v <= f[i].hi).length;
    return {days:h, mape:Math.round(mean(ape) * 100), mae:Math.round(mean(act.map((v, i) => Math.abs(v - f[i].yhat)))), coverage:Math.round(inRange / h * 100)}; }
  // Day-of-week pattern the model learned (Mon..Sun), as % above or below an average day.
  function weekPattern(m, firstDay) { if (m.kind !== 'hw') return null; const base = Math.max(1, m.level);
    const out = Array(7).fill(0); for (let i = 0; i < m.s; i++) { const dow = (new Date(firstDay + i * 86400000).getDay() + 6) % 7; out[dow] = Math.round(m.seas[i % m.s] / base * 100); } return out; }
  // How unusual the latest days are compared with what the model expected one day ahead (z-score of the mean residual).
  function anomaly(m, lastN) { lastN = lastN || 7; const r = m.res.slice(-lastN); if (!r.length || !m.sd) return {z:0, change:0};
    return {z:+(mean(r) / (m.sd / Math.sqrt(r.length))).toFixed(1), change:mean(r)}; }

  // Logistic regression with L2 regularisation, trained by gradient descent on standardised features.
  function logistic(X, y, opt) { opt = opt || {}; const n = X.length, d = n ? X[0].length : 0; const l2 = opt.l2 ?? 0.3, lr = opt.lr ?? 0.3, it = opt.iters ?? 600;
    const mu = Array.from({length:d}, (_, j) => mean(X.map(x => x[j]))), sg = Array.from({length:d}, (_, j) => sd(X.map(x => x[j])) || 1);
    const Z = X.map(x => x.map((v, j) => (v - mu[j]) / sg[j])); let wts = Array(d).fill(0), b = Math.log((mean(y) + 0.05) / (1.05 - mean(y)));
    const sig = z => 1 / (1 + Math.exp(-z));
    for (let k = 0; k < it; k++) { const gw = Array(d).fill(0); let gb = 0;
      for (let i = 0; i < n; i++) { const p = sig(b + Z[i].reduce((a, v, j) => a + v * wts[j], 0)); const e = p - y[i]; gb += e; for (let j = 0; j < d; j++) gw[j] += e * Z[i][j]; }
      b -= lr * gb / Math.max(1, n); wts = wts.map((v, j) => v - lr * (gw[j] / Math.max(1, n) + l2 * v / Math.max(1, n))); }
    const predict = x => sig(b + x.reduce((a, v, j) => a + (v - mu[j]) / sg[j] * wts[j], 0));
    const acc = n ? Math.round(mean(X.map((x, i) => (predict(x) >= 0.5) === (y[i] === 1) ? 1 : 0)) * 100) : null;
    return {weights:wts, bias:b, mu, sg, predict, n, accuracy:acc, positives:y.filter(v => v === 1).length}; }

  w.RASITI_ML = {fit, forecast, backtest, weekPattern, anomaly, logistic, mean, sd};
})(typeof window !== 'undefined' ? window : globalThis);
