import axios from "axios";
import { API_URL } from "./config";

export const AuthService = {
  login: async (correo, password) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
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

      if (usuario.rol !== "vocal") {
        throw new Error("Acceso denegado: solo vocales");
      }

      return { token, usuario };
    } catch (error) {
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Credenciales inválidas"
      );
    }
  },
};
