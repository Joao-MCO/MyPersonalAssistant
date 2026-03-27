"use client"

import { LogIn, LogOut, Trash, User } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react"
import { Button } from "./ui/button";
import Image from "next/image";
import { useTheme } from "next-themes";
import { Separator } from "./ui/separator";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";

export default function ChatSidebar(){
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authMode, setAuthMode] = useState<"singin" | "singup">();
    const isAnonymous = true;
    const { theme } = useTheme();
    const handleLogin = () => {
        window.location.href = '/api/google/auth';
    };
    const handleNewChat = () => {};
    const handleSingOut = () => {};
    const path = `/logo_${theme ? theme : "dark"}.png`
    const SidebarContent = () => {
        return (
            <div className="flex h-full flex-col space-x-2 mb-4">
                <div className="p-4">
                    <Link href={"/"}>
                        <Image src={path} alt="Logo" width={150} height={20}></Image>
                    </Link>
                </div>
                <Separator />

                {isAnonymous && (
                    <div className="p-4">
                        <Card className="border">
                            <CardContent className="p-3">
                                <p className="text-sm mb-2 text-destructive">Você está conversando sem fazer o Log In.</p>
                                <p className="text-sm mb-3">Para ter pleno acesso, logue com sua conta da SharkDev!</p>
                                <Button onClick={()=>{
                                    setAuthMode("singin");
                                    setShowAuthModal(true);
                                    handleLogin();
                                }} className="w-full" variant={"outline"} size={"sm"}>
                                    <LogIn />
                                    Login
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                )}
                <Separator />

                <div className="flex-1 overflow-hidden p-4">
                    <Button onClick={handleNewChat} className="w-full" variant={"outline"}>
                        <Trash />
                        Limpar Conversa
                    </Button>
                </div>
                <Separator />

                <div className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Avatar className="w-8 h-8">
                                <AvatarFallback className={isAnonymous ? "bg-yellow-500" : "bg-blue-500"}>
                                    <User />
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-h-0 flex-1">
                                <p className="text-sm font-medium line-clamp-1">Usuário Desconhecido</p>
                                <div className="flex items-center space-x-1">
                                    <Badge variant={isAnonymous ? "secondary" : "default"}>
                                        {isAnonymous ? "Desconhecido" : "Logado"}
                                    </Badge>

                                </div>
                            </div>
                        </div>
                        <div>
                            {isAnonymous ? (
                                <Button variant={"ghost"} size={"icon"} onClick={() => {
                                    setAuthMode("singin");
                                    setShowAuthModal(true);
                                    handleLogin()
                                }}>
                                    <LogIn className="h-4 w-4"/>
                                </Button>
                            ) :
                            (
                                <Button variant={"ghost"} size={"icon"} onClick={handleSingOut}>
                                    <LogOut />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            );
        }

        return (
            <div className="max-h-screen">
                <div className="h-full lg:flex lg:w-80 lg:flex-col lg:border-r">
                    <SidebarContent />
                </div>
            </div>
        );
}
