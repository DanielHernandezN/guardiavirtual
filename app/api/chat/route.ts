type AntecedentesEstructurados = {
    tipoProcedimiento: string | null;
    especie: string | null;
    lugar: string | null;
    fecha: string | null;
    descripcionHechos: string | null;
    contradicciones: string[];
};

const valoresVacios = new Set([
    "pendiente",
    "null",
    "nulo",
    "no informado",
    "sin informacion",
    "sin información",
]);

const toNullableText = (value: unknown) => {
    if (typeof value === "string") {
        const text = value.trim();
        if (!text || valoresVacios.has(text.toLowerCase())) return null;
        return text;
    }

    if (typeof value === "number") return String(value);
    return null;
};

const toStringArray = (value: unknown) => {
    if (Array.isArray(value)) {
        return value
            .map((item) => (typeof item === "string" ? item.trim() : ""))
            .filter(Boolean);
    }

    return [];
};

const camposMinimos = [
    { key: "tipoProcedimiento", label: "el tipo de procedimiento" },
    { key: "especie", label: "la especie involucrada" },
    { key: "lugar", label: "el lugar de ocurrencia" },
    { key: "fecha", label: "la fecha del procedimiento" },
] as const;

const formatoLista = (items: string[]) => {
    if (items.length <= 1) return items[0] ?? "";
    return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
};

const validarAntecedentes = (antecedentes: AntecedentesEstructurados) =>
    camposMinimos
        .filter(({ key }) => !antecedentes[key])
        .map(({ label }) => label);

const crearRespuestaConversacional = (faltantes: string[]) => {
    if (faltantes.length === 0) {
        return "Con los antecedentes disponibles puedo continuar con la confección del borrador.";
    }

    return `Para continuar necesito que indiques ${formatoLista(faltantes)}.`;
};

const parseModelContent = (content: string) => {
    let parsed: unknown;

    try {
        parsed = JSON.parse(content);
    } catch {
        const match = content.match(/\{[\s\S]*\}/);
        if (!match) {
            throw new Error("No se pudo parsear la respuesta JSON del modelo.");
        }

        parsed = JSON.parse(match[0]);
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("La respuesta JSON del modelo no tiene el formato esperado.");
    }

    return parsed as Record<string, unknown>;
};

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const mensaje = typeof body?.mensaje === "string" ? body.mensaje.trim() : "";
        const antecedentes =
            body?.antecedentes && typeof body.antecedentes === "object" && !Array.isArray(body.antecedentes)
                ? (body.antecedentes as Record<string, unknown>)
                : {};

        if (!mensaje) {
            return Response.json(
                {
                    error: "Se requiere un mensaje para analizar el caso.",
                },
                { status: 400 }
            );
        }

        const apiKey = process.env.OPENROUTER_API_KEY ?? process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return Response.json(
                {
                    error: "Falta OPENROUTER_API_KEY o OPENAI_API_KEY en las variables de entorno.",
                },
                { status: 500 }
            );
        }

        const model = process.env.OPENROUTER_MODEL ?? process.env.OPENAI_MODEL ?? "openai/gpt-4o-mini";
        const antecedentesPrevios: AntecedentesEstructurados = {
            tipoProcedimiento: toNullableText(antecedentes.tipoProcedimiento),
            especie: toNullableText(antecedentes.especie),
            lugar: toNullableText(antecedentes.lugar),
            fecha: toNullableText(antecedentes.fecha),
            descripcionHechos: toNullableText(antecedentes.descripcionHechos),
            contradicciones: toStringArray(antecedentes.contradicciones),
        };

        const systemPrompt = `Eres un asistente de extracción de antecedentes para una aplicación de apoyo documental policial.

Tu tarea es interpretar el mensaje del funcionario y devolver antecedentes estructurados.

Reglas:
- No inventes hechos, fechas, lugares ni procedimientos.
- Trabaja solo con el mensaje actual y los antecedentes previos entregados.
- El JSON de salida debe representar el estado acumulado completo del procedimiento, no solo el mensaje actual.
- Conserva los antecedentes previos cuando el mensaje actual no los modifique.
- Si el mensaje actual completa un dato faltante, actualiza el valor.
- Si un dato no está informado, usa null.
- Nunca uses "pendiente" como valor.
- No mezcles procedimientos distintos.
- Corrige errores de redacción sin alterar los hechos.
- Responde únicamente con JSON válido en español.
- No incluyas Markdown ni explicaciones fuera del JSON.

Devuelve un objeto JSON con estas claves exactas:
- tipoProcedimiento: texto o null.
- especie: texto o null.
- lugar: texto o null.
- fecha: texto o null.
- descripcionHechos: texto o null.
- contradicciones: arreglo de textos.`;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "Guardiavirtual",
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
                        content: `Analiza el mensaje actual junto con los antecedentes acumulados previos y responde con el estado actualizado completo.\n\nAntecedentes acumulados previos:\n${JSON.stringify(
                            antecedentesPrevios,
                            null,
                            2
                        )}\n\nMensaje actual del funcionario:\n${mensaje}`,
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

        const parsed = parseModelContent(content);

        const antecedentesEstructurados: AntecedentesEstructurados = {
            tipoProcedimiento: toNullableText(parsed.tipoProcedimiento) ?? antecedentesPrevios.tipoProcedimiento,
            especie: toNullableText(parsed.especie) ?? antecedentesPrevios.especie,
            lugar: toNullableText(parsed.lugar) ?? antecedentesPrevios.lugar,
            fecha: toNullableText(parsed.fecha) ?? antecedentesPrevios.fecha,
            descripcionHechos: toNullableText(parsed.descripcionHechos) ?? antecedentesPrevios.descripcionHechos ?? mensaje,
            contradicciones: toStringArray(parsed.contradicciones),
        };

        const faltantes = validarAntecedentes(antecedentesEstructurados);

        const respuesta = {
            respuesta: crearRespuestaConversacional(faltantes),
            ...antecedentesEstructurados,
            puedeConfeccionarBorrador: faltantes.length === 0,
            faltantes,
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
