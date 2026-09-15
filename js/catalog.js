(function (global) {
  "use strict";

  var calc = global.BakersCalc;

  function step(title, detail, minutes) {
    return { id: calc.uid(), title: title, detail: detail, minutes: minutes == null ? "" : minutes };
  }

  function ensureIds(rows) {
    return (rows || []).map(function (row) {
      var next = Object.assign({}, row);
      if (!next.id) next.id = calc.uid();
      return next;
    });
  }

  function defaultSteps(item) {
    var method = item.method || "스트레이트법";
    var temp = item.doughTemp ? "반죽온도 " + item.doughTemp + "°C." : "";
    var fat = item.fatAtCleanup
      ? "유지는 클린업 단계에서 넣는다. "
      : (item.allInMix ? "전 재료를 한꺼번에 넣고 믹싱한다. " : "");
    var extra = item.formNote || "정형한다.";
    var bake = item.bakeNote || "품목에 맞는 온도와 시간으로 굽는다.";
    return [
      step("계량", "배합표대로 반죽 재료와 토핑·충전물을 나눠 계량한다.", 10),
      step("반죽", method + ". " + fat + temp, 15),
      step("1차 발효", "반죽이 적당히 부풀 때까지 발효한다.", item.firstFerment || 40),
      step("분할 · 둥글리기", "분할 " + (item.pieceWeight || "") + "g. 표면이 팽팽하게 둥글리기한다.", 10),
      step("중간 발효", "성형하기 쉽게 잠시 휴지시킨다.", 15),
      step("성형", extra, 15),
      step("2차 발효", "오븐에 넣기 직전까지 발효한다.", 30),
      step("굽기", bake, item.bakeMinutes || 25),
      step("마무리", item.finishNote || "팬에서 꺼내 식힘망에서 식힌다.", 20)
    ];
  }

  function normalizeItem(item) {
    var next = calc.clone(item);
    next.ingredients = ensureIds(next.ingredients);
    next.toppings = ensureIds(next.toppings);
    if (!Array.isArray(next.steps) || !next.steps.length) next.steps = defaultSteps(next);
    else next.steps = ensureIds(next.steps);
    return next;
  }

  function loadExamItems() {
    var url = "data/exam-items.json?v=" + encodeURIComponent(calc.APP_VERSION);
    return fetch(url, { cache: "no-store" }).then(function (res) {
      if (!res.ok) throw new Error("catalog " + res.status);
      return res.json();
    }).then(function (payload) {
      var items = payload && payload.items ? payload.items : payload;
      if (!Array.isArray(items)) throw new Error("catalog format");
      return items.map(normalizeItem);
    });
  }

  global.BakersCatalog = {
    step: step,
    normalizeItem: normalizeItem,
    defaultSteps: defaultSteps,
    loadExamItems: loadExamItems,
    blankItem: function () {
      return {
        id: calc.uid(),
        name: "",
        pieceWeight: 450,
        defaultCount: 2,
        notes: "",
        ingredients: [{ id: calc.uid(), name: "강력분", pct: 100, isFlour: true }],
        toppings: [],
        steps: [
          step("계량", "밀가루를 100%로 두고 나머지 재료를 계량한다.", ""),
          step("반죽", "재료를 섞고 글루텐이 형성될 때까지 반죽한다.", ""),
          step("1차 발효", "반죽이 약 2배가 될 때까지 발효한다.", ""),
          step("분할 · 둥글리기", "정한 무게로 나누고 둥글리기한다.", ""),
          step("중간 발효", "성형하기 쉽게 잠시 휴지시킨다.", ""),
          step("성형", "가스를 빼고 원하는 모양으로 성형한다.", ""),
          step("2차 발효", "오븐에 넣기 직전까지 발효한다.", ""),
          step("굽기", "품목에 맞는 온도와 시간으로 굽는다.", ""),
          step("냉각", "팬에서 꺼내 식힌다.", "")
        ]
      };
    }
  };
})(window);
