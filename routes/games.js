// Server-authoritative mini games. Results are decided here so scores cannot be faked from the browser.
// Game points are separate from your real-money Points and prediction points, and capped per day.
const router = require('express').Router();
const crypto = require('crypto');
const auth = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const User = require('../models/User');
router.use(auth);
const CAP = () => Math.max(1, Number(process.env.GAME_DAILY_CAP) || 15);
const day = () => Math.floor(Date.now() / 864e5);
const sessions = new Map();               // id -> session (in memory; fine for one server instance)
setInterval(() => { const now = Date.now(); for (const [k, v] of sessions) if (v.exp < now) sessions.delete(k); }, 60000).unref();
const mk = (user, game, extra) => { for (const [k, v] of sessions) if (v.user === String(user) && v.game === game) sessions.delete(k); const id = crypto.randomBytes(12).toString('hex'); sessions.set(id, { user: String(user), game, exp: Date.now() + 15 * 60e3, score: 0, step: 0, ...extra }); return id; };
const get = (req, game) => { const s = sessions.get(req.params.id); return s && s.user === String(req.user._id) && s.game === game ? s : null; };
async function award(userId, pts) {
  const u = await User.findById(userId).select('gameDaily gamePoints');
  const used = u.gameDaily?.day === day() ? (u.gameDaily.points || 0) : 0, give = Math.max(0, Math.min(pts, CAP() - used));
  if (give) await User.updateOne({ _id: userId }, { $inc: { gamePoints: give }, $set: { gameDaily: { day: day(), points: used + give } } });
  return { awarded: give, earnedToday: used + give, dailyCap: CAP(), total: (u.gamePoints || 0) + give };
}
router.get('/status', async (req, res) => {
  const u = req.user, used = u.gameDaily?.day === day() ? (u.gameDaily.points || 0) : 0;
  res.json({ total: u.gamePoints || 0, earnedToday: used, dailyCap: CAP() });
});
router.get('/leaderboard', async (req, res, next) => {
  try { res.json({ leaders: await User.find({ gamePoints: { $gt: 0 }, status: 'active' }).sort({ gamePoints: -1, createdAt: 1 }).limit(20).select('username displayName avatarUrl isVerified gamePoints') }); } catch (e) { next(e); }
});

// ---- Penalty shootout: 5 kicks, the keeper's dive is random and picked on the server ----
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const DIRS = ['left', 'center', 'right'];
router.post('/penalty/start', rateLimit({ windowMs: 3600e3, max: 30, by: 'user' }), (req, res) => res.json({ id: mk(req.user._id, 'penalty', {}), kicks: 5 }));
router.post('/penalty/:id/kick', async (req, res, next) => {
  try {
    const s = get(req, 'penalty'); if (!s) return res.status(404).json({ error: 'Game expired. Start again.' });
    const dir = String(req.body?.dir || ''); if (!DIRS.includes(dir)) return res.status(400).json({ error: 'Pick left, center or right.' });
    if (s.step >= 5) return res.status(400).json({ error: 'Game is over.' });
    const keeper = DIRS[crypto.randomInt(3)], off = crypto.randomInt(100) < 10;        // 10% of shots miss the target
    const result = off ? 'miss' : keeper === dir ? 'saved' : 'goal';
    s.step++; if (result === 'goal') s.score++;
    const done = s.step >= 5, out = { result, keeper, kick: s.step, score: s.score, done };
    if (done) { sessions.delete(req.params.id); Object.assign(out, await award(req.user._id, s.score)); }
    res.json(out);
  } catch (e) { next(e); }
});

// ---- Football quiz: 5 random questions; the answer is revealed only after you answer ----
const BANK = [
  ['Which country won the first FIFA World Cup in 1930?', ['Brazil', 'Uruguay', 'Argentina', 'Italy'], 1],
  ['Which country has won the most men\'s World Cups?', ['Germany', 'Italy', 'Brazil', 'Argentina'], 2],
  ['Which country hosted the 2010 World Cup?', ['Brazil', 'Germany', 'South Africa', 'Russia'], 2],
  ['Who won the 2014 World Cup?', ['Germany', 'Argentina', 'Netherlands', 'Spain'], 0],
  ['Who won the 2018 World Cup?', ['Croatia', 'France', 'Belgium', 'England'], 1],
  ['Who won the 2022 World Cup?', ['France', 'Croatia', 'Argentina', 'Morocco'], 2],
  ['Which country hosted the 2022 World Cup?', ['Qatar', 'UAE', 'Saudi Arabia', 'Egypt'], 0],
  ['How many players per team are on the pitch in a football match?', ['9', '10', '11', '12'], 2],
  ['How long is a standard football match, not counting stoppage time?', ['80 minutes', '90 minutes', '100 minutes', '120 minutes'], 1],
  ['Who scored the famous “Hand of God” goal in 1986?', ['Pelé', 'Diego Maradona', 'Zinedine Zidane', 'Johan Cruyff'], 1],
  ['Which club has won the most European Cup / Champions League titles?', ['AC Milan', 'Liverpool', 'Bayern Munich', 'Real Madrid'], 3],
  ['Which player has won the most Ballon d\'Or awards?', ['Cristiano Ronaldo', 'Lionel Messi', 'Michel Platini', 'Johan Cruyff'], 1],
  ['Which country has won the most Africa Cup of Nations titles?', ['Nigeria', 'Cameroon', 'Egypt', 'Ghana'], 2],
  ['What is the Nigerian national football team nicknamed?', ['Black Stars', 'Indomitable Lions', 'Super Eagles', 'Pharaohs'], 2],
  ['Who won the delayed Euro 2020, played in 2021?', ['England', 'Italy', 'France', 'Spain'], 1],
  ['Which team won Euro 2024?', ['England', 'Germany', 'Spain', 'France'], 2],
  ['How many points is a shot from behind the three-point line worth in basketball?', ['2', '3', '4', '5'], 1],
  ['How many players per team are on court in basketball?', ['4', '5', '6', '7'], 1],
  ['Which sport is played at Wimbledon?', ['Golf', 'Cricket', 'Tennis', 'Rugby'], 2],
  ['In which sport would you perform a slam dunk?', ['Basketball', 'Volleyball', 'Handball', 'Netball'], 0],
  ['How many rings are on the Olympic flag?', ['4', '5', '6', '7'], 1],
  ['Which city hosted the 2016 Summer Olympics?', ['London', 'Beijing', 'Rio de Janeiro', 'Tokyo'], 2],
  ['Which sprinter holds the men\'s 100m world record of 9.58 seconds?', ['Usain Bolt', 'Tyson Gay', 'Yohan Blake', 'Asafa Powell'], 0],
  ['Which country won the first Rugby World Cup in 1987?', ['Australia', 'South Africa', 'England', 'New Zealand'], 3],
  ['How many points is a try worth in rugby union?', ['3', '4', '5', '7'], 2],
  ['Which sport uses the terms “birdie” and “eagle”?', ['Golf', 'Badminton', 'Archery', 'Baseball'], 0],
  ['How many players are in a cricket team on the field?', ['9', '10', '11', '12'], 2],
  ['Which club plays its home games at Old Trafford?', ['Manchester City', 'Manchester United', 'Liverpool', 'Everton'], 1],
  ['Which club plays its home games at Anfield?', ['Liverpool', 'Chelsea', 'Arsenal', 'Tottenham'], 0],
  ['Which footballer is nicknamed “CR7”?', ['Cristiano Ronaldo', 'Roberto Carlos', 'Rivaldo', 'Ronaldinho'], 0],
  ['What colour card means a player is sent off?', ['Yellow', 'Red', 'Blue', 'Green'], 1],
  ['How many players per team are on court in volleyball?', ['5', '6', '7', '8'], 1],
  ['How long is a marathon?', ['40 km', '42.195 km', '45 km', '36 km'], 1],
  ['Which country has won the most Summer Olympic gold medals overall?', ['China', 'Great Britain', 'Russia', 'United States'], 3]
];
router.post('/quiz/start', rateLimit({ windowMs: 3600e3, max: 30, by: 'user' }), (req, res) => {
  const picks = shuffle(BANK).slice(0, 5).map(([q, opts, a]) => {
    const order = shuffle(opts.map((_, i) => i));
    return { q, options: order.map(i => opts[i]), answer: order.indexOf(a) };
  });
  const id = mk(req.user._id, 'quiz', { qs: picks, answered: [] });
  res.json({ id, questions: picks.map(p => ({ q: p.q, options: p.options })) });
});
router.post('/quiz/:id/answer', async (req, res, next) => {
  try {
    const s = get(req, 'quiz'); if (!s) return res.status(404).json({ error: 'Quiz expired. Start again.' });
    const i = Number(req.body?.i), choice = Number(req.body?.choice);
    if (!Number.isInteger(i) || i < 0 || i >= s.qs.length || !Number.isInteger(choice) || choice < 0 || choice > 3) return res.status(400).json({ error: 'Bad answer.' });
    if (s.answered.includes(i)) return res.status(400).json({ error: 'Already answered.' });
    s.answered.push(i); const correct = choice === s.qs[i].answer; if (correct) s.score++;
    const done = s.answered.length >= s.qs.length, out = { correct, answer: s.qs[i].answer, score: s.score, done };
    if (done) { sessions.delete(req.params.id); Object.assign(out, await award(req.user._id, s.score)); }
    res.json(out);
  } catch (e) { next(e); }
});
module.exports = router;
