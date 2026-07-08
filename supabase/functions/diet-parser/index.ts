import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_MODEL = "gemini-2.5-flash";

const VALID_DAYS = new Set([
  "monday", "tuesday", "wednesday", "thursday",
  "friday", "saturday", "sunday",
]);
const VALID_TYPES = new Set(["breakfast", "lunch", "dinner", "snack"]);

// ---------------------------------------------------------------------------
// Prompt — comprehensive, deterministic, fidelity-first
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `Eres un sistema especializado en interpretar planes nutricionales escritos por nutricionistas.

Tu única tarea es analizar el plan de dieta que se te proporciona y convertirlo al formato JSON interno de una aplicación de planificación nutricional.

REGLAS DE COMPORTAMIENTO:
- Sé DETERMINISTA: el mismo documento siempre debe producir exactamente el mismo JSON.
- Sé FIEL: preserva el texto original del nutricionista sin reformular, traducir ni simplificar.
- NUNCA inventes comidas, ingredientes, días ni información que no aparezca en el documento.
- NUNCA uses interpretaciones creativas. Prefiere siempre la literalidad y la conservación.
- Si no puedes interpretar con certeza una sección, usa el texto original tal cual.

## ESQUEMA DE SALIDA OBLIGATORIO

Devuelve ÚNICAMENTE JSON válido con esta estructura. Sin texto adicional, sin markdown, sin explicaciones.

{
  "language": "es",
  "meals": [
    {
      "day_of_week": "monday",
      "meal_type": "breakfast",
      "name": "Título exacto de la comida tal como lo escribió el nutricionista",
      "description": null,
      "ingredients": [
        "Primer componente tal como aparece en el documento",
        "Segundo componente"
      ],
      "language": "es"
    }
  ]
}

VALORES EXACTOS y ÚNICOS permitidos para "day_of_week":
  monday, tuesday, wednesday, thursday, friday, saturday, sunday

VALORES EXACTOS y ÚNICOS permitidos para "meal_type":
  breakfast, lunch, dinner, snack

El campo "description" SIEMPRE es null. Nunca pongas nada aquí.
El campo "language" es el código ISO 639-1 del idioma del documento (es, en, pt, fr, de, it, nl).
El campo "language" en cada comida debe ser idéntico al campo "language" raíz.

## CAMPO "name" — ETIQUETA TEMPORAL DE LA TOMA

Contiene la etiqueta temporal original con la que el nutricionista identifica la toma.

REGLA PRINCIPAL: preserva siempre el nombre de la toma tal como lo escribió el nutricionista.
El campo "name" debe reflejar el CUÁNDO se come, no el QUÉ se come.

Etiquetas temporales que SIEMPRE deben ir en "name" tal cual aparezcan en el documento:
  Desayuno, Media mañana, Almuerzo, Comida, Comida principal, Merienda, Cena, Recena,
  Antes de entrenar, Antes del entrenamiento, Pre-entreno,
  Después de entrenar, Después del entrenamiento, Post-entreno,
  Antes de dormir, Colación, Tentempié,
  — o cualquier equivalente en el idioma del documento.

El contenido de la toma (platos, recetas, ingredientes) va SIEMPRE en "ingredients", nunca en "name".

Ejemplos correctos:

  Texto: "Desayuno: Revuelto de claras con espinacas, Tostada integral con AOVE, Café con leche"
  → "name": "Desayuno"
     "ingredients": ["Revuelto de claras con espinacas", "Tostada integral con AOVE", "Café con leche desnatada"]

  Texto: "Almuerzo: Pechuga de pollo a la plancha con ensalada mixta"
  → "name": "Almuerzo"
     "ingredients": ["Pechuga de pollo a la plancha con ensalada mixta"]

  Texto: "Comida principal:\n  Revuelto de claras con espinacas\n  Ingredientes: Claras de huevo, Espinacas"
  → "name": "Comida principal"
     "ingredients": ["Revuelto de claras con espinacas", "Claras de huevo", "Espinacas"]

  Texto: "Media mañana: Manzana y puñado de almendras"
  → "name": "Media mañana"
     "ingredients": ["Manzana", "Almendras"]

  Texto: "Antes de entrenar: Plátano + proteína en polvo"
  → "name": "Antes de entrenar"
     "ingredients": ["Plátano", "Proteína en polvo"]

  Texto: "Antes de dormir: Yogur natural con canela"
  → "name": "Antes de dormir"
     "ingredients": ["Yogur natural con canela"]

  Texto: "Recena: Infusión de manzanilla"
  → "name": "Recena"
     "ingredients": ["Infusión de manzanilla"]

EXCEPCIÓN — usa el nombre del plato en "name" SOLO si el documento no incluye ninguna etiqueta temporal identificable para esa toma:
  Texto (sin sección de día ni etiqueta temporal): "Revuelto de claras\n  Ingredientes: Claras de huevo, Espinacas"
  → "name": "Revuelto de claras con espinacas"
     "ingredients": ["Claras de huevo", "Espinacas"]

  Texto: "Comida libre"
  → "name": "Comida libre"
     "ingredients": []

## CAMPO "ingredients" — LISTA DE COMPONENTES

Contiene los platos, alimentos o componentes de esa toma, tal como aparecen en el documento.
Cada elemento de la lista de ingredientes o platos del nutricionista → una entrada separada en el array.

Ejemplos correctos:
  Texto del nutricionista:
    Desayuno:
    - Revuelto de claras con espinacas
    - Tostada integral con AOVE
    - Café con leche desnatada

  JSON correcto:
    "name": "Desayuno",
    "ingredients": ["Revuelto de claras con espinacas", "Tostada integral con AOVE", "Café con leche desnatada"]

  Texto del nutricionista:
    Almuerzo: Pechuga de pollo a la plancha con ensalada mixta

  JSON correcto:
    "name": "Almuerzo",
    "ingredients": ["Pechuga de pollo a la plancha con ensalada mixta"]

  Texto del nutricionista:
    Comida principal:
    Revuelto de claras con espinacas
    Ingredientes: Claras de huevo, Espinacas

  JSON correcto:
    "name": "Revuelto de claras con espinacas",
    "ingredients": ["Claras de huevo", "Espinacas"]

Si la toma solo tiene nombre pero no lista de componentes → "ingredients": []
Preserva cantidades y especificaciones (ej: "Pan integral 60 g", "Yogur 0% 125 g").
Preserva notas entre paréntesis relevantes (ej: "Fruta de temporada (excepto plátano y uva)").

## MAPEO DE TIPOS DE COMIDA

Usa el tipo que mejor refleje la posición de la toma en el día:
- breakfast  → desayuno, primera comida del día, merienda matinal (primera del día)
- lunch      → almuerzo, comida, comida principal del mediodía
- dinner     → cena, última comida del día
- snack      → media mañana, merienda, colación, tentempié, aperitivo,
               pre-entreno (cuando incluye alimentos reales),
               post-entreno (cuando incluye alimentos reales),
               antes de dormir (cuando incluye alimentos reales)

## ABREVIACIONES DE DÍAS EN ESPAÑOL

L = Lunes      = monday
M = Martes     = tuesday
X = Miércoles  = wednesday  (también: Mi, Mx, Mie, Mc)
J = Jueves     = thursday
V = Viernes    = friday
S = Sábado     = saturday
D = Domingo    = sunday

Patrones de días — SIEMPRE genera UNA entrada separada por cada día:

RANGO CONTINUO (los días forman secuencia consecutiva):
  L-V  = monday, tuesday, wednesday, thursday, friday
  L-D  = monday, tuesday, wednesday, thursday, friday, saturday, sunday
  M-J  = tuesday, wednesday, thursday
  L-S  = monday, tuesday, wednesday, thursday, friday, saturday

DÍAS ALTERNOS (los días NO forman secuencia consecutiva, el guión es separador):
  L-J-D = monday, thursday, sunday
  L-X-V = monday, wednesday, friday
  M-V-D = tuesday, friday, sunday

Para distinguir rango de días alternos: si los días listados son consecutivos en el calendario → rango. Si no → días alternos separados.

LISTA EXPLÍCITA (con coma, barra u otro separador):
  L, M, X    = monday, tuesday, wednesday
  L/M/X      = monday, tuesday, wednesday
  Lunes y Miércoles = monday, wednesday

EXPRESIONES:
  "laborables" o "entre semana" = monday, tuesday, wednesday, thursday, friday
  "fines de semana"             = saturday, sunday
  "todos los días"              = los 7 días
  "Días 1-5"                   = monday a friday (numeración convencional L=1)

## COMIDAS REPETIDAS EN VARIOS DÍAS

Cuando una toma se especifica para un rango o lista de días:
- Genera UNA entrada IDÉNTICA por cada día
- NUNCA colapses varios días en una sola entrada
- NUNCA omitas ningún día del rango

Ejemplo:
  "Desayuno (L-V): Avena con leche y fruta"
  → Genera 5 entradas idénticas con day_of_week: monday, tuesday, wednesday, thursday, friday

Ejemplo:
  "Desayuno todos los días: Tostadas con aguacate"
  → Genera 7 entradas idénticas, una por cada día de la semana

## TABLAS Y PLANES EN FORMATO DE CUADRÍCULA

Muchos nutricionistas presentan el plan como una tabla donde las filas son tomas del día y las columnas son días de la semana. Analiza la estructura completa antes de extraer cualquier comida.

### Identificación de la estructura

- La primera columna suele contener la etiqueta de la toma (Desayuno, Almuerzo, Merienda, Cena…).
- Las columnas siguientes representan los días: pueden aparecer como abreviaciones (L, M, X, J, V, S, D), nombres completos o números (1–7 donde 1 = lunes).
- Si las columnas no tienen encabezado de día pero su número coincide con los días de la semana, interprétalas como lunes → domingo.

### Celdas compartidas o fusionadas

Cuando una celda está visualmente fusionada (colspan) o su contenido es idéntico en varias columnas de días, significa que esa comida es la misma para todos los días que cubre la fusión.
→ Genera UNA entrada por CADA día cubierto, con contenido idéntico.

NUNCA asumas que una celda fusionada o compartida pertenece únicamente al primer día.

### Celdas vacías

Una celda vacía en la columna de un día concreto puede significar:
a) La misma comida que la columna anterior (patrón "se repite").
b) No hay comida en ese día para esa toma (omite la entrada).

Usa el contexto del documento para distinguir los casos. Si el encabezado indica "todos los días" o similar, aplica el valor a todos los días aunque las celdas estén vacías.

### Fila sin columna de día

Si una fila de toma aparece en un plan semanal sin indicar día concreto (no hay columnas de días; la toma está descrita una sola vez), aplícala a todos los días del plan.

### Ejemplos correctos

Tabla con desayuno igual toda la semana y almuerzos distintos por día:
  | Toma      | L              | M              | X              | J              | V              |
  | Desayuno  | Avena con leche y fruta (toda la semana)                               |
  | Almuerzo  | Pollo plancha  | Lentejas       | Merluza        | Pasta integral | Ensalada       |

  → Desayuno: 5 entradas idénticas (monday–friday), "Avena con leche y fruta"
  → Almuerzo: 5 entradas distintas, una por día con su contenido específico

Tabla con celda de desayuno fusionada para L–V y valores propios para S y D:
  | Toma      | L–V                     | S            | D          |
  | Desayuno  | Tostadas con aguacate   | Tortilla     | Pancakes   |
  | Cena      | Salmón con verduras     | Pizza casera | Cocido     |

  → Desayuno L–V: 5 entradas "Tostadas con aguacate"
  → Desayuno S: 1 entrada "Tortilla"
  → Desayuno D: 1 entrada "Pancakes"
  → Cena L–V: 5 entradas "Salmón con verduras"
  → Cena S: 1 entrada "Pizza casera"
  → Cena D: 1 entrada "Cocido"

## ALTERNATIVAS DENTRO DE UNA TOMA CONECTADAS CON "O"

Cuando un plato o línea contiene la partícula "o" conectando dos alternativas:

CASO A — El "o" separa dos platos principales completos (cada parte es un plato en sí misma):
  Texto: "Cena: Merluza a la plancha o pollo al horno, con guarnición de verduras"
  → Crea DOS entradas con el mismo meal_type:
    "name": "Cena - Opción A", "ingredients": ["Merluza a la plancha", "Guarnición de verduras"]
    "name": "Cena - Opción B", "ingredients": ["Pollo al horno", "Guarnición de verduras"]

CASO B — El "o" varía solo un componente secundario (condimento, bebida, acompañamiento):
  Texto: "Desayuno: Tostadas con aceite o mantequilla, café o té"
  → Crea UNA sola entrada:
    "name": "Desayuno", "ingredients": ["Tostadas con aceite o mantequilla", "Café o té"]

Para distinguir los casos:
  - Si cada parte del "o" puede ser el plato principal de la toma por sí sola → CASO A (dos entradas)
  - Si el "o" es una variante de un condimento, bebida o preparación secundaria → CASO B (una entrada)

No apliques esta regla si el "o" aparece dentro del nombre propio de un alimento:
  "Jamón york o serrano" → un solo ingrediente, sin separar en dos opciones.

## OPCIONES ALTERNATIVAS DE COMIDA

Esta sección cubre el caso en que el nutricionista ofrece MÚLTIPLES OPCIONES para UNA MISMA toma en UN MISMO día o rango de días. Ejemplo: "Merienda: Opción A / Opción B / Opción C".

Este concepto es diferente a los planes de rotación completa (Día A / Día B / Día C para el plan entero), que no se deben tratar como opciones de comida.

REGLA FUNDAMENTAL: SIEMPRE preserva TODAS las opciones. Las siguientes expresiones indican opciones alternativas y NUNCA significan "elige solo una":
- "Opción A / Opción B / Opción C"
- "Elige una de las siguientes"
- "Choose one"
- "Puedes elegir entre..."
- "Repite cada opción al menos dos veces por semana" (dentro de un plan semanal)

Para CADA día afectado y CADA opción, crea UNA entrada separada:
- MISMO "day_of_week" y MISMO "meal_type" en todas las opciones del mismo día
- Añade el identificador de opción al campo "name" tal como lo usa el nutricionista:
  "Merienda - Opción A", "Merienda - Opción B", "Merienda - Opción C"
  "Almuerzo (opción 1)", "Almuerzo (opción 2)"
  "Desayuno A", "Desayuno B"

Ejemplo correcto:
  Texto: "Merienda (L-V): Opción A: Manzana con almendras / Opción B: Yogur natural"
  → monday   snack "Merienda - Opción A" + monday   snack "Merienda - Opción B"
  → tuesday  snack "Merienda - Opción A" + tuesday  snack "Merienda - Opción B"
  → wednesday snack "Merienda - Opción A" + wednesday snack "Merienda - Opción B"
  → thursday snack "Merienda - Opción A" + thursday snack "Merienda - Opción B"
  → friday   snack "Merienda - Opción A" + friday   snack "Merienda - Opción B"
  Total: 10 entradas (5 días × 2 opciones)

Ejemplo correcto:
  Texto: "Cena todos los días: A) Salmón con verduras  B) Pollo a la plancha  C) Tortilla"
  → 7 días × 3 opciones = 21 entradas, todas con meal_type "dinner"

Si las opciones NO especifican un rango de días pero el contexto del plan es semanal,
aplica las opciones a todos los días que correspondan según el tipo de toma.

## COMIDA LIBRE

Cuando aparezca "comida libre", "libre", "a elección", "a gusto", "sin restricciones" u expresiones similares:
- Crea la entrada: "name": "Comida libre", "ingredients": []
- NUNCA omitas comidas libres

## QUÉ NO IMPORTAR

NO crees entradas para ninguno de estos casos:

Suplementos puros (no son comidas):
- Vitaminas, minerales (magnesio, zinc, hierro, etc.)
- Proteína en polvo cuando aparece como "suplemento" o "complemento"
- Creatina, omega-3, colágeno, probióticos, etc.

Instrucciones de hidratación:
- "Beber 2 L de agua al día", "Agua al levantarse", "Infusión sin azúcar"
- Cualquier instrucción que solo involucre agua, infusiones o líquidos sin valor calórico

Recomendaciones generales del nutricionista:
- "Evitar azúcares refinados", "Reducir sal", "Masticar bien", "Comer despacio"
- Cualquier consejo de comportamiento o hábito

Metadatos del documento:
- Nombre del paciente, nombre del nutricionista, número de colegiado
- Fecha del plan, período de validez, teléfono, nombre de la clínica

Encabezados no alimenticios:
- "Observaciones", "Recomendaciones generales", "Aclaraciones", "Notas"
- Títulos de sección que no corresponden a una toma alimenticia

EXCEPCIÓN: si pre-entreno, post-entreno o antes de dormir incluyen alimentos reales
(no solo suplementos), imórtalo como snack.

## PRESERVACIÓN DEL CONTENIDO

- NUNCA inventes información. Solo extrae lo que está escrito.
- Preserva el texto original del nutricionista sin simplificar, resumir ni reescribir.
- Preserva especificaciones de cantidad: "Pan integral 60 g", "2 huevos", "200 ml leche".
- Si una sección del documento no es una comida (nota, recomendación, suplemento) → ignórala.
- Si el documento contiene información ambigua → usa el texto original tal cual en el campo que corresponda.`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface RawMeal {
  day_of_week?: unknown;
  meal_type?: unknown;
  name?: unknown;
  description?: unknown;
  ingredients?: unknown;
  language?: unknown;
}

interface ParsedMeal {
  day_of_week: string;
  meal_type: string;
  name: string;
  description: null;
  ingredients: string[];
  language: string;
}

function buildTextParts(text: string): unknown[] {
  return [{
    text: SYSTEM_PROMPT +
      "\n\nEl plan de dieta que debes analizar es el siguiente:\n\n---\n" +
      text +
      "\n---",
  }];
}

function buildFileParts(fileBase64: string, mimeType: string): unknown[] {
  return [
    {
      text: SYSTEM_PROMPT +
        "\n\nAnaliza el documento adjunto. Devuelve el JSON según las instrucciones anteriores.",
    },
    { inline_data: { mime_type: mimeType, data: fileBase64 } },
  ];
}

function validateAndNormalizeMeals(raw: unknown[], language: string): ParsedMeal[] {
  for (let i = 0; i < raw.length; i++) {
    const m = raw[i] as RawMeal;

    if (!m || typeof m !== "object") {
      throw new Error(`Comida ${i + 1}: no es un objeto válido`);
    }

    const day = typeof m.day_of_week === "string" ? m.day_of_week.toLowerCase().trim() : "";
    const type = typeof m.meal_type === "string" ? m.meal_type.toLowerCase().trim() : "";

    if (!VALID_DAYS.has(day)) {
      throw new Error(
        `Comida ${i + 1} tiene day_of_week inválido: "${m.day_of_week}". ` +
          `Valores permitidos: ${[...VALID_DAYS].join(", ")}`,
      );
    }
    if (!VALID_TYPES.has(type)) {
      throw new Error(
        `Comida ${i + 1} tiene meal_type inválido: "${m.meal_type}". ` +
          `Valores permitidos: ${[...VALID_TYPES].join(", ")}`,
      );
    }
    if (typeof m.name !== "string" || !m.name.trim()) {
      throw new Error(`Comida ${i + 1} no tiene campo "name" válido`);
    }
  }

  return (raw as RawMeal[]).map((m) => ({
    day_of_week: (m.day_of_week as string).toLowerCase().trim(),
    meal_type: (m.meal_type as string).toLowerCase().trim(),
    name: (m.name as string).trim(),
    description: null,
    ingredients: Array.isArray(m.ingredients)
      ? (m.ingredients as unknown[]).map((i) => String(i)).filter((s) => s.trim())
      : [],
    language,
  }));
}

// ---------------------------------------------------------------------------
// Post-processing: propagate a shared meal to days that Gemini missed
// ---------------------------------------------------------------------------
// When a meal has identical content on N days but is absent from other days
// that are active in the plan (i.e. have at least one other meal), and no
// other meal of the same type exists for those days, add the shared meal.
// This corrects the most common failure mode: a merged table cell that Gemini
// expanded for some columns but not all.
function propagateSharedMeals(meals: ParsedMeal[]): ParsedMeal[] {
  const activeDays = new Set<string>(meals.map((m) => m.day_of_week));
  if (activeDays.size < 2) return meals;

  // Fingerprint: meal_type + name + ingredients (order-sensitive — Gemini is
  // deterministic for the same merged cell so order will be identical).
  const fp = (m: ParsedMeal): string =>
    `${m.meal_type}||${m.name}||${m.ingredients.join("|")}`;

  type Group = { days: Set<string>; template: ParsedMeal };
  const groups = new Map<string, Group>();

  for (const meal of meals) {
    const key = fp(meal);
    if (!groups.has(key)) groups.set(key, { days: new Set(), template: meal });
    groups.get(key)!.days.add(meal.day_of_week);
  }

  const extra: ParsedMeal[] = [];

  for (const { days: coveredDays, template } of groups.values()) {
    // Only expand meals that already appear on 2+ days (clearly repeating)
    if (coveredDays.size < 2) continue;

    for (const day of activeDays) {
      if (coveredDays.has(day)) continue;

      // Only add if this day has NO meal of this type — never override
      const dayHasType = meals.some(
        (m) => m.day_of_week === day && m.meal_type === template.meal_type,
      );
      if (dayHasType) continue;

      extra.push({ ...template, day_of_week: day });
    }
  }

  return extra.length > 0 ? [...meals, ...extra] : meals;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let parts: unknown[];
    if (body.fileBase64 && body.mimeType) {
      parts = buildFileParts(String(body.fileBase64), String(body.mimeType));
    } else if (typeof body.text === "string" && body.text.trim()) {
      parts = buildTextParts(body.text);
    } else {
      return new Response(
        JSON.stringify({ error: "Se requiere 'text' o 'fileBase64' con 'mimeType'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0,
            thinkingConfig: { thinkingBudget: 1024 },
          },
        }),
      },
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`Gemini API error ${geminiRes.status}: ${errText}`);
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error("Respuesta vacía de Gemini");

    let result: { language?: unknown; meals?: unknown };
    try {
      result = JSON.parse(rawText);
    } catch {
      throw new Error("Gemini no devolvió JSON válido");
    }

    if (!Array.isArray(result.meals)) {
      throw new Error("La respuesta de Gemini no contiene un array 'meals'");
    }

    const language =
      typeof result.language === "string" && result.language.trim()
        ? result.language.trim()
        : "es";

    // Strict validation — throws if any meal has an invalid field
    const validated = validateAndNormalizeMeals(result.meals, language);
    const meals = propagateSharedMeals(validated);

    return new Response(
      JSON.stringify({ meals, language }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
