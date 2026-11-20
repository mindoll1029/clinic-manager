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
            [['admin', 'admin1234', '관리자 (모든 화면)'], ['nurse', 'nurse1234', '보건 선생님'], ['kiosk-nurse-room', 'kiosk1234', '보건실 학생 태블릿'], ['kiosk-support-office', 'office1234', '학생지원실 학생 태블릿'], ['support-office', 'support1234', '학생지원실'], ['nurse-assistant', 'assist1234', '보건 조교 (학생지원실 화면)']]
              .map((r) => '<tr><td class="num"><button type="button" class="link" data-fill="' + r[0] + '|' + r[1] + '">' + r[0] + '</button></td><td class="num">' + r[1] + '</td><td>' + r[2] + '</td></tr>').join('') +
            '</tbody></table></details>' +
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
  const NOTIFY_HIDE = 'clinic-manager.notify-bar-hidden.'; // 윈도우 알림 안내를 닫았는지 (이번 접속 동안)

  // ── 직원 화면 공통 껍데기 ──────────────────────────────────
  // cfg: { role, title, tabs: [{id,label,icon}], scan: bool, onTab(id, container) }
  function staffShell(root, ctx, cfg) {
    const soundKey = SOUND_KEY[cfg.role];
    const auth = ctx.auth;
    const by = auth.role === 'admin' ? null : auth.source || null; // 기록에 남길 이름 (보건 조교)
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
            (soundKey ? '<button type="button" class="tb-btn" data-sound-test aria-label="알림음 테스트" title="초과 알림과 알림음을 한 번 보여 줍니다">' + window.icon('volume') + '<span>알림음 테스트</span></button>' +
              '<button type="button" class="icon-btn btn-ghost" data-sound aria-pressed="false"></button>' : '') +
            '<button type="button" class="account" data-account>' + window.icon('logout') + '<span>' + esc(auth.name) + '</span></button>' +
          '</nav>' +
        '</header>' +
        (soundKey ? '<div class="notify-bar" data-notify-bar role="status" hidden></div>' : '') +
        '<main class="workspace" id="workspace"></main>' +
      '</div>';

    const ws = root.querySelector('#workspace');
    const freeEl = root.querySelector('.free');
    let current = null, view = null;
    let lastActs = null; // 학생지원실: 퇴실 처리를 맡는지 (바뀌는 순간 알린다)
    // 학생지원실 계정만 근무 시간에 따라 퇴실 처리가 열리고 닫힌다 (연장과 보건 조교의 퇴실은 언제나 된다)
    const gated = cfg.role === 'support' && by !== 'assistant';

    // 학생지원실 화면은 퇴실 처리를 맡기 시작하거나 끝낼 때 알림을 띄운다.
    function watchDuty() {
      if (!gated) return;
      const d = Store.duty();
      if (lastActs !== null && lastActs !== d.supportActs) {
        App.sound.ok();
        App.toast(d.supportActs
          ? (d.on ? '보건 선생님 퇴근 ' + d.handoverMinutes + '분 전입니다. 이제 여기서 퇴실 처리할 수 있습니다' : '보건 선생님 근무 시간이 끝났습니다. 퇴실 처리는 여기서 합니다')
          : '보건 선생님이 근무 중입니다. 퇴실 처리는 보건실에서 합니다');
      }
      lastActs = d.supportActs;
    }

    function setTab(id) {
      current = id;
      root.querySelectorAll('[data-tab]').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === id)));
      ws.innerHTML = '';
      const box = document.createElement('div');
      box.className = 'view view-' + id;
      ws.appendChild(box);
      view = cfg.onTab(id, box, by) || null;
      updateFree();
    }

    // 사용 시간이 지나는 순간 오른쪽 아래에 알린다. 현황판뿐 아니라 사용 기록·설정 탭을 보고 있어도 알린다.
    // (화면을 연 뒤에 새로 초과된 침대만. 알림음은 설정이 켜져 있을 때만. 관리자 화면은 알리지 않는다)
    let lastOver = null;
    function watchOver(board, now) {
      if (!soundKey) return;
      const over = board.filter((b) => b.session && App.isOver(b.session, now));
      if (lastOver) {
        // 같은 순간에 여러 명이 넘으면 알림 하나(학생 목록)와 알림음 한 번
        const fresh = over.filter((b) => !lastOver.has(b.session.id));
        if (fresh.length) {
          const sound = !!Store.settings()[soundKey];
          if (sound) App.sound.alert();
          App.alertOver(fresh.map((b) => ({ id: b.session.id, label: b.label, name: b.session.name, due: App.dueAt(b.session) })), { sound });
        }
      }
      lastOver = new Set(over.map((b) => b.session.id));
    }

    function updateFree() {
      watchDuty();
      const board = Store.board('nurse'), now = Store.now();
      watchOver(board, now);
      App.watchLeave(); // 퇴실 중으로 10분이 지난 학생은 잔디로 알린다
      App.watchSheet(); // 연장 기록을 구글 시트로 보낸다
      const sum = App.boardSummary(board, now);
      freeEl.innerHTML = '빈 침대 <b>' + sum.free + '</b><span class="of">/ ' + sum.total + '</span>' +
        '<span class="split">남 ' + sum.freeM + ' <span class="dot">·</span> 여 ' + sum.freeF + '</span>' +
        // 좁은 화면에서는 '초과'·'퇴실 중' 글자를 숨기고 아이콘과 숫자만 (위쪽 바가 두 줄이 되지 않게, 글자는 화면 읽기용으로 남긴다)
        (sum.over ? '<span class="over-count" title="사용 시간 초과 ' + sum.over + '명">' + window.icon('clock') + '<span class="pill-label">초과 </span>' + sum.over + '</span>' : '') +
        (sum.leaving ? '<span class="leave-count" title="퇴실 중 ' + sum.leaving + '명">' + window.icon('logout') + '<span class="pill-label">퇴실 중 </span>' + sum.leaving + '</span>' : '');
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
      // 알림음 테스트: 실제 초과 알림과 같은 자리·모양으로 한 번 보여 주고 알림음도 울린다 (허용했다면 윈도우 알림도)
      if (e.target.closest('[data-sound-test]') && soundKey) {
        await App.previewOverAlert(Store.settings()[soundKey]
          ? '사용 시간이 지나면 이렇게 알립니다.'
          : '지금은 알림음이 꺼져 있어서 실제로는 소리 없이 알림만 뜹니다. 종 버튼으로 켤 수 있습니다.');
        paintNotify();
      }
      if (e.target.closest('[data-notify-allow]')) {
        const r = await App.askNotify();
        paintNotify();
        App.toast(r === 'granted' ? '윈도우 알림을 켰습니다. 알림음 테스트로 확인해 보세요' : '윈도우 알림이 허용되지 않았습니다', r === 'granted' ? null : 'error');
      }
      if (e.target.closest('[data-notify-close]')) {
        try { sessionStorage.setItem(NOTIFY_HIDE + App.notifyState(), '1'); } catch (err) { /* 저장 못 해도 이번만 닫는다 */ }
        notifyBar.hidden = true;
      }
    });

    // 윈도우 알림 안내 띠 (보건 선생님·학생지원실 화면). 허용하면 사라진다. 닫으면 이번 접속 동안 숨긴다.
    const notifyBar = root.querySelector('[data-notify-bar]');
    function paintNotify() {
      if (!notifyBar) return;
      const st = App.notifyState();
      let hidden = false;
      try { hidden = sessionStorage.getItem(NOTIFY_HIDE + st) === '1'; } catch (err) { /* 무시 */ }
      const html = st === 'default'
        ? window.icon('bell') + '<span><b>윈도우 알림을 켜 주세요.</b> 창을 최소화하거나 다른 프로그램을 쓰는 중에도 사용 시간 초과를 알려 드립니다.</span>' +
          '<button type="button" class="btn btn-primary btn-sm" data-notify-allow>알림 허용</button>'
        : st === 'denied'
          ? window.icon('bellOff') + '<span><b>윈도우 알림이 차단되어 있습니다.</b> 주소창 왼쪽 아이콘을 눌러 알림을 "허용"으로 바꿔 주세요.</span>'
          : st === 'file'
            ? window.icon('alert') + '<span><b>파일로 연 화면이라 윈도우 알림을 쓸 수 없습니다.</b> 링크(인터넷 주소)로 열면 창을 최소화해도 알림을 받을 수 있습니다.</span>'
            : '';
      notifyBar.hidden = !html || hidden;
      notifyBar.innerHTML = html ? html + '<button type="button" class="icon-btn" data-notify-close aria-label="안내 닫기">' + window.icon('x') + '</button>' : '';
    }
    paintNotify();

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
        await App.staffRegister(v, auth.role === 'admin' ? 'nurse' : cfg.role, null, by);
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
      refresh() { updateFree(); paintSound(); paintNotify(); if (view && view.refresh) view.refresh(); },
      tick() { updateFree(); if (view && view.tick) view.tick(); else if (view && view.refresh && current === 'board') view.refresh(); },
      destroy() { document.removeEventListener('keydown', onKey); },
    };
  }

  // by: 기록에 남길 이름 (보건 조교 → 'assistant')
  function boardView(box, mode, by) {
    box.innerHTML = '<div class="board" id="board-' + mode + '"></div>';
    const el = box.firstChild;
    // 사용 시간 초과 알림은 staffShell(watchOver)이 탭과 상관없이 띄운다
    App.bindBoardActions(el, mode === 'admin' ? 'nurse' : mode, by);
    // 학생지원실: 보건 선생님 퇴근 10분 전부터(근무 시간 밖에는 언제나) 퇴실 버튼을 보인다. 보건 조교는 언제나. (연장은 언제나)
    const draw = () => App.renderBoard(el, { mode: mode === 'admin' ? 'nurse' : mode, admin: mode === 'admin',
      manage: mode === 'support' && (by === 'assistant' || Store.duty().supportActs) });
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
  // 보건 조교 계정도 이 화면을 쓴다. 학생지원실과 같지만 퇴실 처리도 근무 시간과 상관없이 언제나 된다.
  // 상단 바에는 계정 이름이 보인다.
  function support(root, ctx) {
    return staffShell(root, ctx, {
      role: 'support', title: '학생지원실 화면', place: ctx.auth.role === 'support' ? ctx.auth.name : '강의동 학생지원실', scan: true,
      // 학생 명단은 관리자 화면에서 구글 시트로 불러온다 (학생지원실에서는 바꾸지 않는다)
      tabs: [{ id: 'board', label: '현황판', icon: 'bed' }, { id: 'records', label: '사용 기록', icon: 'list' }],
      onTab(id, box, by) {
        if (id === 'board') return boardView(box, 'support', by);
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
      { route: '#/nurse', icon: 'monitor', name: '보건 선생님 화면', where: '보건실 PC', does: '전체 현황, 직접 등록, 연장·퇴실·이동·취소, 기록, 설정(근무 일정·잔디 알림 포함)' },
      { route: '#/kiosk', icon: 'tablet', name: '보건실 학생용 태블릿', where: '보건실 입구 태블릿 + 스캐너', does: '근무 시간: 스캔·학번 입력 등록, 침대 고르기 · 퇴실 요청은 언제나 · 그 밖: 현황 · 연장 없음' },
      { route: '#/office', icon: 'tablet', name: '학생지원실 학생용 태블릿', where: '강의동 학생지원실 태블릿', does: '언제나: 스캔·학번 입력 → 침대 고르기 등록, 사용 중이면 바로 퇴실 · 연장 없음' },
      { route: '#/support', icon: 'building', name: '학생지원실 화면', where: '강의동 학생지원실 PC, 보건 조교', does: '등록, 연장, 퇴실 확인, 현황 확인, 등록 취소, 기록, 초과 알림 · 퇴근 10분 전부터 퇴실' },
    ];
    function draw() {
      const sum = App.boardSummary(Store.board('nurse'), Store.now());
      box.innerHTML =
        '<section class="panel"><header class="panel-head"><h2>화면 열기</h2>' +
          '<p class="panel-note">관리자 계정은 모든 화면을 열 수 있습니다.</p></header>' +
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
