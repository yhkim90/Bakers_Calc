(function (global) {
  "use strict";

  var STORAGE_KEY = "bakers-calc-v2";
  var OLD_KEYS = ["xi-bakery-manual-v1"];
  var memoryStore = {};

  function readStore(key) {
    try { return localStorage.getItem(key); }
    catch (e) {
      return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : null;
    }
  }

  function writeStore(key, value) {
    try { localStorage.setItem(key, value); }
    catch (e) { memoryStore[key] = value; }
  }

  function parseState(raw) {
    if (!raw) return null;
    try {
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.items)) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function isBareLegacy(state) {
    if (!state || !state.items || state.items.length !== 1) return false;
    var item = state.items[0];
    return item.id === "chestnut-loaf" || item.name === "밤식빵";
  }

  function loadRaw() {
    var current = parseState(readStore(STORAGE_KEY));
    if (current) return current;
    for (var i = 0; i < OLD_KEYS.length; i += 1) {
      var legacy = parseState(readStore(OLD_KEYS[i]));
      if (legacy && !isBareLegacy(legacy)) return legacy;
    }
    return { items: [] };
  }

  function save(state) {
    writeStore(STORAGE_KEY, JSON.stringify(state));
  }

  function mergeCatalog(state, catalogItems) {
    var next = { items: [] };
    var seen = {};
    var existing = (state && state.items) ? state.items : [];
    existing.forEach(function (item) {
      next.items.push(item);
      seen[item.id] = true;
    });
    (catalogItems || []).forEach(function (item) {
      if (!seen[item.id]) next.items.push(item);
    });
    if (!next.items.length) next.items = catalogItems.slice();
    return next;
  }

  function restoreExamItems(state, catalogItems) {
    var custom = (state.items || []).filter(function (item) {
      return String(item.id).indexOf("exam-") !== 0;
    });
    return { items: (catalogItems || []).concat(custom) };
  }

  function exportState(state) {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "제빵-배합.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  global.BakersStore = {
    STORAGE_KEY: STORAGE_KEY,
    loadRaw: loadRaw,
    save: save,
    mergeCatalog: mergeCatalog,
    restoreExamItems: restoreExamItems,
    exportState: exportState
  };
})(window);
