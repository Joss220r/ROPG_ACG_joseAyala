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
| A1 | ROPC con datos validos | 200 y JWT utilizable | Verificado por `npm run test:ropc`; falta captura | Aprobado por script |
| A2 | ROPC con password incorrecto | 400 con `invalid_grant` | Verificado por `npm run test:ropc`; falta captura | Aprobado por script |
| A3 | Token ausente, alterado o sin scope | 401/403 sin exponer recurso | Verificado por `npm run test:ropc`; falta captura | Aprobado por script |
| B1 | Authorization Code + consentimiento + PKCE valido | Codigo y token emitidos | Verificado por `npm run test:pkce`; falta captura | Aprobado por script |
| B2 | `redirect_uri` no registrado | Solicitud rechazada sin redireccion abierta | Verificado por `npm run test:pkce`; falta captura | Aprobado por script |
| B3 | `code_verifier` incorrecto | 400 con `invalid_grant` | Verificado por `npm run test:pkce`; falta captura | Aprobado por script |
| B4 | Segundo canje del mismo codigo | 400; codigo inutilizable | Verificado por `npm run test:pkce`; falta captura | Aprobado por script |
| B5 | `state` recibido distinto al enviado | Cliente cancela el flujo | Verificado por comparacion del cliente en `npm run test:pkce`; falta captura | Aprobado por script |

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

La practica diferencia autenticacion y autorizacion usando dos flujos. En ROPC, el usuario se autentica con username y password, y el servidor autoriza scopes antes de emitir un JWT para el cliente heredado. En Authorization Code con PKCE, el usuario se autentica ante el servidor de autorizacion, aprueba consentimiento y el cliente solo recibe un codigo temporal. Los recursos protegidos no confian en el cliente directamente: validan firma, expiracion, audiencia, emisor y scopes del token antes de devolver perfil o playlists.

## Analisis comparativo

Ver `docs/ANALISIS_COMPARATIVO.md`.

## Diagramas

- `diagrams/ropc.puml`
- `diagrams/auth-code-pkce.puml`

## Coleccion y pruebas automatizadas

- `postman/MusicHubOAuth.postman_collection.json`
- `tests/ropc.acceptance.mjs`
- `tests/pkce.acceptance.mjs`
