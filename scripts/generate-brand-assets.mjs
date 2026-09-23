import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const assets = path.join(root, 'assets');
const brand = path.join(assets, 'brand');

await mkdir(assets, { recursive: true });

const iconSource = await readFile(path.join(brand, 'app-icon-source.svg'));
const adaptiveSource = await readFile(path.join(brand, 'adaptive-icon-source.svg'));
const splashSource = await readFile(path.join(brand, 'splash-source.svg'));

await Promise.all([
  sharp(iconSource, { density: 240 })
    .resize(1024, 1024, { fit: 'fill' })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(assets, 'icon.png')),

  sharp(adaptiveSource, { density: 240 })
    .resize(1024, 1024, { fit: 'fill' })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(assets, 'adaptive-icon.png')),

  sharp(splashSource, { density: 180 })
    .resize(1242, 2436, { fit: 'fill' })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(assets, 'splash.png')),
]);

console.log('Seven Music native brand assets generated.');
