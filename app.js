/* ===========================
   VISIONER – JavaScript
   app.js
   =========================== */

// ========== DARK MODE ==========
function initTheme() {
  const saved = localStorage.getItem('v-theme');
  const sys = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const use = saved || (sys ? 'dark' : 'light');
  applyTheme(use);
}

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('v-theme', t);
  document.getElementById('dark-icon').textContent = t === 'dark' ? '☀️' : '🌙';
  document.getElementById('dark-label').textContent = t === 'dark' ? 'Light' : 'Dark';
}

function toggleDark() {
  const cur = document.documentElement.getAttribute('data-theme');
  applyTheme(cur === 'dark' ? 'light' : 'dark');
}

initTheme();

// ========== STATE ==========
let pages = [
  { id: 'p1', title: 'Selamat Datang di Visioner', icon: '🚀', children: ['p2'] },
  { id: 'p2', title: 'Panduan Penggunaan', icon: '📖', children: [] },
  { id: 'p3', title: 'Catatan Kuliah', icon: '🎓', children: [] },
];
let pageOrder = ['p1', 'p3'];
let expandedPages = new Set(['p1']);
let currentPageId = 'p1';
let blocks = [];
let bIdC = 1;
let slashTarget = null, slashIdx = 0;
let emojiTarget = null;
let currentFilter = 'semua';
let notesLayout = 'grid';
let neAutoSaveTimer = null;
let tasks = JSON.parse(localStorage.getItem('v-tasks') || '[]');
let notes = JSON.parse(localStorage.getItem('v-notes') || '[]');
let pomoHistory = JSON.parse(localStorage.getItem('v-pomo-history') || '[]');
let currentView = 'editor';

// POMO STATE
let pomoMode = 'work';
let pomoDurations = { work: 25, short: 5, long: 20 };
let pomoSeconds = 25 * 60;
let pomoTotal = 25 * 60;
let pomoRunning = false;
let pomoInterval = null;
let pomoCount = 0; // completed work sessions

const EMOJIS = ['📄','📝','📋','📊','📈','🎯','🚀','💡','⭐','🔥','✅','❌','⚠️','💻','🎨','📱','🔒','🌍','🏠','🎓','💼','🛠️','📅','⏰','🎵','📷','🎬','📚','🍎','☕','🌱','🏆','💎','🔑','📌','🗂️','📦','🔗','💬','📞','✉️','🎁','🌟','🦋','🌈','🎉','🍅','🧠','✏️'];
const SLASH_CMDS = [
  { icon: 'T',   label: 'Teks',         desc: 'Paragraf biasa',      type: 'text'     },
  { icon: 'H1',  label: 'Heading 1',    desc: 'Judul besar',         type: 'h1'       },
  { icon: 'H2',  label: 'Heading 2',    desc: 'Judul sedang',        type: 'h2'       },
  { icon: 'H3',  label: 'Heading 3',    desc: 'Judul kecil',         type: 'h3'       },
  { icon: '•',   label: 'Bullet List',  desc: 'Daftar tak berurut',  type: 'bullet'   },
  { icon: '1.',  label: 'Numbered List',desc: 'Daftar berurut',      type: 'numbered' },
  { icon: '☐',   label: 'To-do',        desc: 'Daftar tugas',        type: 'todo'     },
  { icon: '❝',   label: 'Kutipan',      desc: 'Highlight quote',     type: 'quote'    },
  { icon: '</>',  label: 'Kode',         desc: 'Blok kode',           type: 'code'     },
  { icon: '—',   label: 'Divider',      desc: 'Garis pemisah',       type: 'divider'  },
  { icon: '💡',  label: 'Callout',      desc: 'Highlight info',      type: 'callout'  },
];

// ========== VIEW SWITCH ==========
function switchView(v) {
  currentView = v;
  document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('panel-' + v).classList.add('active');
  document.getElementById('nav-' + v)?.classList.add('active');
  const labels = { editor: 'Workspace', tasks: 'Manajemen Tugas', notes: 'Catatan', pomodoro: 'Timer Pomodoro' };
  document.getElementById('bc-page').textContent = labels[v] || v;
  if (v === 'tasks') renderTasks();
  if (v === 'notes') renderNotes();
  if (v === 'pomodoro') { renderPomoDots(); renderPomoHistory(); }
}

// ========== SIDEBAR ==========
function renderSidebar() {
  const el = document.getElementById('sidebar-pages');
  el.innerHTML = '';
  pageOrder.forEach(id => el.appendChild(mkPageItem(id, 0)));
}

function mkPageItem(id, d) {
  const p = pages.find(x => x.id === id);
  if (!p) return document.createDocumentFragment();
  const wrap = document.createElement('div');
  const item = document.createElement('div');
  item.className = 'page-item' + (id === currentPageId && currentView === 'editor' ? ' active' : '');
  item.style.paddingLeft = (4 + d * 14) + 'px';
  const hasC = p.children.length > 0;
  if (hasC) {
    const a = document.createElement('div');
    a.className = 'toggle-arrow' + (expandedPages.has(id) ? ' open' : '');
    a.innerHTML = '›';
    a.onclick = e => {
      e.stopPropagation();
      expandedPages.has(id) ? expandedPages.delete(id) : expandedPages.add(id);
      renderSidebar();
    };
    item.appendChild(a);
  } else {
    const sp = document.createElement('div');
    sp.style.width = '18px';
    sp.style.flexShrink = '0';
    item.appendChild(sp);
  }
  const ic = document.createElement('div'); ic.className = 'pg-icon'; ic.textContent = p.icon;
  const tt = document.createElement('div'); tt.className = 'pg-title'; tt.textContent = p.title || 'Tanpa judul';
  const ac = document.createElement('div'); ac.className = 'pg-actions';
  const addB = document.createElement('div'); addB.className = 'pg-btn'; addB.textContent = '＋'; addB.title = 'Tambah sub-halaman';
  addB.onclick = e => { e.stopPropagation(); addChildPage(id); };
  const moreB = document.createElement('div'); moreB.className = 'pg-btn'; moreB.textContent = '···';
  moreB.onclick = e => { e.stopPropagation(); showPageCtx(e, id); };
  ac.append(addB, moreB);
  item.append(ic, tt, ac);
  item.onclick = () => { switchView('editor'); loadPage(id); };
  wrap.appendChild(item);
  if (hasC && expandedPages.has(id)) {
    const ch = document.createElement('div'); ch.className = 'page-children';
    p.children.forEach(c => ch.appendChild(mkPageItem(c, d + 1)));
    wrap.appendChild(ch);
  }
  return wrap;
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('collapsed');
}

// ========== PAGES ==========
function newPage() {
  const id = 'p' + Date.now();
  pages.push({ id, title: '', icon: '📄', children: [] });
  pageOrder.push(id);
  switchView('editor');
  loadPage(id);
}

function addChildPage(pid) {
  const id = 'p' + Date.now();
  pages.push({ id, title: '', icon: '📄', children: [] });
  pages.find(x => x.id === pid).children.push(id);
  expandedPages.add(pid);
  switchView('editor');
  loadPage(id);
}

function loadPage(id) {
  currentPageId = id;
  const p = pages.find(x => x.id === id);
  document.getElementById('page-title').value = p.title || '';
  document.getElementById('bc-page').textContent = p.title || 'Tanpa judul';
  document.getElementById('page-icon-wrap').textContent = p.icon || '📄';
  autoResizeTA.call(document.getElementById('page-title'));
  blocks = p.blocks ? p.blocks.map(b => ({ ...b })) : [];
  if (!blocks.length) addBlock('text', '');
  else renderBlocks();
  renderSidebar();
}

function savePage() {
  const p = pages.find(x => x.id === currentPageId);
  if (p) p.blocks = blocks.map(b => ({ ...b }));
}

function updateTitle(v) {
  const p = pages.find(x => x.id === currentPageId);
  if (p) { p.title = v; document.getElementById('bc-page').textContent = v || 'Tanpa judul'; }
  renderSidebar();
}

// ========== BLOCKS ==========
function addBlock(type = 'text', content = '', afterId = null) {
  const id = 'b' + (bIdC++);
  const block = { id, type, content, checked: false };
  if (afterId) {
    const i = blocks.findIndex(b => b.id === afterId);
    blocks.splice(i + 1, 0, block);
  } else {
    blocks.push(block);
  }
  savePage();
  renderBlocks();
  setTimeout(() => {
    const el = document.querySelector(`[data-block-id="${id}"] .block-content`);
    if (el) { el.focus(); placeCaretEnd(el); }
  }, 0);
  return id;
}

function deleteBlock(id) {
  if (blocks.length <= 1) return;
  const i = blocks.findIndex(b => b.id === id);
  blocks.splice(i, 1);
  savePage();
  renderBlocks();
  const prev = blocks[Math.max(0, i - 1)];
  if (prev) setTimeout(() => {
    const el = document.querySelector(`[data-block-id="${prev.id}"] .block-content`);
    if (el) { el.focus(); placeCaretEnd(el); }
  }, 0);
}

function renderBlocks() {
  const c = document.getElementById('blocks-container');
  c.innerHTML = '';
  let num = 1;
  blocks.forEach((b, i) => {
    if (b.type === 'numbered') { b._num = num++; } else { num = 1; }
    c.appendChild(mkBlock(b, i));
  });
}

function mkBlock(b, idx) {
  const wrap = document.createElement('div');
  wrap.className = 'block';
  wrap.dataset.blockId = b.id;
  wrap.setAttribute('data-type', b.type);
  const handle = document.createElement('div');
  handle.className = 'block-handle';
  handle.innerHTML = '⠿';
  handle.oncontextmenu = e => { e.preventDefault(); showBlockCtx(e, b.id); };
  const addB = document.createElement('div');
  addB.className = 'block-add';
  addB.innerHTML = '+';
  addB.onclick = () => addBlock('text', '', b.id);
  let inner;

  if (b.type === 'divider') {
    inner = document.createElement('div');
    inner.className = 'block-content';
    inner.innerHTML = '<hr style="border:none;border-top:1px solid var(--border)">';
    wrap.append(handle, inner, addB);
  } else if (b.type === 'todo') {
    const chk = document.createElement('div');
    chk.className = 'todo-check' + (b.checked ? ' checked' : '');
    chk.onclick = () => { b.checked = !b.checked; savePage(); renderBlocks(); };
    inner = document.createElement('div');
    inner.className = 'block-content' + (b.checked ? ' done' : '');
    inner.contentEditable = true;
    inner.dataset.placeholder = 'Tugas...';
    inner.innerHTML = b.content;
    inner.oninput = () => { b.content = inner.innerHTML; savePage(); };
    setupBE(inner, b);
    wrap.append(handle, chk, inner, addB);
  } else if (b.type === 'bullet') {
    const dot = document.createElement('div');
    dot.className = 'bullet-dot';
    dot.textContent = '•';
    inner = document.createElement('div');
    inner.className = 'block-content';
    inner.contentEditable = true;
    inner.dataset.placeholder = 'Item daftar';
    inner.innerHTML = b.content;
    inner.oninput = () => { b.content = inner.innerHTML; savePage(); };
    setupBE(inner, b);
    wrap.append(handle, dot, inner, addB);
  } else if (b.type === 'numbered') {
    const num = document.createElement('div');
    num.className = 'numbered-idx';
    num.textContent = (b._num || idx + 1) + '.';
    inner = document.createElement('div');
    inner.className = 'block-content';
    inner.contentEditable = true;
    inner.dataset.placeholder = 'Item daftar';
    inner.innerHTML = b.content;
    inner.oninput = () => { b.content = inner.innerHTML; savePage(); };
    setupBE(inner, b);
    wrap.append(handle, num, inner, addB);
  } else if (b.type === 'callout') {
    const ci = document.createElement('div');
    ci.className = 'callout-inner';
    const em = document.createElement('div');
    em.className = 'callout-emoji';
    em.textContent = '💡';
    inner = document.createElement('div');
    inner.className = 'block-content';
    inner.contentEditable = true;
    inner.dataset.placeholder = 'Tulis catatan penting...';
    inner.innerHTML = b.content;
    inner.oninput = () => { b.content = inner.innerHTML; savePage(); };
    setupBE(inner, b);
    ci.append(em, inner);
    wrap.append(handle, ci, addB);
  } else {
    inner = document.createElement('div');
    inner.className = 'block-content';
    inner.contentEditable = true;
    const ph = { text: "Ketik '/' untuk perintah", h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3', quote: 'Kutipan...', code: 'Kode di sini...' };
    inner.dataset.placeholder = ph[b.type] || 'Ketik sesuatu...';
    inner.innerHTML = b.content;
    inner.oninput = () => { b.content = inner.innerHTML; savePage(); };
    setupBE(inner, b);
    wrap.append(handle, inner, addB);
  }
  return wrap;
}

function setupBE(el, b) {
  el.onkeydown = e => bKeydown(e, el, b);
  el.onkeyup = e => bKeyup(e, el, b);
}

function bKeydown(e, el, b) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    hideSlash();
    addBlock(['bullet', 'numbered', 'todo'].includes(b.type) ? b.type : 'text', '', b.id);
    return;
  }
  if (e.key === 'Backspace' && el.innerText === '') {
    e.preventDefault();
    if (b.type !== 'text') {
      b.type = 'text';
      renderBlocks();
      setTimeout(() => {
        const x = document.querySelector(`[data-block-id="${b.id}"] .block-content`);
        if (x) { x.focus(); placeCaretEnd(x); }
      }, 0);
    } else {
      deleteBlock(b.id);
    }
    return;
  }
  if (e.key === 'Tab') { e.preventDefault(); document.execCommand('insertText', false, '  '); }
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    const all = [...document.querySelectorAll('.block-content[contenteditable]')];
    const ci = all.indexOf(el), ti = e.key === 'ArrowUp' ? ci - 1 : ci + 1;
    if (ti >= 0 && ti < all.length) { e.preventDefault(); all[ti].focus(); placeCaretEnd(all[ti]); }
  }
  if (e.key === '/' && el.innerText.trim() === '') {
    setTimeout(() => showSlash(el, b), 0);
  } else if (slashTarget) {
    if (e.key === 'ArrowDown') { e.preventDefault(); moveSlash(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveSlash(-1); }
    else if (e.key === 'Escape') hideSlash();
    else if (e.key === 'Enter' && document.getElementById('slash-menu').style.display === 'block') {
      e.preventDefault();
      applySlashCmd(b.id);
    }
  }
}

function bKeyup(e, el, b) {
  if (slashTarget === el) {
    const t = el.innerText, sp = t.lastIndexOf('/');
    if (sp < 0) { hideSlash(); return; }
    updateSlashList(t.slice(sp + 1).toLowerCase());
  }
}

// ========== SLASH MENU ==========
function showSlash(el, b) {
  slashTarget = el;
  const rect = el.getBoundingClientRect();
  const m = document.getElementById('slash-menu');
  m.style.display = 'block';
  m.style.top = (rect.bottom + 4) + 'px';
  m.style.left = rect.left + 'px';
  slashIdx = 0;
  updateSlashList('');
}

function hideSlash() {
  slashTarget = null;
  document.getElementById('slash-menu').style.display = 'none';
}

function updateSlashList(q) {
  const m = document.getElementById('slash-menu');
  const f = SLASH_CMDS.filter(c => c.label.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q));
  if (!f.length) { hideSlash(); return; }
  slashIdx = Math.min(slashIdx, f.length - 1);
  m.innerHTML = f.map((c, i) => `<div class="slash-item${i === slashIdx ? ' active' : ''}" onclick="applySlashCmdType('${c.type}')">
    <div class="slash-icon">${c.icon}</div>
    <div class="slash-info"><strong>${c.label}</strong><span>${c.desc}</span></div>
  </div>`).join('');
}

function moveSlash(d) {
  const its = [...document.querySelectorAll('#slash-menu .slash-item')];
  slashIdx = (slashIdx + d + its.length) % its.length;
  its.forEach((el, i) => el.classList.toggle('active', i === slashIdx));
}

function applySlashCmd(bid) {
  const its = [...document.querySelectorAll('#slash-menu .slash-item')];
  const a = its[slashIdx];
  if (a) applySlashCmdType(a.getAttribute('onclick').match(/'([^']+)'/)[1], bid);
}

function applySlashCmdType(type, bid) {
  const b = bid
    ? blocks.find(x => x.id === bid)
    : (slashTarget ? blocks.find(b => {
        const el = document.querySelector(`[data-block-id="${b.id}"] .block-content`);
        return el === slashTarget;
      }) : null);
  if (!b) { hideSlash(); return; }
  if (slashTarget) slashTarget.innerText = '';
  b.type = type;
  b.content = '';
  savePage();
  renderBlocks();
  setTimeout(() => {
    const el = document.querySelector(`[data-block-id="${b.id}"] .block-content`);
    if (el) { el.focus(); placeCaretEnd(el); }
  }, 0);
  hideSlash();
}

// ========== TASKS ==========
function getDeadlineInfo(dl) {
  if (!dl) return { cls: 'green', label: 'Tidak ada deadline', days: 999 };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dl); d.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { cls: 'red', label: 'Terlambat ' + Math.abs(diff) + ' hari', days: diff, overdue: true };
  if (diff === 0) return { cls: 'red', label: 'Hari ini!', days: 0 };
  if (diff <= 3) return { cls: 'red', label: 'Sisa ' + diff + ' hari', days: diff };
  if (diff <= 5) return { cls: 'yellow', label: 'Sisa ' + diff + ' hari', days: diff };
  return { cls: 'green', label: 'Sisa ' + diff + ' hari', days: diff };
}

function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.filter-tab').forEach(t => {
    if (t.textContent.toLowerCase() === f || t.getAttribute('onclick').includes("'" + f + "'"))
      t.classList.add('active');
  });
  renderTasks();
}

function renderTasks() {
  const q = (document.getElementById('task-search')?.value || '').toLowerCase();
  let filtered = tasks.filter(t => {
    if (q && !t.name.toLowerCase().includes(q) && !t.desc.toLowerCase().includes(q)) return false;
    const dl = getDeadlineInfo(t.deadline);
    if (currentFilter === 'aktif') return !t.done;
    if (currentFilter === 'selesai') return t.done;
    if (currentFilter === 'terlambat') return !t.done && dl.overdue;
    return true;
  });
  filtered.sort((a, b) => {
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline) - new Date(b.deadline);
  });
  const list = document.getElementById('tasks-list');
  if (!filtered.length) {
    list.innerHTML = `<div class="empty-state"><div class="es-icon">📋</div><p>Tidak ada tugas ditemukan</p></div>`;
    return;
  }
  list.innerHTML = '';
  filtered.forEach(t => {
    const dl = getDeadlineInfo(t.deadline);
    const card = document.createElement('div');
    card.className = 'task-card' + (t.done ? ' done-card' : '');
    card.innerHTML = `
      <div class="task-deadline-bar dl-${dl.cls}"></div>
      <div class="task-check${t.done ? ' checked' : ''}" onclick="toggleTask('${t.id}')"></div>
      <div class="task-body">
        <div class="task-name${t.done ? ' done' : ''}">${t.name}</div>
        ${t.desc ? `<div class="task-desc">${t.desc}</div>` : ''}
        <div class="task-meta">
          <span class="dl-badge ${dl.cls}">📅 ${dl.label}</span>
          <span class="cat-badge">${t.cat || 'Umum'}</span>
        </div>
      </div>
      <div class="task-actions">
        <button class="icon-btn" onclick="editTask('${t.id}')" title="Edit">✏️</button>
        <button class="icon-btn danger" onclick="deleteTask('${t.id}')" title="Hapus">🗑️</button>
      </div>`;
    list.appendChild(card);
  });
}

function openTaskModal(id) {
  document.getElementById('task-modal').classList.add('show');
  if (id) {
    const t = tasks.find(x => x.id === id);
    document.getElementById('task-modal-title').textContent = 'Edit Tugas';
    document.getElementById('task-edit-id').value = id;
    document.getElementById('task-name').value = t.name;
    document.getElementById('task-desc').value = t.desc;
    document.getElementById('task-deadline').value = t.deadline;
    document.getElementById('task-cat').value = t.cat || 'Umum';
  } else {
    document.getElementById('task-modal-title').textContent = 'Tambah Tugas Baru';
    document.getElementById('task-edit-id').value = '';
    document.getElementById('task-name').value = '';
    document.getElementById('task-desc').value = '';
    document.getElementById('task-deadline').value = '';
    document.getElementById('task-cat').value = 'Umum';
  }
  setTimeout(() => document.getElementById('task-name').focus(), 100);
}

function closeTaskModal() { document.getElementById('task-modal').classList.remove('show'); }

function saveTask() {
  const name = document.getElementById('task-name').value.trim();
  const deadline = document.getElementById('task-deadline').value;
  if (!name) { showToast('Nama tugas wajib diisi!'); return; }
  if (!deadline) { showToast('Deadline wajib diisi!'); return; }
  const editId = document.getElementById('task-edit-id').value;
  const data = { name, desc: document.getElementById('task-desc').value, deadline, cat: document.getElementById('task-cat').value, done: false };
  if (editId) {
    const i = tasks.findIndex(x => x.id === editId);
    data.done = tasks[i].done;
    tasks[i] = { ...tasks[i], ...data };
  } else {
    tasks.push({ id: 't' + Date.now(), ...data });
  }
  saveTasks();
  closeTaskModal();
  renderTasks();
  showToast(editId ? 'Tugas diperbarui!' : 'Tugas ditambahkan!');
}

function editTask(id) { openTaskModal(id); }
function deleteTask(id) { if (confirm('Hapus tugas ini?')) { tasks = tasks.filter(x => x.id !== id); saveTasks(); renderTasks(); showToast('Tugas dihapus'); } }
function toggleTask(id) { const t = tasks.find(x => x.id === id); if (t) { t.done = !t.done; saveTasks(); renderTasks(); showToast(t.done ? 'Tugas selesai ✓' : 'Tugas dibatalkan'); } }
function saveTasks() { localStorage.setItem('v-tasks', JSON.stringify(tasks)); }

// ========== NOTES ==========
function renderNotes() {
  const q = (document.getElementById('notes-search')?.value || '').toLowerCase();
  let filtered = notes.filter(n => !q || (n.title || '').toLowerCase().includes(q) || (n.body || '').toLowerCase().includes(q));
  const c = document.getElementById('notes-container');
  if (!filtered.length) { c.innerHTML = `<div class="empty-state"><div class="es-icon">📝</div><p>Belum ada catatan. Buat catatan pertamamu!</p></div>`; return; }
  c.className = notesLayout === 'grid' ? 'notes-grid' : 'notes-list-view';
  c.innerHTML = '';
  filtered.forEach(n => {
    const linked = n.taskId ? tasks.find(t => t.id === n.taskId) : null;
    const card = document.createElement('div');
    card.className = 'note-card';
    card.innerHTML = `
      ${linked ? `<div class="nc-task-tag">📋 ${linked.name}</div>` : ''}
      <div class="nc-title">${n.title || 'Tanpa judul'}</div>
      <div class="nc-preview">${(n.body || '').replace(/<[^>]*>/g, '')}</div>
      <div class="nc-date">${formatDate(n.updated)}</div>
      <div class="nc-actions">
        <button class="icon-btn" onclick="event.stopPropagation();deleteNote('${n.id}')">🗑️</button>
      </div>`;
    card.onclick = () => openNoteEditor(n.id);
    c.appendChild(card);
  });
}

function openNoteEditor(id) {
  const overlay = document.getElementById('note-editor-overlay');
  overlay.classList.add('show');
  const sel = document.getElementById('ne-task-link');
  sel.innerHTML = '<option value="">— Tidak ada —</option>' + tasks.filter(t => !t.done).map(t => `<option value="${t.id}">${t.name}</option>`).join('');
  if (id) {
    const n = notes.find(x => x.id === id);
    document.getElementById('ne-id').value = id;
    document.getElementById('ne-title').value = n.title || '';
    document.getElementById('ne-body').value = n.body || '';
    sel.value = n.taskId || '';
  } else {
    document.getElementById('ne-id').value = '';
    document.getElementById('ne-title').value = '';
    document.getElementById('ne-body').value = '';
    sel.value = '';
  }
  clearInterval(neAutoSaveTimer);
  neAutoSaveTimer = setInterval(autoSaveNote, 3000);
  document.getElementById('ne-title').focus();
}

function autoSaveNote() {
  const id = document.getElementById('ne-id').value;
  saveNoteData(id, true);
  document.getElementById('ne-autosave-status').textContent = 'Tersimpan otomatis ✓';
  setTimeout(() => { const el = document.getElementById('ne-autosave-status'); if (el) el.textContent = 'Auto-save aktif'; }, 2000);
}

function saveNoteManual() { saveNoteData(document.getElementById('ne-id').value, false); showToast('Catatan disimpan!'); }

function saveNoteData(id, silent) {
  const title = document.getElementById('ne-title').value;
  const body = document.getElementById('ne-body').value;
  const taskId = document.getElementById('ne-task-link').value;
  const now = new Date().toISOString();
  if (id) {
    const i = notes.findIndex(x => x.id === id);
    if (i >= 0) { notes[i] = { ...notes[i], title, body, taskId, updated: now }; }
  } else {
    const nid = 'n' + Date.now();
    notes.unshift({ id: nid, title, body, taskId, created: now, updated: now });
    document.getElementById('ne-id').value = nid;
  }
  saveNotes();
  if (!silent) renderNotes();
}

function closeNoteEditor() {
  clearInterval(neAutoSaveTimer);
  autoSaveNote();
  document.getElementById('note-editor-overlay').classList.remove('show');
  renderNotes();
}

function deleteNote(id) {
  if (!id) return;
  if (!confirm('Hapus catatan ini?')) return;
  notes = notes.filter(x => x.id !== id);
  saveNotes();
  renderNotes();
  showToast('Catatan dihapus');
}

function saveNotes() { localStorage.setItem('v-notes', JSON.stringify(notes)); }
function execNoteFmt(cmd) { document.getElementById('ne-body').focus(); document.execCommand(cmd, false, null); }

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ========== POMODORO ==========
function switchPomoMode(m) {
  pomoMode = m;
  stopPomo();
  pomoSeconds = pomoDurations[m] * 60;
  pomoTotal = pomoSeconds;
  updatePomoDisplay();
  updatePomoRing();
  document.querySelectorAll('.pomo-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + m).classList.add('active');
  const clock = document.getElementById('pomo-clock');
  clock.className = 'pomo-clock ' + (m === 'work' ? 'work' : m === 'short' ? 'rest' : 'longrest');
  const labels = { work: 'Siap bekerja', short: 'Istirahat pendek', long: 'Istirahat panjang' };
  document.getElementById('pomo-status').textContent = labels[m];
  document.getElementById('pomo-ring-fill').stroke = m === 'work' ? '#ef4444' : m === 'short' ? '#22c55e' : '#3b82f6';
  document.getElementById('pomo-ring-fill').setAttribute('stroke', m === 'work' ? '#ef4444' : m === 'short' ? '#22c55e' : '#3b82f6');
}

function updatePomoSettings() {
  pomoDurations.work = parseInt(document.getElementById('set-work').value) || 25;
  pomoDurations.short = parseInt(document.getElementById('set-short').value) || 5;
  pomoDurations.long = parseInt(document.getElementById('set-long').value) || 20;
  document.getElementById('tab-work').textContent = `Kerja (${pomoDurations.work} min)`;
  switchPomoMode(pomoMode);
}

function togglePomo() {
  if (pomoRunning) { stopPomo(); } else { startPomo(); }
}

function startPomo() {
  pomoRunning = true;
  document.getElementById('pomo-start-btn').textContent = '⏸ Jeda';
  document.getElementById('pomo-status').textContent = pomoMode === 'work' ? 'Sedang fokus bekerja...' : 'Sedang istirahat...';
  pomoInterval = setInterval(() => {
    pomoSeconds--;
    updatePomoDisplay();
    updatePomoRing();
    if (pomoSeconds <= 0) pomoComplete();
  }, 1000);
}

function stopPomo() {
  pomoRunning = false;
  clearInterval(pomoInterval);
  document.getElementById('pomo-start-btn').textContent = '▶ Lanjut';
}

function resetPomo() {
  stopPomo();
  pomoSeconds = pomoDurations[pomoMode] * 60;
  pomoTotal = pomoSeconds;
  updatePomoDisplay();
  updatePomoRing();
  const labels = { work: 'Siap bekerja', short: 'Istirahat pendek', long: 'Istirahat panjang' };
  document.getElementById('pomo-status').textContent = labels[pomoMode];
  document.getElementById('pomo-start-btn').textContent = '▶ Mulai';
}

function skipPomo() { pomoComplete(); }

function pomoComplete() {
  stopPomo();
  const isWork = pomoMode === 'work';
  try { document.getElementById('ding').play().catch(() => {}); } catch (e) {}
  showToast(isWork ? '🎉 Sesi kerja selesai! Waktunya istirahat.' : '✅ Istirahat selesai! Kembali bekerja.');
  if (isWork) {
    pomoCount++;
    const now = new Date();
    pomoHistory.unshift({ type: 'work', dur: pomoDurations.work, time: now.toISOString() });
    if (pomoHistory.length > 20) pomoHistory.pop();
    localStorage.setItem('v-pomo-history', JSON.stringify(pomoHistory));
    renderPomoDots();
    renderPomoHistory();
    if (pomoCount % 4 === 0) switchPomoMode('long');
    else switchPomoMode('short');
  } else {
    switchPomoMode('work');
  }
  document.getElementById('pomo-start-btn').textContent = '▶ Mulai';
}

function updatePomoDisplay() {
  const m = Math.floor(pomoSeconds / 60).toString().padStart(2, '0');
  const s = (pomoSeconds % 60).toString().padStart(2, '0');
  document.getElementById('pomo-display').textContent = m + ':' + s;
  document.title = `${m}:${s} – Visioner`;
}

function updatePomoRing() {
  const r = 97;
  const circ = 2 * Math.PI * r;
  const prog = pomoTotal > 0 ? pomoSeconds / pomoTotal : 1;
  document.getElementById('pomo-ring-fill').setAttribute('stroke-dasharray', circ.toFixed(1));
  document.getElementById('pomo-ring-fill').setAttribute('stroke-dashoffset', (circ * (1 - prog)).toFixed(1));
}

function renderPomoDots() {
  const dots = document.getElementById('pomo-dots');
  dots.innerHTML = Array.from({ length: 4 }, (_, i) =>
    `<div class="pomo-dot ${i < (pomoCount % 4) || (pomoCount % 4 === 0 && pomoCount > 0) ? 'done' : ''}"></div>`
  ).join('');
}

function renderPomoHistory() {
  const el = document.getElementById('pomo-history-list');
  if (!pomoHistory.length) {
    el.innerHTML = '<div style="font-size:12px;color:var(--text3);text-align:center;padding:12px">Belum ada sesi selesai</div>';
    return;
  }
  el.innerHTML = pomoHistory.slice(0, 10).map(h => `<div class="pomo-history-item">
    <div class="ph-dot ${h.type === 'work' ? '' : 'rest'}"></div>
    <span>${h.type === 'work' ? 'Sesi Kerja' : 'Istirahat'} – ${h.dur} menit</span>
    <span>${formatDate(h.time)}</span>
  </div>`).join('');
}

// ========== EMOJI ==========
function openEmojiPicker(t) {
  emojiTarget = t;
  const p = document.getElementById('emoji-picker');
  const r = t.getBoundingClientRect();
  p.style.display = 'block';
  p.style.top = (r.bottom + 8) + 'px';
  p.style.left = r.left + 'px';
  renderEmoji('');
  p.querySelector('.emoji-search').value = '';
  p.querySelector('.emoji-search').focus();
}

function renderEmoji(q) {
  const g = document.getElementById('emoji-grid');
  const f = q ? EMOJIS.filter(e => e.includes(q)) : EMOJIS;
  g.innerHTML = f.map(e => `<div class="emoji-btn" onclick="selectEmoji('${e}')">${e}</div>`).join('');
}

function filterEmoji(q) { renderEmoji(q); }

function selectEmoji(e) {
  if (emojiTarget) emojiTarget.textContent = e;
  const p = pages.find(x => x.id === currentPageId);
  if (p) p.icon = e;
  renderSidebar();
  document.getElementById('emoji-picker').style.display = 'none';
}

// ========== SEARCH ==========
function openSearch() {
  document.getElementById('search-modal').classList.add('show');
  document.getElementById('search-input').value = '';
  doSearch('');
  setTimeout(() => document.getElementById('search-input').focus(), 100);
}

function closeSearch() { document.getElementById('search-modal').classList.remove('show'); }

function doSearch(q) {
  const el = document.getElementById('search-results');
  const ql = q.toLowerCase();
  let results = [];
  pages.forEach(p => {
    if (!ql || (p.title || '').toLowerCase().includes(ql))
      results.push({ type: 'page', icon: p.icon, label: p.title || 'Tanpa judul', action: () => { switchView('editor'); loadPage(p.id); closeSearch(); } });
  });
  tasks.filter(t => !ql || t.name.toLowerCase().includes(ql)).forEach(t =>
    results.push({ type: 'task', icon: '📋', label: t.name, action: () => { switchView('tasks'); closeSearch(); } })
  );
  notes.filter(n => !ql || (n.title || '').toLowerCase().includes(ql)).forEach(n =>
    results.push({ type: 'note', icon: '📝', label: n.title || 'Tanpa judul', action: () => { switchView('notes'); openNoteEditor(n.id); closeSearch(); } })
  );
  if (!results.length) { el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text2);font-size:13px">Tidak ditemukan</div>'; return; }
  el.innerHTML = '';
  results.slice(0, 12).forEach(r => {
    const d = document.createElement('div');
    d.className = 'sr-item';
    d.innerHTML = `<span style="font-size:18px">${r.icon}</span><div><div style="font-size:13px;color:var(--text)">${r.label}</div><div style="font-size:11px;color:var(--text3)">${r.type}</div></div>`;
    d.onclick = r.action;
    el.appendChild(d);
  });
}

// ========== CONTEXT MENUS ==========
function showPageCtx(e, id) {
  const m = document.getElementById('ctx-menu');
  m.innerHTML = `
    <div class="ctx-item" onclick="renamePageCtx('${id}')">✏️ Ganti nama</div>
    <div class="ctx-item" onclick="duplicatePage('${id}')">📋 Duplikat</div>
    <div class="ctx-sep"></div>
    <div class="ctx-item danger" onclick="deletePage('${id}')">🗑️ Hapus</div>`;
  m.style.display = 'block';
  m.style.top = e.clientY + 'px';
  m.style.left = e.clientX + 'px';
}

function showBlockCtx(e, id) {
  const m = document.getElementById('ctx-menu');
  m.innerHTML = `
    <div class="ctx-item" onclick="duplicateBlock('${id}');hideCtx()">📋 Duplikat blok</div>
    <div class="ctx-item" onclick="convertBlock('${id}','h1');hideCtx()">H1 Ubah ke Heading 1</div>
    <div class="ctx-item" onclick="convertBlock('${id}','quote');hideCtx()">❝ Ubah ke Kutipan</div>
    <div class="ctx-item" onclick="convertBlock('${id}','callout');hideCtx()">💡 Ubah ke Callout</div>
    <div class="ctx-sep"></div>
    <div class="ctx-item danger" onclick="deleteBlock('${id}');hideCtx()">🗑️ Hapus blok</div>`;
  m.style.display = 'block';
  m.style.top = e.clientY + 'px';
  m.style.left = e.clientX + 'px';
}

function hideCtx() { document.getElementById('ctx-menu').style.display = 'none'; }

function duplicateBlock(id) {
  const i = blocks.findIndex(b => b.id === id);
  const nb = { ...blocks[i], id: 'b' + (bIdC++) };
  blocks.splice(i + 1, 0, nb);
  savePage();
  renderBlocks();
}

function convertBlock(id, type) {
  const b = blocks.find(x => x.id === id);
  if (b) { b.type = type; savePage(); renderBlocks(); }
}

function renamePageCtx(id) {
  const p = pages.find(x => x.id === id);
  const n = prompt('Ganti nama halaman:', p.title || '');
  if (n !== null) { p.title = n; renderSidebar(); if (currentPageId === id) updateTitle(n); }
  hideCtx();
}

function duplicatePage(id) {
  const p = pages.find(x => x.id === id);
  const nid = 'p' + Date.now();
  pages.push({ ...p, id: nid, title: (p.title || 'Tanpa judul') + ' – salinan', children: [] });
  pageOrder.push(nid);
  renderSidebar();
  hideCtx();
}

function deletePage(id) {
  if (!confirm('Hapus halaman ini?')) return;
  pages = pages.filter(x => x.id !== id);
  pageOrder = pageOrder.filter(x => x !== id);
  pages.forEach(p => p.children = p.children.filter(c => c !== id));
  renderSidebar();
  if (currentPageId === id && pages.length > 0) loadPage(pages[0].id);
  hideCtx();
}

// ========== FORMAT TOOLBAR ==========
function execFmt(cmd, val) { document.execCommand(cmd, false, val || null); }

let fmtVis = false;
document.addEventListener('mouseup', () => {
  setTimeout(() => {
    const sel = window.getSelection();
    if (sel && sel.toString().length > 0) {
      const rng = sel.getRangeAt(0);
      const rect = rng.getBoundingClientRect();
      const tb = document.getElementById('format-toolbar');
      tb.style.display = 'flex';
      tb.style.top = (rect.top - 44) + 'px';
      tb.style.left = (rect.left + rect.width / 2 - 80) + 'px';
      fmtVis = true;
    } else if (fmtVis) {
      document.getElementById('format-toolbar').style.display = 'none';
      fmtVis = false;
    }
  }, 10);
});

// ========== TOAST ==========
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

// ========== UTILS ==========
function placeCaretEnd(el) {
  el.focus();
  const r = document.createRange();
  r.selectNodeContents(el);
  r.collapse(false);
  const s = window.getSelection();
  s.removeAllRanges();
  s.addRange(r);
}

function autoResizeTA() { this.style.height = 'auto'; this.style.height = this.scrollHeight + 'px'; }
function onTitleInput(el) { autoResizeTA.call(el); }
function titleKeydown(e) { if (e.key === 'Enter') { e.preventDefault(); document.querySelector('.block-content')?.focus(); } }

// ========== GLOBAL EVENTS ==========
document.addEventListener('click', e => {
  const m = document.getElementById('slash-menu');
  const c = document.getElementById('ctx-menu');
  const ep = document.getElementById('emoji-picker');
  const sm = document.getElementById('search-modal');
  if (!m.contains(e.target)) hideSlash();
  if (!c.contains(e.target)) hideCtx();
  if (!ep.contains(e.target) && !e.target.closest('#page-icon-wrap')) ep.style.display = 'none';
  if (e.target === sm) closeSearch();
});

document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
  if (e.key === 'Escape') { closeSearch(); hideSlash(); hideCtx(); }
});

// ========== INIT ==========
function init() {
  renderSidebar();
  loadPage('p1');
  // Set default content for p1
  setTimeout(() => {
    if (blocks.length <= 1 && blocks[0]?.content === '') {
      blocks = [
        { id: 'b' + (bIdC++), type: 'h2',      content: '🎉 Selamat Datang di Visioner!' },
        { id: 'b' + (bIdC++), type: 'text',     content: 'Platform produktivitas lengkap untuk pelajar & profesional.' },
        { id: 'b' + (bIdC++), type: 'divider',  content: '' },
        { id: 'b' + (bIdC++), type: 'h3',       content: 'Fitur Utama' },
        { id: 'b' + (bIdC++), type: 'bullet',   content: '📋 <b>Manajemen Tugas</b> — Kelola tugas dengan indikator deadline warna otomatis' },
        { id: 'b' + (bIdC++), type: 'bullet',   content: '📝 <b>Catatan</b> — Catat ide dengan auto-save & tautkan ke tugas' },
        { id: 'b' + (bIdC++), type: 'bullet',   content: '🍅 <b>Timer Pomodoro</b> — Tingkatkan fokus dengan teknik Pomodoro' },
        { id: 'b' + (bIdC++), type: 'bullet',   content: '🌙 <b>Dark Mode</b> — Nyaman dipakai malam hari' },
        { id: 'b' + (bIdC++), type: 'divider',  content: '' },
        { id: 'b' + (bIdC++), type: 'callout',  content: '💡 Klik menu di sidebar kiri untuk mulai menggunakan fitur-fitur Visioner!' },
      ];
      savePage();
      renderBlocks();
    }
  }, 0);

  // Sample tasks
  if (!tasks.length) {
    const today = new Date();
    const addDays = (d) => { const dt = new Date(today); dt.setDate(dt.getDate() + d); return dt.toISOString().split('T')[0]; };
    tasks = [
      { id: 't1', name: 'Kumpulkan Laporan Bisnis Digital',  desc: 'Laporan spesifikasi produk Visioner',       deadline: addDays(2),  cat: 'Kuliah',  done: false },
      { id: 't2', name: 'Presentasi Simulasi Bisnis',        desc: 'Persiapkan slide dan materi presentasi',    deadline: addDays(5),  cat: 'Kuliah',  done: false },
      { id: 't3', name: 'Review Desain UI Visioner',         desc: 'Review mockup dari tim desain',             deadline: addDays(8),  cat: 'Proyek',  done: false },
      { id: 't4', name: 'Belajar React.js',                  desc: 'Tutorial dasar React untuk frontend Visioner', deadline: addDays(-1), cat: 'Pribadi', done: false },
      { id: 't5', name: 'Meeting Tim Kelompok 6',            desc: 'Koordinasi pembagian tugas',                deadline: addDays(1),  cat: 'Kuliah',  done: true  },
    ];
    saveTasks();
  }

  // Sample notes
  if (!notes.length) {
    const now = new Date().toISOString();
    notes = [
      { id: 'n1', title: 'Ide Fitur Tambahan Visioner', body: '1. Integrasi kalender Google\n2. Notifikasi push deadline\n3. Export PDF laporan\n4. Kolaborasi tim real-time', taskId: '', created: now, updated: now },
      { id: 'n2', title: 'Rangkuman Teknik Pomodoro', body: 'Teknik Pomodoro ditemukan oleh Francesco Cirillo:\n- 25 menit kerja fokus\n- 5 menit istirahat\n- Setelah 4 sesi → istirahat panjang 15-30 menit\n\nTerbukti meningkatkan produktivitas dan mengurangi kelelahan.', taskId: 't2', created: now, updated: now },
    ];
    saveNotes();
  }

  renderPomoDots();
}

init();
