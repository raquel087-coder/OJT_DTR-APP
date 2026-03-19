/**
 * OJT Daily Time Record — script.js
 * Fully offline. Uses localStorage for all data persistence.
 * Updated: Time In state is now saved to LocalStorage
 *          so it persists even after closing/reopening the browser.
 */

// =============================================
// STORAGE KEYS
// =============================================
const KEYS = {
  profile      : 'dtr_profile',
  records      : 'dtr_records',
  activeTimeIn : 'dtr_active_timein',  // NEW: saves current Time In state
};

// =============================================
// DATA HELPERS
// =============================================

/** Load profile from localStorage */
function getProfile() {
  const raw = localStorage.getItem(KEYS.profile);
  return raw ? JSON.parse(raw) : {
    name     : 'Student Name',
    course   : 'Course / Program',
    school   : 'School Name',
    company  : 'Company Name',
    required : 500,
  };
}

/** Save profile to localStorage */
function saveProfile(profile) {
  localStorage.setItem(KEYS.profile, JSON.stringify(profile));
}

/** Load records array from localStorage */
function getRecords() {
  const raw = localStorage.getItem(KEYS.records);
  return raw ? JSON.parse(raw) : [];
}

/** Save records array to localStorage */
function saveRecords(records) {
  localStorage.setItem(KEYS.records, JSON.stringify(records));
}

/**
 * Save the active Time In session to localStorage
 * so it persists even when the browser is closed.
 */
function saveActiveTimeIn(date, timeIn24) {
  localStorage.setItem(KEYS.activeTimeIn, JSON.stringify({ date, timeIn24 }));
}

/** Load the active Time In session from localStorage */
function getActiveTimeIn() {
  const raw = localStorage.getItem(KEYS.activeTimeIn);
  return raw ? JSON.parse(raw) : null;
}

/** Clear the active Time In session (after saving the entry) */
function clearActiveTimeIn() {
  localStorage.removeItem(KEYS.activeTimeIn);
}

/** Generate a simple unique ID */
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** Format Date object → "HH:MM AM/PM" */
function formatTime12(date) {
  let h = date.getHours(), m = date.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')} ${ampm}`;
}

/** Format "HH:MM" (24h) → "HH:MM AM/PM" */
function to12h(time24) {
  if (!time24) return '--:-- --';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2,'0')}:${m} ${ampm}`;
}

/** Calculate hours between two "HH:MM" strings. Returns decimal hours. */
function calcHours(timeIn, timeOut) {
  if (!timeIn || !timeOut) return 0;
  const [h1, m1] = timeIn.split(':').map(Number);
  const [h2, m2] = timeOut.split(':').map(Number);
  const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
  return Math.max(0, diff / 60);
}

/** Format "YYYY-MM-DD" → "Mon DD, YYYY" */
function formatDateDisplay(ymd) {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-').map(Number);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[m-1]} ${d}, ${y}`;
}

// =============================================
// LIVE CLOCK
// =============================================
function startClock() {
  function tick() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2,'0');
    const m = String(now.getMinutes()).padStart(2,'0');
    const s = String(now.getSeconds()).padStart(2,'0');
    document.getElementById('liveClock').textContent = `${h}:${m}:${s}`;

    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    document.getElementById('liveDate').textContent =
      `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  }
  tick();
  setInterval(tick, 1000);
}

// =============================================
// TOAST
// =============================================
let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// =============================================
// NAVIGATION
// =============================================
function initNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
      document.getElementById(`tab-${tab}`).classList.add('active');
    });
  });
}

// =============================================
// DASHBOARD RENDERING
// =============================================
function renderDashboard() {
  const p = getProfile();
  const records = getRecords();

  // Profile card
  document.getElementById('displayName').textContent    = p.name    || 'Student Name';
  document.getElementById('displayCourse').textContent  = p.course  || 'Course / Program';
  document.getElementById('displaySchool').textContent  = p.school  || 'School';
  document.getElementById('displayCompany').textContent = p.company || 'Company';

  // Avatar initials
  const words = (p.name || 'ST').trim().split(' ');
  const initials = words.length >= 2
    ? words[0][0] + words[words.length - 1][0]
    : (words[0].substring(0,2));
  document.getElementById('avatarInitials').textContent = initials.toUpperCase();

  // Stats
  const totalHours = records.reduce((sum, r) => sum + (parseFloat(r.hours) || 0), 0);
  const totalDays  = records.length;
  const avgHours   = totalDays > 0 ? totalHours / totalDays : 0;
  const required   = parseFloat(p.required) || 500;

  document.getElementById('statTotalHours').textContent = totalHours.toFixed(2);
  document.getElementById('statTotalDays').textContent  = totalDays;
  document.getElementById('statAvgHours').textContent   = avgHours.toFixed(2);
  document.getElementById('statRequired').textContent   = required;

  // Progress bar
  const pct = Math.min(100, (totalHours / required) * 100);
  document.getElementById('progressBar').style.width     = pct.toFixed(1) + '%';
  document.getElementById('progressPercent').textContent = pct.toFixed(1) + '%';

  let note = '';
  if      (pct === 0)  note = "Keep going! You're just getting started.";
  else if (pct < 25)   note = "Great start! Keep the momentum going.";
  else if (pct < 50)   note = "You're making real progress! Almost halfway there.";
  else if (pct < 75)   note = "More than halfway done! You're doing great.";
  else if (pct < 100)  note = "Almost there! Just a little more to go.";
  else                 note = "🎉 Congratulations! You've completed your OJT hours!";
  document.getElementById('progressNote').textContent = note;

  // Recent entries (last 5)
  const container = document.getElementById('recentEntries');
  if (records.length === 0) {
    container.innerHTML = '<p class="empty-state">No entries yet. Start logging your time!</p>';
    return;
  }
  const recent = [...records].reverse().slice(0, 5);
  container.innerHTML = recent.map(r => `
    <div class="recent-item">
      <div class="recent-item-left">
        <div class="recent-dot"></div>
        <div>
          <div class="recent-date">${formatDateDisplay(r.date)}</div>
          <div class="recent-task">${r.task || '—'}</div>
        </div>
      </div>
      <div class="recent-hours">${parseFloat(r.hours).toFixed(2)} hrs</div>
    </div>
  `).join('');
}

// =============================================
// PROFILE MODAL
// =============================================
function initProfileModal() {
  const modal     = document.getElementById('profileModal');
  const openBtn   = document.getElementById('openProfileModal');
  const closeBtn  = document.getElementById('closeProfileModal');
  const cancelBtn = document.getElementById('cancelProfileModal');
  const saveBtn   = document.getElementById('saveProfile');

  function openModal() {
    const p = getProfile();
    document.getElementById('inputName').value     = p.name     || '';
    document.getElementById('inputCourse').value   = p.course   || '';
    document.getElementById('inputSchool').value   = p.school   || '';
    document.getElementById('inputCompany').value  = p.company  || '';
    document.getElementById('inputRequired').value = p.required || 500;
    modal.classList.add('open');
  }

  function closeModal() { modal.classList.remove('open'); }

  openBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  saveBtn.addEventListener('click', () => {
    const name     = document.getElementById('inputName').value.trim();
    const course   = document.getElementById('inputCourse').value.trim();
    const school   = document.getElementById('inputSchool').value.trim();
    const company  = document.getElementById('inputCompany').value.trim();
    const required = parseInt(document.getElementById('inputRequired').value, 10) || 500;

    if (!name) { showToast('⚠️ Please enter your name.'); return; }

    saveProfile({ name, course, school, company, required });
    renderDashboard();
    closeModal();
    showToast('✅ Profile saved!');
  });
}

// =============================================
// TIME LOG
// =============================================
function initTimeLog() {
  // Set today's date as default
  const today = new Date();
  const yyyy  = today.getFullYear();
  const mm    = String(today.getMonth() + 1).padStart(2, '0');
  const dd    = String(today.getDate()).padStart(2, '0');
  document.getElementById('entryDate').value = `${yyyy}-${mm}-${dd}`;

  const timeInBtn   = document.getElementById('btnTimeIn');
  const timeOutBtn  = document.getElementById('btnTimeOut');
  const timeInDisp  = document.getElementById('timeInDisplay');
  const timeOutDisp = document.getElementById('timeOutDisplay');
  const hoursBox    = document.getElementById('computedHoursBox');
  const hoursVal    = document.getElementById('computedHoursVal');

  // -----------------------------------------------
  // NEW: Restore Time In state from LocalStorage
  // This runs every time the page loads/refreshes
  // -----------------------------------------------
  let timeIn24  = '';
  let timeOut24 = '';

  const saved = getActiveTimeIn();
  if (saved) {
    // May naka-save na Time In session!
    timeIn24 = saved.timeIn24;
    document.getElementById('entryDate').value = saved.date;
    timeInDisp.textContent = to12h(saved.timeIn24);
    timeInBtn.disabled  = true;   // Naka-Time In na
    timeOutBtn.disabled = false;  // Pwede nang mag-Time Out
    showToast('🟢 Welcome back! Your Time In is still recorded.');
  }

  // -----------------------------------------------
  // TIME IN button
  // -----------------------------------------------
  timeInBtn.addEventListener('click', () => {
    const now  = new Date();
    const h    = String(now.getHours()).padStart(2,'0');
    const m    = String(now.getMinutes()).padStart(2,'0');
    timeIn24   = `${h}:${m}`;

    const date = document.getElementById('entryDate').value;

    timeInDisp.textContent = formatTime12(now);
    timeInBtn.disabled     = true;
    timeOutBtn.disabled    = false;

    // NEW: I-save agad ang Time In sa LocalStorage
    saveActiveTimeIn(date, timeIn24);

    showToast('🟢 Time In recorded!');
  });

  // -----------------------------------------------
  // TIME OUT button
  // -----------------------------------------------
  timeOutBtn.addEventListener('click', () => {
    const now = new Date();
    const h   = String(now.getHours()).padStart(2,'0');
    const m   = String(now.getMinutes()).padStart(2,'0');
    timeOut24 = `${h}:${m}`;

    timeOutDisp.textContent = formatTime12(now);

    const hrs = calcHours(timeIn24, timeOut24);
    hoursVal.textContent   = hrs.toFixed(2) + ' hrs';
    hoursBox.style.display = 'block';

    showToast('🔴 Time Out recorded!');
  });

  // -----------------------------------------------
  // SAVE ENTRY button
  // -----------------------------------------------
  document.getElementById('btnSaveEntry').addEventListener('click', () => {
    const date = document.getElementById('entryDate').value;
    const task = document.getElementById('taskDesc').value.trim();

    if (!date)      { showToast('⚠️ Please select a date.');        return; }
    if (!timeIn24)  { showToast('⚠️ Please record your Time In.');  return; }
    if (!timeOut24) { showToast('⚠️ Please record your Time Out.'); return; }

    const hours = calcHours(timeIn24, timeOut24).toFixed(2);

    const record = {
      id      : genId(),
      date,
      timeIn  : timeIn24,
      timeOut : timeOut24,
      hours,
      task    : task || '—',
    };

    const records = getRecords();
    records.push(record);
    saveRecords(records);

    // NEW: I-clear ang active Time In session pagkatapos ma-save
    clearActiveTimeIn();

    // Reset form
    timeIn24  = '';
    timeOut24 = '';
    timeInDisp.textContent  = '--:-- --';
    timeOutDisp.textContent = '--:-- --';
    document.getElementById('taskDesc').value = '';
    timeInBtn.disabled  = false;
    timeOutBtn.disabled = true;
    hoursBox.style.display = 'none';

    renderDashboard();
    renderRecords();
    showToast('✅ Entry saved successfully!');
  });
}

// =============================================
// RECORDS TABLE
// =============================================
let searchQuery = '';

function renderRecords(query = '') {
  let records = getRecords();

  if (query) {
    const q = query.toLowerCase();
    records = records.filter(r =>
      r.date.includes(q) ||
      (r.task && r.task.toLowerCase().includes(q))
    );
  }

  const tbody = document.getElementById('dtrTableBody');

  if (records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-row">No records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = records.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${formatDateDisplay(r.date)}</strong></td>
      <td>${to12h(r.timeIn)}</td>
      <td>${to12h(r.timeOut)}</td>
      <td><span class="hours-badge">${parseFloat(r.hours).toFixed(2)} hrs</span></td>
      <td style="max-width:220px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${r.task}</td>
      <td>
        <div class="action-btns">
          <button class="btn-edit" onclick="openEditModal('${r.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </button>
          <button class="btn-delete" onclick="deleteRecord('${r.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            Del
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function initRecords() {
  document.getElementById('searchInput').addEventListener('input', e => {
    searchQuery = e.target.value;
    renderRecords(searchQuery);
  });

  document.getElementById('btnClearAll').addEventListener('click', () => {
    if (!confirm('Are you sure you want to delete ALL records? This cannot be undone.')) return;
    saveRecords([]);
    renderRecords();
    renderDashboard();
    showToast('🗑️ All records cleared.');
  });
}

// =============================================
// DELETE RECORD
// =============================================
function deleteRecord(id) {
  if (!confirm('Delete this record?')) return;
  const records = getRecords().filter(r => r.id !== id);
  saveRecords(records);
  renderRecords(searchQuery);
  renderDashboard();
  showToast('🗑️ Record deleted.');
}

// =============================================
// EDIT RECORD MODAL
// =============================================
function openEditModal(id) {
  const records = getRecords();
  const r = records.find(x => x.id === id);
  if (!r) return;

  document.getElementById('editId').value      = r.id;
  document.getElementById('editDate').value    = r.date;
  document.getElementById('editTimeIn').value  = r.timeIn;
  document.getElementById('editTimeOut').value = r.timeOut;
  document.getElementById('editTask').value    = r.task !== '—' ? r.task : '';
  document.getElementById('editModal').classList.add('open');
}

function initEditModal() {
  const modal     = document.getElementById('editModal');
  const closeBtn  = document.getElementById('closeEditModal');
  const cancelBtn = document.getElementById('cancelEditModal');
  const saveBtn   = document.getElementById('saveEdit');

  function closeModal() { modal.classList.remove('open'); }

  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  saveBtn.addEventListener('click', () => {
    const id      = document.getElementById('editId').value;
    const date    = document.getElementById('editDate').value;
    const timeIn  = document.getElementById('editTimeIn').value;
    const timeOut = document.getElementById('editTimeOut').value;
    const task    = document.getElementById('editTask').value.trim() || '—';

    if (!date || !timeIn || !timeOut) {
      showToast('⚠️ Please fill all required fields.'); return;
    }

    const hours = calcHours(timeIn, timeOut).toFixed(2);
    const records = getRecords().map(r =>
      r.id === id ? { ...r, date, timeIn, timeOut, hours, task } : r
    );
    saveRecords(records);
    renderRecords(searchQuery);
    renderDashboard();
    closeModal();
    showToast('✏️ Record updated!');
  });
}

// =============================================
// EXPORT PDF (Print)
// =============================================
function initExport() {
  document.getElementById('exportPDF').addEventListener('click', () => {
    const records = getRecords();
    if (records.length === 0) {
      showToast('⚠️ No records to export.'); return;
    }

    const p = getProfile();
    const totalHours = records.reduce((s, r) => s + parseFloat(r.hours), 0).toFixed(2);

    const rows = records.map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${formatDateDisplay(r.date)}</td>
        <td>${to12h(r.timeIn)}</td>
        <td>${to12h(r.timeOut)}</td>
        <td>${parseFloat(r.hours).toFixed(2)} hrs</td>
        <td>${r.task}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8"/>
        <title>DTR – ${p.name}</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; padding: 32px; color: #1e293b; }
          h1 { font-size: 22px; margin-bottom: 4px; }
          .meta { font-size: 13px; color: #64748b; margin-bottom: 20px; }
          .meta span { margin-right: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; border-bottom: 2px solid #e2e8f0; }
          td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
          tr:hover td { background: #f8fafc; }
          .total { margin-top: 14px; font-weight: 700; font-size: 14px; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <h1>Daily Time Record (DTR)</h1>
        <div class="meta">
          <span><strong>Name:</strong> ${p.name}</span>
          <span><strong>Course:</strong> ${p.course}</span>
          <span><strong>School:</strong> ${p.school}</span>
          <span><strong>Company:</strong> ${p.company}</span>
        </div>
        <table>
          <thead>
            <tr><th>#</th><th>Date</th><th>Time In</th><th>Time Out</th><th>Hours</th><th>Task Description</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p class="total">Total Hours Rendered: ${totalHours} hrs &nbsp;|&nbsp; Required: ${p.required} hrs</p>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  });
}

// =============================================
// APP INIT
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  startClock();
  initNav();
  initProfileModal();
  initTimeLog();
  initRecords();
  initEditModal();
  initExport();
  renderDashboard();
  renderRecords();
});
