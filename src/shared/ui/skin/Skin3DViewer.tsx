import { useEffect, useRef } from 'react'
import * as skinview3d from 'skinview3d'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useI18n } from '@/shared/i18n/I18nProvider'

type Skin3DViewerProps = {
  className?: string
  skinUrl: string
  autoRotate?: boolean
  animated?: boolean
}

export function Skin3DViewer({ className = '', skinUrl, autoRotate = false, animated = true }: Skin3DViewerProps) {
  const { language } = useI18n()
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const viewerRef = useRef<any>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const roRef = useRef<ResizeObserver | null>(null)

  useEffect(() => {
    if (!wrapRef.current) return

    const viewer = new skinview3d.SkinViewer({
      canvas: document.createElement('canvas'),
      width: 300,
      height: 480,
    })
    viewerRef.current = viewer

    wrapRef.current.innerHTML = ''
    wrapRef.current.appendChild(viewer.canvas)

    viewer.background = '#0f172a'
    viewer.camera.fov = 40
    viewer.camera.zoom = 1
    viewer.camera.near = 0.01
    viewer.camera.far = 1000
    viewer.camera.updateProjectionMatrix()
    viewer.cameraLight.intensity = 2
    viewer.globalLight.intensity = 2
    viewer.animation = animated ? new skinview3d.IdleAnimation() : null
    if (animated && viewer.animation) viewer.animation.speed = 1

    const controls = new OrbitControls((viewer as any).camera, viewer.canvas)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.enablePan = false
    controls.addEventListener('change', () => viewer.render())
    controlsRef.current = controls

    const cv = viewer.canvas as HTMLCanvasElement
    cv.style.position = 'absolute'
    cv.style.inset = '0'
    cv.style.width = '100%'
    cv.style.height = '100%'
    cv.style.display = 'block'

    const PAD = 1.05

    const frameToFit = () => {
      const v = viewerRef.current
      if (!v) return

      const obj = (v as any).playerObject ?? (v as any).scene
      if (!obj) return

      const box = new THREE.Box3().setFromObject(obj)
      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())

      const el = wrapRef.current!
      const cw = Math.max(1, el.clientWidth)
      const ch = Math.max(1, el.clientHeight)
      const aspect = cw / ch

      const vFovEffRad = THREE.MathUtils.degToRad(v.camera.fov / Math.max(v.camera.zoom, 1e-6))
      const hFovEffRad = 2 * Math.atan(Math.tan(vFovEffRad / 2) * aspect)

      const halfH = size.y * 0.5
      const halfW = 0.5 * Math.max(size.x, size.z)

      const distV = halfH / Math.tan(vFovEffRad / 2)
      const distH = halfW / Math.tan(hFovEffRad / 2)
      const dist = Math.max(distV, distH) * PAD

      const oldTarget = (controlsRef.current?.target ?? center).clone()
      const dir = v.camera.position.clone().sub(oldTarget)
      if (!isFinite(dir.length()) || dir.length() < 1e-3) dir.set(-0.35, 0.3, 1)
      dir.setLength(dist)

      controlsRef.current?.target.copy(center)
      v.camera.position.copy(center).add(dir)

      v.camera.near = Math.max(0.01, dist / 100)
      v.camera.far = Math.max(v.camera.near * 10, dist * 100)

      v.camera.updateProjectionMatrix()
      controlsRef.current?.update()
      v.render()
    }

    const fitPixels = () => {
      const el = wrapRef.current
      if (!el) return
      
      const cw = Math.max(1, Math.floor(el.clientWidth))
      const ch = Math.max(1, Math.floor(el.clientHeight))
      const dpr = Math.min(window.devicePixelRatio || 1, 2)

      viewer.setSize(cw, ch)
      const r = (viewer as any).renderer
      if (r?.setPixelRatio) r.setPixelRatio(dpr)

      viewer.camera.aspect = cw / ch
      viewer.camera.updateProjectionMatrix()

      frameToFit()
    }

    Promise.resolve(viewer.loadSkin(skinUrl as any))
      .catch(() => {})
      .finally(() => {
        fitPixels()
      })

    const ro = new ResizeObserver(fitPixels)
    ro.observe(wrapRef.current!)
    roRef.current = ro

    const onResize = () => fitPixels()
    window.addEventListener('resize', onResize)

    fitPixels()

    return () => {
      window.removeEventListener('resize', onResize)
      roRef.current?.disconnect()
      controls.dispose()
      viewer.dispose()
      viewerRef.current = null
      controlsRef.current = null
    }
  }, [skinUrl, animated])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    viewer.autoRotate = !!autoRotate
    viewer.autoRotateSpeed = 1.2
    viewer.render()
  }, [autoRotate])

  return <div ref={wrapRef} className={`${className} relative`} aria-label={language === 'ru' ? '3D-просмотр скина' : '3D skin preview'} />
}
