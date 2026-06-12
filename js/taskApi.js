/* ===== Supabase tasks 테이블 API 레이어 =====
   - DB 컬럼은 snake_case, 프론트엔드 객체는 camelCase → 반드시 변환을 거칩니다.
   - 댓글형 메모(comments 배열)는 DB의 memo(text) 컬럼에 JSON 문자열로 저장합니다.
     (구버전의 일반 텍스트 memo는 읽을 때 자동으로 댓글 1건으로 변환됩니다)
   - RLS가 적용되어 있어 로그인한 사용자는 자기 데이터만 조회/변경할 수 있습니다. */
window.WM = window.WM || {};

(function () {
  var TABLE = "tasks";

  function isBlank(v) {
    return v === undefined || v === null || (typeof v === "string" && !v.trim());
  }

  /* ---- comments ↔ memo(text) 변환 ---- */
  function commentsToMemo(comments) {
    if (!Array.isArray(comments) || !comments.length) return null;
    return JSON.stringify(comments);
  }

  function memoToComments(memo, fallbackAt) {
    if (!memo) return [];
    try {
      var parsed = JSON.parse(memo);
      if (Array.isArray(parsed)) {
        return parsed.filter(function (c) { return c && typeof c.text === "string"; }).map(function (c) {
          return {
            id: typeof c.id === "string" ? c.id : WM.uid(),
            text: c.text,
            createdAt: typeof c.createdAt === "string" ? c.createdAt : fallbackAt
          };
        });
      }
    } catch (e) { /* 일반 텍스트 메모(구버전) → 아래에서 댓글 1건으로 변환 */ }
    return [{ id: WM.uid(), text: String(memo), createdAt: fallbackAt }];
  }

  /* ---- DB row → 프론트엔드 Task ---- */
  function mapDbTaskToTask(r) {
    var t = {
      id: r.id,
      title: r.title,
      category: r.category,
      status: r.status,
      priority: r.priority,
      checklist: Array.isArray(r.checklist) ? r.checklist : [],
      attachments: Array.isArray(r.attachments) ? r.attachments : [],
      comments: memoToComments(r.memo, r.updated_at || r.created_at || new Date().toISOString()),
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
    if (!isBlank(r.requester)) t.requester = r.requester;
    if (!isBlank(r.site_name)) t.siteName = r.site_name;
    if (!isBlank(r.client_name)) t.clientName = r.client_name;
    if (r.amount !== null && r.amount !== undefined) t.amount = Number(r.amount);
    if (!isBlank(r.task_date)) t.date = r.task_date;
    if (!isBlank(r.due_date)) t.dueDate = r.due_date;
    if (!isBlank(r.completed_at)) t.completedAt = r.completed_at;
    if (!isBlank(r.confirmation_note)) t.confirmationNote = r.confirmation_note;
    return t;
  }

  /* ---- camelCase → snake_case 매핑 ---- */
  var FIELD_MAP = {
    title: "title", category: "category", status: "status", priority: "priority",
    requester: "requester", siteName: "site_name", clientName: "client_name",
    amount: "amount", date: "task_date", dueDate: "due_date",
    completedAt: "completed_at", confirmationNote: "confirmation_note",
    checklist: "checklist", attachments: "attachments"
  };
  var DATE_COLS = { task_date: 1, due_date: 1, completed_at: 1 };

  /** 부분 업데이트: updates에 존재하는 키만 변환. undefined/빈 문자열 → null(비우기) */
  function mapPatchToDb(updates) {
    var row = {};
    Object.keys(FIELD_MAP).forEach(function (k) {
      if (k in updates) {
        var v = updates[k];
        if (v === undefined || (typeof v === "string" && !v.trim())) v = null;
        var col = FIELD_MAP[k];
        if (v != null && DATE_COLS[col]) v = String(v).slice(0, 10); // date 컬럼은 YYYY-MM-DD
        row[col] = v;
      }
    });
    if ("comments" in updates) row.memo = commentsToMemo(updates.comments);
    row.updated_at = new Date().toISOString();
    return row;
  }

  /** insert용: Task 전체 → DB row (user_id는 반드시 로그인한 사용자 id) */
  function mapTaskToDbTask(task, userId) {
    var row = mapPatchToDb(task);
    row.user_id = userId;
    if (!("checklist" in row) || row.checklist == null) row.checklist = [];
    if (!("attachments" in row) || row.attachments == null) row.attachments = [];
    return row;
  }

  /* ---- 현재 사용자 ---- */
  async function getCurrentUserOrThrow() {
    if (window.currentUser) return window.currentUser;
    var res = await supabaseClient.auth.getUser();
    if (res.error || !res.data || !res.data.user) throw new Error("로그인이 필요합니다.");
    window.currentUser = res.data.user;
    return res.data.user;
  }

  /* ---- CRUD ---- */
  WM.api = {
    mapDbTaskToTask: mapDbTaskToTask,
    mapTaskToDbTask: mapTaskToDbTask,
    getCurrentUserOrThrow: getCurrentUserOrThrow,

    /** 내 업무 전체 (created_at 최신순) */
    getTasks: async function () {
      var res = await supabaseClient.from(TABLE).select("*")
        .order("created_at", { ascending: false });
      if (res.error) throw res.error;
      return (res.data || []).map(mapDbTaskToTask);
    },

    createTask: async function (task) {
      var user = await getCurrentUserOrThrow();
      var res = await supabaseClient.from(TABLE)
        .insert(mapTaskToDbTask(task, user.id)).select().single();
      if (res.error) throw res.error;
      return mapDbTaskToTask(res.data);
    },

    updateTask: async function (id, updates) {
      var row = mapPatchToDb(updates);
      delete row.user_id; // user_id는 절대 변경하지 않음
      var res = await supabaseClient.from(TABLE)
        .update(row).eq("id", id).select().single();
      if (res.error) throw res.error;
      return mapDbTaskToTask(res.data);
    },

    deleteTask: async function (id) {
      var res = await supabaseClient.from(TABLE).delete().eq("id", id);
      if (res.error) throw res.error;
    },

    completeTask: async function (id) {
      return WM.api.updateTask(id, { status: "done", completedAt: WM.todayStr() });
    },

    updateTaskChecklist: async function (id, checklist) {
      return WM.api.updateTask(id, { checklist: checklist });
    },

    /** 내 업무 전체 삭제 (초기화/가져오기 덮어쓰기용) */
    deleteAllTasks: async function () {
      var user = await getCurrentUserOrThrow();
      var res = await supabaseClient.from(TABLE).delete().eq("user_id", user.id);
      if (res.error) throw res.error;
    },

    /** 여러 건 일괄 등록 (샘플 생성, JSON 가져오기용) — 원본 생성/수정일 유지 */
    bulkInsertTasks: async function (tasks) {
      if (!tasks.length) return [];
      var user = await getCurrentUserOrThrow();
      var rows = tasks.map(function (t) {
        var row = mapTaskToDbTask(t, user.id);
        if (typeof t.createdAt === "string") row.created_at = t.createdAt;
        if (typeof t.updatedAt === "string") row.updated_at = t.updatedAt;
        return row;
      });
      var res = await supabaseClient.from(TABLE).insert(rows).select();
      if (res.error) throw res.error;
      return (res.data || []).map(mapDbTaskToTask);
    }
  };
})();
