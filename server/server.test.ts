import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { WebSocket } from 'ws';
import { createApp } from './app.js';
import { WebSocketHandler } from './websocket/websocket.handler.js';
import { closeDatabase } from './db/index.js';
import { classroomState } from './state/classroomState.js';
import { buildCurriculumSynthesis } from './controllers/ai.controller.js';
import {
  verifyPinTimingSafe,
  compareStringTimingSafe,
  compareStringsTimingSafe,
  getCurrentHostPin,
} from './middleware/authMiddleware.js';
import { config, resolveHostPin } from './config/env.js';

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

test('FASE 1 & 2: SHA-256 timing-safe comparison and ephemeral/fail-fast PIN configuration', () => {
  // 1. Identical strings return true
  assert.equal(compareStringTimingSafe('482910', '482910'), true);
  assert.equal(compareStringsTimingSafe('ruangpintar-secret', 'ruangpintar-secret'), true);

  // 2. Same length but different strings return false
  assert.equal(compareStringTimingSafe('482910', '482911'), false);
  assert.equal(compareStringTimingSafe('aaaaaa', 'bbbbbb'), false);

  // 3. Different length strings return false without leaking length via early return
  assert.equal(compareStringTimingSafe('1234', '12345678'), false);
  assert.equal(compareStringTimingSafe('short', 'much-longer-secret-pin-string'), false);
  assert.equal(compareStringTimingSafe('', 'non-empty'), false);

  // 4. Defensive handling of non-string, null, and undefined values without throwing
  assert.equal(compareStringTimingSafe(null, '482910'), false);
  assert.equal(compareStringTimingSafe('482910', undefined), false);
  assert.equal(compareStringTimingSafe(null, undefined), false);
  assert.equal(compareStringTimingSafe(123456, '123456'), false);
  assert.equal(compareStringTimingSafe({}, []), false);

  // 5. Verify PIN against active hostPin
  const activePin = getCurrentHostPin();
  assert.equal(verifyPinTimingSafe(activePin), true);
  assert.equal(verifyPinTimingSafe('000000-wrong'), false);
  assert.equal(verifyPinTimingSafe(null), false);

  // 6. Verify resolveHostPin generates a random 6-digit PIN in dev and fails fast in production
  const devResolved = resolveHostPin('', 'development');
  assert.equal(devResolved.isEphemeralPin, true);
  assert.equal(/^\d{6}$/.test(devResolved.hostPin), true);
  assert.notEqual(devResolved.hostPin, '1945');

  assert.throws(
    () => resolveHostPin('', 'production'),
    /FATAL CONFIG ERROR/
  );
  assert.throws(
    () => resolveHostPin('abc', 'production'),
    /FATAL CONFIG ERROR/
  );
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
  const activePin = getCurrentHostPin();

  try {
    // 0. Test /api/health
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    const healthData = await healthRes.json();
    assert.equal(healthData.status, 'ok');
    assert.equal(healthData.service, 'ruangpintar-edge-gateway');
    assert.equal(healthData.database, 'connected');
    assert.equal(typeof healthData.uptimeSeconds, 'number');

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

    // 3. Test PIN verification with active generated/configured PIN
    const pinRes = await fetch(`${baseUrl}/api/host/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: activePin }),
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

test('FASE 3: Zod validation rejects missing studentId/moduleId and out-of-range scores with 400 Bad Request', async () => {
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
    // 1. Missing studentId and moduleId on /api/students/sync-submission -> 400 Bad Request
    const emptyProgressRes = await fetch(`${baseUrl}/api/students/sync-submission`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: 80 }),
    });
    assert.equal(emptyProgressRes.status, 400);
    const emptyProgressData = await emptyProgressRes.json();
    assert.equal(emptyProgressData.success, false);
    assert.equal(emptyProgressData.error, 'Validation Error');
    assert.equal(typeof emptyProgressData.details, 'object');
    assert.equal(Array.isArray(emptyProgressData.details.studentId), true);
    assert.equal(Array.isArray(emptyProgressData.details.moduleId), true);

    // 2. Invalid score (> 100) on /api/sync/progress -> 400 Bad Request
    const badScoreRes = await fetch(`${baseUrl}/api/sync/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: 'peer-siswa-05',
        moduleId: 'mod-fisika-mikrohidro',
        score: 150,
        completedChapters: [0, 1],
      }),
    });
    assert.equal(badScoreRes.status, 400);
    const badScoreData = await badScoreRes.json();
    assert.equal(badScoreData.success, false);
    assert.equal(badScoreData.error, 'Validation Error');
    assert.equal(Array.isArray(badScoreData.details.score), true);

    // 3. Valid ProgressSyncSchema payload -> 200 OK
    const validProgressRes = await fetch(`${baseUrl}/api/students/sync-submission`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: 'peer-siswa-05',
        studentName: 'Hendrikus D.',
        moduleId: 'mod-fisika-mikrohidro',
        score: 90,
        completedChapters: ['bab-1', 'bab-2'],
        timestamp: Date.now(),
      }),
    });
    assert.equal(validProgressRes.status, 200);
    const validProgressData = await validProgressRes.json();
    assert.equal(validProgressData.ok, true);
    assert.equal(validProgressData.submission.peerId, 'peer-siswa-05');

    // 4. Empty body on /api/p2p/transfer-step (no silent dummy fallback!) -> 400 Bad Request
    const emptyTransferRes = await fetch(`${baseUrl}/api/p2p/transfer-step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(emptyTransferRes.status, 400);
    const emptyTransferData = await emptyTransferRes.json();
    assert.equal(emptyTransferData.success, false);
    assert.equal(emptyTransferData.error, 'Validation Error');
    assert.equal(Array.isArray(emptyTransferData.details.moduleId), true);
    assert.equal(Array.isArray(emptyTransferData.details.targetPeerId), true);

    // 5. Empty body on /api/p2p/reset-peer (no silent dummy fallback!) -> 400 Bad Request
    const emptyResetRes = await fetch(`${baseUrl}/api/p2p/reset-peer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(emptyResetRes.status, 400);
  } finally {
    server.close();
    closeDatabase();
  }
});

test('FASE 4 & 5: Rate limiter on /change-pin, /export-package, and session token auth', async () => {
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
  const activePin = getCurrentHostPin();

  try {
    // 1. Test POST /api/auth/login with correct PIN -> 200 and session token
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: activePin }),
    });
    assert.equal(loginRes.status, 200);
    const loginData = await loginRes.json();
    assert.equal(loginData.success, true);
    assert.equal(typeof loginData.token, 'string');
    assert.equal(loginData.token.length >= 32, true);
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

    // 3. Test packageTransferLimiter on POST /api/sync/export-package (max 10 requests / 5 min)
    let exportReached429 = false;
    let export429Message = '';
    for (let i = 0; i < 12; i++) {
      const res = await fetch(`${baseUrl}/api/sync/export-package`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validToken}`,
        },
      });
      if (res.status === 429) {
        exportReached429 = true;
        const errBody = await res.json();
        export429Message = errBody.error || '';
        break;
      }
    }
    assert.equal(exportReached429, true);
    assert.equal(
      export429Message,
      'Terlalu banyak permintaan ekspor/impor paket. Silakan coba beberapa saat lagi.'
    );

    // 4. Test pinVerificationLimiter on POST /api/auth/change-pin -> returns 429 Too Many Requests
    let changePinReached429 = false;
    for (let i = 0; i < 20; i++) {
      const res = await fetch(`${baseUrl}/api/auth/change-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validToken}`,
        },
        body: JSON.stringify({
          currentPin: '0000',
          newPin: '123456',
        }),
      });
      if (res.status === 429) {
        changePinReached429 = true;
        break;
      }
    }
    assert.equal(changePinReached429, true);

    // 5. Test POST /api/auth/logout to revoke token
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
    });
    assert.equal(logoutRes.status, 200);

    // 6. Test protected endpoint after token is revoked -> must return 401
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

test('FASE 6: Cache hit deduplication, offline AI queue, exam mode lock, distribute-all, and strict PIN revocation', async () => {
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
  const activePin = getCurrentHostPin();

  try {
    // Login as Teacher Host
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: activePin }),
    });
    const loginData = await loginRes.json();
    const token = loginData.token as string;
    assert.equal(typeof token, 'string');

    // 1. Repeated cache hits must NOT duplicate entries in state.cacheEntries
    const beforeCount = classroomState.getCacheEntries().length;
    for (let i = 0; i < 3; i++) {
      const hitRes = await fetch(`${baseUrl}/api/tutor/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'Bagaimana rumus menghitung daya listrik mikrohidro dari tinggi jatuh air dan debit sungai?',
          moduleId: 'mod-fisika-mikrohidro',
          askedByPeerName: 'Test Deduplikasi',
        }),
      });
      assert.equal(hitRes.status, 200);
    }
    assert.equal(classroomState.getCacheEntries().length, beforeCount);

    // 2. Offline AI synthesis queues pending question & sets originSource = LOCAL_EDGE_SYNTHESIS
    await fetch(`${baseUrl}/api/gateway/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ online: false }),
    });

    const nonce = Math.random().toString(36).slice(2, 8);
    const uniqueOfflineQ = `zxqa${nonce} zxqb${nonce} zxqc${nonce} zxqd${nonce}`;
    const offlineAskRes = await fetch(`${baseUrl}/api/tutor/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: uniqueOfflineQ,
        moduleId: 'mod-fisika-mikrohidro',
        askedByPeerName: 'Siswa Luring',
      }),
    });
    assert.equal(offlineAskRes.status, 200);
    const offlineAskData = await offlineAskRes.json();
    assert.equal(offlineAskData.result.source, 'LOCAL_EDGE_SYNTHESIS');
    const createdEntry = offlineAskData.state.cacheEntries.find(
      (c: { id: string }) => c.id === offlineAskData.result.cacheEntryId
    );
    assert.equal(createdEntry?.originSource, 'LOCAL_EDGE_SYNTHESIS');
    const createdPending = offlineAskData.state.pendingAiQuestions.find(
      (q: { question: string }) => q.question === uniqueOfflineQ
    );
    assert.ok(createdPending);

    // Dismiss the test pending question cleanly & purge synthetic cache entry from DB
    const dismissRes = await fetch(`${baseUrl}/api/tutor/queue/${createdPending.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(dismissRes.status, 200);
    if (createdEntry?.id) {
      const { getDatabase } = await import('./db/index.js');
      getDatabase().prepare('DELETE FROM cache_entries WHERE id = ?').run(createdEntry.id);
    }

    // 3. Exam mode lock via /api/sync/broadcast blocks /api/tutor/ask with 403
    const broadcastOnRes = await fetch(`${baseUrl}/api/sync/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        message: 'Ujian tengah semester dimulai!',
        focusModuleId: 'mod-fisika-mikrohidro',
        examMode: true,
      }),
    });
    assert.equal(broadcastOnRes.status, 200);

    const lockedAskRes = await fetch(`${baseUrl}/api/tutor/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'Tolong bantu jawab soal ujian ini sekarang!',
        moduleId: 'mod-fisika-mikrohidro',
      }),
    });
    assert.equal(lockedAskRes.status, 403);

    // Clear broadcast
    await fetch(`${baseUrl}/api/sync/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message: '', examMode: false, clear: true }),
    });

    // 4. One-click distribute-all endpoint succeeds
    const distRes = await fetch(`${baseUrl}/api/sync/distribute-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ moduleId: 'mod-fisika-mikrohidro' }),
    });
    assert.equal(distRes.status, 200);
    const distData = await distRes.json();
    assert.equal(distData.ok, true);

    // 5. Invalid sneakernet payload on /api/auth/import-package is rejected with 400
    const badImportRes = await fetch(`${baseUrl}/api/auth/import-package`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ invalidField: true }),
    });
    assert.equal(badImportRes.status, 400);

    // 5b. Local zero-quota course discussion board works and teacher can pin posts
    const postDiscRes = await fetch(`${baseUrl}/api/sync/discussions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        moduleId: 'mod-fisika-mikrohidro',
        authorName: 'Hendrikus D.',
        authorRole: 'STUDENT',
        avatar: '🎓',
        message: 'Bagaimana cara menghitung tinggi jatuh efektif pipa pesat?',
      }),
    });
    assert.equal(postDiscRes.status, 201);
    const postDiscData = await postDiscRes.json();
    assert.equal(postDiscData.ok, true);
    assert.equal(postDiscData.post.isPinned, false);

    const pinDiscRes = await fetch(`${baseUrl}/api/sync/discussions/${postDiscData.post.id}/pin`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(pinDiscRes.status, 200);
    const pinDiscData = await pinDiscRes.json();
    assert.equal(pinDiscData.post.isPinned, true);

    const listDiscRes = await fetch(`${baseUrl}/api/sync/discussions?moduleId=mod-fisika-mikrohidro`);
    assert.equal(listDiscRes.status, 200);
    const listDiscData = await listDiscRes.json();
    assert.equal(listDiscData.posts.some((p: { id: string }) => p.id === postDiscData.post.id), true);

    // 5c. Student cryptographic device signature verification & anti-impersonation
    const cryptoNode = await import('crypto');
    const keyPair1 = cryptoNode.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const pubKey1Base64 = keyPair1.publicKey.export({ type: 'spki', format: 'der' }).toString('base64');

    const testStudentId = `peer-siswa-sig-test-${Date.now()}`;
    const testTimestamp = new Date().toISOString();
    const payloadString = `${testStudentId}:mod-fisika-mikrohidro:95:${testTimestamp}`;

    const signer = cryptoNode.createSign('SHA256');
    signer.update(payloadString);
    signer.end();
    const validSignature = signer.sign(keyPair1.privateKey).toString('base64');

    // 1. First submission registers keyPair1 for testStudentId -> 200 OK
    const signedSubRes = await fetch(`${baseUrl}/api/students/sync-submission`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: testStudentId,
        moduleId: 'mod-fisika-mikrohidro',
        score: 95,
        timestamp: testTimestamp,
        clientSignature: validSignature,
        clientPublicKey: pubKey1Base64,
        studentName: 'Siswa Terverifikasi',
      }),
    });
    assert.equal(signedSubRes.status, 200);

    // 2. An attacker generates keyPair2 and tries to submit as testStudentId -> 403 Forbidden
    const keyPair2 = cryptoNode.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const pubKey2Base64 = keyPair2.publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
    const attackerSigner = cryptoNode.createSign('SHA256');
    attackerSigner.update(payloadString);
    attackerSigner.end();
    const attackerSignature = attackerSigner.sign(keyPair2.privateKey).toString('base64');

    const impersonateRes = await fetch(`${baseUrl}/api/students/sync-submission`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: testStudentId,
        moduleId: 'mod-fisika-mikrohidro',
        score: 100,
        timestamp: testTimestamp,
        clientSignature: attackerSignature,
        clientPublicKey: pubKey2Base64,
        studentName: 'Attacker Impersonator',
      }),
    });
    assert.equal(impersonateRes.status, 403);
    const impersonateData = await impersonateRes.json();
    assert.equal(impersonateData.error.includes('pemalsuan identitas'), true);

    // 5d. Online non-blocking SQLite database backup
    const { backupDatabase } = await import('./db/index.js');
    const backupResult = await backupDatabase();
    assert.equal(typeof backupResult, 'string');
    assert.equal(backupResult.endsWith('.backup'), true);
    const fsNode = await import('fs');
    assert.equal(fsNode.existsSync(backupResult), true);

    // 6. Changing PIN revokes old config.hostPin in verifyPinTimingSafe
    const { HostConfigRepository } = await import('./db/index.js');
    const prevDbPin = HostConfigRepository.get('host_pin', config.hostPin);
    try {
      HostConfigRepository.set('host_pin', '889977');
      assert.equal(verifyPinTimingSafe('889977'), true);
      if (config.hostPin !== '889977') {
        assert.equal(verifyPinTimingSafe(config.hostPin), false);
      }
    } finally {
      HostConfigRepository.set('host_pin', prevDbPin);
    }
  } finally {
    server.close();
    closeDatabase();
  }
});

test('FASE 7: Full CRUD APIs, scrypt PIN hashing, session check, enriched health, backup, and WS state:delta', async () => {
  const { HostConfigRepository } = await import('./db/index.js');
  const { isScryptHash } = await import('./middleware/authMiddleware.js');

  const server = http.createServer();
  new WebSocketHandler(server);
  const app = await createApp(server, { skipVite: true });
  server.on('request', app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const addr = server.address();
  assert.ok(addr && typeof addr === 'object');
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  const wsUrl = `ws://127.0.0.1:${addr.port}/ws`;

  const prevDbPin = HostConfigRepository.get('host_pin', config.hostPin);

  try {
    // 1. Enriched /api/health + X-Request-Id observability header
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    assert.ok(healthRes.headers.get('x-request-id'));
    const healthData = await healthRes.json();
    assert.equal(healthData.status, 'ok');
    assert.equal(healthData.sqliteIntegrity, 'ok');
    assert.equal(typeof healthData.connectedWsClients, 'number');
    assert.equal(typeof healthData.modulesCount, 'number');
    assert.equal(typeof healthData.pendingAiQueueCount, 'number');

    // 2. Auth login + GET /api/auth/session
    const activePin = getCurrentHostPin();
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: activePin }),
    });
    assert.equal(loginRes.status, 200);
    const { token } = (await loginRes.json()) as { token: string };
    assert.ok(token);

    const validSessionRes = await fetch(`${baseUrl}/api/auth/session`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(validSessionRes.status, 200);
    const validSessionData = await validSessionRes.json();
    assert.equal(validSessionData.ok, true);
    assert.equal(validSessionData.valid, true);

    const invalidSessionRes = await fetch(`${baseUrl}/api/auth/session`, {
      headers: { Authorization: 'Bearer invalid-session-token-xyz' },
    });
    assert.equal(invalidSessionRes.status, 401);

    // 3. Full Module CRUD (POST -> PUT -> DELETE)
    const createModRes = await fetch(`${baseUrl}/api/modules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: 'Modul Uji CRUD Energi Angin Pesisir',
        subject: 'Teknik Energi',
        gradeLevel: 'Kelas XI SMA / SMK',
        summary: 'Ringkasan uji CRUD penuh untuk turbin angin pesisir 3T.',
        sectionHeading: '01. Dasar Aerodinamika Turbin',
        sectionBody: 'Energi kinetik angin dikonversi oleh bilah rotor menjadi energi mekanik dan listrik.',
        formula: 'P = 0.5 * rho * A * v^3 * Cp',
        keyTakeaway: 'Kecepatan angin berpangkat tiga terhadap daya keluaran turbin.',
        sizeMB: 18,
      }),
    });
    assert.equal(createModRes.status, 201);
    const createdMod = (await createModRes.json()).module;
    assert.ok(createdMod?.id);

    const updateModRes = await fetch(`${baseUrl}/api/modules/${createdMod.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: 'Modul Uji CRUD Energi Angin Pesisir (Revisi 2)',
        sizeMB: 22,
      }),
    });
    assert.equal(updateModRes.status, 200);
    const updatedMod = (await updateModRes.json()).module;
    assert.equal(updatedMod.title, 'Modul Uji CRUD Energi Angin Pesisir (Revisi 2)');
    assert.equal(updatedMod.sizeMB, 22);

    const deleteModRes = await fetch(`${baseUrl}/api/modules/${createdMod.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(deleteModRes.status, 200);
    const deleteModData = await deleteModRes.json();
    assert.equal(deleteModData.ok, true);

    // 4. Full Cache CRUD (POST -> PUT -> DELETE)
    const seedCacheRes = await fetch(`${baseUrl}/api/cache/seed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        moduleId: 'mod-fisika-mikrohidro',
        questionCanonical: 'Apa fungsi utama katup pengaman pada pipa pesat mikrohidro?',
        answerMarkdown: 'Katup pengaman digunakan untuk menghentikan aliran air cepat saat pemeliharaan turbin.',
      }),
    });
    assert.equal(seedCacheRes.status, 201);
    const createdCache = (await seedCacheRes.json()).entry;
    assert.ok(createdCache?.id);

    const updateCacheRes = await fetch(`${baseUrl}/api/cache/${createdCache.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        questionCanonical: 'Apa fungsi katup pengaman pada penstock PLTMH?',
        answerMarkdown: 'Katup pengaman (main inlet valve) melindungi turbin dari lonjakan tekanan air (water hammer).',
      }),
    });
    assert.equal(updateCacheRes.status, 200);

    const deleteCacheRes = await fetch(`${baseUrl}/api/cache/${createdCache.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(deleteCacheRes.status, 200);

    // 5. Discussion creation & Teacher deletion
    const createDiscRes = await fetch(`${baseUrl}/api/sync/discussions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        moduleId: 'mod-fisika-mikrohidro',
        authorName: 'Uji Forum',
        authorRole: 'STUDENT',
        message: 'Pesan uji forum yang akan dimoderasi guru.',
      }),
    });
    assert.equal(createDiscRes.status, 201);
    const createdPost = (await createDiscRes.json()).post;
    assert.ok(createdPost?.id);

    const delDiscRes = await fetch(`${baseUrl}/api/sync/discussions/${createdPost.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(delDiscRes.status, 200);

    // 6. Submission creation, Teacher score update & deletion
    const createSubRes = await fetch(`${baseUrl}/api/students/sync-submission`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: 'peer-crud-test',
        studentName: 'Siswa Uji CRUD',
        moduleId: 'mod-fisika-mikrohidro',
        moduleTitle: 'Fisika Terapan: Mikrohidro',
        score: 88,
        quizScore: 2,
        totalQuestions: 2,
        passed: true,
        simulationCompleted: true,
      }),
    });
    assert.equal(createSubRes.status, 200);
    const createdSub = (await createSubRes.json()).submission;
    assert.ok(createdSub?.id);

    const updateSubRes = await fetch(`${baseUrl}/api/sync/submissions/${createdSub.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ quizScore: 1, totalQuestions: 2, simulationCompleted: true }),
    });
    assert.equal(updateSubRes.status, 200);

    const delSubRes = await fetch(`${baseUrl}/api/sync/submissions/${createdSub.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(delSubRes.status, 200);

    // 7. Manual SQLite Backup Endpoint
    const backupRes = await fetch(`${baseUrl}/api/host/backup`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(backupRes.status, 200);
    const backupData = await backupRes.json();
    assert.equal(backupData.ok, true);
    assert.ok(backupData.backedUpAt);
    assert.ok(backupData.backupFile);

    // 8. WebSocket receives lightweight state:delta frame on classroom broadcast
    const deltaPromise = new Promise<Record<string, unknown>>((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Timed out waiting for state:delta over WebSocket'));
      }, 4000);

      ws.on('message', (raw) => {
        try {
          const parsed = JSON.parse(raw.toString()) as Record<string, unknown>;
          if (parsed.type === 'state:delta' && parsed.topic === 'broadcast') {
            clearTimeout(timeout);
            ws.close();
            resolve(parsed);
          }
        } catch {
          // ignore
        }
      });

      ws.on('open', async () => {
        await fetch(`${baseUrl}/api/sync/broadcast`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: 'Uji siaran delta real-time',
            examMode: false,
          }),
        });
      });

      ws.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    const deltaEvent = await deltaPromise;
    assert.equal(deltaEvent.type, 'state:delta');
    assert.equal(deltaEvent.topic, 'broadcast');

    // Clear test broadcast
    await fetch(`${baseUrl}/api/sync/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message: '', examMode: false, clear: true }),
    });

    // 9. AuthController.changePin hashes with scrypt and verifies timing-safely
    // (invoked directly because Test #5 intentionally exhausts changePinLimiter on 127.0.0.1)
    const { AuthController } = await import('./controllers/auth.controller.js');
    let changePinStatus = 200;
    let changePinBody: Record<string, unknown> = {};
    const mockReq = {
      body: { currentPin: activePin, newPin: '918273' },
      header: (name: string) =>
        name.toLowerCase() === 'authorization' ? `Bearer ${token}` : undefined,
      headers: { authorization: `Bearer ${token}` },
    } as unknown as import('express').Request;
    const mockRes = {
      status(code: number) {
        changePinStatus = code;
        return this;
      },
      json(payload: Record<string, unknown>) {
        changePinBody = payload;
        return this;
      },
    } as unknown as import('express').Response;

    AuthController.changePin(mockReq, mockRes);
    assert.equal(changePinStatus, 200);
    assert.equal(changePinBody.ok, true);

    const storedAfterChange = HostConfigRepository.get('host_pin', '');
    assert.equal(isScryptHash(storedAfterChange), true);
    assert.equal(verifyPinTimingSafe('918273'), true);
    assert.equal(verifyPinTimingSafe('000000'), false);

    // Caller's session remains valid after PIN rotation
    const postRotateSessionRes = await fetch(`${baseUrl}/api/auth/session`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(postRotateSessionRes.status, 200);
  } finally {
    HostConfigRepository.set('host_pin', prevDbPin);
    server.close();
    closeDatabase();
  }
});

