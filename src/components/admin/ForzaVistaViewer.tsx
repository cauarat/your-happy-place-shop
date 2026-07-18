import { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Html, CameraControls, ContactShadows, Float } from '@react-three/drei';
import * as THREE from 'three';

type Part = 'shirt' | 'shorts' | 'shoes' | null;

function SceneController({ selectedPart }: { selectedPart: Part }) {
  const controlsRef = useRef<CameraControls>(null);

  useEffect(() => {
    if (controlsRef.current) {
      if (selectedPart === 'shirt') {
        controlsRef.current.setLookAt(0, 0.4, 1.2, 0, 0.1, 0, true);
      } else if (selectedPart === 'shorts') {
        controlsRef.current.setLookAt(0, -0.4, 1.0, 0, -0.6, 0, true);
      } else if (selectedPart === 'shoes') {
        controlsRef.current.setLookAt(0, -1.1, 0.8, 0, -1.6, 0, true);
      } else {
        // full body
        controlsRef.current.setLookAt(0, 0.2, 3.5, 0, -0.2, 0, true);
      }
    }
  }, [selectedPart]);

  return <CameraControls ref={controlsRef} makeDefault minDistance={0.5} maxDistance={5} />;
}

function DummyModel({ selectedPart, onSelectPart }: { selectedPart: Part, onSelectPart: (part: Part) => void }) {
  const group = useRef<THREE.Group>(null);
  
  // Idle breathing and slight swaying animation
  useFrame((state) => {
    if (group.current) {
      group.current.position.y = Math.sin(state.clock.elapsedTime * 1.5) * 0.01 - 0.2;
      group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }
  });

  // Material Props
  const skinProps = {
    color: "#5c3a21",
    roughness: 0.4,
    metalness: 0.1,
    clearcoat: 0.1,
  };

  const clothProps = {
    color: "#ffffff",
    roughness: 0.2,
    metalness: 0.1,
    transmission: 0.8,
    thickness: 0.5,
    ior: 1.2,
    transparent: true,
    opacity: 1,
  };

  const highlightedClothProps = {
    color: "#ffffff",
    roughness: 0.1,
    metalness: 0.2,
    transmission: 0.95,
    thickness: 0.5,
    ior: 1.5,
    transparent: true,
    opacity: 1,
    emissive: "#ffffff",
    emissiveIntensity: 0.2,
  };

  const shoeProps = {
    color: "#a9a9a9",
    roughness: 0.7,
  };

  const highlightedShoeProps = {
    color: "#d3d3d3",
    roughness: 0.5,
    emissive: "#ffffff",
    emissiveIntensity: 0.2,
  };

  return (
    <group ref={group} position={[0, -0.2, 0]}>
      {/* Head & Neck */}
      <mesh position={[0, 1.65, 0]} castShadow>
        <capsuleGeometry args={[0.11, 0.14, 32, 32]} />
        <meshPhysicalMaterial {...skinProps} />
      </mesh>
      
      {/* Neck */}
      <mesh position={[0, 1.48, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.05, 0.15, 32]} />
        <meshPhysicalMaterial {...skinProps} />
      </mesh>
      
      {/* Under-body Torso (visible through shirt) */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <capsuleGeometry args={[0.22, 0.5, 32, 32]} />
        <meshPhysicalMaterial {...skinProps} />
      </mesh>

      {/* Shirt */}
      <mesh 
        position={[0, 1.05, 0]} 
        onClick={(e) => { e.stopPropagation(); onSelectPart('shirt'); }}
        onPointerOver={() => document.body.style.cursor = 'pointer'}
        onPointerOut={() => document.body.style.cursor = 'auto'}
        castShadow
      >
        <capsuleGeometry args={[0.25, 0.55, 32, 32]} />
        <meshPhysicalMaterial {...(selectedPart === 'shirt' ? highlightedClothProps : clothProps)} />
        
        {selectedPart === 'shirt' && (
          <Html position={[0.35, 0.1, 0]} center zIndexRange={[100, 0]}>
            <div className="bg-white/90 backdrop-blur-md text-black p-4 rounded-xl shadow-2xl text-xs w-56 border border-black/10 animate-in fade-in zoom-in duration-300 pointer-events-none">
              <p className="font-bold border-b border-black/10 pb-2 mb-2 text-sm">Oversized White Tee</p>
              <div className="space-y-1">
                <p className="text-black/80"><span className="font-semibold">Fabric:</span> Heavyweight Cotton</p>
                <p className="text-black/80"><span className="font-semibold">Fit:</span> Dropped shoulder, relaxed</p>
                <p className="text-black/80"><span className="font-semibold">View:</span> X-Ray Translucent Mode</p>
              </div>
            </div>
          </Html>
        )}
      </mesh>

      {/* Arms (Skin) */}
      <mesh position={[-0.32, 0.95, 0]} rotation={[0, 0, 0.15]} castShadow>
        <capsuleGeometry args={[0.06, 0.65, 32, 32]} />
        <meshPhysicalMaterial {...skinProps} />
      </mesh>
      <mesh position={[0.32, 0.95, 0]} rotation={[0, 0, -0.15]} castShadow>
        <capsuleGeometry args={[0.06, 0.65, 32, 32]} />
        <meshPhysicalMaterial {...skinProps} />
      </mesh>

      {/* Under-body Pelvis (visible through shorts) */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.35, 32]} />
        <meshPhysicalMaterial {...skinProps} />
      </mesh>

      {/* Shorts */}
      <mesh 
        position={[0, 0.35, 0]} 
        onClick={(e) => { e.stopPropagation(); onSelectPart('shorts'); }}
        onPointerOver={() => document.body.style.cursor = 'pointer'}
        onPointerOut={() => document.body.style.cursor = 'auto'}
        castShadow
      >
        <cylinderGeometry args={[0.26, 0.25, 0.45, 32]} />
        <meshPhysicalMaterial {...(selectedPart === 'shorts' ? highlightedClothProps : clothProps)} />
        
        {selectedPart === 'shorts' && (
          <Html position={[0.35, 0, 0]} center zIndexRange={[100, 0]}>
             <div className="bg-white/90 backdrop-blur-md text-black p-4 rounded-xl shadow-2xl text-xs w-56 border border-black/10 animate-in fade-in zoom-in duration-300 pointer-events-none">
              <p className="font-bold border-b border-black/10 pb-2 mb-2 text-sm">Relaxed White Shorts</p>
              <div className="space-y-1">
                <p className="text-black/80"><span className="font-semibold">Fabric:</span> French Terry Cotton</p>
                <p className="text-black/80"><span className="font-semibold">Fit:</span> Above knee, relaxed</p>
                <p className="text-black/80"><span className="font-semibold">View:</span> X-Ray Translucent Mode</p>
              </div>
            </div>
          </Html>
        )}
      </mesh>

      {/* Legs (Skin) */}
      <mesh position={[-0.14, -0.35, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.06, 0.85, 32]} />
        <meshPhysicalMaterial {...skinProps} />
      </mesh>
      <mesh position={[0.14, -0.35, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.06, 0.85, 32]} />
        <meshPhysicalMaterial {...skinProps} />
      </mesh>

      {/* Shoes */}
      <mesh 
        position={[-0.14, -0.85, 0.06]} 
        onClick={(e) => { e.stopPropagation(); onSelectPart('shoes'); }}
        onPointerOver={() => document.body.style.cursor = 'pointer'}
        onPointerOut={() => document.body.style.cursor = 'auto'}
        castShadow
      >
        <boxGeometry args={[0.12, 0.15, 0.32]} />
        <meshStandardMaterial {...(selectedPart === 'shoes' ? highlightedShoeProps : shoeProps)} />
      </mesh>
      <mesh 
        position={[0.14, -0.85, 0.06]} 
        onClick={(e) => { e.stopPropagation(); onSelectPart('shoes'); }}
        onPointerOver={() => document.body.style.cursor = 'pointer'}
        onPointerOut={() => document.body.style.cursor = 'auto'}
        castShadow
      >
        <boxGeometry args={[0.12, 0.15, 0.32]} />
        <meshStandardMaterial {...(selectedPart === 'shoes' ? highlightedShoeProps : shoeProps)} />
        {selectedPart === 'shoes' && (
          <Html position={[0.25, 0.1, 0]} center zIndexRange={[100, 0]}>
            <div className="bg-white/90 backdrop-blur-md text-black p-4 rounded-xl shadow-2xl text-xs w-56 border border-black/10 animate-in fade-in zoom-in duration-300 pointer-events-none">
              <p className="font-bold border-b border-black/10 pb-2 mb-2 text-sm">Chunky Tech Sneakers</p>
              <div className="space-y-1">
                <p className="text-black/80"><span className="font-semibold">Style:</span> Tech-runner silhouette</p>
                <p className="text-black/80"><span className="font-semibold">Color:</span> Distressed Grey/White</p>
              </div>
            </div>
          </Html>
        )}
      </mesh>
    </group>
  );
}

export default function ForzaVistaViewer() {
  const [selectedPart, setSelectedPart] = useState<Part>(null);

  return (
    <div className="w-full h-[600px] bg-neutral-900 rounded-3xl overflow-hidden relative shadow-2xl border border-white/10">
      
      {/* UI Overlay */}
      <div className="absolute top-6 left-6 z-10">
        <h3 className="text-white font-semibold text-lg tracking-wide">ForzaVista Mode</h3>
        <p className="text-white/60 text-sm">Click garments to inspect details</p>
      </div>

      <div className="absolute top-6 right-6 z-10 flex gap-2">
        {(['shirt', 'shorts', 'shoes'] as Part[]).map((part) => (
          <button
            key={part!}
            onClick={() => setSelectedPart(part)}
            className={`px-4 py-2 rounded-full text-xs font-medium uppercase tracking-wider transition-colors ${
              selectedPart === part ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {part}
          </button>
        ))}
        {selectedPart && (
           <button
             onClick={() => setSelectedPart(null)}
             className="px-4 py-2 rounded-full text-xs font-medium uppercase tracking-wider bg-red-500/80 text-white hover:bg-red-500 transition-colors ml-2"
           >
             Reset View
           </button>
        )}
      </div>

      {/* 3D Scene */}
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
        <color attach="background" args={['#1a1a1a']} />
        
        {/* Soft Studio Lighting */}
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
        <spotLight position={[-10, -10, -10]} angle={0.15} penumbra={1} intensity={0.5} />
        <Environment preset="studio" />
        
        <SceneController selectedPart={selectedPart} />
        
        <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.2}>
          <DummyModel selectedPart={selectedPart} onSelectPart={setSelectedPart} />
        </Float>

        <ContactShadows position={[0, -1.0, 0]} opacity={0.4} scale={5} blur={2.4} far={2} />
      </Canvas>
    </div>
  );
}
