/* ===== Supabase contacts 테이블 + contact-cards Storage API 레이어 (연락처/명함) =====
   - DB 컬럼은 snake_case, 프론트엔드 객체는 camelCase → 변환을 거칩니다.
   - RLS가 적용되어 있어 로그인한 사용자는 자기 데이터만 조회/변경할 수 있습니다.
   - 명함 이미지는 비공개 버킷(contact-cards)에 "userId/파일명" 경로로 저장하고,
     화면에는 서명 URL(signed URL)로 표시합니다. */
window.WM = window.WM || {};

(function () {
  var TABLE = "contacts";
  var BUCKET = "contact-cards";
  var SIGNED_URL_TTL = 60 * 60; // 1시간

  /* ---- DB row → 프론트엔드 Contact ---- */
  function mapDbToContact(r) {
    return {
      id: r.id,
      clientName: r.client_name || "",
      name: r.name || "",
      position: r.position || "",
      phonePersonal: r.phone_personal || "",
      phoneOffice: r.phone_office || "",
      phoneOther: r.phone_other || "",
      siteName: r.site_name || "",
      memo: r.memo || "",
      imagePath: r.image_path || "",
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }

  /* ---- camelCase → snake_case ---- */
  var FIELD_MAP = {
    clientName: "client_name", name: "name", position: "position",
    phonePersonal: "phone_personal", phoneOffice: "phone_office", phoneOther: "phone_other",
    siteName: "site_name", memo: "memo", imagePath: "image_path"
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

  /* ---- CRUD + 이미지 ---- */
  WM.contactApi = {
    getContacts: async function () {
      var res = await supabaseClient.from(TABLE).select("*")
        .order("created_at", { ascending: false });
      if (res.error) throw res.error;
      return (res.data || []).map(mapDbToContact);
    },

    createContact: async function (contact) {
      var user = await getCurrentUserOrThrow();
      var row = mapPatchToDb(contact);
      row.user_id = user.id;
      var res = await supabaseClient.from(TABLE).insert(row).select().single();
      if (res.error) throw res.error;
      return mapDbToContact(res.data);
    },

    updateContact: async function (id, updates) {
      var row = mapPatchToDb(updates);
      delete row.user_id;
      var res = await supabaseClient.from(TABLE)
        .update(row).eq("id", id).select().single();
      if (res.error) throw res.error;
      return mapDbToContact(res.data);
    },

    deleteContact: async function (id) {
      var res = await supabaseClient.from(TABLE).delete().eq("id", id);
      if (res.error) throw res.error;
    },

    /** 명함 이미지 업로드 → Storage 경로 반환 */
    uploadImage: async function (file) {
      var user = await getCurrentUserOrThrow();
      var ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      var path = user.id + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
      var res = await supabaseClient.storage.from(BUCKET)
        .upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
      if (res.error) throw res.error;
      return path;
    },

    /** Storage 이미지 삭제 (실패해도 무시 가능하도록 에러만 로깅) */
    deleteImage: async function (path) {
      if (!path) return;
      var res = await supabaseClient.storage.from(BUCKET).remove([path]);
      if (res.error) console.error("명함 이미지 삭제 실패", res.error);
    },

    /** 표시용 서명 URL 발급 (간단 캐시 포함) */
    getImageUrl: async function (path) {
      if (!path) return null;
      var cache = WM.contactApi._urlCache;
      var hit = cache[path];
      if (hit && hit.expires > Date.now()) return hit.url;
      var res = await supabaseClient.storage.from(BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL);
      if (res.error) throw res.error;
      var url = res.data.signedUrl;
      cache[path] = { url: url, expires: Date.now() + (SIGNED_URL_TTL - 60) * 1000 };
      return url;
    },

    _urlCache: {}
  };
})();
