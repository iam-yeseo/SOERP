/* ===== Cloudflare Pages Function — GET /api/regions?q=<검색어> =====
   공공데이터포털 '행정안전부_행정표준코드_법정동코드'(StanReginCd)에서
   입력한 지역명을 찾아 돌려줍니다. 시도·시군구뿐 아니라 읍면동·리까지 나옵니다.

   왜 프록시를 두나요?
   - 오픈API 인증키를 브라우저로 내려보내지 않기 위해서입니다.
     인증키는 Cloudflare 대시보드의 환경변수(시크릿)에만 두고, 이 파일은 키 값을 갖지 않습니다.

   Cloudflare 환경변수 (Pages > 프로젝트 > Settings > Variables and Secrets)
   - DATA_GO_KR_SERVICE_KEY : (필수) 공공데이터포털 일반 인증키
       DATA_GO_KR_API_KEY / REGION_API_KEY / SERVICE_KEY 이름으로 넣어도 인식합니다.
   - REGION_API_URL         : (선택) 요청 URL이 바뀌었을 때만. 기본값은 아래 참고.

   응답
     { ok, q, matched, exact, level, total, shown, items: [...] }
     items[] = { code, level, full, name }
        level 1=시도, 2=시군구, 3=읍면동, 4=리
        full  = 지역주소명 (예: "서울특별시 강북구 미아동")
        name  = 최하위지역명 (예: "미아동")
   실패하면 502와 함께 { ok:false, error, hint } 를 돌려줍니다.
   (프런트엔드는 실패 시 내장 시도·시군구 표로 대신 조회합니다.) */

const DEFAULT_ENDPOINT = "https://apis.data.go.kr/1741000/StanReginCd/getStanReginCdList";

const KEY_VARS = [
  "DATA_GO_KR_SERVICE_KEY", "DATA_GO_KR_API_KEY",
  "REGION_API_KEY", "SERVICE_KEY", "DATA_PORTAL_KEY"
];

/* 접미사를 뺀 입력("강북", "여수")도 찾아주기 위해 붙여볼 글자들 */
const SUFFIXES = ["시", "군", "구", "읍", "면", "동", "리"];
const LEVEL_SUFFIX_RE = /[시군구읍면동리]$/;

const MAX_ROWS = 1000;   // 오픈API 한 번 호출 최대치 (에러코드 336)
const MAX_ITEMS = 60;    // 브라우저로 내려보낼 최대 건수

function clean(v) {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
}

/** 지역코드 자릿수로 단계 구분: 1=시도, 2=시군구, 3=읍면동, 4=리 */
function levelOf(r) {
  var sgg = clean(r.sgg_cd), umd = clean(r.umd_cd), ri = clean(r.ri_cd);
  if (!sgg || sgg === "000") return 1;
  if (!umd || umd === "000") return 2;
  if (!ri || ri === "00") return 3;
  return 4;
}

/** 중첩 JSON에서 row/item 배열을 찾습니다. 못 찾으면 법정동 칼럼을 가진 객체를 긁어옵니다. */
function extractRows(node, out, depth) {
  if (!node || depth > 8) return out;
  if (Array.isArray(node)) {
    node.forEach(function (n) { extractRows(n, out, depth + 1); });
    return out;
  }
  if (typeof node !== "object") return out;
  if (clean(node.region_cd) || clean(node.locatadd_nm)) { out.push(node); return out; }
  Object.keys(node).forEach(function (k) {
    if (node[k] && typeof node[k] === "object") extractRows(node[k], out, depth + 1);
  });
  return out;
}

/** XML 응답을 <row> 단위 객체 배열로 바꿉니다. */
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

function buildUrl(base, serviceKey, q) {
  // 인증키가 이미 퍼센트 인코딩된 형태(Encoding)면 그대로, 아니면 인코딩해서 붙입니다.
  var key = /%[0-9A-Fa-f]{2}/.test(serviceKey) ? serviceKey : encodeURIComponent(serviceKey);
  return base.split("?")[0] +
    "?ServiceKey=" + key +
    "&type=json" +
    "&pageNo=1" +
    "&numOfRows=" + MAX_ROWS +
    "&flag=Y" +
    "&locatadd_nm=" + encodeURIComponent(q);
}

/** 오픈API 한 번 호출. 데이터가 없으면 빈 배열, 인증·서버 오류면 throw. */
async function callApi(base, serviceKey, q) {
  var res = await fetch(buildUrl(base, serviceKey, q), {
    headers: { Accept: "application/json" },
    cf: { cacheTtl: 21600, cacheEverything: true }
  });
  if (!res.ok) throw new Error("HTTP " + res.status);

  var text = await res.text();
  var rows;
  if (text.trim().charAt(0) === "<") {
    rows = parseXmlRows(text);
  } else {
    var json;
    try { json = JSON.parse(text); }
    catch (e) { rows = parseXmlRows(text); }
    if (json) rows = extractRows(json, [], 0);
  }
  if (rows && rows.length) return rows;

  // 행이 없으면 결과코드를 보고 '데이터 없음'인지 '오류'인지 가릅니다.
  var code = (/"?resultCode"?\s*[":>]+\s*"?([A-Za-z0-9-]+)/.exec(text) || [])[1] || "";
  var msg = clean((/"?resultMsg"?\s*[":>]+\s*"?([^"<,}]+)/.exec(text) || [])[1] || "");
  var auth = clean((/<returnAuthMsg>([^<]*)<\/returnAuthMsg>/.exec(text) || [])[1] || "");

  if (auth) throw new Error(auth);
  if (/^(INFO-?0*|0)$/i.test(code)) return [];            // 정상인데 결과 없음
  if (/^(INFO-?200|200)$/i.test(code)) return [];          // 해당하는 데이터가 없습니다
  if (code || msg) throw new Error((code ? code + " " : "") + (msg || "ERROR"));
  return [];
}

/**
 * 입력어로 검색합니다. 결과가 없으면 접미사(시/군/구/읍/면/동/리)를 붙여
 * 한 번에 병렬로 다시 찾아봅니다. ("강북" → "강북구", "여수" → "여수시")
 */
async function search(base, serviceKey, q) {
  var rows = await callApi(base, serviceKey, q);
  if (rows.length) return { matched: q, rows: rows };

  if (LEVEL_SUFFIX_RE.test(q)) return { matched: q, rows: [] };

  var tries = await Promise.all(SUFFIXES.map(function (sfx) {
    return callApi(base, serviceKey, q + sfx)
      .then(function (r) { return { q: q + sfx, rows: r }; })
      .catch(function () { return { q: q + sfx, rows: [] }; });
  }));

  var merged = [], matched = [];
  tries.forEach(function (t) {
    if (!t.rows.length) return;
    matched.push(t.q);
    merged = merged.concat(t.rows);
  });
  return { matched: matched.join(", ") || q, rows: merged };
}

/** 행 목록 → 화면용 항목. 이름이 정확히 일치하는 게 있으면 그것만 남깁니다. */
function shape(rows, q) {
  var seen = {}, items = [];
  rows.forEach(function (r) {
    var code = clean(r.region_cd);
    var full = clean(r.locatadd_nm);
    if (!full || (code && seen[code])) return;
    if (code) seen[code] = 1;
    items.push({
      code: code,
      level: levelOf(r),
      full: full,
      name: clean(r.locallow_nm) || full.split(" ").pop()
    });
  });

  // '중구'를 치면 중구들만, '서울특별시'를 치면 서울특별시만 나오도록.
  // 접미사를 뺀 입력도 여기서 걸러냅니다. ('여수' → '여수시', '신월' → 신월동·신월리)
  var wanted = [q];
  if (!LEVEL_SUFFIX_RE.test(q)) {
    SUFFIXES.forEach(function (sfx) { wanted.push(q + sfx); });
  }
  var exactNames = items.filter(function (it) { return wanted.indexOf(it.name) >= 0; });
  var exact = exactNames.length > 0;
  if (exact) items = exactNames;

  items.sort(function (a, b) {
    return a.level - b.level || a.code.localeCompare(b.code) || a.full.localeCompare(b.full, "ko");
  });
  return { exact: exact, items: items };
}

export async function onRequestGet(context) {
  var headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=21600"
  };

  var url = new URL(context.request.url);
  var q = (url.searchParams.get("q") || "").replace(/\s+/g, " ").trim();
  if (!q) {
    return new Response(JSON.stringify({ ok: false, error: "검색어(q)가 없습니다." }),
      { status: 400, headers: headers });
  }
  if (q.length > 50) q = q.slice(0, 50); // locatadd_nm 항목크기

  var env = context.env || {};
  var serviceKey = "";
  for (var i = 0; i < KEY_VARS.length; i++) {
    if (env[KEY_VARS[i]]) { serviceKey = String(env[KEY_VARS[i]]).trim(); break; }
  }
  if (!serviceKey) {
    return new Response(JSON.stringify({
      ok: false,
      error: "인증키가 설정되어 있지 않습니다.",
      hint: "Cloudflare Pages > Settings > Variables and Secrets에 DATA_GO_KR_SERVICE_KEY를 추가해주세요."
    }), { status: 502, headers: headers });
  }

  var base = String(env.REGION_API_URL || DEFAULT_ENDPOINT).trim();

  try {
    var found = await search(base, serviceKey, q);
    var shaped = shape(found.rows, q);
    return new Response(JSON.stringify({
      ok: true,
      q: q,
      matched: found.matched,
      exact: shaped.exact,
      total: shaped.items.length,
      shown: Math.min(shaped.items.length, MAX_ITEMS),
      items: shaped.items.slice(0, MAX_ITEMS)
    }), { status: 200, headers: headers });
  } catch (e) {
    return new Response(JSON.stringify({
      ok: false,
      error: "법정동코드 오픈API 호출에 실패했습니다.",
      detail: String(e && e.message || e),
      hint: "인증키와 REGION_API_URL을 확인해주세요. 기본 요청 URL은 " + DEFAULT_ENDPOINT + " 입니다."
    }), { status: 502, headers: headers });
  }
}
