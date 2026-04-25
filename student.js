// Auth guard
if (sessionStorage.getItem('dh_role') !== 'student') location.href = 'login.html';

const currentUser = sessionStorage.getItem('dh_user');
const currentName = sessionStorage.getItem('dh_name') || currentUser;

document.getElementById('studentName').textContent  = currentName;
document.getElementById('welcomeTitle').textContent = `Chào mừng, ${currentName}!`;
document.getElementById('profileName').textContent  = currentName;

const students = () => JSON.parse(localStorage.getItem('dh_students') || '[]');
const videos   = () => JSON.parse(localStorage.getItem('dh_videos')   || '[]');
const exams    = () => JSON.parse(localStorage.getItem('dh_exams')    || '[]');

const me = () => students().find(s => s.username === currentUser) || {};

document.getElementById('profileClass').textContent = me().class_name ? `Lớp: ${me().class_name}` : '';

function fmtDate(d) { if (!d) return ''; const [y,m,day]=d.split('-'); return `${day}/${m}/${y}`; }

document.getElementById('logoutBtn').addEventListener('click', e => { e.preventDefault(); sessionStorage.clear(); location.href='login.html'; });

// ---- Sidebar nav ----
let currentSection = 'home';

function showPage(pg) {
  currentSection = pg;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.slink').forEach(l=>l.classList.remove('active'));
  const map = { home:'Home', exams:'Exams', videos:'Videos', profile:'Profile' };
  const el = document.getElementById('page' + (map[pg] || pg.charAt(0).toUpperCase()+pg.slice(1)));
  if (el) el.classList.add('active');
  document.querySelectorAll(`[data-page="${pg}"]`).forEach(l=>l.classList.add('active'));
  if (pg==='home')   renderHome();
  if (pg==='exams')  renderExams();
  if (pg==='videos') renderVideos();
}

document.querySelectorAll('.slink[data-page]').forEach(l => {
  l.addEventListener('click', e => { e.preventDefault(); showPage(l.dataset.page); document.getElementById('sidebar').classList.remove('open'); });
});
document.querySelectorAll('[data-goto]').forEach(l => {
  l.addEventListener('click', e => { e.preventDefault(); showPage(l.dataset.goto); });
});
document.getElementById('menuToggle').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));

// ---- Home ----
function renderHome() {
  const myClass = me().class_name || '';

  const re = document.getElementById('homeRecentExams');
  re.innerHTML = '';
  exams().filter(ex => !ex.class_name || ex.class_name === myClass).slice(0,4).forEach(ex => {
    const row = document.createElement('div');
    row.className = 'list-row clickable';
    row.innerHTML = `<span class="list-icon">📄</span><div class="list-info"><div class="list-title">${ex.title}</div><div class="list-meta"><span class="class-tag">${ex.class_name||'Tất cả lớp'}</span> • ${fmtDate(ex.date)}</div></div>`;
    row.addEventListener('click', () => openViewer(ex.title, ex.dataUrl, ex.fileName, ex.fileType));
    re.appendChild(row);
  });
  if (!re.children.length) re.innerHTML = '<p class="muted-sm">Chưa có tài liệu.</p>';

  const rv = document.getElementById('homeRecentVideos');
  rv.innerHTML = '';
  videos().filter(v => !v.class_name || v.class_name === myClass).slice(0,4).forEach(v => {
    const row = document.createElement('div');
    row.className = 'list-row clickable';
    row.innerHTML = `<span class="list-icon">🎬</span><div class="list-info"><div class="list-title">${v.title}</div><div class="list-meta">📅 ${fmtDate(v.date)}</div></div>`;
    row.addEventListener('click', () => openViewer(v.title, v.dataUrl, v.fileName, 'video'));
    rv.appendChild(row);
  });
  if (!rv.children.length) rv.innerHTML = '<p class="muted-sm">Chưa có video.</p>';
}

// ---- Exams ----
function renderExams() {
  const myClass = me().class_name || '';
  const list = exams().filter(ex => !ex.class_name || ex.class_name === myClass);
  const el = document.getElementById('studentExamList');
  el.innerHTML = '';
  document.getElementById('emptyExams').style.display = list.length?'none':'block';
  list.forEach(ex => {
    const row = document.createElement('div');
    row.className = 'content-row clickable';
    row.innerHTML = `<span class="list-icon">📄</span><div class="list-info"><div class="list-title">${ex.title}</div><div class="list-meta">📅 ${fmtDate(ex.date)}</div></div><span class="btn-sm">👁 Xem</span>`;
    row.addEventListener('click', () => openViewer(ex.title, ex.dataUrl, ex.fileName, ex.fileType));
    el.appendChild(row);
  });
}

// ---- Videos ----
function renderVideos() {
  const myClass = me().class_name || '';
  const list = videos().filter(v => !v.class_name || v.class_name === myClass);
  const grid = document.getElementById('studentVideoGrid');
  grid.innerHTML = '';
  document.getElementById('emptyVideos').style.display = list.length?'none':'block';
  list.forEach(v => {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.innerHTML = `<div class="video-thumb"><video src="${v.dataUrl}" preload="metadata"></video><span class="play-btn">▶</span></div><div class="video-info"><div class="video-title">${v.title}</div><div class="video-meta">📅 ${fmtDate(v.date)}</div></div>`;
    card.querySelector('.video-thumb').addEventListener('click', () => openViewer(v.title, v.dataUrl, v.fileName, 'video'));
    grid.appendChild(card);
  });
}

// ---- Viewer ----
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
  if (e.key === 'dh_exams')  { if (currentSection === 'exams')  renderExams();  renderHome(); }
  if (e.key === 'dh_videos') { if (currentSection === 'videos') renderVideos(); renderHome(); }
});

// ---- Init ----
renderHome();
