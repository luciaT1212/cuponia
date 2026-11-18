import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  inMemoryPersistence,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  deleteUser,
} from 'firebase/auth';
import app from '../firebase';
import { addEmpleado } from './adminService';

/**
 * Crea una cuenta sin sustituir la sesión del administrador.
 * El documento de empleado se escribe usando la sesión principal.
 */
export async function crearEmpleadoConCuenta(datos, password) {
  const principalAuth = getAuth(app);
  const administrador = principalAuth.currentUser;

  if (!administrador) {
    throw new Error('Debes iniciar sesión para crear empleados.');
  }

  const correo = String(datos.correo || '').trim().toLowerCase();
  const empresaId = String(datos.empresaId || '').trim();

  if (!correo || !empresaId || !password) {
    throw new Error('Correo, empresa y contraseña son obligatorios.');
  }

  const secundaria = initializeApp(
    app.options,
    'alta-empleado-' + crypto.randomUUID()
  );

  let cuentaCreada;
  let perfilGuardado = false;

  try {
    const secundariaAuth = initializeAuth(secundaria, {
      persistence: inMemoryPersistence,
    });

    const emulator = principalAuth.emulatorConfig;

    if (emulator) {
      const host = emulator.host.includes(':')
        ? '[' + emulator.host + ']'
        : emulator.host;

      connectAuthEmulator(
        secundariaAuth,
        emulator.protocol + '://' + host + ':' + emulator.port
      );
    }

    const credencial = await createUserWithEmailAndPassword(
      secundariaAuth,
      correo,
      password
    );
    cuentaCreada = credencial.user;

    if (principalAuth.currentUser?.uid !== administrador.uid) {
      throw new Error('La sesión cambió durante el alta. Intenta nuevamente.');
    }

    const empleadoId = await addEmpleado({
      nombres: datos.nombres,
      apellidos: datos.apellidos,
      correo,
      empresaId,
      empresaAdminUid: administrador.uid,
      uid: cuentaCreada.uid,
    });

    perfilGuardado = true;

    return {
      empleadoId,
      uid: cuentaCreada.uid,
      correo,
    };
  } catch (error) {
    if (cuentaCreada && !perfilGuardado) {
      try {
        await deleteUser(cuentaCreada);
      } catch (errorLimpieza) {
        throw new AggregateError(
          [error, errorLimpieza],
          'No se completó el alta y no se pudo eliminar la cuenta recién creada.'
        );
      }
    }

    throw error;
  } finally {
    await deleteApp(secundaria);
  }
}
