"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useAuth } from "./Auth";
import { Card, CardContent } from "./ui/card";
import ReactMarkdown from "react-markdown";
import CodeBlock from "./CodeBlock";

interface ChatProps {
    messages: { role: string; content: string }[];
    isStreaming: boolean;
}

function Chat({ messages, isStreaming }: ChatProps) {
    const { user } = useAuth();

    return (
        <div className="flex flex-col space-y-4">
            {messages?.map((message, index) => (
                <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} mt-4`}>
                    <div className={message.role === "user" ? "flex-row-reverse space-x-reverse" : ""}>
                        <Avatar className="h-8 w-8">
                            {message.role === "user" ? (
                                <AvatarImage src={user?.picture} alt="@shadcn" />
                            ) : (
                                <AvatarImage src="/cidinha.png" alt="@shadcn" />
                            )}
                            <AvatarFallback className={message.role === "user" ? "bg-blue-500" : "bg-pink-500"} />
                        </Avatar>
                        <Card
                            className={
                                message.role === "user"
                                    ? "bg-primary text-primary-foreground border border-pink-500/70"
                                    : " border border-pink-500"
                            }
                        >
                            <CardContent className="px-3">
                                <div className="prose dark:prose-invert break-words text-base leading-relaxed overflow-hidden">
                                    <ReactMarkdown
                                        components={{
                                            code({ inline, className, children, ...props }: any) {
                                                if (inline) {
                                                    return <code className="bg-muted px-1 rounded">{children}</code>;
                                                }

                                                return (
                                                    <CodeBlock className={className}>
                                                        {String(children).replace(/\n$/, "")}
                                                    </CodeBlock>
                                                );
                                            },
                                        }}
                                    >
                                        {message?.content}
                                    </ReactMarkdown>

                                    {index === messages.length - 1 && message.role === "assistant" && isStreaming && (
                                        <span className="animate-pulse ml-1">▍</span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default Chat;
