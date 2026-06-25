/* ===== Supabase b2g_bids 테이블 API 레이어 (나라장터 / B2G 입찰) =====
   - DB 컬럼은 snake_case, 프론트엔드 객체는 camelCase → 변환을 거칩니다.
   - RLS가 적용되어 있어 로그인한 사용자는 자기 데이터만 조회/변경할 수 있습니다.
   - tasks와 완전히 분리된 별도 테이블입니다. */
window.WM = window.WM || {};

(function () {
  var TABLE = "b2g_bids";

  function isBlank(v) {
    return v === undefined || v === null || (typeof v === "string" && !v.trim());
  }

  /* ---- DB row → 프론트엔드 Bid ---- */
  function mapDbToBid(r) {
    var b = {
      id: r.id,
      title: r.title,
      bidDate: r.bid_date || "",
      agency: r.agency || "",
      result: r.result || "",
      followup: r.followup || "",
      note: r.note || "",
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
    b.baseAmount = (r.base_amount !== null && r.base_amount !== undefined) ? Number(r.base_amount) : null;
    b.bidAmount = (r.bid_amount !== null && r.bid_amount !== undefined) ? Number(r.bid_amount) : null;
    b.awardAmount = (r.award_amount !== null && r.award_amount !== undefined) ? Number(r.award_amount) : null;
    return b;
  }

  /* ---- camelCase → snake_case ---- */
  var FIELD_MAP = {
    title: "title", bidDate: "bid_date", agency: "agency",
    baseAmount: "base_amount", bidAmount: "bid_amount", result: "result",
    awardAmount: "award_amount", followup: "followup", note: "note"
  };
  var NUM_COLS = { base_amount: 1, bid_amount: 1, award_amount: 1 };

  function mapPatchToDb(updates) {
    var row = {};
    Object.keys(FIELD_MAP).forEach(function (k) {
      if (k in updates) {
        var v = updates[k];
        var col = FIELD_MAP[k];
        if (NUM_COLS[col]) {
          v = (v === undefined || v === null || v === "") ? null : Number(v);
          if (v != null && isNaN(v)) v = null;
        } else if (typeof v === "string" && !v.trim()) {
          v = null;
        } else if (v === undefined) {
          v = null;
        }
        row[col] = v;
      }
    });
    row.updated_at = new Date().toISOString();
    return row;
  }

  function mapBidToDb(bid, userId) {
    var row = mapPatchToDb(bid);
    row.user_id = userId;
    return row;
  }

  async function getCurrentUserOrThrow() {
    if (window.currentUser) return window.currentUser;
    var res = await supabaseClient.auth.getUser();
    if (res.error || !res.data || !res.data.user) throw new Error("로그인이 필요합니다.");
    window.currentUser = res.data.user;
    return res.data.user;
  }

  /* ---- CRUD ---- */
  WM.b2gApi = {
    getBids: async function () {
      var res = await supabaseClient.from(TABLE).select("*")
        .order("created_at", { ascending: false });
      if (res.error) throw res.error;
      return (res.data || []).map(mapDbToBid);
    },

    createBid: async function (bid) {
      var user = await getCurrentUserOrThrow();
      var res = await supabaseClient.from(TABLE)
        .insert(mapBidToDb(bid, user.id)).select().single();
      if (res.error) throw res.error;
      return mapDbToBid(res.data);
    },

    updateBid: async function (id, updates) {
      var row = mapPatchToDb(updates);
      delete row.user_id;
      var res = await supabaseClient.from(TABLE)
        .update(row).eq("id", id).select().single();
      if (res.error) throw res.error;
      return mapDbToBid(res.data);
    },

    deleteBid: async function (id) {
      var res = await supabaseClient.from(TABLE).delete().eq("id", id);
      if (res.error) throw res.error;
    }
  };
})();
