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

test('sorties de l\'agenda prévues : gardées 30 jours après le jour prévu (Tu y es allée ?), puis effacées', async () => {
  const { cleanPlans, planOfEvent } = await import('../js/planning.js');
  const t = new Date(2026, 10, 17, 10).getTime();
  const ok = { id: 'a1', name: ' Concert ', lat: 48.88, lng: 2.33, ticket: { at: new Date(2026, 10, 17, 20).getTime() }, place: 'Square', url: 'https://quefaire.paris.fr/x' };
  const list = cleanPlans([
    ok,
    { ...ok, id: 'a1' }, // doublon
    { ...ok, id: 'hier', ticket: { at: new Date(2026, 10, 16, 20).getTime() } },
    { ...ok, id: 'vieux', ticket: { at: new Date(2026, 9, 10, 20).getTime() } }, // plus de 30 jours
    { ...ok, id: 'loin', lat: 45 },
    { ...ok, id: 'url', url: 'javascript:alert(1)' },
    { ...ok, id: 'sans', ticket: null },
  ], t);
  assert.deepEqual(list.map((x) => x.id), ['a1', 'hier', 'url']);
  assert.equal(list[0].name, 'Concert');
  assert.equal(list[0].plan, true);
  assert.equal(list[2].url, undefined, 'lien non https écarté');
  assert.equal(planOfEvent(list, { title: 'Concert', lat: 48.88, lng: 2.33 }, new Date(t))?.id, 'a1');
  assert.equal(planOfEvent([list[1]], { title: 'Concert', lat: 48.88, lng: 2.33 }, new Date(t)), null, 'une sortie passée ne dit plus « Prévu »');
  assert.equal(planOfEvent(list, { title: 'Concert', lat: 48.89, lng: 2.33 }), null);
});

test('sorties de l\'agenda : rangées, sauvegardées et restaurées à part de mes lieux', async () => {
  const { loadState, saveState, exportJSON, mergeImport } = await import('../js/store.js');
  const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };
  const at = Date.now() + 864e5;
  const st = mem();
  const s0 = loadState(st);
  assert.deepEqual(s0.plans, []);
  s0.plans = [{ id: 'p1', name: 'Concert', lat: 48.88, lng: 2.33, ticket: { at, part: 'soir' } }];
  saveState(st, s0);
  const s1 = loadState(st);
  assert.equal(s1.plans.length, 1);
  assert.equal(s1.points.length, 0, 'pas de lieu sur la carte');
  const file = exportJSON(s1);
  const empty = loadState(mem());
  assert.equal(mergeImport(empty, file).state.plans.length, 1, 'ma sauvegarde rend mes sorties prévues');
  assert.equal(mergeImport(empty, file, 'Léa').state.plans.length, 0, 'celles d\'un proche restent les siennes');
});

test('carnet de sorties (v158) : une sortie de l\'agenda où je suis allé, gardée et sauvegardée', async () => {
  const { cleanOutings, outingOf } = await import('../js/planning.js');
  const { loadState, saveState, exportJSON, mergeImport } = await import('../js/store.js');
  const plan = { id: 'p1', name: 'Hockney 25', lat: 48.87, lng: 2.26, plan: true, ticket: { at: new Date(2026, 10, 16, 15).getTime(), part: 'aprem', with: 'Léa' }, place: 'Fondation Louis Vuitton', url: 'https://quefaire.paris.fr/x' };
  const o = outingOf(plan);
  assert.deepEqual(o, { id: 'p1', at: plan.ticket.at, name: 'Hockney 25', lat: 48.87, lng: 2.26, place: 'Fondation Louis Vuitton', url: 'https://quefaire.paris.fr/x' });
  const list = cleanOutings([{ ...o, text: ' Les arbres en grand ', stars: 5, photo: 'ph-1' }, { ...o }, { ...o, id: 'x', stars: 9, photo: '../x', lat: 45 }]);
  assert.equal(list.length, 1);
  assert.equal(list[0].text, 'Les arbres en grand');
  const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };
  const st = mem();
  const s0 = loadState(st);
  assert.deepEqual([s0.outings, s0.artists], [[], []]);
  s0.outings = list; s0.artists = ['Hockney', 'hockney', 'JR'];
  saveState(st, s0);
  const s1 = loadState(st);
  assert.deepEqual(s1.artists, ['Hockney', 'JR']);
  assert.equal(s1.outings[0].stars, 5);
  const file = exportJSON(s1);
  const back = mergeImport(loadState(mem()), file).state;
  assert.deepEqual([back.outings.length, back.artists.length], [1, 2], 'ma sauvegarde rend mon carnet et mes artistes');
  const friend = mergeImport(loadState(mem()), file, 'Léa').state;
  assert.deepEqual([friend.outings.length, friend.artists.length], [0, 0], 'ceux d\'un proche restent les siens');
  assert.ok(!('outings' in JSON.parse(exportJSON(loadState(mem())))), 'rien d\'écrit quand le carnet est vide');
});
