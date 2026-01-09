import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Platform,
  Dimensions,
  Image
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { 
  obtenerDetallePartido, 
  iniciarPartido, 
  actualizarMarcador, 
  finalizarPartido,
  actualizarEncuentro 
} from '../services/registro.service';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const RegistrarResultadoScreen = ({ navigation, route }) => {
  const { idPartido, campeonatoId, campeonatoNombre, partido: initialPartidoData } = route.params;

  // Estados principales
  const [loading, setLoading] = useState(true);
  const [partido, setPartido] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados para TabView
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'info', title: 'Información' },
    { key: 'registro', title: 'Registro' }
  ]);

  // Estados para información del partido
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const [horaSeleccionada, setHoraSeleccionada] = useState(new Date());

  // Estados para registro de partido
  const [marcadorLocal, setMarcadorLocal] = useState('');
  const [marcadorVisitante, setMarcadorVisitante] = useState('');
  const [actas, setActas] = useState([]);
  const [subiendoActas, setSubiendoActas] = useState(false);
  
  // Estados para árbitro (movido a registro)
  const [modalArbitrosVisible, setModalArbitrosVisible] = useState(false);
  const [arbitroSeleccionado, setArbitroSeleccionado] = useState(null);

  const scrollViewRef = useRef();

  // Cargar detalle del partido
  useEffect(() => {
    cargarDetallePartido();
  }, []);

 const cargarDetallePartido = async () => {
  try {
    setLoading(true);
    console.log('Cargando detalle del partido:', idPartido);
    
    const detalle = await obtenerDetallePartido(idPartido);
    
    if (!detalle) {
      throw new Error('No se pudo obtener el detalle del partido');
    }

    console.log('Detalle cargado:', detalle);
    setPartido(detalle);

    // Inicializar fecha y hora si existen
    if (detalle.fecha_encuentro) {
      const fechaParts = detalle.fecha_encuentro.split('-');
      if (fechaParts.length === 3) {
        const fecha = new Date(
          parseInt(fechaParts[0]),
          parseInt(fechaParts[1]) - 1,
          parseInt(fechaParts[2])
        );
        setFechaSeleccionada(fecha);
      }
    }

    if (detalle.hora_encuentro) {
      const horaParts = detalle.hora_encuentro.split(':');
      if (horaParts.length >= 2) {
        const hora = new Date();
        hora.setHours(parseInt(horaParts[0]), parseInt(horaParts[1]), 0);
        setHoraSeleccionada(hora);
      }
    }

    // Inicializar marcador si existe
    if (detalle.goles_local !== null && detalle.goles_local !== undefined) {
      setMarcadorLocal(detalle.goles_local.toString());
    } else {
      setMarcadorLocal('');
    }
    
    if (detalle.goles_visitante !== null && detalle.goles_visitante !== undefined) {
      setMarcadorVisitante(detalle.goles_visitante.toString());
    } else {
      setMarcadorVisitante('');
    }

  } catch (error) {
    console.error('Error cargando detalle:', error);
    Alert.alert('Error', error.message || 'No se pudo cargar el detalle del partido');
    navigation.goBack();
  } finally {
    setLoading(false);
  }
};

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarDetallePartido();
    setRefreshing(false);
  };

  // ========================
  // FUNCIONES PARA INFORMACIÓN
  // ========================

  const handleActualizarEncuentro = async () => {
    try {
      if (!partido) return;

      const fechaStr = fechaSeleccionada.toISOString().split('T')[0];
      const horaStr = horaSeleccionada.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      console.log('Actualizando encuentro:', { fechaStr, horaStr });

      const response = await actualizarEncuentro(idPartido, fechaStr, horaStr);

      Alert.alert(
        'Éxito',
        'Fecha y hora actualizadas correctamente',
        [{ text: 'OK', onPress: () => cargarDetallePartido() }]
      );

    } catch (error) {
      console.error('Error actualizando encuentro:', error);
      Alert.alert('Error', error.message || 'No se pudo actualizar la fecha y hora');
    }
  };

  // ========================
  // FUNCIONES PARA REGISTRO
  // ========================

  const handleIniciarPartido = async () => {
    try {
      if (partido.estado !== 'pendiente') {
        Alert.alert(
          'No disponible',
          'El partido ya ha sido iniciado o finalizado'
        );
        return;
      }

      Alert.alert(
        'Iniciar Partido',
        '¿Estás seguro de iniciar el partido?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Iniciar', 
            style: 'destructive',
            onPress: async () => {
              try {
                await iniciarPartido(idPartido);
                Alert.alert(
                  'Éxito',
                  'Partido iniciado correctamente',
                  [{ text: 'OK', onPress: () => cargarDetallePartido() }]
                );
              } catch (error) {
                Alert.alert('Error', error.message || 'No se pudo iniciar el partido');
              }
            }
          }
        ]
      );

    } catch (error) {
      console.error('Error iniciando partido:', error);
      Alert.alert('Error', error.message || 'No se pudo iniciar el partido');
    }
  };

  const handleActualizarMarcador = async () => {
    try {
      const golesLocal = parseInt(marcadorLocal) || 0;
      const golesVisitante = parseInt(marcadorVisitante) || 0;

      if (golesLocal < 0 || golesVisitante < 0) {
        Alert.alert('Error', 'Los goles no pueden ser negativos');
        return;
      }

      if (partido.estado !== 'en_juego') {
        Alert.alert('Error', 'El partido debe estar en juego para actualizar el marcador');
        return;
      }

      await actualizarMarcador(idPartido, golesLocal, golesVisitante);
      
      Alert.alert(
        'Éxito',
        'Marcador actualizado correctamente',
        [{ text: 'OK', onPress: () => cargarDetallePartido() }]
      );

    } catch (error) {
      console.error('Error actualizando marcador:', error);
      Alert.alert('Error', error.message || 'No se pudo actualizar el marcador');
    }
  };

  const handleSeleccionarActas = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 2
      });

      if (result.canceled) return;

      const nuevasActas = result.assets.map((asset, index) => ({
        uri: asset.uri,
        name: `acta_${index === 0 ? 'frente' : 'dorso'}_${Date.now()}.jpg`,
        type: 'image/jpeg',
        size: asset.fileSize,
        tipo: index === 0 ? 'frente' : 'dorso'
      }));

      // Limitar a 2 imágenes (frente y dorso)
      if (actas.length + nuevasActas.length > 2) {
        Alert.alert('Límite alcanzado', 'Solo puedes subir 2 imágenes: frente y dorso del acta');
        return;
      }

      setActas(prev => [...prev, ...nuevasActas]);
      
      Alert.alert(
        'Imágenes seleccionadas',
        `Se agregaron ${nuevasActas.length} imagen(es)`
      );

    } catch (error) {
      console.error('Error seleccionando imágenes:', error);
      Alert.alert('Error', 'No se pudieron seleccionar las imágenes');
    }
  };

  const handleTomarFoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Se necesita acceso a la cámara para tomar fotos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: false
      });

      if (result.canceled) return;

      const nuevaActa = {
        uri: result.assets[0].uri,
        name: `acta_${actas.length === 0 ? 'frente' : 'dorso'}_${Date.now()}.jpg`,
        type: 'image/jpeg',
        size: result.assets[0].fileSize,
        tipo: actas.length === 0 ? 'frente' : 'dorso'
      };

      if (actas.length >= 2) {
        Alert.alert('Límite alcanzado', 'Solo puedes subir 2 imágenes: frente y dorso del acta');
        return;
      }

      setActas(prev => [...prev, nuevaActa]);
      
      Alert.alert(
        'Foto tomada',
        'La imagen ha sido agregada correctamente'
      );

    } catch (error) {
      console.error('Error tomando foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const handleEliminarActa = (index) => {
    const nuevasActas = [...actas];
    nuevasActas.splice(index, 1);
    setActas(nuevasActas);
  };

  const handleSeleccionarArbitro = (arbitro) => {
    setArbitroSeleccionado(arbitro);
    setModalArbitrosVisible(false);
  };

  const handleFinalizarPartido = async () => {
    try {
      // Validaciones
      if (partido.estado !== 'en_juego') {
        Alert.alert('Error', 'El partido debe estar en juego para finalizar');
        return;
      }

      if (actas.length === 0) {
        Alert.alert('Error', 'Debes subir al menos una imagen del acta para finalizar el partido');
        return;
      }

      if (!arbitroSeleccionado) {
        Alert.alert('Error', 'Debes seleccionar un árbitro principal');
        return;
      }

      const golesLocal = parseInt(marcadorLocal) || 0;
      const golesVisitante = parseInt(marcadorVisitante) || 0;

      Alert.alert(
        'Finalizar Partido',
        `¿Estás seguro de finalizar el partido?\n\nResultado: ${golesLocal} - ${golesVisitante}\nÁrbitro: ${arbitroSeleccionado.nombre}\n\nEsta acción no se puede deshacer.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Finalizar', 
            style: 'destructive',
            onPress: async () => {
              try {
                setSubiendoActas(true);

                // Obtener ID del vocal desde AsyncStorage
                const usuarioStr = await AsyncStorage.getItem('usuario');

                  if (!usuarioStr) {
                    throw new Error('No se pudo identificar al usuario logueado');
                  }

                  const usuario = JSON.parse(usuarioStr);
                  const vocalId = usuario.id_usuario;

                if (!vocalId) {
                  throw new Error('No se pudo identificar al vocal');
                }

                // Simular subida de actas
                const hashesActas = await subirActas(actas);
                const hashActa = `acta_${Date.now()}_${idPartido}`;

                // Finalizar partido
                await finalizarPartido(idPartido, {
                  golesLocal,
                  golesVisitante,
                  arbitroId: arbitroSeleccionado.id_arbitro,
                  vocalId,
                  hashActa
                });

                Alert.alert(
                  '¡Partido Finalizado!',
                  'El partido ha sido registrado exitosamente en el sistema.',
                  [
                    { 
                      text: 'OK', 
                      onPress: () => {
                        navigation.navigate('PartidosScreen', { 
                          campeonatoId,
                          campeonatoNombre
                        });
                      }
                    }
                  ]
                );

              } catch (error) {
                console.error('Error finalizando partido:', error);
                Alert.alert('Error', error.message || 'No se pudo finalizar el partido');
              } finally {
                setSubiendoActas(false);
              }
            }
          }
        ]
      );

    } catch (error) {
      console.error('Error en validación:', error);
      Alert.alert('Error', error.message || 'No se pudo finalizar el partido');
    }
  };

  const subirActas = async (actas) => {
    return actas.map((acta, index) => ({
      nombre: acta.name,
      hash: `hash_${Date.now()}_${index}`,
      url: acta.uri
    }));
  };

  // ========================
  // RENDER DE ESCENAS
  // ========================

  const renderInformacionScene = () => (
    <ScrollView 
      style={styles.sceneContainer}
      showsVerticalScrollIndicator={false}
      ref={scrollViewRef}
    >
      {/* Encabezado del partido */}
      <View style={styles.partidoHeader}>
        <View style={styles.equiposContainer}>
          <View style={styles.equipoCard}>
            <View style={[styles.equipoIcon, styles.localIcon]}>
              <MaterialCommunityIcons name="home" size={20} color="#FFF" />
            </View>
            <Text style={styles.equipoNombre} numberOfLines={2}>
              {partido?.local_nombre}
            </Text>
            <Text style={styles.equipoGoles}>
              {partido?.goles_local !== null ? partido.goles_local : '-'}
            </Text>
          </View>

          <View style={styles.vsContainer}>
            <Text style={styles.vsText}>VS</Text>
          </View>

          <View style={styles.equipoCard}>
            <View style={[styles.equipoIcon, styles.visitanteIcon]}>
              <MaterialCommunityIcons name="map-marker" size={20} color="#FFF" />
            </View>
            <Text style={styles.equipoNombre} numberOfLines={2}>
              {partido?.visitante_nombre}
            </Text>
            <Text style={styles.equipoGoles}>
              {partido?.goles_visitante !== null ? partido.goles_visitante : '-'}
            </Text>
          </View>
        </View>

        <View style={styles.estadoContainer}>
          <View style={[
            styles.estadoBadge,
            { backgroundColor: 
              partido?.estado === 'en_juego' ? '#2196F320' :
              partido?.estado === 'finalizado' ? '#4CAF5020' : '#FF980020'
            }
          ]}>
            <MaterialCommunityIcons 
              name={
                partido?.estado === 'en_juego' ? 'play-circle' :
                partido?.estado === 'finalizado' ? 'check-circle' : 'clock-outline'
              } 
              size={16} 
              color={
                partido?.estado === 'en_juego' ? '#2196F3' :
                partido?.estado === 'finalizado' ? '#4CAF50' : '#FF9800'
              } 
            />
            <Text style={[
              styles.estadoText,
              { 
                color: 
                  partido?.estado === 'en_juego' ? '#2196F3' :
                  partido?.estado === 'finalizado' ? '#4CAF50' : '#FF9800'
              }
            ]}>
              {partido?.estado === 'en_juego' ? 'EN JUEGO' :
               partido?.estado === 'finalizado' ? 'FINALIZADO' : 'PENDIENTE'}
            </Text>
          </View>
        </View>
      </View>

      {/* Información detallada */}
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>INFORMACIÓN DEL ENCUENTRO</Text>
        
        {/* Cancha */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="stadium" size={20} color="#2E7D32" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>CANCHA</Text>
              <Text style={styles.infoValue}>
                {partido?.cancha_nombre || 'Por definir'}
              </Text>
              {partido?.cancha_ubicacion && (
                <Text style={styles.infoSubvalue}>
                  {partido.cancha_ubicacion}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Fecha y hora */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="calendar-clock" size={20} color="#2E7D32" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>FECHA Y HORA</Text>
              {partido?.fecha_encuentro && partido?.hora_encuentro ? (
                <Text style={styles.infoValue}>
                  {partido.fecha_encuentro} - {partido.hora_encuentro}
                </Text>
              ) : (
                <Text style={styles.infoValueEmpty}>No programado</Text>
              )}
            </View>
          </View>

          {/* Selector de fecha y hora */}
          <View style={styles.datetimeSelector}>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <MaterialCommunityIcons name="calendar" size={18} color="#666" />
              <Text style={styles.dateButtonText}>
                {fechaSeleccionada.toLocaleDateString('es-ES')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.timeButton}
              onPress={() => setShowTimePicker(true)}
            >
              <MaterialCommunityIcons name="clock-outline" size={18} color="#666" />
              <Text style={styles.timeButtonText}>
                {horaSeleccionada.toLocaleTimeString('es-ES', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.actualizarButton}
            onPress={handleActualizarEncuentro}
          >
            <MaterialCommunityIcons name="update" size={18} color="#FFF" />
            <Text style={styles.actualizarButtonText}>Actualizar Encuentro</Text>
          </TouchableOpacity>
        </View>

        {/* Detalles adicionales */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="information-outline" size={20} color="#2E7D32" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>ESTADO DEL REGISTRO</Text>
              <View style={styles.registroStatus}>
                <MaterialCommunityIcons 
                  name={partido?.ya_registrado ? 'check-circle' : 'alert-circle'} 
                  size={16} 
                  color={partido?.ya_registrado ? '#4CAF50' : '#FF9800'} 
                />
                <Text style={[
                  styles.registroStatusText,
                  { color: partido?.ya_registrado ? '#4CAF50' : '#FF9800' }
                ]}>
                  {partido?.ya_registrado ? 'Ya registrado' : 'Por registrar'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderRegistroScene = () => (
    <ScrollView 
      style={styles.sceneContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Estado actual */}
      <View style={styles.registroHeader}>
        <Text style={styles.registroTitle}>REGISTRO DEL PARTIDO</Text>
        <Text style={styles.registroSubtitle}>
          Estado actual: <Text style={styles.estadoTexto}>{partido?.estado?.toUpperCase() || 'PENDIENTE'}</Text>
        </Text>
      </View>

      {/* Iniciar partido (solo si está pendiente) */}
      {partido?.estado === 'pendiente' && (
        <View style={styles.actionSection}>
          <Text style={styles.sectionTitle}>PRIMER PASO</Text>
          <TouchableOpacity 
            style={[styles.actionButton, styles.iniciarButton]}
            onPress={handleIniciarPartido}
          >
            <View style={styles.actionButtonIcon}>
              <MaterialCommunityIcons name="play-circle-outline" size={28} color="#FFF" />
            </View>
            <View style={styles.actionButtonContent}>
              <Text style={styles.actionButtonText}>INICIAR PARTIDO</Text>
              <Text style={styles.actionButtonSubtext}>
                Cambia el estado a "En Juego" para poder registrar el resultado
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Marcador (solo si está en juego o finalizado) */}
      {(partido?.estado === 'en_juego' || partido?.estado === 'finalizado') && (
        <View style={styles.actionSection}>
          <Text style={styles.sectionTitle}>MARCADOR ACTUAL</Text>
          
          <View style={styles.marcadorContainer}>
            <View style={styles.marcadorEquipo}>
              <View style={[styles.equipoIconMini, styles.localIcon]}>
                <MaterialCommunityIcons name="home" size={14} color="#FFF" />
              </View>
              <Text style={styles.marcadorEquipoNombre} numberOfLines={1}>
                {partido?.local_nombre}
              </Text>
              <TextInput
                style={[
                  styles.marcadorInput,
                  partido?.estado === 'finalizado' && styles.marcadorInputDisabled
                ]}
                value={marcadorLocal}
                onChangeText={setMarcadorLocal}
                keyboardType="numeric"
                placeholder="0"
                editable={partido?.estado === 'en_juego'}
                maxLength={2}
              />
            </View>

            <View style={styles.marcadorSeparador}>
              <Text style={styles.marcadorSeparadorText}>-</Text>
            </View>

            <View style={styles.marcadorEquipo}>
              <View style={[styles.equipoIconMini, styles.visitanteIcon]}>
                <MaterialCommunityIcons name="map-marker" size={14} color="#FFF" />
              </View>
              <Text style={styles.marcadorEquipoNombre} numberOfLines={1}>
                {partido?.visitante_nombre}
              </Text>
              <TextInput
                style={[
                  styles.marcadorInput,
                  partido?.estado === 'finalizado' && styles.marcadorInputDisabled
                ]}
                value={marcadorVisitante}
                onChangeText={setMarcadorVisitante}
                keyboardType="numeric"
                placeholder="0"
                editable={partido?.estado === 'en_juego'}
                maxLength={2}
              />
            </View>
          </View>

          {partido?.estado === 'en_juego' && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.marcadorButton, styles.smallButton]}
              onPress={handleActualizarMarcador}
            >
              <MaterialCommunityIcons name="scoreboard-outline" size={18} color="#FFF" />
              <Text style={styles.smallButtonText}>ACTUALIZAR MARCADOR</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Subir actas (solo si está en juego) */}
      {partido?.estado === 'en_juego' && (
        <View style={styles.actionSection}>
          <Text style={styles.sectionTitle}>ACTA DEL PARTIDO</Text>
          <Text style={styles.actasDescription}>
            Sube 2 imágenes del acta firmada: FRENTE y DORSO
          </Text>
          
          <View style={styles.actasButtonsContainer}>
            <TouchableOpacity 
              style={[styles.actaButton, styles.galleryButton]}
              onPress={handleSeleccionarActas}
              disabled={subiendoActas || actas.length >= 2}
            >
              <MaterialCommunityIcons name="image-multiple" size={24} color="#9C27B0" />
              <Text style={styles.actaButtonText}>Galería</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actaButton, styles.cameraButton]}
              onPress={handleTomarFoto}
              disabled={subiendoActas || actas.length >= 2}
            >
              <MaterialCommunityIcons name="camera" size={24} color="#2196F3" />
              <Text style={styles.actaButtonText}>Cámara</Text>
            </TouchableOpacity>
          </View>

          {/* Lista de actas subidas */}
          {actas.length > 0 && (
            <View style={styles.actasList}>
              <Text style={styles.actasListTitle}>Imágenes del acta ({actas.length}/2):</Text>
              <View style={styles.actasGrid}>
                {actas.map((acta, index) => (
                  <View key={index} style={styles.actaItem}>
                    <View style={styles.actaImageContainer}>
                      <Image 
                        source={{ uri: acta.uri }} 
                        style={styles.actaImage}
                        resizeMode="cover"
                      />
                      <View style={styles.actaBadge}>
                        <Text style={styles.actaBadgeText}>
                          {acta.tipo === 'frente' ? 'FRENTE' : 'DORSO'}
                        </Text>
                      </View>
                      <TouchableOpacity 
                        onPress={() => handleEliminarActa(index)}
                        style={styles.actaDeleteButton}
                      >
                        <MaterialCommunityIcons name="close-circle" size={22} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.actaInfo}>
                      <Text style={styles.actaNombre} numberOfLines={1}>
                        {acta.tipo === 'frente' ? 'Acta (Frente)' : 'Acta (Dorso)'}
                      </Text>
                      <Text style={styles.actaSize}>
                        {(acta.size / 1024).toFixed(0)} KB
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Seleccionar árbitro (solo si hay actas subidas) */}
          {actas.length > 0 && (
            <View style={styles.arbitroSection}>
              <Text style={styles.sectionTitle}>ÁRBITRO PRINCIPAL</Text>
              
              <View style={styles.arbitroCard}>
                {arbitroSeleccionado ? (
                  <View style={styles.arbitroSeleccionado}>
                    <MaterialCommunityIcons name="account-check" size={24} color="#2E7D32" />
                    <View style={styles.arbitroInfo}>
                      <Text style={styles.arbitroNombre}>{arbitroSeleccionado.nombre}</Text>
                      <Text style={styles.arbitroLabel}>Árbitro seleccionado</Text>
                    </View>
                    <TouchableOpacity 
                      onPress={() => setModalArbitrosVisible(true)}
                      style={styles.cambiarArbitroButton}
                    >
                      <MaterialCommunityIcons name="pencil" size={18} color="#666" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.seleccionarArbitroButton}
                    onPress={() => setModalArbitrosVisible(true)}
                  >
                    <MaterialCommunityIcons name="account-search" size={24} color="#2E7D32" />
                    <View style={styles.arbitroButtonContent}>
                      <Text style={styles.seleccionarArbitroText}>SELECCIONAR ÁRBITRO</Text>
                      <Text style={styles.seleccionarArbitroSubtext}>
                        Requerido para finalizar el partido
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color="#666" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Finalizar partido (solo si está en juego, tiene actas y árbitro) */}
          {partido?.estado === 'en_juego' && actas.length > 0 && arbitroSeleccionado && (
            <View style={styles.finalizarSection}>
              <Text style={styles.sectionTitle}>FINALIZAR PARTIDO</Text>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.finalizarButton]}
                onPress={handleFinalizarPartido}
                disabled={subiendoActas}
              >
                <View style={styles.actionButtonIcon}>
                  <MaterialCommunityIcons name="flag-checkered" size={28} color="#FFF" />
                </View>
                <View style={styles.actionButtonContent}>
                  <Text style={styles.actionButtonText}>
                    {subiendoActas ? 'FINALIZANDO...' : 'FINALIZAR PARTIDO'}
                  </Text>
                  <Text style={styles.actionButtonSubtext}>
                    Resultado: {marcadorLocal || '0'} - {marcadorVisitante || '0'} • 
                    Árbitro: {arbitroSeleccionado.nombre}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.warningBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#FF9800" />
                <Text style={styles.warningText}>
                  Al finalizar, el partido no podrá ser modificado. Verifica toda la información antes de continuar.
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Mensaje si el partido ya está finalizado */}
      {partido?.estado === 'finalizado' && (
        <View style={styles.finalizadoContainer}>
          <View style={styles.finalizadoIcon}>
            <MaterialCommunityIcons name="check-circle" size={60} color="#4CAF50" />
          </View>
          <Text style={styles.finalizadoTitle}>PARTIDO FINALIZADO</Text>
          <Text style={styles.finalizadoText}>
            Este partido ya ha sido registrado en el sistema y no puede ser modificado.
          </Text>
          <View style={styles.finalizadoInfo}>
            <Text style={styles.finalizadoResultado}>
              Resultado: {partido.goles_local} - {partido.goles_visitante}
            </Text>
            {arbitroSeleccionado && (
              <Text style={styles.finalizadoArbitro}>
                Árbitro: {arbitroSeleccionado.nombre}
              </Text>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );

  const renderScene = SceneMap({
    info: renderInformacionScene,
    registro: renderRegistroScene,
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#2E7D32" barStyle="light-content" />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2E7D32" />
            <Text style={styles.loadingText}>Cargando información del partido...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!partido) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#2E7D32" barStyle="light-content" />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle" size={60} color="#FF5722" />
            <Text style={styles.errorTitle}>Partido no encontrado</Text>
            <Text style={styles.errorText}>
              No se pudo cargar la información del partido
            </Text>
            <TouchableOpacity 
              style={styles.errorButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.errorButtonText}>Volver</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#2E7D32" barStyle="light-content" />
      
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Registrar Resultado</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {campeonatoNombre}
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={onRefresh}
          >
            <MaterialCommunityIcons name="refresh" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* TabView */}
        <TabView
          navigationState={{ index, routes }}
          renderScene={renderScene}
          onIndexChange={setIndex}
          initialLayout={{ width }}
          renderTabBar={props => (
            <TabBar
              {...props}
              style={styles.tabBar}
              indicatorStyle={styles.tabIndicator}
              labelStyle={styles.tabLabel}
              activeColor="#2E7D32"
              inactiveColor="#666"
            />
          )}
        />
      </SafeAreaView>

      {/* Modal de selección de árbitros */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalArbitrosVisible}
        onRequestClose={() => setModalArbitrosVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Árbitro</Text>
              <TouchableOpacity 
                onPress={() => setModalArbitrosVisible(false)}
                style={styles.modalCloseButton}
              >
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {partido?.arbitros?.map((arbitro) => (
                <TouchableOpacity
                  key={arbitro.id_arbitro}
                  style={[
                    styles.arbitroItem,
                    arbitroSeleccionado?.id_arbitro === arbitro.id_arbitro && 
                    styles.arbitroItemSelected
                  ]}
                  onPress={() => handleSeleccionarArbitro(arbitro)}
                >
                  <View style={styles.arbitroItemContent}>
                    <MaterialCommunityIcons 
                      name="account" 
                      size={24} 
                      color={arbitroSeleccionado?.id_arbitro === arbitro.id_arbitro ? '#FFF' : '#2E7D32'} 
                    />
                    <Text style={[
                      styles.arbitroModalNombre,
                      arbitroSeleccionado?.id_arbitro === arbitro.id_arbitro && 
                      styles.arbitroModalNombreSelected
                    ]}>
                      {arbitro.nombre}
                    </Text>
                  </View>
                  {arbitroSeleccionado?.id_arbitro === arbitro.id_arbitro && (
                    <MaterialCommunityIcons name="check" size={20} color="#FFF" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={fechaSeleccionada}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) {
              setFechaSeleccionada(date);
            }
          }}
          minimumDate={new Date()}
        />
      )}

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={horaSeleccionada}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, time) => {
            setShowTimePicker(false);
            if (time) {
              setHoraSeleccionada(time);
            }
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  safeArea: {
    flex: 1,
  },
  // Header
  header: {
    backgroundColor: '#2E7D32',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  backButton: {
    padding: 5,
  },
  refreshButton: {
    padding: 5,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  // Tabs
  tabBar: {
    backgroundColor: '#FFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabIndicator: {
    backgroundColor: '#2E7D32',
    height: 3,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  // Scene container
  sceneContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  // Partido Header
  partidoHeader: {
    backgroundColor: '#FFF',
    padding: 20,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  equiposContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  equipoCard: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
  },
  equipoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  equipoIconMini: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  localIcon: {
    backgroundColor: '#4CAF50',
  },
  visitanteIcon: {
    backgroundColor: '#FF5722',
  },
  equipoNombre: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
    marginBottom: 5,
  },
  equipoGoles: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  vsContainer: {
    marginHorizontal: 10,
  },
  vsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  estadoContainer: {
    alignItems: 'center',
  },
  estadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  estadoText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  // Información sections
  infoSection: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  infoContent: {
    flex: 1,
    marginLeft: 15,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 3,
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  infoValueEmpty: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  infoSubvalue: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  // DateTime selector
  datetimeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginRight: 5,
  },
  timeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginLeft: 5,
  },
  dateButtonText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
  },
  timeButtonText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
  },
  actualizarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E7D32',
    padding: 12,
    borderRadius: 8,
  },
  actualizarButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  registroStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  registroStatusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  // Registro header
  registroHeader: {
    backgroundColor: '#FFF',
    padding: 20,
    marginBottom: 10,
    alignItems: 'center',
  },
  registroTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  registroSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  estadoTexto: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  // Action sections
  actionSection: {
    padding: 15,
  },
  actionButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  iniciarButton: {
    backgroundColor: '#2196F3',
  },
  marcadorButton: {
    backgroundColor: '#FF9800',
  },
  finalizarButton: {
    backgroundColor: '#F44336',
  },
  actionButtonIcon: {
    marginRight: 12,
  },
  actionButtonContent: {
    flex: 1,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  // Marcador
  marcadorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  marcadorEquipo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marcadorEquipoNombre: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginVertical: 8,
    maxWidth: '100%',
  },
  marcadorInput: {
    width: 60,
    height: 60,
    borderWidth: 2,
    borderColor: '#2E7D32',
    borderRadius: 12,
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    backgroundColor: '#FFF',
  },
  marcadorInputDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#999',
    color: '#666',
  },
  marcadorSeparador: {
    paddingHorizontal: 20,
  },
  marcadorSeparadorText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#666',
  },
  // Botón pequeño para actualizar marcador
  smallButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    width: 'auto',
  },
  smallButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  // Actas
  actasDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actasButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actaButton: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
    borderWidth: 2,
    borderColor: '#F0F0F0',
  },
  galleryButton: {
    borderColor: '#9C27B0',
  },
  cameraButton: {
    borderColor: '#2196F3',
  },
  actaButtonText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  actasList: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  actasListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  actasGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actaItem: {
    width: '48%',
    alignItems: 'center',
  },
  actaImageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 3/4,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  actaImage: {
    width: '100%',
    height: '100%',
  },
  actaBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  actaBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  actaDeleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
  },
  actaInfo: {
    alignItems: 'center',
  },
  actaNombre: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  actaSize: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  // Árbitro section
  arbitroSection: {
    marginBottom: 20,
  },
  arbitroCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  arbitroSeleccionado: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#F0F9F0',
  },
  arbitroInfo: {
    flex: 1,
    marginLeft: 12,
  },
  arbitroNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
  },
  arbitroLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  cambiarArbitroButton: {
    padding: 8,
  },
  seleccionarArbitroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderWidth: 2,
    borderColor: '#2E7D32',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#FFF',
  },
  arbitroButtonContent: {
    flex: 1,
    marginLeft: 15,
  },
  seleccionarArbitroText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 2,
  },
  seleccionarArbitroSubtext: {
    fontSize: 12,
    color: '#666',
  },
  // Finalizar section
  finalizarSection: {
    marginBottom: 30,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'flex-start',
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#FF9800',
    marginLeft: 8,
    lineHeight: 16,
  },
  // Finalizado container
  finalizadoContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 30,
    margin: 15,
    alignItems: 'center',
  },
  finalizadoIcon: {
    marginBottom: 20,
  },
  finalizadoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10,
    textAlign: 'center',
  },
  finalizadoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 15,
  },
  finalizadoInfo: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 8,
    width: '100%',
  },
  finalizadoResultado: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  finalizadoArbitro: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  // Loading states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  // Error states
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 30,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  errorButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    padding: 5,
  },
  modalScrollView: {
    padding: 20,
  },
  arbitroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 10,
  },
  arbitroItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  arbitroItemSelected: {
    backgroundColor: '#2E7D32',
  },
  arbitroModalNombre: {
    marginLeft: 15,
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  arbitroModalNombreSelected: {
    color: '#FFF',
    fontWeight: '600',
  },
});

export default RegistrarResultadoScreen;