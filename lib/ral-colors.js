// ============================================================
// RAL â†’ hex map. Small subset covering common PEB roof/wall colors.
// Add more as needed.
// ============================================================

export const RAL_HEX = {
  'RAL 1015': '#E6D690', // Light ivory
  'RAL 3009': '#642424', // Oxide red (red oxide primer)
  'RAL 3011': '#781F19', // Brown red
  'RAL 5005': '#0E518D', // Signal blue
  'RAL 5010': '#0E294B', // Gentian blue
  'RAL 5012': '#3481B8', // Light blue
  'RAL 5015': '#2174B5', // Sky blue
  'RAL 6005': '#114232', // Moss green (typical roof green)
  'RAL 7035': '#CBD0CC', // Light grey
  'RAL 7038': '#B5B8B1', // Agate grey
  'RAL 7042': '#8F9695', // Traffic grey A
  'RAL 9002': '#E7EBDA', // Grey white (DATASHYNE off-white)
  'RAL 9003': '#F4F4F4', // Signal white
  'RAL 9006': '#A5A5A5', // White aluminium
  'RAL 9010': '#F1ECE1', // Pure white
  'RAL 9016': '#F1F0EA', // Traffic white
  'RAL 9017': '#1B1B1B', // Traffic black
};

// Lookup: input is a string like "RAL 9016", "ral9016", "9016", or a free-form
// shade name. Returns hex string, or null if unknown.
export function ralToHex(input) {
  if (!input) return null;
  const raw = String(input).trim().toUpperCase().replace(/\s+/g, ' ');
  if (RAL_HEX[raw]) return RAL_HEX[raw];
  // Try "RAL <number>" / "RAL<number>" / just "<number>"
  const m = raw.match(/(\d{4})/);
  if (m) {
    const k = `RAL ${m[1]}`;
    if (RAL_HEX[k]) return RAL_HEX[k];
  }
  return null;
}