  import { API_URL } from "../config/api";
  import AsyncStorage from "@react-native-async-storage/async-storage";

  /* ===============================
    OBTENER TOKEN
  =============================== */
 const getToken = async () => {
  const token = await AsyncStorage.getItem("token");
  if (!token) throw new Error("Token no encontrado");
  return token;
};
  /* ===============================
    FETCH CON TOKEN
  =============================== */
  const fetchConToken = async (endpoint, options = {}) => {
  try {
    const token = await getToken();

    const headers = {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    };

    // ⚠️ SOLO JSON SI NO ES FormData
    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    console.log("[REGISTRO API] Fetch:", `${API_URL}${endpoint}`);

    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    });

    const text = await res.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch {
      console.error("❌ Respuesta NO JSON:", text);
      throw new Error("Respuesta inválida del servidor");
    }

    if (!res.ok) {
      console.error("[REGISTRO API ERROR]", res.status, data);
      throw new Error(data.message || "Error en petición");
    }

    console.log("[REGISTRO API OK]", data);
    return data;

  } catch (error) {
    console.error("[REGISTRO FETCH ERROR]", error.message);
    throw error;
  }
};

  /* ===============================
    DETALLE DEL PARTIDO
  =============================== */
  export const obtenerDetallePartido = async (idPartido) => {
    const response = await fetchConToken(`/registro/partidos/${idPartido}/detalle`);
    if (!response?.success) {
      throw new Error(response?.error || 'Error al obtener detalle del partido');
    }
    return response.data;
  };

  /* ===============================
    INICIAR PARTIDO
  =============================== */
  export const iniciarPartido = async (idPartido) => {
    const response = await fetchConToken(
      `/registro/partidos/${idPartido}/iniciar`,
      { method: "PUT" } // según router
    );
    return response;
  };

  /* ===============================
    ACTUALIZAR MARCADOR
  =============================== */
  export const actualizarMarcador = async (idPartido, golesLocal, golesVisitante) => {
    const response = await fetchConToken(
      `/registro/partidos/${idPartido}/marcador`,
      {
        method: "PUT",
        body: JSON.stringify({ golesLocal, golesVisitante })
      }
    );
    return response;
  };

  /* ===============================
    ACTUALIZAR FECHA Y HORA DEL ENCUENTRO
  =============================== */
  export const actualizarEncuentro = async (idPartido, fecha_encuentro, hora_encuentro) => {
    const body = { fecha_encuentro, hora_encuentro };

    const response = await fetchConToken(
      `/registro/partidos/${idPartido}/actualizar-encuentro`,
      {
        method: "PUT",
        body: JSON.stringify(body)
      }
    );

    return response;
  };

  /* ===============================
    FINALIZAR PARTIDO
  =============================== */
 export const finalizarPartido = async (idPartido, body) => {
  return await fetchConToken(
    `/registro/partidos/${idPartido}/finalizar`,
    {
      method: "PUT",
      body: JSON.stringify(body)
    }
  );
};

/* ===============================
   REGISTRAR INASISTENCIA (sin hash)
=============================== */
export const registrarInasistencia = async (
  idPartido,
  equipoQueNoAsistio,
  vocalId,
  arbitroId
) => {
  if (!idPartido) {
    throw new Error("ID de partido requerido");
  }
  if (!['local', 'visitante'].includes(equipoQueNoAsistio)) {
    throw new Error("Debe indicar 'local' o 'visitante'");
  }
  if (!vocalId || !arbitroId) {
    throw new Error("Debe proporcionar vocal y árbitro");
  }

  return await fetchConToken(
    `/registro/partidos/${idPartido}/inasistencia`,
    {
      method: "PUT",
      body: JSON.stringify({
        equipoQueNoAsistio,
        vocalId,
        arbitroId
      })
    }
  );
};
/* ===============================
   SUBIR ACTAS DEL PARTIDO
=============================== */
export const subirActasPartido = async (idPartido, actas) => {
  console.log('==============================');
  console.log('🧪 INICIO subirActasPartido');
  console.log('🆔 idPartido:', idPartido);
  console.log('📸 Actas recibidas:', actas);
  console.log('==============================');

  const token = await AsyncStorage.getItem("token");

  console.log('🔐 Token obtenido:', token ? '✅ SÍ' : '❌ NO');

  if (!token) {
    throw new Error("Token no encontrado");
  }

  const formData = new FormData();

  actas.forEach((acta, index) => {
    console.log(`➡️ Procesando acta ${index}:`, acta);

    if (acta.tipo === 'frente') {
      console.log('📤 Agregando ACTA FRENTE');
      formData.append('frente', {
        uri: acta.uri,
        name: acta.name || 'frente.jpg',
        type: acta.type || 'image/jpeg'
      });
    }

    if (acta.tipo === 'dorso') {
      console.log('📤 Agregando ACTA DORSO');
      formData.append('dorso', {
        uri: acta.uri,
        name: acta.name || 'dorso.jpg',
        type: acta.type || 'image/jpeg'
      });
    }
  });

  // 🔎 DEBUG FORMDATA (React Native)
  console.log('📦 FormData generado:');
  if (formData._parts) {
    formData._parts.forEach(part => {
      console.log('   ➜', part[0], part[1]);
    });
  } else {
    console.log('⚠️ No se puede inspeccionar FormData directamente');
  }

  const url = `${API_URL}/registro/partidos/${idPartido}/actas`;

  console.log('🌐 URL FINAL:', url);
  console.log('🧪 Headers:', {
    Authorization: `Bearer ${token}`
  });

  let response;

  try {
    console.log('🚀 ENVIANDO REQUEST...');
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
        // ⛔ NO Content-Type
      },
      body: formData
    });
  } catch (error) {
    console.error('🌐 ERROR DE RED (fetch):', error);
    throw error;
  }

  console.log('📡 Response status:', response.status);
  console.log('📡 Response ok:', response.ok);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Error subiendo actas (backend):', errorText);
    throw new Error(errorText || 'Error subiendo actas');
  }

  const data = await response.json();
  console.log('✅ Actas subidas correctamente:', data);

  console.log('🧪 FIN subirActasPartido');
  console.log('==============================');

  return data;
};

