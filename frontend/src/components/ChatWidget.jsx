import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Mic } from 'lucide-react';
import { useCart } from '../context/CartContext';

const ChatWidget = () => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';
    const { addToCart, setIsCartOpen: openCart } = useCart();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', text: 'Olá! Sou seu assistente virtual. Como posso ajudar?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // Generate a random temp phone for the session if not exists
    const [userPhone] = useState(() => {
        const stored = localStorage.getItem('chat_user_phone');
        if (stored) return stored;
        const newPhone = 'web_' + Math.floor(Math.random() * 1000000);
        localStorage.setItem('chat_user_phone', newPhone);
        return newPhone;
    });

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Polling for new messages
    useEffect(() => {
        const pollInterval = setInterval(async () => {
            if (!userPhone) return;
            try {
                const response = await fetch(`${API_URL}/api/ai/poll?userPhone=${userPhone}`);
                const data = await response.json();
                if (data.success && data.messages) {
                    const historyMessages = data.messages.map(m => ({
                        role: m.role,
                        text: m.content
                    }));

                    if (historyMessages.length > 0) {
                        setMessages(prev => {
                            if (JSON.stringify(prev) !== JSON.stringify(historyMessages)) {
                                return historyMessages;
                            }
                            return prev;
                        });
                    }
                }
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, 3000);

        return () => clearInterval(pollInterval);
    }, [userPhone]);

    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = async () => {
                    const base64Audio = reader.result.split(',')[1];
                    await sendAudioMessage(base64Audio);
                };
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Erro ao acessar microfone. Verifique as permissões.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const processResponse = (data) => {
        if (data.responses && data.responses.length > 0) {
            const newMessages = data.responses.map(res => {
                // Check for action
                if (res.action && res.action.action === 'add_to_cart' && res.action.items) {
                    console.log('Adding items to cart:', res.action.items);
                    res.action.items.forEach(item => {
                        addToCart(item, item.quantity);
                    });
                    openCart(true);
                }
                return {
                    role: 'assistant',
                    text: res.text
                };
            });
            setMessages(prev => [...prev, ...newMessages]);
        }
    };

    const sendAudioMessage = async (base64Audio) => {
        const userMsg = { role: 'user', text: '🎤 Áudio enviado...' };
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audio: base64Audio, userPhone })
            });

            const data = await response.json();
            processResponse(data);
        } catch (error) {
            console.error('Error sending audio:', error);
            setMessages(prev => [...prev, { role: 'assistant', text: 'Erro ao enviar áudio.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = { role: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg.text, userPhone })
            });

            const data = await response.json();
            processResponse(data);
        } catch (error) {
            console.error('Error sending message:', error);
            setMessages(prev => [...prev, { role: 'assistant', text: 'Desculpe, tive um erro de conexão.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Helper to render text with links
    const renderMessageText = (text) => {
        if (!text) return '';
        // Regex for [Label](/url)
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = linkRegex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                parts.push(text.substring(lastIndex, match.index));
            }
            parts.push(
                <a
                    key={match.index}
                    href={match[2]}
                    className="underline font-bold text-blue-600 hover:text-blue-800"
                    target={match[2].startsWith('http') ? '_blank' : '_self'}
                    rel="noopener noreferrer"
                >
                    {match[1]}
                </a>
            );
            lastIndex = linkRegex.lastIndex;
        }
        if (lastIndex < text.length) {
            parts.push(text.substring(lastIndex));
        }
        return parts.length > 0 ? parts : text;
    };

    // Hide on Admin pages
    if (window.location.pathname.startsWith('/admin')) return null;

    return (
        <div className="fixed bottom-24 right-6 z-50 font-sans">
            {/* Chat Window */}
            {isOpen && (
                <div className="bg-white rounded-lg shadow-xl w-80 h-96 flex flex-col mb-4 border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-5">
                    {/* Header */}
                    <div className="bg-red-600 text-white p-3 flex justify-between items-center">
                        <h3 className="font-bold flex items-center gap-2">
                            <MessageCircle size={18} />
                            Atendente Virtual
                        </h3>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-red-700 p-1 rounded">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-2 rounded-lg text-sm whitespace-pre-wrap ${msg.role === 'user'
                                    ? 'bg-red-600 text-white rounded-br-none'
                                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                                    }`}>
                                    {renderMessageText(msg.text)}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-gray-200 text-gray-500 p-2 rounded-lg text-xs animate-pulse">
                                    Digitando...
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3 bg-white border-t border-gray-200 flex gap-2 items-center">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Digite sua mensagem..."
                            className="flex-1 border border-gray-300 rounded-full px-3 py-1 text-sm text-gray-800 focus:outline-none focus:border-red-500"
                        />

                        <button
                            onMouseDown={startRecording}
                            onMouseUp={stopRecording}
                            onTouchStart={startRecording}
                            onTouchEnd={stopRecording}
                            disabled={isLoading}
                            className={`p-2 rounded-full transition-colors ${isRecording ? 'bg-red-600 animate-pulse text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                }`}
                            title="Segure para gravar"
                        >
                            <Mic size={16} className={isRecording ? "fill-current" : ""} />
                            {/* Using MessageCircle as placeholder if Mic not imported, but user asked for voice. 
                                Ideally import Mic from lucide-react. 
                                Let's check imports first. 
                                Wait, I can't check imports in this tool call. 
                                I'll assume Mic is available or use MessageCircle for now and fix imports in next step.
                                Actually, I'll update imports in the next step.
                            */}
                        </button>

                        <button
                            onClick={handleSend}
                            disabled={isLoading}
                            className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 disabled:opacity-50"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-red-600 text-white p-3 rounded-full shadow-lg hover:bg-red-700 transition-transform hover:scale-110 flex items-center gap-2"
                >
                    <MessageCircle size={24} />
                    <span className="text-sm font-bold pr-1">Peça pelo Chat</span>
                </button>
            )}
        </div>
    );
};

export default ChatWidget;
