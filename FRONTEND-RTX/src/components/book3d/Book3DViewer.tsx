import { useRef, useState, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera, Environment, Float } from '@react-three/drei'
import * as THREE from 'three'
import { Page3D, type Page3DProps } from './Page3D'
import { BookCover3D, type BookCover3DProps } from './BookCover3D'

export interface Book3DViewerProps {
  totalPages: number
  currentPage: number
  onPageChange: (page: number) => void
  width?: number
  height?: number
  coverColor?: string
  children?: React.ReactNode
}

export function Book3DViewer({
  totalPages,
  currentPage,
  onPageChange,
  width = 1.4,
  height = 1,
  coverColor = '#6B4423',
  children
}: Book3DViewerProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [isFlipping, setIsFlipping] = useState(false)
  const [flipDirection, setFlipDirection] = useState<'left' | 'right' | null>(null)
  
  const goNext = () => {
    if (currentPage < totalPages - 1 && !isFlipping) {
      setFlipDirection('right')
      setIsFlipping(true)
      
      setTimeout(() => {
        onPageChange(currentPage + 1)
        setTimeout(() => {
          setFlipDirection(null)
          setIsFlipping(false)
        }, 100)
      }, 600)
    }
  }
  
  const goPrev = () => {
    if (currentPage > 0 && !isFlipping) {
      setFlipDirection('left')
      setIsFlipping(true)
      
      setTimeout(() => {
        onPageChange(currentPage - 1)
        setTimeout(() => {
          setFlipDirection(null)
          setIsFlipping(false)
        }, 100)
      }, 600)
    }
  }
  
  const pageIndices = useMemo(() => {
    const indices = []
    for (let i = 0; i < Math.min(totalPages, 50); i++) {
      indices.push(i)
    }
    return indices
  }, [totalPages])
  
  return (
    <div className="w-full h-full relative">
      <Canvas gl={{ antialias: true, alpha: true }}>
        <PerspectiveCamera makeDefault position={[0, 0.2, 2.5]} fov={45} />
        
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
        <pointLight position={[-5, 3, 5]} intensity={0.4} />
        
        <Float
          speed={1}
          rotationIntensity={0.1}
          floatIntensity={0.2}
        >
          <group ref={groupRef} rotation={[0.15, 0, 0]}>
            {pageIndices.map((pageIndex) => (
              <Page3D
                key={pageIndex}
                index={pageIndex}
                totalPages={totalPages}
                isActive={pageIndex === currentPage}
                isFlipped={isFlipping && Math.abs(pageIndex - currentPage) <= 1}
                flipDirection={flipDirection}
                width={width}
                height={height}
              />
            ))}
            
            <BookCover3D width={width} height={height} color={coverColor} />
          </group>
        </Float>
        
        <Environment preset="apartment" />
      </Canvas>
      
      <div className="absolute inset-0 flex items-center justify-between pointer-events-none p-4">
        <button
          onClick={goPrev}
          disabled={currentPage <= 0 || isFlipping}
          className="pointer-events-auto btn btn-circle btn-lg bg-white/90 hover:bg-white shadow-lg disabled:opacity-50"
        >
          ❮
        </button>
        <button
          onClick={goNext}
          disabled={currentPage >= totalPages - 1 || isFlipping}
          className="pointer-events-auto btn btn-circle btn-lg bg-white/90 hover:bg-white shadow-lg disabled:opacity-50"
        >
          ❯
        </button>
      </div>
      
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 px-4 py-2 rounded-full shadow-lg">
        <span className="font-semibold">{currentPage + 1}</span>
        <span className="text-gray-400 mx-1">/</span>
        <span className="text-gray-600">{totalPages}</span>
      </div>
    </div>
  )
}

export default Book3DViewer