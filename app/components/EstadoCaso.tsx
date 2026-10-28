type Props = {
  /** Etiquetas de los campos obligatorios que faltan. */
  faltantes: string[];
  /** Inconsistencias o datos en conflicto detectados. */
  contradicciones: string[];
  /** Permite descartar la contradicción y seguir con el caso en curso. */
  onResolver?: () => void;
};

/**
 * Estado del caso — muestra en el chat las contradicciones detectadas (con la
 * opción de continuar con el caso en curso) y avisa cuando los antecedentes ya
 * alcanzan para generar el borrador. Los campos que faltan no se listan: el
 * botón «Generar borrador» ya indica de forma implícita que aún no se puede.
 */
export default function EstadoCaso({
  faltantes,
  contradicciones,
  onResolver,
}: Props) {
  const completo = faltantes.length === 0;
  const bloqueado = contradicciones.length > 0;

  // Nada que avisar: sin contradicciones y con datos pendientes, el espacio
  // se deja libre para no recargar la vista.
  if (!bloqueado && !completo) return null;

  return (
    <div className="space-y-2 border-t border-oliva-200 bg-oliva-50 px-4 py-3 sm:px-6">
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

      {completo && !bloqueado && (
        <div className="rounded-xl border border-oliva-600 bg-oliva-600 px-4 py-3 text-sm font-medium text-oliva-50">
          ✓ Antecedentes completos. Ya puedes generar el borrador del parte.
        </div>
      )}
    </div>
  );
}
