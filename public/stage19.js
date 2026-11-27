/* ===== Stage 19: Games (penalty shootout, football quiz, leaderboard) and the Opportunities hub ===== */
(() => {
'use strict';
const S = screens;
Object.assign(ROUTES, { games: '/games', penalty: '/games/penalty', quiz: '/games/quiz', gameBoard: '/games/leaderboard' });
PROTECTED.push('games', 'penalty', 'quiz', 'gameBoard');

/* ---------- games hub ---------- */
const capBar = (s) => `<div class="g-cap"><div><b>${s.earnedToday}</b> / ${s.dailyCap} points today</div><div class="k-bar"><i style="width:${Math.min(100, Math.round(s.earnedToday / s.dailyCap * 100))}%"></i></div><small class="muted">${s.earnedToday >= s.dailyCap ? 'Daily cap reached. You can still play for fun, and it resets at midnight UTC.' : 'Game points are separate from your real Points and prediction points.'}</small></div>`;
S.games = {
  html() { return `${titleBar('Games')}<div id="gBody"><div class="feed-loading">Loading…</div></div>`; },
  async wire() {
    $('#back').onclick = back;
    try {
      const s = await api('/api/games/status');
      $('#gBody').innerHTML = `<div class="g-hero"><div><small>YOUR GAME POINTS</small><h2>${s.total.toLocaleString()}</h2></div>${ico('gamepad-2', 'big')}</div>${capBar(s)}<div class="g-card" id="gPen"><span class="g-ico">${ico('goal')}</span><div><b>Penalty Shootout</b><small>5 kicks. Beat the keeper. 1 point per goal.</small></div>${ico('chevron-right', 'chev')}</div><div class="g-card" id="gQuiz"><span class="g-ico">${ico('brain')}</span><div><b>Football Quiz</b><small>5 questions across sports. 1 point per correct answer.</small></div>${ico('chevron-right', 'chev')}</div><div class="g-card" id="gBoard"><span class="g-ico">${ico('trophy')}</span><div><b>Leaderboard</b><small>Top game players</small></div>${ico('chevron-right', 'chev')}</div>`;
      $('#gPen').onclick = () => render('penalty'); $('#gQuiz').onclick = () => render('quiz'); $('#gBoard').onclick = () => render('gameBoard'); refreshIcons();
    } catch (e) { errBox($('#gBody'), e); }
  }
};
S.gameBoard = {
  html() { return `${titleBar('Game Leaderboard')}<div id="lbBody"><div class="feed-loading">Loading…</div></div>`; },
  async wire() {
    $('#back').onclick = back;
    try { const { leaders } = await api('/api/games/leaderboard'); $('#lbBody').innerHTML = leaders.length ? leaders.map((u, i) => `<div class="ct" data-u="${esc(u.username)}"><span class="lb-n">${i + 1}</span>${userAv(u, 'sm')}<span><b>${esc(u.displayName || u.username)}${vb(u)}</b><small>@${esc(u.username)}</small></span><b class="lb-p">${u.gamePoints}</b></div>`).join('') : empty('Nobody has scored yet. Be the first!'); $('#lbBody').querySelectorAll('.ct').forEach(c => c.onclick = () => render('user', c.dataset.u)); refreshIcons(); }
    catch (e) { errBox($('#lbBody'), e); }
  }
};
const summary = (title, score, total, r) => `<div class="g-sum"><h2>${title}</h2><div class="g-score">${score}<small>/${total}</small></div><p>${r.awarded ? `+${r.awarded} game point${r.awarded > 1 ? 's' : ''} earned` : r.earnedToday >= r.dailyCap ? 'Daily point cap reached' : 'No points this round'}</p>${capBar(r)}<button class="save-avatar" id="gAgain">Play again</button><button class="outline-btn wide" id="gHub">Back to games</button></div>`;

/* ---------- penalty shootout ---------- */
const SPOT = { left: -34, center: 0, right: 34 };
S.penalty = {
  html() { return `${titleBar('Penalty Shootout')}<div class="pen" id="penBox"><div class="pen-dots" id="penDots">${'<i></i>'.repeat(5)}</div><div class="pen-goal"><div class="pen-net"></div><div class="keeper" id="keeper">🧤</div><div class="ball" id="ball">⚽</div></div><p class="pen-msg" id="penMsg">Pick where to shoot</p><div class="pen-btns" id="penBtns"><button data-d="left">${ico('arrow-up-left')}Left</button><button data-d="center">${ico('arrow-up')}Center</button><button data-d="right">${ico('arrow-up-right')}Right</button></div></div>`; },
  async wire() {
    $('#back').onclick = () => render('games'); let id, busy = false;
    try { id = (await api('/api/games/penalty/start', 'POST')).id; } catch (e) { return errBox($('#penBox'), e); }
    const dots = [...document.querySelectorAll('#penDots i')], msg = $('#penMsg'), ball = $('#ball'), keeper = $('#keeper');
    const reset = () => { ball.style.transition = 'none'; ball.style.transform = ''; keeper.style.transition = 'none'; keeper.style.transform = ''; void ball.offsetWidth; ball.style.transition = ''; keeper.style.transition = ''; };
    document.querySelectorAll('#penBtns button').forEach(b => b.onclick = async () => {
      if (busy) return; busy = true; document.querySelectorAll('#penBtns button').forEach(x => x.disabled = true);
      try {
        const r = await api(`/api/games/penalty/${id}/kick`, 'POST', { dir: b.dataset.d });
        ball.style.transform = r.result === 'miss' ? `translate(${(SPOT[b.dataset.d] || 1) * 3.2 + (b.dataset.d === 'center' ? 80 : 0)}px,-190px) scale(.5)` : `translate(${SPOT[b.dataset.d] * 3.2}px,-150px) scale(.6)`;
        keeper.style.transform = `translateX(${SPOT[r.keeper] * 3.2}px) rotate(${SPOT[r.keeper] / 3}deg)`;
        dots[r.kick - 1].className = r.result === 'goal' ? 'g' : 'x'; msg.textContent = r.result === 'goal' ? 'GOAL! ⚽' : r.result === 'saved' ? 'Saved by the keeper!' : 'Off target!'; msg.className = 'pen-msg ' + r.result;
        await new Promise(res => setTimeout(res, 1100));
        if (r.done) { $('#penBox').innerHTML = summary(r.score >= 4 ? 'What a shootout!' : r.score >= 2 ? 'Good effort' : 'Better luck next time', r.score, 5, r); $('#gAgain').onclick = () => render('penalty'); $('#gHub').onclick = () => render('games'); return; }
        reset(); msg.textContent = 'Pick where to shoot'; msg.className = 'pen-msg'; document.querySelectorAll('#penBtns button').forEach(x => x.disabled = false); busy = false;
      } catch (e) { notify(e.message); if (/expired/i.test(e.message)) return render('penalty'); document.querySelectorAll('#penBtns button').forEach(x => x.disabled = false); busy = false; }
    });
    refreshIcons();
  }
};

/* ---------- football quiz ---------- */
S.quiz = {
  html() { return `${titleBar('Football Quiz')}<div class="quiz" id="qBox"><div class="feed-loading">Loading…</div></div>`; },
  async wire() {
    $('#back').onclick = () => render('games'); let g;
    try { g = await api('/api/games/quiz/start', 'POST'); } catch (e) { return errBox($('#qBox'), e); }
    let i = 0;
    const show = () => {
      const q = g.questions[i];
      $('#qBox').innerHTML = `<div class="q-prog"><i style="width:${i / g.questions.length * 100}%"></i></div><small class="muted">Question ${i + 1} of ${g.questions.length}</small><h2 class="q-text">${esc(q.q)}</h2><div class="q-opts">${q.options.map((o, k) => `<button data-k="${k}">${esc(o)}</button>`).join('')}</div><div id="qNext"></div>`;
      document.querySelectorAll('.q-opts button').forEach(b => b.onclick = async () => {
        document.querySelectorAll('.q-opts button').forEach(x => x.disabled = true);
        try {
          const r = await api(`/api/games/quiz/${g.id}/answer`, 'POST', { i, choice: +b.dataset.k });
          const btns = [...document.querySelectorAll('.q-opts button')]; btns[r.answer].classList.add('right'); if (!r.correct) b.classList.add('wrong');
          $('#qNext').innerHTML = `<button class="save-avatar" id="qGo">${r.done ? 'See result' : 'Next question'}</button>`;
          $('#qGo').onclick = () => { if (r.done) { $('#qBox').innerHTML = summary(r.score >= 4 ? 'Football genius!' : r.score >= 2 ? 'Nice one' : 'Keep practising', r.score, 5, r); $('#gAgain').onclick = () => render('quiz'); $('#gHub').onclick = () => render('games'); } else { i++; show(); } };
        } catch (e) { notify(e.message); if (/expired/i.test(e.message)) render('quiz'); }
      });
    };
    show();
  }
};

/* ---------- opportunities hub ---------- */
const TILE = { trial: 'clipboard-list', tournament: 'trophy', discount: 'badge-percent', sponsorship: 'handshake', job: 'briefcase', event: 'calendar-days', education: 'graduation-cap', talent: 'star' };
const sectionTypes = ['trial', 'tournament', 'discount', 'sponsorship', 'job', 'event', 'education', 'talent'];
S.opportunities = {
  html() { return `${titleBar('Opportunities', `<button class="round bare" id="opNew" aria-label="Post">${ico('plus')}</button>`)}<div class="seg wide" id="opTabs"><button class="on" data-t="all">Browse</button><button data-t="mine">Mine</button></div><div class="op-tiles" id="opTiles">${sectionTypes.map(k => `<button class="op-tile" data-t="${k}">${ico(TILE[k])}<span>${OPP[k]}</span></button>`).join('')}</div><div class="search-pill s-in2">${ico('search')}<input id="opQ" placeholder="Search by title or place"></div><div id="opBody"><div class="feed-loading">Loading…</div></div>`; },
  wire() {
    $('#back').onclick = back; let tab = 'all', type = '', timer; const body = $('#opBody');
    const hook = () => { body.querySelectorAll('[data-o]').forEach(e => e.onclick = () => render('opportunity', e.dataset.o)); body.querySelectorAll('[data-see]').forEach(b => b.onclick = () => { type = b.dataset.see; mark(); load(); }); refreshIcons(); };
    const mark = () => document.querySelectorAll('#opTiles .op-tile').forEach(x => x.classList.toggle('on', x.dataset.t === type));
    async function load() {
      body.innerHTML = '<div class="feed-loading">Loading…</div>'; $('#opTiles').style.display = $('.s-in2').style.display = tab === 'all' ? '' : 'none';
      try {
        if (tab === 'mine') { if (!needLogin()) return; const { posted, applied } = await api('/api/opportunities/mine'); body.innerHTML = `<h3 class="sec-title">Posted by me</h3>${posted.map(oppCard).join('') || empty('Nothing posted yet.')}<h3 class="sec-title">My applications</h3>${applied.filter(a => a.opportunity).map(a => oppCard({ ...a.opportunity, status: 'applied' })).join('') || empty('No applications yet.')}`; return hook(); }
        const q = $('#opQ').value.trim(), { opportunities } = await api(`/api/opportunities?${type ? 'type=' + type + '&' : ''}${q ? 'q=' + encodeURIComponent(q) : ''}`);
        if (!opportunities.length) { body.innerHTML = empty('No opportunities right now. Check back soon or post one.'); return; }
        if (type || q) { body.innerHTML = (type ? `<h3 class="sec-title">${OPP[type]}</h3>` : '') + opportunities.map(oppCard).join(''); return hook(); }
        body.innerHTML = sectionTypes.map(k => { const l = opportunities.filter(o => o.type === k); return l.length ? `<section class="op-sec"><div class="sec-head">${ico(TILE[k])}<b>${OPP[k]}</b><button class="see-all" data-see="${k}">See All ${ico('chevron-right')}</button></div><div class="hscroll op-row">${l.slice(0, 8).map(oppCard).join('')}</div></section>` : ''; }).join('');
        hook();
      } catch (e) { errBox(body, e); }
    }
    document.querySelectorAll('#opTiles .op-tile').forEach(b => b.onclick = () => { type = type === b.dataset.t ? '' : b.dataset.t; mark(); load(); });
    document.querySelectorAll('#opTabs button').forEach(b => b.onclick = () => { tab = b.dataset.t; document.querySelectorAll('#opTabs button').forEach(x => x.classList.toggle('on', x === b)); load(); });
    $('#opQ').oninput = () => { clearTimeout(timer); timer = setTimeout(load, 350); };
    $('#opNew').onclick = () => {
      if (!needLogin()) return;
      sheet(`<h3 class="sh-title">Post an opportunity</h3><select id="onType" class="sh-in">${Object.entries(OPP).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select><input id="onTitle" class="sh-in" maxlength="100" placeholder="Title"><input id="onLoc" class="sh-in" maxlength="80" placeholder="Location (city or Online)"><input id="onSport" class="sh-in" maxlength="40" placeholder="Sport (e.g. Football)"><div class="sh-row"><input id="onFee" class="sh-in" maxlength="40" placeholder="Price (e.g. From $250 or Free)"><input id="onSpots" class="sh-in" type="number" min="1" placeholder="Spots"></div><label class="sh-lbl">Starts</label><input id="onStart" class="sh-in" type="date"><label class="sh-lbl">Apply by</label><input id="onDead" class="sh-in" type="date"><input id="onLink" class="sh-in" placeholder="Link (https://…) optional"><label class="sh-file">${ico('image')}<span id="onCoverTxt">Add a cover image (optional)</span><input id="onCover" type="file" accept="image/jpeg,image/png,image/webp" hidden></label><textarea id="onDesc" class="sh-text" maxlength="2000" placeholder="Describe the opportunity and who it is for (min 20 characters)"></textarea><button class="purchase" id="onGo">Submit for review</button>`); refreshIcons();
      $('#onCover').onchange = e => { $('#onCoverTxt').textContent = e.target.files[0]?.name || 'Add a cover image (optional)'; };
      $('#onGo').onclick = async () => {
        const btn = $('#onGo'); btn.disabled = true;
        try {
          let coverUrl = ''; const f = $('#onCover').files[0];
          if (f) { btn.textContent = 'Uploading image…'; const fd = new FormData(); fd.append('file', f); const r = await fetch('/api/uploads/post-media', { method: 'POST', headers: headers(false), body: fd }), j = await r.json(); if (!r.ok) throw new Error(j.error || 'Image upload failed'); coverUrl = j.url; }
          const d = await api('/api/opportunities', 'POST', { type: $('#onType').value, title: $('#onTitle').value, location: $('#onLoc').value, sport: $('#onSport').value, fee: $('#onFee').value, spots: $('#onSpots').value || undefined, startsAt: $('#onStart').value || undefined, deadline: $('#onDead').value || undefined, link: $('#onLink').value, coverUrl, description: $('#onDesc').value });
          closeSheets(); notify(d.message); tab = 'mine'; document.querySelectorAll('#opTabs button').forEach(x => x.classList.toggle('on', x.dataset.t === 'mine')); load();
        } catch (e) { notify(e.message); btn.disabled = false; btn.textContent = 'Submit for review'; }
      };
    };
    load();
  }
};
})();
