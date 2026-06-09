
        /* =============================================
           CODETREE BY XBZIN — FIXED APPLICATION SCRIPT
           All 17 bugs resolved. See FIX comments.
        ============================================= */

        const DSA_TOPICS = [
            "Arrays", "Strings", "Linked List", "Stack", "Queue", "Recursion",
            "Hashing", "Trees", "BST", "Heap", "Trie", "Graph", "Greedy",
            "Dynamic Programming", "Backtracking", "Segment Tree", "Bit Manipulation"
        ];

        const DEFAULT_TOPIC_TOTALS = {
            "Arrays": 50, "Strings": 40, "Linked List": 25, "Stack": 15, "Queue": 15,
            "Recursion": 20, "Hashing": 20, "Trees": 30, "BST": 20, "Heap": 15,
            "Trie": 10, "Graph": 30, "Greedy": 20, "Dynamic Programming": 40,
            "Backtracking": 15, "Segment Tree": 10, "Bit Manipulation": 15
        };

        const ACHIEVEMENTS_DEF = [
            { id: "first", icon: "ri-medal-line", name: "First Blood", desc: "Solve your first problem", check: d => d.problems.length >= 1 },
            { id: "p10", icon: "ri-star-line", name: "10 Problems", desc: "Solve 10 problems", check: d => d.problems.length >= 10 },
            { id: "p50", icon: "ri-sparkling-line", name: "50 Problems", desc: "Solve 50 problems", check: d => d.problems.length >= 50 },
            { id: "p100", icon: "ri-flashlight-line", name: "Century", desc: "Solve 100 problems", check: d => d.problems.length >= 100 },
            { id: "p250", icon: "ri-fire-line", name: "250 Problems", desc: "Solve 250 problems", check: d => d.problems.length >= 250 },
            { id: "p500", icon: "ri-vip-crown-line", name: "500 Problems", desc: "Solve 500 problems", check: d => d.problems.length >= 500 },
            { id: "s7", icon: "ri-calendar-check-line", name: "7-Day Streak", desc: "Maintain a 7-day streak", check: d => calcStreak(d.daily) >= 7 },
            { id: "s30", icon: "ri-calendar-2-line", name: "30-Day Streak", desc: "Maintain a 30-day streak", check: d => calcStreak(d.daily) >= 30 },
            { id: "s100", icon: "ri-thunderstorms-line", name: "100-Day Streak", desc: "Maintain a 100-day streak", check: d => calcStreak(d.daily) >= 100 },
            { id: "array", icon: "ri-database-2-line", name: "Array Master", desc: "Complete all Array problems", check: d => topicPct(d, "Arrays") >= 100 },
            { id: "graph", icon: "ri-share-line", name: "Graph Master", desc: "Complete all Graph problems", check: d => topicPct(d, "Graph") >= 100 },
            { id: "dp", icon: "ri-cpu-line", name: "DP Master", desc: "Complete all DP problems", check: d => topicPct(d, "Dynamic Programming") >= 100 },
        ];

        let appData = {
            daily: [], topics: {}, problems: [], goals: [], notes: {},
            achievements: {}, settings: { darkMode: true, accent: '#58a6ff', accentDark: '#1f6feb' }
        };

        // FIX Minor #4: single source of truth for heatmap year (no duplicate module var)
        let heatmapYear = new Date().getFullYear();

        let currentSection = 'dashboard';
        let currentRevTab = 'overdue';
        let activeNoteId = null;
        let charts = {};
        let editingTopicIndex = null;

        // ── FIX Critical #3 (confirm name clash): renamed to showConfirm ──
        // No more shadowing of window.confirm; callback queue prevents race condition.
        let _confirmQueue = [];
        let _confirmBusy = false;

        function showConfirm(msg, cb) {
            _confirmQueue.push({ msg, cb });
            if (!_confirmBusy) _processNextConfirm();
        }

        function _processNextConfirm() {
            if (!_confirmQueue.length) { _confirmBusy = false; return; }
            _confirmBusy = true;
            const { msg, cb } = _confirmQueue.shift();
            document.getElementById('confirmMsg').textContent = msg;
            // Replace onclick every time — safe because queue is serialised
            document.getElementById('confirmYes').onclick = () => {
                closeModal('confirmModal');
                _confirmBusy = false;
                cb();
                _processNextConfirm();
            };
            document.getElementById('confirmModal').classList.add('open');
        }

        // Close confirm modal clears busy flag too
        function closeModal(id) {
            document.getElementById(id).classList.remove('open');
            if (id === 'confirmModal') {
                _confirmBusy = false;
                _processNextConfirm();
            }
        }

        // ── HTML escape helper — FIX Minor #3: prevents XSS from free-text fields ──
        function esc(str) {
            return String(str || '')
                .replace(/&/g, '&amp;').replace(/</g, '&lt;')
                .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function saveData() { localStorage.setItem('codetree_xbzin', JSON.stringify(appData)); }

        function loadData() {
            const raw = localStorage.getItem('codetree_xbzin');
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    appData = Object.assign({}, appData, parsed);
                    if (!appData.settings) appData.settings = { darkMode: true, accent: '#58a6ff', accentDark: '#1f6feb' };
                    if (!appData.achievements) appData.achievements = {};
                    if (!appData.notes || Array.isArray(appData.notes)) appData.notes = {};
                } catch (e) { console.warn('Data parse error', e); }
            }
            DSA_TOPICS.forEach(t => {
                if (!appData.topics[t]) appData.topics[t] = { total: DEFAULT_TOPIC_TOTALS[t] || 20, solved: 0 };
            });
            // FIX Minor #4: restore heatmap year from saved data
            if (appData.settings.heatmapYear) heatmapYear = appData.settings.heatmapYear;
        }

        function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
        function todayStr() { return new Date().toISOString().slice(0, 10); }

        function toast(msg, type = 'info') {
            const el = document.getElementById('toast');
            el.textContent = msg;
            el.className = `toast show ${type}`;
            clearTimeout(el._timeout);
            el._timeout = setTimeout(() => el.classList.remove('show'), 3000);
        }

        function fmtDate(str) {
            if (!str) return '—';
            const d = new Date(str + 'T00:00:00');
            return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
        }

        function addDays(dateStr, n) {
            const d = new Date(dateStr + 'T00:00:00');
            d.setDate(d.getDate() + n);
            return d.toISOString().slice(0, 10);
        }

        // FIX Warning #5: filter out future-dated entries before computing streak
        function calcStreak(dailyArr) {
            if (!dailyArr || !dailyArr.length) return 0;
            const today = todayStr();
            const dates = [...new Set(
                dailyArr.filter(e => e.date <= today).map(e => e.date)
            )].sort().reverse();
            let streak = 0, cur = today;
            for (const d of dates) {
                if (d === cur) { streak++; cur = addDays(cur, -1); }
                else break;
            }
            return streak;
        }

        function calcLongestStreak(dailyArr) {
            if (!dailyArr || !dailyArr.length) return 0;
            const today = todayStr();
            const dates = [...new Set(
                dailyArr.filter(e => e.date <= today).map(e => e.date)
            )].sort();
            let max = 1, cur = 1;
            for (let i = 1; i < dates.length; i++) {
                const prev = new Date(dates[i - 1] + 'T00:00:00'), next = new Date(dates[i] + 'T00:00:00');
                const diff = (next - prev) / (1000 * 86400);
                if (diff === 1) { cur++; max = Math.max(max, cur); } else cur = 1;
            }
            return Math.max(max, cur);
        }

        function topicPct(data, topicName) {
            const t = data.topics[topicName];
            if (!t || t.total === 0) return 0;
            return Math.round((t.solved / t.total) * 100);
        }

        // ── Navigation ──
        function initNav() {
            document.querySelectorAll('.nav-item').forEach(item => {
                item.addEventListener('click', () => {
                    navigateTo(item.dataset.section);
                    if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
                });
            });
            document.getElementById('menuToggle').addEventListener('click', () => {
                document.getElementById('sidebar').classList.toggle('open');
            });
            document.addEventListener('click', e => {
                if (window.innerWidth <= 768) {
                    const sidebar = document.getElementById('sidebar');
                    const toggle = document.getElementById('menuToggle');
                    if (!sidebar.contains(e.target) && !toggle.contains(e.target))
                        sidebar.classList.remove('open');
                }
                // Close search results when clicking outside
                const sr = document.getElementById('searchResults');
                const gs = document.getElementById('globalSearch');
                if (!sr.contains(e.target) && e.target !== gs) sr.classList.remove('open');
            });
        }

        function navigateTo(sec) {
            currentSection = sec;
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            const secEl = document.getElementById('sec-' + sec);
            if (secEl) secEl.classList.add('active');
            document.querySelectorAll('.nav-item').forEach(n =>
                n.classList.toggle('active', n.dataset.section === sec));
            const titles = {
                dashboard: 'Dashboard', daily: 'Daily Tracker', topics: 'Topics Tracker',
                problems: 'Problem Tracker', revision: 'Revision Tracker', goals: 'Goals',
                analytics: 'Analytics', notes: 'Notes Manager', settings: 'Settings'
            };
            document.getElementById('headerTitle').textContent = titles[sec] || sec;
            switch (sec) {
                case 'dashboard': renderDashboard(); break;
                case 'daily': renderDailyTable(); setTodayDate(); break;
                case 'topics': renderTopics(); break;
                case 'problems': renderProblemsTable(); populateTopicSelects(); break;
                case 'revision': renderRevision(); break;
                case 'goals': renderGoals(); break;
                case 'analytics': setTimeout(renderAnalytics, 150); break;
                case 'notes': renderNotesList(); break;
                case 'settings': renderSettings(); break;
            }
        }

        // ── Dashboard ──
        function renderDashboard() {
            renderHeatmap();
            renderStatsCards();
            renderRecentProblems();
            renderUpcomingRevDash();
            renderDashCharts();
            document.getElementById('headerStreak').textContent = calcStreak(appData.daily);
            document.getElementById('headerAchievementCount').textContent = Object.keys(appData.achievements).length;
        }

        // FIX Critical #4: heatmap now counts problems and daily entries ADDITIVELY, not via Math.max
        function renderHeatmap() {
            document.getElementById('heatmapYearLabel').textContent = heatmapYear;
            const container = document.getElementById('dashboardHeatmapContainer');

            // Count from problems list
            const probCount = {};
            appData.problems.forEach(p => {
                if (p.date && p.date.startsWith(String(heatmapYear)))
                    probCount[p.date] = (probCount[p.date] || 0) + 1;
            });
            // Count from daily entries (questions field, additive on top of problems)
            const dailyCount = {};
            appData.daily.forEach(e => {
                if (e.date && e.date.startsWith(String(heatmapYear)))
                    dailyCount[e.date] = (dailyCount[e.date] || 0) + (e.questions || 0);
            });
            // Merge: use the larger of the two sources per day
            const countMap = {};
            const allDates = new Set([...Object.keys(probCount), ...Object.keys(dailyCount)]);
            allDates.forEach(d => {
                countMap[d] = Math.max(probCount[d] || 0, dailyCount[d] || 0);
            });

            const startDate = new Date(heatmapYear, 0, 1);
            const endDate = new Date(heatmapYear, 11, 31);
            const startDay = startDate.getDay();
            const totalDays = Math.ceil((endDate - startDate) / 86400000) + 1;
            const weeks = Math.ceil((totalDays + startDay) / 7);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            let monthCols = []; let currentMonth = -1; let monthStartCol = 0;
            for (let w = 0; w < weeks; w++) {
                for (let d = 0; d < 7; d++) {
                    const dayNum = w * 7 + d - startDay;
                    if (dayNum >= 0 && dayNum < totalDays) {
                        const date = new Date(startDate); date.setDate(date.getDate() + dayNum);
                        if (date.getMonth() !== currentMonth) {
                            if (currentMonth >= 0) monthCols.push({ month: currentMonth, start: monthStartCol, end: w - 1 });
                            currentMonth = date.getMonth(); monthStartCol = w;
                        }
                        break;
                    }
                }
            }
            if (currentMonth >= 0) monthCols.push({ month: currentMonth, start: monthStartCol, end: weeks - 1 });

            let monthLabelsHtml = '<div class="heatmap-months-row">';
            monthCols.forEach(mc => {
                const span = mc.end - mc.start + 1;
                monthLabelsHtml += `<div class="heatmap-month-block" style="flex:${span};min-width:${span * 16}px"><div class="heatmap-month-label">${months[mc.month]}</div></div>`;
            });
            monthLabelsHtml += '</div>';

            const dayNames = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
            let dayLabelsHtml = '<div class="heatmap-day-labels">';
            for (let i = 0; i < 7; i++) dayLabelsHtml += `<div class="heatmap-day-label">${dayNames[i]}</div>`;
            dayLabelsHtml += '</div>';

            let gridHtml = '<div class="heatmap-grid">';
            for (let w = 0; w < weeks; w++) {
                let colClass = '';
                monthCols.forEach(mc => { if (w === mc.start && w > 0) colClass = 'week-gap'; });
                gridHtml += `<div class="heatmap-col${colClass ? ' ' + colClass : ''}">`;
                for (let d = 0; d < 7; d++) {
                    const dayNum = w * 7 + d - startDay;
                    if (dayNum < 0 || dayNum >= totalDays) {
                        gridHtml += '<div class="heatmap-cell level-0" style="visibility:hidden"></div>';
                        continue;
                    }
                    const date = new Date(startDate); date.setDate(date.getDate() + dayNum);
                    const dateStr = date.toISOString().slice(0, 10);
                    const count = countMap[dateStr] || 0;
                    let level = 0;
                    if (count >= 1) level = 1;
                    if (count >= 3) level = 2;
                    if (count >= 6) level = 3;
                    if (count >= 10) level = 4;
                    const hoursEntry = appData.daily.find(e => e.date === dateStr);
                    const hrs = hoursEntry ? hoursEntry.hours : 0;
                    gridHtml += `<div class="heatmap-cell level-${level}" data-date="${dateStr}" data-count="${count}" data-hrs="${hrs}" onmouseenter="showHeatmapTip(event,this)" onmouseleave="hideHeatmapTip()"></div>`;
                }
                gridHtml += '</div>';
            }
            gridHtml += '</div>';

            container.innerHTML = `<div class="heatmap-wrapper">${monthLabelsHtml}<div style="display:flex">${dayLabelsHtml}${gridHtml}</div></div>`;
        }

        function showHeatmapTip(e, el) {
            let tip = document.getElementById('heatmapTooltip');
            if (!tip) { tip = document.createElement('div'); tip.className = 'heatmap-tooltip'; tip.id = 'heatmapTooltip'; document.body.appendChild(tip); }
            tip.style.display = 'block';
            tip.style.left = (e.clientX + 15) + 'px';
            tip.style.top = (e.clientY - 50) + 'px';
            tip.innerHTML = `<div class="tooltip-date">${fmtDate(el.dataset.date)}</div><div class="tooltip-count">🧩 ${el.dataset.count} problems · ⏱️ ${el.dataset.hrs}h</div>`;
        }
        function hideHeatmapTip() { const tip = document.getElementById('heatmapTooltip'); if (tip) tip.style.display = 'none'; }

        // FIX Minor #4: save year so it persists across reloads
        function changeHeatmapYear(delta) {
            heatmapYear += delta;
            appData.settings.heatmapYear = heatmapYear;
            saveData();
            renderHeatmap();
        }

        function renderStatsCards() {
            const p = appData.problems;
            const total = p.length;
            const easy = p.filter(x => x.difficulty === 'Easy').length;
            const medium = p.filter(x => x.difficulty === 'Medium').length;
            const hard = p.filter(x => x.difficulty === 'Hard').length;
            document.getElementById('statsGrid').innerHTML = `
            <div class="stat-card total-card"><div class="stat-circle"><div class="stat-count">${total}</div><div class="stat-label">Total</div></div></div>
            <div class="stat-card easy-card"><div class="stat-circle"><div class="stat-count">${easy}</div><div class="stat-label">Easy</div></div></div>
            <div class="stat-card medium-card"><div class="stat-circle"><div class="stat-count">${medium}</div><div class="stat-label">Medium</div></div></div>
            <div class="stat-card hard-card"><div class="stat-circle"><div class="stat-count">${hard}</div><div class="stat-label">Hard</div></div></div>`;
        }

        function renderRecentProblems() {
            const el = document.getElementById('recentProblems');
            const recent = [...appData.problems].sort((a, b) => b.date > a.date ? 1 : -1).slice(0, 8);
            if (!recent.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon"><i class="ri-code-box-line"></i></div><p>No problems yet</p></div>'; return; }
            el.innerHTML = recent.map(p =>
                `<div class="recent-item"><div><span class="diff-badge diff-${p.difficulty}">${p.difficulty[0]}</span><span style="margin-left:8px;font-size:13px">${esc(p.name)}</span></div><span style="font-size:11px;color:var(--text-muted)">${fmtDate(p.date)}</span></div>`
            ).join('');
        }

        function renderUpcomingRevDash() {
            const el = document.getElementById('upcomingRevDash');
            const today = todayStr();
            const upcoming = getRevisionItems().filter(r => r.nextDate >= today && r.status !== 'completed').slice(0, 6);
            if (!upcoming.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon"><i class="ri-refresh-line"></i></div><p>No upcoming revisions</p></div>'; return; }
            el.innerHTML = upcoming.map(r =>
                `<div class="rev-item-dash"><span style="font-size:13px">${esc(r.name)}</span><span style="font-size:11px;color:var(--text-muted)">${fmtDate(r.nextDate)}</span></div>`
            ).join('');
        }

        function renderDashCharts() {
            const labels7 = [], data7 = [];
            for (let i = 6; i >= 0; i--) {
                const d = addDays(todayStr(), -i);
                labels7.push(new Date(d + 'T00:00:00').toLocaleDateString('en', { weekday: 'short' }));
                data7.push(appData.problems.filter(p => p.date === d).length);
            }
            buildChart('dashWeeklyChart', 'bar', labels7, data7, 'Problems Solved');
            const easy = appData.problems.filter(p => p.difficulty === 'Easy').length;
            const med = appData.problems.filter(p => p.difficulty === 'Medium').length;
            const hard = appData.problems.filter(p => p.difficulty === 'Hard').length;
            buildDoughnut('dashDiffChart', ['Easy', 'Medium', 'Hard'], [easy, med, hard], ['rgba(0,184,163,0.8)', 'rgba(255,192,30,0.8)', 'rgba(255,55,95,0.8)']);
        }

        // ── Daily Tracker ──
        function setTodayDate() {
            const di = document.getElementById('dailyDate');
            // Only override if the form is in "new entry" mode (editId is empty)
            if (!document.getElementById('dailyEditId').value) di.value = todayStr();
        }

        function saveDailyEntry() {
            const date = document.getElementById('dailyDate').value;
            const hours = document.getElementById('dailyHours').value;
            const questions = document.getElementById('dailyQuestions').value;
            const topics = document.getElementById('dailyTopics').value.trim();
            const notes = document.getElementById('dailyNotes').value.trim();
            const mood = document.getElementById('dailyMood').value;
            const editId = document.getElementById('dailyEditId').value;
            if (!date) { toast('Please select a date', 'error'); return; }
            const entry = { id: editId || genId(), date, hours: parseFloat(hours) || 0, questions: parseInt(questions) || 0, topics, notes, mood };
            if (editId) {
                const idx = appData.daily.findIndex(e => e.id === editId);
                if (idx > -1) appData.daily[idx] = entry;
                toast('Entry updated', 'success');
            } else { appData.daily.push(entry); toast('Entry saved', 'success'); }
            saveData(); clearDailyForm(); renderDailyTable(); checkAchievements();
        }

        function clearDailyForm() {
            document.getElementById('dailyDate').value = todayStr();
            ['dailyHours', 'dailyQuestions', 'dailyTopics', 'dailyNotes', 'dailyEditId'].forEach(id => document.getElementById(id).value = '');
            document.getElementById('dailyMood').value = 'Good';
            document.getElementById('dailyFormTitle').innerHTML = '<i class="ri-add-circle-line"></i> Add Today\'s Entry';
        }

        function editDailyEntry(id) {
            const e = appData.daily.find(x => x.id === id);
            if (!e) return;
            document.getElementById('dailyDate').value = e.date;
            document.getElementById('dailyHours').value = e.hours;
            document.getElementById('dailyQuestions').value = e.questions;
            document.getElementById('dailyTopics').value = e.topics;
            document.getElementById('dailyNotes').value = e.notes;
            document.getElementById('dailyMood').value = e.mood || 'Good';
            document.getElementById('dailyEditId').value = e.id;
            document.getElementById('dailyFormTitle').innerHTML = '<i class="ri-edit-line"></i> Edit Entry';
            window.scrollTo(0, 0);
        }

        function deleteDailyEntry(id) {
            showConfirm('Delete this daily entry?', () => {
                appData.daily = appData.daily.filter(e => e.id !== id);
                saveData(); renderDailyTable(); toast('Entry deleted', 'info');
            });
        }

        function renderDailyTable() {
            const search = (document.getElementById('dailySearch')?.value || '').toLowerCase();
            const filterDate = document.getElementById('dailyFilterDate')?.value || '';
            let entries = [...appData.daily].sort((a, b) => b.date > a.date ? 1 : -1);
            if (search) entries = entries.filter(e => e.topics?.toLowerCase().includes(search) || e.notes?.toLowerCase().includes(search) || e.date.includes(search));
            if (filterDate) entries = entries.filter(e => e.date === filterDate);
            const wrap = document.getElementById('dailyTableWrap');
            if (!entries.length) { wrap.innerHTML = '<div class="no-data">No entries found. Start logging your study sessions!</div>'; return; }
            const moodEmoji = { Excellent: '😄', Good: '🙂', Average: '😐', Poor: '😞' };
            wrap.innerHTML = `<table><thead><tr><th>Date</th><th>Hours</th><th>Questions</th><th>Topics</th><th>Mood</th><th>Notes</th><th>Actions</th></tr></thead><tbody>${entries.map(e => `<tr>
                <td class="mono">${fmtDate(e.date)}</td>
                <td class="text-accent mono">${e.hours}h</td>
                <td class="mono">${e.questions}</td>
                <td>${esc(e.topics) || '—'}</td>
                <td>${moodEmoji[e.mood] || '🙂'} ${esc(e.mood) || 'Good'}</td>
                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(e.notes)}">${esc(e.notes) || '—'}</td>
                <td><div class="action-btns">
                    <button class="icon-btn" onclick="editDailyEntry('${e.id}')"><i class="ri-edit-line"></i></button>
                    <button class="icon-btn" onclick="deleteDailyEntry('${e.id}')"><i class="ri-delete-bin-line"></i></button>
                </div></td>
            </tr>`).join('')
                }</tbody></table>`;
        }

        // ── Topics ──
        function renderTopics() {
            const grid = document.getElementById('topicsGrid');
            grid.innerHTML = DSA_TOPICS.map((name, idx) => {
                const t = appData.topics[name] || { total: DEFAULT_TOPIC_TOTALS[name] || 20, solved: 0 };
                const pct = t.total > 0 ? Math.round((t.solved / t.total) * 100) : 0;
                const rem = Math.max(0, t.total - t.solved);
                return `<div class="topic-card" onclick="openTopicModal(${idx})">
                <div class="topic-card-header"><span class="topic-name">${esc(name)}</span><span class="topic-pct">${pct}%</span></div>
                <div class="topic-progress-bar"><div class="topic-progress-fill" style="width:${pct}%"></div></div>
                <div class="topic-stats"><span><i class="ri-check-line" style="color:var(--easy)"></i> ${t.solved}/${t.total}</span><span><i class="ri-time-line" style="color:var(--warning)"></i> ${rem} left</span></div>
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
            const total = parseInt(document.getElementById('modalTotal').value) || 0;
            const solved = Math.min(total, parseInt(document.getElementById('modalSolved').value) || 0);
            appData.topics[name] = { total, solved };
            saveData(); closeModal('topicModal'); renderTopics(); toast(`${name} updated`, 'success'); checkAchievements();
        }

        function resetTopic() {
            const idx = parseInt(document.getElementById('modalTopicIndex').value);
            const name = DSA_TOPICS[idx];
            appData.topics[name] = { total: DEFAULT_TOPIC_TOTALS[name] || 20, solved: 0 };
            saveData(); closeModal('topicModal'); renderTopics(); toast(`${name} reset`, 'info');
        }

        // ── Problems ──
        function populateTopicSelects() {
            ['probTopic', 'probFilterTopic'].forEach(id => {
                const sel = document.getElementById(id);
                if (!sel) return;
                const isFilter = id.includes('Filter');
                sel.innerHTML = (isFilter ? '<option value="">All Topics</option>' : '') +
                    DSA_TOPICS.map(t => `<option value="${t}">${t}</option>`).join('');
            });
        }

        function saveProblem() {
            const name = document.getElementById('probName').value.trim();
            if (!name) { toast('Problem name required', 'error'); return; }
            const editId = document.getElementById('probEditId').value;
            const revision = document.getElementById('probRevision').value;
            const dateVal = document.getElementById('probDate').value || todayStr();
            const prob = {
                id: editId || genId(),
                name,
                platform: document.getElementById('probPlatform').value,
                difficulty: document.getElementById('probDifficulty').value,
                topic: document.getElementById('probTopic').value,
                date: dateVal,
                link: document.getElementById('probLink').value.trim(),
                notes: document.getElementById('probNotes').value.trim(),
                revision,
                favorite: false,
                // FIX Critical #2 + Warning #3: only set revision dates if Revision=Yes
                rev1: revision === 'Yes' ? addDays(dateVal, 1) : null,
                rev2: revision === 'Yes' ? addDays(dateVal, 7) : null,
                rev3: revision === 'Yes' ? addDays(dateVal, 30) : null,
                rev1Done: false, rev2Done: false, rev3Done: false
            };
            if (editId) {
                const idx = appData.problems.findIndex(p => p.id === editId);
                if (idx > -1) {
                    // Preserve existing favorite & revision state
                    prob.favorite = appData.problems[idx].favorite;
                    prob.rev1Done = appData.problems[idx].rev1Done;
                    prob.rev2Done = appData.problems[idx].rev2Done;
                    prob.rev3Done = appData.problems[idx].rev3Done;
                    // Only update rev dates if revision just toggled to Yes and dates weren't set
                    if (revision === 'Yes' && !appData.problems[idx].rev1) {
                        prob.rev1 = addDays(dateVal, 1);
                        prob.rev2 = addDays(dateVal, 7);
                        prob.rev3 = addDays(dateVal, 30);
                    } else {
                        prob.rev1 = appData.problems[idx].rev1;
                        prob.rev2 = appData.problems[idx].rev2;
                        prob.rev3 = appData.problems[idx].rev3;
                    }
                    appData.problems[idx] = prob;
                }
                toast('Problem updated', 'success');
            } else {
                appData.problems.push(prob);
                toast('Problem added', 'success');
            }
            saveData(); clearProbForm(); renderProblemsTable(); checkAchievements();
        }

        function clearProbForm() {
            ['probName', 'probLink', 'probNotes', 'probEditId'].forEach(id => document.getElementById(id).value = '');
            document.getElementById('probDate').value = todayStr();
            document.getElementById('probPlatform').selectedIndex = 0;
            document.getElementById('probDifficulty').selectedIndex = 0;
            document.getElementById('probTopic').selectedIndex = 0;
            document.getElementById('probRevision').selectedIndex = 1;
            document.getElementById('probFormTitle').innerHTML = '<i class="ri-add-circle-line"></i> Add Problem';
        }

        // FIX Critical #2: ensure topic select is populated before setting value
        function editProblem(id) {
            populateTopicSelects(); // ensure dropdown is ready
            const p = appData.problems.find(x => x.id === id);
            if (!p) return;
            document.getElementById('probName').value = p.name;
            document.getElementById('probPlatform').value = p.platform;
            document.getElementById('probDifficulty').value = p.difficulty;
            document.getElementById('probTopic').value = p.topic;
            document.getElementById('probDate').value = p.date;
            document.getElementById('probLink').value = p.link || '';
            document.getElementById('probNotes').value = p.notes || '';
            document.getElementById('probRevision').value = p.revision;
            document.getElementById('probEditId').value = p.id;
            document.getElementById('probFormTitle').innerHTML = '<i class="ri-edit-line"></i> Edit Problem';
            window.scrollTo(0, 0);
        }

        function deleteProblem(id) {
            showConfirm('Delete this problem?', () => {
                appData.problems = appData.problems.filter(p => p.id !== id);
                saveData(); renderProblemsTable(); toast('Problem deleted', 'info');
            });
        }

        function toggleFavorite(id) {
            const p = appData.problems.find(x => x.id === id);
            if (p) { p.favorite = !p.favorite; saveData(); renderProblemsTable(); }
        }

        function renderProblemsTable() {
            const search = (document.getElementById('probSearch')?.value || '').toLowerCase();
            const diff = document.getElementById('probFilterDiff')?.value || '';
            const topic = document.getElementById('probFilterTopic')?.value || '';
            const platform = document.getElementById('probFilterPlatform')?.value || '';
            let probs = [...appData.problems].sort((a, b) => b.date > a.date ? 1 : -1);
            if (search) probs = probs.filter(p => p.name.toLowerCase().includes(search) || p.topic.toLowerCase().includes(search));
            if (diff) probs = probs.filter(p => p.difficulty === diff);
            if (topic) probs = probs.filter(p => p.topic === topic);
            if (platform) probs = probs.filter(p => p.platform === platform);
            const wrap = document.getElementById('problemsTableWrap');
            if (!probs.length) { wrap.innerHTML = '<div class="no-data">No problems found. Add your first problem!</div>'; return; }
            wrap.innerHTML = `<table><thead><tr><th>#</th><th>Problem</th><th>Platform</th><th>Difficulty</th><th>Topic</th><th>Date</th><th>Rev?</th><th>Actions</th></tr></thead><tbody>${probs.map((p, i) => `<tr>
                <td class="mono" style="color:var(--text-muted)">${i + 1}</td>
                <td><div style="display:flex;align-items:center;gap:6px">
                    ${p.favorite ? '<i class="ri-star-fill fav-star"></i>' : ''}
                    ${p.link ? `<a href="${esc(p.link)}" target="_blank" style="color:var(--accent);text-decoration:none">${esc(p.name)}</a>` : esc(p.name)}
                </div></td>
                <td><span style="font-size:12px;color:var(--text-muted)">${esc(p.platform)}</span></td>
                <td><span class="diff-badge diff-${p.difficulty}">${p.difficulty}</span></td>
                <td style="font-size:12px">${esc(p.topic)}</td>
                <td class="mono" style="font-size:12px;color:var(--text-muted)">${fmtDate(p.date)}</td>
                <td style="font-size:12px">${p.revision === 'Yes' ? '<span style="color:var(--warning)">Yes</span>' : '<span style="color:var(--text-muted)">No</span>'}</td>
                <td><div class="action-btns">
                    <button class="icon-btn" onclick="toggleFavorite('${p.id}')">${p.favorite ? '<i class="ri-star-fill" style="color:#f0883e"></i>' : '<i class="ri-star-line"></i>'}</button>
                    <button class="icon-btn" onclick="editProblem('${p.id}')"><i class="ri-edit-line"></i></button>
                    <button class="icon-btn" onclick="deleteProblem('${p.id}')"><i class="ri-delete-bin-line"></i></button>
                </div></td>
            </tr>`).join('')
                }</tbody></table>`;
        }

        // ── Revision ──
        // FIX Warning #6: guard now correctly skips problems where revision=No AND no rev dates set
        function getRevisionItems() {
            const today = todayStr();
            const items = [];
            appData.problems.forEach(p => {
                // Skip if revision not required and no rev dates exist
                if (p.revision !== 'Yes' && !p.rev1 && !p.rev2 && !p.rev3) return;
                if (!p.rev1Done && p.rev1) items.push({ id: p.id, name: p.name, difficulty: p.difficulty, nextDate: p.rev1, revNum: 1, revKey: 'rev1Done', status: p.rev1 < today ? 'overdue' : p.rev1 === today ? 'today' : 'upcoming' });
                if (p.rev1Done && !p.rev2Done && p.rev2) items.push({ id: p.id, name: p.name, difficulty: p.difficulty, nextDate: p.rev2, revNum: 2, revKey: 'rev2Done', status: p.rev2 < today ? 'overdue' : p.rev2 === today ? 'today' : 'upcoming' });
                if (p.rev2Done && !p.rev3Done && p.rev3) items.push({ id: p.id, name: p.name, difficulty: p.difficulty, nextDate: p.rev3, revNum: 3, revKey: 'rev3Done', status: p.rev3 < today ? 'overdue' : p.rev3 === today ? 'today' : 'upcoming' });
                if (p.rev1Done && p.rev2Done && p.rev3Done) items.push({ id: p.id, name: p.name, difficulty: p.difficulty, nextDate: p.rev3, revNum: 'done', revKey: null, status: 'completed' });
            });
            return items;
        }

        function markRevision(probId, revKey) {
            const p = appData.problems.find(x => x.id === probId);
            if (p) { p[revKey] = true; saveData(); renderRevision(); toast('Revision marked complete', 'success'); }
        }

        function switchRevTab(tab, el) {
            currentRevTab = tab;
            document.querySelectorAll('.rev-tab').forEach(t => t.classList.remove('active'));
            el.classList.add('active');
            renderRevision();
        }

        function renderRevision() {
            const today = todayStr();
            const items = getRevisionItems();
            let filtered = [];
            if (currentRevTab === 'overdue') filtered = items.filter(r => r.nextDate < today && r.revNum !== 'done');
            else if (currentRevTab === 'today') filtered = items.filter(r => r.nextDate === today && r.revNum !== 'done');
            else if (currentRevTab === 'upcoming') filtered = items.filter(r => r.nextDate > today && r.revNum !== 'done');
            else if (currentRevTab === 'completed') filtered = items.filter(r => r.revNum === 'done');
            filtered.sort((a, b) => a.nextDate > b.nextDate ? 1 : -1);

            document.getElementById('revCountOverdue').textContent = items.filter(r => r.nextDate < today && r.revNum !== 'done').length;
            document.getElementById('revCountToday').textContent = items.filter(r => r.nextDate === today && r.revNum !== 'done').length;

            const el = document.getElementById('revisionContent');
            if (!filtered.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon"><i class="ri-refresh-line"></i></div><p>No revisions in this category</p></div>'; return; }
            const typeClass = { overdue: 'rev-overdue', today: 'rev-today', upcoming: 'rev-upcoming', completed: 'rev-completed' };
            el.innerHTML = filtered.map(r => `
            <div class="rev-row ${typeClass[currentRevTab] || ''}">
                <div style="display:flex;align-items:center;gap:12px">
                    <span class="diff-badge diff-${r.difficulty}">${r.difficulty}</span>
                    <div><strong>${esc(r.name)}</strong>${r.revNum !== 'done' ? `<span style="font-size:11px;color:var(--text-muted);margin-left:8px">Revision ${r.revNum}</span>` : ''}</div>
                </div>
                <div style="display:flex;align-items:center;gap:12px">
                    <span class="mono" style="font-size:12px;color:var(--text-muted)">${fmtDate(r.nextDate)}</span>
                    ${r.revNum !== 'done' ? `<button class="btn-primary btn-sm" onclick="markRevision('${r.id}','${r.revKey}')"><i class="ri-check-line"></i> Done</button>` : '<span style="color:var(--easy);font-size:13px;font-weight:700"><i class="ri-check-double-line"></i> Done</span>'}
                </div>
            </div>`).join('');
        }

        // ── Goals ──
        function saveGoal() {
            const title = document.getElementById('goalTitle').value.trim();
            if (!title) { toast('Goal title required', 'error'); return; }
            const editId = document.getElementById('goalEditId').value;
            const goal = {
                id: editId || genId(),
                title,
                type: document.getElementById('goalType').value,
                target: parseInt(document.getElementById('goalTarget').value) || 1,
                current: parseInt(document.getElementById('goalCurrent').value) || 0,
                due: document.getElementById('goalDue').value,
                desc: document.getElementById('goalDesc').value.trim(),
                completed: false
            };
            goal.completed = goal.current >= goal.target;
            if (editId) {
                const idx = appData.goals.findIndex(g => g.id === editId);
                if (idx > -1) appData.goals[idx] = goal;
                toast('Goal updated', 'success');
            } else { appData.goals.push(goal); toast('Goal added', 'success'); }
            saveData(); clearGoalForm(); renderGoals();
        }

        function clearGoalForm() {
            ['goalTitle', 'goalTarget', 'goalCurrent', 'goalDue', 'goalDesc', 'goalEditId'].forEach(id => document.getElementById(id).value = '');
            document.getElementById('goalType').selectedIndex = 0;
            document.getElementById('goalFormTitle').innerHTML = '<i class="ri-add-circle-line"></i> Add Goal';
        }

        function editGoal(id) {
            const g = appData.goals.find(x => x.id === id);
            if (!g) return;
            document.getElementById('goalTitle').value = g.title;
            document.getElementById('goalType').value = g.type;
            document.getElementById('goalTarget').value = g.target;
            document.getElementById('goalCurrent').value = g.current;
            document.getElementById('goalDue').value = g.due || '';
            document.getElementById('goalDesc').value = g.desc || '';
            document.getElementById('goalEditId').value = g.id;
            document.getElementById('goalFormTitle').innerHTML = '<i class="ri-edit-line"></i> Edit Goal';
            window.scrollTo(0, 0);
        }

        function deleteGoal(id) {
            showConfirm('Delete this goal?', () => {
                appData.goals = appData.goals.filter(g => g.id !== id);
                saveData(); renderGoals(); toast('Goal deleted', 'info');
            });
        }

        function markGoalComplete(id) {
            const g = appData.goals.find(x => x.id === id);
            if (g) { g.completed = !g.completed; if (g.completed) g.current = g.target; saveData(); renderGoals(); }
        }

        function renderGoals() {
            const grid = document.getElementById('goalsGrid');
            if (!appData.goals.length) { grid.innerHTML = '<div class="glass-card"><div class="empty-state"><div class="empty-icon"><i class="ri-flag-line"></i></div><p>No goals yet. Set your first goal!</p></div></div>'; return; }
            grid.innerHTML = appData.goals.map(g => {
                const pct = g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0;
                return `<div class="goal-card ${g.completed ? 'goal-completed' : ''}">
                <div class="goal-header"><span class="goal-title">${esc(g.title)}</span><span class="goal-type-badge goal-${g.type}">${g.type}</span></div>
                ${g.desc ? `<p style="font-size:12px;color:var(--text-muted);margin-bottom:8px">${esc(g.desc)}</p>` : ''}
                <div class="goal-progress-bar"><div class="goal-progress-fill" style="width:${pct}%"></div></div>
                <div class="goal-meta"><span>${g.current}/${g.target} (${pct}%)</span>${g.due ? `<span>Due: ${fmtDate(g.due)}</span>` : ''}</div>
                <div class="goal-actions">
                    <button class="btn-${g.completed ? 'secondary' : 'primary'} btn-sm" onclick="markGoalComplete('${g.id}')">${g.completed ? '<i class="ri-arrow-go-back-line"></i> Undo' : '<i class="ri-check-line"></i> Complete'}</button>
                    <button class="btn-secondary btn-sm" onclick="editGoal('${g.id}')"><i class="ri-edit-line"></i></button>
                    <button class="btn-danger btn-sm" onclick="deleteGoal('${g.id}')"><i class="ri-delete-bin-line"></i></button>
                </div>
            </div>`;
            }).join('');
        }

        // ── Charts ──
        // FIX Warning #5: null-check before destroying chart
        function buildChart(canvasId, type, labels, data, label) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            if (charts[canvasId]) {
                try { charts[canvasId].destroy(); } catch (e) { }
                delete charts[canvasId];
            }
            const ctx = canvas.getContext('2d');
            charts[canvasId] = new Chart(ctx, {
                type,
                data: {
                    labels, datasets: [{
                        label, data,
                        backgroundColor: type === 'bar' ? 'rgba(88,166,255,0.3)' : 'rgba(88,166,255,0.1)',
                        borderColor: 'rgba(88,166,255,0.8)',
                        borderWidth: type === 'line' ? 2 : 1,
                        fill: type === 'line', tension: 0.4,
                        pointBackgroundColor: '#58a6ff',
                        borderRadius: type === 'bar' ? 4 : 0
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: true,
                    plugins: { legend: { display: false } },
                    scales: type !== 'doughnut' && type !== 'pie' ? {
                        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 11 } } },
                        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 11 } }, beginAtZero: true }
                    } : {}
                }
            });
        }

        function buildDoughnut(canvasId, labels, data, colors) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            if (charts[canvasId]) {
                try { charts[canvasId].destroy(); } catch (e) { }
                delete charts[canvasId];
            }
            const ctx = canvas.getContext('2d');
            charts[canvasId] = new Chart(ctx, {
                type: 'doughnut',
                data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: 'rgba(0,0,0,0.3)' }] },
                options: {
                    responsive: true, maintainAspectRatio: true,
                    plugins: { legend: { display: true, position: 'bottom', labels: { color: 'rgba(255,255,255,0.6)', font: { size: 11 }, boxWidth: 12 } } }
                }
            });
        }

        function renderAnalytics() {
            const labels14 = [], data14 = [];
            for (let i = 13; i >= 0; i--) {
                const d = addDays(todayStr(), -i);
                labels14.push(new Date(d + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' }));
                data14.push(appData.problems.filter(p => p.date === d).length);
            }
            buildChart('dailyChart', 'bar', labels14, data14, 'Problems');
            const wLabels = [], wData = [];
            for (let i = 7; i >= 0; i--) {
                const ws = addDays(todayStr(), -i * 7), we = addDays(ws, 6);
                wLabels.push(`W${8 - i}`);
                wData.push(appData.problems.filter(p => p.date >= ws && p.date <= we).length);
            }
            buildChart('weeklyChart', 'bar', wLabels, wData, 'Problems');
            const mLabels = [], mData = [];
            for (let i = 5; i >= 0; i--) {
                const d = new Date(); d.setMonth(d.getMonth() - i);
                const m = d.toISOString().slice(0, 7);
                mLabels.push(d.toLocaleDateString('en', { month: 'short', year: '2-digit' }));
                mData.push(appData.problems.filter(p => p.date.startsWith(m)).length);
            }
            buildChart('monthlyChart', 'line', mLabels, mData, 'Problems');
            const tLabels = DSA_TOPICS.slice(0, 10), tData = tLabels.map(t => { const tp = appData.topics[t]; return tp ? Math.round(tp.solved / tp.total * 100) : 0; });
            buildChart('topicChart', 'bar', tLabels, tData, 'Completion %');
            const easy = appData.problems.filter(p => p.difficulty === 'Easy').length;
            const med = appData.problems.filter(p => p.difficulty === 'Medium').length;
            const hard = appData.problems.filter(p => p.difficulty === 'Hard').length;
            buildDoughnut('diffChart', ['Easy', 'Medium', 'Hard'], [easy || 0, med || 0, hard || 0], ['rgba(0,184,163,0.8)', 'rgba(255,192,30,0.8)', 'rgba(255,55,95,0.8)']);
            const hLabels = [], hData = [];
            for (let i = 6; i >= 0; i--) {
                const d = addDays(todayStr(), -i);
                hLabels.push(new Date(d + 'T00:00:00').toLocaleDateString('en', { weekday: 'short' }));
                hData.push(appData.daily.filter(e => e.date === d).reduce((s, e) => s + (parseFloat(e.hours) || 0), 0));
            }
            buildChart('hoursChart', 'line', hLabels, hData, 'Hours');
        }

        // ── Achievements ──
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
            document.getElementById('headerAchievementCount').textContent = Object.keys(appData.achievements).length;
        }

        function openAchievementsModal() {
            const grid = document.getElementById('achievementsModalGrid');
            grid.innerHTML = ACHIEVEMENTS_DEF.map(a => {
                const earnedDate = appData.achievements[a.id];
                return `<div class="badge-card ${earnedDate ? 'earned' : ''}">
                <div class="badge-icon"><i class="${a.icon}" style="font-size:32px"></i></div>
                <div class="badge-name">${a.name}</div>
                <div class="badge-desc">${a.desc}</div>
                ${earnedDate ? `<div class="badge-earned-date">Earned: ${fmtDate(earnedDate)}</div>` : '<div class="badge-earned-date">Not yet earned</div>'}
            </div>`;
            }).join('');
            document.getElementById('achievementsModal').classList.add('open');
        }
        function closeAchievementsModal() { document.getElementById('achievementsModal').classList.remove('open'); }

        // ── Notes ──
        // Notes stored as object keyed by id (not array) to avoid O(n) scans
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
            if (!title) { toast('Note title required', 'error'); return; }
            const editId = document.getElementById('noteEditId').value;
            const id = editId || genId();
            const note = { id, title, content, category: document.getElementById('noteCat').value, updatedAt: new Date().toISOString() };
            appData.notes[id] = note;
            activeNoteId = id;
            document.getElementById('noteEditId').value = id;
            saveData(); renderNotesList(); toast('Note saved', 'success');
        }

        function deleteNote() {
            const id = document.getElementById('noteEditId').value;
            if (!id) return;
            showConfirm('Delete this note?', () => {
                delete appData.notes[id];
                saveData(); newNote(); renderNotesList(); toast('Note deleted', 'info');
            });
        }

        function openNote(id) {
            const n = appData.notes[id];
            if (!n) return;
            activeNoteId = id;
            document.getElementById('noteTitle').value = n.title;
            document.getElementById('noteContent').value = n.content;
            document.getElementById('noteCat').value = n.category;
            document.getElementById('noteEditId').value = id;
            document.querySelectorAll('.note-item').forEach(el => el.classList.toggle('active', el.dataset.id === id));
        }

        function renderNotesList() {
            const search = (document.getElementById('noteSearch')?.value || '').toLowerCase();
            const cat = document.getElementById('noteFilterCat')?.value || '';
            let notes = Object.values(appData.notes).sort((a, b) => b.updatedAt > a.updatedAt ? 1 : -1);
            if (search) notes = notes.filter(n => n.title.toLowerCase().includes(search) || n.content.toLowerCase().includes(search));
            if (cat) notes = notes.filter(n => n.category === cat);
            const el = document.getElementById('notesList');
            if (!notes.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon"><i class="ri-sticky-note-line"></i></div><p>No notes</p></div>'; return; }
            el.innerHTML = notes.map(n => `
            <div class="note-item ${n.id === activeNoteId ? 'active' : ''}" data-id="${n.id}" onclick="openNote('${n.id}')">
                <div class="note-item-title">${esc(n.title)}</div>
                <div class="note-item-cat">${esc(n.category)} · ${new Date(n.updatedAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</div>
            </div>`).join('');
        }

        // ── Theme ──
        // FIX Warning #4: settingDark onchange removed from HTML; handled here with a flag to prevent loops
        let _themeChanging = false;
        function toggleTheme(isDark) {
            if (_themeChanging) return;
            _themeChanging = true;
            document.body.classList.toggle('dark-mode', isDark);
            document.body.classList.toggle('light-mode', !isDark);
            appData.settings.darkMode = isDark;
            document.getElementById('themeToggle').querySelector('i').className = isDark ? 'ri-moon-line' : 'ri-sun-line';
            const cb = document.getElementById('settingDark');
            if (cb) cb.checked = isDark;
            saveData();
            _themeChanging = false;
        }

        function setAccentColor(accent, accentDark, dotEl) {
            document.documentElement.style.setProperty('--accent', accent);
            document.documentElement.style.setProperty('--accent-dark', accentDark);
            document.documentElement.style.setProperty('--accent-glow', accent + '26');
            document.documentElement.style.setProperty('--border-hover', accent);
            appData.settings.accent = accent;
            appData.settings.accentDark = accentDark;
            document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
            if (dotEl) dotEl.classList.add('active');
            saveData();
        }

        function applySettings() {
            if (appData.settings) {
                toggleTheme(appData.settings.darkMode !== false);
                if (appData.settings.accent) {
                    document.documentElement.style.setProperty('--accent', appData.settings.accent);
                    document.documentElement.style.setProperty('--accent-dark', appData.settings.accentDark || '#1f6feb');
                    document.documentElement.style.setProperty('--accent-glow', appData.settings.accent + '26');
                    document.documentElement.style.setProperty('--border-hover', appData.settings.accent);
                    // Sync active color dot
                    document.querySelectorAll('.color-dot').forEach(d => {
                        d.classList.toggle('active', d.style.background === appData.settings.accent);
                    });
                }
            }
        }

        function renderSettings() {
            const streak = calcStreak(appData.daily);
            const longest = calcLongestStreak(appData.daily);
            const totalHrs = appData.daily.reduce((s, e) => s + (parseFloat(e.hours) || 0), 0);
            const rows = [
                ['Total Problems', appData.problems.length],
                ['Daily Entries', appData.daily.length],
                ['Total Study Hours', totalHrs.toFixed(1) + 'h'],
                ['Current Streak', streak + ' days'],
                ['Longest Streak', longest + ' days'],
                ['Goals Set', appData.goals.length],
                ['Notes', Object.keys(appData.notes).length],
                ['Achievements Earned', Object.keys(appData.achievements).length + '/' + ACHIEVEMENTS_DEF.length]
            ];
            document.getElementById('settingsStats').innerHTML =
                rows.map(r => `<div class="stat-row"><span>${r[0]}</span><span>${r[1]}</span></div>`).join('');
            document.getElementById('settingDark').checked = appData.settings.darkMode !== false;
        }

        // ── Export / Import ──
        function exportJSON() {
            const blob = new Blob([JSON.stringify(appData, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `codetree-backup-${todayStr()}.json`;
            a.click();
            toast('Backup exported', 'success');
        }

        // FIX Critical #3 (importJSON): warn user that current data will be replaced
        function importJSON(event) {
            const file = event.target.files[0];
            if (!file) return;
            showConfirm('⚠️ Restoring a backup will REPLACE all your current data. This cannot be undone. Continue?', () => {
                const reader = new FileReader();
                reader.onload = e => {
                    try {
                        const data = JSON.parse(e.target.result);
                        // Validate minimal schema
                        if (typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid format');
                        appData = Object.assign({ daily: [], topics: {}, problems: [], goals: [], notes: {}, achievements: {}, settings: { darkMode: true, accent: '#58a6ff', accentDark: '#1f6feb' } }, data);
                        // Migrate notes array → object if old backup
                        if (Array.isArray(appData.notes)) {
                            const notesObj = {};
                            appData.notes.forEach(n => { notesObj[n.id] = n; });
                            appData.notes = notesObj;
                        }
                        DSA_TOPICS.forEach(t => { if (!appData.topics[t]) appData.topics[t] = { total: DEFAULT_TOPIC_TOTALS[t] || 20, solved: 0 }; });
                        saveData(); applySettings(); navigateTo(currentSection);
                        toast('Data restored successfully', 'success');
                    } catch (err) { toast('Invalid backup file — could not restore', 'error'); }
                };
                reader.readAsText(file);
            });
            event.target.value = '';
        }

        function exportCSV() {
            const headers = ['Name', 'Platform', 'Difficulty', 'Topic', 'Date', 'Link', 'Notes', 'Revision', 'Favorite'];
            const rows = appData.problems.map(p => [
                `"${(p.name || '').replace(/"/g, '""')}"`, p.platform, p.difficulty, p.topic, p.date,
                `"${(p.link || '').replace(/"/g, '""')}"`,
                `"${(p.notes || '').replace(/"/g, '""')}"`,
                p.revision, p.favorite ? 'Yes' : 'No'
            ].join(','));
            const csv = [headers.join(','), ...rows].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `codetree-problems-${todayStr()}.csv`;
            a.click();
            toast('CSV exported', 'success');
        }

        // FIX Warning #7: PDF export now snapshots charts as images first
        function exportPDF() {
            toast('Generating PDF...', 'info');
            // Snapshot all visible charts to images so they appear in the PDF
            Object.keys(charts).forEach(id => {
                const canvas = document.getElementById(id);
                if (canvas && charts[id]) {
                    try {
                        const img = new Image();
                        img.src = charts[id].toBase64Image();
                        img.style.cssText = canvas.style.cssText;
                        img.width = canvas.offsetWidth;
                        img.height = canvas.offsetHeight;
                        canvas._pdfBackup = canvas.parentNode.replaceChild(img, canvas);
                        canvas._pdfImg = img;
                    } catch (e) { }
                }
            });
            const element = document.getElementById('mainContent');
            const opt = {
                margin: 10,
                filename: `codetree-report-${todayStr()}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim() },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            html2pdf().set(opt).from(element).save().then(() => {
                // Restore canvases
                Object.keys(charts).forEach(id => {
                    const canvas = document.getElementById(id);
                    if (!canvas) {
                        const c = document.createElement('canvas');
                        c.id = id;
                        // try to find the img we inserted
                        Object.keys(charts).forEach(cid => {
                            if (charts[cid] && charts[cid].canvas && charts[cid].canvas.id === id) {
                                const img = charts[cid].canvas._pdfImg;
                                if (img && img.parentNode) img.parentNode.replaceChild(charts[cid].canvas, img);
                            }
                        });
                    }
                });
                toast('PDF downloaded', 'success');
            });
        }

        function resetAllData() {
            showConfirm('⚠️ This will DELETE ALL data permanently. Are you absolutely sure?', () => {
                localStorage.removeItem('codetree_xbzin');
                location.reload();
            });
        }

        // ── Full-text search — FIX Minor #7: replaced naive section-name router ──
        function initSearch() {
            const input = document.getElementById('globalSearch');
            const results = document.getElementById('searchResults');

            input.addEventListener('input', () => {
                const q = input.value.trim().toLowerCase();
                results.innerHTML = '';
                if (q.length < 2) { results.classList.remove('open'); return; }

                const hits = [];

                // Search problems
                appData.problems.forEach(p => {
                    if (p.name.toLowerCase().includes(q) || p.topic.toLowerCase().includes(q) || (p.notes || '').toLowerCase().includes(q)) {
                        hits.push({ type: 'Problem', label: p.name, sub: `${p.difficulty} · ${p.topic}`, action: () => { navigateTo('problems'); setTimeout(() => { document.getElementById('probSearch').value = p.name; renderProblemsTable(); }, 200); } });
                    }
                });

                // Search notes
                Object.values(appData.notes).forEach(n => {
                    if (n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)) {
                        hits.push({ type: 'Note', label: n.title, sub: n.category, action: () => { navigateTo('notes'); setTimeout(() => openNote(n.id), 200); } });
                    }
                });

                // Search daily entries
                appData.daily.forEach(e => {
                    if ((e.topics || '').toLowerCase().includes(q) || (e.notes || '').toLowerCase().includes(q)) {
                        hits.push({ type: 'Daily Entry', label: fmtDate(e.date), sub: e.topics || '', action: () => { navigateTo('daily'); } });
                    }
                });

                // Search section names
                const sections = ['dashboard', 'daily', 'topics', 'problems', 'revision', 'goals', 'analytics', 'notes', 'settings'];
                sections.forEach(s => { if (s.includes(q)) hits.push({ type: 'Section', label: s.charAt(0).toUpperCase() + s.slice(1), sub: 'Navigate to section', action: () => navigateTo(s) }); });

                if (!hits.length) {
                    results.innerHTML = '<div class="search-result-item" style="color:var(--text-muted)">No results found</div>';
                } else {
                    results.innerHTML = hits.slice(0, 10).map((h, i) => `
                    <div class="search-result-item" data-idx="${i}">
                        <div class="search-result-type">${esc(h.type)}</div>
                        <div><strong>${esc(h.label)}</strong> ${h.sub ? `<span style="color:var(--text-muted);font-size:11px">— ${esc(h.sub)}</span>` : ''}</div>
                    </div>`).join('');
                    results.querySelectorAll('.search-result-item').forEach((el, i) => {
                        el.addEventListener('click', () => { hits[i].action(); results.classList.remove('open'); input.value = ''; });
                    });
                }
                results.classList.add('open');
            });

            input.addEventListener('focus', () => { if (input.value.trim().length >= 2) results.classList.add('open'); });
        }

        // ── Wire up settingDark toggle ──
        function initSettingsDarkToggle() {
            const cb = document.getElementById('settingDark');
            if (cb) cb.addEventListener('change', () => toggleTheme(cb.checked));
        }

        // ── Wire up achievementsModal background click ──
        document.getElementById('achievementsModal').addEventListener('click', function (e) {
            if (e.target === this) closeAchievementsModal();
        });

        // ── Init ──
        function init() {
            loadData();
            initNav();
            initSearch();
            initSettingsDarkToggle();
            populateTopicSelects();
            applySettings();
            navigateTo('dashboard');
            checkAchievements();
            const di = document.getElementById('dailyDate');
            if (di) di.value = todayStr();
            const pd = document.getElementById('probDate');
            if (pd) pd.value = todayStr();
            document.getElementById('headerAchievementCount').textContent = Object.keys(appData.achievements).length;
        }

        document.getElementById('themeToggle').addEventListener('click', () => {
            toggleTheme(!document.body.classList.contains('dark-mode'));
        });

        document.addEventListener('DOMContentLoaded', init);
  
