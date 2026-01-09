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
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    };

    console.log("[REGISTRO API] Fetch:", `${API_URL}${endpoint}`);

    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    const data = await res.json();

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
   FINALIZAR PARTIDO
=============================== */
export const finalizarPartido = async (idPartido, body) => {
  const response = await fetchConToken(
    `/registro/partidos/${idPartido}/finalizar`,
    {
      method: "POST",
      body: JSON.stringify(body)
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
