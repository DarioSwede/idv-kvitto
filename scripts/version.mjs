import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const versionPath = path.join(root, 'version.json');
const changelogPath = path.join(root, 'CHANGELOG.md');
const command = process.argv[2] || 'show';

const version = JSON.parse(fs.readFileSync(versionPath, 'utf8'));

if (command === 'show') {
  console.log(`${version.version} (${version.build})`);
  process.exit(0);
}

if (command !== 'bump') {
  console.error('Anvand: npm run version:show eller npm run version:bump');
  process.exit(1);
}

const now = new Date();
const date = now.toISOString().slice(0, 10);
const dateVersion = date.replaceAll('-', '.');
const currentParts = String(version.version).split('.');
const currentDateVersion = currentParts.slice(0, 3).join('.');
const currentReleaseNumber = Number(currentParts[3] || 0);
const releaseNumber = currentDateVersion === dateVersion ? currentReleaseNumber + 1 : 1;
const nextVersion = `${dateVersion}.${releaseNumber}`;

const next = {
  version: nextVersion,
  build: `${date.replaceAll('-', '')}-${releaseNumber}`,
  released: date
};

fs.writeFileSync(versionPath, `${JSON.stringify(next, null, 2)}\n`);
const existing = fs.readFileSync(changelogPath, 'utf8');
const entry = `## ${next.version}\n- Versionsnummer bumpat av versionshanteraren.\n\n`;
fs.writeFileSync(changelogPath, existing.replace('# Versionshistorik\n\n', `# Versionshistorik\n\n${entry}`));
console.log(`${next.version} (${next.build})`);
