/* « Alerter en silence » (v482, mes choix 1A 2A 3A du 25 nov. 2026 ; claude/idee-alerter-silence.md, idee-mode-crise.md 16 bis).
   Rien n'est envoyé par l'appli : les liens `sms:` ouvrent l'appli SMS du téléphone avec le message écrit ; c'est moi qui touche Envoyer.
   Le 114 reçoit les SMS de qui ne peut pas parler à voix haute (service-public.gouv.fr / justice.fr, « Comment contacter la police
   ou la gendarmerie en cas d'urgence ? », mise à jour le 10 avril 2026). */

export const ALERT_MAX = 2;

/** Un numéro tapé par moi : chiffres, un « + » au début ; entre 8 et 15 chiffres (sinon refusé). */
export function cleanTel(t) {
  if (typeof t !== 'string') return '';
  const s = t.trim();
  const plus = s.startsWith('+');
  const digits = s.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15 ? `${plus ? '+' : ''}${digits}` : '';
}

/** Mes proches à prévenir : { name, tel }, 2 au plus ; sur le téléphone et dans ma sauvegarde, jamais chez un proche. */
export function cleanAlertContacts(a) {
  if (!Array.isArray(a)) return [];
  const out = [];
  for (const c of a) {
    const tel = cleanTel(c?.tel);
    if (!tel || out.some((x) => x.tel === tel)) continue;
    const name = typeof c.name === 'string' ? c.name.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 20) : '';
    out.push({ name, tel });
    if (out.length >= ALERT_MAX) break;
  }
  return out;
}

const coordsText = (at) => `${at.lat.toFixed(5)}, ${at.lng.toFixed(5)}`;
const where = (at, addr) => `${addr ? `${addr}. ` : ''}GPS : ${coordsText(at)}${Number.isFinite(at.acc) ? ` (à ${Math.round(at.acc)} m près)` : ''}.`;

/** Le message prêt pour le 114 : je ne peux pas parler, où je suis ; j'ajoute ce qui se passe. */
export function sms114Text(at, addr = '') {
  return `Je ne peux pas parler. Je suis : ${where(at, addr)} Ce qui se passe : `;
}

/** Le message prêt pour un proche. */
export function smsProcheText(at, addr = '') {
  return `Je suis à l'abri, je ne peux pas parler. Je suis : ${where(at, addr)} https://www.google.com/maps/search/?api=1&query=${at.lat.toFixed(5)},${at.lng.toFixed(5)}`;
}

/** Lien qui ouvre l'appli SMS (Android) avec le numéro et le message. */
export const smsHref = (tel, text) => `sms:${tel}?body=${encodeURIComponent(text)}`;

/* v485 (mon choix C du 25 nov.) : SMS au 31177, le numéro d'alerte de la RATP et de la SNCF en Île-de-France (agression, harcèlement,
   danger dans les transports ; ratp.fr « Comment signaler une agression ou un comportement déplacé ? », iledefrance-mobilites.fr).
   Aucune heure d'ouverture écrite : Île-de-France Mobilités et Transilien ne disent pas la même chose. */
export const TRANSPORT_SMS = '31177';
/** v540 (mon oui du 26 nov.) : le même service par téléphone, gratuit (iledefrance-mobilites.fr, « 3117 : le numéro d'alerte »). */
export const TRANSPORT_TEL = '3117';
/** Le message prêt : je ne peux pas parler ; la ligne et la station, je les écris (ma position seule ne dit pas dans quel train je suis). */
export const sms31177Text = () => 'Je ne peux pas parler. Ligne : … Station ou direction : … Ce qui se passe : ';

/** v485 : « Je rentre », avec l'heure d'arrivée arrondie aux 5 minutes du dessus, seulement si elle a un sens (90 min à pied au plus). */
export const JE_RENTRE_MAX_MIN = 90;
export function arrivalText(minutes, now = new Date()) {
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > JE_RENTRE_MAX_MIN) return '';
  const t = new Date(now.getTime() + minutes * 60000);
  const m = Math.ceil(t.getMinutes() / 5) * 5;
  t.setMinutes(m, 0, 0); // 60 passe à l'heure suivante
  return `${t.getHours()} h ${String(t.getMinutes()).padStart(2, '0')}`;
}
export function jeRentreText(minutes, now = new Date()) {
  const at = arrivalText(minutes, now);
  return at ? `Je rentre à pied, j'arrive vers ${at}.` : 'Je rentre.';
}
