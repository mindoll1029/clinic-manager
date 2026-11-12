/* 화면: 로그인, 보건 선생님, 학생지원실, 관리자 */
(function () {
  'use strict';
  const App = window.App;
  const { esc, $ } = App;
  const Store = window.Store;

  // ── 로그인 ─────────────────────────────────────────────────
  function login(root, ctx) {
    root.innerHTML =
      '<main class="login">' +
        '<section class="login-card" aria-labelledby="login-title">' +
          '<div class="login-mark" aria-hidden="true">' + window.icon('bed') + '</div>' +
          '<h1 id="login-title">보건실 침대 현황</h1>' +
          '<p class="login-sub">아이디에 따라 보건 선생님, 학생 태블릿, 학생지원실, 관리자 화면이 열립니다.</p>' +
          '<form class="login-form" novalidate>' +
            '<label class="field"><span>아이디</span><input name="id" autocomplete="username" autocapitalize="off" spellcheck="false" required autofocus></label>' +
            '<label class="field"><span>비밀번호</span><input name="pw" type="password" autocomplete="current-password" required></label>' +
            '<p class="field-error" role="alert" hidden></p>' +
            '<button class="btn btn-primary btn-lg btn-block">로그인</button>' +
          '</form>' +
          '<details class="login-demo"><summary>' + window.icon('chevron') + '시제품 계정 보기</summary>' +
            '<table class="table table-compact"><thead><tr><th>아이디</th><th>비밀번호</th><th>열리는 화면</th></tr></thead><tbody>' +
            [['admin', 'admin1234', '관리자 (모든 화면)'], ['nurse', 'nurse1234', '보건 선생님'], ['kiosk-nurse-room', 'kiosk1234', '학생 태블릿'], ['support-office', 'support1234', '학생지원실']]
              .map((r) => '<tr><td class="num"><button type="button" class="link" data-fill="' + r[0] + '|' + r[1] + '">' + r[0] + '</button></td><td class="num">' + r[1] + '</td><td>' + r[2] + '</td></tr>').join('') +
            '</tbody></table><p class="panel-note">관리번호(연장용)는 2580입니다. 설정에서 바꿀 수 있습니다.</p></details>' +
        '</section>' +
      '</main>';
    const form = root.querySelector('form');
    const err = root.querySelector('.field-error');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      try {
        const acc = Store.login(form.id.value, form.pw.value);
        ctx.signIn(acc);
      } catch (ex) {
        err.hidden = false;
        err.textContent = ex.message;
        form.pw.select();
      }
    });
    root.addEventListener('click', (e) => {
      const f = e.target.closest('[data-fill]');
      if (!f) return;
      const [id, pw] = f.dataset.fill.split('|');
      form.id.value = id; form.pw.value = pw;
      form.querySelector('button').focus();
    });
    return {};
  }

  // 초과 알림음 설정은 화면마다 따로 둔다 (보건 선생님 화면을 꺼도 학생지원실은 울리게 할 수 있다)
  const SOUND_KEY = { nurse: 'alertSound', support: 'alertSoundSupport' };

  // ── 직원 화면 공통 껍데기 ──────────────────────────────────
  // cfg: { role, title, tabs: [{id,label,icon}], scan: bool, onTab(id, container) }
  function staffShell(root, ctx, cfg) {
    const soundKey = SOUND_KEY[cfg.role];
    const auth = ctx.auth;
    const adminBar = auth.role === 'admin' && cfg.role !== 'admin'
      ? '<div class="admin-bar">' + window.icon('users') + '<span>관리자로 <b>' + esc(cfg.title) + '</b>을 보는 중</span><a href="#/admin" class="link">관리자 화면으로</a></div>'
      : '';
    root.innerHTML =
      '<div class="shell" data-role="' + cfg.role + '">' + adminBar +
        '<header class="topbar">' +
          '<div class="tb-left">' +
            '<div class="brand">' + window.icon('bed') + '<span class="brand-text"><b>보건실 침대 현황</b>' + (cfg.place ? '<small>' + esc(cfg.place) + '</small>' : '') + '</span></div>' +
            '<p class="free" aria-live="polite"></p>' +
            '<p class="live" data-live></p>' +
            (cfg.scan ? '<form class="scanbar" autocomplete="off"><label class="sr" for="scan">학번</label>' + window.icon('scan') +
              '<input id="scan" name="no" inputmode="numeric" placeholder="학번 스캔 또는 입력" maxlength="12">' +
              '<button class="btn btn-primary">등록</button></form>' : '') +
          '</div>' +
          '<nav class="tb-right" aria-label="화면 메뉴">' +
            '<div class="tabs" role="tablist">' + cfg.tabs.map((t, i) =>
              '<button type="button" role="tab" class="tab" data-tab="' + t.id + '" aria-selected="' + (i === 0) + '">' + window.icon(t.icon) + '<span>' + esc(t.label) + '</span></button>').join('') + '</div>' +
            (soundKey ? '<button type="button" class="icon-btn btn-ghost" data-sound aria-pressed="false"></button>' : '') +
            '<button type="button" class="account" data-account>' + window.icon('logout') + '<span>' + esc(auth.name) + '</span></button>' +
          '</nav>' +
        '</header>' +
        '<main class="workspace" id="workspace"></main>' +
      '</div>';

    const ws = root.querySelector('#workspace');
    const freeEl = root.querySelector('.free');
    let current = null, view = null;

    function setTab(id) {
      current = id;
      root.querySelectorAll('[data-tab]').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === id)));
      ws.innerHTML = '';
      const box = document.createElement('div');
      box.className = 'view view-' + id;
      ws.appendChild(box);
      view = cfg.onTab(id, box) || null;
      updateFree();
    }

    function updateFree() {
      const sum = App.boardSummary(Store.board('nurse'), Store.now());
      freeEl.innerHTML = '빈 침대 <b>' + sum.free + '</b><span class="of">/ ' + sum.total + '</span>' +
        '<span class="split">남 ' + sum.freeM + ' <span class="dot">·</span> 여 ' + sum.freeF + '</span>' +
        (sum.over ? '<span class="over-count">' + window.icon('clock') + '초과 ' + sum.over + '</span>' : '');
    }

    root.addEventListener('click', async (e) => {
      const tab = e.target.closest('[data-tab]');
      if (tab) return setTab(tab.dataset.tab);
      if (e.target.closest('[data-account]')) {
        const ok = await App.confirmDialog('로그아웃', auth.name + ' 계정에서 로그아웃할까요?', '로그아웃');
        if (ok) ctx.logout();
      }
      const snd = e.target.closest('[data-sound]');
      if (snd && soundKey) {
        const on = !Store.settings()[soundKey];
        Store.updateSettings({ [soundKey]: on });
        paintSound();
        App.toast(on ? '초과 알림음을 켰습니다' : '초과 알림음을 껐습니다');
      }
    });

    function paintSound() {
      const snd = root.querySelector('[data-sound]');
      if (!snd || !soundKey) return;
      const on = Store.settings()[soundKey];
      snd.innerHTML = window.icon(on ? 'bell' : 'bellOff');
      snd.setAttribute('aria-pressed', String(on));
      snd.setAttribute('aria-label', on ? '초과 알림음 끄기' : '초과 알림음 켜기');
      snd.title = on ? '초과 알림음 켜짐' : '초과 알림음 꺼짐';
    }
    paintSound();

    const scan = root.querySelector('.scanbar');
    if (scan) {
      scan.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = scan.no;
        const v = input.value.trim();
        if (!v) { input.focus(); return; }
        input.value = '';
        await App.staffRegister(v, auth.role === 'admin' ? 'nurse' : cfg.role);
        input.focus();
      });
    }

    // 스캐너가 입력칸 밖에서 숫자를 보내도 학번 칸으로 모은다
    function onKey(e) {
      if (!scan || document.querySelector('dialog[open]')) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (/^\d$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) scan.no.focus();
    }
    document.addEventListener('keydown', onKey);

    setTab(cfg.tabs[0].id);
    if (scan) scan.no.focus();

    return {
      refresh() { updateFree(); paintSound(); if (view && view.refresh) view.refresh(); },
      tick() { updateFree(); if (view && view.tick) view.tick(); else if (view && view.refresh && current === 'board') view.refresh(); },
      destroy() { document.removeEventListener('keydown', onKey); },
    };
  }

  function boardView(box, mode) {
    box.innerHTML = '<div class="board" id="board-' + mode + '"></div>';
    const el = box.firstChild;
    // 보건 선생님·학생지원실 화면: 사용 시간이 지나는 순간 알림(글)을 띄우고, 설정이 켜져 있으면 알림음도 울린다
    const onOver = SOUND_KEY[mode] ? (b) => {
      if (Store.settings()[SOUND_KEY[mode]]) App.sound.alert();
      App.toast(b.label + ' 침대 ' + b.session.name + ' 학생의 사용 시간(' + App.hm(App.dueAt(b.session)) + '까지)이 지났습니다', 'error');
    } : null;
    App.bindBoardActions(el, mode === 'admin' ? 'nurse' : mode);
    const draw = () => App.renderBoard(el, { mode: mode === 'admin' ? 'nurse' : mode, admin: mode === 'admin', onOver });
    draw();
    return { refresh: draw, tick: draw };
  }

  // ── 보건 선생님 ───────────────────────────────────────────────
  function nurse(root, ctx) {
    return staffShell(root, ctx, {
      role: 'nurse', title: '보건 선생님 화면', scan: true,
      tabs: [{ id: 'board', label: '현황판', icon: 'bed' }, { id: 'records', label: '오늘 기록', icon: 'list' }, { id: 'settings', label: '설정', icon: 'settings' }],
      onTab(id, box) {
        if (id === 'board') return boardView(box, 'nurse');
        if (id === 'records') return App.viewRecords(box, 'nurse');
        if (id === 'settings') { const v = App.viewSettings(box, 'nurse'); return { refresh() { v.refresh(); } }; }
      },
    });
  }

  // ── 학생지원실 ─────────────────────────────────────────────
  function support(root, ctx) {
    return staffShell(root, ctx, {
      role: 'support', title: '학생지원실 화면', place: '강의동 학생지원실', scan: true,
      // 학생 명단은 관리자 화면에서 구글 시트로 불러온다 (학생지원실에서는 바꾸지 않는다)
      tabs: [{ id: 'board', label: '현황판', icon: 'bed' }, { id: 'records', label: '사용 기록', icon: 'list' }],
      onTab(id, box) {
        if (id === 'board') return boardView(box, 'support');
        if (id === 'records') return App.viewRecords(box, 'support');
      },
    });
  }

  // ── 관리자 ─────────────────────────────────────────────────
  function admin(root, ctx) {
    return staffShell(root, ctx, {
      role: 'admin', title: '관리자 화면', place: '관리자', scan: false,
      tabs: [
        { id: 'screens', label: '화면', icon: 'monitor' },
        { id: 'board', label: '현황판', icon: 'bed' },
        { id: 'records', label: '사용 기록', icon: 'list' },
        { id: 'roster', label: '학생 명단', icon: 'users' },
        { id: 'settings', label: '설정·계정', icon: 'settings' },
      ],
      onTab(id, box) {
        if (id === 'screens') return screensHub(box);
        if (id === 'board') return boardView(box, 'admin');
        if (id === 'records') return App.viewRecords(box, 'admin');
        if (id === 'roster') { App.viewRoster(box); return {}; }
        if (id === 'settings') { const v = App.viewSettings(box, 'admin'); return { refresh() { v.refresh(); } }; }
      },
    });
  }

  function screensHub(box) {
    const SCREENS = [
      { route: '#/nurse', icon: 'monitor', name: '보건 선생님 화면', where: '보건실 PC', does: '전체 현황, 직접 등록, 연장·퇴실·이동·취소, 기록, 설정' },
      { route: '#/kiosk', icon: 'tablet', name: '학생용 태블릿', where: '보건실 입구 태블릿 + 스캐너', does: '스캔 등록, 침대 고르기, 관리번호 연장, 퇴실' },
      { route: '#/support', icon: 'building', name: '학생지원실 화면', where: '강의동 학생지원실 PC', does: '등록, 현황 확인, 등록 취소, 기록, 초과 알림' },
    ];
    function draw() {
      const sum = App.boardSummary(Store.board('nurse'), Store.now());
      box.innerHTML =
        '<section class="panel"><header class="panel-head"><h2>화면 열기</h2>' +
          '<p class="panel-note">관리자 계정은 세 화면을 모두 열 수 있습니다.</p></header>' +
          '<p class="hub-status">지금 침대 ' + sum.total + '자리 중 <b>' + sum.busy + '자리 사용 중</b>' +
            (sum.over ? ', 그중 <b class="is-over">' + window.icon('clock') + sum.over + '자리는 시간 초과</b>' : '') +
            '입니다. 오늘 이용 ' + Store.records(null, 'admin').filter((r) => r.status !== 'cancelled').length + '명.</p>' +
          '<ul class="screen-list">' + SCREENS.map((s) =>
            '<li class="screen-row">' +
              '<span class="screen-ico">' + window.icon(s.icon) + '</span>' +
              '<div class="screen-text"><h3>' + s.name + '</h3><p>' + s.where + ' <span class="dot">·</span> ' + s.does + '</p></div>' +
              '<a class="btn btn-ghost" href="' + s.route + '">열기</a>' +
              '<a class="btn btn-quiet" href="' + s.route + '" target="_blank" rel="noopener">새 탭' + '</a>' +
            '</li>').join('') + '</ul>' +
        '</section>';
    }
    draw();
    return { refresh: draw, tick: draw };
  }

  Object.assign(App, { screenLogin: login, screenNurse: nurse, screenSupport: support, screenAdmin: admin });
})();
