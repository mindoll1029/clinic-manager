/*
 * 보건실 침대 현황 · 데이터 모듈 (시제품)
 *
 * 화면 코드는 이 파일의 Store 함수만 부른다. 저장 방식은 두 가지다.
 *  - 원격 모드 (js/config.js에 Supabase 주소·키가 있을 때): 모든 기기가 Supabase 표의 한 줄(room)을
 *    함께 쓰고, Supabase Realtime으로 서로의 변경을 바로 받는다. 태블릿·PC를 따로 쓰는 시연용.
 *  - 로컬 모드 (설정이 비어 있을 때): 이 브라우저의 localStorage에 저장하고, 같은 브라우저의 탭끼리만
 *    BroadcastChannel + storage 이벤트로 동기화한다.
 * 실제 운영(PRD 7장)에서는 데이터를 표로 나누고 서버 함수(lookup_student, register_session …)로 옮긴다.
 */
(function () {
  'use strict';

  const KEY = 'clinic-manager.v2';
  const CHANNEL = 'clinic-manager.sync';
  const MIN = 60 * 1000;

  // ── 여러 기기 공유 설정 ─────────────────────────────────────
  const CFG = window.CLINIC_CONFIG || {};
  const REMOTE = !!(CFG.supabaseUrl && CFG.supabaseKey);
  const ROOM = String(CFG.room || 'demo');
  const TABLE = 'clinic_state';
  const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js';
  const EVENT_CAP = REMOTE ? 300 : 2000; // 원격 모드는 한 줄을 통째로 주고받으므로 작게 유지한다

  // ── 기본 데이터 ─────────────────────────────────────────────
  // 사용 시간: 등록한 뒤 다음 정각(한국 표준시)까지 고정. 연장하면 끝나는 시각에 연장 시간을 더한다.
  const DEFAULT_SETTINGS = {
    extendMinutes: 60,        // 연장 1회 시간
    maxExtensions: 2,         // 최대 연장 횟수
    extensionCodeHash: null,  // 관리번호 (해시만 저장)
    maxCodeTries: 5,          // 연속 실패 허용 횟수
    lockMinutes: 1,           // 잠금 시간
    alertSound: true,         // 초과 알림음 (보건 선생님 화면)
    alertSoundSupport: true,  // 초과 알림음 (학생지원실 화면)
    rosterSheetUrl: '',       // 학생 명단을 불러오는 구글 스프레드시트 링크
    rosterLoadedAt: 0,        // 명단을 마지막으로 불러온 시각
  };

  const DEFAULT_ACCOUNTS = [
    { id: 'admin', role: 'admin', name: '관리자', password: 'admin1234' },
    { id: 'nurse', role: 'nurse', name: '보건 선생님', password: 'nurse1234' },
    { id: 'kiosk-nurse-room', role: 'kiosk', name: '보건실 학생 태블릿', password: 'kiosk1234' },
    { id: 'support-office', role: 'support', name: '강의동 학생지원실', password: 'support1234' },
  ];

  // 남학생 5자리(6~10번), 여학생 5자리(1~5번). 구역마다 2층 침대 하나(아래층·위층)가 있다.
  // tier: null(일반) | 'lower'(2층 침대 아래층) | 'upper'(2층 침대 위층)
  // order: 현황판 순서. 구역마다 2열로 채우고, 붙어 있는 아래층·위층은 2층 침대 한 칸이 된다.
  // row, col: 침대 고르기 창의 배치도 위치(줄, 칸). 침대가 하나도 없는 칸은 침대 반 칸 너비의 통로가 된다.
  //   남학생  [10번][    ] 통로 [6번]      여학생  [5번] 통로 [    ][1번]
  //           [9번 ][8번 ] 통로 [7번]              [4번] 통로 [2번 ][3번]
  const DEFAULT_BEDS = [
    { id: 'b1', label: '10번', zone: 'M', tier: null, order: 1, row: 1, col: 1, active: true },
    { id: 'b2', label: '6번', zone: 'M', tier: null, order: 2, row: 1, col: 4, active: true },
    { id: 'b4', label: '8번', zone: 'M', tier: 'lower', order: 3, row: 2, col: 2, active: true },
    { id: 'b5', label: '9번', zone: 'M', tier: 'upper', order: 4, row: 2, col: 1, active: true },
    { id: 'b3', label: '7번', zone: 'M', tier: null, order: 5, row: 2, col: 4, active: true },
    { id: 'b6', label: '5번', zone: 'F', tier: null, order: 6, row: 1, col: 1, active: true },
    { id: 'b7', label: '1번', zone: 'F', tier: null, order: 7, row: 1, col: 4, active: true },
    { id: 'b8', label: '4번', zone: 'F', tier: null, order: 8, row: 2, col: 1, active: true },
    { id: 'b9', label: '2번', zone: 'F', tier: 'lower', order: 9, row: 2, col: 3, active: true },
    { id: 'b10', label: '3번', zone: 'F', tier: 'upper', order: 10, row: 2, col: 4, active: true },
  ];
  // 현황판: 남학생 [10번][6번] / [2층: 9번·8번][7번], 여학생 [5번][1번] / [4번][2층: 3번·2번]

  const DATA_VERSION = 5;

  // 예전(version 1) 기본 침대 번호. 이대로 남아 있으면 새 번호·배치로 바꾼다.
  const LEGACY_LABELS = { b1: '1번', b2: '2번', b3: '3번', b4: '4번', b5: '5번', b6: '6번', b7: '7번', b8: '8번', b9: '9번', b10: '10번' };

  // 시제품용 가상 명단. 학번은 1001부터 입학 순서대로 +1. 실제 학생이 아니다.
  const SAMPLE_NAMES = [
    ['김민준', 'M'], ['이서연', 'F'], ['박지호', 'M'], ['최하은', 'F'], ['정유나', 'F'],
    ['강도윤', 'M'], ['조수아', 'F'], ['윤시우', 'M'], ['장지아', 'F'], ['임주원', 'M'],
    ['한예린', 'F'], ['오건우', 'M'], ['서채원', 'F'], ['신우진', 'M'], ['권다은', 'F'],
    ['황현우', 'M'], ['안소율', 'F'], ['송준서', 'M'], ['류하린', 'F'], ['전태윤', 'M'],
    ['홍지유', 'F'], ['고은호', 'M'], ['문가은', 'F'], ['양승민', 'M'], ['손나은', 'F'],
    ['배도현', 'M'], ['백서아', 'F'], ['허재윤', 'M'], ['유아린', 'F'], ['남궁민수', 'M'],
    ['노유진', 'F'], ['하준혁', 'M'], ['곽예은', 'F'], ['성지환', 'M'], ['차윤서', 'F'],
    ['주동하', 'M'], ['우채은', 'F'], ['구민재', 'M'], ['민서윤', 'F'], ['나이현', 'F'],
  ];

  function sampleStudents() {
    return SAMPLE_NAMES.map(([name, gender], i) => {
      const grade = (i % 3) + 1;
      const classNo = (Math.floor(i / 3) % 6) + 1;
      const number = Math.floor(i / 18) * 10 + (i % 9) + 1;
      return { no: String(1001 + i), name, grade, classNo, number, gender, active: true };
    });
  }

  // ── 유틸 ───────────────────────────────────────────────────
  // 한국 표준시(UTC+9)는 시간 단위로만 어긋나서 정각 경계가 UTC와 같다. 기기 시간대와 상관없이 맞다.
  const HOUR = 60 * MIN;
  function nextHour(ts) { return (Math.floor(ts / HOUR) + 1) * HOUR; }

  // 끝나는 시각. 예전 데이터(allowedMinutes만 있는 사용)는 등록 시각 + 허용 분으로 계산한다.
  function dueOf(s) { return s.dueAt || s.startedAt + (s.allowedMinutes || 60) * MIN; }

  // 원격 모드: 변경을 처음 실행할 때 만든 번호를 기록해 두고(uidLog), 다시 적용할 때 같은 번호를 쓴다(uidReplay)
  let uidLog = null, uidReplay = null;
  function uid(prefix) {
    if (uidReplay && uidReplay.length) return uidReplay.shift();
    const id = prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
    if (uidLog) uidLog.push(id);
    return id;
  }

  // 시제품용 간단한 해시. 실제 운영에서는 서버 함수(bcrypt 등)에서만 확인한다.
  function hashCode(text) {
    let h = 0x811c9dc5;
    const s = 'clinic:' + String(text);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  }

  function dayKey(ts) {
    const d = new Date(ts);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function normalizeStudentNo(raw) {
    // 스캐너가 앞뒤에 문자를 붙여도 숫자만 남긴다.
    return String(raw || '').replace(/\D/g, '');
  }

  function maskName(name) {
    const n = String(name || '');
    if (n.length <= 1) return n;
    if (n.length === 2) return n[0] + '*';
    return n[0] + '*'.repeat(n.length - 2) + n[n.length - 1];
  }

  function fail(code, message, extra) {
    const err = new Error(message);
    err.code = code;
    Object.assign(err, extra || {});
    throw err;
  }

  // ── 저장소 ─────────────────────────────────────────────────
  function seed() {
    const now = Date.now();
    const students = sampleStudents();
    const data = {
      version: DATA_VERSION,
      settings: Object.assign({}, DEFAULT_SETTINGS, { extensionCodeHash: hashCode('2580') }),
      accounts: DEFAULT_ACCOUNTS.map((a) => Object.assign({}, a)),
      beds: DEFAULT_BEDS.map((b) => Object.assign({}, b)),
      students,
      sessions: [],
      events: [],
      lockouts: {},
    };
    // 화면 확인용 예시 사용 기록 (가상). 몇 시에 열어도 초과는 1003 한 명만 보이도록 이번 정각을 기준으로 잡는다.
    const into = Math.floor((now % HOUR) / MIN); // 이번 정각에서 지난 분
    const demo = [
      { no: '1001', bed: 'b1', ago: Math.min(32, into), source: 'support' },
      { no: '1003', bed: 'b4', ago: into + 13, source: 'kiosk' },               // 지난 시간에 등록 → 이번 정각에 끝나서 초과
      { no: '1002', bed: 'b6', ago: Math.min(14, into), source: 'kiosk' },
      { no: '1004', bed: 'b7', ago: into + 39, source: 'nurse', ext: 1 },     // 지난 시간에 등록 + 연장 1회 → 다음 정각까지
      { no: '1005', bed: 'b10', ago: Math.min(3, into), source: 'support' },
    ];
    demo.forEach((d) => {
      const startedAt = now - d.ago * MIN;
      data.sessions.push({
        id: uid('s'), studentNo: d.no, bedId: d.bed, status: 'active',
        startedAt, dueAt: nextHour(startedAt) + (d.ext || 0) * 60 * MIN,
        extensionCount: d.ext || 0, source: d.source, endedAt: null, endedBy: null,
      });
    });
    [[1006, 'b3', 180, 140], [1008, 'b5', 150, 115], [1007, 'b9', 95, 50]].forEach(([no, bed, from, to]) => {
      data.sessions.push({
        id: uid('s'), studentNo: String(no), bedId: bed, status: 'ended',
        startedAt: now - from * MIN, dueAt: nextHour(now - from * MIN), extensionCount: 0,
        source: 'kiosk', endedAt: now - to * MIN, endedBy: 'kiosk',
      });
    });
    return data;
  }

  function load() {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { /* 저장소 차단 */ }
    if (raw) {
      try {
        const data = JSON.parse(raw);
        data.settings = Object.assign({}, DEFAULT_SETTINGS, data.settings);
        data.lockouts = data.lockouts || {};
        if (migrate(data)) save(data, { silent: true });
        return data;
      } catch (e) { /* 손상된 데이터는 새로 만든다 */ }
    }
    const fresh = seed();
    save(fresh, { silent: true });
    return fresh;
  }

  // 이미 저장된 데이터를 지금 형식으로 맞춘다
  function migrate(data) {
    const v = data.version || 1;
    if (v >= DATA_VERSION) return false;
    if (v < 2) {
      // version 2: '보건교사' → '보건 선생님', 침대 번호·현황판 순서 변경
      const nurse = (data.accounts || []).find((a) => a.id === 'nurse' && a.name === '보건교사');
      if (nurse) nurse.name = '보건 선생님';
      const untouched = data.beds.length === DEFAULT_BEDS.length && data.beds.every((b) => LEGACY_LABELS[b.id] === b.label);
      if (untouched) data.beds = DEFAULT_BEDS.map((b) => Object.assign({}, b));
    }
    // version 3: 침대 고르기 배치도 위치 변경, version 4: 여학생 현황판에서 4번과 2층 침대 자리 바꿈.
    // 기본 번호·구역 그대로인 침대만 기본 배치도 위치와 현황판 순서로 맞춘다.
    const def = {};
    DEFAULT_BEDS.forEach((b) => { def[b.id] = b; });
    if (data.beds.every((b) => def[b.id] && def[b.id].label === b.label && def[b.id].zone === b.zone)) {
      data.beds.forEach((b) => { b.row = def[b.id].row; b.col = def[b.id].col; b.order = def[b.id].order; });
    }
    // version 5: 끝나는 시각을 "등록 + 60분"에서 "등록 후 다음 정각 + 연장"으로
    (data.sessions || []).forEach((s) => {
      if (!s.dueAt) s.dueAt = nextHour(s.startedAt) + (s.extensionCount || 0) * data.settings.extendMinutes * MIN;
    });
    data.version = DATA_VERSION;
    return true;
  }

  let memory = null; // localStorage가 막힌 경우 대비

  function save(data, opts) {
    memory = data;
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* 메모리로만 유지 */ }
    if (!(opts && opts.silent)) notify();
  }

  function read() {
    if (REMOTE) return cache;
    try { if (localStorage.getItem(KEY) == null && memory) return memory; } catch (e) { return memory || seed(); }
    return load();
  }

  function mutate(fn) {
    if (REMOTE) return remoteMutate(fn);
    const data = read();
    const result = fn(data);
    save(data);
    return result;
  }

  function logEvent(data, sessionId, type, actor) {
    data.events.push({ id: uid('e'), sessionId, type, actor: actor || 'system', at: Date.now() });
    if (data.events.length > EVENT_CAP) data.events = data.events.slice(-EVENT_CAP);
  }

  // 자정이 지난 미퇴실 사용을 닫는다 (PRD 9장 자정 정리)
  function closeYesterday(data) {
    const today = dayKey(Date.now());
    let changed = false;
    data.sessions.forEach((s) => {
      if (s.status === 'active' && dayKey(s.startedAt) !== today) {
        s.status = 'ended';
        s.endedAt = new Date(new Date(s.startedAt).setHours(23, 59, 59, 0)).getTime();
        s.endedBy = 'auto';
        s.unreturned = true;
        logEvent(data, s.id, 'auto-end', 'system');
        changed = true;
      }
    });
    return changed;
  }

  // ── 실시간 동기화 ──────────────────────────────────────────
  const listeners = new Set();
  let channel = null;
  try { channel = new BroadcastChannel(CHANNEL); } catch (e) { channel = null; }

  function emit(source) { listeners.forEach((fn) => { try { fn(source); } catch (e) { console.error(e); } }); }
  function notify() {
    if (channel) { try { channel.postMessage({ type: 'change', at: Date.now() }); } catch (e) { /* 무시 */ } }
    emit('local');
  }
  // 다른 탭의 변경은 BroadcastChannel과 storage 이벤트로 두 번 올 수 있다. 짧게 묶어 한 번만 알린다.
  let remoteTimer = null;
  function emitRemote() { clearTimeout(remoteTimer); remoteTimer = setTimeout(() => emit('remote'), 30); }
  if (channel) channel.onmessage = emitRemote;
  window.addEventListener('storage', (e) => { if (e.key === KEY) emitRemote(); });

  // 화면에 알릴 일 (다른 기기와 동시에 바꿔 처리하지 못한 경우, 저장 실패)
  const noticeListeners = new Set();
  function notice(message) { noticeListeners.forEach((fn) => { try { fn({ message }); } catch (e) { console.error(e); } }); }

  // ── 원격 동기화 (Supabase) ─────────────────────────────────
  // confirmed: 서버에 저장돼 있다고 확인한 데이터. rev는 저장에 성공할 때마다 1씩 오르고,
  //            "내가 본 rev 그대로일 때만 저장"하므로 같은 rev의 서버 데이터는 하나뿐이다.
  // ops:       아직 서버에 보내지 못한 변경(함수)들. 보낼 때 최신 confirmed 위에 다시 적용한다.
  //            다른 기기가 먼저 저장했으면 최신 데이터를 받아 같은 변경을 다시 적용하고,
  //            그 사이 불가능해진 변경(예: 같은 침대를 다른 기기가 먼저 고름)은 버리고 알린다.
  // cache:     화면이 읽는 데이터 = confirmed + ops. 그래서 누른 결과가 바로 보인다.
  // 읽기:      서버 줄이 바뀌면 Supabase Realtime 알림을 받아 다시 읽는다. 알림을 놓쳐도 20초마다 확인한다.
  let sb = null;
  let confirmed = null;
  let cache = null;
  let cacheSig = '';
  const ops = [];
  let sending = false;
  let status = REMOTE ? 'connecting' : 'local';
  const clone = (o) => JSON.parse(JSON.stringify(o));

  function setStatus(s) { if (status !== s) { status = s; emit('status'); } }

  function loadScript(src) {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Supabase 프로그램을 받지 못했습니다.'));
      document.head.appendChild(s);
    });
  }

  function normalize(row) {
    const data = row.data;
    data.rev = Number(row.rev) || 0;
    data.settings = Object.assign({}, DEFAULT_SETTINGS, data.settings);
    data.lockouts = data.lockouts || {};
    return data;
  }

  async function fetchRow() {
    const { data, error } = await sb.from(TABLE).select('data, rev').eq('id', ROOM).maybeSingle();
    if (error) throw error;
    return data ? normalize(data) : null;
  }

  async function write(expectedRev, data) {
    const { data: rows, error } = await sb.from(TABLE)
      .update({ data, rev: data.rev, updated_at: new Date().toISOString() })
      .eq('id', ROOM)
      .eq('rev', expectedRev) // 내가 본 rev 그대로일 때만 저장
      .select('rev');
    if (error) throw error;
    return !!(rows && rows.length);
  }

  // 변경을 다시 적용할 때 새 번호(uid)가 생기지 않게, 처음 만든 번호를 그대로 쓴다
  function replay(op, data) {
    uidReplay = op.ids.slice();
    try { op.fn(data); } finally { uidReplay = null; }
  }

  // 화면 데이터 = 서버 데이터 + 아직 보내지 못한 변경. 내용이 바뀌었을 때만 화면에 알린다.
  function rebuild() {
    const c = clone(confirmed);
    ops.forEach((op) => { try { replay(op, c); } catch (e) { /* 보낼 때 다시 확인하고 알린다 */ } });
    c.rev = confirmed.rev;
    const sig = JSON.stringify(Object.assign({}, c, { rev: 0 }));
    cache = c;
    if (sig !== cacheSig) { cacheSig = sig; emit('remote'); }
  }

  function takeServer(latest) {
    if (!latest || latest.rev <= confirmed.rev) return false; // 늦게 도착한 옛 응답은 버린다
    confirmed = latest;
    return true;
  }

  let refreshTimer = null;
  function refresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(async () => {
      try { if (takeServer(await fetchRow())) rebuild(); setStatus('online'); }
      catch (e) { setStatus('offline'); }
    }, 60);
  }

  // 보내지 못한 변경을 하나씩 차례로 서버에 저장한다
  async function pump() {
    if (sending) return;
    sending = true;
    try {
      while (ops.length) {
        const op = ops[0];
        const next = clone(confirmed);
        try { replay(op, next); } catch (e) {
          ops.shift();
          rebuild();
          notice('다른 화면에서 먼저 바뀌어 처리하지 못했습니다. ' + e.message);
          continue;
        }
        next.rev = confirmed.rev + 1;
        if (await write(confirmed.rev, next)) {
          confirmed = next;
          ops.shift();
          setStatus('online');
        } else {
          // 다른 기기가 먼저 저장했다 → 최신 데이터를 받아 같은 변경을 다시 적용한다
          if (++op.tries > 8) { ops.shift(); notice('다른 화면과 동시에 바뀌어 저장하지 못했습니다. 다시 해 주세요.'); }
          const latest = await fetchRow();
          if (!latest) throw new Error('NO_ROW');
          takeServer(latest);
        }
        rebuild();
      }
    } catch (e) {
      console.error(e);
      setStatus('offline');
      ops.length = 0; // 저장하지 못한 변경은 버리고 서버 상태로 되돌린다
      notice('서버에 저장하지 못했습니다. 인터넷 연결을 확인하고 다시 해 주세요.');
      try { takeServer(await fetchRow()); } catch (_) { /* 연결이 돌아오면 다시 읽는다 */ }
      rebuild();
    } finally {
      sending = false;
    }
  }

  function remoteMutate(fn) {
    if (!cache) throw Object.assign(new Error('아직 서버에 연결되지 않았습니다.'), { code: 'OFFLINE' });
    const next = clone(cache);
    uidLog = [];
    let result;
    try { result = fn(next); } catch (e) { uidLog = null; throw e; } // 오류가 나면 아무것도 바뀌지 않는다
    const ids = uidLog;
    uidLog = null;
    ops.push({ fn, ids, tries: 0 });
    rebuild();
    pump();
    return result;
  }

  function subscribeRemote() {
    sb.channel('clinic-' + ROOM)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE, filter: 'id=eq.' + ROOM }, (p) => {
        const r = p && p.new ? Number(p.new.rev) : NaN;
        if (r <= confirmed.rev) return; // 이미 알고 있는 것 (내가 방금 저장한 것 포함)
        refresh();
      })
      .subscribe((st) => {
        if (st === 'SUBSCRIBED') { setStatus('online'); refresh(); }
        else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT' || st === 'CLOSED') setStatus('offline');
      });
    setInterval(refresh, 20000);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  }

  async function connectRemote() {
    await loadScript(SUPABASE_JS);
    sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
    let row = await fetchRow();
    if (!row) {
      // 처음 쓰는 room: 예시 데이터로 시작한다 (두 기기가 동시에 만들어도 한 줄만 들어간다)
      await sb.from(TABLE).insert({ id: ROOM, data: seed(), rev: 1 });
      row = await fetchRow();
    }
    if (!row) throw new Error('Supabase 표(' + TABLE + ')를 읽지 못했습니다. 설정 SQL을 실행했는지 확인해 주세요.');
    confirmed = row;
    rebuild();
    // 형식 맞추기·자정 정리가 필요하면 한 번 저장한다
    const tidy = (d) => { migrate(d); closeYesterday(d); };
    const probe = clone(confirmed);
    const needs = migrate(probe) | closeYesterday(probe);
    if (needs) { ops.push({ fn: tidy, ids: [], tries: 0 }); rebuild(); pump(); }
    subscribeRemote();
    setStatus('online');
  }

  // ── 조회 헬퍼 ──────────────────────────────────────────────
  function sessionView(data, s, role) {
    const st = data.students.find((x) => x.no === s.studentNo) || { no: s.studentNo, name: s.tempName || '(명단 밖)', grade: null, classNo: null, gender: null };
    const bed = data.beds.find((b) => b.id === s.bedId);
    const full = role === 'nurse' || role === 'admin' || role === 'support';
    return {
      id: s.id,
      studentNo: full ? st.no : null,
      name: full ? st.name : maskName(st.name),
      grade: st.grade, classNo: st.classNo, gender: st.gender,
      bedId: s.bedId, bedLabel: bed ? bed.label : '?', bedTier: bed ? bed.tier || null : null, zone: bed ? bed.zone : null,
      startedAt: s.startedAt, endedAt: s.endedAt, status: s.status,
      dueAt: dueOf(s), extensionCount: s.extensionCount,
      source: s.source, endedBy: s.endedBy, unreturned: !!s.unreturned,
    };
  }

  function activeFor(data, studentNo) {
    return data.sessions.find((s) => s.status === 'active' && s.studentNo === studentNo) || null;
  }

  function bedBusy(data, bedId) {
    return data.sessions.some((s) => s.status === 'active' && s.bedId === bedId);
  }

  // ── 공개 API ───────────────────────────────────────────────
  const Store = {
    MIN,
    nextHour, // 지금 등록하면 끝나는 시각 (다음 정각)
    maskName,
    normalizeStudentNo,

    // 시작: 원격 모드는 서버에서 데이터를 받은 뒤에 끝난다 (그 전에는 화면을 열지 않는다)
    ready() {
      if (REMOTE) return connectRemote();
      const data = read();
      if (closeYesterday(data)) save(data);
      return Promise.resolve();
    },

    // { mode: 'remote' | 'local', status: 'connecting' | 'online' | 'offline' | 'local', room }
    connection() { return { mode: REMOTE ? 'remote' : 'local', status, room: REMOTE ? ROOM : null, rev: confirmed ? confirmed.rev : null, pending: ops.length }; },

    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    onNotice(fn) { noticeListeners.add(fn); return () => noticeListeners.delete(fn); },

    now() { return Date.now(); },

    // 로그인
    login(id, password) {
      const data = read();
      const acc = data.accounts.find((a) => a.id === String(id || '').trim());
      if (!acc || acc.password !== password) fail('BAD_LOGIN', '아이디 또는 비밀번호가 맞지 않습니다.');
      return { id: acc.id, role: acc.role, name: acc.name };
    },

    verifyPassword(roles, password) {
      const data = read();
      return data.accounts.some((a) => roles.includes(a.role) && a.password === password);
    },

    accounts() {
      return read().accounts.map((a) => ({ id: a.id, role: a.role, name: a.name }));
    },

    setPassword(accountId, password) {
      if (!password || password.length < 4) fail('WEAK', '비밀번호는 4자 이상이어야 합니다.');
      mutate((d) => { const a = d.accounts.find((x) => x.id === accountId); if (a) a.password = password; });
    },

    // 설정
    settings() { const s = Object.assign({}, read().settings); delete s.extensionCodeHash; return s; },

    updateSettings(patch) {
      mutate((d) => {
        ['extendMinutes', 'maxExtensions', 'alertSound', 'alertSoundSupport'].forEach((k) => { if (k in patch) d.settings[k] = patch[k]; });
      });
    },

    setExtensionCode(code) {
      const c = String(code || '');
      if (!/^\d{4,6}$/.test(c)) fail('BAD_CODE', '관리번호는 4~6자리 숫자여야 합니다.');
      mutate((d) => { d.settings.extensionCodeHash = hashCode(c); });
    },

    // 침대
    beds() { return read().beds.filter((b) => b.active).sort((a, b) => a.order - b.order); },

    saveBeds(beds) {
      mutate((d) => {
        const busy = new Set(d.sessions.filter((s) => s.status === 'active').map((s) => s.bedId));
        d.beds.forEach((b) => {
          const next = beds.find((x) => x.id === b.id);
          if (!next && busy.has(b.id)) fail('BED_BUSY', b.label + ' 침대는 사용 중이라 뺄 수 없습니다.');
        });
        // 배치도 위치(row, col)는 같은 구역에 남은 침대만 그대로 둔다
        d.beds = beds.map((b, i) => {
          const prev = d.beds.find((x) => x.id === b.id);
          const keep = prev && prev.zone === b.zone;
          return { id: b.id || uid('b'), label: b.label, zone: b.zone, tier: b.tier || null, order: i + 1,
            row: keep ? prev.row : undefined, col: keep ? prev.col : undefined, active: true };
        });
      });
    },

    // 학생 명단
    students() { return read().students.slice(); },

    // meta.sheetUrl: 구글 스프레드시트에서 불러왔으면 그 링크를 기억해 다음에 바로 다시 불러온다
    importRoster(rows, meta) {
      const clean = [];
      const seen = new Set();
      rows.forEach((r) => {
        const no = normalizeStudentNo(r.no);
        const name = String(r.name || '').trim();
        if (!no || !name || seen.has(no)) return;
        seen.add(no);
        const g = String(r.gender || '').trim();
        clean.push({
          no, name,
          grade: Number(r.grade) || null, classNo: Number(r.classNo) || null, number: Number(r.number) || null,
          gender: /^(남|M|m|male)/.test(g) ? 'M' : /^(여|F|f|female)/.test(g) ? 'F' : null,
          active: true,
        });
      });
      if (!clean.length) fail('EMPTY_ROSTER', '읽을 수 있는 학생이 없습니다. 학번과 이름 열을 확인해 주세요.');
      mutate((d) => {
        d.students = clean;
        d.settings.rosterLoadedAt = Date.now();
        if (meta && meta.sheetUrl) d.settings.rosterSheetUrl = meta.sheetUrl;
      });
      return clean.length;
    },

    // lookup_student
    lookupStudent(raw, role) {
      const no = normalizeStudentNo(raw);
      if (!no) fail('EMPTY', '학번을 입력해 주세요.');
      const data = read();
      const st = data.students.find((s) => s.no === no && s.active);
      if (!st) fail('NOT_FOUND', '학번을 다시 확인해 주세요.');
      const s = activeFor(data, no);
      const full = role !== 'kiosk';
      return {
        no: st.no, name: st.name, displayName: full ? st.name : maskName(st.name),
        grade: st.grade, classNo: st.classNo, gender: st.gender,
        active: s ? sessionView(data, s, role === 'kiosk' ? 'nurse' : role) : null,
      };
    },

    // register_session
    registerSession({ studentNo, bedId, source, tempName }) {
      return mutate((d) => {
        const no = normalizeStudentNo(studentNo);
        let st = d.students.find((s) => s.no === no && s.active);
        if (!st && !tempName) fail('NOT_FOUND', '학번을 다시 확인해 주세요.');
        if (activeFor(d, no)) fail('ALREADY_ACTIVE', '이미 침대를 사용 중인 학번입니다.');
        const free = d.beds.filter((b) => b.active && !bedBusy(d, b.id));
        if (!free.length) fail('NO_BED', '지금은 빈 침대가 없습니다.');
        const bed = d.beds.find((b) => b.id === bedId && b.active);
        if (!bed) fail('NO_BED_CHOSEN', '침대를 골라 주세요.');
        if (bedBusy(d, bed.id)) fail('BED_TAKEN', '방금 다른 학생이 그 침대를 골랐습니다. 다른 침대를 골라 주세요.');
        const t = Date.now();
        const s = {
          id: uid('s'), studentNo: no, bedId: bed.id, status: 'active', startedAt: t,
          dueAt: nextHour(t), extensionCount: 0, source, // 다음 정각까지
          endedAt: null, endedBy: null, tempName: st ? undefined : String(tempName).trim(),
        };
        d.sessions.push(s);
        logEvent(d, s.id, 'register', source);
        return sessionView(d, s, 'nurse');
      });
    },

    // extend_session (학생 태블릿, 관리번호 필요)
    extendSession({ studentNo, code, deviceId }) {
      const dev = deviceId || 'kiosk';
      return mutate((d) => {
        const lock = d.lockouts[dev] || { fails: 0, until: 0 };
        if (lock.until > Date.now()) fail('LOCKED', '잠시 뒤에 다시 해 주세요.', { until: lock.until });
        const s = activeFor(d, normalizeStudentNo(studentNo));
        if (!s) fail('NOT_ACTIVE', '사용 중인 침대가 없습니다.');
        if (s.extensionCount >= d.settings.maxExtensions) fail('MAX_EXT', '더 연장할 수 없습니다. 보건 선생님께 말해 주세요.');
        if (hashCode(String(code || '')) !== d.settings.extensionCodeHash) {
          lock.fails += 1;
          if (lock.fails >= d.settings.maxCodeTries) {
            lock.until = Date.now() + d.settings.lockMinutes * MIN;
            lock.fails = 0;
            d.lockouts[dev] = lock;
            fail('LOCKED', '관리번호를 ' + d.settings.maxCodeTries + '번 틀려서 1분 동안 연장할 수 없습니다.', { until: lock.until });
          }
          d.lockouts[dev] = lock;
          fail('WRONG_CODE', '관리번호가 맞지 않습니다.', { left: d.settings.maxCodeTries - lock.fails });
        }
        d.lockouts[dev] = { fails: 0, until: 0 };
        s.dueAt = dueOf(s) + d.settings.extendMinutes * MIN;
        s.extensionCount += 1;
        logEvent(d, s.id, 'extend', 'kiosk');
        return sessionView(d, s, 'nurse');
      });
    },

    // end_session (학생 태블릿)
    endSession(studentNo) {
      return mutate((d) => {
        const s = activeFor(d, normalizeStudentNo(studentNo));
        if (!s) fail('NOT_ACTIVE', '사용 중인 침대가 없습니다.');
        s.status = 'ended'; s.endedAt = Date.now(); s.endedBy = 'kiosk';
        logEvent(d, s.id, 'end', 'kiosk');
        return sessionView(d, s, 'nurse');
      });
    },

    // nurse_extend / nurse_end / nurse_move / nurse_cancel
    staffExtend(sessionId, actor) {
      return mutate((d) => {
        const s = d.sessions.find((x) => x.id === sessionId && x.status === 'active');
        if (!s) fail('NOT_ACTIVE', '이미 끝난 사용입니다.');
        s.dueAt = dueOf(s) + d.settings.extendMinutes * MIN;
        s.extensionCount += 1;
        logEvent(d, s.id, 'extend', actor);
      });
    },

    staffEnd(sessionId, actor) {
      return mutate((d) => {
        const s = d.sessions.find((x) => x.id === sessionId && x.status === 'active');
        if (!s) fail('NOT_ACTIVE', '이미 끝난 사용입니다.');
        s.status = 'ended'; s.endedAt = Date.now(); s.endedBy = actor;
        logEvent(d, s.id, 'end', actor);
      });
    },

    // 관리자: 등록 시각 고치기 (같은 날, 지금보다 이른 시각만).
    // 끝나는 시각은 새 등록 시각의 다음 정각 + 지금까지 한 연장으로 다시 잡는다.
    // (2단계에서는 서버 함수가 관리자 권한을 확인한다)
    staffSetStart(sessionId, startedAt, actor) {
      return mutate((d) => {
        const s = d.sessions.find((x) => x.id === sessionId && x.status === 'active');
        if (!s) fail('NOT_ACTIVE', '이미 끝난 사용입니다.');
        const t = Number(startedAt);
        if (!t || t > Date.now()) fail('BAD_TIME', '지금보다 늦은 시각으로는 바꿀 수 없습니다.');
        if (dayKey(t) !== dayKey(s.startedAt)) fail('BAD_TIME', '같은 날의 시각으로만 바꿀 수 있습니다.');
        s.dueAt = dueOf(s) - nextHour(s.startedAt) + nextHour(t);
        s.startedAt = t;
        logEvent(d, s.id, 'edit-start', actor);
        return sessionView(d, s, 'nurse');
      });
    },

    staffMove(sessionId, bedId, actor) {
      return mutate((d) => {
        const s = d.sessions.find((x) => x.id === sessionId && x.status === 'active');
        if (!s) fail('NOT_ACTIVE', '이미 끝난 사용입니다.');
        if (bedBusy(d, bedId)) fail('BED_TAKEN', '그 침대는 사용 중입니다.');
        s.bedId = bedId;
        logEvent(d, s.id, 'move', actor);
      });
    },

    staffCancel(sessionId, actor) {
      return mutate((d) => {
        const s = d.sessions.find((x) => x.id === sessionId && x.status === 'active');
        if (!s) fail('NOT_ACTIVE', '이미 끝난 사용입니다.');
        s.status = 'cancelled'; s.endedAt = Date.now(); s.endedBy = actor;
        logEvent(d, s.id, 'cancel', actor);
      });
    },

    // active_board: 침대 순서대로, 사용 중이면 세션 정보 포함
    board(role) {
      const data = read();
      const beds = data.beds.filter((b) => b.active).sort((a, b) => a.order - b.order);
      return beds.map((b) => {
        const s = data.sessions.find((x) => x.status === 'active' && x.bedId === b.id);
        return { id: b.id, label: b.label, zone: b.zone, tier: b.tier || null, row: b.row || null, col: b.col || null, session: s ? sessionView(data, s, role) : null };
      });
    },

    // 사용 기록
    records(day, role) {
      const data = read();
      const key = day || dayKey(Date.now());
      return data.sessions
        .filter((s) => dayKey(s.startedAt) === key)
        .sort((a, b) => b.startedAt - a.startedAt)
        .map((s) => sessionView(data, s, role));
    },

    lockState(deviceId) {
      const l = read().lockouts[deviceId || 'kiosk'];
      return l && l.until > Date.now() ? l.until : 0;
    },

    resetDemo() {
      if (!REMOTE) { save(seed()); return; }
      // 원격: 모든 기기의 데이터를 예시로 되돌린다. 다른 변경과 같은 방식(rev 확인)으로 저장한다.
      mutate((d) => { const fresh = seed(); Object.keys(d).forEach((k) => { delete d[k]; }); Object.assign(d, fresh); });
    },

    dayKey,
  };

  window.Store = Store;
})();
