/* ===== 지방자치단체(시도·시군구) 조회 =====
   공공데이터포털 '행정안전부_통계연보_지방자치단체' 오픈API를
   Cloudflare Pages Function(/api/regions)을 통해 받아옵니다.
   인증키는 Cloudflare 환경변수에만 있고 브라우저로는 내려오지 않습니다.

   API가 아직 연결되지 않았거나 응답이 없으면 아래 내장 표(FALLBACK_SGG)로 대신 조회합니다.
   화면에는 어느 쪽을 썼는지 함께 표시합니다. */
window.WM = window.WM || {};

(function () {
  var ENDPOINT = "/api/regions";
  var CACHE_KEY = "soerp-regions-cache";
  var CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7일

  /* ---- 시도 기준표 ----
     name    : 공식 명칭 (화면에 그대로 표시)
     short   : "이 공사의 지역은 ○○입니다"에 쓰는 짧은 이름
     aliases : 사용자가 줄여 칠 만한 표기
     displays: 결과에 찍을 줄. 기본은 공식 명칭 한 줄. */
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
      displays: [{ sido: "전남광주통합특별시", sgg: "" }, { sido: "전남광주", sgg: "" }] }
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

  /* ---- 조회용 색인 ---- */
  var sidoByKey = {};   // 별칭/공식명 → 시도 정의
  var sidoByName = {};  // 공식명 → 시도 정의
  SIDO.forEach(function (d, i) {
    d.order = i;
    if (!d.displays) d.displays = [{ sido: d.name, sgg: "" }];
    sidoByName[d.name] = d;
    sidoByKey[d.name] = d;
    d.aliases.forEach(function (a) { if (!sidoByKey[a]) sidoByKey[a] = d; });
  });

  var index = null;    // [{ sidoName, sgg }]
  var source = "";     // "api" | "fallback"
  var loaded = false;  // 목록을 한 번이라도 확정했는지
  var loading = null;

  function normalize(s) {
    return String(s == null ? "" : s).replace(/\s+/g, "").trim();
  }

  function fallbackIndex() {
    var list = [];
    SIDO.forEach(function (d) {
      var names = (FALLBACK_SGG[d.name] || "").split(" ").filter(Boolean);
      names.forEach(function (n) { list.push({ sidoName: d.name, sgg: n }); });
    });
    return list;
  }

  function toIndex(regions) {
    var seen = {}, list = [];
    (regions || []).forEach(function (r) {
      var d = sidoByKey[normalize(r.sido)];
      if (!d || !r.sgg) return;
      var key = d.name + "|" + r.sgg;
      if (seen[key]) return;
      seen[key] = 1;
      list.push({ sidoName: d.name, sgg: r.sgg });
    });
    return list;
  }

  function readCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var c = JSON.parse(raw);
      if (!c || !c.at || Date.now() - c.at > CACHE_TTL) return null;
      if (!c.regions || !c.regions.length) return null;
      return c.regions;
    } catch (e) { return null; }
  }

  function writeCache(regions) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), regions: regions })); }
    catch (e) { /* 저장 실패는 무시 */ }
  }

  /** 지자체 목록을 준비합니다. 실패해도 reject하지 않고 내장 표로 채웁니다. */
  /**
   * 받아온 목록을 색인으로 채택합니다.
   * 오픈API가 시도 단위만 내려주는 경우(시군구 칼럼이 없는 데이터)도 있어서,
   * 시군구가 충분히 안 나오면 시군구만 내장 표로 채우고 "mixed"로 표시합니다.
   * @returns "api" | "mixed" | null (쓸 수 없는 응답)
   */
  function adopt(regions) {
    if (!regions || !regions.length) return null;
    var built = toIndex(regions);
    if (built.length >= 10) { index = built; return "api"; }
    // 시도라도 알아볼 수 있으면 오픈API는 붙은 것으로 봅니다.
    var hasSido = regions.some(function (r) { return !!sidoByKey[normalize(r.sido)]; });
    if (!hasSido) return null;
    index = fallbackIndex();
    return "mixed";
  }

  WM.loadRegions = function (force) {
    if (loaded && !force) return Promise.resolve({ source: source, count: index.length });
    if (loading && !force) return loading;

    if (!force) {
      var adopted = adopt(readCache());
      if (adopted) {
        source = adopted;
        loaded = true;
        return Promise.resolve({ source: source, count: index.length });
      }
    }

    loading = fetch(ENDPOINT, { headers: { Accept: "application/json" } })
      .then(function (res) { return res.json().catch(function () { return null; }); })
      .then(function (data) {
        var used = data && data.ok ? adopt(data.regions) : null;
        if (used) {
          source = used;
          loaded = true;
          writeCache(data.regions);
          return { source: source, count: index.length };
        }
        if (data && data.hint) console.warn("지방자치단체 오픈API:", data.error, "—", data.hint);
        throw new Error("사용할 수 있는 목록이 없습니다.");
      })
      .catch(function () {
        index = fallbackIndex();
        source = "fallback";
        loaded = true;
        return { source: source, count: index.length };
      })
      .then(function (r) { loading = null; return r; });

    return loading;
  };

  /* ---- 결과 만들기 ---- */

  function sidoItem(d) {
    return { key: "sido:" + d.name, order: d.order, sub: "", short: d.short, lines: d.displays };
  }

  function sggItem(sidoName, sgg) {
    var d = sidoByName[sidoName] || { name: sidoName, short: sidoName, order: 99 };
    return {
      key: "sgg:" + sidoName + "|" + sgg, order: d.order, sub: sgg, short: d.short,
      lines: [{ sido: d.name, sgg: sgg }]
    };
  }

  function findSido(key) {
    var d = sidoByKey[key];
    return d ? [sidoItem(d)] : [];
  }

  function findSgg(key, onlySido) {
    var keys = [key];
    // "강북"처럼 접미사를 뺀 입력도 받아줍니다.
    if (!/(시|군|구)$/.test(key)) keys = keys.concat([key + "시", key + "군", key + "구"]);

    var out = [];
    keys.forEach(function (k) {
      if (out.length) return; // 접미사를 붙이지 않은 정확한 일치를 우선합니다.
      index.forEach(function (r) {
        if (r.sgg !== k) return;
        if (onlySido && r.sidoName !== onlySido.name) return;
        out.push(sggItem(r.sidoName, r.sgg));
      });
    });
    return out;
  }

  /** 마지막 수단: 이름에 입력이 포함된 지자체를 모읍니다. */
  function findLoose(key) {
    if (key.length < 2) return [];
    var out = [];
    SIDO.forEach(function (d) {
      if (d.name.indexOf(key) >= 0 || d.short.indexOf(key) >= 0) out.push(sidoItem(d));
    });
    index.forEach(function (r) {
      if (r.sgg.indexOf(key) >= 0) out.push(sggItem(r.sidoName, r.sgg));
    });
    return out;
  }

  function dedupe(items) {
    var seen = {}, out = [];
    items.forEach(function (it) {
      if (seen[it.key]) return;
      seen[it.key] = 1;
      out.push(it);
    });
    out.sort(function (a, b) {
      return a.order - b.order || a.sub.localeCompare(b.sub, "ko");
    });
    return out;
  }

  /**
   * 입력한 지역명으로 지방자치단체를 찾습니다.
   * @returns {{status:string, query:string, source:string, items:Array}}
   *   status: "empty" | "notfound" | "ok"
   */
  WM.regionSearch = function (raw) {
    var query = String(raw == null ? "" : raw).trim();
    if (!query) return { status: "empty", query: "", source: source, items: [] };
    if (!index) index = fallbackIndex();

    var key = normalize(query);

    // 1) "서울강북구", "경기도광주시"처럼 시도+시군구로 붙여 친 경우 (가장 긴 시도 접두사 우선)
    var scoped = null;
    Object.keys(sidoByKey).forEach(function (name) {
      if (key.length <= name.length || key.indexOf(name) !== 0) return;
      if (!scoped || name.length > scoped.name.length) {
        scoped = { name: name, def: sidoByKey[name], rest: key.slice(name.length) };
      }
    });

    var items = [];
    if (scoped) items = findSgg(scoped.rest, scoped.def);

    // 2) 시도 이름 그대로 / 시군구 이름 그대로 (둘 다 모읍니다.
    //    "광주시"는 광주광역시이면서 경기도 광주시이기도 하니까요.)
    if (!items.length) items = findSido(key).concat(findSgg(key, null));

    // 3) 그래도 없으면 포함 검색
    if (!items.length) items = findLoose(key);

    items = dedupe(items);
    return {
      status: items.length ? "ok" : "notfound",
      query: query,
      source: source || "fallback",
      items: items
    };
  };
})();
