import { useRef, useState, useEffect, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

interface Page {
  content: string
  pageNumber: number
}

interface FlippingBook3DProps {
  pages: Page[]
  currentPage: number
  onPageChange: (page: number) => void
  width?: number
  height?: number
  coverColor?: string
  spineColor?: string
}

// Page mesh component with realistic bending
function PageMesh({ 
  page, 
  index, 
  totalPages, 
  isTurning, 
  turnDirection,
  width, 
  height,
  onAnimationComplete 
}: { 
  page: Page
  index: number
  totalPages: number
  isTurning: boolean
  turnDirection: 'left' | 'right' | null
  width: number
  height: number
  onAnimationComplete: () => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [angle, setAngle] = useState(0)
  const [opacity, setOpacity] = useState(1)
  
  useEffect(() => {
    if (isTurning && turnDirection) {
      const targetAngle = turnDirection === 'right' ? -Math.PI : Math.PI
      const duration = 600
      const startTime = Date.now()
      
      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        
        // Ease-in-out curve for natural paper motion
        const eased = progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 2) / 2
        
        const currentAngle = targetAngle * eased
        setAngle(currentAngle)
        setOpacity(1 - progress * 0.3)
        
        if (meshRef.current) {
          meshRef.current.rotation.y = currentAngle
          
          // Add slight curl effect during flip
          const curlAmount = Math.sin(progress * Math.PI) * 0.15
          meshRef.current.scale.z = 1 + curlAmount
        }
        
        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          onAnimationComplete()
        }
      }
      animate()
    }
  }, [isTurning, turnDirection])
  
  const isLeftPage = index < totalPages / 2
  const xOffset = isLeftPage ? -width / 2 + index * 0.01 : width / 2 - (totalPages - index) * 0.01
  
  return (
    <mesh
      ref={meshRef}
      position={[xOffset, 0, index * 0.002]}
      rotation={[0, angle, 0]}
    >
      <planeGeometry args={[width, height, 10, 10]} />
      <meshStandardMaterial 
        color="#fafafa"
        side={THREE.DoubleSide}
        transparent
        opacity={opacity}
      />
    </mesh>
  )
}

// Book cover with 3D effect  
function BookCover({ width, height, coverColor, spineColor, children }: { 
  width: number
  height: number
  coverColor: string
  spineColor: string
  children?: React.ReactNode
}) {
  const coverRef = useRef<THREE.Group>(null)
  
  useFrame((state) => {
    if (coverRef.current) {
      // Subtle floating animation
      coverRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.02
    }
  })
  
  return (
    <group ref={coverRef}>
      {/* Front cover */}
      <mesh position={[width / 2 + 0.01, 0, 0]}>
        <boxGeometry args={[0.05, height, width * 0.7]} />
        <meshStandardMaterial color={coverColor} />
      </mesh>
      
      {/* Back cover */}
      <mesh position={[-width / 2 - 0.01, 0, 0]}>
        <boxGeometry args={[0.05, height, width * 0.7]} />
        <meshStandardMaterial color={coverColor} />
      </mesh>
      
      {/* Spine */}
      <mesh position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[width * 0.7, height, 0.08]} />
        <meshStandardMaterial color={spineColor} />
      </mesh>
    </group>
  )
}

// Main 3D Book component
export function FlippingBook3D({ 
  pages, 
  currentPage, 
  onPageChange,
  width = 1.2,
  height = 0.8,
  coverColor = '#8B4513',
  spineColor = '#5D3A1A'
}: FlippingBook3DProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [isFlipping, setIsFlipping] = useState(false)
  const [flipDirection, setFlipDirection] = useState<'left' | 'right' | null>(null)
  const [displayedPage, setDisplayedPage] = useState(currentPage)
  
  useEffect(() => {
    setDisplayedPage(currentPage)
  }, [currentPage])
  
  const goToNextPage = () => {
    if (displayedPage < pages.length - 1 && !isFlipping) {
      setFlipDirection('right')
      setIsFlipping(true)
    }
  }
  
  const goToPrevPage = () => {
    if (displayedPage > 0 && !isFlipping) {
      setFlipDirection('left')
      setIsFlipping(true)
    }
  }
  
  const handleAnimationComplete = () => {
    if (flipDirection === 'right') {
      setDisplayedPage(prev => Math.min(prev + 1, pages.length - 1))
      onPageChange(displayedPage + 1)
    } else if (flipDirection === 'left') {
      setDisplayedPage(prev => Math.max(prev - 1, 0))
      onPageChange(displayedPage - 1)
    }
    setFlipDirection(null)
    setIsFlipping(false)
  }
  
  // Camera controls
  function CameraRig() {
    const { camera } = useThree()
    
    useEffect(() => {
      camera.position.set(0, 0, 2.5)
      camera.lookAt(0, 0, 0)
    }, [camera])
    
    return null
  }
  
  return (
    <div className="relative w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
      >
        <CameraRig />
        
        {/* Lighting */}
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <pointLight position={[-5, 5, 5]} intensity={0.5} />
        
        <group ref={groupRef} rotation={[0.1, 0, 0]}>
          {/* Book pages */}
          {pages.map((page, index) => (
            <PageMesh
              key={index}
              page={page}
              index={index}
              totalPages={pages.length}
              isTurning={isFlipping && index === displayedPage}
              turnDirection={flipDirection}
              width={width}
              height={height}
              onAnimationComplete={handleAnimationComplete}
            />
          ))}
          
          {/* Book cover */}
          <BookCover 
            width={width} 
            height={height} 
            coverColor={coverColor} 
            spineColor={spineColor} 
          />
        </group>
      </Canvas>
      
      {/* Navigation arrows */}
      <button 
        onClick={goToPrevPage}
        disabled={displayedPage <= 0 || isFlipping}
        className="absolute left-4 top-1/2 -translate-y-1/2 btn btn-circle btn-lg bg-white/80 hover:bg-white"
      >
        ←
      </button>
      <button 
        onClick={goToNextPage}
        disabled={displayedPage >= pages.length - 1 || isFlipping}
        className="absolute right-4 top-1/2 -translate-y-1/2 btn btn-circle btn-lg bg-white/80 hover:bg-white"
      >
        →
      </button>
      
      {/* Page indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 px-4 py-2 rounded-full text-sm font-semibold">
        Page {displayedPage + 1} of {pages.length}
      </div>
    </div>
  )
}

export default FlippingBook3D