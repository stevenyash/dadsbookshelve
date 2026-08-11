import { useRef, useState, useEffect, useMemo } from 'react'
import * as THREE from 'three'

export interface Page3DProps {
  index: number
  totalPages: number
  isActive: boolean
  isFlipped: boolean
  flipDirection: 'left' | 'right' | null
  width: number
  height: number
  textColor?: string
  content?: string
}

export function Page3D({ 
  index, 
  totalPages, 
  isActive, 
  isFlipped, 
  flipDirection,
  width, 
  height,
  textColor = '#333'
}: Page3DProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [rotation, setRotation] = useState(0)
  const [curved, setCurved] = useState(0)
  
  useEffect(() => {
    if (isFlipped && flipDirection) {
      const duration = 600
      const startTime = Date.now()
      
      let curled = 0
      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        
        curled = Math.sin(progress * Math.PI) * 0.15
        setCurved(curled)
        
        const eased = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2
        
        const targetRotation = flipDirection === 'right' ? -Math.PI : Math.PI
        const newRotation = eased * targetRotation
        setRotation(newRotation)
        
        if (meshRef.current) {
          meshRef.current.rotation.y = newRotation
        }
        
        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }
      animate()
    } else {
      setRotation(0)
      setCurved(0)
    }
  }, [isFlipped, flipDirection])
  
  const isLeftSide = index < Math.floor(totalPages / 2)
  const xPos = isLeftSide 
    ? -width / 2 + index * 0.01 
    : width / 2 - (totalPages - 1 - index) * 0.01
  
  const pageGeometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(width, height, 8, 8)
    const positions = geo.attributes.position
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const normalizedX = (x + width / 2) / width
      
      const bendAmount = curved * Math.sin(normalizedX * Math.PI)
      positions.setZ(i, bendAmount * (isLeftSide ? normalizedX : (1 - normalizedX)))
    }
    
    geo.computeVertexNormals()
    return geo
  }, [width, height, curved, isLeftSide])
  
  return (
    <mesh
      ref={meshRef}
      position={[xPos, 0, index * 0.005]}
      geometry={pageGeometry}
      rotation={[0, rotation, 0]}
    >
      <meshStandardMaterial
        color="#faf8f5"
        side={THREE.DoubleSide}
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  )
}