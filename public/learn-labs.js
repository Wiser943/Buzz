/* ===== Buzzer STEM, Learn & Labs, and Nkwadaa-style Search ===== */
(() => {
  'use strict';

  // Local offline database of lessons and labs matching the backend for 100% offline support
  const STEM_LESSONS = [
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
* **Stroma**: The dense fluid surrounding the grana where the Calvin cycle synthesizes glucose.

### Two-Stage Process
1. **Light-Dependent Reactions (in Thylakoid)**:
   * Sunlight excites electrons in Chlorophyll Photosystem II.
   * Photolysis splits water into oxygen ($O_2$), protons ($H^+$), and electrons.
   * ATP and NADPH are synthesized to power the next phase.
2. **Light-Independent Reactions (Calvin Cycle in Stroma)**:
   * Carbon dioxide is fixed using the enzyme RuBisCO.
   * ATP and NADPH reduce carbon to create G3P, forming glucose.
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
      `,
      quiz: [
        {
          question: 'If a 12V battery is connected across a 4Ω resistor, what is the current flowing?',
          options: ['48 Amperes', '3 Amperes', '0.33 Amperes', '8 Amperes'],
          answer: 1,
          explanation: 'Using I = V / R: 12V / 4Ω = 3 Amperes.'
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
1. **Hypotonic Solution** (Low solute outside): Water enters the cell. Animal cells may burst (lysis); plant cells become turgid.
2. **Isotonic Solution** (Equal solute): Dynamic equilibrium.
3. **Hypertonic Solution** (High solute outside): Water leaves the cell rapidly. Plant cells undergo plasmolysis.
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
**pH** stands for "potential of Hydrogen". It measures the concentration of hydrogen ions on a scale from 0 to 14:

$$\\text{pH} = -\\log_{10}[H^+]$$

* **pH < 7**: Acidic (excess $H^+$ ions, e.g., lemon juice, vinegar).
* **pH = 7**: Neutral (pure water at 25°C).
* **pH > 7**: Basic / Alkaline (excess $OH^-$ ions, e.g., soap, bleach).

Because the scale is logarithmic, a solution with **pH 3 is 10 times more acidic** than pH 4 and **100 times more acidic** than pH 5!
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

  const STEM_LABS = [
    {
      id: 'neural-classifier',
      slug: 'neural-classifier',
      title: 'AI & Neural Network Classifier Lab',
      category: 'AI & Computing',
      icon: 'brain-circuit',
      tag: 'Interactive Canvas Simulation',
      difficulty: 'All Levels',
      description: 'Place positive (green) and negative (gold) data points on a 2D plane. Watch an artificial neural network train live and learn the decision boundary contour!',
      concepts: ['Perceptron', 'Decision Boundary', 'Weights & Biases', 'Epochs', 'Loss Function']
    },
    {
      id: 'ohms-law-lab',
      slug: 'ohms-law-lab',
      title: "Ohm's Law & Circuit Simulator",
      category: 'Physics',
      icon: 'zap',
      tag: 'Live Circuit Hardware Lab',
      difficulty: 'High School',
      description: 'Adjust battery voltage and resistance sliders. Watch animated electron flow and see the light bulb glow intensity change live according to V = I × R.',
      concepts: ['Voltage (V)', 'Current (I)', 'Resistance (R)', 'Electrical Power (W)', 'Ohmic Heating']
    },
    {
      id: 'optics-refraction',
      slug: 'optics-refraction',
      title: 'Optics & Light Refraction (Snell’s Law)',
      category: 'Physics',
      icon: 'sun',
      tag: 'Optical Ray Tracer',
      difficulty: 'High School',
      description: 'Shoot laser rays across media interfaces (Air, Water, Glass, Diamond). Observe Snell’s refraction, critical angles, and total internal reflection live.',
      concepts: ["Snell's Law", 'Index of Refraction', 'Total Internal Reflection', 'Critical Angle']
    },
    {
      id: 'osmosis-simulator',
      slug: 'osmosis-simulator',
      title: 'Cell Osmosis & Turgor Pressure Simulator',
      category: 'Biology',
      icon: 'droplets',
      tag: 'Microscopic Cell Lab',
      difficulty: 'High School',
      description: 'Switch between hypotonic, isotonic, and hypertonic solutions. Observe water diffusion flux and monitor cell wall turgor pressure in real time.',
      concepts: ['Osmotic Gradient', 'Tonicity', 'Turgidity & Plasmolysis', 'Semi-permeable Membrane']
    },
    {
      id: 'logic-gates-lab',
      slug: 'logic-gates-lab',
      title: 'Logic Gates & Binary Circuit Builder',
      category: 'AI & Computing',
      icon: 'cpu',
      tag: 'Digital Logic Workbench',
      difficulty: 'Beginner',
      description: 'Toggle switches for Input A and Input B to test AND, OR, NOT, NAND, NOR, and XOR gates with live output LEDs and active truth tables.',
      concepts: ['Boolean Algebra', 'Logic Gates', 'Truth Tables', 'Transistors', 'Binary Logic']
    },
    {
      id: 'python-sandbox',
      slug: 'python-sandbox',
      title: 'In-Browser Python / AI Code Sandbox',
      category: 'Programming',
      icon: 'code-2',
      tag: 'Live Code Environment',
      difficulty: 'All Levels',
      description: 'Execute Python and STEM math algorithms directly in your browser. Includes presets for Linear Regression, Ohm’s Law, and Statistics with live console output.',
      concepts: ['Python Execution', 'NumPy Arrays', 'Machine Learning Math', 'Algorithms']
    }
  ];

  // Helper formatting markdown & math
  function formatMarkdown(txt) {
    if (!txt) return '';
    let html = esc(txt);
    // Math blocks $$ ... $$
    html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, eq) => `<div class="stem-math-block"><code>${eq.trim()}</code></div>`);
    // Inline math $ ... $
    html = html.replace(/\$([^\$\n]+?)\$/g, (_, eq) => `<span class="stem-math-inline"><code>${eq}</code></span>`);
    // Headers ###
    html = html.replace(/^### (.*$)/gim, '<h3 class="stem-h3">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="stem-h2">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="stem-h1">$1</h1>');
    // Bold **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Lists * item
    html = html.replace(/^\* (.*$)/gim, '<li class="stem-li">$1</li>');
    html = html.replace(/(<li.*<\/li>)/gms, '<ul class="stem-ul">$1</ul>');
    // Paragraphs
    html = html.split('\n\n').map(p => p.startsWith('<') ? p : `<p class="stem-p">${p}</p>`).join('');
    return html;
  }

  /* ==========================================================================
     1. LEARN / BLOG SCREEN
     ========================================================================== */
  screens.learn = {
    html() {
      return `
        <div class="stem-hero-header">
          <div class="stem-badge-row">
            <span class="stem-pill-badge">${ico('book-open')} STEM & AI Academy</span>
            <span class="stem-pill-badge muted-pill">Offline Ready</span>
          </div>
          <h1 class="stem-main-title">Learn STEM &amp; Artificial Intelligence</h1>
          <p class="stem-lead">High school science, mathematics, and foundational AI modules built with interactive lessons, formula breakdowns, and live practice labs.</p>
          <div class="stem-filter-chips" id="learnFilter">
            <button class="stem-chip active" data-cat="All">All Topics</button>
            <button class="stem-chip" data-cat="AI & Computing">${ico('brain-circuit')} AI &amp; Computing</button>
            <button class="stem-chip" data-cat="Biology">${ico('leaf')} Biology</button>
            <button class="stem-chip" data-cat="Physics">${ico('zap')} Physics</button>
            <button class="stem-chip" data-cat="Chemistry">${ico('flask-conical')} Chemistry</button>
          </div>
        </div>

        <div class="stem-card-grid" id="lessonsGrid">
          ${renderLessonsGrid(STEM_LESSONS)}
        </div>
      `;
    },
    wire() {
      const grid = $('#lessonsGrid');
      document.querySelectorAll('#learnFilter .stem-chip').forEach(btn => {
        btn.onclick = () => {
          document.querySelectorAll('#learnFilter .stem-chip').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const cat = btn.dataset.cat;
          const filtered = cat === 'All' ? STEM_LESSONS : STEM_LESSONS.filter(l => l.category === cat);
          grid.innerHTML = renderLessonsGrid(filtered);
          wireLessonCards();
          refreshIcons();
        };
      });
      wireLessonCards();
      refreshIcons();
    }
  };

  function renderLessonsGrid(lessons) {
    if (!lessons.length) return `<div class="feed-empty">No lessons found in this category.</div>`;
    return lessons.map(l => `
      <article class="stem-lesson-card" data-lesson="${l.id}">
        <div class="slc-top">
          <span class="slc-category">${esc(l.category)}</span>
          <span class="slc-time">${ico('clock')} ${esc(l.readTime)}</span>
        </div>
        <h3 class="slc-title">${esc(l.title)}</h3>
        <p class="slc-summary">${esc(l.summary)}</p>
        <div class="slc-footer">
          <span class="slc-level">${esc(l.level)}</span>
          <button class="stem-btn-primary" data-open-lesson="${l.id}">Read Lesson ${ico('chevron-right')}</button>
        </div>
      </article>
    `).join('');
  }

  function wireLessonCards() {
    document.querySelectorAll('[data-open-lesson], [data-lesson]').forEach(el => {
      el.onclick = e => {
        const id = el.dataset.openLesson || el.dataset.lesson;
        render('lesson', id);
      };
    });
  }

  /* ==========================================================================
     2. INDIVIDUAL LESSON VIEW
     ========================================================================== */
  screens.lesson = {
    html(id) {
      const l = STEM_LESSONS.find(item => item.id === id || item.slug === id) || STEM_LESSONS[0];
      return `
        <div class="sub-head">
          <button class="round bare" id="backLesson">${ico('arrow-left')}</button>
          <span class="sub-title-truncate">${esc(l.title)}</span>
          <button class="round bare" id="shareLesson">${ico('share-2')}</button>
        </div>

        <div class="stem-article-container">
          <div class="sac-meta">
            <span class="slc-category">${esc(l.category)}</span>
            <span>•</span>
            <span>${esc(l.level)}</span>
            <span>•</span>
            <span>${ico('clock')} ${esc(l.readTime)}</span>
          </div>

          <h1 class="sac-title">${esc(l.title)}</h1>
          <p class="sac-summary">${esc(l.summary)}</p>

          ${l.labId ? `
            <div class="stem-lab-banner">
              <div class="slb-info">
                <strong>${ico('flask-conical')} Interactive Lab Available</strong>
                <span>Put this concept into practice with hands-on parameters!</span>
              </div>
              <button class="stem-btn-glow" id="jumpToLab" data-lab="${l.labId}">Launch Lab ${ico('arrow-right')}</button>
            </div>
          ` : ''}

          <div class="sac-body">
            ${formatMarkdown(l.content)}
          </div>

          ${l.quiz && l.quiz.length ? `
            <section class="stem-quiz-box">
              <div class="sqb-header">
                <h3>${ico('check-circle-2')} Concept Check</h3>
                <small>Test your understanding to earn Buzzer Points</small>
              </div>
              <div id="quizContainer">
                ${l.quiz.map((q, qIndex) => `
                  <div class="quiz-question-block" data-qindex="${qIndex}">
                    <p class="qq-title">${qIndex + 1}. ${esc(q.question)}</p>
                    <div class="qq-options">
                      ${q.options.map((opt, oIndex) => `
                        <button class="qq-option" data-ans="${oIndex}">${esc(opt)}</button>
                      `).join('')}
                    </div>
                    <div class="qq-feedback" hidden></div>
                  </div>
                `).join('')}
              </div>
            </section>
          ` : ''}

          <div class="sac-footer-nav">
            <button class="outline-btn" id="backToLearn">${ico('book-open')} Back to All Lessons</button>
            ${l.labId ? `<button class="stem-btn-primary" id="footerLabBtn" data-lab="${l.labId}">Open Corresponding Lab ${ico('flask-conical')}</button>` : ''}
          </div>
        </div>
      `;
    },
    wire(id) {
      $('#backLesson').onclick = () => render('learn');
      $('#backToLearn')?.addEventListener('click', () => render('learn'));
      $('#shareLesson')?.addEventListener('click', () => {
        const u = location.origin + '/learn/' + id;
        if (navigator.share) navigator.share({ title: document.title, url: u }).catch(() => {});
        else navigator.clipboard?.writeText(u).then(() => notify('Lesson link copied!'));
      });

      document.querySelectorAll('[data-lab]').forEach(b => {
        b.onclick = () => render('lab', b.dataset.lab);
      });

      // Wire interactive quiz
      const l = STEM_LESSONS.find(item => item.id === id || item.slug === id) || STEM_LESSONS[0];
      if (l.quiz) {
        document.querySelectorAll('.quiz-question-block').forEach(qb => {
          const qIndex = Number(qb.dataset.qindex);
          const q = l.quiz[qIndex];
          const feedback = qb.querySelector('.qq-feedback');
          qb.querySelectorAll('.qq-option').forEach(optBtn => {
            optBtn.onclick = () => {
              const chosen = Number(optBtn.dataset.ans);
              qb.querySelectorAll('.qq-option').forEach(b => {
                b.disabled = true;
                const ans = Number(b.dataset.ans);
                if (ans === q.answer) b.classList.add('correct');
                else if (ans === chosen) b.classList.add('wrong');
              });
              feedback.hidden = false;
              if (chosen === q.answer) {
                feedback.className = 'qq-feedback correct';
                feedback.innerHTML = `<strong>Correct!</strong> ${esc(q.explanation)}`;
                const curPts = Number(localStorage.getItem('buzzerPoints') || 0);
                localStorage.setItem('buzzerPoints', (curPts + 1).toFixed(2));
                notify('+1 Buzzer Point earned!');
              } else {
                feedback.className = 'qq-feedback wrong';
                feedback.innerHTML = `<strong>Not quite.</strong> ${esc(q.explanation)}`;
              }
            };
          });
        });
      }

      refreshIcons();
    }
  };

  /* ==========================================================================
     3. LABS DIRECTORY SCREEN
     ========================================================================== */
  screens.labs = {
    html() {
      return `
        <div class="stem-hero-header">
          <div class="stem-badge-row">
            <span class="stem-pill-badge">${ico('flask-conical')} Interactive Labs</span>
            <span class="stem-pill-badge green-pill">Real-Time Web Simulations</span>
          </div>
          <h1 class="stem-main-title">Virtual STEM &amp; AI Laboratories</h1>
          <p class="stem-lead">Hands-on experimentation without hardware. Train neural network decision boundaries, simulate Ohm’s law circuits, analyze optics rays, and run Python code live in your browser.</p>
        </div>

        <div class="stem-lab-grid">
          ${STEM_LABS.map(lab => `
            <div class="stem-lab-card" data-lab="${lab.id}">
              <div class="slb-icon-wrap">${ico(lab.icon || 'flask-conical')}</div>
              <div class="slb-content">
                <div class="slb-tags">
                  <span class="slc-category">${esc(lab.category)}</span>
                  <span class="slc-difficulty">${esc(lab.difficulty)}</span>
                </div>
                <h3>${esc(lab.title)}</h3>
                <p>${esc(lab.description)}</p>
                <div class="slb-concepts">
                  ${lab.concepts.map(c => `<span>${esc(c)}</span>`).join('')}
                </div>
                <div class="slb-action">
                  <button class="stem-btn-primary" data-open-lab="${lab.id}">${ico('play')} Launch Simulator</button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    },
    wire() {
      document.querySelectorAll('[data-open-lab], [data-lab]').forEach(el => {
        el.onclick = e => {
          const id = el.dataset.openLab || el.dataset.lab;
          render('lab', id);
        };
      });
      refreshIcons();
    }
  };

  /* ==========================================================================
     4. INDIVIDUAL LAB SIMULATION VIEW (Neural Net, Ohm's Law, Optics, Osmosis, Logic Gates, Sandbox)
     ========================================================================== */
  screens.lab = {
    html(id) {
      const lab = STEM_LABS.find(l => l.id === id || l.slug === id) || STEM_LABS[0];
      return `
        <div class="sub-head">
          <button class="round bare" id="backLabs">${ico('arrow-left')}</button>
          <span class="sub-title-truncate">${esc(lab.title)}</span>
          <button class="round bare" id="resetLab" title="Reset Simulation">${ico('rotate-ccw')}</button>
        </div>

        <div class="stem-lab-workspace">
          <div class="slw-header">
            <div>
              <span class="slc-category">${esc(lab.category)}</span>
              <h2>${esc(lab.title)}</h2>
              <p>${esc(lab.description)}</p>
            </div>
          </div>

          <div id="labSimulatorContainer" class="lab-sim-box">
            ${renderSimulatorHTML(lab.id)}
          </div>
        </div>
      `;
    },
    wire(id) {
      $('#backLabs').onclick = () => render('labs');
      const lab = STEM_LABS.find(l => l.id === id || l.slug === id) || STEM_LABS[0];
      initSimulator(lab.id);
      refreshIcons();
    }
  };

  function renderSimulatorHTML(labId) {
    if (labId === 'neural-classifier') {
      return `
        <div class="neural-lab-layout">
          <div class="canvas-panel">
            <div class="canvas-header-bar">
              <span>Click on the canvas to place points</span>
              <div class="canvas-tools">
                <button class="tool-btn active" id="toolClass1" data-val="1"><i class="dot-green"></i> Class A (+1)</button>
                <button class="tool-btn" id="toolClass2" data-val="-1"><i class="dot-gold"></i> Class B (-1)</button>
                <button class="tool-btn danger" id="clearPoints">Clear Points</button>
              </div>
            </div>
            <div class="canvas-wrap">
              <canvas id="neuralCanvas" width="460" height="340"></canvas>
            </div>
            <div class="canvas-legend">
              <span>Green Background = Predicted Class A</span>
              <span>Gold Background = Predicted Class B</span>
            </div>
          </div>
          <div class="controls-panel">
            <h3>Neural Model Controls</h3>
            <div class="param-row">
              <label>Learning Rate (α): <b id="lrVal">0.1</b></label>
              <input type="range" id="lrSlider" min="0.01" max="0.5" step="0.01" value="0.1">
            </div>
            <div class="param-row">
              <label>Training Epochs: <b id="epochVal">100</b></label>
              <input type="range" id="epochSlider" min="10" max="500" step="10" value="100">
            </div>
            <div class="stats-box">
              <div class="stat-item"><small>Epoch:</small><strong id="curEpoch">0</strong></div>
              <div class="stat-item"><small>Training Loss:</small><strong id="curLoss">0.000</strong></div>
              <div class="stat-item"><small>Accuracy:</small><strong id="curAcc">0%</strong></div>
            </div>
            <div class="control-actions">
              <button class="stem-btn-primary full-w" id="trainBtn">${ico('play')} Train Neural Network</button>
              <button class="outline-btn full-w" id="sampleDataBtn">Load Sample Dataset</button>
            </div>
            <div class="formula-card">
              <small>Perceptron Formula:</small>
              <code>f(x₁, x₂) = sign(w₁·x₁ + w₂·x₂ + b)</code>
            </div>
          </div>
        </div>
      `;
    }

    if (labId === 'ohms-law-lab') {
      return `
        <div class="ohms-lab-layout">
          <div class="circuit-visual-box">
            <div class="circuit-stage" id="circuitStage">
              <div class="circuit-battery">
                <div class="bat-head">+</div>
                <div class="bat-body"><b id="vDisplay">9.0</b> V<br><small>Battery</small></div>
                <div class="bat-foot">-</div>
              </div>
              <div class="wire-top"><div class="electrons-flow" id="electronsTop"></div></div>
              <div class="circuit-bulb" id="circuitBulb">
                <div class="bulb-glow" id="bulbGlow"></div>
                <div class="bulb-glass">${ico('lightbulb')}</div>
                <span id="pDisplay">8.1 W</span>
              </div>
              <div class="wire-right"></div>
              <div class="circuit-resistor">
                <div class="resistor-body">
                  <span>〰〰〰</span>
                  <b id="rDisplay">10.0</b> Ω
                </div>
              </div>
              <div class="wire-bottom"><div class="electrons-flow" id="electronsBottom"></div></div>
              <div class="wire-left"></div>
            </div>
            <div class="circuit-readings">
              <div class="meter-box">
                <small>CURRENT (I)</small>
                <div class="meter-val"><span id="iVal">0.90</span> <small>A</small></div>
                <small>I = V / R</small>
              </div>
              <div class="meter-box">
                <small>POWER DISSIPATION (P)</small>
                <div class="meter-val"><span id="pVal">8.10</span> <small>W</small></div>
                <small>P = V × I</small>
              </div>
            </div>
          </div>
          <div class="controls-panel">
            <h3>Circuit Parameters</h3>
            <div class="param-row">
              <label>Battery Voltage (V): <b id="vSliderVal">9 V</b></label>
              <input type="range" id="vSlider" min="1" max="24" step="0.5" value="9">
            </div>
            <div class="param-row">
              <label>Resistance (R): <b id="rSliderVal">10 Ω</b></label>
              <input type="range" id="rSlider" min="1" max="100" step="1" value="10">
            </div>
            <div class="formula-card">
              <h4>Key Relationships</h4>
              <p>• Higher Voltage $\\to$ More electrical pressure $\\to$ Higher current.</p>
              <p>• Higher Resistance $\\to$ More opposition $\\to$ Lower current.</p>
              <p>• Power determines bulb brightness ($P = I^2 \\cdot R$).</p>
            </div>
          </div>
        </div>
      `;
    }

    if (labId === 'optics-refraction') {
      return `
        <div class="optics-lab-layout">
          <div class="optics-canvas-wrap">
            <canvas id="opticsCanvas" width="480" height="360"></canvas>
          </div>
          <div class="controls-panel">
            <h3>Optics Controls (Snell's Law)</h3>
            <div class="param-row">
              <label>Incident Angle (θ₁): <b id="angleVal">45°</b></label>
              <input type="range" id="angleSlider" min="0" max="85" step="1" value="45">
            </div>
            <div class="param-row">
              <label>Medium 2 Material:</label>
              <select id="mediumSelect" class="stem-select">
                <option value="1.33">Water (n₂ = 1.33)</option>
                <option value="1.50" selected>Glass (n₂ = 1.50)</option>
                <option value="2.42">Diamond (n₂ = 2.42)</option>
              </select>
            </div>
            <div class="stats-box">
              <div class="stat-item"><small>Refracted Angle (θ₂):</small><strong id="theta2Val">28.1°</strong></div>
              <div class="stat-item"><small>Critical Angle:</small><strong id="critVal">41.8°</strong></div>
            </div>
            <div class="formula-card">
              <code>n₁ · sin(θ₁) = n₂ · sin(θ₂)</code>
              <p><small>Medium 1: Air (n₁ = 1.00)</small></p>
            </div>
          </div>
        </div>
      `;
    }

    if (labId === 'osmosis-simulator') {
      return `
        <div class="osmosis-lab-layout">
          <div class="osmosis-view">
            <div class="beaker" id="beakerStage">
              <div class="solution-liquid" id="liquidColor">
                <div class="osmosis-cell plant-cell" id="simCell">
                  <div class="cell-wall"></div>
                  <div class="cell-membrane">
                    <div class="vacuole" id="cellVacuole"></div>
                    <div class="cell-nucleus"></div>
                  </div>
                </div>
              </div>
            </div>
            <div class="cell-status-bar">
              <strong>State: <span id="cellStateLabel">Turgid (Normal for plant)</span></strong>
            </div>
          </div>
          <div class="controls-panel">
            <h3>Solution Tonicity</h3>
            <div class="param-row">
              <label>External Solute Concentration:</label>
              <div class="seg wide" id="tonicityButtons">
                <button class="on" data-tonicity="hypotonic">Hypotonic (Pure H₂O)</button>
                <button data-tonicity="isotonic">Isotonic (0.9% Salt)</button>
                <button data-tonicity="hypertonic">Hypertonic (10% Salt)</button>
              </div>
            </div>
            <div class="param-row">
              <label>Cell Type:</label>
              <div class="seg" id="cellTypeButtons">
                <button class="on" data-cell="plant">Plant Cell</button>
                <button data-cell="animal">Animal (Red Blood Cell)</button>
              </div>
            </div>
            <div class="formula-card">
              <h4>Osmotic Effects</h4>
              <p id="osmosisExplanation">• Hypotonic: Water enters down the osmotic gradient. Plant cell becomes crisp and turgid.</p>
            </div>
          </div>
        </div>
      `;
    }

    if (labId === 'logic-gates-lab') {
      return `
        <div class="logic-lab-layout">
          <div class="logic-stage-card">
            <div class="circuit-inputs">
              <div class="input-toggle">
                <span>Input A</span>
                <button class="bit-btn on" id="toggleA" data-bit="1">1</button>
              </div>
              <div class="input-toggle">
                <span>Input B</span>
                <button class="bit-btn" id="toggleB" data-bit="0">0</button>
              </div>
            </div>
            <div class="logic-gate-display" id="gateDisplay">
              <div class="gate-symbol" id="gateSymbol">AND</div>
            </div>
            <div class="circuit-output">
              <span>Output Y</span>
              <div class="led-light" id="ledOutput">
                <div class="led-glow"></div>
                <b id="outputBit">0</b>
              </div>
            </div>
          </div>
          <div class="controls-panel">
            <h3>Gate Selector</h3>
            <div class="gate-pills" id="gatePills">
              <button class="stem-chip active" data-gate="AND">AND</button>
              <button class="stem-chip" data-gate="OR">OR</button>
              <button class="stem-chip" data-gate="NOT">NOT</button>
              <button class="stem-chip" data-gate="NAND">NAND</button>
              <button class="stem-chip" data-gate="NOR">NOR</button>
              <button class="stem-chip" data-gate="XOR">XOR</button>
            </div>
            <div class="truth-table-card">
              <h4>Truth Table</h4>
              <table class="truth-table" id="truthTable">
                <thead><tr><th>A</th><th>B</th><th>Output Y</th></tr></thead>
                <tbody id="ttBody"></tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    }

    if (labId === 'python-sandbox') {
      return `
        <div class="sandbox-layout">
          <div class="sandbox-editor-panel">
            <div class="sb-header">
              <span>Python Code Playground</span>
              <select id="presetSelect" class="stem-select">
                <option value="linear_reg">Preset: Linear Regression Gradient Descent</option>
                <option value="ohms_law">Preset: Ohm's Law Calculator</option>
                <option value="neural_node">Preset: Single Artificial Neuron</option>
              </select>
            </div>
            <textarea id="codeEditor" rows="12" spellcheck="false" class="code-editor-area"></textarea>
            <div class="sb-actions">
              <button class="stem-btn-primary" id="runCodeBtn">${ico('play')} Run Code</button>
              <button class="outline-btn" id="clearConsoleBtn">Clear Console</button>
            </div>
          </div>
          <div class="sandbox-console-panel">
            <div class="console-title">${ico('terminal')} Terminal Output</div>
            <pre id="consoleOutput" class="console-pre">Click "Run Code" to execute Python script...</pre>
          </div>
        </div>
      `;
    }

    return `<div class="feed-empty">Simulation ready to initialize.</div>`;
  }

  function initSimulator(labId) {
    if (labId === 'neural-classifier') initNeuralLab();
    else if (labId === 'ohms-law-lab') initOhmsLab();
    else if (labId === 'optics-refraction') initOpticsLab();
    else if (labId === 'osmosis-simulator') initOsmosisLab();
    else if (labId === 'logic-gates-lab') initLogicLab();
    else if (labId === 'python-sandbox') initSandboxLab();
  }

  /* ---------------- Sim: Neural Net Classifier ---------------- */
  function initNeuralLab() {
    const canvas = document.getElementById('neuralCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let points = [
      { x: 0.2, y: 0.3, label: 1 }, { x: 0.3, y: 0.2, label: 1 }, { x: 0.25, y: 0.4, label: 1 },
      { x: 0.7, y: 0.8, label: -1 }, { x: 0.8, y: 0.7, label: -1 }, { x: 0.75, y: 0.65, label: -1 }
    ];
    let w = [0.5, -0.5], b = 0.0;
    let activeClass = 1;

    document.querySelectorAll('.canvas-tools .tool-btn[data-val]').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.canvas-tools .tool-btn[data-val]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeClass = Number(btn.dataset.val);
      };
    });

    document.getElementById('clearPoints')?.addEventListener('click', () => {
      points = [];
      draw();
    });

    document.getElementById('sampleDataBtn')?.addEventListener('click', () => {
      points = [
        { x: 0.2, y: 0.3, label: 1 }, { x: 0.3, y: 0.25, label: 1 }, { x: 0.25, y: 0.45, label: 1 }, { x: 0.35, y: 0.4, label: 1 },
        { x: 0.65, y: 0.75, label: -1 }, { x: 0.8, y: 0.7, label: -1 }, { x: 0.75, y: 0.6, label: -1 }, { x: 0.85, y: 0.85, label: -1 }
      ];
      w = [0.5, -0.5]; b = 0;
      draw();
    });

    canvas.onclick = e => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / canvas.width;
      const y = 1.0 - (e.clientY - rect.top) / canvas.height;
      points.push({ x, y, label: activeClass });
      draw();
    };

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const res = 16;
      for (let px = 0; px < canvas.width; px += res) {
        for (let py = 0; py < canvas.height; py += res) {
          const x = px / canvas.width;
          const y = 1.0 - py / canvas.height;
          const pred = w[0] * x + w[1] * y + b;
          ctx.fillStyle = pred >= 0 ? 'rgba(24, 217, 120, 0.12)' : 'rgba(243, 198, 66, 0.12)';
          ctx.fillRect(px, py, res, res);
        }
      }

      // Draw decision boundary line: w[0]*x + w[1]*y + b = 0 => y = (-w[0]*x - b) / w[1]
      ctx.strokeStyle = '#18d978';
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (Math.abs(w[1]) > 0.0001) {
        const y0 = (-b) / w[1];
        const y1 = (-w[0] - b) / w[1];
        ctx.moveTo(0, canvas.height * (1.0 - y0));
        ctx.lineTo(canvas.width, canvas.height * (1.0 - y1));
      }
      ctx.stroke();

      // Draw data points
      points.forEach(p => {
        const cx = p.x * canvas.width;
        const cy = (1.0 - p.y) * canvas.height;
        ctx.beginPath();
        ctx.arc(cx, cy, 7, 0, Math.PI * 2);
        ctx.fillStyle = p.label === 1 ? '#18d978' : '#f3c642';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000';
        ctx.stroke();
      });
    }

    document.getElementById('trainBtn')?.addEventListener('click', () => {
      if (!points.length) return notify('Click on canvas to add points first!');
      const lr = Number(document.getElementById('lrSlider').value);
      const totalEpochs = Number(document.getElementById('epochSlider').value);
      let epoch = 0;

      const step = () => {
        if (epoch >= totalEpochs) return;
        let loss = 0;
        let correct = 0;
        for (const p of points) {
          const out = w[0] * p.x + w[1] * p.y + b;
          const pred = out >= 0 ? 1 : -1;
          const error = p.label - (Math.tanh(out));
          loss += error * error;
          if (pred === p.label) correct++;
          w[0] += lr * error * p.x;
          w[1] += lr * error * p.y;
          b += lr * error;
        }
        epoch += 5;
        document.getElementById('curEpoch').textContent = epoch;
        document.getElementById('curLoss').textContent = (loss / points.length).toFixed(3);
        document.getElementById('curAcc').textContent = Math.round((correct / points.length) * 100) + '%';
        draw();
        if (epoch < totalEpochs) requestAnimationFrame(step);
        else notify('Training complete!');
      };
      step();
    });

    document.getElementById('lrSlider')?.addEventListener('input', e => {
      document.getElementById('lrVal').textContent = e.target.value;
    });
    document.getElementById('epochSlider')?.addEventListener('input', e => {
      document.getElementById('epochVal').textContent = e.target.value;
    });

    draw();
  }

  /* ---------------- Sim: Ohm's Law Circuit ---------------- */
  function initOhmsLab() {
    const vSlider = document.getElementById('vSlider');
    const rSlider = document.getElementById('rSlider');
    if (!vSlider || !rSlider) return;

    function update() {
      const v = Number(vSlider.value);
      const r = Number(rSlider.value);
      const i = v / r;
      const p = v * i;

      document.getElementById('vSliderVal').textContent = v + ' V';
      document.getElementById('rSliderVal').textContent = r + ' Ω';
      document.getElementById('vDisplay').textContent = v.toFixed(1);
      document.getElementById('rDisplay').textContent = r.toFixed(1);
      document.getElementById('iVal').textContent = i.toFixed(2);
      document.getElementById('pVal').textContent = p.toFixed(2);
      document.getElementById('pDisplay').textContent = p.toFixed(1) + ' W';

      const glow = document.getElementById('bulbGlow');
      if (glow) {
        const brightness = Math.min(1.0, p / 30);
        glow.style.boxShadow = `0 0 ${brightness * 45}px ${brightness * 20}px rgba(243, 198, 66, ${brightness})`;
        glow.style.opacity = Math.max(0.1, brightness);
      }

      const electronSpeed = Math.max(0.2, 3.0 - (i * 0.8));
      const elTop = document.getElementById('electronsTop');
      const elBot = document.getElementById('electronsBottom');
      if (elTop) elTop.style.animationDuration = `${electronSpeed}s`;
      if (elBot) elBot.style.animationDuration = `${electronSpeed}s`;
    }

    vSlider.oninput = update;
    rSlider.oninput = update;
    update();
  }

  /* ---------------- Sim: Optics Refraction ---------------- */
  function initOpticsLab() {
    const canvas = document.getElementById('opticsCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const slider = document.getElementById('angleSlider');
    const mediumSelect = document.getElementById('mediumSelect');

    function draw() {
      const theta1Deg = Number(slider.value);
      const theta1Rad = (theta1Deg * Math.PI) / 180;
      const n1 = 1.0;
      const n2 = Number(mediumSelect.value);

      document.getElementById('angleVal').textContent = theta1Deg + '°';

      const sinTheta2 = (n1 / n2) * Math.sin(theta1Rad);
      let theta2Deg = 0;
      let totalInternal = false;
      if (sinTheta2 <= 1.0) {
        const theta2Rad = Math.asin(sinTheta2);
        theta2Deg = (theta2Rad * 180) / Math.PI;
      } else {
        totalInternal = true;
      }

      const critDeg = (Math.asin(n1 / n2) * 180) / Math.PI;
      document.getElementById('theta2Val').textContent = totalInternal ? 'Total Reflection' : theta2Deg.toFixed(1) + '°';
      document.getElementById('critVal').textContent = critDeg.toFixed(1) + '°';

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const midY = canvas.height / 2;
      const midX = canvas.width / 2;

      // Medium 1 (Air)
      ctx.fillStyle = '#080909';
      ctx.fillRect(0, 0, canvas.width, midY);
      ctx.fillStyle = '#71767b';
      ctx.font = '12px sans-serif';
      ctx.fillText('Medium 1: Air (n₁ = 1.00)', 14, 24);

      // Medium 2
      ctx.fillStyle = '#111e28';
      ctx.fillRect(0, midY, canvas.width, midY);
      ctx.fillStyle = '#18d978';
      ctx.fillText(`Medium 2: n₂ = ${n2.toFixed(2)}`, 14, midY + 24);

      // Normal line (dotted)
      ctx.strokeStyle = '#444';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(midX, 20);
      ctx.lineTo(midX, canvas.height - 20);
      ctx.stroke();
      ctx.setLineDash([]);

      // Boundary line
      ctx.strokeStyle = '#2f3336';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(canvas.width, midY);
      ctx.stroke();

      // Incident Ray (Laser)
      const rayLen = 170;
      const x1 = midX - rayLen * Math.sin(theta1Rad);
      const y1 = midY - rayLen * Math.cos(theta1Rad);

      ctx.strokeStyle = '#f71948';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(midX, midY);
      ctx.stroke();

      // Reflected ray
      const rx = midX + rayLen * Math.sin(theta1Rad);
      const ry = midY - rayLen * Math.cos(theta1Rad);
      ctx.strokeStyle = 'rgba(247, 25, 72, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(midX, midY);
      ctx.lineTo(rx, ry);
      ctx.stroke();

      // Refracted ray
      if (!totalInternal) {
        const theta2Rad = (theta2Deg * Math.PI) / 180;
        const tx = midX + rayLen * Math.sin(theta2Rad);
        const ty = midY + rayLen * Math.cos(theta2Rad);
        ctx.strokeStyle = '#18d978';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(midX, midY);
        ctx.lineTo(tx, ty);
        ctx.stroke();
      }
    }

    slider.oninput = draw;
    mediumSelect.onchange = draw;
    draw();
  }

  /* ---------------- Sim: Osmosis & Cell ---------------- */
  function initOsmosisLab() {
    let curTonicity = 'hypotonic';
    let curCell = 'plant';

    function update() {
      const cell = document.getElementById('simCell');
      const vacuole = document.getElementById('cellVacuole');
      const liquid = document.getElementById('liquidColor');
      const label = document.getElementById('cellStateLabel');
      const exp = document.getElementById('osmosisExplanation');
      if (!cell || !vacuole) return;

      cell.className = `osmosis-cell ${curCell}-cell ${curTonicity}`;
      if (curTonicity === 'hypotonic') {
        liquid.style.background = 'rgba(24, 217, 120, 0.08)';
        label.textContent = curCell === 'plant' ? 'Turgid (Cell wall prevents bursting)' : 'Swollen / Lysed (Burst)';
        exp.textContent = '• Hypotonic: External water potential is high. Water flows inward. Plant cell wall pushes back with turgor pressure.';
      } else if (curTonicity === 'isotonic') {
        liquid.style.background = 'rgba(54, 88, 255, 0.08)';
        label.textContent = 'Flaccid / Equilibrium (Water in = Water out)';
        exp.textContent = '• Isotonic: Solute concentrations inside and outside are balanced. No net movement of water.';
      } else {
        liquid.style.background = 'rgba(243, 198, 66, 0.12)';
        label.textContent = curCell === 'plant' ? 'Plasmolyzed (Cytoplasm shrunk)' : 'Crenated (Shriveled)';
        exp.textContent = '• Hypertonic: External solution has high solute concentration. Water rushes out, shrinking the cell.';
      }
    }

    document.querySelectorAll('#tonicityButtons button').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('#tonicityButtons button').forEach(b => b.classList.remove('on'));
        btn.classList.add('on');
        curTonicity = btn.dataset.tonicity;
        update();
      };
    });

    document.querySelectorAll('#cellTypeButtons button').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('#cellTypeButtons button').forEach(b => b.classList.remove('on'));
        btn.classList.add('on');
        curCell = btn.dataset.cell;
        update();
      };
    });

    update();
  }

  /* ---------------- Sim: Logic Gates ---------------- */
  function initLogicLab() {
    let gate = 'AND', a = 1, b = 0;

    const TRUTH_TABLES = {
      AND: [[0,0,0],[0,1,0],[1,0,0],[1,1,1]],
      OR: [[0,0,0],[0,1,1],[1,0,1],[1,1,1]],
      NOT: [[0,'-',1],[1,'-',0]],
      NAND: [[0,0,1],[0,1,1],[1,0,1],[1,1,0]],
      NOR: [[0,0,1],[0,1,0],[1,0,0],[1,1,0]],
      XOR: [[0,0,0],[0,1,1],[1,0,1],[1,1,0]]
    };

    function update() {
      let out = 0;
      if (gate === 'AND') out = (a && b) ? 1 : 0;
      else if (gate === 'OR') out = (a || b) ? 1 : 0;
      else if (gate === 'NOT') out = (!a) ? 1 : 0;
      else if (gate === 'NAND') out = !(a && b) ? 1 : 0;
      else if (gate === 'NOR') out = !(a || b) ? 1 : 0;
      else if (gate === 'XOR') out = (a !== b) ? 1 : 0;

      document.getElementById('gateSymbol').textContent = gate;
      const led = document.getElementById('ledOutput');
      const outBit = document.getElementById('outputBit');
      if (led) led.classList.toggle('active', out === 1);
      if (outBit) outBit.textContent = out;

      const btnA = document.getElementById('toggleA');
      const btnB = document.getElementById('toggleB');
      if (btnA) { btnA.textContent = a; btnA.classList.toggle('on', a === 1); }
      if (btnB) {
        btnB.textContent = b;
        btnB.classList.toggle('on', b === 1);
        btnB.parentElement.style.display = gate === 'NOT' ? 'none' : 'flex';
      }

      // Render truth table
      const rows = TRUTH_TABLES[gate] || [];
      const tbody = document.getElementById('ttBody');
      if (tbody) {
        tbody.innerHTML = rows.map(r => {
          const isCurrent = (gate === 'NOT' ? r[0] === a : (r[0] === a && r[1] === b));
          return `<tr class="${isCurrent ? 'active-row' : ''}"><td>${r[0]}</td><td>${r[1]}</td><td><b>${r[2]}</b></td></tr>`;
        }).join('');
      }
    }

    document.getElementById('toggleA')?.addEventListener('click', () => { a = a === 1 ? 0 : 1; update(); });
    document.getElementById('toggleB')?.addEventListener('click', () => { b = b === 1 ? 0 : 1; update(); });

    document.querySelectorAll('#gatePills button').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('#gatePills button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        gate = btn.dataset.gate;
        update();
      };
    });

    update();
  }

  /* ---------------- Sim: In-Browser Code Sandbox ---------------- */
  function initSandboxLab() {
    const editor = document.getElementById('codeEditor');
    const consoleOut = document.getElementById('consoleOutput');
    const preset = document.getElementById('presetSelect');
    if (!editor) return;

    const PRESETS = {
      linear_reg: `# Linear Regression via Gradient Descent in Python
# Predicts output y based on input x

learning_rate = 0.05
epochs = 20
w = 0.0
b = 0.0

# Training data: y = 2*x + 1
data = [(1, 3), (2, 5), (3, 7), (4, 9)]

print("Starting Gradient Descent Training...")
for epoch in range(1, epochs + 1):
    total_loss = 0
    for x, y_true in data:
        y_pred = w * x + b
        error = y_pred - y_true
        total_loss += error ** 2
        w -= learning_rate * 2 * error * x
        b -= learning_rate * 2 * error
    if epoch % 5 == 0:
        print(f"Epoch {epoch}: w = {w:.3f}, b = {b:.3f}, Loss = {total_loss:.4f}")

print("Training finished!")
print(f"Prediction for x = 5: {w * 5 + b:.2f} (Expected: 11.00)")
`,
      ohms_law: `# Ohm's Law and Circuit Analysis
voltage = 12.0  # Volts
resistance = 4.0 # Ohms

current = voltage / resistance
power = voltage * current

print("--- Circuit Analysis Report ---")
print(f"Voltage (V)    : {voltage} V")
print(f"Resistance (R) : {resistance} Ohms")
print(f"Current (I)    : {current:.2f} Amperes")
print(f"Power (P)      : {power:.2f} Watts")

if current > 2.0:
    print("Warning: High current flow!")
else:
    print("Circuit operates safely within threshold.")
`,
      neural_node: `# Single Artificial Neuron with Sigmoid Activation
import math

def sigmoid(z):
    return 1.0 / (1.0 + math.exp(-z))

# Inputs: x1, x2
x1 = 0.8
x2 = 0.4

# Synaptic Weights & Bias
w1 = 1.2
w2 = -0.5
bias = -0.3

z = (x1 * w1) + (x2 * w2) + bias
activation = sigmoid(z)

print("--- Artificial Neuron Computation ---")
print(f"Weighted Sum (z) = {z:.4f}")
print(f"Sigmoid Output   = {activation:.4f}")
print("Neuron Fires!" if activation > 0.5 else "Neuron Inactive.")
`
    };

    editor.value = PRESETS.linear_reg;
    preset.onchange = () => {
      if (PRESETS[preset.value]) editor.value = PRESETS[preset.value];
    };

    document.getElementById('clearConsoleBtn')?.addEventListener('click', () => {
      consoleOut.textContent = '';
    });

    document.getElementById('runCodeBtn')?.addEventListener('click', () => {
      consoleOut.textContent = 'Executing...\n';
      // In-browser lightweight Python-like sandbox simulator
      try {
        const code = editor.value;
        const logs = [];
        const simulatedScope = {
          math: Math,
          print: (...args) => logs.push(args.join(' '))
        };

        // Convert common simple python statements into runnable js for instant execution
        let jsCode = code
          .replace(/print\(f?"([^"]*)"\)/g, (_, s) => {
            const formatted = s.replace(/\{([^}]+)\}/g, '${$1}');
            return `print(\`${formatted}\`);`;
          })
          .replace(/print\((.*)\)/g, 'print($1);')
          .replace(/#.*$/gm, '')
          .replace(/for (\w+) in range\(([^)]+)\):/g, (_, v, r) => {
            const parts = r.split(',').map(x => x.trim());
            if (parts.length === 1) return `for (let ${v} = 0; ${v} < ${parts[0]}; ${v}++) {`;
            return `for (let ${v} = ${parts[0]}; ${v} <= ${parts[1]}; ${v}++) {`;
          })
          .replace(/for (\w+), (\w+) in (\w+):/g, 'for (const [$1, $2] of $3) {')
          .replace(/if (.*):/g, 'if ($1) {')
          .replace(/else:/g, '} else {')
          .replace(/def (\w+)\(([^)]*)\):/g, 'function $1($2) {');

        // Add matching closing braces if needed
        const openCount = (jsCode.match(/{/g) || []).length;
        const closeCount = (jsCode.match(/}/g) || []).length;
        for (let i = 0; i < (openCount - closeCount); i++) jsCode += '\n}';

        const runFn = new Function('math', 'print', jsCode);
        runFn(Math, simulatedScope.print);

        consoleOut.textContent = logs.join('\n') || 'Program completed with no output.';
      } catch (err) {
        consoleOut.textContent = `Execution Error:\n${err.message}\n\n(Tip: Keep Python syntax standard or test basic loops and math expressions).`;
      }
    });
  }

  /* ==========================================================================
     5. NKWADAA STEM STYLE SEARCH SCREEN
     ========================================================================== */
  screens.stemSearch = screens.search = {
    html(q = '') {
      return `
        <div class="stem-search-screen">
          <div class="stem-search-hero">
            <h1 class="nkwadaa-title">Search</h1>
            <p class="nkwadaa-sub">Every word of the textbook, labs &amp; AI guides, offline</p>

            <div class="nkwadaa-search-bar">
              <i data-lucide="search" class="nkwadaa-s-icon"></i>
              <input id="nkwadaaInput" value="${esc(q)}" placeholder="osmosis, pH, food chain, Ohm's law, neural net..." autocomplete="off">
              <button id="nkwadaaClear" class="nkwadaa-clear" ${q ? '' : 'hidden'}>×</button>
            </div>

            <div class="nkwadaa-try-row">
              <span class="try-label">TRY</span>
              <div class="try-chips" id="tryChips">
                <button class="try-chip" data-q="photosynthesis">photosynthesis</button>
                <button class="try-chip" data-q="Ohm's law">Ohm's law</button>
                <button class="try-chip" data-q="neural net">neural net</button>
                <button class="try-chip" data-q="osmosis">osmosis</button>
                <button class="try-chip" data-q="pH">pH &amp; acids</button>
                <button class="try-chip" data-q="density">density</button>
                <button class="try-chip" data-q="logic gates">logic gates</button>
                <button class="try-chip" data-q="food chain">food chain</button>
                <button class="try-chip" data-q="reflex action">reflex action</button>
                <button class="try-chip" data-q="binary search">binary search</button>
                <button class="try-chip" data-q="electromagnet">electromagnet</button>
              </div>
            </div>
          </div>

          <div class="seg wide stem-tabs-bar" id="stemSearchTabs">
            <button class="on" data-t="all">All Results</button>
            <button data-t="labs">Labs</button>
            <button data-t="lessons">Lessons</button>
            <button data-t="posts">Community Posts</button>
            <button data-t="users">People</button>
          </div>

          <div id="stemSearchResults" class="stem-results-body"></div>
        </div>
      `;
    },
    wire(q = '') {
      const input = $('#nkwadaaInput');
      const clearBtn = $('#nkwadaaClear');
      const results = $('#stemSearchResults');
      let activeTab = 'all';
      let timer = null;

      function renderResults(data) {
        if (!data || (!data.labs?.length && !data.lessons?.length && !data.posts?.length && !data.users?.length)) {
          results.innerHTML = `
            <div class="nkwadaa-empty-state">
              ${ico('search')}
              <h3>No exact matches found</h3>
              <p>Try searching for core topics like <b>photosynthesis</b>, <b>Ohm's law</b>, <b>neural net</b>, or <b>osmosis</b>.</p>
            </div>
          `;
          refreshIcons();
          return;
        }

        let html = '';

        // 1. Labs matches
        if ((activeTab === 'all' || activeTab === 'labs') && data.labs?.length) {
          html += `
            <div class="s-section">
              <div class="s-sec-title">${ico('flask-conical')} Interactive Labs (${data.labs.length})</div>
              <div class="stem-lab-grid mini-grid">
                ${data.labs.map(lab => `
                  <div class="stem-lab-card compact" data-lab="${lab.id}">
                    <div class="slb-icon-wrap">${ico(lab.icon || 'flask-conical')}</div>
                    <div class="slb-content">
                      <span class="slc-category">${esc(lab.category)}</span>
                      <h3>${esc(lab.title)}</h3>
                      <p>${esc(lab.description)}</p>
                      <button class="stem-btn-primary sm-btn" data-open-lab="${lab.id}">${ico('play')} Launch Lab</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }

        // 2. Lessons matches
        if ((activeTab === 'all' || activeTab === 'lessons') && data.lessons?.length) {
          html += `
            <div class="s-section">
              <div class="s-sec-title">${ico('book-open')} Textbook &amp; AI Lessons (${data.lessons.length})</div>
              <div class="stem-card-grid">
                ${renderLessonsGrid(data.lessons)}
              </div>
            </div>
          `;
        }

        // 3. Community posts
        if ((activeTab === 'all' || activeTab === 'posts') && data.posts?.length) {
          html += `
            <div class="s-section">
              <div class="s-sec-title">${ico('messages-square')} Community Posts (${data.posts.length})</div>
              ${data.posts.map(feedCard).join('')}
            </div>
          `;
        }

        // 4. People
        if ((activeTab === 'all' || activeTab === 'users') && data.users?.length) {
          html += `
            <div class="s-section">
              <div class="s-sec-title">${ico('users')} People (${data.users.length})</div>
              <div class="user-results-row">
                ${data.users.map(u => `
                  <div class="lb-row" data-user="${esc(u.username)}">
                    ${userAv(u, 'sm')}
                    <b>${esc(u.displayName || u.username)}${vb(u)}<small class="muted"> @${esc(u.username)}</small></b>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }

        results.innerHTML = html;
        wireLessonCards();
        results.querySelectorAll('[data-open-lab], [data-lab]').forEach(el => {
          el.onclick = () => render('lab', el.dataset.openLab || el.dataset.lab);
        });
        results.querySelectorAll('[data-user]').forEach(el => {
          el.onclick = () => render('user', el.dataset.user);
        });
        wireFeed(results);
        refreshIcons();
      }

      async function doSearch() {
        const val = input.value.trim();
        clearBtn.hidden = !val;
        history.replaceState({}, '', '/search' + (val ? '?q=' + encodeURIComponent(val) : ''));

        if (!val) {
          results.innerHTML = `
            <div class="nkwadaa-idle-hint">
              <p>Type a term above or click any recommended <b>TRY</b> topic.</p>
            </div>
          `;
          return;
        }

        // Instant local search first (0ms latency & offline)
        const term = val.toLowerCase();
        const localLessons = STEM_LESSONS.filter(l =>
          l.title.toLowerCase().includes(term) ||
          l.summary.toLowerCase().includes(term) ||
          l.content.toLowerCase().includes(term) ||
          l.category.toLowerCase().includes(term)
        );

        const localLabs = STEM_LABS.filter(l =>
          l.title.toLowerCase().includes(term) ||
          l.description.toLowerCase().includes(term) ||
          l.concepts.some(c => c.toLowerCase().includes(term)) ||
          l.category.toLowerCase().includes(term)
        );

        // Fetch server results asynchronously (combining with community posts)
        try {
          const res = await api('/api/search?q=' + encodeURIComponent(val));
          const combinedLessons = res.lessons?.length ? res.lessons : localLessons;
          const combinedLabs = res.labs?.length ? res.labs : localLabs;
          renderResults({ ...res, lessons: combinedLessons, labs: combinedLabs });
        } catch (_) {
          // Offline fallback
          renderResults({ lessons: localLessons, labs: localLabs, posts: [], users: [] });
        }
      }

      input.oninput = () => {
        clearTimeout(timer);
        timer = setTimeout(doSearch, 200);
      };

      input.onkeydown = e => {
        if (e.key === 'Enter') {
          clearTimeout(timer);
          doSearch();
        }
      };

      clearBtn.onclick = () => {
        input.value = '';
        input.focus();
        doSearch();
      };

      document.querySelectorAll('#tryChips .try-chip').forEach(chip => {
        chip.onclick = () => {
          input.value = chip.dataset.q;
          input.focus();
          doSearch();
        };
      });

      document.querySelectorAll('#stemSearchTabs button').forEach(tabBtn => {
        tabBtn.onclick = () => {
          document.querySelectorAll('#stemSearchTabs button').forEach(b => b.classList.remove('on'));
          tabBtn.classList.add('on');
          activeTab = tabBtn.dataset.t;
          doSearch();
        };
      });

      if (q) {
        input.value = q;
        doSearch();
      } else {
        input.focus();
        results.innerHTML = `
          <div class="nkwadaa-idle-hint">
            <p>Type a term above or click any recommended <b>TRY</b> topic.</p>
          </div>
        `;
      }

      refreshIcons();
    }
  };

  // Register routes in Buzz's SPA router
  if (typeof ROUTES !== 'undefined') {
    ROUTES.learn = '/learn';
    ROUTES.labs = '/labs';
    ROUTES.stemSearch = '/search';
  }
  if (typeof DYN !== 'undefined') {
    DYN.push([/^\/learn\/([^/]+)$/, 'lesson', a => '/learn/' + encodeURIComponent(a)]);
    DYN.push([/^\/labs\/([^/]+)$/, 'lab', a => '/labs/' + encodeURIComponent(a)]);
  }

  // Hook into top search bar across the app
  const appSearch = document.getElementById('search');
  if (appSearch) {
    appSearch.onkeydown = e => {
      if (e.key === 'Enter' && e.target.value.trim()) {
        render('stemSearch', e.target.value.trim());
      }
    };
  }
})();
