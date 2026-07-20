/* ===== 아카이브 API 레이어 (archives 테이블 + archive-files Storage + 카테고리 설정) =====
   - DB 컬럼은 snake_case, 프론트엔드 객체는 camelCase → 변환을 거칩니다.
   - RLS가 적용되어 있어 로그인한 사용자는 자기 데이터만 조회/변경할 수 있습니다.
   - 이미지는 비공개 버킷(archive-files)에 "userId/파일명" 경로로 저장하고,
     화면에는 서명 URL(signed URL)로 표시합니다. (jpg/png/gif, 10MB 이하) */
window.WM = window.WM || {};

(function () {
  var TABLE = "archives";
  var SETTINGS_TABLE = "archive_settings";
  var BUCKET = "archive-files";
  var SIGNED_URL_TTL = 60 * 60; // 1시간

  WM.ARCHIVE_DEFAULT_CATEGORIES = ["일반", "업무", "서류", "기타"];
  WM.ARCHIVE_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  WM.ARCHIVE_ALLOWED_TYPES = { "image/jpeg": 1, "image/png": 1, "image/gif": 1 };

  /* ---- DB row → 프론트엔드 Archive ---- */
  function mapDbToArchive(r) {
    return {
      id: r.id,
      title: r.title || "",
      category: r.category || "일반",
      content: r.content || "",
      imagePath: r.image_path || "",
      imageName: r.image_name || "",
      imageSize: r.image_size != null ? Number(r.image_size) : null,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }

  /* ---- camelCase → snake_case ---- */
  var FIELD_MAP = {
    title: "title", category: "category", content: "content",
    imagePath: "image_path", imageName: "image_name", imageSize: "image_size"
  };

  function mapPatchToDb(updates) {
    var row = {};
    Object.keys(FIELD_MAP).forEach(function (k) {
      if (k in updates) {
        var v = updates[k];
        if (typeof v === "string" && !v.trim()) v = null;
        else if (v === undefined) v = null;
        row[FIELD_MAP[k]] = v;
      }
    });
    row.updated_at = new Date().toISOString();
    return row;
  }

  async function getCurrentUserOrThrow() {
    if (window.currentUser) return window.currentUser;
    var res = await supabaseClient.auth.getUser();
    if (res.error || !res.data || !res.data.user) throw new Error("로그인이 필요합니다.");
    window.currentUser = res.data.user;
    return res.data.user;
  }

  WM.archiveApi = {
    /* ---- CRUD ---- */
    getArchives: async function () {
      var res = await supabaseClient.from(TABLE).select("*")
        .order("created_at", { ascending: false });
      if (res.error) throw res.error;
      return (res.data || []).map(mapDbToArchive);
    },

    createArchive: async function (archive) {
      var user = await getCurrentUserOrThrow();
      var row = mapPatchToDb(archive);
      row.user_id = user.id;
      var res = await supabaseClient.from(TABLE).insert(row).select().single();
      if (res.error) throw res.error;
      return mapDbToArchive(res.data);
    },

    updateArchive: async function (id, updates) {
      var row = mapPatchToDb(updates);
      delete row.user_id;
      var res = await supabaseClient.from(TABLE)
        .update(row).eq("id", id).select().single();
      if (res.error) throw res.error;
      return mapDbToArchive(res.data);
    },

    deleteArchive: async function (id) {
      var res = await supabaseClient.from(TABLE).delete().eq("id", id);
      if (res.error) throw res.error;
    },

    /* ---- 파일 (이미지) ---- */
    /** 업로드 전 검증: 오류 메시지 반환, 정상이면 null */
    validateFile: function (file) {
      if (!WM.ARCHIVE_ALLOWED_TYPES[file.type]) return "JPG·PNG·GIF 이미지만 업로드할 수 있습니다.";
      if (file.size > WM.ARCHIVE_MAX_FILE_SIZE) return "이미지는 10MB 이하만 업로드할 수 있습니다.";
      return null;
    },

    /** 이미지 업로드 → Storage 경로 반환 */
    uploadFile: async function (file) {
      var user = await getCurrentUserOrThrow();
      var ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      var path = user.id + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
      var res = await supabaseClient.storage.from(BUCKET)
        .upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
      if (res.error) throw res.error;
      return path;
    },

    /** Storage 이미지 삭제 (실패해도 무시 가능하도록 에러만 로깅) */
    deleteFile: async function (path) {
      if (!path) return;
      var res = await supabaseClient.storage.from(BUCKET).remove([path]);
      if (res.error) console.error("아카이브 이미지 삭제 실패", res.error);
    },

    /** 표시용 서명 URL 발급 (간단 캐시 포함) */
    getFileUrl: async function (path) {
      if (!path) return null;
      var cache = WM.archiveApi._urlCache;
      var hit = cache[path];
      if (hit && hit.expires > Date.now()) return hit.url;
      var res = await supabaseClient.storage.from(BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL);
      if (res.error) throw res.error;
      var url = res.data.signedUrl;
      cache[path] = { url: url, expires: Date.now() + (SIGNED_URL_TTL - 60) * 1000 };
      return url;
    },

    /** 원본 파일명으로 다운로드 */
    downloadFile: async function (path, filename) {
      var res = await supabaseClient.storage.from(BUCKET).download(path);
      if (res.error) throw res.error;
      var url = URL.createObjectURL(res.data);
      var a = document.createElement("a");
      a.href = url;
      a.download = filename || (path.split("/").pop() || "archive-image");
      a.click();
      URL.revokeObjectURL(url);
    },

    /* ---- 카테고리 설정 (서버 동기화) ---- */
    getCategories: async function () {
      var res = await supabaseClient.from(SETTINGS_TABLE).select("categories").maybeSingle();
      if (res.error) throw res.error;
      if (res.data && Array.isArray(res.data.categories) && res.data.categories.length) {
        return res.data.categories.map(String);
      }
      return WM.ARCHIVE_DEFAULT_CATEGORIES.slice();
    },

    saveCategories: async function (categories) {
      if (!Array.isArray(categories) || !categories.length) {
        throw new Error("카테고리는 최소 1개 이상 있어야 합니다.");
      }
      var user = await getCurrentUserOrThrow();
      var res = await supabaseClient.from(SETTINGS_TABLE)
        .upsert({ user_id: user.id, categories: categories, updated_at: new Date().toISOString() })
        .select().single();
      if (res.error) throw res.error;
      return res.data.categories;
    },

    _urlCache: {}
  };
})();
