
const base = 'http://127.0.0.1:8080/v1/projects/demo-cuponia/databases/(default)/documents';

async function consultar(ruta) {
  const respuesta = await fetch(base + '/' + ruta, { headers: { Authorization: 'Bearer owner' } });

  if (respuesta.status === 404) return null;
  if (!respuesta.ok) {
    throw new Error(await respuesta.text());
  }

  return respuesta.json();
}

function convertir(valor) {
  if (valor === null) return { nullValue: null };
  if (typeof valor === 'boolean') return { booleanValue: valor };
  if (typeof valor === 'number') {
    return Number.isInteger(valor)
      ? { integerValue: String(valor) }
      : { doubleValue: valor };
  }
  return { stringValue: valor };
}

async function guardar(ruta, datos) {
  const existente = await consultar(ruta);

  if (existente && !existente.fields?.demoSeed?.booleanValue) {
    throw new Error('No se sobrescribirá un documento ajeno al script: ' + ruta);
  }

  const fields = Object.fromEntries(
    Object.entries({ ...datos, demoSeed: true })
      .map(([clave, valor]) => [clave, convertir(valor)])
  );

  const respuesta = await fetch(base + '/' + ruta, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields }),
  });

  if (!respuesta.ok) throw new Error(await respuesta.text());
  console.log('Preparado:', ruta);
}

function fecha(dias) {
  const valor = new Date();
  valor.setUTCDate(valor.getUTCDate() + dias);

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/El_Salvador',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(valor);
}

async function main() {
  const empresa = await consultar('empresas/empresa-prueba');

  if (!empresa?.fields?.adminUid?.stringValue) {
    throw new Error('Primero debe existir empresa-prueba con su adminUid.');
  }

  await guardar('rubros/demo-gastronomia', {
    nombre: 'Gastronomía',
    activo: true,
  });

  const ofertas = [
    {
      id: 'demo-cafe-postre',
      titulo: 'Café y postre para dos',
      precioRegular: 16,
      precioOferta: 10,
      descripcion: 'Dos cafés y dos porciones de pastel para compartir una tarde especial.',
      fotoURL: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=80',
    },
    {
      id: 'demo-pizza',
      titulo: 'Pizza artesanal para compartir',
      precioRegular: 22,
      precioOferta: 15,
      descripcion: 'Una pizza artesanal grande con ingredientes seleccionados.',
      fotoURL: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=80',
    },
    {
      id: 'demo-almuerzo',
      titulo: 'Almuerzo especial para dos',
      precioRegular: 30,
      precioOferta: 21,
      descripcion: 'Dos platos principales y dos bebidas en un ambiente acogedor.',
      fotoURL: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80',
    },
  ];

  for (const { id, ...oferta } of ofertas) {
    await guardar('ofertas/' + id, {
      ...oferta,
      empresaId: 'empresa-prueba',
      rubroId: 'demo-gastronomia',
      estado: 'aprobada',
      fechaInicio: fecha(-1),
      fechaFin: fecha(30),
      fechaLimiteUso: fecha(45),
      cantidadLimite: 50,
      cuponesVendidos: 0,
      otrosDetalles: 'Oferta ficticia de portafolio. Sujeta a reserva y disponibilidad. Sin cobros reales.',
    });
  }

  console.log('Listo. Abre el catálogo de Cuponía.');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
