const canvas = document.getElementById('fireflies-canvas');
const ctx = canvas.getContext('2d');

let width, height;
let fireflies = [];
const FIREFLY_COUNT = 65;

let isDangerMode = false;
let attractAll = false;

const mouse = {
  x: null,
  y: null,
  radius: 160
};

window.addEventListener('mousemove', (e) => {
  mouse.x = e.x;
  mouse.y = e.y;
});

window.addEventListener('mouseout', () => {
  mouse.x = null;
  mouse.y = null;
});

function resizeCanvas() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Firefly {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.size = Math.random() * 2.5 + 1.2;
    this.speedX = (Math.random() - 0.5) * 0.8;
    this.speedY = (Math.random() - 0.5) * 0.8 - 0.2;
    this.angle = Math.random() * Math.PI * 2;
    this.pulseSpeed = Math.random() * 0.04 + 0.015;
  }

  update() {
    this.angle += this.pulseSpeed;
    const speedMultiplier = isDangerMode ? 1.8 : 1;

    this.x += (this.speedX + Math.cos(this.angle) * 0.3) * speedMultiplier;
    this.y += (this.speedY + Math.sin(this.angle) * 0.3) * speedMultiplier;

    if (attractAll) {
      const centerX = width / 2;
      const centerY = height / 2;
      this.x += (centerX - this.x) * 0.03;
      this.y += (centerY - this.y) * 0.03;
    } else if (mouse.x !== null && mouse.y !== null) {
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < mouse.radius) {
        this.x += dx * 0.015;
        this.y += dy * 0.015;
      }
    }

    if (this.x < -20) this.x = width + 20;
    if (this.x > width + 20) this.x = -20;
    if (this.y < -20) this.y = height + 20;
    if (this.y > height + 20) this.y = -20;
  }

  draw() {
    const alpha = 0.15 + ((Math.sin(this.angle) + 1) / 2) * 0.85;

    ctx.save();
    ctx.beginPath();

    const glowRadius = this.size * 6;
    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, glowRadius
    );

    if (isDangerMode) {
      gradient.addColorStop(0, `rgba(255, 120, 130, ${alpha})`);
      gradient.addColorStop(0.4, `rgba(217, 38, 56, ${alpha * 0.6})`);
      gradient.addColorStop(1, 'rgba(217, 38, 56, 0)');
    } else {
      gradient.addColorStop(0, `rgba(255, 250, 210, ${alpha})`);
      gradient.addColorStop(0.4, `rgba(244, 208, 63, ${alpha * 0.6})`);
      gradient.addColorStop(1, 'rgba(244, 208, 63, 0)');
    }

    ctx.fillStyle = gradient;
    ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function initFireflies() {
  fireflies = [];
  for (let i = 0; i < FIREFLY_COUNT; i++) {
    fireflies.push(new Firefly());
  }
}

function animate() {
  ctx.clearRect(0, 0, width, height);
  fireflies.forEach((firefly) => {
    firefly.update();
    firefly.draw();
  });
  requestAnimationFrame(animate);
}

initFireflies();
animate();

// --- AUDIO AMBIENTAL (WEB AUDIO API) ---
class AmbientAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.droneOsc1 = null;
    this.droneOsc2 = null;
    this.chirpTimer = null;
    this.isPlaying = false;
  }

  init() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, this.ctx.currentTime);
    filter.connect(this.masterGain);

    this.droneOsc1 = this.ctx.createOscillator();
    this.droneOsc1.type = 'sine';
    this.droneOsc1.frequency.setValueAtTime(110, this.ctx.currentTime);

    this.droneOsc2 = this.ctx.createOscillator();
    this.droneOsc2.type = 'triangle';
    this.droneOsc2.frequency.setValueAtTime(164.81, this.ctx.currentTime);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

    this.droneOsc1.connect(oscGain);
    this.droneOsc2.connect(oscGain);
    oscGain.connect(filter);

    this.droneOsc1.start();
    this.droneOsc2.start();
  }

  triggerNightChirp() {
    if (!this.isPlaying || !this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const baseFreq = isDangerMode ? 2650 : 3400;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.12, now + 0.06);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.015, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.1);

    const nextDelay = 1200 + Math.random() * 2400;
    this.chirpTimer = setTimeout(() => this.triggerNightChirp(), nextDelay);
  }

  updateMood(danger) {
    if (!this.ctx || !this.droneOsc1 || !this.droneOsc2) return;
    const now = this.ctx.currentTime;
    if (danger) {
      this.droneOsc1.frequency.exponentialRampToValueAtTime(92.5, now + 0.6);
      this.droneOsc2.frequency.exponentialRampToValueAtTime(130.81, now + 0.6);
    } else {
      this.droneOsc1.frequency.exponentialRampToValueAtTime(110, now + 0.6);
      this.droneOsc2.frequency.exponentialRampToValueAtTime(164.81, now + 0.6);
    }
  }

  toggle() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(Math.max(this.masterGain.gain.value, 0.001), now);
      this.masterGain.gain.exponentialRampToValueAtTime(0.35, now + 0.8);
      this.triggerNightChirp();
    } else {
      this.isPlaying = false;
      clearTimeout(this.chirpTimer);
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(Math.max(this.masterGain.gain.value, 0.001), now);
      this.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    }
    return this.isPlaying;
  }
}

const ambientAudio = new AmbientAudioEngine();
const audioToggleBtn = document.getElementById('audio-toggle');
const audioText = document.getElementById('audio-text');

audioToggleBtn.addEventListener('click', () => {
  const playing = ambientAudio.toggle();
  audioToggleBtn.classList.toggle('playing', playing);
  audioText.textContent = playing ? 'Audio: On' : 'Audio: Off';
});

// --- ATMOSFERA Y LUCIERNAGAS ---
const moodToggleBtn = document.getElementById('mood-toggle');
const moodText = document.getElementById('mood-text');
const dynamicQuote = document.getElementById('dynamic-quote');

function applyMood(danger) {
  isDangerMode = danger;
  document.body.classList.toggle('mode-danger', isDangerMode);
  ambientAudio.updateMood(isDangerMode);

  dynamicQuote.style.opacity = 0;
  setTimeout(() => {
    if (isDangerMode) {
      moodText.textContent = 'Modo: Peligro';
      dynamicQuote.textContent = '\u201cSi intentas escapar de m\u00ed, te amar\u00e9 hasta que no quede nada m\u00e1s en esta isla.\u201d';
    } else {
      moodText.textContent = 'Modo: Promesa';
      dynamicQuote.textContent = '\u201cC\u00e1sate conmigo. Proteger\u00e9 tu vida ef\u00edmera hasta que se apague la \u00faltima luz.\u201d';
    }
    dynamicQuote.style.opacity = 1;
  }, 200);
}

applyMood(false);

moodToggleBtn.addEventListener('click', () => {
  applyMood(!isDangerMode);
});

const burstBtn = document.getElementById('burst-btn');
burstBtn.addEventListener('click', () => {
  attractAll = true;
  burstBtn.textContent = 'Reuniendo luz...';
  setTimeout(() => {
    attractAll = false;
    burstBtn.textContent = 'Atraer luci\u00e9rnagas';
  }, 1500);
});

// --- MODULO DE PERSONAJES ---
const charactersData = {
  shinpei: {
    name: 'Shinpei Goto',
    monogram: '\u5f8c\u85e4<br>\u65b0\u5e73',
    facets: [
      {
        badge: 'FACETA: GUARDI\u00c1N DEVOTO',
        role: 'Asesino a sueldo \u00b7 Guardaespaldas',
        quote: '\u201cNo importa qui\u00e9n venga a buscarte en la oscuridad; mientras respire, nadie tocar\u00e1 un cabello de tu cabeza.\u201d',
        bio: 'Un hombre marcado por la violencia y el aislamiento, que encuentra en su obsesi\u00f3n por proteger a Satoko una raz\u00f3n de existir m\u00e1s all\u00e1 de la sangre.',
        stats: [
          { label: 'Devoci\u00f3n', value: 95 },
          { label: 'Letalidad', value: 92 },
          { label: 'Contenci\u00f3n', value: 68 }
        ]
      },
      {
        badge: 'FACETA: FILO EN LA NOCHE',
        role: 'Verdugo \u00b7 Peligro absoluto',
        quote: '\u201cSi son los que buscan su sangre, entonces no merecen ver amanecer.\u201d',
        bio: 'Cuando la amenaza cruza el l\u00edmite, su calma se disuelve en una precisi\u00f3n implacable. No duda en te\u00f1ir la noche de rojo para cumplir su palabra.',
        stats: [
          { label: 'Devoci\u00f3n', value: 100 },
          { label: 'Letalidad', value: 99 },
          { label: 'Contenci\u00f3n', value: 25 }
        ]
      }
    ]
  },
  satoko: {
    name: 'Satoko Kirigaya',
    monogram: '\u6850\u30f6\u8c37<br>\u7d17\u90fd\u5b50',
    facets: [
      {
        badge: 'FACETA: HEREDERA CONDENADA',
        role: 'Joven noble \u00b7 Sentencia de muerte',
        quote: '\u201cSab\u00eda que mi vida no durar\u00eda mucho, pero no imagin\u00e9 que el final llegar\u00eda tan r\u00e1pido.\u201d',
        bio: 'Criada en un entorno donde su posici\u00f3n la vuelve blanco de conspiraciones, carga con el peso de una existencia breve y vigilada.',
        stats: [
          { label: 'Resiliencia', value: 84 },
          { label: 'Lucidez', value: 88 },
          { label: 'Fragilidad', value: 72 }
        ]
      },
      {
        badge: 'FACETA: VOLUNTAD FIRME',
        role: 'Quien elige su propio rumbo',
        quote: '\u201cSi tengo que caminar entre sombras, prefiero decidir qu\u00e9 hacer con el tiempo que me queda.\u201d',
        bio: 'Lejos de ser solo una espectadora pasiva, empieza a leer el juego de quienes la rodean y a tomar decisiones propias frente a lo inevitable.',
        stats: [
          { label: 'Resiliencia', value: 94 },
          { label: 'Lucidez', value: 92 },
          { label: 'Fragilidad', value: 45 }
        ]
      }
    ]
  },
  kotaro: {
    name: 'Kotaro',
    monogram: '\u5c0f\u592a\u90ce',
    facets: [
      {
        badge: 'FACETA: OBSERVADOR LEAL',
        role: 'Aliado cercano \u00b7 C\u00f3mplice',
        quote: '\u201cHay cosas que se entienden mejor mirando en silencio desde las sombras.\u201d',
        bio: 'Conoce los m\u00e1rgenes de la historia y act\u00faa con cautela, movi\u00e9ndose entre los hilos del conflicto con un sentido propio de lealtad.',
        stats: [
          { label: 'Astucia', value: 86 },
          { label: 'Lealtad', value: 82 },
          { label: 'Sigilo', value: 89 }
        ]
      },
      {
        badge: 'FACETA: JUGADA OCULTA',
        role: 'Pieza clave en la tormenta',
        quote: '\u201cCuando todos miran hacia un lado, el verdadero movimiento ocurre detr\u00e1s.\u201d',
        bio: 'Su aparente calma esconde c\u00e1lculos y silencios que pueden inclinar la balanza en los momentos m\u00e1s cr\u00edticos.',
        stats: [
          { label: 'Astucia', value: 95 },
          { label: 'Lealtad', value: 85 },
          { label: 'Sigilo', value: 94 }
        ]
      }
    ]
  }
};

let currentCharKey = 'shinpei';
let currentFacetIndex = 0;

const charTabs = document.querySelectorAll('.char-tab');
const toggleFacetBtn = document.getElementById('toggle-facet-btn');
const elBadge = document.getElementById('char-aspect-badge');
const elMonogram = document.getElementById('char-monogram');
const elRole = document.getElementById('char-role');
const elName = document.getElementById('char-name');
const elQuote = document.getElementById('char-quote');
const elBio = document.getElementById('char-bio');

const statEls = [
  {
    label: document.getElementById('stat1-label'),
    val: document.getElementById('stat1-val'),
    bar: document.getElementById('stat1-bar')
  },
  {
    label: document.getElementById('stat2-label'),
    val: document.getElementById('stat2-val'),
    bar: document.getElementById('stat2-bar')
  },
  {
    label: document.getElementById('stat3-label'),
    val: document.getElementById('stat3-val'),
    bar: document.getElementById('stat3-bar')
  }
];

function renderCharacter() {
  const charObj = charactersData[currentCharKey];
  const facet = charObj.facets[currentFacetIndex];

  elName.textContent = charObj.name;
  elMonogram.innerHTML = charObj.monogram;
  elBadge.textContent = facet.badge;
  elRole.textContent = facet.role;
  elQuote.textContent = facet.quote;
  elBio.textContent = facet.bio;

  facet.stats.forEach((s, idx) => {
    statEls[idx].label.textContent = s.label;
    statEls[idx].val.textContent = `${s.value}%`;
    statEls[idx].bar.style.width = `${s.value}%`;
  });
}

charTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    charTabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    currentCharKey = tab.dataset.char;
    currentFacetIndex = 0;
    renderCharacter();
  });
});

toggleFacetBtn.addEventListener('click', () => {
  currentFacetIndex = currentFacetIndex === 0 ? 1 : 0;
  renderCharacter();
});

renderCharacter();

// --- MAPA INTERACTIVO DE LA ISLA TENNYO ---
const locationsData = {
  mansion: {
    code: 'SECTOR 01',
    risk: 'RIESGO: ALTO',
    title: 'Mansi\u00f3n Kirigaya',
    jp: '\u6850\u30f6\u8c37\u90b8',
    desc: 'Un espacio de aparente distinci\u00f3n y protocolo donde la vigilancia, las apariencias y las amenazas ocultas conviven bajo el mismo techo.',
    note: 'El contraste entre la elegancia formal de la \u00e9poca y la vulnerabilidad constante define el encierro de Satoko.'
  },
  bosque: {
    code: 'SECTOR 02',
    risk: 'RIESGO: MEDIO',
    title: 'Bosque de Luci\u00e9rnagas',
    jp: '\u30db\u30bf\u30eb\u306e\u68ee',
    desc: 'Senderos oscuros iluminados por destellos breves y silenciosos. Un refugio fugaz donde la luz aparece y desaparece en segundos.',
    note: 'Simboliza lo ef\u00edmero de la vida y la belleza fr\u00e1gil que resiste en medio de la oscuridad.'
  },
  puerto: {
    code: 'SECTOR 03',
    risk: 'RIESGO: CR\u00cdTICO',
    title: 'Muelle y Niebla',
    jp: '\u9727\u306e\u6ce2\u6b62\u5834',
    desc: 'El borde entre la isla y el mar abierto. Punto de llegadas inesperadas, fugas y miradas vigilantes entre la bruma.',
    note: 'La niebla oculta tanto el escape posible como la emboscada.'
  },
  sombra: {
    code: 'SECTOR 04',
    risk: 'RIESGO: EXTREMO',
    title: 'Zona de Caza',
    jp: '\u72e9\u308a\u306e\u9818\u57df',
    desc: 'Rincones apartados donde los acuerdos se rompen y la violencia act\u00faa sin testigos ni etiquetas sociales.',
    note: 'Aqu\u00ed se revela el lado m\u00e1s implacable de quienes operan en las sombras.'
  }
};

const mapPins = document.querySelectorAll('.map-pin');
const elLocCode = document.getElementById('loc-code');
const elLocRisk = document.getElementById('loc-risk');
const elLocTitle = document.getElementById('loc-title');
const elLocJp = document.getElementById('loc-jp');
const elLocDesc = document.getElementById('loc-desc');
const elLocNote = document.getElementById('loc-note');

function selectLocation(key) {
  const loc = locationsData[key];
  if (!loc) return;
  elLocCode.textContent = loc.code;
  elLocRisk.textContent = loc.risk;
  elLocTitle.textContent = loc.title;
  elLocJp.textContent = loc.jp;
  elLocDesc.textContent = loc.desc;
  elLocNote.textContent = loc.note;
}

selectLocation('mansion');

mapPins.forEach((pin) => {
  pin.addEventListener('click', () => {
    mapPins.forEach((p) => p.classList.remove('active'));
    pin.classList.add('active');
    selectLocation(pin.dataset.loc);
  });
});

// --- ESCENA INTERACTIVA: LA PROPUESTA ---
const storyNodes = {
  start: {
    step: 'ESCENA 1 / 3',
    text: 'La noche envuelve la isla mientras las luci\u00e9rnagas cruzan la penumbra. Frente a ti, Shinpei sostiene una propuesta tan peligrosa como absoluta: casarte con \u00e9l para que sea quien te proteja hasta tu \u00faltimo d\u00eda.',
    choices: [
      {
        label: '\u201c\u00bfPor qu\u00e9 arriesgar\u00edas tu vida por alguien con los d\u00edas contados?\u201d',
        next: 'question',
        tensionDelta: 15,
        danger: false
      },
      {
        label: 'Sostener su mirada con frialdad: \u201cNo voy a someterme sin condiciones.\u201d',
        next: 'defiant',
        tensionDelta: 30,
        danger: true
      }
    ]
  },
  question: {
    step: 'ESCENA 2 / 3',
    text: 'Shinpei no aparta la vista. Entre el murmullo de la noche, admite que su existencia carece de direcci\u00f3n y que elegir protegerte le da un prop\u00f3sito que nada m\u00e1s le ofrece.',
    choices: [
      {
        label: 'Aceptar el pacto bajo tus propias reglas.',
        next: 'ending_pact',
        tensionDelta: 10,
        danger: false
      },
      {
        label: 'Exigir la verdad detr\u00e1s de quienes te amenazan.',
        next: 'ending_edge',
        tensionDelta: 25,
        danger: true
      }
    ]
  },
  defiant: {
    step: 'ESCENA 2 / 3',
    text: 'El aire se vuelve denso. Lejos de retroceder, Shinpei percibe tu determinaci\u00f3n y deja claro que, si el peligro llega, responder\u00e1 con toda su fuerza.',
    choices: [
      {
        label: 'Mantener el pulso firme y sellar la alianza en la penumbra.',
        next: 'ending_edge',
        tensionDelta: 20,
        danger: true
      },
      {
        label: 'Bajar la guardia un instante y escuchar su promesa.',
        next: 'ending_pact',
        tensionDelta: -10,
        danger: false
      }
    ]
  },
  ending_pact: {
    step: 'DESENLACE \u00b7 PACTO EN LA LUZ',
    text: 'Las luci\u00e9rnagas rodean el claro como testigos silenciosos. No es un cuento sencillo, sino una alianza forjada en la adversidad: decid\u00eds enfrentar lo que viene sin perder tu propia voz.',
    choices: []
  },
  ending_edge: {
    step: 'DESENLACE \u00b7 AL FILO DE LA NOCHE',
    text: 'La noche se ti\u00f1e de advertencia. Sab\u00e9s que cada paso a partir de este momento acerca el choque definitivo, pero ya no camin\u00e1s a ciegas entre las sombras.',
    choices: []
  }
};

let currentTension = 35;
const elSceneStep = document.getElementById('scene-step');
const elSceneNarration = document.getElementById('scene-narration');
const elSceneChoices = document.getElementById('scene-choices');
const elTensionFill = document.getElementById('tension-fill');
const elTensionValue = document.getElementById('tension-value');
const restartSceneBtn = document.getElementById('restart-scene-btn');

function updateTension(delta) {
  currentTension = Math.max(10, Math.min(100, currentTension + delta));
  elTensionFill.style.width = `${currentTension}%`;
  elTensionValue.textContent = `${currentTension}%`;
}

function renderScene(nodeKey) {
  const node = storyNodes[nodeKey];
  elSceneStep.textContent = node.step;
  elSceneNarration.textContent = node.text;
  elSceneChoices.innerHTML = '';

  if (node.choices.length === 0) {
    restartSceneBtn.style.display = 'inline-block';
    return;
  }

  restartSceneBtn.style.display = 'none';

  node.choices.forEach((choice) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = choice.label;
    btn.addEventListener('click', () => {
      updateTension(choice.tensionDelta);
      if (choice.danger !== undefined && choice.danger !== isDangerMode) {
        applyMood(choice.danger);
      }
      renderScene(choice.next);
    });
    elSceneChoices.appendChild(btn);
  });
}

restartSceneBtn.addEventListener('click', () => {
  currentTension = 35;
  updateTension(0);
  applyMood(false);
  renderScene('start');
});

renderScene('start');