import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  crearTokenSesion,
  hashPassword,
  SESION_TTL_MS,
  verificarPassword,
  verificarTokenSesion,
} from "@/lib/sesion";
import {
  dejariaSinAdministradores,
  esquemaActualizarUsuario,
  esquemaCrearUsuario,
  idUsuarioValido,
  normalizarIdUsuario,
} from "@/lib/usuarios";
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
      rol: "ADMIN",
      exp: Date.now() + SESION_TTL_MS,
    });

    const payload = verificarTokenSesion(token);

    assert.equal(payload?.id, "funcionario");
    assert.equal(payload?.nombre, "Funcionario de Prueba");
    assert.equal(payload?.grado, "Sgto. 1ro.");
    assert.equal(payload?.rol, "ADMIN");
  });

  it("trata como funcionario un token sin rol (sesión anterior a los roles)", () => {
    const token = crearTokenSesion({
      id: "funcionario",
      nombre: "Funcionario de Prueba",
      exp: Date.now() + SESION_TTL_MS,
    } as never);

    assert.equal(verificarTokenSesion(token)?.rol, "FUNCIONARIO");
  });

  it("rechaza un token con la firma alterada", () => {
    const token = crearTokenSesion({
      id: "funcionario",
      nombre: "Funcionario de Prueba",
      rol: "FUNCIONARIO",
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
      rol: "FUNCIONARIO",
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

describe("identificadores de funcionario", () => {
  it("normaliza tildes, mayúsculas y espacios", () => {
    assert.equal(normalizarIdUsuario("Daniel Hernández"), "daniel.hernandez");
    assert.equal(normalizarIdUsuario("  DANIEL  "), "daniel");
    assert.equal(normalizarIdUsuario("José Pérez-Soto"), "jose.perez-soto");
  });

  it("acepta solo identificadores utilizables como credencial", () => {
    assert.equal(idUsuarioValido("daniel"), true);
    assert.equal(idUsuarioValido("daniel.hernandez"), true);
    assert.equal(idUsuarioValido("ab"), false);
    assert.equal(idUsuarioValido("-daniel"), false);
    assert.equal(idUsuarioValido("daniel hernandez"), false);
    assert.equal(idUsuarioValido("a".repeat(33)), false);
  });
});

describe("validación de funcionarios", () => {
  it("acepta un alta completa y normaliza el ID", () => {
    const resultado = esquemaCrearUsuario.safeParse({
      id: "Daniel Hernández",
      nombre: "Daniel Hernández Norambuena",
      grado: "Sgto. 1ro.",
      rol: "ADMIN",
      password: "clave-segura",
    });

    assert.equal(resultado.success, true);
    assert.equal(resultado.success && resultado.data.id, "daniel.hernandez");
    assert.equal(resultado.success && resultado.data.rol, "ADMIN");
  });

  it("usa FUNCIONARIO por defecto y convierte el grado vacío en null", () => {
    const resultado = esquemaCrearUsuario.safeParse({
      id: "daniel",
      nombre: "Daniel Hernández",
      grado: "",
      password: "clave-segura",
    });

    assert.equal(resultado.success, true);
    assert.equal(resultado.success && resultado.data.rol, "FUNCIONARIO");
    assert.equal(resultado.success && resultado.data.grado, null);
  });

  it("rechaza contraseñas cortas", () => {
    const resultado = esquemaCrearUsuario.safeParse({
      id: "daniel",
      nombre: "Daniel Hernández",
      password: "corta",
    });

    assert.equal(resultado.success, false);
  });

  it("rechaza IDs y roles inválidos", () => {
    const porId = esquemaCrearUsuario.safeParse({
      id: "a",
      nombre: "Daniel Hernández",
      password: "clave-segura",
    });
    const porRol = esquemaCrearUsuario.safeParse({
      id: "daniel",
      nombre: "Daniel Hernández",
      rol: "SUPERADMIN",
      password: "clave-segura",
    });

    assert.equal(porId.success, false);
    assert.equal(porRol.success, false);
  });

  it("valida la edición de un funcionario", () => {
    assert.equal(
      esquemaActualizarUsuario.safeParse({
        nombre: "Daniel Hernández",
        grado: null,
        rol: "FUNCIONARIO",
      }).success,
      true
    );

    assert.equal(
      esquemaActualizarUsuario.safeParse({
        nombre: "D",
        rol: "ADMIN",
      }).success,
      false
    );
  });
});

describe("regla del último administrador", () => {
  it("bloquea desactivar o eliminar al único administrador", () => {
    assert.equal(
      dejariaSinAdministradores({
        rolActual: "ADMIN",
        quedaActivo: false,
        rolNuevo: "ADMIN",
        administradoresActivos: 1,
      }),
      true
    );

    assert.equal(
      dejariaSinAdministradores({
        rolActual: "ADMIN",
        quedaActivo: false,
        rolNuevo: null,
        administradoresActivos: 1,
      }),
      true
    );
  });

  it("bloquea rebajar al único administrador", () => {
    assert.equal(
      dejariaSinAdministradores({
        rolActual: "ADMIN",
        quedaActivo: true,
        rolNuevo: "FUNCIONARIO",
        administradoresActivos: 1,
      }),
      true
    );
  });

  it("permite los cambios cuando hay otro administrador", () => {
    assert.equal(
      dejariaSinAdministradores({
        rolActual: "ADMIN",
        quedaActivo: false,
        rolNuevo: "ADMIN",
        administradoresActivos: 2,
      }),
      false
    );
  });

  it("no se aplica a funcionarios comunes ni a quien sigue siendo administrador", () => {
    assert.equal(
      dejariaSinAdministradores({
        rolActual: "FUNCIONARIO",
        quedaActivo: false,
        rolNuevo: null,
        administradoresActivos: 1,
      }),
      false
    );

    assert.equal(
      dejariaSinAdministradores({
        rolActual: "ADMIN",
        quedaActivo: true,
        rolNuevo: "ADMIN",
        administradoresActivos: 1,
      }),
      false
    );
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
