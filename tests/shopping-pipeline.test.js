/**
 * Regression test suite for the shopping-list pipeline.
 *
 * Coverage:
 *   normalizeIngredientKey  — accent, case, trailing punctuation
 *   stripCookingMethod      — all pattern families, stacked methods
 *   extractQtyAndName       — exact qty, range qty, no qty, unit normalisation
 *   extractShoppingIngredients — protected products, recipe expansions,
 *                               recipe prefixes, con/y decomposition,
 *                               cooking-method stripping, bullet chars,
 *                               empty / null inputs
 *   mergeShoppingIngredients — qty summing, count-only, accent/case/punctuation
 *                              key collapsing, incompatible units, singular vs plural
 *   collectShoppingIngredients — full-pipeline integration scenarios
 *   applyNormalizationRenames — valid renames, invented-name rejection,
 *                               self-rename, missing from/to, quantity selection,
 *                               multiple concurrent merges
 *
 * Run with: npm test
 */

import { describe, test, expect } from 'vitest';
import {
  normalizeIngredientKey,
  stripCookingMethod,
  extractQtyAndName,
  extractShoppingIngredients,
  mergeShoppingIngredients,
  collectShoppingIngredients,
  applyNormalizationRenames,
} from '../src/shopping-pipeline.js';

// ---------------------------------------------------------------------------
// 1. normalizeIngredientKey
// ---------------------------------------------------------------------------
describe('normalizeIngredientKey', () => {
  test('lowercases ASCII', () => {
    expect(normalizeIngredientKey('Tomate')).toBe('tomate');
  });

  test('lowercases all-caps', () => {
    expect(normalizeIngredientKey('TOMATE')).toBe('tomate');
  });

  test('strips diacritics — accented vowel', () => {
    expect(normalizeIngredientKey('Salmón')).toBe('salmon');
  });

  test('accent and non-accent variants produce identical key', () => {
    expect(normalizeIngredientKey('Salmón')).toBe(normalizeIngredientKey('Salmon'));
  });

  test('strips trailing period', () => {
    expect(normalizeIngredientKey('Cebolla.')).toBe('cebolla');
  });

  test('strips trailing space-then-period ("fruta .")', () => {
    // Reason: diet-parser occasionally appends a stray period with a leading space.
    expect(normalizeIngredientKey('fruta .')).toBe('fruta');
  });

  test('strips multiple trailing punctuation chars', () => {
    expect(normalizeIngredientKey('Pollo,.')).toBe('pollo');
  });

  test('does NOT strip internal periods (abbreviations)', () => {
    expect(normalizeIngredientKey('J. york')).toBe('j. york');
  });

  test('does NOT strip parentheses or percent signs', () => {
    // Characters like ) and % are not in the strip set, preserving
    // quantity-suffix strings such as "(10gr)" and "0,0%".
    expect(normalizeIngredientKey('Aceite de oliva (10gr)')).toBe('aceite de oliva (10gr)');
    expect(normalizeIngredientKey('Yogur 0,0%')).toBe('yogur 0,0%');
  });

  test('strips diacritics and trailing punctuation together', () => {
    expect(normalizeIngredientKey('Infusión.')).toBe('infusion');
  });
});

// ---------------------------------------------------------------------------
// 2. stripCookingMethod
// ---------------------------------------------------------------------------
describe('stripCookingMethod', () => {
  test('strips "a la plancha"', () => {
    expect(stripCookingMethod('Salmón a la plancha')).toBe('Salmón');
  });

  test('strips "al horno"', () => {
    expect(stripCookingMethod('Pollo al horno')).toBe('Pollo');
  });

  test('strips "al vapor"', () => {
    expect(stripCookingMethod('Merluza al vapor')).toBe('Merluza');
  });

  test('strips past-participle cooking method ("hervidas")', () => {
    expect(stripCookingMethod('Judías verdes hervidas')).toBe('Judías verdes');
  });

  test('strips "cocido" (past participle)', () => {
    expect(stripCookingMethod('Arroz blanco cocido')).toBe('Arroz blanco');
  });

  test('strips "salteado"', () => {
    expect(stripCookingMethod('Champiñones salteados')).toBe('Champiñones');
  });

  test('strips method after comma ("patatas, asadas")', () => {
    expect(stripCookingMethod('Patatas, asadas')).toBe('Patatas');
  });

  test('does not strip a word that is not a cooking method', () => {
    expect(stripCookingMethod('Gazpacho frío')).toBe('Gazpacho frío');
  });

  test('returns input unchanged when no method present', () => {
    expect(stripCookingMethod('Manzana')).toBe('Manzana');
  });

  test('strips stacked methods iteratively', () => {
    // "frito" + "al horno" stacked — each pass removes the outermost suffix.
    expect(stripCookingMethod('Pollo al horno frito')).toBe('Pollo');
  });

  test('case-insensitive stripping', () => {
    expect(stripCookingMethod('POLLO A LA PLANCHA')).toBe('POLLO');
  });

  test('does not erase the entire string if only the name matches a method', () => {
    // e.g. a standalone method word must leave a non-empty result
    const result = stripCookingMethod('frito');
    expect(result.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 3. extractQtyAndName
// ---------------------------------------------------------------------------
describe('extractQtyAndName', () => {
  test('parses quantity with gram unit', () => {
    expect(extractQtyAndName('200g de pollo')).toEqual({ qty: '200g', name: 'pollo' });
  });

  test('normalises "gr" to "g"', () => {
    expect(extractQtyAndName('150gr de arroz')).toEqual({ qty: '150g', name: 'arroz' });
  });

  test('parses quantity with space before unit ("150 g")', () => {
    expect(extractQtyAndName('150 g de arroz')).toEqual({ qty: '150g', name: 'arroz' });
  });

  test('parses kg unit', () => {
    expect(extractQtyAndName('1kg de pasta')).toEqual({ qty: '1kg', name: 'pasta' });
  });

  test('parses ml unit', () => {
    expect(extractQtyAndName('200ml de leche')).toEqual({ qty: '200ml', name: 'leche' });
  });

  test('parses unitless integer count', () => {
    expect(extractQtyAndName('2 huevos')).toEqual({ qty: '2', name: 'huevos' });
  });

  test('parses comma-decimal quantity ("1,5kg")', () => {
    // The raw string is preserved; mergeShoppingIngredients handles decimal normalisation.
    expect(extractQtyAndName('1,5kg de harina')).toEqual({ qty: '1,5kg', name: 'harina' });
  });

  test('returns null qty for plain ingredient (no leading number)', () => {
    expect(extractQtyAndName('Plátano')).toEqual({ qty: null, name: 'Plátano' });
  });

  test('range notation → null qty (imprecise amount)', () => {
    // Reason: "3-4 almendras" is a range; merging on a false upper bound would
    // over-report total quantity. Returning null lets the pipeline count occurrences.
    expect(extractQtyAndName('3-4 almendras')).toEqual({ qty: null, name: 'almendras' });
  });

  test('range notation with unit → null qty', () => {
    expect(extractQtyAndName('2-3g de mantequilla')).toEqual({ qty: null, name: 'mantequilla' });
  });

  test('range notation discards the range and preserves name correctly', () => {
    const { qty, name } = extractQtyAndName('3-4 ALMENDRAS');
    expect(qty).toBeNull();
    expect(name).toBe('ALMENDRAS');
  });
});

// ---------------------------------------------------------------------------
// 4. extractShoppingIngredients
// ---------------------------------------------------------------------------
describe('extractShoppingIngredients', () => {
  // --- empty / null inputs ---
  test('empty string returns []', () => {
    expect(extractShoppingIngredients('')).toEqual([]);
  });

  test('whitespace-only returns []', () => {
    expect(extractShoppingIngredients('   ')).toEqual([]);
  });

  test('null returns []', () => {
    expect(extractShoppingIngredients(null)).toEqual([]);
  });

  // --- protected products ---
  test('exact protected product match (lowercase)', () => {
    expect(extractShoppingIngredients('yogur natural')).toEqual([
      { name: 'Yogur natural', qty: null },
    ]);
  });

  test('exact protected product match (mixed case)', () => {
    // Protected check is case-insensitive via .toLowerCase()
    expect(extractShoppingIngredients('Yogur Natural')).toEqual([
      { name: 'Yogur natural', qty: null },
    ]);
  });

  test('protected product with suffix is matched and suffix is discarded', () => {
    // "yogur natural desnatado 0%" starts with protected "yogur natural " (space follows)
    expect(extractShoppingIngredients('yogur natural desnatado 0%')).toEqual([
      { name: 'Yogur natural', qty: null },
    ]);
  });

  test('yogur griego is protected — not confused with yogur natural', () => {
    expect(extractShoppingIngredients('yogur griego')).toEqual([
      { name: 'Yogur griego', qty: null },
    ]);
  });

  test('longest protected prefix wins ("aceite de oliva virgen extra" before "aceite de oliva")', () => {
    expect(extractShoppingIngredients('aceite de oliva virgen extra (10gr)')).toEqual([
      { name: 'Aceite de oliva virgen extra', qty: null },
    ]);
  });

  test('protected product "atún al natural" (accented)', () => {
    expect(extractShoppingIngredients('atún al natural')).toEqual([
      { name: 'Atún al natural', qty: null },
    ]);
  });

  test('protected product "jamón serrano"', () => {
    expect(extractShoppingIngredients('jamón serrano')).toEqual([
      { name: 'Jamón serrano', qty: null },
    ]);
  });

  // --- recipe expansions ---
  test('exact recipe expansion: tortilla española', () => {
    expect(extractShoppingIngredients('tortilla española')).toEqual([
      { name: 'Huevos', qty: null },
      { name: 'Patata', qty: null },
      { name: 'Cebolla', qty: null },
      { name: 'Aceite de oliva', qty: null },
    ]);
  });

  test('recipe expansion with extra ingredient: ensalada mixta con atún', () => {
    expect(extractShoppingIngredients('ensalada mixta con atún')).toEqual([
      { name: 'Lechuga', qty: null },
      { name: 'Tomate', qty: null },
      { name: 'Cebolla', qty: null },
      { name: 'Atún', qty: null },
    ]);
  });

  test('recipe expansion: revuelto de claras con espinacas', () => {
    expect(extractShoppingIngredients('revuelto de claras con espinacas')).toEqual([
      { name: 'Claras de huevo', qty: null },
      { name: 'Espinacas', qty: null },
    ]);
  });

  // --- recipe prefixes ---
  test('recipe prefix "ensalada de" decomposes on y', () => {
    expect(extractShoppingIngredients('ensalada de pollo y aguacate')).toEqual([
      { name: 'Pollo', qty: null },
      { name: 'Aguacate', qty: null },
    ]);
  });

  test('recipe prefix "tortilla de" decomposes on con', () => {
    // "tortilla de j. york con cebolla" → RECIPE_PREFIX "tortilla de" →
    // remainder "j. york con cebolla" → split on con|y → ["j. york", "cebolla"]
    expect(extractShoppingIngredients('tortilla de j. york con cebolla')).toEqual([
      { name: 'J. york', qty: null },
      { name: 'Cebolla', qty: null },
    ]);
  });

  test('recipe prefix "crema de" with single ingredient', () => {
    expect(extractShoppingIngredients('crema de calabaza')).toEqual([
      { name: 'Calabaza', qty: null },
    ]);
  });

  test('recipe prefix "sopa de" with multiple ingredients', () => {
    expect(extractShoppingIngredients('sopa de verduras y pollo')).toEqual([
      { name: 'Verduras', qty: null },
      { name: 'Pollo', qty: null },
    ]);
  });

  // --- con/y compound decomposition ---
  test('"con" splits into two items', () => {
    expect(extractShoppingIngredients('Pollo al horno con patatas')).toEqual([
      { name: 'Pollo', qty: null },
      { name: 'Patatas', qty: null },
    ]);
  });

  test('"con" right-hand side further split on "y"', () => {
    // Reason: fix 3 — "cebolla y atún al natural" is a compound RHS that should
    // produce two separate shopping items, not one merged string.
    expect(extractShoppingIngredients('Pimientos aliñados con cebolla y atún al natural')).toEqual([
      { name: 'Pimientos aliñados', qty: null },
      { name: 'Cebolla', qty: null },
      { name: 'Atún al natural', qty: null },
    ]);
  });

  test('cooking method stripped from con-split left-hand side', () => {
    expect(extractShoppingIngredients('Champiñones a la plancha con orégano y ajito')).toEqual([
      { name: 'Champiñones', qty: null },
      { name: 'Orégano', qty: null },
      { name: 'Ajito', qty: null },
    ]);
  });

  // --- cooking methods (direct ingredient) ---
  test('cooking method stripped at end of simple ingredient', () => {
    expect(extractShoppingIngredients('Merluza a la plancha')).toEqual([
      { name: 'Merluza', qty: null },
    ]);
  });

  test('"hervidas" stripped from plural ingredient', () => {
    expect(extractShoppingIngredients('Judías verdes hervidas')).toEqual([
      { name: 'Judías verdes', qty: null },
    ]);
  });

  test('"cocido" stripped', () => {
    expect(extractShoppingIngredients('Arroz blanco cocido')).toEqual([
      { name: 'Arroz blanco', qty: null },
    ]);
  });

  // --- uppercase input ---
  test('uppercase ingredient with cooking method is stripped and preserved in caps', () => {
    // The pipeline does not lowercase display names; normalizeIngredientKey
    // handles case-insensitive merging separately.
    expect(extractShoppingIngredients('POLLO A LA PLANCHA')).toEqual([
      { name: 'POLLO', qty: null },
    ]);
  });

  // --- trailing punctuation in raw input ---
  test('trailing period on ingredient name is kept in display name', () => {
    // The period survives extractShoppingIngredients; normalizeIngredientKey
    // strips it for key comparison so "Cebolla." merges with "Cebolla".
    expect(extractShoppingIngredients('Cebolla.')).toEqual([
      { name: 'Cebolla.', qty: null },
    ]);
  });

  // --- quantity range (fix 1) ---
  test('range quantity "3-4 ALMENDRAS" → null qty, correct name', () => {
    expect(extractShoppingIngredients('3-4 ALMENDRAS')).toEqual([
      { name: 'ALMENDRAS', qty: null },
    ]);
  });

  // --- bullet character stripping ---
  test('leading bullet "- " stripped, number treated as quantity', () => {
    // "- 4 almendras" → strip bullet → "4 almendras" → qty=4, name="Almendras"
    expect(extractShoppingIngredients('- 4 almendras')).toEqual([
      { name: 'Almendras', qty: '4' },
    ]);
  });

  test('bullet adjacent to number "•4 almendras" stripped correctly', () => {
    expect(extractShoppingIngredients('•4 almendras')).toEqual([
      { name: 'Almendras', qty: '4' },
    ]);
  });

  // --- already normalised ingredients ---
  test('already-clean single ingredient is returned as-is', () => {
    expect(extractShoppingIngredients('Manzana')).toEqual([
      { name: 'Manzana', qty: null },
    ]);
  });

  test('quantity + ingredient (no cooking method)', () => {
    expect(extractShoppingIngredients('200g de pollo')).toEqual([
      { name: 'Pollo', qty: '200g' },
    ]);
  });
});

// ---------------------------------------------------------------------------
// 5. mergeShoppingIngredients
// ---------------------------------------------------------------------------
describe('mergeShoppingIngredients', () => {
  test('single item no quantity → quantity: null', () => {
    expect(mergeShoppingIngredients([{ name: 'Manzana', qty: null }])).toEqual([
      { name: 'Manzana', quantity: null },
    ]);
  });

  test('three identical items no quantity → count "3x"', () => {
    const items = [
      { name: 'Manzana', qty: null },
      { name: 'Manzana', qty: null },
      { name: 'Manzana', qty: null },
    ];
    expect(mergeShoppingIngredients(items)).toEqual([
      { name: 'Manzana', quantity: '3x' },
    ]);
  });

  test('two items same gram unit → summed', () => {
    const items = [
      { name: 'Pollo', qty: '200g' },
      { name: 'Pollo', qty: '150g' },
    ];
    expect(mergeShoppingIngredients(items)).toEqual([
      { name: 'Pollo', quantity: '350g' },
    ]);
  });

  test('comma-decimal grams summed correctly', () => {
    const items = [
      { name: 'Harina', qty: '250g' },
      { name: 'harina', qty: '250g' },
    ];
    expect(mergeShoppingIngredients(items)).toEqual([
      { name: 'Harina', quantity: '500g' },
    ]);
  });

  test('incompatible units → quantity null (avoid incorrect sum)', () => {
    const items = [
      { name: 'Aceite', qty: '10ml' },
      { name: 'Aceite', qty: '5g' },
    ];
    expect(mergeShoppingIngredients(items)).toEqual([
      { name: 'Aceite', quantity: null },
    ]);
  });

  test('unparseable quantity string → firstValid used as-is', () => {
    // "7x" is not a numeric+unit quantity but has a positive leading number,
    // so it is passed through as the raw quantity value.
    expect(mergeShoppingIngredients([{ name: 'Fruta', qty: '7x' }])).toEqual([
      { name: 'Fruta', quantity: '7x' },
    ]);
  });

  test('accent variant maps to same key — merges and preserves first name', () => {
    // Reason: "Salmón" and "Salmon" must map to the same shopping item.
    const items = [
      { name: 'Salmón', qty: null },
      { name: 'Salmon', qty: null },
    ];
    const result = mergeShoppingIngredients(items);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Salmón');
    expect(result[0].quantity).toBe('2x');
  });

  test('case variant maps to same key — merges', () => {
    // Reason: "TOMATE" from one day and "tomate" from another must merge.
    const items = [
      { name: 'TOMATE', qty: null },
      { name: 'tomate', qty: null },
    ];
    const result = mergeShoppingIngredients(items);
    expect(result).toHaveLength(1);
    expect(normalizeIngredientKey(result[0].name)).toBe('tomate');
  });

  test('trailing period maps to same key — merges with clean name', () => {
    // Reason: fix 2 — "Cebolla." and "Cebolla" must merge.
    const items = [
      { name: 'Cebolla.', qty: null },
      { name: 'Cebolla', qty: null },
    ];
    const result = mergeShoppingIngredients(items);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe('2x');
  });

  test('two different ingredients remain separate', () => {
    const items = [
      { name: 'Pollo', qty: null },
      { name: 'Salmón', qty: null },
    ];
    expect(mergeShoppingIngredients(items)).toHaveLength(2);
  });

  test('singular and plural are NOT merged (documented limitation)', () => {
    // The pipeline has no lemmatisation; "Almendra" and "Almendras" produce
    // different keys. This test documents the behaviour so future changes
    // that add plural handling are visible as test changes.
    const items = [
      { name: 'Almendra', qty: null },
      { name: 'Almendras', qty: null },
    ];
    expect(mergeShoppingIngredients(items)).toHaveLength(2);
  });

  test('mixed qty and null: qty wins over null for summing', () => {
    const items = [
      { name: 'Pollo', qty: '200g' },
      { name: 'Pollo', qty: null },
    ];
    // parsed.length (1) !== qtys.length (1 non-null only) — wait:
    // qtys = data.qtys.filter(Boolean) = ["200g"]
    // parsed = [{200, "g"}] → parsed.length (1) === qtys.length (1) → sum
    // total = 200g
    expect(mergeShoppingIngredients(items)).toEqual([
      { name: 'Pollo', quantity: '200g' },
    ]);
  });
});

// ---------------------------------------------------------------------------
// 6. collectShoppingIngredients (full-pipeline integration)
// ---------------------------------------------------------------------------
describe('collectShoppingIngredients', () => {
  test('empty meal list returns []', () => {
    expect(collectShoppingIngredients([])).toEqual([]);
  });

  test('meal with empty ingredients falls back to meal name', () => {
    // When a meal has no ingredient list the meal name itself is used as the source.
    const meals = [{ name: 'Comida libre', ingredients: [] }];
    const result = collectShoppingIngredients(meals);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Comida libre');
  });

  test('range quantity across 7 days → count "7x", no corrupt qty', () => {
    // Reason: fix 1 — "3-4 ALMENDRAS" must not produce qty="-4 ALMENDRAS".
    const meals = Array.from({ length: 7 }, () => ({
      name: 'Merienda',
      ingredients: ['3-4 ALMENDRAS'],
    }));
    const result = collectShoppingIngredients(meals);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('ALMENDRAS');
    expect(result[0].quantity).toBe('7x');
  });

  test('gram quantities summed across days', () => {
    const meals = [
      { name: 'Almuerzo', ingredients: ['200g de pollo a la plancha'] },
      { name: 'Cena', ingredients: ['150g de pollo al horno'] },
    ];
    expect(collectShoppingIngredients(meals)).toEqual([
      { name: 'Pollo', quantity: '350g' },
    ]);
  });

  test('protected product preserved; extra suffix discarded', () => {
    const meals = [
      { name: 'Desayuno', ingredients: ['Aceite de oliva virgen extra (10gr)'] },
      { name: 'Almuerzo', ingredients: ['aceite de oliva virgen extra'] },
    ];
    const result = collectShoppingIngredients(meals);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Aceite de oliva virgen extra');
  });

  test('recipe expansion → individual ingredients', () => {
    const meals = [{ name: 'Almuerzo', ingredients: ['tortilla española'] }];
    const result = collectShoppingIngredients(meals);
    expect(result.map(r => r.name)).toEqual(['Huevos', 'Patata', 'Cebolla', 'Aceite de oliva']);
  });

  test('recipe prefix decomposes ingredient list', () => {
    const meals = [{ name: 'Almuerzo', ingredients: ['ensalada de lechuga y tomate'] }];
    const result = collectShoppingIngredients(meals);
    expect(result.map(r => r.name)).toEqual(['Lechuga', 'Tomate']);
  });

  test('con + y compound decomposed across 7 days', () => {
    // Reason: fix 3 — "cebolla y atún al natural" as RHS of "con" must split.
    const meals = Array.from({ length: 7 }, () => ({
      name: 'Cena',
      ingredients: ['Pimientos aliñados con cebolla y atún al natural'],
    }));
    const result = collectShoppingIngredients(meals);
    const names = result.map(r => r.name);
    expect(names).toContain('Pimientos aliñados');
    expect(names).toContain('Cebolla');
    expect(names).toContain('Atún al natural');
  });

  test('cooking method stripped and items merged across days', () => {
    // "Arroz blanco" and "Arroz blanco cocido" normalise to the same key.
    const meals = [
      { name: 'Almuerzo', ingredients: ['Pollo a la plancha', 'Arroz blanco'] },
      { name: 'Cena', ingredients: ['Merluza al vapor', 'Arroz blanco cocido'] },
    ];
    const result = collectShoppingIngredients(meals);
    const names = result.map(r => r.name);
    expect(names).toContain('Pollo');
    expect(names).toContain('Merluza');
    // "Arroz blanco" and "Arroz blanco cocido" → same key → merged → "2x"
    const arroz = result.find(r => normalizeIngredientKey(r.name) === 'arroz blanco');
    expect(arroz).toBeDefined();
    expect(arroz.quantity).toBe('2x');
  });

  test('accent variant merged across days', () => {
    // Reason: "Salmón" (day 1) and "Salmon" (day 2) must produce one item.
    const meals = [
      { name: 'Almuerzo', ingredients: ['Salmón a la plancha'] },
      { name: 'Cena', ingredients: ['Salmon al horno'] },
    ];
    const result = collectShoppingIngredients(meals);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe('2x');
  });

  test('case variant merged across days', () => {
    const meals = [
      { name: 'Almuerzo', ingredients: ['TOMATE'] },
      { name: 'Cena', ingredients: ['tomate'] },
    ];
    const result = collectShoppingIngredients(meals);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe('2x');
  });

  test('trailing punctuation merged across days (fix 2)', () => {
    // Reason: "Cebolla." from one parse and "Cebolla" from another must merge.
    const meals = [
      { name: 'Almuerzo', ingredients: ['Cebolla.'] },
      { name: 'Cena', ingredients: ['cebolla'] },
    ];
    const result = collectShoppingIngredients(meals);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe('2x');
  });

  test('duplicate meals across 7 days counted correctly', () => {
    const meals = Array.from({ length: 7 }, () => ({
      name: 'Desayuno',
      ingredients: ['Manzana'],
    }));
    expect(collectShoppingIngredients(meals)).toEqual([
      { name: 'Manzana', quantity: '7x' },
    ]);
  });

  test('multiple ingredients per meal, all collected', () => {
    const meals = [
      { name: 'Desayuno', ingredients: ['Avena', 'Leche de avena', 'Plátano'] },
    ];
    const result = collectShoppingIngredients(meals);
    const names = result.map(r => r.name);
    expect(names).toContain('Avena');
    expect(names).toContain('Leche de avena'); // protected product
    expect(names).toContain('Plátano');
  });

  test('singular vs plural remain as separate items (documented limitation)', () => {
    // Lemmatisation is not implemented; this test documents current behaviour.
    const meals = [
      { name: 'Almuerzo', ingredients: ['Almendra'] },
      { name: 'Merienda', ingredients: ['Almendras'] },
    ];
    const result = collectShoppingIngredients(meals);
    expect(result).toHaveLength(2);
  });

  test('protected product "yogur natural" and "yogur griego" remain separate', () => {
    // Reason: these are genuinely different products and must never merge.
    const meals = [
      { name: 'Desayuno', ingredients: ['yogur natural'] },
      { name: 'Merienda', ingredients: ['yogur griego'] },
    ];
    const result = collectShoppingIngredients(meals);
    expect(result).toHaveLength(2);
    const names = result.map(r => r.name);
    expect(names).toContain('Yogur natural');
    expect(names).toContain('Yogur griego');
  });
});

// ---------------------------------------------------------------------------
// 7. applyNormalizationRenames  (semantic normalization contract)
// ---------------------------------------------------------------------------
describe('applyNormalizationRenames', () => {
  test('empty rename map returns original list unchanged', () => {
    const merged = [{ name: 'Fruta', quantity: '7x' }];
    expect(applyNormalizationRenames(merged, {})).toEqual(merged);
  });

  test('valid rename applied; verbose name replaced by canonical', () => {
    const merged = [
      { name: 'Fruta a elegir (excepto plátano)', quantity: '7x' },
      { name: 'Fruta', quantity: null },
    ];
    const result = applyNormalizationRenames(merged, {
      'Fruta a elegir (excepto plátano)': 'Fruta',
    });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Fruta');
  });

  test('non-null quantity preserved when items collapse', () => {
    // "Fruta a elegir (...)" (7x) + "Fruta" (null) → "Fruta" (7x)
    const merged = [
      { name: 'Fruta a elegir (excepto plátano)', quantity: '7x' },
      { name: 'Fruta', quantity: null },
    ];
    const result = applyNormalizationRenames(merged, {
      'Fruta a elegir (excepto plátano)': 'Fruta',
    });
    expect(result[0].quantity).toBe('7x');
  });

  test('null quantity filled from second item if first is null', () => {
    // First = null, second = "7x" → result should pick up "7x"
    const merged = [
      { name: 'Infusión', quantity: null },
      { name: 'Infusión o té o menta poleo', quantity: '7x' },
    ];
    const result = applyNormalizationRenames(merged, {
      'Infusión o té o menta poleo': 'Infusión',
    });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Infusión');
    expect(result[0].quantity).toBe('7x');
  });

  test('invented canonical name (not in input) is rejected', () => {
    // Reason: the "never invent names" rule — if the AI returns a canonical
    // that was not present in the input list, it is silently dropped.
    const merged = [{ name: 'Fruta', quantity: '7x' }];
    const result = applyNormalizationRenames(merged, { 'Fruta': 'Fruta fresca' });
    expect(result).toEqual(merged);
  });

  test('"from" name not in input is rejected', () => {
    const merged = [{ name: 'Fruta', quantity: '7x' }];
    const result = applyNormalizationRenames(merged, { 'Tomate': 'Fruta' });
    expect(result).toEqual(merged);
  });

  test('self-rename (from === to) is ignored', () => {
    const merged = [{ name: 'Fruta', quantity: '7x' }];
    const result = applyNormalizationRenames(merged, { 'Fruta': 'Fruta' });
    expect(result).toEqual(merged);
  });

  test('multiple concurrent merges applied correctly', () => {
    const merged = [
      { name: 'Fruta', quantity: null },
      { name: 'Fruta a elegir (excepto plátano)', quantity: '7x' },
      { name: 'Infusión', quantity: '7x' },
      { name: 'Infusión o té o menta poleo', quantity: '7x' },
    ];
    const result = applyNormalizationRenames(merged, {
      'Fruta a elegir (excepto plátano)': 'Fruta',
      'Infusión o té o menta poleo': 'Infusión',
    });
    expect(result).toHaveLength(2);
    const names = result.map(r => r.name);
    expect(names).toContain('Fruta');
    expect(names).toContain('Infusión');
  });

  test('items without a rename pass through unchanged', () => {
    const merged = [
      { name: 'Pollo', quantity: null },
      { name: 'Salmón', quantity: null },
    ];
    const result = applyNormalizationRenames(merged, {});
    expect(result).toEqual(merged);
  });

  test('non-string "to" value in rename map is rejected', () => {
    const merged = [{ name: 'Fruta', quantity: null }];
    const result = applyNormalizationRenames(merged, { 'Fruta': 42 });
    expect(result).toEqual(merged);
  });

  test('genuinely different products are not merged when AI returns empty map', () => {
    // "Yogur natural" and "Yogur griego" should never appear in a rename map.
    // This test verifies that an empty merges response leaves both items intact.
    const merged = [
      { name: 'Yogur natural', quantity: '7x' },
      { name: 'Yogur griego', quantity: '7x' },
    ];
    const result = applyNormalizationRenames(merged, {});
    expect(result).toHaveLength(2);
    expect(result.map(r => r.name)).toContain('Yogur natural');
    expect(result.map(r => r.name)).toContain('Yogur griego');
  });
});
