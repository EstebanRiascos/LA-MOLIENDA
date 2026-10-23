/**
 * Sistema de sonidos de La Molienda POS.
 *
 * Todos los sonidos se sintetizan con la Web Audio API, por lo que no
 * dependen de archivos externos y funcionan sin internet dentro del .exe.
 */

export type SoundName =
  | 'click'
  | 'tab'
  | 'toggle'
  | 'open'
  | 'close'
  | 'add'
  | 'remove'
  | 'delete'
  | 'success'
  | 'cash'
  | 'error'
  | 'warning'
  | 'login'
  | 'logout'
  | 'dispatch'
  | 'served'
  | 'print'
  | 'notify'
  | 'goodbye';

const STORAGE_KEY_SOUND = 'lamolienda_sound_enabled_v1';

let audioCtx: AudioContext | null = null;
let soundEnabled: boolean = (() => {
  try {
    return localStorage.getItem(STORAGE_KEY_SOUND) !== '0';
  } catch {
    return true;
  }
})();

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  try {
    localStorage.setItem(STORAGE_KEY_SOUND, enabled ? '1' : '0');
  } catch {
    /* almacenamiento no disponible */
  }
  if (enabled) playSound('toggle');
}

function getCtx(): AudioContext | null {
  try {
    if (!audioCtx) {
      const Ctor: typeof AudioContext | undefined =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return null;
      audioCtx = new Ctor();
    }
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

interface ToneOptions {
  type?: OscillatorType;
  gain?: number;
  slideTo?: number;
  attack?: number;
}

/** Nota con envolvente suave (ataque corto + caída exponencial). */
function tone(
  ctx: AudioContext,
  freq: number,
  start: number,
  duration: number,
  { type = 'sine', gain = 0.15, slideTo, attack = 0.005 }: ToneOptions = {}
): void {
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) {
    osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
  }

  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.linearRampToValueAtTime(gain, t0 + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

/** Ráfaga de ruido filtrado (para efectos mecánicos: caja, impresora). */
function noise(
  ctx: AudioContext,
  start: number,
  duration: number,
  gain: number,
  filterFreq: number,
  filterType: BiquadFilterType = 'bandpass'
): void {
  const t0 = ctx.currentTime + start;
  const frames = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

  const src = ctx.createBufferSource();
  src.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = filterFreq;

  const amp = ctx.createGain();
  amp.gain.setValueAtTime(gain, t0);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  src.connect(filter);
  filter.connect(amp);
  amp.connect(ctx.destination);
  src.start(t0);
}

const recipes: Record<SoundName, (ctx: AudioContext) => void> = {
  // Clic suave de botón
  click: (ctx) => {
    tone(ctx, 900, 0, 0.04, { type: 'triangle', gain: 0.05 });
  },

  // Cambio de pestaña / sección
  tab: (ctx) => {
    tone(ctx, 587, 0, 0.07, { type: 'sine', gain: 0.07 });
    tone(ctx, 784, 0.055, 0.1, { type: 'sine', gain: 0.07 });
  },

  // Interruptores (tema claro/oscuro, sonido on/off)
  toggle: (ctx) => {
    tone(ctx, 660, 0, 0.06, { type: 'triangle', gain: 0.09 });
    tone(ctx, 990, 0.05, 0.09, { type: 'triangle', gain: 0.09 });
  },

  // Apertura / cierre de ventanas
  open: (ctx) => {
    tone(ctx, 420, 0, 0.12, { type: 'sine', gain: 0.07, slideTo: 640 });
  },
  close: (ctx) => {
    tone(ctx, 600, 0, 0.1, { type: 'sine', gain: 0.06, slideTo: 380 });
  },

  // Producto agregado a la comanda
  add: (ctx) => {
    tone(ctx, 520, 0, 0.1, { type: 'sine', gain: 0.13, slideTo: 880 });
  },

  // Producto quitado de la comanda
  remove: (ctx) => {
    tone(ctx, 700, 0, 0.12, { type: 'sine', gain: 0.1, slideTo: 300 });
  },

  // Eliminación (mesa / producto)
  delete: (ctx) => {
    tone(ctx, 320, 0, 0.2, { type: 'triangle', gain: 0.14, slideTo: 110 });
    noise(ctx, 0, 0.08, 0.05, 900, 'lowpass');
  },

  // Acción completada correctamente
  success: (ctx) => {
    tone(ctx, 659, 0, 0.14, { type: 'triangle', gain: 0.12 });
    tone(ctx, 880, 0.1, 0.22, { type: 'triangle', gain: 0.12 });
  },

  // Venta cobrada: "ka-ching" de caja registradora
  cash: (ctx) => {
    noise(ctx, 0, 0.06, 0.12, 5500, 'highpass');
    tone(ctx, 1568, 0.04, 0.1, { type: 'sine', gain: 0.14 });
    tone(ctx, 2093, 0.13, 0.55, { type: 'sine', gain: 0.16 });
    tone(ctx, 3136, 0.13, 0.4, { type: 'sine', gain: 0.05 });
    tone(ctx, 1046, 0.13, 0.5, { type: 'triangle', gain: 0.06 });
  },

  // Acción no permitida / error
  error: (ctx) => {
    tone(ctx, 196, 0, 0.14, { type: 'square', gain: 0.07 });
    tone(ctx, 147, 0.13, 0.22, { type: 'square', gain: 0.07 });
  },

  // Advertencia / confirmación pendiente
  warning: (ctx) => {
    tone(ctx, 466, 0, 0.12, { type: 'triangle', gain: 0.12 });
    tone(ctx, 466, 0.16, 0.16, { type: 'triangle', gain: 0.12 });
  },

  // Inicio de sesión: arpegio ascendente
  login: (ctx) => {
    [523, 659, 784, 1046].forEach((f, i) =>
      tone(ctx, f, i * 0.09, i === 3 ? 0.4 : 0.16, { type: 'triangle', gain: 0.11 })
    );
  },

  // Cierre de sesión: arpegio descendente
  logout: (ctx) => {
    [784, 659, 523].forEach((f, i) =>
      tone(ctx, f, i * 0.1, i === 2 ? 0.32 : 0.14, { type: 'triangle', gain: 0.1 })
    );
  },

  // Comanda enviada a barra / cocina: campanilla de servicio doble
  dispatch: (ctx) => {
    tone(ctx, 1319, 0, 0.45, { type: 'sine', gain: 0.15 });
    tone(ctx, 2637, 0, 0.25, { type: 'sine', gain: 0.04 });
    tone(ctx, 1319, 0.22, 0.55, { type: 'sine', gain: 0.15 });
    tone(ctx, 2637, 0.22, 0.3, { type: 'sine', gain: 0.04 });
  },

  // Producto marcado como servido: ding suave
  served: (ctx) => {
    tone(ctx, 988, 0, 0.35, { type: 'sine', gain: 0.13 });
    tone(ctx, 1976, 0, 0.18, { type: 'sine', gain: 0.03 });
  },

  // Impresión de ticket: impresora térmica + timbre final
  print: (ctx) => {
    for (let i = 0; i < 8; i++) {
      noise(ctx, i * 0.07, 0.05, 0.1, 2400 + (i % 2) * 600, 'bandpass');
    }
    tone(ctx, 1175, 0.62, 0.25, { type: 'sine', gain: 0.1 });
  },

  // Aviso genérico
  notify: (ctx) => {
    tone(ctx, 784, 0, 0.1, { type: 'sine', gain: 0.1 });
    tone(ctx, 988, 0.09, 0.16, { type: 'sine', gain: 0.1 });
  },

  // Despedida al cerrar el sistema
  goodbye: (ctx) => {
    [1046, 784, 659, 523].forEach((f, i) =>
      tone(ctx, f, i * 0.11, i === 3 ? 0.45 : 0.18, { type: 'triangle', gain: 0.1 })
    );
  },
};

export function playSound(name: SoundName): void {
  if (!soundEnabled) return;
  const ctx = getCtx();
  if (!ctx) return;
  try {
    recipes[name](ctx);
  } catch (err) {
    console.error('Error reproduciendo sonido:', err);
  }
}

/**
 * Elige el sonido adecuado según el texto de una notificación
 * (cobros, errores, sesión, eliminaciones, etc.).
 */
export function soundForNotification(message: string): SoundName {
  const m = message.toLowerCase();

  if (message.includes('⚠️') || m.includes('no se puede') || m.includes('restringid') || m.includes('exclusiv')) {
    return 'error';
  }
  if (m.startsWith('venta ') && m.includes('registrada')) return 'cash';
  if (m.includes('bienvenido')) return 'login';
  if (m.includes('sesión cerrada')) return 'logout';
  if (m.includes('eliminad')) return 'delete';
  if (m.includes('cancelada')) return 'remove';
  if (m.includes('no tiene más existencias') || m.includes('no hay más existencias')) return 'error';
  if (m.includes('cargada exitosamente') || m.includes('comanda de')) return 'dispatch';
  if (m.includes('ahora está') || m.includes('servidos')) return 'served';
  if (m.startsWith('+1')) return 'add';
  if (m.includes('arqueo')) return 'success';
  if (m.includes('descargado') || m.includes('reporte')) return 'success';
  if (m.includes('abierta') || m.includes('reservada') || m.includes('agregado') ||
      m.includes('registrado') || m.includes('actualizad') || m.includes('trasladada')) {
    return 'success';
  }
  return 'notify';
}
