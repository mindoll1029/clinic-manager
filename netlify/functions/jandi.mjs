// 잔디(JANDI) Incoming Webhook으로 메시지를 보내는 Netlify 서버 함수.
// 웹페이지는 잔디 주소로 바로 보낼 수 없어서(브라우저 보안 규칙) 이 함수를 거친다.
// 같은 사이트(Netlify)에서만 부른다. 잔디 웹훅 주소가 아닌 곳으로는 보내지 않는다.
//
// 요청: POST /.netlify/functions/jandi
//   { url: 'https://wh.jandi.com/connect-api/webhook/…', body: '본문', info: [{ title, description }], color: '#C62D24' }
// 응답: { ok: true } 또는 { ok: false, error: '…' }

const JANDI_URL = /^https:\/\/wh\.jandi\.com\/connect-api\/webhook\/\d+\/[0-9A-Za-z]+$/;
const COLOR = /^#[0-9A-Fa-f]{6}$/;

const reply = (status, data) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});
const text = (v, max) => String(v == null ? '' : v).slice(0, max);

export default async (req) => {
  if (req.method !== 'POST') return reply(405, { ok: false, error: 'POST만 받습니다.' });

  let input;
  try { input = await req.json(); } catch (e) { return reply(400, { ok: false, error: '보낸 내용을 읽지 못했습니다.' }); }

  const url = text(input && input.url, 300).trim();
  if (!JANDI_URL.test(url)) return reply(400, { ok: false, error: '잔디 웹훅 주소가 아닙니다.' });
  const body = text(input.body, 1000).trim();
  if (!body) return reply(400, { ok: false, error: '보낼 내용이 없습니다.' });

  const message = { body, connectColor: COLOR.test(input.color || '') ? input.color : '#263035' };
  const info = Array.isArray(input.info) ? input.info.slice(0, 6) : [];
  if (info.length) {
    message.connectInfo = info.map((x) => ({ title: text(x && x.title, 60), description: text(x && x.description, 500) }));
  }

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { Accept: 'application/vnd.tosslab.jandi-v2+json', 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    if (!r.ok) return reply(502, { ok: false, error: '잔디가 메시지를 받지 않았습니다 (응답 ' + r.status + ').' });
    return reply(200, { ok: true });
  } catch (e) {
    return reply(502, { ok: false, error: '잔디에 연결하지 못했습니다.' });
  }
};
