"use client";

import { useCallback, useEffect, useState } from "react";
import Chat from "./chat";
import PanelLateral from "./PanelLateral";
import BorradorPanel from "./BorradorPanel";
import { ErrorDeApi, pedirJson } from "@/lib/cliente";
import type { Antecedentes, BorradorParte } from "@/lib/types";
import type { CasoResumen, DocumentoGuardado } from "@/lib/casos";

type Props = {
  nombre: string;
};

/**
 * Espacio de trabajo del dashboard.
 *
 * Coordina el chat (que acumula los antecedentes) con el panel lateral
 * (historial de casos) y el visor de borradores. Es el componente que
 * concentra el estado compartido: el caso en curso y su borrador.
 */
export default function DashboardWorkspace({ nombre }: Props) {
  const [casos, setCasos] = useState<CasoResumen[]>([]);
  const [casoId, setCasoId] = useState<string | null>(null);
  /** AlIncrementar, el chat se remonte y queda con los antecedentes en cero. */
  const [claveChat, setClaveChat] = useState(0);
  const [borradorVisible, setBorradorVisible] = useState<BorradorParte | null>(
    null
  );
  const [antecedentesVisibles, setAntecedentesVisibles] =
    useState<Antecedentes | null>(null);
  /** Trazabilidad del documento de origen, si el caso nació de un archivo. */
  const [documentoVisible, setDocumentoVisible] =
    useState<DocumentoGuardado | null>(null);
  const [mensajeEstado, setMensajeEstado] = useState("");
  /** Menú lateral deslizable (solo móvil y tablet). */
  const [menuAbierto, setMenuAbierto] = useState(false);

  /**
   * Descarga el listado de casos del servidor.
   * No escribe estado: los errores los comunica quien la invoca.
   */
  const cargarCasos = useCallback(async (): Promise<CasoResumen[]> => {
    const data = await pedirJson<{ casos?: CasoResumen[] }>("/api/casos");
    return Array.isArray(data.casos) ? data.casos : [];
  }, []);

  useEffect(() => {
    let activo = true;

    void cargarCasos()
      .then((listado) => {
        if (activo) {
          setCasos(listado);
        }
      })
      .catch((error: unknown) => {
        if (!activo) return;

        // Una sesión expirada se comunica; el resto es secundario.
        if (error instanceof ErrorDeApi && error.esSesionInvalida) {
          setMensajeEstado("La sesión expiró. Vuelva a iniciar sesión.");
        }
      });

    return () => {
      activo = false;
    };
  }, [cargarCasos]);

  /** Guarda el borrador en la base de datos (y confirma el caso si se pide). */
  const guardarBorrador = async (
    borrador: BorradorParte,
    confirmar: boolean
  ): Promise<boolean> => {
    setMensajeEstado("Guardando...");

    try {
      const data = await pedirJson<{ caso?: CasoResumen; error?: string }>(
        "/api/casos",
        {
          method: "POST",
          body: JSON.stringify({
            casoId,
            antecedentes: antecedentesVisibles ?? {},
            documento: documentoVisible,
            borrador: {
              ...borrador,
              plantilla: borrador.plantilla
                ? `${borrador.plantilla.id}@${borrador.plantilla.version}`
                : undefined,
            },
            confirmar,
          }),
        }
      );

      if (!data.caso) {
        throw new Error(data.error ?? "No se pudo guardar el caso.");
      }

      setCasoId(data.caso.id);
      setMensajeEstado(
        confirmar
          ? "Borrador confirmado y guardado en el historial."
          : "Borrador guardado en el historial."
      );
      setCasos(await cargarCasos().catch(() => casos));
      return true;
    } catch (error) {
      setMensajeEstado(
        error instanceof Error ? error.message : "No se pudo guardar el caso."
      );      return false;
    }
  };

  /** Abre un borrador ya guardado desde el historial. */
  const abrirCaso = (caso: CasoResumen) => {
    setMenuAbierto(false);
    setCasoId(caso.id);
    setAntecedentesVisibles(caso.antecedentes ?? null);
    setDocumentoVisible(caso.documento ?? null);
    const ultimo = caso.borradores[0];

    if (!ultimo) {
      setBorradorVisible(null);
      setMensajeEstado(`Caso "${caso.titulo}" sin borradores todavía.`);
      return;
    }

    const [idPlantilla, version] = (ultimo.plantilla ?? "").split("@");

    setBorradorVisible({
      titulo: ultimo.titulo,
      secciones: ultimo.secciones,
      textoCompleto: ultimo.texto,
      generadoEn: ultimo.generadoEn,
      ...(idPlantilla
        ? {
            plantilla: {
              id: idPlantilla,
              nombre: caso.documento?.plantilla?.nombre ?? idPlantilla,
              version: version ?? "",
            },
          }
        : {}),
    });
    setMensajeEstado("");
  };

  /** Mueve un caso a la papelera (se puede restaurar después). */
  const eliminarCaso = async (caso: CasoResumen) => {
    const aceptado = window.confirm(
      `¿Eliminar el caso "${caso.titulo}"? Podrá restaurarlo desde la papelera.`
    );

    if (!aceptado) return;

    try {
      await pedirJson<{ ok: boolean }>(`/api/casos/${caso.id}`, {
        method: "DELETE",
      });

      if (caso.id === casoId) {
        setCasoId(null);
        setBorradorVisible(null);
        setAntecedentesVisibles(null);
      }

      setCasos(await cargarCasos().catch(() => casos));
      setMensajeEstado(`Caso "${caso.titulo}" movido a la papelera.`);
    } catch (error) {
      setMensajeEstado(
        error instanceof Error ? error.message : "No se pudo eliminar el caso."
      );
    }
  };

  /** Restaura un caso desde la papelera. */
  const restaurarCaso = async (caso: CasoResumen) => {
    try {
      await pedirJson<{ ok: boolean }>(`/api/casos/${caso.id}`, {
        method: "PATCH",
        body: JSON.stringify({ accion: "restaurar" }),
      });

      setCasos(await cargarCasos().catch(() => casos));
      setMensajeEstado(`Caso "${caso.titulo}" restaurado.`);
    } catch (error) {
      setMensajeEstado(
        error instanceof Error ? error.message : "No se pudo restaurar el caso."
      );
    }
  };

  /** Vacía la papelera: elimina definitivamente los casos eliminados. */
  const vaciarPapelera = async () => {
    const eliminados = casos.filter((caso) => caso.enPapelera);

    if (eliminados.length === 0) return;

    const aceptado = window.confirm(
      `¿Eliminar definitivamente ${eliminados.length} caso(s) de la papelera? Esta acción no se puede deshacer.`
    );

    if (!aceptado) return;

    try {
      for (const caso of eliminados) {
        await pedirJson<{ ok: boolean }>(
          `/api/casos/${caso.id}?permanente=1`,
          { method: "DELETE" }
        );
      }

      if (casoId && eliminados.some((caso) => caso.id === casoId)) {
        setCasoId(null);
        setBorradorVisible(null);
        setAntecedentesVisibles(null);
      }

      setCasos(await cargarCasos().catch(() => casos));
      setMensajeEstado("Papelera vaciada.");
    } catch (error) {
      setMensajeEstado(
        error instanceof Error ? error.message : "No se pudo vaciar la papelera."
      );
    }
  };

  return (
    <>
      <PanelLateral
        nombre={nombre}
        casos={casos}
        casoActivoId={casoId}
        mensajeEstado={mensajeEstado}
        abierto={menuAbierto}
        onCerrar={() => setMenuAbierto(false)}
        onAbrirCaso={abrirCaso}
        onEliminarCaso={eliminarCaso}
        onRestaurarCaso={restaurarCaso}
        onVaciarPapelera={vaciarPapelera}
        onNuevoCaso={() => {
          setMenuAbierto(false);
          setCasoId(null);
          setBorradorVisible(null);
          setAntecedentesVisibles(null);
          setDocumentoVisible(null);
          setMensajeEstado("");
          setClaveChat((clave) => clave + 1);
        }}
      />

      <Chat
        key={claveChat}
        onAbrirMenu={() => setMenuAbierto(true)}
        onBorradorGenerado={(borrador, antecedentes, documento) => {
          setBorradorVisible(borrador);
          setAntecedentesVisibles(antecedentes);
          setDocumentoVisible(documento ?? null);
        }}
      />

      {borradorVisible && (
        <BorradorPanel
          borrador={borradorVisible}
          antecedentes={antecedentesVisibles}
          documento={documentoVisible}
          onCerrar={() => setBorradorVisible(null)}
          onGuardar={guardarBorrador}
        />
      )}
    </>
  );
}
