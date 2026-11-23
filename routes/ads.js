const router = require('express').Router();
// Ad inventory placeholders for development. Real ad network SDKs are intentionally not loaded yet.
router.get('/placements', (_req, res) => res.json({ placements: [
  { id: 'feed-inline', label: 'Feed sponsored placement', provider: 'placeholder', enabled: false },
  { id: 'explore-card', label: 'Explore sponsored card', provider: 'placeholder', enabled: false },
  { id: 'desktop-sidebar', label: 'Desktop sidebar', provider: 'placeholder', enabled: false }
], note: 'Ads remain disabled until content moderation, consent and publisher approval are ready.' }));
module.exports = router;
