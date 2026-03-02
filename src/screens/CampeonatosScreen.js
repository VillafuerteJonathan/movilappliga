import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  RefreshControl,
  StatusBar,
  Platform,
  ScrollView
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { obtenerCampeonatosActivos } from "../services/partidos.service";
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Función para determinar estado según fecha
const determinarEstadoCampeonato = (campeonato) => {
  const hoy = new Date();
  const fechaInicio = new Date(campeonato.fecha_inicio);
  const fechaFin = new Date(campeonato.fecha_fin);
  
  if (hoy < fechaInicio) {
    return {
      estado: 'pendiente',
      texto: 'PRÓXIMO',
      color: '#FF9800',
      icono: 'calendar-clock',
      badgeColor: '#FFF3E0',
      filtro: 'proximo'
    };
  } else if (hoy >= fechaInicio && hoy <= fechaFin) {
    return {
      estado: 'activo',
      texto: 'EN CURSO',
      color: '#2E7D32',
      icono: 'trophy',
      badgeColor: '#E8F5E9',
      filtro: 'en-curso'
    };
  } else {
    return {
      estado: 'finalizado',
      texto: 'FINALIZADO',
      color: '#757575',
      icono: 'trophy-outline',
      badgeColor: '#F5F5F5',
      filtro: 'finalizado'
    };
  }
};

// Función para formatear fecha
const formatearFecha = (fechaString) => {
  if (!fechaString) return "Sin fecha";
  try {
    const fecha = new Date(fechaString);
    return fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    return fechaString;
  }
};

export default function CampeonatosScreen({ navigation }) {
  const [campeonatos, setCampeonatos] = useState([]);
  const [campeonatosFiltrados, setCampeonatosFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usuario, setUsuario] = useState(null);
  const [filtroActivo, setFiltroActivo] = useState('todos'); // 'todos', 'en-curso', 'proximo', 'finalizado'

  useEffect(() => {
    cargarUsuario();
    fetchCampeonatos();
  }, []);

  useEffect(() => {
    aplicarFiltro();
  }, [campeonatos, filtroActivo]);

  const cargarUsuario = async () => {
    try {
      const userString = await AsyncStorage.getItem("usuario");
      if (userString) {
        setUsuario(JSON.parse(userString));
      }
    } catch (error) {
      console.log("Error cargando usuario:", error);
    }
  };

  const fetchCampeonatos = async () => {
    try {
      const data = await obtenerCampeonatosActivos();
      console.log('Datos de campeonatos:', JSON.stringify(data, null, 2)); // <-- Verifica la estructura aquí
      setCampeonatos(data);
    } catch (error) {
      Alert.alert(
        "Error",
        error.message || "No se pudieron cargar los campeonatos",
        [{ text: "Reintentar", onPress: fetchCampeonatos }]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const aplicarFiltro = () => {
    if (filtroActivo === 'todos') {
      setCampeonatosFiltrados(campeonatos);
    } else {
      const filtrados = campeonatos.filter(campeonato => {
        const estadoInfo = determinarEstadoCampeonato(campeonato);
        return estadoInfo.filtro === filtroActivo;
      });
      setCampeonatosFiltrados(filtrados);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCampeonatos();
  };

  const handleLogout = async () => {
    Alert.alert(
      "Cerrar Sesión",
      "¿Está seguro que desea salir de la aplicación?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, salir",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(["token", "usuario"]);
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              Alert.alert("Error", "No se pudo cerrar sesión");
            }
          }
        }
      ]
    );
  };

  const renderCampeonato = ({ item, index }) => {
    const estadoInfo = determinarEstadoCampeonato(item);
    const puedeVerPartidos = estadoInfo.estado === 'activo' && item.partidos_pendientes > 0;

    // Intentar varios nombres posibles para el campeonato
    const nombreCampeonato = 
      item.nombre || 
      item.nombre_campeonato || 
      item.campeonato_nombre || 
      item.nom_campeonato || 
      item.descripcion || 
      `Campeonato #${item.id_campeonato || 'sin ID'}`;

    return (
      <TouchableOpacity
        style={[
          styles.campeonatoCard,
          puedeVerPartidos ? styles.cardActive : styles.cardInactive
        ]}
        onPress={() => {
          if (puedeVerPartidos) {
            navigation.navigate("PartidosScreen", {
              campeonatoId: item.id_campeonato,
              campeonatoNombre: nombreCampeonato // Pasamos el nombre corregido
            });
          } else {
            Alert.alert(
              "Información",
              estadoInfo.estado === 'finalizado'
                ? "Este campeonato ha finalizado"
                : estadoInfo.estado === 'pendiente'
                ? "Este campeonato aún no ha comenzado"
                : "No hay partidos pendientes en este campeonato"
            );
          }
        }}
        activeOpacity={puedeVerPartidos ? 0.7 : 1}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <View style={[styles.iconCircle, { backgroundColor: estadoInfo.badgeColor }]}>
              <MaterialCommunityIcons
                name={estadoInfo.icono}
                size={22}
                color={estadoInfo.color}
              />
            </View>
            <Text style={[
              styles.campeonatoName,
              !puedeVerPartidos && styles.textDisabled
            ]} numberOfLines={2}>
              {nombreCampeonato}
            </Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: estadoInfo.badgeColor }]}>
            <Text style={[styles.statusText, { color: estadoInfo.color }]}>
              {estadoInfo.texto}
            </Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.dateContainer}>
            <View style={styles.dateItem}>
              <MaterialCommunityIcons name="calendar-start" size={16} color="#9E9E9E" />
              <Text style={styles.dateLabel}>Inicio:</Text>
              <Text style={styles.dateValue}>
                {formatearFecha(item.fecha_inicio)}
              </Text>
            </View>
            <View style={styles.dateItem}>
              <MaterialCommunityIcons name="calendar-end" size={16} color="#9E9E9E" />
              <Text style={styles.dateLabel}>Fin:</Text>
              <Text style={styles.dateValue}>
                {formatearFecha(item.fecha_fin)}
              </Text>
            </View>
          </View>

          <View style={styles.partidosContainer}>
            <View style={styles.partidosInfo}>
              <MaterialCommunityIcons name="soccer" size={20} color="#2E7D32" />
              <Text style={styles.partidosLabel}>Partidos pendientes</Text>
            </View>
            <View style={[
              styles.partidosBadge,
              item.partidos_pendientes > 0 ? styles.badgeActive : styles.badgeInactive
            ]}>
              <Text style={styles.partidosCount}>
                {item.partidos_pendientes || 0}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.footerContent}>
            {puedeVerPartidos ? (
              <>
                <Text style={styles.verPartidosText}>Ver partidos disponibles</Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color="#2E7D32" />
              </>
            ) : (
              <Text style={styles.noDisponibleText}>
                {estadoInfo.estado === 'finalizado' ? 'Campeonato finalizado' : 'Sin partidos disponibles'}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFiltros = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filtrosContainer}
      contentContainerStyle={styles.filtrosContent}
    >
      <TouchableOpacity
        style={[
          styles.filtroButton,
          filtroActivo === 'todos' && styles.filtroButtonActive
        ]}
        onPress={() => setFiltroActivo('todos')}
      >
        <MaterialCommunityIcons
          name="format-list-bulleted"
          size={18}
          color={filtroActivo === 'todos' ? '#FFFFFF' : '#2E7D32'}
        />
        <Text style={[
          styles.filtroButtonText,
          filtroActivo === 'todos' && styles.filtroButtonTextActive
        ]}>
          Todos ({campeonatos.length})
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.filtroButton,
          filtroActivo === 'en-curso' && styles.filtroButtonActive
        ]}
        onPress={() => setFiltroActivo('en-curso')}
      >
        <MaterialCommunityIcons
          name="trophy"
          size={18}
          color={filtroActivo === 'en-curso' ? '#FFFFFF' : '#2E7D32'}
        />
        <Text style={[
          styles.filtroButtonText,
          filtroActivo === 'en-curso' && styles.filtroButtonTextActive
        ]}>
          En curso ({campeonatos.filter(c => determinarEstadoCampeonato(c).filtro === 'en-curso').length})
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.filtroButton,
          filtroActivo === 'proximo' && styles.filtroButtonActive
        ]}
        onPress={() => setFiltroActivo('proximo')}
      >
        <MaterialCommunityIcons
          name="calendar-clock"
          size={18}
          color={filtroActivo === 'proximo' ? '#FFFFFF' : '#FF9800'}
        />
        <Text style={[
          styles.filtroButtonText,
          filtroActivo === 'proximo' && styles.filtroButtonTextActive
        ]}>
          Próximos ({campeonatos.filter(c => determinarEstadoCampeonato(c).filtro === 'proximo').length})
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.filtroButton,
          filtroActivo === 'finalizado' && styles.filtroButtonActive
        ]}
        onPress={() => setFiltroActivo('finalizado')}
      >
        <MaterialCommunityIcons
          name="trophy-outline"
          size={18}
          color={filtroActivo === 'finalizado' ? '#FFFFFF' : '#757575'}
        />
        <Text style={[
          styles.filtroButtonText,
          filtroActivo === 'finalizado' && styles.filtroButtonTextActive
        ]}>
          Finalizados ({campeonatos.filter(c => determinarEstadoCampeonato(c).filtro === 'finalizado').length})
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.userContainer}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <MaterialCommunityIcons name="account" size={28} color="#FFF" />
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.welcomeText}>
              ¡Hola, {usuario?.nombre || 'Vocal'}!
            </Text>
            <Text style={styles.userRole}>Vocal autorizado</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="logout" size={22} color="#D32F2F" />
        </TouchableOpacity>
      </View>

      <View style={styles.titleSection}>
        <MaterialCommunityIcons name="trophy-award" size={32} color="#2E7D32" />
        <Text style={styles.title}>Campeonatos</Text>
      </View>
      <Text style={styles.subtitle}>
        Selecciona un campeonato para ver los partidos pendientes
      </Text>

      {/* Filtros */}
      {renderFiltros()}

      {/* Leyenda de estados */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#2E7D32' }]} />
          <Text style={styles.legendText}>En curso</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
          <Text style={styles.legendText}>Próximo</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#757575' }]} />
          <Text style={styles.legendText}>Finalizado</Text>
        </View>
      </View>
    </View>
  );

  const renderFooter = () => (
    <View style={styles.footerContainer}>
      <TouchableOpacity
        style={styles.refreshButton}
        onPress={fetchCampeonatos}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons name="refresh" size={20} color="#2E7D32" />
        <Text style={styles.refreshText}>Actualizar lista</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => {
    let mensaje = "";
    let icono = "trophy-outline";
    let color = "#BDBDBD";

    switch (filtroActivo) {
      case 'en-curso':
        mensaje = "No hay campeonatos en curso en este momento";
        icono = "trophy";
        color = "#2E7D32";
        break;
      case 'proximo':
        mensaje = "No hay campeonatos próximos programados";
        icono = "calendar-clock";
        color = "#FF9800";
        break;
      case 'finalizado':
        mensaje = "No hay campeonatos finalizados";
        icono = "trophy-outline";
        color = "#757575";
        break;
      default:
        mensaje = "No hay campeonatos disponibles";
        icono = "trophy-outline";
        color = "#BDBDBD";
    }

    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name={icono} size={80} color={color} />
        <Text style={styles.emptyTitle}>
          {filtroActivo === 'todos' ? 'Sin campeonatos' : `Sin ${filtroActivo.replace('-', ' ')}`}
        </Text>
        <Text style={styles.emptyText}>{mensaje}</Text>
        {filtroActivo !== 'todos' && (
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => setFiltroActivo('todos')}
            activeOpacity={0.7}
          >
            <Text style={styles.emptyButtonText}>Ver todos</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#2E7D32" barStyle="light-content" />
        <SafeAreaView style={styles.safeAreaLoading}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Cargando campeonatos...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#2E7D32" barStyle="light-content" />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>LIGA DE FUTBOL</Text>
        </View>

        <FlatList
          data={campeonatosFiltrados}
          keyExtractor={(item) => item.id_campeonato?.toString() || Math.random().toString()}
          renderItem={renderCampeonato}
          contentContainerStyle={styles.listContainer}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#2E7D32"]}
              tintColor="#2E7D32"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  safeAreaLoading: {
    flex: 1,
    backgroundColor: "#2E7D32",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  topBar: {
    backgroundColor: "#2E7D32",
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingBottom: 14,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  topBarTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  userContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#2E7D32",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  userDetails: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
  },
  userRole: {
    fontSize: 13,
    color: "#757575",
  },
  logoutButton: {
    padding: 10,
    backgroundColor: "#FFEBEE",
    borderRadius: 10,
  },
  titleSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#2E7D32",
    marginLeft: 12,
  },
  subtitle: {
    fontSize: 14,
    color: "#757575",
    lineHeight: 20,
    marginBottom: 16,
  },
  filtrosContainer: {
    marginBottom: 16,
  },
  filtrosContent: {
    paddingHorizontal: 5,
    gap: 8,
  },
  filtroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filtroButtonActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  filtroButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E7D32',
    marginLeft: 6,
  },
  filtroButtonTextActive: {
    color: '#FFFFFF',
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#F8F9FA",
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: "#616161",
    fontWeight: "500",
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  campeonatoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginBottom: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardActive: {
    borderLeftWidth: 4,
    borderLeftColor: "#2E7D32",
  },
  cardInactive: {
    borderLeftWidth: 4,
    borderLeftColor: "#E0E0E0",
    opacity: 0.85,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  campeonatoName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    flex: 1,
    lineHeight: 22,
  },
  textDisabled: {
    color: "#9E9E9E",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "bold",
  },
  cardContent: {
    marginBottom: 12,
  },
  dateContainer: {
    marginBottom: 12,
    backgroundColor: "#FAFAFA",
    padding: 12,
    borderRadius: 12,
  },
  dateItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  dateLabel: {
    fontSize: 13,
    color: "#757575",
    marginLeft: 8,
    marginRight: 4,
    minWidth: 40,
  },
  dateValue: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
  },
  partidosContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F1F8E9",
    padding: 12,
    borderRadius: 12,
  },
  partidosInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  partidosLabel: {
    fontSize: 14,
    color: "#2E7D32",
    fontWeight: "500",
    marginLeft: 8,
  },
  partidosBadge: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 40,
    alignItems: "center",
  },
  badgeActive: {
    backgroundColor: "#2E7D32",
  },
  badgeInactive: {
    backgroundColor: "#E0E0E0",
  },
  partidosCount: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 12,
  },
  footerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  verPartidosText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2E7D32",
  },
  noDisponibleText: {
    fontSize: 14,
    color: "#9E9E9E",
    fontStyle: "italic",
  },
  footerContainer: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
  },
  refreshText: {
    fontSize: 14,
    color: "#2E7D32",
    fontWeight: "600",
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
    paddingHorizontal: 30,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#424242",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#9E9E9E",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: "#2E7D32",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});