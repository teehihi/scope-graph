import fs from 'fs';
import path from 'path';

const LANGS = ['en', 'vi', 'ja', 'ko', 'zh', 'es', 'fr', 'de', 'hi', 'th', 'it', 'ru'];
const projectRoot = process.cwd().endsWith('apps/web') ? path.resolve('../..') : process.cwd();
const filePath = path.join(projectRoot, 'apps/web/src/context/LanguageContext.tsx');

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

let currentLang = null;
const keysByLang = {};
LANGS.forEach((l) => (keysByLang[l] = new Set()));

for (const line of lines) {
  const langMatch = line.match(/^\s*([a-z]{2})\s*:\s*\{/);
  if (langMatch && LANGS.includes(langMatch[1])) {
    currentLang = langMatch[1];
    continue;
  }
  if (currentLang) {
    const keyMatch = line.match(/^\s*['"]([a-zA-Z0-9_\.]+)['"]\s*:/);
    if (keyMatch) {
      keysByLang[currentLang].add(keyMatch[1]);
    }
  }
}

const enKeys = keysByLang['en'];
console.log(`\n========================================`);
console.log(`🔍 ScopeGraph i18n Automated Audit Report`);
console.log(`========================================`);
console.log(`Base reference language: English (en) [${enKeys.size} keys]\n`);

let hasErrors = false;

LANGS.forEach((lang) => {
  const currentKeys = keysByLang[lang];
  const missing = [...enKeys].filter((k) => !currentKeys.has(k));
  const extra = [...currentKeys].filter((k) => !enKeys.has(k));

  if (missing.length === 0 && extra.length === 0) {
    console.log(`  ✅ ${lang.padEnd(4)}: 100% parity (${currentKeys.size} keys)`);
  } else {
    hasErrors = true;
    console.log(`  ❌ ${lang.padEnd(4)}: ${currentKeys.size} keys`);
    if (missing.length > 0) {
      console.log(`     ⚠️  Missing ${missing.length} keys: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '...' : ''}`);
    }
    if (extra.length > 0) {
      console.log(`     ⚠️  Extra ${extra.length} keys: ${extra.slice(0, 5).join(', ')}${extra.length > 5 ? '...' : ''}`);
    }
  }
});

// Check hardcoded texts in UI components outside LanguageContext
console.log(`\n----------------------------------------`);
console.log(`🔍 Scanning UI components for unlocalized hardcoded strings...`);

const srcDir = path.join(projectRoot, 'apps/web/src');
const hardcodedPattern = /[\u00C0-\u1EF9]/; // Vietnamese accents
let hardcodedFindings = 0;

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if ((entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) && entry.name !== 'LanguageContext.tsx') {
      const fileContent = fs.readFileSync(fullPath, 'utf-8');
      const fLines = fileContent.split('\n');
      fLines.forEach((l, idx) => {
        const stripped = l.trim();
        if (stripped.startsWith('//') || stripped.startsWith('/*') || stripped.startsWith('*') || stripped.startsWith('{/*')) {
          return;
        }
        if (hardcodedPattern.test(stripped)) {
          // ignore user demo mock name in Settings.tsx fallback
          if (entry.name === 'Settings.tsx' && stripped.includes('Nguyễn Nhật Thiên')) {
            return;
          }
          console.log(`  ⚠️  ${path.relative(srcDir, fullPath)}:${idx + 1}: ${stripped}`);
          hardcodedFindings++;
        }
      });
    }
  }
}

scanDir(srcDir);

if (hardcodedFindings === 0) {
  console.log(`  ✅ No hardcoded non-English strings found in UI components!`);
} else {
  console.log(`  ❌ Found ${hardcodedFindings} unlocalized strings in UI components.`);
}

console.log(`========================================\n`);

if (hasErrors || hardcodedFindings > 0) {
  process.exit(1);
} else {
  console.log(`🎉 Audit passed: All 12 languages have 100% key parity and zero unlocalized UI strings.\n`);
  process.exit(0);
}
