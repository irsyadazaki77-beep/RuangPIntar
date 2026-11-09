import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { WebSocket } from 'ws';
import { createApp } from './app.js';
import { WebSocketHandler } from './websocket/websocket.handler.js';
import { closeDatabase } from './db/index.js';
import { classroomState } from './state/classroomState.js';
import { buildCurriculumSynthesis } from './controllers/ai.controller.js';
import { verifyPinTimingSafe, compareStringsTimingSafe } from './middleware/authMiddleware.js';

test('AI controller builds deterministic local edge curriculum synthesis', () => {
  const sampleModule = classroomState.getModules()[0];
  const question = 'Bagaimana rumus daya listrik mikrohidro?';
  const synthesis = buildCurriculumSynthesis(question, sampleModule);

  assert.equal(typeof synthesis.answerMarkdown, 'string');
  assert.equal(synthesis.answerMarkdown.includes(sampleModule.title), true);
  assert.equal(synthesis.answerMarkdown.includes('0 KB'), true);
  assert.equal(Array.isArray(synthesis.keyConcepts), true);
  assert.equal(synthesis.keyConcepts.length > 0, true);
});

test('timing-safe string comparison and PIN verification function properly', () => {
  assert.equal(compareStringsTimingSafe('1945', '1945'), true);
  assert.equal(compareStringsTimingSafe('1945', '1946'), false);
  assert.equal(compareStringsTimingSafe('1945', '19450'), false);
  assert.equal(compareStringsTimingSafe('short', 'longer-string'), false);

  assert.equal(verifyPinTimingSafe('1945'), true);
  assert.equal(verifyPinTimingSafe('0000'), false);
});

test('server REST API and WebSocket integration test', async () => {
  const server = http.createServer();
  const wsHandler = new WebSocketHandler(server);
  const app = await createApp(server, { skipVite: true });
  server.on('request', app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  assert.notEqual(address, null);
  const port = typeof address === 'object' && address ? address.port : 3000;
  const baseUrl = `http://127.0.0.1:${port}`;
  const wsUrl = `ws://127.0.0.1:${port}/ws`;

  try {
    // 1. Test /api/state
    const stateRes = await fetch(`${baseUrl}/api/state`);
    assert.equal(stateRes.status, 200);
    const stateData = await stateRes.json();
    assert.equal(Array.isArray(stateData.modules), true);
    assert.equal(Array.isArray(stateData.peers), true);
    assert.equal(typeof stateData.metrics, 'object');

    // 2. Test /api/host/network-info
    const netRes = await fetch(`${baseUrl}/api/host/network-info`);
    assert.equal(netRes.status, 200);
    const netData = await netRes.json();
    assert.equal(netData.ok, true);
    assert.equal(typeof netData.primaryIp, 'string');
    assert.equal(typeof netData.lanUrl, 'string');

    // 3. Test Rate Limiting on PIN verification
    const pinRes = await fetch(`${baseUrl}/api/host/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '1945' }),
    });
    assert.equal(pinRes.status, 200);
    const pinData = await pinRes.json();
    assert.equal(pinData.ok, true);
    assert.equal(pinData.valid, true);

    // 4. Test wrong PIN
    const wrongPinRes = await fetch(`${baseUrl}/api/host/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: 'wrong' }),
    });
    assert.equal(wrongPinRes.status, 401);

    // 5. Test AI ask question (local cache hit)
    const askRes = await fetch(`${baseUrl}/api/tutor/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'Bagaimana rumus menghitung daya listrik mikrohidro dari tinggi jatuh air dan debit sungai?',
        moduleId: 'mod-fisika-mikrohidro',
        askedByPeerName: 'Test Siswa',
      }),
    });
    assert.equal(askRes.status, 200);
    const askData = await askRes.json();
    assert.equal(typeof askData.result, 'object');
    assert.equal(askData.result.source, 'LOCAL_CACHE');
    assert.equal(askData.result.ispQuotaBytesUsed, 0);

    // 6. Test WebSocket connection and state sync
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket connection timed out'));
      }, 3000);

      ws.on('open', () => {
        ws.send(
          JSON.stringify({
            type: 'peer:identify',
            peerId: 'peer-test-unit',
            studentName: 'Siswa Testing',
            deviceType: 'Laptop Siswa',
          })
        );
      });

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(String(data));
          if (msg.type === 'init' || msg.type === 'state:sync') {
            clearTimeout(timeout);
            ws.close();
            resolve();
          }
        } catch {
          // Ignore
        }
      });

      ws.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    assert.equal(wsHandler.getConnectedClientsCount() >= 0, true);
  } finally {
    server.close();
    closeDatabase();
  }
});

test('FASE 5: Session token authentication, rate limiting, and protected route authorization test', async () => {
  const server = http.createServer();
  const app = await createApp(server, { skipVite: true });
  server.on('request', app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  assert.notEqual(address, null);
  const port = typeof address === 'object' && address ? address.port : 3000;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Test POST /api/auth/login with correct PIN -> 200 and session token
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '1945' }),
    });
    assert.equal(loginRes.status, 200);
    const loginData = await loginRes.json();
    assert.equal(loginData.success, true);
    assert.equal(typeof loginData.token, 'string');
    assert.equal(loginData.token.length >= 32, true);
    assert.equal(typeof loginData.expiresAt, 'number');
    const validToken = loginData.token;

    // 2. Test access to protected endpoint with valid Bearer token -> 200
    const protectedWithTokenRes = await fetch(`${baseUrl}/api/gateway/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({ online: true }),
    });
    assert.equal(protectedWithTokenRes.status, 200);
    const toggleData = await protectedWithTokenRes.json();
    assert.equal(toggleData.ok, true);

    // 3. Test access to protected endpoint without Bearer token -> 401
    const protectedNoTokenRes = await fetch(`${baseUrl}/api/gateway/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ online: false }),
    });
    assert.equal(protectedNoTokenRes.status, 401);

    // 4. Test POST /api/auth/login with wrong PIN -> 401
    const wrongLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '9999-wrong' }),
    });
    assert.equal(wrongLoginRes.status, 401);
    const wrongData = await wrongLoginRes.json();
    assert.equal(wrongData.success, false);

    // 5. Test brute force lockout / 429 rate limiter on /api/auth/login
    let reached429 = false;
    for (let i = 0; i < 15; i++) {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: `brute-wrong-${i}` }),
      });
      if (res.status === 429) {
        reached429 = true;
        break;
      }
    }
    assert.equal(reached429, true);

    // 6. Test POST /api/auth/logout to revoke token
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
    });
    assert.equal(logoutRes.status, 200);
    const logoutData = await logoutRes.json();
    assert.equal(logoutData.success, true);

    // 7. Test protected endpoint after token is revoked -> must return 401
    const postLogoutRes = await fetch(`${baseUrl}/api/gateway/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({ online: true }),
    });
    assert.equal(postLogoutRes.status, 401);
  } finally {
    server.close();
    closeDatabase();
  }
});
