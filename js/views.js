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
        naraDashCard() +
      "</div>" +
    "</div>";
};

/** 대시보드용 B2G 간략 요약 (업무 스케줄과 분리, Supabase 데이터) */
function naraDashCard() {
  var bids = (WM.App && Array.isArray(WM.App.bids)) ? WM.App.bids : [];
  var won = bids.filter(function (b) { return b.result === "낙찰"; }).length;
  var pending = bids.filter(function (b) { return !b.result; }).length;
  var followup = bids.filter(function (b) { return b.followup; }).length;
  return '<div class="card section-card"><h2 class="sec-title"><span class="ic">' + WM.icon("gavel", 15) + "</span>B2G 입찰 현황" +
      "<a class='note' href='#/b2g' style='margin-left:auto;color:var(--brand-600)'>전체 보기 →</a></h2>" +
    '<ul class="stat-list">' +
      "<li><span>전체 공고</span><span class='v'>" + bids.length + "건</span></li>" +
      "<li><span>낙찰</span><span class='v'>" + won + "건</span></li>" +
      "<li><span>진행중</span><span class='v'>" + pending + "건</span></li>" +
      "<li><span>후속업무</span><span class='v'>" + followup + "건</span></li>" +
    "</ul></div>";
}

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

/* ---- 메모(댓글) 카드 ---- */
WM.commentsCardHtml = function (t) {
  var comments = (t.comments || []).slice().sort(function (a, b) {
    return a.createdAt < b.createdAt ? -1 : 1;
  });

  var list = comments.length
    ? '<div class="cmt-list">' + comments.map(function (c) {
        return '<div class="cmt">' +
          '<div class="cmt-head"><span class="cmt-time">' + WM.formatDateTime(c.createdAt) + "</span>" +
            '<button type="button" class="cmt-del" data-action="comment-remove" data-id="' + t.id + '" data-cid="' + c.id + '" aria-label="메모 삭제">' + WM.icon("trash", 13) + "</button>" +
          "</div>" +
          '<p class="cmt-text">' + WM.esc(c.text) + "</p>" +
        "</div>";
      }).join("") + "</div>"
    : '<p class="none-text">작성된 메모가 없습니다. 첫 메모를 남겨보세요.</p>';

  return '<div class="card section-card"><h2 class="sec-h">메모' +
      (comments.length ? ' <span class="cmt-count">' + comments.length + "</span>" : "") + "</h2>" +
    list +
    '<div class="cmt-add">' +
      '<textarea class="textarea" id="comment-input" rows="2" placeholder="메모를 입력하세요 (Ctrl+Enter로 등록)"></textarea>' +
      '<button type="button" class="btn btn-primary" data-action="comment-add" data-id="' + t.id + '">등록</button>' +
    "</div>" +
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
        WM.commentsCardHtml(t) +
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

/* ---- 달력 ---- */
WM.renderCalendar = function (tasks, y, m) {
  var todayStr = WM.todayStr();

  // 날짜별 업무 매핑 (마감일 우선, 없으면 업무 날짜)
  var byDate = {};
  tasks.forEach(function (t) {
    var d = t.dueDate || t.date;
    if (!d) return;
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(t);
  });

  var startDow = new Date(y, m, 1).getDay();
  var daysInMonth = new Date(y, m + 1, 0).getDate();
  var totalCells = Math.ceil((startDow + daysInMonth) / 7) * 7;

  var cells = "";
  for (var i = 0; i < totalCells; i++) {
    var d = new Date(y, m, i - startDow + 1);
    var dateStr = d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
    var other = d.getMonth() !== m;
    var dow = i % 7;

    var list = WM.sortTasks(byDate[dateStr] || [], "priority");
    var chips = list.slice(0, 4).map(function (t) {
      return '<button type="button" class="cal-chip b-st-' + t.status + (t.status === "done" || t.status === "cancelled" ? " muted" : "") +
        '" data-action="cal-open" data-id="' + t.id + '" title="' + WM.esc(t.title) + '">' + WM.esc(t.title) + "</button>";
    }).join("");
    if (list.length > 4) chips += '<p class="cal-more">+' + (list.length - 4) + "건</p>";

    cells += '<div class="cal-cell' + (other ? " other" : "") + '">' +
      '<span class="cal-day' + (dateStr === todayStr ? " today" : "") + (dow === 0 ? " sun" : dow === 6 ? " sat" : "") + '">' + d.getDate() + "</span>" +
      chips + "</div>";
  }

  var dowHead = ["일", "월", "화", "수", "목", "금", "토"].map(function (label, i) {
    return '<span class="' + (i === 0 ? "sun" : i === 6 ? "sat" : "") + '">' + label + "</span>";
  }).join("");

  return '<div class="page-head"><h1>달력</h1><p>마감일(없으면 업무 날짜) 기준으로 일정을 한눈에 확인하세요.</p></div>' +
    '<div class="cal-toolbar">' +
      '<h2 class="cal-title">' + y + "년 " + (m + 1) + "월</h2>" +
      '<div class="cal-nav">' +
        '<button type="button" class="icon-btn" data-action="cal-prev" aria-label="이전 달">' + WM.icon("arrowleft", 16) + "</button>" +
        '<button type="button" class="btn btn-outline btn-sm" data-action="cal-today">오늘</button>' +
        '<button type="button" class="icon-btn" data-action="cal-next" aria-label="다음 달">' + WM.icon("arrowright", 16) + "</button>" +
      "</div>" +
    "</div>" +
    '<div class="card calendar"><div class="cal-dow">' + dowHead + '</div><div class="cal-grid">' + cells + "</div></div>";
};

/* ---- 템플릿 페이지 (웹에서 직접 수정 가능) ---- */
WM.renderTemplates = function (edit) {
  edit = edit || null;

  var cards = WM.CHECKLIST_TEMPLATES.map(function (tpl) {
    var isMeta = edit && edit.id === tpl.id && edit.meta;

    var top;
    if (isMeta) {
      top = '<div class="tpl-meta-edit">' +
        WM.badgeCat(tpl.category) +
        '<input class="input" id="tpl-name-input" value="' + WM.esc(tpl.name) + '" placeholder="템플릿 이름" />' +
        '<input class="input" id="tpl-desc-input" value="' + WM.esc(tpl.description) + '" placeholder="설명" />' +
        '<div class="tpl-actions">' +
          '<button type="button" class="btn btn-primary btn-sm" data-action="tpl-meta-save" data-id="' + tpl.id + '">저장</button>' +
          '<button type="button" class="btn btn-outline btn-sm" data-action="tpl-edit-cancel">취소</button>' +
        "</div></div>";
    } else {
      top = "<div>" + WM.badgeCat(tpl.category) +
        '<h3 class="tpl-name">' + WM.esc(tpl.name) + "</h3>" +
        '<p class="tpl-desc">' + WM.esc(tpl.description) + "</p></div>" +
        '<div class="tpl-actions">' +
          '<button type="button" class="icon-btn tpl-meta-btn" data-action="tpl-meta-edit" data-id="' + tpl.id + '" aria-label="이름/설명 수정">' + WM.icon("pencil", 13) + "</button>" +
          '<button type="button" class="icon-btn tpl-meta-btn tpl-del-btn" data-action="tpl-delete" data-id="' + tpl.id + '" aria-label="템플릿 삭제">' + WM.icon("trash", 13) + "</button>" +
          '<button type="button" class="btn btn-outline btn-sm" data-action="copy-template" data-id="' + tpl.id + '">' + WM.icon("copy", 13) + "복사</button>" +
        "</div>";
    }

    var items = tpl.items.map(function (item, i) {
      if (edit && edit.id === tpl.id && edit.item === i) {
        return '<li><span class="num">' + (i + 1) + "</span>" +
          '<input class="cl-edit-input" data-tpl-edit-input value="' + WM.esc(item) + '" />' +
          '<span class="cl-edit-tools">' +
            '<button type="button" class="save" data-action="tpl-item-save" data-id="' + tpl.id + '" data-idx="' + i + '" aria-label="저장">' + WM.icon("check", 15) + "</button>" +
            '<button type="button" data-action="tpl-edit-cancel" aria-label="취소">' + WM.icon("x", 15) + "</button>" +
          "</span></li>";
      }
      return '<li><span class="num">' + (i + 1) + '</span><span class="lbl">' + WM.esc(item) + "</span>" +
        '<span class="tpl-tools">' +
          '<button type="button" data-action="tpl-item-edit" data-id="' + tpl.id + '" data-idx="' + i + '" aria-label="항목 수정">' + WM.icon("pencil", 13) + "</button>" +
          '<button type="button" class="del" data-action="tpl-item-remove" data-id="' + tpl.id + '" data-idx="' + i + '" aria-label="항목 삭제">' + WM.icon("trash", 13) + "</button>" +
        "</span></li>";
    }).join("");

    var isDefault = WM.DEFAULT_TEMPLATES.some(function (d) { return d.id === tpl.id; });

    return '<div class="card tpl-card"><div class="tpl-top">' + top + "</div>" +
      '<p class="tpl-count">' + WM.icon("listchecks", 12) + "체크리스트 " + tpl.items.length + "개 항목</p>" +
      '<ol class="tpl-items">' + items + "</ol>" +
      '<div class="cl-add-row">' +
        '<input data-tpl-add-input data-id="' + tpl.id + '" placeholder="체크리스트 항목 추가" />' +
        '<button type="button" class="btn btn-outline btn-sm" data-action="tpl-item-add" data-id="' + tpl.id + '">' + WM.icon("plus", 13) + "추가</button>" +
      "</div>" +
      (isDefault ? '<button type="button" class="tpl-restore" data-action="tpl-restore" data-id="' + tpl.id + '">' + WM.icon("rotate", 12) + "기본값 복원</button>" : "") +
    "</div>";
  }).join("");

  // 새 템플릿 추가 카드
  var catOpts = WM.CATEGORY_ORDER.map(function (c) {
    return '<option value="' + c + '">' + WM.CATEGORY_LABELS[c] + "</option>";
  }).join("");
  var newCard = '<div class="card tpl-card tpl-new">' +
    '<h3 class="tpl-name" style="margin-top:0">' + WM.icon("plus", 14) + " 새 템플릿 추가</h3>" +
    '<p class="tpl-desc">카테고리를 선택하고 이름을 입력해 나만의 템플릿을 만드세요. 항목은 만든 뒤 바로 추가할 수 있습니다.</p>' +
    '<div class="tpl-new-form">' +
      '<div><label class="field-label">카테고리</label><select class="select" id="new-tpl-category">' + catOpts + "</select></div>" +
      '<div><label class="field-label">템플릿 이름 <span style="color:var(--red-500)">*</span></label>' +
        '<input class="input" id="new-tpl-name" placeholder="예: 하자보수 업무 템플릿" /></div>' +
      '<div><label class="field-label">설명 (선택)</label>' +
        '<input class="input" id="new-tpl-desc" placeholder="템플릿이 다루는 업무 흐름" /></div>' +
      '<button type="button" class="btn btn-primary" data-action="tpl-create">' + WM.icon("plus", 15) + "템플릿 추가</button>" +
    "</div></div>";

  return '<div class="page-head page-head-row"><div><h1>업무 템플릿</h1>' +
    "<p>업무 등록 시 카테고리를 선택하면 해당 템플릿을 체크리스트로 불러올 수 있습니다. 이 화면에서 직접 추가·수정·삭제할 수 있습니다.</p></div>" +
    '<button type="button" class="btn btn-outline btn-sm" data-action="tpl-restore-defaults">' + WM.icon("rotate", 13) + "기본 템플릿 복원</button></div>" +
    '<div class="tpl-grid">' + cards + newCard + "</div>";
};

/* ---- 설정 페이지 ---- */
WM.renderSettings = function (tasks) {
  var lastUpdated = tasks.reduce(function (max, t) { return t.updatedAt > max ? t.updatedAt : max; }, "");
  return '<div class="settings-wrap">' +
    '<div class="page-head" style="margin:0"><h1>설정</h1><p>데이터 백업·복원과 앱 정보를 관리합니다.</p></div>' +
    '<div class="card section-card"><h2 class="sec-h">저장 방식</h2>' +
      '<p class="storage-line"><span class="ic">' + WM.icon("database", 15) + "</span><span><b>Supabase 온라인 모드</b> — 데이터는 로그인 계정별로 온라인 데이터베이스에 저장됩니다.</span></p>" +
      '<p class="set-note">어느 기기에서나 같은 계정으로 로그인하면 동일한 데이터를 볼 수 있습니다. 업무 템플릿은 이 브라우저(localStorage)에 저장됩니다.</p>' +
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
      '<div class="r"><dt>앱 이름</dt><dd>SOERP - 김소은상회(주) 업무 매니지먼트</dd></div>' +
      '<div class="r"><dt>버전</dt><dd>0.3.0 (Supabase 연동)</dd></div>' +
      '<div class="r"><dt>로그인 계정</dt><dd>' + WM.esc(window.currentUser && window.currentUser.email ? window.currentUser.email : "-") + "</dd></div>" +
      '<div class="r"><dt>저장 위치</dt><dd>Supabase · tasks 테이블</dd></div>' +
      '<div class="r"><dt>업무 데이터</dt><dd>' + tasks.length + "건</dd></div>" +
      '<div class="r"><dt>마지막 업데이트</dt><dd>' +
        (lastUpdated ? WM.formatKorean(lastUpdated) + " " + lastUpdated.slice(11, 16) : "-") + "</dd></div>" +
    "</dl>" +
      '<p class="set-tip">' + WM.icon("info", 13) + "SOERP는 건설/공사 행정 반복 업무를 관리하기 위한 도구입니다. 샘플 데이터는 모두 가상의 데이터입니다.</p>" +
    "</div>" +
  "</div>";
};

/* ---- 404 ---- */
WM.renderNotFound = function () {
  return '<div class="nf"><p class="code">404</p><h1>페이지를 찾을 수 없습니다</h1>' +
    "<p>주소가 잘못되었거나 삭제된 페이지입니다.</p>" +
    '<a href="#/dashboard" class="btn btn-primary">대시보드로 이동</a></div>';
};

/* ---- 연락처 (Contact) ---- */

/** 연락처 목록 셸: 검색 + 거래처 필터 + 리스트 컨테이너 */
WM.renderContactsShell = function (state, total) {
  var f = state.contactFilter || { q: "", client: "all" };
  var clients = {};
  (state.contacts || []).forEach(function (c) { if (c.clientName) clients[c.clientName] = 1; });
  var clientOpts = '<option value="all">거래처: 전체</option>' + Object.keys(clients).sort().map(function (name) {
    return '<option value="' + WM.esc(name) + '"' + (f.client === name ? " selected" : "") + '>' + WM.esc(name) + "</option>";
  }).join("");

  return '<div class="page-head page-head-row"><div><h1>연락처</h1>' +
      '<p id="contact-count-line">전체 ' + total + "건</p></div>" +
      '<button type="button" class="btn btn-primary" data-action="contact-open-new">' + WM.icon("plus", 16) + "새 연락처 추가</button></div>" +
    '<div class="card filters">' +
      '<div class="filter-q"><span class="search-icon">' + WM.icon("search", 15) + '</span>' +
        '<input id="contact-q" placeholder="이름·거래처·직급·연락처·현장명·메모 검색" value="' + WM.esc(f.q) + '" aria-label="연락처 검색" /></div>' +
      '<select id="contact-client" aria-label="거래처 필터">' + clientOpts + "</select>" +
    "</div>" +
    '<div id="contact-list"></div>';
};

/** 연락처 필터링 */
WM.filterContacts = function (contacts, f) {
  f = f || { q: "", client: "all" };
  var q = (f.q || "").trim().toLowerCase();
  return contacts.filter(function (c) {
    if (f.client !== "all" && c.clientName !== f.client) return false;
    if (!q) return true;
    return [c.name, c.clientName, c.position, c.phonePersonal, c.phoneOffice, c.phoneOther, c.siteName, c.memo]
      .some(function (v) { return v && String(v).toLowerCase().indexOf(q) !== -1; });
  });
};

/** 연락처 리스트 (테이블형) */
WM.renderContactList = function (state, contacts) {
  var visible = WM.filterContacts(contacts, state.contactFilter);
  var line = document.getElementById("contact-count-line");
  if (line) line.textContent = "전체 " + contacts.length + "건 · 표시 " + visible.length + "건";

  if (!contacts.length) return WM.emptyState("등록된 연락처가 없습니다.", "'새 연락처 추가' 버튼으로 첫 연락처를 등록하세요.");
  if (!visible.length) return WM.emptyState("검색/필터 조건에 맞는 연락처가 없습니다.", "검색어나 필터를 변경해보세요.");

  var rows = visible.map(function (c) {
    var phones = [];
    if (c.phonePersonal) phones.push(WM.icon("smartphone", 12) + WM.esc(c.phonePersonal));
    if (c.phoneOffice) phones.push(WM.icon("phone", 12) + WM.esc(c.phoneOffice));
    if (c.phoneOther) phones.push(WM.icon("plus", 12) + WM.esc(c.phoneOther));
    return '<tr data-action="contact-open" data-id="' + c.id + '">' +
      '<td><p class="t-title">' + WM.esc(c.name) + "</p>" +
        (c.position ? '<p class="t-sub">' + WM.esc(c.position) + "</p>" : "") + "</td>" +
      '<td class="small">' + (c.clientName ? WM.esc(c.clientName) : "-") + "</td>" +
      '<td class="small"><div class="ct-phones">' + (phones.length ? phones.map(function (p) { return "<span>" + p + "</span>"; }).join("") : "-") + "</div></td>" +
      '<td class="small">' + (c.siteName ? WM.esc(c.siteName) : "-") + "</td>" +
      '<td class="small ct-memo">' + (c.memo ? WM.esc(c.memo) : "-") + "</td>" +
      '<td class="center">' + (c.imagePath ? '<span class="ct-has-img">' + WM.icon("image", 15) + "</span>" : '<span class="tc-none">-</span>') + "</td>" +
      '<td data-stop="1"><button type="button" class="row-del" data-action="contact-delete" data-id="' + c.id + '" aria-label="연락처 삭제">' + WM.icon("trash", 15) + "</button></td>" +
    "</tr>";
  }).join("");

  return '<div class="card table-wrap"><table class="task-table contact-table"><thead><tr>' +
    "<th>이름/직급</th><th>거래처</th><th>연락처</th><th>현장명</th><th>메모</th><th>명함</th><th></th></tr></thead><tbody>" +
    rows + "</tbody></table></div>";
};

/** 연락처 상세 팝업 (모달) */
WM.renderContactDetail = function (c) {
  function row(label, value) {
    return '<div class="row"><dt>' + label + "</dt><dd>" + value + "</dd></div>";
  }
  function tel(v) {
    if (!v) return "-";
    return '<a href="tel:' + WM.esc(v.replace(/[^0-9+]/g, "")) + '" data-stop="1">' + WM.esc(v) + "</a>";
  }
  var img = c.imagePath
    ? '<div class="ct-img-box" id="contact-detail-img">' + WM.renderLoading("명함 이미지를 불러오는 중...") + "</div>"
    : "";

  return '<div class="modal-dim" data-contact-detail-dim>' +
    '<div class="modal">' +
      '<div class="modal-head"><h2>' + WM.esc(c.name) +
        (c.position ? ' <span class="ct-head-sub">' + WM.esc(c.position) + "</span>" : "") + "</h2>" +
        '<button type="button" class="icon-btn" data-action="contact-detail-close" aria-label="닫기">' + WM.icon("x", 18) + "</button></div>" +
      '<div class="modal-body">' +
        img +
        '<dl class="info-rows">' +
          row("거래처", c.clientName ? WM.esc(c.clientName) : "-") +
          row("연락처 (개인)", tel(c.phonePersonal)) +
          row("연락처 (유선)", tel(c.phoneOffice)) +
          row("연락처 (기타)", tel(c.phoneOther)) +
          row("현장명", c.siteName ? WM.esc(c.siteName) : "-") +
          row("등록일", WM.formatKorean(c.createdAt)) +
        "</dl>" +
        (c.memo ? '<div class="ct-memo-box"><p class="field-label" style="margin-bottom:4px">메모</p><p>' + WM.esc(c.memo).replace(/\n/g, "<br>") + "</p></div>" : "") +
      "</div>" +
      '<div class="modal-foot">' +
        '<button type="button" class="btn btn-danger-outline" data-action="contact-delete" data-id="' + c.id + '" data-from-detail="1">' + WM.icon("trash", 14) + "삭제</button>" +
        '<span style="flex:1"></span>' +
        '<button type="button" class="btn btn-outline" data-action="contact-detail-close">닫기</button>' +
        '<button type="button" class="btn btn-primary" data-action="contact-edit" data-id="' + c.id + '">' + WM.icon("pencil", 14) + "수정</button>" +
      "</div>" +
    "</div>" +
  "</div>";
};

/** 연락처 등록/수정 폼 모달 */
WM.renderContactForm = function (formState, isEdit) {
  var v = formState.values;
  var imgPreview;
  if (formState.previewUrl) {
    imgPreview = '<img class="ct-img-preview" src="' + WM.esc(formState.previewUrl) + '" alt="명함 미리보기" />';
  } else if (v.imagePath) {
    imgPreview = '<div class="ct-img-box" id="contact-form-img">' + WM.renderLoading("기존 명함 이미지 불러오는 중...") + "</div>";
  } else {
    imgPreview = '<p class="set-note" style="margin:0">' + WM.icon("image", 14) + " 등록된 명함 이미지가 없습니다.</p>";
  }

  return '<div class="modal-dim" data-form-dim>' +
    '<div class="modal">' +
      '<div class="modal-head"><h2>' + (isEdit ? "연락처 수정" : "새 연락처 추가") + "</h2>" +
        '<button type="button" class="icon-btn" data-action="contact-form-close" aria-label="닫기">' + WM.icon("x", 18) + "</button></div>" +
      '<div class="modal-body">' +
        '<div class="form-grid-3">' +
          '<div><label class="field-label">이름 <span style="color:var(--red-500)">*</span></label>' +
            '<input class="input" id="c-name" value="' + WM.esc(v.name || "") + '" placeholder="예: 홍길동" />' +
            '<p class="field-error" id="c-name-error" style="display:none">이름을 입력해주세요.</p></div>' +
          '<div><label class="field-label">직급</label><input class="input" id="c-position" value="' + WM.esc(v.position || "") + '" placeholder="예: 과장" /></div>' +
          '<div><label class="field-label">거래처</label><input class="input" id="c-clientName" value="' + WM.esc(v.clientName || "") + '" placeholder="예: ○○건설(주)" /></div>' +
        "</div>" +
        '<div class="form-grid-3">' +
          '<div><label class="field-label">연락처 (개인)</label><input class="input" id="c-phonePersonal" inputmode="tel" value="' + WM.esc(v.phonePersonal || "") + '" placeholder="예: 010-1234-5678" /></div>' +
          '<div><label class="field-label">연락처 (유선)</label><input class="input" id="c-phoneOffice" inputmode="tel" value="' + WM.esc(v.phoneOffice || "") + '" placeholder="예: 02-123-4567" /></div>' +
          '<div><label class="field-label">연락처 (기타)</label><input class="input" id="c-phoneOther" inputmode="tel" value="' + WM.esc(v.phoneOther || "") + '" placeholder="예: 팩스, 부서 번호 등" /></div>' +
        "</div>" +
        '<div><label class="field-label">현장명</label><input class="input" id="c-siteName" value="' + WM.esc(v.siteName || "") + '" placeholder="예: ○○아파트 신축 현장" /></div>' +
        '<div><label class="field-label">메모</label><textarea class="textarea" id="c-memo" rows="3" placeholder="특이사항, 만난 계기 등">' + WM.esc(v.memo || "") + "</textarea></div>" +
        "<div><label class='field-label'>명함 이미지</label>" +
          '<div class="ct-upload-row">' +
            imgPreview +
            '<div class="ct-upload-btns">' +
              '<button type="button" class="btn btn-outline btn-sm" data-action="contact-image-pick">' + WM.icon("upload", 14) + (v.imagePath || formState.previewUrl ? "이미지 변경" : "이미지 업로드") + "</button>" +
              ((v.imagePath || formState.previewUrl) ? '<button type="button" class="btn btn-danger-outline btn-sm" data-action="contact-image-remove">' + WM.icon("trash", 13) + "이미지 제거</button>" : "") +
            "</div>" +
          "</div>" +
          '<input type="file" id="contact-image-file" accept="image/*" style="display:none" />' +
          '<p class="set-note">JPG·PNG 등 이미지 파일, 최대 5MB. 새 이미지 업로드 시 기존 이미지는 교체됩니다.</p>' +
        "</div>" +
      "</div>" +
      '<div class="modal-foot">' +
        '<button type="button" class="btn btn-outline" data-action="contact-form-close">취소</button>' +
        '<button type="button" class="btn btn-primary" data-action="contact-form-submit">' + (isEdit ? "수정 저장" : "연락처 등록") + "</button>" +
      "</div>" +
    "</div>" +
  "</div>";
};

/* ---- 업무 등록/수정 폼 모달 ---- */
WM.renderTaskForm = function (formState, isEdit) {
  function opt(v, label, cur) { return '<option value="' + v + '"' + (v === cur ? " selected" : "") + ">" + label + "</option>"; }
  var v = formState;
  var tpls = WM.getTemplatesByCategory(v.category);
  var tplBtns = tpls.map(function (tpl) {
    return '<button type="button" class="tpl-apply-btn" data-action="tpl-apply" data-tplid="' + tpl.id + '">' +
      WM.icon("filestack", 12) + WM.esc(tpl.name) + " 불러오기</button>";
  }).join("");

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
        "<div>" +
          '<div class="cl-form-head"><label class="field-label" style="margin:0">체크리스트</label>' +
            (tplBtns ? '<span class="tpl-apply-group">' + tplBtns + "</span>" : "") +
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
