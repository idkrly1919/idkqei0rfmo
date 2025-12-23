
export type Role = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  imageUrl?: string;
}

export interface PollinationsChatResponse {
  choices: {
    delta?: {
      content?: string;
    };
    message?: {
      content: string;
    };
    finish_reason: string | null;
  }[];
}

export enum GenerationMode {
  TEXT = 'text',
  IMAGE = 'image'
}
