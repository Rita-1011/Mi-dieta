import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM_PROMPT = `You are an expert nutrition plan parser. Your job is to read a nutrition plan document written in any language and any format, and return a precisely structured JSON object.

## Critical rules

1. **Repeated meals**: In table-based plans, a single entry often applies to ALL days or multiple days. For example, if a breakfast is listed once in a header row with no day specification, it applies to every day. ALWAYS expand repeated meals to all applicable days — never list them only once.

2. **Plan types**: Detect the structure:
   - "weekly": Monday through Sunday plan
   - "multiweek": Multiple weeks (Week 1, Week 2…)
   - "custom": Day A / Day B / Day C, or numbered days (Day 1, Day 2…)
   - "unknown": Free text with no clear day structure

3. **Meal type mapping** — map any language to these exact strings:
   - "breakfast": desayuno, breakfast, café da manhã, petit-déjeuner, Frühstück, colazione, ontbijt, prima colazione
   - "morning_snack": media mañana, mid-morning snack, media manhã, collation matinale, Vormittagssnack, spuntino mattutino, ochtendsnack
   - "lunch": almuerzo, comida, lunch, almoço, déjeuner, Mittagessen, pranzo, middageten
   - "snack": merienda, snack, lanche da tarde, goûter, Nachmittagssnack, merenda, tussendoortje
   - "dinner": cena, dinner, jantar, dîner, Abendessen, cena, avondeten

4. **Day mapping** — always use lowercase English:
   - Monday/Lunes/Montag/Lundi/Segunda/Maandag → "monday"
   - Tuesday/Martes/Dienstag/Mardi/Terça/Dinsdag → "tuesday"
   - Wednesday/Miércoles/Mittwoch/Mercredi/Quarta/Woensdag → "wednesday"
   - Thursday/Jueves/Donnerstag/Jeudi/Quinta/Donderdag → "thursday"
   - Friday/Viernes/Freitag/Vendredi/Sexta/Vrijdag → "friday"
   - Saturday/Sábado/Samstag/Samedi/Sábado/Zaterdag → "saturday"
   - Sunday/Domingo/Sonntag/Dimanche/Domingo/Zondag → "sunday"
   - Day A / Día A / Jour A → "day_a", Day B → "day_b", etc.

5. **Ingredients**: Extract ingredient lists when present. If the meal description lists foods separated by commas, bullets or slashes, treat each as an ingredient.

6. **Warnings**: Add a warning (in Spanish) for each section where you are uncertain, cannot fully determine the meal, or where the original document is ambiguous. Never silently discard information — always warn.

7. **Preserve detail**: Keep the original language in the meal "name" and "description" fields. Translate only the structural keys (day, type).

## Output format

Return ONLY valid JSON with this exact structure. No explanation, no markdown fences, just the JSON object:

{
  "title": "string or null",
  "period": "string or null",
  "planType": "weekly|multiweek|custom|unknown",
  "language": "es|en|pt|fr|de|it|nl",
  "days": [
    {
      "day": "monday|tuesday|wednesday|thursday|friday|saturday|sunday|day_a|day_b|day_c|...",
      "label": "original day label from the document",
      "meals": [
        {
          "type": "breakfast|morning_snack|lunch|snack|dinner",
          "name": "meal name in the original language",
          "description": "full description or preparation notes, or null",
          "ingredients": ["ingredient 1", "ingredient 2"]
        }
      ]
    }
  ],
  "warnings": ["warning message in Spanish"]
}`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { text } = await req.json();

    if (!text?.trim()) {
      return new Response(
        JSON.stringify({ error: "No se proporcionó texto para analizar." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "La clave de API de Anthropic no está configurada. Añade ANTHROPIC_API_KEY en los secretos de tu proyecto de Supabase." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Parse this nutrition plan and return only JSON:\n\n${text}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: `Error de la API de IA (${response.status}). Verifica que tu clave de API sea válida.` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "La IA no devolvió ninguna respuesta." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract JSON from Claude's response (it should return only JSON, but strip any stray text)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: "La IA no devolvió un JSON válido. Intenta de nuevo." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return new Response(
        JSON.stringify({ error: "No se pudo leer el JSON devuelto por la IA. Intenta de nuevo." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate minimal structure
    if (!Array.isArray(parsed.days)) {
      return new Response(
        JSON.stringify({ error: "La IA no pudo identificar los días del plan. Revisa el formato del documento." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Function error:", err);
    return new Response(
      JSON.stringify({ error: `Error inesperado: ${err.message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
