import assert from 'node:assert/strict';
import test from 'node:test';
import { hashPassword, isValidDisplayName, isValidEmail, isValidPassword, normalizeEmail, verifyPassword } from '../src/auth/password';

test('normaliza e valida os dados usados no login', () => {
  assert.equal(normalizeEmail('  Pessoa@Exemplo.COM '), 'pessoa@exemplo.com');
  assert.equal(isValidEmail('pessoa@exemplo.com'), true);
  assert.equal(isValidEmail('pessoa@localhost'), false);
  assert.equal(isValidDisplayName('Pessoa Exemplo'), true);
  assert.equal(isValidDisplayName('P'), false);
  assert.equal(isValidPassword('oito-123'), true);
  assert.equal(isValidPassword('curta'), false);
});

test('hash de senha usa salt e só aceita a senha correta', async () => {
  const first = await hashPassword('uma senha segura');
  const second = await hashPassword('uma senha segura');
  assert.notEqual(first, second);
  assert.equal(await verifyPassword('uma senha segura', first), true);
  assert.equal(await verifyPassword('senha incorreta', first), false);
  assert.equal(await verifyPassword('uma senha segura', 'hash-invalido'), false);
});
