/* ===== 앱: 상태 + 해시 라우터 + 이벤트 ===== */
(function () {
  var App = {
    tasks: [],
    filter: Object.assign({}, WM.DEFAULT_FILTER),
    sort: "dueDate",
    view: "card",
    form: null,          // { values, editId, snapshot } 또는 null
    clEditing: null,     // 체크리스트 인라인 수정 중인 항목 id
    cal: null,           // 달력 { y, m } (m: 0-based)
    tplEdit: null        // 템플릿 인라인 수정 상태 { id, meta?, item? }
  };
  WM.App = App;

  /* ---- 데이터 변경 헬퍼 ---- */
  function persist() { WM.saveTasks(App.tasks); }

  function updateTask(id, patch) {
    patch = Object.assign({}, patch, { updatedAt: new Date().toISOString() });
    App.tasks = App.tasks.map(function (t) {
      if (t.id !== id) return t;
      var next = Object.assign({}, t, patch);
      // patch에 명시적으로 undefined가 들어온 키는 제거 (completedAt 해제)
      Object.keys(patch).forEach(function (k) { if (patch[k] === undefined) delete next[k]; });
      return next;
    });
    persist();
  }

  function setStatus(id, status) {
    updateTask(id, WM.statusChangePatch(status));
  }

  function getTask(id) {
    return App.tasks.find(function (t) { return t.id === id; });
  }

  /* ---- 라우터 ---- */
  function route() {
    var hash = location.hash || "#/dashboard";
    var parts = hash.replace(/^#\//, "").split("/");
    return { page: parts[0] || "dashboard", id: parts[1] || null };
  }

  function render() {
    var r = route();
    var view = document.getElementById("view");
    App.clEditing = null;

    if (r.page === "dashboard" || r.page === "") {
      view.innerHTML = WM.renderDashboard(App.tasks);
    } else if (r.page === "tasks") {
      view.innerHTML = WM.renderTasksShell(App, App.tasks.length);
      refreshTaskList();
      bindTaskFilters();
    } else if (r.page === "task" && r.id) {
      view.innerHTML = WM.renderTaskDetail(getTask(r.id));
    } else if (r.page === "calendar") {
      if (!App.cal) {
        var nowD = new Date();
        App.cal = { y: nowD.getFullYear(), m: nowD.getMonth() };
      }
      view.innerHTML = WM.renderCalendar(App.tasks, App.cal.y, App.cal.m);
    } else if (r.page === "templates") {
      view.innerHTML = WM.renderTemplates(App.tplEdit);
    } else if (r.page === "settings") {
      view.innerHTML = WM.renderSettings(App.tasks);
      bindSettings();
    } else {
      view.innerHTML = WM.renderNotFound();
    }

    renderNav(r.page);

    // 페이지(라우트) 변경 시에만 전환 애니메이션 발동
    var pageKey = r.page + "/" + (r.id || "");
    if (App._lastPage !== pageKey) {
      App._lastPage = pageKey;
      view.classList.remove("view-anim");
      void view.offsetWidth; // reflow로 애니메이션 재시작
      view.classList.add("view-anim");
      clearTimeout(App._viewAnimTimer);
      App._viewAnimTimer = setTimeout(function () { view.classList.remove("view-anim"); }, 600);
    }

    window.scrollTo(0, 0);
  }

  function rerenderCurrent() { render(); }

  /** 스크롤 위치를 유지하며 다시 렌더링 (인라인 편집용) */
  function rerenderKeepScroll() {
    var sy = window.scrollY;
    render();
    window.scrollTo(0, sy);
  }

  /* ---- 사이드바 내비 ---- */
  var NAV = [
    { href: "#/dashboard", page: "dashboard", label: "Dashboard", icon: "dashboard" },
    { href: "#/tasks", page: "tasks", label: "Tasks", icon: "list" },
    { href: "#/calendar", page: "calendar", label: "Calendar", icon: "calendar" },
    { href: "#/templates", page: "templates", label: "Templates", icon: "filestack" },
    { href: "#/settings", page: "settings", label: "Settings", icon: "settings" }
  ];

  function renderNav(current) {
    if (current === "task") current = "tasks"; // 상세는 Tasks 활성
    document.getElementById("sidebar-nav").innerHTML = NAV.map(function (n) {
      return '<a class="nav-link' + (n.page === current ? " active" : "") + '" href="' + n.href + '">' +
        WM.icon(n.icon, 18) + "<span>" + n.label + "</span></a>";
    }).join("");
  }

  /* ---- 업무 목록 ---- */
  function refreshTaskList() {
    var el = document.getElementById("task-list");
    if (el) el.innerHTML = WM.renderTaskList(App, App.tasks);
  }

  function bindTaskFilters() {
    var q = document.getElementById("filter-q");
    if (q) q.addEventListener("input", function () { App.filter.q = q.value; refreshTaskList(); });
    [["filter-done", "doneView"], ["filter-status", "status"],
     ["filter-category", "category"], ["filter-priority", "priority"]].forEach(function (pair) {
      var el = document.getElementById(pair[0]);
      if (el) el.addEventListener("change", function () { App.filter[pair[1]] = el.value; refreshTaskList(); });
    });
    var sortEl = document.getElementById("filter-sort");
    if (sortEl) sortEl.addEventListener("change", function () { App.sort = sortEl.value; refreshTaskList(); });
  }

  /* ---- 폼 모달 ---- */
  function emptyForm() {
    return { title: "", category: "etc", status: "todo", priority: "normal",
      requester: "", siteName: "", clientName: "", amount: undefined,
      date: "", dueDate: "", confirmationNote: "", checklist: [], comments: [], attachments: [] };
  }

  function openForm(editId) {
    var values;
    if (editId) {
      var t = getTask(editId);
      if (!t) return;
      values = JSON.parse(JSON.stringify(t)); // 깊은 복사 (checklist 포함)
    } else {
      values = emptyForm();
    }
    App.form = { values: values, editId: editId || null, snapshot: JSON.stringify(values) };
    paintForm();
  }

  function paintForm(repaint) {
    document.getElementById("modal-root").innerHTML =
      WM.renderTaskForm(App.form.values, !!App.form.editId);
    if (repaint) {
      // 카테고리 변경 등으로 다시 그릴 때는 등장 애니메이션 생략
      var dimEl = document.querySelector("#modal-root .modal-dim");
      if (dimEl) {
        dimEl.style.animation = "none";
        var modalEl = dimEl.querySelector(".modal");
        if (modalEl) modalEl.style.animation = "none";
      }
    }
    bindFormFields();
  }

  function closeForm() {
    App.form = null;
    document.getElementById("modal-root").innerHTML = "";
  }

  /** 닫기 요청: 입력 내용이 변경된 경우 경고 후 닫기 */
  function requestCloseForm() {
    if (!App.form) return;
    if (JSON.stringify(App.form.values) !== App.form.snapshot) {
      WM.confirmDialog({
        title: "정말 뒤로 가시겠어요?",
        description: "입력된 내용이 있습니다. 지금 닫으면 작성 중인 내용이 저장되지 않습니다.",
        confirmLabel: "뒤로 가기", cancelLabel: "계속 작성", danger: true
      }, closeForm);
    } else {
      closeForm();
    }
  }

  /** 폼 입력값 → form state 동기화 (즉시 바인딩) */
  function bindFormFields() {
    var v = App.form.values;
    function bind(id, key) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("input", function () { v[key] = el.value; });
    }
    bind("f-title", "title");
    bind("f-requester", "requester");
    bind("f-siteName", "siteName");
    bind("f-clientName", "clientName");
    bind("f-date", "date");
    bind("f-dueDate", "dueDate");
    bind("f-confirmationNote", "confirmationNote");

    var cat = document.getElementById("f-category");
    if (cat) cat.addEventListener("change", function () {
      v.category = cat.value;
      paintForm(true); // 템플릿 버튼 라벨 갱신 (애니메이션 없이)
    });
    var st = document.getElementById("f-status");
    if (st) st.addEventListener("change", function () { v.status = st.value; });
    var pr = document.getElementById("f-priority");
    if (pr) pr.addEventListener("change", function () { v.priority = pr.value; });

    // 금액: 숫자만 + 천 단위 콤마
    var amt = document.getElementById("f-amount");
    if (amt) amt.addEventListener("input", function () {
      var digits = amt.value.replace(/[^0-9]/g, "");
      if (!digits) { amt.value = ""; v.amount = undefined; return; }
      var n = Number(digits);
      amt.value = n.toLocaleString("ko-KR");
      v.amount = n;
    });

    // 폼 dim(바깥) 클릭으로는 닫히지 않음 — 닫기/취소 버튼으로만 닫기
  }

  function repaintFormChecklist() {
    var el = document.getElementById("form-checklist");
    if (el) el.innerHTML = WM.checklistHtml(App.form.values.checklist, "form", App.clEditing);
  }

  function submitForm() {
    var v = App.form.values;
    if (!v.title || !v.title.trim()) {
      var err = document.getElementById("f-title-error");
      if (err) err.style.display = "block";
      var ti = document.getElementById("f-title");
      if (ti) {
        ti.focus();
        ti.classList.add("shake");
        setTimeout(function () { ti.classList.remove("shake"); }, 350);
      }
      return;
    }
    // 빈 문자열 옵션 필드 정리
    var clean = Object.assign({}, v, { title: v.title.trim() });
    ["requester", "siteName", "clientName", "date", "dueDate", "confirmationNote"].forEach(function (k) {
      if (typeof clean[k] === "string") {
        clean[k] = clean[k].trim();
        if (!clean[k]) delete clean[k];
      }
    });
    if (clean.amount == null) delete clean.amount;

    var now = new Date().toISOString();
    if (App.form.editId) {
      var prev = getTask(App.form.editId);
      var patch = clean;
      if (prev && prev.status !== clean.status) {
        patch = Object.assign({}, clean, WM.statusChangePatch(clean.status));
      }
      delete patch.id; delete patch.createdAt; delete patch.updatedAt;
      updateTask(App.form.editId, patch);
      WM.toast("업무가 수정되었습니다.");
    } else {
      var task = Object.assign({ id: WM.uid(), createdAt: now, updatedAt: now }, clean);
      if (!task.checklist) task.checklist = [];
      if (!task.comments) task.comments = [];
      App.tasks.unshift(task);
      persist();
      WM.toast("업무가 등록되었습니다.");
    }
    closeForm();
    rerenderCurrent();
  }

  /* ---- 체크리스트 조작 (detail / form 공용) ---- */
  function getChecklistCtx(ctx) {
    if (ctx === "form") return App.form.values.checklist;
    var r = route();
    var t = getTask(r.id);
    return t ? t.checklist : null;
  }

  function commitChecklist(ctx, list) {
    if (ctx === "form") {
      App.form.values.checklist = list;
      repaintFormChecklist();
    } else {
      var r = route();
      updateTask(r.id, { checklist: list });
      rerenderKeepScroll(); // 상세 화면 진행률 포함 갱신 (스크롤 유지)
    }
  }

  function handleChecklistAction(btn) {
    var act = btn.dataset.cl;
    var ctx = btn.dataset.ctx;
    var clid = btn.dataset.clid;
    var list = getChecklistCtx(ctx);
    if (!list) return;
    list = list.slice();

    if (act === "toggle") {
      list = list.map(function (c) { return c.id === clid ? Object.assign({}, c, { checked: !c.checked }) : c; });
      commitChecklist(ctx, list);
    } else if (act === "remove") {
      list = list.filter(function (c) { return c.id !== clid; });
      App.clEditing = null;
      commitChecklist(ctx, list);
    } else if (act === "add") {
      var input = document.querySelector("[data-cl-add-input][data-ctx='" + ctx + "']");
      var label = input ? input.value.trim() : "";
      if (!label) return;
      list.push({ id: WM.uid(), label: label, checked: false });
      commitChecklist(ctx, list);
      var again = document.querySelector("[data-cl-add-input][data-ctx='" + ctx + "']");
      if (again) again.focus();
    } else if (act === "edit-start") {
      App.clEditing = clid;
      if (ctx === "form") repaintFormChecklist();
      else {
        var el = document.getElementById("detail-checklist");
        if (el) el.innerHTML = WM.checklistHtml(list, "detail", clid);
      }
      var ei = document.querySelector("[data-cl-edit-input]");
      if (ei) { ei.focus(); ei.select(); }
    } else if (act === "edit-save") {
      var inputEl = document.querySelector("[data-cl-edit-input]");
      var label2 = inputEl ? inputEl.value.trim() : "";
      if (label2) {
        list = list.map(function (c) { return c.id === clid ? Object.assign({}, c, { label: label2 }) : c; });
      }
      App.clEditing = null;
      commitChecklist(ctx, list);
    } else if (act === "edit-cancel") {
      App.clEditing = null;
      if (ctx === "form") repaintFormChecklist();
      else {
        var el2 = document.getElementById("detail-checklist");
        if (el2) el2.innerHTML = WM.checklistHtml(list, "detail", null);
      }
    }
  }

  /* ---- 설정 페이지 바인딩 ---- */
  function bindSettings() {
    var fileInput = document.getElementById("import-file");
    if (fileInput) fileInput.addEventListener("change", function () {
      var file = fileInput.files && fileInput.files[0];
      fileInput.value = "";
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var validated = null;
        try { validated = WM.validateImportedTasks(JSON.parse(String(reader.result))); }
        catch (e) { WM.toast("JSON 파일을 읽을 수 없습니다.", "error"); return; }
        if (!validated) { WM.toast("올바른 업무 데이터 형식이 아닙니다.", "error"); return; }
        WM.confirmDialog({
          title: "데이터를 가져올까요?",
          description: validated.length + "건의 업무를 가져옵니다.\n기존 데이터는 덮어쓰기됩니다.",
          confirmLabel: "가져오기"
        }, function () {
          App.tasks = validated;
          persist();
          WM.toast(validated.length + "건의 업무를 가져왔습니다.");
          rerenderCurrent();
        });
      };
      reader.onerror = function () { WM.toast("파일을 읽지 못했습니다.", "error"); };
      reader.readAsText(file);
    });
  }

  /* ---- 전역 이벤트 위임 ---- */
  document.addEventListener("click", function (e) {
    // 체크리스트 버튼
    var clBtn = e.target.closest("[data-cl]");
    if (clBtn) { e.stopPropagation(); handleChecklistAction(clBtn); return; }

    var el = e.target.closest("[data-action]");
    if (!el) return;
    var act = el.dataset.action;
    var id = el.dataset.id;

    if (act === "open-task") {
      // 내부 인터랙티브 요소 클릭은 무시
      if (e.target.closest("select, button, a, input, [data-stop]")) return;
      location.hash = "#/task/" + id;
    } else if (act === "open-new") {
      if (route().page !== "tasks") location.hash = "#/tasks";
      openForm(null);
    } else if (act === "edit-task") {
      openForm(id);
    } else if (act === "complete-task") {
      setStatus(id, "done");
      WM.toast("완료 처리되었습니다.");
      rerenderKeepScroll();
    } else if (act === "delete-task" || act === "delete-task-detail") {
      e.stopPropagation();
      var t = getTask(id);
      if (!t) return;
      WM.confirmDialog({
        title: "업무를 삭제할까요?",
        description: '"' + t.title + '"\n삭제한 업무는 복구할 수 없습니다.',
        confirmLabel: "삭제", danger: true
      }, function () {
        App.tasks = App.tasks.filter(function (x) { return x.id !== id; });
        persist();
        WM.toast("업무가 삭제되었습니다.");
        if (act === "delete-task-detail") location.hash = "#/tasks";
        else render();
      });
    } else if (act === "back") {
      if (history.length > 1) history.back();
      else location.hash = "#/tasks";
    } else if (act === "form-close") {
      requestCloseForm();
    } else if (act === "form-submit") {
      submitForm();
    } else if (act === "tpl-apply") {
      var tplObj = WM.getTemplateByCategory(App.form.values.category);
      if (!tplObj) return;
      if (App.form.values.checklist.length > 0) {
        WM.confirmDialog({
          title: "템플릿을 적용할까요?",
          description: "기존 체크리스트가 템플릿 항목으로 대체됩니다.",
          confirmLabel: "덮어쓰기"
        }, function () {
          App.form.values.checklist = WM.templateToChecklist(tplObj);
          repaintFormChecklist();
        });
      } else {
        App.form.values.checklist = WM.templateToChecklist(tplObj);
        repaintFormChecklist();
      }
    } else if (act === "view-card" || act === "view-table") {
      App.view = act === "view-card" ? "card" : "table";
      document.querySelectorAll(".view-toggle button").forEach(function (b) {
        b.classList.toggle("active", b.dataset.action === act);
      });
      refreshTaskList();
    } else if (act === "copy-template") {
      var tplCopy = WM.getTemplateById(id);
      if (tplCopy) WM.copyText(tplCopy.items.join("\n"), "체크리스트 항목을 복사했습니다.");
    } else if (act === "tpl-meta-edit") {
      App.tplEdit = { id: id, meta: true };
      rerenderKeepScroll();
      var nameInput = document.getElementById("tpl-name-input");
      if (nameInput) nameInput.focus();
    } else if (act === "tpl-meta-save") {
      var tplMeta = WM.getTemplateById(id);
      var nameEl = document.getElementById("tpl-name-input");
      var descEl = document.getElementById("tpl-desc-input");
      if (tplMeta && nameEl && nameEl.value.trim()) {
        tplMeta.name = nameEl.value.trim();
        tplMeta.description = descEl ? descEl.value.trim() : tplMeta.description;
        WM.saveTemplates();
        WM.toast("템플릿이 수정되었습니다.");
      }
      App.tplEdit = null;
      rerenderKeepScroll();
    } else if (act === "tpl-edit-cancel") {
      App.tplEdit = null;
      rerenderKeepScroll();
    } else if (act === "tpl-item-edit") {
      App.tplEdit = { id: id, item: Number(el.dataset.idx) };
      rerenderKeepScroll();
      var tplEditInput = document.querySelector("[data-tpl-edit-input]");
      if (tplEditInput) { tplEditInput.focus(); tplEditInput.select(); }
    } else if (act === "tpl-item-save") {
      var tplItemT = WM.getTemplateById(id);
      var tplInp = document.querySelector("[data-tpl-edit-input]");
      var tplVal = tplInp ? tplInp.value.trim() : "";
      if (tplItemT && tplVal) {
        tplItemT.items[Number(el.dataset.idx)] = tplVal;
        WM.saveTemplates();
      }
      App.tplEdit = null;
      rerenderKeepScroll();
    } else if (act === "tpl-item-remove") {
      var tplRm = WM.getTemplateById(id);
      if (tplRm) {
        tplRm.items.splice(Number(el.dataset.idx), 1);
        WM.saveTemplates();
      }
      App.tplEdit = null;
      rerenderKeepScroll();
    } else if (act === "tpl-item-add") {
      var tplAddInp = document.querySelector("[data-tpl-add-input][data-id='" + id + "']");
      var tplLabel = tplAddInp ? tplAddInp.value.trim() : "";
      if (!tplLabel) return;
      var tplAddT = WM.getTemplateById(id);
      if (tplAddT) {
        tplAddT.items.push(tplLabel);
        WM.saveTemplates();
      }
      rerenderKeepScroll();
      var tplAgain = document.querySelector("[data-tpl-add-input][data-id='" + id + "']");
      if (tplAgain) tplAgain.focus();
    } else if (act === "tpl-restore") {
      WM.confirmDialog({
        title: "기본 템플릿으로 복원할까요?",
        description: "이 템플릿의 이름·설명·체크리스트 항목이 모두 기본값으로 되돌아갑니다.",
        confirmLabel: "복원"
      }, function () {
        var def = WM.DEFAULT_TEMPLATES.find(function (x) { return x.id === id; });
        var defIdx = WM.CHECKLIST_TEMPLATES.findIndex(function (x) { return x.id === id; });
        if (def && defIdx !== -1) {
          WM.CHECKLIST_TEMPLATES[defIdx] = JSON.parse(JSON.stringify(def));
          WM.saveTemplates();
          WM.toast("기본 템플릿으로 복원했습니다.");
        }
        App.tplEdit = null;
        rerenderKeepScroll();
      });
    } else if (act === "export") {
      var blob = new Blob([JSON.stringify(App.tasks, null, 2)], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "work-management-backup-" + WM.todayStr() + ".json";
      a.click();
      URL.revokeObjectURL(url);
      WM.toast("백업 파일을 다운로드했습니다.");
    } else if (act === "import-click") {
      var fi = document.getElementById("import-file");
      if (fi) fi.click();
    } else if (act === "reset") {
      WM.confirmDialog({
        title: "모든 데이터를 초기화할까요?",
        description: "저장된 업무가 모두 삭제됩니다. 필요하면 먼저 JSON 내보내기로 백업하세요.",
        confirmLabel: "초기화", danger: true
      }, function () {
        App.tasks = [];
        persist();
        WM.toast("모든 업무 데이터가 초기화되었습니다.");
        rerenderCurrent();
      });
    } else if (act === "sample") {
      WM.confirmDialog({
        title: "샘플 데이터를 생성할까요?",
        description: "기존 데이터가 샘플 업무로 대체됩니다.",
        confirmLabel: "생성"
      }, function () {
        App.tasks = WM.createSampleTasks();
        persist();
        WM.toast("샘플 데이터를 생성했습니다.");
        rerenderCurrent();
      });
    } else if (act === "comment-add") {
      var cmtInput = document.getElementById("comment-input");
      var cmtText = cmtInput ? cmtInput.value.trim() : "";
      if (!cmtText) { if (cmtInput) cmtInput.focus(); return; }
      var cmtTask = getTask(id);
      if (!cmtTask) return;
      updateTask(id, {
        comments: (cmtTask.comments || []).concat([{ id: WM.uid(), text: cmtText, createdAt: new Date().toISOString() }])
      });
      WM.toast("메모가 등록되었습니다.");
      rerenderKeepScroll();
      var cmtAgain = document.getElementById("comment-input");
      if (cmtAgain) cmtAgain.focus();
    } else if (act === "comment-remove") {
      var cmtCid = el.dataset.cid;
      var cmtTask2 = getTask(id);
      if (!cmtTask2) return;
      WM.confirmDialog({
        title: "메모를 삭제할까요?",
        description: "삭제한 메모는 복구할 수 없습니다.",
        confirmLabel: "삭제", danger: true
      }, function () {
        updateTask(id, {
          comments: (cmtTask2.comments || []).filter(function (c) { return c.id !== cmtCid; })
        });
        WM.toast("메모가 삭제되었습니다.");
        rerenderKeepScroll();
      });
    } else if (act === "cal-prev" || act === "cal-next") {
      var calD = new Date(App.cal.y, App.cal.m + (act === "cal-prev" ? -1 : 1), 1);
      App.cal = { y: calD.getFullYear(), m: calD.getMonth() };
      render();
    } else if (act === "cal-today") {
      var calNow = new Date();
      App.cal = { y: calNow.getFullYear(), m: calNow.getMonth() };
      render();
    } else if (act === "cal-open") {
      location.hash = "#/task/" + id;
    } else if (act === "menu-open") {
      document.getElementById("sidebar").classList.add("open");
      document.getElementById("drawer-dim").classList.add("show");
    } else if (act === "menu-close") {
      document.getElementById("sidebar").classList.remove("open");
      document.getElementById("drawer-dim").classList.remove("show");
    }
  });

  /* 상태 빠른 변경 (카드/테이블/상세) */
  document.addEventListener("change", function (e) {
    var el = e.target.closest("[data-action='quick-status'], [data-action='detail-status']");
    if (!el) return;
    e.stopPropagation();
    setStatus(el.dataset.id, el.value);
    rerenderKeepScroll();
  });

  /* 모바일에서 내비 이동 시 드로어 닫기 */
  document.getElementById("sidebar-nav").addEventListener("click", function (e) {
    if (e.target.closest("a")) {
      document.getElementById("sidebar").classList.remove("open");
      document.getElementById("drawer-dim").classList.remove("show");
    }
  });

  /* Enter 키 처리: 체크리스트 추가/수정 입력 */
  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.matches("[data-cl-add-input]")) {
      e.preventDefault();
      var btn = document.querySelector("[data-cl='add'][data-ctx='" + e.target.dataset.ctx + "']");
      if (btn) btn.click();
    }
    if (e.key === "Enter" && e.target.matches("[data-cl-edit-input]")) {
      e.preventDefault();
      var save = document.querySelector("[data-cl='edit-save']");
      if (save) save.click();
    }
    if (e.key === "Enter" && e.target.matches("[data-tpl-add-input]")) {
      e.preventDefault();
      var tplAddBtn = document.querySelector("[data-action='tpl-item-add'][data-id='" + e.target.dataset.id + "']");
      if (tplAddBtn) tplAddBtn.click();
    }
    if (e.key === "Enter" && e.target.matches("[data-tpl-edit-input]")) {
      e.preventDefault();
      var tplSaveBtn = document.querySelector("[data-action='tpl-item-save']");
      if (tplSaveBtn) tplSaveBtn.click();
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && e.target.id === "comment-input") {
      e.preventDefault();
      var cmtBtn = document.querySelector("[data-action='comment-add']");
      if (cmtBtn) cmtBtn.click();
    }
    if (e.key === "Escape") {
      if (document.querySelector("[data-cl-edit-input]")) {
        var cancel = document.querySelector("[data-cl='edit-cancel']");
        if (cancel) cancel.click();
      } else if (App.form) {
        requestCloseForm();
      }
    }
  });

  /* 헤더 검색: Enter → /tasks 검색 */
  document.getElementById("header-search").addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    App.filter = Object.assign({}, WM.DEFAULT_FILTER, { q: e.target.value.trim() });
    if (route().page === "tasks") render();
    else location.hash = "#/tasks";
  });

  /* ---- 초기화 ---- */
  window.addEventListener("hashchange", render);

  /* 헤더 날짜 + 시계 (hh:mm) */
  function updateHeaderClock() {
    var d = new Date();
    document.getElementById("header-date").textContent =
      WM.formatFullToday() + " · " +
      String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }
  updateHeaderClock();
  setInterval(updateHeaderClock, 1000);
  WM.hydrateIcons(document);
  App.tasks = WM.loadTasks();
  if (!location.hash) location.hash = "#/dashboard";
  render();
})();
