import './env';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { groupBy, unique } from '../src/lib/collections';
import { meanOrNull } from '../src/lib/score';
import { isCalendarDate } from '../src/lib/time';
import { adaptQuestion } from '../src/services/agents/adaptation.rules';
import { buildProfile } from '../src/services/agents/pedagogical.rules';
import { planVersions } from '../src/services/adaptations/version-planner';
import type { NeedId, Question, Student } from '../src/types/domain';

const label = (id: NeedId) => id.toUpperCase();
const question: Question = { id: 'q', subtopicId: 't', statement: 'Calcule 2. Explique.', points: 1, source: 'banco' };
const student = (id: string, declaredNeeds: NeedId[]): Student => ({ id, name: `${id} Silva`, classId: 'c', declaredNeeds });

describe('funções puras', () => {
  it('agrupa preservando a ordem e projetando valores', () => {
    assert.deepEqual([...groupBy([1, 2, 3], (n) => n % 2).entries()], [[1, [1, 3]], [0, [2]]]);
    assert.deepEqual(groupBy(['a'], (s) => s, (s) => s.length).get('a'), [1]);
    assert.deepEqual(unique([1, 1, 2]), [1, 2]);
  });

  it('não converte ausência de nota em zero', () => {
    assert.equal(meanOrNull([null, null]), null);
    assert.equal(meanOrNull([null, 50, 70]), 60);
  });

  it('valida datas reais do calendário', () => {
    assert.equal(isCalendarDate('2026-02-28'), true);
    assert.equal(isCalendarDate('2026-02-31'), false);
    assert.equal(isCalendarDate('28/02/2026'), false);
  });

  it('planeja versões simples e combinadas sem tocar no banco', () => {
    const versions = planVersions([student('a', ['tdah', 'tea']), student('b', ['tea']), student('c', [])], ['tea', 'tdah'], label);
    assert.deepEqual(versions.map((v) => [v.id, v.studentIds]), [['v-tea', ['b']], ['v-tdah', []], ['v-tdah+tea', ['a']]]);
    assert.equal(versions[2].label, 'Combinada: TDAH + TEA');
  });

  it('prioriza a adaptação escrita à mão e combina necessidades', () => {
    assert.equal(adaptQuestion(question, ['daltonismo'], label), null);
    assert.equal(adaptQuestion(question, ['dislexia'], label)?.text, 'Calcule 2.\n\nExplique.');
    assert.match(adaptQuestion(question, ['tdah', 'dislexia'], label)?.why ?? '', /^Versão única que atende TDAH e DISLEXIA/);
    const authored = { ...question, authored: { tea: { text: 'Autoral', why: 'x' } } };
    assert.equal(adaptQuestion(authored, ['tea'], label)?.text, 'Autoral');
    assert.equal(adaptQuestion(authored, ['tdah'], label), null);
  });

  it('só atribui leitura de necessidade a quem a declarou', () => {
    const subtopic = { id: 'novo', subjectId: 's', name: 'Novo', short: 'N' };
    const inputs = [{ subtopic, value: 40, previous: 30 }];
    assert.deepEqual(buildProfile(student('a', []), inputs).gaps[0].reading, { kind: 'tecnica' });
    assert.deepEqual(buildProfile(student('a', ['tea']), inputs).gaps[0].reading, { kind: 'necessidade', needId: 'tea' });
    assert.equal(buildProfile(student('a', []), inputs).delta, 10);
  });
});
