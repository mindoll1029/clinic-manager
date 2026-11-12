/* 시작점: 로그인 상태와 주소(#/...)에 따라 화면을 연다 */
(function () {
  'use strict';
  const App = window.App;
  const Store = window.Store;
  const AUTH_KEY = 'clinic-manager.auth';
  const TICK_MS = 60 * 1000; // 경과 시간은 60초마다 다시 계산 (PRD F-03)

  const HOME = { admin: '#/admin', nurse: '#/nurse', kiosk: '#/kiosk', support: '#/support' };
  const ALLOWED = {
    admin: ['admin', 'nurse', 'kiosk', 'support'],
    nurse: ['nurse'],
    kiosk: ['kiosk'],
    support: ['support'],
  };
  const TITLES = { login: '로그인', admin: '관리자', nurse: '보건 선생님', kiosk: '학생용 태블릿', support: '학생지원실' };

  // 탭마다 따로 로그인한다. 한 PC에서 여러 화면을 동시에 시험할 수 있다.
  // 계정 이름은 저장된 계정에서 다시 읽는다 (이름이 바뀌어도 로그인한 탭에 바로 반영).
  const Auth = {
    get() {
      let a = null;
      try { a = JSON.parse(sessionStorage.getItem(AUTH_KEY)); } catch (e) { return null; }
      const acc = a && Store.accounts().find((x) => x.id === a.id);
      if (acc) a.name = acc.name;
      return a;
    },
    set(a) { try { sessionStorage.setItem(AUTH_KEY, JSON.stringify(a)); } catch (e) { /* 무시 */ } },
    clear() { try { sessionStorage.removeItem(AUTH_KEY); } catch (e) { /* 무시 */ } },
  };

  const root = document.getElementById('app');
  let screen = null;

  function route() {
    const auth = Auth.get();
    const want = (location.hash.replace(/^#\/?/, '') || '').split('/')[0];
    if (!auth) {
      if (want !== 'login') { location.replace('#/login'); return; }
      return open('login', null);
    }
    if (!want || want === 'login' || !ALLOWED[auth.role].includes(want)) {
      location.replace(HOME[auth.role]);
      return;
    }
    open(want, auth);
  }

  function open(name, auth) {
    if (screen && screen.destroy) screen.destroy();
    document.querySelectorAll('dialog[open]').forEach((d) => d.close());
    document.body.dataset.screen = name;
    document.title = TITLES[name] + ' · 보건실 침대 현황';
    const ctx = {
      auth,
      signIn(acc) { Auth.set(acc); location.hash = HOME[acc.role]; },
      logout() { Auth.clear(); location.hash = '#/login'; },
    };
    // 화면마다 새 그릇을 만든다. 이전 화면의 이벤트 처리기는 그릇과 함께 사라진다.
    const host = document.createElement('div');
    host.className = 'screen-host';
    root.replaceChildren(host);
    if (name === 'login') screen = App.screenLogin(host, ctx);
    else if (name === 'nurse') screen = App.screenNurse(host, ctx);
    else if (name === 'support') screen = App.screenSupport(host, ctx);
    else if (name === 'admin') screen = App.screenAdmin(host, ctx);
    else if (name === 'kiosk') screen = App.mountKiosk(host, ctx);
    paintLive();
  }

  // 연결 상태. 원격 모드(Supabase)는 서버 연결을, 로컬 모드는 인터넷 연결을 보여 준다.
  function paintLive() {
    const c = Store.connection();
    const on = c.mode === 'remote' ? c.status === 'online' : navigator.onLine !== false;
    document.body.classList.toggle('is-offline', !on);
    document.querySelectorAll('[data-live]').forEach((el) => {
      el.dataset.state = on ? 'on' : 'off';
      el.innerHTML = '<i aria-hidden="true"></i><span>' + (on ? '연결됨' : c.status === 'connecting' ? '연결 중' : '연결 끊김') + '</span>';
      el.title = !on ? '연결 끊김: 다시 연결될 때까지 등록할 수 없습니다'
        : c.mode === 'remote' ? '실시간 연결됨: 다른 기기의 변경이 바로 반영됩니다'
        : '이 브라우저 안의 다른 탭과만 공유됩니다';
    });
    document.querySelectorAll('.scanbar button').forEach((b) => { b.disabled = !on; });
    document.querySelectorAll('[data-act=register]').forEach((b) => { if (!on) b.disabled = true; });
  }
  window.addEventListener('online', () => { paintLive(); if (screen && screen.refresh) screen.refresh(); });
  window.addEventListener('offline', paintLive);

  function start() {
    Store.subscribe((src) => {
      if (src === 'status') { paintLive(); return; }
      if (screen && screen.refresh) screen.refresh();
    });
    Store.onNotice((n) => { App.sound.error(); App.toast(n.message, 'error'); });
    // 분이 바뀌는 순간에 맞춰 다시 그린다. 정각이 되자마자 빨간색으로 바뀌게 한다.
    const tick = () => { if (screen && screen.tick) screen.tick(); };
    setTimeout(() => { tick(); setInterval(tick, TICK_MS); }, TICK_MS - (Date.now() % TICK_MS) + 50);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && screen && screen.refresh) screen.refresh(); });
    window.addEventListener('hashchange', route);
    route();
  }

  function bootError(err) {
    console.error(err);
    root.innerHTML = '<main class="boot"><h1>서버에 연결하지 못했습니다</h1>' +
      '<p>인터넷 연결과 js/config.js의 Supabase 주소·키를 확인해 주세요.</p>' +
      '<p class="boot-detail">' + App.esc(err && err.message ? err.message : String(err)) + '</p>' +
      '<button type="button" class="btn btn-primary btn-lg" onclick="location.reload()">다시 시도</button></main>';
  }

  // 원격 모드는 서버에서 데이터를 받은 뒤에 화면을 연다
  if (Store.connection().mode === 'remote') root.innerHTML = '<main class="boot"><p>서버에 연결하는 중…</p></main>';
  Store.ready().then(start, bootError);
})();
