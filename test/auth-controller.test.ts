import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthController } from '../src/auth/auth.controller';
import type { AuthService } from '../src/auth/auth.service';

test('login troca a sessão e expõe apenas os dados públicos da conta', async () => {
  let loggedOutToken: string | undefined;
  let cookie: { name: string; value: string; options: Record<string, unknown> } | undefined;
  const user = { id: 'user-1', email: 'pessoa@exemplo.com', displayName: 'Pessoa', createdAt: 'created', updatedAt: 'updated' };
  const space = { id: 'space-1', ownerUserId: user.id, name: 'Meu espaço', createdAt: 'created' };
  const auth = {
    async login() { return { token: 'new-session-token', user, space }; },
    async logout(token?: string) { loggedOutToken = token; },
  } as unknown as AuthService;
  const response = {
    cookie(name: string, value: string, options: Record<string, unknown>) {
      cookie = { name, value, options };
      return response;
    },
  } as unknown as Response;
  const request = { cookies: { taskando_session: 'old-session-token' } } as unknown as Request;

  const result = await new AuthController(auth).passwordLogin({ email: user.email, password: 'oito-123' }, request, response);

  assert.equal(loggedOutToken, 'old-session-token');
  assert.deepEqual(cookie, {
    name: 'taskando_session',
    value: 'new-session-token',
    options: { httpOnly: true, secure: false, sameSite: 'lax', path: '/', maxAge: 604_800_000 },
  });
  assert.deepEqual(result, { user: { id: user.id, displayName: user.displayName, email: user.email }, space });
  assert.equal('token' in result, false);
});

test('criação de usuário exige uma sessão existente', async () => {
  let createCalled = false;
  const auth = {
    async context() { return null; },
    async createUser() { createCalled = true; },
  } as unknown as AuthService;
  const request = { cookies: {} } as unknown as Request;

  await assert.rejects(
    () => new AuthController(auth).createUser({ displayName: 'Pessoa', email: 'pessoa@exemplo.com', password: 'oito-123' }, request),
    UnauthorizedException,
  );
  assert.equal(createCalled, false);
});

test('usuário autenticado cria outra conta sem receber seu hash', async () => {
  const created = { id: 'user-2', email: 'nova@exemplo.com', displayName: 'Nova Pessoa', createdAt: 'created', updatedAt: 'updated' };
  const auth = {
    async context() { return { user: { id: 'user-1' } }; },
    async createUser() { return { user: created, space: { id: 'space-2' } }; },
  } as unknown as AuthService;
  const request = { cookies: { taskando_session: 'valid-session' } } as unknown as Request;

  const result = await new AuthController(auth).createUser({ displayName: created.displayName, email: created.email, password: 'oito-123' }, request);

  assert.deepEqual(result, { user: { id: created.id, displayName: created.displayName, email: created.email } });
});

test('troca de senha usa o usuário e a sessão autenticados', async () => {
  let received: unknown[] = [];
  const auth = {
    async context() { return { user: { id: 'user-1' } }; },
    async changePassword(...args: unknown[]) { received = args; },
  } as unknown as AuthService;
  const request = { cookies: { taskando_session: 'valid-session' } } as unknown as Request;
  const body = { currentPassword: 'oito-123', newPassword: 'nova-123' };

  const result = await new AuthController(auth).changePassword(body, request);

  assert.deepEqual(received, ['user-1', 'valid-session', body]);
  assert.deepEqual(result, { ok: true });
});
