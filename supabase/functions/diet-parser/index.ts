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

## CAMPO "name" — TÍTULO DE LA COMIDA

Contiene el nombre o título de la toma tal como lo escribió el nutricionista.

Ejemplos correctos:
- "Desayuno" (si el nutricionista solo indica el tipo de comida)
- "Revuelto de claras con espinacas" (si el nutricionista da un nombre al plato)
- "Almuerzo - Opción A" (cuando hay opciones alternativas)
- "Comida libre"
- "Media mañana"

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
    const meals = validateAndNormalizeMeals(result.meals, language);

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
