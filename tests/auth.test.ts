import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  crearTokenSesion,
  hashPassword,
  SESION_TTL_MS,
  verificarPassword,
  verificarTokenSesion,
} from "@/lib/sesion";
import { buscarUsuario, hayUsuariosConfigurados, listarUsuarios } from "@/lib/usuarios";
import { limpiarUso, registrarUso } from "@/lib/limites";
import { MENSAJE_MAXIMO, esquemaMensaje, leerJsonLimitado } from "@/lib/validacion";
import { ErrorEntradaInvalida, errorComoJson, mensajeAmigable } from "@/lib/errores";

/**
 * Pruebas de la capa de autenticación, límites y validación de entrada.
 */

describe("hash de contraseñas", () => {
  it("genera un hash verificable y no la contraseña en claro", () => {
    const hash = hashPassword("clave-secreta");

    assert.notEqual(hash, "clave-secreta");
    assert.ok(hash.includes(":"));
    assert.equal(verificarPassword("clave-secreta", hash), true);
    assert.equal(verificarPassword("otra-clave", hash), false);
  });

  it("usa una sal distinta en cada hash", () => {
    assert.notEqual(hashPassword("igual"), hashPassword("igual"));
  });

  it("rechaza hashes malformados sin lanzar errores", () => {
    assert.equal(verificarPassword("clave", "no-es-un-hash"), false);
    assert.equal(verificarPassword("clave", ""), false);
  });
});

describe("token de sesión", () => {
  it("crea un token que se puede verificar", () => {
    const token = crearTokenSesion({
      id: "funcionario",
      nombre: "Funcionario de Prueba",
      grado: "Sgto. 1ro.",
      exp: Date.now() + SESION_TTL_MS,
    });

    const payload = verificarTokenSesion(token);

    assert.equal(payload?.id, "funcionario");
    assert.equal(payload?.nombre, "Funcionario de Prueba");
    assert.equal(payload?.grado, "Sgto. 1ro.");
  });

  it("rechaza un token con la firma alterada", () => {
    const token = crearTokenSesion({
      id: "funcionario",
      nombre: "Funcionario de Prueba",
      exp: Date.now() + SESION_TTL_MS,
    });

    const [cuerpo, firma] = token.split(".");
    const alterado = `${cuerpo}.${firma.slice(0, -1)}${
      firma.endsWith("a") ? "b" : "a"
    }`;

    assert.equal(verificarTokenSesion(alterado), null);
  });

  it("rechaza un token expirado", () => {
    const token = crearTokenSesion({
      id: "funcionario",
      nombre: "Funcionario de Prueba",
      exp: Date.now() - 1000,
    });

    assert.equal(verificarTokenSesion(token), null);
  });

  it("rechaza valores que no son tokens", () => {
    assert.equal(verificarTokenSesion(undefined), null);
    assert.equal(verificarTokenSesion(""), null);
    assert.equal(verificarTokenSesion("sin.puntos"), null);
  });
});

describe("usuarios del entorno", () => {
  it("no hay usuarios si USUARIOS_JSON no está definida", () => {
    const original = process.env.USUARIOS_JSON;
    delete process.env.USUARIOS_JSON;

    try {
      assert.equal(hayUsuariosConfigurados(), false);
      assert.deepEqual(listarUsuarios(), []);
      assert.equal(buscarUsuario("cualquiera"), null);
    } finally {
      if (original !== undefined) process.env.USUARIOS_JSON = original;
    }
  });

  it("ignora un JSON inválido", () => {
    const original = process.env.USUARIOS_JSON;
    process.env.USUARIOS_JSON = "esto no es json";

    try {
      assert.equal(hayUsuariosConfigurados(), false);
    } finally {
      if (original !== undefined) process.env.USUARIOS_JSON = original;
    }
  });

  it("encuentra un usuario configurado", () => {
    const original = process.env.USUARIOS_JSON;
    process.env.USUARIOS_JSON = JSON.stringify([
      { id: "prueba", nombre: "Funcionario de Prueba", password: "clave" },
    ]);

    try {
      assert.equal(hayUsuariosConfigurados(), true);
      assert.equal(buscarUsuario("prueba")?.nombre, "Funcionario de Prueba");
      assert.equal(buscarUsuario("prueba")?.grado, null);
    } finally {
      if (original !== undefined) process.env.USUARIOS_JSON = original;
    }
  });

  it("conserva el grado cuando está configurado", () => {
    const original = process.env.USUARIOS_JSON;
    process.env.USUARIOS_JSON = JSON.stringify([
      {
        id: "prueba",
        nombre: "Funcionario de Prueba",
        grado: "Sgto. 1ro.",
        password: "clave",
      },
    ]);

    try {
      assert.equal(buscarUsuario("prueba")?.grado, "Sgto. 1ro.");
    } finally {
      if (original !== undefined) process.env.USUARIOS_JSON = original;
    }
  });
});

describe("límite de uso", () => {
  it("bloquea al superar el máximo en la ventana", () => {
    const clave = "test:maximo";
    const maximo = 3;

    for (let i = 0; i < maximo; i++) {
      assert.equal(
        registrarUso(clave, { maximo, ventanaMs: 60_000 }).permitido,
        true
      );
    }

    const resultado = registrarUso(clave, { maximo, ventanaMs: 60_000 });

    assert.equal(resultado.permitido, false);
    assert.equal(resultado.restantes, 0);
    assert.ok(resultado.reintentoEnSegundos > 0);
  });

  it("permite de nuevo tras limpiar el registro", () => {
    const clave = "test:limpiar";
    registrarUso(clave, { maximo: 1, ventanaMs: 60_000 });
    assert.equal(
      registrarUso(clave, { maximo: 1, ventanaMs: 60_000 }).permitido,
      false
    );

    limpiarUso(clave);

    assert.equal(
      registrarUso(clave, { maximo: 1, ventanaMs: 60_000 }).permitido,
      true
    );
  });

  it("descarta las marcas fuera de la ventana", async () => {
    const clave = "test:ventana";
    registrarUso(clave, { maximo: 1, ventanaMs: 1 });

    // Tras 5 ms la marca anterior queda fuera de la ventana.
    await new Promise((resolve) => setTimeout(resolve, 5));

    assert.equal(
      registrarUso(clave, { maximo: 1, ventanaMs: 1 }).permitido,
      true
    );
  });
});

describe("validación de entrada", () => {
  it("acepta un mensaje normal", () => {
    const resultado = esquemaMensaje.safeParse({ mensaje: "  Hubo un hurto.  " });
    assert.equal(resultado.success, true);
    assert.equal(resultado.success && resultado.data.mensaje, "Hubo un hurto.");
  });

  it("rechaza un mensaje vacío", () => {
    assert.equal(esquemaMensaje.safeParse({ mensaje: "   " }).success, false);
  });

  it("acepta un acta de aprehensor completa", () => {
    const acta = "a".repeat(15_000);
    assert.equal(esquemaMensaje.safeParse({ mensaje: acta }).success, true);
  });

  it("rechaza un mensaje que supera el máximo", () => {
    const largo = "a".repeat(MENSAJE_MAXIMO + 1);
    assert.equal(esquemaMensaje.safeParse({ mensaje: largo }).success, false);
  });

  it("lee un cuerpo JSON válido", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST",
      body: JSON.stringify({ a: 1 }),
    });

    const resultado = await leerJsonLimitado(request);

    assert.equal(resultado.ok, true);
    assert.equal(resultado.ok && (resultado.datos as { a: number }).a, 1);
  });

  it("rechaza un cuerpo que no es JSON", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST",
      body: "esto no es json",
    });

    const resultado = await leerJsonLimitado(request);

    assert.equal(resultado.ok, false);
    assert.equal(!resultado.ok && resultado.motivo, "formato");
  });

  it("rechaza un cuerpo demasiado grande", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST",
      body: JSON.stringify({ texto: "a".repeat(2000) }),
    });

    const resultado = await leerJsonLimitado(request, { maximo: 100 });

    assert.equal(resultado.ok, false);
    assert.equal(!resultado.ok && resultado.motivo, "tamaño");
  });
});

describe("traducción de errores", () => {
  it("devuelve 400 para una entrada inválida", () => {
    const resultado = errorComoJson(new ErrorEntradaInvalida("Mensaje vacío."));
    assert.equal(resultado.status, 400);
    assert.equal(resultado.body.error, "Mensaje vacío.");
  });

  it("oculta los detalles técnicos", () => {
    const mensaje = mensajeAmigable(new Error("ECONNREFUSED 10.0.0.1:5432"));
    assert.ok(!mensaje.includes("10.0.0.1"));
  });

  it("usa un mensaje genérico para errores desconocidos", () => {
    assert.equal(
      mensajeAmigable(new Error("falla interna de la base de datos")),
      "Ocurrió un error inesperado. Intente de nuevo."
    );
  });
});
