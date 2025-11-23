/* eslint-disable */
const fs = require('fs');
const path = require('path');

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(target, source) {
  if (!isObject(target)) return source;
  const out = { ...target };
  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    const tgtVal = out[key];
    if (isObject(srcVal)) {
      out[key] = deepMerge(tgtVal ?? {}, srcVal);
    } else {
      out[key] = srcVal;
    }
  }
  return out;
}

function mergeLocale(locale) {
  const baseFile = path.join(__dirname, `${locale}.json`);
  const addFile = path.join(__dirname, `landing-additions-${locale}.json`);
  if (!fs.existsSync(addFile)) {
    console.log(`No additions file for ${locale}, skipping.`);
    return;
  }
  const baseJson = JSON.parse(fs.readFileSync(baseFile, 'utf8'));
  const addJson = JSON.parse(fs.readFileSync(addFile, 'utf8'));

  const merged = deepMerge(baseJson, addJson);

  // Backup
  const backupFile = path.join(
    __dirname,
    `${locale}.backup.${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  );
  fs.writeFileSync(backupFile, JSON.stringify(baseJson, null, 2));

  // Write merged
  fs.writeFileSync(baseFile, JSON.stringify(merged, null, 2));
  console.log(`✓ Merged translations for ${locale}. Backup: ${path.basename(backupFile)}`);
}

['en', 'fr', 'ar'].forEach(mergeLocale);

console.log('All translation merges complete.');
