'use client';

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

function Airplane() {
    const meshRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (meshRef.current) {
            // Smooth rotation
            meshRef.current.rotation.y += 0.01;
        }
    });

    return (
        <group ref={meshRef}>
            {/* Fuselage */}
            <mesh castShadow>
                <cylinderGeometry args={[0.5, 0.4, 4, 32]} />
                <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.2} />
            </mesh>

            {/* Nose Cone */}
            <mesh position={[0, 2.3, 0]} castShadow>
                <sphereGeometry args={[0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color="#ffffff" metalness={0.9} roughness={0.1} />
            </mesh>

            {/* Main Wings */}
            <mesh position={[0, 0, 0]} castShadow>
                <boxGeometry args={[5, 0.1, 1.2]} />
                <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.2} />
            </mesh>

            {/* Tail Horizontal Stabilizers */}
            <mesh position={[0, -1.6, 0]} castShadow>
                <boxGeometry args={[2, 0.05, 0.6]} />
                <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.2} />
            </mesh>

            {/* Vertical Tail Fin */}
            <mesh position={[0, -1.6, 0.3]} rotation={[0, 0, 0]} castShadow>
                <boxGeometry args={[0.05, 0.8, 0.8]} />
                <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.2} />
            </mesh>

            {/* Engines */}
            <mesh position={[-1.2, 0, -0.2]} castShadow>
                <cylinderGeometry args={[0.25, 0.25, 0.8, 16]} />
                <meshStandardMaterial color="#333333" metalness={1} roughness={0} />
            </mesh>
            <mesh position={[1.2, 0, -0.2]} castShadow>
                <cylinderGeometry args={[0.25, 0.25, 0.8, 16]} />
                <meshStandardMaterial color="#333333" metalness={1} roughness={0} />
            </mesh>
        </group>
    );
}

export default function AeroScene3D() {
    return (
        <div className="w-full h-full min-h-[200px] relative">
            <Canvas shadows gl={{ antialias: true }}>
                <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={35} />
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} castShadow />
                <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
                
                <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                    <group rotation={[Math.PI / 2.5, 0, 0]}>
                        <Airplane />
                    </group>
                </Float>

                <ContactShadows 
                    position={[0, -3, 0]} 
                    opacity={0.4} 
                    scale={10} 
                    blur={2.5} 
                    far={4} 
                />
                
                <Environment preset="city" />
            </Canvas>
            
            {/* UI Overlay for added premium feel */}
            <div className="absolute inset-x-0 bottom-4 flex flex-col items-center pointer-events-none">
                <div className="h-px w-24 bg-gradient-to-r from-transparent via-white/20 to-transparent mb-2" />
                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] animate-pulse">Aero.Engine V3 Active</p>
            </div>
        </div>
    );
}
