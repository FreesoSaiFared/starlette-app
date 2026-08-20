/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface StarletStats {
  happiness: number;
  reaction: number;
  tribute: number;
  tributePerSecond: number;
}

export interface WardrobeItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  owned: boolean;
  setId?: string;
}

export interface DancerCandidate {
  id: string;
  name: string;
  stageName: string;
  title: string;
  bio: string;
  specialty: string;
  hiringPrice: number;
  bonusTps: number;
  happinessBonus: number;
  image: string;
  portrait: string;
  voiceName: 'Kore' | 'Puck' | 'Zephyr' | 'Fenrir' | 'Charon' | 'Aoede' | string;
  voiceStyle: string;
  intonationPitch?: number; // 0.8 to 1.3
  intonationSpeed?: number; // 0.8 to 1.3
  personality: string;
  greeting: string;
  customStorylinePrompt?: string;
  customModelUrl?: string; // 3D GLTF / GLB model converted or imported
  customModelScale?: number;
  customModelYOffset?: number;
  corsetColor?: string;
  plumeColor?: string;
  accentColor?: string;
  hired: boolean;
  assignedToStage: boolean;
}

export interface LLMConfig {
  provider: 'gemini' | 'openai-compatible';
  endpoint: string;
  apiKey: string;
  model: string;
  customStorylinePrompt: string;
  temperature: number;
}

export interface AuditionDialogueMessage {
  id: string;
  speaker: 'director' | 'candidate' | 'narrator';
  text: string;
  emotion?: 'neutral' | 'flirty' | 'amused' | 'dramatic' | 'impressed' | 'thoughtful';
  stageDirection?: string;
  audioBase64?: string;
  timestamp: number;
}

export type GameView = 'cinematic' | 'stage' | 'auditions' | 'troupe' | 'studio' | 'wardrobe' | 'mirror' | 'demands' | 'gifts';

export interface Crisis {
  id: string;
  message: string;
  level: 'LOW' | 'MEDIUM' | 'CRITICAL';
  type: 'drama' | 'crisis';
  image?: string;
}

