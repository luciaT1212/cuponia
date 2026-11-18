import { collection, doc, getDoc, getDocs, query, where, limit, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Crea/actualiza empleadoByUid/{uid} con { empresaId }. Debe llamarlo el propio empleado (tras crear su cuenta).
 */
export async function setEmpleadoByUid(uid, empresaId, empleadoId) {
  if (!uid || !empresaId || !empleadoId) {
    throw new Error('La asignación requiere UID, empresa y empleado.');
  }

  const empleadoSnap = await getDoc(doc(db, 'empleados', empleadoId));

  if (!empleadoSnap.exists()) {
    throw new Error('El empleado ya no existe.');
  }

  const empleado = empleadoSnap.data();

  if (empleado.uid !== uid || empleado.empresaId !== empresaId) {
    throw new Error('La asignación no coincide con el registro del empleado.');
  }

  const referencia = doc(db, 'empleadoByUid', uid);
  const asignacionSnap = await getDoc(referencia);

  if (asignacionSnap.exists()) {
    const asignacion = asignacionSnap.data();

    if (
      asignacion.empleadoId !== empleadoId ||
      asignacion.empresaId !== empresaId
    ) {
      throw new Error('La asignación anterior requiere revisión del administrador.');
    }

    return;
  }

  await setDoc(referencia, { empresaId, empleadoId });
}

function normalizarEmpresaId(id) {
  return id === 'empresal' ? 'empresa1' : (id || null);
}

/**
 * Devuelve el empresaId del empleado (desde empleadoByUid). Null si no existe. Normaliza empresal -> empresa1.
 */
export async function getEmpresaIdEmpleado(uid) {
  return ensureEmpleadoByUid(uid);
}

/**
 * Asegura que exista empleadoByUid/{uid} con empresaId para que las reglas permitan al empleado leer/canjear cupones.
 * Si no existe, busca el empleado por uid y escribe el doc. Devuelve el empresaId si existe o se creó.
 */
export async function ensureEmpleadoByUid(uid) {
  if (!uid) return null;

  const empleadosSnap = await getDocs(
    query(
      collection(db, 'empleados'),
      where('uid', '==', uid),
      limit(2)
    )
  );

  if (empleadosSnap.empty) return null;

  if (empleadosSnap.size !== 1) {
    throw new Error('La cuenta tiene varios registros de empleado. Requiere revisión.');
  }

  const empleadoDoc = empleadosSnap.docs[0];
  const empresaId = empleadoDoc.data().empresaId;

  if (!empresaId) {
    throw new Error('El registro del empleado no tiene empresa.');
  }

  await setEmpleadoByUid(uid, empresaId, empleadoDoc.id);

  return normalizarEmpresaId(empresaId);
}

/**
 * Cupones disponibles de una empresa (para pantalla del empleado). Solo estado disponible y no vencidos.
 * Si hay dos IDs para la misma empresa (ej. empresal / empresa1), consulta ambos y une resultados.
 */
const today = () => new Date().toISOString().slice(0, 10);

async function getCuponesDisponiblesPorEmpresaId(empresaId, hoy) {
  const snap = await getDocs(
    query(
      collection(db, 'cupones'),
      where('empresaId', '==', empresaId),
      where('estado', '==', 'disponible'),
      limit(100)
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((c) => (c.fechaLimiteUso || '') >= hoy);
}

export async function getCuponesDisponiblesPorEmpresa(empresaId) {
  if (!empresaId) return [];
  const hoy = today();
  const ids = [empresaId];
  if (empresaId === 'empresal') ids.push('empresa1');
  if (empresaId === 'empresa1') ids.push('empresal');
  const listas = [];
  for (const id of ids) {
    try {
      const lista = await getCuponesDisponiblesPorEmpresaId(id, hoy);
      listas.push(lista);
    } catch {
      // El empleado solo puede leer cupones de su empresaId; el otro id puede dar permission-denied
    }
  }
  const seen = new Set();
  return listas.flat().filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

/**
 * Busca un cupón por código. El empleado solo podrá leer cupones de su empresa (reglas).
 */
export async function getCuponByCodigo(codigo) {
  const c = (codigo || '').toString().trim();
  if (!c) return null;
  const snap = await getDocs(
    query(
      collection(db, 'cupones'),
      where('codigo', '==', c),
      limit(1)
    )
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

/**
 * Marca el cupón como canjeado. Solo permitido si el empleado es de la misma empresa que el cupón.
 */
export async function canjearCupon(cuponId) {
  const ref = doc(db, 'cupones', cuponId);
  await updateDoc(ref, {
    estado: 'canjeado',
    fechaCanje: new Date().toISOString(),
  });
}
