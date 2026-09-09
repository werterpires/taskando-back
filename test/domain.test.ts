import assert from 'node:assert/strict';
import test from 'node:test';
import { isDateMarkerReleased, isEventReleased, taskTypeError } from '../src/db/task-types';
import { resolveCyclicReleasedLevel } from '../src/db/cyclic-gate';
import { validateAttachment } from '../src/db/hierarchy';

test('hierarquia preserva pais obrigatórios e anexação livre para cima', () => {
  assert.match(validateAttachment('front', 'front', null, null)!, /exige um pai/);
  assert.match(validateAttachment('phase', 'phase', 'project', 'project')!, /Fase só pode/);
  assert.equal(validateAttachment('task', 'task', 'organization', 'organization'), null);
  assert.equal(validateAttachment('product', 'product', null, null), null);
});

test('marco e evento liberam dependências somente na data definida', () => {
  const now = new Date('2026-09-09T12:00:00.000Z');
  assert.equal(isDateMarkerReleased('2026-09-09', now), true);
  assert.equal(isDateMarkerReleased('2026-09-10', now), false);
  assert.equal(isEventReleased('2026-09-09T11:59:59.000Z', now), true);
  assert.equal(isEventReleased('2026-09-09T12:00:01.000Z', now), false);
});

test('tipos recorrentes não podem ser anexados a processo ou fase', () => {
  assert.match(taskTypeError('recurring', 'process')!, /não pode entrar/);
  assert.match(taskTypeError('scheduled', 'phase')!, /não pode entrar/);
  assert.equal(taskTypeError('simple', 'phase'), null);
});

test('fila cíclica progride por relevância', () => {
  assert.equal(resolveCyclicReleasedLevel(5, [5, 3]), 5);
  assert.equal(resolveCyclicReleasedLevel(4, [5, 3]), 3);
  assert.equal(resolveCyclicReleasedLevel(2, [5, 3]), 5);
});
