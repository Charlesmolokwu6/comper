/** Terminal names as operators write them, cleaned for display. Shared by client and server. */

/** State/city prefixes operators put in front of a terminal name ("Lagos (Empire)", "Anambra-Onitsha"). */
const PREFIXES = [
  "lagos",
  "abuja",
  "anambra",
  "abia",
  "akwa ibom",
  "rivers",
  "imo",
  "enugu",
  "ebonyi",
  "delta",
  "edo",
  "oyo",
  "cross river",
  "benin republic",
  "ghana",
  "togo",
  "ph",
  "fct",
];

const titleCase = (s: string) =>
  s
    .toLowerCase()
    .replace(/(^|[\s(/-])([a-z])/g, (_, a, b) => a + b.toUpperCase());

/**
 * Readable terminal name for display: drops Chisco's "--am/--pm" session markers, the word
 * "Terminal", and a leading state/city ("Lagos (Empire--am)" → "Empire",
 * "Anambra-Onitsha----am" → "Onitsha", "ABUJA - UTAKO" → "Utako"). Names like
 * "Okota (Cele)" or "Ifite-Awka" are kept.
 */
export function prettyStop(name: string) {
  let s = name
    .replace(/[—–]/g, "-")
    .replace(/\s*-{2,}\s*(am|pm)\b/gi, "")
    .replace(/[-\s]*\bterminal\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const paren = s.match(/^([^()]+)\((.+)\)$/);
  if (paren && PREFIXES.includes(paren[1].trim().toLowerCase()))
    s = paren[2].trim();
  const dash = s.match(/^([^-]+?)\s*-\s*(.+)$/);
  if (dash && PREFIXES.includes(dash[1].trim().toLowerCase()))
    s = dash[2].trim();
  return s === s.toUpperCase() ? titleCase(s) : s;
}
