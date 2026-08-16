import fs from 'fs';
import path from 'path';

const legacyDir = path.resolve('_legacy_laravel');
if (!fs.existsSync(legacyDir)) {
  fs.mkdirSync(legacyDir, { recursive: true });
}

const itemsToMove = [
  'app',
  'bootstrap',
  'config',
  'routes',
  'artisan',
  'composer.json',
  'composer.lock',
  'phpunit.xml',
];

for (const item of itemsToMove) {
  const src = path.resolve(item);
  const dest = path.join(legacyDir, item);
  if (fs.existsSync(src)) {
    try {
      fs.renameSync(src, dest);
      console.log(`Moved ${item} -> _legacy_laravel/${item}`);
    } catch (e) {
      console.error(`Failed to move ${item}:`, e.message);
    }
  }
}
