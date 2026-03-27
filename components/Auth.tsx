"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface AuthContextType {
    user: any | null;
    loading: boolean;
    isAnonymous: boolean;
    login: () => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const isAnonymous = user === null;

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await fetch("/api/google/profile");
                if (response.ok) {
                    const data = await response.json();
                    setUser(data);
                }
            } catch (error) {
                console.error("Erro ao buscar perfil:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const login = () => {
        window.location.href = "/api/google/auth";
    };

    const logout = async () => {
        await fetch("/api/google/logout", { method: "POST" });
        setUser(null);
        window.location.href = "/"; // Redireciona para a home limpa
    };

    return <AuthContext.Provider value={{ user, loading, isAnonymous, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
