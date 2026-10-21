"use client";

import { useCallback, useEffect, useState } from "react";
import Chat from "./chat";
import PanelLateral from "./PanelLateral";
import BorradorPanel from "./BorradorPanel";
import type { Antecedentes, BorradorParte } from "@/lib/types";
import type { CasoResumen } from "@/lib/casos";

type Props = {
  nombre: string;
  usuarioId: string;
};

/**
 * Espacio de trabajo del dashboard.
 *
 * Coordina el chat (que acumula los antecedentes) con el panel lateral
 * (historial de casos) y el visor de borradores. Es el componente que
 * concentra el estado compartido: el caso en curso y su borrador.
 */
export default function DashboardWorkspace({ nombre, usuarioId }: Props) {
  const [casos, setCasos] = useState<CasoResumen[]>([]);
  const [casoId, setCasoId] = useState<string | null>(null);
  /** AlIncrementar, el chat se remonte y queda con los antecedentes en cero. */
  const [claveChat, setClaveChat] = useState(0);
  const [borradorVisible, setBorradorVisible] = useState<BorradorParte | null>(
    null
  );
  const [antecedentesVisibles, setAntecedentesVisibles] =
    useState<Antecedentes | null>(null);
  const [mensajeEstado, setMensajeEstado] = useState("");

  /** Descarga el listado de casos del servidor. */
  const cargarCasos = useCallback(async (): Promise<CasoResumen[]> => {
    try {
      const response = await fetch("/api/casos");
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data.casos) ? data.casos : [];
    } catch {
      // Silencio: la lista de casos es secundaria.
      return [];
    }
  }, []);

  useEffect(() => {
    let activo = true;

    void cargarCasos().then((listado) => {
      if (activo) {
        setCasos(listado);
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
      const response = await fetch("/api/casos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          casoId,
          antecedentes: antecedentesVisibles ?? {},
          borrador,
          confirmar,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.caso) {
        throw new Error(data.error ?? "No se pudo guardar el caso.");
      }

      setCasoId(data.caso.id);
      setMensajeEstado(
        confirmar
          ? "Borrador confirmado y guardado en el historial."
          : "Borrador guardado en el historial."
      );
      setCasos(await cargarCasos());
      return true;
    } catch (error) {
      setMensajeEstado(
        error instanceof Error ? error.message : "No se pudo guardar el caso."
      );
      return false;
    }
  };

  /** Abre un borrador ya guardado desde el historial. */
  const abrirCaso = (caso: CasoResumen) => {
    setCasoId(caso.id);
    setAntecedentesVisibles(caso.antecedentes ?? null);
    const ultimo = caso.borradores[0];

    if (!ultimo) {
      setBorradorVisible(null);
      setMensajeEstado(`Caso "${caso.titulo}" sin borradores todavía.`);
      return;
    }

    setBorradorVisible({
      titulo: ultimo.titulo,
      secciones: ultimo.secciones,
      textoCompleto: ultimo.texto,
      generadoEn: ultimo.generadoEn,
    });
    setMensajeEstado("");
  };

  return (
    <>
      <PanelLateral
        nombre={nombre}
        usuarioId={usuarioId}
        casos={casos}
        casoActivoId={casoId}
        mensajeEstado={mensajeEstado}
        onAbrirCaso={abrirCaso}
        onNuevoCaso={() => {
          setCasoId(null);
          setBorradorVisible(null);
          setAntecedentesVisibles(null);
          setMensajeEstado("");
          setClaveChat((clave) => clave + 1);
        }}
      />

      <Chat
        key={claveChat}
        onBorradorGenerado={(borrador, antecedentes) => {
          setBorradorVisible(borrador);
          setAntecedentesVisibles(antecedentes);
        }}
      />

      {borradorVisible && (
        <BorradorPanel
          borrador={borradorVisible}
          onCerrar={() => setBorradorVisible(null)}
          onGuardar={guardarBorrador}
        />
      )}
    </>
  );
}
