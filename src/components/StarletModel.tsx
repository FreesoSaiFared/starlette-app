import React, { useRef, useMemo, useEffect, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

interface StarletModelProps {
  action: 'idle' | 'dance' | 'bow';
  customModelUrl?: string;
  customModelScale?: number;
  customModelYOffset?: number;
  customModelAnimations?: {
    idle?: string;
    dance?: string;
    bow?: string;
  };
  onClipsDiscovered?: (clipNames: string[]) => void;
  corsetColor?: string;
  plumeColor?: string;
  accentColor?: string;
}

// Matching helper for finding clips by explicit name or semantic action keywords
function findMatchingClip(
  clips: THREE.AnimationClip[],
  explicitName?: string,
  actionType?: 'idle' | 'dance' | 'bow'
): THREE.AnimationClip | null {
  if (!clips || clips.length === 0) return null;

  // 1. Explicit mapping always wins over automatic detection
  if (explicitName && explicitName.trim().length > 0) {
    const target = explicitName.trim().toLowerCase();

    // Exact case-insensitive match
    const exact = clips.find((c) => c.name.toLowerCase() === target);
    if (exact) return exact;

    // Cleaned match (ignoring separators, spaces, underscores, dashes)
    const cleanTarget = target.replace(/[^a-z0-9]/g, '');
    const cleanMatch = clips.find(
      (c) => c.name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanTarget
    );
    if (cleanMatch) return cleanMatch;

    // Substring match
    const subMatch = clips.find((c) => c.name.toLowerCase().includes(target));
    if (subMatch) return subMatch;
  }

  // 2. Automatic matching based on standard semantic animation naming
  if (!actionType) return null;

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (actionType === 'idle') {
    const priorityKeywords = ['idle', 'standingidle', 'defaultidle', 'standing', 'breathe', 'loop'];
    for (const key of priorityKeywords) {
      const match = clips.find((c) => normalize(c.name) === key);
      if (match) return match;
    }
    for (const key of ['idle', 'standing', 'stand', 'pose']) {
      const match = clips.find((c) => c.name.toLowerCase().includes(key));
      if (match) return match;
    }
    // If only 1 clip in file, treat as idle loop
    if (clips.length === 1) return clips[0];
  }

  if (actionType === 'dance') {
    const priorityKeywords = ['dance', 'cancan', 'performance', 'choreography', 'dancing', 'routine'];
    for (const key of priorityKeywords) {
      const match = clips.find((c) => normalize(c.name) === key);
      if (match) return match;
    }
    for (const key of ['dance', 'cancan', 'perf', 'routine', 'choreo', 'action']) {
      const match = clips.find((c) => c.name.toLowerCase().includes(key));
      if (match) return match;
    }
  }

  if (actionType === 'bow') {
    const priorityKeywords = ['bow', 'curtsy', 'curtsey', 'closingbow', 'applause', 'thankyou'];
    for (const key of priorityKeywords) {
      const match = clips.find((c) => normalize(c.name) === key);
      if (match) return match;
    }
    for (const key of ['bow', 'curtsy', 'curtsey', 'salute', 'end']) {
      const match = clips.find((c) => c.name.toLowerCase().includes(key));
      if (match) return match;
    }
  }

  return null;
}

// Sub-component to load external GLTF/GLB models with real skeletal animation playback
const AnimatedGLTFPerformer: React.FC<{
  url: string;
  scale?: number;
  yOffset?: number;
  action: 'idle' | 'dance' | 'bow';
  customModelAnimations?: {
    idle?: string;
    dance?: string;
    bow?: string;
  };
  onClipsDiscovered?: (clipNames: string[]) => void;
}> = ({ url, scale = 1.0, yOffset = -1.4, action, customModelAnimations, onClipsDiscovered }) => {
  const groupRef = useRef<THREE.Group>(null);
  const gltf = useGLTF(url);

  // Safe skinned mesh cloning using SkeletonUtils.clone to prevent shared rig corruption
  const clonedScene = useMemo(() => {
    if (!gltf.scene) return null;
    const clone = SkeletonUtils.clone(gltf.scene);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [gltf.scene]);

  // Extract animation clips
  const clips = useMemo(() => gltf.animations || [], [gltf.animations]);

  // Notify parent of discovered clip names
  useEffect(() => {
    if (onClipsDiscovered && clips.length > 0) {
      onClipsDiscovered(clips.map((c) => c.name));
    }
  }, [clips, onClipsDiscovered]);

  // Animation matching
  const idleClip = useMemo(
    () => findMatchingClip(clips, customModelAnimations?.idle, 'idle'),
    [clips, customModelAnimations?.idle]
  );
  const danceClip = useMemo(
    () => findMatchingClip(clips, customModelAnimations?.dance, 'dance'),
    [clips, customModelAnimations?.dance]
  );
  const bowClip = useMemo(
    () => findMatchingClip(clips, customModelAnimations?.bow, 'bow'),
    [clips, customModelAnimations?.bow]
  );

  // Create AnimationMixer bound to the cloned scene root
  const mixer = useMemo(() => {
    if (!clonedScene) return null;
    return new THREE.AnimationMixer(clonedScene);
  }, [clonedScene]);

  // Clean up mixer when unmounting or changing dancer
  useEffect(() => {
    return () => {
      if (mixer && clonedScene) {
        mixer.stopAllAction();
        mixer.uncacheRoot(clonedScene);
      }
    };
  }, [mixer, clonedScene]);

  const currentActionRef = useRef<THREE.AnimationAction | null>(null);

  // Handle action switching and smooth crossfading
  useEffect(() => {
    if (!mixer || !clonedScene) return;

    // Pick target clip; if dance or bow is missing, fallback to idleClip for skeletal playback
    const targetClip =
      action === 'dance' ? (danceClip || idleClip) :
      action === 'bow' ? (bowClip || idleClip) :
      idleClip;

    if (!targetClip) {
      if (currentActionRef.current) {
        currentActionRef.current.fadeOut(0.35);
        currentActionRef.current = null;
      }
      return;
    }

    const nextAction = mixer.clipAction(targetClip, clonedScene);
    const prevAction = currentActionRef.current;

    if (prevAction !== nextAction) {
      if (prevAction) {
        prevAction.fadeOut(0.35);
      }
      nextAction.reset();
      nextAction.setEffectiveTimeScale(1);
      nextAction.setEffectiveWeight(1);
      nextAction.setLoop(THREE.LoopRepeat, Infinity);
      nextAction.fadeIn(0.35);
      nextAction.play();
      currentActionRef.current = nextAction;
    }
  }, [mixer, clonedScene, action, idleClip, danceClip, bowClip]);

  // Render frame update: tick mixer and apply last-resort transform fallback ONLY if no clip exists
  useFrame((state, delta) => {
    if (mixer) {
      mixer.update(delta);
    }
    if (!groupRef.current) return;

    const t = state.clock.getElapsedTime();
    const lerpSpeed = Math.min(1, delta * 6);

    if (action === 'dance') {
      if (danceClip) {
        // Real skeletal dance animation active - keep root stationary
        groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, yOffset, lerpSpeed);
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0, lerpSpeed);
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, lerpSpeed);
      } else {
        // Last-resort fallback transform animation
        const danceTempo = t * 6;
        groupRef.current.position.y = THREE.MathUtils.lerp(
          groupRef.current.position.y,
          yOffset + Math.abs(Math.sin(danceTempo * 2)) * 0.25,
          lerpSpeed
        );
        groupRef.current.rotation.y = THREE.MathUtils.lerp(
          groupRef.current.rotation.y,
          Math.sin(danceTempo) * 0.4,
          lerpSpeed
        );
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, lerpSpeed);
      }
    } else if (action === 'bow') {
      if (bowClip) {
        // Real skeletal bow animation active - keep root stationary
        groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, yOffset, lerpSpeed);
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0, lerpSpeed);
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, lerpSpeed);
      } else {
        // Last-resort fallback transform animation
        const bowPhase = Math.sin(t * 2);
        groupRef.current.position.y = THREE.MathUtils.lerp(
          groupRef.current.position.y,
          yOffset - Math.max(0, bowPhase) * 0.3,
          lerpSpeed
        );
        groupRef.current.rotation.x = THREE.MathUtils.lerp(
          groupRef.current.rotation.x,
          0.3 + Math.max(0, bowPhase) * 0.3,
          lerpSpeed
        );
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0, lerpSpeed);
      }
    } else {
      // Idle action
      if (idleClip) {
        // Real skeletal idle animation active - keep root stationary
        groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, yOffset, lerpSpeed);
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0, lerpSpeed);
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, lerpSpeed);
      } else {
        // Last-resort fallback transform animation
        const idleSpeed = t * 1.6;
        groupRef.current.position.y = THREE.MathUtils.lerp(
          groupRef.current.position.y,
          yOffset + Math.sin(idleSpeed * 2) * 0.05,
          lerpSpeed
        );
        groupRef.current.rotation.y = THREE.MathUtils.lerp(
          groupRef.current.rotation.y,
          Math.sin(idleSpeed) * 0.15,
          lerpSpeed
        );
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, lerpSpeed);
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, yOffset, 0]} scale={scale}>
      {clonedScene && <primitive object={clonedScene} />}
    </group>
  );
};

export const StarletModel: React.FC<StarletModelProps> = ({
  action,
  customModelUrl,
  customModelScale = 1.0,
  customModelYOffset = -1.4,
  customModelAnimations,
  onClipsDiscovered,
  corsetColor = '#151414',
  plumeColor = '#d4af37',
  accentColor = '#5c0f1b',
}) => {
  const rootRef = useRef<THREE.Group>(null);
  const hipsRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const plumeRef = useRef<THREE.Group>(null);
  
  const leftUpperArmRef = useRef<THREE.Group>(null);
  const leftForearmRef = useRef<THREE.Group>(null);
  const leftFanRef = useRef<THREE.Group>(null);
  
  const rightUpperArmRef = useRef<THREE.Group>(null);
  const rightForearmRef = useRef<THREE.Group>(null);
  const rightFanRef = useRef<THREE.Group>(null);
  
  const skirtRef = useRef<THREE.Group>(null);
  
  const leftThighRef = useRef<THREE.Group>(null);
  const leftCalfRef = useRef<THREE.Group>(null);
  const leftFootRef = useRef<THREE.Group>(null);
  
  const rightThighRef = useRef<THREE.Group>(null);
  const rightCalfRef = useRef<THREE.Group>(null);
  const rightFootRef = useRef<THREE.Group>(null);

  const particlesRef = useRef<THREE.Points>(null);

  // Materials with customizable colors & Sophisticated Dark aesthetic
  const materials = useMemo(() => ({
    gold: new THREE.MeshStandardMaterial({
      color: '#d4af37',
      metalness: 0.85,
      roughness: 0.25,
    }),
    goldTrim: new THREE.MeshStandardMaterial({
      color: '#f3e5ab',
      metalness: 0.95,
      roughness: 0.15,
      emissive: '#d4af37',
      emissiveIntensity: 0.2,
    }),
    velvet: new THREE.MeshStandardMaterial({
      color: corsetColor || '#151414',
      roughness: 0.85,
      metalness: 0.1,
    }),
    crimson: new THREE.MeshStandardMaterial({
      color: accentColor || '#5c0f1b',
      roughness: 0.6,
      metalness: 0.2,
    }),
    skin: new THREE.MeshStandardMaterial({
      color: '#fce3dc',
      roughness: 0.55,
      metalness: 0.05,
    }),
    stockings: new THREE.MeshStandardMaterial({
      color: '#1a1818',
      roughness: 0.9,
    }),
    plume: new THREE.MeshStandardMaterial({
      color: plumeColor || '#d4af37',
      roughness: 0.4,
      metalness: 0.4,
      side: THREE.DoubleSide,
    }),
    ruby: new THREE.MeshStandardMaterial({
      color: '#8b0000',
      metalness: 0.3,
      roughness: 0.1,
      emissive: '#400000',
    }),
  }), [corsetColor, plumeColor, accentColor]);

  // If a custom 3D model URL is provided, render the animated GLTF model
  if (customModelUrl && customModelUrl.trim().length > 0) {
    return (
      <Suspense fallback={null}>
        <AnimatedGLTFPerformer
          url={customModelUrl}
          scale={customModelScale}
          yOffset={customModelYOffset}
          action={action}
          customModelAnimations={customModelAnimations}
          onClipsDiscovered={onClipsDiscovered}
        />
      </Suspense>
    );
  }

  // Sparkle particles for stage performance
  const particleCount = 40;
  const particlePositions = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 3;
      positions[i * 3 + 1] = Math.random() * 3.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }
    return positions;
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const lerpSpeed = Math.min(1, delta * 7);

    // Particle floating animation
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3 + 1] += (0.01 + (action === 'dance' ? 0.03 : 0.005));
        if (positions[i * 3 + 1] > 3.5) {
          positions[i * 3 + 1] = -0.2;
          positions[i * 3] = (Math.random() - 0.5) * 3;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
        }
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }

    if (action === 'dance') {
      // High-energy French Cancan routine
      const danceTempo = t * 7;
      const kickCycle = danceTempo % (Math.PI * 2);
      const isLeftKick = kickCycle < Math.PI;

      // Root bounce & sway
      if (rootRef.current) {
        rootRef.current.position.y = THREE.MathUtils.lerp(
          rootRef.current.position.y,
          -1.4 + Math.abs(Math.sin(danceTempo * 2)) * 0.25,
          lerpSpeed
        );
        rootRef.current.rotation.y = THREE.MathUtils.lerp(
          rootRef.current.rotation.y,
          Math.sin(danceTempo) * 0.35,
          lerpSpeed
        );
      }

      // Hips energetic tilt
      if (hipsRef.current) {
        hipsRef.current.rotation.z = Math.sin(danceTempo) * 0.25;
        hipsRef.current.position.x = Math.sin(danceTempo) * 0.15;
      }

      // Torso rhythm counter-sway
      if (torsoRef.current) {
        torsoRef.current.rotation.x = 0.1 + Math.sin(danceTempo * 2) * 0.1;
        torsoRef.current.rotation.z = -Math.sin(danceTempo) * 0.15;
      }

      // Head dramatic movement
      if (headRef.current) {
        headRef.current.rotation.x = -0.15 + Math.sin(danceTempo * 2) * 0.1;
        headRef.current.rotation.y = Math.sin(danceTempo) * 0.3;
      }

      // Feather plumes waving
      if (plumeRef.current) {
        plumeRef.current.rotation.z = Math.sin(danceTempo * 2) * 0.4;
        plumeRef.current.rotation.x = Math.cos(danceTempo * 2) * 0.3;
      }

      // Cancan skirt swirl
      if (skirtRef.current) {
        skirtRef.current.rotation.z = Math.sin(danceTempo) * 0.3;
        skirtRef.current.rotation.x = -0.15 + Math.abs(Math.sin(danceTempo * 2)) * 0.25;
      }

      // Dramatic Cancan Arms (holding fans high in celebration)
      if (leftUpperArmRef.current && leftForearmRef.current && leftFanRef.current) {
        leftUpperArmRef.current.rotation.z = THREE.MathUtils.lerp(
          leftUpperArmRef.current.rotation.z,
          1.8 + Math.sin(danceTempo) * 0.3,
          lerpSpeed
        );
        leftUpperArmRef.current.rotation.x = Math.sin(danceTempo * 2) * 0.3;
        leftForearmRef.current.rotation.x = 1.0 + Math.sin(danceTempo) * 0.2;
        leftFanRef.current.rotation.y = t * 4;
      }

      if (rightUpperArmRef.current && rightForearmRef.current && rightFanRef.current) {
        rightUpperArmRef.current.rotation.z = THREE.MathUtils.lerp(
          rightUpperArmRef.current.rotation.z,
          -1.8 - Math.sin(danceTempo) * 0.3,
          lerpSpeed
        );
        rightUpperArmRef.current.rotation.x = -Math.sin(danceTempo * 2) * 0.3;
        rightForearmRef.current.rotation.x = 1.0 - Math.sin(danceTempo) * 0.2;
        rightFanRef.current.rotation.y = -t * 4;
      }

      // Cancan High Kicks! (Alternating legs shooting skyward)
      if (isLeftKick) {
        const kickProgress = (kickCycle / Math.PI);
        const kickAngle = Math.sin(kickProgress * Math.PI) * 1.9; // High vertical kick!

        if (leftThighRef.current && leftCalfRef.current) {
          leftThighRef.current.rotation.x = kickAngle;
          leftThighRef.current.rotation.z = 0.15;
          leftCalfRef.current.rotation.x = Math.max(0, -Math.sin(kickProgress * Math.PI) * 0.5);
        }
        if (rightThighRef.current && rightCalfRef.current) {
          rightThighRef.current.rotation.x = -0.2;
          rightThighRef.current.rotation.z = -0.1;
          rightCalfRef.current.rotation.x = 0.4;
        }
      } else {
        const kickProgress = ((kickCycle - Math.PI) / Math.PI);
        const kickAngle = Math.sin(kickProgress * Math.PI) * 1.9; // High vertical kick!

        if (rightThighRef.current && rightCalfRef.current) {
          rightThighRef.current.rotation.x = kickAngle;
          rightThighRef.current.rotation.z = -0.15;
          rightCalfRef.current.rotation.x = Math.max(0, -Math.sin(kickProgress * Math.PI) * 0.5);
        }
        if (leftThighRef.current && leftCalfRef.current) {
          leftThighRef.current.rotation.x = -0.2;
          leftThighRef.current.rotation.z = 0.1;
          leftCalfRef.current.rotation.x = 0.4;
        }
      }

    } else if (action === 'bow') {
      // Theatrical French Curtsy & Deep Bow
      const bowPhase = Math.sin(t * 2);

      if (rootRef.current) {
        rootRef.current.position.y = THREE.MathUtils.lerp(
          rootRef.current.position.y,
          -1.7 - Math.max(0, bowPhase) * 0.35,
          lerpSpeed
        );
        rootRef.current.rotation.y = THREE.MathUtils.lerp(rootRef.current.rotation.y, 0, lerpSpeed);
      }

      if (hipsRef.current) {
        hipsRef.current.rotation.z = THREE.MathUtils.lerp(hipsRef.current.rotation.z, 0, lerpSpeed);
        hipsRef.current.position.x = 0;
      }

      // Torso bending forward in deep elegant curtsy
      if (torsoRef.current) {
        torsoRef.current.rotation.x = THREE.MathUtils.lerp(
          torsoRef.current.rotation.x,
          0.6 + Math.max(0, bowPhase) * 0.4,
          lerpSpeed
        );
        torsoRef.current.rotation.z = 0;
      }

      if (headRef.current) {
        headRef.current.rotation.x = THREE.MathUtils.lerp(
          headRef.current.rotation.x,
          0.3 + Math.max(0, bowPhase) * 0.3,
          lerpSpeed
        );
        headRef.current.rotation.y = 0;
      }

      // Graceful fan flare spreading wide
      if (leftUpperArmRef.current && leftForearmRef.current && leftFanRef.current) {
        leftUpperArmRef.current.rotation.z = THREE.MathUtils.lerp(
          leftUpperArmRef.current.rotation.z,
          1.4 + Math.sin(t * 2) * 0.2,
          lerpSpeed
        );
        leftUpperArmRef.current.rotation.x = 0.2;
        leftForearmRef.current.rotation.x = 0.4;
        leftFanRef.current.rotation.y = Math.PI * 0.25;
      }

      if (rightUpperArmRef.current && rightForearmRef.current && rightFanRef.current) {
        rightUpperArmRef.current.rotation.z = THREE.MathUtils.lerp(
          rightUpperArmRef.current.rotation.z,
          -1.4 - Math.sin(t * 2) * 0.2,
          lerpSpeed
        );
        rightUpperArmRef.current.rotation.x = 0.2;
        rightForearmRef.current.rotation.x = 0.4;
        rightFanRef.current.rotation.y = -Math.PI * 0.25;
      }

      // Crossed curtsy legs
      if (leftThighRef.current && leftCalfRef.current) {
        leftThighRef.current.rotation.x = THREE.MathUtils.lerp(leftThighRef.current.rotation.x, 0.4, lerpSpeed);
        leftThighRef.current.rotation.z = THREE.MathUtils.lerp(leftThighRef.current.rotation.z, 0.2, lerpSpeed);
        leftCalfRef.current.rotation.x = THREE.MathUtils.lerp(leftCalfRef.current.rotation.x, -0.6, lerpSpeed);
      }

      if (rightThighRef.current && rightCalfRef.current) {
        rightThighRef.current.rotation.x = THREE.MathUtils.lerp(rightThighRef.current.rotation.x, -0.5, lerpSpeed);
        rightThighRef.current.rotation.z = THREE.MathUtils.lerp(rightThighRef.current.rotation.z, -0.15, lerpSpeed);
        rightCalfRef.current.rotation.x = THREE.MathUtils.lerp(rightCalfRef.current.rotation.x, 1.0, lerpSpeed);
      }

    } else {
      // Sensual, rhythmic Cabaret Idle: weight shift, fan flutter, breathing
      const idleSpeed = t * 1.8;

      if (rootRef.current) {
        rootRef.current.position.y = THREE.MathUtils.lerp(
          rootRef.current.position.y,
          -1.4 + Math.sin(idleSpeed * 2) * 0.05,
          lerpSpeed
        );
        rootRef.current.rotation.y = THREE.MathUtils.lerp(
          rootRef.current.rotation.y,
          Math.sin(idleSpeed) * 0.15,
          lerpSpeed
        );
      }

      // Hip sway
      if (hipsRef.current) {
        hipsRef.current.rotation.z = THREE.MathUtils.lerp(
          hipsRef.current.rotation.z,
          Math.sin(idleSpeed) * 0.12,
          lerpSpeed
        );
        hipsRef.current.position.x = Math.sin(idleSpeed) * 0.08;
      }

      // Torso counter-sway & breathing
      if (torsoRef.current) {
        torsoRef.current.rotation.z = THREE.MathUtils.lerp(
          torsoRef.current.rotation.z,
          -Math.sin(idleSpeed) * 0.08,
          lerpSpeed
        );
        torsoRef.current.rotation.x = 0.03 + Math.sin(idleSpeed * 2) * 0.03;
      }

      // Head slight tilt
      if (headRef.current) {
        headRef.current.rotation.y = Math.sin(idleSpeed * 0.8) * 0.15;
        headRef.current.rotation.z = -Math.sin(idleSpeed) * 0.05;
        headRef.current.rotation.x = -0.05 + Math.sin(idleSpeed * 1.5) * 0.04;
      }

      // Plume gentle wave
      if (plumeRef.current) {
        plumeRef.current.rotation.z = Math.sin(idleSpeed * 1.5) * 0.15;
        plumeRef.current.rotation.x = Math.cos(idleSpeed * 1.5) * 0.1;
      }

      // Fans gentle fluttering
      if (leftUpperArmRef.current && leftForearmRef.current && leftFanRef.current) {
        leftUpperArmRef.current.rotation.z = THREE.MathUtils.lerp(
          leftUpperArmRef.current.rotation.z,
          0.8 + Math.sin(idleSpeed) * 0.08,
          lerpSpeed
        );
        leftUpperArmRef.current.rotation.x = THREE.MathUtils.lerp(leftUpperArmRef.current.rotation.x, 0.3, lerpSpeed);
        leftForearmRef.current.rotation.x = 0.8 + Math.sin(idleSpeed * 2) * 0.1;
        leftFanRef.current.rotation.y = Math.sin(t * 3) * 0.3 + 0.5;
      }

      if (rightUpperArmRef.current && rightForearmRef.current && rightFanRef.current) {
        rightUpperArmRef.current.rotation.z = THREE.MathUtils.lerp(
          rightUpperArmRef.current.rotation.z,
          -0.8 - Math.sin(idleSpeed) * 0.08,
          lerpSpeed
        );
        rightUpperArmRef.current.rotation.x = THREE.MathUtils.lerp(rightUpperArmRef.current.rotation.x, 0.3, lerpSpeed);
        rightForearmRef.current.rotation.x = 0.8 + Math.cos(idleSpeed * 2) * 0.1;
        rightFanRef.current.rotation.y = -Math.sin(t * 3) * 0.3 - 0.5;
      }

      // Gentle stance with slight knee flex
      if (leftThighRef.current && leftCalfRef.current) {
        leftThighRef.current.rotation.x = THREE.MathUtils.lerp(
          leftThighRef.current.rotation.x,
          0.05 + Math.sin(idleSpeed) * 0.05,
          lerpSpeed
        );
        leftThighRef.current.rotation.z = 0.08;
        leftCalfRef.current.rotation.x = 0.05;
      }

      if (rightThighRef.current && rightCalfRef.current) {
        rightThighRef.current.rotation.x = THREE.MathUtils.lerp(
          rightThighRef.current.rotation.x,
          0.05 - Math.sin(idleSpeed) * 0.05,
          lerpSpeed
        );
        rightThighRef.current.rotation.z = -0.08;
        rightCalfRef.current.rotation.x = 0.05;
      }
    }
  });

  return (
    <group ref={rootRef} position={[0, -1.4, 0]} scale={1.25}>
      {/* Ambient Stage Sparkle Dust */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particlePositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.06}
          color="#f3e5ab"
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Main Skeleton / Joint Hierarchy */}
      <group ref={hipsRef} position={[0, 1.4, 0]}>
        {/* Pelvis & Gilded Corset Lower */}
        <mesh material={materials.velvet} position={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.32, 0.28, 0.35, 16]} />
        </mesh>
        
        {/* Gold Filigree Belt & Gem */}
        <mesh material={materials.gold} position={[0, 0.05, 0]}>
          <torusGeometry args={[0.33, 0.03, 8, 24]} />
        </mesh>
        <mesh material={materials.ruby} position={[0, 0.05, 0.33]}>
          <sphereGeometry args={[0.05, 12, 12]} />
        </mesh>

        {/* Tiered Cancan Ruffled Skirt */}
        <group ref={skirtRef} position={[0, -0.05, 0]}>
          {/* Top Ruffle Tier - Velvet & Gold Rim */}
          <mesh material={materials.velvet} position={[0, -0.1, 0]} castShadow>
            <cylinderGeometry args={[0.34, 0.55, 0.22, 20, 1, true]} />
          </mesh>
          <mesh material={materials.goldTrim} position={[0, -0.21, 0]}>
            <torusGeometry args={[0.55, 0.02, 8, 24]} />
          </mesh>

          {/* Middle Ruffle Tier - Crimson Satin */}
          <mesh material={materials.crimson} position={[0, -0.22, 0]} castShadow>
            <cylinderGeometry args={[0.48, 0.75, 0.25, 20, 1, true]} />
          </mesh>
          <mesh material={materials.goldTrim} position={[0, -0.34, 0]}>
            <torusGeometry args={[0.75, 0.02, 8, 24]} />
          </mesh>

          {/* Bottom Ruffle Tier - Voluminous Cancan Tutu / Bustle */}
          <mesh material={materials.velvet} position={[0, -0.34, -0.05]} castShadow>
            <cylinderGeometry args={[0.65, 0.95, 0.3, 20, 1, true]} />
          </mesh>
          <mesh material={materials.goldTrim} position={[0, -0.49, -0.05]}>
            <torusGeometry args={[0.95, 0.025, 8, 24]} />
          </mesh>
        </group>

        {/* Torso & Boned Corset */}
        <group ref={torsoRef} position={[0, 0.25, 0]}>
          <mesh material={materials.velvet} position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.34, 0.26, 0.45, 16]} />
          </mesh>
          {/* Gold Boning Seams on Corset */}
          <mesh material={materials.goldTrim} position={[0.15, 0.2, 0.18]} rotation={[0, 0, 0.1]}>
            <cylinderGeometry args={[0.015, 0.015, 0.42, 6]} />
          </mesh>
          <mesh material={materials.goldTrim} position={[-0.15, 0.2, 0.18]} rotation={[0, 0, -0.1]}>
            <cylinderGeometry args={[0.015, 0.015, 0.42, 6]} />
          </mesh>
          <mesh material={materials.goldTrim} position={[0, 0.2, 0.23]}>
            <cylinderGeometry args={[0.018, 0.018, 0.44, 6]} />
          </mesh>

          {/* Décolletage & Shoulders */}
          <mesh material={materials.skin} position={[0, 0.48, 0]} castShadow>
            <cylinderGeometry args={[0.38, 0.34, 0.18, 16]} />
          </mesh>

          {/* Diamond Choker Necklace */}
          <mesh material={materials.goldTrim} position={[0, 0.62, 0]}>
            <torusGeometry args={[0.17, 0.025, 8, 20]} />
          </mesh>
          <mesh material={materials.ruby} position={[0, 0.6, 0.18]}>
            <octahedronGeometry args={[0.04]} />
          </mesh>

          {/* Head, Face & Burlesque Feather Plume Headpiece */}
          <group ref={headRef} position={[0, 0.78, 0]}>
            {/* Neck */}
            <mesh material={materials.skin} position={[0, -0.06, 0]}>
              <cylinderGeometry args={[0.13, 0.15, 0.15, 12]} />
            </mesh>
            {/* Head */}
            <mesh material={materials.skin} position={[0, 0.12, 0]} castShadow>
              <sphereGeometry args={[0.22, 16, 16]} />
            </mesh>
            {/* Sleek Obsidian Chignon Hair */}
            <mesh material={materials.velvet} position={[0, 0.18, -0.08]} castShadow>
              <sphereGeometry args={[0.24, 16, 16]} />
            </mesh>
            <mesh material={materials.velvet} position={[0, 0.26, -0.2]}>
              <sphereGeometry args={[0.14, 12, 12]} />
            </mesh>

            {/* Cabaret Mask / Headband */}
            <mesh material={materials.gold} position={[0, 0.2, 0.06]} rotation={[0.2, 0, 0]}>
              <torusGeometry args={[0.23, 0.02, 6, 20]} />
            </mesh>

            {/* Magnificent Ostrich Feathers Headpiece */}
            <group ref={plumeRef} position={[0, 0.32, -0.05]}>
              {/* Center Towering Feather Plume */}
              <mesh material={materials.plume} position={[0, 0.45, 0]} rotation={[0.1, 0, 0]} castShadow>
                <coneGeometry args={[0.18, 0.9, 8]} />
              </mesh>
              {/* Left Feather Plume */}
              <mesh material={materials.plume} position={[-0.2, 0.35, 0]} rotation={[0.15, 0, -0.4]} castShadow>
                <coneGeometry args={[0.14, 0.75, 8]} />
              </mesh>
              {/* Right Feather Plume */}
              <mesh material={materials.plume} position={[0.2, 0.35, 0]} rotation={[0.15, 0, 0.4]} castShadow>
                <coneGeometry args={[0.14, 0.75, 8]} />
              </mesh>
              {/* Gold Plume Brooch */}
              <mesh material={materials.ruby} position={[0, 0.02, 0.1]}>
                <sphereGeometry args={[0.07, 12, 12]} />
              </mesh>
            </group>
          </group>

          {/* Left Arm & Burlesque Feather Fan */}
          <group ref={leftUpperArmRef} position={[0.42, 0.48, 0]}>
            {/* Shoulder */}
            <mesh material={materials.skin} position={[0, 0, 0]}>
              <sphereGeometry args={[0.11, 10, 10]} />
            </mesh>
            {/* Upper Arm & Black Silk Opera Glove */}
            <mesh material={materials.stockings} position={[0, -0.22, 0]} castShadow>
              <cylinderGeometry args={[0.08, 0.07, 0.38, 10]} />
            </mesh>
            {/* Gold Glove Cuff */}
            <mesh material={materials.goldTrim} position={[0, -0.08, 0]}>
              <torusGeometry args={[0.085, 0.015, 6, 16]} />
            </mesh>

            {/* Forearm & Hand */}
            <group ref={leftForearmRef} position={[0, -0.42, 0]}>
              <mesh material={materials.stockings} position={[0, -0.2, 0]} castShadow>
                <cylinderGeometry args={[0.07, 0.055, 0.36, 10]} />
              </mesh>
              <mesh material={materials.skin} position={[0, -0.4, 0]}>
                <sphereGeometry args={[0.06, 8, 8]} />
              </mesh>

              {/* Opulent Gold & Black Feather Fan */}
              <group ref={leftFanRef} position={[0, -0.44, 0.05]}>
                {/* Fan Ribs / Staves */}
                <mesh material={materials.gold}>
                  <cylinderGeometry args={[0.02, 0.02, 0.25, 6]} />
                </mesh>
                {/* Fan Plumes Fan-Spread */}
                <mesh material={materials.plume} position={[0, 0.3, 0]} rotation={[0, 0, 0.3]} castShadow>
                  <circleGeometry args={[0.45, 12, 0, Math.PI * 0.7]} />
                </mesh>
                <mesh material={materials.crimson} position={[0, 0.28, -0.01]} rotation={[0, 0, 0.3]}>
                  <circleGeometry args={[0.35, 12, 0, Math.PI * 0.7]} />
                </mesh>
              </group>
            </group>
          </group>

          {/* Right Arm & Burlesque Feather Fan */}
          <group ref={rightUpperArmRef} position={[-0.42, 0.48, 0]}>
            {/* Shoulder */}
            <mesh material={materials.skin} position={[0, 0, 0]}>
              <sphereGeometry args={[0.11, 10, 10]} />
            </mesh>
            {/* Upper Arm & Black Silk Opera Glove */}
            <mesh material={materials.stockings} position={[0, -0.22, 0]} castShadow>
              <cylinderGeometry args={[0.08, 0.07, 0.38, 10]} />
            </mesh>
            {/* Gold Glove Cuff */}
            <mesh material={materials.goldTrim} position={[0, -0.08, 0]}>
              <torusGeometry args={[0.085, 0.015, 6, 16]} />
            </mesh>

            {/* Forearm & Hand */}
            <group ref={rightForearmRef} position={[0, -0.42, 0]}>
              <mesh material={materials.stockings} position={[0, -0.2, 0]} castShadow>
                <cylinderGeometry args={[0.07, 0.055, 0.36, 10]} />
              </mesh>
              <mesh material={materials.skin} position={[0, -0.4, 0]}>
                <sphereGeometry args={[0.06, 8, 8]} />
              </mesh>

              {/* Opulent Gold & Black Feather Fan */}
              <group ref={rightFanRef} position={[0, -0.44, 0.05]}>
                {/* Fan Ribs / Staves */}
                <mesh material={materials.gold}>
                  <cylinderGeometry args={[0.02, 0.02, 0.25, 6]} />
                </mesh>
                {/* Fan Plumes Fan-Spread */}
                <mesh material={materials.plume} position={[0, 0.3, 0]} rotation={[0, 0, -0.3]} castShadow>
                  <circleGeometry args={[0.45, 12, Math.PI * 0.3, Math.PI * 0.7]} />
                </mesh>
                <mesh material={materials.crimson} position={[0, 0.28, -0.01]} rotation={[0, 0, -0.3]}>
                  <circleGeometry args={[0.35, 12, Math.PI * 0.3, Math.PI * 0.7]} />
                </mesh>
              </group>
            </group>
          </group>
        </group>

        {/* Left Leg (Cancan articulated joints) */}
        <group ref={leftThighRef} position={[0.2, -0.1, 0]}>
          {/* Garter Band */}
          <mesh material={materials.goldTrim} position={[0, -0.05, 0]}>
            <torusGeometry args={[0.13, 0.02, 6, 16]} />
          </mesh>
          <mesh material={materials.ruby} position={[0, -0.05, 0.13]}>
            <sphereGeometry args={[0.03, 8, 8]} />
          </mesh>
          {/* Thigh / Black Silk Stocking */}
          <mesh material={materials.stockings} position={[0, -0.35, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.09, 0.65, 12]} />
          </mesh>

          {/* Knee Joint & Calf */}
          <group ref={leftCalfRef} position={[0, -0.68, 0]}>
            <mesh material={materials.stockings} position={[0, 0, 0]}>
              <sphereGeometry args={[0.09, 10, 10]} />
            </mesh>
            <mesh material={materials.stockings} position={[0, -0.35, -0.02]} castShadow>
              <cylinderGeometry args={[0.085, 0.06, 0.68, 12]} />
            </mesh>

            {/* High-Heeled Stiletto Pump */}
            <group ref={leftFootRef} position={[0, -0.72, 0.05]}>
              {/* Shoe Base */}
              <mesh material={materials.gold} position={[0, -0.03, 0.05]} rotation={[0.4, 0, 0]}>
                <boxGeometry args={[0.11, 0.07, 0.22]} />
              </mesh>
              {/* High Stiletto Heel */}
              <mesh material={materials.goldTrim} position={[0, -0.08, -0.04]}>
                <cylinderGeometry args={[0.015, 0.01, 0.22, 8]} />
              </mesh>
            </group>
          </group>
        </group>

        {/* Right Leg (Cancan articulated joints) */}
        <group ref={rightThighRef} position={[-0.2, -0.1, 0]}>
          {/* Garter Band */}
          <mesh material={materials.goldTrim} position={[0, -0.05, 0]}>
            <torusGeometry args={[0.13, 0.02, 6, 16]} />
          </mesh>
          <mesh material={materials.ruby} position={[0, -0.05, 0.13]}>
            <sphereGeometry args={[0.03, 8, 8]} />
          </mesh>
          {/* Thigh / Black Silk Stocking */}
          <mesh material={materials.stockings} position={[0, -0.35, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.09, 0.65, 12]} />
          </mesh>

          {/* Knee Joint & Calf */}
          <group ref={rightCalfRef} position={[0, -0.68, 0]}>
            <mesh material={materials.stockings} position={[0, 0, 0]}>
              <sphereGeometry args={[0.09, 10, 10]} />
            </mesh>
            <mesh material={materials.stockings} position={[0, -0.35, -0.02]} castShadow>
              <cylinderGeometry args={[0.085, 0.06, 0.68, 12]} />
            </mesh>

            {/* High-Heeled Stiletto Pump */}
            <group ref={rightFootRef} position={[0, -0.72, 0.05]}>
              {/* Shoe Base */}
              <mesh material={materials.gold} position={[0, -0.03, 0.05]} rotation={[0.4, 0, 0]}>
                <boxGeometry args={[0.11, 0.07, 0.22]} />
              </mesh>
              {/* High Stiletto Heel */}
              <mesh material={materials.goldTrim} position={[0, -0.08, -0.04]}>
                <cylinderGeometry args={[0.015, 0.01, 0.22, 8]} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};
