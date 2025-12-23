
import React, { useState, useRef, useEffect } from 'react';
import { Message, GenerationMode } from './types';
import { streamTextCompletion, generateImageUrl } from './services/pollinationsService';
import MessageBubble from './components/MessageBubble';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello. Type normally for text or start with /image for art.",
      timestamp: Date.now(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const userPrompt = inputValue.trim();
    setInputValue('');
    setIsProcessing(true);

    const isImageCommand = userPrompt.toLowerCase().startsWith('/image ');
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userPrompt,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);

    if (isImageCommand) {
      const prompt = userPrompt.slice(7);
      const imageUrl = generateImageUrl(prompt);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Generated: ${prompt}`,
        imageUrl: imageUrl,
        timestamp: Date.now(),
      };
      
      setTimeout(() => {
        setMessages(prev => [...prev, assistantMessage]);
        setIsProcessing(false);
      }, 500);

    } else {
      const assistantMessageId = (Date.now() + 1).toString();
      const initialAssistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      };

      setMessages(prev => [...prev, initialAssistantMessage]);

      let fullContent = '';
      await streamTextCompletion(
        [...messages, userMessage],
        (chunk) => {
          fullContent += chunk;
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: fullContent } 
              : msg
          ));
        },
        () => {
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, isStreaming: false } 
              : msg
          ));
          setIsProcessing(false);
        },
        () => {
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: 'Error connecting to API.', isStreaming: false } 
              : msg
          ));
          setIsProcessing(false);
        }
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-white">
      {/* Basic spacing instead of header */}
      <div className="h-4" />

      {/* Main Chat Area */}
      <main className="flex-1 overflow-y-auto px-4 pb-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </main>

      {/* Basic Input Area */}
      <footer className="p-4 border-t border-gray-100 bg-white">
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg bg-gray-50/50 px-3 py-1 focus-within:border-gray-400 focus-within:bg-white transition-all">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type something..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm md:text-base text-gray-900 placeholder:text-gray-400 resize-none py-2 max-h-32 min-h-[40px]"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={isProcessing || !inputValue.trim()}
            className={`p-2 transition-opacity ${
              isProcessing || !inputValue.trim() ? 'opacity-20 grayscale' : 'opacity-100'
            }`}
          >
            {isProcessing ? (
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-gray-600">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
