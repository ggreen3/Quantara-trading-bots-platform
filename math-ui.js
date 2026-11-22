(function () {
  'use strict';

  var id = window.__QUANTARA_BOT_ID__ || 'super';
  var all = id === 'super' || id === 'all';
  var catalog = window.QuantaraMath.strategies;
  var chosen = all ? catalog.slice() : catalog.filter(function (s) { return s.id === id; });

  if (!chosen.length) {
    document.body.innerHTML = '<h3 style="color:#fb7185;font-family:system-ui;padding:40px">Unknown math bot: ' + id + '</h3>';
    return;
  }

  var cfg = window.__QUANTARA__ || {};
  var isDemo = /^(D|V|DOM)/i.test(cfg.accountId || '');
  var title = all ? 'Super Bot - All Math Strategies' : chosen[0].name;

  var rows = chosen.map(function (s) {
    return '<tr data-id="' + s.id + '">' +
      '<td><input type="checkbox" class="en" checked></td>' +
      '<td>' + s.name + '</td>' +
      '<td>' + s.symbol + '</td>' +
      '<td class="sig">-</td>' +
      '<td class="why">-</td>' +
      '<td class="tr">0</td>' +
      '<td class="pl">0.00</td>' +
      '</tr>';
  }).join('');

  document.body.innerHTML =
    '<style>' +
    'body{background:#0a0c10;color:#e8eef8;font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:0;padding:24px}' +
    'h1{font-size:24px;margin:0 0 4px}.sub{color:#91a0b8;margin:0 0 18px}' +
    '.panel{background:#121826;border:1px solid #263049;border-radius:12px;padding:16px;margin-bottom:16px}' +
    '.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px}' +
    'label{display:block;color:#91a0b8;font-size:12px;margin-bottom:4px}' +
    'input,select{width:100%;background:#0b1220;color:#e8eef8;border:1px solid #2a3650;border-radius:8px;padding:8px;box-sizing:border-box}' +
    'button{border:0;border-radius:8px;padding:10px 16px;font-weight:700;cursor:pointer;background:#6ee7b7;color:#07111e;margin-right:8px}' +
    'button.stop{background:#fb7185}button:disabled{opacity:.4;cursor:not-allowed}' +
    'table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:8px;border-bottom:1px solid #263049}' +
    'th{color:#91a0b8;font-size:12px}.sig{font-weight:700}.CALL{color:#6ee7b7}.PUT{color:#fb7185}' +
    '.log{height:220px;overflow:auto;background:#080d17;border:1px solid #263049;border-radius:8px;padding:10px;font:12px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap}' +
    '.ok{color:#6ee7b7}.bad{color:#fb7185}.warn{color:#fbbf24}' +
    '.stats{display:flex;gap:18px;flex-wrap:wrap;margin-top:6px}.stats b{font-size:18px}' +
    '</style>' +
    '<h1>' + title + '</h1>' +
    '<p class="sub">Pure math strategies - no AI calls. Account: ' + (cfg.accountId || '-') + ' (' + (isDemo ? 'demo' : 'real') + ')</p>' +
    '<div class="panel">' +
    '<div class="grid">' +
    '<div><label>Stake (USD)</label><input id="stake" type="number" min="0.35" step="0.35" value="1"></div>' +
    '<div><label>Duration (s)</label><input id="duration" type="number" min="15" value="' + (all ? 60 : chosen[0].duration) + '"></div>' +
    '<div><label>Cooldown (s)</label><input id="cooldown" type="number" min="1" value="' + (all ? 30 : 15) + '"></div>' +
    '<div><label>Max trades</label><input id="maxTrades" type="number" min="1" value="20"></div>' +
    '<div><label>Loss limit (USD)</label><input id="lossLimit" type="number" min="1" value="50"></div>' +
    '</div>' +
    (isDemo ? '' : '<p class="warn">Real account: trading stays locked until you arm it. <label style="display:inline"><input id="realArmed" type="checkbox" style="width:auto"> Arm real trading</label></p>') +
    '<p><button id="start">Start</button><button id="stop" class="stop" disabled>Stop</button><span id="status">Connecting...</span></p>' +
    '<div class="stats"><span>Trades <b id="sTrades">0</b></span><span>P/L <b id="sPnl">0.00</b></span><span>Wins <b id="sWon">0</b></span><span>Losses <b id="sLost">0</b></span></div>' +
    '</div>' +
    '<div class="panel"><table><thead><tr><th>On</th><th>Strategy</th><th>Market</th><th>Signal</th><th>Reason</th><th>Trades</th><th>P/L</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '<div class="panel"><div class="log" id="log"></div></div>';

  var $ = function (i) { return document.getElementById(i); };
  var engine = new window.QuantaraMath.MathEngine(cfg, { globalSpacing: all ? 5000 : 3000 });
  chosen.forEach(function (s) { engine.enable(s.id, true); });

  function opts() {
    return {
      stake: Number($('stake').value) || 1,
      duration: Number($('duration').value) || 60,
      cooldown: (Number($('cooldown').value) || 5) * 1000,
      maxTrades: Number($('maxTrades').value) || 20,
      lossLimit: Number($('lossLimit').value) || 50,
      realArmed: !$('realArmed') || $('realArmed').checked
    };
  }

  engine.onStatus = function (text, ok) {
    $('status').textContent = text;
    $('status').className = ok ? 'ok' : 'bad';
  };
  engine.onLog = function (e) {
    var el = $('log');
    el.innerHTML += '[' + e.time + '] <span class="' + e.kind + '">' + e.msg + '</span>\n';
    el.scrollTop = el.scrollHeight;
  };
  engine.onUpdate = function (s) {
    if (s.balance !== undefined) {
      engine.onLog({ msg: 'Balance ' + s.currency + ' ' + s.balance, kind: '', time: new Date().toLocaleTimeString() });
      return;
    }
    var sess = s.session || {};
    $('sTrades').textContent = sess.trades || 0;
    $('sPnl').textContent = (sess.pnl || 0).toFixed(2);
    $('sWon').textContent = sess.won || 0;
    $('sLost').textContent = sess.lost || 0;
    (s.rows || []).forEach(function (r) {
      var tr = document.querySelector('tr[data-id="' + r.id + '"]');
      if (!tr) return;
      tr.querySelector('.sig').innerHTML = '<span class="' + (r.lastSignal === 'CALL' ? 'CALL' : r.lastSignal === 'PUT' ? 'PUT' : '') + '">' + r.lastSignal + '</span>';
      tr.querySelector('.why').textContent = r.lastReason;
      tr.querySelector('.tr').textContent = r.trades;
      tr.querySelector('.pl').textContent = (r.pnl || 0).toFixed(2);
    });
  };

  document.querySelectorAll('input.en').forEach(function (box) {
    box.addEventListener('change', function () {
      engine.enable(box.closest('tr').getAttribute('data-id'), box.checked);
    });
  });

  $('start').onclick = function () {
    engine.opts = opts();
    engine.start();
    $('start').disabled = true;
    $('stop').disabled = false;
  };
  $('stop').onclick = function () {
    engine.stop();
    $('start').disabled = false;
    $('stop').disabled = true;
  };

  engine.connect().then(function () {
    engine.opts = opts();
    engine.start();
    $('start').disabled = true;
    $('stop').disabled = false;
  }).catch(function (e) {
    $('status').textContent = 'Connect failed: ' + e.message;
    $('status').className = 'bad';
    engine.onLog({ msg: 'Connect failed: ' + e.message, kind: 'bad', time: new Date().toLocaleTimeString() });
  });
})();
