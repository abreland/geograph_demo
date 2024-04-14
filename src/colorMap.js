export const colorMap ={
  'Arizona' : "#FFFF00",
  'California' : "#ff5900",
  'New Mexico' : "#d0300e",
  'Nevada' : "#0000FF",
  'low': "#faa8d9",
  'teen': "#0aa3f5",
  'adult': "#12ef1d",
  'elderly': "#e5e105",
  "desert":"#e5e4b2",
  "forest":"#164805",
  "grassland":"#50e505",
  "urban":"#676762"
}

export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}