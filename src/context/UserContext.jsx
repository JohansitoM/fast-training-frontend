"use client";
import { createContext, useContext, useState, useEffect } from "react";
import api from "@/lib/api";
import { useSession } from "next-auth/react";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const { data: session, status } = useSession();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refetchUser = async () => {
    try {
      setLoading(true);

      // 1. Usuario autenticado con Google
      if (session?.user?.image) {
        const googleUser = {
          id: session.user.email,
          email: session.user.email,
          nombre: session.user.name?.split(" ")[0] || "",
          apellido: session.user.name?.split(" ")[1] || "",
          foto_perfil: session.user.image || "/default-profile.png",
          rol: "Jugador",
        };
        setUser(googleUser);
        return;
      }

      // 2. Usuario con token desde backend
      const token = localStorage.getItem("token");
      if (!token) {
        setUser(null);
        return;
      }

      const response = await api.get("/usuario/actual", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data?.success) {
        const userData = response.data.data;
        const formattedUser = {
          id: userData.id,
          email: userData.email,
          nombre: userData.nombre,
          apellido: userData.apellido,
          telefono: userData.telefono,
          foto_perfil: userData.foto_perfil || "/default-profile.png",
          rol:
            userData.rol_id === 1
              ? "Admin"
              : userData.rol_id === 2
                ? "Entrenador"
                : "Jugador",
        };
        setUser(formattedUser);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const syncData = () => {
      if (status === "authenticated") {
        refetchUser();
      } else if (status === "unauthenticated") {
        setUser(null);
      }
    };

    syncData(); // Ejecuta una vez al montar

    const interval = setInterval(syncData, 30000); // Sincroniza cada 30 segundos

    return () => clearInterval(interval); // Limpieza del intervalo
  }, [status, session]);

  return (
    <UserContext.Provider value={{ user, loading, refetchUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
