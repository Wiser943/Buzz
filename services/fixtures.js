// Pulls fixtures and final scores from football-data.org and settles predictions automatically.
// Needs FOOTBALL_DATA_API_KEY. Optional: FOOTBALL_COMPETITIONS="PL,CL,PD,SA,BL1,FL1,WC".
const Match = require('../models/Match');
const { settle } = require('./sports.service');
let last = 0, running = false;
const iso = t => new Date(t).toISOString().slice(0, 10);
const num = v => (typeof v === 'number' && Number.isFinite(v)) ? v : null;
async function sync(force = false) {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key || running || (!force && Date.now() - last < 20 * 60e3)) return { skipped: true };
  running = true; last = Date.now();
  try {
    const comps = process.env.FOOTBALL_COMPETITIONS ? '&competitions=' + encodeURIComponent(process.env.FOOTBALL_COMPETITIONS) : '';
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 20000);
    const r = await fetch(`https://api.football-data.org/v4/matches?dateFrom=${iso(Date.now() - 2 * 864e5)}&dateTo=${iso(Date.now() + 7 * 864e5)}${comps}`, { headers: { 'X-Auth-Token': key }, signal: ctl.signal });
    clearTimeout(timer);
    if (!r.ok) throw new Error('football-data ' + r.status);
    const { matches = [] } = await r.json();
    let created = 0, settled = 0;
    for (const m of matches) {
      if (!m.homeTeam?.name || !m.awayTeam?.name) continue;               // knockout rounds with teams still unknown
      const finished = ['FINISHED', 'AWARDED'].includes(m.status);
      const h = num(m.score?.regularTime?.home ?? m.score?.fullTime?.home), a = num(m.score?.regularTime?.away ?? m.score?.fullTime?.away);
      const id = String(m.id); let doc = await Match.findOne({ externalId: id });
      if (!doc) {
        if (created >= 60) continue;
        await Match.create({ externalId: id, source: 'football-data', league: String(m.competition?.name || '').slice(0, 80), home: String(m.homeTeam.shortName || m.homeTeam.name).slice(0, 60), away: String(m.awayTeam.shortName || m.awayTeam.name).slice(0, 60), kickoff: new Date(m.utcDate), status: finished && h != null && a != null ? 'finished' : 'upcoming', homeScore: finished ? h : null, awayScore: finished ? a : null });
        created++; continue;
      }
      if (doc.status === 'upcoming') {
        if (finished && h != null && a != null) { await settle(doc, h, a); settled++; }
        else if (+new Date(m.utcDate) !== +doc.kickoff) { doc.kickoff = new Date(m.utcDate); await doc.save(); }
      }
    }
    if (created || settled) console.log(`[fixtures] added ${created}, settled ${settled}`);
    return { created, settled };
  } catch (e) { console.error('[fixtures] sync failed:', e.message); return { error: e.message }; }
  finally { running = false; }
}
module.exports = { sync };
