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
  voiceName: 'Kore' | 'Puck' | 'Zephyr' | 'Fenrir' | 'Charon';
  voiceStyle: string;
  personality: string;
  greeting: string;
  hired: boolean;
  assignedToStage: boolean;
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

export type GameView = 'cinematic' | 'stage' | 'auditions' | 'troupe' | 'wardrobe' | 'mirror' | 'demands' | 'gifts';

export interface Crisis {
  id: string;
  message: string;
  level: 'LOW' | 'MEDIUM' | 'CRITICAL';
  type: 'drama' | 'crisis';
  image?: string;
}

