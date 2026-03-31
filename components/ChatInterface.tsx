import { Send, FileArchive } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import Chat from "./Chat";
import { ScrollArea } from "./ui/scroll-area";

function ChatInterface() {
    const [inputMessage, setInputMessage] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    const [activeTool, setActiveTool] = useState<string | null>(null);

    const [isAtBottom, setIsAtBottom] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);

    const [toolHistory, setToolHistory] = useState<string[]>([]);
    const abortControllerRef = useRef<AbortController | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    const TOOL_LABELS: Record<string, string> = {
        checkCalendarTool: "📅 Consultando agenda...",
        sendEmailTool: "📧 Enviando email...",
    };

    const scrollToBottom = () => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        setIsAtBottom(true);
    };

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const handleScroll = () => {
            const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;

            setIsAtBottom(atBottom);
        };

        handleScroll();

        el.addEventListener("scroll", handleScroll);

        return () => el.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        if (isAtBottom) {
            scrollToBottom();
        }
    }, [messages, isAtBottom]);

    useEffect(() => {
        const saved = localStorage.getItem("chat_messages");
        if (saved) setMessages(JSON.parse(saved));
        setIsLoaded(true);
    }, []);

    useEffect(() => {
        if (!isLoaded) return;
        localStorage.setItem("chat_messages", JSON.stringify(messages));
    }, [messages, isLoaded]);

    const handleSendMessage = async () => {
        if ((!inputMessage.trim() && files.length === 0) || isLoading) return;

        setIsLoading(true);
        setIsStreaming(true);

        const userMessage = {
            role: "user",
            content: inputMessage + (files.length ? ` 📎 ${files.map((f) => f.name).join(", ")}` : ""),
        };

        const controller = new AbortController();
        abortControllerRef.current = controller;

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
                signal: controller.signal,
            });

            if (!res.body) throw new Error("Sem stream");

            const reader = res.body.getReader();
            const decoder = new TextDecoder();

            const assistantMessage = { role: "assistant", content: "" };
            setMessages((prev) => [...prev, assistantMessage]);

            let buffer = "";
            let accumulated = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                let boundary;

                while ((boundary = buffer.indexOf("\n")) >= 0) {
                    const line = buffer.slice(0, boundary).trim();
                    buffer = buffer.slice(boundary + 1);

                    if (!line) continue;

                    const parsed = JSON.parse(line);

                    if (parsed.type === "tool_start") {
                        setActiveTool(parsed.tool);
                        setToolHistory((prev) => [...prev, parsed.tool]);
                        continue;
                    }

                    if (parsed.type === "tool_end") {
                        setTimeout(() => setActiveTool(null), 500);
                        continue;
                    }

                    if (parsed.role === "assistant") {
                        accumulated += parsed.content;

                        requestAnimationFrame(() => {
                            setMessages((prev) => {
                                const updated = [...prev];

                                updated[updated.length - 1] = {
                                    role: "assistant",
                                    content: accumulated,
                                };

                                return updated;
                            });
                        });
                    }
                }
            }
            inputRef.current?.focus();
            setFiles([]);
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
                <div className="flex-1 overflow-y-auto w-full relative" ref={containerRef}>
                    <div className="max-w-3xl mx-auto py-8 px-4">
                        {!isAtBottom && (
                            <button
                                onClick={scrollToBottom}
                                className={`fixed bottom-32 right-40/100 translate-x-1/2 z-50 bg-zinc-800 text-white p-3 rounded-full shadow-lg hover:bg-zinc-700 ${
                                    isAtBottom ? "opacity-0 pointer-events-none" : "opacity-100"
                                }`}
                            >
                                ↓
                            </button>
                        )}
                        {isLoading && !isStreaming && (
                            <div className="mt-4 animate-pulse text-sm text-muted-foreground">
                                {activeTool && (
                                    <div className="text-sm text-muted-foreground mb-2 animate-pulse">
                                        {TOOL_LABELS[activeTool] || `⚙️ Executando ${activeTool}`}
                                    </div>
                                )}
                            </div>
                        )}
                        <Chat messages={messages} isStreaming={isStreaming} />
                        <div ref={bottomRef} />
                    </div>
                </div>
            </main>

            <footer className="p-4 border-t">
                <div className="max-w-3xl mx-auto space-y-2">
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

                        <textarea
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            rows={1}
                            placeholder="Insira seu texto..."
                            className="w-full resize-none max-h-40 min-h-10 overflow-y-auto p-2"
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
