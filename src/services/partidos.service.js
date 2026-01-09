// src/services/partidos.service.js
import { API_URL } from "../config/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

/** Obtener token guardado en AsyncStorage */
const getToken = async () => {
  const token = await AsyncStorage.getItem("token");
  if (!token) throw new Error("Token no encontrado");
  return token;
};

/** Helper para fetch con token */
const fetchConToken = async (endpoint, options = {}) => {
  try {
    const token = await getToken();

    const headers = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    };

    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || `Error ${res.status}: ${res.statusText}`);
    }

    return data;
  } catch (error) {
    throw error;
  }
};

/** GET: Campeonatos activos */
export const obtenerCampeonatosActivos = async () => {
  const response = await fetchConToken("/partidos/campeonatos/activos");
  return response.data || [];
};

/** GET: Partidos de un campeonato (TODOS, sin filtros ni paginación) */
export const obtenerPartidosPendientes = async (campeonatoId) => {
  const response = await fetchConToken(`/partidos/${campeonatoId}/partidos`);
  return {
    partidos: response.partidos || [],
    total: response.total || 0
  };
};

/** GET: Detalle de un partido */
export const obtenerDetallePartido = async (idPartido) => {
  const response = await fetchConToken(`/partidos/detalle/${idPartido}`);
  if (!response.success) throw new Error(response.message || "Error al obtener detalle del partido");
  return response.data;
};

/** GET: Verificar si un partido ya fue registrado */
export const verificarPartidoYaRegistrado = async (idPartido) => {
  return await fetchConToken(`/partidos/${idPartido}/verificar-registro`);
};

/** POST: Registrar resultado de un partido */
export const registrarResultadoPartido = async (idPartido, datos) => {
  return await fetchConToken(`/partidos/${idPartido}/registrar`, {
    method: "POST",
    body: JSON.stringify(datos)
  });
};

/** GET: Historial del vocal */
export const obtenerHistorialVocal = async () => {
  const response = await fetchConToken("/partidos/historial");
  return response.data || [];
};

/** GET: Verificar integridad de acta */
export const verificarIntegridadActa = async (idPartido) => {
  return await fetchConToken(`/partidos/${idPartido}/verificar-integridad`);
};

/** GET: Estadísticas del vocal */
export const obtenerEstadisticasVocal = async () => {
  const response = await fetchConToken("/partidos/estadisticas");
  return response.data || response;
};

/** GET: Conteo por estado de un campeonato */
export const obtenerConteoEstados = async (campeonatoId) => {
  const response = await fetchConToken(`/partidos/${campeonatoId}/conteo-estados`);
  return response.data || response;
};

/** Funciones utilitarias */
export const formatearFechaHora = (fechaString) => {
  if (!fechaString || fechaString === "Por definir") return "Por definir";
  const fecha = new Date(fechaString);
  if (isNaN(fecha.getTime())) return fechaString;
  return fecha.toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

export const obtenerEstadoPartido = (estado) => {
  const estados = {
    'pendiente': { texto: 'Pendiente', color: '#FF9800', icon: 'clock-outline' },
    'en_juego': { texto: 'En Juego', color: '#2196F3', icon: 'play-circle-outline' },
    'finalizado': { texto: 'Finalizado', color: '#4CAF50', icon: 'check-circle-outline' }
  };
  return estados[estado] || { texto: estado || 'Desconocido', color: '#666', icon: 'help-circle-outline' };
};

export const estaDisponibleParaRegistro = (partido) => {
  if (!partido) return false;
  const noRegistrado = !partido.ya_registrado;
  const estadoValido = partido.estado === 'pendiente' || partido.estado === 'en_juego';
  return noRegistrado && estadoValido;
};
