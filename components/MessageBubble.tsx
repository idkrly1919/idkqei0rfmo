
import React from 'react';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div className={`max-w-[90%] md:max-w-[80%] px-4 py-2 ${
        isUser 
          ? 'bg-gray-100 text-gray-900 rounded-2xl rounded-tr-sm' 
          : 'bg-white text-gray-900 border border-gray-200 rounded-2xl rounded-tl-sm'
      }`}>
        <div className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">
          {message.content}
        </div>

        {message.imageUrl && (
          <div className="mt-3 rounded-lg overflow-hidden border border-gray-100">
            <img 
              src={message.imageUrl} 
              alt="Generated content" 
              className="w-full h-auto object-cover cursor-zoom-in"
              loading="lazy"
              onClick={() => window.open(message.imageUrl, '_blank')}
            />
          </div>
        )}

        {message.isStreaming && (
          <span className="inline-block w-1 h-4 ml-1 bg-gray-400 animate-pulse align-middle" />
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
