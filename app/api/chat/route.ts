const toText = (value: unknown, fallback = "pendiente") => {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
    return fallback;
};

const toStringArray = (value: unknown) => {
    if (Array.isArray(value)) {
        return value
            .map((item) => (typeof item === "string" ? item.trim() : ""))
            .filter(Boolean);
    }

    return [];
};

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const mensaje = typeof body?.mensaje === "string" ? body.mensaje.trim() : "";
        const antecedentes = body?.antecedentes ?? {};

        if (!mensaje) {
            return Response.json(
                {
                    error: "Se requiere un mensaje para analizar el caso.",
                },
                { status: 400 }
            );
        }

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return Response.json(
                {
                    error: "Falta OPENAI_API_KEY en las variables de entorno.",
                },
                { status: 500 }
            );
        }

        const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

        const systemPrompt = `Eres un funcionario virtual de apoyo documental para la confección de partes policiales.

Debes analizar antecedentes policiales y producir un JSON válido. No inventes hechos. Si falta información, indícala en faltantes. Si hay contradicciones, indícalas en contradicciones.

Reglas:
- No inventes hechos, fechas, lugares ni procedimientos.
- Trabaja solo con los antecedentes entregados.
- No mezcles procedimientos distintos.
- Corrige errores de redacción sin alterar los hechos.
- Si no hay información suficiente, usa "pendiente" o [] en el valor correspondiente.
- Responde únicamente con JSON válido en español.`;

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                temperature: 0,
                response_format: { type: "json_object" },
                messages: [
                    {
                        role: "system",
                        content: systemPrompt,
                    },
                    {
                        role: "user",
                        content: `Analiza este caso policial y responde con el formato JSON solicitado.\n\nCaso:\n${JSON.stringify(
                            {
                                mensaje,
                                antecedentes,
                            },
                            null,
                            2
                        )}`,
                    },
                ],
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`La API de IA falló: ${errorText}`);
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error("La respuesta de la API no incluye contenido válido.");
        }

        let parsed: Record<string, unknown>;
        try {
            parsed = JSON.parse(content);
        } catch {
            const match = content.match(/\{[\s\S]*\}/);
            if (!match) {
                throw new Error("No se pudo parsear la respuesta JSON del modelo.");
            }
            parsed = JSON.parse(match[0]);
        }

        const respuesta = {
            respuesta: toText(parsed.respuesta, "He analizado el caso y estoy listo para apoyar la redacción del borrador."),
            tipoProcedimiento: toText(parsed.tipoProcedimiento, "pendiente"),
            especie: toText(parsed.especie, "pendiente"),
            lugar: toText(parsed.lugar, "pendiente"),
            fecha: toText(parsed.fecha, "pendiente"),
            descripcionHechos: toText(parsed.descripcionHechos, mensaje),
            puedeConfeccionarBorrador: Boolean(parsed.puedeConfeccionarBorrador),
            faltantes: toStringArray(parsed.faltantes),
            contradicciones: toStringArray(parsed.contradicciones),
        };

        return Response.json(respuesta);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Error interno del servidor al procesar el chat.";
        return Response.json(
            {
                error: message,
            },
            { status: 500 }
        );
    }
}