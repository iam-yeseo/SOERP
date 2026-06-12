/* ===== 화면 렌더링 (HTML 문자열 생성) ===== */
window.WM = window.WM || {};

/* ---- 업무 카드 ---- */
WM.taskCardHtml = function (t, opts) {
  opts = opts || {};
  var progress = WM.checklistProgress(t.checklist);
  var overdue = WM.isTaskOverdue(t);
  var dueToday = WM.isToday(t.dueDate) && t.status !== "done";
  var urgent = t.priority === "urgent" && t.status !== "done";
  var checked = (t.checklist || []).filter(function (c) { return c.checked; }).length;

  var meta = "";
  if (t.siteName) meta += "<span>" + WM.icon("mappin", 13) + WM.esc(t.siteName) + "</span>";
  if (t.clientName) meta += "<span>" + WM.icon("building", 13) + WM.esc(t.clientName) + "</span>";
  if (t.requester) meta += "<span>" + WM.icon("user", 13) + WM.esc(t.requester) + "</span>";
  if (t.dueDate) {
    var cls = overdue ? "overdue" : dueToday ? "due-today" : "";
    meta += '<span class="' + cls + '">' + WM.icon("clock", 13) +
      (dueToday ? "오늘 마감" : WM.formatKorean(t.dueDate)) + (overdue ? " · 마감 지남" : "") + "</span>";
  }
  if (t.amount != null) meta += '<span style="font-weight:500;color:var(--gray-600)">' + WM.formatAmount(t.amount) + "</span>";

  var bottom;
  if (t.checklist && t.checklist.length) {
    bottom =
      '<div class="tc-progress">' +
        '<div class="row"><span style="display:inline-flex;align-items:center;gap:4px">' + WM.icon("listchecks", 12) + checked + "/" + t.checklist.length + '</span><span class="pct">' + progress + "%</span></div>" +
        '<div class="progress"><i style="width:' + progress + '%"></i></div>' +
      "</div>";
  } else {
    bottom = '<div class="tc-progress"><p class="tc-none">체크리스트 없음</p></div>';
  }

  var statusSelect = "";
  if (opts.quickStatus) {
    statusSelect = '<select class="quick-status" data-action="quick-status" data-id="' + t.id + '" aria-label="상태 빠른 변경">' +
      WM.STATUS_ORDER.map(function (s) {
        return '<option value="' + s + '"' + (t.status === s ? " selected" : "") + ">" + WM.STATUS_LABELS[s] + "</option>";
      }).join("") + "</select>";
  }

  return '<div class="card task-card' + (urgent ? " urgent" : "") + '" data-action="open-task" data-id="' + t.id + '">' +
    '<div class="tc-top"><div class="tc-badges">' +
      WM.badgeCat(t.category) + WM.badgeStatus(t.status) + WM.badgePriority(t.priority) +
    "</div>" +
    (opts.deletable ? '<button type="button" class="tc-del" data-action="delete-task" data-id="' + t.id + '" aria-label="업무 삭제">' + WM.icon("trash", 15) + "</button>" : "") +
    "</div>" +
    '<h3 class="tc-title">' + WM.esc(t.title) + "</h3>" +
    (t.confirmationNote ? '<p class="tc-confirm">' + WM.icon("alert", 12) + WM.esc(t.confirmationNote) + "</p>" : "") +
    '<div class="tc-meta">' + meta + "</div>" +
    '<div class="tc-bottom">' + bottom + statusSelect + "</div>" +
  "</div>";
};

/* ---- 대시보드 ---- */
WM.renderDashboard = function (tasks) {
  var st = WM.getTaskStats(tasks);

  function summaryCard(label, count, desc, iconName, accent) {
    return '<div class="card summary-card' + (accent ? " accent" : "") + '">' +
      '<p class="s-label">' + WM.icon(iconName, 15) + WM.esc(label) + "</p>" +
      '<p class="s-count">' + count + "</p>" +
      '<p class="s-desc">' + WM.esc(desc) + "</p></div>";
  }

  function section(title, list, emptyText, iconName, iconCls, note) {
    var body = list.length
      ? '<div class="task-grid">' + list.map(function (t) { return WM.taskCardHtml(t); }).join("") + "</div>"
      : WM.emptyState(emptyText);
    return "<section><h2 class='sec-title'><span class='ic " + (iconCls || "") + "'>" + WM.icon(iconName, 15) + "</span>" +
      WM.esc(title) + (note ? "<span class='note'>" + WM.esc(note) + "</span>" : "") +
      "<span class='count'>" + list.length + "</span></h2>" + body + "</section>";
  }

  var statusBar = "", legend = "";
  if (st.total > 0) {
    WM.STATUS_ORDER.forEach(function (s) {
      var n = st.byStatus[s] || 0;
      if (n > 0) statusBar += '<span style="width:' + (n / st.total * 100) + "%;background:" + WM.STATUS_COLORS[s] + '"></span>';
      legend += "<span><i style='background:" + WM.STATUS_COLORS[s] + "'></i>" + WM.STATUS_LABELS[s] + " " + n + "</span>";
    });
  }

  var catList = WM.CATEGORY_ORDER.map(function (c) {
    return "<li>" + WM.badgeCat(c) + "<span class='v'>" + (st.byCategory[c] || 0) + "건</span></li>";
  }).join("");
  var priList = WM.PRIORITY_ORDER.map(function (p) {
    return "<li>" + WM.badgePriority(p) + "<span class='v'>" + (st.byPriority[p] || 0) + "건</span></li>";
  }).join("");

  var doneList = st.recentDone.length
    ? "<div class='done-list'>" + st.recentDone.map(function (t) {
        return "<div><p class='t'>" + WM.esc(t.title) + "</p><p class='d'>" +
          (t.completedAt ? WM.formatKorean(t.completedAt) : "-") + " 완료</p></div>";
      }).join("") + "</div>"
    : "<p class='set-note'>아직 완료된 업무가 없습니다.</p>";

  return '<div class="page-head"><h1>대시보드</h1><p>오늘 처리할 업무와 전체 진행 현황을 한눈에 확인하세요.</p></div>' +
    '<div class="summary-grid">' +
      summaryCard("오늘 업무", st.today, "오늘 날짜 기준 처리 대상", "calendarcheck", true) +
      summaryCard("진행 중", st.inProgress, "현재 진행하고 있는 업무", "loader") +
      summaryCard("확인 대기", st.hold, "회신·확인을 기다리는 업무", "pause") +
      summaryCard("이번 주 마감", st.weekDue, "7일 이내 마감 예정 미완료", "calendar") +
    "</div>" +
    '<div class="dash-grid">' +
      '<div class="dash-col">' +
        section("오늘의 업무", st.todayTasks, "오늘 마감되거나 예정된 업무가 없습니다.", "calendarcheck") +
        (st.overdue.length ? section("마감 지난 업무", st.overdue, "", "alarm", "red") : "") +
        section("마감 임박 업무", st.dueSoon, "3일 이내 마감 예정 업무가 없습니다.", "alarm", "amber", "(3일 이내)") +
        section("확인 대기 업무", st.holdTasks, "회신·확인을 기다리는 업무가 없습니다.", "pause", "amber") +
      "</div>" +
      '<div class="dash-col">' +
        '<div class="card section-card"><h2 class="sec-title"><span class="ic">' + WM.icon("trending", 15) + "</span>전체 진행률</h2>" +
          '<div class="rate-row">' +
            '<div><p class="rate-num">' + st.completionRate + "<small>%</small></p><p class='rate-label'>업무 완료율</p>" +
              '<div class="progress"><i style="width:' + st.completionRate + '%"></i></div></div>' +
            '<div><p class="rate-num alt">' + st.checklistRate + "<small>%</small></p><p class='rate-label'>체크리스트 완료율</p>" +
              '<div class="progress"><i style="width:' + st.checklistRate + '%;background:var(--brand-400)"></i></div></div>' +
          "</div></div>" +
        '<div class="card section-card"><h2 class="sec-title">상태별 업무 현황</h2>' +
          (st.total ? '<div class="stack-bar">' + statusBar + '</div><div class="legend">' + legend + "</div>" : "<p class='set-note'>업무가 없습니다.</p>") +
        "</div>" +
        '<div class="card section-card"><h2 class="sec-title">카테고리별 업무 현황</h2><ul class="stat-list">' + catList + "</ul></div>" +
        '<div class="card section-card"><h2 class="sec-title">우선순위별 업무 현황</h2><ul class="stat-list">' + priList + "</ul></div>" +
        '<div class="card section-card"><h2 class="sec-title"><span class="ic">' + WM.icon("checkcircle", 15) + "</span>최근 완료 업무</h2>" + doneList + "</div>" +
      "</div>" +
    "</div>";
};

/* ---- 업무 목록 ---- */
WM.renderTasksShell = function (state, total) {
  function opt(v, label, cur) { return '<option value="' + v + '"' + (v === cur ? " selected" : "") + ">" + label + "</option>"; }
  var f = state.filter;

  var statusOpts = '<option value="all">상태: 전체</option>' + WM.STATUS_ORDER.map(function (s) { return opt(s, WM.STATUS_LABELS[s], f.status); }).join("");
  var catOpts = '<option value="all">카테고리: 전체</option>' + WM.CATEGORY_ORDER.map(function (c) { return opt(c, WM.CATEGORY_LABELS[c], f.category); }).join("");
  var priOpts = '<option value="all">우선순위: 전체</option>' + WM.PRIORITY_ORDER.map(function (p) { return opt(p, WM.PRIORITY_LABELS[p], f.priority); }).join("");

  return '<div class="page-head page-head-row"><div><h1>업무 현황</h1>' +
      '<p id="task-count-line">전체 ' + total + "건</p></div>" +
      '<button type="button" class="btn btn-primary" data-action="open-new">' + WM.icon("plus", 16) + "새 업무 추가</button></div>" +
    '<div class="card filters">' +
      '<div class="filter-q"><span class="search-icon">' + WM.icon("search", 15) + '</span>' +
        '<input id="filter-q" placeholder="제목·요청자·현장·거래처·메모 검색" value="' + WM.esc(f.q) + '" aria-label="업무 검색" /></div>' +
      '<select id="filter-done" aria-label="완료 여부">' +
        opt("all", "전체 보기", f.doneView) + opt("active", "미완료만", f.doneView) + opt("done", "완료만", f.doneView) + "</select>" +
      '<select id="filter-status" aria-label="상태 필터">' + statusOpts + "</select>" +
      '<select id="filter-category" aria-label="카테고리 필터">' + catOpts + "</select>" +
      '<select id="filter-priority" aria-label="우선순위 필터">' + priOpts + "</select>" +
      '<select id="filter-sort" aria-label="정렬">' +
        opt("dueDate", "마감일순", state.sort) + opt("createdAt", "생성일순", state.sort) + opt("priority", "우선순위순", state.sort) + "</select>" +
      '<div class="view-toggle">' +
        '<button type="button" data-action="view-card" class="' + (state.view === "card" ? "active" : "") + '" aria-label="카드형 보기">' + WM.icon("grid", 15) + "</button>" +
        '<button type="button" data-action="view-table" class="' + (state.view === "table" ? "active" : "") + '" aria-label="테이블형 보기">' + WM.icon("table", 15) + "</button>" +
      "</div>" +
    "</div>" +
    '<div id="task-list"></div>';
};

WM.renderTaskList = function (state, tasks) {
  var visible = WM.sortTasks(WM.filterTasks(tasks, state.filter), state.sort);
  var line = document.getElementById("task-count-line");
  if (line) line.textContent = "전체 " + tasks.length + "건 · 표시 " + visible.length + "건";

  if (!tasks.length) return WM.emptyState("등록된 업무가 없습니다.", "'새 업무 추가' 버튼으로 첫 업무를 등록하세요.");
  if (!visible.length) return WM.emptyState("검색/필터 조건에 맞는 업무가 없습니다.", "검색어나 필터를 변경해보세요.");

  if (state.view === "table") {
    var rows = visible.map(function (t) {
      var progress = WM.checklistProgress(t.checklist);
      var overdue = WM.isTaskOverdue(t);
      var dueToday = WM.isToday(t.dueDate) && t.status !== "done";
      var stOpts = WM.STATUS_ORDER.map(function (s) {
        return '<option value="' + s + '"' + (t.status === s ? " selected" : "") + ">" + WM.STATUS_LABELS[s] + "</option>";
      }).join("");
      return '<tr data-action="open-task" data-id="' + t.id + '">' +
        '<td><p class="t-title' + (t.priority === "urgent" && t.status !== "done" ? " urgent" : "") + '">' + WM.esc(t.title) + "</p>" +
          (t.requester ? '<p class="t-sub">' + WM.esc(t.requester) + "</p>" : "") + "</td>" +
        "<td>" + WM.badgeCat(t.category) + "</td>" +
        '<td data-stop="1"><select class="st-select b-st-' + t.status + '" data-action="quick-status" data-id="' + t.id + '" aria-label="상태 변경">' + stOpts + "</select></td>" +
        "<td>" + WM.badgePriority(t.priority) + "</td>" +
        '<td class="small">' + (t.siteName ? WM.esc(t.siteName) : "-") +
          (t.clientName ? '<span style="display:block;color:var(--gray-400)">' + WM.esc(t.clientName) + "</span>" : "") + "</td>" +
        '<td class="small ' + (overdue ? "overdue" : dueToday ? "due-today" : "") + '">' +
          (t.dueDate ? (dueToday ? "오늘 마감" : WM.formatKorean(t.dueDate)) : "-") +
          (overdue ? '<span style="display:block">마감 지남</span>' : "") + "</td>" +
        '<td class="right small">' + (t.amount != null ? WM.formatAmount(t.amount) : "-") + "</td>" +
        "<td>" + (t.checklist.length
          ? '<div class="mini-progress"><div class="progress"><i style="width:' + progress + '%"></i></div><span>' + progress + "%</span></div>"
          : '<span class="tc-none">-</span>') + "</td>" +
        '<td data-stop="1"><button type="button" class="row-del" data-action="delete-task" data-id="' + t.id + '" aria-label="업무 삭제">' + WM.icon("trash", 15) + "</button></td>" +
      "</tr>";
    }).join("");
    return '<div class="card table-wrap"><table class="task-table"><thead><tr>' +
      "<th>업무명</th><th>카테고리</th><th>상태</th><th>우선순위</th><th>현장/거래처</th><th>마감일</th>" +
      '<th class="right">금액</th><th>체크리스트</th><th></th></tr></thead><tbody>' + rows + "</tbody></table></div>";
  }

  return '<div class="task-grid tasks-grid-3">' + visible.map(function (t) {
    return WM.taskCardHtml(t, { quickStatus: true, deletable: true });
  }).join("") + "</div>";
};

/* ---- 체크리스트 (상세/폼 공용) ---- */
WM.checklistHtml = function (items, ctx, editingId) {
  // ctx: "detail" | "form"
  var rows = items.map(function (c) {
    if (editingId === c.id) {
      return '<li><button type="button" class="cl-check' + (c.checked ? " on" : "") + '" data-cl="toggle" data-ctx="' + ctx + '" data-clid="' + c.id + '" aria-label="체크">' + WM.icon("check", 12) + "</button>" +
        '<input class="cl-edit-input" data-cl-edit-input value="' + WM.esc(c.label) + '" />' +
        '<span class="cl-edit-tools">' +
          '<button type="button" class="save" data-cl="edit-save" data-ctx="' + ctx + '" data-clid="' + c.id + '" aria-label="저장">' + WM.icon("check", 15) + "</button>" +
          '<button type="button" data-cl="edit-cancel" data-ctx="' + ctx + '" aria-label="취소">' + WM.icon("x", 15) + "</button>" +
        "</span></li>";
    }
    return '<li><button type="button" class="cl-check' + (c.checked ? " on" : "") + '" data-cl="toggle" data-ctx="' + ctx + '" data-clid="' + c.id + '" aria-label="' + (c.checked ? "체크 해제" : "체크") + '">' + WM.icon("check", 12) + "</button>" +
      '<span class="cl-label' + (c.checked ? " on" : "") + '">' + WM.esc(c.label) + "</span>" +
      '<span class="cl-tools">' +
        '<button type="button" data-cl="edit-start" data-ctx="' + ctx + '" data-clid="' + c.id + '" aria-label="항목 수정">' + WM.icon("pencil", 13) + "</button>" +
        '<button type="button" class="del" data-cl="remove" data-ctx="' + ctx + '" data-clid="' + c.id + '" aria-label="항목 삭제">' + WM.icon("trash", 13) + "</button>" +
      "</span></li>";
  }).join("");

  return (items.length ? '<ul class="checklist">' + rows + "</ul>" : '<p class="cl-empty">체크리스트 항목이 없습니다.</p>') +
    '<div class="cl-add-row">' +
      '<input data-cl-add-input data-ctx="' + ctx + '" placeholder="체크리스트 항목 추가" />' +
      '<button type="button" class="btn btn-outline btn-sm" data-cl="add" data-ctx="' + ctx + '">' + WM.icon("plus", 13) + "추가</button>" +
    "</div>";
};

/* ---- 업무 상세 ---- */
WM.renderTaskDetail = function (t) {
  if (!t) {
    return '<div class="detail-wrap" style="max-width:560px">' +
      WM.emptyState("해당 업무를 찾을 수 없습니다.", "삭제되었거나 잘못된 주소일 수 있습니다.") +
      '<div style="text-align:center;margin-top:16px"><a href="#/tasks" class="btn btn-primary">' + WM.icon("arrowleft", 15) + "업무 목록으로</a></div></div>";
  }

  var overdue = WM.isTaskOverdue(t);
  var dueToday = WM.isToday(t.dueDate) && t.status !== "done";
  var urgent = t.priority === "urgent" && t.status !== "done";
  var progress = WM.checklistProgress(t.checklist);

  var stOpts = WM.STATUS_ORDER.map(function (s) {
    return '<option value="' + s + '"' + (t.status === s ? " selected" : "") + ">" + WM.STATUS_LABELS[s] + "</option>";
  }).join("");

  function row(label, value) {
    return '<div class="row"><dt>' + label + "</dt><dd>" + value + "</dd></div>";
  }

  return '<div class="detail-wrap">' +
    '<div class="detail-bar">' +
      '<button type="button" class="btn btn-outline" data-action="back">' + WM.icon("arrowleft", 15) + "뒤로가기</button>" +
      '<div class="detail-actions">' +
        (t.status !== "done" ? '<button type="button" class="btn btn-primary" data-action="complete-task" data-id="' + t.id + '">' + WM.icon("checkcircle", 15) + "완료 처리</button>" : "") +
        '<button type="button" class="btn btn-outline" data-action="edit-task" data-id="' + t.id + '">' + WM.icon("pencil", 14) + "수정</button>" +
        '<button type="button" class="btn btn-danger-outline" data-action="delete-task-detail" data-id="' + t.id + '">' + WM.icon("trash", 14) + "삭제</button>" +
      "</div>" +
    "</div>" +
    '<div class="detail-grid">' +
      '<div class="detail-main">' +
        '<div class="card section-card' + (urgent ? " detail-card-urgent" : "") + '">' +
          '<div class="tc-badges">' + WM.badgeCat(t.category) + WM.badgeStatus(t.status) + WM.badgePriority(t.priority) +
            (overdue ? '<span class="badge b-plain-red">마감 지남</span>' : "") +
            (dueToday && !overdue ? '<span class="badge b-plain-amber">오늘 마감</span>' : "") +
          "</div>" +
          '<h1 class="detail-title">' + WM.esc(t.title) + "</h1>" +
          (t.confirmationNote ? '<p class="detail-confirm">' + WM.icon("alert", 14) + "확인사항: " + WM.esc(t.confirmationNote) + "</p>" : "") +
          '<div class="detail-status"><span>상태 변경</span><select class="select" data-action="detail-status" data-id="' + t.id + '" aria-label="상태 변경">' + stOpts + "</select></div>" +
        "</div>" +
        '<div class="card section-card">' +
          '<div class="cl-head"><h2 class="sec-h" style="margin:0">체크리스트</h2>' +
            (t.checklist.length ? '<span class="cl-pct">' + progress + "% 완료</span>" : "") + "</div>" +
          (t.checklist.length ? '<div class="progress cl-bar"><i style="width:' + progress + '%"></i></div>' : "") +
          '<div id="detail-checklist">' + WM.checklistHtml(t.checklist, "detail", null) + "</div>" +
        "</div>" +
        '<div class="card section-card"><h2 class="sec-h">메모</h2>' +
          (t.memo ? '<p class="memo-text">' + WM.esc(t.memo) + "</p>" : '<p class="none-text">작성된 메모가 없습니다.</p>') +
        "</div>" +
      "</div>" +
      '<div class="detail-side">' +
        '<div class="card section-card set-info"><h2 class="sec-h">업무 정보</h2><dl class="info-rows">' +
          row("요청자/지시자", t.requester ? WM.esc(t.requester) : "-") +
          row("현장명", t.siteName ? WM.esc(t.siteName) : "-") +
          row("거래처명", t.clientName ? WM.esc(t.clientName) : "-") +
          row("금액", WM.formatAmount(t.amount)) +
          row("업무 날짜", WM.formatKorean(t.date)) +
          row("마감일", '<span class="' + (overdue ? "overdue" : dueToday ? "due-today" : "") + '" style="' + (overdue ? "color:var(--red-600);font-weight:600" : dueToday ? "color:var(--amber-600);font-weight:600" : "") + '">' + WM.formatKorean(t.dueDate) + "</span>") +
          row("완료일", t.completedAt ? WM.formatKorean(t.completedAt) : "-") +
        "</dl></div>" +
        '<div class="card section-card set-info"><h2 class="sec-h">이력</h2><dl class="info-rows">' +
          row("생성일", WM.formatKorean(t.createdAt)) +
          row("마지막 수정", WM.formatKorean(t.updatedAt)) +
        "</dl></div>" +
      "</div>" +
    "</div>" +
  "</div>";
};

/* ---- 템플릿 페이지 ---- */
WM.renderTemplates = function () {
  var cards = WM.CHECKLIST_TEMPLATES.map(function (tpl) {
    var items = tpl.items.map(function (item, i) {
      return '<li><span class="num">' + (i + 1) + "</span>" + WM.esc(item) + "</li>";
    }).join("");
    return '<div class="card tpl-card"><div class="tpl-top"><div>' +
      WM.badgeCat(tpl.category) +
      '<h3 class="tpl-name">' + WM.esc(tpl.name) + "</h3>" +
      '<p class="tpl-desc">' + WM.esc(tpl.description) + "</p></div>" +
      '<button type="button" class="btn btn-outline btn-sm" data-action="copy-template" data-id="' + tpl.id + '">' + WM.icon("copy", 13) + "복사</button>" +
      "</div>" +
      '<p class="tpl-count">' + WM.icon("listchecks", 12) + "체크리스트 " + tpl.items.length + "개 항목</p>" +
      '<ol class="tpl-items">' + items + "</ol></div>";
  }).join("");

  return '<div class="page-head"><h1>업무 템플릿</h1>' +
    "<p>업무 등록 시 카테고리를 선택하면 해당 템플릿을 체크리스트로 불러올 수 있습니다. 항목 수정은 js/templates.js에서 가능합니다.</p></div>" +
    '<div class="tpl-grid">' + cards + "</div>";
};

/* ---- 설정 페이지 ---- */
WM.renderSettings = function (tasks) {
  var lastUpdated = tasks.reduce(function (max, t) { return t.updatedAt > max ? t.updatedAt : max; }, "");
  return '<div class="settings-wrap">' +
    '<div class="page-head" style="margin:0"><h1>설정</h1><p>데이터 백업·복원과 앱 정보를 관리합니다.</p></div>' +
    '<div class="card section-card"><h2 class="sec-h">저장 방식</h2>' +
      '<p class="storage-line"><span class="ic">' + WM.icon("database", 15) + "</span><span><b>localStorage 모드</b> — 데이터는 이 브라우저에만 저장됩니다.</span></p>" +
      '<p class="set-note">다른 기기와 공유하려면 JSON 내보내기/가져오기를 이용하세요. (서버 버전은 Next.js + Supabase 프로젝트 참고)</p>' +
    "</div>" +
    '<div class="card section-card"><h2 class="sec-h">데이터 백업 / 복원</h2>' +
      '<div class="set-row">' +
        '<button type="button" class="btn btn-outline" data-action="export">' + WM.icon("download", 15) + "JSON 내보내기</button>" +
        '<button type="button" class="btn btn-outline" data-action="import-click">' + WM.icon("upload", 15) + "JSON 가져오기</button>" +
        '<input type="file" id="import-file" accept="application/json,.json" style="display:none" />' +
      "</div>" +
      '<p class="set-note">내보내기 파일명: work-management-backup-YYYY-MM-DD.json · 가져오기 시 기존 데이터를 덮어씁니다.</p>' +
    "</div>" +
    '<div class="card section-card"><h2 class="sec-h">데이터 관리</h2>' +
      '<div class="set-row">' +
        '<button type="button" class="btn btn-outline" data-action="sample">' + WM.icon("sparkles", 15) + "샘플 데이터 다시 생성</button>" +
        '<button type="button" class="btn btn-danger-outline" data-action="reset">' + WM.icon("rotate", 15) + "데이터 초기화</button>" +
      "</div>" +
    "</div>" +
    '<div class="card section-card set-info"><h2 class="sec-h">앱 정보</h2><dl>' +
      '<div class="r"><dt>앱 이름</dt><dd>업무 매니지먼트 (건설/공사 행정)</dd></div>' +
      '<div class="r"><dt>버전</dt><dd>0.2.0 (정적 웹 버전)</dd></div>' +
      '<div class="r"><dt>저장 키</dt><dd class="mono">' + WM.STORAGE_KEY + "</dd></div>" +
      '<div class="r"><dt>업무 데이터</dt><dd>' + tasks.length + "건</dd></div>" +
      '<div class="r"><dt>마지막 업데이트</dt><dd>' +
        (lastUpdated ? WM.formatKorean(lastUpdated) + " " + lastUpdated.slice(11, 16) : "-") + "</dd></div>" +
    "</dl>" +
      '<p class="set-tip">' + WM.icon("info", 13) + "이 앱은 다른 담당자의 반복 업무를 관리하기 위한 도구입니다. 샘플 데이터는 모두 가상의 데이터입니다.</p>" +
    "</div>" +
  "</div>";
};

/* ---- 404 ---- */
WM.renderNotFound = function () {
  return '<div class="nf"><p class="code">404</p><h1>페이지를 찾을 수 없습니다</h1>' +
    "<p>주소가 잘못되었거나 삭제된 페이지입니다.</p>" +
    '<a href="#/dashboard" class="btn btn-primary">대시보드로 이동</a></div>';
};

/* ---- 업무 등록/수정 폼 모달 ---- */
WM.renderTaskForm = function (formState, isEdit) {
  function opt(v, label, cur) { return '<option value="' + v + '"' + (v === cur ? " selected" : "") + ">" + label + "</option>"; }
  var v = formState;
  var tpl = WM.getTemplateByCategory(v.category);

  return '<div class="modal-dim" data-form-dim>' +
    '<div class="modal">' +
      '<div class="modal-head"><h2>' + (isEdit ? "업무 수정" : "새 업무 추가") + "</h2>" +
        '<button type="button" class="icon-btn" data-action="form-close" aria-label="닫기">' + WM.icon("x", 18) + "</button></div>" +
      '<div class="modal-body">' +
        '<div><label class="field-label">업무명 <span style="color:var(--red-500)">*</span></label>' +
          '<input class="input" id="f-title" value="' + WM.esc(v.title) + '" placeholder="예: ○○현장 계약보증서 발급" />' +
          '<p class="field-error" id="f-title-error" style="display:none">업무명을 입력해주세요.</p></div>' +
        '<div class="form-grid-3">' +
          '<div><label class="field-label">카테고리</label><select class="select" id="f-category">' +
            WM.CATEGORY_ORDER.map(function (c) { return opt(c, WM.CATEGORY_LABELS[c], v.category); }).join("") + "</select></div>" +
          '<div><label class="field-label">상태</label><select class="select" id="f-status">' +
            WM.STATUS_ORDER.map(function (s) { return opt(s, WM.STATUS_LABELS[s], v.status); }).join("") + "</select></div>" +
          '<div><label class="field-label">우선순위</label><select class="select" id="f-priority">' +
            WM.PRIORITY_ORDER.map(function (p) { return opt(p, WM.PRIORITY_LABELS[p], v.priority); }).join("") + "</select></div>" +
        "</div>" +
        '<div class="form-grid-3">' +
          '<div><label class="field-label">요청자/지시자</label><input class="input" id="f-requester" value="' + WM.esc(v.requester || "") + '" placeholder="예: 김부장님" /></div>' +
          '<div><label class="field-label">현장명</label><input class="input" id="f-siteName" value="' + WM.esc(v.siteName || "") + '" placeholder="예: ○○아파트" /></div>' +
          '<div><label class="field-label">거래처명</label><input class="input" id="f-clientName" value="' + WM.esc(v.clientName || "") + '" placeholder="예: ○○관리사무소" /></div>' +
        "</div>" +
        '<div class="form-grid-3">' +
          '<div><label class="field-label">금액 (원)</label><input class="input" id="f-amount" inputmode="numeric" value="' + (v.amount != null ? Number(v.amount).toLocaleString("ko-KR") : "") + '" placeholder="숫자만 입력" /></div>' +
          '<div><label class="field-label">업무 날짜</label><input class="input" type="date" id="f-date" value="' + WM.esc(v.date || "") + '" /></div>' +
          '<div><label class="field-label">마감일</label><input class="input" type="date" id="f-dueDate" value="' + WM.esc(v.dueDate || "") + '" /></div>' +
        "</div>" +
        '<div><label class="field-label">확인사항</label><input class="input" id="f-confirmationNote" value="' + WM.esc(v.confirmationNote || "") + '" placeholder="예: 담당자 회신 대기" /></div>' +
        '<div><label class="field-label">메모</label><textarea class="textarea" id="f-memo" rows="3" placeholder="참고할 내용을 메모하세요">' + WM.esc(v.memo || "") + "</textarea></div>" +
        "<div>" +
          '<div class="cl-form-head"><label class="field-label" style="margin:0">체크리스트</label>' +
            (tpl ? '<button type="button" class="tpl-apply-btn" data-action="tpl-apply">' + WM.icon("filestack", 12) + WM.esc(tpl.name) + " 불러오기</button>" : "") +
          "</div>" +
          '<div id="form-checklist">' + WM.checklistHtml(v.checklist, "form", null) + "</div>" +
        "</div>" +
      "</div>" +
      '<div class="modal-foot">' +
        '<button type="button" class="btn btn-outline" data-action="form-close">취소</button>' +
        '<button type="button" class="btn btn-primary" data-action="form-submit">' + (isEdit ? "수정 저장" : "업무 등록") + "</button>" +
      "</div>" +
    "</div>" +
  "</div>";
};
