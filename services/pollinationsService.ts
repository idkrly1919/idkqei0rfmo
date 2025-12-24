
import { Message, PollinationsChatResponse } from '../types';

// Robust API Key retrieval for both Vite (local) and Environment (Production)
const API_KEY = (() => {
  try {
    // @ts-ignore
    return (typeof process !== 'undefined' && process.env?.API_KEY) || 
           (import.meta as any).env?.VITE_API_KEY || '';
  } catch (e) {
    return '';
  }
})();

export const streamTextCompletion = async (
  messages: Message[],
  onChunk: (chunk: string) => void,
  onComplete: () => void,
  onError: (error: any) => void
) => {
  try {
    const formattedMessages = messages.map(({ role, content }) => ({
      role,
      content,
    }));

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

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');

    const decoder = new TextDecoder();
    let isFinished = false;

    while (!isFinished) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const dataLines = chunk.split('\n');

      for (const line of dataLines) {
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

export const generateImageUrl = (prompt: string, seed?: number): string => {
  const encodedPrompt = encodeURIComponent(prompt);
  const s = seed ?? Math.floor(Math.random() * 1000000);
  // Using 'zimage' model as requested
  return `https://gen.pollinations.ai/image/${encodedPrompt}?model=zimage&width=1024&height=1024&seed=${s}&nologo=true&enhance=true`;
};
