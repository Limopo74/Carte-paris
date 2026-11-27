// v543 (mon choix A du 27 nov. 2026) : « Prévoir un autre jour » dans Mon planning (« Où ? » d'abord)
// et « Autre jour » de Prévoir : les deux semaines à venir, un appui par jour.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nextDays } from '../js/planning.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');

test('jours suivants : un vendredi, de lundi 30 à dimanche 6, sans Demain ni Dimanche 29 (déjà dans « Quel jour ? »)', () => {
  const d = nextDays(new Date(2026, 10, 27, 17, 30));
  assert.deepEqual(d.map((x) => x.label), ['Lundi 30', 'Mardi 1er déc.', 'Mercredi 2 déc.', 'Jeudi 3 déc.', 'Vendredi 4 déc.', 'Samedi 5 déc.', 'Dimanche 6 déc.']);
  assert.ok(d.every((x) => x.date.getHours() === 12), 'à midi, comme les autres jours de Prévoir');
});

test('jours suivants : un mardi, Samedi et Dimanche déjà proposés sont sautés', () => {
  const d = nextDays(new Date(2026, 11, 1, 9)); // mardi 1er décembre : Quel jour ? = Aujourd'hui, Demain, Samedi 5, Dimanche 6
  assert.deepEqual(d.map((x) => x.label), ['Jeudi 3', 'Vendredi 4', 'Lundi 7', 'Mardi 8', 'Mercredi 9', 'Jeudi 10', 'Vendredi 11']);
});

test('jours suivants : le changement d\'heure ne décale rien', () => {
  const d = nextDays(new Date(2027, 2, 24, 23, 50)); // mercredi 24 mars 2027, heure d'été le 28
  assert.equal(new Set(d.map((x) => x.date.getDate())).size, 7);
  assert.ok(d.every((x) => x.date.getHours() === 12));
});

test('Prévoir : les jours par leur nom sous « Autre jour », le calendrier plus loin, pas de grille de chiffres', () => {
  assert.ok(app.includes("const week = nextDays(now);"));
  assert.ok(!/weekGrid|cal-hd/.test(app + css), 'grille de chiffres retirée (mon choix A du 27 nov.)');
  assert.ok(app.includes("'Plus loin : calendrier'"));
  assert.ok(app.includes("calBox.hidden = day !== 'other';"));
  assert.ok(app.includes("dateField.hidden = day !== 'other' || !far;"));
});

test('Mon planning : « Prévoir un autre jour » sous « Trouver une sortie », qui ne bouge pas', () => {
  const plan = app.slice(app.indexOf('function openPlanning('));
  const a = plan.indexOf("'Trouver une sortie'");
  const b = plan.indexOf("'Prévoir un autre jour'");
  assert.ok(a > 0 && b > a && b < plan.indexOf('lateWeekBlock(back)'));
  assert.ok(app.includes("onclick: () => openPlan(null, null, { pick: true }) }, ico('alarm-clock'), 'Prévoir un autre jour')"));
});

test('« Où ? » : rien d\'enregistré sans lieu ; la liste revient dans Prévoir avec ce qui était choisi', () => {
  assert.ok(app.includes("if (!p) { err.textContent = 'Choisis le lieu.'; return; }"));
  assert.ok(app.indexOf("if (!p) { err.textContent = 'Choisis le lieu.'") < app.indexOf("if (!d) { err.textContent = 'Choisis le jour.'"));
  assert.ok(app.includes("onclick: () => openPlanPick(keep(), back)"));
  assert.ok(app.includes("const choose = (p) => openPlan(p, back, { pick: true, draft: blank || busy(p) ? null : draft });"), 'un lieu déjà prévu montre sa sortie');
  assert.ok(app.includes("'← Prévoir'"));
});
