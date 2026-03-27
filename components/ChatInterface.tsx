import { Send, Sparkles } from 'lucide-react';
import Link from 'next/link';
import React, { useRef, useState } from 'react'
import { Badge } from './ui/badge';
import { ModeToggle } from './ModeToggle';
import { useTheme } from 'next-themes';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useAuth } from './Auth';
import SingleChatPage from '@/app/chat/page';
import Chat from './Chat';

function ChatInterface() {
    const [inputMessage, setInputMessage] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { user, isAnonymous } = useAuth();
    const {theme} = useTheme();

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || isLoading) return;
        setIsLoading(true);

        const userMessage = { role: "user", content: inputMessage };
        setMessages((prev) => [...prev, userMessage]);
        setInputMessage("");

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    input_text: userMessage.content,
                    session_messages: messages,
                }),
            });

            const data = await res.json();

            if (data.output && data.output.length > 0) {
                setMessages((prev) => [...prev, data.output[0]]);
            }
            console.log(data.output)
        } catch (error) {
            console.error("Erro ao enviar mensagem:", error);
        } finally {
            setIsLoading(false);
        }
    };

  return (
    <div className='flex flex-col h-screen bg-background w-full'>
        <header className='border-b bg-card/50 backdrop-blur supports-backdrop-filter:bg-card/60 px-4'>
            <div className='container flex h-16 items-center justify-between'>
                <Link href={"/"} className='flex items-center space-x-4'>
                    <div className='flex items-center space-x-2'>
                        <div className={`ml-8 lg:ml-0 flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-r ${theme === "light" ? "from-black" : "from-white"} to-pink-500`}>
                            <Sparkles className={`h-4 w-4 ${theme === "light" ? "text-white" : "text-black"}`} />
                        </div>
                        <div>
                            <div className='flex'>
                                <h1 className='text-lg font-semibold hidden sm:block'>
                                    Cidinha
                                </h1>
                                <Badge variant={isAnonymous ? "secondary" : "default"} className='md:ml-2 border border-primary/50'>
                                    {isAnonymous ? "Desconhecido" : "Logado"}
                                </Badge>
                            </div>
                            <p className='text-xs text-muted-foreground hidden sm:block'>
                                A assistente virtual da SharkDev!
                            </p>
                        </div>
                    </div>
                </Link>
                <div>
                    <ModeToggle />
                </div>
            </div>
        </header>
        <div className='flex-1 py-6 px-4'>
            <div className='w-full space-y-6 h-full flex flex-col justify-between'>
                {messages.length === 0 ?
                (<div>
                    <div className={`mb-6 bg-linear-to-r from-purple-500/10 to-pink-500/10 border border-pink-500/20 rounded-xl p-4`}>
                        <div className='flex items-start space-x-3'>
                            <div className={`ml-8 lg:ml-0 flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-r ${theme === "light" ? "from-black" : "from-white"} to-pink-500`}>
                                <Sparkles className={`h-4 w-4 ${theme === "light" ? "text-white" : "text-black"}`} />
                            </div>
                            <div className=''>
                                <h3 className='font-semibold text-primary mb-1'>Bem-Vindo! Quero te apresentar sua nova melhor amiga: Cidinha</h3>
                                <p className='text-primary/80 text-sm mb-2'>
                                    {isAnonymous ? "Você está conversando anonimamente. Você não terá pleno acesso a menos que você faça login." : "Você está logado!."}
                                </p>
                                <div className='flex flex-wrap gap-2'>
                                    <span className='inline-flex items-center px-2 py-1 bg-white/10 rounded-lg text-xs'>
                                        💬 Digite uma mensagem abaixo para começar
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Card className='border-dashed'>
                        <CardContent className='pt-3'>
                            <div className='flex flex-col items-center'>
                                <p className='text-2xl text-primary font-semibold'>Como posso te ajudar?</p>
                            </div>
                            <div className='text-center space-y-4 pt-3'>
                                <div className='grid grid-cols-1 sm:grid-cols-2 max-w-lg mx-auto gap-2'>
                                    {
                                        [
                                            "O que você faz?",
                                            "Me ajude com os módulos do Time Blip?",
                                            "Como está minha agenda?",
                                            "Lance minhas reuniões de hoje no Painel!"
                                        ].map((text, index) => (
                                            <Button key={index} variant={"ghost"} className='h-auto p-3 text-left justify-start border' onClick={()=>setInputMessage(text)}>
                                                <span>
                                                    {text}
                                                </span>
                                            </Button>
                                        ))
                                    }
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>) :
                (<div>
                    <Chat />
                </div>)}
                <Card>
                    <CardContent className='pt-2'>
                        <div className='flex space-x-2'>
                            <div className='flex-1'>
                                <Input ref={inputRef} value={inputMessage} className='min-h-12' placeholder={"Digite aqui sua mensagem..."} onChange={(e)=> setInputMessage(e.target.value)
                                } disabled={isLoading}/>
                            </div>
                            <Button type="submit" className='h-12 w-12' size={"icon"} onClick={handleSendMessage} disabled={!inputMessage.trim() || isLoading}>
                                <Send className='w-4 h-4' />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  )
}

export default ChatInterface
