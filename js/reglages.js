// Réglages souples (v214) : les distances et les durées que l'appli gardait fixes, et les lignes de la fiche qu'on peut masquer.
// Tout se règle par − et + : une valeur est toujours sur un cran, entre ses deux bornes. Rien n'est envoyé.

/** Chaque valeur réglable : au départ, borne basse, borne haute, cran. Mètres, minutes à pied ou jours. */
export const TUNING = Object.freeze({
  alertM: Object.freeze({ def: 100, min: 50, max: 500, step: 50, unit: 'm' }), // Ma position allumée : prévenir près d'un de mes lieux
  memoryM: Object.freeze({ def: 100, min: 50, max: 500, step: 50, unit: 'm' }), // bandeau « Déjà passée ici »
  walkM: Object.freeze({ def: 1000, min: 500, max: 3000, step: 250, unit: 'm' }), // Y aller : à pied en dessous, en transports au-delà
  eventsM: Object.freeze({ def: 3000, min: 1000, max: 5000, step: 500, unit: 'm' }), // tous les onglets de Sorties
  ttbMin: Object.freeze({ def: 15, min: 5, max: 30, step: 5, unit: 'min' }), // TTB dans Autour de moi
  rainMin: Object.freeze({ def: 10, min: 5, max: 20, step: 5, unit: 'min' }), // passages couverts quand il pleut
  villeM: Object.freeze({ def: 150, min: 50, max: 300, step: 50, unit: 'm' }), // v245 : immeubles protégés par la Ville, dans Monuments (mon choix M2B)
  traceMin: Object.freeze({ def: 2, min: 1, max: 5, step: 1, unit: 'min' }), // mes lieux près du tracé d'un circuit
  askDays: Object.freeze({ def: 30, min: 15, max: 90, step: 15, unit: 'jours' }), // « Tu y es allée ? »
  leaveMin: Object.freeze({ def: 20, min: 15, max: 60, step: 5, unit: 'min' }), // v365 (ma demande du 21 nov., mon choix 15 min au plus bas) : marge de « Pars à », 20 min au départ (5 min fixes avant)
});

const valid = (t, v) => typeof v === 'number' && Number.isFinite(v) && v >= t.min && v <= t.max && (v - t.min) % t.step === 0;

/** Toutes les valeurs, vérifiées une par une : hors bornes, entre deux crans ou illisible → valeur de départ. */
export function cleanTuning(o) {
  const out = {};
  for (const [k, t] of Object.entries(TUNING)) out[k] = valid(t, o?.[k]) ? o[k] : t.def;
  return out;
}

/** Un cran de moins (dir −1) ou de plus (dir +1) : { value, edge } ; edge = 'min' ou 'max' quand on est déjà au bout. */
export function stepTuning(tuning, key, dir) {
  const t = TUNING[key];
  const cur = cleanTuning(tuning)[key];
  const next = cur + (dir > 0 ? t.step : -t.step);
  if (next < t.min) return { value: cur, edge: 'min' };
  if (next > t.max) return { value: cur, edge: 'max' };
  return { value: next, edge: null };
}

/** La valeur écrite en clair : « 100 m », « 1,25 km », « 15 min », « 30 jours ». */
export function tuningText(key, v) {
  const { unit } = TUNING[key];
  if (unit !== 'm') return `${v} ${unit}`;
  return v < 1000 ? `${v} m` : `${String(v / 1000).replace('.', ',')} km`;
}

/** Lignes de la fiche d'un lieu qu'on peut masquer : QR code, Avis Google, Uber jusqu'ici, Mes étoiles (v281). */
export const FICHE_LINES = Object.freeze(['qr', 'avis', 'uber', 'stars']);
export const cleanFicheHidden = (list) => FICHE_LINES.filter((k) => Array.isArray(list) && list.includes(k));

/* v390 (mes choix 1A 2A 3A 4A du 24 nov.) : « Circuits de visite » éteint dans Autres réglages. L'Aide ne cite que ce qui existe :
   les lignes propres aux circuits partent, Itinéraire, « Un parcours enregistré » et Ajouter ne les citent plus, une ligne dit où les rallumer. */
const CIRCUIT_ONLY = /^(\{signpost\} \*\*(Circuits de visite|Mes circuits)\*\*|\{pencil\} \*\*Modifier ce circuit\*\*|\*\*La page d'un circuit\*\*|\{triangle-alert\} \*\*Un souci sur un circuit\*\*|\{check\} \*\*Je l'ai fait\*\*|\{route\} \*\*Parcours ou circuit \?\*\*)/;
export const CIRCUITS_OFF_HELP = '{signpost} **Circuits de visite** : éteints sur ce téléphone. Pour les rallumer : {settings} → Autres réglages → Circuits de visite.';
export function helpWithoutCircuits(lines) {
  const out = [];
  for (const l of lines) {
    if (CIRCUIT_ONLY.test(l)) continue;
    const t = l.replace(', Circuits de visite, ', ', ').replace(/, « En faire un circuit » \([^)]*\)/, '')
      .replace('« **Un parcours** » et « **Un circuit** » ouvrent', '« **Un parcours** » ouvre');
    out.push(t);
    if (t.startsWith('{route} **Itinéraire**')) out.push(CIRCUITS_OFF_HELP);
  }
  return out;
}

/* v416 (mes choix 1A à 5A du 24 nov.) : « Boussole » éteinte dans Autres réglages. L'Aide ne cite que ce qui existe : les lignes
   propres à la boussole et à la Balade guidée partent, les autres ne la citent plus, une ligne dit où la rallumer. */
const COMPASS_ONLY = /^(\{navigation\} \*\*Balade guidée\*\*|\*\*Boussole « indisponible »\*\*)/;
export const COMPASS_OFF_HELP = '{compass} **Boussole** : éteinte sur ce téléphone ; Y aller ouvre Google Maps à pied. Pour la rallumer : {settings} → Autres réglages → Boussole.';
const COMPASS_WORDS = [
  [', **Boussole** montre la direction (même sans réseau)', ''],
  ['(Y aller, Boussole, Métro, Ajouter)', '(Y aller, Métro, Ajouter)'],
  [' : la distance, Y aller et la boussole vont jusqu\'à elle.', ' : la distance et Y aller vont jusqu\'à elle.'],
  ['Touche un arrêt pour la boussole.', 'Touche un arrêt pour y aller (Google Maps à pied).'],
  ['Y aller, {compass} Boussole, Métro, Prévoir', 'Y aller, Métro, Prévoir'],
  ['**Y aller**, Boussole et Métro mènent', '**Y aller** et Métro mènent'],
  ['les escaliers et les pentes, Balade guidée, Voir sur la carte', 'les escaliers et les pentes, Voir sur la carte'],
  [' ; il se suit avec la Balade guidée et se partage.', ' ; il se partage.'],
  ['**Un parcours enregistré** : Balade guidée, Google Maps', '**Un parcours enregistré** : Google Maps'],
  ['Y aller, Boussole, Métro et Ajouter', 'Y aller, Métro et Ajouter'],
  ['**Y aller** ouvre Google Maps. {compass} **Boussole** : une flèche et une voix te guident.', '**Y aller** ouvre Google Maps.'],
  ['Rentrer, M, la boussole, Où suis-je ?', 'Rentrer, M, Où suis-je ?'],
  ["(Vélib' et Monuments : la boussole)", "(Vélib' et Monuments : Google Maps à pied)"], // v418 : un rond touché, puis le bandeau
  ['**Voix** : la boussole et le suivi parlent.', '**Voix** : le suivi parle.'],
];
export function helpWithoutCompass(lines) {
  const out = [];
  for (const l of lines) {
    if (COMPASS_ONLY.test(l)) continue;
    let t = l;
    for (const [a, b] of COMPASS_WORDS) t = t.replace(a, b);
    out.push(t);
    if (t.startsWith('**Aller à un lieu**')) out.push(COMPASS_OFF_HELP);
  }
  return out;
}
