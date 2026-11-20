// 구글 시트(Apps Script 웹 앱)로 연장 기록을 보내는 Netlify 서버 함수.
// 웹페이지에서 Apps Script로 바로 보내면 결과(성공·실패)를 읽을 수 없어서 이 함수를 거친다.
// Apps Script 웹 앱 주소(script.google.com/…/exec)가 아닌 곳으로는 보내지 않는다.
//
// 요청: POST /.netlify/functions/sheet   { url: 'https://script.google.com/macros/s/…/exec', data: { type: 'extend' | 'test', row } }
// 응답: { ok: true, sheet: '시트 이름', duplicate: false } 또는 { ok: false, error: '…' }

const SHEET_URL = /^https:\/\/script\.google\.com\/(?:a\/macros\/[^/\s]+|macros)\/s\/[A-Za-z0-9_-]+\/exec$/;

const reply = (status, data) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

export default async (req) => {
  if (req.method !== 'POST') return reply(405, { ok: false, error: 'POST만 받습니다.' });

  let input;
  try { input = await req.json(); } catch (e) { return reply(400, { ok: false, error: '보낸 내용을 읽지 못했습니다.' }); }

  const url = String((input && input.url) || '').trim();
  if (!SHEET_URL.test(url)) return reply(400, { ok: false, error: 'Apps Script 웹 앱 주소가 아닙니다.' });
  const data = input.data && typeof input.data === 'object' ? input.data : null;
  if (!data || (data.type !== 'extend' && data.type !== 'test')) return reply(400, { ok: false, error: '보낼 내용이 없습니다.' });
  const body = JSON.stringify(data);
  if (body.length > 5000) return reply(400, { ok: false, error: '보낼 내용이 너무 깁니다.' });

  let r, text;
  try {
    // Apps Script는 POST를 받은 뒤 결과 주소로 넘긴다(302). fetch가 따라가서 결과를 읽는다.
    r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body, redirect: 'follow' });
    text = await r.text();
  } catch (e) {
    return reply(502, { ok: false, error: '구글 시트에 연결하지 못했습니다.' });
  }
  let j = null;
  try { j = JSON.parse(text); } catch (e) { /* 로그인 화면 같은 HTML이 오면 권한 문제 */ }
  if (!r.ok || !j) {
    return reply(502, { ok: false, error: '구글 시트가 응답하지 않았습니다 (응답 ' + r.status + '). 웹 앱으로 배포했는지, 액세스 권한이 "모든 사용자"인지 확인해 주세요.' });
  }
  if (!j.ok) return reply(502, { ok: false, error: '구글 시트에서 오류가 났습니다: ' + String(j.error || '').slice(0, 200) });
  return reply(200, { ok: true, sheet: j.sheet ? String(j.sheet).slice(0, 100) : null, duplicate: !!j.duplicate });
};
