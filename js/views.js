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
          ['시작', '종료', '침대', '학번', '이름', '학년·반', '사용 시간', '연장', '등록 위치', '상태'].map((h) => '<th scope="col">' + h + '</th>').join('') +
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
              '<td>' + (r.status === 'active' && App.isOver(r, now)
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
        ['날짜', '시작', '종료', '침대', '학번', '이름', '학년', '반', '사용 시간(분)', '연장 횟수', '등록 위치', '상태'],
        ...rows.map((r) => [day, App.hm(r.startedAt), r.endedAt ? App.hm(r.endedAt) : '', r.bedLabel, r.studentNo, r.name, r.grade || '', r.classNo || '',
          Math.floor(((r.endedAt || now) - r.startedAt) / App.MIN), r.extensionCount, App.SOURCE[r.source] || r.source,
          r.unreturned ? '미퇴실 종료' : r.status === 'active' && App.isOver(r, now) ? '사용 중(' + App.overLabel(r) + ')' : STATUS[r.status]]),
      ]));
    });
    draw();
    return { refresh: draw };
  }

  // ── 설정 ───────────────────────────────────────────────────
  function settings(container, role) {
    let beds = Store.beds().map((b) => Object.assign({}, b));
    let dirtyBeds = false;

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

    function draw() {
      const st = Store.settings();
      const opt = (vals, cur, unit) => vals.map((v) => '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + v + unit + '</option>').join('');
      container.innerHTML =
        '<div class="settings">' +
        '<section class="panel" id="set-beds"><header class="panel-head"><h2>침대</h2><p class="panel-note">실제 보건실 배치와 같은 순서로 놓습니다. 구역별로 화면 왼쪽(남학생)과 오른쪽(여학생)에 나뉩니다. 2층 침대는 아래층과 위층을 나란히 두면 한 칸으로 묶여 보입니다.</p></header>' +
          '<ol class="bed-list">' + bedRows() + '</ol>' +
          '<div class="row-actions"><button type="button" class="btn btn-ghost" data-bed-act="add-M">' + window.icon('plus') + '<span>남학생 침대 추가</span></button>' +
          '<button type="button" class="btn btn-ghost" data-bed-act="add-F">' + window.icon('plus') + '<span>여학생 침대 추가</span></button>' +
          '<span class="spacer"></span><button type="button" class="btn btn-primary" data-bed-act="save"' + (dirtyBeds ? '' : ' disabled') + '>침대 저장</button></div>' +
        '</section>' +
        '<section class="panel"><header class="panel-head"><h2>사용 시간과 연장</h2></header>' +
          '<form class="form-grid" data-form="time">' +
            '<label class="field"><span>사용 시간</span><input value="등록 후 다음 정각까지 (고정)" disabled></label>' +
            '<label class="field"><span>연장 1회 시간</span><select name="extendMinutes">' + opt([30, 60], st.extendMinutes, '분') + '</select></label>' +
            '<label class="field"><span>최대 연장 횟수</span><select name="maxExtensions">' + opt([1, 2, 3, 4, 5], st.maxExtensions, '회') + '</select></label>' +
            '<label class="field check"><input type="checkbox" name="alertSound"' + (st.alertSound ? ' checked' : '') + '><span>사용 시간이 지나면 보건 선생님 화면에서 알림음 울리기</span></label>' +
            (role === 'admin' ? '<label class="field check"><input type="checkbox" name="alertSoundSupport"' + (st.alertSoundSupport ? ' checked' : '') + '><span>사용 시간이 지나면 학생지원실 화면에서 알림음 울리기</span></label>' : '') +
            '<div class="row-actions"><span class="spacer"></span><button class="btn btn-primary">저장</button></div>' +
          '</form></section>' +
        '<section class="panel"><header class="panel-head"><h2>관리번호</h2><p class="panel-note">학생이 태블릿에서 연장할 때 입력하는 4~6자리 숫자입니다. 저장한 번호는 다시 볼 수 없습니다.</p></header>' +
          '<form class="form-grid" data-form="code">' +
            '<label class="field"><span>새 관리번호</span><input name="code" type="password" inputmode="numeric" pattern="\\d{4,6}" maxlength="6" autocomplete="new-password" required></label>' +
            '<label class="field"><span>한 번 더</span><input name="code2" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" required></label>' +
            '<div class="row-actions"><span class="spacer"></span><button class="btn btn-primary">관리번호 바꾸기</button></div>' +
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
    container.addEventListener('click', async (e) => {
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
        const patch = { extendMinutes: Number(f.extendMinutes.value), maxExtensions: Number(f.maxExtensions.value), alertSound: f.alertSound.checked };
        if (f.alertSoundSupport) patch.alertSoundSupport = f.alertSoundSupport.checked;
        Store.updateSettings(patch);
        App.toast('사용 시간과 연장 설정을 저장했습니다');
      } else if (f.dataset.form === 'code') {
        if (f.code.value !== f.code2.value) { App.toast('두 번 입력한 관리번호가 다릅니다.', 'error'); return; }
        try { Store.setExtensionCode(f.code.value); f.reset(); App.toast('관리번호를 바꿨습니다'); }
        catch (err) { App.toast(err.message, 'error'); }
      }
    });
    draw();
    return { refresh() { if (!dirtyBeds) { beds = Store.beds().map((x) => Object.assign({}, x)); } } };
  }

  // ── 학생 명단 ──────────────────────────────────────────────
  const HEAD = { no: /^(학번|학생번호|id)$/i, name: /^(이름|성명|name)$/i, grade: /^학년$/, classNo: /^반$/, number: /^(번호|출석번호)$/, gender: /^(성별|gender)$/i };

  function rowsToStudents(table) {
    if (!table.length) return [];
    const head = table[0].map((c) => String(c).trim());
    const idx = {};
    Object.keys(HEAD).forEach((k) => { const i = head.findIndex((h) => HEAD[k].test(h)); if (i >= 0) idx[k] = i; });
    const hasHead = 'no' in idx && 'name' in idx;
    const order = hasHead ? idx : { no: 0, name: 1, grade: 2, classNo: 3, number: 4, gender: 5 };
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
    function draw() {
      const st = Store.settings();
      const list = Store.students();
      const m = list.filter((s) => s.gender === 'M').length, f = list.filter((s) => s.gender === 'F').length;
      const shown = list.filter((s) => !query || s.no.includes(query) || s.name.includes(query)).slice(0, 200);
      container.innerHTML =
        '<div class="roster">' +
        '<section class="panel"><header class="panel-head"><h2>명단 바꾸기</h2><p class="panel-note">구글 스프레드시트에서 불러옵니다. 한 번 불러온 링크는 기억해 두었다가 다음에는 바로 다시 불러옵니다. 열 이름: 학번, 이름, 학년, 반, 번호, 성별.</p></header>' +
          '<div class="import">' +
            '<form class="field-stack" data-form="sheet"><label class="field"><span>구글 스프레드시트 링크</span><input name="url" type="url" value="' + esc(st.rosterSheetUrl || '') + '" placeholder="파일 → 공유 → 웹에 게시 → CSV 링크"></label>' +
              '<button class="btn btn-primary">' + window.icon(st.rosterSheetUrl ? 'refresh' : 'download') + '<span>' + (st.rosterSheetUrl ? '다시 불러오기' : '불러오기') + '</span></button>' +
              (st.rosterLoadedAt ? '<p class="panel-note">마지막으로 불러온 시각 ' + loadedAt(st.rosterLoadedAt) + '</p>' : '') + '</form>' +
            '<label class="drop"><input type="file" name="file" accept=".csv,.tsv,.txt,.xlsx,.xls">' + window.icon('upload') + '<b>엑셀·CSV 파일 고르기</b><small>.xlsx .csv .tsv</small></label>' +
            '<form class="field-stack" data-form="paste"><label class="field"><span>붙여 넣기</span><textarea name="text" rows="4" placeholder="스프레드시트에서 복사해 붙여 넣기"></textarea></label><button class="btn btn-ghost">읽기</button></form>' +
          '</div>' +
          '<div class="row-actions"><button type="button" class="btn btn-quiet" data-template>' + window.icon('download') + '<span>빈 양식 받기</span></button></div>' +
        '</section>' +
        '<section class="panel"><header class="panel-head"><h2>지금 명단</h2><p class="panel-sum">전체 <b>' + list.length + '</b>명 <span class="dot">·</span> 남 ' + m + ' <span class="dot">·</span> 여 ' + f + '</p>' +
          '<div class="panel-tools"><label class="field-inline"><span class="sr">검색</span><input type="search" name="q" placeholder="학번·이름 검색" value="' + esc(query) + '"></label></div></header>' +
          '<div class="table-wrap"><table class="table"><thead><tr><th scope="col">학번</th><th scope="col">이름</th><th scope="col">학년</th><th scope="col">반</th><th scope="col">번호</th><th scope="col">성별</th></tr></thead><tbody>' +
          shown.map((s) => '<tr><td class="num">' + esc(s.no) + '</td><td>' + esc(s.name) + '</td><td class="num">' + (s.grade || '') + '</td><td class="num">' + (s.classNo || '') + '</td><td class="num">' + (s.number || '') + '</td><td>' + (s.gender === 'M' ? '남' : s.gender === 'F' ? '여' : '–') + '</td></tr>').join('') +
          '</tbody></table></div>' +
        '</section></div>';
    }

    async function apply(students, from, meta) {
      if (!students.length) { App.toast('읽을 수 있는 학생이 없습니다. 학번과 이름 열을 확인해 주세요.', 'error'); return; }
      const preview = students.slice(0, 5).map((s) => '<tr><td class="num">' + esc(s.no) + '</td><td>' + esc(s.name) + '</td><td>' + esc(s.grade || '') + '</td><td>' + esc(s.classNo || '') + '</td><td>' + esc(s.gender || '') + '</td></tr>').join('');
      const ok = await App.dialog({
        title: '명단 바꾸기',
        wide: true,
        body: '<p class="sheet-text">' + esc(from) + '에서 <b>' + students.length + '명</b>을 읽었습니다. 지금 명단을 이 명단으로 바꿀까요? 사용 중인 침대와 기록은 그대로 남습니다.</p>' +
          '<div class="table-wrap"><table class="table"><thead><tr><th>학번</th><th>이름</th><th>학년</th><th>반</th><th>성별</th></tr></thead><tbody>' + preview + '</tbody></table></div>' +
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
      const pos = e.target.selectionStart;
      draw();
      const q = container.querySelector('[name=q]');
      q.focus(); q.setSelectionRange(pos, pos);
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
      if (e.target.closest('[data-template]')) App.download('학생명단-양식.csv', App.toCSV([['학번', '이름', '학년', '반', '번호', '성별'], ['1001', '홍길동', '1', '1', '1', '남']]));
    });
    draw();
    return { refresh: draw };
  }

  Object.assign(App, { viewRecords: records, viewSettings: settings, viewRoster: roster });
})();
