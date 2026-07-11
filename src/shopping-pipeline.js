// Pure pipeline functions for shopping-list extraction and normalisation.
// No browser APIs. No Supabase. Importable by both main.js and the test suite.

export const COOKING_METHOD_PATTERNS = [
  'a la plancha', 'al horno', 'al vapor', 'al microondas',
  'a la brasa', 'a la parrilla', 'a la cazuela', 'en papillote',
  'en su jugo', 'a fuego lento',
  'al curry', 'al ajillo', 'al pil pil', 'a la romana',
  'con salsa verde', 'con salsa', 'en salsa', 'a la vinagreta',
  'con especias', 'con hierbas aromáticas', 'con hierbas',
  'hervido', 'hervida', 'hervidos', 'hervidas',
  'frito', 'frita', 'fritos', 'fritas',
  'asado', 'asada', 'asados', 'asadas',
  'estofado', 'estofada', 'estofados', 'estofadas',
  'guisado', 'guisada', 'guisados', 'guisadas',
  'salteado', 'salteada', 'salteados', 'salteadas',
  'marinado', 'marinada', 'marinados', 'marinadas',
  'ahumado', 'ahumada', 'ahumados', 'ahumadas',
  'gratinado', 'gratinada', 'gratinados', 'gratinadas',
  'rebozado', 'rebozada', 'rebozados', 'rebozadas',
  'empanado', 'empanada', 'empanados', 'empanadas',
  'cocido', 'cocida', 'cocidos', 'cocidas',
].sort((a, b) => b.length - a.length);

export const PROTECTED_PRODUCTS = [
  'aceite de oliva virgen extra', 'aceite de oliva', 'aceite de girasol',
  'leche de almendras', 'leche de avena', 'leche de soja', 'leche de coco',
  'crema de cacahuete', 'crema de almendras',
  'proteína de suero', 'proteína en polvo',
  'atún al natural', 'atún en conserva',
  'sardinas en conserva', 'caballa en conserva',
  'jamón cocido', 'jamón serrano', 'jamón ibérico',
  'pavo en lonchas', 'pavo cocido',
  'queso fresco', 'queso cottage', 'queso rallado', 'queso de cabra', 'queso manchego',
  'yogur natural', 'yogur griego', 'yogur de soja',
  'pan integral', 'pan de molde', 'pan de centeno', 'pan de avena',
  'tortitas de arroz', 'tortitas de maíz',
  'bebida vegetal',
  'hummus', 'tofu', 'tempeh', 'seitán',
].sort((a, b) => b.length - a.length);

export const RECIPE_EXPANSIONS = {
  'tortilla española': ['Huevos', 'Patata', 'Cebolla', 'Aceite de oliva'],
  'tortilla de patatas': ['Huevos', 'Patata', 'Cebolla', 'Aceite de oliva'],
  'tortilla de claras': ['Claras de huevo'],
  'revuelto de claras': ['Claras de huevo'],
  'ensalada mixta': ['Lechuga', 'Tomate', 'Cebolla'],
  'ensalada verde': ['Lechuga', 'Pepino', 'Cebolla'],
  'ensalada caprese': ['Tomate', 'Mozzarella', 'Albahaca'],
};

export const RECIPE_PREFIXES = [
  'revuelto de', 'revuelta de',
  'ensalada de',
  'crema de', 'sopa de', 'puré de', 'pure de',
  'tortilla de',
  'salteado de', 'salteada de',
  'guiso de', 'estofado de',
  'bowl de', 'wrap de', 'wok de',
].sort((a, b) => b.length - a.length);

// Acronyms like "AOVE" or "IA" are short enough to be intentional and are
// left untouched; anything longer in all caps reads as a shouted artifact
// of the source document rather than a deliberate acronym.
const ACRONYM_MAX_LEN = 4;

function isAllCapsWord(word) {
  return /[A-ZÀ-ÖØ-Þ]/.test(word) && !/[a-zà-öø-ÿ]/.test(word);
}

// Detects text that reads as "shouting" or mechanically title-cased rather
// than a deliberate acronym or proper noun, e.g. "ESPINACAS" or
// "Pollo A La Plancha" — both of which parsers occasionally pass through
// verbatim from inconsistently formatted source documents.
function needsCaseNormalization(str) {
  const words = str.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;

  if (words.length === 1) {
    return isAllCapsWord(words[0]) && words[0].length > ACRONYM_MAX_LEN;
  }
  if (words.every(isAllCapsWord)) return true;
  if (words.length > 2 && words.every(w => /^[A-ZÀ-Ý][a-zà-ÿ]*$/.test(w))) return true;

  return false;
}

export function capitalize(str) {
  if (!str) return '';
  const source = needsCaseNormalization(str) ? str.toLowerCase() : str;
  return source.charAt(0).toUpperCase() + source.slice(1);
}

// Normalizes an ingredient name to a stable grouping key.
// Lowercases, strips diacritics, and trims so that "Salmón" and "Salmon"
// (or any accent variation) map to the same key and are merged correctly.
export function normalizeIngredientKey(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[.,;:!?]+$/, '')  // strip trailing punctuation left by parsers
    .trim();                    // re-trim in case punctuation had surrounding spaces
}

export function stripCookingMethod(text) {
  let result = text.trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const method of COOKING_METHOD_PATTERNS) {
      const escaped = method.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?:,\\s*|\\s+)${escaped}\\s*$`, 'i');
      const next = result.replace(regex, '').trim();
      if (next !== result && next.length > 0) {
        result = next;
        changed = true;
        break;
      }
    }
  }
  return result;
}

export function extractQtyAndName(text) {
  // Range notation like "3-4" or "2-3g": the range is an imprecise amount, so
  // we keep the ingredient name and emit qty=null (mergeShoppingIngredients will
  // count occurrences instead of summing a wrong number).
  // NOTE: "gr" must be listed before "g" in the alternation so that "150gr" is
  // consumed fully; otherwise the "g" branch matches first and leaves "r …".
  const rangeM = text.match(/^(\d+(?:[.,]\d+)?)-(\d+(?:[.,]\d+)?)\s*(gr|g|kg|ml|l|cl|dl)?\s*(?:de\s+)?/i);
  if (rangeM && rangeM[0].length < text.length) {
    return { qty: null, name: text.slice(rangeM[0].length).trim() };
  }
  const m = text.match(/^(\d+(?:[.,]\d+)?)\s*(gr|g|kg|ml|l|cl|dl)?\s*(?:de\s+)?/i);
  if (m && m[0].length < text.length) {
    const value = m[1];
    const unit = m[2] ? m[2].toLowerCase().replace('gr', 'g') : '';
    return {
      qty: unit ? `${value}${unit}` : value,
      name: text.slice(m[0].length).trim()
    };
  }
  return { qty: null, name: text.trim() };
}

export function extractShoppingIngredients(raw) {
  if (!raw || !raw.trim()) return [];
  // Strip leading bullet characters that the parser may not have caught when
  // there is no space between the bullet and the content (e.g. "-4 almendras")
  const trimmed = raw.trim().replace(/^[-•*]\s*/, '');
  const lower = trimmed.toLowerCase();

  for (const p of PROTECTED_PRODUCTS) {
    if (lower === p || lower.startsWith(p + ' ') || lower.startsWith(p + ',')) {
      return [{ name: capitalize(p), qty: null }];
    }
  }

  for (const [recipe, ingredients] of Object.entries(RECIPE_EXPANSIONS)) {
    if (lower === recipe || lower.startsWith(recipe + ' con ') || lower.startsWith(recipe + ' y ')) {
      const extraStr = lower.slice(recipe.length).replace(/^\s*(con|y)\s*/i, '').trim();
      const result = ingredients.map(i => ({ name: i, qty: null }));
      if (extraStr) {
        extraStr.split(/\s+(?:con|y)\s+/i).forEach(e => {
          const cleaned = stripCookingMethod(e.trim());
          if (cleaned) result.push({ name: capitalize(cleaned), qty: null });
        });
      }
      return result;
    }
  }

  const { qty, name: nameStr } = extractQtyAndName(trimmed);
  const lowerName = nameStr.toLowerCase();

  for (const prefix of RECIPE_PREFIXES) {
    if (lowerName.startsWith(prefix)) {
      const remainder = nameStr.slice(prefix.length).trim();
      const parts = remainder.split(/\s+(?:con|y)\s+/i)
        .map(p => stripCookingMethod(p.trim()))
        .filter(Boolean);
      if (parts.length > 0) return parts.map(p => ({ name: capitalize(p), qty: null }));
    }
  }

  if (/\s+con\s+/i.test(nameStr)) {
    const conParts = nameStr.split(/\s+con\s+/i);
    if (conParts.length > 1) {
      const result = [];
      for (const cp of conParts) {
        // Each part produced by "con" may itself be "X y Y" — split further
        // so compound right-hand expressions yield individual ingredients.
        for (const yp of cp.split(/\s+y\s+/i)) {
          const cleaned = stripCookingMethod(yp.trim());
          if (cleaned) result.push({ name: capitalize(cleaned), qty: null });
        }
      }
      return result;
    }
  }

  const cleanName = stripCookingMethod(nameStr);
  return cleanName ? [{ name: capitalize(cleanName), qty }] : [];
}

export function mergeShoppingIngredients(items) {
  const grouped = new Map();
  for (const item of items) {
    const key = normalizeIngredientKey(item.name);
    if (!grouped.has(key)) grouped.set(key, { name: item.name, qtys: [] });
    grouped.get(key).qtys.push(item.qty);
  }

  const result = [];
  for (const [, data] of grouped) {
    const qtys = data.qtys.filter(Boolean);
    let quantity;

    if (qtys.length === 0) {
      // No quantity info at all — show count only when more than one occurrence
      const count = data.qtys.length;
      quantity = count > 1 ? `${count}x` : null;
    } else {
      const parsed = qtys.map(q => {
        const m = q.match(/^(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|cl|dl)?$/i);
        if (!m) return null;
        const value = parseFloat(m[1].replace(',', '.'));
        if (!isFinite(value) || value < 0) return null;
        return { value, unit: (m[2] || '').toLowerCase().replace('gr', 'g') };
      }).filter(Boolean);

      if (parsed.length === qtys.length && parsed.length > 0) {
        const units = [...new Set(parsed.map(p => p.unit))];
        if (units.length === 1) {
          const total = Math.round(parsed.reduce((s, p) => s + p.value, 0) * 1000) / 1000;
          if (total > 0) {
            quantity = units[0]
              ? `${total}${units[0]}`
              : `${Math.round(total)}`;
          } else {
            quantity = null;
          }
        } else {
          // Incompatible units — drop quantity to avoid incorrect values
          quantity = null;
        }
      } else {
        // Some entries unparseable — use first valid raw value if positive
        const firstValid = qtys.find(q => {
          const m = q.match(/^(\d+(?:[.,]\d+)?)/);
          return m && parseFloat(m[1]) > 0;
        });
        quantity = firstValid ?? null;
      }
    }

    result.push({ name: data.name, quantity });
  }

  return result;
}

export function collectShoppingIngredients(mealsArray) {
  const allItems = [];
  for (const meal of mealsArray) {
    const sources = (meal.ingredients && meal.ingredients.length > 0)
      ? meal.ingredients
      : (meal.name ? [meal.name] : []);
    for (const src of sources) {
      allItems.push(...extractShoppingIngredients(src));
    }
  }
  return mergeShoppingIngredients(allItems);
}

// Applies a rename map produced by the shopping-normalizer edge function.
// Both "from" and "to" keys must exist in the input; invented names are rejected.
// When two items collapse to the same canonical name, the first item's quantity
// is kept; a missing quantity is filled from the second if the second has one.
export function applyNormalizationRenames(merged, rawMerges) {
  const nameSet = new Set(merged.map(i => i.name));
  const renames = {};
  for (const [from, to] of Object.entries(rawMerges)) {
    if (typeof to !== 'string') continue;
    if (!nameSet.has(from) || !nameSet.has(to) || from === to) continue;
    renames[from] = to;
  }

  if (Object.keys(renames).length === 0) return merged;

  const seen = new Map();
  for (const item of merged) {
    const canonical = renames[item.name] ?? item.name;
    const key = normalizeIngredientKey(canonical);
    if (!seen.has(key)) {
      seen.set(key, { name: canonical, quantity: item.quantity });
    } else {
      const existing = seen.get(key);
      if (!existing.quantity && item.quantity) existing.quantity = item.quantity;
    }
  }
  return [...seen.values()];
}
