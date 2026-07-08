import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_MODEL = "gemini-2.5-flash";

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------
// Conservative: only collapses names that refer to the exact same supermarket
// product. The canonical name must already exist in the input list.
const SYSTEM_PROMPT = `Eres un sistema de normalización de listas de la compra para planes nutricionales.

Tu única tarea es detectar duplicados semánticos en una lista de nombres de productos. Un duplicado semántico es un par de nombres que un consumidor compraría como el mismo artículo en el supermercado.

REGLAS OBLIGATORIAS — incumplirlas invalida la respuesta:
1. El nombre canónico SIEMPRE debe ser uno de los nombres de la lista de entrada. Jamás inventes ni reformules un nombre.
2. Prefiere el nombre más corto y claro que ya exista en la lista.
3. Solo fusiona productos que una persona compraría como el mismo artículo físico en el lineal del supermercado.
4. Sé estrictamente conservador: ante cualquier duda, NO fusiones.
5. Nunca fusiones productos de categorías distintas aunque tengan palabras en común.
6. Nunca fusiones variantes que especifiquen distintas características del producto (grasa, fibra, marca, presentación).

EJEMPLOS DE FUSIONES VÁLIDAS:
- "Fruta" + "Fruta a elegir (excepto plátano, uva, chirimoya, aguacate)" → canónico: "Fruta"
- "Infusión" + "Infusión o té o menta poleo" → canónico: "Infusión"
- "Aceite de oliva" + "Aceite de oliva (10gr)" → canónico: "Aceite de oliva"

EJEMPLOS QUE NUNCA DEBES FUSIONAR (lista no exhaustiva):
- Yogur natural ≠ Yogur griego
- Yogur 0,0% ≠ Yogur de fibras (características distintas)
- Queso fresco ≠ Queso fresco batido 0%
- Atún ≠ Salmón
- Leche ≠ Bebida de avena
- Pechuga de pollo ≠ Hamburguesa de pollo
- Jamón serrano ≠ Jamón york

FORMATO DE SALIDA — devuelve ÚNICAMENTE JSON válido, sin texto adicional:
{
  "merges": {
    "nombre que debe renombrarse": "nombre canónico ya existente en la lista",
    ...
  }
}

Si no hay duplicados semánticos evidentes, devuelve exactamente: {"merges": {}}
Solo incluye en "merges" los nombres que deben renombrarse; los que se quedan igual no se incluyen.`;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const items: Array<{ name: string; quantity: string | null }> = body.items;

    if (!Array.isArray(items) || items.length < 2) {
      return new Response(
        JSON.stringify({ merges: {} }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const names = items.map((i) => i.name);
    const prompt = SYSTEM_PROMPT +
      "\n\nLista de productos de la compra:\n" +
      JSON.stringify(names, null, 2);

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
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
    if (!rawText) throw new Error("Empty response from Gemini");

    const result = JSON.parse(rawText);

    if (!result || typeof result.merges !== "object" || Array.isArray(result.merges)) {
      throw new Error("Unexpected response shape");
    }

    // Validate every rename: both "from" and "to" must exist in the original input.
    // This enforces the "never invent names" rule server-side.
    const nameSet = new Set(names);
    const validated: Record<string, string> = {};

    for (const [from, to] of Object.entries(result.merges)) {
      if (typeof from !== "string" || typeof to !== "string") continue;
      if (!nameSet.has(from)) continue;
      if (!nameSet.has(to as string)) continue;
      if (from === to) continue;
      validated[from] = to as string;
    }

    return new Response(
      JSON.stringify({ merges: validated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
