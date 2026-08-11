import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export interface BookCover3DProps {
  width: number
  height: number
  color: string
}

export function BookCover3D({ width, height, color }: BookCover3DProps) {
  const coverRef = useRef<THREE.Group>(null)
  
  useFrame((state) => {
    if (coverRef.current) {
      coverRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.01
    }
  })
  
  const spineWidth = 0.08
  const coverThickness = 0.04
  
  return (
    <group ref={coverRef}>
      <mesh position={[width / 2 + coverThickness / 2, 0, 0]}>
        <boxGeometry args={[coverThickness, height, width * 0.7]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      
      <mesh position={[-width / 2 - coverThickness / 2, 0, 0]}>
        <boxGeometry args={[coverThickness, height, width * 0.7]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      
      <mesh position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[width * 0.7, height, spineWidth]} />
        <meshStandardMaterial color="#3d2314" roughness={0.8} />
      </mesh>
      
      <mesh position={[0, height / 4, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[width * 0.5, 0.02, spineWidth + 0.01]} />
        <meshStandardMaterial color="#c9a227" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  )
}