(function () {
  'use strict';

  function last(a) { return a.length ? a[a.length - 1] : null; }
  function sma(a, p) {
    if (a.length < p) return null;
    var s = 0;
    for (var i = a.length - p; i < a.length; i++) s += a[i];
    return s / p;
  }
  function ema(a, p) {
    if (a.length < p) return null;
    var k = 2 / (p + 1), e = a[a.length - p];
    for (var i = a.length - p + 1; i < a.length; i++) e = a[i] * k + e * (1 - k);
    return e;
  }
  function rsi(a, p) {
    p = p || 14;
    if (a.length <= p) return null;
    var g = 0, l = 0;
    for (var i = a.length - p; i < a.length; i++) {
      var d = a[i] - a[i - 1];
      if (d > 0) g += d; else l -= d;
    }
    if (l === 0) return 100;
    var rs = (g / p) / (l / p || 0.000001);
    return 100 - 100 / (1 + rs);
  }
  function sd(a, p) {
    if (a.length < p) return null;
    var m = sma(a, p), s = 0;
    for (var i = a.length - p; i < a.length; i++) s += Math.pow(a[i] - m, 2);
    return Math.sqrt(s / p);
  }
  function streak(a) {
    if (a.length < 2) return 0;
    var dir = a[a.length - 1] > a[a.length - 2] ? 1 : -1, n = 0;
    for (var i = a.length - 1; i > 0; i--) {
      if ((a[i] > a[i - 1] ? 1 : -1) === dir) n++; else break;
    }
    return dir * n;
  }
  function roc(a, p) {
    if (a.length <= p) return null;
    var old = a[a.length - 1 - p];
    return old ? ((a[a.length - 1] - old) / old) * 100 : 0;
  }
  function delta(a, n) {
    return a.length > n ? a[a.length - 1] - a[a.length - 1 - n] : 0;
  }
  function high(a, n) {
    if (!a.length) return null;
    var v = -Infinity;
    for (var i = Math.max(0, a.length - n); i < a.length; i++) v = Math.max(v, a[i]);
    return v;
  }
  function low(a, n) {
    if (!a.length) return null;
    var v = Infinity;
    for (var i = Math.max(0, a.length - n); i < a.length; i++) v = Math.min(v, a[i]);
    return v;
  }
  function sig(action, reason, mult) {
    return { action: action, reason: reason, mult: mult || 1 };
  }

  var S = function (id, name, symbol, duration, fn) {
    return { id: id, name: name, symbol: symbol, duration: duration, fn: fn };
  };

  var STRATEGIES = [
    S('rise-fall-bot', 'Rise/Fall Momentum', 'R_100', 60, function (c) {
      var a = c.ticks; if (a.length < 5) return null;
      var m = delta(a, 3); return sig(m > 0 ? 'CALL' : 'PUT', '3-tick momentum ' + m.toFixed(3));
    }),
    S('v10-bot', 'R10 Streak Reversal', 'R_10', 180, function (c) {
      var a = c.ticks; if (a.length < 8) return null;
      var s = streak(a);
      if (Math.abs(s) >= 5) return sig(s > 0 ? 'PUT' : 'CALL', Math.abs(s) + '-streak reversal');
      return null;
    }),
    S('trading-bot', 'Core EMA Cross', 'R_100', 60, function (c) {
      var a = c.ticks, f = ema(a, 9), sl = ema(a, 21);
      if (f == null || sl == null) return null;
      return sig(f > sl ? 'CALL' : 'PUT', 'EMA9 ' + (f > sl ? 'above' : 'below') + ' EMA21');
    }),
    S('trading-bot-multi', 'Multi-Timeframe EMA', 'R_75', 120, function (c) {
      var a = c.ticks, f = ema(a, 5), m = ema(a, 15), sl = ema(a, 40);
      if (f == null || m == null || sl == null) return null;
      if (f > m && m > sl) return sig('CALL', 'EMA stack bullish');
      if (f < m && m < sl) return sig('PUT', 'EMA stack bearish');
      return null;
    }),
    S('trading-bot-pro', 'RSI Reversion Pro', 'R_50', 90, function (c) {
      var r = rsi(c.ticks, 14); if (r == null) return null;
      if (r < 32) return sig('CALL', 'RSI oversold ' + r.toFixed(1));
      if (r > 68) return sig('PUT', 'RSI overbought ' + r.toFixed(1));
      return null;
    }),
    S('trading-bot-max', 'Bollinger Breakout Max', 'R_100', 60, function (c) {
      var a = c.ticks, p = 20, m = sma(a, p), d = sd(a, p);
      if (m == null || d == null || d === 0) return null;
      var z = (last(a) - m) / d;
      if (z > 2) return sig('PUT', 'BB upper z=' + z.toFixed(2));
      if (z < -2) return sig('CALL', 'BB lower z=' + z.toFixed(2));
      return null;
    }),
    S('advanced-ai-bot', 'Multi-Signal Consensus', 'R_100', 60, function (c) {
      var a = c.ticks; if (a.length < 22) return null;
      var votes = 0;
      votes += delta(a, 3) > 0 ? 1 : -1;
      votes += (ema(a, 9) > ema(a, 21)) ? 1 : -1;
      votes += rsi(a, 14) < 50 ? 1 : -1;
      votes += streak(a) > 0 ? 1 : -1;
      if (Math.abs(votes) >= 2) return sig(votes > 0 ? 'CALL' : 'PUT', 'consensus ' + votes + '/4');
      return null;
    }),
    S('autonomous-ai-trader', 'ATR Trend Engine', 'R_100', 120, function (c) {
      var a = c.ticks, v = sd(a, 14);
      if (v == null) return null;
      var m = delta(a, 5);
      if (m > v) return sig('CALL', 'trend exceeds 1 ATR');
      if (m < -v) return sig('PUT', 'trend below -1 ATR');
      return null;
    }),
    S('quad-ai-trader', 'Quad Math Consensus', 'R_100', 60, function (c) {
      var a = c.ticks; if (a.length < 22) return null;
      var v = 0;
      v += sma(a, 5) > sma(a, 20) ? 1 : -1;
      v += rsi(a, 14) > 50 ? 1 : -1;
      v += delta(a, 2) > 0 ? 1 : -1;
      v += last(a) > sma(a, 10) ? 1 : -1;
      if (Math.abs(v) >= 3) return sig(v > 0 ? 'CALL' : 'PUT', 'quad vote ' + v + '/4');
      return null;
    }),
    S('quad-ai-trader-v2', 'Quad Momentum v2', 'R_75', 60, function (c) {
      var a = c.ticks; if (a.length < 12) return null;
      var r1 = roc(a, 2), r2 = roc(a, 5);
      if (r1 == null || r2 == null) return null;
      if (r1 > 0 && r2 > 0) return sig('CALL', 'ROC2 ' + r1.toFixed(3) + ', ROC5 ' + r2.toFixed(3));
      if (r1 < 0 && r2 < 0) return sig('PUT', 'ROC2 ' + r1.toFixed(3) + ', ROC5 ' + r2.toFixed(3));
      return null;
    }),
    S('quad-risk-aware', 'Risk-Aware Streak', 'R_25', 120, function (c) {
      var a = c.ticks, s = streak(a), v = sd(a, 10);
      if (a.length < 12 || v == null) return null;
      if (Math.abs(s) >= 3 && v < Math.abs(delta(a, 4))) return sig(s > 0 ? 'PUT' : 'CALL', 'low-vol streak fade');
      return null;
    }),
    S('quad-risk-diverse', 'Diverse Indicator Vote', 'R_100', 90, function (c) {
      var a = c.ticks; if (a.length < 22) return null;
      var v = 0;
      v += ema(a, 8) > sma(a, 21) ? 1 : -1;
      v += rsi(a, 14) < 40 ? 1 : (rsi(a, 14) > 60 ? -1 : 0);
      v += last(a) > sma(a, 30) ? 1 : -1;
      if (v >= 2) return sig('CALL', 'diverse vote ' + v);
      if (v <= -2) return sig('PUT', 'diverse vote ' + v);
      return null;
    }),
    S('triple-ai-consensus', 'Triple Math Consensus', 'R_100', 60, function (c) {
      var a = c.ticks; if (a.length < 22) return null;
      var v = 0;
      v += delta(a, 3) > 0 ? 1 : -1;
      v += ema(a, 9) > ema(a, 21) ? 1 : -1;
      v += last(a) > sma(a, 20) ? 1 : -1;
      if (Math.abs(v) === 3) return sig(v > 0 ? 'CALL' : 'PUT', 'unanimous ' + v + '/3');
      return null;
    }),
    S('grok-multimarket', 'Multi-Market Momentum', 'R_50', 90, function (c) {
      var a = c.ticks, m = sma(a, 10);
      if (m == null) return null;
      return sig(last(a) > m ? 'CALL' : 'PUT', 'price vs SMA10');
    }),
    S('grok-multimarket-v2', 'Multi-Market Breakout', 'Boom 1000 Index', 120, function (c) {
      var a = c.ticks; if (a.length < 16) return null;
      var h = high(a, 15), l = low(a, 15), x = last(a);
      if (x > h) return sig('CALL', '15-tick high breakout');
      if (x < l) return sig('PUT', '15-tick low breakout');
      return null;
    }),
    S('grok-deriv-engine', 'Tick Velocity Engine', 'R_100', 60, function (c) {
      var a = c.ticks; if (a.length < 6) return null;
      var v1 = delta(a, 1), v2 = delta(a, 4) / 4;
      if (v1 > v2 && v1 > 0) return sig('CALL', 'velocity expanding up');
      if (v1 < v2 && v1 < 0) return sig('PUT', 'velocity expanding down');
      return null;
    }),
    S('ttt-fullmarket', 'Full-Market Trend', 'R_100', 180, function (c) {
      var a = c.ticks, f = ema(a, 20), s = ema(a, 50);
      if (f == null || s == null) return null;
      return sig(f > s ? 'CALL' : 'PUT', 'EMA20/50 trend');
    }),
    S('ttt-milli', 'Milli Scalper', '1HZ100V', 30, function (c) {
      var a = c.ticks; if (a.length < 4) return null;
      var s = streak(a);
      if (s >= 2) return sig('CALL', '2-tick up streak');
      if (s <= -2) return sig('PUT', '2-tick down streak');
      return null;
    }),
    S('legacy-bot', 'Classic Martingale', 'R_100', 60, function (c) {
      var a = c.ticks;
      if (a.length < 6) return null;
      var st = c.state, dir = delta(a, 2) > 0 ? 'CALL' : 'PUT';
      st.losses = st.losses || 0;
      var mult = Math.min(8, Math.pow(2, st.losses));
      return sig(dir, 'martingale level ' + st.losses, mult);
    }),
    S('legacy-bot-v2', 'Classic Grid', 'R_50', 120, function (c) {
      var a = c.ticks; if (a.length < 12) return null;
      var step = (high(a, 20) - low(a, 20)) / 8 || 0.01;
      var x = last(a), base = c.state.gridBase == null ? x : c.state.gridBase;
      c.state.gridBase = base;
      var level = Math.round((x - base) / step);
      if (level === c.state.lastLevel) return null;
      c.state.lastLevel = level;
      return sig(level > 0 ? 'PUT' : 'CALL', 'grid level ' + level);
    })
  ];

  function MathEngine(cfg, opts) {
    this.cfg = cfg || {};
    this.opts = opts || {};
    this.strategies = [];
    this.ticks = {};
    this.state = {};
    this.running = false;
    this.connected = false;
    this.req = 1;
    this.pending = {};
    this.pendingContracts = {};
    this.session = { trades: 0, pnl: 0, won: 0, lost: 0 };
    this.busy = false;
    this.lastProposalAt = 0;
    this.backoffUntil = 0;
    this.currentBalance = Number(cfg.balance) || 0;
    this.startBalance = 0;
    this.targetHit = false;
    this.targetType = '';
    this.onStatus = function () {};
    this.onLog = function () {};
    this.onUpdate = function () {};
    this.log = this.log.bind(this);
  }

  MathEngine.prototype.log = function (msg, kind) {
    this.onLog({ msg: msg, kind: kind || '', time: new Date().toLocaleTimeString() });
  };

  MathEngine.prototype.enable = function (id, on) {
    var s = STRATEGIES.filter(function (x) { return x.id === id; })[0];
    if (!s) return;
    var i = this.strategies.indexOf(s);
    if (on && i < 0) this.strategies.push(s);
    if (!on && i >= 0) this.strategies.splice(i, 1);
  };

  MathEngine.prototype.connect = function () {
    var self = this;
    var cfg = this.cfg;
    if (!cfg.token || !cfg.accountId) {
      return Promise.reject(new Error('Missing Deriv session; connect on the main page first.'));
    }
    return fetch('https://api.derivws.com/trading/v1/options/accounts/' + encodeURIComponent(cfg.accountId) + '/otp', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + cfg.token,
        'Deriv-App-ID': cfg.appId || '32FdjBnT7wM8d88xwBoOQ',
        'Content-Type': 'application/json'
      }
    }).then(function (r) { return r.json().then(function (b) {
      if (!r.ok || (b.errors && b.errors.length)) throw new Error((b.errors && b.errors[0].message) || 'OTP failed');
      return b.data.url;
    }); }).then(function (url) {
      self.log('Opening WebSocket ' + String(url).slice(0, 70));
      return new Promise(function (resolve, reject) {
        var ws = new WebSocket(url);
        self.socket = ws;
        var done = false;
        ws.onopen = function () {
          done = true;
          self.connected = true;
          self.onStatus('Connected', true);
          self.log('Secure WebSocket connected', 'ok');
          var symbols = {};
          self.strategies.forEach(function (s) { symbols[s.symbol] = 1; });
          Object.keys(symbols).forEach(function (sym) {
            self.send({ ticks: sym, subscribe: 1 });
            self.log('Streaming ' + sym);
          });
          self.send({ balance: 1, subscribe: 1 });
          resolve();
        };
        ws.onmessage = function (e) { self.handle(JSON.parse(e.data)); };
        ws.onerror = function () { self.log('WebSocket error', 'bad'); if (!done) { done = true; reject(new Error('WebSocket error')); } };
        ws.onclose = function (e) { self.connected = false; self.onStatus('Disconnected', false); self.log('WebSocket closed ' + (e && e.code ? e.code + ' ' + String(e.reason || '').slice(0, 60) : ''), 'bad'); };
      });
    });
  };

  MathEngine.prototype.send = function (payload) {
    var self = this;
    if (!this.socket || this.socket.readyState !== 1) return Promise.reject(new Error('Not connected'));
    var id = this.req++;
    payload.req_id = id;
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () { delete self.pending[id]; reject(new Error('Request timed out')); }, 15000);
      self.pending[id] = { resolve: resolve, reject: reject, timer: timer };
      self.socket.send(JSON.stringify(payload));
    });
  };

  MathEngine.prototype.handle = function (msg) {
    var self = this;
    if (msg.req_id && this.pending[msg.req_id]) {
      var p = this.pending[msg.req_id];
      delete this.pending[msg.req_id];
      clearTimeout(p.timer);
      if (msg.error) p.reject(new Error(msg.error.message || 'API error')); else p.resolve(msg);
    }
    if (msg.msg_type === 'tick' && msg.tick) {
      var sym = msg.tick.symbol, price = Number(msg.tick.quote);
      if (!isFinite(price)) return;
      var arr = this.ticks[sym] || (this.ticks[sym] = []);
      arr.push(price);
      if (arr.length > 500) arr.shift();
      this.evaluate(sym);
    }
    if (msg.msg_type === 'balance' && msg.balance) {
      this.currentBalance = Number(msg.balance.balance) || 0;
      if (!this.startBalance && this.currentBalance > 0) {
        this.startBalance = this.currentBalance;
        this.log('Starting balance ' + this.currentBalance.toFixed(2), 'ok');
      }
      this.checkTarget();
      this.onUpdate(this.snapshot());
    }
    if (msg.msg_type === 'proposal_open_contract' && msg.proposal_open_contract) {
      var c = msg.proposal_open_contract;
      var sid = this.pendingContracts[c.contract_id];
      if (sid && (c.is_sold || ['won', 'lost', 'sold'].indexOf(c.status) >= 0)) {
        delete this.pendingContracts[c.contract_id];
        var pl = Number(c.profit_loss || 0);
        this.session.pnl += pl;
        this.session.trades++;
        if (pl > 0) this.session.won++; else this.session.lost++;
        var st = this.state[sid] || (this.state[sid] = {});
        st.pnl = (st.pnl || 0) + pl;
        st.trades = (st.trades || 0) + 1;
        st.losses = pl > 0 ? 0 : (st.losses || 0) + 1;
        this.log('Contract ' + c.contract_id + ' ' + c.status + ' P/L ' + pl.toFixed(2), pl > 0 ? 'ok' : 'bad');
        this.onUpdate(this.snapshot());
      }
    }
  };

  MathEngine.prototype.checkTarget = function () {
    if (this.targetHit || !this.startBalance || !this.currentBalance) return;
    var tp = Number(this.opts.tpMultiple) || 0;
    var sl = Number(this.opts.slMultiple) || 0;
    if (tp > 0 && this.currentBalance >= this.startBalance * tp) {
      this.hitTarget('Take profit', tp);
    } else if (sl > 0 && this.currentBalance <= this.startBalance * sl) {
      this.hitTarget('Stop loss', sl);
    }
  };

  MathEngine.prototype.hitTarget = function (label, multiple) {
    this.targetHit = true;
    this.targetType = label;
    this.running = false;
    this.onStatus(label + ' ' + multiple + 'x', label === 'Take profit');
    this.log(label + ' reached at ' + multiple + 'x starting balance - closing all trades', label === 'Take profit' ? 'ok' : 'bad');
    var self = this;
    Object.keys(this.pendingContracts).forEach(function (id) {
      self.send({ sell: Number(id), price: 0 }).then(function () {
        self.log('Closed contract #' + id, 'ok');
      }).catch(function (e) {
        self.log('Could not close #' + id + ': ' + e.message, 'bad');
      });
    });
    this.pendingContracts = {};
    this.onUpdate(this.snapshot());
  };

  MathEngine.prototype.resetSession = function () {
    this.targetHit = false;
    this.targetType = '';
    this.startBalance = 0;
    this.session = { trades: 0, pnl: 0, won: 0, lost: 0 };
    this.state = {};
    this.log('New session armed; waiting for balance', 'ok');
  };

  MathEngine.prototype.snapshot = function () {
    var self = this;
    var rows = this.strategies.map(function (s) {
      var st = self.state[s.id] || {};
      return {
        id: s.id, name: s.name, symbol: s.symbol, lastSignal: st.lastSignal || '-',
        lastReason: st.lastReason || '-', trades: st.trades || 0, pnl: st.pnl || 0,
        losses: st.losses || 0
      };
    });
    return {
      rows: rows, session: this.session, connected: this.connected, running: this.running,
      balance: this.currentBalance, startBalance: this.startBalance,
      targetHit: this.targetHit, targetType: this.targetType,
      tpTarget: this.startBalance * (Number(this.opts.tpMultiple) || 0),
      slTarget: this.startBalance * (Number(this.opts.slMultiple) || 0)
    };
  };

  MathEngine.prototype.evaluate = function (symbol) {
    if (!this.running) return;
    var self = this;
    var isDemo = /^(D|V|DOM)/i.test(this.cfg.accountId || '');
    if (!isDemo && !this.opts.realArmed) return;
    if (this.targetHit) return;
    if (Date.now() < this.backoffUntil) return;
    if (this.busy) return;

    this.strategies.forEach(function (s) {
      if (s.symbol !== symbol) return;
      var arr = self.ticks[symbol] || [];
      var st = self.state[s.id] || (self.state[s.id] = {});
      var now = Date.now();
      if (now - (st.lastTradeAt || 0) < (self.opts.cooldown || 5000)) return;
      var out;
      try { out = s.fn({ ticks: arr, state: st, symbol: symbol }); } catch (e) { return; }
      if (!out || !out.action) return;
      st.lastSignal = out.action;
      st.lastReason = out.reason;
      st.lastTradeAt = now;
      self.onUpdate(self.snapshot());
      self.trade(s, out);
    });
  };

  MathEngine.prototype.trade = function (strategy, signal) {
    var self = this;
    var now = Date.now();
    var spacing = this.opts.globalSpacing || 3000;
    if (this.busy || now - this.lastProposalAt < spacing) return;
    this.busy = true;
    this.lastProposalAt = now;

    var minPct = Number(this.opts.minStakePct) || 1;
    var maxPct = Number(this.opts.maxStakePct) || 5;
    if (maxPct < minPct) maxPct = minPct;
    var pct = Math.min(maxPct, minPct * (signal.mult || 1));
    var stake = Math.max(0.35, Math.round((this.currentBalance * pct / 100) * 100) / 100);
    if (!isFinite(stake) || this.currentBalance <= 0) {
      this.log('No balance available for stake sizing', 'bad');
      this.busy = false;
      return;
    }
    var duration = this.opts.duration || strategy.duration || 60;
    this.log(strategy.name + ': ' + signal.action + ' - ' + signal.reason + ' @ ' + stake.toFixed(2) + ' (' + pct.toFixed(2) + '% of balance)');
    this.send({
      proposal: 1, amount: stake, basis: 'stake', contract_type: signal.action,
      currency: 'USD', duration: duration, duration_unit: 's',
      underlying_symbol: strategy.symbol
    }).then(function (p) {
      if (!p.proposal || !p.proposal.id) throw new Error('No proposal');
      return self.send({ buy: p.proposal.id, price: Number(p.proposal.ask_price || stake) });
    }).then(function (b) {
      if (!b.buy) throw new Error('Buy failed');
      self.pendingContracts[b.buy.contract_id] = strategy.id;
      self.send({ proposal_open_contract: 1, contract_id: b.buy.contract_id, subscribe: 1 }).catch(function () {});
      self.log('Bought #' + b.buy.contract_id + ' ' + strategy.name, 'ok');
      if (self.targetHit) {
        self.send({ sell: Number(b.buy.contract_id), price: 0 }).then(function () {
          self.log('Closed late contract #' + b.buy.contract_id, 'ok');
        }).catch(function (e) {
          self.log('Could not close late #' + b.buy.contract_id + ': ' + e.message, 'bad');
        });
      }
    }).catch(function (e) {
      if (/rate limit/i.test(e.message)) {
        self.backoffUntil = Date.now() + 30000;
        self.log('Deriv rate limit - pausing proposals for 30s', 'warn');
      } else {
        self.log('Trade rejected: ' + e.message, 'bad');
      }
    }).then(function () {
      self.busy = false;
    });
  };

  MathEngine.prototype.start = function () {
    this.running = true;
    this.onStatus('Running', true);
    this.log('Math engine started', 'ok');
  };
  MathEngine.prototype.stop = function () {
    this.running = false;
    this.onStatus('Stopped', false);
    this.log('Math engine stopped', 'bad');
  };

  window.QuantaraMath = {
    strategies: STRATEGIES,
    MathEngine: MathEngine,
    indicators: { sma: sma, ema: ema, rsi: rsi, sd: sd, streak: streak, roc: roc, delta: delta, high: high, low: low }
  };
})();
