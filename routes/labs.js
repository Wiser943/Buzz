const express = require('express');
const router = express.Router();

const LABS = [
  {
    id: 'neural-classifier',
    slug: 'neural-classifier',
    title: 'AI & Neural Network Classifier Lab',
    category: 'AI & Computing',
    icon: 'brain-circuit',
    tag: 'Interactive Canvas Simulation',
    difficulty: 'All Levels',
    description: 'Place positive and negative data points on a 2D plane. Watch an artificial neural network learn the decision boundary in real-time!',
    concepts: ['Perceptron', 'Decision Boundary', 'Weights & Biases', 'Epochs', 'Loss Function'],
    defaultParams: { lr: 0.1, epochs: 100 }
  },
  {
    id: 'ohms-law-lab',
    slug: 'ohms-law-lab',
    title: "Ohm's Law & Circuit Simulator",
    category: 'Physics',
    icon: 'zap',
    tag: 'Live Circuit Hardware Lab',
    difficulty: 'High School',
    description: 'Adjust battery voltage and resistor resistance. Watch animated electron current flow and observe light bulb brightness change according to V = I × R.',
    concepts: ['Voltage (V)', 'Current (I)', 'Resistance (R)', 'Electrical Power (W)', 'Electron Drift'],
    defaultParams: { voltage: 9, resistance: 10 }
  },
  {
    id: 'optics-refraction',
    slug: 'optics-refraction',
    title: 'Optics & Light Refraction (Snell’s Law)',
    category: 'Physics',
    icon: 'sun',
    tag: 'Optical Ray Tracer',
    difficulty: 'High School',
    description: 'Shoot laser rays across media interfaces (Air, Water, Glass, Diamond). Observe the critical angle and total internal reflection live.',
    concepts: ["Snell's Law", 'Refraction Index', 'Total Internal Reflection', 'Critical Angle'],
    defaultParams: { angle: 45, medium: 'water' }
  },
  {
    id: 'osmosis-simulator',
    slug: 'osmosis-simulator',
    title: 'Cell Osmosis & Turgor Pressure Simulator',
    category: 'Biology',
    icon: 'droplets',
    tag: 'Microscopic Cell Lab',
    difficulty: 'High School',
    description: 'Place plant or animal cells into hypotonic, isotonic, or hypertonic solutions. Observe water diffusion and cell wall turgor pressure changes.',
    concepts: ['Osmotic Gradient', 'Tonicity', 'Turgidity & Plasmolysis', 'Cell Membrane'],
    defaultParams: { tonicity: 'hypotonic', cellType: 'plant' }
  },
  {
    id: 'logic-gates-lab',
    slug: 'logic-gates-lab',
    title: 'Logic Gates & Binary Circuit Builder',
    category: 'AI & Computing',
    icon: 'cpu',
    tag: 'Digital Logic Workbench',
    difficulty: 'Beginner',
    description: 'Toggle inputs A and B to test AND, OR, NOT, NAND, NOR, and XOR gates with live output LEDs and automated truth tables.',
    concepts: ['Boolean Algebra', 'Logic Gates', 'Truth Tables', 'Transistors', 'Binary Logic'],
    defaultParams: { gate: 'AND', inputA: 1, inputB: 0 }
  },
  {
    id: 'python-sandbox',
    slug: 'python-sandbox',
    title: 'In-Browser Python / AI Code Sandbox',
    category: 'Programming',
    icon: 'code-2',
    tag: 'Live Code Environment',
    difficulty: 'All Levels',
    description: 'Write and run real Python and STEM algorithms directly in your browser. Includes presets for linear regression, Ohm’s law, and statistics.',
    concepts: ['Python Execution', 'NumPy Arrays', 'Machine Learning Math', 'Algorithms'],
    defaultParams: { preset: 'linear-regression' }
  }
];

// GET /api/labs - list all labs
router.get('/', (req, res) => {
  const { category, q } = req.query;
  let results = [...LABS];
  if (category && category !== 'All') {
    results = results.filter(l => l.category.toLowerCase() === category.toLowerCase());
  }
  if (q && q.trim()) {
    const term = q.trim().toLowerCase();
    results = results.filter(l =>
      l.title.toLowerCase().includes(term) ||
      l.description.toLowerCase().includes(term) ||
      l.concepts.some(c => c.toLowerCase().includes(term))
    );
  }
  res.json({ total: results.length, labs: results });
});

// GET /api/labs/:id - single lab
router.get('/:id', (req, res) => {
  const lab = LABS.find(l => l.id === req.params.id || l.slug === req.params.id);
  if (!lab) return res.status(404).json({ error: 'Lab not found' });
  res.json({ lab });
});

module.exports = router;
module.exports.LABS = LABS;
