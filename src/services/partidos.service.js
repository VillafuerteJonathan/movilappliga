// src/services/partidos.service.js
import { API_URL } from "../config/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Obtener token guardado en AsyncStorage
 */
const getToken = async () => {
  const token = await AsyncStorage.getItem("token");
  if (!token) throw new Error("Token no encontrado");
  return token;
};

/**
 * Helper para hacer fetch con token
 */
const fetchConToken = async (endpoint, options = {}) => {
  try {
    const token = await getToken();

    const headers = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    };

    console.log("[API] Fetch:", `${API_URL}${endpoint}`);

    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    const data = await res.json();

    if (!res.ok) {
      console.error("[API Error] Status:", res.status);
      console.error("[API Error] Response:", data);
      throw new Error(data.message || `Error ${res.status}: ${res.statusText}`);
    }

    console.log("[API Success] Total items:", data.total || data.data?.length || 0);
    return data;
  } catch (error) {
    console.error("[API Fetch Error]", error.message);
    throw error;
  }
};

/**
 * GET: Campeonatos activos
 */
export const obtenerCampeonatosActivos = async () => {
  const response = await fetchConToken("/partidos/campeonatos-activos");
  return response.data || response;
};

/**
 * GET: Partidos pendientes de un campeonato con paginación
 */
export const obtenerPartidosPendientes = async (campeonatoId, pagina = 1, limite = 20, filtros = {}) => {
  // Construir query string con filtros
  const queryParams = new URLSearchParams({
    pagina: pagina.toString(),
    limite: limite.toString(),
    ...filtros
  });

  const response = await fetchConToken(
    `/partidos/campeonatos/${campeonatoId}/partidos-pendientes?${queryParams.toString()}`
  );
  
  return {
    partidos: response.data || [],
    total: response.total || 0,
    pagina: pagina,
    limite: limite,
    totalPaginas: Math.ceil((response.total || 0) / limite)
  };
};

/**
 * GET: Detalle de un partido
 */
export const obtenerPartidoDetalle = async (idPartido) => {
  const response = await fetchConToken(`/partidos/partidos/${idPartido}`);
  return response.data || response;
};

/**
 * POST: Registrar resultado de un partido
 */
export const registrarResultado = async (idPartido, body) => {
  const response = await fetchConToken(`/partidos/partidos/${idPartido}/registrar-resultado`, {
    method: "POST",
    body: JSON.stringify(body)
  });
  return response.data || response;
};

/**
 * GET: Historial del vocal con paginación
 */
export const obtenerHistorial = async (pagina = 1, limite = 20) => {
  const queryParams = new URLSearchParams({
    pagina: pagina.toString(),
    limite: limite.toString()
  });

  const response = await fetchConToken(`/partidos/historial?${queryParams.toString()}`);
  return {
    historial: response.data || [],
    total: response.total || 0,
    pagina: pagina,
    totalPaginas: Math.ceil((response.total || 0) / limite)
  };
};

/**
 * GET: Verificar integridad de acta
 */
export const verificarIntegridad = async (idPartido) => {
  const response = await fetchConToken(`/partidos/partidos/${idPartido}/verificar-integridad`);
  return response.data || response;
};

/**
 * GET: Estadísticas del vocal
 */
export const obtenerEstadisticas = async () => {
  const response = await fetchConToken("/partidos/estadisticas");
  return response.data || response;
};

/**
 * Función utilitaria: Formatear fecha para mostrar
 */
export const formatearFechaHora = (fechaString) => {
  if (!fechaString) return "Sin fecha";
  
  const fecha = new Date(fechaString);
  return fecha.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Función utilitaria: Obtener estado del partido con color
 */
export const obtenerEstadoPartido = (estado) => {
  const estados = {
    'pendiente': { texto: 'Pendiente', color: '#FFA500' },
    'en_juego': { texto: 'En Juego', color: '#007AFF' },
    'finalizado': { texto: 'Finalizado', color: '#34C759' },
    'suspendido': { texto: 'Suspendido', color: '#FF3B30' },
    'cancelado': { texto: 'Cancelado', color: '#8E8E93' }
  };
  
  return estados[estado] || { texto: estado, color: '#8E8E93' };
};