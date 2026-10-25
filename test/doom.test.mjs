import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('cinco cliques consecutivos liberam a rota secreta', async () => {
  const source = await readFile(join(ROOT, 'public/doom-unlock.js'), 'utf8');
  let tap = null, destination = null, time = 1000;
  const context = {
    document: { getElementById: () => ({ addEventListener: (_name, fn) => { tap = fn; } }) },
    window: { location: { assign: path => { destination = path; } } },
    Date: { now: () => time }
  };
  runInNewContext(source, context);
  for (let i = 0; i < 4; i++) { time += 500; tap(); }
  assert.equal(destination, null);
  time += 500; tap();
  assert.equal(destination, '/doom');
});

test('intervalo longo reinicia a sequência de desbloqueio', async () => {
  const source = await readFile(join(ROOT, 'public/doom-unlock.js'), 'utf8');
  let tap = null, destination = null, time = 1000;
  runInNewContext(source, {
    document: { getElementById: () => ({ addEventListener: (_name, fn) => { tap = fn; } }) },
    window: { location: { assign: path => { destination = path; } } },
    Date: { now: () => time }
  });
  for (let i = 0; i < 3; i++) { time += 100; tap(); }
  time += 5000;
  for (let i = 0; i < 2; i++) { time += 100; tap(); }
  assert.equal(destination, null);
});

test('jogo requer ação explícita e não ativa persistência offline', async () => {
  const js = await readFile(join(ROOT, 'public/doom.js'), 'utf8');
  const html = await readFile(join(ROOT, 'public/doom.html'), 'utf8');
  assert.match(js, /start\.addEventListener\('click', startGame\)/);
  assert.match(js, /fsChanges:\s*\{ local: false \}/);
  assert.match(js, /autoSave:\s*false/);
  assert.match(js, /https:\/\/v8\.js-dos\.com\/bundles\/doom\.jsdos/);
  assert.doesNotMatch(js, /serviceWorker\.register/);
  assert.match(html, /id="startDoom"/);
  assert.match(html, /href="\/"[^>]*>← Voltar ao painel/);
});

async function getFreePort() {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

test('servidor entrega a rota /doom e seus recursos sem interferir no painel', { timeout: 18000 }, async () => {
  const port = await getFreePort();
  const dir = await mkdtemp(join(tmpdir(), 'sentinela-doom-'));
  const proc = spawn(process.execPath, ['server.mjs'], {
    cwd: ROOT, env: { ...process.env, ENABLE_AUTO_COLLECT: '0', PORT: String(port), HOST: '127.0.0.1', DATA_DIR: dir },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  try {
    let launched = false;
    for (let i = 0; i < 45; i++) {
      if (proc.exitCode !== null) break;
      try {
        const response = await fetch('http://127.0.0.1:' + port + '/doom');
        if (response.ok) { launched = true; break; }
      } catch { /* aguarda o processo escutar */ }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.equal(launched, true, 'servidor não iniciou');
    for (const [path, type] of [
      ['/doom', 'text/html'], ['/doom.js', 'text/javascript'], ['/doom.css', 'text/css'],
      ['/doom-unlock.js', 'text/javascript'], ['/', 'text/html'], ['/api/health', 'application/json']
    ]) {
      const response = await fetch('http://127.0.0.1:' + port + path);
      assert.equal(response.status, 200, path);
      assert.ok(response.headers.get('content-type')?.includes(type), path);
      assert.equal(response.headers.get('cache-control'), 'no-store', path);
    }
  } finally {
    proc.kill('SIGTERM');
    await rm(dir, { recursive: true, force: true });
  }
});
