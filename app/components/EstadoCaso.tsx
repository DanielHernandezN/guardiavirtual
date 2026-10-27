import { formatoLista } from "@/lib/antecedentes";

type Props = {
  /** Etiquetas de los campos obligatorios que faltan. */
  faltantes: string[];
  /** Inconsistencias o datos en conflicto detectados. */
  contradicciones: string[];
  /** Permite descartar la contradicción y seguir con el caso en curso. */
  onResolver?: () => void;
};

/**
 * Estado del caso — muestra en el chat los campos faltantes y las
 * contradicciones detectadas, para que el funcionario complete o revise
 * la información antes de generar el borrador.
 */
export default function EstadoCaso({
  faltantes,
  contradicciones,
  onResolver,
}: Props) {
  const completo = faltantes.length === 0;
  const bloqueado = contradicciones.length > 0;

  return (
    <div className="space-y-2 px-4 py-3 sm:px-6">
      {bloqueado && (
        <div className="rounded-xl border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">⚠ Contradicciones detectadas</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {contradicciones.map((contradiccion, indice) => (
              <li key={indice}>{contradiccion}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-amber-800">
            No se puede redactar un parte que mezcle dos procedimientos
            distintos. Revisa estos puntos con el funcionario.
          </p>
          {onResolver && (
            <button
              type="button"
              onClick={onResolver}
              className="mt-3 rounded-lg border border-amber-500 px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-500 hover:text-white"
            >
              Continuar con este caso
            </button>
          )}
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

      {completo && !bloqueado && (
        <div className="rounded-xl border border-oliva-600 bg-oliva-600 px-4 py-3 text-sm font-medium text-oliva-50">
          ✓ Antecedentes completos. Ya puedes generar el borrador del parte.
        </div>
      )}
    </div>
  );
}
