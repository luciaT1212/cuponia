# Línea base de la modernización de Cuponía

## Procedencia

- Repositorio original: https://github.com/rmorataya11/cuponia
- Fork: https://github.com/luciaT1212/cuponia
- Commit original auditado: 6346ffc
- Primer cambio de preparación: ab2a6c8

Cuponía fue desarrollado originalmente en equipo como proyecto académico.
Esta modernización conserva el historial y los créditos originales.
Las nuevas contribuciones se documentarán mediante commits y decisiones técnicas.

## Entorno verificado

- Sistema operativo: macOS
- Shell: zsh
- Gestor de versiones: fnm
- Node.js: 24.22.3
- npm: 11.19.1
- Versión de Node registrada en .node-version

## Resultados iniciales

| Verificación | Resultado |
| --- | --- |
| npm ci | Correcto |
| npm run lint | 9 errores y 2 advertencias |
| npm run build | Correcto |
| Auditoría de dependencias | 27 vulnerabilidades reportadas: 2 bajas, 6 moderadas, 16 altas y 3 críticas |
| Bundle principal | Aproximadamente 1,136 kB minificado y 347 kB gzip |

La auditoría de dependencias identifica paquetes afectados.
La exposición de la aplicación a cada vulnerabilidad todavía debe evaluarse.

## Pendientes conocidos

- Resolver los errores y advertencias de ESLint.
- Revisar y actualizar dependencias de forma controlada.
- Corregir la autorización en Firestore y Storage.
- Reforzar la integridad de compra y canje.
- Preparar un entorno Firebase aislado con datos ficticios.
- Verificar funcionalidad, accesibilidad y responsive en navegador.
- Evaluar la división del bundle para reducir la carga inicial.

## Límites de esta verificación

- El build correcto no demuestra funcionamiento integral ni seguridad.
- No se verificaron las reglas desplegadas en Firebase.
- No se realizaron compras ni canjes contra servicios reales.
- No se ha desplegado la modernización.