/* ===== Cloudflare Pages Function — GET /api/regions =====
   공공데이터포털 '행정안전부_통계연보_지방자치단체' 오픈API를 서버에서 대신 호출하고,
   응답에서 시도명·시군구명만 뽑아 브라우저로 돌려줍니다.

   왜 프록시를 두나요?
   - 오픈API 인증키를 브라우저로 내려보내지 않기 위해서입니다.
     인증키는 Cloudflare 대시보드의 환경변수(시크릿)에만 두고, 이 파일은 키 값을 갖지 않습니다.

   Cloudflare 환경변수 (Pages > 프로젝트 > Settings > Environment variables)
   - DATA_GO_KR_SERVICE_KEY : (필수) 공공데이터포털 일반 인증키
       DATA_GO_KR_API_KEY / REGION_API_KEY / SERVICE_KEY 이름으로 넣어도 인식합니다.
   - REGION_API_URL         : (권장) 데이터 상세 페이지의 '요청 URL' 전체
       예) https://apis.data.go.kr/1741000/XXXX/getXXXXList
       인증키·페이지 관련 파라미터는 이 함수가 붙이므로 빼고 넣으면 됩니다.
       넣지 않으면 아래 DEFAULT_ENDPOINTS를 차례로 시도합니다.

   응답
     { ok, source, count, regions: [{ sido, sgg }], fetchedAt }
   실패하면 502와 함께 { ok:false, error, hint, tried } 를 돌려줍니다.
   (프런트엔드는 실패 시 내장 표로 대신 조회하므로 화면이 멈추지는 않습니다.) */

/* REGION_API_URL이 없을 때 쓰는 기본 주소.
   '행정안전부_통계연보_지방자치단체'의 상세기능 '지방자치단체 통계 정보'입니다. */
const DEFAULT_ENDPOINTS = [
  "https://apis.data.go.kr/1741000/LocalGovernment/getLocalGovernment"
];

const KEY_VARS = [
  "DATA_GO_KR_SERVICE_KEY", "DATA_GO_KR_API_KEY",
  "REGION_API_KEY", "SERVICE_KEY", "DATA_PORTAL_KEY"
];

/* 공식 시도명 → 표준 표기. API가 '서울', '서울시'처럼 줄여 보내도 여기서 맞춥니다. */
const SIDO_CANON = {};
[
  ["서울특별시", ["서울", "서울시"]],
  ["부산광역시", ["부산", "부산시"]],
  ["대구광역시", ["대구", "대구시"]],
  ["인천광역시", ["인천", "인천시"]],
  ["광주광역시", ["광주"]],
  ["대전광역시", ["대전", "대전시"]],
  ["울산광역시", ["울산", "울산시"]],
  ["세종특별자치시", ["세종", "세종시", "세종특별시"]],
  ["경기도", ["경기"]],
  ["강원특별자치도", ["강원", "강원도"]],
  ["충청북도", ["충북"]],
  ["충청남도", ["충남"]],
  ["전북특별자치도", ["전북", "전라북도"]],
  ["전라남도", ["전남"]],
  ["경상북도", ["경북"]],
  ["경상남도", ["경남"]],
  ["제주특별자치도", ["제주", "제주도"]],
  ["전남광주통합특별시", ["전남광주", "전남광주시", "전남광주특별시", "전남광주통합시"]]
].forEach(function (pair) {
  SIDO_CANON[pair[0]] = pair[0];
  pair[1].forEach(function (a) { SIDO_CANON[a] = pair[0]; });
});

/* 시군구로 볼 수 있는 이름인지 (예: 강북구, 여수시, 양평군) */
const SGG_RE = /^[가-힣]{2,6}(시|군|구)$/;
/* 시군구 칼럼일 가능성이 높은 키 이름 */
const SGG_KEY_RE = /(sgg|signgu|sigungu|sggnm|시군구|자치구|기초|cty|county)/i;
/* 시도 칼럼일 가능성이 높은 키 이름 */
const SIDO_KEY_RE = /(sido|ctprvn|ctpv|시도|광역|province)/i;

function clean(v) {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
}

/** 중첩된 JSON 어디에 있든 '값이 객체가 아닌' 행 객체들을 모두 끌어모읍니다. */
function collectRows(node, out, depth) {
  if (!node || depth > 8) return out;
  if (Array.isArray(node)) {
    node.forEach(function (n) { collectRows(n, out, depth + 1); });
    return out;
  }
  if (typeof node !== "object") return out;

  var hasLeaf = false;
  Object.keys(node).forEach(function (k) {
    var v = node[k];
    if (v && typeof v === "object") collectRows(v, out, depth + 1);
    else if (clean(v)) hasLeaf = true;
  });
  if (hasLeaf) out.push(node);
  return out;
}

/** 행 하나에서 { sido, sgg } 뽑기. 칼럼 이름을 몰라도 값 모양으로 찾아냅니다. */
function pickRegion(row) {
  var sido = "", sgg = "";
  var keys = Object.keys(row);

  // 1순위: 칼럼 이름이 시도/시군구로 보이는 것
  keys.forEach(function (k) {
    var v = clean(row[k]);
    if (!v) return;
    if (!sido && SIDO_KEY_RE.test(k) && SIDO_CANON[v]) sido = SIDO_CANON[v];
    if (!sgg && SGG_KEY_RE.test(k) && SGG_RE.test(v) && !SIDO_CANON[v]) sgg = v;
  });

  // 2순위: 값 모양으로 판별
  keys.forEach(function (k) {
    var v = clean(row[k]);
    if (!v) return;
    if (!sido && SIDO_CANON[v]) sido = SIDO_CANON[v];
    else if (!sgg && SGG_RE.test(v) && !SIDO_CANON[v]) sgg = v;
  });

  // "서울특별시 강북구"처럼 한 칸에 붙어 오는 경우
  if (!sido || !sgg) {
    keys.forEach(function (k) {
      var v = clean(row[k]);
      var m = /^(\S+)\s+(\S+(?:시|군|구))$/.exec(v);
      if (m && SIDO_CANON[m[1]] && !SIDO_CANON[m[2]]) {
        if (!sido) sido = SIDO_CANON[m[1]];
        if (!sgg) sgg = m[2];
      }
    });
  }
  return sido ? { sido: sido, sgg: sgg } : null;
}

/** XML 응답을 <row>/<item> 단위의 평평한 객체 배열로 바꿉니다. */
function parseXmlRows(text) {
  var rows = [];
  var blockRe = /<(row|item)\b[^>]*>([\s\S]*?)<\/\1>/g;
  var block;
  while ((block = blockRe.exec(text))) {
    var obj = {};
    var tagRe = /<([A-Za-z_][\w.-]*)\b[^>]*>([^<]*)<\/\1>/g;
    var tag;
    while ((tag = tagRe.exec(block[2]))) {
      obj[tag[1]] = tag[2].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
    }
    if (Object.keys(obj).length) rows.push(obj);
  }
  return rows;
}

function buildUrl(base, serviceKey, pageNo, numOfRows) {
  var url = base.split("?")[0];
  // 인증키가 이미 퍼센트 인코딩된 형태(Encoding)면 그대로, 아니면 인코딩해서 붙입니다.
  var key = /%[0-9A-Fa-f]{2}/.test(serviceKey) ? serviceKey : encodeURIComponent(serviceKey);
  var qs = [];
  // 데이터마다 파라미터 이름이 serviceKey / ServiceKey로 갈려서 둘 다 보냅니다.
  qs.push("serviceKey=" + key);
  qs.push("ServiceKey=" + key);
  qs.push("pageNo=" + pageNo);
  qs.push("numOfRows=" + numOfRows);
  qs.push("type=json");
  qs.push("_type=json");
  return url + "?" + qs.join("&");
}

async function fetchRegions(base, serviceKey) {
  var regions = [];
  var seen = {};
  var pageNo = 1;
  var NUM = 1000;
  var MAX_PAGES = 5; // 지자체 수가 300 남짓이라 넉넉합니다.

  while (pageNo <= MAX_PAGES) {
    var res = await fetch(buildUrl(base, serviceKey, pageNo, NUM), {
      headers: { Accept: "application/json" },
      cf: { cacheTtl: 3600, cacheEverything: true }
    });
    if (!res.ok) throw new Error("HTTP " + res.status);

    var text = await res.text();
    if (/SERVICE[_ ]KEY|등록되지 않은|인증키|LIMITED_NUMBER|SERVICE ERROR/i.test(text) && !/"?row"?/i.test(text)) {
      throw new Error(text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200));
    }

    var rows;
    if (text.trim().charAt(0) === "<") {
      rows = parseXmlRows(text);
    } else {
      var json;
      try { json = JSON.parse(text); }
      catch (e) { throw new Error("JSON도 XML도 아닌 응답입니다: " + text.slice(0, 120)); }
      rows = collectRows(json, [], 0);
    }

    var before = regions.length;
    rows.forEach(function (r) {
      var hit = pickRegion(r);
      if (!hit) return;
      var key = hit.sido + "|" + hit.sgg;
      if (seen[key]) return;
      seen[key] = 1;
      regions.push(hit);
    });

    // 더 받아올 게 없으면 중단
    if (rows.length < NUM || regions.length === before) break;
    pageNo++;
  }
  return regions;
}

export async function onRequestGet(context) {
  var env = context.env || {};
  var serviceKey = "";
  for (var i = 0; i < KEY_VARS.length; i++) {
    if (env[KEY_VARS[i]]) { serviceKey = String(env[KEY_VARS[i]]).trim(); break; }
  }

  var headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=86400"
  };

  if (!serviceKey) {
    return new Response(JSON.stringify({
      ok: false,
      error: "인증키가 설정되어 있지 않습니다.",
      hint: "Cloudflare Pages > Settings > Environment variables에 DATA_GO_KR_SERVICE_KEY를 추가해주세요."
    }), { status: 502, headers: headers });
  }

  var endpoints = env.REGION_API_URL ? [String(env.REGION_API_URL).trim()] : DEFAULT_ENDPOINTS;
  var tried = [];

  for (var j = 0; j < endpoints.length; j++) {
    try {
      var regions = await fetchRegions(endpoints[j], serviceKey);
      if (regions.length >= 10) {
        regions.sort(function (a, b) {
          return a.sido.localeCompare(b.sido, "ko") || a.sgg.localeCompare(b.sgg, "ko");
        });
        return new Response(JSON.stringify({
          ok: true,
          source: endpoints[j],
          count: regions.length,
          fetchedAt: new Date().toISOString(),
          regions: regions
        }), { status: 200, headers: headers });
      }
      tried.push({ url: endpoints[j], reason: "지자체를 " + regions.length + "건만 찾았습니다." });
    } catch (e) {
      tried.push({ url: endpoints[j], reason: String(e && e.message || e) });
    }
  }

  return new Response(JSON.stringify({
    ok: false,
    error: "오픈API에서 지방자치단체 목록을 받아오지 못했습니다.",
    hint: "공공데이터포털 데이터 상세 페이지의 '요청 URL'을 Cloudflare 환경변수 REGION_API_URL에 넣어주세요.",
    tried: tried
  }), { status: 502, headers: headers });
}
