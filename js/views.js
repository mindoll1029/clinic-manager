/* 보조 화면: 사용 기록, 설정, 학생 명단, 계정 */
(function () {
  'use strict';
  const App = window.App;
  const { esc, $ } = App;
  const Store = window.Store;

  const STATUS = { active: '사용 중', ended: '퇴실', cancelled: '취소' };

  // ── 사용 기록 ──────────────────────────────────────────────
  function records(container, role) {
    let day = Store.dayKey(Date.now());
    function draw() {
      const rows = Store.records(day, role);
      const now = Store.now();
      const done = rows.filter((r) => r.status === 'ended');
      const avg = done.length ? Math.round(done.reduce((a, r) => a + (r.endedAt - r.startedAt), 0) / done.length / App.MIN) : 0;
      const table = rows.length
        ? '<div class="table-wrap"><table class="table"><thead><tr>' +
          ['시작', '종료', '침대', '학번', '이름', '반·그룹', '사용 시간', '연장', '등록 위치', '상태'].map((h) => '<th scope="col">' + h + '</th>').join('') +
          '</tr></thead><tbody>' + rows.map((r) => {
            const end = r.endedAt || now;
            return '<tr class="' + (r.status === 'active' ? (App.isOver(r, now) ? 'is-over' : 'is-active') : r.status === 'cancelled' ? 'is-cancelled' : '') + '">' +
              '<td class="num">' + App.hm(r.startedAt) + '</td>' +
              '<td class="num">' + (r.endedAt ? App.hm(r.endedAt) : '–') + '</td>' +
              '<td>' + esc(r.bedLabel) + '</td>' +
              '<td class="num">' + esc(r.studentNo) + '</td>' +
              '<td>' + esc(r.name) + '</td>' +
              '<td>' + esc(App.classOf(r)) + '</td>' +
              '<td class="num">' + App.elapsedText(r.startedAt, end) + '</td>' +
              '<td class="num">' + (r.extensionCount ? r.extensionCount + '회' : '–') + '</td>' +
              '<td>' + esc(App.SOURCE[r.source] || r.source) + '</td>' +
              '<td>' + (r.status === 'active' && App.isLeaving(r)
                ? '<span class="status status-leaving' + (App.isLeaveLate(r, now) ? ' is-late' : '') + '">' + window.icon('logout') + '퇴실 중 ' + App.elapsedText(r.leaveAt, now) + '</span>'
                : r.status === 'active' && App.isOver(r, now)
                ? '<span class="status status-over">' + window.icon('clock') + App.overLabel(r) + '</span>'
                : '<span class="status status-' + r.status + (r.unreturned ? ' is-auto' : '') + '">' + (r.unreturned ? '미퇴실 종료' : STATUS[r.status]) + '</span>') + '</td>' +
            '</tr>';
          }).join('') + '</tbody></table></div>'
        : '<div class="empty-state">' + window.icon('list') + '<p>' + esc(day) + '에는 사용 기록이 없습니다.</p></div>';

      container.innerHTML =
        '<section class="panel">' +
          '<header class="panel-head"><h2>사용 기록</h2>' +
            '<div class="panel-tools">' +
              '<label class="field-inline"><span>날짜</span><input type="date" name="day" value="' + day + '" max="' + Store.dayKey(Date.now()) + '"></label>' +
              '<button class="btn btn-ghost" data-act="export"' + (rows.length ? '' : ' disabled') + '>' + window.icon('download') + '<span>엑셀로 내보내기</span></button>' +
            '</div></header>' +
          '<p class="panel-sum">이용 <b>' + rows.filter((r) => r.status !== 'cancelled').length + '</b>명 <span class="dot">·</span> 퇴실 <b>' + done.length + '</b> <span class="dot">·</span> 사용 중 <b>' + rows.filter((r) => r.status === 'active').length + '</b> <span class="dot">·</span> 취소 <b>' + rows.filter((r) => r.status === 'cancelled').length + '</b>' + (avg ? ' <span class="dot">·</span> 평균 사용 시간 <b>' + App.durationText(avg) + '</b>' : '') + '</p>' +
          table +
        '</section>';
    }
    container.addEventListener('change', (e) => { if (e.target.name === 'day') { day = e.target.value || day; draw(); } });
    container.addEventListener('click', (e) => {
      if (!e.target.closest('[data-act=export]')) return;
      const rows = Store.records(day, role);
      const now = Store.now();
      App.download('보건실-침대-기록-' + day + '.csv', App.toCSV([
        ['날짜', '시작', '종료', '침대', '학번', '이름', '반', '그룹', '사용 시간(분)', '연장 횟수', '등록 위치', '상태'],
        ...rows.map((r) => [day, App.hm(r.startedAt), r.endedAt ? App.hm(r.endedAt) : '', r.bedLabel, r.studentNo, r.name, r.classNo || '', r.group || '',
          Math.floor(((r.endedAt || now) - r.startedAt) / App.MIN), r.extensionCount, App.SOURCE[r.source] || r.source,
          r.unreturned ? '미퇴실 종료' : r.status === 'active' && App.isLeaving(r) ? '퇴실 중' : r.status === 'active' && App.isOver(r, now) ? '사용 중(' + App.overLabel(r) + ')' : STATUS[r.status]]),
      ]));
    });
    draw();
    return { refresh: draw };
  }

  // ── 구글 시트 연동: 시트의 Apps Script에 붙여 넣을 코드 ─────────────
  // 처음 연동(연동 테스트)하면 '연장 기록' 탭과 제목 줄을 만든다. 같은 기록 번호는 두 번 쓰지 않는다.
  const APPS_SCRIPT = `// 보건실 침대 현황 → 연장 기록 (구글 시트 Apps Script)
// 1) 이 시트의 [확장 프로그램 → Apps Script]에 붙여 넣고 저장합니다.
// 2) [배포 → 새 배포 → 웹 앱], 실행: 나, 액세스: 모든 사용자 로 배포합니다.
// 처음 연동하면 '연장 기록' 탭과 제목 줄을 자동으로 만듭니다.
const SHEET_NAME = '연장 기록';
const HEADERS = ['기록 시각', '날짜', '연장 시각', '침대', '학번', '이름', '반', '그룹', '연장한 곳', '연장 횟수', '이전 끝나는 시각', '새 끝나는 시각', '연장 시간(분)', '기록 번호'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = getSheet_();
    const name = SpreadsheetApp.getActiveSpreadsheet().getName();
    if (data.type === 'test') return json_({ ok: true, sheet: name });
    const r = data.row || {};
    if (r.id && hasId_(sheet, r.id)) return json_({ ok: true, sheet: name, duplicate: true });
    sheet.appendRow([new Date(), r.date, r.time, r.bed, r.studentNo, r.name, r.classNo, r.group, r.by, r.count, r.prevDue, r.newDue, r.minutes, r.id]);
    return json_({ ok: true, sheet: name });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME, 0);
    sh.getRange('B:C').setNumberFormat('@');
    sh.getRange('E:E').setNumberFormat('@');
    sh.getRange('K:L').setNumberFormat('@');
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#FFD84D');
  }
  return sh;
}

function hasId_(sh, id) {
  const last = sh.getLastRow();
  if (last < 2) return false;
  return sh.getRange(2, HEADERS.length, last - 1, 1).getValues().some(function (v) { return v[0] === id; });
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
`;

  // ── 설정 ───────────────────────────────────────────────────
  // 근무 일정: 요일 순서는 월요일부터. 날짜별 변경 폼은 "휴무"가 기본.
  const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

  function settings(container, role) {
    let beds = Store.beds().map((b) => Object.assign({}, b));
    let dirtyBeds = false;
    let dayMode = 'off'; // 날짜별 변경: 'off'(휴무) | 'time'(시간 바꾸기)

    // "2026-11-20" → "11월 20일(금)"
    function dateLabel(key) {
      const [y, m, d] = key.split('-').map(Number);
      return m + '월 ' + d + '일(' + App.WEEKDAY[new Date(y, m - 1, d).getDay()] + ')';
    }
    // 그 날짜의 요일 근무 시간 (날짜별 변경 폼의 처음 값)
    function weekTimes(key) {
      const [y, m, d] = key.split('-').map(Number);
      return Store.dutySchedule().week[new Date(y, m - 1, d).getDay()];
    }

    function dutyHTML() {
      const sched = Store.dutySchedule();
      const today = Store.dayKey(Date.now());
      const t = weekTimes(today);
      const timeOff = dayMode === 'time' ? '' : ' disabled';
      return '<section class="panel" id="set-duty"><header class="panel-head"><h2>근무 일정</h2>' +
          '<p class="panel-note">보건 선생님 근무 시간 외에는 학생용 태블릿이 현황만 보여 주고, 등록·연장·퇴실은 학생지원실에서만 가능합니다.</p></header>' +
        '<form data-form="duty-week"><ul class="duty-week">' +
          WEEK_ORDER.map((i) => {
            const w = sched.week[i];
            const day = App.WEEKDAY[i] + '요일';
            return '<li class="duty-row' + (w.on ? '' : ' is-off') + '">' +
              '<label class="duty-day"><input type="checkbox" name="on' + i + '"' + (w.on ? ' checked' : '') + '><span>' + day + '</span></label>' +
              '<label class="duty-time"><span class="sr">' + day + ' 출근</span><input type="time" name="start' + i + '" value="' + esc(w.start) + '"' + (w.on ? '' : ' disabled') + '></label>' +
              '<span class="duty-sep" aria-hidden="true">~</span>' +
              '<label class="duty-time"><span class="sr">' + day + ' 퇴근</span><input type="time" name="end' + i + '" value="' + esc(w.end) + '"' + (w.on ? '' : ' disabled') + '></label>' +
              '<span class="duty-offword">휴무</span>' +
            '</li>';
          }).join('') +
        '</ul><div class="row-actions"><span class="spacer"></span><button class="btn btn-primary">요일별 근무 시간 저장</button></div></form>' +
        '<h3 class="sub-head">날짜별 변경</h3>' +
        '<p class="panel-note">연차, 조퇴의 경우 적어 둡니다.<br>같은 날짜를 다시 등록하면 최근 정보로 바뀌고, 지난 정보는 자동으로 삭제됩니다.</p>' +
        (sched.days.length
          ? '<ul class="duty-days">' + sched.days.map((x) => '<li class="duty-special">' +
              '<b>' + dateLabel(x.date) + (x.date === today ? ' · 오늘' : '') + '</b>' +
              '<span>' + (x.on ? esc(x.start) + ' ~ ' + esc(x.end) : '휴무') + '</span>' +
              (x.note ? '<span class="duty-note">' + esc(x.note) + '</span>' : '') +
              '<span class="spacer"></span>' +
              '<button type="button" class="icon-btn btn-ghost is-danger" data-duty-del="' + esc(x.date) + '" aria-label="' + dateLabel(x.date) + ' 변경 지우기">' + window.icon('trash') + '</button>' +
            '</li>').join('') + '</ul>'
          : '') +
        '<form class="duty-add" data-form="duty-day">' +
          '<label class="field"><span>날짜</span><input type="date" name="date" value="' + today + '" min="' + today + '" required></label>' +
          '<fieldset class="field seg"><legend>근무 형태</legend>' +
            '<label><input type="radio" name="mode" value="off"' + (dayMode === 'off' ? ' checked' : '') + '><span data-label="휴무">휴무</span></label>' +
            '<label><input type="radio" name="mode" value="time"' + (dayMode === 'time' ? ' checked' : '') + '><span data-label="시간 바꾸기">시간 바꾸기</span></label></fieldset>' +
          '<label class="field"><span>출근</span><input type="time" name="start" value="' + esc(t.start) + '"' + timeOff + '></label>' +
          '<label class="field"><span>퇴근</span><input type="time" name="end" value="' + esc(t.end) + '"' + timeOff + '></label>' +
          '<label class="field duty-note-field"><span>메모 (적지 않아도 됩니다)</span><input name="note" maxlength="20" placeholder="연차, 조퇴"></label>' +
          '<button class="btn btn-ghost">' + window.icon('plus') + '<span>추가</span></button>' +
        '</form>' +
      '</section>';
    }

    // 근무 일정 패널만 다시 그린다 (다른 설정 폼에 적던 내용은 그대로 둔다)
    function drawDuty() {
      const old = container.querySelector('#set-duty');
      if (old) old.outerHTML = dutyHTML();
    }

    function saveDuty(next, message) {
      try { Store.setDutySchedule(next); App.toast(message); drawDuty(); return true; }
      catch (err) { App.sound.error(); App.toast(err.message, 'error'); return false; }
    }

    function bedRows() {
      return beds.map((b, i) =>
        '<li class="bed-row" data-i="' + i + '">' +
          '<input class="bed-label" aria-label="침대 이름" value="' + esc(b.label) + '" maxlength="8">' +
          '<select class="bed-zone" aria-label="구역"><option value="M"' + (b.zone === 'M' ? ' selected' : '') + '>남학생</option><option value="F"' + (b.zone === 'F' ? ' selected' : '') + '>여학생</option></select>' +
          '<select class="bed-tier" aria-label="침대 형태"><option value=""' + (!b.tier ? ' selected' : '') + '>일반 침대</option><option value="lower"' + (b.tier === 'lower' ? ' selected' : '') + '>2층 침대 아래층</option><option value="upper"' + (b.tier === 'upper' ? ' selected' : '') + '>2층 침대 위층</option></select>' +
          '<span class="spacer"></span>' +
          '<button type="button" class="icon-btn btn-ghost" data-bed-act="up" aria-label="위로"' + (i === 0 ? ' disabled' : '') + '>' + window.icon('arrowUp') + '</button>' +
          '<button type="button" class="icon-btn btn-ghost" data-bed-act="down" aria-label="아래로"' + (i === beds.length - 1 ? ' disabled' : '') + '>' + window.icon('arrowDown') + '</button>' +
          '<button type="button" class="icon-btn btn-ghost is-danger" data-bed-act="remove" aria-label="' + esc(b.label) + ' 침대 빼기">' + window.icon('trash') + '</button>' +
        '</li>').join('');
    }

    function extPwState() {
      return Store.hasExtendPassword()
        ? window.icon('check') + '<span>연장 암호가 정해져 있습니다. 바꾸려면 새 암호를 넣고 저장합니다.</span>'
        : '<span class="is-warn">' + window.icon('lock') + '<span>연장 암호가 아직 없습니다. 정하기 전에는 아무도 연장할 수 없습니다.</span></span>';
    }
    function sheetState() {
      const st = Store.settings();
      if (!st.sheetUrl) return '<span>아직 연동하지 않았습니다.</span>';
      const q = Store.sheetStatus();
      return window.icon('check') + '<span>연동되어 있습니다.' + (q.pending ? ' 보내는 중 ' + q.pending + '건.' : '') + '</span>' +
        (q.failed ? ' <span class="is-warn">보내지 못한 연장 기록 ' + q.failed + '건</span> <button type="button" class="btn btn-ghost btn-sm" data-sheet-retry>' + window.icon('refresh') + '<span>다시 보내기</span></button>' : '');
    }

    function draw() {
      const st = Store.settings();
      const opt = (vals, cur, unit) => vals.map((v) => '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + v + unit + '</option>').join('');
      container.innerHTML =
        '<div class="settings">' +
        dutyHTML() +
        '<section class="panel" id="set-beds"><header class="panel-head"><h2>침대</h2><p class="panel-note">보건실 배치 순서를 변경할 수 있습니다.</p></header>' +
          '<ol class="bed-list">' + bedRows() + '</ol>' +
          '<div class="row-actions"><button type="button" class="btn btn-ghost" data-bed-act="add-M">' + window.icon('plus') + '<span>남학생 침대 추가</span></button>' +
          '<button type="button" class="btn btn-ghost" data-bed-act="add-F">' + window.icon('plus') + '<span>여학생 침대 추가</span></button>' +
          '<span class="spacer"></span><button type="button" class="btn btn-primary" data-bed-act="save"' + (dirtyBeds ? '' : ' disabled') + '>침대 저장</button></div>' +
        '</section>' +
        '<section class="panel"><header class="panel-head"><h2>사용 시간과 연장</h2></header>' +
          '<form class="form-grid" data-form="time">' +
            '<label class="field"><span>사용 시간</span><input value="등록 후 다음 정각까지 (고정)" disabled></label>' +
            '<label class="field"><span>연장 1회 시간</span><select name="extendMinutes">' + opt([30, 60], st.extendMinutes, '분') + '</select></label>' +
            '<label class="field check"><input type="checkbox" name="alertSound"' + (st.alertSound ? ' checked' : '') + '><span>사용 시간이 지나면 보건 선생님 화면에서 알림음 울리기</span></label>' +
            (role === 'admin' ? '<label class="field check"><input type="checkbox" name="alertSoundSupport"' + (st.alertSoundSupport ? ' checked' : '') + '><span>사용 시간이 지나면 학생지원실 화면에서 알림음 울리기</span></label>' : '') +
            '<div class="row-actions"><button type="button" class="btn btn-ghost" data-preview-alert>' + window.icon('volume') + '<span>알림음 테스트</span></button>' +
              '<span class="spacer"></span><button class="btn btn-primary">저장</button></div>' +
          '</form></section>' +
        '<section class="panel" id="set-extpw"><header class="panel-head"><h2>연장 암호</h2><p class="panel-note">보건 선생님·보건 조교·학지실 PC에서 연장할 때마다 넣는 암호입니다.</p></header>' +
          '<p class="set-state" data-extpw-state>' + extPwState() + '</p>' +
          '<form class="form-grid" data-form="extpw">' +
            '<label class="field"><span>새 연장 암호 (4자 이상)</span><input name="pw1" type="password" autocomplete="new-password" required></label>' +
            '<label class="field"><span>한 번 더</span><input name="pw2" type="password" autocomplete="new-password" required></label>' +
            '<div class="row-actions"><span class="spacer"></span><button class="btn btn-primary">연장 암호 저장</button></div>' +
          '</form></section>' +
        '<section class="panel" id="set-sheet"><header class="panel-head"><h2>구글 시트 연동 (연장 기록)</h2><p class="panel-note">연장할 때마다 날짜·시각·침대·학생·연장한 곳이 구글 시트에 한 줄씩 남습니다. 처음 한 번 아래 순서대로 연동합니다.</p></header>' +
          '<ol class="steps">' +
            '<li><b>새 구글 시트 만들기</b><span>학교 구글 계정으로 로그인한 상태에서 누릅니다. 시트 이름은 자유롭게 정하세요.</span>' +
              '<a class="btn btn-ghost btn-sm" href="https://sheets.new" target="_blank" rel="noopener">' + window.icon('plus') + '<span>새 구글 시트 만들기</span></a></li>' +
            '<li><b>코드 붙여 넣기</b><span>시트 메뉴 <b>확장 프로그램 → Apps Script</b>를 열고, 원래 있던 내용을 모두 지운 뒤 코드를 붙여 넣고 저장합니다.</span>' +
              '<span class="step-actions"><button type="button" class="btn btn-ghost btn-sm" data-copy-script>' + window.icon('list') + '<span>코드 복사</span></button></span>' +
              '<details class="code-box"><summary>코드 보기</summary><pre class="code" data-script>' + esc(APPS_SCRIPT) + '</pre></details></li>' +
            '<li><b>웹 앱으로 배포</b><span>오른쪽 위 <b>배포 → 새 배포</b> → 유형 <b>웹 앱</b> → 실행: <b>나</b>(Me), 액세스: <b>모든 사용자</b>(Anyone) → <b>배포</b> → 권한 허용 → <b>웹 앱 URL</b>을 복사합니다.</span></li>' +
            '<li><b>연동 테스트 후 저장</b><span>복사한 주소를 아래 칸에 붙여 넣고 <b>연동 테스트</b>를 누릅니다. 시트에 \'연장 기록\' 탭과 제목 줄이 생기면 <b>저장</b>을 누릅니다.</span></li>' +
          '</ol>' +
          '<form class="form-grid" data-form="sheet">' +
            '<label class="field field-full"><span>웹 앱 주소</span><input name="sheetUrl" type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="https://script.google.com/macros/s/…/exec" value="' + esc(st.sheetUrl || '') + '"></label>' +
            '<p class="field-help">비워 두고 저장하면 시트로 보내지 않습니다. 시트로는 Netlify 주소(…netlify.app)로 연 화면에서만 보냅니다.</p>' +
            '<div class="row-actions"><button type="button" class="btn btn-ghost" data-sheet-test>' + window.icon('check') + '<span>연동 테스트</span></button>' +
              '<span class="spacer"></span><button class="btn btn-primary">저장</button></div>' +
          '</form>' +
          '<p class="set-state" data-sheet-state>' + sheetState() + '</p>' +
        '</section>' +
        '<section class="panel" id="set-jandi"><header class="panel-head"><h2>잔디 알림</h2><p class="panel-note">학생이 퇴실을 요청하고 ' + Store.LEAVE_ALERT_MINUTES + '분이 지나도 학생지원실에서 퇴실 확인이 되지 않으면 잔디 대화방으로 알립니다.</p></header>' +
          '<form class="form-grid" data-form="jandi">' +
            '<label class="field field-full"><span>잔디 웹훅 주소</span><input name="jandiUrl" type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="https://wh.jandi.com/connect-api/webhook/…" value="' + esc(st.jandiUrl || '') + '"></label>' +
            '<p class="field-help">잔디 대화방에서 연동(커넥트) → Incoming Webhook을 추가하면 주소를 받을 수 있습니다. 비워 두고 저장하면 보내지 않습니다.</p>' +
            '<div class="row-actions"><button type="button" class="btn btn-ghost" data-jandi-test>' + window.icon('bell') + '<span>테스트 보내기</span></button>' +
              '<span class="spacer"></span><button class="btn btn-primary">저장</button></div>' +
          '</form></section>' +
        (role === 'admin' ? accountsHTML() : '') +
        '</div>';
    }

    function accountsHTML() {
      return '<section class="panel"><header class="panel-head"><h2>계정</h2><p class="panel-note">로그인 아이디에 따라 열리는 화면이 정해집니다. 관리자는 모든 화면을 열 수 있습니다.</p></header>' +
        '<div class="table-wrap"><table class="table"><thead><tr><th scope="col">아이디</th><th scope="col">역할</th><th scope="col">이름</th><th scope="col"><span class="sr">비밀번호</span></th></tr></thead><tbody>' +
        Store.accounts().map((a) => '<tr><td class="num">' + esc(a.id) + '</td><td>' + App.ROLE[a.role] + '</td><td>' + esc(a.name) + '</td>' +
          '<td class="cell-actions"><button type="button" class="btn btn-ghost btn-sm" data-pw="' + esc(a.id) + '">' + window.icon('key') + '<span>비밀번호 바꾸기</span></button></td></tr>').join('') +
        '</tbody></table></div></section>' +
        '<section class="panel panel-danger"><header class="panel-head"><h2>시제품 데이터</h2><p class="panel-note">모든 사용 기록, 명단, 설정을 처음 예시 상태로 되돌립니다.</p></header>' +
        '<div class="row-actions"><span class="spacer"></span><button type="button" class="btn btn-danger" data-reset>' + window.icon('refresh') + '<span>예시 데이터로 초기화</span></button></div></section>';
    }

    container.addEventListener('input', (e) => {
      const row = e.target.closest('.bed-row');
      if (!row) return;
      const b = beds[Number(row.dataset.i)];
      if (e.target.classList.contains('bed-label')) b.label = e.target.value;
      dirtyBeds = true;
      container.querySelector('[data-bed-act=save]').disabled = false;
    });
    container.addEventListener('change', (e) => {
      const row = e.target.closest('.bed-row');
      if (row && (e.target.classList.contains('bed-zone') || e.target.classList.contains('bed-tier'))) {
        const b = beds[Number(row.dataset.i)];
        if (e.target.classList.contains('bed-zone')) b.zone = e.target.value;
        else b.tier = e.target.value || null;
        dirtyBeds = true;
        container.querySelector('[data-bed-act=save]').disabled = false;
      }
    });
    // 근무 일정 입력: 요일을 끄면 시각 칸을 숨기고, 날짜별 변경은 "시간 바꾸기"일 때만 시각을 받는다
    container.addEventListener('change', (e) => {
      const t = e.target;
      if (!t.closest('#set-duty')) return;
      const dutyRow = t.closest('.duty-row');
      if (dutyRow && t.type === 'checkbox') {
        dutyRow.classList.toggle('is-off', !t.checked);
        dutyRow.querySelectorAll('input[type=time]').forEach((x) => { x.disabled = !t.checked; });
      } else if (t.name === 'mode') {
        dayMode = t.value;
        t.form.elements.start.disabled = t.form.elements.end.disabled = dayMode !== 'time';
      } else if (t.name === 'date' && t.value) {
        const w = weekTimes(t.value);
        t.form.elements.start.value = w.start;
        t.form.elements.end.value = w.end;
      }
    });
    container.addEventListener('click', async (e) => {
      if (e.target.closest('[data-preview-alert]')) { App.previewOverAlert('사용 시간이 지나면 이렇게 알립니다. 실제 알림 때 알림음은 위 체크 상자가 켜져 있을 때만 울립니다.'); return; } // 윈도우 알림 허용도 여기서 물어본다
      if (e.target.closest('[data-copy-script]')) {
        const pre = container.querySelector('[data-script]');
        try { await navigator.clipboard.writeText(APPS_SCRIPT); App.toast('코드를 복사했습니다. Apps Script에 붙여 넣으세요'); }
        catch (err) {
          // 클립보드를 쓸 수 없는 화면: 코드를 펼치고 선택해 둔다 (Ctrl+C로 복사)
          pre.closest('details').open = true;
          const range = document.createRange(); range.selectNodeContents(pre);
          const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
          App.toast('코드를 선택해 두었습니다. Ctrl + C로 복사하세요');
        }
        return;
      }
      const stt = e.target.closest('[data-sheet-test]');
      if (stt) {
        const url = stt.form.sheetUrl.value.trim();
        if (!Store.isSheetUrl(url)) { App.toast('Apps Script 웹 앱 주소가 아닙니다. https://script.google.com/macros/s/…/exec 형식의 주소를 붙여 넣어 주세요.', 'error'); return; }
        stt.disabled = true;
        const r = await App.sendSheet(url, { type: 'test' });
        stt.disabled = false;
        if (r.ok) App.toast('구글 시트' + (r.sheet ? ' "' + r.sheet + '"' : '') + '에 연결했습니다. \'연장 기록\' 탭을 확인하고 저장을 누르세요');
        else App.toast(r.reason === 'file' || r.reason === 'no-function'
          ? '이 화면에서는 구글 시트로 보낼 수 없습니다. Netlify 주소(…netlify.app)로 연 화면에서 해 주세요.'
          : r.reason === 'network' ? '구글 시트로 보내지 못했습니다. 인터넷 연결을 확인해 주세요.'
          : (r.reason || '구글 시트로 보내지 못했습니다. 주소를 다시 확인해 주세요.'), 'error');
        return;
      }
      if (e.target.closest('[data-sheet-retry]')) {
        const n = Store.retrySheet();
        App.toast(n ? '보내지 못한 연장 기록 ' + n + '건을 다시 보냅니다' : '다시 보낼 기록이 없습니다');
        return;
      }
      const jt = e.target.closest('[data-jandi-test]');
      if (jt) {
        // 저장하지 않은 주소도 시험할 수 있다 (입력 칸에 적힌 주소로 보낸다)
        const url = jt.form.jandiUrl.value.trim();
        if (!Store.isJandiUrl(url)) { App.toast('잔디 웹훅 주소가 아닙니다. https://wh.jandi.com/connect-api/webhook/… 로 시작하는 주소를 붙여 넣어 주세요.', 'error'); return; }
        jt.disabled = true;
        const r = await App.sendJandi(url, {
          body: '[보건실] 잔디 알림 테스트',
          color: '#263035',
          info: [{ title: '안내', description: '보건실 침대 현황에서 보낸 테스트 메시지입니다. 학생이 퇴실을 요청하고 ' + Store.LEAVE_ALERT_MINUTES + '분이 지나도 학생지원실에서 퇴실 확인이 되지 않으면 이 대화방으로 알립니다.' }],
        });
        jt.disabled = false;
        if (r.ok) App.toast('잔디로 테스트 메시지를 보냈습니다. 잔디 대화방을 확인해 주세요');
        else App.toast(r.reason === 'file' || r.reason === 'no-function'
          ? '이 화면에서는 잔디로 보낼 수 없습니다. Netlify 주소(…netlify.app)로 연 화면에서 해 주세요.'
          : r.reason === 'network' ? '잔디로 보내지 못했습니다. 인터넷 연결을 확인해 주세요.'
          : '잔디로 보내지 못했습니다. ' + (r.reason || '주소를 다시 확인해 주세요.'), 'error');
        return;
      }
      const del = e.target.closest('[data-duty-del]');
      if (del) {
        const date = del.dataset.dutyDel;
        const s = Store.dutySchedule();
        s.days = s.days.filter((x) => x.date !== date);
        saveDuty(s, dateLabel(date) + ' 변경을 지웠습니다');
        return;
      }
      const b = e.target.closest('[data-bed-act]');
      if (b) {
        const act = b.dataset.bedAct;
        const row = b.closest('.bed-row');
        const i = row ? Number(row.dataset.i) : -1;
        if (act === 'up' && i > 0) [beds[i - 1], beds[i]] = [beds[i], beds[i - 1]];
        else if (act === 'down' && i < beds.length - 1) [beds[i + 1], beds[i]] = [beds[i], beds[i + 1]];
        else if (act === 'remove') beds.splice(i, 1);
        else if (act === 'add-M' || act === 'add-F') beds.push({ id: null, label: (beds.length + 1) + '번', zone: act.slice(-1) });
        else if (act === 'save') {
          if (beds.some((x) => !x.label.trim())) { App.toast('침대 이름을 비워 둘 수 없습니다.', 'error'); return; }
          try { Store.saveBeds(beds.map((x) => ({ id: x.id, label: x.label.trim(), zone: x.zone, tier: x.tier || null }))); dirtyBeds = false; beds = Store.beds().map((x) => Object.assign({}, x)); App.toast('침대 설정을 저장했습니다'); }
          catch (err) { App.toast(err.message, 'error'); }
          draw();
          return;
        }
        dirtyBeds = true;
        draw();
        return;
      }
      const pw = e.target.closest('[data-pw]');
      if (pw) {
        const id = pw.dataset.pw;
        const v = await App.dialog({
          title: id + ' 비밀번호 바꾸기',
          body: '<label class="field"><span>새 비밀번호</span><input name="p1" type="password" autocomplete="new-password" autofocus></label>' +
                '<label class="field"><span>한 번 더</span><input name="p2" type="password" autocomplete="new-password"></label><p class="field-error" hidden></p>',
          actions: [{ label: '취소', value: '__cancel' }, { label: '바꾸기', value: 'ok', kind: 'primary' }],
          onSubmit(dlg) {
            const p1 = dlg.querySelector('[name=p1]').value, p2 = dlg.querySelector('[name=p2]').value;
            const err = dlg.querySelector('.field-error');
            if (p1.length < 4) { err.hidden = false; err.textContent = '4자 이상으로 정해 주세요.'; return false; }
            if (p1 !== p2) { err.hidden = false; err.textContent = '두 번 입력한 비밀번호가 다릅니다.'; return false; }
            return 'pw:' + p1;
          },
        });
        if (v) { Store.setPassword(id, v.slice(3)); App.toast(id + ' 비밀번호를 바꿨습니다'); }
        return;
      }
      if (e.target.closest('[data-reset]')) {
        const ok = await App.confirmDialog('예시 데이터로 초기화', '모든 기록과 명단, 설정이 처음 예시 상태로 돌아갑니다. 계속할까요?', '초기화', 'danger');
        if (ok) { Store.resetDemo(); App.toast('예시 데이터로 되돌렸습니다'); beds = Store.beds().map((x) => Object.assign({}, x)); dirtyBeds = false; draw(); }
      }
    });
    container.addEventListener('submit', (e) => {
      const f = e.target.closest('form[data-form]');
      if (!f) return;
      e.preventDefault();
      if (f.dataset.form === 'time') {
        const patch = { extendMinutes: Number(f.extendMinutes.value), alertSound: f.alertSound.checked };
        if (f.alertSoundSupport) patch.alertSoundSupport = f.alertSoundSupport.checked;
        Store.updateSettings(patch);
        App.toast('사용 시간과 연장 설정을 저장했습니다');
      } else if (f.dataset.form === 'extpw') {
        if (f.pw1.value !== f.pw2.value) { App.toast('두 번 입력한 연장 암호가 다릅니다.', 'error'); return; }
        try { Store.setExtendPassword(f.pw1.value); f.reset(); App.toast('연장 암호를 저장했습니다'); }
        catch (err) { App.toast(err.message, 'error'); }
      } else if (f.dataset.form === 'sheet') {
        try {
          const u = Store.setSheetUrl(f.sheetUrl.value);
          f.sheetUrl.value = u;
          App.toast(u ? '구글 시트 연동을 저장했습니다. 이제 연장 기록이 시트에 남습니다' : '구글 시트 연동을 껐습니다');
        } catch (err) { App.toast(err.message, 'error'); }
      } else if (f.dataset.form === 'jandi') {
        try {
          const u = Store.setJandiUrl(f.jandiUrl.value);
          f.jandiUrl.value = u;
          App.toast(u ? '잔디 알림 주소를 저장했습니다' : '잔디 알림을 껐습니다');
        } catch (err) { App.toast(err.message, 'error'); }
      } else if (f.dataset.form === 'duty-week') {
        const el = f.elements;
        const s = Store.dutySchedule();
        s.week = s.week.map((w, i) => ({ on: el['on' + i].checked, start: el['start' + i].value, end: el['end' + i].value }));
        saveDuty(s, '요일별 근무 시간을 저장했습니다');
      } else if (f.dataset.form === 'duty-day') {
        const el = f.elements;
        const date = el.date.value;
        if (!date) { App.toast('날짜를 골라 주세요.', 'error'); return; }
        const s = Store.dutySchedule();
        const had = s.days.some((x) => x.date === date);
        s.days = s.days.filter((x) => x.date !== date)
          .concat([{ date, on: dayMode === 'time', start: el.start.value, end: el.end.value, note: el.note.value }]);
        saveDuty(s, dateLabel(date) + (had ? ' 일정을 바꿨습니다' : ' 일정을 추가했습니다'));
      }
    });
    draw();
    return {
      refresh() {
        if (!dirtyBeds) { beds = Store.beds().map((x) => Object.assign({}, x)); }
        const a = container.querySelector('[data-extpw-state]'); if (a) a.innerHTML = extPwState();
        const b = container.querySelector('[data-sheet-state]'); if (b) b.innerHTML = sheetState();
      },
    };
  }

  // ── 학생 명단 ──────────────────────────────────────────────
  // 명단 열: 반, 그룹, 이름, 학번, 성별 (첫 줄에 열 이름이 없으면 이 순서로 읽는다)
  const HEAD = { classNo: /^반$/, group: /^(그룹|group)$/i, name: /^(이름|성명|name)$/i, no: /^(학번|학생번호|id)$/i, gender: /^(성별|gender)$/i };

  function rowsToStudents(table) {
    if (!table.length) return [];
    const head = table[0].map((c) => String(c).trim());
    const idx = {};
    Object.keys(HEAD).forEach((k) => { const i = head.findIndex((h) => HEAD[k].test(h)); if (i >= 0) idx[k] = i; });
    const hasHead = 'no' in idx && 'name' in idx;
    const order = hasHead ? idx : { classNo: 0, group: 1, name: 2, no: 3, gender: 4 };
    return table.slice(hasHead ? 1 : 0).map((r) => {
      const o = {};
      Object.keys(order).forEach((k) => { o[k] = r[order[k]]; });
      return o;
    });
  }

  function loadedAt(ts) {
    const d = new Date(ts);
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + App.hm(ts);
  }

  function roster(container) {
    let query = '';
    // 검색할 때는 표의 줄만 다시 그린다. 검색칸까지 다시 만들면 한글 입력(조합 중인 글자)이 끊겨 자음·모음이 풀어진다.
    function sumHTML() {
      const list = Store.students();
      const m = list.filter((s) => s.gender === 'M').length, f = list.filter((s) => s.gender === 'F').length;
      return '전체 <b>' + list.length + '</b>명 <span class="dot">·</span> 남 ' + m + ' <span class="dot">·</span> 여 ' + f;
    }
    function rowsHTML() {
      const shown = Store.students().filter((s) => !query || s.no.includes(query) || s.name.includes(query)).slice(0, 200);
      return shown.map((s) => '<tr><td>' + esc(s.classNo || '') + '</td><td>' + esc(s.group || '') + '</td><td>' + esc(s.name) + '</td><td class="num">' + esc(s.no) + '</td><td>' + (s.gender === 'M' ? '남' : s.gender === 'F' ? '여' : '–') + '</td></tr>').join('');
    }
    function drawList() {
      const sum = container.querySelector('[data-roster-sum]');
      const body = container.querySelector('[data-roster-rows]');
      if (sum) sum.innerHTML = sumHTML();
      if (body) body.innerHTML = rowsHTML();
    }
    function draw() {
      const st = Store.settings();
      container.innerHTML =
        '<div class="roster">' +
        '<section class="panel"><header class="panel-head"><h2>명단 바꾸기</h2><p class="panel-note">구글 스프레드시트에서 불러옵니다. 한 번 불러온 링크는 기억해 두었다가 다음에는 바로 다시 불러옵니다. 열 이름: 반, 그룹, 이름, 학번, 성별.</p></header>' +
          '<div class="import">' +
            '<form class="field-stack" data-form="sheet"><label class="field"><span>구글 스프레드시트 링크</span><input name="url" type="url" value="' + esc(st.rosterSheetUrl || '') + '" placeholder="파일 → 공유 → 웹에 게시 → CSV 링크"></label>' +
              '<button class="btn btn-primary">' + window.icon(st.rosterSheetUrl ? 'refresh' : 'download') + '<span>' + (st.rosterSheetUrl ? '다시 불러오기' : '불러오기') + '</span></button>' +
              (st.rosterLoadedAt ? '<p class="panel-note">마지막으로 불러온 시각 ' + loadedAt(st.rosterLoadedAt) + '</p>' : '') + '</form>' +
            // 다른 두 칸처럼 제목을 위에 두어 세 칸의 상자 윗선을 맞춘다
            '<div class="field"><span>파일 올리기</span>' +
              '<label class="drop"><input type="file" name="file" accept=".csv,.tsv,.txt,.xlsx,.xls">' + window.icon('upload') + '<b>엑셀·CSV 파일 고르기</b><small>.xlsx .csv .tsv</small></label></div>' +
            '<form class="field-stack" data-form="paste"><label class="field"><span>붙여 넣기</span><textarea name="text" rows="4" placeholder="스프레드시트에서 복사해 붙여 넣기"></textarea></label><button class="btn btn-ghost">읽기</button></form>' +
          '</div>' +
          '<div class="row-actions"><button type="button" class="btn btn-quiet" data-template>' + window.icon('download') + '<span>빈 양식 받기</span></button></div>' +
        '</section>' +
        '<section class="panel"><header class="panel-head"><h2>지금 명단</h2><p class="panel-sum" data-roster-sum>' + sumHTML() + '</p>' +
          '<div class="panel-tools"><label class="field-inline"><span class="sr">검색</span><input type="search" name="q" placeholder="학번·이름 검색" value="' + esc(query) + '"></label></div></header>' +
          '<div class="table-wrap"><table class="table"><thead><tr><th scope="col">반</th><th scope="col">그룹</th><th scope="col">이름</th><th scope="col">학번</th><th scope="col">성별</th></tr></thead><tbody data-roster-rows>' + rowsHTML() + '</tbody></table></div>' +
        '</section></div>';
    }

    async function apply(students, from, meta) {
      if (!students.length) { App.toast('읽을 수 있는 학생이 없습니다. 학번과 이름 열을 확인해 주세요.', 'error'); return; }
      const preview = students.slice(0, 5).map((s) => '<tr><td>' + esc(s.classNo || '') + '</td><td>' + esc(s.group || '') + '</td><td>' + esc(s.name || '') + '</td><td class="num">' + esc(s.no || '') + '</td><td>' + esc(s.gender || '') + '</td></tr>').join('');
      const ok = await App.dialog({
        title: '명단 바꾸기',
        wide: true,
        body: '<p class="sheet-text">' + esc(from) + '에서 <b>' + students.length + '명</b>을 읽었습니다. 지금 명단을 이 명단으로 바꿀까요? 사용 중인 침대와 기록은 그대로 남습니다.</p>' +
          '<div class="table-wrap"><table class="table"><thead><tr><th>반</th><th>그룹</th><th>이름</th><th>학번</th><th>성별</th></tr></thead><tbody>' + preview + '</tbody></table></div>' +
          (students.length > 5 ? '<p class="panel-note">처음 5명만 보여 줍니다.</p>' : ''),
        actions: [{ label: '취소', value: '__cancel' }, { label: students.length + '명으로 바꾸기', value: 'yes', kind: 'primary' }],
      });
      if (ok !== 'yes') return;
      try { const n = Store.importRoster(students, meta); App.toast('명단을 ' + n + '명으로 바꿨습니다'); draw(); }
      catch (e) { App.toast(e.message, 'error'); }
    }

    container.addEventListener('change', async (e) => {
      if (e.target.name !== 'file' || !e.target.files[0]) return;
      const file = e.target.files[0];
      try {
        let table;
        if (/\.xlsx?$/i.test(file.name)) {
          if (!window.XLSX) { App.toast('엑셀 파일을 읽으려면 인터넷 연결이 필요합니다. CSV로 저장해 올려 주세요.', 'error'); return; }
          const wb = window.XLSX.read(await file.arrayBuffer(), { type: 'array' });
          table = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false });
        } else {
          table = App.parseCSV(await file.text());
        }
        await apply(rowsToStudents(table), file.name);
      } catch (err) { App.toast('파일을 읽지 못했습니다. 형식을 확인해 주세요.', 'error'); }
      e.target.value = '';
    });
    container.addEventListener('input', (e) => {
      if (e.target.name !== 'q') return;
      query = e.target.value.trim();
      drawList(); // 검색칸은 그대로 두고 표만 바꾼다
    });
    container.addEventListener('submit', async (e) => {
      const f = e.target.closest('form[data-form]');
      if (!f) return;
      e.preventDefault();
      if (f.dataset.form === 'paste') await apply(rowsToStudents(App.parseCSV(f.text.value)), '붙여 넣은 내용');
      if (f.dataset.form === 'sheet') {
        const url = f.url.value.trim();
        if (!url) return;
        try {
          const csvUrl = url.includes('output=csv') || url.includes('format=csv') ? url : url.replace(/\/edit.*$/, '/export?format=csv');
          const res = await fetch(csvUrl);
          if (!res.ok) throw new Error();
          await apply(rowsToStudents(App.parseCSV(await res.text())), '구글 스프레드시트', { sheetUrl: url });
        } catch (err) {
          App.toast('스프레드시트를 불러오지 못했습니다. "웹에 게시"한 CSV 링크인지 확인해 주세요.', 'error');
        }
      }
    });
    container.addEventListener('click', (e) => {
      if (e.target.closest('[data-template]')) App.download('학생명단-양식.csv', App.toCSV([['반', '그룹', '이름', '학번', '성별'], ['1', 'A', '홍길동', '1001', '남']]));
    });
    draw();
    // 다른 기기에서 바뀐 내용이 들어올 때: 검색·링크·붙여 넣기 칸에 입력 중이면 그 칸은 건드리지 않고 표만 바꾼다
    return {
      refresh() {
        const a = document.activeElement;
        if (a && container.contains(a) && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')) drawList();
        else draw();
      },
    };
  }

  Object.assign(App, { viewRecords: records, viewSettings: settings, viewRoster: roster });
})();
