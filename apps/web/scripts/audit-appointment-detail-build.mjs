import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const webRoot = path.resolve(new URL('..', import.meta.url).pathname);
const sourceRoot = path.join(webRoot, 'src');
const distRoot = path.join(webRoot, 'dist');

const forbiddenExactLabels = [
  'Creado por',
  'Origen',
  'Motivo cancelación',
  'Reprogramado desde',
  'Cancelado en'
];

const forbiddenFieldPatterns = [
  /<dt>\s*Cancelado por\s*<\/dt>/,
  /children:\s*["']Cancelado por["']/,
  /label:\s*["']Cancelado por["']/
];

const expectedDistMarkers = [
  'appointment-detail-real-component',
  'Detalle de turno',
  'Datos del paciente'
];

const walkFiles = (dir, { skip = new Set() } = {}) => {
  const files = [];
  const stack = [dir];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const name = path.basename(current);
    if (skip.has(name)) continue;

    let entries = [];
    try {
      entries = readdirSync(current);
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry);
      const stats = statSync(fullPath);
      if (stats.isDirectory()) {
        stack.push(fullPath);
      } else if (stats.isFile()) {
        files.push(fullPath);
      }
    }
  }

  return files.sort();
};

const readText = (filePath) => readFileSync(filePath, 'utf8');
const relative = (filePath) => path.relative(webRoot, filePath);

const reportMatches = (title, matches) => {
  console.log(`\n${title}`);
  if (matches.length === 0) {
    console.log('  OK: no matches');
    return;
  }
  for (const match of matches) {
    console.log(`  ${match}`);
  }
};

const sourceFiles = walkFiles(sourceRoot);
const sourceTextFiles = sourceFiles.filter((file) => /\.(ts|tsx|js|jsx|css|json)$/.test(file));
const sourceMatches = [];

for (const file of sourceTextFiles) {
  const text = readText(file);
  const lines = text.split('\n');
  lines.forEach((line, index) => {
    for (const label of forbiddenExactLabels) {
      if (line.includes(label)) {
        sourceMatches.push(`${relative(file)}:${index + 1}: ${label}`);
      }
    }
    for (const pattern of forbiddenFieldPatterns) {
      if (pattern.test(line)) {
        sourceMatches.push(`${relative(file)}:${index + 1}: field label Cancelado por`);
      }
    }
  });
}

const jsOrJsxSourceFiles = sourceFiles
  .filter((file) => /\.(js|jsx)$/.test(file))
  .map(relative);

const appointmentDetailFiles = walkFiles(sourceRoot)
  .filter((file) => /Appointment.*Detail/i.test(path.basename(file)))
  .map(relative);

const distFiles = walkFiles(distRoot);
const distMatches = [];
const distText = distFiles
  .filter((file) => /\.(html|js|css|json|map|txt)$/.test(file))
  .map((file) => ({ file, text: readText(file) }));

for (const { file, text } of distText) {
  for (const label of forbiddenExactLabels) {
    if (text.includes(label)) {
      distMatches.push(`${relative(file)}: ${label}`);
    }
  }
  for (const pattern of forbiddenFieldPatterns) {
    if (pattern.test(text)) {
      distMatches.push(`${relative(file)}: field label Cancelado por`);
    }
  }
}

const distMarkerMatches = expectedDistMarkers.map((marker) => ({
  marker,
  found: distText.some(({ text }) => text.includes(marker))
}));

reportMatches('Forbidden legacy labels in src', sourceMatches);
reportMatches('JavaScript/JSX files in src', jsOrJsxSourceFiles);
reportMatches('Appointment detail candidates', appointmentDetailFiles);
reportMatches('Forbidden legacy labels in dist', distMatches);
console.log('\nExpected detail markers in dist');
for (const { marker, found } of distMarkerMatches) {
  console.log(`  ${found ? 'OK' : 'MISSING'}: ${marker}`);
}

const failures = [
  sourceMatches.length > 0,
  jsOrJsxSourceFiles.length > 0,
  appointmentDetailFiles.length !== 1 || appointmentDetailFiles[0] !== 'src/features/appointments/AppointmentDetailPage.tsx',
  distMatches.length > 0,
  distMarkerMatches.some(({ found }) => !found)
];

if (failures.some(Boolean)) {
  process.exitCode = 1;
}
