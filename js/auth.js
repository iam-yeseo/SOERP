/* ===== 인증 (login.html 전용) =====
   회원가입 / 로그인 / 세션 확인 + 페이지 UI 바인딩 */

async function signUp(email, password) {
  return supabaseClient.auth.signUp({ email: email, password: password });
}

async function signIn(email, password) {
  return supabaseClient.auth.signInWithPassword({ email: email, password: password });
}

async function signOut() {
  return supabaseClient.auth.signOut();
}

async function getCurrentSession() {
  var res = await supabaseClient.auth.getSession();
  return res.data ? res.data.session : null;
}

async function getCurrentUser() {
  var session = await getCurrentSession();
  return session ? session.user : null;
}

/** 이미 로그인되어 있으면 메인 페이지로 이동 */
async function checkAlreadyLoggedIn() {
  try {
    var session = await getCurrentSession();
    if (session) location.replace("index.html");
  } catch (e) {
    console.error("세션 확인 실패", e);
  }
}

/* ---- 페이지 바인딩 ---- */
(function () {
  var form = document.getElementById("login-form");
  if (!form) return;

  var emailEl = document.getElementById("login-email");
  var pwEl = document.getElementById("login-password");
  var msgEl = document.getElementById("auth-message");
  var btnIn = document.getElementById("btn-signin");
  var btnUp = document.getElementById("btn-signup");

  function showMessage(text, type) {
    msgEl.textContent = text;
    msgEl.className = "auth-msg " + (type === "error" ? "error" : "ok");
    msgEl.style.display = "block";
  }

  function setBusy(busy) {
    btnIn.disabled = busy;
    btnUp.disabled = busy;
  }

  /** Supabase 에러를 한국어 안내로 변환 */
  function friendlyError(error) {
    var m = (error && error.message || "").toLowerCase();
    if (m.indexOf("invalid login credentials") !== -1) return "이메일 또는 비밀번호가 올바르지 않습니다.";
    if (m.indexOf("email not confirmed") !== -1) return "이메일 인증이 완료되지 않았습니다. 메일함에서 인증 링크를 확인해주세요.";
    if (m.indexOf("already registered") !== -1) return "이미 가입된 이메일입니다. 로그인을 이용해주세요.";
    if (m.indexOf("at least 6") !== -1 || m.indexOf("password") !== -1) return "비밀번호는 6자 이상이어야 합니다.";
    if (m.indexOf("rate limit") !== -1) return "시도가 너무 많습니다. 잠시 후 다시 시도해주세요.";
    if (m.indexOf("fetch") !== -1 || m.indexOf("network") !== -1) return "네트워크 연결을 확인해주세요.";
    return "요청에 실패했습니다: " + (error && error.message ? error.message : "알 수 없는 오류");
  }

  function getInputs() {
    var email = emailEl.value.trim();
    var pw = pwEl.value;
    if (!email || !pw) {
      showMessage("이메일과 비밀번호를 모두 입력해주세요.", "error");
      return null;
    }
    return { email: email, pw: pw };
  }

  // 로그인 (폼 제출)
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    var v = getInputs();
    if (!v) return;
    setBusy(true);
    btnIn.textContent = "로그인 중...";
    try {
      var res = await signIn(v.email, v.pw);
      if (res.error) {
        showMessage(friendlyError(res.error), "error");
        console.error("로그인 실패", res.error);
      } else {
        showMessage("로그인 성공! 이동 중입니다...", "ok");
        location.replace("index.html");
        return;
      }
    } catch (err) {
      console.error("로그인 오류", err);
      showMessage("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.", "error");
    }
    setBusy(false);
    btnIn.textContent = "로그인";
  });

  // 회원가입
  btnUp.addEventListener("click", async function () {
    var v = getInputs();
    if (!v) return;
    if (v.pw.length < 6) {
      showMessage("비밀번호는 6자 이상이어야 합니다.", "error");
      return;
    }
    setBusy(true);
    btnUp.textContent = "가입 중...";
    try {
      var res = await signUp(v.email, v.pw);
      if (res.error) {
        showMessage(friendlyError(res.error), "error");
        console.error("회원가입 실패", res.error);
      } else if (res.data && res.data.session) {
        // 이메일 인증이 꺼져 있으면 바로 로그인됨
        showMessage("회원가입 완료! 이동 중입니다...", "ok");
        location.replace("index.html");
        return;
      } else {
        showMessage("회원가입 요청이 완료되었습니다. 인증 메일이 발송된 경우 메일함에서 인증 후 로그인해주세요.", "ok");
      }
    } catch (err) {
      console.error("회원가입 오류", err);
      showMessage("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.", "error");
    }
    setBusy(false);
    btnUp.textContent = "회원가입";
  });

  // 이미 로그인된 사용자는 메인으로
  checkAlreadyLoggedIn();
})();
