// Lecture de ce qui est partagé vers l'appli (depuis Google Maps, un site, un message…).

const URL_RE = /\bhttps?:\/\/\S+|\bgeo:\S+/gi;
const POSTCODE_RE = /\b\d{5}\b/;

function coordsFrom(s) {
  const patterns = [
    /@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/, // google.com/maps/…/@48.86,2.33,17z
    /[?&](?:q|query|ll|destination|center)=(-?\d{1,2}\.\d+)(?:,|%2C)\s*(-?\d{1,3}\.\d+)/i,
    /geo:(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/i,
    /#map=\d+\/(-?\d{1,2}\.\d+)\/(-?\d{1,3}\.\d+)/, // openstreetmap.org
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (!m) continue;
    const lat = Number(m[1]);
    const lng = Number(m[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
  }
  return null;
}

/**
 * Devine le nom, l'adresse et éventuellement la position de ce qui a été partagé.
 * Renvoie { name, address, lat, lng, query } ; lat/lng valent null si inconnus.
 */
export function parseShared({ title = '', text = '', url = '' } = {}) {
  const all = [title, text, url].filter(Boolean).join('\n');
  const c = coordsFrom(all);
  const lines = String(text).replace(URL_RE, '').split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const cleanTitle = String(title).replace(URL_RE, '').trim();

  let name = cleanTitle;
  let address = '';
  for (const line of lines) {
    // « Nom · adresse » sur une seule ligne
    const parts = line.split(/\s+[·•|–-]\s+/);
    if (parts.length > 1 && POSTCODE_RE.test(parts.at(-1))) {
      if (!name) name = parts[0];
      if (!address) address = parts.slice(1).join(' ');
      continue;
    }
    if (!address && POSTCODE_RE.test(line) && /\d/.test(line)) { address = line; continue; }
    if (!name) name = line;
  }
  if (address === name) address = '';
  return {
    name, address,
    lat: c ? c.lat : null, lng: c ? c.lng : null,
    query: [name, address].filter(Boolean).join(' '),
  };
}
