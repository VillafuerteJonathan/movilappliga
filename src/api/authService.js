import axios from "axios";

// Cambia esta URL a la de tu backend real
const API_URL = "https://tu-servidor.com/api";

export const login = async (email, password) => {
  // Simulación de login (puedes conectar con tu API real)
  if (email === "admin@ldp.com" && password === "1234") {
    return { token: "fake-jwt-token", name: "Administrador LDP" };
  } else {
    throw new Error("Credenciales inválidas");
  }
};
