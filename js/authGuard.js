/* ===== 로그인 보호 (메인 페이지 전용) =====
   - 세션이 없으면 login.html로 이동시킵니다.
   - 세션이 있으면 window.currentUser에 사용자 정보를 저장합니다.
   - 앱 초기화(app.js)는 WM.authReady가 resolve된 후 진행됩니다. */
window.WM = window.WM || {};

WM.authReady = (async function () {
  try {
    var res = await supabaseClient.auth.getSession();
    var session = res.data ? res.data.session : null;
    if (!session) {
      location.replace("login.html");
      return new Promise(function () {}); // 이동 중 — 영원히 대기
    }
    window.currentUser = session.user;

    // 다른 탭 등에서 로그아웃되면 로그인 페이지로
    supabaseClient.auth.onAuthStateChange(function (event) {
      if (event === "SIGNED_OUT") location.replace("login.html");
    });

    return session.user;
  } catch (e) {
    console.error("세션 확인에 실패했습니다.", e);
    location.replace("login.html");
    return new Promise(function () {});
  }
})();
