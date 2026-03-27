"use client"

import React, { useRef, useState } from "react";
import ChatInterface from "./ChatInterface";

export default function HomePageContent(){
    const [isLoading, setIsLoading] = useState(false);

    return (
        <div>
            <ChatInterface />
        </div>
    );
}
