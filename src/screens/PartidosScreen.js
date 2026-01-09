import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  Dimensions,
  Keyboard,
  AppState
} from 'react-native';
import { obtenerPartidosPendientes, obtenerCampeonatosActivos, obtenerDetallePartido } from '../services/partidos.service';
import { formatearFechaHora, obtenerEstadoPartido } from '../services/partidos.service';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Definir constantes fuera del componente
const ESTADOS_DISPONIBLES = [
  { 
    id: 'todos', 
    label: 'Todos', 
    icon: 'format-list-bulleted',
    color: '#2E7D32'
  },
  { 
    id: 'pendiente', 
    label: 'Pendientes', 
    icon: 'clock-outline',
    color: '#FF9800'
  },
  { 
    id: 'en_juego', 
    label: 'En Juego', 
    icon: 'play-circle-outline',
    color: '#2196F3'
  },
  { 
    id: 'finalizado', 
    label: 'Finalizados', 
    icon: 'check-circle-outline',
    color: '#666'
  }
];

const TIPOS_EQUIPO = [
  { id: 'todos', label: 'Todos', icon: 'soccer', color: '#666' },
  { id: 'local', label: 'Local', icon: 'home', color: '#4CAF50' },
  { id: 'visitante', label: 'Visitante', icon: 'map-marker', color: '#FF5722' }
];

const PartidosScreen = ({ navigation, route }) => {
  const { campeonatoId, campeonatoNombre } = route.params || {};
  
  const [campeonatos, setCampeonatos] = useState([]);
  const [campeonatoSeleccionado, setCampeonatoSeleccionado] = useState(null);
  const [partidos, setPartidos] = useState([]);
  const [partidosOriginales, setPartidosOriginales] = useState([]); // Guardar todos los partidos
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalFiltrosVisible, setModalFiltrosVisible] = useState(false);
  const [modalCampeonatosVisible, setModalCampeonatosVisible] = useState(false);
  
  // Filtros
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroTextoAplicado, setFiltroTextoAplicado] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [gruposDisponibles, setGruposDisponibles] = useState([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState('todos');
  const [filtroTipoEquipo, setFiltroTipoEquipo] = useState('todos');

  const searchInputRef = useRef(null);

  // Cargar campeonatos al inicio
  useEffect(() => {
    cargarCampeonatos();
  }, []);

  // Cargar partidos cuando se selecciona un campeonato
  useEffect(() => {
    if (campeonatoSeleccionado) {
      cargarPartidos();
    }
  }, [campeonatoSeleccionado]);

  // Actualizar cuando la app vuelve a primer plano
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active' && campeonatoSeleccionado) {
        console.log('App en primer plano, actualizando partidos...');
        cargarPartidos();
      }
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [campeonatoSeleccionado]);

  // Actualizar grupos disponibles cuando se cargan partidos
  useEffect(() => {
    if (partidosOriginales.length > 0) {
      const grupos = [];
      partidosOriginales.forEach(partido => {
        if (partido.grupo_nombre && !grupos.includes(partido.grupo_nombre)) {
          grupos.push(partido.grupo_nombre);
        }
      });
      grupos.sort();
      setGruposDisponibles(['todos', ...grupos]);
    }
  }, [partidosOriginales]);

  // Aplicar filtros cuando cambian los criterios
  useEffect(() => {
    if (partidosOriginales.length > 0) {
      aplicarFiltrosEnFrontend();
    }
  }, [filtroEstado, filtroTextoAplicado, filtroTipoEquipo, grupoSeleccionado, partidosOriginales]);

  const cargarCampeonatos = async () => {
    try {
      console.log('=== CARGANDO CAMPEONATOS ===');
      setLoading(true);
      const data = await obtenerCampeonatosActivos();
      console.log('Campeonatos obtenidos:', data.length);
      setCampeonatos(data);
      
      if (campeonatoId) {
        const campeonato = data.find(c => c.id_campeonato === campeonatoId);
        if (campeonato) {
          console.log('Campeonato encontrado por ID:', campeonato.nombre);
          setCampeonatoSeleccionado(campeonato);
        } else if (data.length > 0) {
          console.log('Campeonato no encontrado, seleccionando primero:', data[0].nombre);
          setCampeonatoSeleccionado(data[0]);
        }
      } else if (data.length > 0) {
        console.log('Seleccionando primer campeonato:', data[0].nombre);
        setCampeonatoSeleccionado(data[0]);
      } else {
        console.log('No hay campeonatos disponibles');
      }
    } catch (error) {
      console.error('Error cargando campeonatos:', error);
      Alert.alert('Error', 'No se pudieron cargar los campeonatos');
    } finally {
      setLoading(false);
    }
  };

  const cargarPartidos = async () => {
    if (!campeonatoSeleccionado) return;

    try {
      console.log('=== CARGANDO PARTIDOS ===', campeonatoSeleccionado.nombre);
      setLoading(true);
      setRefreshing(false);

      const response = await obtenerPartidosPendientes(campeonatoSeleccionado.id_campeonato);

      console.log('Partidos recibidos:', response.partidos.length);
      
      // Guardar todos los partidos (sin filtrar)
      setPartidosOriginales(response.partidos || []);
      
      // Aplicar filtros iniciales
      aplicarFiltrosEnFrontend(response.partidos || []);
      
    } catch (error) {
      console.error('Error cargando partidos:', error);
      Alert.alert('Error', 'No se pudieron cargar los partidos: ' + error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Función para aplicar filtros en el frontend
  const aplicarFiltrosEnFrontend = (partidosAFiltrar = partidosOriginales) => {
    let filtrados = [...partidosAFiltrar];

    // 1. Filtrar por estado
    if (filtroEstado !== 'todos') {
      filtrados = filtrados.filter(p => p.estado === filtroEstado);
    }

    // 2. Filtrar por grupo
    if (grupoSeleccionado !== 'todos') {
      filtrados = filtrados.filter(p => p.grupo_nombre === grupoSeleccionado);
    }

    // 3. Filtrar por texto
    if (filtroTextoAplicado.trim() !== '') {
      const texto = filtroTextoAplicado.toLowerCase().trim();
      filtrados = filtrados.filter(p => {
        const buscaLocal = p.local_nombre?.toLowerCase().includes(texto);
        const buscaVisitante = p.visitante_nombre?.toLowerCase().includes(texto);
        const buscaGrupo = p.grupo_nombre?.toLowerCase().includes(texto);
        
        if (filtroTipoEquipo === 'local') {
          return buscaLocal;
        } else if (filtroTipoEquipo === 'visitante') {
          return buscaVisitante;
        } else {
          return buscaLocal || buscaVisitante || buscaGrupo;
        }
      });
    }

    // Ordenar los resultados
    filtrados.sort((a, b) => {
      const ordenEstado = {
        'en_juego': 1,
        'pendiente': 2,
        'finalizado': 3
      };
      return (ordenEstado[a.estado] || 4) - (ordenEstado[b.estado] || 4);
    });

    setPartidos(filtrados);
  };

  const onRefresh = useCallback(() => {
    console.log('Refrescando partidos...');
    setRefreshing(true);
    cargarPartidos();
  }, [campeonatoSeleccionado]);

  // Función para aplicar filtros desde el modal
  const aplicarFiltrosDesdeModal = () => {
    setFiltroTextoAplicado(filtroTexto.trim());
    setModalFiltrosVisible(false);
    // Los filtros se aplicarán automáticamente por el useEffect
  };

  const handleLimpiarTodosFiltros = () => {
    setFiltroTexto('');
    setFiltroTextoAplicado('');
    setGrupoSeleccionado('todos');
    setFiltroEstado('todos');
    setFiltroTipoEquipo('todos');
  };

  const contarPartidosPorGrupo = (grupo) => {
    if (grupo === 'todos') return partidosOriginales.length;
    return partidosOriginales.filter(p => p.grupo_nombre === grupo).length;
  };

  // Función para navegar a RegistrarResultadoScreen
  const handleNavegarARegistrar = async (item) => {
    try {
      console.log('=== NAVEGANDO A REGISTRAR RESULTADO ===');
      console.log('ID Partido:', item.id_partido);
      console.log('Equipo Local:', item.local_nombre);
      console.log('Equipo Visitante:', item.visitante_nombre);
      
      if (!item.id_partido) {
        console.error('ERROR: item.id_partido es undefined o null');
        Alert.alert('Error', 'El partido no tiene un ID válido');
        return;
      }

      // Primero cargar el detalle del partido
      console.log('Cargando detalle del partido...');
      const detalle = await obtenerDetallePartido(item.id_partido);
      
      if (!detalle) {
        Alert.alert('Error', 'No se pudo cargar el detalle del partido');
        return;
      }

      console.log('Detalle cargado:', {
        id: detalle.id_partido,
        estado: detalle.estado,
        ya_registrado: detalle.ya_registrado
      });

      // Verificar si el partido ya está registrado
      if (detalle.ya_registrado) {
        Alert.alert(
          'Partido ya registrado',
          'Este partido ya ha sido registrado por otro vocal',
          [{ text: 'OK' }]
        );
        return;
      }

      // Verificar si el partido está disponible para registro
      if (detalle.estado !== 'pendiente' && detalle.estado !== 'en_juego') {
        Alert.alert(
          'Partido no disponible',
          `Este partido está en estado "${detalle.estado}" y no puede ser registrado`,
          [{ text: 'OK' }]
        );
        return;
      }

      // Navegar con todos los datos necesarios
      navigation.navigate('RegistrarResultadoScreen', { 
        idPartido: item.id_partido,
        campeonatoId: campeonatoSeleccionado?.id_campeonato,
        campeonatoNombre: campeonatoSeleccionado?.nombre,
        partido: detalle // Enviar el detalle completo
      });

    } catch (error) {
      console.error('Error al navegar a registro:', error);
      Alert.alert(
        'Error',
        error.message || 'No se pudo cargar el detalle del partido'
      );
    }
  };

  const renderPartidoItem = ({ item, index }) => {
    const estadoInfo = obtenerEstadoPartido(item.estado);
    const esPrimeroEnGrupo = grupoSeleccionado === 'todos' && 
      partidos.findIndex(p => p.grupo_nombre === item.grupo_nombre) === index;
    
    const esLocal = filtroTipoEquipo === 'local';
    const esVisitante = filtroTipoEquipo === 'visitante';
    const esEnJuego = item.estado === 'en_juego';
    
    return (
      <View>
        {esPrimeroEnGrupo && item.grupo_nombre && (
          <View style={styles.grupoHeader}>
            <View style={styles.grupoIconContainer}>
              <MaterialCommunityIcons name="account-group" size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.grupoHeaderText}>GRUPO {item.grupo_nombre}</Text>
            <View style={styles.grupoCountBadge}>
              <Text style={styles.grupoCountText}>
                {partidosOriginales.filter(p => p.grupo_nombre === item.grupo_nombre).length}
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.card,
            item.ya_registrado ? styles.cardRegistrado : styles.cardPendiente,
            esEnJuego && styles.cardEnJuego
          ]}
          onPress={() => handleNavegarARegistrar(item)}
          activeOpacity={0.7}
        >
          <View style={styles.estadoContainer}>
            <View style={[
              styles.estadoBadge, 
              { 
                backgroundColor: estadoInfo.color + (esEnJuego ? '40' : '20'),
                borderWidth: esEnJuego ? 1 : 0,
                borderColor: estadoInfo.color
              }
            ]}>
              <MaterialCommunityIcons 
                name={estadoInfo.icon} 
                size={14} 
                color={estadoInfo.color} 
              />
              <Text style={[
                styles.estadoTexto, 
                { 
                  color: estadoInfo.color,
                  fontWeight: esEnJuego ? 'bold' : '600'
                }
              ]}>
                {estadoInfo.texto}
              </Text>
            </View>
            
            {item.grupo_nombre && grupoSeleccionado === 'todos' && (
              <View style={styles.grupoBadge}>
                <MaterialCommunityIcons name="tag-outline" size={12} color="#2E7D32" />
                <Text style={styles.grupoBadgeText}>Grupo {item.grupo_nombre}</Text>
              </View>
            )}
          </View>

          <View style={styles.equiposContainer}>
            <View style={[
              styles.equipoContainer,
              esLocal && styles.equipoContainerHighlight
            ]}>
              <View style={styles.equipoHeader}>
                <View style={styles.equipoIconLocal}>
                  <MaterialCommunityIcons name="home" size={12} color="#FFFFFF" />
                </View>
                <Text style={styles.equipoTipo}>LOCAL</Text>
              </View>
              <Text style={styles.equipoNombre} numberOfLines={2}>
                {item.local_nombre || 'Equipo local'}
              </Text>
              <View style={styles.equipoFooter}>
                <Text style={styles.equipoGolesLabel}>GOLES:</Text>
                <Text style={styles.equipoGoles}>
                  {item.goles_local !== null && item.goles_local !== undefined ? item.goles_local : '-'}
                </Text>
              </View>
            </View>

            <View style={styles.separadorContainer}>
              <View style={styles.vsContainer}>
                <Text style={styles.vsText}>VS</Text>
              </View>
              {item.goles_local !== null && item.goles_visitante !== null && (
                <View style={styles.resultadoContainer}>
                  <Text style={styles.resultado}>
                    {item.goles_local} - {item.goles_visitante}
                  </Text>
                </View>
              )}
            </View>

            <View style={[
              styles.equipoContainer,
              esVisitante && styles.equipoContainerHighlight
            ]}>
              <View style={styles.equipoHeader}>
                <View style={styles.equipoIconVisitante}>
                  <MaterialCommunityIcons name="map-marker" size={12} color="#FFFFFF" />
                </View>
                <Text style={styles.equipoTipo}>VISITANTE</Text>
              </View>
              <Text style={styles.equipoNombre} numberOfLines={2}>
                {item.visitante_nombre || 'Equipo visitante'}
              </Text>
              <View style={styles.equipoFooter}>
                <Text style={styles.equipoGolesLabel}>GOLES:</Text>
                <Text style={styles.equipoGoles}>
                  {item.goles_visitante !== null && item.goles_visitante !== undefined ? item.goles_visitante : '-'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.infoAdicional}>
            <View style={styles.estadoRegistroContainer}>
              {item.ya_registrado ? (
                <View style={styles.registradoContainer}>
                  <MaterialCommunityIcons name="check-circle" size={14} color="#4CAF50" />
                  <Text style={styles.registradoTexto}>Ya registrado</Text>
                </View>
              ) : (
                <View style={styles.pendienteContainer}>
                  <MaterialCommunityIcons name="alert-circle" size={14} color="#FF9800" />
                  <Text style={styles.pendienteTexto}>Por registrar</Text>
                </View>
              )}
            </View>
            
            {(item.fecha_encuentro && item.fecha_encuentro !== "Por definir") && (
              <View style={styles.fechaContainer}>
                <MaterialCommunityIcons name="calendar-clock" size={12} color="#666" />
                <Text style={styles.fechaTexto}>
                  {item.fecha_encuentro} {item.hora_encuentro && item.hora_encuentro !== "Por definir" ? `- ${item.hora_encuentro}` : ''}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Selector de campeonato */}
      <View style={styles.campeonatoSection}>
        <Text style={styles.campeonatoSectionTitle}>CAMPEONATO</Text>
        <TouchableOpacity 
          style={styles.campeonatoSelector}
          onPress={() => setModalCampeonatosVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.campeonatoSelectorContent}>
            <MaterialCommunityIcons name="trophy" size={20} color="#2E7D32" />
            <View style={styles.campeonatoInfo}>
              <Text style={styles.campeonatoNombre} numberOfLines={1}>
                {campeonatoSeleccionado?.nombre || 'Seleccionar campeonato'}
              </Text>
              <Text style={styles.campeonatoDetalle}>
                {campeonatoSeleccionado?.categoria || 'Categoría'} • {campeonatoSeleccionado?.temporada || 'Temporada'}
              </Text>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-down" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Estadísticas */}
      <View style={styles.estadisticasContainer}>
        <View style={styles.estadisticaCard}>
          <View style={[styles.estadisticaIcon, { backgroundColor: '#E8F5E9' }]}>
            <MaterialCommunityIcons name="soccer" size={20} color="#2E7D32" />
          </View>
          <Text style={styles.estadisticaNumero}>{partidos.length}</Text>
          <Text style={styles.estadisticaLabel}>Mostrados</Text>
        </View>
        
        <View style={styles.estadisticaCard}>
          <View style={[styles.estadisticaIcon, { backgroundColor: '#E3F2FD' }]}>
            <MaterialCommunityIcons name="play-circle-outline" size={20} color="#2196F3" />
          </View>
          <Text style={styles.estadisticaNumero}>
            {partidosOriginales.filter(p => p.estado === 'en_juego').length}
          </Text>
          <Text style={styles.estadisticaLabel}>En Juego</Text>
        </View>
        
        <View style={styles.estadisticaCard}>
          <View style={[styles.estadisticaIcon, { backgroundColor: '#FFECB3' }]}>
            <MaterialCommunityIcons name="clock-outline" size={20} color="#FF9800" />
          </View>
          <Text style={styles.estadisticaNumero}>
            {partidosOriginales.filter(p => p.estado === 'pendiente').length}
          </Text>
          <Text style={styles.estadisticaLabel}>Pendientes</Text>
        </View>
        
        <View style={styles.estadisticaCard}>
          <View style={[styles.estadisticaIcon, { backgroundColor: '#F5F5F5' }]}>
            <MaterialCommunityIcons name="check-circle-outline" size={20} color="#666" />
          </View>
          <Text style={styles.estadisticaNumero}>
            {partidosOriginales.filter(p => p.estado === 'finalizado').length}
          </Text>
          <Text style={styles.estadisticaLabel}>Finalizados</Text>
        </View>
      </View>

      {/* Botón de filtros */}
      <TouchableOpacity 
        style={styles.filtrosButton}
        onPress={() => setModalFiltrosVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.filtrosButtonContent}>
          <View style={styles.filtrosIconContainer}>
            <MaterialCommunityIcons name="filter-variant" size={20} color="#FFFFFF" />
            {(filtroTextoAplicado.length > 0 || grupoSeleccionado !== 'todos' || filtroEstado !== 'todos' || filtroTipoEquipo !== 'todos') && (
              <View style={styles.filtrosBadge}>
                <Text style={styles.filtrosBadgeText}>
                  {[filtroTextoAplicado.length > 0, grupoSeleccionado !== 'todos', filtroEstado !== 'todos', filtroTipoEquipo !== 'todos']
                    .filter(Boolean).length}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.filtrosButtonText}>FILTROS</Text>
          {(filtroTextoAplicado.length > 0 || grupoSeleccionado !== 'todos' || filtroEstado !== 'todos' || filtroTipoEquipo !== 'todos') && (
            <View style={styles.filtrosActivosMini}>
              <Text style={styles.filtrosActivosMiniText}>
                {filtroTextoAplicado.length > 0 ? '1' : ''}
                {grupoSeleccionado !== 'todos' ? '1' : ''}
                {filtroEstado !== 'todos' ? '1' : ''}
                {filtroTipoEquipo !== 'todos' ? '1' : ''} activos
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Indicador de filtros activos */}
      {(filtroTextoAplicado.length > 0 || grupoSeleccionado !== 'todos' || filtroEstado !== 'todos' || filtroTipoEquipo !== 'todos') && (
        <View style={styles.filtrosActivosContainer}>
          <View style={styles.filtrosActivosHeader}>
            <MaterialCommunityIcons name="filter" size={14} color="#2E7D32" />
            <Text style={styles.filtrosActivosTitle}>Filtros aplicados:</Text>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.filtrosActivosScroll}
          >
            <View style={styles.filtrosActivosChips}>
              {filtroEstado !== 'todos' && (
                <View style={styles.filtroActivoChip}>
                  <MaterialCommunityIcons name={ESTADOS_DISPONIBLES.find(e => e.id === filtroEstado)?.icon || 'help-circle'} size={12} color="#2E7D32" />
                  <Text style={styles.filtroActivoText}>
                    {ESTADOS_DISPONIBLES.find(e => e.id === filtroEstado)?.label || 'Estado'}
                  </Text>
                </View>
              )}
              
              {grupoSeleccionado !== 'todos' && (
                <View style={styles.filtroActivoChip}>
                  <MaterialCommunityIcons name="tag-outline" size={12} color="#2E7D32" />
                  <Text style={styles.filtroActivoText}>Grupo {grupoSeleccionado}</Text>
                </View>
              )}
              
              {filtroTipoEquipo !== 'todos' && (
                <View style={styles.filtroActivoChip}>
                  <MaterialCommunityIcons name={TIPOS_EQUIPO.find(t => t.id === filtroTipoEquipo)?.icon || 'soccer'} size={12} color="#2E7D32" />
                  <Text style={styles.filtroActivoText}>
                    {TIPOS_EQUIPO.find(t => t.id === filtroTipoEquipo)?.label || 'Todos'}
                  </Text>
                </View>
              )}
              
              {filtroTextoAplicado.length > 0 && (
                <View style={styles.filtroActivoChip}>
                  <MaterialCommunityIcons name="magnify" size={12} color="#2E7D32" />
                  <Text style={styles.filtroActivoText}>"{filtroTextoAplicado}"</Text>
                </View>
              )}
              
              <TouchableOpacity 
                style={styles.limpiarFiltrosChip}
                onPress={handleLimpiarTodosFiltros}
              >
                <MaterialCommunityIcons name="close-circle" size={14} color="#FF5722" />
                <Text style={styles.limpiarFiltrosChipText}>Limpiar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => {
    let mensaje = "";
    let icono = "soccer";
    let color = "#E0E0E0";
    
    if (filtroTextoAplicado.length > 0 || grupoSeleccionado !== 'todos' || filtroEstado !== 'todos' || filtroTipoEquipo !== 'todos') {
      mensaje = "No se encontraron partidos con los filtros aplicados";
      icono = "filter-remove";
      color = "#FF9800";
    } else {
      mensaje = "No hay partidos en este campeonato";
      icono = "soccer-off";
      color = "#E0E0E0";
    }
    
    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIconContainer, { backgroundColor: color + '20' }]}>
          <MaterialCommunityIcons name={icono} size={60} color={color} />
        </View>
        <Text style={styles.emptyTitle}>Sin resultados</Text>
        <Text style={styles.emptyText}>{mensaje}</Text>
        
        {(filtroTextoAplicado.length > 0 || grupoSeleccionado !== 'todos' || filtroEstado !== 'todos' || filtroTipoEquipo !== 'todos') && (
          <TouchableOpacity 
            style={styles.emptyButton}
            onPress={handleLimpiarTodosFiltros}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="filter-remove" size={18} color="#FFFFFF" />
            <Text style={styles.emptyButtonText}>Limpiar filtros</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderFooter = () => {
    if (loading || partidos.length === 0) return null;
    
    // Contar partidos por estado
    const enJuegoCount = partidos.filter(p => p.estado === 'en_juego').length;
    const pendienteCount = partidos.filter(p => p.estado === 'pendiente').length;
    const finalizadoCount = partidos.filter(p => p.estado === 'finalizado').length;
    
    return (
      <View style={styles.listFooter}>
        <MaterialCommunityIcons name="information-outline" size={16} color="#666" />
        <View style={styles.footerInfo}>
          <Text style={styles.listFooterText}>
            Mostrando {partidos.length} de {partidosOriginales.length} partidos
          </Text>
          {(enJuegoCount > 0 || pendienteCount > 0 || finalizadoCount > 0) && (
            <View style={styles.footerEstados}>
              {enJuegoCount > 0 && (
                <View style={styles.estadoCount}>
                  <MaterialCommunityIcons name="play-circle" size={12} color="#2196F3" />
                  <Text style={[styles.estadoCountText, { color: '#2196F3' }]}>
                    {enJuegoCount} en juego
                  </Text>
                </View>
              )}
              {pendienteCount > 0 && (
                <View style={styles.estadoCount}>
                  <MaterialCommunityIcons name="clock-outline" size={12} color="#FF9800" />
                  <Text style={[styles.estadoCountText, { color: '#FF9800' }]}>
                    {pendienteCount} pendientes
                  </Text>
                </View>
              )}
              {finalizadoCount > 0 && (
                <View style={styles.estadoCount}>
                  <MaterialCommunityIcons name="check-circle" size={12} color="#4CAF50" />
                  <Text style={[styles.estadoCountText, { color: '#4CAF50' }]}>
                    {finalizadoCount} finalizados
                  </Text>
                </View>
              )}
            </View>
          )}
          {filtroTextoAplicado.length > 0 && (
            <Text style={styles.listFooterSubtext}>
              Buscando: "{filtroTextoAplicado}"
            </Text>
          )}
        </View>
      </View>
    );
  };

  if (loading && !refreshing && partidosOriginales.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#2E7D32" barStyle="light-content" />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2E7D32" />
            <Text style={styles.loadingText}>Cargando partidos...</Text>
            <Text style={styles.loadingSubtext}>Por favor, espera un momento</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#2E7D32" barStyle="light-content" />
      
      <SafeAreaView style={styles.safeArea}>
        {/* Barra superior simplificada */}
        <View style={styles.topBar}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.topBarTitleContainer}>
            <Text style={styles.topBarTitle} numberOfLines={1}>
              Gestión de Partidos
            </Text>
            <Text style={styles.topBarSubtitle}>
              {campeonatoSeleccionado?.nombre || ''}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={onRefresh}
          >
            <MaterialCommunityIcons name="refresh" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={partidos}
          renderItem={renderPartidoItem}
          keyExtractor={(item) => `${item.id_partido}-${item.grupo_nombre || 'nogroup'}`}
          contentContainerStyle={styles.listContainer}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#2E7D32"]}
              tintColor="#2E7D32"
            />
          }
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={20}
          windowSize={5}
          keyboardShouldPersistTaps="handled"
        />
      </SafeAreaView>

      {/* Modal de selección de campeonato */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalCampeonatosVisible}
        onRequestClose={() => setModalCampeonatosVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitle}>
                <MaterialCommunityIcons name="trophy" size={24} color="#2E7D32" />
                <Text style={styles.modalTitle}>Seleccionar Campeonato</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setModalCampeonatosVisible(false)}
                style={styles.modalCloseButton}
              >
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView>
              {campeonatos.map((campeonato) => (
                <TouchableOpacity
                  key={campeonato.id_campeonato}
                  style={[
                    styles.campeonatoModalItem,
                    campeonatoSeleccionado?.id_campeonato === campeonato.id_campeonato && 
                    styles.campeonatoModalItemSelected
                  ]}
                  onPress={() => {
                    setCampeonatoSeleccionado(campeonato);
                    setModalCampeonatosVisible(false);
                    handleLimpiarTodosFiltros();
                  }}
                >
                  <View style={styles.campeonatoModalIcon}>
                    <MaterialCommunityIcons 
                      name="trophy" 
                      size={20} 
                      color={campeonatoSeleccionado?.id_campeonato === campeonato.id_campeonato ? '#FFF' : '#2E7D32'} 
                    />
                  </View>
                  <View style={styles.campeonatoModalInfo}>
                    <Text style={[
                      styles.campeonatoModalText,
                      campeonatoSeleccionado?.id_campeonato === campeonato.id_campeonato && 
                      styles.campeonatoModalTextSelected
                    ]}>
                      {campeonato.nombre}
                    </Text>
                    <View style={styles.campeonatoModalDetails}>
                      <Text style={[
                        styles.campeonatoModalSubtext,
                        campeonatoSeleccionado?.id_campeonato === campeonato.id_campeonato && 
                        styles.campeonatoModalSubtextSelected
                      ]}>
                        {campeonato.categoria} • {campeonato.temporada}
                      </Text>
                      <View style={styles.campeonatoModalStats}>
                        <MaterialCommunityIcons name="soccer" size={12} color={campeonatoSeleccionado?.id_campeonato === campeonato.id_campeonato ? '#FFF' : '#666'} />
                        <Text style={[
                          styles.campeonatoModalStatsText,
                          campeonatoSeleccionado?.id_campeonato === campeonato.id_campeonato && 
                          styles.campeonatoModalStatsTextSelected
                        ]}>
                          {campeonato.partidos_pendientes || 0} partidos
                        </Text>
                      </View>
                    </View>
                  </View>
                  {campeonatoSeleccionado?.id_campeonato === campeonato.id_campeonato && (
                    <View style={styles.campeonatoModalCheck}>
                      <MaterialCommunityIcons name="check-circle" size={20} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de filtros */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalFiltrosVisible}
        onRequestClose={() => setModalFiltrosVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.modalContentLarge]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitle}>
                <MaterialCommunityIcons name="filter-variant" size={24} color="#2E7D32" />
                <Text style={styles.modalTitle}>Filtros Avanzados</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setModalFiltrosVisible(false)}
                style={styles.modalCloseButton}
              >
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollView}>
              {/* Búsqueda */}
              <View style={styles.modalSection}>
                <View style={styles.modalSectionHeader}>
                  <MaterialCommunityIcons name="magnify" size={18} color="#2E7D32" />
                  <Text style={styles.modalSectionTitle}>Buscar Equipo o Grupo</Text>
                </View>
                <View style={styles.busquedaModalContainer}>
                  <TextInput
                    style={styles.busquedaModalInput}
                    placeholder="Ej: Barcelona, Grupo A..."
                    placeholderTextColor="#999"
                    value={filtroTexto}
                    onChangeText={setFiltroTexto}
                    returnKeyType="search"
                    onSubmitEditing={aplicarFiltrosDesdeModal}
                  />
                  {filtroTexto.length > 0 && (
                    <TouchableOpacity 
                      onPress={() => setFiltroTexto('')} 
                      style={styles.clearModalButton}
                    >
                      <MaterialCommunityIcons name="close-circle" size={20} color="#999" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Estado */}
              <View style={styles.modalSection}>
                <View style={styles.modalSectionHeader}>
                  <MaterialCommunityIcons name="clock-outline" size={18} color="#2E7D32" />
                  <Text style={styles.modalSectionTitle}>Estado del Partido</Text>
                </View>
                <View style={styles.modalOptionsGrid}>
                  {ESTADOS_DISPONIBLES.map((estado) => (
                    <TouchableOpacity
                      key={estado.id}
                      style={[
                        styles.modalOptionCard,
                        filtroEstado === estado.id && styles.modalOptionCardSelected
                      ]}
                      onPress={() => setFiltroEstado(estado.id)}
                    >
                      <MaterialCommunityIcons 
                        name={estado.icon} 
                        size={22} 
                        color={filtroEstado === estado.id ? '#FFF' : estado.color} 
                      />
                      <Text style={[
                        styles.modalOptionText,
                        filtroEstado === estado.id && styles.modalOptionTextSelected
                      ]}>
                        {estado.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Tipo de equipo */}
              <View style={styles.modalSection}>
                <View style={styles.modalSectionHeader}>
                  <MaterialCommunityIcons name="account-group" size={18} color="#2E7D32" />
                  <Text style={styles.modalSectionTitle}>Buscar en Equipo</Text>
                </View>
                <View style={styles.modalOptionsGrid}>
                  {TIPOS_EQUIPO.map((tipo) => (
                    <TouchableOpacity
                      key={tipo.id}
                      style={[
                        styles.modalOptionCard,
                        filtroTipoEquipo === tipo.id && styles.modalOptionCardSelected
                      ]}
                      onPress={() => setFiltroTipoEquipo(tipo.id)}
                    >
                      <MaterialCommunityIcons 
                        name={tipo.icon} 
                        size={22} 
                        color={filtroTipoEquipo === tipo.id ? '#FFF' : tipo.color} 
                      />
                      <Text style={[
                        styles.modalOptionText,
                        filtroTipoEquipo === tipo.id && styles.modalOptionTextSelected
                      ]}>
                        {tipo.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Grupos */}
              <View style={styles.modalSection}>
                <View style={styles.modalSectionHeader}>
                  <MaterialCommunityIcons name="tag-outline" size={18} color="#2E7D32" />
                  <Text style={styles.modalSectionTitle}>
                    Grupos ({gruposDisponibles.length - 1} disponibles)
                  </Text>
                </View>
                <View style={styles.modalGrid}>
                  {gruposDisponibles.map((grupo) => (
                    <TouchableOpacity
                      key={grupo}
                      style={[
                        styles.modalGridItem,
                        grupoSeleccionado === grupo && styles.modalGridItemSelected
                      ]}
                      onPress={() => setGrupoSeleccionado(grupo)}
                    >
                      <Text style={[
                        styles.modalGridText,
                        grupoSeleccionado === grupo && styles.modalGridTextSelected
                      ]}>
                        {grupo === 'todos' ? 'Todos' : ` ${grupo}`}
                      </Text>
                      {grupo !== 'todos' && (
                        <View style={[
                          styles.modalGridCount,
                          grupoSeleccionado === grupo && styles.modalGridCountSelected
                        ]}>
                          <Text style={[
                            styles.modalGridCountText,
                            grupoSeleccionado === grupo && styles.modalGridCountTextSelected
                          ]}>
                            {contarPartidosPorGrupo(grupo)}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  handleLimpiarTodosFiltros();
                  setModalFiltrosVisible(false);
                }}
              >
                <MaterialCommunityIcons name="broom" size={18} color="#666" />
                <Text style={styles.modalButtonTextSecondary}>Limpiar todo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={aplicarFiltrosDesdeModal}
              >
                <MaterialCommunityIcons name="check" size={18} color="#FFF" />
                <Text style={styles.modalButtonTextPrimary}>Buscar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Los estilos se mantienen exactamente igual
// ... (todos los estilos permanecen igual que en tu código original)


// Los estilos se mantienen igual...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topBar: {
    backgroundColor: "#2E7D32",
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 10,
    paddingBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  backButton: {
    padding: 8,
  },
  topBarTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  topBarTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 2,
  },
  topBarSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "500",
  },
  refreshButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: "#2E7D32",
    fontWeight: '600',
  },
  loadingSubtext: {
    fontSize: 13,
    color: "#666",
    marginTop: 5,
  },
  headerContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  actualizacionContainer: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
    alignItems: 'center',
  },
  actualizarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  actualizarButtonText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  actualizacionInfo: {
    fontSize: 11,
    color: '#1976D2',
    fontStyle: 'italic',
  },
  campeonatoSection: {
    marginBottom: 15,
  },
  campeonatoSectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: "#666",
    marginBottom: 8,
    letterSpacing: 1,
  },
  campeonatoSelector: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  campeonatoSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  campeonatoInfo: {
    flex: 1,
    marginLeft: 12,
  },
  campeonatoNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: "#333",
  },
  campeonatoDetalle: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  estadisticasContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  estadisticaCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  estadisticaIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  estadisticaNumero: {
    fontSize: 15,
    fontWeight: 'bold',
    color: "#2E7D32",
  },
  estadisticaLabel: {
    fontSize: 10,
    color: "#666",
    marginTop: 4,
    textAlign: 'center',
  },
  filtrosButton: {
    backgroundColor: "#2E7D32",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  filtrosButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtrosIconContainer: {
    position: 'relative',
    marginRight: 5,
  },
  filtrosBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF5722',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  filtrosBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  filtrosButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
  },
  filtrosActivosMini: {
    marginLeft: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  filtrosActivosMiniText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  filtrosActivosContainer: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 12,
  },
  filtrosActivosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  filtrosActivosTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: "#2E7D32",
    marginLeft: 6,
  },
  filtrosActivosScroll: {
    flexGrow: 0,
  },
  filtrosActivosChips: {
    flexDirection: 'row',
  },
  filtroActivoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#E8F5E9",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  filtroActivoText: {
    fontSize: 12,
    color: "#2E7D32",
    fontWeight: '600',
    marginLeft: 6,
  },
  limpiarFiltrosChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#FFF3E0",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  limpiarFiltrosChipText: {
    fontSize: 12,
    color: "#FF5722",
    fontWeight: '600',
    marginLeft: 6,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  grupoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#2E7D32",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  grupoIconContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    padding: 6,
    marginRight: 8,
  },
  grupoHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: "#FFFFFF",
    flex: 1,
  },
  grupoCountBadge: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  grupoCountText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: "#2E7D32",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  cardEnJuego: {
    borderWidth: 2,
    borderColor: '#2196F3',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  cardRegistrado: {
    borderLeftWidth: 6,
    borderLeftColor: "#4CAF50",
  },
  cardPendiente: {
    borderLeftWidth: 6,
    borderLeftColor: "#FF9800",
  },
  estadoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  estadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    position: 'relative',
  },
  pulsoAnimado: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(33, 150, 243, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    left: 8,
  },
  pulsoInterno: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2196F3',
  },
  estadoTexto: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  grupoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#F0F9F0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  grupoBadgeText: {
    fontSize: 11,
    color: "#2E7D32",
    fontWeight: '500',
    marginLeft: 4,
  },
  equiposContainer: {
    flexDirection: 'row',
  },
  equipoContainer: {
    flex: 1,
    minHeight: 160,
    marginHorizontal: 4,
  },
  equipoContainerHighlight: {
    backgroundColor: "#E8F5E9",
    borderColor: "#4CAF50",
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
    borderRadius: 16,
    padding: 12,
  },
  equipoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  equipoIconLocal: {
    backgroundColor: "#4CAF50",
    borderRadius: 6,
    padding: 4,
    marginRight: 6,
  },
  equipoIconVisitante: {
    backgroundColor: "#FF5722",
    borderRadius: 6,
    padding: 2,
    marginRight: 6,
  },
  equipoTipo: {
    fontSize: 12,
    fontWeight: 'bold',
    color: "#666",
    textTransform: 'uppercase',
  },
  equipoNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: "#333",
    marginBottom: 12,
    minHeight: 40,
    lineHeight: 20,
  },
  equipoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  equipoGolesLabel: {
    fontSize: 11,
    color: "#999",
    fontWeight: '500',
  },
  equipoGoles: {
    fontSize: 24,
    fontWeight: 'bold',
    color: "#2E7D32",
  },
  separadorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
    minWidth: 30,
  },
  vsContainer: {
    backgroundColor: "#F5F5F5",
    width: 30,
    height: 30,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  vsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: "#666",
  },
  resultadoContainer: {
    backgroundColor: "#F0F9F0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  resultado: {
    fontSize: 16,
    fontWeight: 'bold',
    color: "#2E7D32",
  },
  infoAdicional: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  estadoRegistroContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  registradoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  registradoTexto: {
    fontSize: 11,
    color: "#4CAF50",
    marginLeft: 6,
    fontWeight: '600',
  },
  pendienteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pendienteTexto: {
    fontSize: 11,
    color: "#FF9800",
    marginLeft: 6,
    fontWeight: '600',
  },
  fechaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  fechaTexto: {
    fontSize: 11,
    color: "#666",
    marginLeft: 6,
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 30,
    marginTop: 20,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#666",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: "#2E7D32",
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  listFooter: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
    padding: 16,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerInfo: {
    marginLeft: 8,
  },
  listFooterText: {
    fontSize: 13,
    color: "#666",
    fontWeight: '500',
  },
  footerEstados: {
    flexDirection: 'row',
    marginTop: 4,
  },
  estadoCount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  estadoCountText: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
  },
  listFooterSubtext: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: '85%',
  },
  modalContentLarge: {
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScrollView: {
    paddingHorizontal: 20,
  },
  modalSection: {
    marginTop: 24,
    marginBottom: 8,
  },
  modalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  busquedaModalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  busquedaModalInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    padding: 12,
  },
  clearModalButton: {
    padding: 4,
  },
  modalOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  modalOptionCard: {
    width: '48%',
    marginHorizontal: '1%',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modalOptionCardSelected: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  modalOptionText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontWeight: '600',
  },
  modalOptionTextSelected: {
    color: '#FFFFFF',
  },
  modalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  modalGridItem: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    margin: 4,
    minWidth: 70,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modalGridItemSelected: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  modalGridText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  modalGridTextSelected: {
    color: '#FFFFFF',
  },
  modalGridCount: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  modalGridCountSelected: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  modalGridCountText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#999',
  },
  modalGridCountTextSelected: {
    color: '#FFFFFF',
  },
  campeonatoModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  campeonatoModalItemSelected: {
    backgroundColor: '#2E7D32',
  },
  campeonatoModalIcon: {
    marginRight: 12,
  },
  campeonatoModalInfo: {
    flex: 1,
  },
  campeonatoModalText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    marginBottom: 4,
  },
  campeonatoModalTextSelected: {
    color: '#FFFFFF',
  },
  campeonatoModalDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  campeonatoModalSubtext: {
    fontSize: 13,
    color: '#666',
  },
  campeonatoModalSubtextSelected: {
    color: '#FFFFFF',
  },
  campeonatoModalStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  campeonatoModalStatsText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  campeonatoModalStatsTextSelected: {
    color: '#FFFFFF',
  },
  campeonatoModalCheck: {
    marginLeft: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 8,
  },
  modalButtonSecondary: {
    backgroundColor: '#F5F5F5',
  },
  modalButtonPrimary: {
    backgroundColor: '#2E7D32',
  },
  modalButtonTextSecondary: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
    marginLeft: 8,
  },
  modalButtonTextPrimary: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default PartidosScreen;