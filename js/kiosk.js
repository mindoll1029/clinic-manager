/* 학생용 태블릿 화면: 스캔 → 침대 고르기 → 완료, 사용 중이면 퇴실·연장 */
(function () {
  'use strict';
  const App = window.App;
  const { esc } = App;
  const Store = window.Store;

  const IDLE_MS = 30 * 1000;   // 입력이 없으면 처음 화면으로
  const DONE_MS = 5 * 1000;    // 완료 화면은 5초 뒤 처음으로
  const ERROR_MS = 4 * 1000;
  const DEVICE = 'kiosk-nurse-room';

  // 학생에게 보이는 오류는 해요체로. 사용자가 정한 문구(학번 확인, 빈 침대 없음)는 그대로 둔다.
  const SAY = {
    WRONG_CODE: '관리번호가 달라요.',
    LOCKED: '여러 번 틀려서 잠시 연장할 수 없어요.',
    MAX_EXT: '더 연장할 수 없어요. 보건 선생님께 말해 주세요.',
    NOT_ACTIVE: '사용 중인 침대가 없어요.',
    ALREADY_ACTIVE: '이미 침대를 쓰고 있어요.',
    BED_TAKEN: '방금 다른 학생이 그 침대를 골랐어요. 다른 침대를 골라 주세요.',
    NO_BED_CHOSEN: '침대를 골라 주세요.',
  };
  const say = (e) => SAY[e.code] || e.message;

  function mount(root, ctx) {
    let state = { step: 'scan' };
    let scanBuf = '';
    let idleTimer = null, stepTimer = null, lockTimer = null;
    let selfWrite = false; // 이 태블릿이 방금 바꾼 내용이면 "다른 학생이 골랐어요"를 띄우지 않는다

    root.innerHTML =
      '<div class="kiosk">' +
        '<header class="k-top">' +
          '<button type="button" class="k-brand" aria-label="보건실 (길게 누르면 관리 메뉴)">' + window.icon('bed') + '<span>보건실</span></button>' +
          '<p class="k-free" aria-live="polite"></p>' +
          '<p class="live" data-live></p>' +
        '</header>' +
        '<main class="k-stage"></main>' +
        '<input class="k-scan-input" inputmode="none" autocomplete="off" aria-hidden="true" tabindex="-1">' +
      '</div>';
    const stage = root.querySelector('.k-stage');
    const freeEl = root.querySelector('.k-free');
    const hidden = root.querySelector('.k-scan-input');

    function go(next) {
      clearTimeout(stepTimer);
      clearInterval(lockTimer);
      state = Object.assign({}, next);
      draw();
      if (state.step === 'done') stepTimer = setTimeout(() => go({ step: 'scan' }), DONE_MS);
      if (state.step === 'error') stepTimer = setTimeout(() => go({ step: 'scan' }), ERROR_MS);
      armIdle();
      keepFocus();
    }

    function armIdle() {
      clearTimeout(idleTimer);
      if (state.step !== 'scan') idleTimer = setTimeout(() => go({ step: 'scan' }), IDLE_MS);
    }

    function keepFocus() {
      if (!document.querySelector('dialog[open]')) { try { hidden.focus({ preventScroll: true }); } catch (e) { /* 무시 */ } }
    }

    function topCounts() {
      const sum = App.boardSummary(Store.board('kiosk'), Store.now());
      freeEl.innerHTML = '빈 침대 <b>' + sum.free + '</b><span class="k-free-split">남 ' + sum.freeM + ' <span class="dot">·</span> 여 ' + sum.freeF + '</span>';
    }

    function keypad(label) {
      const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'];
      return '<div class="keypad" role="group" aria-label="' + esc(label) + '">' + keys.map((k) =>
        k === 'del' ? '<button type="button" class="key key-del" data-key="del" aria-label="지우기">' + window.icon('erase') + '</button>'
        : k === 'ok' ? '<button type="button" class="key key-ok" data-key="ok">확인</button>'
        : '<button type="button" class="key" data-key="' + k + '">' + k + '</button>').join('') + '</div>';
    }

    function bedGrid(student, selected) {
      const now = Store.now();
      const board = Store.board('kiosk');
      const bedBtn = (b, mine) => {
        const s = b.session;
        const over = s && App.isOver(s, now);
        const can = !s && mine;
        return '<button type="button" class="k-bed' + (s ? ' is-busy' : ' is-free') + (over ? ' is-over' : '') + (b.tier ? ' is-tier' : '') + (selected === b.id ? ' is-picked' : '') + '"' +
          (can ? ' data-bed="' + b.id + '" aria-pressed="' + (selected === b.id) + '"' : ' disabled') +
          ' aria-label="' + esc(App.bedName(b.label, b.tier)) + (s ? ' 사용 중' : mine ? ' 비어 있음' : '') + '">' +
          '<span class="k-bed-no">' + esc(b.label) + (b.tier ? '<small>' + (b.tier === 'upper' ? '위층' : '아래층') + '</small>' : '') + '</span>' +
          '<span class="k-bed-state">' + (s ? (over ? window.icon('clock') : '') + esc(s.name) + ' · ' + App.elapsedText(s.startedAt, now) : mine ? '비어 있음' : '') + '</span>' +
          (selected === b.id ? '<span class="k-bed-check">' + window.icon('check') + '</span>' : '') +
        '</button>';
      };
      const zone = (z) => {
        const mine = !student.gender || student.gender === z;
        const cells = App.groupBeds(board.filter((b) => b.zone === z));
        return '<section class="k-zone' + (mine ? '' : ' is-other') + '" aria-label="' + App.ZONE[z] + ' 침대"><h2>' + App.ZONE[z] + ' 침대</h2>' +
          '<div class="k-beds" style="--cols:' + (cells.length <= 4 ? 2 : 3) + '">' +
          cells.map((c) => c.type === 'single' ? bedBtn(c.bed, mine)
            : '<div class="k-bunk" role="group" aria-label="2층 침대">' + bedBtn(c.upper, mine) + bedBtn(c.lower, mine) + '</div>').join('') +
          '</div></section>';
      };
      return '<div class="k-board' + (selected ? ' has-pick' : '') + '">' + zone('M') + zone('F') + '</div>';
    }

    function draw() {
      topCounts();
      const s = state;
      const now = Store.now();
      let html = '';
      if (s.step === 'scan') {
        html = '<section class="k-step k-scan">' +
          '<div class="k-scan-mark" aria-hidden="true">' + window.icon('scan') + '<span class="k-beam"></span></div>' +
          '<h1>학생증 바코드를<br>스캔해주세요</h1>' +
          '<p class="k-sub">처음 쉬러 왔을 때도, 다 쉬고 나갈 때도 스캔해요.</p>' +
          '<button type="button" class="btn btn-ghost btn-xl" data-go="type">' + window.icon('keypad') + '<span>학번 직접 입력</span></button>' +
        '</section>';
      } else if (s.step === 'type') {
        const buf = s.buf || '';
        html = '<section class="k-step k-type">' +
          '<div class="k-type-left"><h1>학번을 눌러 주세요</h1>' +
            '<p class="k-digits" aria-live="polite" aria-label="입력한 학번 ' + esc(buf) + '">' + [0, 1, 2, 3].map((i) => '<span class="' + (buf[i] ? 'is-on' : '') + '">' + esc(buf[i] || '') + '</span>').join('') + (buf.length > 4 ? '<span class="is-on">' + esc(buf.slice(4)) + '</span>' : '') + '</p>' +
            (s.error ? '<p class="k-error" role="alert">' + window.icon('alert') + esc(s.error) + '</p>' : '<p class="k-sub">학번 4자리를 누르고 확인을 눌러요.</p>') +
            '<button type="button" class="btn btn-ghost btn-lg" data-go="scan">' + window.icon('back') + '<span>처음으로</span></button></div>' +
          keypad('학번 입력') +
        '</section>';
      } else if (s.step === 'pick') {
        html = '<section class="k-step k-pick">' +
          '<header class="k-pick-head"><h1><b>' + esc(s.student.name) + '</b> 학생, 쉴 침대를 골라 주세요</h1>' +
          '<p class="k-sub">비어 있는 침대만 고를 수 있어요.</p></header>' +
          bedGrid(s.student, s.bedId) +
          '<footer class="k-foot"><button type="button" class="btn btn-ghost btn-lg" data-go="scan">' + window.icon('back') + '<span>처음으로</span></button>' +
          '<button type="button" class="btn btn-primary btn-xl" data-act="register"' + (s.bedId ? '' : ' disabled') + '>' + (s.bedId ? (() => { const pb = Store.beds().find((b) => b.id === s.bedId); return esc(App.bedName(pb.label, pb.tier)) + '로 등록'; })() : '침대를 골라 주세요') + '</button></footer>' +
        '</section>';
      } else if (s.step === 'choice') {
        const a = s.student.active;
        const over = App.isOver(a, now);
        const max = Store.settings().maxExtensions;
        html = '<section class="k-step k-choice">' +
          '<h1><b>' + esc(s.student.name) + '</b> 학생은<br>' + esc(App.bedName(a.bedLabel, a.bedTier)) + '를 쓰고 있어요</h1>' +
          '<p class="k-elapsed' + (over ? ' is-over' : '') + '">' + (over ? window.icon('clock') : '') + '<span>' + App.elapsedText(a.startedAt, now) + ' 사용</span>' + (over ? '<span class="chip chip-over">' + App.overLabel(a) + '</span>' : '') + '</p>' +
          '<div class="k-choices">' +
            '<button type="button" class="k-choice-btn is-primary" data-go="confirmEnd">' + window.icon('logout') + '<b>퇴실하기</b><small>다 쉬었어요</small></button>' +
            (a.extensionCount >= max
              ? '<button type="button" class="k-choice-btn" disabled>' + window.icon('lock') + '<b>연장할 수 없어요</b><small>보건 선생님께 말해 주세요</small></button>'
              : '<button type="button" class="k-choice-btn" data-go="code">' + window.icon('plus') + '<b>연장하기</b><small>관리번호가 필요해요</small></button>') +
          '</div>' +
          '<button type="button" class="btn btn-ghost btn-lg" data-go="scan">' + window.icon('back') + '<span>처음으로</span></button>' +
        '</section>';
      } else if (s.step === 'confirmEnd') {
        const a = s.student.active;
        html = '<section class="k-step k-confirm">' +
          '<h1>퇴실하겠습니까?</h1>' +
          '<p class="k-sub"><b>' + esc(s.student.name) + '</b> · ' + esc(App.bedName(a.bedLabel, a.bedTier)) + ' · ' + App.elapsedText(a.startedAt, now) + ' 사용</p>' +
          '<div class="k-confirm-actions"><button type="button" class="btn btn-ghost btn-xl" data-go="choice">돌아가기</button>' +
          '<button type="button" class="btn btn-primary btn-xl" data-act="end">' + window.icon('check') + '<span>퇴실 확인</span></button></div>' +
        '</section>';
      } else if (s.step === 'code') {
        const buf = s.buf || '';
        const lockedUntil = Store.lockState(DEVICE);
        const left = lockedUntil ? Math.ceil((lockedUntil - now) / 1000) : 0;
        html = '<section class="k-step k-type">' +
          '<div class="k-type-left"><h1>관리번호를 눌러 주세요</h1>' +
            '<p class="k-sub">보건 선생님께 받은 번호예요. ' + Store.settings().extendMinutes + '분 연장돼요.</p>' +
            '<p class="k-digits is-secret" aria-label="' + buf.length + '자리 입력">' + [0, 1, 2, 3, 4, 5].map((i) => '<span class="' + (i < buf.length ? 'is-on' : '') + (i >= 4 ? ' is-opt' : '') + '">' + (i < buf.length ? '●' : '') + '</span>').join('') + '</p>' +
            (left > 0 ? '<p class="k-error" role="alert">' + window.icon('lock') + '<span>' + left + '초 뒤에 다시 해 주세요.</span></p>'
              : s.error ? '<p class="k-error" role="alert">' + window.icon('alert') + '<span>' + esc(s.error) + (s.errorNote ? ' <span class="nowrap">' + esc(s.errorNote) + '</span>' : '') + '</span></p>' : '') +
            '<button type="button" class="btn btn-ghost btn-lg" data-go="choice">' + window.icon('back') + '<span>돌아가기</span></button></div>' +
          keypad('관리번호 입력') +
        '</section>';
        if (left > 0) {
          root.classList.add('is-locked');
          lockTimer = setInterval(() => { if (Store.lockState(DEVICE)) draw(); else { clearInterval(lockTimer); root.classList.remove('is-locked'); draw(); } }, 1000);
        } else root.classList.remove('is-locked');
      } else if (s.step === 'done') {
        html = '<section class="k-step k-done">' +
          '<div class="k-done-mark">' + window.icon('check') + '</div>' +
          '<h1>' + s.title + '</h1>' +
          (s.sub ? '<p class="k-sub">' + sentenceLines(s.sub) + '</p>' : '') +
          '<div class="k-countdown" aria-hidden="true"><span></span></div>' +
          '<button type="button" class="btn btn-ghost btn-lg" data-go="scan">처음으로</button>' +
        '</section>';
      } else if (s.step === 'error') {
        html = '<section class="k-step k-fail">' +
          '<div class="k-fail-mark">' + window.icon('alert') + '</div>' +
          '<h1>' + esc(s.message) + '</h1>' +
          (s.sub ? '<p class="k-sub">' + esc(s.sub) + '</p>' : '') +
          '<button type="button" class="btn btn-ghost btn-xl" data-go="scan">처음으로</button>' +
        '</section>';
      }
      stage.innerHTML = html;
      stage.dataset.step = s.step;
    }

    // 마침표 뒤에서만 줄을 바꾸고, 문장 안에서는 줄바꿈하지 않습니다.
    function sentenceLines(html) {
      return html.replace(/\.\s+/g, '.\n').split('\n')
        .map(line => '<span class="nowrap">' + line + '</span>').join('<br>');
    }

    function lookup(raw) {
      let st;
      try { st = Store.lookupStudent(raw, 'kiosk'); }
      catch (e) {
        App.sound.error();
        if (state.step === 'type') return go({ step: 'type', buf: '', error: say(e) });
        return go({ step: 'error', message: say(e), sub: '그래도 안 되면 보건 선생님께 말해 주세요.' });
      }
      App.sound.ok();
      if (st.active) return go({ step: 'choice', student: st });
      const free = Store.board('kiosk').filter((b) => !b.session && (!st.gender || b.zone === st.gender));
      if (!free.length) { App.sound.error(); return go({ step: 'error', message: '지금은 빈 침대가 없습니다.', sub: '보건 선생님께 말해 주세요.' }); }
      go({ step: 'pick', student: st, bedId: null });
    }

    function pressKey(k) {
      if (state.step !== 'type' && state.step !== 'code') return;
      if (state.step === 'code' && Store.lockState(DEVICE)) return;
      let buf = state.buf || '';
      const maxLen = state.step === 'code' ? 6 : 10;
      if (k === 'del') buf = buf.slice(0, -1);
      else if (k === 'ok') return submitBuf();
      else if (/^\d$/.test(k) && buf.length < maxLen) buf += k;
      state = Object.assign({}, state, { buf, error: null, errorNote: null });
      draw();
      armIdle();
    }

    function submitBuf() {
      const buf = state.buf || '';
      if (state.step === 'type') {
        if (buf.length < 4) { state = Object.assign({}, state, { error: '학번 4자리를 눌러 주세요.' }); draw(); return; }
        lookup(buf);
      } else if (state.step === 'code') {
        if (buf.length < 4) { state = Object.assign({}, state, { error: '관리번호를 끝까지 눌러 주세요.' }); draw(); return; }
        try {
          const r = Store.extendSession({ studentNo: state.student.no, code: buf, deviceId: DEVICE });
          App.sound.ok();
          go({ step: 'done', title: Store.settings().extendMinutes + '분 연장했어요', sub: esc(App.bedName(r.bedLabel, r.bedTier)) + '에서 더 쉬어요. 연장 ' + r.extensionCount + '회째예요.' });
        } catch (e) {
          App.sound.error();
          if (e.code === 'MAX_EXT' || e.code === 'NOT_ACTIVE') return go({ step: 'error', message: say(e) });
          state = Object.assign({}, state, { buf: '', error: say(e), errorNote: e.code === 'WRONG_CODE' ? '남은 기회 ' + e.left + '번' : null });
          draw();
        }
      }
    }

    // 버튼
    root.addEventListener('click', (e) => {
      const goBtn = e.target.closest('[data-go]');
      const key = e.target.closest('[data-key]');
      const bed = e.target.closest('[data-bed]');
      const act = e.target.closest('[data-act]');
      if (key) return pressKey(key.dataset.key);
      if (goBtn) {
        const to = goBtn.dataset.go;
        if (to === 'type') return go({ step: 'type', buf: '' });
        if (to === 'code') return go({ step: 'code', student: state.student, buf: '' });
        if (to === 'choice' || to === 'confirmEnd') {
          const fresh = Store.lookupStudent(state.student.no, 'kiosk');
          if (!fresh.active) return go({ step: 'scan' });
          return go({ step: to, student: fresh });
        }
        return go({ step: to });
      }
      if (bed && state.step === 'pick') {
        state = Object.assign({}, state, { bedId: bed.dataset.bed === state.bedId ? null : bed.dataset.bed });
        draw();
        armIdle();
        return;
      }
      if (act && act.dataset.act === 'register') {
        try {
          selfWrite = true;
          let r;
          try { r = Store.registerSession({ studentNo: state.student.no, bedId: state.bedId, source: 'kiosk' }); }
          finally { selfWrite = false; }
          App.sound.ok();
          go({ step: 'done', title: esc(App.bedName(r.bedLabel, r.bedTier)) + '로 가서 쉬세요', sub: '다 쉬면 다시 스캔하고 퇴실해요.' });
        } catch (e) {
          App.sound.error();
          if (e.code === 'BED_TAKEN') { state = Object.assign({}, state, { bedId: null }); draw(); App.toast(say(e), 'error'); }
          else go({ step: 'error', message: say(e) });
        }
      }
      if (act && act.dataset.act === 'end') {
        try {
          const r = Store.endSession(state.student.no);
          App.sound.ok();
          go({ step: 'done', title: '퇴실했어요', sub: esc(App.bedName(r.bedLabel, r.bedTier)) + ' · ' + App.elapsedText(r.startedAt, r.endedAt) + ' 사용<br>몸조리 잘 해요.' });
        } catch (e) { App.sound.error(); go({ step: 'error', message: say(e) }); }
      }
      keepFocus();
    });

    // 스캐너와 실제 키보드
    function onKey(e) {
      if (document.querySelector('dialog[open]')) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      armIdle();
      if (state.step === 'type' || state.step === 'code') {
        if (/^\d$/.test(e.key)) { e.preventDefault(); pressKey(e.key); }
        else if (e.key === 'Backspace') { e.preventDefault(); pressKey('del'); }
        else if (e.key === 'Enter') { e.preventDefault(); pressKey('ok'); }
        return;
      }
      if (/^[0-9A-Za-z]$/.test(e.key)) { scanBuf += e.key; e.preventDefault(); }
      else if (e.key === 'Enter' && scanBuf) { e.preventDefault(); const v = scanBuf; scanBuf = ''; lookup(v); }
    }
    document.addEventListener('keydown', onKey);
    const onPointer = () => { armIdle(); setTimeout(keepFocus, 0); };
    document.addEventListener('pointerdown', onPointer);

    // 숨은 관리 메뉴: 보건실 글자를 2초 길게 누르면 로그아웃
    const brand = root.querySelector('.k-brand');
    let hold = null;
    brand.addEventListener('pointerdown', () => { hold = setTimeout(adminMenu, 2000); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((t) => brand.addEventListener(t, () => clearTimeout(hold)));
    async function adminMenu() {
      const v = await App.dialog({
        title: '관리 메뉴',
        body: '<p class="sheet-text">태블릿에서 로그아웃하려면 보건 선생님 또는 관리자 비밀번호를 입력해 주세요.</p>' +
          '<label class="field"><span>비밀번호</span><input name="pw" type="password" autocomplete="current-password" autofocus></label><p class="field-error" hidden>비밀번호가 맞지 않습니다.</p>',
        actions: [{ label: '취소', value: '__cancel' }, { label: '로그아웃', value: 'out', kind: 'danger', icon: 'logout' }],
        onSubmit(dlg) {
          const pw = dlg.querySelector('[name=pw]').value;
          if (!Store.verifyPassword(['nurse', 'admin'], pw)) { dlg.querySelector('.field-error').hidden = false; return false; }
        },
      });
      if (v === 'out') ctx.logout();
      keepFocus();
    }

    go({ step: 'scan' });

    return {
      refresh() {
        // 다른 화면에서 바뀐 내용을 반영한다. 입력 중인 단계는 건드리지 않는다.
        topCounts();
        if (selfWrite) return;
        if (state.step === 'pick') {
          const still = state.bedId && Store.board('kiosk').find((b) => b.id === state.bedId && !b.session);
          if (state.bedId && !still) { state = Object.assign({}, state, { bedId: null }); App.toast('고른 침대를 방금 다른 학생이 골랐어요. 다시 골라 주세요.', 'error'); }
          draw();
        } else if (state.step === 'choice' && state.student) {
          const fresh = Store.lookupStudent(state.student.no, 'kiosk');
          if (!fresh.active) go({ step: 'scan' }); else { state = Object.assign({}, state, { student: fresh }); draw(); }
        }
      },
      tick() { if (state.step === 'pick' || state.step === 'choice') this.refresh(); else topCounts(); },
      destroy() {
        clearTimeout(idleTimer); clearTimeout(stepTimer); clearInterval(lockTimer);
        document.removeEventListener('keydown', onKey);
        document.removeEventListener('pointerdown', onPointer);
      },
    };
  }

  App.mountKiosk = mount;
})();
