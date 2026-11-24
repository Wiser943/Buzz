/* Stage 13: live updates, search, stories, music, communities, opportunities, ads, payments, appeals. */
const fmtDur = s => { s = Math.round(s || 0); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const qs = (sel, el = document) => el.querySelector(sel);
const coverOf = t => t.coverUrl ? `<img class="cv-img" src="${esc(t.coverUrl)}" alt="" loading="lazy">` : `<div class="cv-img ph">${ico('music')}</div>`;
const ownerName = t => t.owner?.displayName || t.owner?.username || 'unknown';
const titleBar = (t, right = '') => `<div class="sub-head"><button class="round bare" id="back" aria-label="Back">${ico('arrow-left')}</button><b>${t}</b>${right || '<span></span>'}</div>`;
const empty = m => `<div class="feed-empty">${m}</div>`;

/* ---------- route registration ---------- */
Object.assign(ROUTES, { music: '/music', musicUpload: '/music/new', communities: '/communities', opportunities: '/opportunities', ads: '/ads', appeal: '/appeal' });
PROTECTED.push('musicUpload', 'ads');
DYN.push(
  [/^\/search$/, 'search', a => '/search' + (a ? '?q=' + encodeURIComponent(a) : ''), () => new URLSearchParams(location.search).get('q') || ''],
  [/^\/track\/([a-f0-9]{24})$/i, 'track', a => '/track/' + a],
  [/^\/playlist\/([a-f0-9]{24})$/i, 'playlist', a => '/playlist/' + a],
  [/^\/c\/([a-z0-9-]{3,40})$/, 'community', a => '/c/' + a],
  [/^\/opportunities\/([a-f0-9]{24})$/i, 'opportunity', a => '/opportunities/' + a],
  [/^\/payments\/callback$/, 'payResult', a => '/payments/callback' + (a ? '?reference=' + encodeURIComponent(a) : ''), () => { const q = new URLSearchParams(location.search); return q.get('reference') || q.get('trxref') || ''; }]
);

/* ---------- live updates (Server-Sent Events), PWA, browser alerts ---------- */
let es = null, esToken = null;
function browserNotify(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted' || !document.hidden) return;
  navigator.serviceWorker?.ready.then(r => r.showNotification(title, { body, icon: '/icon-192.png', badge: '/icon-192.png', tag: 'buzzer' })).catch(() => {});
}
function connectStream() {
  const t = token(); if (t === esToken) return; esToken = t; if (es) { es.close(); es = null; } if (!t || !window.EventSource) return;
  es = new EventSource('/api/stream?token=' + encodeURIComponent(t));
  es.addEventListener('notification', e => { const d = JSON.parse(e.data); updateBadges(); if (currentView === 'notifications') render('notifications'); else if (!document.hidden && d.text) notify(d.text.slice(0, 90)); browserNotify('Buzzer', d.text || 'New activity'); });
  es.addEventListener('message', e => { const d = JSON.parse(e.data); updateBadges(); if (currentView === 'chat' && window.__chat === d.from) window.__chatPull?.(); else { if (!document.hidden) notify('@' + d.from + ': ' + d.text); browserNotify('@' + d.from, d.text); } });
}
setInterval(connectStream, 4000);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
const _nwire = screens.notifications.wire;
screens.notifications.wire = async function () {
  await _nwire(); const b = $('#ntBody');
  if (b && token() && 'Notification' in window && Notification.permission === 'default') { b.insertAdjacentHTML('afterbegin', `<div class="perm-bar"><span>Get alerts for messages and activity</span><button id="permBtn">Turn on</button></div>`); $('#permBtn').onclick = () => Notification.requestPermission().then(p => { notify(p === 'granted' ? 'Alerts are on' : 'Alerts stay off'); $('.perm-bar')?.remove(); }); }
};

/* ---------- appeals ---------- */
function appealSheet(kind, id) {
  sheet(`<h3 class="sh-title">Appeal this decision</h3><p class="muted pad2">Tell us why this was a mistake. A moderator will review it.</p><textarea id="apReason" class="sh-text" maxlength="1000" placeholder="Why should this be restored?"></textarea><button class="purchase" id="apGo">Send appeal</button>`);
  $('#apGo').onclick = async () => { try { await api('/api/appeals', 'POST', { targetType: kind, targetId: id, reason: $('#apReason').value.trim() }); closeSheets(); notify('Appeal sent. We will notify you.'); } catch (e) { notify(e.message); } };
}
screens.appeal = {
  html() { return `${titleBar('Appeal a suspension')}<div class="edit-wrap"><p class="muted">If your account was suspended, enter the email you signed up with and explain what happened.</p><label>Email</label><input id="apEmail" type="email" autocomplete="email"><label>Your appeal</label><textarea id="apMsg" rows="5" maxlength="1000"></textarea><button class="save-avatar" id="apSend">Send appeal</button></div>`; },
  wire() { $('#back').onclick = back; $('#apSend').onclick = async () => { try { const d = await api('/api/appeals/account', 'POST', { email: $('#apEmail').value, reason: $('#apMsg').value }); notify(d.message); render('home'); } catch (e) { notify(e.message); } }; }
};

/* ---------- search ---------- */
screens.search = {
  html(q) { return `<div class="sub-head"><button class="round bare" id="back">${ico('arrow-left')}</button><div class="search-pill s-in">${ico('search')}<input id="sq" value="${esc(q || '')}" placeholder="Search people, posts, music…" autocomplete="off"></div></div><div class="seg wide" id="sTabs"><button class="on" data-t="all">All</button><button data-t="users">People</button><button data-t="posts">Posts</button><button data-t="tracks">Music</button><button data-t="communities">Groups</button><button data-t="opportunities">Jobs</button></div><div id="sBody"></div>`; },
  wire(q) {
    $('#back').onclick = back; let data = null, tab = 'all', timer, seq = 0; const body = $('#sBody');
    const rows = {
      users: u => `<div class="lb-row" data-user="${esc(u.username)}">${userAv(u, 'sm')}<b>${esc(u.displayName)}${vb(u)}<small class="muted"> @${esc(u.username)}</small></b></div>`,
      tracks: t => trackRow(t, data.tracks),
      communities: c => `<div class="lb-row" data-c="${esc(c.slug)}"><div class="cv-img ph sm">${ico('users')}</div><b>${esc(c.name)}<small class="muted"> ${esc(c.sport)} · ${c.membersCount} members</small></b></div>`,
      opportunities: o => `<div class="lb-row" data-o="${o._id}"><div class="cv-img ph sm">${ico('briefcase')}</div><b>${esc(o.title)}<small class="muted"> ${esc(o.type)}${o.location ? ' · ' + esc(o.location) : ''}</small></b></div>`
    };
    function paint() {
      if (!data) return body.innerHTML = empty('Type at least 2 characters to search.');
      const sec = (k, label, html) => html ? `<h3 class="sec-title">${label}</h3>${html}` : '';
      const part = k => (data[k] || []).map(rows[k]).join('');
      const one = k => tab === k;
      let h = '';
      if (tab === 'all' || one('users')) h += sec('users', 'People', part('users'));
      if (tab === 'all' || one('tracks')) h += sec('tracks', 'Music', part('tracks'));
      if (tab === 'all' || one('communities')) h += sec('communities', 'Groups', part('communities'));
      if (tab === 'all' || one('opportunities')) h += sec('opportunities', 'Opportunities', part('opportunities'));
      if (tab === 'all' || one('posts')) h += sec('posts', 'Posts', (data.posts || []).map(feedCard).join(''));
      body.innerHTML = h || empty('No results.');
      hydrate(body, data.tracks || []); wireFeed(body); wireTracks(body); body.querySelectorAll('[data-user]').forEach(e => e.onclick = () => render('user', e.dataset.user));
      body.querySelectorAll('[data-c]').forEach(e => e.onclick = () => render('community', e.dataset.c)); body.querySelectorAll('[data-o]').forEach(e => e.onclick = () => render('opportunity', e.dataset.o)); refreshIcons();
    }
    async function run() {
      const v = $('#sq').value.trim(); history.replaceState({}, '', '/search' + (v ? '?q=' + encodeURIComponent(v) : ''));
      if (v.length < 2) { data = null; return paint(); }
      const my = ++seq; body.innerHTML = '<div class="feed-loading">Searching…</div>';
      try { const d = await api('/api/search?q=' + encodeURIComponent(v)); if (my === seq) { data = d; paint(); } } catch (e) { errBox(body, e); }
    }
    $('#sq').oninput = () => { clearTimeout(timer); timer = setTimeout(run, 350); }; $('#sq').onkeydown = e => { if (e.key === 'Enter') { clearTimeout(timer); run(); } };
    document.querySelectorAll('#sTabs button').forEach(b => b.onclick = () => { tab = b.dataset.t; document.querySelectorAll('#sTabs button').forEach(x => x.classList.toggle('on', x === b)); paint(); });
    if (q) run(); else { paint(); $('#sq').focus(); }
  }
};
const topSearch = document.querySelector('.top-search input, #search');
topSearch?.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.value.trim()) render('search', e.target.value.trim()); });

/* ---------- stories ---------- */
async function loadStories() {
  const row = $('.stories-row'); if (!row || !token()) return;
  try {
    const { groups } = await api('/api/stories'); window.__stories = groups;
    const mine = groups.find(g => g.mine), others = groups.filter(g => !g.mine), me = meUser || { username: myName() };
    row.innerHTML = `<div class="story-me" data-sv="${mine ? 'me' : ''}"><div class="story-avatar ${mine ? (mine.seen ? 'seen' : 'ring') : ''}">${userAv(me, 'fill')}<span class="s-add" data-add="1">+</span></div><small>Your Story</small></div>${others.length ? `<div class="story-list">${others.map(g => `<div class="story-it" data-sv="${g.user._id}"><div class="story-avatar ${g.seen ? 'seen' : 'ring'}">${userAv(g.user, 'fill')}</div><small>${esc(g.user.username)}</small></div>`).join('')}</div>` : `<div class="story-card"><b>No Stories at the Time</b><small>Follow some profiles to see stories</small><button type="button" id="exploreProfiles">Explore Profiles</button></div>`}`;
    row.querySelectorAll('[data-sv]').forEach(el => el.onclick = e => {
      const id = el.dataset.sv;
      if (id === '' || e.target.dataset.add) { window.__startMode = 'story'; return render('create'); }
      openStories(id === 'me' ? groups.findIndex(g => g.mine) : groups.findIndex(g => g.user._id === id));
    });
  } catch (_) { /* leave default row */ }
}
function openStories(gi) {
  const groups = window.__stories || []; if (gi < 0 || !groups[gi]) return; let g = gi, i = Math.max(0, groups[g].stories.findIndex(s => !s.seen)), timer, closed = false;
  const el = document.createElement('div'); el.className = 'sv'; document.body.append(el); document.body.classList.add('no-scroll');
  const stop = () => { clearTimeout(timer); const v = qs('video', el); v && v.pause(); };
  const close = () => { closed = true; stop(); el.remove(); document.body.classList.remove('no-scroll'); document.removeEventListener('keydown', key); loadStories(); };
  const next = () => { if (i < groups[g].stories.length - 1) { i++; show(); } else if (g < groups.length - 1) { g++; i = 0; show(); } else close(); };
  const prev = () => { if (i > 0) { i--; show(); } else if (g > 0) { g--; i = 0; show(); } };
  const key = e => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev(); };
  document.addEventListener('keydown', key);
  function show() {
    if (closed) return; stop(); const grp = groups[g], s = grp.stories[i];
    el.innerHTML = `<div class="sv-bars">${grp.stories.map((_, k) => `<i class="${k < i ? 'done' : k === i ? 'run' : ''}"><b></b></i>`).join('')}</div><div class="sv-head">${userAv(grp.user, 'sm')}<b>${esc(grp.user.username)}</b><small>${ago(s.createdAt)}</small><span class="grow"></span>${grp.mine ? `<button class="sv-x" id="svDel" aria-label="Delete">${ico('trash-2')}</button>` : ''}<button class="sv-x" id="svClose" aria-label="Close">${ico('x')}</button></div><div class="sv-media">${s.mediaType === 'video' ? `<video src="${esc(s.mediaUrl)}" autoplay playsinline></video>` : `<img src="${esc(s.mediaUrl)}" alt="">`}</div>${s.text ? `<div class="sv-text">${esc(s.text)}</div>` : ''}${grp.mine ? `<div class="sv-views">${ico('eye')} ${s.views || 0}</div>` : ''}<div class="sv-tap l"></div><div class="sv-tap r"></div>`;
    refreshIcons(); qs('#svClose', el).onclick = close; qs('.sv-tap.l', el).onclick = prev; qs('.sv-tap.r', el).onclick = next;
    const del = qs('#svDel', el); if (del) del.onclick = async () => { if (!confirm('Delete this story?')) return; try { await api('/api/stories/' + s._id, 'DELETE'); grp.stories.splice(i, 1); if (!grp.stories.length) { groups.splice(g, 1); return close(); } if (i >= grp.stories.length) i = grp.stories.length - 1; show(); } catch (e) { notify(e.message); } };
    if (!grp.mine && !s.seen) { s.seen = true; api(`/api/stories/${s._id}/view`, 'POST').catch(() => {}); }
    const v = qs('video', el); if (v) v.onended = next; else timer = setTimeout(next, 5000);
    const bar = qs('.sv-bars .run b', el); if (bar && !v) { bar.style.transition = 'width 5s linear'; requestAnimationFrame(() => requestAnimationFrame(() => bar.style.width = '100%')); }
  }
  show();
}
const _lf = loadFeed; loadFeed = function () { loadStories(); return _lf(); };
document.addEventListener('click', e => { if (e.target.closest('.opp-card,.opportunity-banner')) render('opportunities'); });

/* ---------- music: player ---------- */
const Player = {
  audio: new Audio(), queue: [], i: -1, track: null, counted: false,
  play(t, queue) { this.queue = queue && queue.length ? queue : [t]; this.i = Math.max(0, this.queue.findIndex(x => x._id === t._id)); this.load(t); },
  load(t) { this.track = t; this.counted = false; this.audio.src = t.audioUrl; this.audio.play().catch(() => notify('Tap play to start')); this.paint(); },
  toggle() { if (!this.track) return; this.audio.paused ? this.audio.play() : this.audio.pause(); },
  next() { if (this.i < this.queue.length - 1) { this.i++; this.load(this.queue[this.i]); } else this.audio.pause(); },
  prev() { if (this.audio.currentTime > 4 || this.i === 0) this.audio.currentTime = 0; else { this.i--; this.load(this.queue[this.i]); } },
  stop() { this.audio.pause(); this.audio.removeAttribute('src'); this.track = null; this.paint(); },
  paint() {
    let mp = $('#miniPlayer'); const t = this.track;
    if (!t) { mp && mp.remove(); document.body.classList.remove('has-mini'); return; }
    if (!mp) { mp = document.createElement('div'); mp.id = 'miniPlayer'; document.body.append(mp); }
    document.body.classList.add('has-mini');
    mp.innerHTML = `<div class="mp-prog"><i id="mpBar"></i></div><div class="mp-in" id="mpOpen">${coverOf(t)}<div class="mp-t"><b>${esc(t.title)}</b><small>${esc(ownerName(t))}</small></div><button id="mpPrev" aria-label="Previous">${ico('skip-back')}</button><button id="mpPlay" aria-label="Play or pause">${ico(this.audio.paused ? 'play' : 'pause')}</button><button id="mpNext" aria-label="Next">${ico('skip-forward')}</button><button id="mpX" aria-label="Close">${ico('x')}</button></div>`;
    refreshIcons();
    $('#mpOpen').onclick = e => { if (!e.target.closest('button')) render('track', t._id); };
    $('#mpPlay').onclick = () => this.toggle(); $('#mpNext').onclick = () => this.next(); $('#mpPrev').onclick = () => this.prev(); $('#mpX').onclick = () => this.stop();
    this.sync();
  },
  sync() {
    const a = this.audio, p = a.duration ? a.currentTime / a.duration : 0, t = this.track; if (!t) return;
    const b = $('#mpBar'); if (b) b.style.width = p * 100 + '%';
    document.querySelectorAll(`.wf[data-t="${t._id}"]`).forEach(w => { const bars = w.children, n = Math.round(p * bars.length); for (let k = 0; k < bars.length; k++) bars[k].classList.toggle('on', k < n); });
    const tm = $('#trTime'); if (tm) tm.textContent = fmtDur(a.currentTime) + ' / ' + fmtDur(a.duration || t.duration);
    let changed = false; document.querySelectorAll('[data-pb]').forEach(b2 => { const ic = !a.paused && b2.dataset.pb === t._id ? 'pause' : 'play'; if (b2.dataset.ic !== ic) { b2.dataset.ic = ic; b2.innerHTML = ico(ic); changed = true; } }); if (changed) refreshIconsSoon();
  }
};
let _ri; function refreshIconsSoon() { clearTimeout(_ri); _ri = setTimeout(refreshIcons, 60); }
Player.audio.addEventListener('timeupdate', () => { Player.sync(); const t = Player.track; if (t && !Player.counted && Player.audio.currentTime > 5) { Player.counted = true; fetch(`/api/music/${t._id}/play`, { method: 'POST', headers: headers(false) }).catch(() => {}); } });
Player.audio.addEventListener('ended', () => Player.next());
Player.audio.addEventListener('play', () => { const b = $('#mpPlay'); if (b) { b.innerHTML = ico('pause'); refreshIcons(); } Player.sync(); });
Player.audio.addEventListener('pause', () => { const b = $('#mpPlay'); if (b) { b.innerHTML = ico('play'); refreshIcons(); } Player.sync(); });
const waveHtml = t => { const p = (t.peaks && t.peaks.length) ? t.peaks : Array.from({ length: 56 }, (_, k) => 0.25 + 0.5 * Math.abs(Math.sin((k + (t._id || '1').charCodeAt(5 % (t._id || 'x').length)) * 0.7))); return `<div class="wf" data-t="${t._id}">${p.map(v => `<i style="height:${Math.max(8, Math.round(v * 100))}%"></i>`).join('')}</div>`; };
function wireWaves(root) { root.querySelectorAll('.wf').forEach(w => w.onclick = e => { const r = w.getBoundingClientRect(), f = (e.clientX - r.left) / r.width, t = w.__t; const go = () => { const d = Player.audio.duration || t.duration; if (d) Player.audio.currentTime = f * d; }; if (Player.track?._id === t._id) go(); else { Player.play(t, [t]); Player.audio.addEventListener('loadedmetadata', go, { once: true }); } }); }
function trackRow(t, queue, i) {
  return `<div class="tr" data-tr="${t._id}">${i !== undefined ? `<span class="rk">${i + 1}</span>` : ''}${coverOf(t)}<div class="tr-t"><b>${esc(t.title)}</b><small>${esc(ownerName(t))} · ${t.plays || 0} plays · ${t.likesCount || 0} ♥${t.duration ? ' · ' + fmtDur(t.duration) : ''}</small></div><button class="round tr-play" data-pb="${t._id}" aria-label="Play">${ico('play')}</button></div>`;
}
function wireTracks(root) {
  root.querySelectorAll('.tr').forEach(row => {
    const id = row.dataset.tr, list = (root.__tracks && root.__tracks.length ? root.__tracks : [...root.querySelectorAll('.tr')].map(r => r.__t)).filter(Boolean);
    row.__t ||= (root.__tracks || []).find(t => t._id === id);
    row.querySelector('.tr-play').onclick = e => { e.stopPropagation(); const t = row.__t || list.find(x => x._id === id); if (!t) return; Player.track?._id === id ? Player.toggle() : Player.play(t, list); };
    row.onclick = () => render('track', id);
  });
}
const hydrate = (root, tracks) => { root.__tracks = tracks; root.querySelectorAll('.tr').forEach(r => r.__t = tracks.find(t => t._id === r.dataset.tr)); };

/* ---------- music: screens ---------- */
const GENRES = ['Afrobeats', 'Hip-hop', 'Gospel', 'R&B', 'Amapiano', 'Highlife', 'Pop', 'Other'];
screens.music = {
  html() { return `${titleBar('Music', `<button class="round bare" id="mUp" aria-label="Upload">${ico('plus')}</button>`)}<div class="seg wide" id="mTabs"><button class="on" data-t="charts">Charts</button><button data-t="new">New</button><button data-t="mine">My music</button><button data-t="pl">Playlists</button></div><div class="chip-row" id="mGenres"></div><div id="mBody"><div class="feed-loading">Loading…</div></div>`; },
  wire() {
    $('#back').onclick = back; $('#mUp').onclick = () => render('musicUpload'); const body = $('#mBody'); let tab = 'charts', genre = '';
    const list = (tracks, ranked) => { body.innerHTML = tracks.length ? tracks.map((t, i) => trackRow(t, tracks, ranked ? i : undefined)).join('') : empty('Nothing here yet.'); hydrate(body, tracks); wireTracks(body); refreshIcons(); Player.sync(); };
    async function load() {
      body.innerHTML = '<div class="feed-loading">Loading…</div>'; $('#mGenres').style.display = tab === 'new' ? 'flex' : 'none';
      try {
        if (tab === 'charts') list((await api('/api/music/charts')).tracks, true);
        else if (tab === 'new') list((await api('/api/music' + (genre ? '?genre=' + encodeURIComponent(genre) : ''))).tracks);
        else if (tab === 'mine') { if (!needLogin()) return; await loadMe(); list((await api('/api/music?owner=' + meUser._id)).tracks); }
        else { if (!needLogin()) return; const { playlists } = await api('/api/music/playlists/mine'); body.innerHTML = `<button class="outline-btn" id="newPl">${ico('plus')}New playlist</button>${playlists.length ? playlists.map(p => `<div class="lb-row" data-pl="${p._id}"><div class="cv-img ph sm">${ico('list-music')}</div><b>${esc(p.name)}<small class="muted"> ${p.tracks.length} tracks</small></b></div>`).join('') : empty('No playlists yet.')}`; refreshIcons(); $('#newPl').onclick = () => newPlaylist(load); body.querySelectorAll('[data-pl]').forEach(e => e.onclick = () => render('playlist', e.dataset.pl)); }
      } catch (e) { errBox(body, e); }
    }
    $('#mGenres').innerHTML = ['All', ...GENRES].map(g => `<button class="chip ${g === 'All' ? 'on' : ''}" data-g="${g === 'All' ? '' : g}">${g}</button>`).join('');
    document.querySelectorAll('#mGenres .chip').forEach(b => b.onclick = () => { genre = b.dataset.g; document.querySelectorAll('#mGenres .chip').forEach(x => x.classList.toggle('on', x === b)); load(); });
    document.querySelectorAll('#mTabs button').forEach(b => b.onclick = () => { tab = b.dataset.t; document.querySelectorAll('#mTabs button').forEach(x => x.classList.toggle('on', x === b)); load(); });
    load();
  }
};
function newPlaylist(done) {
  if (!needLogin()) return; sheet(`<h3 class="sh-title">New playlist</h3><input id="plName" class="sh-in" maxlength="60" placeholder="Playlist name"><button class="purchase" id="plGo">Create</button>`);
  $('#plGo').onclick = async () => { try { await api('/api/music/playlists', 'POST', { name: $('#plName').value }); closeSheets(); done && done(); } catch (e) { notify(e.message); } };
}
async function addToPlaylist(trackId) {
  if (!needLogin()) return; const { playlists } = await api('/api/music/playlists/mine');
  sheet(`<h3 class="sh-title">Add to playlist</h3>${playlists.map(p => `<button class="ct" data-p="${p._id}"><div class="cv-img ph sm">${ico('list-music')}</div><span><b>${esc(p.name)}</b><small>${p.tracks.length} tracks</small></span></button>`).join('') || '<p class="muted">No playlists yet.</p>'}<button class="outline-btn" id="plNew">${ico('plus')}New playlist</button>`);
  document.querySelectorAll('.ct[data-p]').forEach(b => b.onclick = async () => { try { await api(`/api/music/playlists/${b.dataset.p}/tracks`, 'POST', { trackId }); closeSheets(); notify('Added'); } catch (e) { notify(e.message); } });
  $('#plNew').onclick = () => newPlaylist(() => addToPlaylist(trackId));
}
function reportTrackSheet(t) {
  if (!needLogin()) return;
  sheet(`<h3 class="sh-title">Report track</h3><div class="seg wide" id="rtTabs"><button class="on" data-k="general">Report</button><button data-k="copyright">Copyright claim</button></div><div id="rtBody"></div>`);
  let kind = 'general';
  const paint = () => { $('#rtBody').innerHTML = kind === 'general' ? `<textarea id="rtReason" class="sh-text" maxlength="500" placeholder="What's wrong with this track?"></textarea><button class="purchase" id="rtGo">Submit report</button>` : `<p class="muted pad2">Use this if this track uses audio you own. Your details are only seen by moderators.</p><input id="cName" class="sh-in" placeholder="Your full name" maxlength="80"><input id="cMail" class="sh-in" type="email" placeholder="Your email" maxlength="120"><textarea id="cDetail" class="sh-text" maxlength="1000" placeholder="Describe the work you own and where the original is published (min 20 characters)"></textarea><button class="purchase" id="rtGo">Send copyright claim</button>`;
    $('#rtGo').onclick = async () => { try { const body = { targetType: 'track', trackId: t._id, category: kind }; if (kind === 'general') body.reason = $('#rtReason').value; else { body.reason = 'Copyright claim'; body.claimant = { name: $('#cName').value, email: $('#cMail').value, detail: $('#cDetail').value }; } await api('/api/safety/reports', 'POST', body); closeSheets(); notify('Report sent. Thank you.'); } catch (e) { notify(e.message); } }; };
  document.querySelectorAll('#rtTabs button').forEach(b => b.onclick = () => { kind = b.dataset.k; document.querySelectorAll('#rtTabs button').forEach(x => x.classList.toggle('on', x === b)); paint(); }); paint();
}
screens.track = {
  html() { return `${titleBar('Track')}<div id="trBody"><div class="feed-loading">Loading…</div></div>`; },
  async wire(id) {
    $('#back').onclick = back; const body = $('#trBody'); let t;
    try { t = (await api('/api/music/' + id)).track; } catch (e) { return errBox(body, e); }
    await loadMe(); const mine = meUser && t.owner && String(t.owner._id) === String(meUser._id);
    body.innerHTML = `<div class="tr-hero">${coverOf(t)}<h2>${esc(t.title)}</h2><p class="muted"><a class="hl" id="trOwner">${esc(ownerName(t))}</a> · ${esc(t.kind)}${t.genre ? ' · ' + esc(t.genre) : ''}</p>${waveHtml(t)}<div class="tr-ctl"><small id="trTime">0:00 / ${fmtDur(t.duration)}</small><button class="round big" data-pb="${t._id}" id="trPlay" aria-label="Play">${ico('play')}</button><span class="muted"><span id="trPlays">${t.plays || 0}</span> plays</span></div><div class="tr-acts"><button class="pill ${t.liked ? 'liked' : ''}" id="trLike">${ico('heart')}<span>${t.likesCount || 0}</span></button><button class="pill" id="trAdd">${ico('list-plus')}Playlist</button><button class="pill" id="trShare">${ico('share-2')}Share</button>${mine ? `<button class="pill" id="trDel">${ico('trash-2')}</button>` : `<button class="pill" id="trRep">${ico('flag')}</button>`}</div>${t.description ? `<p class="tr-desc">${rich(t.description)}</p>` : ''}</div>`;
    const wf = qs('.wf', body); wf.__t = t; wireWaves(body); refreshIcons();
    $('#trPlay').onclick = () => Player.track?._id === t._id ? Player.toggle() : Player.play(t, [t]);
    $('#trOwner').onclick = () => render('user', t.owner.username);
    $('#trLike').onclick = async () => { if (!needLogin()) return; try { const d = await api(`/api/music/${t._id}/like`, 'POST'); $('#trLike').classList.toggle('liked', d.liked); $('#trLike span').textContent = d.likesCount; } catch (e) { notify(e.message); } };
    $('#trAdd').onclick = () => addToPlaylist(t._id).catch(e => notify(e.message));
    $('#trShare').onclick = () => { const u = location.origin + '/track/' + t._id; navigator.share ? navigator.share({ title: t.title, url: u }).catch(() => {}) : navigator.clipboard?.writeText(u).then(() => notify('Link copied')); };
    $('#trDel')?.addEventListener('click', async () => { if (!confirm('Delete this track?')) return; try { await api('/api/music/' + t._id, 'DELETE'); if (Player.track?._id === t._id) Player.stop(); notify('Deleted'); render('music'); } catch (e) { notify(e.message); } });
    $('#trRep')?.addEventListener('click', () => reportTrackSheet(t)); Player.sync();
  }
};
screens.playlist = {
  html() { return `${titleBar('Playlist')}<div id="plBody"><div class="feed-loading">Loading…</div></div>`; },
  async wire(id) {
    $('#back').onclick = back; const body = $('#plBody'); let p;
    try { p = (await api('/api/music/playlists/' + id)).playlist; } catch (e) { return errBox(body, e); }
    await loadMe(); const mine = meUser && String(p.owner._id) === String(meUser._id);
    body.innerHTML = `<div class="tr-hero"><div class="cv-img ph">${ico('list-music')}</div><h2>${esc(p.name)}</h2><p class="muted">${p.tracks.length} tracks · by ${esc(p.owner.username)}</p><div class="tr-acts"><button class="pill" id="plPlay">${ico('play')}Play all</button>${mine ? `<button class="pill" id="plDel">${ico('trash-2')}Delete</button>` : ''}</div></div>${p.tracks.length ? p.tracks.map((t, i) => `<div class="pl-row">${trackRow(t, p.tracks, i)}${mine ? `<button class="round bare" data-rm="${t._id}" aria-label="Remove">${ico('x')}</button>` : ''}</div>`).join('') : empty('This playlist is empty.')}`;
    hydrate(body, p.tracks); wireTracks(body); refreshIcons(); Player.sync();
    $('#plPlay').onclick = () => p.tracks.length && Player.play(p.tracks[0], p.tracks);
    $('#plDel')?.addEventListener('click', async () => { if (!confirm('Delete this playlist?')) return; try { await api('/api/music/playlists/' + id, 'DELETE'); render('music'); } catch (e) { notify(e.message); } });
    body.querySelectorAll('[data-rm]').forEach(b => b.onclick = async () => { try { await api(`/api/music/playlists/${id}/tracks/${b.dataset.rm}`, 'DELETE'); render('playlist', id); } catch (e) { notify(e.message); } });
  }
};
const AUDIO_OK = /^audio\/(mpeg|mp3|wav|x-wav|mp4|x-m4a|aac|ogg|webm)$/;
function xhrUpload(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const fd = new FormData(); fd.append('file', file); const x = new XMLHttpRequest(); x.open('POST', url);
    Object.entries(headers(false)).forEach(([k, v]) => x.setRequestHeader(k, v));
    x.upload.onprogress = e => e.lengthComputable && onProgress(e.loaded / e.total);
    x.onload = () => { let d = {}; try { d = JSON.parse(x.responseText); } catch (_) {} x.status < 300 ? resolve(d) : reject(new Error(d.error || 'Upload failed')); };
    x.onerror = () => reject(new Error('Network error during upload')); x.send(fd);
  });
}
// Reads the audio in the browser to get its length and a 60-bar waveform (no server work needed).
async function analyzeAudio(file) {
  let duration = 0, peaks = [];
  try {
    if (file.size <= 25 * 1024 * 1024) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)(); const buf = await ctx.decodeAudioData(await file.arrayBuffer()); duration = buf.duration;
      const ch = buf.getChannelData(0), n = 60, size = Math.floor(ch.length / n), step = Math.max(1, Math.floor(size / 60));
      for (let i = 0; i < n; i++) { let m = 0; for (let j = i * size; j < (i + 1) * size; j += step) m = Math.max(m, Math.abs(ch[j])); peaks.push(m); }
      const top = Math.max(...peaks) || 1; peaks = peaks.map(v => Math.round((v / top) * 100) / 100); ctx.close();
    }
  } catch (_) { peaks = []; }
  if (!duration) { const a = new Audio(URL.createObjectURL(file)); await new Promise(r => { a.onloadedmetadata = r; a.onerror = r; setTimeout(r, 4000); }); duration = isFinite(a.duration) ? a.duration : 0; }
  return { duration, peaks };
}
screens.musicUpload = {
  html() { return `${titleBar('Upload music')}<div class="edit-wrap up-wrap"><button class="outline-btn" id="upAudioBtn">${ico('file-audio')}<span id="upAudioName">Choose audio (MP3, WAV, M4A · max 30 MB)</span></button><input type="file" id="upAudio" accept="audio/*" hidden><div class="up-cover"><div class="cv-img ph" id="upCoverPrev">${ico('image')}</div><button class="outline-btn" id="upCoverBtn">Add cover art</button><input type="file" id="upCover" accept="image/jpeg,image/png,image/webp" hidden></div><label>Title</label><input id="upTitle" maxlength="120" placeholder="Track title"><label>Type</label><select id="upKind"><option value="original">Original song</option><option value="cover">Cover (I sing someone else's song)</option><option value="mix">Mix / DJ set</option><option value="other">Other</option></select><label>Genre</label><select id="upGenre"><option value="">Choose…</option>${GENRES.map(g => `<option>${g}</option>`).join('')}</select><label>Description</label><textarea id="upDesc" rows="3" maxlength="1000" placeholder="Tell people about it (optional)"></textarea><label class="chk"><input type="checkbox" id="upRights"> I own the rights to this audio or have permission to share it. I understand copyright complaints can remove it and repeat violations can suspend my account.</label><div class="bar" id="upBar" style="display:none"><i></i></div><button class="save-avatar" id="upGo">Publish</button></div>`; },
  wire() {
    $('#back').onclick = back; let audio = null, cover = null, info = null;
    $('#upAudioBtn').onclick = () => $('#upAudio').click(); $('#upCoverBtn').onclick = () => $('#upCover').click();
    $('#upAudio').onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      if (!AUDIO_OK.test(f.type)) return notify('Choose an MP3, WAV, M4A, AAC or OGG file'); if (f.size > 30 * 1024 * 1024) return notify('Audio must be 30 MB or smaller');
      audio = f; $('#upAudioName').textContent = f.name; if (!$('#upTitle').value) $('#upTitle').value = f.name.replace(/\.[^.]+$/, '').slice(0, 120);
      info = null; analyzeAudio(f).then(r => info = r);
    };
    $('#upCover').onchange = e => { const f = e.target.files[0]; if (!f) return; if (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size > 8 * 1024 * 1024) return notify('Cover must be a JPG, PNG or WebP under 8 MB'); cover = f; $('#upCoverPrev').outerHTML = `<img class="cv-img" id="upCoverPrev" src="${URL.createObjectURL(f)}" alt="">`; };
    $('#upGo').onclick = async () => {
      if (!audio) return notify('Choose an audio file'); const title = $('#upTitle').value.trim(); if (!title) return notify('Add a title'); if (!$('#upRights').checked) return notify('Confirm that you have the rights to share this audio');
      const btn = $('#upGo'), bar = $('#upBar'); btn.disabled = true; bar.style.display = 'block'; const fill = bar.firstElementChild;
      try {
        btn.textContent = 'Uploading audio…'; const a = await xhrUpload('/api/uploads/audio', audio, p => fill.style.width = p * 80 + '%');
        let coverUrl = ''; if (cover) { btn.textContent = 'Uploading cover…'; coverUrl = (await xhrUpload('/api/uploads/post-media', cover, p => fill.style.width = 80 + p * 15 + '%')).url; }
        if (!info) info = await analyzeAudio(audio); btn.textContent = 'Publishing…';
        const d = await api('/api/music', 'POST', { title, kind: $('#upKind').value, genre: $('#upGenre').value, description: $('#upDesc').value, audioUrl: a.url, coverUrl, duration: info.duration, peaks: info.peaks, rightsConfirmed: true });
        fill.style.width = '100%'; notify('Published!'); render('track', d.track._id);
      } catch (e) { notify(e.message); btn.disabled = false; btn.textContent = 'Publish'; bar.style.display = 'none'; }
    };
  }
};

/* ---------- communities ---------- */
screens.communities = {
  html() { return `${titleBar('Communities', `<button class="round bare" id="cmNew" aria-label="Create">${ico('plus')}</button>`)}<div class="seg wide" id="cmTabs"><button class="on" data-t="all">Discover</button><button data-t="mine">Joined</button></div><div class="search-pill s-in2">${ico('search')}<input id="cmQ" placeholder="Search teams, leagues, sports"></div><div id="cmBody"><div class="feed-loading">Loading…</div></div>`; },
  wire() {
    $('#back').onclick = back; let tab = 'all', timer; const body = $('#cmBody');
    async function load() {
      body.innerHTML = '<div class="feed-loading">Loading…</div>';
      try { if (tab === 'mine' && !token()) return body.innerHTML = empty('Log in to see your communities.'); const q = $('#cmQ').value.trim(); const { communities } = await api('/api/communities?' + (tab === 'mine' ? 'mine=1&' : '') + (q ? 'q=' + encodeURIComponent(q) : ''));
        body.innerHTML = communities.length ? communities.map(c => `<div class="lb-row" data-c="${esc(c.slug)}"><div class="cv-img ph sm">${ico('users')}</div><b>${esc(c.name)}<small class="muted"> ${esc(c.sport)}${c.sport ? ' · ' : ''}${c.membersCount} members</small></b></div>`).join('') : empty(tab === 'mine' ? 'You have not joined any communities yet.' : 'No communities found. Create the first one!');
        body.querySelectorAll('[data-c]').forEach(e => e.onclick = () => render('community', e.dataset.c)); refreshIcons();
      } catch (e) { errBox(body, e); }
    }
    $('#cmNew').onclick = () => { if (!needLogin()) return; sheet(`<h3 class="sh-title">Create a community</h3><input id="ncName" class="sh-in" maxlength="40" placeholder="Name (e.g. Enyimba Fans)"><input id="ncSport" class="sh-in" maxlength="30" placeholder="Sport (e.g. Football)"><textarea id="ncDesc" class="sh-text" maxlength="300" placeholder="What is this community about?"></textarea><button class="purchase" id="ncGo">Create</button>`); $('#ncGo').onclick = async () => { try { const d = await api('/api/communities', 'POST', { name: $('#ncName').value, sport: $('#ncSport').value, description: $('#ncDesc').value }); closeSheets(); render('community', d.community.slug); } catch (e) { notify(e.message); } }; };
    document.querySelectorAll('#cmTabs button').forEach(b => b.onclick = () => { tab = b.dataset.t; document.querySelectorAll('#cmTabs button').forEach(x => x.classList.toggle('on', x === b)); load(); });
    $('#cmQ').oninput = () => { clearTimeout(timer); timer = setTimeout(load, 350); }; load();
  }
};
screens.community = {
  html() { return `${titleBar('Community')}<div id="cBody"><div class="feed-loading">Loading…</div></div>`; },
  async wire(slug) {
    $('#back').onclick = back; const body = $('#cBody'); let d;
    try { d = await api('/api/communities/' + encodeURIComponent(slug)); } catch (e) { return errBox(body, e); }
    const c = d.community; let member = d.isMember;
    body.innerHTML = `<div class="tr-hero"><div class="cv-img ph">${ico('users')}</div><h2>${esc(c.name)}</h2><p class="muted">${esc(c.sport)}${c.sport ? ' · ' : ''}<span id="cMembers">${c.membersCount}</span> members</p>${c.description ? `<p class="tr-desc">${esc(c.description)}</p>` : ''}<div class="tr-acts"><button class="pill" id="cJoin"></button><button class="pill" id="cPost">${ico('square-pen')}Post here</button></div></div><div id="cFeed" class="dynamic-feed"><div class="feed-loading">Loading…</div></div>`;
    const paint = () => { $('#cJoin').innerHTML = member ? `${ico('check')}Joined` : `${ico('plus')}Join`; $('#cJoin').classList.toggle('liked', member); refreshIcons(); }; paint();
    $('#cJoin').onclick = async () => { if (!needLogin()) return; try { await api(`/api/communities/${slug}/${member ? 'leave' : 'join'}`, member ? 'DELETE' : 'POST'); member = !member; $('#cMembers').textContent = +$('#cMembers').textContent + (member ? 1 : -1); paint(); } catch (e) { notify(e.message); } };
    $('#cPost').onclick = () => { if (!needLogin()) return; if (!member) return notify('Join the community to post'); window.__postCommunity = c._id; window.__postSlug = c.slug; render('create'); };
    try { const { posts } = await api(`/api/communities/${slug}/posts`); const f = $('#cFeed'); f.innerHTML = posts.length ? posts.map(feedCard).join('') : empty('No posts yet. Start the conversation!'); wireFeed(f); refreshIcons(); } catch (e) { errBox($('#cFeed'), e); }
  }
};

/* ---------- opportunities ---------- */
const OPP = { trial: 'Trials', tournament: 'Tournaments', job: 'Jobs', sponsorship: 'Sponsorships', event: 'Events', education: 'Education', talent: 'Talent' };
const oppCard = o => `<div class="opp" data-o="${o._id}"><div class="opp-top"><span class="tag">${OPP[o.type] || o.type}</span>${o.promoted ? '<span class="tag gold">Promoted</span>' : ''}${o.status && o.status !== 'approved' ? `<span class="tag">${o.status}</span>` : ''}</div><b>${esc(o.title)}</b><small class="muted">${esc(o.location || 'Anywhere')}${o.deadline ? ' · closes ' + new Date(o.deadline).toLocaleDateString() : ''}${o.poster ? ' · @' + esc(o.poster.username) : ''}</small></div>`;
screens.opportunities = {
  html() { return `${titleBar('Opportunities', `<button class="round bare" id="opNew" aria-label="Post">${ico('plus')}</button>`)}<div class="seg wide" id="opTabs"><button class="on" data-t="all">Browse</button><button data-t="mine">Mine</button></div><div class="search-pill s-in2">${ico('search')}<input id="opQ" placeholder="Search by title or place"></div><div class="chip-row" id="opTypes"><button class="chip on" data-t="">All</button>${Object.entries(OPP).map(([k, v]) => `<button class="chip" data-t="${k}">${v}</button>`).join('')}</div><div id="opBody"><div class="feed-loading">Loading…</div></div>`; },
  wire() {
    $('#back').onclick = back; let tab = 'all', type = '', timer; const body = $('#opBody');
    async function load() {
      body.innerHTML = '<div class="feed-loading">Loading…</div>'; $('#opTypes').style.display = tab === 'all' ? 'flex' : 'none';
      try {
        if (tab === 'all') { const q = $('#opQ').value.trim(); const { opportunities } = await api(`/api/opportunities?${type ? 'type=' + type + '&' : ''}${q ? 'q=' + encodeURIComponent(q) : ''}`); body.innerHTML = opportunities.length ? opportunities.map(oppCard).join('') : empty('No opportunities right now. Check back soon or post one.'); }
        else { if (!needLogin()) return; const { posted, applied } = await api('/api/opportunities/mine'); body.innerHTML = `<h3 class="sec-title">Posted by me</h3>${posted.map(oppCard).join('') || empty('Nothing posted yet.')}<h3 class="sec-title">My applications</h3>${applied.filter(a => a.opportunity).map(a => oppCard({ ...a.opportunity, status: 'applied' })).join('') || empty('No applications yet.')}`; }
        body.querySelectorAll('[data-o]').forEach(e => e.onclick = () => render('opportunity', e.dataset.o));
      } catch (e) { errBox(body, e); }
    }
    $('#opNew').onclick = () => { if (!needLogin()) return; sheet(`<h3 class="sh-title">Post an opportunity</h3><select id="onType" class="sh-in">${Object.entries(OPP).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select><input id="onTitle" class="sh-in" maxlength="100" placeholder="Title"><input id="onLoc" class="sh-in" maxlength="80" placeholder="Location (city or Online)"><input id="onDead" class="sh-in" type="date"><input id="onLink" class="sh-in" placeholder="Link (https://…) optional"><textarea id="onDesc" class="sh-text" maxlength="2000" placeholder="Describe the opportunity and who it is for (min 20 characters)"></textarea><button class="purchase" id="onGo">Submit for review</button>`); $('#onGo').onclick = async () => { try { const d = await api('/api/opportunities', 'POST', { type: $('#onType').value, title: $('#onTitle').value, location: $('#onLoc').value, deadline: $('#onDead').value || undefined, link: $('#onLink').value, description: $('#onDesc').value }); closeSheets(); notify(d.message); tab = 'mine'; document.querySelectorAll('#opTabs button').forEach(x => x.classList.toggle('on', x.dataset.t === 'mine')); load(); } catch (e) { notify(e.message); } }; };
    document.querySelectorAll('#opTabs button').forEach(b => b.onclick = () => { tab = b.dataset.t; document.querySelectorAll('#opTabs button').forEach(x => x.classList.toggle('on', x === b)); load(); });
    document.querySelectorAll('#opTypes .chip').forEach(b => b.onclick = () => { type = b.dataset.t; document.querySelectorAll('#opTypes .chip').forEach(x => x.classList.toggle('on', x === b)); load(); });
    $('#opQ').oninput = () => { clearTimeout(timer); timer = setTimeout(load, 350); }; load();
  }
};
screens.opportunity = {
  html() { return `${titleBar('Opportunity')}<div id="opDetail"><div class="feed-loading">Loading…</div></div>`; },
  async wire(id) {
    $('#back').onclick = back; const body = $('#opDetail'); let d;
    try { d = await api('/api/opportunities/' + id); } catch (e) { return errBox(body, e); }
    const o = d.opportunity; await loadMe(); const mine = meUser && String(o.poster._id) === String(meUser._id);
    body.innerHTML = `<div class="opp-detail">${oppCard({ ...o, poster: null })}<h2>${esc(o.title)}</h2><p class="muted">Posted by <a class="hl" id="opBy">@${esc(o.poster.username)}</a>${vb(o.poster)} · ${o.applicationsCount} applied</p><p class="tr-desc">${rich(o.description)}</p>${o.link ? `<p><a class="hl" href="${esc(o.link)}" target="_blank" rel="noopener noreferrer">${esc(o.link)}</a></p>` : ''}${o.status === 'approved' ? (mine ? `<div class="tr-acts"><button class="pill" id="opApps">${ico('users')}View applicants</button><button class="pill" id="opClose">Close</button></div>` : `<button class="save-avatar" id="opApply" ${d.applied ? 'disabled' : ''}>${d.applied ? 'Applied ✓' : 'Apply now'}</button>`) : `<p class="muted">Status: ${o.status}${o.reviewNote ? ' — ' + esc(o.reviewNote) : ''}</p>`}<div id="opList"></div></div>`;
    $('#opBy').onclick = () => render('user', o.poster.username); refreshIcons();
    $('#opApply')?.addEventListener('click', () => { if (!needLogin()) return; sheet(`<h3 class="sh-title">Apply</h3><textarea id="apMsg2" class="sh-text" maxlength="1000" placeholder="Introduce yourself (10+ characters): position, experience, achievements…"></textarea><input id="apContact" class="sh-in" maxlength="120" placeholder="Phone or email the poster can reach you on"><button class="purchase" id="apGo2">Send application</button>`); $('#apGo2').onclick = async () => { try { await api(`/api/opportunities/${id}/apply`, 'POST', { message: $('#apMsg2').value, contact: $('#apContact').value }); closeSheets(); notify('Application sent'); render('opportunity', id); } catch (e) { notify(e.message); } }; });
    $('#opClose')?.addEventListener('click', async () => { try { await api(`/api/opportunities/${id}/close`, 'POST'); notify('Closed'); render('opportunities'); } catch (e) { notify(e.message); } });
    $('#opApps')?.addEventListener('click', async () => { try { const { applications } = await api(`/api/opportunities/${id}/applications`); $('#opList').innerHTML = applications.length ? applications.map(a => `<div class="ad-card"><b>@${esc(a.applicant.username)}${vb(a.applicant)}</b><small class="muted">${ago(a.createdAt)}${a.contact ? ' · ' + esc(a.contact) : ''}</small><p>${esc(a.message)}</p><button class="outline-btn" data-m="${esc(a.applicant.username)}">${ico('message-circle')}Message</button></div>`).join('') : empty('No applications yet.'); refreshIcons(); $('#opList').querySelectorAll('[data-m]').forEach(b => b.onclick = () => render('chat', b.dataset.m)); } catch (e) { notify(e.message); } });
  }
};

/* ---------- ads: manager, sponsored posts, Google AdSense ---------- */
screens.ads = {
  html() { return `${titleBar('Ads manager')}<div class="edit-wrap"><p class="muted">Promote your brand, club or event to Buzzer users. Every ad is reviewed before it runs.</p><label>Headline</label><input id="adTitle" maxlength="80"><label>Text</label><textarea id="adText" rows="3" maxlength="300"></textarea><label>Image (optional)</label><input type="file" id="adImg" accept="image/jpeg,image/png,image/webp"><label>Button text</label><input id="adCta" maxlength="24" value="Learn more"><label>Link (https://)</label><input id="adUrl" placeholder="https://"><label>Run for (days)</label><select id="adDays"><option>3</option><option selected>7</option><option>14</option><option>30</option></select><button class="save-avatar" id="adGo">Submit for review</button></div><h3 class="sec-title">My ads</h3><div id="adList"><div class="feed-loading">Loading…</div></div>`; },
  wire() {
    $('#back').onclick = back; const list = $('#adList');
    async function load() { try { const { ads } = await api('/api/ads/mine'); list.innerHTML = ads.length ? ads.map(a => `<div class="ad-card"><b>${esc(a.title)}</b><small class="muted"><span class="tag ${a.status === 'approved' ? 'gold' : ''}">${a.status}</span> ${a.impressions} views · ${a.clicks} clicks${a.endsAt ? ' · ends ' + new Date(a.endsAt).toLocaleDateString() : ''}</small>${a.reviewNote ? `<small class="muted">Note: ${esc(a.reviewNote)}</small>` : ''}${['approved', 'paused'].includes(a.status) ? `<div class="ad-act"><button data-s="${a.status === 'paused' ? 'approved' : 'paused'}" data-id="${a._id}">${a.status === 'paused' ? 'Resume' : 'Pause'}</button></div>` : ''}</div>`).join('') : empty('No ads yet.'); list.querySelectorAll('[data-s]').forEach(b => b.onclick = async () => { try { await api('/api/ads/' + b.dataset.id, 'PATCH', { status: b.dataset.s }); load(); } catch (e) { notify(e.message); } }); } catch (e) { errBox(list, e); } }
    $('#adGo').onclick = async () => {
      const btn = $('#adGo'); btn.disabled = true;
      try { let mediaUrl = ''; const f = $('#adImg').files[0]; if (f) { if (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size > 8 * 1024 * 1024) throw new Error('Image must be JPG, PNG or WebP under 8 MB'); mediaUrl = (await xhrUpload('/api/uploads/post-media', f, () => {})).url; }
        await api('/api/ads', 'POST', { title: $('#adTitle').value, text: $('#adText').value, mediaUrl, ctaLabel: $('#adCta').value, ctaUrl: $('#adUrl').value, days: +$('#adDays').value }); notify('Submitted. We will review it shortly.'); ['adTitle', 'adText', 'adUrl'].forEach(i => $('#' + i).value = ''); load(); }
      catch (e) { notify(e.message); } finally { btn.disabled = false; }
    };
    load();
  }
};
let adCfg = null;
window.injectAds = async function (t) {
  try {
    const posts = [...t.querySelectorAll('.feed-post')]; if (posts.length < 3) return;
    const [{ ad }, cfg] = await Promise.all([api('/api/ads/serve'), adCfg || api('/api/ads/config')]); adCfg = cfg;
    if (ad) {
      posts[2].insertAdjacentHTML('afterend', `<article class="feed-post sponsored" data-ad="${ad._id}"><div class="sp-head"><small>Sponsored</small></div>${ad.mediaUrl ? `<img class="sp-img" src="${esc(ad.mediaUrl)}" alt="" loading="lazy">` : ''}<div class="sp-body"><b>${esc(ad.title)}</b>${ad.text ? `<p>${esc(ad.text)}</p>` : ''}<button class="sp-cta">${esc(ad.ctaLabel)}</button></div></article>`);
      const el = qs(`[data-ad="${ad._id}"]`, t); fetch(`/api/ads/${ad._id}/impression`, { method: 'POST' }).catch(() => {});
      qs('.sp-cta', el).onclick = () => { fetch(`/api/ads/${ad._id}/click`, { method: 'POST' }).catch(() => {}); window.open(ad.ctaUrl, '_blank', 'noopener,noreferrer'); };
    }
    if (cfg.adsense && posts.length >= 6) {
      if (!document.getElementById('adsense-js')) { const s = document.createElement('script'); s.id = 'adsense-js'; s.async = true; s.crossOrigin = 'anonymous'; s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(cfg.adsense.client); document.head.append(s); }
      posts[5].insertAdjacentHTML('afterend', `<div class="feed-post gads"><small class="muted">Advertisement</small><ins class="adsbygoogle" style="display:block" data-ad-client="${esc(cfg.adsense.client)}" data-ad-slot="${esc(cfg.adsense.slot)}" data-ad-format="auto" data-full-width-responsive="true"></ins></div>`);
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (_) {}
    }
  } catch (_) { /* ads are optional; never break the feed */ }
};

/* ---------- payment result ---------- */
screens.payResult = {
  html() { return `${titleBar('Payment')}<div class="pay-box" id="payBox"><div class="feed-loading">Confirming your payment…</div></div>`; },
  async wire(ref) {
    $('#back').onclick = () => render('home'); const box = $('#payBox');
    if (!ref) return box.innerHTML = empty('No payment reference found.');
    try { const d = await api('/api/payments/verify?reference=' + encodeURIComponent(ref)); await loadMe();
      box.innerHTML = d.status === 'success' ? `<div class="pay-ok">${ico('badge-check')}<h2>You're verified!</h2><p class="muted">Your ${esc(d.plan)} badge is active for 30 days.</p><button class="save-avatar" id="payGo">View profile</button></div>` : `<div class="pay-ok">${ico('clock')}<h2>Payment not confirmed yet</h2><p class="muted">If you were charged, your badge will appear within a few minutes.</p><button class="save-avatar" id="payGo">Back to profile</button></div>`;
      refreshIcons(); $('#payGo').onclick = () => render('profile'); }
    catch (e) { errBox(box, e); }
  }
};

/* ---------- start ---------- */
loadMe().then(updateBadges); connectStream(); fromLocation();
