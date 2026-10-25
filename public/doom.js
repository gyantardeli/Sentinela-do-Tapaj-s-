// Jogo secreto opcional: carrega o js-dos apenas após interação explícita.
const SCRIPT_URL = 'https://v8.js-dos.com/latest/js-dos.js';
const STYLE_URL = 'https://v8.js-dos.com/latest/js-dos.css';
const GAME_URL = 'https://v8.js-dos.com/bundles/doom.jsdos'; // DOOM shareware (episódio 1)
const start = document.getElementById('startDoom');
const full = document.getElementById('fullscreenDoom');
const stop = document.getElementById('stopDoom');
const status = document.getElementById('gameStatus');
const screen = document.getElementById('dos');
let player = null;
let loading = false;

function say(message, isError = false) {
  status.textContent = message;
  status.style.color = isError ? '#ffb8aa' : '#d3dea0';
}
function loadResource(url, kind) {
  return new Promise((resolve, reject) => {
    const el = document.createElement(kind === 'script' ? 'script' : 'link');
    if (kind === 'script') { el.src = url; el.async = true; }
    else { el.rel = 'stylesheet'; el.href = url; }
    const timeout = setTimeout(() => {
      el.remove();
      reject(new Error('Tempo esgotado ao carregar o emulador.'));
    }, 20000);
    el.onload = () => { clearTimeout(timeout); resolve(); };
    el.onerror = () => { clearTimeout(timeout); el.remove(); reject(new Error('Falha na conexão com js-dos.')); };
    document.head.append(el);
  });
}
async function shutDown() {
  stop.disabled = true;
  full.disabled = true;
  if (player) {
    const old = player;
    player = null;
    try { await old.stop(); } catch { /* o usuário ainda pode voltar */ }
  }
  screen.replaceChildren();
  const idle = document.createElement('div');
  idle.className = 'idle';
  idle.textContent = 'DOOM';
  screen.append(idle);
  loading = false;
  start.disabled = false;
  start.hidden = false;
}
async function startGame() {
  if (loading || player) return;
  loading = true;
  start.disabled = true;
  stop.disabled = false;
  say('Carregando o emulador e a edição shareware (internet necessária)…');
  try {
    await Promise.all([loadResource(STYLE_URL, 'style'), loadResource(SCRIPT_URL, 'script')]);
    if (typeof window.Dos !== 'function') throw new Error('Emulador indisponível.');
    screen.replaceChildren();
    player = window.Dos(screen, {
      url: GAME_URL,
      pathPrefix: 'https://v8.js-dos.com/latest/',
      autoStart: true,
      autoSave: false,
      fsChanges: { local: false },
      theme: 'dark',
      renderAspect: '4/3',
      softKeyboardLayout: [
        '{up} {left} {right} {down}',
        '{ctrl} {space} {shift} {esc}',
        '1 2 3 4 5 6 7 {enter}'
      ],
      softKeyboardSymbols: [{
        '{ctrl}': 'FOGO', '{space}': 'USAR', '{shift}': 'CORRER',
        '{esc}': 'MENU'
      }],
      onEvent: (event) => {
        if (event === 'emu-ready') say('Emulador pronto. Iniciando DOOM…');
        if (event === 'ci-ready') {
          say('DOOM iniciado. Divirta-se! Use os controles indicados abaixo.');
          full.disabled = false;
          start.hidden = true;
        }
      }
    });
    player.setNoCloud(true);
    player.setAutoSave(false);
    say('Iniciando DOOM… Se o jogo não abrir, verifique o acesso ao serviço js-dos.');
  } catch (error) {
    await shutDown();
    say('Não foi possível abrir o jogo: ' + (error?.message || String(error)), true);
  } finally {
    loading = false;
  }
}
start.addEventListener('click', startGame);
full.addEventListener('click', () => {
  if (!player) return;
  try { player.setFullScreen(true); } catch {
    if (screen.requestFullscreen) screen.requestFullscreen().catch(() => say('Tela cheia indisponível neste navegador.', true));
  }
});
stop.addEventListener('click', async () => {
  if (loading) return;
  await shutDown();
  say('Jogo encerrado. O painel ambiental não foi afetado.');
});
window.addEventListener('pagehide', () => { if (player) void player.stop().catch(() => {}); });
