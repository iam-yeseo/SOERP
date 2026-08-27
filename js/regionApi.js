/* ===== 지방자치단체·법정동 조회 =====
   공공데이터포털 '행정안전부_행정표준코드_법정동코드'(StanReginCd)를
   Cloudflare Pages Function(/api/regions?q=...)을 통해 검색합니다.
   시도·시군구뿐 아니라 읍면동·리까지 찾습니다.
   인증키는 Cloudflare 환경변수에만 있고 브라우저로는 내려오지 않습니다.

   오픈API가 아직 연결되지 않았거나 응답이 없으면 아래 내장 표(FALLBACK_SGG)로
   시도·시군구까지만 대신 조회합니다. 화면에는 어느 쪽을 썼는지 함께 표시합니다. */
window.WM = window.WM || {};

(function () {
  // 기본은 같은 도메인의 /api/regions.
  // 별도 Worker를 workers.dev 주소로 띄웠다면 index.html에서
  //   window.SOERP_REGION_API = "https://xxx.workers.dev/api/regions";
  // 한 줄만 넣어주면 그쪽으로 부릅니다.
  var ENDPOINT = window.SOERP_REGION_API || "/api/regions";
  var MAX_SHOW = 40;          // 한 번에 보여줄 최대 건수
  var queryCache = {};        // 검색어 → 결과 (탭을 닫을 때까지 유지)

  /* ---- 시도 기준표 ----
     name    : 공식 명칭 (화면에 그대로 표시)
     short   : "이 공사의 지역은 ○○입니다"에 쓰는 짧은 이름
     aliases : 사용자가 줄여 칠 만한 표기
     displays: 결과에 찍을 줄. 각 줄은 주소를 끊은 조각 배열. 기본은 공식 명칭 한 줄. */
  var SIDO = [
    { name: "서울특별시", short: "서울", aliases: ["서울", "서울시"] },
    { name: "부산광역시", short: "부산", aliases: ["부산", "부산시"] },
    { name: "대구광역시", short: "대구", aliases: ["대구", "대구시"] },
    { name: "인천광역시", short: "인천", aliases: ["인천", "인천시"] },
    { name: "광주광역시", short: "광주", aliases: ["광주", "광주시"] },
    { name: "대전광역시", short: "대전", aliases: ["대전", "대전시"] },
    { name: "울산광역시", short: "울산", aliases: ["울산", "울산시"] },
    { name: "세종특별자치시", short: "세종", aliases: ["세종", "세종시", "세종특별시"] },
    { name: "경기도", short: "경기", aliases: ["경기"] },
    { name: "강원특별자치도", short: "강원", aliases: ["강원", "강원도"] },
    { name: "충청북도", short: "충북", aliases: ["충북"] },
    { name: "충청남도", short: "충남", aliases: ["충남"] },
    { name: "전북특별자치도", short: "전북", aliases: ["전북", "전라북도"] },
    { name: "전라남도", short: "전남", aliases: ["전남"] },
    { name: "경상북도", short: "경북", aliases: ["경북"] },
    { name: "경상남도", short: "경남", aliases: ["경남"] },
    { name: "제주특별자치도", short: "제주", aliases: ["제주", "제주도"] },
    // 통합 지자체라 공식 명칭과 줄임말을 두 줄로 함께 보여줍니다.
    { name: "전남광주통합특별시", short: "전남광주",
      aliases: ["전남광주", "전남광주시", "전남광주특별시", "전남광주통합시"],
      displays: [["전남광주통합특별시"], ["전남광주"]] }
  ];

  /* ---- 내장 시군구 표 (오픈API를 못 받아왔을 때만 사용) ---- */
  var FALLBACK_SGG = {
    "서울특별시": "종로구 중구 용산구 성동구 광진구 동대문구 중랑구 성북구 강북구 도봉구 노원구 은평구 서대문구 마포구 양천구 강서구 구로구 금천구 영등포구 동작구 관악구 서초구 강남구 송파구 강동구",
    "부산광역시": "중구 서구 동구 영도구 부산진구 동래구 남구 북구 해운대구 사하구 금정구 강서구 연제구 수영구 사상구 기장군",
    "대구광역시": "중구 동구 서구 남구 북구 수성구 달서구 달성군 군위군",
    "인천광역시": "중구 동구 미추홀구 연수구 남동구 부평구 계양구 서구 강화군 옹진군",
    "광주광역시": "동구 서구 남구 북구 광산구",
    "대전광역시": "동구 중구 서구 유성구 대덕구",
    "울산광역시": "중구 남구 동구 북구 울주군",
    "세종특별자치시": "",
    "경기도": "수원시 성남시 의정부시 안양시 부천시 광명시 평택시 동두천시 안산시 고양시 과천시 구리시 남양주시 오산시 시흥시 군포시 의왕시 하남시 용인시 파주시 이천시 안성시 김포시 화성시 광주시 양주시 포천시 여주시 연천군 가평군 양평군",
    "강원특별자치도": "춘천시 원주시 강릉시 동해시 태백시 속초시 삼척시 홍천군 횡성군 영월군 평창군 정선군 철원군 화천군 양구군 인제군 고성군 양양군",
    "충청북도": "청주시 충주시 제천시 보은군 옥천군 영동군 증평군 진천군 괴산군 음성군 단양군",
    "충청남도": "천안시 공주시 보령시 아산시 서산시 논산시 계룡시 당진시 금산군 부여군 서천군 청양군 홍성군 예산군 태안군",
    "전북특별자치도": "전주시 군산시 익산시 정읍시 남원시 김제시 완주군 진안군 무주군 장수군 임실군 순창군 고창군 부안군",
    "전라남도": "목포시 여수시 순천시 나주시 광양시 담양군 곡성군 구례군 고흥군 보성군 화순군 장흥군 강진군 해남군 영암군 무안군 함평군 영광군 장성군 완도군 진도군 신안군",
    "경상북도": "포항시 경주시 김천시 안동시 구미시 영주시 영천시 상주시 문경시 경산시 의성군 청송군 영양군 영덕군 청도군 고령군 성주군 칠곡군 예천군 봉화군 울진군 울릉군",
    "경상남도": "창원시 진주시 통영시 사천시 김해시 밀양시 거제시 양산시 의령군 함안군 창녕군 고성군 남해군 하동군 산청군 함양군 거창군 합천군",
    "제주특별자치도": "제주시 서귀포시",
    "전남광주통합특별시": ""
  };

  /* ---- 시도 색인 ---- */
  var sidoByKey = {};   // 별칭/공식명 → 시도 정의
  var sidoByName = {};  // 공식명 → 시도 정의
  SIDO.forEach(function (d, i) {
    d.order = i;
    if (!d.displays) d.displays = [[d.name]];
    sidoByName[d.name] = d;
    sidoByKey[d.name] = d;
    d.aliases.forEach(function (a) { if (!sidoByKey[a]) sidoByKey[a] = d; });
  });

  var fallback = null;  // [{ sidoName, sgg }] — 오픈API를 못 쓸 때만 씁니다.

  function normalize(s) {
    return String(s == null ? "" : s).replace(/\s+/g, "").trim();
  }

  function fallbackIndex() {
    if (fallback) return fallback;
    fallback = [];
    SIDO.forEach(function (d) {
      (FALLBACK_SGG[d.name] || "").split(" ").filter(Boolean).forEach(function (n) {
        fallback.push({ sidoName: d.name, sgg: n });
      });
    });
    return fallback;
  }

  /* ---- 결과 항목 만들기 ----
     item = { level, short, lines: [{ parts: ["서울특별시", "강북구"] }] }
     level 1=시도, 2=시군구, 3=읍면동, 4=리 */

  function sidoItem(d) {
    return {
      key: "s:" + d.name, order: d.order, sub: "", level: 1, short: d.short,
      lines: d.displays.map(function (parts) { return { parts: parts }; })
    };
  }

  function sggItem(sidoName, sgg) {
    var d = sidoByName[sidoName] || { name: sidoName, short: sidoName, order: 99 };
    return {
      key: "g:" + sidoName + "|" + sgg, order: d.order, sub: sgg, level: 2, short: d.short,
      lines: [{ parts: [d.name, sgg] }]
    };
  }

  function apiItem(it) {
    var parts = String(it.full || "").split(/\s+/).filter(Boolean);
    if (!parts.length) return null;
    var d = sidoByKey[normalize(parts[0])];
    return {
      key: "a:" + (it.code || it.full), order: d ? d.order : 99, sub: it.full,
      level: it.level || parts.length, short: d ? d.short : parts[0],
      lines: [{ parts: parts }]
    };
  }

  function dedupe(items) {
    var seen = {}, out = [];
    items.forEach(function (it) {
      if (!it || seen[it.key]) return;
      seen[it.key] = 1;
      out.push(it);
    });
    return out;
  }

  /* ---- 내장 표 조회 (오픈API를 못 쓸 때) ---- */

  function findSido(key) {
    var d = sidoByKey[key];
    return d ? [sidoItem(d)] : [];
  }

  function findSgg(key, onlySido) {
    var keys = /(시|군|구)$/.test(key) ? [key] : [key, key + "시", key + "군", key + "구"];
    var out = [];
    keys.forEach(function (k) {
      if (out.length) return; // 접미사를 붙이지 않은 정확한 일치를 우선합니다.
      fallbackIndex().forEach(function (r) {
        if (r.sgg !== k) return;
        if (onlySido && r.sidoName !== onlySido.name) return;
        out.push(sggItem(r.sidoName, r.sgg));
      });
    });
    return out;
  }

  function findLoose(key) {
    if (key.length < 2) return [];
    var out = [];
    SIDO.forEach(function (d) {
      if (d.name.indexOf(key) >= 0 || d.short.indexOf(key) >= 0) out.push(sidoItem(d));
    });
    fallbackIndex().forEach(function (r) {
      if (r.sgg.indexOf(key) >= 0) out.push(sggItem(r.sidoName, r.sgg));
    });
    return out;
  }

  function localSearch(key) {
    // "서울강북구", "경기도광주시"처럼 시도+시군구를 붙여 친 경우 (가장 긴 시도 접두사 우선)
    var scoped = null;
    Object.keys(sidoByKey).forEach(function (name) {
      if (key.length <= name.length || key.indexOf(name) !== 0) return;
      if (!scoped || name.length > scoped.name.length) {
        scoped = { name: name, def: sidoByKey[name], rest: key.slice(name.length) };
      }
    });

    var items = scoped ? findSgg(scoped.rest, scoped.def) : [];
    if (!items.length) items = findSido(key).concat(findSgg(key, null));
    if (!items.length) items = findLoose(key);

    return dedupe(items).sort(function (a, b) {
      return a.order - b.order || a.sub.localeCompare(b.sub, "ko");
    });
  }

  /* ---- 오픈API 조회 ---- */

  /** 통합 지자체처럼 법정동코드에 없는 곳은 내장 기준표로 먼저 처리합니다. */
  function specialSido(key) {
    var d = sidoByKey[key];
    return d && d.displays.length > 1 ? [sidoItem(d)] : [];
  }

  function result(status, query, source, items, total) {
    return {
      status: status, query: query, source: source,
      items: items || [], total: total == null ? (items ? items.length : 0) : total
    };
  }

  /**
   * 지역명으로 시도·시군구·읍면동·리를 찾습니다.
   * @param {string} raw 사용자가 입력한 지역명
   * @returns {Promise<{status:string, query:string, source:string, items:Array, total:number}>}
   *   status: "empty" | "notfound" | "ok",  source: "api" | "fallback"
   */
  WM.regionSearch = function (raw) {
    var query = String(raw == null ? "" : raw).replace(/\s+/g, " ").trim();
    if (!query) return Promise.resolve(result("empty", "", "api", []));

    var key = normalize(query);
    if (queryCache[key]) return Promise.resolve(queryCache[key]);

    function remember(r) {
      queryCache[key] = r;
      return r;
    }

    // 1) 법정동코드에 없는 통합 지자체
    var special = specialSido(key);
    if (special.length) return Promise.resolve(remember(result("ok", query, "api", special)));

    // 2) 줄임말은 공식 명칭으로 바꿔서 물어봅니다. (서울시 → 서울특별시)
    var alias = sidoByKey[key];
    var q = alias ? alias.name : query;

    return fetch(ENDPOINT + "?q=" + encodeURIComponent(q), { headers: { Accept: "application/json" } })
      .then(function (res) {
        // 정적 호스팅이라 프록시가 없으면 404 HTML이 돌아옵니다.
        if (res.status === 404) {
          console.warn("지역 조회 프록시(" + ENDPOINT + ")를 찾을 수 없습니다. " +
            "Cloudflare Pages Functions가 켜져 있는지, 또는 Worker 라우트가 걸려 있는지 확인해주세요.");
          return null;
        }
        return res.json().catch(function () { return null; });
      })
      .then(function (data) {
        if (!data || !data.ok) {
          if (data && data.hint) console.warn("법정동코드 오픈API:", data.error, "—", data.detail || "", data.hint);
          throw new Error("오픈API를 쓸 수 없습니다.");
        }
        var items = dedupe((data.items || []).map(apiItem)).slice(0, MAX_SHOW);
        if (items.length) return remember(result("ok", query, "api", items, data.total || items.length));
        // 법정동코드에서 못 찾았으면 내장 표로 한 번 더 봅니다.
        var local = localSearch(key);
        if (local.length) return remember(result("ok", query, "fallback", local));
        return remember(result("notfound", query, "api", []));
      })
      .catch(function () {
        var items = localSearch(key);
        // 실패는 캐시하지 않습니다. 키를 넣고 재배포하면 바로 오픈API로 넘어가야 하니까요.
        return result(items.length ? "ok" : "notfound", query, "fallback", items);
      });
  };
})();
