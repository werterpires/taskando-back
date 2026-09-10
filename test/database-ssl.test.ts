import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { databaseSslOptions } from '../src/db/ssl';

test('conexão local não configura SSL sem caminho de CA', () => {
  assert.equal(databaseSslOptions({}), undefined);
  assert.equal(databaseSslOptions({ caPath: '   ' }), undefined);
});

test('conexão de produção lê a identidade mTLS e valida o servidor', () => {
  const directory = mkdtempSync(join(tmpdir(), 'taskando-ca-'));
  const caPath = join(directory, 'ca-certificate.crt');
  const certificatePath = join(directory, 'client-certificate.crt');
  const privateKeyPath = join(directory, 'private-key.key');
  try {
    writeFileSync(caPath, 'CA DE TESTE');
    writeFileSync(certificatePath, 'CERTIFICADO DE TESTE');
    writeFileSync(privateKeyPath, 'CHAVE DE TESTE');
    assert.deepEqual(databaseSslOptions({ caPath, certificatePath, privateKeyPath }), {
      ca: 'CA DE TESTE', cert: 'CERTIFICADO DE TESTE', key: 'CHAVE DE TESTE', rejectUnauthorized: true,
    });
  } finally {
    rmSync(directory, { recursive: true });
  }
});

test('configuração incompleta de certificado do cliente é rejeitada', () => {
  assert.throws(() => databaseSslOptions({ certificatePath: 'client.crt', privateKeyPath: 'client.key' }), /SSL_CA_PATH/);
  assert.throws(() => databaseSslOptions({ caPath: 'ca.crt', certificatePath: 'client.crt' }), /configurados juntos/);
});
