import { useRef, useState, useEffect, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Float } from '@react-three/drei'
import * as THREE from 'three'
import { setImgUrl } from '@/lib/utils'

interface BookData {
  book_id: number
  books_title: string
  books_image_url: string
  books_price: number
  author?: string
}

interface BookShelfProps {
  books?: BookData[]
}

function Book3D({
  coverImage,
  onClick
}: {
  coverImage?: string
  onClick?: () => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const materialRef = useRef<THREE.MeshStandardMaterial>(null)
  const backMaterialRef = useRef<THREE.MeshStandardMaterial>(null)
  const spineMaterialRef = useRef<THREE.MeshStandardMaterial>(null)

  const imgUrl = coverImage ? setImgUrl(coverImage, 'medium') : '/no-image.png'

  useEffect(() => {
    if (!imgUrl) return
    
    const loader = new THREE.TextureLoader()
    loader.load(imgUrl, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace
      tex.minFilter = THREE.LinearMipmapLinearFilter
      tex.magFilter = THREE.LinearFilter
      tex.wrapS = THREE.RepeatWrapping
      tex.wrapT = THREE.RepeatWrapping
      
      if (materialRef.current) {
        materialRef.current.map = tex
        materialRef.current.needsUpdate = true
      }
      if (backMaterialRef.current) {
        backMaterialRef.current.map = tex
        backMaterialRef.current.needsUpdate = true
      }
      if (spineMaterialRef.current) {
        spineMaterialRef.current.map = tex
        spineMaterialRef.current.needsUpdate = true
      }
    })
  }, [imgUrl])

  useFrame((state) => {
    if (groupRef.current && hovered) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 1.5) * 0.15
    }
  })

  const fallbackColor = "#6B4423"

return (
    <group ref={groupRef}>
      <Float speed={hovered ? 2 : 0} rotationIntensity={0.2} floatIntensity={hovered ? 0.1 : 0}>
        <group
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          onClick={onClick}
        >
          {/* Front face with image */}
          <mesh position={[0, 0, 0.08]}>
            <planeGeometry args={[1.5, 2.2]} />
            <meshStandardMaterial
              ref={materialRef}
              attach="material"
              color="#ffffff"
              roughness={0.4}
              metalness={0}
            />
          </mesh>
          
          {/* Back face with same image */}
          <mesh position={[0, 0, -0.08]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[1.5, 2.2]} />
            <meshStandardMaterial
              ref={backMaterialRef}
              color="#ffffff"
              roughness={0.4}
              metalness={0}
            />
          </mesh>
          
          {/* Spine with same image */}
          <mesh position={[-0.76, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[0.16, 2.2]} />
            <meshStandardMaterial
              ref={spineMaterialRef}
              color="#ffffff"
              roughness={0.4}
              metalness={0}
            />
          </mesh>
          
          {/* Pages right side - cream */}
          <mesh position={[0.74, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[0.16, 2.2]} />
            <meshStandardMaterial color="#f5f5dc" roughness={0.7} />
          </mesh>
          
          {/* Top edge */}
          <mesh position={[0, 1.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.5, 0.16]} />
            <meshStandardMaterial color="#f5f5dc" roughness={0.7} />
          </mesh>
          
          {/* Bottom edge */}
          <mesh position={[0, -1.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.5, 0.16]} />
            <meshStandardMaterial color="#f5f5dc" roughness={0.7} />
          </mesh>
        </group>
      </Float>
    </group>
  )
}

function BookShelfScene({ books = [] }: BookShelfProps) {
  const firstBook = (books || [])[0]
  const coverImage = firstBook?.books_image_url

  return (
    <>
      <ambientLight intensity={1.2} />
      <directionalLight position={[0, 3, 5]} intensity={1.5} castShadow />
      <directionalLight position={[3, 0, 2]} intensity={0.6} color="#fff5e6" />
      <pointLight position={[2, 2, 3]} intensity={0.8} color="#ffffff" />
      <pointLight position={[-2, 1, 3]} intensity={0.5} color="#fff8e7" />
      <pointLight position={[0, -2, 4]} intensity={0.3} color="#e6f0ff" />

      <Book3D
        coverImage={coverImage}
        onClick={() => firstBook && (window.location.href = `/books/view/${firstBook.book_id}`)}
      />

      <OrbitControls
        enableZoom={true}
        enablePan={false}
        minDistance={2.5}
        maxDistance={5}
        autoRotate={true}
        autoRotateSpeed={0.5}
      />
    </>
  )
}

export function BookShelfCanvas({ books = [] }: BookShelfProps) {
  return (
    <div className="w-full h-full min-h-[400px]">
      <Canvas
        camera={{ position: [0, 0, 3.5], fov: 45 }}
        shadows
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          <BookShelfScene books={books} />
        </Suspense>
      </Canvas>
    </div>
  )
}

export default BookShelfCanvas