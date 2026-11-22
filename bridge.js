(function () {
  'use strict';

  var cfg = window.__QUANTARA__ || {};
  var token = cfg.token || '';
  var accountId = cfg.accountId || '';
  var appId = cfg.appId || '32FdjBnT7wM8d88xwBoOQ';
  var balance = cfg.balance || '0';

  window.__DERIV_TOKEN__ = token;
  window.__QUANTARA_ACCOUNT_ID__ = accountId;
  window.__QUANTARA_APP_ID__ = appId;

  function fill() {
    var map = {
      apiToken: token,
      token: token,
      derivToken: token,
      accessToken: token,
      accountId: accountId,
      account_id: accountId,
      loginid: accountId,
      appId: appId,
      app_id: appId,
      derivAppId: appId
    };
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el && 'value' in el && !el.value) {
        el.value = map[id];
        try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {}
        try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fill);
  else fill();

  var otpCache = null;
  function getWsUrl() {
    if (otpCache) return otpCache;
    otpCache = fetch('https://api.derivws.com/trading/v1/options/accounts/' + encodeURIComponent(accountId) + '/otp', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Deriv-App-ID': appId,
        'Content-Type': 'application/json'
      }
    }).then(function (r) {
      return r.json().then(function (b) {
        if (!r.ok || (b.errors && b.errors.length)) {
          throw new Error((b.errors && b.errors[0].message) || 'OTP request failed (' + r.status + ')');
        }
        if (!b.data || !b.data.url) throw new Error('No WebSocket URL returned by Deriv');
        return b.data.url;
      });
    });
    return otpCache;
  }
  window.__quantaraWsUrl = getWsUrl;

  function isAuthorizedUrl(u) {
    return /otp=|api\.derivws\.com|api\.binaryws\.com/.test(String(u));
  }
  function isLegacyDerivUrl(u) {
    return /ws\.binaryws\.com|ws\.derivws\.com|wss?:\/\/ws\./.test(String(u));
  }

  var NativeWS = window.WebSocket;

  function own(obj, key, value) {
    Object.defineProperty(obj, key, { value: value, writable: true, configurable: true, enumerable: true });
  }

  function CompatWebSocket(url, protocols) {
    if (!(this instanceof CompatWebSocket)) return new CompatWebSocket(url, protocols);

    var self = this;
    this._native = null;
    this._queue = [];
    this._listeners = {};
    this._closed = false;
    own(this, 'onopen', null);
    own(this, 'onmessage', null);
    own(this, 'onerror', null);
    own(this, 'onclose', null);
    own(this, 'url', String(url));
    own(this, 'protocol', '');
    own(this, 'bufferedAmount', 0);
    own(this, 'extensions', '');

    Object.defineProperty(this, 'readyState', {
      get: function () { return self._native ? self._native.readyState : (self._closed ? 3 : 0); }
    });

    function emit(type, ev) {
      var handler = self['on' + type];
      if (typeof handler === 'function') {
        try { handler(ev); } catch (e) { console.error(e); }
      }
      (self._listeners[type] || []).slice().forEach(function (fn) {
        try { fn(ev); } catch (e) { console.error(e); }
      });
    }

    function relay(ev) { emit(ev.type, ev); }

    this.addEventListener = function (type, fn) {
      (self._listeners[type] = self._listeners[type] || []).push(fn);
    };
    this.removeEventListener = function (type, fn) {
      var list = self._listeners[type] || [];
      var i = list.indexOf(fn);
      if (i >= 0) list.splice(i, 1);
    };

    this.send = function (data) {
      var msg = null;
      try { msg = JSON.parse(data); } catch (e) {}

      if (msg && Object.prototype.hasOwnProperty.call(msg, 'authorize')) {
        var auth = {
          account_id: accountId,
          loginid: accountId,
          is_virtual: /^(D|V|DOM)/i.test(accountId) ? 1 : 0,
          currency: 'USD',
          balance: balance
        };
        emit('message', {
          data: JSON.stringify({
            msg_type: 'authorization',
            authorization: auth,
            authorize: auth,
            req_id: msg.req_id
          })
        });
        return;
      }

      if (self._native && self._native.readyState === NativeWS.OPEN) {
        return self._native.send(data);
      }
      self._queue.push(data);
      self.bufferedAmount += String(data).length;
    };

    this.close = function (code, reason) {
      self._closed = true;
      if (self._native) return self._native.close(code, reason);
      emit('close', { code: code || 1000, reason: reason || '', wasClean: true });
    };

    getWsUrl().then(function (wsUrl) {
      if (self._closed) return;
      var real = new NativeWS(wsUrl, protocols);
      self._native = real;
      real.onopen = function (e) {
        self.protocol = real.protocol;
        emit('open', e);
        self._queue.splice(0).forEach(function (d) { real.send(d); });
        self.bufferedAmount = 0;
      };
      real.onmessage = relay;
      real.onerror = relay;
      real.onclose = relay;
    }).catch(function (err) {
      emit('error', { message: err.message });
      emit('close', { code: 1006, reason: err.message, wasClean: false });
    });
  }

  CompatWebSocket.prototype = Object.create(NativeWS.prototype);

  function PatchedWebSocket(url, protocols) {
    if (isAuthorizedUrl(url)) return new NativeWS(url, protocols);
    if (isLegacyDerivUrl(url)) return new CompatWebSocket(url, protocols);
    return new NativeWS(url, protocols);
  }
  PatchedWebSocket.prototype = NativeWS.prototype;
  ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'].forEach(function (k) {
    PatchedWebSocket[k] = NativeWS[k];
  });
  PatchedWebSocket.__quantaraPatched = true;

  window.WebSocket = PatchedWebSocket;
  window.__quantaraBridgeReady = true;
})();
