(function () {
  "use strict";

  var calc = window.BakersCalc;
  var store = window.BakersStore;
  var catalog = window.BakersCatalog;
  var root = document.getElementById("app");
  var state = { items: [] };
  var draft = null;
  var pieceCount = 2;
  var doneSteps = {};
  var ready = false;
  var bootError = "";

  function findItem(id) {
    return state.items.find(function (item) { return item.id === id; });
  }

  function nameLines(name) {
    return calc.escapeHtml(name || "이름 없는 품목").replace(/\(/g, "<br>(");
  }

  function persist() { store.save(state); }

  function parseHash() {
    var raw = location.hash.replace(/^#/, "") || "/";
    var split = raw.split("?");
    var path = split[0];
    var query = split[1] || "";
    return {
      parts: path.split("/").filter(Boolean),
      params: new URLSearchParams(query)
    };
  }

  function go(hash) { location.hash = hash; }

  function tabBar(active) {
    return '<nav class="tabbar">' +
      '<button type="button" class="' + (active === "items" ? "on" : "") + '" data-go="/">품목</button>' +
      '<button type="button" class="' + (active === "manuals" ? "on" : "") + '" data-go="/manuals">매뉴얼</button>' +
      "</nav>";
  }

  function itemSwitch(item, which) {
    return '<div class="switch">' +
      '<button type="button" class="' + (which === "mix" ? "on" : "") + '" data-go="/item/' + item.id + '">배합</button>' +
      '<button type="button" class="' + (which === "manual" ? "on" : "") + '" data-go="/item/' + item.id + '/steps">매뉴얼</button>' +
      "</div>";
  }

  function bindNav() {
    root.querySelectorAll("[data-go]").forEach(function (el) {
      el.addEventListener("click", function () { go(el.getAttribute("data-go")); });
    });
    root.querySelectorAll("[data-reload]").forEach(function (el) {
      el.addEventListener("click", function (event) {
        event.preventDefault();
        calc.hardReload();
      });
    });
  }

  function render() {
    if (!ready) {
      root.innerHTML = '<header class="topbar"><span></span><h1>제빵 계산</h1><span></span></header>' +
        '<p class="lede">' + (bootError || "공개문제 배합을 불러오는 중입니다.") + "</p>";
      return;
    }
    var parsed = parseHash();
    var parts = parsed.parts;
    var params = parsed.params;

    if (parts[0] === "manuals") {
      draft = null;
      root.innerHTML = renderManualList() + tabBar("manuals");
      bindNav();
      return;
    }
    if (parts[0] === "new") {
      if (!draft || draft._mode !== "new") draft = Object.assign(catalog.blankItem(), { _mode: "new" });
      root.innerHTML = renderEditor(draft, true) + tabBar("items");
      bindEditor(draft);
      return;
    }
    if (parts[0] === "item" && parts[1]) {
      var item = findItem(parts[1]);
      if (!item) { go("/"); return; }
      if (parts[2] === "edit") {
        if (!draft || draft.id !== item.id || draft._mode !== "edit") {
          draft = Object.assign(calc.clone(item), { _mode: "edit" });
        }
        root.innerHTML = renderEditor(draft, false) + tabBar("items");
        bindEditor(draft);
        return;
      }
      if (parts[2] === "calc") {
        pieceCount = Number(params.get("n")) || item.defaultCount || pieceCount || 2;
        root.innerHTML = renderCalc(item) + tabBar("items");
        bindCalc(item);
        return;
      }
      if (parts[2] === "result") {
        pieceCount = Number(params.get("n")) || item.defaultCount || pieceCount || 2;
        root.innerHTML = renderResult(item) + tabBar("items");
        bindNav();
        return;
      }
      if (parts[2] === "steps") {
        root.innerHTML = renderSteps(item) + tabBar("manuals");
        bindSteps(item);
        return;
      }
      draft = null;
      root.innerHTML = renderManual(item) + tabBar("items");
      bindManual(item);
      return;
    }
    draft = null;
    root.innerHTML = renderList() + tabBar("items");
    bindList();
  }

  function renderList() {
    var rows = state.items.map(function (item) {
      var topping = item.toppings.length ? " · 토핑 " + item.toppings.length + "종" : "";
      return '<a class="item-link" href="#/item/' + item.id + '">' +
        "<strong>" + nameLines(item.name) + "</strong>" +
        "<span>분할 " + calc.escapeHtml(item.pieceWeight) + "g · 반죽합 " + calc.doughPct(item).toFixed(1) + "%" + topping + "</span>" +
        "</a>";
    }).join("");
    return '<header class="topbar">' +
      '<button class="ghost" type="button" data-reload>새로고침</button>' +
      " <h1>품목</h1><span></span></header>" +
      '<p class="lede"><span class="lede-line">제빵기능사 공개문제 20종을 기본으로 넣었습니다.</span>' +
      '<span class="lede-line">입력값은 이 휴대폰에만 저장됩니다.</span></p>' +
      '<div class="list">' + rows + "</div>" +
      '<button class="btn btn-primary" id="add-item">새 품목 등록</button>' +
      '<div class="footer-actions">' +
      '<button type="button" id="export-data">배합 내보내기</button>' +
      '<button type="button" id="import-data">배합 가져오기</button>' +
      '<button type="button" id="restore-exam">공개문제 20종 다시 넣기</button>' +
      '<input id="import-file" class="hidden" type="file" accept="application/json">' +
      "</div>" +
      '<p class="muted" style="text-align:center;margin-top:16px">화면 버전 ' + calc.APP_VERSION + "</p>";
  }

  function renderManualList() {
    var rows = state.items.map(function (item) {
      var n = (item.steps || []).length;
      return '<a class="item-link" href="#/item/' + item.id + '/steps">' +
        "<strong>" + nameLines(item.name) + "</strong>" +
        "<span>" + (n ? n + "단계 절차" : "절차 없음 · 눌러서 입력") + "</span></a>";
    }).join("");
    return '<header class="topbar">' +
      '<button class="ghost" type="button" data-reload>새로고침</button>' +
      " <h1>매뉴얼</h1><span></span></header>" +
      '<p class="lede"><span class="lede-line">품목별 베이킹 절차입니다.</span>' +
      '<span class="lede-line">단계를 누르면 오늘 진행을 표시합니다.</span></p>' +
      '<div class="list">' + rows + "</div>";
  }

  function renderManual(item) {
    var flour = calc.flourPct(item);
    return '<header class="topbar">' +
      '<button class="ghost" data-go="/">뒤로</button>' +
      "<h2>" + calc.escapeHtml(item.name) + "</h2>" +
      '<button class="ghost" data-go="/item/' + item.id + '/edit">수정</button></header>' +
      itemSwitch(item, "mix") +
      '<div class="pills">' +
      '<span class="pill">분할 ' + calc.escapeHtml(item.pieceWeight) + "g</span>" +
      '<span class="pill">반죽 ' + calc.doughPct(item).toFixed(1) + "%</span>" +
      '<span class="pill">밀가루 ' + flour.toFixed(1) + "%</span></div>" +
      '<div class="card" style="margin-top:16px"><span class="muted">공정 메모</span>' +
      "<div>" + calc.escapeHtml(item.notes || "메모가 없습니다.") + "</div></div>" +
      '<button class="btn btn-primary" data-go="/item/' + item.id + '/calc">오늘 분량 계산</button>' +
      '<button class="btn btn-secondary" id="duplicate">이 품목 복제</button>' +
      '<button class="btn btn-danger" id="delete-item">품목 삭제</button>';
  }

  function ingredientRow(row) {
    return '<div class="row" data-id="' + row.id + '">' +
      '<input type="text" data-k="name" value="' + calc.escapeHtml(row.name) + '" placeholder="재료명">' +
      '<input type="number" inputmode="decimal" data-k="pct" value="' + row.pct + '" step="0.1" placeholder="%">' +
      '<input type="checkbox" data-k="flour" title="밀가루 기준"' + (row.isFlour ? " checked" : "") + ">" +
      '<button type="button" class="icon-btn" data-remove="ingredient" aria-label="재료 삭제">×</button></div>';
  }

  function toppingRow(row) {
    return '<div class="row topping" data-id="' + row.id + '">' +
      '<input type="text" data-k="name" value="' + calc.escapeHtml(row.name) + '" placeholder="토핑명">' +
      '<select data-k="mode">' +
      '<option value="bp"' + (row.mode === "bp" ? " selected" : "") + ">밀가루 %</option>" +
      '<option value="piece"' + (row.mode === "piece" ? " selected" : "") + ">개당 g</option>" +
      "</select>" +
      '<input type="number" inputmode="decimal" data-k="value" value="' + row.value + '" step="0.1">' +
      '<button type="button" class="icon-btn" data-remove="topping" aria-label="토핑 삭제">×</button></div>';
  }

  function stepEditRow(row, index) {
    return '<div class="step-edit" data-id="' + row.id + '">' +
      '<div class="step-edit-head"><span class="step-num">' + (index + 1) + "</span>" +
      '<input type="text" data-k="title" value="' + calc.escapeHtml(row.title) + '" placeholder="단계 이름">' +
      '<input type="number" inputmode="numeric" data-k="minutes" value="' + calc.escapeHtml(row.minutes) + '" placeholder="분" min="0">' +
      '<button type="button" class="icon-btn" data-remove="step" aria-label="단계 삭제">×</button></div>' +
      '<textarea data-k="detail" placeholder="간단한 작업 요령">' + calc.escapeHtml(row.detail) + "</textarea>" +
      '<div class="step-move"><button type="button" data-move="-1">위로</button>' +
      '<button type="button" data-move="1">아래로</button></div></div>';
  }

  function renderSteps(item) {
    var done = doneSteps[item.id] || {};
    var steps = item.steps || [];
    if (!steps.length) {
      return '<header class="topbar"><button class="ghost" data-go="/manuals">뒤로</button>' +
        "<h2>" + calc.escapeHtml(item.name) + "</h2><span></span></header>" +
        itemSwitch(item, "manual") +
        '<p class="lede">아직 절차가 없습니다. 수정 화면에서 단계를 추가하세요.</p>' +
        '<button class="btn btn-primary" data-go="/item/' + item.id + '/edit">절차 입력하기</button>';
    }
    var cards = steps.map(function (row, index) {
      return '<button type="button" class="step-card' + (done[row.id] ? " done" : "") + '" data-step="' + row.id + '">' +
        '<span class="step-num">' + (index + 1) + "</span>" +
        '<span class="step-body"><strong>' + calc.escapeHtml(row.title) + "</strong>" +
        (row.minutes ? "<small>" + calc.escapeHtml(row.minutes) + "분</small>" : "") +
        "<span>" + calc.escapeHtml(row.detail) + "</span></span></button>";
    }).join("");
    return '<header class="topbar"><button class="ghost" data-go="/manuals">뒤로</button>' +
      "<h2>" + calc.escapeHtml(item.name) + "</h2><span></span></header>" +
      itemSwitch(item, "manual") +
      '<p class="lede">' + calc.escapeHtml(item.name) + " · 끝난 단계는 누르면 표시됩니다.</p>" +
      '<div class="procedure">' + cards + "</div>" +
      '<button class="btn btn-secondary" id="reset-steps">처음부터</button>' +
      '<button class="btn btn-secondary" data-go="/item/' + item.id + '/edit">절차 수정</button>';
  }

  function renderEditor(item, isNew) {
    var flour = calc.flourPct(item);
    var warn = Math.abs(flour - 100) > 0.05
      ? '<p class="warn">밀가루로 표시된 재료 합이 ' + flour.toFixed(1) + "%입니다. 보통 100%가 기준입니다.</p>"
      : "";
    return '<header class="topbar">' +
      '<button class="ghost" data-go="' + (isNew ? "/" : "/item/" + item.id) + '">뒤로</button>' +
      "<h2>" + (isNew ? "품목 등록" : "품목 수정") + "</h2><span></span></header>" +
      '<form id="edit-form" class="stack">' +
      '<label class="field"><span>품목명</span>' +
      '<input name="name" type="text" value="' + calc.escapeHtml(item.name) + '" placeholder="예: 단팥빵" required></label>' +
      '<label class="field"><span>발효 후 1덩어리 무게 (g)</span>' +
      '<input name="pieceWeight" type="number" inputmode="decimal" value="' + item.pieceWeight + '" step="1" min="1" required></label>' +
      '<label class="field"><span>공정 메모</span>' +
      '<textarea name="notes" placeholder="반죽온도, 발효, 굽기">' + calc.escapeHtml(item.notes) + "</textarea></label>" +
      '<p class="section-title">반죽 재료 · 베이커스 % · 체크는 밀가루</p>' +
      '<div id="ingredient-list">' + item.ingredients.map(ingredientRow).join("") + "</div>" +
      '<button type="button" class="btn btn-secondary" id="add-ingredient">재료 추가</button>' + warn +
      '<p class="section-title">토핑 · 속재료</p>' +
      '<div id="topping-list">' + item.toppings.map(toppingRow).join("") + "</div>" +
      '<button type="button" class="btn btn-secondary" id="add-topping">토핑 추가</button>' +
      '<p class="section-title">베이킹 절차</p>' +
      '<div id="step-list">' + (item.steps || []).map(stepEditRow).join("") + "</div>" +
      '<button type="button" class="btn btn-secondary" id="add-step">단계 추가</button>' +
      '<button type="submit" class="btn btn-primary">저장</button></form>';
  }

  function renderCalc(item) {
    var total = (Number(item.pieceWeight) || 0) * pieceCount;
    return '<header class="topbar"><button class="ghost" data-go="/item/' + item.id + '">뒤로</button>' +
      "<h2>분량 입력</h2><span></span></header>" +
      '<p class="lede" style="text-align:center;font-size:28px;font-weight:700;color:var(--text)">' + calc.escapeHtml(item.name) + "</p>" +
      '<div class="card"><span class="muted">발효 후 1덩어리</span><strong>' + calc.grams(item.pieceWeight) + "</strong></div>" +
      '<p class="section-title">몇 덩어리를 만들까요?</p>' +
      '<div class="stepper"><button type="button" id="minus" aria-label="줄이기">−</button>' +
      '<output id="count">' + pieceCount + "</output>" +
      '<button type="button" id="plus" aria-label="늘리기">+</button></div>' +
      '<div class="card"><span class="muted">목표 반죽 총량</span><strong id="total">' + calc.grams(total) + "</strong></div>" +
      '<button class="btn btn-primary" id="to-result">계량표 보기</button>';
  }

  function renderResult(item) {
    var result = calc.scale(item, pieceCount);
    var doughRows = result.dough.map(function (row) {
      return '<div class="sheet-row"><span>' + calc.escapeHtml(row.name) + "</span><small>" + row.pct +
        "%</small><b>" + calc.grams(row.g) + "</b></div>";
    }).join("");
    var toppingRows = result.topping.map(function (row) {
      var basis = row.mode === "bp" ? "밀가루 " + row.value + "%" : "개당 " + row.value + "g";
      return '<div class="sheet-row"><span>' + calc.escapeHtml(row.name) + "</span><small>" + basis +
        "</small><b>" + calc.grams(row.g) + "</b></div>";
    }).join("");
    return '<header class="topbar"><button class="ghost" data-go="/item/' + item.id + "/calc?n=" + result.count +
      '">뒤로</button><h2>계량표</h2><span></span></header>' +
      '<p class="lede">' + result.count + "덩어리 · 덩어리당 " + calc.grams(result.pieceWeight) +
      " · 밀가루 " + calc.grams(result.flour) + "</p>" +
      '<p class="section-title">반죽</p><div class="sheet">' + doughRows + "</div>" +
      (result.topping.length ? '<p class="section-title">토핑</p><div class="sheet">' + toppingRows + "</div>" : "") +
      '<button class="btn btn-primary" data-go="/item/' + item.id + '/steps">베이킹 절차 보기</button>' +
      '<button class="btn btn-secondary" data-go="/">목록으로</button>';
  }

  function bindList() {
    bindNav();
    var add = document.getElementById("add-item");
    if (add) add.addEventListener("click", function () { go("/new"); });
    var exp = document.getElementById("export-data");
    if (exp) exp.addEventListener("click", function () { store.exportState(state); });
    var imp = document.getElementById("import-data");
    if (imp) imp.addEventListener("click", function () { document.getElementById("import-file").click(); });
    var file = document.getElementById("import-file");
    if (file) file.addEventListener("change", importData);
    var restore = document.getElementById("restore-exam");
    if (restore) restore.addEventListener("click", function () {
      if (!confirm("공개문제 20종의 배합을 다시 넣을까요? 직접 만든 품목은 그대로 둡니다.")) return;
      catalog.loadExamItems().then(function (items) {
        state = store.restoreExamItems(state, items);
        persist();
        render();
      }).catch(function () {
        alert("공개문제 배합을 다시 받지 못했습니다. 새로고침 후 시도하세요.");
      });
    });
  }

  function bindManual(item) {
    bindNav();
    var dup = document.getElementById("duplicate");
    if (dup) dup.addEventListener("click", function () {
      var copy = calc.clone(item);
      copy.id = calc.uid();
      copy.name = item.name + " 복사";
      copy.ingredients.forEach(function (row) { row.id = calc.uid(); });
      copy.toppings.forEach(function (row) { row.id = calc.uid(); });
      (copy.steps || []).forEach(function (row) { row.id = calc.uid(); });
      state.items.unshift(copy);
      persist();
      go("/item/" + copy.id + "/edit");
    });
    var del = document.getElementById("delete-item");
    if (del) del.addEventListener("click", function () {
      if (!confirm("「" + item.name + "」을(를) 삭제할까요?")) return;
      state.items = state.items.filter(function (row) { return row.id !== item.id; });
      persist();
      go("/");
    });
  }

  function readEditor(item) {
    var form = document.getElementById("edit-form");
    item.name = form.name.value.trim();
    item.pieceWeight = Number(form.pieceWeight.value);
    item.notes = form.notes.value.trim();
    item.ingredients = Array.prototype.slice.call(document.querySelectorAll("#ingredient-list .row")).map(function (row) {
      return {
        id: row.dataset.id,
        name: row.querySelector('[data-k="name"]').value.trim(),
        pct: Number(row.querySelector('[data-k="pct"]').value),
        isFlour: row.querySelector('[data-k="flour"]').checked
      };
    });
    item.toppings = Array.prototype.slice.call(document.querySelectorAll("#topping-list .row")).map(function (row) {
      return {
        id: row.dataset.id,
        name: row.querySelector('[data-k="name"]').value.trim(),
        mode: row.querySelector('[data-k="mode"]').value,
        value: Number(row.querySelector('[data-k="value"]').value)
      };
    });
    item.steps = Array.prototype.slice.call(document.querySelectorAll("#step-list .step-edit")).map(function (row) {
      return {
        id: row.dataset.id,
        title: row.querySelector('[data-k="title"]').value.trim(),
        detail: row.querySelector('[data-k="detail"]').value.trim(),
        minutes: row.querySelector('[data-k="minutes"]').value.trim()
      };
    });
  }

  function bindEditor(item) {
    bindNav();
    var addIng = document.getElementById("add-ingredient");
    if (addIng) addIng.addEventListener("click", function () {
      readEditor(item);
      item.ingredients.push({ id: calc.uid(), name: "", pct: 0, isFlour: false });
      render();
    });
    var addTop = document.getElementById("add-topping");
    if (addTop) addTop.addEventListener("click", function () {
      readEditor(item);
      item.toppings.push({ id: calc.uid(), name: "", mode: "bp", value: 0 });
      render();
    });
    var addStep = document.getElementById("add-step");
    if (addStep) addStep.addEventListener("click", function () {
      readEditor(item);
      item.steps = item.steps || [];
      item.steps.push(catalog.step("", "", ""));
      render();
    });
    root.querySelectorAll("[data-move]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        readEditor(item);
        var id = btn.closest("[data-id]").dataset.id;
        var from = item.steps.findIndex(function (row) { return row.id === id; });
        var to = from + Number(btn.dataset.move);
        if (from < 0 || to < 0 || to >= item.steps.length) return;
        var moved = item.steps.splice(from, 1)[0];
        item.steps.splice(to, 0, moved);
        render();
      });
    });
    root.querySelectorAll("[data-remove]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        readEditor(item);
        var id = btn.closest("[data-id]").dataset.id;
        if (btn.dataset.remove === "ingredient") {
          item.ingredients = item.ingredients.filter(function (row) { return row.id !== id; });
        } else if (btn.dataset.remove === "topping") {
          item.toppings = item.toppings.filter(function (row) { return row.id !== id; });
        } else {
          item.steps = item.steps.filter(function (row) { return row.id !== id; });
        }
        render();
      });
    });
    var form = document.getElementById("edit-form");
    if (form) form.addEventListener("submit", function (event) {
      event.preventDefault();
      readEditor(item);
      if (!item.name) { alert("품목명을 입력하세요."); return; }
      if (!item.ingredients.length) { alert("반죽 재료를 한 가지 이상 넣으세요."); return; }
      var saved = Object.assign({}, item);
      delete saved._mode;
      var index = state.items.findIndex(function (row) { return row.id === saved.id; });
      if (index >= 0) state.items[index] = saved;
      else state.items.unshift(saved);
      persist();
      draft = null;
      go("/item/" + saved.id);
    });
  }

  function bindCalc(item) {
    bindNav();
    function refreshCount() {
      document.getElementById("count").textContent = String(pieceCount);
      document.getElementById("total").textContent = calc.grams((Number(item.pieceWeight) || 0) * pieceCount);
    }
    var minus = document.getElementById("minus");
    if (minus) minus.addEventListener("click", function () {
      pieceCount = Math.max(1, pieceCount - 1);
      refreshCount();
    });
    var plus = document.getElementById("plus");
    if (plus) plus.addEventListener("click", function () {
      pieceCount += 1;
      refreshCount();
    });
    var toResult = document.getElementById("to-result");
    if (toResult) toResult.addEventListener("click", function () {
      go("/item/" + item.id + "/result?n=" + pieceCount);
    });
  }

  function bindSteps(item) {
    bindNav();
    if (!doneSteps[item.id]) doneSteps[item.id] = {};
    root.querySelectorAll("[data-step]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.dataset.step;
        doneSteps[item.id][id] = !doneSteps[item.id][id];
        render();
      });
    });
    var reset = document.getElementById("reset-steps");
    if (reset) reset.addEventListener("click", function () {
      doneSteps[item.id] = {};
      render();
    });
  }

  function importData(event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(String(reader.result));
        if (!Array.isArray(parsed.items)) throw new Error("형식 오류");
        state = parsed;
        persist();
        render();
      } catch (e) {
        alert("가져올 수 없는 파일입니다.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function boot() {
    render();
    catalog.loadExamItems().then(function (items) {
      state = store.mergeCatalog(store.loadRaw(), items);
      persist();
      ready = true;
      render();
    }).catch(function (error) {
      var raw = store.loadRaw();
      if (raw.items && raw.items.length) {
        state = raw;
        ready = true;
        render();
        return;
      }
      bootError = "공개문제 배합 파일을 읽지 못했습니다. 로컬 서버나 GitHub Pages로 열어 주세요.";
      render();
      console.error(error);
    });
  }

  window.addEventListener("hashchange", render);
  boot();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js?v=" + encodeURIComponent(calc.APP_VERSION)).catch(function () {});
  }
})();
