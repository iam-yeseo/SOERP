/* ===== Supabase 클라이언트 =====
   - 이 파일보다 먼저 Supabase CDN(<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2">)이 로드되어야 합니다.
   - 프론트엔드에는 반드시 publishable key만 사용하세요.
   - service_role key / secret key는 절대 이 파일(또는 프론트엔드 코드 어디에도) 넣지 마세요!
   - URL/key를 바꾸려면 아래 두 상수만 수정하면 됩니다. */

var SUPABASE_URL = "https://egzlsmgcxbssoczacxwa.supabase.co";
var SUPABASE_PUBLISHABLE_KEY = "sb_publishable_9JEQGOLry_MFuNQWdTRDRA_4eyKLDMq";

var supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
