import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// --- Types ---
type Role = 'user' | 'assistant' | 'system';

interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  imageUrl?: string;
}

interface PollinationsChatResponse {
  choices: {
    delta?: { content?: string };
    message?: { content: string };
    finish_reason: string | null;
  }[];
}

// --- Service Logic ---
const API_KEY = (() => {
  try {
    return process.env.API_KEY || '';
  } catch (e) {
    return '';
  }
})();

const streamTextCompletion = async (
  messages: Message[],
  onChunk: (chunk: string) => void,
  onComplete: () => void,
  onError: (error: any) => void
) => {
  try {
    const formattedMessages = messages.map(({ role, content }) => ({ role, content }));
    const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-flash',
        messages: formattedMessages,
        stream: true,
      }),
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const reader = response.body?.getReader();
    if (!reader) throw new Error('Stream failed');

    const decoder = new TextDecoder();
    let isFinished = false;

    while (!isFinished) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            isFinished = true;
            break;
          }
          try {
            const parsed: PollinationsChatResponse = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            if (content) onChunk(content);
          } catch (e) {}
        }
      }
    }
    onComplete();
  } catch (error) {
    onError(error);
  }
};

const generateImageUrl = (prompt: string): string => {
  const s = Math.floor(Math.random() * 1000000);
  // Updated model to zimage as requested
  return `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?model=zimage&width=1024&height=1024&seed=${s}&nologo=true`;
};

// --- Components ---
const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
  const isUser = message.role === 'user';
  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div className={`max-w-[90%] md:max-w-[80%] px-4 py-2 ${
        isUser 
          ? 'bg-gray-100 text-gray-900 rounded-2xl rounded-tr-sm' 
          : 'bg-white text-gray-900 border border-gray-100 rounded-2xl rounded-tl-sm'
      }`}>
        <div className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">
          {message.content}
        </div>
        {message.imageUrl && (
          <div className="mt-3 rounded-lg overflow-hidden border border-gray-100">
            <img 
              src={message.imageUrl} 
              alt="AI Content" 
              className="w-full h-auto object-cover cursor-zoom-in"
              onClick={() => window.open(message.imageUrl, '_blank')}
            />
          </div>
        )}
        {message.isStreaming && (
          <span className="inline-block w-1.5 h-4 ml-1 bg-gray-300 animate-pulse align-middle" />
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: 'Ready. Use /image for art.', timestamp: Date.now() }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const input = inputValue.trim();
    setInputValue('');
    setIsProcessing(true);

    const isImg = input.toLowerCase().startsWith('/image ');
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);

    if (isImg) {
      const prompt = input.slice(7);
      const url = generateImageUrl(prompt);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Image: ${prompt}`,
        imageUrl: url,
        timestamp: Date.now()
      }]);
      setIsProcessing(false);
    } else {
      const aiId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: aiId, role: 'assistant', content: '', timestamp: Date.now(), isStreaming: true }]);

      let text = '';
      await streamTextCompletion(
        [...messages, userMsg],
        (chunk) => {
          text += chunk;
          setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: text } : m));
        },
        () => {
          setMessages(prev => prev.map(m => m.id === aiId ? { ...m, isStreaming: false } : m));
          setIsProcessing(false);
        },
        () => {
          setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: 'API Error.', isStreaming: false } : m));
          setIsProcessing(false);
        }
      );
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-white border-x border-gray-50">
      <main className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth">
        {messages.map(m => <MessageBubble key={m.id} message={m} />)}
        <div ref={endRef} />
      </main>
      <footer className="p-4 border-t border-gray-100 bg-white">
        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-1 focus-within:border-gray-400 focus-within:ring-1 focus-within:ring-gray-400 transition-all">
          <textarea
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="Type..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-gray-900 py-3 resize-none max-h-32 min-h-[44px]"
            rows={1}
          />
          <button
            disabled={isProcessing || !inputValue.trim()}
            onClick={handleSend}
            className={`p-2 transition-all ${isProcessing || !inputValue.trim() ? 'opacity-20' : 'opacity-100 hover:scale-105 active:scale-95'}`}
          >
            {isProcessing ? <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" /> : 
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-gray-500"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>}
          </button>
        </div>
      </footer>
    </div>
  );
};

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(<React.StrictMode><App /></React.StrictMode>);
}