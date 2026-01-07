import { API_URL } from "../config/api";

export const login = async (correo, password) => {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ correo, password })
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.message || "Error al iniciar sesión");
    }

    // Verificar que el rol sea vocal
    if (data.data.usuario.rol !== "vocal") {
      throw new Error("Acceso denegado: solo vocales pueden entrar");
    }

    return data.data; // { token, usuario }
  } catch (error) {
    throw error;
  }
};