import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import jwtDecode from "jwt-decode";

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (token) {
          // Si el token es real, decodifica:
          try {
            const decoded = jwtDecode(token);
            setUser(decoded);
          } catch {
            // Si es token simulado:
            setUser({ name: "Usuario LDP" });
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Error cargando token:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  return { user, setUser, loading };
}
