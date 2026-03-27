"use client"

import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useAuth } from "./Auth";
import { Card, CardContent } from "./ui/card";

function Chat() {
    const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
    const {user} = useAuth();
    let i=0;
    return <div>
        {messages?.map((message) => (
            <div key={i++} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={message.role === "user" ? "flex-row-reverse space-x-reverse" : ""}>
                    <Avatar className="h-8 w-8">
                        {message.role === "user" ?
                        <AvatarImage src={user.picture} alt="@shadcn" /> : null}
                        <AvatarFallback className={message.role === "user" ? "bg-blue-500" : "bg-pink-500"}>CN</AvatarFallback>
                    </Avatar>
                    <Card className={message.role === "user" ? "bg-primary text-primary-foreground" : ""}>
                        <CardContent className="px-3">
                            <p className="text-base leading-relaxed whitespace-pre-wrap">
                                {message?.content}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        ))}
    </div>;
}

export default Chat;
