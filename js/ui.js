/* 공통 UI 도구: 형식 맞추기, 대화상자, 알림, 소리 */
(function () {
  'use strict';
  const App = (window.App = window.App || {});
  const MIN = 60 * 1000;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (sel, el) => (el || document).querySelector(sel);
  const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));

  function elapsedParts(startedAt, now) {
    const mins = Math.max(0, Math.floor((now - startedAt) / MIN));
    return { h: Math.floor(mins / 60), m: mins % 60, total: mins };
  }

  function elapsedText(startedAt, now) {
    const p = elapsedParts(startedAt, now);
    return p.h ? p.h + '시간 ' + p.m + '분' : p.m + '분';
  }

  function elapsedHTML(startedAt, now) {
    const p = elapsedParts(startedAt, now);
    return p.h
      ? '<span class="num">' + p.h + '</span><span class="unit">시간</span> <span class="num">' + p.m + '</span><span class="unit">분</span>'
      : '<span class="num">' + p.m + '</span><span class="unit">분</span>';
  }

  function durationText(mins) {
    const h = Math.floor(mins / 60), m = mins % 60;
    return h ? h + '시간' + (m ? ' ' + m + '분' : '') : m + '분';
  }

  function hm(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  // 끝나는 시각: 등록한 뒤 다음 정각 + 연장 시간. 예전 데이터는 등록 + 허용 분.
  function dueAt(s) { return s.dueAt || s.startedAt + (s.allowedMinutes || 60) * MIN; }

  // 퇴실을 요청한 학생(퇴실 중)은 사용 시간이 지나도 초과로 보지 않는다
  function isOver(s, now) { return !!s && !s.leaveAt && now >= dueAt(s); }

  function overLabel(s) { return s.extensionCount ? '연장 시간 초과' : '사용 시간 초과'; }

  // 퇴실 중: 학생이 태블릿에서 퇴실을 요청했고, 학생지원실의 퇴실 확인을 기다린다.
  // 정한 시간(10분)이 지나도 확인되지 않으면 늦음 → 잔디로 알린다.
  function isLeaving(s) { return !!(s && s.leaveAt); }
  function isLeaveLate(s, now) { return isLeaving(s) && now - s.leaveAt >= window.Store.LEAVE_ALERT_MINUTES * MIN; }
  const LEAVE_FROM = { kiosk: '보건실 태블릿', office: '학생지원실 태블릿' };

  // 요일 이름 (근무 일정 설정에서 쓴다)
  const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

  const SOURCE = { nurse: '보건 선생님', kiosk: '보건실 태블릿', office: '학생지원실 태블릿', support: '학생지원실', assistant: '보건 조교', admin: '관리자' };
  const ZONE = { M: '남학생', F: '여학생' };
  const ROLE = { admin: '관리자', nurse: '보건 선생님', kiosk: '보건실 학생 태블릿', support: '학생지원실', office: '학생지원실 학생 태블릿' };

  const TIER = { lower: '2층 침대 아래층', upper: '2층 침대 위층' };

  // 받침에 따라 조사를 붙인다: josa('학생지원실', '이', '가') → '학생지원실이', josa('관리자', '이', '가') → '관리자가'
  function josa(word, withFinal, withoutFinal) {
    const w = String(word || '');
    const c = w.charCodeAt(w.length - 1);
    if (!(c >= 0xac00 && c <= 0xd7a3)) return w + withFinal + '(' + withoutFinal + ')';
    return w + ((c - 0xac00) % 28 ? withFinal : withoutFinal);
  }

  // "5번" + upper → "5번 침대(2층 위)"
  function bedName(label, tier) {
    return label + ' 침대' + (tier ? '(2층 ' + (tier === 'upper' ? '위' : '아래') + ')' : '');
  }

  // 구역의 침대 목록을 칸 단위로 묶는다. 붙어 있는 아래층·위층은 2층 침대 한 칸이 된다.
  function groupBeds(beds) {
    const cells = [];
    for (let i = 0; i < beds.length; i++) {
      const b = beds[i], n = beds[i + 1];
      if (b.tier && n && n.tier && n.tier !== b.tier) {
        cells.push({ type: 'bunk', upper: b.tier === 'upper' ? b : n, lower: b.tier === 'lower' ? b : n });
        i++;
      } else cells.push({ type: 'single', bed: b });
    }
    return cells;
  }

  // 반·그룹 표시: "3" → "3반", "A" → "A그룹". 글자로 된 값("3반", "햇살")은 그대로. → "3반 · A그룹"
  function classOf(s) {
    if (!s) return '';
    const label = (v, unit) => {
      const t = String(v == null ? '' : v).trim();
      return !t ? '' : /^[0-9A-Za-z]+$/.test(t) ? t + unit : t;
    };
    return [label(s.classNo, '반'), label(s.group, '그룹')].filter(Boolean).join(' · ');
  }

  // ── 알림 (토스트) ───────────────────────────────────────────
  function toast(message, kind) {
    let region = $('#toasts');
    if (!region) {
      region = document.createElement('div');
      region.id = 'toasts';
      region.className = 'toasts';
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', 'polite');
      document.body.appendChild(region);
    }
    const el = document.createElement('div');
    el.className = 'toast' + (kind ? ' is-' + kind : '');
    el.innerHTML = window.icon(kind === 'error' ? 'alert' : 'check') + '<span>' + esc(message) + '</span>';
    region.appendChild(el);
    setTimeout(() => { el.classList.add('is-leaving'); setTimeout(() => el.remove(), 300); }, kind === 'error' ? 5200 : 3200);
  }

  // ── 사용 시간 초과 알림 (화면 오른쪽 아래 + 윈도우 알림) ─────────
  // 침대 사용 시간이 지나는 순간 띄운다. 같은 순간에 여러 명이 넘으면 한 알림에 모아서 보여 준다.
  // items: [{ label: '10번', name: '김민준', due: 시각 }]
  const OVER_LIST_MAX = 5;
  function overText(label, name, due) {
    return label + ' 침대 ' + name + ' 학생의 사용 시간(' + hm(due) + '까지)이 지났습니다';
  }
  function overContent(items) {
    if (items.length === 1) return { title: '사용 시간 초과', lines: [overText(items[0].label, items[0].name, items[0].due)] };
    const lines = items.slice(0, OVER_LIST_MAX).map((it) => it.label + ' 침대 ' + it.name + ' · ' + hm(it.due) + '까지');
    if (items.length > OVER_LIST_MAX) lines.push('외 ' + (items.length - OVER_LIST_MAX) + '명');
    return { title: '사용 시간 초과 · ' + items.length + '명', lines };
  }
  function overAlert(items, opts) {
    const o = opts || {};
    const c = overContent(items);
    let region = $('#over-alerts');
    if (!region) {
      region = document.createElement('div');
      region.id = 'over-alerts';
      region.className = 'over-alerts';
      region.setAttribute('aria-live', 'assertive');
      document.body.appendChild(region);
    }
    const el = document.createElement('div');
    el.className = 'over-alert' + (o.preview ? ' is-preview' : '');
    el.innerHTML = window.icon('clock') +
      '<div class="over-alert-text">' +
        (o.preview ? '<em class="over-alert-tag">테스트</em>' : '') +
        '<b>' + esc(c.title) + '</b>' + c.lines.map((l) => '<span class="over-alert-msg">' + esc(l) + '</span>').join('') +
        (o.note ? '<small>' + esc(o.note) + '</small>' : '') +
      '</div>';
    region.appendChild(el);
    setTimeout(() => { el.classList.add('is-leaving'); setTimeout(() => el.remove(), 300); }, 6000);
  }

  // 윈도우(시스템) 알림. 인터넷 주소(https)로 연 화면에서, 이 PC에서 "허용"했을 때만 뜬다.
  // → 'file'(파일로 열어 쓸 수 없음) | 'unsupported' | 'default'(아직 묻지 않음) | 'granted' | 'denied'
  function notifyState() {
    if (location.protocol === 'file:') return 'file';
    if (!('Notification' in window) || !window.isSecureContext) return 'unsupported';
    return Notification.permission;
  }
  async function askNotify() {
    try { return await Notification.requestPermission(); } catch (e) { return notifyState(); }
  }
  function systemNotify(items, opts) {
    const o = opts || {};
    if (notifyState() !== 'granted') return false;
    const c = overContent(items);
    try {
      const n = new Notification((o.preview ? '[테스트] ' : '') + c.title, {
        body: c.lines.join('\n'),
        // 이름표(tag)가 같은 알림은 새로 뜨지 않고 기존 알림을 조용히 바꾼다.
        // 그래서 같은 사건(같은 학생·같은 끝 시각)일 때만 같은 이름표를 쓴다 (여러 탭에서 겹칠 때 하나로)
        tag: o.tag || 'over-' + Date.now(),
        silent: !o.sound, // 알림음이 켜져 있을 때만 윈도우 알림 소리도 낸다
      });
      n.onclick = () => { window.focus(); n.close(); };
      return true;
    } catch (e) { return false; } // 일부 휴대폰 브라우저는 이 방식의 알림을 지원하지 않는다
  }

  // 실제 초과 알림: 화면 안 알림은 늘, 윈도우 알림은 이 화면을 보고 있지 않을 때(다른 탭·최소화·다른 프로그램)
  function alertOver(items, opts) {
    const o = opts || {};
    overAlert(items);
    // 이름표에 끝 시각을 넣는다: 연장한 뒤 다시 초과되면 새 알림으로 뜬다
    if (document.hidden || !document.hasFocus()) systemNotify(items, { sound: o.sound, tag: 'over-' + items.map((it) => it.id + '@' + it.due).join(',') });
  }

  // "알림음 테스트" 버튼(위쪽 바, 설정): 예시 알림 + 알림음 한 번 + (허용했다면) 윈도우 알림
  async function previewOverAlert(note) {
    if (notifyState() === 'default') await askNotify();
    const bed = (window.Store && Store.beds()[0]) || { label: '1번' };
    const due = new Date(); due.setMinutes(0, 0, 0);
    const items = [{ label: bed.label, name: '홍길동', due: due.getTime() }];
    sound.alert();
    const st = notifyState();
    // 테스트는 누를 때마다 새 알림으로 뜨게 이름표를 매번 다르게 한다
    const sent = systemNotify(items, { preview: true, sound: false, tag: 'over-test-' + Date.now() });
    const sys = sent ? '윈도우 알림도 함께 보냈습니다.'
      : st === 'file' ? '파일로 연 화면이라 윈도우 알림은 뜨지 않습니다. 링크로 열면 받을 수 있습니다.'
      : st === 'denied' ? '윈도우 알림은 이 브라우저에서 차단되어 있습니다.'
      : st === 'default' ? '윈도우 알림을 받으려면 "알림 허용"을 눌러 주세요.'
      : '';
    overAlert(items, { preview: true, note: [note, sys].filter(Boolean).join(' ') });
  }

  // ── 대화상자 ───────────────────────────────────────────────
  // actions: [{ label, value, kind: 'primary'|'danger'|'ghost', icon }]
  // value '__cancel' 버튼은 닫기 버튼이 된다. onSubmit(dlg, value)이 false를 돌려주면 닫지 않는다.
  function dialog({ title, body, actions, wide, onMount, onSubmit, className }) {
    return new Promise((resolve) => {
      const dlg = document.createElement('dialog');
      dlg.className = 'sheet' + (wide ? ' is-wide' : '') + (className ? ' ' + className : '');
      dlg.setAttribute('aria-label', title);
      dlg.innerHTML =
        '<form class="sheet-inner" novalidate>' +
        '<header class="sheet-head"><h2>' + esc(title) + '</h2>' +
        '<button type="button" class="icon-btn" data-close aria-label="닫기">' + window.icon('x') + '</button></header>' +
        '<div class="sheet-body">' + (body || '') + '</div>' +
        (actions && actions.length
          ? '<footer class="sheet-foot">' + actions.map((a) => a.value === '__cancel'
              ? '<button type="button" class="btn btn-ghost" data-close>' + esc(a.label) + '</button>'
              : '<button type="submit" class="btn ' + (a.kind ? 'btn-' + a.kind : 'btn-ghost') + '" value="' + esc(a.value) + '"' + (a.disabled ? ' disabled' : '') + '>' +
                (a.icon ? window.icon(a.icon) : '') + '<span>' + esc(a.label) + '</span></button>').join('') + '</footer>'
          : '') +
        '</form>';
      document.body.appendChild(dlg);
      let settled = false;
      const finish = (v) => {
        if (settled) return;
        settled = true;
        if (dlg.open) dlg.close();
        dlg.remove();
        resolve(v == null ? null : v);
      };
      const form = dlg.querySelector('form');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const def = form.querySelector('.sheet-foot button[type=submit]:not([disabled])');
        const v = e.submitter ? e.submitter.value : def ? def.value : null;
        if (v == null) return;
        if (onSubmit) {
          const r = onSubmit(dlg, v);
          if (r === false) return;
          finish(r === undefined ? v : r);
        } else finish(v);
      });
      dlg.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => finish(null)));
      dlg.addEventListener('cancel', (e) => { e.preventDefault(); finish(null); });
      dlg.finish = finish;
      if (onMount) onMount(dlg, finish);
      dlg.showModal();
      const first = dlg.querySelector('[autofocus]') || dlg.querySelector('.sheet-foot .btn-primary:not([disabled]), .sheet-foot .btn-danger');
      if (first) first.focus();
    });
  }

  function confirmDialog(title, message, okLabel, kind) {
    return dialog({
      title,
      body: '<p class="sheet-text">' + esc(message) + '</p>',
      actions: [
        { label: '돌아가기', value: '__cancel' },
        { label: okLabel || '확인', value: 'yes', kind: kind || 'primary' },
      ],
    }).then((v) => v === 'yes');
  }

  // ── 소리 ───────────────────────────────────────────────────
  let audio = null;
  function tone(freqs, dur) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = audio.currentTime;
      freqs.forEach((f, i) => {
        const o = audio.createOscillator();
        const g = audio.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0 + i * dur);
        g.gain.exponentialRampToValueAtTime(0.22, t0 + i * dur + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + (i + 1) * dur);
        o.connect(g).connect(audio.destination);
        o.start(t0 + i * dur);
        o.stop(t0 + (i + 1) * dur + 0.02);
      });
    } catch (e) { /* 소리를 낼 수 없는 환경 */ }
  }
  const sound = {
    ok() { tone([880, 1320], 0.09); },
    error() { tone([330, 247], 0.14); },
    alert() { tone([988, 784, 988], 0.16); },
  };

  // ── 잔디 알림 ──────────────────────────────────────────────
  // 잔디 웹훅은 웹페이지에서 바로 부를 수 없어서 Netlify 서버 함수(netlify/functions/jandi.mjs)를 거쳐 보낸다.
  // 그래서 Netlify 주소로 연 화면에서만 보낼 수 있다 (파일로 연 화면·GitHub Pages는 안 된다).
  const JANDI_FN = '/.netlify/functions/jandi';
  async function sendJandi(url, msg) {
    if (location.protocol === 'file:') return { ok: false, reason: 'file' };
    try {
      const r = await fetch(JANDI_FN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, body: msg.body, info: msg.info, color: msg.color }),
      });
      let j = null;
      try { j = await r.json(); } catch (e) { /* 함수가 없는 곳(404 페이지) */ }
      return { ok: r.ok && !!(j && j.ok), status: r.status, reason: j ? j.error || null : 'no-function' };
    } catch (e) { return { ok: false, reason: 'network' }; }
  }

  function leaveMessage(s, now) {
    const who = s.name + (s.studentNo ? ' (' + s.studentNo + ')' : '');
    const cls = classOf(s);
    return {
      body: '[보건실] 퇴실 확인 필요 · ' + s.bedLabel + ' 침대 ' + s.name,
      color: '#C62D24',
      info: [
        { title: '학생', description: who + (cls ? ' · ' + cls : '') },
        { title: '침대', description: bedName(s.bedLabel, s.bedTier) },
        { title: '퇴실 요청', description: hm(s.leaveAt) + ' · ' + (LEAVE_FROM[s.leaveFrom] || '태블릿') + ' (' + elapsedText(s.leaveAt, now) + ' 전)' },
        { title: '확인할 일', description: '퇴실을 요청한 지 ' + window.Store.LEAVE_ALERT_MINUTES + '분이 지났지만 학생지원실에서 퇴실 확인이 되지 않았습니다. 학생이 어디에 있는지 확인해 주세요.' },
      ],
    };
  }

  // 퇴실 중으로 10분이 지난 학생을 잔디로 알린다. 열린 화면(PC·태블릿)마다 부르지만,
  // 서버에 먼저 "보냄" 표시를 한 화면 하나만 보낸다. 보내지 못하면 표시를 지워 1분 뒤 다시 보낸다.
  const leaveBusy = new Set();
  async function watchLeave() {
    const Store = window.Store;
    let due = [];
    try { due = Store.leaveAlertDue(Date.now()); } catch (e) { return; }
    for (const s of due) {
      if (leaveBusy.has(s.id)) continue;
      leaveBusy.add(s.id);
      try {
        if (!(await Store.claimLeaveAlert(s.id))) continue;
        const r = await App.sendJandi(Store.settings().jandiUrl, leaveMessage(s, Date.now()));
        if (!r.ok) await Store.releaseLeaveAlert(s.id);
      } catch (e) {
        console.error(e);
      } finally {
        leaveBusy.delete(s.id);
      }
    }
  }

  // ── CSV ────────────────────────────────────────────────────
  function toCSV(rows) {
    return '﻿' + rows.map((r) => r.map((c) => {
      const s = String(c == null ? '' : c);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(',')).join('\r\n');
  }

  function parseCSV(text) {
    const rows = [];
    let row = [], cell = '', q = false;
    const t = String(text).replace(/^﻿/, '');
    const delim = (t.split('\n')[0].match(/\t/g) || []).length > (t.split('\n')[0].match(/,/g) || []).length ? '\t' : ',';
    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      if (q) {
        if (c === '"' && t[i + 1] === '"') { cell += '"'; i++; }
        else if (c === '"') q = false;
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === delim) { row.push(cell); cell = ''; }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (c !== '\r') cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((c) => String(c).trim()));
  }

  function download(name, content, type) {
    const blob = new Blob([content], { type: type || 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  Object.assign(App, {
    esc, $, $$, MIN,
    elapsedParts, elapsedText, elapsedHTML, durationText, hm, dueAt, isOver, overLabel, classOf,
    isLeaving, isLeaveLate, LEAVE_FROM, sendJandi, leaveMessage, watchLeave,
    WEEKDAY,
    SOURCE, ZONE, ROLE, TIER, bedName, groupBeds, josa,
    toast, dialog, confirmDialog, sound, toCSV, parseCSV, download,
    overText, overAlert, alertOver, previewOverAlert, notifyState, askNotify,
  });
})();
