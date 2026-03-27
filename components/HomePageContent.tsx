"use client"

import React, { useRef, useState } from "react";
import ChatInterface from "./ChatInterface";

export default function HomePageContent(){
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authMode, setAuthMode] = useState<"singin" | "singup">();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    return (
        <div>
            <ChatInterface />
        </div>
    );
}
