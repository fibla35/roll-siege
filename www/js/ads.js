// Vídeos con premio (AdMob en la app; simulados en el navegador). Solo vídeos que el jugador elige ver: nunca anuncios a la fuerza.
(function (RS) {
  // IDs de PRUEBA de Google: cambiar por los de la cuenta de AdMob antes de publicar
  var REWARD_ID = 'ca-app-pub-3940256099942544/5224354917', TESTING = true;
  var Ads = RS.Ads = { ready: false, native: false, busy: false };
  function plugin() { return window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob; }
  Ads.init = function () {
    var M = plugin(); if (!M) { Ads.ready = true; return Promise.resolve(); }
    Ads.native = true;
    return M.initialize({ initializeForTesting: TESTING })
      .then(function () { return M.requestConsentInfo ? M.requestConsentInfo() : null; })
      .then(function (ci) { if (ci && ci.isConsentFormAvailable && ci.status === 'REQUIRED') return M.showConsentForm(); })
      .catch(function () {}).then(function () { Ads.ready = true; Ads.preload(); });
  };
  Ads.preload = function () { var M = plugin(); if (M) M.prepareRewardVideoAd({ adId: REWARD_ID, isTesting: TESTING }).catch(function () {}); };
  // muestra un vídeo; resuelve true si el jugador lo vio entero
  Ads.reward = function () {
    if (Ads.busy) return Promise.resolve(false); Ads.busy = true;
    var done = function (ok) { Ads.busy = false; return ok; };
    var M = plugin();
    if (M) {
      var got = false, h = null;
      return Promise.resolve(M.addListener ? M.addListener('onRewardedVideoAdReward', function () { got = true; }) : null).then(function (hh) { h = hh; return M.showRewardVideoAd(); })
        .then(function (item) { return new Promise(function (r) { setTimeout(function () { r(got || !!(item && item.amount > 0)); }, 300); }); })
        .catch(function () { if (RS.toast) RS.toast(RS.t ? RS.t('El vídeo no está disponible ahora') : 'El vídeo no está disponible ahora'); return false; })
        .then(function (ok) { try { if (h && h.remove) h.remove(); } catch (e) {} Ads.preload(); return done(ok); });
    }
    // navegador: vídeo simulado de 3 segundos
    return new Promise(function (res) {
      var d = document.createElement('div'); d.className = 'fakead';
      d.innerHTML = '<div><b>Anuncio</b><span class="fa_n">3</span><small>(simulado en el navegador)</small></div>'; document.body.appendChild(d);
      var n = 3, iv = setInterval(function () { n--; var s = d.querySelector('.fa_n'); if (s) s.textContent = n; if (n <= 0) { clearInterval(iv); d.remove(); res(done(true)); } }, 1000);
    });
  };
})(RS);
