# Translation Merge Instructions

This directory contains additional translation files for the new homepage features. These need to be merged into the main translation files.

## Files to Merge

- `landing-additions-en.json` → `en.json`
- `landing-additions-fr.json` → `fr.json`
- `landing-additions-ar.json` → `ar.json`

## How to Merge

### Option 1: Manual Merge

1. Open the main translation file (e.g., `en.json`)
2. Locate the `"landing"` section
3. Deep merge the content from `landing-additions-en.json` into the existing `landing` object
4. Ensure no duplicate keys exist
5. Test the application to verify all translations load correctly

### Option 2: Using jq (Command Line)

```bash
# For English
jq -s '.[0] * .[1]' en.json landing-additions-en.json > en-merged.json
mv en-merged.json en.json

# For French
jq -s '.[0] * .[1]' fr.json landing-additions-fr.json > fr-merged.json
mv fr-merged.json fr.json

# For Arabic
jq -s '.[0] * .[1]' ar.json landing-additions-ar.json > ar-merged.json
mv ar-merged.json ar.json
```

### Option 3: Using Node.js Script

Create a `merge-translations.js` script:

```javascript
const fs = require('fs');
const path = require('path');

function deepMerge(target, source) {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target))
          Object.assign(output, { [key]: source[key] });
        else
          output[key] = deepMerge(target[key], source[key]);
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

['en', 'fr', 'ar'].forEach(locale => {
  const mainFile = path.join(__dirname, `${locale}.json`);
  const additionsFile = path.join(__dirname, `landing-additions-${locale}.json`);
  
  const main = JSON.parse(fs.readFileSync(mainFile, 'utf8'));
  const additions = JSON.parse(fs.readFileSync(additionsFile, 'utf8'));
  
  const merged = deepMerge(main, additions);
  
  fs.writeFileSync(mainFile, JSON.stringify(merged, null, 2));
  console.log(`✓ Merged ${locale} translations`);
});

console.log('\\nAll translations merged successfully!');
```

Run it:
```bash
node merge-translations.js
```

## New Translation Keys Added

### Hero Section
- Industry-specific chat demos for 5 industries (ecommerce, automotive, healthcare, realEstate, hospitality)
- Each industry has 2-4 message pairs (customer + agent)
- Industry selector labels

### Industry Use Cases Section
- Title and subtitle
- 5 industries × 3 use cases = 15 use case cards
- Each use case has: title, description, demo conversation

### Integrations Showcase Section
- Integration categories (8 categories)
- 30+ integration features
- Connection status and timing

### ROI Calculator Section
- Input labels (4 sliders)
- Result metrics (4 calculations)
- CTA with dynamic savings

### Interactive Demo Section
- Flow builder description
- Chat preview for 3 channels (WhatsApp, Instagram, Email)
- Demo conversations for each channel
- Feature badges

## Total Keys Added
- **English**: ~200 keys
- **French**: ~200 keys
- **Arabic**: ~200 keys (with RTL support)

## Verification

After merging, verify:

1. **No JSON syntax errors**:
   ```bash
   node -e "require('./en.json')"
   node -e "require('./fr.json')"
   node -e "require('./ar.json')"
   ```

2. **All keys exist**:
   - Check the homepage loads without missing translation warnings
   - Test all new sections
   - Switch between locales

3. **RTL Support (Arabic)**:
   - Ensure Arabic text displays right-to-left
   - Verify UI components adapt correctly

## Notes

- All translations are industry-specific and contextual
- Arabic translations include proper RTL text flow
- French translations use formal tone (vous)
- Conversation demos are realistic and business-appropriate

## Cleanup

After successful merge and verification, you can optionally delete the `landing-additions-*.json` files:

```bash
rm landing-additions-*.json
```

But it's recommended to keep them for reference or rollback if needed.

