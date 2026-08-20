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

export type GameView = 'cinematic' | 'stage' | 'demands' | 'gifts' | 'mirror' | 'wardrobe';

export interface Crisis {
  id: string;
  message: string;
  level: 'LOW' | 'MEDIUM' | 'CRITICAL';
  type: 'drama' | 'crisis';
  image?: string;
}
