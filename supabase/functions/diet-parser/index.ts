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
// Comprehensive prompt — covers every real-world nutritionist format
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `Eres un sistema especializado en interpretar planes nutricionales creados por nutricionistas.
Tu única tarea es analizar el plan de dieta y extraer TODAS las comidas convirtiéndolas al formato JSON interno de una aplicación de planificación nutricional.

## ESQUEMA DE SALIDA OBLIGATORIO

Devuelve ÚNICAMENTE JSON válido con esta estructura exacta, sin texto adicional:
{
  "language": "es",
  "meals": [
    {
      "day_of_week": "monday",
      "meal_type": "breakfast",
      "name": "Nombre de la comida",
      "description": null,
      "ingredients": ["Componente 1", "Componente 2"],
      "language": "es"
    }
  ]
}

Valores EXACTOS y permitidos para "day_of_week":
  monday, tuesday, wednesday, thursday, friday, saturday, sunday

Valores EXACTOS y permitidos para "meal_type":
  breakfast, lunch, dinner, snack

El campo "description" SIEMPRE es null.
El campo "language" debe ser el código ISO 639-1 del idioma del documento (es, en, pt, fr, de, it, nl, etc.).
Usa el mismo valor de "language" en el campo raíz y en cada comida.

## MAPEO DE TIPOS DE COMIDA

- breakfast  → desayuno, primera comida, merienda matinal (primera del día)
- lunch      → almuerzo, comida, comida principal del mediodía
- dinner     → cena, última comida del día
- snack      → media mañana, merienda, colación, tentempié, aperitivo, pre-entreno,
               post-entreno, antes de dormir, cualquier toma ligera entre comidas principales

## ABREVIACIONES DE DÍAS EN ESPAÑOL

L = Lunes      = monday
M = Martes     = tuesday
X = Miércoles  = wednesday  (también: Mi, Mx, Mie)
J = Jueves     = thursday
V = Viernes    = friday
S = Sábado     = saturday
D = Domingo    = sunday

Patrones compuestos — genera UNA entrada separada por cada día implicado:
- Rango continuo:  "L-V"  = monday, tuesday, wednesday, thursday, friday
- Rango continuo:  "L-D"  = los 7 días
- Días alternos:   "L-J-D" = monday, thursday, sunday  (guión como separador, no como rango)
- Lista con coma:  "L, M, X" = monday, tuesday, wednesday
- Lista con barra: "L/M/X" = monday, tuesday, wednesday
- Días numéricos:  "Días 1-5" o "Semana L-V" = monday a friday
- "Laborables"    = monday, tuesday, wednesday, thursday, friday
- "Fines de semana" = saturday, sunday

Para determinar si un guión indica rango o separación de días alternos, usa el contexto:
- Si los días forman secuencia consecutiva → rango
- Si los días no forman secuencia consecutiva (ej. L-J-D) → días alternos separados

## COMIDAS REPETIDAS EN VARIOS DÍAS

Cuando una toma se indica para un rango o lista de días:
- Genera UNA entrada idéntica por cada día
- NO colapses varios días en una sola entrada
- Ejemplo: "Desayuno (L-V): Avena con leche" → 5 entradas para monday, tuesday, wednesday, thursday, friday
- Ejemplo: "Desayuno (todos los días): ..." → 7 entradas idénticas

## OPCIONES ALTERNATIVAS

Cuando el nutricionista ofrece opciones (Opción A / Opción B / Opción C, o enumera alternativas):
- Crea UNA entrada por cada opción
- Mismo día y tipo de comida para todas
- Añade el identificador al nombre: "Almuerzo - Opción A", "Almuerzo - Opción B"
- "Repetir cada opción al menos dos veces por semana" → crear las opciones para cada día que corresponda

## COMIDA LIBRE

Cuando aparezca "comida libre", "libre", "a elección", "a gusto", "sin restricciones" u expresiones similares:
- Crea la entrada: name: "Comida libre", ingredients: []
- NUNCA omitas comidas libres

## QUÉ NO IMPORTAR (ignorar completamente)

NO crees entradas para:
- Suplementos puros: vitaminas, minerales, proteína en polvo como suplemento, creatina, omega-3, colágeno, magnesio, etc.
- Instrucciones de hidratación: "beber 2 L de agua", "agua al levantarse", "infusión sin azúcar"
- Recomendaciones generales del nutricionista: "evitar azúcares", "reducir sal", "comer despacio", "masticar bien"
- Metadatos del documento: nombre del paciente, nombre del nutricionista, número de colegiado, fecha, período, clínica, teléfono
- Encabezados no alimenticios: "Observaciones", "Recomendaciones generales", "Notas del nutricionista", "Aclaraciones"
- Horarios o alarmas sin contenido alimenticio: "Comer a las 14:00" sin contenido

EXCEPCIÓN: si pre-entreno o post-entreno incluyen alimentos reales (no solo suplementos), imórtalo como snack.

## PRESERVACIÓN DEL CONTENIDO

- NUNCA inventes comidas, ingredientes, días ni información que no aparezca explícitamente en el documento
- Preserva el texto original de nombres e ingredientes SIN simplificar, traducir ni reformular
- Conserva notas entre paréntesis relevantes para la comida: cantidades, especificaciones, excepciones (ej: "Fruta — excepto plátano y uva")
- Si un elemento es ambiguo, usa el texto original tal cual, sin interpretarlo
- Si no puedes determinar el tipo de comida con certeza, usa tu mejor inferencia pero NO omitas la comida

## ESTRUCTURA DEL CAMPO INGREDIENTS

"ingredients" contiene los componentes de la toma tal como aparecen en el documento:
- Cada ítem de lista → entrada separada en el array
- Preserva cantidades y especificaciones (ej: "Pan integral 60 g", "Yogur desnatado 0,0 %")
- Si la comida solo tiene nombre pero no lista de componentes → ingredients: []
- Los platos compuestos también van como strings en ingredients (ej: "Pollo a la plancha con ensalada mixta")`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildTextRequest(text: string): unknown[] {
  return [{ text: SYSTEM_PROMPT + "\n\nEl plan de dieta es el siguiente:\n\n---\n" + text + "\n---" }];
}

function buildFileRequest(fileBase64: string, mimeType: string): unknown[] {
  return [
    { text: SYSTEM_PROMPT + "\n\nAnaliza el documento adjunto y devuelve el JSON según las instrucciones anteriores." },
    { inline_data: { mime_type: mimeType, data: fileBase64 } },
  ];
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
      parts = buildFileRequest(String(body.fileBase64), String(body.mimeType));
    } else if (typeof body.text === "string" && body.text.trim()) {
      parts = buildTextRequest(body.text);
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
          generationConfig: { responseMimeType: "application/json" },
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

    const result = JSON.parse(rawText);
    if (!Array.isArray(result.meals)) throw new Error("La respuesta no contiene un array 'meals'");

    const language = typeof result.language === "string" && result.language ? result.language : "es";

    const meals = (result.meals as unknown[])
      .filter((m) => {
        if (!m || typeof m !== "object") return false;
        const meal = m as Record<string, unknown>;
        return VALID_DAYS.has(meal.day_of_week as string) && VALID_TYPES.has(meal.meal_type as string);
      })
      .map((m) => {
        const meal = m as Record<string, unknown>;
        return {
          day_of_week: meal.day_of_week,
          meal_type: meal.meal_type,
          name: (typeof meal.name === "string" && meal.name.trim()) ? meal.name.trim() : String(meal.meal_type),
          description: null,
          ingredients: Array.isArray(meal.ingredients)
            ? meal.ingredients.map((i: unknown) => String(i)).filter(Boolean)
            : [],
          language,
        };
      });

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
