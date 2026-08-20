/* ===== PDF 마법봉 =====
   1) 여러 개의 PDF를 하나로 병합 (파일 순서 변경 · 파일별 회전 · 미리보기 · 파일명 지정)
   2) 단일 PDF의 페이지 방향 회전 (페이지별 / 전체)

   모든 처리는 브라우저 안에서만 이루어지며 파일이 서버로 전송되지 않습니다.
   PDF 편집은 pdf-lib, 미리보기 렌더링은 pdf.js를 사용하며 두 라이브러리는
   이 페이지에 처음 들어올 때만 CDN에서 지연 로드됩니다. */
window.WM = window.WM || {};

(function () {
  /* CDN 두 곳을 순서대로 시도 (앞쪽이 실패하면 다음 것으로 폴백) */
  var LIB_SOURCES = [
    {
      pdflib: "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js",
      pdfjs: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js",
      worker: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js"
    },
    {
      pdflib: "https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js",
      pdfjs: "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js",
      worker: "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js"
    }
  ];

  var MAX_FILE_BYTES = 150 * 1024 * 1024; // 파일 1개 최대 150MB (브라우저 메모리 보호)
  var THUMB_PX = 220;                     // 썸네일 렌더 해상도(긴 변 기준)
  var PREVIEW_PX = 1400;                  // 미리보기 렌더 해상도(긴 변 기준)

  /* ---- 상태 (라우트 이동 후 돌아와도 유지되도록 모듈 스코프에 보관) ---- */
  var S = {
    tab: "merge",     // "merge" | "rotate"
    files: [],        // 병합 목록: { id, name, size, bytes, pageCount, rotation, thumb }
    mergeName: "",    // 병합 결과 파일명 (확장자 제외)
    single: null,     // 회전 대상: { id, name, size, bytes, pageCount, rotations[], thumbs[] }
    singleName: "",   // 회전 결과 파일명 (확장자 제외)
    preview: null,    // 미리보기 모달 { scope, fileId, page, total, rotation }
    loading: false,   // 파일 읽는 중
    working: false,   // 내보내기 진행 중
    libError: ""      // 라이브러리 로드 실패 메시지
  };
  WM.pdfWand = S;

  /* ---- 라이브러리 지연 로드 ---- */
  var libsPromise = null;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { s.remove(); reject(new Error("불러오기 실패: " + src)); };
      document.head.appendChild(s);
    });
  }

  function ensureLibs() {
    if (window.PDFLib && window.pdfjsLib) return Promise.resolve();
    if (libsPromise) return libsPromise;

    libsPromise = (async function () {
      var lastErr = null;
      for (var i = 0; i < LIB_SOURCES.length; i++) {
        var src = LIB_SOURCES[i];
        try {
          if (!window.PDFLib) await loadScript(src.pdflib);
          if (!window.pdfjsLib) await loadScript(src.pdfjs);
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = src.worker;
          return;
        } catch (e) {
          lastErr = e;
        }
      }
      throw lastErr || new Error("PDF 라이브러리를 불러오지 못했습니다.");
    })().catch(function (e) {
      libsPromise = null; // 다음 시도 때 다시 받을 수 있도록 초기화
      throw e;
    });

    return libsPromise;
  }

  /* ---- 작은 헬퍼 ---- */
  function isPdf(file) {
    return file && (file.type === "application/pdf" || /\.pdf$/i.test(file.name || ""));
  }

  function readBytes(file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(new Uint8Array(fr.result)); };
      fr.onerror = function () { reject(new Error("파일을 읽지 못했습니다.")); };
      fr.readAsArrayBuffer(file);
    });
  }

  /** 0/90/180/270 으로 정규화 */
  function normAngle(deg) {
    var n = Math.round((Number(deg) || 0) / 90) * 90 % 360;
    return n < 0 ? n + 360 : n;
  }

  /** 확장자를 뺀 파일명 */
  function baseName(name) {
    return String(name || "").replace(/\.pdf$/i, "");
  }

  /** 파일 시스템에서 쓸 수 없는 문자를 제거하고 .pdf 를 붙임 */
  function safeName(raw, fallback) {
    var n = String(raw || "").trim().replace(/[\\/:*?"<>|]/g, "").replace(/\.pdf$/i, "").trim();
    if (!n) n = fallback;
    return n + ".pdf";
  }

  function downloadBytes(bytes, filename) {
    var blob = new Blob([bytes], { type: "application/pdf" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
  }

  function isEncrypted(e) {
    return !!e && (e.name === "EncryptedPDFError" || /encrypt|password/i.test(e.message || ""));
  }

  function errorMessage(e) {
    if (isEncrypted(e)) return "암호가 걸린 PDF는 처리할 수 없습니다. 암호를 해제한 뒤 다시 시도해주세요.";
    return (e && e.message) || "알 수 없는 오류가 발생했습니다.";
  }

  /** 파일을 여는 단계의 오류는 내부 메시지 대신 사용자가 알아들을 수 있는 문장으로 */
  function openErrorMessage(e) {
    if (isEncrypted(e)) return "암호가 걸린 PDF는 처리할 수 없습니다. 암호를 해제한 뒤 다시 시도해주세요.";
    return "PDF를 열 수 없습니다. 파일이 손상되지 않았는지 확인해주세요.";
  }

  /* ---- pdf.js 문서 캐시 (미리보기/썸네일용) ---- */
  var docCache = {}; // id → Promise<PDFDocumentProxy>

  function getPdfDoc(id, bytes) {
    if (!docCache[id]) {
      // pdf.js는 전달한 버퍼를 워커로 넘기며 비워버리므로 항상 복사본을 준다
      docCache[id] = window.pdfjsLib.getDocument({ data: bytes.slice() }).promise;
    }
    return docCache[id];
  }

  function dropPdfDoc(id) {
    var p = docCache[id];
    if (!p) return;
    delete docCache[id];
    p.then(function (doc) { doc.destroy(); }).catch(function () { /* 무시 */ });
  }

  function clearPdfDocs() {
    Object.keys(docCache).forEach(dropPdfDoc);
  }

  /** 지정 페이지를 렌더링해서 data URL 로 반환 */
  async function renderPageDataUrl(id, bytes, pageNo, maxSide) {
    var doc = await getPdfDoc(id, bytes);
    var page = await doc.getPage(pageNo);
    var base = page.getViewport({ scale: 1 });
    var scale = maxSide / Math.max(base.width, base.height);
    var vp = page.getViewport({ scale: scale });
    var canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(vp.width));
    canvas.height = Math.max(1, Math.ceil(vp.height));
    await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
    return canvas.toDataURL("image/png");
  }

  /* ================= 렌더 ================= */

  function rotClass(deg) {
    var d = normAngle(deg);
    return d ? " r" + d : "";
  }

  /** 썸네일 상자. src 가 없으면 로딩 자리표시자를 두고 나중에 채운다 */
  function thumbBox(key, src, rotation, big) {
    var cls = "pw-thumb" + (big ? " pw-thumb-lg" : "");
    var inner = src
      ? '<img src="' + src + '" class="pw-thumb-img' + rotClass(rotation) + '" alt="미리보기" />'
      : '<span class="spinner pw-thumb-spin" aria-hidden="true"></span>';
    return '<div class="' + cls + '" data-pw-thumb="' + WM.esc(key) + '">' + inner + "</div>";
  }

  function rotBadge(deg) {
    var d = normAngle(deg);
    if (!d) return "";
    return ' <span class="pw-rot-badge">' + d + "°</span>";
  }

  function iconBtn(action, extra, icon, label) {
    return '<button type="button" class="pw-mini" data-action="' + action + '" ' + extra +
      ' title="' + WM.esc(label) + '" aria-label="' + WM.esc(label) + '">' + WM.icon(icon, 15) + "</button>";
  }

  function dropZone(scope, title, hint) {
    return '<label class="pw-drop" data-pw-drop="' + scope + '">' +
      '<input type="file" class="pw-file-input" accept="application/pdf,.pdf"' +
        (scope === "merge" ? " multiple" : "") + ' data-pw-input="' + scope + '" />' +
      '<span class="pw-drop-icon">' + WM.icon("upload", 20) + "</span>" +
      '<span class="pw-drop-title">' + WM.esc(title) + "</span>" +
      '<span class="pw-drop-hint">' + WM.esc(hint) + "</span>" +
    "</label>";
  }

  /* ---- 병합 탭 ---- */
  function mergeRow(f, idx, total) {
    var actions =
      iconBtn("pw-rot-file", 'data-id="' + f.id + '" data-dir="-1"', "rotate", "왼쪽으로 90° 회전") +
      iconBtn("pw-rot-file", 'data-id="' + f.id + '" data-dir="1"', "rotateright", "오른쪽으로 90° 회전") +
      iconBtn("pw-preview", 'data-scope="merge" data-id="' + f.id + '"', "eye", "미리보기") +
      '<span class="pw-mini-gap"></span>' +
      '<button type="button" class="pw-mini" data-action="pw-move" data-id="' + f.id + '" data-dir="-1"' +
        (idx === 0 ? " disabled" : "") + ' title="위로" aria-label="위로 이동">' + WM.icon("chevronup", 15) + "</button>" +
      '<button type="button" class="pw-mini" data-action="pw-move" data-id="' + f.id + '" data-dir="1"' +
        (idx === total - 1 ? " disabled" : "") + ' title="아래로" aria-label="아래로 이동">' + WM.icon("chevrondown", 15) + "</button>" +
      '<button type="button" class="pw-mini pw-mini-danger" data-action="pw-remove" data-id="' + f.id + '"' +
        ' title="목록에서 빼기" aria-label="목록에서 빼기">' + WM.icon("trash", 15) + "</button>";

    return '<li class="pw-item" data-pw-file="' + f.id + '">' +
        '<span class="pw-grip" data-pw-grip title="끌어서 순서 변경">' + WM.icon("grip", 16) + "</span>" +
        '<span class="pw-order">' + (idx + 1) + "</span>" +
        thumbBox("merge:" + f.id, f.thumb, f.rotation, false) +
        '<div class="pw-meta">' +
          '<p class="pw-name" title="' + WM.esc(f.name) + '">' + WM.esc(f.name) + "</p>" +
          '<p class="pw-sub">' + f.pageCount + "쪽 · " + WM.formatBytes(f.size) + rotBadge(f.rotation) + "</p>" +
        "</div>" +
        '<div class="pw-actions">' + actions + "</div>" +
      "</li>";
  }

  function mergeTab() {
    var total = S.files.length;
    var pages = S.files.reduce(function (sum, f) { return sum + f.pageCount; }, 0);

    var list = total
      ? '<ul class="pw-list">' + S.files.map(function (f, i) { return mergeRow(f, i, total); }).join("") + "</ul>"
      : WM.emptyState("아직 추가된 PDF가 없습니다.", "위 영역에 PDF 파일을 2개 이상 올려주세요.");

    var canExport = total >= 2 && !S.working;
    var hint = total === 0 ? "PDF를 2개 이상 추가하면 병합할 수 있습니다."
      : total === 1 ? "PDF가 1개뿐입니다. 하나 더 추가해주세요."
      : "총 " + total + "개 파일 · " + pages + "쪽이 위에서부터 순서대로 이어집니다.";

    return '<div class="card section-card pw-card">' +
        dropZone("merge", "PDF 파일을 끌어다 놓거나 클릭해서 선택하세요",
          "여러 개를 한 번에 선택할 수 있습니다 (파일당 최대 150MB)") +
        '<div class="pw-list-head">' +
          '<p class="sec-h">병합할 파일 (' + total + ")</p>" +
          (total ? '<button type="button" class="btn btn-outline btn-sm" data-action="pw-clear-merge">' +
            WM.icon("trash", 13) + "<span>전체 비우기</span></button>" : "") +
        "</div>" +
        list +
      "</div>" +
      '<div class="card section-card pw-card pw-export">' +
        '<div class="pw-export-row">' +
          '<div class="pw-name-field">' +
            '<label class="field-label" for="pw-merge-name">저장할 파일 이름</label>' +
            '<div class="pw-name-input">' +
              '<input class="input" id="pw-merge-name" data-pw-name="merge" placeholder="병합문서" value="' +
                WM.esc(S.mergeName) + '" />' +
              '<span class="pw-ext">.pdf</span>' +
            "</div>" +
          "</div>" +
          '<button type="button" class="btn btn-primary pw-export-btn" data-action="pw-export-merge"' +
            (canExport ? "" : " disabled") + ">" +
            (S.working ? '<span class="spinner spinner-sm" aria-hidden="true"></span>' : WM.icon("download", 15)) +
            "<span>" + (S.working ? "만드는 중..." : "병합 PDF 내보내기") + "</span></button>" +
        "</div>" +
        '<p class="pw-export-hint">' + WM.esc(hint) + "</p>" +
      "</div>";
  }

  /* ---- 회전 탭 ---- */
  function rotatePageCard(i) {
    var deg = normAngle(S.single.rotations[i]);
    return '<div class="pw-page" data-pw-page="' + i + '">' +
        thumbBox("single:" + (i + 1), S.single.thumbs[i], deg, true) +
        '<div class="pw-page-foot">' +
          '<span class="pw-page-no">' + (i + 1) + "쪽" + rotBadge(deg) + "</span>" +
          '<span class="pw-page-btns">' +
            iconBtn("pw-rot-page", 'data-idx="' + i + '" data-dir="-1"', "rotate", (i + 1) + "쪽 왼쪽으로 회전") +
            iconBtn("pw-rot-page", 'data-idx="' + i + '" data-dir="1"', "rotateright", (i + 1) + "쪽 오른쪽으로 회전") +
            iconBtn("pw-preview", 'data-scope="single" data-idx="' + i + '"', "eye", (i + 1) + "쪽 크게 보기") +
          "</span>" +
        "</div>" +
      "</div>";
  }

  function rotateTab() {
    if (!S.single) {
      return '<div class="card section-card pw-card">' +
          dropZone("single", "회전할 PDF 파일을 끌어다 놓거나 클릭해서 선택하세요",
            "파일 1개만 선택할 수 있습니다 (최대 150MB)") +
          WM.emptyState("아직 선택된 PDF가 없습니다.", "PDF를 올리면 페이지별로 방향을 돌릴 수 있습니다.") +
        "</div>";
    }

    var changed = S.single.rotations.filter(function (r) { return normAngle(r) !== 0; }).length;

    return '<div class="card section-card pw-card">' +
        '<div class="pw-file-bar">' +
          '<div class="pw-meta">' +
            '<p class="pw-name" title="' + WM.esc(S.single.name) + '">' + WM.esc(S.single.name) + "</p>" +
            '<p class="pw-sub">' + S.single.pageCount + "쪽 · " + WM.formatBytes(S.single.size) +
              (changed ? " · " + changed + "쪽 회전됨" : "") + "</p>" +
          "</div>" +
          '<div class="pw-file-bar-btns">' +
            '<button type="button" class="btn btn-outline btn-sm" data-action="pw-rot-all" data-dir="-1">' +
              WM.icon("rotate", 13) + "<span>전체 왼쪽</span></button>" +
            '<button type="button" class="btn btn-outline btn-sm" data-action="pw-rot-all" data-dir="1">' +
              WM.icon("rotateright", 13) + "<span>전체 오른쪽</span></button>" +
            '<button type="button" class="btn btn-outline btn-sm" data-action="pw-rot-reset"' +
              (changed ? "" : " disabled") + ">" + WM.icon("x", 13) + "<span>회전 초기화</span></button>" +
            '<button type="button" class="btn btn-outline btn-sm" data-action="pw-clear-single">' +
              WM.icon("upload", 13) + "<span>다른 파일</span></button>" +
          "</div>" +
        "</div>" +
        '<div class="pw-page-grid">' +
          S.single.rotations.map(function (_, i) { return rotatePageCard(i); }).join("") +
        "</div>" +
      "</div>" +
      '<div class="card section-card pw-card pw-export">' +
        '<div class="pw-export-row">' +
          '<div class="pw-name-field">' +
            '<label class="field-label" for="pw-single-name">저장할 파일 이름</label>' +
            '<div class="pw-name-input">' +
              '<input class="input" id="pw-single-name" data-pw-name="single" placeholder="회전문서" value="' +
                WM.esc(S.singleName) + '" />' +
              '<span class="pw-ext">.pdf</span>' +
            "</div>" +
          "</div>" +
          '<button type="button" class="btn btn-primary pw-export-btn" data-action="pw-export-single"' +
            (S.working ? " disabled" : "") + ">" +
            (S.working ? '<span class="spinner spinner-sm" aria-hidden="true"></span>' : WM.icon("download", 15)) +
            "<span>" + (S.working ? "만드는 중..." : "회전한 PDF 내보내기") + "</span></button>" +
        "</div>" +
        '<p class="pw-export-hint">' +
          (changed ? changed + "쪽의 방향이 바뀐 새 PDF를 내려받습니다. 원본 파일은 그대로 남습니다."
                   : "회전한 페이지가 없어도 그대로 내보낼 수 있습니다.") + "</p>" +
      "</div>";
  }

  /* ---- 본문 ---- */
  function tabs() {
    function tab(key, icon, label) {
      return '<button type="button" class="pw-tab' + (S.tab === key ? " active" : "") +
        '" data-action="pw-tab" data-tab="' + key + '">' + WM.icon(icon, 15) + "<span>" + label + "</span></button>";
    }
    return '<div class="pw-tabs">' + tab("merge", "filestack", "PDF 병합") + tab("rotate", "rotate", "페이지 회전") + "</div>";
  }

  function body() {
    if (S.libError) {
      return '<div class="card section-card pw-card">' +
          '<div class="pw-error">' + WM.icon("warning", 20) +
            "<p>PDF 처리 라이브러리를 불러오지 못했습니다.</p>" +
            '<p class="pw-error-sub">' + WM.esc(S.libError) + "</p>" +
            '<button type="button" class="btn btn-outline btn-sm" data-action="pw-retry-libs">' +
              WM.icon("rotate", 13) + "<span>다시 시도</span></button>" +
          "</div>" +
        "</div>";
    }
    return tabs() +
      (S.loading ? '<div class="pw-loading">' + WM.renderLoading("PDF를 읽는 중...") + "</div>" : "") +
      (S.tab === "merge" ? mergeTab() : rotateTab());
  }

  /** PDF 마법봉 페이지 */
  WM.renderPdfWand = function () {
    return '<div class="page-head page-head-row">' +
        "<div><h1>PDF 마법봉</h1>" +
          "<p>여러 PDF를 하나로 합치거나 페이지 방향을 돌립니다. 파일은 브라우저 안에서만 처리되어 어디에도 업로드되지 않습니다.</p>" +
        "</div>" +
        '<button type="button" class="btn btn-outline" data-action="pw-reset-all">' +
          WM.icon("rotate", 16) + "<span>초기화</span></button>" +
      "</div>" +
      '<div id="pw-root"></div>';
  };

  /* ================= 페인팅 ================= */
  function paint() {
    var root = document.getElementById("pw-root");
    if (!root) return;
    root.innerHTML = body();
    paintThumbs();
  }

  /** 아직 렌더되지 않은 썸네일을 순차적으로 채운다 */
  var thumbQueueRunning = false;
  function paintThumbs() {
    if (thumbQueueRunning || S.libError) return;

    var jobs = [];
    if (S.tab === "merge") {
      S.files.forEach(function (f) {
        if (!f.thumb) jobs.push({ key: "merge:" + f.id, id: f.id, bytes: f.bytes, page: 1,
          save: function (url) { f.thumb = url; } });
      });
    } else if (S.single) {
      S.single.rotations.forEach(function (_, i) {
        if (!S.single.thumbs[i]) jobs.push({ key: "single:" + (i + 1), id: S.single.id, bytes: S.single.bytes,
          page: i + 1, save: function (url) { S.single.thumbs[i] = url; } });
      });
    }
    if (!jobs.length) return;

    thumbQueueRunning = true;
    (async function () {
      try {
        await ensureLibs();
        for (var i = 0; i < jobs.length; i++) {
          var job = jobs[i];
          try {
            var url = await renderPageDataUrl(job.id, job.bytes, job.page, THUMB_PX);
            job.save(url);
            fillThumb(job.key, url);
          } catch (e) {
            console.error("썸네일 렌더 실패", e);
            fillThumbFailed(job.key);
          }
        }
      } catch (e) {
        setLibError(errorMessage(e));
      } finally {
        thumbQueueRunning = false;
      }
      // 처리 중 새 파일이 추가되었을 수 있으므로 한 번 더 확인
      paintThumbs();
    })();
  }

  function findThumbEl(key) {
    var root = document.getElementById("pw-root");
    if (!root) return null;
    return root.querySelector('[data-pw-thumb="' + key.replace(/"/g, '\\"') + '"]');
  }

  function fillThumb(key, url) {
    var el = findThumbEl(key);
    if (!el) return;
    var rotation = 0;
    if (key.indexOf("merge:") === 0) {
      var f = getFile(key.slice(6));
      rotation = f ? f.rotation : 0;
    } else if (S.single) {
      rotation = S.single.rotations[Number(key.slice(7)) - 1] || 0;
    }
    el.innerHTML = '<img src="' + url + '" class="pw-thumb-img' + rotClass(rotation) + '" alt="미리보기" />';
  }

  function fillThumbFailed(key) {
    var el = findThumbEl(key);
    if (el) el.innerHTML = '<span class="pw-thumb-fail">' + WM.icon("image", 18) + "</span>";
  }

  /** 회전만 바뀐 경우 전체 다시 그리지 않고 이미지 클래스만 교체 */
  function applyRotationClass(key, rotation) {
    var el = findThumbEl(key);
    if (!el) return false;
    var img = el.querySelector("img");
    if (!img) return false;
    img.className = "pw-thumb-img" + rotClass(rotation);
    return true;
  }

  function setLibError(msg) {
    S.libError = msg;
    paint();
  }

  /* ================= 액션 ================= */
  function getFile(id) {
    return S.files.find(function (f) { return f.id === id; });
  }

  /** 선택/드롭된 파일을 상태에 추가 */
  async function addFiles(fileList, scope) {
    var incoming = Array.prototype.slice.call(fileList || []);
    if (!incoming.length) return;

    var pdfs = incoming.filter(isPdf);
    var skipped = incoming.length - pdfs.length;
    if (skipped) WM.toast(skipped + "개 파일은 PDF가 아니어서 제외했습니다.", "error");

    var tooBig = pdfs.filter(function (f) { return f.size > MAX_FILE_BYTES; });
    if (tooBig.length) {
      WM.toast("150MB가 넘는 파일은 제외했습니다.", "error");
      pdfs = pdfs.filter(function (f) { return f.size <= MAX_FILE_BYTES; });
    }
    if (!pdfs.length) return;

    if (scope === "single" && pdfs.length > 1) {
      WM.toast("페이지 회전은 파일 1개씩만 할 수 있어 첫 번째 파일만 불러옵니다.");
      pdfs = pdfs.slice(0, 1);
    }

    S.loading = true;
    paint();

    try {
      await ensureLibs();
    } catch (e) {
      S.loading = false;
      setLibError(errorMessage(e));
      return;
    }

    var added = 0, failed = 0;
    for (var i = 0; i < pdfs.length; i++) {
      var file = pdfs[i];
      try {
        var bytes = await readBytes(file);
        var doc = await window.PDFLib.PDFDocument.load(bytes.slice());
        var count = doc.getPageCount();
        if (!count) throw new Error("페이지가 없는 PDF입니다.");

        if (scope === "single") {
          if (S.single) dropPdfDoc(S.single.id);
          S.single = {
            id: WM.uid(), name: file.name, size: file.size, bytes: bytes,
            pageCount: count, rotations: new Array(count).fill(0), thumbs: new Array(count).fill(null)
          };
          if (!S.singleName) S.singleName = baseName(file.name) + "_회전";
        } else {
          S.files.push({
            id: WM.uid(), name: file.name, size: file.size, bytes: bytes,
            pageCount: count, rotation: 0, thumb: null
          });
        }
        added++;
      } catch (e) {
        failed++;
        console.error("PDF 읽기 실패", file.name, e);
        WM.toast('"' + file.name + '" — ' + openErrorMessage(e), "error");
      }
    }

    S.loading = false;
    paint();
    if (added) WM.toast(scope === "single" ? "PDF를 불러왔습니다." : added + "개 PDF를 추가했습니다.");
    else if (!failed) WM.toast("추가된 파일이 없습니다.", "error");
  }

  function moveFile(id, dir) {
    var idx = S.files.findIndex(function (f) { return f.id === id; });
    if (idx === -1) return;
    var to = idx + dir;
    if (to < 0 || to >= S.files.length) return;
    var item = S.files.splice(idx, 1)[0];
    S.files.splice(to, 0, item);
    paint();
  }

  function reorderFile(fromId, toId, before) {
    if (fromId === toId) return;
    var fromIdx = S.files.findIndex(function (f) { return f.id === fromId; });
    if (fromIdx === -1) return;
    var item = S.files.splice(fromIdx, 1)[0];
    var toIdx = S.files.findIndex(function (f) { return f.id === toId; });
    if (toIdx === -1) { S.files.splice(fromIdx, 0, item); return; }
    S.files.splice(before ? toIdx : toIdx + 1, 0, item);
    paint();
  }

  function removeFile(id) {
    S.files = S.files.filter(function (f) { return f.id !== id; });
    dropPdfDoc(id);
    paint();
  }

  function rotateFile(id, dir) {
    var f = getFile(id);
    if (!f) return;
    f.rotation = normAngle(f.rotation + dir * 90);
    // 회전 배지/부제목도 갱신해야 하므로 목록을 다시 그린다
    if (!applyRotationClass("merge:" + f.id, f.rotation)) paint();
    else refreshMergeRowText(f);
  }

  /** 회전 각도 배지만 갱신 (목록 전체를 다시 그리지 않기 위해) */
  function refreshMergeRowText(f) {
    var root = document.getElementById("pw-root");
    if (!root) return;
    var li = root.querySelector('[data-pw-file="' + f.id + '"]');
    if (!li) { paint(); return; }
    var subEl = li.querySelector(".pw-sub");
    if (subEl) subEl.innerHTML = f.pageCount + "쪽 · " + WM.formatBytes(f.size) + rotBadge(f.rotation);
  }

  function rotatePage(idx, dir) {
    if (!S.single) return;
    S.single.rotations[idx] = normAngle(S.single.rotations[idx] + dir * 90);
    // 배지·안내 문구가 함께 바뀌므로 전체를 다시 그린다 (썸네일은 캐시되어 있어 즉시 반영)
    paint();
  }

  function rotateAll(dir) {
    if (!S.single) return;
    S.single.rotations = S.single.rotations.map(function (r) { return normAngle(r + dir * 90); });
    paint();
  }

  function resetRotations() {
    if (!S.single) return;
    S.single.rotations = S.single.rotations.map(function () { return 0; });
    paint();
  }

  function clearMerge() {
    S.files.forEach(function (f) { dropPdfDoc(f.id); });
    S.files = [];
    paint();
  }

  function clearSingle() {
    if (S.single) dropPdfDoc(S.single.id);
    S.single = null;
    S.singleName = "";
    paint();
  }

  /** 전체 초기화 (사이드바 페이지 상단 버튼) */
  WM.resetPdfWand = function () {
    clearPdfDocs();
    S.files = [];
    S.single = null;
    S.mergeName = "";
    S.singleName = "";
    S.preview = null;
    S.loading = false;
    S.working = false;
    document.getElementById("modal-root").innerHTML = "";
    paint();
  };

  /* ---- 내보내기 ---- */
  async function exportMerge() {
    if (S.files.length < 2 || S.working) return;
    S.working = true;
    paint();
    try {
      await ensureLibs();
      var out = await window.PDFLib.PDFDocument.create();
      for (var i = 0; i < S.files.length; i++) {
        var f = S.files[i];
        var src = await window.PDFLib.PDFDocument.load(f.bytes.slice());
        var copied = await out.copyPages(src, src.getPageIndices());
        for (var p = 0; p < copied.length; p++) {
          var page = copied[p];
          if (f.rotation) {
            var base = normAngle(page.getRotation().angle);
            page.setRotation(window.PDFLib.degrees(normAngle(base + f.rotation)));
          }
          out.addPage(page);
        }
      }
      var bytes = await out.save();
      downloadBytes(bytes, safeName(S.mergeName, "병합문서"));
      WM.toast("병합된 PDF를 내려받았습니다.");
    } catch (e) {
      console.error("PDF 병합 실패", e);
      WM.toast("병합에 실패했습니다. " + errorMessage(e), "error");
    } finally {
      S.working = false;
      paint();
    }
  }

  async function exportSingle() {
    if (!S.single || S.working) return;
    S.working = true;
    paint();
    try {
      await ensureLibs();
      var doc = await window.PDFLib.PDFDocument.load(S.single.bytes.slice());
      doc.getPages().forEach(function (page, i) {
        var add = normAngle(S.single.rotations[i]);
        var base = normAngle(page.getRotation().angle);
        page.setRotation(window.PDFLib.degrees(normAngle(base + add)));
      });
      var bytes = await doc.save();
      downloadBytes(bytes, safeName(S.singleName, baseName(S.single.name) + "_회전"));
      WM.toast("회전한 PDF를 내려받았습니다.");
    } catch (e) {
      console.error("PDF 회전 실패", e);
      WM.toast("내보내기에 실패했습니다. " + errorMessage(e), "error");
    } finally {
      S.working = false;
      paint();
    }
  }

  /* ================= 미리보기 모달 ================= */
  function previewTitle() {
    if (!S.preview) return "";
    if (S.preview.scope === "single") return S.single ? S.single.name : "미리보기";
    var f = getFile(S.preview.fileId);
    return f ? f.name : "미리보기";
  }

  function previewRotation() {
    if (!S.preview) return 0;
    if (S.preview.scope === "single") return S.single ? normAngle(S.single.rotations[S.preview.page - 1]) : 0;
    var f = getFile(S.preview.fileId);
    return f ? normAngle(f.rotation) : 0;
  }

  function paintPreview() {
    var root = document.getElementById("modal-root");
    if (!S.preview) { root.innerHTML = ""; return; }
    var p = S.preview;

    root.innerHTML =
      '<div class="modal-dim" data-pw-preview-dim>' +
        '<div class="modal pw-modal">' +
          '<div class="modal-head"><h2 class="pw-modal-title">' + WM.esc(previewTitle()) + "</h2>" +
            '<button type="button" class="icon-btn" data-action="pw-preview-close" aria-label="닫기">' +
              WM.icon("x", 18) + "</button></div>" +
          '<div class="pw-preview-stage" id="pw-preview-stage">' +
            WM.renderLoading("페이지를 그리는 중...") +
          "</div>" +
          '<div class="modal-foot pw-preview-foot">' +
            '<button type="button" class="btn btn-outline btn-sm" data-action="pw-preview-nav" data-dir="-1"' +
              (p.page <= 1 ? " disabled" : "") + ">" + WM.icon("arrowleft", 14) + "<span>이전</span></button>" +
            '<span class="pw-preview-count">' + p.page + " / " + p.total + "쪽</span>" +
            '<button type="button" class="btn btn-outline btn-sm" data-action="pw-preview-nav" data-dir="1"' +
              (p.page >= p.total ? " disabled" : "") + ">" + "<span>다음</span>" + WM.icon("arrowright", 14) + "</button>" +
            '<span class="pw-mini-gap"></span>' +
            '<span class="pw-preview-scope">' +
              (p.scope === "single" ? "이 페이지만 회전" : "이 파일 전체 회전") + "</span>" +
            '<button type="button" class="btn btn-outline btn-sm" data-action="pw-preview-rot" data-dir="-1">' +
              WM.icon("rotate", 14) + "<span>왼쪽</span></button>" +
            '<button type="button" class="btn btn-outline btn-sm" data-action="pw-preview-rot" data-dir="1">' +
              WM.icon("rotateright", 14) + "<span>오른쪽</span></button>" +
          "</div>" +
        "</div>" +
      "</div>";

    renderPreviewImage();
  }

  var previewToken = 0;
  async function renderPreviewImage() {
    if (!S.preview) return;
    var token = ++previewToken;
    var p = S.preview;
    var bytes = p.scope === "single" ? (S.single && S.single.bytes) : (getFile(p.fileId) || {}).bytes;
    var docId = p.scope === "single" ? (S.single && S.single.id) : p.fileId;
    var stage = document.getElementById("pw-preview-stage");
    if (!stage || !bytes) return;

    try {
      var url = await renderPageDataUrl(docId, bytes, p.page, PREVIEW_PX);
      if (token !== previewToken || !S.preview) return;
      stage = document.getElementById("pw-preview-stage");
      if (!stage) return;
      stage.innerHTML = '<img src="' + url + '" class="pw-preview-img' + rotClass(previewRotation()) + '" alt="페이지 미리보기" />';
    } catch (e) {
      console.error("미리보기 렌더 실패", e);
      if (token !== previewToken) return;
      stage = document.getElementById("pw-preview-stage");
      if (stage) stage.innerHTML = '<p class="pw-preview-fail">페이지를 그리지 못했습니다.</p>';
    }
  }

  function openPreview(scope, opts) {
    if (scope === "single") {
      if (!S.single) return;
      S.preview = { scope: "single", fileId: S.single.id, page: (opts.idx || 0) + 1, total: S.single.pageCount };
    } else {
      var f = getFile(opts.id);
      if (!f) return;
      S.preview = { scope: "merge", fileId: f.id, page: 1, total: f.pageCount };
    }
    paintPreview();
  }

  WM.closePdfPreview = function () {
    S.preview = null;
    previewToken++;
    document.getElementById("modal-root").innerHTML = "";
  };

  function previewNav(dir) {
    if (!S.preview) return;
    var next = S.preview.page + dir;
    if (next < 1 || next > S.preview.total) return;
    S.preview.page = next;
    paintPreview();
  }

  /** 미리보기 안에서 회전 (병합=파일 전체 / 회전탭=현재 페이지) */
  function previewRotate(dir) {
    if (!S.preview) return;
    if (S.preview.scope === "single") rotatePage(S.preview.page - 1, dir);
    else rotateFile(S.preview.fileId, dir);
    var img = document.querySelector(".pw-preview-img");
    if (img) img.className = "pw-preview-img" + rotClass(previewRotation());
  }

  /* ================= 이벤트 (한 번만 등록) ================= */
  var wired = false;

  function wire() {
    if (wired) return;
    wired = true;

    /* 파일 선택 */
    document.addEventListener("change", function (e) {
      var input = e.target.closest && e.target.closest("[data-pw-input]");
      if (!input) return;
      var files = input.files;
      addFiles(files, input.dataset.pwInput);
      input.value = ""; // 같은 파일 재선택 허용
    });

    /* 파일명 입력 */
    document.addEventListener("input", function (e) {
      var el = e.target.closest && e.target.closest("[data-pw-name]");
      if (!el) return;
      if (el.dataset.pwName === "merge") S.mergeName = el.value;
      else S.singleName = el.value;
    });

    /* 드래그 앤 드롭 업로드 */
    document.addEventListener("dragover", function (e) {
      var zone = e.target.closest && e.target.closest("[data-pw-drop]");
      if (!zone) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      zone.classList.add("over");
    });

    document.addEventListener("dragleave", function (e) {
      var zone = e.target.closest && e.target.closest("[data-pw-drop]");
      if (zone && !zone.contains(e.relatedTarget)) zone.classList.remove("over");
    });

    document.addEventListener("drop", function (e) {
      var zone = e.target.closest && e.target.closest("[data-pw-drop]");
      if (!zone) return;
      e.preventDefault();
      zone.classList.remove("over");
      if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files, zone.dataset.pwDrop);
    });

    /* 목록 순서 드래그 (그립을 잡았을 때만 시작) */
    var drag = null;

    function clearDragStyles() {
      document.querySelectorAll(".pw-item.dragging, .pw-item.drag-over-top, .pw-item.drag-over-bottom")
        .forEach(function (li) { li.classList.remove("dragging", "drag-over-top", "drag-over-bottom"); });
    }

    document.addEventListener("mousedown", function (e) {
      var grip = e.target.closest && e.target.closest("[data-pw-grip]");
      if (!grip) return;
      var li = grip.closest(".pw-item");
      if (li) li.draggable = true;
    });

    document.addEventListener("mouseup", function () {
      document.querySelectorAll(".pw-item[draggable='true']").forEach(function (li) { li.draggable = false; });
    });

    document.addEventListener("dragstart", function (e) {
      var li = e.target.closest && e.target.closest(".pw-item");
      if (!li || !li.draggable) return;
      drag = li.dataset.pwFile;
      e.dataTransfer.effectAllowed = "move";
      try { e.dataTransfer.setData("text/plain", drag); } catch (err) { /* 무시 */ }
      setTimeout(function () { li.classList.add("dragging"); }, 0);
    });

    document.addEventListener("dragover", function (e) {
      if (!drag) return;
      var li = e.target.closest && e.target.closest(".pw-item");
      if (!li) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      var rect = li.getBoundingClientRect();
      var isTop = e.clientY < rect.top + rect.height / 2;
      li.parentNode.querySelectorAll(".pw-item").forEach(function (sib) {
        if (sib !== li) sib.classList.remove("drag-over-top", "drag-over-bottom");
      });
      li.classList.toggle("drag-over-top", isTop);
      li.classList.toggle("drag-over-bottom", !isTop);
    });

    document.addEventListener("dragend", function () {
      drag = null;
      clearDragStyles();
    });

    document.addEventListener("drop", function (e) {
      if (!drag) return;
      var fromId = drag;
      drag = null;
      clearDragStyles();
      var li = e.target.closest && e.target.closest(".pw-item");
      if (!li) return;
      e.preventDefault();
      var rect = li.getBoundingClientRect();
      reorderFile(fromId, li.dataset.pwFile, e.clientY < rect.top + rect.height / 2);
    });

    /* 버튼 액션 */
    document.addEventListener("click", function (e) {
      var el = e.target.closest && e.target.closest("[data-action]");
      if (!el) return;
      var act = el.dataset.action;
      if (act.indexOf("pw-") !== 0) return;

      if (act === "pw-tab") {
        if (S.tab === el.dataset.tab) return;
        S.tab = el.dataset.tab;
        paint();
      } else if (act === "pw-move") {
        moveFile(el.dataset.id, Number(el.dataset.dir));
      } else if (act === "pw-remove") {
        removeFile(el.dataset.id);
      } else if (act === "pw-rot-file") {
        rotateFile(el.dataset.id, Number(el.dataset.dir));
      } else if (act === "pw-rot-page") {
        rotatePage(Number(el.dataset.idx), Number(el.dataset.dir));
      } else if (act === "pw-rot-all") {
        rotateAll(Number(el.dataset.dir));
      } else if (act === "pw-rot-reset") {
        resetRotations();
      } else if (act === "pw-clear-merge") {
        WM.confirmDialog({
          title: "목록을 비울까요?",
          description: "추가한 PDF 파일이 모두 목록에서 빠집니다. 원본 파일은 지워지지 않습니다.",
          confirmLabel: "비우기", danger: true
        }, clearMerge);
      } else if (act === "pw-clear-single") {
        clearSingle();
      } else if (act === "pw-export-merge") {
        exportMerge();
      } else if (act === "pw-export-single") {
        exportSingle();
      } else if (act === "pw-preview") {
        openPreview(el.dataset.scope, { id: el.dataset.id, idx: Number(el.dataset.idx) });
      } else if (act === "pw-preview-close") {
        WM.closePdfPreview();
      } else if (act === "pw-preview-nav") {
        previewNav(Number(el.dataset.dir));
      } else if (act === "pw-preview-rot") {
        previewRotate(Number(el.dataset.dir));
      } else if (act === "pw-retry-libs") {
        S.libError = "";
        paint();
      } else if (act === "pw-reset-all") {
        WM.confirmDialog({
          title: "PDF 마법봉을 초기화할까요?",
          description: "불러온 PDF와 설정한 순서·회전이 모두 지워집니다.",
          confirmLabel: "초기화", danger: true
        }, function () {
          WM.resetPdfWand();
          WM.toast("초기화되었습니다.");
        });
      }
    });

    /* 미리보기 모달 바깥 클릭으로 닫기 */
    document.addEventListener("click", function (e) {
      if (!S.preview) return;
      var dim = e.target.closest && e.target.closest("[data-pw-preview-dim]");
      if (dim && e.target === dim) WM.closePdfPreview();
    });

    /* 미리보기 좌우 방향키 이동 */
    document.addEventListener("keydown", function (e) {
      if (!S.preview) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); previewNav(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); previewNav(1); }
    });
  }

  /** 렌더 직후 호출 (app.js 라우터) */
  WM.bindPdfWand = function () {
    wire();
    paint();
    // 라이브러리를 미리 받아두면 첫 파일 추가가 빨라진다
    ensureLibs().catch(function (e) { setLibError(errorMessage(e)); });
  };
})();
