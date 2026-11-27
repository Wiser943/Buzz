const express = require('express');
const router = express.Router();
const rateLimit = require('../middleware/rateLimit');

// Rich curriculum covering High School Sciences + Foundational AI & Computing
const LESSONS = [
  {
    id: 'ai-intro',
    slug: 'what-is-artificial-intelligence',
    title: 'Introduction to AI: From Rules to Machine Learning',
    category: 'AI & Computing',
    level: 'Beginner',
    readTime: '6 min read',
    summary: 'Discover how computers learn from examples rather than explicit rules, from simple decision trees to neural networks.',
    content: `
### What is Artificial Intelligence?
Traditional programming relies on human engineers writing strict rules: **Input + Rules = Output**. For example, in a game, if a player presses the right arrow, the character moves right.

Machine learning flips this paradigm: **Input + Output = Rules**. Instead of telling the computer the rules, we show it thousands of examples and let it discover the underlying patterns.

$$f(x) = W \\cdot x + b$$

### Key Branches of AI
1. **Rule-Based Systems**: Hand-crafted if-else logic (e.g. expert medical diagnostic systems from the 1980s).
2. **Machine Learning (ML)**: Statistical models that improve through experience (e.g. spam detection, predicting house prices).
3. **Deep Learning (DL)**: Multi-layered neural networks inspired by biological neurons that excel at vision, speech, and language.

### How Machines "Learn"
At its core, training a model consists of three steps:
* **Forward Pass**: Feed data through the model to get a prediction.
* **Loss Calculation**: Measure how far the prediction is from the actual answer (Mean Squared Error or Cross-Entropy).
* **Optimization (Backpropagation)**: Nudge the weights in the direction that reduces error using Gradient Descent:

$$\\theta_{new} = \\theta_{old} - \\alpha \\cdot \\nabla L$$

where $\\alpha$ is the learning rate.
    `,
    quiz: [
      {
        question: 'What is the fundamental difference between traditional programming and machine learning?',
        options: [
          'Machine learning requires more RAM',
          'Machine learning derives rules automatically from data and outcomes',
          'Traditional programming only works on mobile phones',
          'Machine learning does not use algorithms'
        ],
        answer: 1,
        explanation: 'In machine learning, algorithms discover the rules/patterns automatically from input data and known outputs.'
      },
      {
        question: 'What does the learning rate (α) control in gradient descent?',
        options: [
          'The speed of the computer processor',
          'The size of the adjustment steps taken to reduce error',
          'The number of layers in a neural network',
          'The accuracy of the training dataset'
        ],
        answer: 1,
        explanation: 'The learning rate determines the size of the weight updates made during each optimization step.'
      }
    ],
    labId: 'neural-classifier'
  },
  {
    id: 'bio-photosynthesis',
    slug: 'photosynthesis-light-reactions',
    title: 'Photosynthesis: How Plants Convert Sunlight to Energy',
    category: 'Biology',
    level: 'High School',
    readTime: '5 min read',
    summary: 'The chemical equation, chloroplast structure, light-dependent reactions, and the Calvin cycle simplified.',
    content: `
### The Core Equation
Photosynthesis is the biological process by which autotrophic organisms (like green plants and algae) convert light energy into chemical energy stored in glucose:

$$6\\text{CO}_2 + 6\\text{H}_2\\text{O} + \\text{light energy} \\xrightarrow{\\text{chlorophyll}} \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2$$

### The Chloroplast Architecture
Photosynthesis takes place inside **chloroplasts**, which contain:
* **Thylakoids**: Flattened sacs containing the green pigment chlorophyll. Light reactions occur across the thylakoid membrane.
* **Granum**: Stacks of thylakoids that maximize light capture.
* **Stroma**: The dense fluid surrounding the grana where the Calvin cycle (dark reactions) synthesizes glucose.

### Two-Stage Process
1. **Light-Dependent Reactions (in Thylakoid)**:
   * Sunlight excites electrons in Chlorophyll Photosystem II.
   * Photolysis splits water into oxygen ($O_2$), protons ($H^+$), and electrons.
   * ATP and NADPH are synthesized to power the next phase.
2. **Light-Independent Reactions (Calvin Cycle in Stroma)**:
   * Carbon dioxide is fixed using the enzyme RuBisCO.
   * ATP and NADPH reduce carbon to create G3P, forming glucose.

### Key Factors Limiting Photosynthesis
* **Light Intensity**: Increases rate until chlorophyll saturation.
* **$\\text{CO}_2$ Concentration**: Provides substrate for glucose synthesis.
* **Temperature**: Enzymes work optimally between 20°C–35°C; excess heat denatures them.
    `,
    quiz: [
      {
        question: 'Where do the light-dependent reactions occur inside a plant cell?',
        options: [
          'In the stroma',
          'In the thylakoid membranes of chloroplasts',
          'In the mitochondria',
          'In the cell wall'
        ],
        answer: 1,
        explanation: 'Thylakoid membranes contain chlorophyll complexes that absorb photons and generate ATP and NADPH.'
      },
      {
        question: 'What gas is released as a byproduct of photolysis during photosynthesis?',
        options: ['Carbon Dioxide', 'Nitrogen', 'Oxygen (O₂)', 'Methane'],
        answer: 2,
        explanation: 'Water molecules (H₂O) are split during light reactions, releasing oxygen gas into the atmosphere.'
      }
    ],
    labId: 'osmosis-simulator'
  },
  {
    id: 'phy-ohms-law',
    slug: 'ohms-law-and-circuits',
    title: "Ohm's Law, Voltage, Current, and Resistance",
    category: 'Physics',
    level: 'High School',
    readTime: '4 min read',
    summary: 'Understand the fundamental relationship governing electrical circuits: V = I × R and electrical power.',
    content: `
### The Fundamental Law of Electric Circuits
Formulated by German physicist Georg Simon Ohm in 1827, **Ohm's Law** states that the current flowing through a conductor between two points is directly proportional to the voltage across the two points and inversely proportional to resistance:

$$V = I \\cdot R$$

Where:
* **$V$ (Voltage)**: Potential difference measured in Volts ($V$). Think of this as the electrical "pressure" pushing electrons.
* **$I$ (Current)**: Flow rate of electric charge measured in Amperes ($A$). $1\\text{ A} = 1\\text{ Coulomb per second}$.
* **$R$ (Resistance)**: Opposition to current flow measured in Ohms ($\\Omega$).

### Electric Power
The rate at which electrical energy is transferred in a circuit is electrical power ($P$), measured in Watts ($W$):

$$P = V \\cdot I = I^2 \\cdot R = \\frac{V^2}{R}$$

### Series vs. Parallel Circuits
* **Series Circuit**: Components connected end-to-end along a single path. Current is identical everywhere:
  $$R_{total} = R_1 + R_2 + R_3$$
* **Parallel Circuit**: Components connected across common points. Voltage across each branch is identical:
  $$\\frac{1}{R_{total}} = \\frac{1}{R_1} + \\frac{1}{R_2} + \\frac{1}{R_3}$$
    `,
    quiz: [
      {
        question: 'If a 12V battery is connected across a 4Ω resistor, what is the current flowing?',
        options: ['48 Amperes', '3 Amperes', '0.33 Amperes', '8 Amperes'],
        answer: 1,
        explanation: 'Using I = V / R: 12V / 4Ω = 3 Amperes.'
      },
      {
        question: 'What happens to the current in a circuit if resistance is doubled while voltage remains constant?',
        options: ['Current doubles', 'Current halves', 'Current quadruples', 'Current stays unchanged'],
        answer: 1,
        explanation: 'Current is inversely proportional to resistance. Doubling resistance cuts current by half.'
      }
    ],
    labId: 'ohms-law-lab'
  },
  {
    id: 'bio-osmosis',
    slug: 'osmosis-and-cell-diffusion',
    title: 'Osmosis & Diffusion: How Cells Regulate Water',
    category: 'Biology',
    level: 'High School',
    readTime: '5 min read',
    summary: 'Hypertonic, hypotonic, and isotonic solutions: explore water transport across semi-permeable cell membranes.',
    content: `
### What is Osmosis?
**Osmosis** is the net movement of water molecules from a region of higher water potential (lower solute concentration) to a region of lower water potential (higher solute concentration) through a **selectively permeable membrane**.

### Tonicity & Cell States
1. **Hypotonic Solution** (Low solute outside):
   * Water rushes into the cell.
   * **Animal cells**: Swell and may burst (**lysis**).
   * **Plant cells**: Swell until the strong cellulose cell wall exerts turgor pressure. The cell becomes **turgid** (ideal state for plant stems).
2. **Isotonic Solution** (Equal solute concentration):
   * Dynamic equilibrium: water enters and leaves at identical rates.
   * Plant cells become **flaccid**.
3. **Hypertonic Solution** (High solute outside):
   * Water leaves the cell rapidly.
   * **Animal cells**: Shrival and crenate.
   * **Plant cells**: The vacuole shrinks and the plasma membrane pulls away from the cell wall (**plasmolysis**).

### Real-Life Importance
* Plant roots absorbing water from soil.
* Kidney dialysis and blood filtration.
* Food preservation (salting fish or pickling fruits draws water out of bacteria, killing them).
    `,
    quiz: [
      {
        question: 'What happens to a red blood cell placed in pure distilled water (hypotonic)?',
        options: [
          'It shrinks and shrivels',
          'It remains completely unchanged',
          'It swells and bursts (lysis)',
          'It turns into a plant cell'
        ],
        answer: 2,
        explanation: 'Animal cells lack cell walls. Water rapidly diffuses inwards down the gradient, causing the cell to burst.'
      }
    ],
    labId: 'osmosis-simulator'
  },
  {
    id: 'cs-logic-gates',
    slug: 'logic-gates-and-boolean-algebra',
    title: 'Logic Gates & Binary: The Building Blocks of Computers & AI',
    category: 'AI & Computing',
    level: 'Beginner',
    readTime: '5 min read',
    summary: 'Understand AND, OR, NOT, XOR gates and how electrical switches create mathematical logic in modern processors.',
    content: `
### Binary: The Language of Transistors
Modern microprocessors contain billions of tiny transistors that act as switches:
* **0 (LOW / False)**: No voltage ($\approx 0\\text{V}$).
* **1 (HIGH / True)**: Voltage present ($\approx 3.3\\text{V}$ or $5\\text{V}$).

### Fundamental Logic Gates
* **AND Gate**: Output is 1 only when **both** inputs A and B are 1 ($Y = A \\cdot B$).
* **OR Gate**: Output is 1 when **at least one** input is 1 ($Y = A + B$).
* **NOT Gate (Inverter)**: Inverts the single input ($Y = \\bar{A}$).
* **XOR (Exclusive OR) Gate**: Output is 1 when inputs are **different** ($Y = A \\oplus B$).
* **NAND Gate**: Universal gate! Any digital circuit or CPU can be constructed entirely from NAND gates.

### Connection to Artificial Intelligence
In 1943, Warren McCulloch and Walter Pitts proved that artificial neurons are mathematical generalizations of logic gates. An artificial neuron with threshold activation can perform AND, OR, and NOT operations directly:

$$y = \\sigma(w_1 x_1 + w_2 x_2 - \\text{threshold})$$
    `,
    quiz: [
      {
        question: 'What is the output of an XOR gate when both Input A = 1 and Input B = 1?',
        options: ['1 (HIGH)', '0 (LOW)', 'Undefined', '0.5'],
        answer: 1,
        explanation: 'XOR outputs 1 only when inputs differ. When both inputs are 1, the output is 0.'
      }
    ],
    labId: 'logic-gates-lab'
  },
  {
    id: 'chem-ph-acids-bases',
    slug: 'acids-bases-and-ph-scale',
    title: 'Acids, Bases, and the pH Scale',
    category: 'Chemistry',
    level: 'High School',
    readTime: '5 min read',
    summary: 'The logarithmic hydrogen ion scale: understanding pH, neutralization reactions, and real-world buffers.',
    content: `
### The Definition of pH
**pH** stands for "potential of Hydrogen". It measures the concentration of hydrogen ions ($[H^+]$ or $[H_3O^+]$) in an aqueous solution on a logarithmic scale from 0 to 14:

$$\\text{pH} = -\\log_{10}[H^+]$$

* **pH < 7**: Acidic (excess $H^+$ ions, e.g., lemon juice, battery acid).
* **pH = 7**: Neutral (pure water at 25°C, $[H^+] = [OH^-] = 10^{-7}\\text{ M}$).
* **pH > 7**: Basic / Alkaline (excess $OH^-$ ions, e.g., soap, bleach).

Because the scale is logarithmic, a solution with **pH 3 is 10 times more acidic** than pH 4 and **100 times more acidic** than pH 5!

### Neutralization Reaction
When an acid reacts with a base, they neutralize to produce water and a salt:

$$\\text{Acid} + \\text{Base} \\rightarrow \\text{Salt} + \\text{Water}$$
$$\\text{HCl} + \\text{NaOH} \\rightarrow \\text{NaCl} + \\text{H}_2\\text{O}$$
    `,
    quiz: [
      {
        question: 'How much more acidic is a solution with pH 4 compared to a solution with pH 6?',
        options: ['2 times', '20 times', '100 times', '1,000 times'],
        answer: 2,
        explanation: 'Each step on the pH scale represents a 10x change in H+ concentration. 2 units = 10 × 10 = 100 times.'
      }
    ],
    labId: 'ohms-law-lab'
  }
];

// GET /api/learn - list all lessons with optional filtering by query or category
router.get('/', (req, res) => {
  const { category, q } = req.query;
  let results = [...LESSONS];
  if (category && category !== 'All') {
    results = results.filter(l => l.category.toLowerCase() === category.toLowerCase());
  }
  if (q && q.trim()) {
    const term = q.trim().toLowerCase();
    results = results.filter(l => 
      l.title.toLowerCase().includes(term) ||
      l.summary.toLowerCase().includes(term) ||
      l.content.toLowerCase().includes(term) ||
      l.category.toLowerCase().includes(term)
    );
  }
  res.json({
    total: results.length,
    lessons: results.map(({ content, quiz, ...meta }) => meta)
  });
});

// GET /api/learn/:id - full lesson details
router.get('/:id', (req, res) => {
  const lesson = LESSONS.find(l => l.id === req.params.id || l.slug === req.params.id);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  res.json({ lesson });
});

module.exports = router;
module.exports.LESSONS = LESSONS;
