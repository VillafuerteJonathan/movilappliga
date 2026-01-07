import React, { useState, useEffect, useCallback } from 'react';
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
  Dimensions
} from 'react-native';
import { obtenerPartidosPendientes, obtenerCampeonatosActivos } from '../services/partidos.service';
import { formatearFechaHora, obtenerEstadoPartido } from '../services/partidos.service';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const PartidosScreen = ({ navigation, route }) => {
  const { campeonatoId, campeonatoNombre } = route.params || {};
  
  const [campeonatos, setCampeonatos] = useState([]);
  const [campeonatoSeleccionado, setCampeonatoSeleccionado] = useState(null);
  const [partidos, setPartidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalFiltrosVisible, setModalFiltrosVisible] = useState(false);
  const [modalCampeonatosVisible, setModalCampeonatosVisible] = useState(false);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  
  // Estados disponibles para filtrar
  const estadosDisponibles = [
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

  // Cargar campeonatos al inicio
  useEffect(() => {
    cargarCampeonatos();
  }, []);

  // Cargar partidos cuando se selecciona un campeonato
  useEffect(() => {
    if (campeonatoSeleccionado) {
      cargarPartidos();
    }
  }, [campeonatoSeleccionado, filtroEstado]);

  const cargarCampeonatos = async () => {
    try {
      setLoading(true);
      const data = await obtenerCampeonatosActivos();
      setCampeonatos(data);
      
      // Si viene de navegación, seleccionar ese campeonato
      if (campeonatoId) {
        const campeonato = data.find(c => c.id_campeonato === campeonatoId);
        if (campeonato) {
          setCampeonatoSeleccionado(campeonato);
        } else if (data.length > 0) {
          setCampeonatoSeleccionado(data[0]);
        }
      } else if (data.length > 0) {
        setCampeonatoSeleccionado(data[0]);
      }
    } catch (error) {
      console.error('Error cargando campeonatos:', error);
      Alert.alert('Error', 'No se pudieron cargar los campeonatos');
    }
  };

  const cargarPartidos = async () => {
    if (!campeonatoSeleccionado) return;
    
    try {
      setLoading(true);
      setRefreshing(false);

      const filtros = {};
      if (filtroEstado !== 'todos') {
        filtros.estado = filtroEstado;
      }

      const response = await obtenerPartidosPendientes(
        campeonatoSeleccionado.id_campeonato,
        1,
        50,
        filtros
      );

      setPartidos(response.partidos || []);
    } catch (error) {
      console.error('Error cargando partidos:', error);
      Alert.alert('Error', 'No se pudieron cargar los partidos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    cargarPartidos();
  }, [campeonatoSeleccionado, filtroEstado]);

  const filtrarPartidos = () => {
    return partidos.filter(p => 
      p.equipo_local_nombre.toLowerCase().includes(filtroTexto.toLowerCase()) ||
      p.equipo_visitante_nombre.toLowerCase().includes(filtroTexto.toLowerCase()) ||
      p.grupo_nombre?.toLowerCase().includes(filtroTexto.toLowerCase())
    );
  };

  const aplicarFiltroEstado = (estado) => {
    setFiltroEstado(estado);
    setModalFiltrosVisible(false);
  };

  const renderPartidoItem = ({ item, index }) => {
    const estadoInfo = obtenerEstadoPartido(item.estado);
    const fechaFormateada = formatearFechaHora(item.created_at);
    const fecha = new Date(item.created_at);
    const hoy = new Date();
    const esHoy = fecha.toDateString() === hoy.toDateString();
    const esProximo = fecha > hoy && estadoInfo.id === 'pendiente';
    
    return (
      <TouchableOpacity
        style={[
          styles.card,
          index % 2 === 0 ? styles.cardEven : styles.cardOdd,
          item.ya_registrado && styles.cardRegistrado
        ]}
        onPress={() => navigation.navigate('DetallePartido', { 
          partidoId: item.id_partido,
          campeonatoNombre: campeonatoSeleccionado?.nombre 
        })}
        activeOpacity={0.7}
      >
        {/* Encabezado con fecha y estado */}
        <View style={styles.cardHeader}>
          <View style={styles.fechaContainer}>
            {esHoy && (
              <View style={styles.hoyBadge}>
                <MaterialCommunityIcons name="calendar-today" size={12} color="#FFF" />
                <Text style={styles.hoyText}>HOY</Text>
              </View>
            )}
            {esProximo && (
              <View style={styles.proximoBadge}>
                <MaterialCommunityIcons name="clock-alert" size={12} color="#FFF" />
                <Text style={styles.proximoText}>PRÓXIMO</Text>
              </View>
            )}
            <Text style={styles.fecha}>{fechaFormateada}</Text>
          </View>
          
          <View style={[styles.estadoBadge, { backgroundColor: estadoInfo.color + '20' }]}>
            <MaterialCommunityIcons 
              name={estadoInfo.icon} 
              size={14} 
              color={estadoInfo.color} 
            />
            <Text style={[styles.estadoTexto, { color: estadoInfo.color }]}>
              {estadoInfo.texto}
            </Text>
          </View>
        </View>

        {/* Equipos y resultado */}
        <View style={styles.equiposContainer}>
          {/* Equipo local */}
          <View style={styles.equipo}>
            <View style={styles.equipoInfo}>
              {item.equipo_local_logo ? (
                <View style={styles.logoContainer}>
                  <MaterialCommunityIcons name="soccer" size={24} color="#2E7D32" />
                </View>
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Text style={styles.logoPlaceholderText}>{item.equipo_local_nombre.charAt(0)}</Text>
                </View>
              )}
              <Text style={styles.equipoNombre} numberOfLines={2}>
                {item.equipo_local_nombre}
              </Text>
            </View>
            <Text style={styles.equipoGoles}>
              {item.goles_local !== null ? item.goles_local : '-'}
            </Text>
          </View>

          {/* Separador */}
          <View style={styles.vsContainer}>
            <View style={styles.vsCircle}>
              <Text style={styles.vsText}>VS</Text>
            </View>
            {item.goles_local !== null && item.goles_visitante !== null && (
              <Text style={styles.resultado}>
                {item.goles_local} - {item.goles_visitante}
              </Text>
            )}
          </View>

          {/* Equipo visitante */}
          <View style={styles.equipo}>
            <Text style={styles.equipoGoles}>
              {item.goles_visitante !== null ? item.goles_visitante : '-'}
            </Text>
            <View style={styles.equipoInfo}>
              <Text style={styles.equipoNombre} numberOfLines={2}>
                {item.equipo_visitante_nombre}
              </Text>
              {item.equipo_visitante_logo ? (
                <View style={styles.logoContainer}>
                  <MaterialCommunityIcons name="soccer" size={24} color="#2E7D32" />
                </View>
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Text style={styles.logoPlaceholderText}>{item.equipo_visitante_nombre.charAt(0)}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Información adicional */}
        <View style={styles.infoAdicional}>
          {item.grupo_nombre && (
            <View style={styles.grupoContainer}>
              <MaterialCommunityIcons name="account-group" size={14} color="#666" />
              <Text style={styles.grupoTexto}>Grupo {item.grupo_nombre}</Text>
            </View>
          )}
          
          {item.ya_registrado && (
            <View style={styles.registradoContainer}>
              <MaterialCommunityIcons name="check-circle" size={14} color="#4CAF50" />
              <Text style={styles.registradoTexto}>Ya registrado</Text>
            </View>
          )}
        </View>

        {/* Footer con acción */}
        <View style={styles.cardFooter}>
          <Text style={styles.verDetallesText}>Ver detalles</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color="#2E7D32" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Selector de campeonato */}
      <TouchableOpacity 
        style={styles.campeonatoSelector}
        onPress={() => setModalCampeonatosVisible(true)}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons name="trophy" size={22} color="#2E7D32" />
        <View style={styles.campeonatoInfo}>
          <Text style={styles.campeonatoLabel}>CAMPEONATO ACTUAL</Text>
          <Text style={styles.campeonatoNombre} numberOfLines={1}>
            {campeonatoSeleccionado?.nombre || 'Seleccionar campeonato'}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-down" size={20} color="#666" />
      </TouchableOpacity>

      {/* Contador de partidos */}
      <View style={styles.contadorContainer}>
        <View style={styles.contadorItem}>
          <Text style={styles.contadorNumero}>{filtrarPartidos().length}</Text>
          <Text style={styles.contadorLabel}>Partidos totales</Text>
        </View>
        <View style={styles.contadorSeparador} />
        <View style={styles.contadorItem}>
          <Text style={styles.contadorNumero}>
            {filtrarPartidos().filter(p => !p.ya_registrado).length}
          </Text>
          <Text style={styles.contadorLabel}>Por registrar</Text>
        </View>
      </View>

      {/* Barra de búsqueda */}
      <View style={styles.buscadorContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color="#999" style={styles.buscadorIcon} />
        <TextInput
          style={styles.buscador}
          placeholder="Buscar por equipo o grupo..."
          placeholderTextColor="#999"
          value={filtroTexto}
          onChangeText={setFiltroTexto}
          clearButtonMode="while-editing"
        />
        {filtroTexto.length > 0 && (
          <TouchableOpacity onPress={() => setFiltroTexto('')}>
            <MaterialCommunityIcons name="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros rápidos */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtrosRapidosContainer}
        contentContainerStyle={styles.filtrosRapidosContent}
      >
        {estadosDisponibles.map((estado) => (
          <TouchableOpacity
            key={estado.id}
            style={[
              styles.filtroRapido,
              filtroEstado === estado.id && styles.filtroRapidoActive
            ]}
            onPress={() => aplicarFiltroEstado(estado.id)}
          >
            <MaterialCommunityIcons 
              name={estado.icon} 
              size={16} 
              color={filtroEstado === estado.id ? '#FFF' : estado.color} 
            />
            <Text style={[
              styles.filtroRapidoText,
              filtroEstado === estado.id && styles.filtroRapidoTextActive
            ]}>
              {estado.label}
            </Text>
          </TouchableOpacity>
        ))}
        
        <TouchableOpacity
          style={styles.filtroAvanzado}
          onPress={() => setModalFiltrosVisible(true)}
        >
          <MaterialCommunityIcons name="filter-variant" size={16} color="#666" />
          <Text style={styles.filtroAvanzadoText}>Más filtros</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderEmptyState = () => {
    let mensaje = "";
    let icono = "soccer";
    
    if (filtroTexto.length > 0) {
      mensaje = "No se encontraron partidos con ese criterio de búsqueda";
      icono = "magnify-close";
    } else if (filtroEstado !== 'todos') {
      mensaje = `No hay partidos ${estadosDisponibles.find(e => e.id === filtroEstado)?.label.toLowerCase()}`;
      icono = estadosDisponibles.find(e => e.id === filtroEstado)?.icon || "soccer";
    } else {
      mensaje = "No hay partidos pendientes en este campeonato";
      icono = "soccer-off";
    }
    
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name={icono} size={80} color="#E0E0E0" />
        <Text style={styles.emptyTitle}>Sin resultados</Text>
        <Text style={styles.emptyText}>{mensaje}</Text>
        
        {(filtroTexto.length > 0 || filtroEstado !== 'todos') && (
          <TouchableOpacity 
            style={styles.emptyButton}
            onPress={() => {
              setFiltroTexto('');
              setFiltroEstado('todos');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.emptyButtonText}>Limpiar filtros</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderFooter = () => {
    if (loading || partidos.length === 0) return null;
    
    return (
      <View style={styles.listFooter}>
        <Text style={styles.listFooterText}>
          {filtrarPartidos().length} partidos mostrados
        </Text>
      </View>
    );
  };

  if (loading && !refreshing && partidos.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#2E7D32" barStyle="light-content" />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2E7D32" />
            <Text style={styles.loadingText}>Cargando partidos...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#2E7D32" barStyle="light-content" />
      
      <SafeAreaView style={styles.safeArea}>
        {/* Barra superior verde */}
        <View style={styles.topBar}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>PARTIDOS</Text>
          <View style={styles.topBarRight} />
        </View>

        <FlatList
          data={filtrarPartidos()}
          renderItem={renderPartidoItem}
          keyExtractor={(item) => item.id_partido.toString()}
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
              <Text style={styles.modalTitle}>Seleccionar Campeonato</Text>
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
                  }}
                >
                  <MaterialCommunityIcons 
                    name="trophy" 
                    size={20} 
                    color={campeonatoSeleccionado?.id_campeonato === campeonato.id_campeonato ? '#FFF' : '#2E7D32'} 
                  />
                  <Text style={[
                    styles.campeonatoModalText,
                    campeonatoSeleccionado?.id_campeonato === campeonato.id_campeonato && 
                    styles.campeonatoModalTextSelected
                  ]}>
                    {campeonato.nombre}
                  </Text>
                  {campeonatoSeleccionado?.id_campeonato === campeonato.id_campeonato && (
                    <MaterialCommunityIcons name="check" size={20} color="#FFF" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de filtros avanzados */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalFiltrosVisible}
        onRequestClose={() => setModalFiltrosVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtrar por Estado</Text>
              <TouchableOpacity 
                onPress={() => setModalFiltrosVisible(false)}
                style={styles.modalCloseButton}
              >
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView>
              {estadosDisponibles.map((estado) => (
                <TouchableOpacity
                  key={estado.id}
                  style={[
                    styles.filtroModalItem,
                    filtroEstado === estado.id && styles.filtroModalItemSelected
                  ]}
                  onPress={() => aplicarFiltroEstado(estado.id)}
                >
                  <MaterialCommunityIcons 
                    name={estado.icon} 
                    size={22} 
                    color={filtroEstado === estado.id ? '#FFF' : estado.color} 
                  />
                  <Text style={[
                    styles.filtroModalText,
                    filtroEstado === estado.id && styles.filtroModalTextSelected
                  ]}>
                    {estado.label}
                  </Text>
                  {filtroEstado === estado.id && (
                    <MaterialCommunityIcons name="check" size={22} color="#FFF" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={() => {
                  setFiltroEstado('todos');
                  setModalFiltrosVisible(false);
                }}
              >
                <Text style={styles.modalButtonText}>Limpiar filtros</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F7FA",
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 8,
  },
  topBarTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  topBarRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: "#666",
  },
  headerContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  campeonatoSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#F8F9FA",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  campeonatoInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  campeonatoLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: "#666",
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  campeonatoNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: "#333",
  },
  contadorContainer: {
    flexDirection: 'row',
    backgroundColor: "#F0F9F0",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  contadorItem: {
    flex: 1,
    alignItems: 'center',
  },
  contadorNumero: {
    fontSize: 24,
    fontWeight: 'bold',
    color: "#2E7D32",
  },
  contadorLabel: {
    fontSize: 11,
    color: "#666",
    marginTop: 4,
  },
  contadorSeparador: {
    width: 1,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 16,
  },
  buscadorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  buscadorIcon: {
    marginRight: 8,
  },
  buscador: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    padding: 0,
  },
  filtrosRapidosContainer: {
    marginBottom: 8,
  },
  filtrosRapidosContent: {
    paddingHorizontal: 2,
  },
  filtroRapido: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  filtroRapidoActive: {
    backgroundColor: "#2E7D32",
    borderColor: "#2E7D32",
  },
  filtroRapidoText: {
    fontSize: 12,
    fontWeight: '600',
    color: "#666",
    marginLeft: 6,
  },
  filtroRapidoTextActive: {
    color: "#FFFFFF",
  },
  filtroAvanzado: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filtroAvanzadoText: {
    fontSize: 12,
    fontWeight: '600',
    color: "#666",
    marginLeft: 6,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardEven: {
    backgroundColor: "#FFFFFF",
  },
  cardOdd: {
    backgroundColor: "#FAFAFA",
  },
  cardRegistrado: {
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  fechaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  hoyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#FF4081",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 8,
  },
  hoyText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: "#FFFFFF",
    marginLeft: 4,
  },
  proximoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#FF9800",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 8,
  },
  proximoText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: "#FFFFFF",
    marginLeft: 4,
  },
  fecha: {
    fontSize: 12,
    color: "#666",
  },
  estadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  estadoTexto: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  equiposContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  equipo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  equipoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0F9F0",
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F5E9",
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoPlaceholderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: "#2E7D32",
  },
  equipoNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: "#333",
    flex: 1,
  },
  equipoGoles: {
    fontSize: 20,
    fontWeight: 'bold',
    color: "#2E7D32",
    width: 30,
    textAlign: 'center',
  },
  vsContainer: {
    alignItems: 'center',
    marginHorizontal: 12,
  },
  vsCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  vsText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: "#666",
  },
  resultado: {
    fontSize: 14,
    fontWeight: 'bold',
    color: "#333",
  },
  infoAdicional: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  grupoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  grupoTexto: {
    fontSize: 12,
    color: "#666",
    marginLeft: 6,
  },
  registradoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  registradoTexto: {
    fontSize: 12,
    color: "#4CAF50",
    marginLeft: 6,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    marginTop: 12,
  },
  verDetallesText: {
    fontSize: 13,
    color: "#2E7D32",
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 30,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#666",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: "#2E7D32",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 22,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  listFooter: {
    alignItems: "center",
    marginTop: 16,
    marginBottom: 20,
  },
  listFooterText: {
    fontSize: 12,
    color: "#999",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    padding: 4,
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
  campeonatoModalText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  campeonatoModalTextSelected: {
    color: '#FFFFFF',
  },
  filtroModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filtroModalItemSelected: {
    backgroundColor: '#2E7D32',
  },
  filtroModalText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  filtroModalTextSelected: {
    color: '#FFFFFF',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  modalButton: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
});

export default PartidosScreen;