import React from "react";
import { useAuth } from "./Auth";
import { useTheme } from "next-themes";
import { Sparkles } from "lucide-react";

function AppLoading() {
    const { loading } = useAuth();
    const { theme } = useTheme();
    if (!loading) return null;
    return <div>
        <div className="min-h-screen flex items-center justify-center bg-background/90 w-full fixed left-0 top-0 z-50">
            <div className="text-center text-white">
                <div className={`w-16 h-16 bg-linear-to-r ${theme === "light" ? "from-black" : "from-white"} to-pink-500 roundex-2xl mx-auto mb-4 flex items-center justify-center`}>
                    <Sparkles className="w-8 h-8 animate-spin"/>
                </div>
                <h2 className="text-2xl font-bold mb-2">Carregando...</h2>
            </div>
        </div>
    </div>;
}

export default AppLoading;
