import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const expectations = [
  ['assets/icon.png', 1024, 1024],
  ['assets/adaptive-icon.png', 1024, 1024],
  ['assets/splash.png', 1242, 2436],
];

for (const [relative, width, height] of expectations) {
  const file = path.join(root, relative);
  const metadata = await sharp(file).metadata();

  if (metadata.format !== 'png') {
    throw new Error(relative + ' must be PNG.');
  }
  if (metadata.width !== width || metadata.height !== height) {
    throw new Error(
      relative + ' must be ' + width + 'x' + height +
      ', got ' + metadata.width + 'x' + metadata.height + '.',
    );
  }

  console.log('OK', relative, metadata.width + 'x' + metadata.height);
}
