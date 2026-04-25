// Auth guard
const _role = sessionStorage.getItem('dh_role');
if (_role !== 'teacher' && _role !== 'assistant') location.href = 'login.html';

const isTeacher = _role === 'teacher';

// ---- Helpers ----
const videos      = () => JSON.parse(localStorage.getItem('dh_videos')     || '[]');
const exams       = () => JSON.parse(localStorage.getItem('dh_exams')      || '[]');
const students    = () => JSON.parse(localStorage.getItem('dh_students')   || '[]');
const assistants  = () => JSON.parse(localStorage.getItem('dh_assistants') || '[]');

function fmtDate(d) { if (!d) return ''; const [y,m,day]=d.split('-'); return `${day}/${m}/${y}`; }
function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch { alert('Bộ nhớ đầy!'); } }

function getClasses() {
  return [...new Set(students().map(s=>s.class_name).filter(Boolean))].sort();
}

const displayName = sessionStorage.getItem('dh_name') || (isTeacher ? 'Giáo viên' : 'Trợ lý');
const displayRole = isTeacher ? 'Giáo viên' : 'Trợ lý';

document.getElementById('teacherName').textContent = displayName;
document.getElementById('profileName').textContent  = displayName;
document.querySelector('.av-role').textContent      = displayRole;

// Ẩn menu chỉ dành cho teacher/assistant theo role
if (!isTeacher) {
  document.querySelectorAll('.teacher-only').forEach(el => el.style.display = 'none');
}

// Giáo viên chỉ xem danh sách học sinh, không tạo/sửa/xóa
if (isTeacher) {
  document.querySelectorAll('[data-page="create-student"]').forEach(el => el.style.display = 'none');
}
document.getElementById('logoutBtn').addEventListener('click', e => { e.preventDefault(); sessionStorage.clear(); location.href='login.html'; });

// ---- Sidebar navigation ----
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.slink').forEach(l => l.classList.remove('active'));
  const key = name.charAt(0).toUpperCase() + name.slice(1).replace(/-([a-z])/g, g => g[1].toUpperCase());
  const page = document.getElementById('page' + key);
  if (page) page.classList.add('active');
  document.querySelectorAll(`[data-page="${name}"]`).forEach(l => l.classList.add('active'));
  if (name === 'overview')       renderOverview();
  if (name === 'exams')          { populateClassFilters(); renderExams(); }
  if (name === 'videos')         { populateClassFilters(); renderVideos(); }
  if (name === 'students')       { populateClassFilters(); renderStudents(); }
  if (name === 'create-student') renderMiniStudents();
  if (name === 'assistants' && isTeacher) renderAssistants();
}

document.querySelectorAll('.slink[data-page]').forEach(l => {
  l.addEventListener('click', e => { e.preventDefault(); showPage(l.dataset.page); document.getElementById('sidebar').classList.remove('open'); });
});
document.querySelectorAll('[data-goto]').forEach(l => {
  l.addEventListener('click', e => { e.preventDefault(); showPage(l.dataset.goto); });
});
document.getElementById('menuToggle').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));

// ---- Populate class selects ----
function populateClassFilters() {
  const classes = getClasses();
  const filterOpts = '<option value="">Tất cả lớp</option>' + classes.map(c=>`<option value="${c}">${c}</option>`).join('');
  const modalOpts  = '<option value="">-- Tất cả lớp --</option>' + classes.map(c=>`<option value="${c}">${c}</option>`).join('');
  ['examFilterClass','videoFilterClass','studentFilterClass'].forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    const cur = el.value; el.innerHTML = filterOpts; el.value = cur;
  });
  ['eClassSelect','vClassSelect'].forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    const cur = el.value; el.innerHTML = modalOpts; el.value = cur;
  });
}

populateClassFilters();

// ============================================================
// ASSISTANTS (teacher only)
// ============================================================
let editingAssistantId = null;

function renderAssistants() {
  const list = assistants();
  const tbody = document.getElementById('assistantBody');
  tbody.innerHTML = '';
  document.getElementById('emptyAssistants').style.display = list.length ? 'none' : 'block';
  list.forEach(a => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${a.full_name}</td><td>${a.username}</td><td>
      <button class="btn-sm" data-action="edit">✏️ Sửa</button>
      <button class="btn-sm btn-danger" data-action="delete">🗑</button>
    </td>`;
    tr.querySelector('[data-action="edit"]').addEventListener('click', () => openAssistantModal(a));
    tr.querySelector('[data-action="delete"]').addEventListener('click', () => {
      if (confirm(`Xóa trợ lý "${a.full_name}"?`)) {
        save('dh_assistants', assistants().filter(x => x.id !== a.id));
        renderAssistants();
      }
    });
    tbody.appendChild(tr);
  });
}

function openAssistantModal(a = null) {
  editingAssistantId = a ? a.id : null;
  document.getElementById('assistantModalTitle').textContent = a ? 'Sửa trợ lý' : 'Thêm trợ lý';
  document.getElementById('asName').value     = a ? a.full_name : '';
  document.getElementById('asUsername').value = a ? a.username  : '';
  document.getElementById('asPassword').value = '';
  document.getElementById('asPasswordHint').style.display = a ? 'inline' : 'none';
  document.getElementById('asError').textContent = '';
  document.getElementById('assistantModal').classList.add('open');
}

document.getElementById('openAddAssistantBtn')?.addEventListener('click', () => openAssistantModal());
document.getElementById('asCancelBtn').addEventListener('click', () => document.getElementById('assistantModal').classList.remove('open'));
document.getElementById('asSaveBtn').addEventListener('click', () => {
  const name     = document.getElementById('asName').value.trim();
  const username = document.getElementById('asUsername').value.trim();
  const password = document.getElementById('asPassword').value;
  const err      = document.getElementById('asError');
  err.textContent = '';
  if (!name || !username) { err.textContent = 'Vui lòng điền đầy đủ.'; return; }
  let list = assistants();
  if (list.find(a => a.username === username && a.id !== editingAssistantId)) {
    err.textContent = 'Tên đăng nhập đã tồn tại.'; return;
  }
  if (editingAssistantId) {
    list = list.map(a => a.id === editingAssistantId
      ? { ...a, full_name: name, username, ...(password ? { password } : {}) }
      : a);
  } else {
    if (!password) { err.textContent = 'Vui lòng nhập mật khẩu.'; return; }
    list.push({ id: Date.now(), full_name: name, username, password });
  }
  save('dh_assistants', list);
  document.getElementById('assistantModal').classList.remove('open');
  renderAssistants();
});

// ============================================================
// OVERVIEW
// ============================================================
function renderOverview() {
  document.getElementById('statExams').textContent    = exams().length;
  document.getElementById('statVideos').textContent   = videos().length;
  document.getElementById('statStudents').textContent = students().length;

  const re = document.getElementById('recentExams');
  re.innerHTML = '';
  exams().slice(0,4).forEach(ex => {
    re.innerHTML += `<div class="list-row"><span class="list-icon">📄</span><div class="list-info"><div class="list-title">${ex.title}</div><div class="list-meta"><span class="class-tag">${ex.class_name||'Tất cả lớp'}</span> • ${fmtDate(ex.date)}</div></div></div>`;
  });
  if (!exams().length) re.innerHTML = '<p class="muted-sm">Chưa có tài liệu.</p>';

  const rv = document.getElementById('recentVideos');
  rv.innerHTML = '';
  videos().slice(0,4).forEach(v => {
    rv.innerHTML += `<div class="list-row"><span class="list-icon">🎬</span><div class="list-info"><div class="list-title">${v.title}</div><div class="list-meta"><span class="class-tag">${v.class_name||'Tất cả lớp'}</span> • ${fmtDate(v.date)}</div></div></div>`;
  });
  if (!videos().length) rv.innerHTML = '<p class="muted-sm">Chưa có video.</p>';
}

// ============================================================
// EXAMS
// ============================================================
let pendingExamFile = null;

document.getElementById('uploadExamInput').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  pendingExamFile = f;
  document.getElementById('eTitleInput').value = f.name.replace(/\.[^.]+$/,'');
  document.getElementById('eDateInput').value  = new Date().toISOString().split('T')[0];
  document.getElementById('examFileInfo').textContent = `📎 ${f.name}`;
  populateClassFilters();
  document.getElementById('examModal').classList.add('open');
  e.target.value = '';
});

document.getElementById('eCancelBtn').addEventListener('click', () => {
  document.getElementById('examModal').classList.remove('open');
  pendingExamFile = null;
});

document.getElementById('eSaveBtn').addEventListener('click', () => {
  if (!pendingExamFile) return;
  const title = document.getElementById('eTitleInput').value.trim();
  if (!title) { document.getElementById('eTitleInput').focus(); return; }
  const reader = new FileReader();
  reader.onload = ev => {
    const list = exams();
    list.unshift({
      id: Date.now(), title,
      class_name: document.getElementById('eClassSelect').value,
      date: document.getElementById('eDateInput').value,
      fileName: pendingExamFile.name, fileType: pendingExamFile.type, dataUrl: ev.target.result
    });
    save('dh_exams', list);
    document.getElementById('examModal').classList.remove('open');
    pendingExamFile = null;
    renderExams();
  };
  reader.readAsDataURL(pendingExamFile);
});

function renderExams() {
  const filterCls = document.getElementById('examFilterClass').value;
  const list = exams().filter(ex => !filterCls || ex.class_name === filterCls);
  const el = document.getElementById('examList');
  el.innerHTML = '';
  document.getElementById('emptyExams').style.display = list.length ? 'none' : 'block';
  list.forEach(ex => {
    const row = document.createElement('div');
    row.className = 'content-row clickable';
    row.innerHTML = `
      <span class="list-icon">📄</span>
      <div class="list-info">
        <div class="list-title">${ex.title}</div>
        <div class="list-meta"><span class="class-tag">${ex.class_name||'Tất cả lớp'}</span> • ${fmtDate(ex.date)}</div>
      </div>
      <div class="row-actions"><button class="btn-sm btn-danger">🗑</button></div>`;
    row.addEventListener('click', e => { if (!e.target.closest('.row-actions')) openViewer(ex.title, ex.dataUrl, ex.fileName, ex.fileType); });
    row.querySelector('.btn-danger').addEventListener('click', e => {
      e.stopPropagation();
      if (confirm(`Xóa "${ex.title}"?`)) { save('dh_exams', exams().filter(x=>x.id!==ex.id)); renderExams(); }
    });
    el.appendChild(row);
  });
}

document.getElementById('examFilterClass').addEventListener('change', renderExams);

// ============================================================
// VIDEOS
// ============================================================
let pendingVideoFile = null;

document.getElementById('uploadVideoInput').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  pendingVideoFile = f;
  document.getElementById('previewVideo').src = URL.createObjectURL(f);
  document.getElementById('vTitleInput').value = f.name.replace(/\.[^.]+$/,'');
  document.getElementById('vDateInput').value  = new Date().toISOString().split('T')[0];
  populateClassFilters();
  document.getElementById('videoModal').classList.add('open');
  e.target.value = '';
});

document.getElementById('vCancelBtn').addEventListener('click', () => {
  document.getElementById('videoModal').classList.remove('open');
  document.getElementById('previewVideo').src = '';
  pendingVideoFile = null;
});

document.getElementById('vSaveBtn').addEventListener('click', () => {
  if (!pendingVideoFile) return;
  const title = document.getElementById('vTitleInput').value.trim();
  if (!title) { document.getElementById('vTitleInput').focus(); return; }
  const reader = new FileReader();
  reader.onload = ev => {
    const list = videos();
    list.unshift({
      id: Date.now(), title,
      class_name: document.getElementById('vClassSelect').value,
      date: document.getElementById('vDateInput').value,
      fileName: pendingVideoFile.name, dataUrl: ev.target.result
    });
    save('dh_videos', list);
    document.getElementById('videoModal').classList.remove('open');
    document.getElementById('previewVideo').src = '';
    pendingVideoFile = null;
    renderVideos();
  };
  reader.readAsDataURL(pendingVideoFile);
});

function renderVideos() {
  const filterCls = document.getElementById('videoFilterClass').value;
  const list = videos().filter(v => !filterCls || v.class_name === filterCls);
  const grid = document.getElementById('videoGrid');
  grid.innerHTML = '';
  document.getElementById('emptyVideos').style.display = list.length ? 'none' : 'block';
  list.forEach(v => {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.innerHTML = `
      <div class="video-thumb">
        <video src="${v.dataUrl}" preload="metadata"></video>
        <span class="play-btn">▶</span>
        <span class="subject-tag">${v.class_name||'Tất cả lớp'}</span>
      </div>
      <div class="video-info">
        <div class="video-title">${v.title}</div>
        <div class="video-meta">📅 ${fmtDate(v.date)}</div>
        <button class="btn-sm btn-danger del-btn">🗑 Xóa</button>
      </div>`;
    card.querySelector('.video-thumb').addEventListener('click', () => openViewer(v.title, v.dataUrl, v.fileName, 'video'));
    card.querySelector('.del-btn').addEventListener('click', e => {
      e.stopPropagation();
      if (confirm(`Xóa "${v.title}"?`)) { save('dh_videos', videos().filter(x=>x.id!==v.id)); renderVideos(); }
    });
    grid.appendChild(card);
  });
}

document.getElementById('videoFilterClass').addEventListener('change', renderVideos);

// ============================================================
// CREATE STUDENT
// ============================================================
document.getElementById('csSaveBtn').addEventListener('click', () => {
  const name=document.getElementById('csName').value.trim(), username=document.getElementById('csUsername').value.trim(), password=document.getElementById('csPassword').value, cls=document.getElementById('csClass').value.trim(), err=document.getElementById('csError');
  err.textContent = '';
  if (!name||!username||!password) { err.textContent='Vui lòng điền đầy đủ thông tin.'; return; }
  const list = students();
  if (list.find(s=>s.username===username)) { err.textContent='Gmail đã tồn tại.'; return; }
  list.push({ id: Date.now(), full_name: name, username, password, class_name: cls, active: true });
  save('dh_students', list);
  ['csName','csUsername','csPassword','csClass'].forEach(id => document.getElementById(id).value='');
  renderMiniStudents();
  populateClassFilters();
});

document.getElementById('csResetBtn').addEventListener('click', () => {
  ['csName','csUsername','csPassword','csClass'].forEach(id => document.getElementById(id).value='');
  document.getElementById('csError').textContent='';
});

let miniPage = 1;
const miniPerPage = 5;

function renderMiniStudents() {
  const list = students();
  const tbody = document.getElementById('miniStudentBody');
  const totalPages = Math.max(1, Math.ceil(list.length/miniPerPage));
  if (miniPage > totalPages) miniPage = totalPages;
  const slice = list.slice((miniPage-1)*miniPerPage, miniPage*miniPerPage);
  tbody.innerHTML = '';
  slice.forEach((s, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${(miniPage-1)*miniPerPage+i+1}</td><td>${s.full_name}</td><td>${s.username}</td><td>${s.class_name||'—'}</td><td><span class="status-badge ${s.active?'active':'inactive'}">${s.active?'Hoạt động':'Khóa'}</span></td><td><button class="btn-sm" data-action="edit">✏️</button></td>`;
    tr.querySelector('[data-action="edit"]').addEventListener('click', () => openEditStudent(s));
    tbody.appendChild(tr);
  });
  const pg = document.getElementById('miniPagination');
  pg.innerHTML = '';
  for (let i=1;i<=totalPages;i++) {
    const btn = document.createElement('button');
    btn.className = 'page-btn'+(i===miniPage?' active':'');
    btn.textContent = i;
    btn.addEventListener('click', () => { miniPage=i; renderMiniStudents(); });
    pg.appendChild(btn);
  }
}

// ============================================================
// STUDENTS LIST
// ============================================================
function renderStudents() {
  const q   = (document.getElementById('studentSearch').value||'').toLowerCase();
  const cls = document.getElementById('studentFilterClass').value;
  const list = students().filter(s =>
    (!q   || s.full_name.toLowerCase().includes(q) || s.username.toLowerCase().includes(q)) &&
    (!cls || s.class_name === cls)
  );
  const tbody = document.getElementById('studentBody');
  tbody.innerHTML = '';
  document.getElementById('emptyStudents').style.display = list.length?'none':'block';
  list.forEach(s => {
    const tr = document.createElement('tr');
    const actions = isTeacher
      ? '—'
      : `<button class="btn-sm" data-action="edit">✏️ Sửa</button> <button class="btn-sm ${s.active?'btn-danger':'btn-success'}" data-action="toggle">${s.active?'🔒 Khóa':'🔓 Mở'}</button> <button class="btn-sm btn-danger" data-action="delete">🗑</button>`;
    tr.innerHTML = `<td>${s.full_name}</td><td>${s.username}</td><td>${s.class_name||'—'}</td><td><span class="status-badge ${s.active?'active':'inactive'}">${s.active?'Hoạt động':'Khóa'}</span></td><td>${actions}</td>`;
    if (!isTeacher) {
      tr.querySelector('[data-action="edit"]').addEventListener('click',   () => openEditStudent(s));
      tr.querySelector('[data-action="toggle"]').addEventListener('click', () => { save('dh_students',students().map(x=>x.id===s.id?{...x,active:!x.active}:x)); renderStudents(); });
      tr.querySelector('[data-action="delete"]').addEventListener('click', () => { if(confirm(`Xóa "${s.full_name}"?`)) { save('dh_students',students().filter(x=>x.id!==s.id)); renderStudents(); renderMiniStudents(); populateClassFilters(); } });
    }
    tbody.appendChild(tr);
  });
}

document.getElementById('studentSearch').addEventListener('input', renderStudents);
document.getElementById('studentFilterClass').addEventListener('change', renderStudents);

// ---- Edit student modal ----
let editingId = null;
function openEditStudent(s) {
  editingId = s.id;
  document.getElementById('esName').value     = s.full_name;
  document.getElementById('esUsername').value = s.username;
  document.getElementById('esPassword').value = '';
  document.getElementById('esClass').value    = s.class_name||'';
  document.getElementById('esError').textContent = '';
  document.getElementById('editStudentModal').classList.add('open');
}
document.getElementById('esCancelBtn').addEventListener('click', () => document.getElementById('editStudentModal').classList.remove('open'));
document.getElementById('esSaveBtn').addEventListener('click', () => {
  const name=document.getElementById('esName').value.trim(), username=document.getElementById('esUsername').value.trim(), password=document.getElementById('esPassword').value, cls=document.getElementById('esClass').value.trim(), err=document.getElementById('esError');
  if (!name||!username) { err.textContent='Vui lòng điền đầy đủ.'; return; }
  const list = students();
  if (list.find(s=>s.username===username&&s.id!==editingId)) { err.textContent='Gmail đã tồn tại.'; return; }
  save('dh_students', list.map(s=>s.id===editingId?{...s,full_name:name,username,class_name:cls,...(password?{password}:{})}:s));
  document.getElementById('editStudentModal').classList.remove('open');
  renderStudents(); renderMiniStudents(); populateClassFilters();
});

// ============================================================
// PROFILE / PASSWORD
// ============================================================
document.getElementById('pwSaveBtn').addEventListener('click', () => {
  const old=document.getElementById('pwOld').value, nw=document.getElementById('pwNew').value, cf=document.getElementById('pwConfirm').value;
  const err=document.getElementById('pwError'), ok=document.getElementById('pwSuccess');
  err.textContent=''; ok.textContent='';
  const t=JSON.parse(localStorage.getItem('dh_teacher'));
  if (old!==t.password) { err.textContent='Mật khẩu hiện tại không đúng.'; return; }
  if (!nw) { err.textContent='Vui lòng nhập mật khẩu mới.'; return; }
  if (nw!==cf) { err.textContent='Mật khẩu xác nhận không khớp.'; return; }
  save('dh_teacher',{...t,password:nw});
  ok.textContent='Đổi mật khẩu thành công!';
  ['pwOld','pwNew','pwConfirm'].forEach(id=>document.getElementById(id).value='');
});

// ============================================================
// VIEWER MODAL
// ============================================================
function openViewer(title, dataUrl, fileName, fileType) {
  document.getElementById('viewerTitle').textContent = title;
  const body=document.getElementById('viewerBody'), dl=document.getElementById('viewerDownload');
  dl.href=dataUrl; dl.download=fileName||title;
  if (fileType==='video'||(fileType||'').startsWith('video/')) {
    body.innerHTML=`<video src="${dataUrl}" controls class="viewer-video"></video>`;
  } else if (fileType==='application/pdf') {
    body.innerHTML=`<iframe src="${dataUrl}" class="viewer-iframe"></iframe>`;
  } else if ((fileType||'').startsWith('image/')) {
    body.innerHTML=`<img src="${dataUrl}" class="viewer-img" alt="${title}"/>`;
  } else {
    body.innerHTML=`<p class="muted-center">⚠️ Không xem trực tiếp được. Vui lòng tải xuống.</p>`;
  }
  document.getElementById('viewerModal').classList.add('open');
}

document.getElementById('closeViewer').addEventListener('click', closeViewer);
document.getElementById('viewerModal').addEventListener('click', e => { if(e.target===document.getElementById('viewerModal')) closeViewer(); });
function closeViewer() { document.getElementById('viewerModal').classList.remove('open'); document.getElementById('viewerBody').innerHTML=''; }

// ---- Real-time sync via StorageEvent ----
window.addEventListener('storage', e => {
  if (e.key === 'dh_exams')    renderExams();
  if (e.key === 'dh_videos')   renderVideos();
  if (e.key === 'dh_students') { renderStudents(); renderMiniStudents(); populateClassFilters(); }
});

// ---- Init ----
renderOverview();
