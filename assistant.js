// Auth guard
if (sessionStorage.getItem('dh_role') !== 'assistant') location.href = 'login.html';

// ---- Helpers ----
const videos   = () => JSON.parse(localStorage.getItem('dh_videos')   || '[]');
const exams    = () => JSON.parse(localStorage.getItem('dh_exams')    || '[]');
const students = () => JSON.parse(localStorage.getItem('dh_students') || '[]');
const alerts   = () => JSON.parse(localStorage.getItem('dh_alerts')   || '[]');

function fmtDate(d) { if (!d) return ''; const [y,m,day]=d.split('-'); return `${day}/${m}/${y}`; }
function fmtTime(ts) { const d=new Date(ts); return d.toLocaleString('vi-VN'); }
function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch { alert('Bộ nhớ đầy!'); } }
function getClasses() { return [...new Set(students().map(s=>s.class_name).filter(Boolean))].sort(); }

document.getElementById('assistantName').textContent = sessionStorage.getItem('dh_name') || 'Trợ lý';
document.getElementById('logoutBtn').addEventListener('click', e => { e.preventDefault(); sessionStorage.clear(); location.href='login.html'; });
document.getElementById('menuToggle').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));

// ---- Sidebar nav ----
function showPage(name) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.slink').forEach(l=>l.classList.remove('active'));
  const key = name.charAt(0).toUpperCase() + name.slice(1).replace(/-([a-z])/g, g=>g[1].toUpperCase());
  const page = document.getElementById('page'+key);
  if (page) page.classList.add('active');
  document.querySelectorAll(`[data-page="${name}"]`).forEach(l=>l.classList.add('active'));
  if (name==='overview')       renderOverview();
  if (name==='exams')          { populateClassFilters(); renderExams(); }
  if (name==='videos')         { populateClassFilters(); renderVideos(); }
  if (name==='students')       { populateClassFilters(); renderStudents(); }
  if (name==='create-student') renderMiniStudents();
  if (name==='security')       renderAlerts();
}

document.querySelectorAll('.slink[data-page]').forEach(l => {
  l.addEventListener('click', e => { e.preventDefault(); showPage(l.dataset.page); document.getElementById('sidebar').classList.remove('open'); });
});
document.querySelectorAll('[data-goto]').forEach(l => {
  l.addEventListener('click', e => { e.preventDefault(); showPage(l.dataset.goto); });
});

// ---- Populate class selects ----
function populateClassFilters() {
  const classes = getClasses();
  const fOpts = '<option value="">Tất cả lớp</option>' + classes.map(c=>`<option value="${c}">${c}</option>`).join('');
  const mOpts = '<option value="">-- Tất cả lớp --</option>' + classes.map(c=>`<option value="${c}">${c}</option>`).join('');
  ['examFilterClass','videoFilterClass','studentFilterClass'].forEach(id=>{
    const el=document.getElementById(id); if(!el) return;
    const cur=el.value; el.innerHTML=fOpts; el.value=cur;
  });
  ['eClassSelect','vClassSelect'].forEach(id=>{
    const el=document.getElementById(id); if(!el) return;
    const cur=el.value; el.innerHTML=mOpts; el.value=cur;
  });
}
populateClassFilters();

// ============================================================
// OVERVIEW
// ============================================================
function renderOverview() {
  const today = new Date().toDateString();
  const todayAlerts = alerts().filter(a => new Date(a.ts).toDateString() === today);
  document.getElementById('statExams').textContent    = exams().length;
  document.getElementById('statVideos').textContent   = videos().length;
  document.getElementById('statStudents').textContent = students().length;
  document.getElementById('statAlerts').textContent   = todayAlerts.length;

  const re = document.getElementById('recentExams');
  re.innerHTML = '';
  exams().slice(0,4).forEach(ex => {
    re.innerHTML += `<div class="list-row"><span class="list-icon">📄</span><div class="list-info"><div class="list-title">${ex.title}</div><div class="list-meta"><span class="class-tag">${ex.class_name||'Tất cả lớp'}</span> • ${fmtDate(ex.date)}</div></div></div>`;
  });
  if (!exams().length) re.innerHTML = '<p class="muted-sm">Chưa có tài liệu.</p>';

  const ra = document.getElementById('recentAlerts');
  ra.innerHTML = '';
  alerts().slice(0,4).forEach(a => {
    ra.innerHTML += `<div class="list-row"><span class="list-icon">🚨</span><div class="list-info"><div class="list-title">${a.studentName}</div><div class="list-meta">${a.reason} • ${fmtTime(a.ts)}</div></div></div>`;
  });
  if (!alerts().length) ra.innerHTML = '<p class="muted-sm">Chưa có cảnh báo.</p>';
}

// ============================================================
// EXAMS
// ============================================================
let pendingExamFile = null;

document.getElementById('uploadExamInput').addEventListener('change', e => {
  const f=e.target.files[0]; if(!f) return;
  pendingExamFile=f;
  document.getElementById('eTitleInput').value=f.name.replace(/\.[^.]+$/,'');
  document.getElementById('eDateInput').value=new Date().toISOString().split('T')[0];
  document.getElementById('examFileInfo').textContent=`📎 ${f.name}`;
  populateClassFilters();
  document.getElementById('examModal').classList.add('open');
  e.target.value='';
});
document.getElementById('eCancelBtn').addEventListener('click', ()=>{ document.getElementById('examModal').classList.remove('open'); pendingExamFile=null; });
document.getElementById('eSaveBtn').addEventListener('click', ()=>{
  if(!pendingExamFile) return;
  const title=document.getElementById('eTitleInput').value.trim();
  if(!title){ document.getElementById('eTitleInput').focus(); return; }
  const reader=new FileReader();
  reader.onload=ev=>{
    const list=exams();
    list.unshift({ id:Date.now(), title, class_name:document.getElementById('eClassSelect').value, date:document.getElementById('eDateInput').value, fileName:pendingExamFile.name, fileType:pendingExamFile.type, dataUrl:ev.target.result });
    save('dh_exams',list);
    document.getElementById('examModal').classList.remove('open');
    pendingExamFile=null; renderExams();
  };
  reader.readAsDataURL(pendingExamFile);
});

function renderExams() {
  const fc=document.getElementById('examFilterClass').value;
  const list=exams().filter(ex=>!fc||ex.class_name===fc);
  const el=document.getElementById('examList');
  el.innerHTML='';
  document.getElementById('emptyExams').style.display=list.length?'none':'block';
  list.forEach(ex=>{
    const row=document.createElement('div');
    row.className='content-row clickable';
    row.innerHTML=`<span class="list-icon">📄</span><div class="list-info"><div class="list-title">${ex.title}</div><div class="list-meta"><span class="class-tag">${ex.class_name||'Tất cả lớp'}</span> • ${fmtDate(ex.date)}</div></div><div class="row-actions"><button class="btn-sm btn-danger">🗑</button></div>`;
    row.addEventListener('click', e=>{ if(!e.target.closest('.row-actions')) openViewer(ex.title,ex.dataUrl,ex.fileName,ex.fileType); });
    row.querySelector('.btn-danger').addEventListener('click', e=>{ e.stopPropagation(); if(confirm(`Xóa "${ex.title}"?`)){ save('dh_exams',exams().filter(x=>x.id!==ex.id)); renderExams(); } });
    el.appendChild(row);
  });
}
document.getElementById('examFilterClass').addEventListener('change', renderExams);

// ============================================================
// VIDEOS
// ============================================================
let pendingVideoFile = null;

document.getElementById('uploadVideoInput').addEventListener('change', e=>{
  const f=e.target.files[0]; if(!f) return;
  pendingVideoFile=f;
  document.getElementById('previewVideo').src=URL.createObjectURL(f);
  document.getElementById('vTitleInput').value=f.name.replace(/\.[^.]+$/,'');
  document.getElementById('vDateInput').value=new Date().toISOString().split('T')[0];
  populateClassFilters();
  document.getElementById('videoModal').classList.add('open');
  e.target.value='';
});
document.getElementById('vCancelBtn').addEventListener('click', ()=>{ document.getElementById('videoModal').classList.remove('open'); document.getElementById('previewVideo').src=''; pendingVideoFile=null; });
document.getElementById('vSaveBtn').addEventListener('click', ()=>{
  if(!pendingVideoFile) return;
  const title=document.getElementById('vTitleInput').value.trim();
  if(!title){ document.getElementById('vTitleInput').focus(); return; }
  const reader=new FileReader();
  reader.onload=ev=>{
    const list=videos();
    list.unshift({ id:Date.now(), title, class_name:document.getElementById('vClassSelect').value, date:document.getElementById('vDateInput').value, fileName:pendingVideoFile.name, dataUrl:ev.target.result });
    save('dh_videos',list);
    document.getElementById('videoModal').classList.remove('open');
    document.getElementById('previewVideo').src='';
    pendingVideoFile=null; renderVideos();
  };
  reader.readAsDataURL(pendingVideoFile);
});

function renderVideos() {
  const fc=document.getElementById('videoFilterClass').value;
  const list=videos().filter(v=>!fc||v.class_name===fc);
  const grid=document.getElementById('videoGrid');
  grid.innerHTML='';
  document.getElementById('emptyVideos').style.display=list.length?'none':'block';
  list.forEach(v=>{
    const card=document.createElement('div');
    card.className='video-card';
    card.innerHTML=`<div class="video-thumb"><video src="${v.dataUrl}" preload="metadata"></video><span class="play-btn">▶</span><span class="subject-tag">${v.class_name||'Tất cả lớp'}</span></div><div class="video-info"><div class="video-title">${v.title}</div><div class="video-meta">📅 ${fmtDate(v.date)}</div><button class="btn-sm btn-danger del-btn">🗑 Xóa</button></div>`;
    card.querySelector('.video-thumb').addEventListener('click', ()=>openViewer(v.title,v.dataUrl,v.fileName,'video'));
    card.querySelector('.del-btn').addEventListener('click', e=>{ e.stopPropagation(); if(confirm(`Xóa "${v.title}"?`)){ save('dh_videos',videos().filter(x=>x.id!==v.id)); renderVideos(); } });
    grid.appendChild(card);
  });
}
document.getElementById('videoFilterClass').addEventListener('change', renderVideos);

// ============================================================
// CREATE STUDENT
// ============================================================
document.getElementById('csSaveBtn').addEventListener('click', ()=>{
  const name=document.getElementById('csName').value.trim(), username=document.getElementById('csUsername').value.trim(), password=document.getElementById('csPassword').value, cls=document.getElementById('csClass').value.trim(), err=document.getElementById('csError');
  err.textContent='';
  if(!name||!username||!password){ err.textContent='Vui lòng điền đầy đủ.'; return; }
  const list=students();
  if(list.find(s=>s.username===username)){ err.textContent='Gmail đã tồn tại.'; return; }
  list.push({ id:Date.now(), full_name:name, username, password, class_name:cls, active:true });
  save('dh_students',list);
  ['csName','csUsername','csPassword','csClass'].forEach(id=>document.getElementById(id).value='');
  renderMiniStudents(); populateClassFilters();
});
document.getElementById('csResetBtn').addEventListener('click', ()=>{
  ['csName','csUsername','csPassword','csClass'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('csError').textContent='';
});

let miniPage=1; const miniPerPage=5;
function renderMiniStudents() {
  const list=students();
  const tbody=document.getElementById('miniStudentBody');
  const totalPages=Math.max(1,Math.ceil(list.length/miniPerPage));
  if(miniPage>totalPages) miniPage=totalPages;
  const slice=list.slice((miniPage-1)*miniPerPage, miniPage*miniPerPage);
  tbody.innerHTML='';
  slice.forEach((s,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${(miniPage-1)*miniPerPage+i+1}</td><td>${s.full_name}</td><td>${s.username}</td><td>${s.class_name||'—'}</td><td><span class="status-badge ${s.active?'active':'inactive'}">${s.active?'Hoạt động':'Khóa'}</span></td><td><button class="btn-sm" data-action="edit">✏️</button></td>`;
    tr.querySelector('[data-action="edit"]').addEventListener('click', ()=>openEditStudent(s));
    tbody.appendChild(tr);
  });
  const pg=document.getElementById('miniPagination');
  pg.innerHTML='';
  for(let i=1;i<=totalPages;i++){
    const btn=document.createElement('button');
    btn.className='page-btn'+(i===miniPage?' active':'');
    btn.textContent=i;
    btn.addEventListener('click', ()=>{ miniPage=i; renderMiniStudents(); });
    pg.appendChild(btn);
  }
}

// ============================================================
// STUDENTS LIST
// ============================================================
function renderStudents() {
  const q=(document.getElementById('studentSearch').value||'').toLowerCase();
  const cls=document.getElementById('studentFilterClass').value;
  const list=students().filter(s=>(!q||s.full_name.toLowerCase().includes(q)||s.username.toLowerCase().includes(q))&&(!cls||s.class_name===cls));
  const tbody=document.getElementById('studentBody');
  tbody.innerHTML='';
  document.getElementById('emptyStudents').style.display=list.length?'none':'block';
  list.forEach(s=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${s.full_name}</td><td>${s.username}</td><td>${s.class_name||'—'}</td><td><span class="status-badge ${s.active?'active':'inactive'}">${s.active?'Hoạt động':'Khóa'}</span></td><td><button class="btn-sm" data-action="edit">✏️ Sửa</button> <button class="btn-sm ${s.active?'btn-danger':'btn-success'}" data-action="toggle">${s.active?'🔒 Khóa':'🔓 Mở'}</button> <button class="btn-sm btn-danger" data-action="delete">🗑</button></td>`;
    tr.querySelector('[data-action="edit"]').addEventListener('click', ()=>openEditStudent(s));
    tr.querySelector('[data-action="toggle"]').addEventListener('click', ()=>{ save('dh_students',students().map(x=>x.id===s.id?{...x,active:!x.active}:x)); renderStudents(); });
    tr.querySelector('[data-action="delete"]').addEventListener('click', ()=>{ if(confirm(`Xóa "${s.full_name}"?`)){ save('dh_students',students().filter(x=>x.id!==s.id)); renderStudents(); renderMiniStudents(); populateClassFilters(); } });
    tbody.appendChild(tr);
  });
}
document.getElementById('studentSearch').addEventListener('input', renderStudents);
document.getElementById('studentFilterClass').addEventListener('change', renderStudents);

let editingId=null;
function openEditStudent(s) {
  editingId=s.id;
  document.getElementById('esName').value=s.full_name;
  document.getElementById('esUsername').value=s.username;
  document.getElementById('esPassword').value='';
  document.getElementById('esClass').value=s.class_name||'';
  document.getElementById('esError').textContent='';
  document.getElementById('editStudentModal').classList.add('open');
}
document.getElementById('esCancelBtn').addEventListener('click', ()=>document.getElementById('editStudentModal').classList.remove('open'));
document.getElementById('esSaveBtn').addEventListener('click', ()=>{
  const name=document.getElementById('esName').value.trim(), username=document.getElementById('esUsername').value.trim(), password=document.getElementById('esPassword').value, cls=document.getElementById('esClass').value.trim(), err=document.getElementById('esError');
  if(!name||!username){ err.textContent='Vui lòng điền đầy đủ.'; return; }
  const list=students();
  if(list.find(s=>s.username===username&&s.id!==editingId)){ err.textContent='Gmail đã tồn tại.'; return; }
  save('dh_students',list.map(s=>s.id===editingId?{...s,full_name:name,username,class_name:cls,...(password?{password}:{})}:s));
  document.getElementById('editStudentModal').classList.remove('open');
  renderStudents(); renderMiniStudents(); populateClassFilters();
});

// ============================================================
// SECURITY ALERTS
// ============================================================
function renderAlerts() {
  const q=(document.getElementById('alertSearch').value||'').toLowerCase();
  const list=alerts().filter(a=>!q||a.studentName.toLowerCase().includes(q));
  const el=document.getElementById('alertList');
  el.innerHTML='';
  document.getElementById('emptyAlerts').style.display=list.length?'none':'block';
  list.forEach(a=>{
    const row=document.createElement('div');
    row.className='content-row alert-row';
    row.innerHTML=`
      <span class="list-icon">🚨</span>
      <div class="list-info">
        <div class="list-title">${a.studentName} <span class="muted" style="font-weight:400">— ${a.username}</span></div>
        <div class="list-meta">
          <span class="alert-badge">${a.reason}</span>
          ${a.class_name?`<span class="class-tag">${a.class_name}</span>`:''}
          • ${fmtTime(a.ts)}
        </div>
      </div>`;
    el.appendChild(row);
  });
}

document.getElementById('alertSearch').addEventListener('input', renderAlerts);
document.getElementById('clearAlertsBtn').addEventListener('click', ()=>{
  if(confirm('Xóa toàn bộ nhật ký cảnh báo?')){ save('dh_alerts',[]); renderAlerts(); renderOverview(); }
});

// ============================================================
// VIEWER
// ============================================================
function openViewer(title, dataUrl, fileName, fileType) {
  document.getElementById('viewerTitle').textContent=title;
  const body=document.getElementById('viewerBody'), dl=document.getElementById('viewerDownload');
  dl.href=dataUrl; dl.download=fileName||title;
  if(fileType==='video'||(fileType||'').startsWith('video/')) body.innerHTML=`<video src="${dataUrl}" controls class="viewer-video"></video>`;
  else if(fileType==='application/pdf') body.innerHTML=`<iframe src="${dataUrl}" class="viewer-iframe"></iframe>`;
  else if((fileType||'').startsWith('image/')) body.innerHTML=`<img src="${dataUrl}" class="viewer-img" alt="${title}"/>`;
  else body.innerHTML=`<p class="muted-center">⚠️ Không xem trực tiếp được. Vui lòng tải xuống.</p>`;
  document.getElementById('viewerModal').classList.add('open');
}
document.getElementById('closeViewer').addEventListener('click', closeViewer);
document.getElementById('viewerModal').addEventListener('click', e=>{ if(e.target===document.getElementById('viewerModal')) closeViewer(); });
function closeViewer(){ document.getElementById('viewerModal').classList.remove('open'); document.getElementById('viewerBody').innerHTML=''; }

// ---- Real-time sync via StorageEvent ----
window.addEventListener('storage', e => {
  if (e.key === 'dh_alerts') {
    renderAlerts();
    renderOverview();
    // Flash badge trên menu
    const badge = document.getElementById('alertNavBadge');
    if (badge) {
      const newCount = JSON.parse(e.newValue || '[]').length;
      const oldCount = JSON.parse(e.oldValue || '[]').length;
      if (newCount > oldCount) {
        badge.textContent = '+' + (newCount - oldCount);
        badge.style.display = 'inline-flex';
        setTimeout(() => { badge.style.display = 'none'; }, 5000);
      }
    }
  }
  if (e.key === 'dh_students') { renderStudents(); renderMiniStudents(); populateClassFilters(); renderOverview(); }
  if (e.key === 'dh_videos')   renderVideos();
  if (e.key === 'dh_exams')    renderExams();
});

// ---- Init ----
renderOverview();
