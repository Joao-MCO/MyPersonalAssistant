"use client"

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useAuth } from "./Auth";
import { Card, CardContent } from "./ui/card";

interface ChatProps {
    messages: { role: string; content: string }[];
}

function Chat({ messages }: ChatProps) {
    const {user} = useAuth();

    return (
        <div>
            {messages?.map((message, index) => (
                <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} mt-4`}>
                    <div className={message.role === "user" ? "flex-row-reverse space-x-reverse" : ""}>
                        <Avatar className="h-8 w-8">
                            {message.role === "user" ?
                            <AvatarImage src={user?.picture} alt="@shadcn" /> : <AvatarImage src="/cidinha.png" alt="@shadcn" />}
                            <AvatarFallback className={message.role === "user" ? "bg-blue-500" : "bg-pink-500"} />
                        </Avatar>
                        <Card className={message.role === "user" ? "bg-primary text-primary-foreground border border-pink-500/70" : " border border-pink-500"}>
                            <CardContent className="px-3">
                                <p className="text-base leading-relaxed whitespace-pre-wrap">
                                    {message?.content}
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default Chat;
