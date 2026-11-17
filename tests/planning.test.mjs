import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PARTS, dayChoices, planAt, planText, planClock, planEnd, planTimes, pastPlans, cleanPlan, daysFrom } from '../js/planning.js';
import { placeLink, readPlaceLink } from '../js/explore.js';

// mardi 17 novembre 2026, 10 h
const now = new Date(2026, 10, 17, 10);

test('jours proposés : aujourd\'hui, demain, samedi et dimanche qui viennent', () => {
  assert.deepEqual(dayChoices(now).map((d) => d.label), ['Aujourd\'hui', 'Demain', 'Samedi 21', 'Dimanche 22']);
  // vendredi : samedi = demain, pas de doublon
  assert.deepEqual(dayChoices(new Date(2026, 10, 20, 9)).map((d) => d.label), ['Aujourd\'hui', 'Demain', 'Dimanche 22']);
  // samedi : dimanche = demain ; le samedi suivant passe par « Autre jour »
  assert.deepEqual(dayChoices(new Date(2026, 10, 21, 9)).map((d) => d.label), ['Aujourd\'hui', 'Demain']);
  // dimanche : samedi qui vient dans 6 jours
  assert.deepEqual(dayChoices(new Date(2026, 10, 22, 23, 30)).map((d) => d.label), ['Aujourd\'hui', 'Demain', 'Samedi 28']);
  // fin de mois
  assert.deepEqual(dayChoices(new Date(2026, 10, 30, 9)).map((d) => d.label), ['Aujourd\'hui', 'Demain', 'Samedi 5', 'Dimanche 6']);
});

test('moment de la sortie et texte', () => {
  const sam = dayChoices(now)[2].date;
  const at = planAt(sam, 'aprem');
  assert.equal(new Date(at).getHours(), 14);
  assert.equal(planText({ at, part: 'aprem' }, now), 'samedi 21 nov. après-midi');
  assert.equal(planText({ at: planAt(now, 'soir'), part: 'soir' }, now), 'ce soir');
  assert.equal(planText({ at: planAt(dayChoices(now)[1].date, 'matin'), part: 'matin' }, now), 'demain matin');
  assert.equal(planText({ at: planAt(now, null, 15, 30) }, now), 'aujourd\'hui à 15h30');
  assert.equal(planText({ at: new Date(2026, 10, 16, 19).getTime(), part: 'soir' }, now), 'hier soir');
  assert.equal(planText(null, now), '');
  assert.equal(planClock({ at: planAt(now, 'midi'), part: 'midi' }), 'Midi');
  assert.equal(planClock({ at: planAt(now, null, 9, 5) }), '9h05');
});

test('fin et heures à vérifier : heure précise + 30 min, ou la fin du moment', () => {
  const at = planAt(now, null, 15, 0);
  assert.equal(planEnd({ at }) - at, 30 * 60000);
  const t = { at: planAt(now, 'matin'), part: 'matin' };
  assert.equal(new Date(planEnd(t)).getHours(), 12);
  assert.deepEqual(planTimes(t).map((d) => d.getHours() * 60 + d.getMinutes()), [540, 570, 600, 630, 660, 690]);
  assert.equal(planTimes({ at }).length, 1);
  for (const k of Object.keys(PARTS)) assert.ok(PARTS[k].to > PARTS[k].from);
});

test('sorties passées à confirmer : avant aujourd\'hui, 30 jours au plus, pas celles des proches', () => {
  const pts = [
    { name: 'Hier', ticket: { at: new Date(2026, 10, 16, 15).getTime() } },
    { name: 'Ce matin', ticket: { at: new Date(2026, 10, 17, 9).getTime() } },
    { name: 'Il y a 10 jours', ticket: { at: new Date(2026, 10, 7, 15).getTime() } },
    { name: 'Trop vieux', ticket: { at: new Date(2026, 9, 1, 15).getTime() } },
    { name: 'De Léa', owner: 'Léa', ticket: { at: new Date(2026, 10, 16, 15).getTime() } },
    { name: 'Sans sortie' },
  ];
  assert.deepEqual(pastPlans(pts, now).map((p) => p.name), ['Hier', 'Il y a 10 jours']);
  assert.equal(daysFrom(pts[0].ticket.at, now), -1);
});

test('sortie gardée si lisible ; moment inconnu écarté', () => {
  assert.deepEqual(cleanPlan({ at: 5, part: 'soir', with: '  Léa ', junk: 1 }), { at: 5, with: 'Léa', part: 'soir' });
  assert.deepEqual(cleanPlan({ at: 5, part: 'nuit' }), { at: 5 });
  assert.equal(cleanPlan({ at: 'demain' }), null);
  assert.equal(cleanPlan(undefined), null);
});

test('invitation : le moment de la journée voyage avec le lien', () => {
  const at = planAt(dayChoices(new Date())[1].date, 'soir');
  const link = placeLink('https://x/#', { name: 'Orsay', lat: 48.86, lng: 2.33, ticket: { at, part: 'soir' } }, '', '', { invite: 'Anne' });
  const r = readPlaceLink(link.split('#')[1]);
  assert.equal(r.ticketAt, at);
  assert.equal(r.ticketPart, 'soir');
  const r2 = readPlaceLink(placeLink('https://x/', { name: 'Orsay', lat: 48.86, lng: 2.33, ticket: { at } }, '', '', { invite: true }).split('#')[1]);
  assert.equal(r2.ticketPart, '');
});
