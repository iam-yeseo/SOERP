/* ===== 입찰 금액 도우미 =====
   엑셀 "소으니의 입찰금액 도우미" 시트를 웹으로 옮긴 계산기입니다.
   입력: 입찰금액 / 공급가액 / 대금지급 총액·퍼센트(계약금·중도금·잔금) / 공사명 / 공사지역
   나머지(보증금·세액·합계·한글변환)는 모두 자동 계산됩니다.
   공사지역은 WM.regionSearch로 지방자치단체를 찾아 어느 지역인지 알려줍니다.
   입력값은 localStorage에 저장되어 새로고침해도 유지됩니다. */
window.WM = window.WM || {};

(function () {
  var STORAGE_KEY = "soerp-bidcalc";

  /** 숫자 → 한글 금액 (엑셀 [DBNum4] 형식: 1234 → 일천이백삼십사, 0 → 영) */
  WM.numToKorean = function (n) {
    n = Math.round(Math.abs(Number(n) || 0));
    if (n === 0) return "영";
    var DIGITS = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
    var POS = ["", "십", "백", "천"];
    var GROUP = ["", "만", "억", "조", "경"];
    var s = String(n), out = "", gi = 0;
    while (s.length > 0) {
      var chunk = s.slice(-4);
      s = s.slice(0, -4);
      var part = "";
      for (var i = 0; i < chunk.length; i++) {
        var d = Number(chunk[chunk.length - 1 - i]);
        if (d) part = DIGITS[d] + POS[i] + part;
      }
      if (part) out = part + GROUP[gi] + out;
      gi++;
    }
    return out;
  };

  function defaults() {
    // 퍼센트 기본값은 엑셀 원본과 동일하게 비워둠(0)
    return { bidAmount: 0, supplyAmount: 0, payTotal: 0,
      pctContract: 0, pctInterim: 0, pctBalance: 0,
      projectName: "", regionQuery: "" };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return Object.assign(defaults(), JSON.parse(raw));
    } catch (e) { /* 무시하고 기본값 사용 */ }
    return defaults();
  }

  function saveState(s) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) { /* 무시 */ }
  }

  /** 복사 버튼이 읽어갈 현재 공사명 */
  WM.getBidCalcProjectName = function () {
    var el = document.getElementById("bc-in-name");
    return el ? el.value.trim() : "";
  };

  /** 저장된 입력값 전체 삭제 (초기화 버튼) */
  WM.resetBidCalc = function () {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* 무시 */ }
  };

  /** 천 단위 콤마. zeroDash=true면 0을 "-"로 (엑셀 회계 서식과 동일) */
  function fmt(n, zeroDash) {
    n = Math.round(Number(n) || 0);
    if (n === 0 && zeroDash) return "-";
    return n.toLocaleString("ko-KR");
  }

  /* ---- 렌더 헬퍼 ---- */

  /** 자동 계산 결과 행: 라벨(+비율 배지) / 금액 / 한글변환 */
  function calcRow(label, rate, outId, zeroDash) {
    return '<div class="bc-row">' +
        '<span class="bc-label">' + label +
          (rate ? ' <span class="bc-rate">' + rate + "</span>" : "") + "</span>" +
        '<span class="bc-amount"><span id="' + outId + '">' + (zeroDash ? "-" : "0") + '</span><span class="bc-unit">원</span></span>' +
      "</div>" +
      '<p class="bc-hangul">일금 <span id="' + outId + '-k">영</span> 원</p>';
  }

  /** 금액 입력 행: 라벨 / 입력칸 / 한글변환 */
  function inputRow(label, inputId, value) {
    return '<div class="bc-row">' +
        '<span class="bc-label">' + label + "</span>" +
        '<span class="bc-input-wrap">' +
          '<input class="input bc-amt-input" id="' + inputId + '" inputmode="numeric" placeholder="숫자만 입력" value="' + (value ? fmt(value) : "") + '" />' +
          '<span class="bc-unit">원</span></span>' +
      "</div>" +
      '<p class="bc-hangul">일금 <span id="' + inputId + '-k">영</span> 원</p>';
  }

  /** 대금지급 행: 라벨 / 금액(자동) / 퍼센트 입력 / 한글변환 */
  function payRow(label, outId, pctId, pctValue) {
    return '<div class="bc-row">' +
        '<span class="bc-label">' + label + "</span>" +
        '<span class="bc-pay-right">' +
          '<span class="bc-amount"><span id="' + outId + '">0</span><span class="bc-unit">원</span></span>' +
          '<span class="bc-input-wrap"><input class="input bc-pct-input" id="' + pctId + '" type="number" min="0" max="100" step="any" placeholder="0" value="' + (pctValue || "") + '" /><span class="bc-unit">%</span></span>' +
        "</span>" +
      "</div>" +
      '<p class="bc-hangul">일금 <span id="' + outId + '-k">영</span> 원</p>';
  }

  /** 공사명 + 공사지역 카드 (공사명은 복사 버튼, 공사지역은 지자체 조회) */
  function siteCard(s) {
    return '<div class="card bc-card">' +
        '<h2 class="bc-title">공사명 입력</h2>' +
        '<div class="bc-text-row">' +
          '<input class="input bc-text-input" id="bc-in-name" ' +
            'placeholder="예: 여수 신월코아루 내외벽 균열보수" ' +
            'value="' + WM.esc(s.projectName || "") + '" />' +
          '<button type="button" class="btn btn-outline bc-copy-btn" data-action="bidcalc-copy-name" title="공사명 복사">' +
            "<span>" + WM.icon("copy", 15) + "</span><span>복사</span></button>" +
        "</div>" +
        '<p class="bc-help">입력한 공사명은 저장되어 다음에 들어와도 그대로 남아 있습니다.</p>' +
        '<div class="bc-section">' +
          '<p class="bc-section-title">공사지역</p>' +
          '<div class="bc-text-row">' +
            '<input class="input bc-text-input" id="bc-in-region" ' +
              'placeholder="예: 강북구 / 중구 / 서울시" ' +
              'value="' + WM.esc(s.regionQuery || "") + '" />' +
          "</div>" +
          '<div class="bc-region-result" id="bc-region-result" aria-live="polite"></div>' +
        "</div>" +
      "</div>";
  }

  /** 입찰 금액 도우미 페이지 */
  WM.renderBidCalc = function () {
    var s = loadState();

    var bidCard =
      '<div class="card bc-card">' +
        '<h2 class="bc-title">소으니의 입찰금액 도우미</h2>' +
        inputRow("입찰금액", "bc-in-bid", s.bidAmount) +
        '<div class="bc-section">' +
          '<p class="bc-section-title">% 계산기</p>' +
          calcRow("입찰보증금", "5%", "bc-out-bond5", true) +
          calcRow("계약보증금", "20%", "bc-out-bond20", true) +
          calcRow("하자보증금", "10%", "bc-out-bond10", true) +
        "</div>" +
      "</div>";

    var supplyCard =
      '<div class="card bc-card">' +
        '<h2 class="bc-title">공급가액 계산기</h2>' +
        inputRow("공급가액", "bc-in-supply", s.supplyAmount) +
        calcRow("세액", "10%", "bc-out-tax", true) +
        calcRow("합계", "", "bc-out-sum", true) +
      "</div>";

    var payCard =
      '<div class="card bc-card">' +
        '<h2 class="bc-title">대금지급 관련 퍼센트 계산기</h2>' +
        inputRow("총액", "bc-in-total", s.payTotal) +
        '<div class="bc-section">' +
          '<p class="bc-section-title">계약서</p>' +
          payRow("계약금", "bc-out-contract", "bc-in-pct-contract", s.pctContract) +
          payRow("중도금", "bc-out-interim", "bc-in-pct-interim", s.pctInterim) +
          payRow("잔금", "bc-out-balance", "bc-in-pct-balance", s.pctBalance) +
          '<div class="bc-row bc-pct-total-row">' +
            '<span class="bc-label">퍼센트 합계</span>' +
            '<span class="bc-amount" id="bc-out-pcttotal">0%</span>' +
          "</div>" +
        "</div>" +
      "</div>";

    return '<div class="page-head page-head-row"><div><h1>입찰 금액 도우미</h1>' +
        "<p>입찰금액·공급가액·대금지급 금액을 입력하면 보증금, 세액, 한글 금액이 자동 계산됩니다. 공사지역을 입력하면 해당하는 지방자치단체를 찾아드립니다.</p></div>" +
        '<button type="button" class="btn btn-outline" data-action="bidcalc-reset">' +
          '<span>' + WM.icon("rotate", 16) + "</span><span>초기화</span></button>" +
      "</div>" +
      '<div class="bidcalc-grid">' +
        '<div class="bidcalc-col">' + bidCard + supplyCard + "</div>" +
        '<div class="bidcalc-col">' + payCard + siteCard(s) + "</div>" +
      "</div>";
  };

  /* ---- 공사지역 조회 결과 ---- */

  var SOURCE_NOTE = {
    api: "공공데이터포털 ‘행정안전부_통계연보_지방자치단체’ 자료 기준",
    mixed: "시도는 공공데이터포털, 시군구는 내장 표 기준",
    fallback: "내장 지자체 표 기준 (오픈API 미연결)"
  };

  /** 조회 결과 한 줄: 시도 + 시군구 */
  function regionLine(line) {
    return '<li class="bc-region-item">' +
        '<span class="bc-region-pin">' + WM.icon("mappin", 14) + "</span>" +
        '<span class="bc-region-sido">' + WM.esc(line.sido) + "</span>" +
        (line.sgg ? '<span class="bc-region-sgg">' + WM.esc(line.sgg) + "</span>" : "") +
      "</li>";
  }

  function regionResultHtml(res) {
    if (!res || res.status === "empty") return "";

    if (res.status === "notfound") {
      return '<p class="bc-region-none">‘' + WM.esc(res.query) + "’와(과) 일치하는 지방자치단체를 찾지 못했습니다.</p>" +
        '<p class="bc-region-src">' + WM.esc(SOURCE_NOTE[res.source] || "") + "</p>";
    }

    var head = res.items.length === 1
      ? "이 공사의 지역은 <strong>" + WM.esc(res.items[0].short) + "</strong>입니다."
      : "이 공사의 지역은 아래 <strong>" + res.items.length + "곳</strong> 중 하나입니다.";

    var lines = [];
    res.items.forEach(function (it) { it.lines.forEach(function (l) { lines.push(regionLine(l)); }); });

    return '<p class="bc-region-head">' + head + "</p>" +
      '<ul class="bc-region-list">' + lines.join("") + "</ul>" +
      '<p class="bc-region-src">' + WM.esc(SOURCE_NOTE[res.source] || "") + "</p>";
  }

  /** 입력 이벤트 바인딩 + 자동 계산 (렌더 직후 호출) */
  WM.bindBidCalc = function () {
    var s = loadState();

    function setAmount(outId, n, zeroDash) {
      var el = document.getElementById(outId);
      if (el) el.textContent = fmt(n, zeroDash);
      var k = document.getElementById(outId + "-k");
      if (k) k.textContent = WM.numToKorean(n);
    }

    function setHangul(inputId, n) {
      var k = document.getElementById(inputId + "-k");
      if (k) k.textContent = WM.numToKorean(n);
    }

    function recalc() {
      // 좌측: 입찰금액 → 보증금 3종 (엑셀: =D4*5%, *20%, *10%)
      setHangul("bc-in-bid", s.bidAmount);
      setAmount("bc-out-bond5", s.bidAmount * 0.05, true);
      setAmount("bc-out-bond20", s.bidAmount * 0.2, true);
      setAmount("bc-out-bond10", s.bidAmount * 0.1, true);

      // 좌측: 공급가액 → 세액·합계 (엑셀: =D15*10%, =D15+D17)
      var tax = s.supplyAmount * 0.1;
      setHangul("bc-in-supply", s.supplyAmount);
      setAmount("bc-out-tax", tax, true);
      setAmount("bc-out-sum", s.supplyAmount + tax, true);

      // 우측: 총액 × 퍼센트 (엑셀: =H11*J5 등)
      setHangul("bc-in-total", s.payTotal);
      setAmount("bc-out-contract", s.payTotal * s.pctContract / 100);
      setAmount("bc-out-interim", s.payTotal * s.pctInterim / 100);
      setAmount("bc-out-balance", s.payTotal * s.pctBalance / 100);

      // 퍼센트 합계 (엑셀: =SUM(J5:J10)) — 100%가 아니면 경고색
      var pctTotal = s.pctContract + s.pctInterim + s.pctBalance;
      var totalEl = document.getElementById("bc-out-pcttotal");
      if (totalEl) {
        totalEl.textContent = (Math.round(pctTotal * 100) / 100) + "%";
        totalEl.classList.toggle("bc-total-ok", pctTotal === 100);
        totalEl.classList.toggle("bc-total-bad", pctTotal > 0 && pctTotal !== 100);
      }

      saveState(s);
    }

    // 금액 입력: 숫자만 + 천 단위 콤마 (기존 금액 입력과 동일한 방식)
    [["bc-in-bid", "bidAmount"], ["bc-in-supply", "supplyAmount"], ["bc-in-total", "payTotal"]]
      .forEach(function (pair) {
        var el = document.getElementById(pair[0]);
        if (!el) return;
        el.addEventListener("input", function () {
          var digits = el.value.replace(/[^0-9]/g, "");
          if (!digits) { el.value = ""; s[pair[1]] = 0; recalc(); return; }
          var n = Number(digits);
          el.value = n.toLocaleString("ko-KR");
          s[pair[1]] = n;
          recalc();
        });
      });

    // 퍼센트 입력: 0~100 숫자
    [["bc-in-pct-contract", "pctContract"], ["bc-in-pct-interim", "pctInterim"], ["bc-in-pct-balance", "pctBalance"]]
      .forEach(function (pair) {
        var el = document.getElementById(pair[0]);
        if (!el) return;
        el.addEventListener("input", function () {
          var n = Number(el.value);
          if (isNaN(n) || n < 0) n = 0;
          if (n > 100) { n = 100; el.value = "100"; }
          s[pair[1]] = n;
          recalc();
        });
      });

    // 공사명: 입력한 그대로 저장 (복사 버튼은 app.js에서 처리)
    var nameEl = document.getElementById("bc-in-name");
    if (nameEl) {
      nameEl.addEventListener("input", function () {
        s.projectName = nameEl.value;
        saveState(s);
      });
    }

    // 공사지역: 입력할 때마다 지방자치단체를 찾아 보여줍니다.
    var regionEl = document.getElementById("bc-in-region");
    var regionOut = document.getElementById("bc-region-result");

    function showRegion() {
      if (!regionEl || !regionOut || !WM.regionSearch) return;
      regionOut.innerHTML = regionResultHtml(WM.regionSearch(regionEl.value));
    }

    if (regionEl) {
      regionEl.addEventListener("input", function () {
        s.regionQuery = regionEl.value;
        saveState(s);
        showRegion();
      });
      showRegion(); // 저장된 값이 있으면 바로 표시
      // 오픈API 목록이 도착하면 같은 입력으로 다시 조회합니다.
      if (WM.loadRegions) WM.loadRegions().then(showRegion).catch(function () { /* 무시 */ });
    }

    recalc();
  };
})();
