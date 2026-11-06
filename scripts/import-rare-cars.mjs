import {readFile,writeFile} from 'node:fs/promises';
import {parseRareCars} from '../rare-cars.js';
const path=process.argv[2]||new URL('../data/rare-cars-source.xlsx',import.meta.url);
const data=parseRareCars(await readFile(path));
data.snapshotNote='User-uploaded workbook snapshot; source date is unknown. Google Sheets is checked when the app is running.';
await writeFile(new URL('../public/rare-cars.json',import.meta.url),JSON.stringify(data));
console.log(`${data.cars.length} entries across ${data.categories.length} categories.`);
