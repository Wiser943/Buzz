const User = require('../models/User');
const Prediction = require('../models/Prediction');
const notify = require('./notify');
const POINTS = { exact: 5, outcome: 2 };
const outcome = (h, a) => Math.sign(h - a);
function score(p, m) {
  if (p.home === m.homeScore && p.away === m.awayScore) return POINTS.exact;
  return outcome(p.home, p.away) === outcome(m.homeScore, m.awayScore) ? POINTS.outcome : 0;
}
// Settles a finished match once: stores points per prediction and credits predPoints + karma.
async function settle(match, homeScore, awayScore) {
  if (match.status === 'finished') throw new Error('Match is already settled.');
  match.homeScore = homeScore; match.awayScore = awayScore; match.status = 'finished'; await match.save();
  const preds = await Prediction.find({ match: match._id });
  for (const p of preds) {
    p.points = score(p, match); await p.save();
    if (p.points > 0) { await User.updateOne({ _id: p.user }, { $inc: { predPoints: p.points, karma: p.points } }); await notify(p.user, { type: 'system', text: `+${p.points} points for ${match.home} ${homeScore}–${awayScore} ${match.away}` }); }
  }
  return preds.length;
}
module.exports = { settle, POINTS };
