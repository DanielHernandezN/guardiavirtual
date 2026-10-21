import { formatoLista } from "@/lib/antecedentes";

type Props = {
  /** Etiquetas de los campos obligatorios que faltan. */
  faltantes: string[];
  /** Inconsistencias o datos en conflicto detectados. */
  contradicciones: string[];
};

/**
 * Estado del caso — muestra en el chat los campos faltantes y las
 * contradicciones detectadas, para que el funcionario complete o revise
 * la información antes de generar el borrador.
 */
export default function EstadoCaso({ faltantes, contradicciones }: Props) {
  const completo = faltantes.length === 0;

  return (
    <div className="space-y-2 px-6 py-3">
      {contradicciones.length > 0 && (
        <div className="rounded-xl border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">⚠ Contradicciones detectadas</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {contradicciones.map((contradiccion, indice) => (
              <li key={indice}>{contradiccion}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-amber-800">
            Revisá estos puntos con el funcionario antes de usar el borrador.
          </p>
        </div>
      )}

      {!completo && (
        <div className="rounded-xl border border-oliva-300 bg-oliva-100 px-4 py-3 text-sm text-oliva-900">
          <p className="font-semibold">Faltantes para el borrador</p>
          <p className="mt-1">
            Necesito {formatoLista(faltantes)} para poder confeccionar el parte.
          </p>
        </div>
      )}

      {completo && (
        <div className="rounded-xl border border-oliva-600 bg-oliva-600 px-4 py-3 text-sm font-medium text-oliva-50">
          ✓ Antecedentes completos. Ya podés generar el borrador del parte.
        </div>
      )}
    </div>
  );
}
