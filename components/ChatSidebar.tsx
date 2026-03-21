"use client"

import { Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import React from "react"
import { Button } from "./ui/button";
import Image from "next/image";
import { ThemeProvider } from "@/components/theme-provider"
import { useTheme } from "next-themes";

export default function ChatSidebar(){
    const { theme } = useTheme();
    const path = `/logo_${theme ? theme : "dark"}.png`
    return (
    <div className="flex h-full flex-col space-x-2 mb-4">
        <div className="p-4">
            <Link href={"/"}>
                <Image src={path} alt="Logo" width={150} height={20}></Image>
            </Link>
            <Button>
                <Plus />
                Nova Conversa
            </Button>
        </div>
    </div>
    );
}
