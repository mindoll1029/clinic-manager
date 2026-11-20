/* 학생용 태블릿 화면 (두 곳이 같은 코드를 쓴다). 학번은 스캔하거나 키패드로 입력한다. 연장은 없다 (PC에서만).
   - 보건실 태블릿 (#/kiosk): 사용 중이 아니면 침대 고르기 → 등록 (보건 선생님 근무 시간에만).
     사용 중이면 "퇴실을 요청하겠습니까?" → [예] → 안내 창 → [확인했어요]를 누르면 모든 화면에 "퇴실 중"으로 보인다.
     퇴실 요청은 근무 시간 밖에도 된다. 근무 시간 밖에는 현황과 퇴실 요청만 (등록은 학생지원실에서).
   - 학생지원실 태블릿 (#/office): 언제나 열려 있다. 사용 중이 아니면 침대 고르기 → 등록,
     사용 중(퇴실 중 포함)이면 "퇴실하겠습니까?" → [예] → 바로 퇴실 (학생이 학생지원실에 와 있으므로).
   퇴실 중인 학생은 학생지원실 태블릿에서 퇴실하거나, 학생지원실 PC에서 [퇴실 확인]으로 끝낸다. */
(function () {
  'use strict';
  const App = window.App;
  const { esc } = App;
  const Store = window.Store;

  const IDLE_MS = 30 * 1000;   // 입력이 없으면 처음 화면으로
  const DONE_MS = 5 * 1000;    // 완료 화면은 5초 뒤 처음으로
  const ERROR_MS = 4 * 1000;
  const NUDGE_MS = 1500;       // 근무 시간 밖에 스캔하면 안내를 잠깐 흔든다

  // 학생에게 보이는 오류는 해요체로. 사용자가 정한 문구(학번 확인, 빈 침대 없음)는 그대로 둔다.
  const SAY = {
    NOT_ACTIVE: '사용 중인 침대가 없어요.',
    ALREADY_ACTIVE: '이미 침대를 쓰고 있어요.',
    BED_TAKEN: '방금 다른 학생이 그 침대를 골랐어요. 다른 침대를 골라 주세요.',
    NO_BED_CHOSEN: '침대를 골라 주세요.',
    LEAVING: '이미 퇴실을 요청했어요.',
  };
  const say = (e) => SAY[e.code] || e.message;

  // ── 전체 화면 ──────────────────────────────────────────────
  // 오른쪽 위 "전체 화면" 버튼을 눌렀을 때만 켠다. 끄는 것은 숨은 관리 메뉴에서 비밀번호로.
  const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;
  const fsSupported = () => !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
  function fsEnter() {
    const el = document.documentElement;
    try {
      const p = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen();
      if (p && p.catch) p.catch(() => {});
    } catch (e) { /* 지원하지 않는 기기 */ }
  }
  function fsExit() {
    if (!fsElement()) return;
    try {
      const p = document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen();
      if (p && p.catch) p.catch(() => {});
    } catch (e) { /* 무시 */ }
  }

  // 근무 시간 밖에 보건실 태블릿에서 할 수 없는 단계 (이 단계에 있으면 현황 화면으로 바꾼다)
  const DUTY_STEPS = ['scan', 'pick'];

  function mount(root, ctx, opts) {
    // office: 학생지원실 학생용 태블릿. 근무 시간과 상관없이 언제나 등록·퇴실한다.
    const office = !!(opts && opts.place === 'office');
    const place = office ? 'office' : 'kiosk';
    const dutyOn = () => office || Store.duty().on;
    let state = { step: 'scan' };
    let scanBuf = '';
    let idleTimer = null, stepTimer = null;
    let selfWrite = false; // 이 태블릿이 방금 바꾼 내용이면 "다른 학생이 골랐어요"를 띄우지 않는다

    const brandName = office ? '학생지원실' : '보건실';
    root.innerHTML =
      '<div class="kiosk' + (office ? ' is-office' : '') + '">' +
        '<header class="k-top">' +
          '<button type="button" class="k-brand" aria-label="' + brandName + ' (길게 누르면 관리 메뉴)">' + window.icon(office ? 'building' : 'bed') + '<span>' + brandName + '</span></button>' +
          '<p class="k-free" aria-live="polite"></p>' +
          '<p class="live" data-live></p>' +
          '<button type="button" class="k-fs" data-fs aria-label="전체 화면으로 보기">' + window.icon('maximize') + '<span>전체 화면</span></button>' +
        '</header>' +
        '<main class="k-stage"></main>' +
        '<input class="k-scan-input" inputmode="none" autocomplete="off" aria-hidden="true" tabindex="-1">' +
        // 퇴실 요청 안내 창: [확인했어요]를 눌러야 퇴실 중이 된다
        '<dialog class="k-modal" aria-labelledby="k-modal-title"></dialog>' +
      '</div>';
    const stage = root.querySelector('.k-stage');
    const freeEl = root.querySelector('.k-free');
    const hidden = root.querySelector('.k-scan-input');
    const modal = root.querySelector('.k-modal');
    modal.addEventListener('cancel', (e) => e.preventDefault()); // Esc로 닫지 않는다 (확인 버튼 또는 시간이 지나면 닫힌다)

    function closeModal() { if (modal.open) modal.close(); }

    function go(next) {
      clearTimeout(stepTimer);
      closeModal();
      // 근무 시간 밖에는 처음 화면 대신 현황 화면(off)을 연다 (학생지원실 태블릿은 언제나 처음 화면)
      const on = dutyOn();
      if (next.step === 'scan' && !on) next = { step: 'off' };
      else if (next.step === 'off' && on) next = { step: 'scan' };
      state = Object.assign({}, next);
      draw();
      if (state.step === 'done') stepTimer = setTimeout(() => go({ step: 'scan' }), DONE_MS);
      if (state.step === 'error') stepTimer = setTimeout(() => go({ step: 'scan' }), ERROR_MS);
      if (state.step === 'off' && state.nudge) {
        stepTimer = setTimeout(() => {
          state = Object.assign({}, state, { nudge: false });
          const head = stage.querySelector('.k-off-head');
          if (head) head.classList.remove('is-nudge');
        }, NUDGE_MS);
      }
      armIdle();
      keepFocus();
    }

    // 근무 시간이 시작되거나 끝나면 화면을 바꾼다. 바꿨으면 true.
    // 완료 화면은 5초 뒤 처음 화면으로 갈 때 바뀐다 (방금 등록한 학생이 침대 번호를 볼 수 있게).
    // 퇴실 요청(학번 입력·확인·안내 창)은 근무 시간 밖에도 하므로 그대로 둔다.
    function syncDuty() {
      if (office) return false;
      const on = Store.duty().on;
      if (!on && DUTY_STEPS.includes(state.step)) { go({ step: 'off' }); return true; }
      if (on && state.step === 'off') { go({ step: 'scan' }); return true; }
      return false;
    }

    function armIdle() {
      clearTimeout(idleTimer);
      if (state.step !== 'scan' && state.step !== 'off') idleTimer = setTimeout(() => go({ step: 'scan' }), IDLE_MS);
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

    // student가 없으면 고를 수 없는 현황판 (근무 시간 밖 화면)
    function bedGrid(student, selected) {
      const now = Store.now();
      const board = Store.board('kiosk');
      const bedBtn = (b, mine) => {
        const s = b.session;
        const over = s && App.isOver(s, now);
        const leaving = App.isLeaving(s); // 퇴실 중: 시간 자리에 "퇴실 중 3분"
        const can = !!student && !s && mine;
        return '<button type="button" class="k-bed' + (s ? ' is-busy' : ' is-free') + (over ? ' is-over' : '') + (leaving ? ' is-leaving' : '') + (b.tier ? ' is-tier' : '') + (selected === b.id ? ' is-picked' : '') + '"' +
          (can ? ' data-bed="' + b.id + '" aria-pressed="' + (selected === b.id) + '"' : ' disabled') +
          ' aria-label="' + esc(App.bedName(b.label, b.tier)) + (leaving ? ' 퇴실 중' : s ? ' 사용 중' : mine ? ' 비어 있음' : '') + '">' +
          // k-bed-in: 칸 크기에 따라 번호와 상태를 위아래 또는 한 줄로 놓는다 (css: @container)
          '<span class="k-bed-in">' +
            '<span class="k-bed-no">' + esc(b.label) + (b.tier ? '<small>' + (b.tier === 'upper' ? '위층' : '아래층') + '</small>' : '') + '</span>' +
            // 이름과 경과 시간을 나눠 둔다: 자리가 모자라면 이름만 "…"로 줄이고 시간은 끝까지 보인다
            '<span class="k-bed-state">' + (s ? (over ? window.icon('clock') : leaving ? window.icon('logout') : '') + '<span class="k-bed-who">' + esc(s.name) + '</span><span class="k-bed-time">' + (leaving ? '퇴실 중 ' + App.elapsedText(s.leaveAt, now) : App.elapsedText(s.startedAt, now)) + '</span>' : mine ? '<span class="k-bed-who">비어 있음</span>' : '') + '</span>' +
          '</span>' +
          (selected === b.id ? '<span class="k-bed-check">' + window.icon('check') + '</span>' : '') +
        '</button>';
      };
      const zone = (z) => {
        const mine = !student || !student.gender || student.gender === z;
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
          '<p class="k-sub">' + (office ? '보건실에 갈 때도, 다 쉬고 돌아왔을 때도 스캔해요.' : '처음 쉬러 왔을 때도, 다 쉬고 나갈 때도 스캔해요.') + '</p>' +
          '<button type="button" class="btn btn-ghost btn-xl" data-go="type">' + window.icon('keypad') + '<span>학번 입력</span></button>' +
        '</section>';
      } else if (s.step === 'off') {
        // 근무 시간 밖: 현황과 퇴실 요청만. 사용 중이 아닌 학생이 스캔하면 안내가 잠깐 흔들린다.
        html = '<section class="k-step k-pick k-off">' +
          '<header class="k-off-head' + (s.nudge ? ' is-nudge' : '') + '">' +
            '<span class="k-off-mark" aria-hidden="true">' + window.icon('moon') + '</span>' +
            '<div class="k-off-text"><h1>지금은 보건 선생님이 안 계세요</h1>' +
              '<p class="k-sub">등록은 <b>강의동 학생지원실</b>에서 하세요.<br>다 쉬었으면 학생증을 스캔하고 퇴실을 요청해요.</p></div>' +
            '<button type="button" class="btn btn-ghost btn-xl k-off-type" data-go="type">' + window.icon('keypad') + '<span>학번 입력</span></button>' +
          '</header>' +
          bedGrid(null) +
        '</section>';
      } else if (s.step === 'type') {
        const buf = s.buf || '';
        html = '<section class="k-step k-type">' +
          '<div class="k-type-left"><h1>학번을 눌러 주세요</h1>' +
            '<p class="k-digits" aria-live="polite" aria-label="입력한 학번 ' + esc(buf) + '">' + [0, 1, 2, 3].map((i) => '<span class="' + (buf[i] ? 'is-on' : '') + '">' + esc(buf[i] || '') + '</span>').join('') + '</p>' +
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
      } else if (s.step === 'confirmLeave') {
        // 보건실: 퇴실 요청 (학생지원실에서 끝난다) · 학생지원실: 바로 퇴실. [아니요]는 처음 화면으로.
        const a = s.student.active;
        html = '<section class="k-step k-confirm">' +
          '<h1>' + (office ? '퇴실하겠습니까?' : '퇴실을 요청하겠습니까?') + '</h1>' +
          '<p class="k-sub"><b>' + esc(s.student.name) + '</b> · ' + esc(App.bedName(a.bedLabel, a.bedTier)) + ' · ' + App.elapsedText(a.startedAt, a.leaveAt || now) + ' 사용</p>' +
          '<div class="k-confirm-actions"><button type="button" class="btn btn-ghost btn-xl" data-go="scan">아니요</button>' +
          '<button type="button" class="btn btn-primary btn-xl" data-act="leave">' + window.icon('check') + '<span>예</span></button></div>' +
        '</section>';
      } else if (s.step === 'done') {
        html = '<section class="k-step k-done">' +
          '<div class="k-done-mark">' + window.icon(s.mark || 'check') + '</div>' +
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

    // 학생지원실에서 퇴실을 끝내는 방법 (보건실 태블릿 안내에 쓴다)
    const OFFICE_HOW = '학생지원실에서 학생증을 스캔하거나 학번을 입력하면 퇴실이 끝나요.';

    // 보건실 태블릿: 이미 퇴실을 요청한 학생이 다시 스캔했을 때
    function leavingAgain(st) {
      return go({ step: 'done', mark: 'logout', title: '이미 퇴실을 요청했어요',
        sub: OFFICE_HOW + ' 요청한 시각 ' + App.hm(st.active.leaveAt) + '.' });
    }

    function lookup(raw) {
      const on = dutyOn();
      let st;
      try { st = Store.lookupStudent(raw, place); }
      catch (e) {
        App.sound.error();
        if (state.step === 'type') return go({ step: 'type', buf: '', error: say(e) });
        return go({ step: 'error', message: say(e), sub: '그래도 안 되면 ' + (office ? '학생지원실' : '보건') + ' 선생님께 말해 주세요.' });
      }
      // 사용 중인 학생: 퇴실 (보건실은 요청, 학생지원실은 바로 퇴실). 근무 시간과 상관없이 된다.
      // 학생지원실 태블릿은 보건실에서 퇴실을 요청한 학생(퇴실 중)도 여기서 퇴실을 끝낸다.
      if (st.active) {
        App.sound.ok();
        if (!office && App.isLeaving(st.active)) return leavingAgain(st);
        return go({ step: 'confirmLeave', student: st });
      }
      // 사용 중이 아닌 학생: 침대 고르기 (보건실 태블릿은 근무 시간에만)
      if (!on) { App.sound.error(); return go({ step: 'off', nudge: true }); }
      const free = Store.board('kiosk').filter((b) => !b.session && (!st.gender || b.zone === st.gender));
      if (!free.length) { App.sound.error(); return go({ step: 'error', message: '지금은 빈 침대가 없습니다.', sub: (office ? '학생지원실' : '보건') + ' 선생님께 말해 주세요.' }); }
      App.sound.ok();
      go({ step: 'pick', student: st, bedId: null });
    }

    // 보건실 태블릿: [예]를 누르면 안내 창. [확인했어요]를 눌러야 퇴실 요청이 저장된다 ("퇴실 중").
    function openLeaveModal() {
      modal.innerHTML =
        '<div class="k-modal-mark" aria-hidden="true">' + window.icon('building') + '</div>' +
        '<h2 id="k-modal-title">학생지원실로 이동하세요</h2>' +
        '<p class="k-sub">강의동 ' + OFFICE_HOW + '</p>' +
        '<button type="button" class="btn btn-primary btn-xl" data-act="leave-ack">' + window.icon('check') + '<span>확인했어요</span></button>';
      modal.showModal();
      modal.querySelector('[data-act=leave-ack]').focus();
      armIdle();
    }

    function ackLeave() {
      try {
        selfWrite = true;
        try { Store.requestLeave({ studentNo: state.student.no, from: place }); }
        finally { selfWrite = false; }
        App.sound.ok();
        go({ step: 'done', mark: 'logout', title: '퇴실을 요청했어요', sub: '학생지원실로 가세요. ' + OFFICE_HOW });
      } catch (e) {
        App.sound.error();
        go({ step: 'error', message: say(e) });
      }
    }

    // 학생지원실 태블릿: [예]를 누르면 바로 퇴실
    function endHere() {
      try {
        selfWrite = true;
        let r;
        try { r = Store.officeEnd(state.student.no); }
        finally { selfWrite = false; }
        App.sound.ok();
        go({ step: 'done', mark: 'logout', title: '퇴실했어요', sub: App.elapsedText(r.startedAt, r.leaveAt || r.endedAt) + ' 사용. 몸조리 잘 해요.' });
      } catch (e) {
        App.sound.error();
        go({ step: 'error', message: say(e) });
      }
    }

    function pressKey(k) {
      if (state.step !== 'type') return;
      let buf = state.buf || '';
      const maxLen = 4; // 학번 4자리
      if (k === 'del') buf = buf.slice(0, -1);
      else if (k === 'ok') return submitBuf();
      else if (/^\d$/.test(k) && buf.length < maxLen) buf += k;
      state = Object.assign({}, state, { buf, error: null });
      draw();
      armIdle();
    }

    function submitBuf() {
      const buf = state.buf || '';
      if (buf.length < 4) { state = Object.assign({}, state, { error: '학번 4자리를 눌러 주세요.' }); draw(); return; }
      lookup(buf);
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
          try { r = Store.registerSession({ studentNo: state.student.no, bedId: state.bedId, source: place }); }
          finally { selfWrite = false; }
          App.sound.ok();
          go({ step: 'done', title: esc(App.bedName(r.bedLabel, r.bedTier)) + '로 가서 쉬세요', sub: office ? '다 쉬면 보건실 태블릿에서 퇴실을 요청해요.' : '다 쉬면 다시 스캔하고 퇴실을 요청해요.' });
        } catch (e) {
          App.sound.error();
          if (e.code === 'BED_TAKEN') { state = Object.assign({}, state, { bedId: null }); draw(); App.toast(say(e), 'error'); }
          else if (e.code === 'OFF_DUTY') go({ step: 'off', nudge: true });
          else go({ step: 'error', message: say(e) });
        }
      }
      if (act && act.dataset.act === 'leave' && state.step === 'confirmLeave') return office ? endHere() : openLeaveModal();
      if (act && act.dataset.act === 'leave-ack' && state.step === 'confirmLeave') return ackLeave();
      keepFocus();
    });

    // 스캐너와 실제 키보드
    function onKey(e) {
      if (document.querySelector('dialog[open]')) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      armIdle();
      if (state.step === 'type') {
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

    // 전체 화면: 버튼을 눌렀을 때만 켠다 (화면의 다른 곳을 눌러서는 켜지지 않는다)
    const kioskEl = root.querySelector('.kiosk');
    function paintFs() {
      kioskEl.classList.toggle('is-fs', !!fsElement());
      kioskEl.classList.toggle('no-fs', !fsSupported());
    }
    root.querySelector('[data-fs]').addEventListener('click', fsEnter);
    document.addEventListener('fullscreenchange', paintFs);
    document.addEventListener('webkitfullscreenchange', paintFs);
    paintFs();

    // 숨은 관리 메뉴: 보건실 글자를 2초 길게 누르면 로그아웃·전체 화면 끝내기
    const brand = root.querySelector('.k-brand');
    let hold = null;
    brand.addEventListener('pointerdown', () => { hold = setTimeout(adminMenu, 2000); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((t) => brand.addEventListener(t, () => clearTimeout(hold)));
    async function adminMenu() {
      const fsOn = !!fsElement();
      const v = await App.dialog({
        title: '관리 메뉴',
        body: '<p class="sheet-text">태블릿에서 로그아웃' + (fsOn ? '하거나 전체 화면을 끝내' : '하') + '려면 ' + (office ? '학생지원실, 보건 선생님 또는 관리자' : '보건 선생님 또는 관리자') + ' 비밀번호를 입력해 주세요.</p>' +
          '<label class="field"><span>비밀번호</span><input name="pw" type="password" autocomplete="current-password" autofocus></label><p class="field-error" hidden>비밀번호가 맞지 않습니다.</p>',
        actions: [{ label: '취소', value: '__cancel' }]
          .concat(fsOn ? [{ label: '전체 화면 끝내기', value: 'fs-off', kind: 'ghost', icon: 'minimize' }] : [])
          .concat([{ label: '로그아웃', value: 'out', kind: 'danger', icon: 'logout' }]),
        onSubmit(dlg) {
          const pw = dlg.querySelector('[name=pw]').value;
          if (!Store.verifyPassword(office ? ['nurse', 'admin', 'support'] : ['nurse', 'admin'], pw)) { dlg.querySelector('.field-error').hidden = false; return false; }
        },
      });
      if (v === 'fs-off' || v === 'out') fsExit();
      if (v === 'out') ctx.logout();
      keepFocus();
    }

    go({ step: 'scan' });

    return {
      refresh() {
        // 다른 화면에서 바뀐 내용을 반영한다. 입력 중인 단계는 건드리지 않는다.
        // 근무 일정이 바뀌어 근무 시간이 끝났으면 입력 중이어도 현황 화면으로 바꾼다.
        topCounts();
        App.watchLeave(); // 퇴실 중으로 10분이 지난 학생은 잔디로 알린다 (열린 화면 중 한 곳만 보낸다)
        if (syncDuty()) return;
        if (selfWrite || modal.open) return; // 안내 창이 열려 있으면 화면을 바꾸지 않는다
        if (state.step === 'off') draw();
        else if (state.step === 'pick') {
          const still = state.bedId && Store.board('kiosk').find((b) => b.id === state.bedId && !b.session);
          if (state.bedId && !still) { state = Object.assign({}, state, { bedId: null }); App.toast('고른 침대를 방금 다른 학생이 골랐어요. 다시 골라 주세요.', 'error'); }
          draw();
        } else if (state.step === 'confirmLeave' && state.student) {
          // 다른 화면에서 퇴실 처리(보건실 태블릿은 퇴실 요청도)가 되었으면 처음 화면으로
          const fresh = Store.lookupStudent(state.student.no, place);
          if (!fresh.active || (!office && App.isLeaving(fresh.active))) go({ step: 'scan' }); else { state = Object.assign({}, state, { student: fresh }); draw(); }
        }
      },
      tick() {
        if (syncDuty()) { topCounts(); return; }
        if (state.step === 'pick' || state.step === 'off') this.refresh(); else { topCounts(); App.watchLeave(); }
      },
      destroy() {
        clearTimeout(idleTimer); clearTimeout(stepTimer);
        closeModal();
        document.removeEventListener('keydown', onKey);
        document.removeEventListener('pointerdown', onPointer);
        document.removeEventListener('fullscreenchange', paintFs);
        document.removeEventListener('webkitfullscreenchange', paintFs);
      },
    };
  }

  App.mountKiosk = mount;
})();
