import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { ingredient } = await req.json();

    if (!ingredient || typeof ingredient !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing ingredient" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const prompt = `Eres una dietista profesional que ayuda a los usuarios a encontrar sustitutos saludables para sus ingredientes, respetando la intención nutricional de su dieta. Responde siempre en español de España, de forma práctica, concisa y clara, como si hablaras con alguien sin conocimientos técnicos.

El usuario ha indicado el siguiente ingrediente o alimento: "${ingredient}"

Proporciona entre 4 y 5 sustitutos saludables siguiendo estas normas:

SOBRE LOS SUSTITUTOS:
- Sugiere alimentos nutritivamente similares al original, preservando su función en la dieta (proteína, hidratos de carbono, grasas saludables, verduras, lácteos, etc.).
- Ordénalos de mayor a menor similitud nutricional con el original.
- Prioriza ingredientes fáciles de encontrar en supermercados habituales.
- No inventes datos nutricionales ni médicos. Si no existe un sustituto razonable, explícalo claramente en el campo "notes" del primer elemento.

SOBRE LA CANTIDAD (campo "ratio"):
- Nunca uses expresiones técnicas como "1:1" o ratios con dos puntos.
- Usa siempre texto natural en español, por ejemplo:
  - "Misma cantidad"
  - "La mitad de la cantidad"
  - "El doble de cantidad"
  - "Un poco menos"
  - "Un poco más"
  - "Ajustar según la receta" (cuando no hay una equivalencia exacta posible)
- Si el usuario ha indicado una cantidad concreta (por ejemplo "200 g de pollo" o "100 g de arroz"), úsala para dar la equivalencia más precisa posible y exprésala de forma natural (por ejemplo: "Unos 180 g" o "Entre 150 y 200 g").

SOBRE EL MÉTODO DE COCCIÓN:
- Si el usuario menciona un método de cocción (a la plancha, al horno, al vapor, hervido, etc.), ten en cuenta si es relevante nutricionalmente.
- Recomienda sustitutos que puedan prepararse con ese mismo método siempre que sea posible.
- No recomiendes alternativas fritas, empanadas ni ultraprocesadas salvo que el usuario lo pida expresamente.
- Prefiere métodos saludables: plancha, horno, vapor o hervido.

SOBRE LAS EXPLICACIONES (campo "notes"):
- Escribe una o dos frases claras y prácticas explicando por qué es un buen sustituto y qué aporta nutricionalmente.
- Usa un tono cercano, profesional y comprensible para personas sin formación en nutrición.

Responde ÚNICAMENTE con JSON válido, sin texto adicional, usando exactamente esta estructura:
{
  "ingredient": "Nombre del alimento tal como lo indicó el usuario",
  "substitutes": [
    {"name": "Nombre del sustituto", "ratio": "Texto natural de cantidad", "notes": "Explicación breve y práctica"},
    ...
  ]
}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
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

    if (!rawText) {
      throw new Error("Empty response from Gemini");
    }

    const result = JSON.parse(rawText);

    if (!result.ingredient || !Array.isArray(result.substitutes)) {
      throw new Error("Unexpected response shape from Gemini");
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
