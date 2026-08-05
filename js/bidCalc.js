/* ===== 입찰 금액 도우미 =====
   엑셀 "소으니의 입찰금액 도우미" 시트를 웹으로 옮긴 계산기입니다.
   입력: 입찰금액 / 공급가액 / 대금지급 총액·퍼센트(계약금·중도금·잔금)
   나머지(보증금·세액·합계·한글변환)는 모두 자동 계산됩니다.
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
      pctContract: 0, pctInterim: 0, pctBalance: 0 };
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
        "<p>입찰금액·공급가액·대금지급 금액을 입력하면 보증금, 세액, 한글 금액이 자동 계산됩니다.</p></div>" +
        '<button type="button" class="btn btn-outline" data-action="bidcalc-reset">' +
          '<span>' + WM.icon("rotate", 16) + "</span><span>초기화</span></button>" +
      "</div>" +
      '<div class="bidcalc-grid">' +
        '<div class="bidcalc-col">' + bidCard + supplyCard + "</div>" +
        '<div class="bidcalc-col">' + payCard + "</div>" +
      "</div>";
  };

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

    recalc();
  };
})();
