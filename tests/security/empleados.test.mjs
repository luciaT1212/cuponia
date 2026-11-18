import { readFile } from 'node:fs/promises';
import { before, after, test } from 'node:test';
import {
  initializeTestEnvironment,
  assertFails,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

let entorno;

before(async () => {
  const rules = await readFile(
    new URL('../../firestore.rules', import.meta.url),
    'utf8'
  );

  entorno = await initializeTestEnvironment({
    projectId: 'demo-cuponia-security',
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules,
    },
  });

  await entorno.withSecurityRulesDisabled(async (contexto) => {
    await setDoc(doc(contexto.firestore(), 'empleados', 'empleado-prueba'), {
      nombres: 'Empleado ficticio',
      empresaId: 'empresa-prueba',
      uid: 'uid-empleado-prueba',
    });
  });
});

after(async () => {
  if (entorno) await entorno.cleanup();
});

test('rechaza la lectura anónima de empleados', async () => {
  const db = entorno.unauthenticatedContext().firestore();

  await assertFails(
    getDoc(doc(db, 'empleados', 'empleado-prueba'))
  );
});

test('rechaza la creación anónima de empleados', async () => {
  const db = entorno.unauthenticatedContext().firestore();

  await assertFails(
    setDoc(doc(db, 'empleados', 'empleado-no-autorizado'), {
      nombres: 'Registro no autorizado',
      empresaId: 'empresa-prueba',
    })
  );
});

test('rechaza que un cliente se asigne una empresa', async () => {
  const db = entorno.authenticatedContext('cliente-prueba').firestore();

  await assertFails(
    setDoc(doc(db, 'empleadoByUid', 'cliente-prueba'), {
      empresaId: 'empresa-ajena',
    })
  );
});

test('permite al empleado consultar su propio registro', async () => {
  const { assertSucceeds } = await import('@firebase/rules-unit-testing');
  const db = entorno.authenticatedContext('uid-empleado-prueba').firestore();

  await assertSucceeds(
    getDoc(doc(db, 'empleados', 'empleado-prueba'))
  );
});

test('permite al administrador crear empleados de su empresa', async () => {
  const { assertSucceeds } = await import('@firebase/rules-unit-testing');

  await entorno.withSecurityRulesDisabled(async (contexto) => {
    await setDoc(doc(contexto.firestore(), 'empresas', 'empresa-propia'), {
      nombre: 'Empresa ficticia',
      adminUid: 'admin-empresa-prueba',
      correo: 'admin@example.test',
      estado: 'aprobada',
    });
  });

  const db = entorno.authenticatedContext('admin-empresa-prueba', {
    email: 'admin@example.test',
    email_verified: true,
  }).firestore();

  await assertSucceeds(
    setDoc(doc(db, 'empleados', 'nuevo-empleado-propio'), {
      empresaId: 'empresa-propia',
      empresaAdminUid: 'admin-empresa-prueba',
      nombres: 'Empleado',
      apellidos: 'Ficticio',
      correo: 'empleado@example.test',
    })
  );
});

test('rechaza que un administrador cree empleados en otra empresa', async () => {
  await entorno.withSecurityRulesDisabled(async (contexto) => {
    await setDoc(doc(contexto.firestore(), 'empresas', 'empresa-ajena'), {
      nombre: 'Otra empresa ficticia',
      adminUid: 'otro-administrador',
      correo: 'otro@example.test',
      estado: 'aprobada',
    });
  });

  const db = entorno.authenticatedContext('admin-empresa-prueba', {
    email: 'admin@example.test',
    email_verified: true,
  }).firestore();

  await assertFails(
    setDoc(doc(db, 'empleados', 'empleado-empresa-ajena'), {
      empresaId: 'empresa-ajena',
      empresaAdminUid: 'admin-empresa-prueba',
      nombres: 'Registro no autorizado',
      apellidos: 'Prueba',
      correo: 'ajeno@example.test',
    })
  );
});

test('rechaza que un empleado cambie su asignación de empresa', async () => {
  await entorno.withSecurityRulesDisabled(async (contexto) => {
    await setDoc(
      doc(contexto.firestore(), 'empleadoByUid', 'empleado-vinculado'),
      { empresaId: 'empresa-propia' }
    );
  });

  const db = entorno.authenticatedContext('empleado-vinculado').firestore();

  await assertFails(
    setDoc(doc(db, 'empleadoByUid', 'empleado-vinculado'), {
      empresaId: 'empresa-ajena',
    })
  );
});

test('rechaza editar empleados de otra empresa', async () => {
  const { updateDoc } = await import('firebase/firestore');

  await entorno.withSecurityRulesDisabled(async (contexto) => {
    await setDoc(doc(contexto.firestore(), 'empleados', 'ajeno-edicion'), {
      empresaId: 'empresa-ajena',
      empresaAdminUid: 'otro-administrador',
      nombres: 'Empleado ajeno',
    });
  });

  const db = entorno.authenticatedContext('admin-empresa-prueba', {
    email: 'admin@example.test',
    email_verified: true,
  }).firestore();

  await assertFails(
    updateDoc(doc(db, 'empleados', 'ajeno-edicion'), {
      nombres: 'Cambio no autorizado',
    })
  );
});

test('rechaza eliminar empleados de otra empresa', async () => {
  const { deleteDoc } = await import('firebase/firestore');

  await entorno.withSecurityRulesDisabled(async (contexto) => {
    await setDoc(doc(contexto.firestore(), 'empleados', 'ajeno-baja'), {
      empresaId: 'empresa-ajena',
      empresaAdminUid: 'otro-administrador',
      nombres: 'Empleado ajeno',
    });
  });

  const db = entorno.authenticatedContext('admin-empresa-prueba', {
    email: 'admin@example.test',
    email_verified: true,
  }).firestore();

  await assertFails(
    deleteDoc(doc(db, 'empleados', 'ajeno-baja'))
  );
});

test('permite la asignación legítima y revoca acceso tras la baja', async () => {
  const { assertSucceeds } = await import('@firebase/rules-unit-testing');
  const { deleteDoc } = await import('firebase/firestore');

  await entorno.withSecurityRulesDisabled(async (contexto) => {
    const db = contexto.firestore();

    await setDoc(doc(db, 'empresas', 'empresa-revocacion'), {
      adminUid: 'admin-revocacion',
      correo: 'admin-revocacion@example.test',
      estado: 'aprobada',
    });

    await setDoc(doc(db, 'empleados', 'empleado-revocacion'), {
      uid: 'uid-revocacion',
      empresaId: 'empresa-revocacion',
      empresaAdminUid: 'admin-revocacion',
      nombres: 'Empleado ficticio',
      apellidos: 'Prueba',
      correo: 'empleado-revocacion@example.test',
    });

    await setDoc(doc(db, 'cupones', 'cupon-revocacion'), {
      clienteId: 'otro-cliente',
      empresaId: 'empresa-revocacion',
      estado: 'disponible',
    });
  });

  const empleadoDb = entorno.authenticatedContext('uid-revocacion').firestore();

  await assertSucceeds(
    setDoc(doc(empleadoDb, 'empleadoByUid', 'uid-revocacion'), {
      empleadoId: 'empleado-revocacion',
      empresaId: 'empresa-revocacion',
    })
  );

  await assertSucceeds(
    getDoc(doc(empleadoDb, 'cupones', 'cupon-revocacion'))
  );

  const adminDb = entorno.authenticatedContext('admin-revocacion', {
    email: 'admin-revocacion@example.test',
    email_verified: true,
  }).firestore();

  await assertSucceeds(
    deleteDoc(doc(adminDb, 'empleados', 'empleado-revocacion'))
  );

  await assertFails(
    getDoc(doc(empleadoDb, 'cupones', 'cupon-revocacion'))
  );
});
