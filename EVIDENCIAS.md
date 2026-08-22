# Evidencias

## Identificacion

- Nombre completo:
- Carne:
- Seccion:
- Enlace al repositorio:
- Hash del commit evaluado:

## Tabla de pruebas

| ID | Solicitud | Resultado esperado | Resultado obtenido | Estado |
| --- | --- | --- | --- | --- |
| A1 | ROPC con datos validos | 200 y JWT utilizable | Pendiente de captura | Pendiente |
| A2 | ROPC con password incorrecto | 400 con `invalid_grant` | Pendiente de captura | Pendiente |
| A3 | Token ausente, alterado o sin scope | 401/403 sin exponer recurso | Pendiente de captura | Pendiente |
| B1 | Authorization Code + consentimiento + PKCE valido | Codigo y token emitidos | Verificado por `npm run test:pkce`; falta captura | Pendiente |
| B2 | `redirect_uri` no registrado | Solicitud rechazada sin redireccion abierta | Verificado por `npm run test:pkce`; falta captura | Pendiente |
| B3 | `code_verifier` incorrecto | 400 con `invalid_grant` | Verificado por `npm run test:pkce`; falta captura | Pendiente |
| B4 | Segundo canje del mismo codigo | 400; codigo inutilizable | Verificado por `npm run test:pkce`; falta captura | Pendiente |
| B5 | `state` recibido distinto al enviado | Cliente cancela el flujo | El servidor devuelve `state`; falta documentar comparacion del cliente | Pendiente |

## Capturas pendientes

- Ejecucion del servidor.
- Solicitud valida de ROPC con secretos parcialmente ocultos.
- Solicitud ROPC con password incorrecto.
- Acceso exitoso a `/api/me`.
- Rechazo por token ausente, manipulado o sin scope.
- Pantalla de consentimiento de Authorization Code.
- Redireccion con `code` y `state`.
- Canje correcto del codigo usando `code_verifier`.
- Rechazo por `redirect_uri` no registrado, `code_verifier` incorrecto y reutilizacion del codigo.
- Decodificacion de JWT mostrando claims sin publicar firma completa ni secreto.

## Conclusion individual

Pendiente de completar al finalizar ambos flujos.
