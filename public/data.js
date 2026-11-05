// Starter recipes are illustrative approximations, not verified OEM matches.
export const starterColors = [
  ['porsche-irish', 'Irish Green', 'Porsche', '#224c3d', 'Solid', 'Green', 0.40, 0.56, 0.30],
  ['ferrari-rosso', 'Rosso Corsa', 'Ferrari', '#cc292c', 'Solid', 'Red', 0.00, 0.85, 0.78],
  ['bmw-laguna', 'Laguna Seca Blue', 'BMW', '#3b9cbd', 'Solid', 'Blue', 0.54, 0.69, 0.74],
  ['lamborghini-giallo', 'Giallo-inspired Yellow', 'Lamborghini', '#e9ca43', 'Metallic', 'Yellow', 0.14, 0.71, 0.91],
  ['porsche-rubystone', 'Rubystone-inspired Pink', 'Porsche', '#a83b69', 'Solid', 'Pink', 0.93, 0.65, 0.66],
  ['nissan-midnight', 'Midnight-inspired Purple', 'Nissan', '#514365', 'Metallic', 'Purple', 0.74, 0.34, 0.40],
  ['mclaren-papaya', 'Papaya-inspired Orange', 'McLaren', '#e77f2e', 'Solid', 'Orange', 0.07, 0.80, 0.91],
  ['aston-british', 'Racing Green', 'Aston Martin', '#254b47', 'Metallic', 'Green', 0.48, 0.51, 0.29],
  ['bmw-alpine', 'Alpine-inspired White', 'BMW', '#deded5', 'Solid', 'Neutral', 0.17, 0.04, 0.87],
  ['nissan-bayside', 'Bayside-inspired Blue', 'Nissan', '#346bc1', 'Metallic', 'Blue', 0.60, 0.73, 0.76],
  ['ferrari-argento', 'Argento-inspired Silver', 'Ferrari', '#a7adb0', 'Metallic', 'Neutral', 0.56, 0.05, 0.69],
  ['porsche-chalk', 'Chalk-inspired Grey', 'Porsche', '#b6b4a9', 'Solid', 'Neutral', 0.14, 0.07, 0.71],
].map(([id, name, manufacturer, hex, finish, family, h, s, b]) => ({ id, name, manufacturer, hex, finish, family, h, s, b, sample: true, notes: 'Illustrative starter recipe. Adjust under in-game lighting; this is not a verified factory paint match.' }));
