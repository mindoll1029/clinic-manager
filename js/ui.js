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

  function isOver(s, now) { return !!s && now >= dueAt(s); }

  function overLabel(s) { return s.extensionCount ? '연장 시간 초과' : '사용 시간 초과'; }

  const SOURCE = { nurse: '보건 선생님', kiosk: '보건실 태블릿', support: '학생지원실', admin: '관리자' };
  const ZONE = { M: '남학생', F: '여학생' };
  const ROLE = { admin: '관리자', nurse: '보건 선생님', kiosk: '학생 태블릿', support: '학생지원실' };

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

  function classOf(s) {
    if (!s || !s.grade) return '';
    return s.grade + '학년 ' + s.classNo + '반';
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
    SOURCE, ZONE, ROLE, TIER, bedName, groupBeds, josa,
    toast, dialog, confirmDialog, sound, toCSV, parseCSV, download,
  });
})();
