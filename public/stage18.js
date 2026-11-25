/* ===== Stage 18: Inbox, group chats, new chat, Buzzer AI assistant ===== */
(() => {
'use strict';
const S = screens;
Object.assign(ROUTES, { assistant: '/assistant', newChat: '/inbox/new', newGroup: '/inbox/group' });
PROTECTED.push('assistant', 'newChat', 'newGroup', 'groupChat');
DYN.push([/^\/inbox\/g\/([a-f0-9]{24})$/i, 'groupChat', a => '/inbox/g/' + a]);
const dlabel = d => { const x = new Date(d), n = new Date(); return x.toDateString() === n.toDateString() ? x.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : x.toLocaleDateString([], { month: 'short', day: 'numeric' }); };
const groupAv = (cls = 'md') => `<div class="av ${cls} grp">${ico('users')}</div>`;
const myId = async () => localStorage.getItem('buzzerId') || (await loadMe())?.user?._id;

/* ---------- inbox ---------- */
S.messages = {
  html() { return `<div class="sub-head"><button class="round bare" id="back" aria-label="Back">${ico('arrow-left')}</button><b>Inbox</b><button class="round bare ring" id="newChat" aria-label="New chat">${ico('plus')}</button></div><div class="ib-search">${ico('search')}<input id="ibQ" placeholder="Search" autocomplete="off"></div><div class="ib-chips" id="ibChips"><button data-f="all" class="on">All</button><button data-f="unread">Unread</button><button data-f="groups">Groups</button></div><button class="ai-card" id="aiCard"><span class="ai-logo">B</span><span class="ai-t"><b>AI Assistant</b><small>Let’s Talk</small></span>${ico('arrow-right')}</button><div id="mList"><div class="feed-loading">Loading…</div></div>`; },
  async wire() {
    $('#back').onclick = back; $('#newChat').onclick = () => render('newChat'); $('#aiCard').onclick = () => render('assistant');
    let all = [], f = 'all', q = '';
    const draw = () => {
      const list = $('#mList'); if (!list) return;
      const rows = all.filter(c => (f === 'all' || (f === 'unread' && c.unread) || (f === 'groups' && c.isGroup)) && (!q || ((c.isGroup ? c.name : (c.user.displayName + ' ' + c.user.username)) + ' ' + (c.lastMessage || '')).toLowerCase().includes(q)));
      list.innerHTML = rows.length ? rows.map(c => `<div class="cv" data-k="${c.isGroup ? 'g' : 'u'}" data-id="${c.isGroup ? c.id : esc(c.user.username)}">${c.isGroup ? groupAv() : userAv(c.user, 'md')}<div class="cv-t"><b>${esc(c.isGroup ? c.name : (c.user.displayName || c.user.username))}${c.isGroup ? '' : vb(c.user)}</b><small class="${c.unread ? 'strong' : ''}">${c.isGroup && c.lastMessage ? esc((c.mine ? 'You' : c.lastSenderName || 'Someone') + ': ') : c.mine ? 'You: ' : ''}${esc(c.lastMessage || '')}</small></div><div class="cv-r"><small>${c.lastAt ? dlabel(c.lastAt) : ''}</small>${c.unread ? `<i class="dot">${c.unread}</i>` : ''}</div></div>`).join('') : `<div class="notif-empty">${all.length ? 'No conversations match.' : 'No conversations yet. Tap + to start one.'}</div>`;
      list.querySelectorAll('.cv').forEach(e => e.onclick = () => e.dataset.k === 'g' ? render('groupChat', e.dataset.id) : render('chat', e.dataset.id)); refreshIcons();
    };
    const load = async () => { try { all = (await api('/api/messages/conversations')).conversations; draw(); } catch (e) { if ($('#mList') && !all.length) errBox($('#mList'), e); } };
    $('#ibQ').oninput = e => { q = e.target.value.trim().toLowerCase(); draw(); };
    document.querySelectorAll('#ibChips button').forEach(b => b.onclick = () => { f = b.dataset.f; document.querySelectorAll('#ibChips button').forEach(x => x.classList.toggle('on', x === b)); draw(); });
    await load(); const t = setInterval(() => { if (currentView !== 'messages') return clearInterval(t); load(); }, 15000);
  }
};

/* ---------- new chat ---------- */
const contactRow = (u, extra = '') => `<button class="ct" data-u="${esc(u.username)}">${userAv(u, 'md')}<span><b>${esc(u.displayName || u.username)}${vb(u)}</b><small>@${esc(u.username)}</small></span>${extra}</button>`;
S.newChat = {
  html() { return `${titleBar('New Chat')}<div class="ib-search">${ico('search')}<input id="ncQ" placeholder="Search" autocomplete="off"></div><button class="nc-group" id="ncGroup"><span class="nc-ico">${ico('users')}</span><span><b>New Group Chat</b><small>Add up to 200 users</small></span>${ico('chevron-right', 'chev')}</button><p class="muted pad2 nc-note">You can only message users who follow you and whom you follow.</p><div id="ncList"><div class="feed-loading">Loading…</div></div>`; },
  async wire() {
    $('#back').onclick = back; $('#ncGroup').onclick = () => render('newGroup');
    try {
      const { users } = await api('/api/messages/contacts'); const draw = q => { const l = users.filter(u => !q || (u.displayName + ' ' + u.username).toLowerCase().includes(q)); $('#ncList').innerHTML = l.length ? l.map(u => contactRow(u)).join('') : empty(users.length ? 'No one matches.' : 'No contacts yet. You and another user must follow each other first.'); $('#ncList').querySelectorAll('.ct').forEach(b => b.onclick = () => render('chat', b.dataset.u)); refreshIcons(); };
      draw(''); $('#ncQ').oninput = e => draw(e.target.value.trim().toLowerCase());
    } catch (e) { errBox($('#ncList'), e); }
  }
};
S.newGroup = {
  html() { return `${titleBar('New Group')}<div class="ng-wrap"><input id="ngName" class="sh-in" maxlength="50" placeholder="Group name" autocomplete="off"><div class="ng-count" id="ngCount">0 selected · up to 199</div></div><div class="ib-search">${ico('search')}<input id="ngQ" placeholder="Search contacts" autocomplete="off"></div><div id="ngList"><div class="feed-loading">Loading…</div></div><div class="k-foot"><button class="save-avatar" id="ngGo" disabled>Create group</button></div>`; },
  async wire() {
    $('#back').onclick = back; const sel = new Set();
    try {
      const { users } = await api('/api/messages/contacts');
      const draw = () => { const q = $('#ngQ').value.trim().toLowerCase(), l = users.filter(u => !q || (u.displayName + ' ' + u.username).toLowerCase().includes(q)); $('#ngList').innerHTML = l.length ? l.map(u => contactRow(u, `<i class="ck ${sel.has(u.username) ? 'on' : ''}">${sel.has(u.username) ? ico('check') : ''}</i>`)).join('') : empty(users.length ? 'No one matches.' : 'No contacts yet. You and another user must follow each other first.'); $('#ngList').querySelectorAll('.ct').forEach(b => b.onclick = () => { const u = b.dataset.u; if (sel.has(u)) sel.delete(u); else if (sel.size < 199) sel.add(u); else notify('A group can have up to 200 people'); $('#ngCount').textContent = `${sel.size} selected · up to 199`; $('#ngGo').disabled = !sel.size; draw(); }); refreshIcons(); };
      draw(); $('#ngQ').oninput = draw;
    } catch (e) { errBox($('#ngList'), e); }
    $('#ngGo').onclick = async () => { const name = $('#ngName').value.trim(); if (name.length < 2) return notify('Give the group a name'); $('#ngGo').disabled = true; try { const d = await api('/api/messages/groups', 'POST', { name, usernames: [...sel] }); render('groupChat', d.id); } catch (e) { notify(e.message); $('#ngGo').disabled = false; } };
  }
};

/* ---------- group chat ---------- */
S.groupChat = {
  html() { return `<div class="sub-head" id="gcHead"><button class="round bare" id="back" aria-label="Back">${ico('arrow-left')}</button></div><div class="chat-log" id="chLog"></div><div class="chat-bar" id="chBar"></div>`; },
  async wire(id) {
    window.__gchat = id; $('#back').onclick = () => render('messages');
    const log = $('#chLog'), me = String(await myId()); let last = null, timer, members = [], group = null;
    const bub = m => { const mine = String(m.sender?._id) === me; return `<div class="bub ${mine ? 'me' : ''}">${mine ? '' : `<span class="bub-n" data-u="${esc(m.sender?.username || '')}">${esc(m.sender?.displayName || m.sender?.username || 'Member')}</span>`}${esc(m.text)}<small>${new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></div>`; };
    const info = () => {
      const owner = String(group.owner) === me;
      sheet(`<h3 class="sh-title">${esc(group.name)} · ${members.length} members</h3><div class="gi-list">${members.map(u => `<div class="ct" data-u="${esc(u.username)}">${userAv(u, 'sm')}<span><b>${esc(u.displayName || u.username)}${vb(u)}</b><small>@${esc(u.username)}${String(u._id) === String(group.owner) ? ' · owner' : ''}</small></span>${owner && String(u._id) !== me ? `<button class="pill rm" data-u="${esc(u.username)}">Remove</button>` : ''}</div>`).join('')}</div>${owner ? `<button class="purchase" id="giAdd">${ico('user-plus')}Add people</button>` : ''}<button class="purchase danger" id="giLeave">${ico('log-out')}Leave group</button>`); refreshIcons();
      document.querySelectorAll('.gi-list .ct').forEach(c => c.onclick = e => { if (e.target.closest('.rm')) return; closeSheets(); render('user', c.dataset.u); });
      document.querySelectorAll('.gi-list .rm').forEach(b => b.onclick = async () => { try { await api(`/api/messages/groups/${id}/remove`, 'POST', { username: b.dataset.u }); members = members.filter(u => u.username !== b.dataset.u); group.count--; info(); } catch (e) { notify(e.message); } });
      $('#giLeave').onclick = async () => { if (!confirm('Leave this group?')) return; try { await api(`/api/messages/groups/${id}/leave`, 'POST'); closeSheets(); render('messages'); } catch (e) { notify(e.message); } };
      $('#giAdd')?.addEventListener('click', async () => {
        try {
          const { users } = await api('/api/messages/contacts'), have = new Set(members.map(u => u.username)), cand = users.filter(u => !have.has(u.username)), pick = new Set();
          if (!cand.length) return notify('Everyone you can add is already here');
          sheet(`<h3 class="sh-title">Add people</h3><div id="apList">${cand.map(u => contactRow(u, '<i class="ck"></i>')).join('')}</div><button class="purchase" id="apGo">Add selected</button>`);
          document.querySelectorAll('#apList .ct').forEach(b => b.onclick = () => { const u = b.dataset.u; pick.has(u) ? pick.delete(u) : pick.add(u); b.querySelector('.ck').classList.toggle('on', pick.has(u)); });
          $('#apGo').onclick = async () => { if (!pick.size) return; try { await api(`/api/messages/groups/${id}/members`, 'POST', { usernames: [...pick] }); closeSheets(); notify('People added'); render('groupChat', id); } catch (e) { notify(e.message); } };
        } catch (e) { notify(e.message); }
      });
    };
    async function pull(first) {
      const d = await api(`/api/messages/groups/${id}` + (last ? '?after=' + encodeURIComponent(last) : '')); if (window.__gchat !== id) return;
      if (first) {
        group = d.group; members = d.members;
        $('#gcHead').innerHTML = `<button class="round bare" id="back">${ico('arrow-left')}</button><div class="ph-av">${groupAv('sm')}</div><div class="ph-name" id="gcInfo"><b>${esc(group.name)}</b><small>${group.count} members · tap for info</small></div>`; $('#back').onclick = () => render('messages'); $('#gcInfo').onclick = info;
        $('#chBar').innerHTML = `<input id="chIn" maxlength="2000" placeholder="Message…" autocomplete="off"><button id="chSend">${ico('send')}</button>`; refreshIcons();
        const send = async () => { const t = $('#chIn').value.trim(); if (!t) return; $('#chIn').value = ''; try { await api(`/api/messages/groups/${id}/messages`, 'POST', { text: t }); await pull(); } catch (e) { notify(e.message); $('#chIn').value = t; } };
        $('#chSend').onclick = send; $('#chIn').onkeydown = e => { if (e.key === 'Enter') send(); };
      }
      if (d.messages.length) { log.querySelector('.notif-empty')?.remove(); log.insertAdjacentHTML('beforeend', d.messages.map(bub).join('')); last = d.messages[d.messages.length - 1].createdAt; log.querySelectorAll('.bub-n').forEach(n => n.onclick = () => n.dataset.u && render('user', n.dataset.u)); window.scrollTo(0, document.body.scrollHeight); }
      else if (first) log.innerHTML = '<div class="notif-empty">Say hello to the group 👋</div>';
    }
    try { await pull(true); } catch (e) { errBox(log, e); return; }
    timer = setInterval(() => { if (window.__gchat !== id || currentView !== 'groupChat') return clearInterval(timer); pull().catch(() => {}); updateBadges?.(); }, 4000);
  }
};

/* ---------- Buzzer AI assistant (Gemini) ---------- */
const KEY = 'bzAiChat';
const store = { get: () => { try { return JSON.parse(sessionStorage.getItem(KEY) || '[]'); } catch { return []; } }, set: v => { try { sessionStorage.setItem(KEY, JSON.stringify(v.slice(-30))); } catch { } } };
const fmt = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/^\s*[*-] /gm, '• ').replace(/\n/g, '<br>');
const SUGGEST = ['Explain the offside rule', 'Write a caption for my match-day photo', 'Give me a post idea about my team', 'How do karma levels work?'];
S.assistant = {
  html() { return `<div class="sub-head"><button class="round bare" id="back" aria-label="Back">${ico('arrow-left')}</button><div class="ai-head"><span class="ai-logo sm">B</span><span><b>Buzzer AI</b><small id="aiSub">Sports and Buzzer help</small></span></div><button class="round bare" id="aiClear" aria-label="Clear chat">${ico('trash-2')}</button></div><div class="chat-log ai-log" id="aiLog"></div><div class="ai-note">AI can make mistakes. Do not share passwords or private details.</div><div class="chat-bar" id="aiBar"><input id="aiIn" maxlength="1000" placeholder="Ask anything about sports or Buzzer…" autocomplete="off"><button id="aiSend" aria-label="Send">${ico('send')}</button></div>`; },
  async wire() {
    $('#back').onclick = back; const log = $('#aiLog'); let msgs = store.get(), busy = false, enabled = true;
    const draw = () => {
      log.innerHTML = msgs.length ? msgs.map(m => `<div class="bub ${m.role === 'user' ? 'me' : 'ai'}">${fmt(m.text)}</div>`).join('') : `<div class="ai-empty"><span class="ai-logo big">B</span><h3>Hi, I’m Buzzer AI</h3><p>Ask me about rules, history and tactics, get help writing posts and captions, or learn how Buzzer works.</p><div class="ai-sug">${SUGGEST.map(s => `<button>${s}</button>`).join('')}</div></div>`;
      log.querySelectorAll('.ai-sug button').forEach(b => b.onclick = () => send(b.textContent)); window.scrollTo(0, document.body.scrollHeight);
    };
    const send = async text => {
      text = (text ?? $('#aiIn').value).trim(); if (!text || busy) return; if (!enabled) return notify('The assistant is not set up yet');
      busy = true; $('#aiIn').value = ''; msgs.push({ role: 'user', text }); store.set(msgs); draw(); log.insertAdjacentHTML('beforeend', '<div class="bub ai typing" id="aiTyping"><i></i><i></i><i></i></div>'); window.scrollTo(0, document.body.scrollHeight);
      try { const d = await api('/api/ai/chat', 'POST', { messages: msgs.slice(-10) }); msgs.push({ role: 'assistant', text: d.reply }); store.set(msgs); if (d.remaining != null) $('#aiSub').textContent = `${d.remaining} messages left today`; }
      catch (e) { $('#aiTyping')?.remove(); log.insertAdjacentHTML('beforeend', `<div class="bub ai err">${esc(e.message)}</div>`); busy = false; return; }
      busy = false; draw();
    };
    $('#aiSend').onclick = () => send(); $('#aiIn').onkeydown = e => { if (e.key === 'Enter') send(); };
    $('#aiClear').onclick = () => { if (!msgs.length) return; msgs = []; store.set(msgs); draw(); };
    draw();
    try { const s = await api('/api/ai/status'); enabled = s.enabled; $('#aiSub').textContent = s.enabled ? `${s.remaining} messages left today` : 'Not set up yet'; if (!s.enabled) log.insertAdjacentHTML('beforeend', '<div class="bub ai err">The AI assistant is not set up yet. The site owner needs to add a Gemini API key.</div>'); } catch { }
  }
};
})();
