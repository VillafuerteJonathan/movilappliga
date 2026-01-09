import React, { useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Image,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Alert,
  StatusBar
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { login } from "../services/auth.service";
// CAMBIO PARA EXPO:
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  

  const validateForm = () => {
    const newErrors = {};
    
    if (!correo.trim()) {
      newErrors.correo = "El correo es requerido";
    } else if (!/\S+@\S+\.\S+/.test(correo)) {
      newErrors.correo = "Ingrese un correo válido";
    }
    
    if (!password) {
      newErrors.password = "La contraseña es requerida";
    } else if (password.length < 6) {
      newErrors.password = "Mínimo 6 caracteres";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

 const handleLogin = async () => {
  if (!validateForm()) return;

  setLoading(true);
  setErrors({});

  try {
    const data = await login(correo, password);

    if (data.usuario.rol !== 'vocal') {
      throw new Error('Esta aplicación es solo para vocales');
    }

    await AsyncStorage.setItem("token", data.token);
    await AsyncStorage.setItem("usuario", JSON.stringify(data.usuario));

    navigation.reset({
      index: 0,
      routes: [{ name: "CampeonatosScreen" }],
    });

  } catch (error) {
    let errorMessage = error.message;
    if (
      errorMessage.includes('401') ||
      errorMessage.toLowerCase().includes('credenciales')
    ) {
      errorMessage = "Correo o contraseña incorrectos";
    } else if (errorMessage.toLowerCase().includes('network')) {
      errorMessage = "Error de conexión. Verifique su internet";
    }
    Alert.alert("Error", errorMessage);
  } finally {
    setLoading(false);
  }
};


  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar 
        backgroundColor="#F8F9FA" 
        barStyle="dark-content"
        translucent={false}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex1}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Contenedor principal centrado */}
          <View style={styles.container}>
            {/* Header con Logo */}
            <View style={styles.header}>
              <Image
                source={require("../../assets/images/LogoLDP.jpg")}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.appTitle}>LDP VOCALES</Text>
              <Text style={styles.appSubtitle}>Sistema de Registro de Partidos</Text>
            </View>

            {/* Formulario */}
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>Iniciar Sesión</Text>
              <Text style={styles.formSubtitle}>Acceso exclusivo para vocales</Text>

              {/* Correo */}
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons 
                  name="email-outline" 
                  size={22} 
                  color="#2E7D32" 
                  style={styles.inputIcon} 
                />
                <TextInput
                  style={[styles.input, errors.correo && styles.inputError]}
                  placeholder="Correo electrónico"
                  placeholderTextColor="#999"
                  value={correo}
                  onChangeText={setCorreo}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>
              {errors.correo && <Text style={styles.errorText}>{errors.correo}</Text>}

              {/* Contraseña */}
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons 
                  name="lock-outline" 
                  size={22} 
                  color="#2E7D32" 
                  style={styles.inputIcon} 
                />
                <TextInput
                  style={[styles.input, errors.password && styles.inputError]}
                  placeholder="Contraseña"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <TouchableOpacity 
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                >
                  <MaterialCommunityIcons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

              {/* Botón Login */}
              <TouchableOpacity
                style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons 
                      name="login" 
                      size={20} 
                      color="#FFF" 
                      style={styles.loginIcon}
                    />
                    <Text style={styles.loginButtonText}>INGRESAR</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Liga Deportiva Provincial © 2024</Text>
              <Text style={styles.versionText}>v1.0.0</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: "#F8F9FA",
    // Asegurar que SafeAreaView cubra toda la pantalla
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0
  },
  flex1: { 
    flex: 1 
  },
  scrollContent: { 
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: height
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 10, // Reducido para Android
    paddingBottom: 90,
  },
  header: { 
    alignItems: "center", 
    marginBottom: 20,
    marginTop: Platform.OS === 'ios' ? 20 : 10 // Ajuste para iOS/Android
  },
  logo: { 
    width: width * 0.35, 
    height: width * 0.35, 
    marginBottom: 15 
  },
  appTitle: { 
    fontSize: 28, 
    fontWeight: "bold", 
    color: "#2E7D32",
    textAlign: 'center'
  },
  appSubtitle: { 
    fontSize: 14, 
    color: "#666", 
    marginTop: 5, 
    textAlign: "center",
    lineHeight: 20
  },
  formContainer: { 
    backgroundColor: "#FFF", 
    borderRadius: 16, 
    padding: 20, 
    shadowColor: "#000", 
    shadowOffset: { 
      width: 0, 
      height: 4 
    }, 
    shadowOpacity: 0.1, 
    shadowRadius: 12, 
    elevation: 5,
    marginBottom: 20
  },
  formTitle: { 
    fontSize: 22, 
    fontWeight: "bold", 
    color: "#333", 
    marginBottom: 5, 
    textAlign: "center" 
  },
  formSubtitle: { 
    fontSize: 14, 
    color: "#666", 
    marginBottom: 20, 
    textAlign: "center" 
  },
  inputWrapper: { 
    flexDirection: "row", 
    alignItems: "center", 
    borderWidth: 1, 
    borderColor: "#E0E0E0", 
    borderRadius: 10, 
    marginBottom: 8, 
    paddingHorizontal: 12, 
    height: 56, 
    backgroundColor: "#F8F9FA" 
  },
  input: { 
    flex: 1, 
    fontSize: 16, 
    color: "#333",
    paddingVertical: 0,
    marginLeft: 8,
    height: '100%'
  },
  inputIcon: {
    width: 24,
    textAlign: 'center'
  },
  eyeButton: {
    padding: 8,
    marginLeft: 4
  },
  inputError: { 
    borderColor: "#D32F2F" 
  },
  errorText: { 
    color: "#D32F2F", 
    fontSize: 12, 
    marginBottom: 12,
    marginLeft: 4,
    marginTop: 2
  },
  loginButton: { 
    backgroundColor: "#2E7D32", 
    borderRadius: 10, 
    height: 56, 
    justifyContent: "center", 
    alignItems: "center", 
    marginTop: 16,
    flexDirection: 'row',
    shadowColor: "#2E7D32",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5
  },
  loginIcon: {
    marginRight: 10
  },
  loginButtonDisabled: { 
    backgroundColor: "#81C784",
    opacity: 0.8
  },
  loginButtonText: { 
    color: "#FFF", 
    fontSize: 16, 
    fontWeight: "bold",
    letterSpacing: 0.5
  },
  footer: { 
    alignItems: "center",
    marginTop: 25
  },
  footerText: { 
    fontSize: 12, 
    color: "#999",
    textAlign: 'center'
  },
  versionText: { 
    fontSize: 11, 
    color: "#BBB",
    marginTop: 4
  },
});