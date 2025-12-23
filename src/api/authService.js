import axios from "axios";

const API_URL = `${process.env.EXPO_PUBLIC_API_URL}/auth/login`;

// ⚠️ En móvil real usa la IP de tu PC: http://192.168.x.x:3001

export const login = async (correo, password) => {
  try {
    const response = await axios.post(API_URL, {
      correo,
      password,
    });

    const { success, data } = response.data;

    if (!success || !data) {
      throw new Error("Usuario no encontrado");
    }

    const { token, usuario } = data;

    if (!token || !usuario) {
      throw new Error("Respuesta inválida del servidor");
    }

    // ✅ CONTROL DE ROL PARA APP MÓVIL
    if (usuario.rol !== "vocal") {
      throw new Error("Acceso denegado: solo vocales");
    }

    // ✅ LOGIN CORRECTO
    return {
      token,
      usuario: {
        id: usuario.id_usuario,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        correo: usuario.correo,
        rol: usuario.rol,
      },
    };

  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
      error.message ||
      "Credenciales inválidas"
    );
  }
};
