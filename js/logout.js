/* ===== 로그아웃 (메인 페이지) ===== */
(function () {
  var btn = document.getElementById("logout-btn");
  if (!btn) return;
  btn.addEventListener("click", function () {
    btn.disabled = true;
    supabaseClient.auth.signOut().then(function (res) {
      if (res.error) throw res.error;
      location.replace("login.html");
    }).catch(function (e) {
      console.error("로그아웃 실패", e);
      btn.disabled = false;
      if (window.WM && WM.toast) WM.toast("로그아웃에 실패했습니다. 다시 시도해주세요.", "error");
      else alert("로그아웃에 실패했습니다. 다시 시도해주세요.");
    });
  });
})();
