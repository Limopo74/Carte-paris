import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DAY_MAX, isDayList, dayTicket, dayList, staleDayList, rankDayList, moveInList, planText, planClock, planEnd, pastPlans, cleanPlan, planAt } from '../js/planning.js';
import { ticketToday } from '../js/art.js';

// Mardi 17 novembre 2026, 10 h
const now = new Date(2026, 10, 17, 10, 0);
const hier = new Date(2026, 10, 16, 10, 0);

test('liste du jour : un billet sans heure ni moment, aujourd\'hui à midi, avec son rang', () => {
  const t = dayTicket(2, now);
  assert.deepEqual(t, { at: new Date(2026, 10, 17, 12).getTime(), list: 2 });
  assert.equal(isDayList(t), true);
  assert.equal(isDayList({ at: t.at }), false, 'une heure précise n\'est pas la liste du jour');
  assert.equal(isDayList({ at: t.at, part: 'soir' }), false);
  assert.equal(isDayList({ at: t.at, list: 0 }), false);
  assert.equal(isDayList(null), false);
  assert.deepEqual(dayTicket(1, now, 'Léa'), { at: t.at, list: 1, with: 'Léa' });
  assert.equal(DAY_MAX, 8);
});

test('liste du jour : seulement les lieux d\'aujourd\'hui, dans mon ordre', () => {
  const pts = [
    { id: 'c', ticket: dayTicket(3, now) },
    { id: 'a', ticket: dayTicket(1, now) },
    { id: 'h', ticket: dayTicket(1, hier) },
    { id: 'm', ticket: { at: planAt(now, 'matin'), part: 'matin' } },
    { id: 't', ticket: { at: planAt(now, null, 15, 0) } },
    { id: 'b', ticket: dayTicket(2, now) },
    { id: 'x' },
  ];
  assert.deepEqual(dayList(pts, now).map((p) => p.id), ['a', 'b', 'c']);
  assert.deepEqual(staleDayList(pts, now).map((p) => p.id), ['h'], 'la liste d\'hier s\'efface, pas les sorties prévues');
});

test('liste du jour : le lendemain, pas de « Tu y es allé ? » ; les sorties prévues gardent la question', () => {
  const pts = [
    { name: 'Liste d\'hier', ticket: dayTicket(1, hier) },
    { name: 'Sortie d\'hier', ticket: { at: planAt(hier, 'aprem'), part: 'aprem' } },
  ];
  assert.deepEqual(pastPlans(pts, now).map((p) => p.name), ['Sortie d\'hier']);
});

test('liste du jour : jamais d\'heure inventée (ni « à 12h », ni « Pars à »)', () => {
  const t = dayTicket(1, now);
  assert.equal(planText(t, now), 'aujourd\'hui');
  assert.equal(planText(dayTicket(1, hier), now), 'hier');
  assert.equal(planClock(t), '');
  assert.equal(planEnd(t), new Date(2026, 10, 18).getTime(), 'elle vaut jusqu\'à minuit');
  const pts = [{ name: 'Liste', ticket: t }];
  assert.equal(ticketToday(pts, now), null, '« Maintenant » ne rappelle pas la liste du jour');
  const avecSortie = [...pts, { name: 'Sortie', ticket: { at: planAt(now, null, 15, 0) } }];
  assert.equal(ticketToday(avecSortie, now).name, 'Sortie');
});

test('liste du jour : le rang est gardé par la sauvegarde, jamais avec un moment', () => {
  assert.deepEqual(cleanPlan({ at: 5, list: 3, junk: 1 }), { at: 5, list: 3 });
  assert.deepEqual(cleanPlan({ at: 5, list: 3, part: 'soir' }), { at: 5, part: 'soir' });
  assert.deepEqual(cleanPlan({ at: 5, list: 'un' }), { at: 5 });
  assert.deepEqual(cleanPlan({ at: 5, list: 2, with: ' Tom ' }), { at: 5, with: 'Tom', list: 2 });
});

test('liste du jour : ranger et déplacer d\'un cran', () => {
  const l = [{ id: 'a', ticket: dayTicket(5, now) }, { id: 'b', ticket: dayTicket(7, now) }, { id: 'c', ticket: dayTicket(9, now) }];
  assert.deepEqual(rankDayList(l).map((p) => p.ticket.list), [1, 2, 3]);
  assert.deepEqual(moveInList(l, 'c', -1).map((p) => p.id), ['a', 'c', 'b']);
  assert.deepEqual(moveInList(l, 'a', 1).map((p) => p.id), ['b', 'a', 'c']);
  assert.deepEqual(moveInList(l, 'a', -1).map((p) => p.id), ['a', 'b', 'c'], 'le premier ne monte pas');
  assert.deepEqual(moveInList(l, 'c', 1).map((p) => p.id), ['a', 'b', 'c'], 'le dernier ne descend pas');
  assert.deepEqual(moveInList(l, 'zz', 1).map((p) => p.id), ['a', 'b', 'c']);
  assert.deepEqual(l.map((p) => p.id), ['a', 'b', 'c'], 'la liste donnée ne change pas');
});
