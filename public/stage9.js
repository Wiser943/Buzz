/* Stage 9: sports, notifications, direct messages, moderation, admin. Loaded after screens.js. */
async function api(url, method = 'GET', body) {
  const r = await fetch(url, { method, headers: headers(body !== undefined), body: body !== undefined ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Request failed');
  return d;
}
const needLogin = () => token() || (authOpen('login'), false);
const when = d => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
const errBox = (el, e) => { el.innerHTML = `<div class="feed-empty">${esc(e.message)}</div>`; };
const isStaff = () => ['admin', 'moderator'].includes(meUser?.role);

/* role-aware nav + unread badges */
function syncRole() { const n = $('#adminNav'); if (n) n.style.display = isStaff() ? 'flex' : 'none'; }
const _loadMe = loadMe; loadMe = async function () { const d = await _loadMe(); syncRole(); return d; };
function setBadge(sel, n) { document.querySelectorAll(sel).forEach(el => { el.dataset.badge = n; }); }
async function updateBadges() {
  if (!token()) { setBadge('[data-badge]', 0); return; }
  try { const d = await api('/api/notifications/unread-count'); setBadge('.tab-item[data-view=notifications],.nav-item[data-view=notifications],#bellTop', d.notifications); setBadge('#msgBtn,.nav-item[data-view=messages]', d.messages); }
  catch (e) { if (/suspended/i.test(e.message)) notify(e.message); }
}
setInterval(updateBadges, 25000);
$('#msgBtn')?.addEventListener('click', () => render('messages'));

/* reporting + blocking */
function reportSheet(type, username, postId) {
  if (!needLogin()) return;
  sheet(`<h3 class="sh-title">${type === 'post' ? 'Report post' : type === 'profile_picture' ? 'Report profile picture' : 'Report user'}</h3><textarea id="rpReason" class="sh-text" maxlength="500" placeholder="What's wrong? (optional)"></textarea><button class="purchase" id="rpGo">Submit report</button>`);
  $('#rpGo').onclick = async () => { try { await api('/api/safety/reports', 'POST', { targetType: type, username, postId, reason: $('#rpReason').value.trim() }); closeSheets(); notify('Report sent. Thank you.'); } catch (e) { notify(e.message); } };
}
async function blockUser(username) {
  if (!needLogin() || !confirm(`Block @${username}? They won't be able to message you and their posts will be hidden.`)) return;
  try { await api('/api/safety/block/' + encodeURIComponent(username), 'POST'); closeSheets(); notify('User blocked'); render('home'); } catch (e) { notify(e.message); }
}
document.addEventListener('click', e => {
  const b = e.target.closest('.more-btn[data-post]'); if (!b) return;
  e.stopPropagation(); if (b.dataset.author === myName()) return notify('This is your post');
  sheet(`<div class="sh-group">${item('mpRep', 'flag', 'Report post', 1)}${item('mpBlk', 'user-round-x', 'Block @' + esc(b.dataset.author), 1)}</div>`);
  $('#mpRep').onclick = () => reportSheet('post', b.dataset.author, b.dataset.post); $('#mpBlk').onclick = () => blockUser(b.dataset.author);
}, true);

/* ---------- Sports ---------- */
screens.sports = {
  html() { return `<div class="x-head"><h1>Sports</h1></div><div class="seg wide"><button class="on" data-t="fx">Fixtures</button><button data-t="lb">Leaderboard</button></div><div id="spBody"><div class="feed-loading">Loading…</div></div>`; },
  wire() {
    const body = $('#spBody'); let tab = 'fx';
    const card = (m, pts) => {
      const mp = m.myPrediction, fin = m.status === 'finished';
      const mid = fin ? `<span class="score">${m.homeScore} – ${m.awayScore}</span>` : m.locked ? '<span class="score">vs</span>' : `<span class="pick"><input class="pi" type="number" inputmode="numeric" min="0" max="30" data-s="home" value="${mp ? mp.home : ''}"><i>–</i><input class="pi" type="number" inputmode="numeric" min="0" max="30" data-s="away" value="${mp ? mp.away : ''}"></span>`;
      const foot = !m.locked ? `<button class="predict" data-id="${m._id}">${mp ? 'Update pick' : 'Predict'}</button>` : mp ? `<small class="muted">Your pick ${mp.home}–${mp.away}${fin ? ` · ${mp.points ? '+' + mp.points + ' pts' : '0 pts'}` : ''}</small>` : '<small class="muted">No pick</small>';
      return `<div class="mc" data-m="${m._id}"><small class="muted">${esc(m.league)}${m.league ? ' · ' : ''}${when(m.kickoff)}</small><div class="mc-row"><b>${esc(m.home)}</b>${mid}<b>${esc(m.away)}</b></div>${foot}</div>`;
    };
    async function fixtures() {
      try {
        const d = await api('/api/sports/matches'); const up = d.matches.filter(m => m.status === 'upcoming').reverse(), done = d.matches.filter(m => m.status === 'finished');
        body.innerHTML = `<p class="muted pad2">Predict the score before kickoff. Exact score = ${d.points.exact} pts, correct result = ${d.points.outcome} pts. Points also add to your Karma.</p>${up.length ? up.map(m => card(m)).join('') : '<div class="feed-empty">No upcoming matches yet.</div>'}${done.length ? `<h3 class="sec-title">Results</h3>${done.map(m => card(m)).join('')}` : ''}`;
        body.querySelectorAll('.predict').forEach(b => b.onclick = async () => {
          if (!needLogin()) return; const c = b.closest('.mc'), h = c.querySelector('[data-s=home]').value, a = c.querySelector('[data-s=away]').value;
          if (h === '' || a === '') return notify('Enter both scores');
          try { await api(`/api/sports/matches/${b.dataset.id}/predict`, 'POST', { home: +h, away: +a }); b.textContent = 'Update pick'; notify('Prediction saved'); } catch (e) { notify(e.message); }
        });
      } catch (e) { errBox(body, e); }
    }
    async function board() {
      try {
        const d = await api('/api/sports/leaderboard');
        body.innerHTML = `${d.me ? `<div class="lb-me">Your rank <b>#${d.me.rank}</b> · ${d.me.points} pts</div>` : ''}${d.leaders.length ? d.leaders.map((u, i) => `<div class="lb-row" data-user="${esc(u.username)}"><span class="rk">${i + 1}</span>${avatar(u, 'sm')}<b>${esc(u.displayName)}${vb(u)}</b><span class="pts">${u.predPoints} pts</span></div>`).join('') : '<div class="feed-empty">No scores yet. Make a prediction!</div>'}`;
        body.querySelectorAll('[data-user]').forEach(e => e.onclick = () => render('user', e.dataset.user)); refreshIcons();
      } catch (e) { errBox(body, e); }
    }
    document.querySelectorAll('.seg.wide button').forEach(b => b.onclick = () => { tab = b.dataset.t; document.querySelectorAll('.seg.wide button').forEach(x => x.classList.toggle('on', x === b)); body.innerHTML = '<div class="feed-loading">Loading…</div>'; tab === 'fx' ? fixtures() : board(); });
    fixtures();
  }
};

/* ---------- Notifications ---------- */
const NT = { like: 'liked your post', comment: 'commented on your post', follow: 'started following you' };
screens.notifications = {
  html() { return `<div class="notif-title">Notifications</div><div id="ntBody"><div class="feed-loading">Loading…</div></div>`; },
  async wire() {
    const body = $('#ntBody'); if (!token()) { body.innerHTML = '<div class="notif-empty">Log in to see your notifications.</div>'; return; }
    try {
      const { notifications } = await api('/api/notifications');
      const row = n => { const sys = !n.actor || ['moderation', 'system', 'verification'].includes(n.type); return `<div class="nt ${n.read ? '' : 'new'}" data-post="${n.post || ''}" data-user="${n.actor && !sys ? esc(n.actor.username) : ''}">${sys ? `<div class="nt-ico ${n.type === 'moderation' ? 'red' : ''}">${ico(n.type === 'moderation' ? 'triangle-alert' : n.type === 'verification' ? 'badge-check' : 'bell')}</div>` : avatar(n.actor)}<div class="nt-txt">${sys ? esc(n.text) : `<b>${esc(n.actor.username)}</b> ${NT[n.type] || ''}${n.type === 'comment' && n.text ? `: “${esc(n.text)}”` : ''}`}<small>${ago(n.createdAt)}</small></div></div>`; };
      const fresh = notifications.filter(n => !n.read), old = notifications.filter(n => n.read);
      body.innerHTML = notifications.length ? `${fresh.length ? `<div class="notif-label">New</div>${fresh.map(row).join('')}` : ''}${old.length ? `<div class="notif-label">Earlier</div>${old.map(row).join('')}` : ''}` : '<div class="notif-empty">No notifications yet. Likes, follows and updates will show up here.</div>';
      body.querySelectorAll('.nt').forEach(e => e.onclick = () => e.dataset.post ? render('post', e.dataset.post) : e.dataset.user && render('user', e.dataset.user));
      refreshIcons(); if (fresh.length) api('/api/notifications/read-all', 'POST').then(updateBadges).catch(() => {});
    } catch (e) { errBox(body, e); }
  }
};

/* ---------- Messages ---------- */
screens.messages = {
  html() { return `<div class="sub-head"><button class="round bare" id="back">${ico('arrow-left')}</button><b>Messages</b><button class="round bare" id="newChat" aria-label="New chat">${ico('square-pen')}</button></div><p class="muted pad2">You can only message users who follow you and whom you follow.</p><div id="mList"><div class="feed-loading">Loading…</div></div>`; },
  async wire() {
    $('#back').onclick = back;
    $('#newChat').onclick = async () => {
      sheet(`<h3 class="sh-title">New message</h3><div id="ctList"><div class="feed-loading">Loading…</div></div>`);
      try { const { users } = await api('/api/messages/contacts'); $('#ctList').innerHTML = users.length ? users.map(u => `<button class="ct" data-u="${esc(u.username)}">${avatar(u, 'sm')}<span><b>${esc(u.displayName)}</b><small>@${esc(u.username)}</small></span></button>`).join('') : '<div class="feed-empty">No contacts yet. You and another user must follow each other first.</div>'; document.querySelectorAll('.ct').forEach(b => b.onclick = () => { closeSheets(); render('chat', b.dataset.u); }); }
      catch (e) { errBox($('#ctList'), e); }
    };
    const list = $('#mList');
    try {
      const { conversations } = await api('/api/messages/conversations');
      list.innerHTML = conversations.length ? conversations.map(c => `<div class="cv" data-u="${esc(c.user.username)}">${avatar(c.user, 'md')}<div class="cv-t"><b>${esc(c.user.displayName)}${vb(c.user)}</b><small class="${c.unread ? 'strong' : ''}">${esc(c.lastMessage)}</small></div><div class="cv-r"><small>${ago(c.lastAt)}</small>${c.unread ? `<i class="dot">${c.unread}</i>` : ''}</div></div>`).join('') : '<div class="notif-empty">No conversations yet. Tap the pencil to start one.</div>';
      list.querySelectorAll('.cv').forEach(e => e.onclick = () => render('chat', e.dataset.u));
    } catch (e) { errBox(list, e); }
  }
};
screens.chat = {
  html() { return `<div class="sub-head" id="chHead"><button class="round bare" id="back">${ico('arrow-left')}</button></div><div class="chat-log" id="chLog"></div><div class="chat-bar" id="chBar"></div>`; },
  async wire(u) {
    window.__chat = u; $('#back').onclick = back;
    const log = $('#chLog'), me = localStorage.getItem('buzzerId') || (await loadMe())?.user?._id; let last = null, timer;
    const bub = m => `<div class="bub ${String(m.sender) === String(me) ? 'me' : ''}">${esc(m.text)}<small>${new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></div>`;
    async function pull(first) {
      const d = await api('/api/messages/with/' + encodeURIComponent(u) + (last ? '?after=' + encodeURIComponent(last) : ''));
      if (window.__chat !== u) return;
      if (first) {
        $('#chHead').innerHTML = `<button class="round bare" id="back">${ico('arrow-left')}</button><div class="ph-av" data-user="${esc(d.user.username)}">${avatar(d.user, 'sm')}</div><div class="ph-name"><b>${esc(d.user.displayName)}${vb(d.user)}</b><small>@${esc(d.user.username)}</small></div>`; $('#back').onclick = back; $('#chHead [data-user]').onclick = () => render('user', u);
        $('#chBar').innerHTML = d.canMessage ? `<input id="chIn" maxlength="2000" placeholder="Message…" autocomplete="off"><button id="chSend">${ico('send')}</button>` : '<span class="muted">You can only message users who follow you and whom you follow.</span>'; refreshIcons();
        if (d.canMessage) { const send = async () => { const t = $('#chIn').value.trim(); if (!t) return; $('#chIn').value = ''; try { await api('/api/messages/with/' + encodeURIComponent(u), 'POST', { text: t }); await pull(); } catch (e) { notify(e.message); $('#chIn').value = t; } }; $('#chSend').onclick = send; $('#chIn').onkeydown = e => { if (e.key === 'Enter') send(); }; }
      }
      if (d.messages.length) { log.insertAdjacentHTML('beforeend', d.messages.map(bub).join('')); last = d.messages[d.messages.length - 1].createdAt; window.scrollTo(0, document.body.scrollHeight); }
      else if (first) log.innerHTML = '<div class="notif-empty">Say hello 👋</div>';
      if (first && d.messages.length) log.firstChild?.classList?.contains('notif-empty') && log.firstChild.remove();
    }
    try { await pull(true); } catch (e) { errBox(log, e); return; }
    timer = setInterval(() => { if (window.__chat !== u || currentView !== 'chat') { clearInterval(timer); return; } pull().catch(() => {}); updateBadges(); }, 4000);
  }
};

/* ---------- Admin dashboard ---------- */
screens.admin = {
  html() { return `<div class="x-head"><h1>Admin</h1></div><div class="seg wide adm"><button class="on" data-t="ov">Overview</button><button data-t="rp">Reports</button><button data-t="us">Users</button><button data-t="vf">Verify</button><button data-t="mt">Matches</button></div><div id="adBody"><div class="feed-loading">Loading…</div></div>`; },
  async wire() {
    const body = $('#adBody'); await loadMe(); if (!isStaff()) { body.innerHTML = '<div class="feed-empty">Access denied.</div>'; return; }
    const act = async (fn, msg) => { try { await fn(); notify(msg); tabs[cur](); } catch (e) { notify(e.message); } };
    let cur = 'ov';
    const tabs = {
      async ov() { try { const s = await api('/api/admin/stats'); const t = (n, l) => `<div class="stat"><b>${s[n]}</b><small>${l}</small></div>`; body.innerHTML = `<div class="stat-grid">${t('users', 'Users')}${t('newUsers', 'New (7d)')}${t('posts', 'Posts')}${t('newPosts', 'Posts (7d)')}${t('openReports', 'Open reports')}${t('pendingVerification', 'Verify requests')}${t('suspended', 'Suspended/banned')}${t('messagesToday', 'Messages (24h)')}${t('matches', 'Matches')}${t('predictions', 'Predictions')}</div>`; } catch (e) { errBox(body, e); } },
      async rp() {
        try {
          const { reports } = await api('/api/admin/reports'); body.innerHTML = reports.length ? reports.map(r => `<div class="ad-card"><small class="muted">${r.targetType.replace('_', ' ')} · ${ago(r.createdAt)} · by @${esc(r.reporter?.username)}</small><b>@${esc(r.targetUser?.username || '—')}</b>${r.targetPost ? `<p class="ad-quote">${esc((r.targetPost.text || '(media post)').slice(0, 160))}</p>` : ''}<p>${esc(r.reason) || '<span class="muted">No reason given</span>'}</p><div class="ad-act">${r.targetPost ? `<button data-a="remove_post" data-id="${r._id}">Remove post</button>` : ''}<button data-a="warn" data-id="${r._id}">Warn</button><button data-a="suspend_user" data-id="${r._id}" class="danger">Suspend user</button><button data-a="dismiss" data-id="${r._id}">Dismiss</button></div></div>`).join('') : '<div class="feed-empty">No open reports 🎉</div>';
          body.querySelectorAll('[data-a]').forEach(b => b.onclick = () => act(() => api(`/api/admin/reports/${b.dataset.id}/resolve`, 'POST', { action: b.dataset.a }), 'Done'));
        } catch (e) { errBox(body, e); }
      },
      async us(q = '') {
        try {
          const { users } = await api('/api/admin/users?q=' + encodeURIComponent(q)), adm = meUser.role === 'admin';
          body.innerHTML = `<div class="search-pill">${ico('search')}<input id="adQ" placeholder="Search username, name or email" value="${esc(q)}"></div>${users.map(u => `<div class="ad-card"><b>@${esc(u.username)} ${u.isVerified ? vb(u) : ''}</b><small class="muted">${esc(u.email)} · ${u.role} · ${u.status} · karma ${u.karma || 0}</small><div class="ad-act">${u.status === 'active' ? `<button data-p='{"status":"suspended"}' data-id="${u._id}">Suspend</button><button data-p='{"status":"banned"}' data-id="${u._id}" class="danger">Ban</button>` : `<button data-p='{"status":"active"}' data-id="${u._id}">Reinstate</button>`}<button data-p='{"isVerified":${!u.isVerified}}' data-id="${u._id}">${u.isVerified ? 'Unverify' : 'Verify'}</button>${adm ? `<button data-p='{"role":"${u.role === 'moderator' ? 'user' : 'moderator'}"}' data-id="${u._id}">${u.role === 'moderator' ? 'Remove mod' : 'Make mod'}</button>` : ''}</div></div>`).join('') || '<div class="feed-empty">No users found.</div>'}`;
          refreshIcons(); $('#adQ').onkeydown = e => { if (e.key === 'Enter') tabs.us(e.target.value.trim()); };
          body.querySelectorAll('[data-p]').forEach(b => b.onclick = () => act(() => api('/api/admin/users/' + b.dataset.id, 'PATCH', JSON.parse(b.dataset.p)), 'Updated'));
        } catch (e) { errBox(body, e); }
      },
      async vf() {
        try {
          const { requests } = await api('/api/admin/verification'); body.innerHTML = requests.length ? requests.map(v => `<div class="ad-card"><b>@${esc(v.user?.username)}</b><small class="muted">${v.plan} badge · ${ago(v.createdAt)} · karma ${v.user?.karma || 0}</small><div class="ad-act"><button data-d="approve" data-id="${v._id}">Approve</button><button data-d="reject" data-id="${v._id}" class="danger">Reject</button></div></div>`).join('') : '<div class="feed-empty">No pending requests.</div>';
          body.querySelectorAll('[data-d]').forEach(b => b.onclick = () => act(() => api('/api/admin/verification/' + b.dataset.id, 'POST', { decision: b.dataset.d }), 'Done'));
        } catch (e) { errBox(body, e); }
      },
      async mt() {
        try {
          const { matches } = await api('/api/sports/matches');
          body.innerHTML = `<div class="ad-card"><b>New match</b><input id="mLg" placeholder="League (e.g. NPFL)"><input id="mH" placeholder="Home team"><input id="mA" placeholder="Away team"><input id="mK" type="datetime-local"><button class="save-avatar" id="mAdd">Add match</button></div>${matches.map(m => `<div class="ad-card"><b>${esc(m.home)} vs ${esc(m.away)}</b><small class="muted">${esc(m.league)} · ${when(m.kickoff)} · ${m.status}${m.status === 'finished' ? ` ${m.homeScore}–${m.awayScore}` : ''}</small>${m.status === 'upcoming' ? `<div class="ad-act"><input class="pi" type="number" min="0" max="30" placeholder="H" data-h="${m._id}"><input class="pi" type="number" min="0" max="30" placeholder="A" data-aw="${m._id}"><button data-s="${m._id}">Settle</button><button data-x="${m._id}" class="danger">Delete</button></div>` : ''}</div>`).join('')}`;
          $('#mAdd').onclick = () => { const k = $('#mK').value; act(() => api('/api/admin/matches', 'POST', { league: $('#mLg').value, home: $('#mH').value, away: $('#mA').value, kickoff: k ? new Date(k).toISOString() : '' }), 'Match added'); };
          body.querySelectorAll('[data-s]').forEach(b => b.onclick = () => act(() => api(`/api/admin/matches/${b.dataset.s}/settle`, 'POST', { homeScore: $(`[data-h="${b.dataset.s}"]`).value, awayScore: $(`[data-aw="${b.dataset.s}"]`).value }), 'Match settled, points awarded'));
          body.querySelectorAll('[data-x]').forEach(b => b.onclick = () => confirm('Delete this match and its predictions?') && act(() => api('/api/admin/matches/' + b.dataset.x, 'DELETE'), 'Deleted'));
        } catch (e) { errBox(body, e); }
      }
    };
    document.querySelectorAll('.adm button').forEach(b => b.onclick = () => { cur = b.dataset.t; document.querySelectorAll('.adm button').forEach(x => x.classList.toggle('on', x === b)); body.innerHTML = '<div class="feed-loading">Loading…</div>'; tabs[cur](); });
    tabs.ov();
  }
};

/* start the router (screens.js no longer starts it so every screen exists first) */
loadMe().then(updateBadges); fromLocation();
