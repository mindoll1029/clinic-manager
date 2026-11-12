/*
 * 여러 기기 실시간 공유 설정 (Supabase)
 *
 * 두 값을 채우면 태블릿·PC 등 모든 기기가 같은 현황을 봅니다.
 * 비워 두면 이 브라우저 안에서만 동작합니다 (같은 브라우저의 탭끼리만 공유).
 *
 * 값은 Supabase 프로젝트의 Project Settings → API (또는 Connect)에서 복사합니다.
 * anon(public)·publishable 키는 웹페이지에 넣도록 만들어진 공개용 키입니다.
 * service_role·secret 키는 절대 넣지 마세요.
 */
window.CLINIC_CONFIG = {
  supabaseUrl: 'https://pmpfuzgywwktlbekrrep.supabase.co',   // 예: https://abcdefghijkl.supabase.co (/rest/v1 은 빼고)
  supabaseKey: 'sb_publishable_VzigQARWnzh8G6JtwWiDVA_1aVvOsrk',   // anon public 키(eyJ…) 또는 publishable 키(sb_publishable_…)
  room: 'demo',      // 같은 room 이름을 쓰는 기기끼리 같은 현황을 봅니다
};
