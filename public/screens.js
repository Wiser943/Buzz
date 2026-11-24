/* Buzzer screens + SPA routing (loaded after app.js; wraps its globals). */
const MIN_KARMA_TO_COMMENT = 10, POINT_USD = 0.0817;
const $ = s => document.querySelector(s);
const ico = (n, c = '') => `<i data-lucide="${n}" class="${c}"></i>`;
const ago = d => { const s = (Date.now() - new Date(d)) / 1000; if (s < 3600) return Math.max(1, Math.floor(s / 60)) + ' min ago'; if (s < 86400) return Math.floor(s / 3600) + ' hours ago'; if (s < 2592000) return Math.floor(s / 86400) + ' days ago'; if (s < 31536000) return Math.floor(s / 2592000) + ' months ago'; return Math.floor(s / 31536000) + ' years ago'; };
const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : String(n);
const userAv = (u, c = '') => u?.avatarUrl ? `<img class="av ${c}" src="${esc(u.avatarUrl)}" alt="">` : `<div class="av ${c}">${esc((u?.displayName || u?.username || 'B')[0].toUpperCase())}</div>`;
const rich = t => esc(t).replace(/(https?:\/\/[^\s<]+)/g, '<a class="hl" href="$1" target="_blank" rel="noopener noreferrer">$1</a>').replace(/(^|\s)(#\w+)/g, '$1<span class="hl">$2</span>');
const vb = u => u?.isVerified ? ico('badge-check', 'vbadge') : '';
const myName = () => localStorage.getItem('buzzerUsername') || '';
const back = () => history.length > 1 ? history.back() : render('home');
let meUser = null, meStats = { followers: 0, following: 0 };
async function loadMe() { if (!token()) return null; try { const r = await fetch('/api/profile/me', { headers: headers(false) }); if (!r.ok) return null; const d = await r.json(); meUser = d.user; meStats = d.stats; return d; } catch { return null; } }
async function postsOf(username) { try { const d = await (await fetch('/api/posts?limit=50')).json(); return (d.posts || []).filter(p => p.author?.username === username); } catch { return []; } }

/* ---------- sheets ---------- */
function closeSheets() { document.querySelectorAll('.bz-layer').forEach(e => e.remove()); }
function sheet(html, cls = '') {
  closeSheets(); const l = document.createElement('div'); l.className = 'bz-layer';
  l.innerHTML = `<div class="bz-back"></div><div class="bz-sheet ${cls}"><div class="sheet-handle"></div>${html}</div>`;
  document.body.append(l); l.querySelector('.bz-back').onclick = closeSheets; refreshIcons(); requestAnimationFrame(() => l.classList.add('open')); return l;
}
const item = (id, icon, label, red) => `<button class="sh-item${red ? ' red' : ''}" id="${id}">${ico(icon)}<span>${label}</span></button>`;
function shareProfile(u = myName()) { const url = location.origin + '/u/' + u; navigator.share ? navigator.share({ title: 'Buzzer profile', url }).catch(() => {}) : navigator.clipboard?.writeText(url).then(() => notify('Profile link copied')); }
function ownMenu() {
  sheet(`<div class="sh-pair"><button id="mShare" class="sh-tile">${ico('share')}<small>Share Profile</small></button><button id="mRefer" class="sh-tile gold">${ico('hand-coins')}<small>Refer a Friend</small></button></div><div class="sh-group">${item('mEdit', 'square-pen', 'Edit Profile')}${item('mSet', 'settings', 'Settings')}</div><div class="sh-group">${item('mOut', 'log-out', 'Log Out', 1)}</div>`);
  $('#mShare').onclick = () => { closeSheets(); shareProfile(); };
  $('#mRefer').onclick = () => { closeSheets(); navigator.clipboard?.writeText(location.origin + '/invite/' + myName()); notify('Invite link copied'); };
  $('#mEdit').onclick = () => render('profileEdit'); $('#mSet').onclick = () => render('settings');
  $('#mOut').onclick = () => { ['buzzerToken', 'buzzerUsername', 'buzzerId', 'buzzerName'].forEach(k => localStorage.removeItem(k)); meUser = null; notify('Signed out'); render('home'); };
}

/* ---------- verification badges (purchase sheet) ---------- */
const PLANS = [
  { n: 'Creator Badge', c: 'green', tag: 'Grow your audience and earn through your content.', price: '₦7780.00/month', secs: [['Verified Creator Profile', ['Official Creator Badge', 'Increased profile credibility', 'Higher posting limits', 'Extended reels of up to three minutes']], ['Creator Earnings', ['Access to the Buzzer referral program', 'Earn rewards based on eligible content views', 'Create and monetize blog content', 'Access selected creator campaigns']]] },
  { n: 'Athlete Badge', c: 'blue', tag: 'Unlock opportunities and build your sports career.', price: '₦14500.00/month', secs: [['Verified Athlete Identity', ['Authentic Athlete Badge', 'Buzzer-approved profile', 'Digital Professional Sports CV', 'Credibility with scouts, clubs, and fans']], ['Opportunities', ['Apply for tryouts, showcases and tournaments', 'Access sports jobs, education and development programs', 'Receive priority access to selected Buzzer opportunities']]] }
];
function openPurchase(start = 0) {
  const planHtml = p => `<section class="plan ${p.c}"><h3>${p.n}</h3><p>${p.tag}</p><div class="price">From ${p.price}</div>${p.secs.map(([h, xs]) => `<h4>${h}</h4>${xs.map(x => `<div class="perk">${ico('check')}<span>${x}</span></div>`).join('')}`).join('')}</section>`;
  sheet(`<div class="wordmark">Buzzer</div><div class="pur-av">${userAv(meUser || { username: myName() }, 'lg')}</div><b class="pur-name">Sports Verified ${ico('badge-check', 'vbadge')}</b><div class="plans" id="plans">${PLANS.map(planHtml).join('')}</div><div class="dots" id="dots">${PLANS.map(() => '<i></i>').join('')}</div><button class="purchase" id="purBtn">${ico('badge-check')}Purchase</button>`, 'tall');
  const pl = $('#plans'), dots = [...document.querySelectorAll('#dots i')], btn = $('#purBtn');
  const sync = () => { const i = Math.round(pl.scrollLeft / pl.clientWidth); dots.forEach((d, k) => d.classList.toggle('on', k === i)); btn.className = 'purchase ' + PLANS[i].c; };
  pl.onscroll = sync; pl.scrollLeft = start * pl.clientWidth; sync();
  btn.onclick = async () => { if (!token()) return authOpen('login'); const plan = PLANS[Math.round(pl.scrollLeft / pl.clientWidth)].c === 'green' ? 'creator' : 'athlete'; btn.disabled = true; try { const d = await api('/api/payments/checkout', 'POST', { plan }); location.href = d.url; } catch (e) { btn.disabled = false; if (/not configured/i.test(e.message)) { try { await api('/api/safety/verification-request', 'POST', { plan }); closeSheets(); notify('Payments are not live yet. Your request was sent for review.'); } catch (x) { notify(x.message); } } else notify(e.message); } };
}

/* ---------- feed card ---------- */
const cardBody = (p, pills) => {
  const a = p.author || {}, mine = myName(), liked = (p.likes || []).includes(localStorage.getItem('buzzerId'));
  const media = p.media?.length ? `<div class="post-media-grid" data-open="${p._id}">${p.media.map(s => p.mediaType === 'video' ? `<video src="${esc(s)}" controls preload="metadata"></video>` : `<img src="${esc(s)}" alt="" loading="lazy">`).join('')}</div>` : '';
  const row = pills ? `<div class="pill-row"><button class="pill like-post ${liked ? 'liked' : ''}" data-id="${p._id}">${ico('zap')}<span>${p.likes?.length || 0}</span></button><button class="pill cmt-btn" data-id="${p._id}">${ico('message-circle')}${p.commentsCount ? `<span>${p.commentsCount}</span>` : ''}</button><span class="grow"></span><button class="pill repost" data-id="${p._id}">${ico('repeat-2')}<span>${p.repostsCount || ''}</span></button><button class="pill share-post" data-id="${p._id}">${ico('send')}</button></div>` : '';
  return `<div class="post-head"><div class="ph-av" data-user="${esc(a.username || '')}">${userAv(a)}</div><div class="ph-name"><b data-user="${esc(a.username || '')}">${esc(a.username || 'member')}${vb(a)}${a.username && a.username !== mine ? ` <button class="follow-link" data-follow="${esc(a.username)}">· Follow</button>` : ''}</b><small>${ago(p.createdAt)}</small></div><button class="more-btn" aria-label="More" data-post="${p._id}" data-author="${esc(a.username || '')}">${ico('ellipsis')}</button></div>${media}${row}${p.text ? `<p class="post-text" data-open="${p._id}">${rich(p.text)}</p>` : ''}`;
};
feedCard = function (p) {
  if (p.isRepost) { const o = p.repostOf; if (!o || o.status !== 'published') return ''; return `<article class="feed-post dynamic-post"><div class="repost-by" data-user="${esc(p.author?.username || '')}">${ico('repeat-2')}<span>${esc(p.author?.username || 'member')} reposted</span></div>${cardBody(o, true)}</article>`; }
  return `<article class="feed-post dynamic-post">${cardBody(p, true)}</article>`;
};
const promo = () => `<div class="promo"><button class="promo-x" aria-label="Close">${ico('x')}</button><h3>STAND OUT AS AN ATHLETE</h3><p>Showcase your profile and get highlighted with special badge for athletes.</p><button class="promo-btn">${ico('person-standing')}AthletePro</button></div>`;
async function toggleFollow(u, btn) {
  if (!token()) return authOpen('login');
  const following = btn.dataset.on === '1';
  try { const r = await fetch(`/api/profile/${encodeURIComponent(u)}/follow`, { method: following ? 'DELETE' : 'POST', headers: headers(false) }), d = await r.json(); if (!r.ok) throw new Error(d.error); btn.dataset.on = following ? '' : '1'; return !following; }
  catch (e) { notify(e.message); return following; }
}
wireFeed = function (t) {
  t.querySelectorAll('.like-post').forEach(b => b.onclick = async e => { e.stopPropagation(); if (!token()) return authOpen('login'); try { const r = await fetch(`/api/posts/${b.dataset.id}/like`, { method: 'POST', headers: headers(false) }), d = await r.json(); if (!r.ok) throw new Error(d.error); b.querySelector('span').textContent = d.likesCount; b.classList.toggle('liked', d.liked); } catch (x) { notify(x.message); } });
  t.querySelectorAll('.cmt-btn').forEach(b => b.onclick = () => render('post', b.dataset.id));
  t.querySelectorAll('.share-post').forEach(b => b.onclick = () => { const u = location.origin + '/post/' + b.dataset.id; navigator.share ? navigator.share({ url: u }).catch(() => {}) : navigator.clipboard?.writeText(u).then(() => notify('Link copied')); });
  t.querySelectorAll('.repost').forEach(b => b.onclick = async e => { e.stopPropagation(); if (!needLogin()) return; try { const d = await api(`/api/posts/${b.dataset.id}/repost`, 'POST'); b.classList.toggle('liked', d.reposted); b.querySelector('span').textContent = d.repostsCount || ''; notify(d.reposted ? 'Reposted to your profile' : 'Repost removed'); } catch (x) { notify(x.message); } });
  t.querySelectorAll('[data-open]').forEach(e => e.onclick = ev => { if (ev.target.tagName !== 'VIDEO' && ev.target.tagName !== 'A') render('post', e.dataset.open); });
  t.querySelectorAll('[data-user]').forEach(e => e.onclick = () => e.dataset.user && render('user', e.dataset.user));
  t.querySelectorAll('[data-follow]').forEach(b => b.onclick = async e => { e.stopPropagation(); const on = await toggleFollow(b.dataset.follow, b); b.textContent = on ? '· Following' : '· Follow'; });
  t.querySelectorAll('.promo-x').forEach(b => b.onclick = () => b.closest('.promo').remove());
  t.querySelectorAll('.promo-btn').forEach(b => b.onclick = () => openPurchase(1));
};
loadFeed = async function () {
  const t = $('#dynamicFeed'); if (!t) return;
  try { const r = await fetch('/api/posts?limit=20'), d = await r.json(); if (!r.ok) throw 0; const ps = d.posts || []; t.innerHTML = ps.length ? ps.map((p, i) => feedCard(p) + (i === 1 ? promo() : '')).join('') : '<div class="feed-empty">No posts yet. Be the first to share.</div>'; wireFeed(t); refreshIcons(); window.injectAds && injectAds(t); }
  catch { t.innerHTML = '<div class="feed-empty">Feed unavailable. Connect MongoDB to load posts.</div>'; }
};
loadProfileFeed = async function () { const t = $('#profileFeed'); if (!t) return; const ps = await postsOf(myName()); t.innerHTML = ps.length ? ps.map(feedCard).join('') : '<div class="feed-empty">No posts yet.</div>'; wireFeed(t); refreshIcons(); const c = $('#pillPosts'); if (c) c.textContent = 'Posts - ' + ps.length; const u = $('#stUp'); if (u) u.textContent = ps.length; };
views.home = views.home.replace('<small>See all ›</small>', '<button class="arena-x" aria-label="Close Arena TV">×</button>');
document.addEventListener('click', e => { if (e.target.closest('.arena-x')) { const h = e.target.closest('.block-heading'); h.nextElementSibling?.classList.contains('arena-row') && h.nextElementSibling.remove(); h.remove(); } });

/* ---------- screens ---------- */
const screens = {};
const pills = (a = 0, c = 0, r = 0, b = 0) => `<div class="profile-pills"><button class="on" id="pillPosts">Posts - ${a}</button><button>Comments - ${c}</button><button>Reels - ${r}</button><button>Blogs - ${b}</button></div>`;
const topline = tab => `<div class="profile-topline"><div class="seg"><button data-go="profile" class="${tab === 'p' ? 'on' : ''}">Profile</button><button data-go="points" class="${tab === 'q' ? 'on' : ''}">Points</button></div><button class="gopro" id="goPro">${ico('badge-check')}GoPro</button><button class="round" id="tShare">${ico('share-2')}</button><button class="round" id="tMenu">${ico('menu')}</button></div>`;
function wireTop() { document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => render(b.dataset.go)); $('#goPro').onclick = () => openPurchase(0); $('#tShare').onclick = () => shareProfile(); $('#tMenu').onclick = ownMenu; }
const composerRow = () => `<div class="mini-composer" id="miniComposer">${userAv(meUser || { username: myName() }, 'sm')}<div>What's on your mind?</div></div>`;

screens.profile = {
  html() { const un = myName(), nm = localStorage.getItem('buzzerName') || un; return `${topline('p')}${sessionStorage.getItem('vbX') ? '' : `<div class="vbanner" id="vBanner"><button class="vx" id="vX">${ico('x')}</button>${ico('badge-check', 'big')}<h3>Sports Verified, get verified badge</h3><p>Help followers feel more confident messaging you from your ads.</p><button id="vUp">Upgrade Now</button></div>`}<div class="p-hero"><div class="av-wrap" id="avWrap">${userAv({ username: nm }, 'xl')}</div><div class="p-names"><h2 id="pName">${esc(nm)}</h2><p>@${esc(un)}</p></div></div><input type="file" id="avFile" accept="image/jpeg,image/png,image/webp,image/gif" hidden><div class="p-stats"><span><b id="stUp">0</b> uploads</span><span><b id="stFo">0</b> followers</span><span><b id="stFg">0</b> following</span></div><div class="p-cards"><div class="karma-card2">${ico('shield-half')}<div><b>Newbie</b><small id="karmaTxt">Level 1 · 0 Karma</small></div></div><div class="opp-card"><div><b>Opportunities</b><small>Explore. Join. Grow.</small></div>${ico('goal')}</div></div><div class="pro-card"><div><b>Professional Dashboard</b><small>Turn your passion into rewards</small></div><button id="activatePro">Activate</button></div><p class="p-bio" id="pBio"></p>${pills()}${composerRow()}<div id="profileFeed" class="dynamic-feed"></div>`; },
  async wire() {
    wireTop(); $('#vX')?.addEventListener('click', () => { sessionStorage.setItem('vbX', '1'); $('#vBanner').remove(); }); $('#vUp')?.addEventListener('click', () => openPurchase(0));
    $('#activatePro').onclick = () => notify('Professional Dashboard is coming soon'); $('#miniComposer').onclick = () => render('create');
    loadProfileFeed();
    const d = await loadMe(); if (!d || currentView !== 'profile') return;
    $('#avWrap').innerHTML = `${userAv(d.user, 'xl')}<button class="avatar-add" id="addAv" aria-label="Change photo">${ico('plus')}</button>`; refreshIcons();
    $('#pName').textContent = d.user.displayName; $('#stFo').textContent = fmt(d.stats.followers); $('#stFg').textContent = fmt(d.stats.following); $('#karmaTxt').textContent = `Level 1 · ${d.user.karma || 0} Karma`; $('#pBio').textContent = d.user.bio || '';
    localStorage.setItem('buzzerName', d.user.displayName);
    $('#addAv').onclick = () => $('#avFile').click();
    $('#avFile').onchange = async e => { const f = e.target.files[0]; if (!f) return; const fd = new FormData(); fd.append('file', f); notify('Uploading photo…'); try { const r = await fetch('/api/uploads/avatar', { method: 'POST', headers: headers(false), body: fd }), j = await r.json(); if (!r.ok) throw new Error(j.error); notify('Photo updated'); render('profile'); } catch (x) { notify(x.message); } };
  }
};
screens.profileEdit = {
  html() { return `<div class="sub-head"><button class="round bare" id="back">${ico('arrow-left')}</button><b>Edit Profile</b><span></span></div><div class="edit-wrap"><div class="av-wrap" id="eAv">${userAv(meUser || { username: myName() }, 'xl')}</div><button class="outline-btn" id="chPhoto">Change photo</button><input type="file" id="avFile" accept="image/jpeg,image/png,image/webp,image/gif" hidden><label>Display name</label><input id="eName" maxlength="60" value="${esc(meUser?.displayName || localStorage.getItem('buzzerName') || '')}"><label>Bio</label><textarea id="eBio" maxlength="300" rows="4">${esc(meUser?.bio || '')}</textarea><button class="save-avatar" id="eSave">Save changes</button></div>`; },
  wire() {
    $('#back').onclick = back; $('#chPhoto').onclick = () => $('#avFile').click();
    $('#avFile').onchange = async e => { const f = e.target.files[0]; if (!f) return; const fd = new FormData(); fd.append('file', f); notify('Uploading photo…'); try { const r = await fetch('/api/uploads/avatar', { method: 'POST', headers: headers(false), body: fd }), j = await r.json(); if (!r.ok) throw new Error(j.error); if (meUser) meUser.avatarUrl = j.url; $('#eAv').innerHTML = userAv({ avatarUrl: j.url }, 'xl'); notify('Photo updated'); } catch (x) { notify(x.message); } };
    $('#eSave').onclick = async () => { try { const r = await fetch('/api/profile/me', { method: 'PATCH', headers: headers(), body: JSON.stringify({ displayName: $('#eName').value.trim(), bio: $('#eBio').value.trim() }) }), j = await r.json(); if (!r.ok) throw new Error(j.error); meUser = { ...meUser, ...j.user }; localStorage.setItem('buzzerName', j.user.displayName); notify('Profile saved'); render('profile'); } catch (x) { notify(x.message); } };
    if (!meUser) loadMe().then(() => currentView === 'profileEdit' && render('profileEdit'));
  }
};
screens.points = {
  html() {
    const bal = Number(localStorage.getItem('buzzerPoints') || 0);
    return `${topline('q')}<div class="pt-user">${userAv(meUser || { username: myName() }, 'md')}<div><b>${esc(myName())}</b><small>ID: <span id="ptId">…</span> <button class="copy" id="ptCopy">${ico('copy')}</button></small></div></div><div class="claim"><div class="claim-ico">${ico('zap')}</div><div class="claim-txt"><b>Claim in progress…</b><small>Stay in the app 60s to claim 0.5 points.</small><div class="bar"><i id="claimBar"></i></div></div><div class="coin big">B</div></div><div class="pt-balance"><small class="cap">TOTAL BALANCE</small><div class="num"><span id="ptBal">${bal.toFixed(2)}</span> <small>Points</small></div><small>≈ <span id="ptUsd">${(bal * POINT_USD).toFixed(2)}</span> USD</small></div><div class="pt-actions"><button id="ptSend">${ico('upload')}<span>Send</span></button><button id="ptEarn">${ico('coins')}<span>Earn</span></button></div><div class="pt-note">${ico('info')}<p>Buzzer Points are part of the evolving ecosystem and will gain more value over time. They are currently not withdrawable or available for sale.</p></div><div class="pt-phase"><small class="cap">CURRENT PHASE:</small><b>📌 Phase 2: App Points</b><p>Collect points now and receive a 50% bonus when converting them to crypto before this phase ends!</p></div><small class="cap pad">NEXT PHASES:</small><div class="pt-next"><div><b>Phase 3: App-Crypto Wallet</b><small>All existing users will receive a 30% coin bonus before the official coin sale begins!</small></div><span>${ico('calendar')} Nov 30, 2026</span></div><div class="pt-next"><div><b>Phase 4: Pre Sale | Pre-CEX</b><small>All existing users will receive a 30% coin bonus before the official coin sale begins!</small></div><span>${ico('calendar')} Dec 31, 2026</span></div>`;
  },
  async wire() {
    wireTop(); $('#ptSend').onclick = $('#ptEarn').onclick = () => notify('Coming soon');
    const d = await loadMe(); const id = (d?.user?._id || d?.user?.id || localStorage.getItem('buzzerId') || '').toString().toUpperCase().padEnd(16, '0').slice(-16).match(/.{4}/g)?.join('-') || '';
    if ($('#ptId')) $('#ptId').textContent = id; $('#ptCopy').onclick = () => navigator.clipboard?.writeText(id).then(() => notify('ID copied'));
    const t0 = Date.now(), iv = setInterval(() => { const bar = $('#claimBar'); if (!bar || currentView !== 'points') return clearInterval(iv); const p = Math.min(1, (Date.now() - t0) / 60000); bar.style.width = p * 100 + '%'; if (p >= 1) { clearInterval(iv); const b = Number(localStorage.getItem('buzzerPoints') || 0) + 0.5; localStorage.setItem('buzzerPoints', b); $('#ptBal').textContent = b.toFixed(2); $('#ptUsd').textContent = (b * POINT_USD).toFixed(2); notify('0.5 points claimed (local preview)'); } }, 500);
  }
};
screens.explore = {
  html() {
    const news = [['LATEST UPDATE', "Inside Buzzer's Latest Update (and Why It Changes How You Use the App)"], ['FOUR GROUPS, TWO THROUGH', 'How Does the CAF Confederation Cup Work?'], ['CLIMB TO THE FINAL', 'How Does the FIFA Intercontinental Cup Work?']];
    const head = (i, t) => `<div class="sec-head">${ico(i)}<b>${t}</b><button class="see-all">See All ${ico('chevron-right')}</button></div>`;
    return `<div class="x-head"><h1>Explore</h1><button class="ads-btn" id="adsBtn">${ico('megaphone')}Ads</button></div><div class="search-pill">${ico('search')}<input id="exploreSearch" placeholder="Search"></div><div class="chip-row"><button class="chip" data-r="sports">${ico('trophy')}Sports</button><button class="chip" data-r="music">${ico('music')}Music</button><button class="chip" data-r="communities">${ico('users')}Communities</button><button class="chip" data-r="opportunities">${ico('briefcase')}Opportunities</button><button class="chip" data-r="messages">${ico('message-circle')}Messages</button></div><section class="ex-sec">${head('newspaper', 'Explore News')}<div class="hscroll">${news.map(n => `<article class="news-card"><div class="nc-img">${ico('newspaper')}</div><div class="nc-body"><small>${n[0]}</small><b>${n[1]}</b></div></article>`).join('')}</div></section><section class="ex-sec">${head('ticket', 'Arena TV')}<div class="hscroll">${[['EQUUS TELEVISION LIVE 24/7', '24/7<br>EXCLUSIVELY & FREE<br>ON THE BUZZER APP'], ['National Day Cup 2026', 'NATIONAL DAY<br>CUP 2026']].map(c => `<div class="arena-big"><div class="ab-in"><strong>${c[1]}</strong><span class="watch">● Watch Live</span></div><div class="ab-t">${c[0]}</div><small>buzzer_fan_official</small></div>`).join('')}</div></section><section class="ex-sec">${head('clapperboard', 'Reels')}<div class="hscroll">${[1, 2, 3].map(() => `<div class="reel-tile">${ico('play')}</div>`).join('')}</div></section>`;
  },
  wire() { document.querySelectorAll('.chip').forEach(b => b.onclick = () => render(b.dataset.r)); $('#adsBtn').onclick = () => render('ads'); $('#exploreSearch').onkeydown = e => { if (e.key === 'Enter' && e.target.value.trim()) render('search', e.target.value.trim()); }; document.querySelectorAll('.see-all').forEach(b => b.onclick = () => notify('Coming soon')); }
};
screens.create = {
  html() { return `<div class="sub-head"><button class="round bare" id="cClose">${ico('x')}</button><b>Create Post</b><button class="next" id="cNext">Post</button></div><div class="create-wrap"><div class="c-user">${userAv(meUser || { username: myName() }, 'md')}<b>${esc(myName())}</b></div><textarea id="cText" maxlength="5000" placeholder="What's on your mind?"></textarea><div class="c-grid" id="cGrid"></div><input type="file" id="cPick" multiple hidden><button class="outline-btn" id="cAdd">${ico('image-plus')}Choose photos or video</button><small class="muted" id="cHint">Photos: up to 4 · Video: Premium or Verified</small></div><div class="c-tabs"><button class="on" data-k="post">Post</button><button data-k="story">Story</button><button data-k="reel">Reel</button><button data-k="music">Music</button></div>`; },
  wire() {
    let files = [], mode = window.__startMode || 'post'; window.__startMode = null; document.querySelectorAll('.c-tabs button').forEach(x => x.classList.toggle('on', x.dataset.k === mode)); const pick = $('#cPick');
    const paint = () => { $('#cGrid').innerHTML = files.map((f, i) => `<div class="c-tile">${f.type.startsWith('video/') ? `<video src="${URL.createObjectURL(f)}" muted></video>` : `<img src="${URL.createObjectURL(f)}" alt="">`}<button data-i="${i}">${ico('x')}</button></div>`).join(''); document.querySelectorAll('#cGrid button').forEach(b => b.onclick = () => { files.splice(+b.dataset.i, 1); paint(); }); refreshIcons(); };
    $('#cClose').onclick = back; $('#cAdd').onclick = () => { pick.accept = mode === 'reel' ? 'video/mp4,video/webm,video/quicktime' : 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime'; pick.click(); };
    pick.onchange = () => { const inc = [...pick.files], vid = inc.some(f => f.type.startsWith('video/')); if (vid && (inc.length > 1 || files.length)) notify('Choose one video at a time, without photos'); else if (!vid && files.some(f => f.type.startsWith('video/'))) notify('Remove the video before adding photos'); else files = [...files, ...inc].slice(0, 4); pick.value = ''; paint(); };
    document.querySelectorAll('.c-tabs button').forEach(b => b.onclick = () => { if (b.dataset.k === 'music') return render('musicUpload'); mode = b.dataset.k; document.querySelectorAll('.c-tabs button').forEach(x => x.classList.toggle('on', x === b)); });
    $('#cNext').onclick = async () => {
      const text = $('#cText').value.trim(); if (!text && !files.length) return notify('Write something or attach media'); const btn = $('#cNext'); btn.disabled = true; btn.textContent = '…';
      try { const media = []; let mediaType = 'none'; for (const f of files) { const fd = new FormData(); fd.append('file', f); const r = await fetch('/api/uploads/post-media', { method: 'POST', headers: headers(false), body: fd }), d = await r.json(); if (!r.ok) throw new Error(d.error || 'Upload failed'); media.push(d.url); mediaType = d.mediaType; }
        if (mode === 'story') { if (media.length !== 1) throw new Error('A story needs exactly one photo or video.'); await api('/api/stories', 'POST', { mediaUrl: media[0], mediaType, text }); notify('Story shared for 24 hours'); return render('home'); }
        const slug = window.__postSlug, r = await fetch('/api/posts', { method: 'POST', headers: headers(), body: JSON.stringify({ text, media, mediaType, communityId: window.__postCommunity || undefined }) }), d = await r.json(); if (!r.ok) throw new Error(d.error || 'Post failed'); notify('Published'); window.__postCommunity = window.__postSlug = null; render(slug ? 'community' : 'home', slug); }
      catch (e) { notify(e.message); btn.disabled = false; btn.textContent = 'Post'; }
    };
    loadMe();
  }
};
screens.user = {
  html() { return `<div class="sub-head"><button class="round bare" id="back">${ico('arrow-left')}</button><span></span><button class="round bare" id="uMenu">${ico('menu')}</button></div><div id="uBody"><div class="feed-loading">Loading…</div></div>`; },
  async wire(u) {
    $('#back').onclick = back;
    let d; try { const r = await fetch('/api/profile/' + encodeURIComponent(u), { headers: headers(false) }); d = await r.json(); if (!r.ok) throw 0; } catch { $('#uBody').innerHTML = '<div class="feed-empty">Profile not found.</div>'; return; }
    const us = d.user; let following = d.isFollowing, followers = d.stats.followers;
    $('#uBody').innerHTML = `<div class="p-hero"><div class="av-wrap">${userAv(us, 'xl')}</div><div class="p-names"><h2>${esc(us.displayName)} ${vb(us)}</h2><p>@${esc(us.username)}</p></div></div><div class="p-stats"><span><b id="uUp">0</b> uploads</span><span><b id="uFo">${fmt(followers)}</b> followers</span><span><b>${fmt(d.stats.following)}</b> following</span></div><div class="karma-row">${ico('shield-half')}<span>Newbie • ${new Date(us.createdAt).getFullYear()} • ${us.karma || 0} Karma</span>${ico('chevron-right')}</div><button class="follow-wide" id="uFollow"></button><button class="follow-wide" id="uMsg">${ico('message-circle')}Message</button>${us.bio ? `<p class="u-bio">${esc(us.bio)}</p>` : ''}${pills()}<div id="profileFeed" class="dynamic-feed"></div>`;
    $('#uMsg').onclick = () => token() ? render('chat', us.username) : authOpen('login');
    const fb = $('#uFollow'); fb.dataset.on = following ? '1' : '';
    const paintF = () => { fb.innerHTML = `${ico(following ? 'user-check' : 'user-plus')}${following ? 'Following' : 'Follow'}`; refreshIcons(); }; paintF();
    fb.onclick = async () => { const on = await toggleFollow(us.username, fb); followers += on === following ? 0 : on ? 1 : -1; following = on; $('#uFo').textContent = fmt(followers); paintF(); };
    $('#uMenu').onclick = () => { sheet(`<div class="sh-group">${item('xShare', 'share', 'Share Profile')}${item('xFollow', following ? 'user-check' : 'user-plus', following ? 'Unfollow User' : 'Follow User')}</div><div class="sh-group">${item('xRep', 'user-x', 'Report User', 1)}${item('xRepP', 'user-x', 'Report Profile Picture', 1)}${item('xBlock', 'user-round-x', 'Block User', 1)}</div>`); $('#xShare').onclick = () => { closeSheets(); shareProfile(us.username); }; $('#xFollow').onclick = () => { closeSheets(); fb.click(); }; $('#xRep').onclick = () => reportSheet('user', us.username); $('#xRepP').onclick = () => reportSheet('profile_picture', us.username); $('#xBlock').onclick = () => blockUser(us.username); };
    const ps = await postsOf(us.username); if (currentView !== 'user') return; const t = $('#profileFeed'); t.innerHTML = ps.length ? ps.map(feedCard).join('') : '<div class="feed-empty">No posts yet.</div>'; $('#pillPosts').textContent = 'Posts - ' + ps.length; $('#uUp').textContent = ps.length; wireFeed(t); refreshIcons();
  }
};
screens.post = {
  html() { return `<div class="sub-head post-top" id="pHead"><button class="round bare" id="back">${ico('arrow-left')}</button></div><div id="pBody"><div class="feed-loading">Loading…</div></div>`; },
  async wire(id) {
    $('#back').onclick = back; let post; try { const r = await fetch('/api/posts/' + id); post = (await r.json()).post; if (!r.ok || !post) throw 0; } catch { $('#pBody').innerHTML = '<div class="feed-empty">Post not found.</div>'; return; }
    const a = post.author || {}, mine = myName();
    $('#pHead').innerHTML = `<button class="round bare" id="back">${ico('arrow-left')}</button><div class="ph-av" data-user="${esc(a.username)}">${userAv(a, 'md')}</div><div class="ph-name"><b>${esc(a.username)}${vb(a)}${a.username !== mine ? ` <button class="follow-link" id="pFollow">· Follow</button>` : ''}</b><small>${ago(post.createdAt)}</small></div><button class="round bare">${ico('ellipsis')}</button>`;
    $('#back').onclick = back; $('#pHead [data-user]').onclick = () => render('user', a.username); $('#pFollow')?.addEventListener('click', async e => { const on = await toggleFollow(a.username, e.target); e.target.textContent = on ? '· Following' : '· Follow'; });
    const [more, cm, me] = await Promise.all([postsOf(a.username), fetch(`/api/posts/${id}/comments`).then(r => r.json()).catch(() => ({ comments: [] })), loadMe()]);
    if (currentView !== 'post') return;
    const karma = me?.user?.karma || 0, canComment = !!token() && karma >= MIN_KARMA_TO_COMMENT, others = more.filter(p => p._id !== id).slice(0, 5);
    const body = feedCard(post).replace(/<div class="post-head">.*?<\/small><\/div><button class="more-btn"[^>]*>.*?<\/button><\/div>/s, '');
    let order = 'top'; const list = () => { const cs = [...(cm.comments || [])]; if (order === 'latest') cs.reverse(); else cs.sort((x, y) => (y.score || 0) - (x.score || 0)); return cs.length ? cs.map(c => `<div class="cm"><div class="cm-top">${userAv(c.author, 'sm')}<b>${esc(c.author?.username || 'member')}${vb(c.author)}</b><small>${ago(c.createdAt)}</small><button class="more-btn">${ico('ellipsis')}</button></div><p>${rich(c.text)}</p><div class="votes"><button class="vt ${c.myVote === 1 ? 'on' : ''}" data-c="${c._id}" data-d="1" aria-label="Upvote">${ico('arrow-big-up')}</button><span>${c.score || 0}</span><button class="vt ${c.myVote === -1 ? 'on' : ''}" data-c="${c._id}" data-d="-1" aria-label="Downvote">${ico('arrow-big-down')}</button></div></div>`).join('') : '<div class="feed-empty">No comments yet.</div>'; };
    $('#pBody').innerHTML = `<div class="post-detail">${body}</div>${others.length ? `<div class="sec-head"><b>More from this author</b><button class="see-all" id="viewAll">View All ${ico('chevron-right')}</button></div><div class="hscroll">${others.map(p => `<article class="news-card" data-open="${p._id}"><div class="nc-img">${p.media?.[0] && p.mediaType !== 'video' ? `<img src="${esc(p.media[0])}" alt="">` : ico('newspaper')}</div><div class="nc-body"><small>GENERAL</small><b>${esc((p.text || 'Post').slice(0, 70))}</b></div></article>`).join('')}</div>` : ''}<div class="cm-head"><b>Comments</b><div class="seg"><button class="on" data-o="top">Top</button><button data-o="latest">Latest</button></div></div><div id="cmList">${list()}</div><div class="cm-bar">${canComment ? `<input id="cmInput" placeholder="Write a comment…" maxlength="1200"><button id="cmSend">Send</button>` : `<span>You must have at least ${MIN_KARMA_TO_COMMENT} karma to post comments</span>`}</div>`;
    const wireVotes = () => document.querySelectorAll('.vt').forEach(b => b.onclick = async () => { if (!needLogin()) return; const dir = b.classList.contains('on') ? 0 : +b.dataset.d; try { const r = await api(`/api/posts/${id}/comments/${b.dataset.c}/vote`, 'POST', { dir }); const row = b.closest('.votes'); row.querySelectorAll('.vt').forEach(x => x.classList.toggle('on', +x.dataset.d === r.myVote)); row.querySelector('span').textContent = r.score; const c = cm.comments.find(x => x._id === b.dataset.c); if (c) { c.score = r.score; c.myVote = r.myVote; } } catch (e) { notify(e.message); } });
    wireVotes(); wireFeed($('#pBody')); $('#viewAll')?.addEventListener('click', () => render('user', a.username)); refreshIcons();
    document.querySelectorAll('.cm-head [data-o]').forEach(b => b.onclick = () => { order = b.dataset.o; document.querySelectorAll('.cm-head [data-o]').forEach(x => x.classList.toggle('on', x === b)); $('#cmList').innerHTML = list(); refreshIcons(); wireVotes(); });
    $('#cmSend')?.addEventListener('click', async () => { const text = $('#cmInput').value.trim(); if (!text) return; try { const r = await fetch(`/api/posts/${id}/comments`, { method: 'POST', headers: headers(), body: JSON.stringify({ text }) }), j = await r.json(); if (!r.ok) throw new Error(j.error); render('post', id); } catch (e) { notify(e.message); } });
  }
};

/* ---------- router ---------- */
const ROUTES = { home: '/', explore: '/explore', notifications: '/notifications', profile: '/profile', points: '/profile/points', profileEdit: '/profile/edit', settings: '/settings', create: '/create', sports: '/sports', messages: '/messages', admin: '/admin' };
const PROTECTED = ['profile', 'points', 'profileEdit', 'create', 'messages', 'chat', 'admin'];
// Dynamic routes: [pattern, view, buildPath(arg), parseArg(match)]. Other scripts can push more entries.
const DYN = [
  [/^\/u\/([^/]+)$/, 'user', a => '/u/' + encodeURIComponent(a)],
  [/^\/post\/([a-f0-9]{24})$/i, 'post', a => '/post/' + a],
  [/^\/messages\/([^/]+)$/, 'chat', a => '/messages/' + encodeURIComponent(a)]
];
const pathFor = (view, arg) => { const d = DYN.find(x => x[1] === view); return d ? d[2](arg) : (ROUTES[view] || '/'); };
const _render = render; let popping = false;
render = function (view, arg) {
  closeSheets();
  if (PROTECTED.includes(view) && !token()) { authOpen('login'); if (!popping) return; view = 'home'; history.replaceState({}, '', '/'); }
  if (view === 'user' && arg && arg.toLowerCase() === myName()) view = 'profile';
  const S = screens[view];
  if (S) { currentView = view; syncAuth(); window.scrollTo(0, 0); main.innerHTML = S.html(arg); document.querySelectorAll('.nav-item,.tab-item').forEach(b => b.classList.toggle('active', b.dataset.view === (view === 'points' || view === 'profileEdit' ? 'profile' : view))); refreshIcons(); S.wire && S.wire(arg); }
  else _render(view);
  document.body.dataset.view = view;
  const path = pathFor(view, arg);
  if (!popping) (location.pathname + location.search === path ? history.replaceState : history.pushState).call(history, {}, '', path);
};
function fromLocation() {
  const p = location.pathname.replace(/\/+$/, '') || '/'; popping = true;
  try {
    for (const [re, view, , parse] of DYN) { const m = p.match(re); if (m) return render(view, parse ? parse(m) : decodeURIComponent(m[1])); }
    const v = Object.keys(ROUTES).find(k => ROUTES[k] === p); if (!v) history.replaceState({}, '', '/'); render(v || 'home');
  } finally { popping = false; }
}
addEventListener('popstate', fromLocation);
document.querySelector('a.brand')?.addEventListener('click', e => { e.preventDefault(); render('home'); });
