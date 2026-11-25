// Server-Sent Events hub: instant notifications/messages with zero extra dependencies.
const clients = new Map();
function add(userId, res) {
  const key = String(userId); const set = clients.get(key) || new Set();
  if (set.size >= 5) { const old = set.values().next().value; try { old.end(); } catch (_) {} set.delete(old); }
  set.add(res); clients.set(key, set);
  res.on('close', () => { set.delete(res); if (!set.size) clients.delete(key); });
}
function push(userId, event, data) {
  const set = clients.get(String(userId)); if (!set) return;
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) { try { res.write(msg); } catch (_) {} }
}
setInterval(() => { for (const set of clients.values()) for (const res of set) { try { res.write(': ping\n\n'); } catch (_) {} } }, 25000).unref();
module.exports = { add, push };
