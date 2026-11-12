/* 침대 현황판: 보건 선생님·학생지원실·관리자 화면이 함께 쓴다 */
(function () {
  'use strict';
  const App = window.App;
  const { esc, $, $$ } = App;
  const Store = window.Store;

  const memory = new WeakMap(); // 컨테이너별로 이전 상태를 기억해 움직임을 정한다

  function summary(board, now) {
    const s = { total: board.length, free: 0, freeM: 0, freeF: 0, busy: 0, over: 0, totalM: 0, totalF: 0 };
    board.forEach((b) => {
      if (b.zone === 'M') s.totalM++; else s.totalF++;
      if (!b.session) { s.free++; if (b.zone === 'M') s.freeM++; else s.freeF++; }
      else { s.busy++; if (App.isOver(b.session, now)) s.over++; }
    });
    return s;
  }

  function slotHTML(b, opts, now, motion) {
    const s = b.session;
    const tierCls = b.tier ? ' is-tier tier-' + b.tier : '';
    const tierWord = b.tier ? (b.tier === 'upper' ? '위층' : '아래층') : '';
    const no = '<span class="slot-no" aria-hidden="true">' + esc(b.label.replace('번', '')) + '</span>';
    if (!s) {
      const canRegister = opts.mode === 'nurse' || opts.mode === 'support';
      return '<article class="slot is-empty' + tierCls + '" data-bed="' + b.id + '">' + no +
        '<p class="slot-empty"><span class="sr">' + esc(App.bedName(b.label, b.tier)) + ' </span>' + (tierWord ? '<span class="slot-tier">' + tierWord + '</span>' : '') + '비어 있음</p>' +
        (canRegister ? '<button class="btn btn-quiet slot-add" data-act="register-here" data-bed="' + b.id + '" aria-label="' + esc(App.bedName(b.label, b.tier)) + '에 등록">' + window.icon('plus') + '<span>여기에 등록</span></button>' : '') +
        '</article>';
    }
    const over = App.isOver(s, now);
    const cls = ['slot', 'is-busy'];
    if (b.tier) cls.push('is-tier', 'tier-' + b.tier);
    if (over) cls.push('is-over');
    if (motion.added.has(s.id)) cls.push('snap-in');
    if (motion.flipped.has(s.id)) cls.push('flip');
    const due = App.dueAt(s);
    const leftMin = Math.ceil((due - now) / App.MIN);
    const overMin = Math.floor((now - due) / App.MIN);
    // 현황판 정보 줄: "학생지원실이 17:28에 등록"처럼 누가·언제 등록했는지 한 줄 (2층 침대도 같다).
    // 학번은 이름 옆, 연장 횟수는 침대 번호 옆에 둔다.
    const showNo = opts.mode === 'nurse' || opts.mode === 'admin';
    const src = opts.mode !== 'kiosk' && App.SOURCE[s.source];
    const at = App.hm(s.startedAt);
    const regText = (src ? App.josa(src, '이', '가') + ' ' : '') + at + '에 등록';
    // 누가(등록 위치)와 시각은 굵게: "<b>학생지원실</b>이 <b>18:00</b>에 등록"
    // 관리자 현황판에서는 시각을 눌러 등록 시간을 고칠 수 있다
    const atHTML = opts.admin
      ? '<button type="button" class="time-edit" data-act="edit-start" data-id="' + s.id + '" title="등록 시간 수정" aria-label="' + esc(s.name) + ' 학생 등록 시간 ' + at + ' 수정"><b>' + at + '</b>' + window.icon('edit') + '</button>'
      : '<b>' + at + '</b>';
    const regHTML = (src ? '<b>' + esc(src) + '</b>' + esc(App.josa(src, '이', '가').slice(src.length)) + ' ' : '') + atHTML + '에 등록';

    let actions = '';
    if (opts.mode === 'nurse') {
      actions = '<div class="tag-actions">' +
        '<button class="btn btn-primary" data-act="extend" data-id="' + s.id + '">' + window.icon('plus') + '<span>연장</span></button>' +
        '<span class="spacer"></span>' +
        '<button class="btn btn-ghost" data-act="end" data-id="' + s.id + '">퇴실</button>' +
        '<button class="icon-btn btn-ghost" data-act="more" data-id="' + s.id + '" aria-label="' + esc(b.label) + ' 침대 더보기">' + window.icon('more') + '</button>' +
        '</div>';
    } else if (opts.mode === 'support') {
      actions = '<div class="tag-actions"><span class="spacer"></span>' +
        '<button class="btn btn-ghost btn-sm" data-act="cancel" data-id="' + s.id + '">' + window.icon('undo') + '<span>등록 취소</span></button></div>';
    }

    return '<article class="' + cls.join(' ') + '" data-bed="' + b.id + '" data-session="' + s.id + '">' + no +
      '<div class="tag">' +
        '<div class="tag-top"><span class="tag-bed">' + esc(b.label) + ' 침대</span>' +
          (s.extensionCount ? '<span class="chip chip-ext">연장 ' + s.extensionCount + '회</span>' : '') +
        '</div>' +
        '<h3 class="tag-name"><span class="tag-who">' + esc(s.name) + '</span>' +
          (showNo && s.studentNo ? '<span class="tag-no"><span class="sr">학번 </span>' + esc(s.studentNo) + '</span>' : '') + '</h3>' +
        '<p class="tag-meta" title="' + esc(regText) + '"><span class="meta-item">' + regHTML + '</span></p>' +
        (over ? '<p class="tag-alert">' + window.icon('clock') + '<span>' + App.overLabel(s) + '</span></p>' : '') +
        '<p class="tag-time" aria-label="경과 시간 ' + App.elapsedText(s.startedAt, now) + '">' + App.elapsedHTML(s.startedAt, now) + '</p>' +
        '<p class="tag-left">' + (over ? App.hm(due) + '보다 ' + App.durationText(overMin) + ' 더 사용' : App.hm(due) + '까지 · 남은 시간 ' + App.durationText(leftMin)) + '</p>' +
        actions +
      '</div>' +
    '</article>';
  }

  function zoneHTML(zone, beds, opts, now, motion) {
    const used = beds.filter((b) => b.session).length;
    const cells = App.groupBeds(beds);
    const cols = cells.length <= 4 ? 2 : cells.length <= 6 ? 3 : 4;
    return '<section class="zone zone-' + zone + '" aria-label="' + App.ZONE[zone] + ' 침대">' +
      '<header class="zone-head"><h2>' + App.ZONE[zone] + ' 침대</h2>' +
      '<p class="zone-count"><b>' + (beds.length - used) + '</b> 비어 있음 <span class="dot">·</span> ' + beds.length + '자리 중 ' + used + '자리 사용</p></header>' +
      '<div class="slots" style="--cols:' + cols + ';--rows:' + Math.ceil(cells.length / cols) + '">' +
        cells.map((c) => c.type === 'single'
          ? slotHTML(c.bed, opts, now, motion)
          : '<div class="bunk" role="group" aria-label="2층 침대: ' + esc(c.upper.label) + ' 위층, ' + esc(c.lower.label) + ' 아래층">' +
              '<span class="bunk-label">' + window.icon('bed') + '2층 침대</span>' +
              slotHTML(c.upper, opts, now, motion) + slotHTML(c.lower, opts, now, motion) +
            '</div>').join('') +
      '</div>' +
    '</section>';
  }

  // container에 현황판을 그린다. opts.mode: nurse | support | admin | kiosk
  function render(container, opts) {
    const now = Store.now();
    const board = Store.board(opts.mode === 'kiosk' ? 'kiosk' : opts.mode === 'admin' ? 'admin' : opts.mode);
    const prev = memory.get(container);
    const ids = new Set(board.filter((b) => b.session).map((b) => b.session.id));
    const overIds = new Set(board.filter((b) => b.session && App.isOver(b.session, now)).map((b) => b.session.id));

    // 바뀐 것이 없으면 다시 그리지 않는다 (같은 변경 알림이 두 번 와도 자석 움직임이 끊기지 않게)
    // 초과로 넘어간 침대도 넣어 둔다 (분이 바뀌지 않아도 초과 순간을 놓치지 않게)
    const sig = opts.mode + '|' + Math.floor(now / App.MIN) + '|' + [...overIds].join(',') + '|' + JSON.stringify(board.map((b) => [b.id, b.label, b.zone, b.tier,
      b.session && [b.session.id, b.session.name, b.session.startedAt, b.session.dueAt, b.session.extensionCount]]));
    if (prev && prev.sig === sig && !opts._afterLift) return summary(board, now);

    // 퇴실·취소된 자석은 먼저 떼어 낸 뒤 다시 그린다
    if (prev && !opts._afterLift) {
      const removed = [...prev.ids].filter((id) => !ids.has(id));
      const els = removed.map((id) => container.querySelector('[data-session="' + id + '"]')).filter(Boolean);
      if (els.length && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        els.forEach((el) => el.classList.add('lift-off'));
        setTimeout(() => render(container, Object.assign({}, opts, { _afterLift: true })), 260);
        return summary(board, now);
      }
    }

    const motion = {
      added: new Set(prev ? [...ids].filter((id) => !prev.ids.has(id)) : []),
      flipped: new Set(prev ? [...overIds].filter((id) => !prev.over.has(id)) : []),
    };

    if (prev && motion.flipped.size && opts.onOver) {
      board.filter((b) => b.session && motion.flipped.has(b.session.id)).forEach((b) => opts.onOver(b));
    }

    const M = board.filter((b) => b.zone === 'M');
    const F = board.filter((b) => b.zone === 'F');
    container.innerHTML = zoneHTML('M', M, opts, now, motion) + zoneHTML('F', F, opts, now, motion);
    memory.set(container, { ids, over: overIds, sig });
    return summary(board, now);
  }

  // ── 침대 고르기 대화상자 (보건 선생님·학생지원실) ───────────
  // 침대마다 배치도 위치(row, col)가 있으면 실제 방 배치대로 놓는다.
  // 침대가 하나도 없는 칸(열)은 통로로 비워 둔다. 너비는 침대 반 칸(--aisle-col).
  // 위치가 빠지거나 겹치면 현황판 순서대로 2열.
  function pickLayout(beds) {
    const seen = new Set();
    const ok = beds.length && beds.every((b) => {
      const k = b.row + ':' + b.col;
      if (!b.row || !b.col || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    return ok ? { cols: Math.max.apply(null, beds.map((b) => b.col)) } : null;
  }

  function pickBed({ student, title, confirmLabel, exceptSession }) {
    const now = Store.now();
    const board = Store.board('nurse');
    const zoneOk = (b) => !student || !student.gender || b.zone === student.gender;
    const layouts = { M: pickLayout(board.filter((b) => b.zone === 'M')), F: pickLayout(board.filter((b) => b.zone === 'F')) };
    const widthOf = (zone) => (layouts[zone] ? layouts[zone].cols : 2);
    const col = (zone) => {
      const layout = layouts[zone];
      let beds = board.filter((b) => b.zone === zone);
      let tracks = '';
      if (layout) {
        beds = beds.slice().sort((a, b) => a.row - b.row || a.col - b.col); // 화살표 키 이동도 배치 순서대로
        const used = new Set(beds.map((b) => b.col));
        const t = [];
        for (let c = 1; c <= layout.cols; c++) t.push(used.has(c) ? 'minmax(0, 1fr)' : 'var(--aisle-col)');
        tracks = ' style="--pick-tracks: ' + t.join(' ') + '"';
      }
      const place = (b) => (layout ? ' style="grid-row: ' + b.row + '; grid-column: ' + b.col + '"' : '');
      return '<fieldset class="pick-zone"><legend>' + App.ZONE[zone] + ' 침대</legend><div class="pick-grid' + (layout ? ' is-map' : '') + '"' + tracks + '>' +
        beds.map((b) => {
          const busy = b.session && b.session.id !== exceptSession;
          const off = busy || !zoneOk(b);
          return '<label class="pick-bed' + (busy ? ' is-busy' : '') + (off ? ' is-off' : '') + '"' + place(b) + '>' +
            '<input type="radio" name="bed" value="' + b.id + '"' + (off ? ' disabled' : '') + '>' +
            '<span class="pick-no">' + esc(b.label) + (b.tier ? '<small>2층 ' + (b.tier === 'upper' ? '위' : '아래') + '</small>' : '') + '</span>' +
            '<span class="pick-state">' + (busy ? '<span>' + esc(b.session.name) + '</span><span>' + App.elapsedText(b.session.startedAt, now) + '</span>' : !zoneOk(b) ? App.ZONE[b.zone] + ' 침대' : '비어 있음') + '</span>' +
          '</label>';
        }).join('') + '</div></fieldset>';
    };
    const who = student
      ? '<p class="pick-who"><b>' + esc(student.name) + '</b> ' + esc([App.classOf(student), student.no].filter(Boolean).join(' · ')) + '</p>'
      : '';
    return App.dialog({
      title: title || '침대 고르기',
      wide: true,
      className: 'sheet-pick',
      body: who + '<div class="pick-cols" style="--pick-cols: minmax(0, ' + widthOf('M') + 'fr) minmax(0, ' + widthOf('F') + 'fr)">' + col('M') + col('F') + '</div>',
      actions: [
        { label: '취소', value: '__cancel' },
        { label: confirmLabel || '등록', value: 'ok', kind: 'primary', disabled: true },
      ],
      onMount(dlg) {
        const ok = dlg.querySelector('.sheet-foot .btn-primary');
        dlg.addEventListener('change', () => {
          const sel = dlg.querySelector('input[name=bed]:checked');
          ok.disabled = !sel;
          if (sel) { const sb = board.find((b) => b.id === sel.value); ok.querySelector('span').textContent = App.bedName(sb.label, sb.tier) + '로 ' + (confirmLabel || '등록'); }
          ok.value = sel ? sel.value : 'ok';
        });
        const firstFree = dlg.querySelector('input[name=bed]:not([disabled])');
        if (firstFree) firstFree.focus();
      },
    }).then((v) => (v && v !== 'ok' ? v : null));
  }

  // ── 직원 등록 흐름 ─────────────────────────────────────────
  async function staffRegister(raw, role, presetBed) {
    const source = role === 'admin' ? 'nurse' : role;
    let student;
    try {
      student = Store.lookupStudent(raw, role === 'admin' ? 'nurse' : role);
    } catch (e) {
      if (e.code === 'NOT_FOUND' && (role === 'nurse' || role === 'admin')) {
        const no = Store.normalizeStudentNo(raw);
        const name = await App.dialog({
          title: '명단에 없는 학번',
          body: '<p class="sheet-text">학번 ' + esc(no) + '은(는) 명단에 없습니다. 이름을 적으면 임시로 등록합니다.</p>' +
            '<label class="field"><span>이름</span><input name="temp" autocomplete="off" required autofocus></label>' +
            '<fieldset class="field seg"><legend>침대 구역</legend>' +
            '<label><input type="radio" name="tz" value="M" checked><span>남학생</span></label>' +
            '<label><input type="radio" name="tz" value="F"><span>여학생</span></label></fieldset>',
          actions: [{ label: '취소', value: '__cancel' }, { label: '다음', value: 'next', kind: 'primary' }],
          onSubmit(dlg) {
            const input = dlg.querySelector('input[name=temp]');
            if (!input.value.trim()) { input.focus(); return false; }
            return JSON.stringify({ name: input.value.trim(), zone: dlg.querySelector('input[name=tz]:checked').value });
          },
        });
        if (!name) return false;
        const t = JSON.parse(name);
        student = { no, name: t.name, gender: t.zone, temp: true };
      } else {
        App.sound.error();
        App.toast(e.message, 'error');
        return false;
      }
    }
    if (student.active) {
      App.sound.error();
      App.toast(student.name + ' 학생은 이미 ' + student.active.bedLabel + ' 침대를 사용 중입니다.', 'error');
      return false;
    }
    const board = Store.board('nurse');
    const free = board.filter((b) => !b.session && (!student.gender || b.zone === student.gender));
    if (!free.length) {
      App.sound.error();
      App.toast('지금은 빈 침대가 없습니다.', 'error');
      return false;
    }
    let bedId = presetBed;
    if (bedId) {
      const bed = board.find((b) => b.id === bedId);
      if (student.gender && bed && bed.zone !== student.gender) {
        App.toast(student.name + ' 학생은 ' + App.ZONE[student.gender] + ' 침대를 써야 합니다.', 'error');
        bedId = null;
      }
    }
    if (!bedId) bedId = await pickBed({ student, title: student.name + ' 학생 침대 고르기' });
    if (!bedId) return false;
    try {
      const s = Store.registerSession({ studentNo: student.no, bedId, source, tempName: student.temp ? student.name : undefined });
      App.sound.ok();
      App.toast(student.name + ' 학생 · ' + App.bedName(s.bedLabel, s.bedTier) + ' 배정');
      return true;
    } catch (e) {
      App.sound.error();
      App.toast(e.message, 'error');
      return false;
    }
  }

  // ── 등록 시간 수정 (관리자) ────────────────────────────────
  async function editStart(b) {
    const s = b.session;
    const two = (n) => String(n).padStart(2, '0');
    const at = (ts) => { const d = new Date(ts); return two(d.getHours()) + ':' + two(d.getMinutes()); };
    // "HH:MM" → 원래 등록한 날의 그 시각
    const toTs = (v) => { const m = /^(\d{2}):(\d{2})$/.exec(v || ''); if (!m) return null; const d = new Date(s.startedAt); d.setHours(Number(m[1]), Number(m[2]), 0, 0); return d.getTime(); };
    const dueFor = (ts) => App.dueAt(s) - Store.nextHour(s.startedAt) + Store.nextHour(ts);
    const v = await App.dialog({
      title: '등록 시간 수정',
      className: 'sheet-confirm',
      body: '<p class="sheet-text"><b>' + esc(App.bedName(b.label, b.tier)) + '</b> ' + esc(s.name) + ' 학생의 등록 시간을 고칩니다. 끝나는 시각은 새 등록 시간의 다음 정각으로 다시 정해집니다' + (s.extensionCount ? '(연장 ' + s.extensionCount + '회 포함)' : '') + '.</p>' +
        '<label class="field"><span>등록 시간</span><input name="t" type="time" value="' + at(s.startedAt) + '" max="' + at(Store.now()) + '" required autofocus></label>' +
        '<dl class="facts"><div><dt>끝나는 시각</dt><dd data-due></dd></div></dl>' +
        '<p class="field-error" role="alert" hidden></p>',
      actions: [{ label: '돌아가기', value: '__cancel' }, { label: '저장', value: 'ok', kind: 'primary' }],
      onMount(dlg) {
        const input = dlg.querySelector('input[name=t]');
        const due = dlg.querySelector('[data-due]');
        const paint = () => {
          const ts = toTs(input.value);
          const next = ts ? dueFor(ts) : null;
          due.innerHTML = App.hm(App.dueAt(s)) + ' → <b>' + (next ? App.hm(next) : '–') + '</b>' + (next && next <= Store.now() ? ' (시간 초과)' : '');
        };
        input.addEventListener('input', paint);
        paint();
      },
      onSubmit(dlg) {
        const err = dlg.querySelector('.field-error');
        const ts = toTs(dlg.querySelector('input[name=t]').value);
        const say = (m) => { err.hidden = false; err.textContent = m; return false; };
        if (!ts) return say('등록 시간을 입력해 주세요.');
        if (ts > Store.now()) return say('지금보다 늦은 시각으로는 바꿀 수 없습니다.');
        return 'ts:' + ts;
      },
    });
    if (!v) return;
    const ts = Number(v.slice(3));
    if (ts === s.startedAt) return;
    const r = Store.staffSetStart(s.id, ts, 'admin');
    App.toast(s.name + ' 학생 등록 시간 수정: ' + App.hm(r.startedAt) + ' 등록, ' + App.hm(r.dueAt) + '까지');
  }

  // ── 카드 동작 ──────────────────────────────────────────────
  function bindActions(container, role) {
    const actor = role;
    container.addEventListener('click', async (ev) => {
      const btn = ev.target.closest('[data-act]');
      if (!btn) return;
      const id = btn.dataset.id;
      const find = () => Store.board('nurse').find((b) => b.session && b.session.id === id);
      try {
        if (btn.dataset.act === 'extend') {
          const b = find();
          if (!b) return;
          const st = Store.settings();
          const s = b.session;
          const endAt = App.dueAt(s);
          const atMax = s.extensionCount >= st.maxExtensions;
          const go = await App.dialog({
            title: '연장 확인',
            className: 'sheet-confirm',
            body: '<p class="sheet-text"><b>' + esc(App.bedName(b.label, b.tier)) + '</b> ' + esc(s.name) + ' 학생의 사용 시간을 <b>' + st.extendMinutes + '분</b> 연장할까요?</p>' +
              '<dl class="facts">' +
                '<div><dt>지금까지</dt><dd>' + App.elapsedText(s.startedAt, Store.now()) + ' 사용</dd></div>' +
                '<div><dt>끝나는 시각</dt><dd>' + App.hm(endAt) + ' → <b>' + App.hm(endAt + st.extendMinutes * App.MIN) + '</b></dd></div>' +
                '<div><dt>연장 횟수</dt><dd>' + s.extensionCount + '회 → <b>' + (s.extensionCount + 1) + '회</b></dd></div>' +
              '</dl>' +
              (atMax ? '<p class="sheet-warn">' + window.icon('alert') + '<span>최대 연장 횟수(' + st.maxExtensions + '회)를 이미 채웠습니다. 그래도 연장할 수 있습니다.</span></p>' : ''),
            actions: [
              { label: '돌아가기', value: '__cancel' },
              { label: st.extendMinutes + '분 연장', value: 'yes', kind: 'primary', icon: 'plus' },
            ],
          });
          if (go !== 'yes') return;
          Store.staffExtend(id, actor);
          App.toast(s.name + ' 학생 ' + st.extendMinutes + '분 연장');
        } else if (btn.dataset.act === 'end') {
          const b = find();
          if (!b) return;
          const ok = await App.confirmDialog('퇴실 처리', b.label + ' 침대 ' + b.session.name + ' 학생을 퇴실 처리할까요?', '퇴실 처리', 'danger');
          if (!ok) return;
          Store.staffEnd(id, actor);
          App.toast(b.session.name + ' 학생 퇴실');
        } else if (btn.dataset.act === 'cancel') {
          const b = find();
          if (!b) return;
          const ok = await App.confirmDialog('등록 취소', b.label + ' 침대 ' + b.session.name + ' 학생의 등록을 취소할까요? 기록에는 "취소"로 남습니다.', '등록 취소', 'danger');
          if (!ok) return;
          Store.staffCancel(id, actor);
          App.toast('등록을 취소했습니다');
        } else if (btn.dataset.act === 'more') {
          const b = find();
          if (!b) return;
          const choice = await App.dialog({
            title: b.label + ' 침대 · ' + b.session.name,
            body: '<div class="menu-list">' +
              '<button class="menu-item" value="move">' + window.icon('move') + '<span><b>침대 이동</b><small>다른 빈 침대로 옮깁니다</small></span></button>' +
              '<button class="menu-item is-danger" value="cancel">' + window.icon('undo') + '<span><b>등록 취소</b><small>잘못 등록한 경우. 기록에 "취소"로 남습니다</small></span></button>' +
              '</div>',
          });
          if (choice === 'move') {
            const to = await pickBed({ student: { name: b.session.name, gender: b.session.gender, no: b.session.studentNo, grade: b.session.grade, classNo: b.session.classNo }, title: b.session.name + ' 학생 침대 이동', confirmLabel: '이동', exceptSession: id });
            if (!to || to === b.id) return;
            Store.staffMove(id, to, actor);
            App.toast(b.session.name + ' 학생 침대 이동');
          } else if (choice === 'cancel') {
            const ok = await App.confirmDialog('등록 취소', b.session.name + ' 학생의 등록을 취소할까요?', '등록 취소', 'danger');
            if (ok) { Store.staffCancel(id, actor); App.toast('등록을 취소했습니다'); }
          }
        } else if (btn.dataset.act === 'edit-start') {
          const b = find();
          if (!b) return;
          await editStart(b);
        } else if (btn.dataset.act === 'register-here') {
          const bedId = btn.dataset.bed;
          const no = await App.dialog({
            title: '여기에 등록',
            body: '<label class="field"><span>학번</span><input name="no" inputmode="numeric" autocomplete="off" maxlength="10" autofocus placeholder="학번 스캔 또는 입력"></label>',
            actions: [{ label: '취소', value: '__cancel' }, { label: '다음', value: 'next', kind: 'primary' }],
            onSubmit(dlg) {
              const v = dlg.querySelector('input[name=no]').value;
              if (!v.trim()) return false;
              return 'no:' + v;
            },
          });
          if (no && no.startsWith('no:')) await staffRegister(no.slice(3), role, bedId);
        }
      } catch (e) {
        App.sound.error();
        App.toast(e.message, 'error');
      }
    });
  }

  Object.assign(App, { renderBoard: render, boardSummary: summary, pickBed, staffRegister, bindBoardActions: bindActions });
})();
