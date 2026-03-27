import { Send, Sparkles, FileArchive } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { Badge } from "./ui/badge";
import { ModeToggle } from "./ModeToggle";
import { useTheme } from "next-themes";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useAuth } from "./Auth";
import Chat from "./Chat";
import { ScrollArea } from "./ui/scroll-area";

function ChatInterface() {
    const [inputMessage, setInputMessage] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    const { user, isAnonymous } = useAuth();
    const { theme } = useTheme();

    useEffect(() => {
        const savedMessages = localStorage.getItem("chat_messages");
        if (savedMessages) {
            try {
                setMessages(JSON.parse(savedMessages));
            } catch (error) {
                console.error("Erro ao ler mensagens guardadas:", error);
            }
        }
        setIsLoaded(true);
    }, []);

    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem("chat_messages", JSON.stringify(messages));
        }
    }, [messages, isLoaded]);

    useEffect(() => {
        if (scrollRef.current) {
            const el = scrollRef.current;
            const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
            if (isNearBottom) el.scrollTop = el.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async () => {
        if ((!inputMessage.trim() && files.length === 0) || isLoading) return;

        setIsLoading(true);
        setIsStreaming(true);

        const userMessage = {
            role: "user",
            content: inputMessage + (files.length ? ` 📎 ${files.map((f) => f.name).join(", ")}` : ""),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputMessage("");

        try {
            const formData = new FormData();

            formData.append("input_text", inputMessage);
            formData.append("session_messages", JSON.stringify(messages));

            files.forEach((file) => {
                formData.append("files", file);
            });

            const res = await fetch("/api/chat", {
                method: "POST",
                body: formData,
            });

            if (!res.body) throw new Error("Sem stream");

            const reader = res.body.getReader();
            const decoder = new TextDecoder();

            const assistantMessage = { role: "assistant", content: "" };
            setMessages((prev) => [...prev, assistantMessage]);

            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value);

                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (!line.trim()) continue;

                    try {
                        const parsed = JSON.parse(line);

                        assistantMessage.content += parsed.content;

                        setMessages((prev) => {
                            const updated = [...prev];
                            updated[updated.length - 1] = { ...assistantMessage };
                            return updated;
                        });
                    } catch (err) {
                        console.error("Erro ao parsear:", err);
                    }
                }
            }

            inputRef.current?.focus();
            setFiles([]); // limpa arquivos após envio
        } catch (error) {
            console.error("Erro ao enviar mensagem:", error);
        } finally {
            setIsLoading(false);
            setIsStreaming(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-background w-full overflow-hidden">
            <main className="flex-1 overflow-hidden flex flex-col">
                <ScrollArea ref={scrollRef} className="h-full w-full">
                    <div className="max-w-3xl mx-auto py-8 px-4">
                        <Chat messages={messages} isStreaming={isStreaming} />

                        {isLoading && !isStreaming && (
                            <div className="mt-4 animate-pulse text-sm text-muted-foreground">Pensando...</div>
                        )}
                    </div>
                </ScrollArea>
            </main>

            <footer className="p-4 border-t">
                <div className="max-w-3xl mx-auto space-y-2">
                    {/* preview arquivos */}
                    {files.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {files.map((file, index) => (
                                <div key={index} className="bg-muted px-2 py-1 rounded text-xs flex items-center gap-2">
                                    {file.name}
                                    <button onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}>
                                        ❌
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex space-x-2">
                        <input
                            type="file"
                            multiple
                            onChange={(e) => {
                                const selected = Array.from(e.target.files || []);
                                setFiles((prev) => [...prev, ...selected]);
                            }}
                            className="hidden"
                            id="file-upload"
                        />

                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            onChange={(e) => {
                                const selected = Array.from(e.target.files || []);
                                setFiles((prev) => [...prev, ...selected]);
                            }}
                            className="hidden"
                        />
                        <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()}>
                            <FileArchive />
                        </Button>

                        <Input
                            ref={inputRef}
                            value={inputMessage}
                            placeholder="Digite sua mensagem..."
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            disabled={isLoading}
                        />

                        <Button onClick={handleSendMessage} disabled={isLoading}>
                            <Send />
                        </Button>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default ChatInterface;
