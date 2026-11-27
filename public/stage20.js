/* ===== Stage 20: desktop side panels, resources links, carousel counters, composer counter ===== */
(() => {
'use strict';
const rb = document.getElementById('rightbar'), byId = id => document.getElementById(id), isDesk = () => innerWidth > 900;
let tokState = null, busy = false;

async function fillSide() {
  if (busy) return; busy = true;
  try {
    const get = u => api(u).catch(() => null);
    const [tr, ma, pe] = await Promise.all([get('/api/explore/trending'), isDesk() ? get('/api/sports/matches') : null, isDesk() ? get('/api/explore/people') : null]);
    const st = byId('sideTrend');
    if (st) {
      const l = (tr?.posts || []).slice(0, 3);
      st.innerHTML = l.length ? l.map(p => `<article class="side-news" data-open="${p._id}"><small>@${esc(p.author?.username || 'member')}</small><strong>${esc((p.text || (p.media?.length ? 'Photo post' : 'Post')).slice(0, 70))}</strong></article>`).join('') : '<small class="muted">Nothing trending yet.</small>';
      st.querySelectorAll('[data-open]').forEach(e => e.onclick = () => render('post', e.dataset.open));
    }
    if (!rb || !isDesk()) return;
    const open = (ma?.matches || []).filter(m => !m.locked).sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff)).slice(0, 3);
    const when2 = k => { try { return when(k); } catch { return ''; } };
    rb.innerHTML = `<section class="rb-card"><div class="rb-h"><b>ARENAS</b><button class="rb-more" data-go="sports">See more ${ico('chevron-right')}</button></div>${open.length ? open.map(m => `<div class="rb-match" data-go="sports"><div><small>${esc(m.league || 'Match')} · ${when2(m.kickoff)}</small><b>${esc(m.home)} vs ${esc(m.away)}</b></div><button class="rb-red">Predict</button></div>`).join('') : '<small class="muted rb-empty">No upcoming matches yet.</small>'}<div class="rb-game" data-go="games"><span class="rb-gi">${ico('gamepad-2')}</span><div><b>Penalty Shootout</b><small>Play free and earn game points</small></div><button class="rb-red">Play</button></div></section>${pe?.users?.length ? `<section class="rb-card"><div class="rb-h"><b>WHO TO FOLLOW</b></div>${pe.users.slice(0, 6).map(u => `<div class="rb-user" data-user="${esc(u.username)}">${userAv(u, 'sm')}<div class="rb-un"><b>${esc(u.displayName || u.username)}${vb(u)}</b><small>${esc(u.username)}</small></div><button class="rb-red rb-follow" data-u="${esc(u.username)}">Follow</button></div>`).join('')}</section>` : ''}`;
    rb.querySelectorAll('[data-go]').forEach(e => e.onclick = () => render(e.dataset.go));
    rb.querySelectorAll('[data-user]').forEach(e => e.onclick = ev => { if (!ev.target.closest('.rb-follow')) render('user', e.dataset.user); });
    rb.querySelectorAll('.rb-follow').forEach(f => f.onclick = async ev => { ev.stopPropagation(); const on = await toggleFollow(f.dataset.u, f); f.textContent = on ? 'Following' : 'Follow'; f.classList.toggle('on', on); });
    refreshIcons();
  } finally { busy = false; }
}

/* resources (left sidebar) */
const on = (id, f) => byId(id)?.addEventListener('click', f);
on('resHelp', () => window.openHelp ? openHelp() : render('settings')); on('resGuide', () => window.openGuide && openGuide()); on('resAds', () => render('ads'));
on('resTerms', () => render('terms')); on('resPriv', () => render('privacy')); document.querySelector('#sideAd button')?.addEventListener('click', () => render('ads'));

/* refresh the panels at start, after login/logout, and on window resize across the desktop breakpoint */
const tick = () => { const t = (typeof token === 'function' ? token() : '') || ''; if (t !== tokState) { tokState = t; fillSide(); } };
setInterval(tick, 1500); tick();
let wasDesk = isDesk(); addEventListener('resize', () => { if (isDesk() && !wasDesk) fillSide(); wasDesk = isDesk(); });

/* multi-photo posts: show the 1/N counter while swiping */
document.addEventListener('scroll', e => {
  const el = e.target; if (!el.classList?.contains('carousel')) return;
  const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth)), c = el.parentElement.querySelector('.mc-count'); if (c) c.textContent = `${Math.min(i + 1, el.children.length)}/${el.children.length}`;
}, true);

/* composer character counter */
document.addEventListener('input', e => {
  if (e.target.id !== 'cText') return; let c = byId('cCount');
  if (!c) { c = document.createElement('div'); c.id = 'cCount'; c.className = 'c-count'; e.target.after(c); }
  c.textContent = `${e.target.value.length}/5000`;
});
})();
