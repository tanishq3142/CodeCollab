import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Dodecahedron, Torus, MeshDistortMaterial } from '@react-three/drei'

function MovingShape({ position, color, shape }) {
    const meshRef = useRef()

    useFrame((state) => {
        const t = state.clock.getElapsedTime()
        if (meshRef.current) {
            meshRef.current.rotation.x = t * 0.2
            meshRef.current.rotation.y = t * 0.3
        }
    })

    return (
        <Float speed={1.5} rotationIntensity={1} floatIntensity={2}>
            <mesh ref={meshRef} position={position}>
                {shape === 'dodecahedron' ? (
                    <dodecahedronGeometry args={[1, 0]} />
                ) : (
                    <torusGeometry args={[0.8, 0.2, 16, 100]} />
                )}
                <MeshDistortMaterial color={color} speed={2} distort={0.3} roughness={0.4} metalness={0.8} />
            </mesh>
        </Float>
    )
}

export default function FloatingShapes() {
    return (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
            <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 5]} intensity={1} />
                <MovingShape position={[-2, 1, -2]} color="#8a2be2" shape="dodecahedron" />
                <MovingShape position={[2, -1, -3]} color="#4169e1" shape="torus" />
                <MovingShape position={[0, -2, -5]} color="#00ced1" shape="dodecahedron" />
            </Canvas>
        </div>
    )
}
