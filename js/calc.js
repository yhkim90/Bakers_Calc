(function (global) {
  "use strict";

  var APP_VERSION = "20260915a";

  function uid() {
    return global.crypto && global.crypto.randomUUID
      ? global.crypto.randomUUID()
      : "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function num(value) {
    var n = Number(value);
    return isFinite(n) ? n : 0;
  }

  function doughPct(item) {
    return (item.ingredients || []).reduce(function (sum, row) {
      return sum + num(row.pct);
    }, 0);
  }

  function flourPct(item) {
    return (item.ingredients || []).filter(function (row) { return row.isFlour; })
      .reduce(function (sum, row) { return sum + num(row.pct); }, 0);
  }

  function scale(item, pieces) {
    var pct = doughPct(item);
    var count = Math.max(1, num(pieces) || 1);
    var pieceWeight = num(item.pieceWeight);
    var totalDough = pieceWeight * count;
    var flour = pct > 0 ? totalDough / (pct / 100) : 0;
    return {
      count: count,
      pieceWeight: pieceWeight,
      totalDough: totalDough,
      doughPct: pct,
      flour: flour,
      dough: (item.ingredients || []).map(function (row) {
        return Object.assign({}, row, { g: (flour * num(row.pct)) / 100 });
      }),
      topping: (item.toppings || []).map(function (row) {
        return Object.assign({}, row, {
          g: row.mode === "bp" ? (flour * num(row.value)) / 100 : num(row.value) * count
        });
      })
    };
  }

  function grams(n) {
    return num(n).toLocaleString("ko-KR", { maximumFractionDigits: 1 }) + " g";
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function hardReload() {
    var finish = function () {
      try {
        var url = new URL(location.href);
        url.searchParams.set("v", APP_VERSION);
        url.searchParams.set("_", String(Date.now()));
        location.replace(url.toString());
      } catch (e) {
        location.reload();
      }
    };
    if (!("serviceWorker" in navigator) || !navigator.serviceWorker.getRegistrations) {
      finish();
      return;
    }
    navigator.serviceWorker.getRegistrations()
      .then(function (regs) {
        return Promise.all(regs.map(function (reg) { return reg.unregister(); }));
      })
      .then(function () {
        return global.caches ? caches.keys() : [];
      })
      .then(function (keys) {
        return Promise.all((keys || []).map(function (key) { return caches.delete(key); }));
      })
      .catch(function () {})
      .then(finish);
  }

  global.BakersCalc = {
    APP_VERSION: APP_VERSION,
    uid: uid,
    num: num,
    doughPct: doughPct,
    flourPct: flourPct,
    scale: scale,
    grams: grams,
    clone: clone,
    escapeHtml: escapeHtml,
    hardReload: hardReload
  };
})(window);
