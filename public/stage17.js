/* ===== Stage 17: account recovery, settings, karma achievements, dashboard, legal pages ===== */
(() => {
'use strict';
const S = screens;
Object.assign(ROUTES, { settings: '/settings', karma: '/profile/karma', dashboard: '/profile/dashboard', resetPassword: '/reset-password', verifyEmail: '/verify-email', terms: '/terms', privacy: '/privacy' });
PROTECTED.push('settings', 'karma', 'dashboard');

/* ---------- karma levels ---------- */
const LEVELS = [
  { name: 'Newbie', min: 0, c: 1, b: 0, blurb: 'Just getting started. Exploring discussions and learning how community engagement works.' },
  { name: 'Contributor', min: 100, c: 2, b: 0, blurb: 'Regularly sharing posts and joining conversations.' },
  { name: 'Noticed', min: 300, c: 3, b: 0, blurb: 'People are starting to notice your posts and takes.' },
  { name: 'Valued', min: 800, c: 0, b: 1, blurb: 'A trusted voice whose posts help the community.' },
  { name: 'Respected', min: 1500, c: 0, b: 2, blurb: 'A pillar of the community that others look up to.' },
  { name: 'Trusted', min: 3000, c: 0, b: 3, blurb: 'One of the most reliable members on Buzzer.' },
  { name: 'Legend', min: 6000, c: 1, b: 3, blurb: 'The highest honour on Buzzer.' }
];
const levelOf = k => LEVELS.reduce((a, l, i) => k >= l.min ? i : a, 0);
window.paintKarma = k => { const i = levelOf(k); $('#karmaName') && ($('#karmaName').textContent = LEVELS[i].name); $('#karmaTxt') && ($('#karmaTxt').textContent = `Level ${i + 1} · ${k} Karma`); };
const badge = (i, state) => {
  const L = LEVELS[i], on = state === 'on', done = state === 'done';
  const stroke = on ? `url(#kg${i})` : done ? '#8a6a45' : '#2a2d30', fill = on ? '#4a2a05' : '#1b1d1f', ch = on ? '#f0a56b' : done ? '#8a6a45' : '#2c2f32';
  let g = '';
  for (let c = 0; c < L.c; c++) g += `<path d="M30 ${44 + c * 11} L50 ${58 + c * 11} L70 ${44 + c * 11}" fill="none" stroke="${ch}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>`;
  for (let b = 0; b < L.b; b++) g += `<path d="M2 ${3 + b * 9} h20 l4 6 h-20z M98 ${3 + b * 9} h-20 l-4 6 h20z" fill="${ch}"/>`;
  return `<svg viewBox="0 0 100 100" class="kb ${on ? 'on' : ''}" aria-hidden="true"><defs><linearGradient id="kg${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffc08a"/><stop offset="1" stop-color="#c9703a"/></linearGradient></defs><path d="M24 20 H76 L92 62 L50 94 L8 62Z" fill="${fill}" stroke="${stroke}" stroke-width="${on ? 7 : 4}" stroke-linejoin="round"/>${g}</svg>`;
};
const ageOf = d => { const days = Math.floor((Date.now() - new Date(d)) / 864e5); return days >= 365 ? Math.floor(days / 365) + 'y' : days >= 30 ? Math.floor(days / 30) + 'mo' : Math.max(days, 0) + 'd'; };
const guide = () => sheet(`<h3 class="sh-title">Community Guide</h3><div class="guide"><p><b>How karma works.</b> You earn karma when you take part in a healthy way: correct predictions and the community upvoting your comments and posts.</p><p><b>Be respectful.</b> No hate, harassment, threats or targeting people for who they are.</p><p><b>Keep it real.</b> No spam, scams, fake giveaways or impersonation. Only upload music, photos and video you have the right to share.</p><p><b>Stay safe.</b> Never share private details such as phone numbers or passwords. Adult or violent content involving minors is never allowed and is reported.</p><p><b>Enforcement.</b> Reported content is reviewed. Repeat breaches earn strikes and can lead to removal. You can appeal any decision from your notifications.</p></div>`);
S.karma = {
  html() { return `${titleBar('Karma Achievements')}<div id="kBody"><div class="feed-loading">Loading…</div></div><div class="k-foot"><button class="outline-btn wide" id="kGuide">${ico('external-link')}Community Guide</button></div>`; },
  async wire() {
    $('#back').onclick = back; $('#kGuide').onclick = guide;
    try {
      const d = await api('/api/account/karma'), i = levelOf(d.karma), L = LEVELS[i], next = LEVELS[i + 1];
      $('#kBody').innerHTML = `<div class="k-stats"><div><small>KARMA:</small><b>${d.karma.toLocaleString()}</b></div><div><small>COMMENTS:</small><b>${d.comments}</b></div><div><small>BUZZER AGE:</small><b>${ageOf(d.joinedAt)}</b></div></div><div class="k-level"><small>KARMA LEVEL:</small><h2>${L.name}</h2><p>${L.blurb}</p>${next ? `<div class="k-bar"><i style="width:${Math.min(100, Math.round((d.karma - L.min) / (next.min - L.min) * 100))}%"></i></div><small class="muted">${(next.min - d.karma).toLocaleString()} more karma to reach ${next.name}</small>` : '<small class="muted">You reached the top level.</small>'}</div><div class="k-grid">${LEVELS.map((l, j) => `<div class="k-item ${j === i ? 'cur' : ''}">${badge(j, j === i ? 'on' : j < i ? 'done' : 'lock')}<b>${l.name}</b><small>${l.min}+ Karma</small></div>`).join('')}</div>`;
    } catch (e) { errBox($('#kBody'), e); }
  }
};

/* ---------- professional dashboard ---------- */
const dayLbl = () => Array.from({ length: 7 }, (_, i) => new Date(Date.now() - (6 - i) * 864e5).toLocaleDateString([], { weekday: 'short' }).slice(0, 2));
const barChart = (arr, color) => { const m = Math.max(1, ...arr), l = dayLbl(); return `<div class="barchart">${arr.map((v, i) => `<div class="bc"><span>${v || ''}</span><i style="height:${Math.max(3, Math.round(v / m * 100))}%;background:${color};${v ? '' : 'opacity:.25'}"></i><small>${l[i]}</small></div>`).join('')}</div>`; };
S.dashboard = {
  html() { return `${titleBar('Professional Dashboard')}<div id="dBody"><div class="feed-loading">Loading…</div></div>`; },
  async wire() {
    $('#back').onclick = back; const body = $('#dBody');
    const load = async () => {
      try {
        const d = await api('/api/account/pro/overview'), t = d.totals, f = n => Number(n || 0).toLocaleString();
        body.innerHTML = `<div class="d-tiles">${[['users', 'Followers', t.followers], ['file-text', 'Posts', t.posts], ['heart', 'Likes', t.likes], ['message-circle', 'Comments', t.comments], ['repeat-2', 'Reposts', t.reposts], ['eye', 'Post views', t.views]].map(([ic, n, v]) => `<div class="d-tile">${ico(ic)}<b>${f(v)}</b><small>${n}</small></div>`).join('')}</div><div class="d-card"><b>New followers · last 7 days</b>${barChart(d.days.newFollowers, '#18d978')}</div><div class="d-card"><b>Likes on posts made · last 7 days</b>${barChart(d.days.likesPerPostDay, '#f7b943')}</div><div class="d-card"><b>Average interactions per post</b><div class="d-big">${t.avgInteractions}</div><small class="muted">Likes + comments + reposts, divided by your posts</small></div><h3 class="sec-title">Top posts</h3>${d.top.length ? d.top.map(p => `<div class="d-post" data-open="${p._id}"><p>${esc(p.text || (p.hasMedia ? 'Photo or video post' : 'Post'))}</p><small>${ico('heart')}${p.likes} ${ico('message-circle')}${p.comments} ${ico('repeat-2')}${p.reposts} ${ico('eye')}${p.views}</small></div>`).join('') : empty('Post something to see how it performs.')}<p class="muted pad2">Views count people opening a post page (not your own opens). Rewards and payouts are not available yet.</p>`;
        body.querySelectorAll('[data-open]').forEach(e => e.onclick = () => render('post', e.dataset.open)); refreshIcons();
      } catch (e) {
        if (/Activate/i.test(e.message)) { body.innerHTML = `<div class="d-hero">${ico('chart-no-axes-combined', 'big')}<h2>Turn your passion into results</h2><p>See how your posts perform: followers gained, likes, comments, views and your best content.</p><ul><li>7-day growth charts</li><li>Top performing posts</li><li>Engagement per post</li></ul><button class="save-avatar" id="dAct">Activate dashboard</button><small class="muted">It is free. Earning rewards will be added later.</small></div>`; refreshIcons(); $('#dAct').onclick = async () => { try { await api('/api/account/pro/activate', 'POST'); load(); } catch (x) { notify(x.message); } }; }
        else errBox(body, e);
      }
    };
    load();
  }
};

/* ---------- profile extras: email banner, dashboard button ---------- */
window.profileExtras = u => {
  if (u.proDashboard && $('#activatePro')) $('#activatePro').textContent = 'Open';
  if (u.emailVerified === false && !sessionStorage.getItem('mvX') && !$('#mailBanner')) {
    const b = document.createElement('div'); b.className = 'mail-banner'; b.id = 'mailBanner'; b.innerHTML = `${ico('mail-warning')}<span>Verify your email to secure your account</span><button id="mvSend">Send link</button><button class="x" id="mvX" aria-label="Dismiss">${ico('x')}</button>`;
    $('.p-hero')?.before(b); refreshIcons();
    $('#mvX').onclick = () => { sessionStorage.setItem('mvX', '1'); b.remove(); };
    $('#mvSend').onclick = async () => { try { const d = await api('/api/auth/verify/send', 'POST'); notify(d.message); } catch (e) { notify(e.message); } };
  }
};

/* ---------- mentions and hashtags are tappable everywhere ---------- */
document.addEventListener('click', e => {
  const m = e.target.closest?.('[data-mention]'), h = e.target.closest?.('[data-tag]'); if (!m && !h) return;
  e.stopPropagation(); e.preventDefault(); m ? render('user', m.dataset.mention.toLowerCase()) : render('search', h.dataset.tag);
}, true);

/* ---------- forgot / reset / verify ---------- */
window.forgotOpen = () => {
  document.querySelector('#authLayer')?.remove(); const l = document.createElement('div'); l.className = 'auth-layer'; l.id = 'authLayer';
  l.innerHTML = `<section class="auth-card" role="dialog" aria-modal="true"><button id="fgClose" class="modal-close">×</button><div class="brand"><span class="brand-mark">B</span><span>Buzzer</span></div><h2>Forgot password?</h2><p>Enter your account email and we will send you a link to choose a new password.</p><form id="fgForm"><label>Email</label><input name="email" type="email" autocomplete="email" required placeholder="you@example.com"><button class="auth-submit">Send reset link</button></form><div class="auth-message" id="fgMsg"></div><div class="auth-switch">Remembered it? <button id="fgBack">Log in</button></div></section>`;
  document.body.append(l); l.querySelector('#fgClose').onclick = () => l.remove(); l.querySelector('#fgBack').onclick = () => authOpen('login'); l.addEventListener('click', e => { if (e.target === l) l.remove(); });
  l.querySelector('#fgForm').onsubmit = async e => { e.preventDefault(); const msg = l.querySelector('#fgMsg'); msg.textContent = 'Sending…'; try { const d = await api('/api/auth/forgot', 'POST', { email: new FormData(e.currentTarget).get('email') }); msg.textContent = d.message; } catch (x) { msg.textContent = x.message; } };
};
const urlToken = () => new URLSearchParams(location.search).get('token') || '';
S.resetPassword = {
  html() { return `${titleBar('Reset password')}<form class="auth-page" id="rpForm"><p class="muted">Choose a new password for your Buzzer account.</p><label>New password</label><input id="rpPw" type="password" minlength="8" autocomplete="new-password" placeholder="At least 8 characters" required><label>Confirm password</label><input id="rpPw2" type="password" minlength="8" autocomplete="new-password" required><button class="save-avatar" id="rpGo">Update password</button><div class="auth-message" id="rpMsg"></div></form>`; },
  wire() {
    const tk = urlToken(); $('#back').onclick = () => render('home');
    if (!tk) { $('#rpMsg').textContent = 'This reset link is missing its code. Request a new one from the login screen.'; $('#rpGo').disabled = true; return; }
    $('#rpForm').onsubmit = async e => { e.preventDefault(); if ($('#rpPw').value !== $('#rpPw2').value) return ($('#rpMsg').textContent = 'The passwords do not match.'); $('#rpGo').disabled = true; try { const d = await api('/api/auth/reset', 'POST', { token: tk, password: $('#rpPw').value }); history.replaceState({}, '', '/'); notify(d.message); render('home'); authOpen('login'); } catch (x) { $('#rpMsg').textContent = x.message; $('#rpGo').disabled = false; } };
  }
};
S.verifyEmail = {
  html() { return `${titleBar('Verify email')}<div class="auth-page" id="veBody"><div class="feed-loading">Verifying…</div></div>`; },
  async wire() {
    $('#back').onclick = () => render('home'); const tk = urlToken(), body = $('#veBody');
    try { if (!tk) throw new Error('This verification link is missing its code.'); const d = await api('/api/auth/verify', 'POST', { token: tk }); history.replaceState({}, '', '/verify-email'); body.innerHTML = `<div class="d-hero">${ico('circle-check', 'big')}<h2>${esc(d.message)}</h2><button class="save-avatar" id="veGo">Continue</button></div>`; }
    catch (e) { body.innerHTML = `<div class="d-hero">${ico('circle-alert', 'big')}<h2>${esc(e.message)}</h2><p class="muted">Log in and request a new link from Settings.</p><button class="save-avatar" id="veGo">Continue</button></div>`; }
    refreshIcons(); $('#veGo').onclick = () => render('home');
  }
};

/* ---------- legal pages ---------- */
const LEGAL = {
  terms: ['Terms of Service', [
    ['Using Buzzer', 'Buzzer is a sports community where people post, chat, share music, predict scores and find opportunities. By creating an account or using Buzzer you agree to these terms. You must be at least 13 years old, or older if your country sets a higher age for using online services.'],
    ['Your account', 'Keep your password private and your details accurate. You are responsible for activity on your account. Tell us if you think someone else is using it.'],
    ['Your content', 'You own what you post. By posting you give Buzzer permission to store, display and distribute it inside the service so that other people can see it. Only post, upload or share photos, video, music and text that you have the right to use.'],
    ['What is not allowed', 'Hate, harassment, threats, impersonation, scams, spam, fake giveaways, sexual content, content that exploits or endangers minors, illegal activity, and uploading music or media you do not have rights to. Do not attempt to break, overload or misuse the service.'],
    ['Moderation and appeals', 'We review reports and may remove content, limit features, add strikes, suspend or close accounts that break these terms. If you disagree with a decision you can appeal from the notification you receive.'],
    ['Predictions, games and points', 'Predictions and games are for entertainment only. They are not gambling and you cannot stake money. Game points and prediction points have no cash value unless Buzzer clearly states otherwise for a specific feature. We may change point rules or remove points gained through cheating or abuse.'],
    ['Paid features', 'Verification badges, Premium and similar features are paid through our payment provider. Prices and duration are shown before you pay. A badge or plan ends when its period ends. Your consumer rights under local law are not affected.'],
    ['Opportunities and third parties', 'Opportunities such as tryouts, tournaments and discounts are posted by other users. Buzzer reviews listings but does not guarantee them. Check details yourself and never pay anyone you cannot verify.'],
    ['AI assistant', 'Buzzer AI can make mistakes and has no live data. Do not rely on it for medical, legal, financial or betting decisions.'],
    ['Ending your account', 'You can delete your account at any time in Settings. We can suspend or end accounts that seriously or repeatedly break these terms.'],
    ['Changes and contact', 'We may update these terms and will show the new date. Continuing to use Buzzer after a change means you accept it. For help use Help & support in Settings.']
  ]],
  privacy: ['Privacy Policy', [
    ['What we collect', 'Account details (username, display name, email, password stored as a secure hash), what you post and send (posts, comments, stories, messages, music, predictions), your followers and blocks, and basic technical data such as IP address and device type used for security and abuse prevention.'],
    ['How we use it', 'To run Buzzer, show your content to other people, keep the community safe, process payments, send account emails (verification, password reset) and improve the app. We do not sell your personal data.'],
    ['Who we share it with', 'Service providers that help us run Buzzer: hosting and database providers, an image hosting service for uploaded photos, an email provider, our payment provider for purchases, a sports data provider for fixtures, and Google when you use the AI assistant. They only get what they need to do their job.'],
    ['AI assistant', 'When you message Buzzer AI, your messages are sent to Google’s Gemini API to produce a reply. Do not share passwords, health, financial or other sensitive details with it. Buzzer does not store your assistant conversations on the server.'],
    ['What others can see', 'Your profile, posts, comments, followers and (unless you turn it off in Settings) your streak are public. Messages are visible only to the people in the conversation. You control who can message you and can block people.'],
    ['Your choices', 'In Settings you can change notification and privacy options, download a copy of your data, and permanently delete your account. Deleting removes your profile and personal records and hides your posts.'],
    ['Keeping data safe', 'Passwords are hashed, connections use HTTPS and access is limited. No online service is perfectly secure, so use a strong unique password.'],
    ['Children', 'Buzzer is not for children under 13. If you believe a child has created an account, contact us and we will remove it.'],
    ['Changes and contact', 'We will update this policy when our practices change. For privacy questions or requests use Help & support in Settings.']
  ]]
};
for (const k of ['terms', 'privacy']) S[k] = {
  html() { const [t, secs] = LEGAL[k]; return `${titleBar(t)}<div class="legal"><small class="muted">Last updated: November 2026</small>${secs.map(([h, p]) => `<h3>${h}</h3><p>${p}</p>`).join('')}<div class="legal-links"><a data-l="terms">Terms of Service</a> · <a data-l="privacy">Privacy Policy</a></div></div>`; },
  wire() { $('#back').onclick = () => history.length > 1 ? history.back() : render('home'); document.querySelectorAll('[data-l]').forEach(a => a.onclick = () => render(a.dataset.l)); }
};

/* ---------- settings ---------- */
const clearSession = () => { Object.keys(localStorage).filter(k => k.startsWith('buzzer')).forEach(k => localStorage.removeItem(k)); meUser = null; };
const row = (id, icon, title, sub = '', right = '') => `<button class="st-row" id="${id}">${ico(icon)}<span><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span>${right || ico('chevron-right', 'chev')}</button>`;
const sw = (k, icon, title, sub, on) => `<label class="st-row st-sw">${ico(icon)}<span><b>${title}</b><small>${sub}</small></span><input type="checkbox" class="sw" data-k="${k}" ${on ? 'checked' : ''}><i class="sw-ui"></i></label>`;
S.settings = {
  html() { return `${titleBar('Settings')}<div id="stBody"><div class="feed-loading">Loading…</div></div>`; },
  async wire() {
    $('#back').onclick = back; let d; try { d = await api('/api/account/settings'); } catch (e) { return errBox($('#stBody'), e); }
    const n = d.settings.notif, p = d.settings.privacy;
    $('#stBody').innerHTML = `<div class="st-wrap">
<h4>Account</h4><div class="st-group">${row('stEmail', 'mail', 'Email', esc(d.email), d.emailVerified ? '<span class="st-ok">Verified</span>' : '<span class="st-warn">Verify</span>')}${row('stEdit', 'user-pen', 'Edit profile')}${row('stPw', 'key-round', 'Change password')}${row('stKarma', 'shield-half', 'Karma and achievements')}${row('stPro', 'chart-no-axes-combined', 'Professional Dashboard', d.proDashboard ? 'Activated' : 'Track how your posts perform')}</div>
<h4>Notifications</h4><div class="st-group">${sw('notif.likes', 'heart', 'Likes', 'When someone likes your post', n.likes)}${sw('notif.comments', 'message-circle', 'Comments', 'When someone comments on your post', n.comments)}${sw('notif.follows', 'user-plus', 'New followers', 'When someone follows you', n.follows)}${sw('notif.reposts', 'repeat-2', 'Reposts', 'When someone reposts your post', n.reposts)}${sw('notif.mentions', 'at-sign', 'Mentions', 'When someone mentions you', n.mentions)}</div>
<h4>Privacy and safety</h4><div class="st-group">${row('stMsg', 'message-square-lock', 'Who can message me', p.allowMessages === 'nobody' ? 'Nobody' : 'People I follow who follow me back')}${sw('privacy.showStreak', 'flame', 'Show my streak', 'Let others see your daily streak on your profile', p.showStreak)}${row('stBlocked', 'ban', 'Blocked users')}</div>
<h4>Buzzer extras</h4><div class="st-group">${row('stAi', 'sparkles', 'Buzzer AI assistant', d.aiEnabled ? 'Ask about sports or get help writing' : 'Not set up yet')}${row('stGames', 'gamepad-2', 'Games', 'Penalty shootout and football quiz')}${row('stAds', 'megaphone', 'Ads manager')}</div>
<h4>Preferences</h4><div class="st-group">${row('stTheme', 'moon', 'Appearance', 'Dark', '<span class="st-val">Dark</span>')}${row('stLang', 'languages', 'Language', 'English', '<span class="st-val">English</span>')}</div>
<h4>Your data</h4><div class="st-group">${row('stExport', 'download', 'Download my data', 'A copy of your profile, posts and comments')}${row('stDelete', 'trash-2', 'Delete account', 'Permanently remove your account')}</div>
<h4>Support and legal</h4><div class="st-group">${row('stHelp', 'life-buoy', 'Help and support')}${row('stTerms', 'file-text', 'Terms of Service')}${row('stPriv', 'shield-check', 'Privacy Policy')}${row('stAbout', 'info', 'About Buzzer', 'Version 1.0', '<span class="st-val">v1.0</span>')}</div>
<button class="st-logout" id="stOut">${ico('log-out')}Log out</button></div>`;
    refreshIcons();
    const go = (id, f) => $('#' + id)?.addEventListener('click', f);
    go('stEmail', async () => { if (d.emailVerified) return notify('Your email is verified'); try { const r = await api('/api/auth/verify/send', 'POST'); notify(r.message); } catch (e) { notify(e.message); } });
    go('stEdit', () => render('profileEdit')); go('stKarma', () => render('karma')); go('stPro', () => render('dashboard')); go('stAi', () => render('assistant')); go('stGames', () => render('games')); go('stAds', () => render('ads'));
    go('stTerms', () => render('terms')); go('stPriv', () => render('privacy'));
    go('stTheme', () => notify('Light mode is coming later')); go('stLang', () => notify('More languages are coming later')); go('stAbout', () => notify('Buzzer 1.0'));
    document.querySelectorAll('.sw').forEach(i => i.onchange = async () => { const [grp, key] = i.dataset.k.split('.'); try { await api('/api/account/settings', 'PATCH', { [grp]: { [key]: i.checked } }); } catch (e) { i.checked = !i.checked; notify(e.message); } });
    go('stMsg', () => { sheet(`<h3 class="sh-title">Who can message me</h3><button class="ct" data-v="mutual"><span><b>People I follow who follow me back</b><small>Recommended</small></span>${p.allowMessages !== 'nobody' ? ico('check') : ''}</button><button class="ct" data-v="nobody"><span><b>Nobody</b><small>Turn off new messages</small></span>${p.allowMessages === 'nobody' ? ico('check') : ''}</button>`); refreshIcons(); document.querySelectorAll('.ct[data-v]').forEach(b => b.onclick = async () => { try { await api('/api/account/settings', 'PATCH', { privacy: { allowMessages: b.dataset.v } }); closeSheets(); render('settings'); } catch (e) { notify(e.message); } }); });
    go('stBlocked', async () => {
      sheet('<h3 class="sh-title">Blocked users</h3><div id="blList"><div class="feed-loading">Loading…</div></div>');
      try { const { users } = await api('/api/account/blocked'); $('#blList').innerHTML = users.length ? users.map(u => `<div class="ct">${userAv(u, 'sm')}<span><b>${esc(u.displayName || u.username)}</b><small>@${esc(u.username)}</small></span><button class="pill" data-u="${esc(u.username)}">Unblock</button></div>`).join('') : '<p class="muted pad2">You have not blocked anyone.</p>'; $('#blList').querySelectorAll('[data-u]').forEach(b => b.onclick = async () => { try { await api('/api/safety/block/' + encodeURIComponent(b.dataset.u), 'DELETE'); b.closest('.ct').remove(); notify('Unblocked'); } catch (e) { notify(e.message); } }); } catch (e) { errBox($('#blList'), e); }
    });
    go('stPw', () => { sheet(`<h3 class="sh-title">Change password</h3><input id="pwCur" class="sh-in" type="password" autocomplete="current-password" placeholder="Current password"><input id="pwNew" class="sh-in" type="password" autocomplete="new-password" placeholder="New password (8+ characters)"><input id="pwNew2" class="sh-in" type="password" autocomplete="new-password" placeholder="Confirm new password"><button class="purchase" id="pwGo">Update password</button>`); $('#pwGo').onclick = async () => { if ($('#pwNew').value !== $('#pwNew2').value) return notify('The new passwords do not match'); try { const r = await api('/api/account/password', 'POST', { current: $('#pwCur').value, next: $('#pwNew').value }); localStorage.setItem('buzzerToken', r.token); closeSheets(); notify('Password updated'); } catch (e) { notify(e.message); } }; });
    go('stExport', async () => { try { notify('Preparing your data…'); const r = await fetch('/api/account/export', { headers: headers(false) }); if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Could not export'); const a = document.createElement('a'); a.href = URL.createObjectURL(await r.blob()); a.download = 'buzzer-data.json'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); } catch (e) { notify(e.message); } });
    go('stDelete', () => { sheet(`<h3 class="sh-title">Delete account</h3><p class="muted pad2">This permanently deletes your profile, comments, followers, stories and personal records, and hides your posts. It cannot be undone.</p><input id="dlPw" class="sh-in" type="password" autocomplete="current-password" placeholder="Enter your password to confirm"><button class="purchase danger" id="dlGo">Delete my account</button>`); $('#dlGo').onclick = async () => { try { await api('/api/account', 'DELETE', { password: $('#dlPw').value }); closeSheets(); clearSession(); notify('Your account was deleted'); render('home'); } catch (e) { notify(e.message); } }; });
    go('stHelp', () => { const faq = [['How do I get verified?', 'Open Profile and tap GoPro to see verification plans, or use Upgrade Now on your profile.'], ['Why can’t I comment?', 'Commenting needs a minimum amount of karma. Earn karma by making correct predictions and taking part.'], ['Why can’t I message someone?', 'You can message people you follow who also follow you back, and who allow messages.'], ['How do predictions work?', 'Predict the score before kick-off. An exact score earns 5 points and the right result earns 2. Scores update automatically after matches.'], ['How is my streak counted?', 'Posting, commenting or adding to a thread counts for the day (UTC). Miss a full day and it restarts.'], ['How do I delete or edit a post?', 'Tap the three dots on your post.']]; sheet(`<h3 class="sh-title">Help and support</h3><div class="faq">${faq.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>${d.supportEmail ? `<a class="purchase" href="mailto:${esc(d.supportEmail)}?subject=Buzzer%20support">${ico('mail')}Contact support</a>` : '<p class="muted pad2">Support contact is not configured yet.</p>'}`); refreshIcons(); });
    go('stOut', () => { clearSession(); notify('Signed out'); render('home'); });
  }
};
})();
