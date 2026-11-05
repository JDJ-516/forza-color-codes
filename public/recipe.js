export const displaySetting = value => value == null || value === '' ? 'Not provided' : String(value);
export function recipeLayers(color) {
  return color.layers || [{label:'Color 1 (X)', raw:[color.h, color.s, color.b].map(v => v.toFixed(2)), values:[color.h,color.s,color.b]}];
}
export function recipeText(color) {
  const lines = [`${color.manufacturer} — ${color.name}`, `${color.finish} | ${color.category || 'Personal'}`];
  for (const layer of recipeLayers(color)) lines.push(`${layer.label}: ${['H','S','B'].map((label,i) => `${label}: ${displaySetting(layer.raw[i])}`).join(' | ')}`);
  if (color.notes) lines.push(`Notes: ${color.notes}`);
  if (color.source) lines.push(`Source: ${color.source.sheet}, row ${color.source.row}. Community recipe; game compatibility not independently verified.`);
  if (color.source?.url) lines.push(`Source URL: ${color.source.url}`);
  if (color.source?.historical) lines.push(`HISTORICAL ALTERNATIVE: ${color.source.warning}`);
  if (color.issues?.length) lines.push('REVIEW REQUIRED: source contains missing or malformed settings; values above are preserved without correction.');
  return lines.join('\n');
}
