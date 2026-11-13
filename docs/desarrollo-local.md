# Desarrollo local con emuladores

## Requisitos

- Node.js: versión indicada en .node-version.
- Java 21.
- Firebase CLI 15.36.0, versión utilizada en la verificación inicial.

## Instalación

Desde la raíz del repositorio:

```bash
fnm use
npm ci
```

## Iniciar los servicios locales

En una terminal:

```bash
firebase emulators:start --only auth,firestore,storage --project demo-cuponia
```

Mantener esa terminal abierta.

En otra terminal:

```bash
VITE_USE_FIREBASE_EMULATORS=true npm run dev -- --host 127.0.0.1
```

Abrir la dirección que indique Vite.

La aplicación utiliza configuración ficticia de demo-cuponia cuando
VITE_USE_FIREBASE_EMULATORS=true. No requiere credenciales reales.
Este modo solo está permitido en desarrollo.

## Servicios

- Authentication: 127.0.0.1:9099.
- Firestore: 127.0.0.1:8080.
- Storage: 127.0.0.1:9199.
- Emulator UI: usar la dirección indicada al arrancar.

## Verificación manual realizada

- Registro de un usuario ficticio desde la aplicación.
- Usuario visible en Authentication local.
- Perfil visible en clientes con el mismo UID.
- Cierre de sesión y nuevo inicio.
- Sesión conservada al recargar la página.

Storage y las restricciones de autorización siguen pendientes de prueba.
Las reglas actuales conservan los problemas señalados en la auditoría.

## Detener el entorno

Presionar Control + C en cada terminal que ejecuta un servicio.

Sin configurar exportación e importación, los datos de prueba no se
conservan entre reinicios de los emuladores. Utilizar solo datos ficticios.
