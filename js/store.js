/* ===== 데이터 저장(localStorage) + 업무 로직 ===== */
window.WM = window.WM || {};

/* ---- 저장/로드 (손상 데이터 방어) ---- */
WM.loadTasks = function () {
  try {
    var raw = localStorage.getItem(WM.STORAGE_KEY);
    if (raw === null) {
      // 첫 실행: 샘플 데이터 시드
      var sample = WM.createSampleTasks();
      WM.saveTasks(sample);
      return sample;
    }
    var parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(function (t) {
      return t && typeof t.id === "string" && typeof t.title === "string";
    }).map(function (t) {
      if (!Array.isArray(t.checklist)) t.checklist = [];
      return t;
    });
  } catch (e) {
    console.error("저장된 데이터를 읽지 못했습니다.", e);
    return [];
  }
};

WM.saveTasks = function (tasks) {
  try {
    localStorage.setItem(WM.STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error("데이터 저장에 실패했습니다.", e);
    if (WM.toast) WM.toast("저장에 실패했습니다. 저장 공간을 확인해주세요.", "error");
  }
};

/* ---- 상태 전이: done 전환 시 completedAt 기록, 해제 시 비움 ---- */
WM.statusChangePatch = function (status) {
  var patch = { status: status };
  if (status === "done") patch.completedAt = new Date().toISOString();
  else patch.completedAt = undefined;
  return patch;
};

/* ---- 필터/정렬 ---- */
WM.DEFAULT_FILTER = { q: "", status: "all", category: "all", priority: "all", doneView: "all" };

WM.isActive = function (t) { return t.status !== "done" && t.status !== "cancelled"; };

WM.isTaskToday = function (t) { return WM.isToday(t.dueDate) || WM.isToday(t.date); };

WM.isDueWithin = function (t, days) {
  if (!WM.isActive(t)) return false;
  var d = WM.daysUntil(t.dueDate);
  return d !== null && d >= 0 && d <= days;
};

WM.isTaskOverdue = function (t) {
  if (!WM.isActive(t)) return false;
  var d = WM.daysUntil(t.dueDate);
  return d !== null && d < 0;
};

WM.filterTasks = function (tasks, f) {
  var q = (f.q || "").trim().toLowerCase();
  return tasks.filter(function (t) {
    if (q) {
      var hit = [t.title, t.requester, t.siteName, t.clientName, t.confirmationNote, t.memo]
        .some(function (s) { return s && String(s).toLowerCase().indexOf(q) !== -1; });
      if (!hit) return false;
    }
    if (f.status !== "all" && t.status !== f.status) return false;
    if (f.category !== "all" && t.category !== f.category) return false;
    if (f.priority !== "all" && t.priority !== f.priority) return false;
    if (f.doneView === "active" && !WM.isActive(t)) return false;
    if (f.doneView === "done" && t.status !== "done") return false;
    return true;
  });
};

WM.sortTasks = function (tasks, sort) {
  var arr = tasks.slice();
  if (sort === "dueDate") {
    arr.sort(function (a, b) {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0;
    });
  } else if (sort === "priority") {
    arr.sort(function (a, b) { return WM.PRIORITY_WEIGHT[a.priority] - WM.PRIORITY_WEIGHT[b.priority]; });
  } else {
    arr.sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
  }
  return arr;
};

/* ---- 대시보드 통계 ---- */
WM.getTaskStats = function (tasks) {
  var active = tasks.filter(WM.isActive);
  var todayTasks = active.filter(WM.isTaskToday);
  var dueSoon = WM.sortTasks(tasks.filter(function (t) { return WM.isDueWithin(t, 3); }), "dueDate");
  var holdTasks = WM.sortTasks(tasks.filter(function (t) { return t.status === "hold"; }), "dueDate");
  var overdue = WM.sortTasks(tasks.filter(WM.isTaskOverdue), "dueDate");
  var recentDone = tasks.filter(function (t) { return t.status === "done"; })
    .sort(function (a, b) { return (b.completedAt || "") < (a.completedAt || "") ? -1 : 1; })
    .slice(0, 5);

  var byCategory = {}, byStatus = {}, byPriority = {};
  tasks.forEach(function (t) {
    byCategory[t.category] = (byCategory[t.category] || 0) + 1;
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
  });

  var doneCount = tasks.filter(function (t) { return t.status === "done"; }).length;
  var allItems = [], checkedItems = 0;
  tasks.forEach(function (t) {
    (t.checklist || []).forEach(function (c) { allItems.push(c); if (c.checked) checkedItems++; });
  });

  return {
    total: tasks.length,
    today: todayTasks.length,
    inProgress: tasks.filter(function (t) { return t.status === "inProgress"; }).length,
    hold: holdTasks.length,
    weekDue: tasks.filter(function (t) { return WM.isDueWithin(t, 7); }).length,
    todayTasks: todayTasks, dueSoon: dueSoon, holdTasks: holdTasks,
    overdue: overdue, recentDone: recentDone,
    completionRate: tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0,
    checklistRate: allItems.length ? Math.round((checkedItems / allItems.length) * 100) : 0,
    byCategory: byCategory, byStatus: byStatus, byPriority: byPriority
  };
};

/* ---- import 데이터 검증 ---- */
var CATEGORIES = ["accounting","bid","contract","guarantee","certificate","document","communication","etc"];
var STATUSES = ["todo","inProgress","hold","done","cancelled"];
var PRIORITIES = ["urgent","high","normal","low"];

WM.validateImportedTasks = function (data) {
  if (!Array.isArray(data)) return null;
  var result = [];
  for (var i = 0; i < data.length; i++) {
    var t = data[i];
    if (!t || typeof t !== "object") return null;
    if (typeof t.id !== "string" || typeof t.title !== "string") return null;
    if (CATEGORIES.indexOf(t.category) === -1) return null;
    if (STATUSES.indexOf(t.status) === -1) return null;
    if (PRIORITIES.indexOf(t.priority) === -1) return null;
    var checklist = Array.isArray(t.checklist) ? t.checklist.filter(function (c) {
      return c && typeof c.id === "string" && typeof c.label === "string" && typeof c.checked === "boolean";
    }) : [];
    var copy = Object.assign({}, t, {
      checklist: checklist,
      createdAt: typeof t.createdAt === "string" ? t.createdAt : new Date().toISOString(),
      updatedAt: typeof t.updatedAt === "string" ? t.updatedAt : new Date().toISOString()
    });
    result.push(copy);
  }
  return result;
};

/* ---- 샘플 데이터 (전부 가상) ---- */
function fromTemplate(category, take, checkedCount) {
  var tpl = WM.getTemplateByCategory(category);
  var labels = tpl ? tpl.items.slice(0, take) : [];
  return labels.map(function (label, i) {
    return { id: WM.uid(), label: label, checked: i < (checkedCount || 0) };
  });
}

WM.createSampleTasks = function () {
  var now = new Date().toISOString();
  return [
    { id: WM.uid(), title: "래미안베라힐즈 입찰하기", category: "bid", status: "inProgress", priority: "high",
      siteName: "래미안베라힐즈", requester: "김용준 부장님", dueDate: WM.addDays(1),
      memo: "나라장터 공고 기준. 현장설명회 참석 여부 확인 필요.",
      checklist: fromTemplate("bid", 7, 3), attachments: [], createdAt: now, updatedAt: now },
    { id: WM.uid(), title: "신촌산수빌 중도금 계산서 발행", category: "accounting", status: "todo", priority: "urgent",
      siteName: "신촌산수빌", amount: 2000000, dueDate: WM.todayStr(),
      checklist: fromTemplate("accounting", 6, 0), attachments: [], createdAt: now, updatedAt: now },
    { id: WM.uid(), title: "한체대 계약보증서 메일 송부", category: "guarantee", status: "hold", priority: "normal",
      siteName: "한체대", confirmationNote: "담당자 회신 대기", dueDate: WM.addDays(3),
      checklist: fromTemplate("guarantee", 6, 4), attachments: [], createdAt: now, updatedAt: now },
    { id: WM.uid(), title: "춘천산수빌 계약금 필요서류 송부", category: "certificate", status: "inProgress", priority: "high",
      siteName: "춘천산수빌", dueDate: WM.addDays(3),
      checklist: fromTemplate("certificate", 6, 2), attachments: [], createdAt: now, updatedAt: now },
    { id: WM.uid(), title: "금당중흥 시방서 PDF 정리", category: "document", status: "todo", priority: "normal",
      siteName: "금당중흥", dueDate: WM.addDays(5),
      checklist: fromTemplate("document", 5, 0), attachments: [], createdAt: now, updatedAt: now },
    { id: WM.uid(), title: "석호가람휘 계약서 초안 작성", category: "contract", status: "inProgress", priority: "high",
      siteName: "석호가람휘", dueDate: WM.addDays(4),
      checklist: fromTemplate("contract", 7, 2), attachments: [], createdAt: now, updatedAt: now },
    { id: WM.uid(), title: "관리사무소 계약 일정 확인", category: "communication", status: "hold", priority: "normal",
      confirmationNote: "관리사무소 회신 대기", dueDate: WM.addDays(2),
      checklist: fromTemplate("communication", 5, 3), attachments: [], createdAt: now, updatedAt: now }
  ];
};
