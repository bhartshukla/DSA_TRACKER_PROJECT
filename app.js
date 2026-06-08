/* =============================================
   DSA TRACKER — COMPLETE APPLICATION SCRIPT
   OmPrakash Study Centre
   ============================================= */

/* =========== CONSTANTS & DATA DEFAULTS =========== */

const DSA_TOPICS = [
  "Arrays","Strings","Linked List","Stack","Queue","Recursion",
  "Hashing","Trees","BST","Heap","Trie","Graph","Greedy",
  "Dynamic Programming","Backtracking","Segment Tree","Bit Manipulation"
];

const DEFAULT_TOPIC_TOTALS = {
  "Arrays":50,"Strings":40,"Linked List":25,"Stack":15,"Queue":15,
  "Recursion":20,"Hashing":20,"Trees":30,"BST":20,"Heap":15,
  "Trie":10,"Graph":30,"Greedy":20,"Dynamic Programming":40,
  "Backtracking":15,"Segment Tree":10,"Bit Manipulation":15
};

const ACHIEVEMENTS_DEF = [
  {id:"first",icon:"🥇",name:"First Blood",desc:"Solve your first problem",check:d=>d.problems.length>=1},
  {id:"p10",icon:"🌟",name:"10 Problems",desc:"Solve 10 problems",check:d=>d.problems.length>=10},
  {id:"p50",icon:"💫",name:"50 Problems",desc:"Solve 50 problems",check:d=>d.problems.length>=50},
  {id:"p100",icon:"💯",name:"Century",desc:"Solve 100 problems",check:d=>d.problems.length>=100},
  {id:"p250",icon:"🔥",name:"250 Problems",desc:"Solve 250 problems",check:d=>d.problems.length>=250},
  {id:"p500",icon:"👑",name:"500 Problems",desc:"Solve 500 problems",check:d=>d.problems.length>=500},
  {id:"s7",icon:"📅",name:"7-Day Streak",desc:"Maintain a 7-day streak",check:d=>calcStreak(d.daily)>=7},
  {id:"s30",icon:"🗓️",name:"30-Day Streak",desc:"Maintain a 30-day streak",check:d=>calcStreak(d.daily)>=30},
  {id:"s100",icon:"⚡",name:"100-Day Streak",desc:"Maintain a 100-day streak",check:d=>calcStreak(d.daily)>=100},
  {id:"array",icon:"🗃️",name:"Array Master",desc:"Complete all Array problems",check:d=>topicPct(d,"Arrays")>=100},
  {id:"graph",icon:"🕸️",name:"Graph Master",desc:"Complete all Graph problems",check:d=>topicPct(d,"Graph")>=100},
  {id:"dp",icon:"🧮",name:"DP Master",desc:"Complete all DP problems",check:d=>topicPct(d,"Dynamic Programming")>=100},
];

const SHEET_DATA = {
  striver: { name:"Striver A2Z Sheet", total:455 },
  blind75: { name:"Blind 75", total:75 },
  neetcode: { name:"NeetCode 150", total:150 },
  babbar: { name:"Love Babbar Sheet", total:450 }
};

/* =========== APP STATE =========== */
let appData = {
  daily: [],
  topics: {},
  problems: [],
  goals: [],
  notes: [],
  interviews: [],
  sheets: { striver:0, blind75:0, neetcode:0, babbar:0 },
  achievements: {},
  settings: { darkMode:true, accent:'#00d4ff', accentDark:'#0099bb' },
  heatmapYear: new Date().getFullYear()
};

let currentSection = 'dashboard';
let currentRevTab = 'overdue';
let currentSheet = 'striver';
let activeNoteId = null;
let heatmapYear = new Date().getFullYear();
let charts = {};
let editingTopicIndex = null;

/* =========== LOCALSTORAGE =========== */
function saveData() {
  localStorage.setItem('dsaTracker_v2', JSON.stringify(appData));
}
function loadData() {
  const raw = localStorage.getItem('dsaTracker_v2');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      appData = Object.assign({}, appData, parsed);
      // Merge settings
      if (!appData.settings) appData.settings = { darkMode:true, accent:'#00d4ff', accentDark:'#0099bb' };
      if (!appData.sheets) appData.sheets = { striver:0, blind75:0, neetcode:0, babbar:0 };
      if (!appData.achievements) appData.achievements = {};
    } catch(e) { console.warn('Data parse error', e); }
  }
  // Ensure topic defaults exist
  DSA_TOPICS.forEach(t => {
    if (!appData.topics[t]) appData.topics[t] = { total: DEFAULT_TOPIC_TOTALS[t] || 20, solved: 0 };
  });
  appData.heatmapYear = heatmapYear;
}

/* =========== UTILITIES =========== */
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function todayStr() { return new Date().toISOString().slice(0,10); }
function toast(msg, type='info') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast show ${type}`;
  setTimeout(() => el.classList.remove('show'), 3000);
}
function confirm(msg, cb) {
  document.getElementById('confirmMsg').textContent = msg;
  document.getElementById('confirmYes').onclick = () => { closeModal('confirmModal'); cb(); };
  document.getElementById('confirmModal').classList.add('open');
}
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function fmtDate(str) {
  if (!str) return '—';
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}
function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0,10);
}
function calcStreak(dailyArr) {
  if (!dailyArr || !dailyArr.length) return 0;
  const dates = [...new Set(dailyArr.map(e => e.date))].sort().reverse();
  let streak = 0, cur = todayStr();
  for (let d of dates) {
    if (d === cur) { streak++; cur = addDays(cur, -1); }
    else if (d === addDays(cur, 0)) { break; }
    else { break; }
  }
  return streak;
}
function calcLongestStreak(dailyArr) {
  if (!dailyArr || !dailyArr.length) return 0;
  const dates = [...new Set(dailyArr.map(e => e.date))].sort();
  let max=0, cur=1;
  for (let i=1;i<dates.length;i++){
    const prev = new Date(dates[i-1]+'T00:00:00'), next = new Date(dates[i]+'T00:00:00');
    const diff = (next-prev)/(1000*86400);
    if (diff===1){cur++;max=Math.max(max,cur);}
    else cur=1;
  }
  return Math.max(max,cur);
}
function topicPct(data, topicName) {
  const t = data.topics[topicName];
  if (!t || t.total===0) return 0;
  return Math.round((t.solved/t.total)*100);
}
function getDiffColor(diff) {
  if (diff==='Easy') return 'var(--easy)';
  if (diff==='Medium') return 'var(--medium)';
  return 'var(--hard)';
}

/* =========== NAVIGATION =========== */
function initNav() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const sec = item.dataset.section;
      navigateTo(sec);
      // Close sidebar on mobile
      if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
    });
  });
  document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });
  // Close sidebar on outside click (mobile)
  document.addEventListener('click', e => {
    if (window.innerWidth <= 768) {
      const sidebar = document.getElementById('sidebar');
      const toggle = document.getElementById('menuToggle');
      if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    }
  });
}
function navigateTo(sec) {
  currentSection = sec;
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('sec-' + sec).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.section === sec);
  });
  const titles = {
    dashboard:'Dashboard', daily:'Daily Tracker', topics:'Topics Tracker',
    problems:'Problem Tracker', revision:'Revision Tracker', goals:'Goals',
    analytics:'Analytics', heatmap:'Calendar Heatmap', achievements:'Achievements',
    notes:'Notes Manager', sheets:'DSA Sheets', interview:'Interview Tracker',
    settings:'Settings'
  };
  document.getElementById('headerTitle').textContent = titles[sec] || sec;
  // Render section
  switch(sec) {
    case 'dashboard': renderDashboard(); break;
    case 'daily': renderDailyTable(); setTodayDate(); break;
    case 'topics': renderTopics(); break;
    case 'problems': renderProblemsTable(); populateTopicSelects(); break;
    case 'revision': renderRevision(); break;
    case 'goals': renderGoals(); break;
    case 'analytics': setTimeout(renderAnalytics, 100); break;
    case 'heatmap': renderHeatmap(); break;
    case 'achievements': renderAchievements(); break;
    case 'notes': renderNotesList(); break;
    case 'sheets': renderSheet(currentSheet); break;
    case 'interview': renderInterviewTable(); break;
    case 'settings': renderSettings(); break;
  }
}

/* =========== DASHBOARD =========== */
function renderDashboard() {
  renderStatsCards();
  renderRecentProblems();
  renderUpcomingRevDash();
  renderDashCharts();
  document.getElementById('headerStreak').textContent = calcStreak(appData.daily);
}

function renderStatsCards() {
  const problems = appData.problems;
  const easy = problems.filter(p=>p.difficulty==='Easy').length;
  const medium = problems.filter(p=>p.difficulty==='Medium').length;
  const hard = problems.filter(p=>p.difficulty==='Hard').length;
  const totalHours = appData.daily.reduce((s,e)=>s+(parseFloat(e.hours)||0),0);
  const streak = calcStreak(appData.daily);
  const longest = calcLongestStreak(appData.daily);
  const topicsCompleted = Object.keys(appData.topics).filter(t=>{
    const tp=appData.topics[t]; return tp.solved>=tp.total && tp.total>0;
  }).length;
  const totalTopicQs = Object.values(appData.topics).reduce((s,t)=>s+t.total,0);
  const solvedTopicQs = Object.values(appData.topics).reduce((s,t)=>s+t.solved,0);
  const overallPct = totalTopicQs>0 ? Math.round((solvedTopicQs/totalTopicQs)*100) : 0;

  const stats = [
    {icon:'✅', count:problems.length, title:'Total Solved', pct:Math.min(100,problems.length/500*100)},
    {icon:'🟢', count:easy, title:'Easy Solved', pct:Math.min(100,easy/200*100)},
    {icon:'🟡', count:medium, title:'Medium Solved', pct:Math.min(100,medium/200*100)},
    {icon:'🔴', count:hard, title:'Hard Solved', pct:Math.min(100,hard/100*100)},
    {icon:'⏱️', count:totalHours.toFixed(1), title:'Study Hours', pct:Math.min(100,totalHours/500*100)},
    {icon:'🔥', count:streak, title:'Current Streak', pct:Math.min(100,streak/100*100)},
    {icon:'⚡', count:longest, title:'Longest Streak', pct:Math.min(100,longest/100*100)},
    {icon:'📚', count:topicsCompleted, title:'Topics Completed', pct:Math.round(topicsCompleted/DSA_TOPICS.length*100)},
    {icon:'📊', count:overallPct+'%', title:'Overall Progress', pct:overallPct},
  ];
  const grid = document.getElementById('statsGrid');
  grid.innerHTML = stats.map(s=>`
    <div class="stat-card">
      <div class="stat-icon">${s.icon}</div>
      <div class="stat-count">${s.count}</div>
      <div class="stat-title">${s.title}</div>
      <div class="stat-bar"><div class="stat-bar-fill" style="width:${s.pct}%"></div></div>
    </div>
  `).join('');
}

function renderRecentProblems() {
  const el = document.getElementById('recentProblems');
  const recent = [...appData.problems].sort((a,b)=>b.date>a.date?1:-1).slice(0,8);
  if (!recent.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">🧩</div><p>No problems yet</p></div>'; return; }
  el.innerHTML = recent.map(p=>`
    <div class="recent-item">
      <div>
        <span class="diff-badge diff-${p.difficulty}">${p.difficulty[0]}</span>
        <span style="margin-left:8px;font-size:13px">${p.name}</span>
      </div>
      <span style="font-size:11px;color:var(--text-muted)">${fmtDate(p.date)}</span>
    </div>
  `).join('');
}

function renderUpcomingRevDash() {
  const el = document.getElementById('upcomingRevDash');
  const today = todayStr();
  const upcoming = getRevisionItems().filter(r => r.nextDate >= today && r.status !== 'completed').slice(0,6);
  if (!upcoming.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">🔄</div><p>No upcoming revisions</p></div>'; return; }
  el.innerHTML = upcoming.map(r=>`
    <div class="rev-item-dash">
      <span style="font-size:13px">${r.name}</span>
      <span style="font-size:11px;color:var(--text-muted)">${fmtDate(r.nextDate)}</span>
    </div>
  `).join('');
}

function renderDashCharts() {
  // Weekly chart
  const labels7 = [], data7 = [];
  for (let i=6;i>=0;i--) {
    const d = addDays(todayStr(), -i);
    labels7.push(new Date(d+'T00:00:00').toLocaleDateString('en',{weekday:'short'}));
    const dayProbs = appData.problems.filter(p=>p.date===d).length;
    data7.push(dayProbs);
  }
  buildChart('dashWeeklyChart','bar',labels7,data7,'Problems Solved');

  // Difficulty donut
  const easy = appData.problems.filter(p=>p.difficulty==='Easy').length;
  const med = appData.problems.filter(p=>p.difficulty==='Medium').length;
  const hard = appData.problems.filter(p=>p.difficulty==='Hard').length;
  buildDoughnut('dashDiffChart',['Easy','Medium','Hard'],[easy,med,hard],
    ['rgba(16,185,129,0.8)','rgba(245,158,11,0.8)','rgba(239,68,68,0.8)']);
}

/* =========== DAILY TRACKER =========== */
function setTodayDate() {
  const di = document.getElementById('dailyDate');
  if (!di.value) di.value = todayStr();
}

function saveDailyEntry() {
  const date = document.getElementById('dailyDate').value;
  const hours = document.getElementById('dailyHours').value;
  const questions = document.getElementById('dailyQuestions').value;
  const topics = document.getElementById('dailyTopics').value.trim();
  const notes = document.getElementById('dailyNotes').value.trim();
  const mood = document.getElementById('dailyMood').value;
  const editId = document.getElementById('dailyEditId').value;
  if (!date) { toast('Please select a date','error'); return; }
  const entry = { id: editId || genId(), date, hours:parseFloat(hours)||0, questions:parseInt(questions)||0, topics, notes, mood };
  if (editId) {
    const idx = appData.daily.findIndex(e=>e.id===editId);
    if (idx>-1) appData.daily[idx] = entry;
    toast('Entry updated ✓','success');
  } else {
    appData.daily.push(entry);
    toast('Entry saved ✓','success');
  }
  saveData();
  clearDailyForm();
  renderDailyTable();
  checkAchievements();
}

function clearDailyForm() {
  document.getElementById('dailyDate').value = todayStr();
  document.getElementById('dailyHours').value = '';
  document.getElementById('dailyQuestions').value = '';
  document.getElementById('dailyTopics').value = '';
  document.getElementById('dailyNotes').value = '';
  document.getElementById('dailyMood').value = 'Good';
  document.getElementById('dailyEditId').value = '';
  document.getElementById('dailyFormTitle').textContent = '➕ Add Today\'s Entry';
}

function editDailyEntry(id) {
  const e = appData.daily.find(x=>x.id===id);
  if (!e) return;
  document.getElementById('dailyDate').value = e.date;
  document.getElementById('dailyHours').value = e.hours;
  document.getElementById('dailyQuestions').value = e.questions;
  document.getElementById('dailyTopics').value = e.topics;
  document.getElementById('dailyNotes').value = e.notes;
  document.getElementById('dailyMood').value = e.mood || 'Good';
  document.getElementById('dailyEditId').value = e.id;
  document.getElementById('dailyFormTitle').textContent = '✏️ Edit Entry';
  window.scrollTo(0,0);
}

function deleteDailyEntry(id) {
  confirm('Delete this daily entry?', () => {
    appData.daily = appData.daily.filter(e=>e.id!==id);
    saveData(); renderDailyTable(); toast('Entry deleted','info');
  });
}

function renderDailyTable() {
  const search = (document.getElementById('dailySearch')?.value||'').toLowerCase();
  const filterDate = document.getElementById('dailyFilterDate')?.value||'';
  let entries = [...appData.daily].sort((a,b)=>b.date>a.date?1:-1);
  if (search) entries = entries.filter(e => e.topics?.toLowerCase().includes(search) || e.notes?.toLowerCase().includes(search) || e.date.includes(search));
  if (filterDate) entries = entries.filter(e=>e.date===filterDate);
  const wrap = document.getElementById('dailyTableWrap');
  if (!entries.length) { wrap.innerHTML = '<div class="no-data">No entries found. Start logging your study sessions!</div>'; return; }
  const moodEmoji = {Excellent:'😄',Good:'🙂',Average:'😐',Poor:'😞'};
  wrap.innerHTML = `<table>
    <thead><tr><th>Date</th><th>Hours</th><th>Questions</th><th>Topics</th><th>Mood</th><th>Notes</th><th>Actions</th></tr></thead>
    <tbody>${entries.map(e=>`
      <tr>
        <td class="mono">${fmtDate(e.date)}</td>
        <td class="text-accent mono">${e.hours}h</td>
        <td class="mono">${e.questions}</td>
        <td>${e.topics||'—'}</td>
        <td>${moodEmoji[e.mood]||'🙂'} ${e.mood||'Good'}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${e.notes||''}">${e.notes||'—'}</td>
        <td>
          <div class="action-btns">
            <button class="icon-btn" onclick="editDailyEntry('${e.id}')">✏️</button>
            <button class="icon-btn" onclick="deleteDailyEntry('${e.id}')">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('')}</tbody>
  </table>`;
}

/* =========== TOPICS =========== */
function renderTopics() {
  const grid = document.getElementById('topicsGrid');
  grid.innerHTML = DSA_TOPICS.map((name, idx) => {
    const t = appData.topics[name] || {total:DEFAULT_TOPIC_TOTALS[name]||20, solved:0};
    const pct = t.total>0 ? Math.round((t.solved/t.total)*100) : 0;
    const remaining = Math.max(0, t.total - t.solved);
    return `
    <div class="topic-card" onclick="openTopicModal(${idx})">
      <div class="topic-card-header">
        <span class="topic-name">${name}</span>
        <span class="topic-pct">${pct}%</span>
      </div>
      <div class="topic-progress-bar">
        <div class="topic-progress-fill" style="width:${pct}%"></div>
      </div>
      <div class="topic-stats">
        <span>✅ ${t.solved}/${t.total}</span>
        <span>⏳ ${remaining} left</span>
      </div>
    </div>`;
  }).join('');
}

function openTopicModal(idx) {
  editingTopicIndex = idx;
  const name = DSA_TOPICS[idx];
  const t = appData.topics[name];
  document.getElementById('modalTopicName').textContent = name;
  document.getElementById('modalTotal').value = t.total;
  document.getElementById('modalSolved').value = t.solved;
  document.getElementById('modalTopicIndex').value = idx;
  document.getElementById('topicModal').classList.add('open');
}

function saveTopicEdit() {
  const idx = parseInt(document.getElementById('modalTopicIndex').value);
  const name = DSA_TOPICS[idx];
  const total = parseInt(document.getElementById('modalTotal').value)||0;
  const solved = Math.min(total, parseInt(document.getElementById('modalSolved').value)||0);
  appData.topics[name] = {total, solved};
  saveData(); closeModal('topicModal'); renderTopics();
  toast(`${name} updated ✓`, 'success'); checkAchievements();
}

function resetTopic() {
  const idx = parseInt(document.getElementById('modalTopicIndex').value);
  const name = DSA_TOPICS[idx];
  appData.topics[name] = {total: DEFAULT_TOPIC_TOTALS[name]||20, solved:0};
  saveData(); closeModal('topicModal'); renderTopics();
  toast(`${name} reset`, 'info');
}

/* =========== PROBLEM TRACKER =========== */
function populateTopicSelects() {
  ['probTopic','probFilterTopic'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const isFilter = id.includes('Filter');
    sel.innerHTML = (isFilter ? '<option value="">All Topics</option>' : '') +
      DSA_TOPICS.map(t=>`<option value="${t}">${t}</option>`).join('');
  });
}

function saveProblem() {
  const name = document.getElementById('probName').value.trim();
  if (!name) { toast('Problem name required','error'); return; }
  const editId = document.getElementById('probEditId').value;
  const prob = {
    id: editId || genId(),
    name, platform: document.getElementById('probPlatform').value,
    difficulty: document.getElementById('probDifficulty').value,
    topic: document.getElementById('probTopic').value,
    date: document.getElementById('probDate').value || todayStr(),
    link: document.getElementById('probLink').value.trim(),
    notes: document.getElementById('probNotes').value.trim(),
    revision: document.getElementById('probRevision').value,
    favorite: false,
    rev1: null, rev2: null, rev3: null,
    rev1Done: false, rev2Done: false, rev3Done: false
  };
  if (editId) {
    const idx = appData.problems.findIndex(p=>p.id===editId);
    if (idx>-1) {
      // Preserve revision data
      prob.favorite = appData.problems[idx].favorite;
      prob.rev1 = appData.problems[idx].rev1;
      prob.rev2 = appData.problems[idx].rev2;
      prob.rev3 = appData.problems[idx].rev3;
      prob.rev1Done = appData.problems[idx].rev1Done;
      prob.rev2Done = appData.problems[idx].rev2Done;
      prob.rev3Done = appData.problems[idx].rev3Done;
      appData.problems[idx] = prob;
    }
    toast('Problem updated ✓','success');
  } else {
    // Set revision dates
    prob.rev1 = addDays(prob.date, 1);
    prob.rev2 = addDays(prob.date, 7);
    prob.rev3 = addDays(prob.date, 30);
    appData.problems.push(prob);
    toast('Problem added ✓','success');
  }
  saveData(); clearProbForm(); renderProblemsTable(); checkAchievements();
}

function clearProbForm() {
  ['probName','probLink','probNotes','probEditId'].forEach(id => document.getElementById(id).value='');
  document.getElementById('probDate').value = todayStr();
  document.getElementById('probPlatform').selectedIndex = 0;
  document.getElementById('probDifficulty').selectedIndex = 0;
  document.getElementById('probTopic').selectedIndex = 0;
  document.getElementById('probRevision').selectedIndex = 1;
  document.getElementById('probFormTitle').textContent = '➕ Add Problem';
}

function editProblem(id) {
  const p = appData.problems.find(x=>x.id===id);
  if (!p) return;
  document.getElementById('probName').value = p.name;
  document.getElementById('probPlatform').value = p.platform;
  document.getElementById('probDifficulty').value = p.difficulty;
  document.getElementById('probTopic').value = p.topic;
  document.getElementById('probDate').value = p.date;
  document.getElementById('probLink').value = p.link||'';
  document.getElementById('probNotes').value = p.notes||'';
  document.getElementById('probRevision').value = p.revision;
  document.getElementById('probEditId').value = p.id;
  document.getElementById('probFormTitle').textContent = '✏️ Edit Problem';
  window.scrollTo(0,0);
}

function deleteProblem(id) {
  confirm('Delete this problem?', () => {
    appData.problems = appData.problems.filter(p=>p.id!==id);
    saveData(); renderProblemsTable(); toast('Problem deleted','info');
  });
}

function toggleFavorite(id) {
  const p = appData.problems.find(x=>x.id===id);
  if (p) { p.favorite = !p.favorite; saveData(); renderProblemsTable(); }
}

function renderProblemsTable() {
  const search = (document.getElementById('probSearch')?.value||'').toLowerCase();
  const diff = document.getElementById('probFilterDiff')?.value||'';
  const topic = document.getElementById('probFilterTopic')?.value||'';
  const platform = document.getElementById('probFilterPlatform')?.value||'';
  let probs = [...appData.problems].sort((a,b)=>b.date>a.date?1:-1);
  if (search) probs = probs.filter(p=>p.name.toLowerCase().includes(search)||p.topic.toLowerCase().includes(search));
  if (diff) probs = probs.filter(p=>p.difficulty===diff);
  if (topic) probs = probs.filter(p=>p.topic===topic);
  if (platform) probs = probs.filter(p=>p.platform===platform);
  const wrap = document.getElementById('problemsTableWrap');
  if (!probs.length) { wrap.innerHTML = '<div class="no-data">No problems found. Add your first problem!</div>'; return; }
  wrap.innerHTML = `<table>
    <thead><tr><th>#</th><th>Problem</th><th>Platform</th><th>Difficulty</th><th>Topic</th><th>Date</th><th>Rev?</th><th>Actions</th></tr></thead>
    <tbody>${probs.map((p,i)=>`
      <tr>
        <td class="mono" style="color:var(--text-muted)">${i+1}</td>
        <td>
          <div style="display:flex;align-items:center;gap:6px">
            ${p.favorite?'<span class="fav-star">★</span>':''}
            ${p.link?`<a href="${p.link}" target="_blank" style="color:var(--accent);text-decoration:none">${p.name}</a>`:p.name}
          </div>
        </td>
        <td><span style="font-size:12px;color:var(--text-muted)">${p.platform}</span></td>
        <td><span class="diff-badge diff-${p.difficulty}">${p.difficulty}</span></td>
        <td style="font-size:12px">${p.topic}</td>
        <td class="mono" style="font-size:12px;color:var(--text-muted)">${fmtDate(p.date)}</td>
        <td style="font-size:12px">${p.revision==='Yes'?'<span style="color:var(--medium)">Yes</span>':'<span style="color:var(--text-muted)">No</span>'}</td>
        <td>
          <div class="action-btns">
            <button class="icon-btn" onclick="toggleFavorite('${p.id}')" title="Favorite">${p.favorite?'★':'☆'}</button>
            <button class="icon-btn" onclick="editProblem('${p.id}')">✏️</button>
            <button class="icon-btn" onclick="deleteProblem('${p.id}')">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('')}</tbody>
  </table>`;
}

/* =========== REVISION TRACKER =========== */
function getRevisionItems() {
  const today = todayStr();
  const items = [];
  appData.problems.forEach(p => {
    if (p.revision !== 'Yes' && !p.rev1Done && !p.rev2Done && !p.rev3Done) return;
    // Rev 1
    if (!p.rev1Done && p.rev1) {
      items.push({id:p.id, name:p.name, difficulty:p.difficulty, nextDate:p.rev1, revNum:1, revKey:'rev1Done'});
    }
    // Rev 2
    if (p.rev1Done && !p.rev2Done && p.rev2) {
      items.push({id:p.id, name:p.name, difficulty:p.difficulty, nextDate:p.rev2, revNum:2, revKey:'rev2Done'});
    }
    // Rev 3
    if (p.rev2Done && !p.rev3Done && p.rev3) {
      items.push({id:p.id, name:p.name, difficulty:p.difficulty, nextDate:p.rev3, revNum:3, revKey:'rev3Done'});
    }
    // Completed
    if (p.rev1Done && p.rev2Done && p.rev3Done) {
      items.push({id:p.id, name:p.name, difficulty:p.difficulty, nextDate:p.rev3, revNum:'done', revKey:null});
    }
  });
  return items;
}

function markRevision(probId, revKey) {
  const p = appData.problems.find(x=>x.id===probId);
  if (p) { p[revKey] = true; saveData(); renderRevision(); toast('Revision marked complete ✓','success'); }
}

function switchRevTab(tab, el) {
  currentRevTab = tab;
  document.querySelectorAll('.rev-tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  renderRevision();
}

function renderRevision() {
  const today = todayStr();
  const items = getRevisionItems();
  let filtered = [];
  if (currentRevTab==='overdue') filtered = items.filter(r=>r.nextDate<today && r.revNum!=='done');
  else if (currentRevTab==='today') filtered = items.filter(r=>r.nextDate===today && r.revNum!=='done');
  else if (currentRevTab==='upcoming') filtered = items.filter(r=>r.nextDate>today && r.revNum!=='done');
  else if (currentRevTab==='completed') filtered = items.filter(r=>r.revNum==='done');
  filtered.sort((a,b)=>a.nextDate>b.nextDate?1:-1);
  const el = document.getElementById('revisionContent');
  if (!filtered.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">🔄</div><p>No revisions in this category</p></div>';
    return;
  }
  const typeClass = {overdue:'rev-overdue',today:'rev-today',upcoming:'rev-upcoming',completed:'rev-completed'};
  el.innerHTML = filtered.map(r=>`
    <div class="rev-row ${typeClass[currentRevTab]||''}">
      <div>
        <span class="diff-badge diff-${r.difficulty}" style="margin-right:8px">${r.difficulty}</span>
        <strong>${r.name}</strong>
        ${r.revNum!=='done'?`<span style="font-size:11px;color:var(--text-muted);margin-left:8px">Revision ${r.revNum}</span>`:''}
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <span class="mono" style="font-size:12px;color:var(--text-muted)">${fmtDate(r.nextDate)}</span>
        ${r.revNum!=='done'?`<button class="btn-primary btn-sm" onclick="markRevision('${r.id}','${r.revKey}')">✓ Done</button>`:'<span style="color:var(--easy);font-size:12px;font-weight:700">✅ All Done</span>'}
      </div>
    </div>
  `).join('');
}

/* =========== GOALS =========== */
function saveGoal() {
  const title = document.getElementById('goalTitle').value.trim();
  if (!title) { toast('Goal title required','error'); return; }
  const editId = document.getElementById('goalEditId').value;
  const goal = {
    id: editId || genId(),
    title, type: document.getElementById('goalType').value,
    target: parseInt(document.getElementById('goalTarget').value)||1,
    current: parseInt(document.getElementById('goalCurrent').value)||0,
    due: document.getElementById('goalDue').value,
    desc: document.getElementById('goalDesc').value.trim(),
    completed: false
  };
  goal.completed = goal.current >= goal.target;
  if (editId) {
    const idx = appData.goals.findIndex(g=>g.id===editId);
    if (idx>-1) appData.goals[idx] = goal;
    toast('Goal updated ✓','success');
  } else {
    appData.goals.push(goal);
    toast('Goal added ✓','success');
  }
  saveData(); clearGoalForm(); renderGoals();
}

function clearGoalForm() {
  ['goalTitle','goalTarget','goalCurrent','goalDue','goalDesc','goalEditId'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('goalType').selectedIndex=0;
  document.getElementById('goalFormTitle').textContent = '➕ Add Goal';
}

function editGoal(id) {
  const g = appData.goals.find(x=>x.id===id);
  if (!g) return;
  document.getElementById('goalTitle').value = g.title;
  document.getElementById('goalType').value = g.type;
  document.getElementById('goalTarget').value = g.target;
  document.getElementById('goalCurrent').value = g.current;
  document.getElementById('goalDue').value = g.due||'';
  document.getElementById('goalDesc').value = g.desc||'';
  document.getElementById('goalEditId').value = g.id;
  document.getElementById('goalFormTitle').textContent = '✏️ Edit Goal';
  window.scrollTo(0,0);
}

function deleteGoal(id) {
  confirm('Delete this goal?', () => {
    appData.goals = appData.goals.filter(g=>g.id!==id);
    saveData(); renderGoals(); toast('Goal deleted','info');
  });
}

function markGoalComplete(id) {
  const g = appData.goals.find(x=>x.id===id);
  if (g) { g.completed = !g.completed; if(g.completed) g.current=g.target; saveData(); renderGoals(); }
}

function renderGoals() {
  const grid = document.getElementById('goalsGrid');
  if (!appData.goals.length) {
    grid.innerHTML = '<div class="glass-card"><div class="empty-state"><div class="empty-icon">🎯</div><p>No goals yet. Set your first goal!</p></div></div>';
    return;
  }
  grid.innerHTML = appData.goals.map(g=>{
    const pct = g.target>0 ? Math.min(100, Math.round((g.current/g.target)*100)) : 0;
    return `
    <div class="goal-card ${g.completed?'goal-completed':''}">
      <div class="goal-header">
        <span class="goal-title">${g.title}</span>
        <span class="goal-type-badge goal-${g.type}">${g.type}</span>
      </div>
      ${g.desc?`<p style="font-size:12px;color:var(--text-muted);margin-bottom:8px">${g.desc}</p>`:''}
      <div class="goal-progress-bar">
        <div class="goal-progress-fill" style="width:${pct}%"></div>
      </div>
      <div class="goal-meta">
        <span>${g.current}/${g.target} (${pct}%)</span>
        ${g.due?`<span>Due: ${fmtDate(g.due)}</span>`:''}
      </div>
      <div class="goal-actions">
        <button class="btn-${g.completed?'secondary':'primary'} btn-sm" onclick="markGoalComplete('${g.id}')">${g.completed?'↩ Undo':'✓ Complete'}</button>
        <button class="btn-secondary btn-sm" onclick="editGoal('${g.id}')">✏️</button>
        <button class="btn-danger btn-sm" onclick="deleteGoal('${g.id}')">🗑️</button>
      </div>
    </div>`;
  }).join('');
}

/* =========== ANALYTICS =========== */
function buildChart(canvasId, type, labels, data, label) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if (charts[canvasId]) charts[canvasId].destroy();
  const ctx = canvas.getContext('2d');
  charts[canvasId] = new Chart(ctx, {
    type, data: {
      labels,
      datasets: [{ label, data,
        backgroundColor: type==='bar' ? 'rgba(0,212,255,0.3)' : 'rgba(0,212,255,0.1)',
        borderColor: 'rgba(0,212,255,0.8)',
        borderWidth: type==='line' ? 2 : 1,
        fill: type==='line',
        tension: 0.4,
        pointBackgroundColor: 'var(--accent)',
        borderRadius: type==='bar' ? 4 : 0
      }]
    },
    options: {
      responsive:true, maintainAspectRatio:true,
      plugins:{ legend:{display:false} },
      scales: type!=='doughnut' && type!=='pie' ? {
        x:{ grid:{color:'rgba(255,255,255,0.05)'}, ticks:{color:'rgba(255,255,255,0.4)',font:{size:11}} },
        y:{ grid:{color:'rgba(255,255,255,0.05)'}, ticks:{color:'rgba(255,255,255,0.4)',font:{size:11}}, beginAtZero:true }
      } : {}
    }
  });
}

function buildDoughnut(canvasId, labels, data, colors) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if (charts[canvasId]) charts[canvasId].destroy();
  const ctx = canvas.getContext('2d');
  charts[canvasId] = new Chart(ctx, {
    type:'doughnut', data:{
      labels,
      datasets:[{data, backgroundColor:colors, borderWidth:2, borderColor:'rgba(0,0,0,0.3)'}]
    },
    options:{
      responsive:true, maintainAspectRatio:true,
      plugins:{ legend:{display:true, position:'bottom', labels:{color:'rgba(255,255,255,0.6)',font:{size:11},boxWidth:12}} }
    }
  });
}

function renderAnalytics() {
  // Daily: last 14 days
  const labels14=[], data14=[];
  for (let i=13;i>=0;i--){
    const d=addDays(todayStr(),-i);
    labels14.push(new Date(d+'T00:00:00').toLocaleDateString('en',{month:'short',day:'numeric'}));
    data14.push(appData.problems.filter(p=>p.date===d).length);
  }
  buildChart('dailyChart','bar',labels14,data14,'Problems');

  // Weekly: last 8 weeks
  const wLabels=[], wData=[];
  for (let i=7;i>=0;i--){
    const weekStart=addDays(todayStr(),-i*7);
    const weekEnd=addDays(weekStart,6);
    wLabels.push(`W${8-i}`);
    wData.push(appData.problems.filter(p=>p.date>=weekStart&&p.date<=weekEnd).length);
  }
  buildChart('weeklyChart','bar',wLabels,wData,'Problems');

  // Monthly: last 6 months
  const mLabels=[], mData=[];
  for (let i=5;i>=0;i--){
    const d=new Date(); d.setMonth(d.getMonth()-i);
    const m=d.toISOString().slice(0,7);
    mLabels.push(d.toLocaleDateString('en',{month:'short',year:'2-digit'}));
    mData.push(appData.problems.filter(p=>p.date.startsWith(m)).length);
  }
  buildChart('monthlyChart','line',mLabels,mData,'Problems');

  // Topic progress
  const tLabels=DSA_TOPICS.slice(0,10), tData=tLabels.map(t=>{
    const tp=appData.topics[t]; return tp?Math.round(tp.solved/tp.total*100):0;
  });
  buildChart('topicChart','bar',tLabels,tData,'Completion %');

  // Difficulty
  const easy=appData.problems.filter(p=>p.difficulty==='Easy').length;
  const med=appData.problems.filter(p=>p.difficulty==='Medium').length;
  const hard=appData.problems.filter(p=>p.difficulty==='Hard').length;
  buildDoughnut('diffChart',['Easy','Medium','Hard'],[easy||0,med||0,hard||0],
    ['rgba(16,185,129,0.8)','rgba(245,158,11,0.8)','rgba(239,68,68,0.8)']);

  // Hours: last 7 days
  const hLabels=[], hData=[];
  for (let i=6;i>=0;i--){
    const d=addDays(todayStr(),-i);
    hLabels.push(new Date(d+'T00:00:00').toLocaleDateString('en',{weekday:'short'}));
    const hrs=appData.daily.filter(e=>e.date===d).reduce((s,e)=>s+(parseFloat(e.hours)||0),0);
    hData.push(hrs);
  }
  buildChart('hoursChart','line',hLabels,hData,'Hours');
}

/* =========== HEATMAP =========== */
function changeHeatmapYear(delta) {
  heatmapYear += delta;
  document.getElementById('heatmapYear').textContent = heatmapYear;
  renderHeatmap();
}

function renderHeatmap() {
  document.getElementById('heatmapYear').textContent = heatmapYear;
  const container = document.getElementById('heatmapContainer');

  // Build date->count map
  const countMap = {};
  appData.problems.forEach(p=>{
    if (p.date && p.date.startsWith(String(heatmapYear))) {
      countMap[p.date] = (countMap[p.date]||0) + 1;
    }
  });
  appData.daily.forEach(e=>{
    if (e.date && e.date.startsWith(String(heatmapYear)) && !countMap[e.date]) {
      countMap[e.date] = countMap[e.date] || e.questions || 0;
    }
  });

  const start = new Date(`${heatmapYear}-01-01`);
  const end = new Date(`${heatmapYear}-12-31`);
  // Pad to start on Sunday
  const startDay = start.getDay();
  const totalCells = Math.ceil((end - start)/(86400000) + 1 + startDay);
  const weeks = Math.ceil(totalCells / 7);

  let html = '<div class="heatmap-grid">';
  let tooltip = '<div class="heatmap-tooltip" id="heatmapTooltip"></div>';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  for (let w=0; w<weeks; w++) {
    html += '<div class="heatmap-col">';
    for (let d=0; d<7; d++) {
      const dayNum = w*7+d - startDay;
      const date = new Date(start);
      date.setDate(date.getDate() + dayNum);
      if (dayNum < 0 || date > end) {
        html += '<div class="heatmap-cell l0" style="visibility:hidden"></div>';
        continue;
      }
      const dateStr = date.toISOString().slice(0,10);
      const count = countMap[dateStr]||0;
      let level = 0;
      if (count>=1) level=1; if (count>=3) level=2; if (count>=6) level=3; if (count>=10) level=4;
      const hoursEntry = appData.daily.find(e=>e.date===dateStr);
      const hrs = hoursEntry ? hoursEntry.hours : 0;
      html += `<div class="heatmap-cell l${level}" 
        data-date="${dateStr}" data-count="${count}" data-hrs="${hrs}"
        onmouseenter="showHeatmapTip(event,this)" onmouseleave="hideHeatmapTip()"></div>`;
    }
    html += '</div>';
  }
  html += '</div>';
  container.innerHTML = html + tooltip;
}

function showHeatmapTip(e, el) {
  const tip = document.getElementById('heatmapTooltip');
  tip.style.display = 'block';
  tip.style.left = (e.clientX+12)+'px';
  tip.style.top = (e.clientY-40)+'px';
  tip.innerHTML = `<strong>${el.dataset.date}</strong><br>🧩 ${el.dataset.count} problems<br>⏱️ ${el.dataset.hrs}h studied`;
}
function hideHeatmapTip() {
  const tip = document.getElementById('heatmapTooltip');
  if (tip) tip.style.display='none';
}

/* =========== ACHIEVEMENTS =========== */
function checkAchievements() {
  let earned = false;
  ACHIEVEMENTS_DEF.forEach(a => {
    if (!appData.achievements[a.id] && a.check(appData)) {
      appData.achievements[a.id] = todayStr();
      earned = true;
      toast(`🏆 Achievement Unlocked: ${a.name}!`, 'success');
    }
  });
  if (earned) saveData();
}

function renderAchievements() {
  const grid = document.getElementById('achievementsGrid');
  grid.innerHTML = ACHIEVEMENTS_DEF.map(a => {
    const earnedDate = appData.achievements[a.id];
    return `
    <div class="badge-card ${earnedDate?'earned':''}">
      <div class="badge-icon">${a.icon}</div>
      <div class="badge-name">${a.name}</div>
      <div class="badge-desc">${a.desc}</div>
      ${earnedDate?`<div class="badge-earned-date">Earned: ${fmtDate(earnedDate)}</div>`:'<div class="badge-earned-date">Not yet earned</div>'}
    </div>`;
  }).join('');
}

/* =========== NOTES =========== */
function newNote() {
  activeNoteId = null;
  document.getElementById('noteTitle').value = '';
  document.getElementById('noteContent').value = '';
  document.getElementById('noteEditId').value = '';
  document.getElementById('noteCat').selectedIndex = 0;
}

function saveNote() {
  const title = document.getElementById('noteTitle').value.trim();
  const content = document.getElementById('noteContent').value.trim();
  if (!title) { toast('Note title required','error'); return; }
  const editId = document.getElementById('noteEditId').value;
  const note = {
    id: editId || genId(),
    title, content, category: document.getElementById('noteCat').value,
    updatedAt: new Date().toISOString()
  };
  if (editId) {
    const idx = appData.notes.findIndex(n=>n.id===editId);
    if (idx>-1) appData.notes[idx]=note;
    toast('Note updated ✓','success');
  } else {
    appData.notes.push(note);
    toast('Note saved ✓','success');
  }
  activeNoteId = note.id;
  document.getElementById('noteEditId').value = note.id;
  saveData(); renderNotesList();
}

function deleteNote() {
  const id = document.getElementById('noteEditId').value;
  if (!id) return;
  confirm('Delete this note?', () => {
    appData.notes = appData.notes.filter(n=>n.id!==id);
    saveData(); newNote(); renderNotesList(); toast('Note deleted','info');
  });
}

function openNote(id) {
  const n = appData.notes.find(x=>x.id===id);
  if (!n) return;
  activeNoteId = id;
  document.getElementById('noteTitle').value = n.title;
  document.getElementById('noteContent').value = n.content;
  document.getElementById('noteCat').value = n.category;
  document.getElementById('noteEditId').value = n.id;
  document.querySelectorAll('.note-item').forEach(el=>el.classList.toggle('active',el.dataset.id===id));
}

function renderNotesList() {
  const search = (document.getElementById('noteSearch')?.value||'').toLowerCase();
  const cat = document.getElementById('noteFilterCat')?.value||'';
  let notes = [...appData.notes].sort((a,b)=>b.updatedAt>a.updatedAt?1:-1);
  if (search) notes = notes.filter(n=>n.title.toLowerCase().includes(search)||n.content.toLowerCase().includes(search));
  if (cat) notes = notes.filter(n=>n.category===cat);
  const el = document.getElementById('notesList');
  if (!notes.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">📝</div><p>No notes</p></div>'; return; }
  el.innerHTML = notes.map(n=>`
    <div class="note-item ${n.id===activeNoteId?'active':''}" data-id="${n.id}" onclick="openNote('${n.id}')">
      <div class="note-item-title">${n.title}</div>
      <div class="note-item-cat">${n.category} · ${new Date(n.updatedAt).toLocaleDateString('en',{month:'short',day:'numeric'})}</div>
    </div>
  `).join('');
}

/* =========== DSA SHEETS =========== */
function switchSheet(key, el) {
  currentSheet = key;
  document.querySelectorAll('.sheet-tab').forEach(t=>t.classList.remove('active'));
  if (el) el.classList.add('active');
  renderSheet(key);
}

function renderSheet(key) {
  const sheet = SHEET_DATA[key];
  const solved = appData.sheets[key]||0;
  const pct = Math.round((solved/sheet.total)*100);
  const remaining = sheet.total - solved;
  const el = document.getElementById('sheetContent');
  el.innerHTML = `
    <div class="sheet-overview">
      <div class="sheet-pct-big">${pct}%</div>
      <div style="flex:1">
        <div style="font-size:20px;font-weight:800;margin-bottom:4px">${sheet.name}</div>
        <div style="color:var(--text-secondary);font-size:14px;margin-bottom:12px">
          ${solved} of ${sheet.total} problems completed · ${remaining} remaining
        </div>
        <div class="sheet-progress-bar">
          <div class="sheet-progress-fill" style="width:${pct}%"></div>
        </div>
      </div>
    </div>
    <div class="glass-card" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
      <label style="font-size:14px;font-weight:600">Update Progress:</label>
      <input type="number" id="sheetSolvedInput" value="${solved}" min="0" max="${sheet.total}"
        style="width:100px;padding:8px 12px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-primary);color:var(--text-primary);font-size:14px"
      />
      <span style="color:var(--text-muted)">/ ${sheet.total}</span>
      <button class="btn-primary" onclick="updateSheet('${key}')">Update</button>
      <button class="btn-danger btn-sm" onclick="resetSheet('${key}')">Reset</button>
    </div>
  `;
}

function updateSheet(key) {
  const val = parseInt(document.getElementById('sheetSolvedInput').value)||0;
  const max = SHEET_DATA[key].total;
  appData.sheets[key] = Math.min(max, Math.max(0, val));
  saveData(); renderSheet(key); toast('Sheet progress updated ✓','success');
}

function resetSheet(key) {
  confirm(`Reset ${SHEET_DATA[key].name} progress?`, ()=>{
    appData.sheets[key]=0; saveData(); renderSheet(key); toast('Sheet reset','info');
  });
}

/* =========== INTERVIEW =========== */
function saveInterview() {
  const company = document.getElementById('intCompany').value.trim();
  if (!company) { toast('Company name required','error'); return; }
  const editId = document.getElementById('intEditId').value;
  const entry = {
    id: editId||genId(),
    company, date: document.getElementById('intDate').value,
    round: document.getElementById('intRound').value,
    result: document.getElementById('intResult').value,
    notes: document.getElementById('intNotes').value.trim()
  };
  if (editId) {
    const idx = appData.interviews.findIndex(i=>i.id===editId);
    if (idx>-1) appData.interviews[idx]=entry;
    toast('Interview updated ✓','success');
  } else {
    appData.interviews.push(entry);
    toast('Interview added ✓','success');
  }
  saveData(); clearIntForm(); renderInterviewTable();
}

function clearIntForm() {
  ['intCompany','intDate','intNotes','intEditId'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('intRound').selectedIndex=0;
  document.getElementById('intResult').selectedIndex=0;
  document.getElementById('intFormTitle').textContent='➕ Add Interview';
}

function editInterview(id) {
  const e = appData.interviews.find(x=>x.id===id);
  if (!e) return;
  document.getElementById('intCompany').value=e.company;
  document.getElementById('intDate').value=e.date||'';
  document.getElementById('intRound').value=e.round;
  document.getElementById('intResult').value=e.result;
  document.getElementById('intNotes').value=e.notes||'';
  document.getElementById('intEditId').value=e.id;
  document.getElementById('intFormTitle').textContent='✏️ Edit Interview';
  window.scrollTo(0,0);
}

function deleteInterview(id) {
  confirm('Delete this interview record?',()=>{
    appData.interviews=appData.interviews.filter(i=>i.id!==id);
    saveData(); renderInterviewTable(); toast('Deleted','info');
  });
}

function renderInterviewTable() {
  const wrap = document.getElementById('interviewTableWrap');
  if (!appData.interviews.length) { wrap.innerHTML='<div class="no-data">No interviews logged yet.</div>'; return; }
  const sorted = [...appData.interviews].sort((a,b)=>b.date>a.date?1:-1);
  wrap.innerHTML=`<table>
    <thead><tr><th>Company</th><th>Date</th><th>Round</th><th>Result</th><th>Notes</th><th>Actions</th></tr></thead>
    <tbody>${sorted.map(e=>`
      <tr>
        <td><strong>${e.company}</strong></td>
        <td class="mono" style="font-size:12px">${fmtDate(e.date)}</td>
        <td>${e.round}</td>
        <td class="int-result-${e.result}">${e.result}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.notes||'—'}</td>
        <td><div class="action-btns">
          <button class="icon-btn" onclick="editInterview('${e.id}')">✏️</button>
          <button class="icon-btn" onclick="deleteInterview('${e.id}')">🗑️</button>
        </div></td>
      </tr>
    `).join('')}</tbody>
  </table>`;
}

/* =========== SETTINGS =========== */
function toggleTheme(isDark) {
  document.body.classList.toggle('dark-mode', isDark);
  document.body.classList.toggle('light-mode', !isDark);
  appData.settings.darkMode = isDark;
  document.getElementById('themeToggle').textContent = isDark ? '🌙' : '☀️';
  saveData();
}

window.toggleTheme = function(el) {
  if (typeof el === 'boolean') {
    toggleTheme(el); return;
  }
};

document.getElementById('themeToggle').addEventListener('click', () => {
  const isDark = !document.body.classList.contains('dark-mode');
  toggleTheme(isDark);
  document.getElementById('settingDark').checked = isDark;
});

function setAccent(color, dark) {
  document.documentElement.style.setProperty('--accent', color);
  document.documentElement.style.setProperty('--accent-dark', dark);
  document.documentElement.style.setProperty('--accent-glow', color.replace(')',',0.15)').replace('rgb','rgba').replace('#','').length > 10 ? color+'26' : `rgba(0,212,255,0.15)`);
  appData.settings.accent = color;
  appData.settings.accentDark = dark;
  saveData();
}

function applySettings() {
  if (appData.settings) {
    const dark = appData.settings.darkMode !== false;
    toggleTheme(dark);
    document.getElementById('settingDark').checked = dark;
    if (appData.settings.accent) {
      document.documentElement.style.setProperty('--accent', appData.settings.accent);
      document.documentElement.style.setProperty('--accent-dark', appData.settings.accentDark||'#0099bb');
    }
  }
}

function renderSettings() {
  const el = document.getElementById('settingsStats');
  const streak = calcStreak(appData.daily);
  const longest = calcLongestStreak(appData.daily);
  const totalHrs = appData.daily.reduce((s,e)=>s+(parseFloat(e.hours)||0),0);
  const rows = [
    ['Total Problems', appData.problems.length],
    ['Daily Entries', appData.daily.length],
    ['Total Study Hours', totalHrs.toFixed(1)+'h'],
    ['Current Streak', streak+' days'],
    ['Longest Streak', longest+' days'],
    ['Goals Set', appData.goals.length],
    ['Notes', appData.notes.length],
    ['Interviews Tracked', appData.interviews.length],
    ['Achievements Earned', Object.keys(appData.achievements).length+'/'+ACHIEVEMENTS_DEF.length]
  ];
  el.innerHTML = rows.map(r=>`<div class="stat-row"><span>${r[0]}</span><span>${r[1]}</span></div>`).join('');
}

/* =========== EXPORT / IMPORT =========== */
function exportJSON() {
  const blob = new Blob([JSON.stringify(appData, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `dsa-tracker-backup-${todayStr()}.json`;
  a.click();
  toast('Backup exported ✓','success');
}

function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      appData = Object.assign({}, appData, data);
      saveData(); applySettings();
      navigateTo(currentSection);
      toast('Data restored ✓','success');
    } catch(err) { toast('Invalid backup file','error'); }
  };
  reader.readAsText(file);
  event.target.value='';
}

function exportCSV() {
  const headers = ['Name','Platform','Difficulty','Topic','Date','Link','Notes','Revision','Favorite'];
  const rows = appData.problems.map(p=>[
    `"${(p.name||'').replace(/"/g,'""')}"`,
    p.platform, p.difficulty, p.topic, p.date,
    `"${(p.link||'').replace(/"/g,'""')}"`,
    `"${(p.notes||'').replace(/"/g,'""')}"`,
    p.revision, p.favorite?'Yes':'No'
  ].join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `dsa-problems-${todayStr()}.csv`;
  a.click();
  toast('CSV exported ✓','success');
}

function resetAllData() {
  confirm('⚠️ This will DELETE ALL data permanently. Are you sure?', ()=>{
    localStorage.removeItem('dsaTracker_v2');
    location.reload();
  });
}

/* =========== GLOBAL SEARCH =========== */
document.getElementById('globalSearch').addEventListener('input', function() {
  const q = this.value.toLowerCase().trim();
  if (!q) return;
  // Quick nav hint
  const sections = ['dashboard','daily','topics','problems','revision','goals','analytics','heatmap','achievements','notes','sheets','interview','settings'];
  const matched = sections.find(s=>s.includes(q));
  if (matched && q.length > 3) navigateTo(matched);
});

/* =========== INIT =========== */
function init() {
  loadData();
  initNav();
  populateTopicSelects();
  applySettings();
  navigateTo('dashboard');
  checkAchievements();

  // Set today's date in daily tracker
  const di = document.getElementById('dailyDate');
  if (di) di.value = todayStr();
  const pd = document.getElementById('probDate');
  if (pd) pd.value = todayStr();
}

document.addEventListener('DOMContentLoaded', init);
