import { readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve } from 'node:path';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = join(appRoot, 'src');
const duplicateFiles = [];

function walk(directory) {
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!stats.isFile() || !fullPath.endsWith('.js')) {
      continue;
    }

    const withoutExtension = fullPath.slice(0, -'.js'.length);
    const hasTypeScriptSource =
      statExists(`${withoutExtension}.ts`) || statExists(`${withoutExtension}.tsx`);

    if (hasTypeScriptSource) {
      duplicateFiles.push(relative(appRoot, fullPath));
    }
  }
}

function statExists(path) {
  try {
    return statSync(path).isFile();
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

walk(srcRoot);

if (duplicateFiles.length > 0) {
  console.error(
    'Found duplicate .js files in src with matching .ts/.tsx sources. Remove these files before building:',
  );
  for (const file of duplicateFiles) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

console.log('OK: no duplicate .js files in src with matching .ts/.tsx sources');
