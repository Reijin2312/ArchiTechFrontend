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
  background?: string
  interactive?: boolean
  onReady?: () => void
  onError?: () => void
  // Used by the homepage quote; other skin viewers retain their existing behavior.
  portraitYaw?: number
  followCursor?: boolean
  // Only the homepage quote opts into extra framing space above the base line.
  portraitFraming?: boolean
}

export function Skin3DViewer({ className = '', skinUrl, autoRotate = false, animated = true, background = '#0f172a', interactive = true, onReady, onError, portraitYaw = 0, followCursor = false, portraitFraming = false }: Skin3DViewerProps) {
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
    // Give the static portrait genuine depth without spinning the model.
    viewer.playerObject.rotation.y = portraitYaw

    wrapRef.current.innerHTML = ''
    wrapRef.current.appendChild(viewer.canvas)

    viewer.background = background
    viewer.camera.fov = 40
    viewer.camera.zoom = 1
    viewer.camera.near = 0.01
    viewer.camera.far = 1000
    viewer.camera.updateProjectionMatrix()
    viewer.cameraLight.intensity = interactive ? 2 : 1.35
    viewer.globalLight.intensity = interactive ? 2 : 1.8
    viewer.animation = animated ? new skinview3d.IdleAnimation() : null
    if (animated && viewer.animation) viewer.animation.speed = 1

    const controls = new OrbitControls((viewer as any).camera, viewer.canvas)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.enablePan = false
    controls.enableZoom = interactive
    controls.enableRotate = interactive
    controls.addEventListener('change', () => viewer.render())
    controlsRef.current = controls

    const cv = viewer.canvas as HTMLCanvasElement
    cv.style.position = 'absolute'
    cv.style.inset = '0'
    cv.style.width = '100%'
    cv.style.height = '100%'
    cv.style.display = 'block'

    // The testimonial needs more breathing room around the shoes and head.
    const PAD = portraitFraming ? 1.18 : 1.05

    const frameToFit = () => {
      const v = viewerRef.current
      if (!v) return

      const obj = (v as any).playerObject ?? (v as any).scene
      if (!obj) return

      const box = new THREE.Box3().setFromObject(obj)
      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())
      // Aim a little below the model's midpoint so the character is positioned
      // higher in the canvas. Keep the full object box for the distance fit.
      const frameCenter = center.clone()
      if (portraitFraming) frameCenter.y -= size.y * 0.045

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

      const oldTarget = (controlsRef.current?.target ?? frameCenter).clone()
      const dir = v.camera.position.clone().sub(oldTarget)
      if (!isFinite(dir.length()) || dir.length() < 1e-3) dir.set(-0.35, 0.3, 1)
      dir.setLength(dist)

      controlsRef.current?.target.copy(frameCenter)
      v.camera.position.copy(frameCenter).add(dir)

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
      .then(() => {
        if (viewerRef.current === viewer) onReady?.()
      })
      .catch(() => {
        if (viewerRef.current === viewer) onError?.()
      })
      .finally(() => {
        if (viewerRef.current !== viewer) return
        fitPixels()
        // The static testimonial should not keep an off-screen WebGL animation loop alive.
        if (!interactive && !animated) {
          viewer.renderPaused = true
          viewer.render()
        }
      })

    const ro = new ResizeObserver(fitPixels)
    ro.observe(wrapRef.current!)
    roRef.current = ro

    const onResize = () => fitPixels()
    window.addEventListener('resize', onResize)

    fitPixels()

    // Mouse gaze is deliberately subtle: only the head reacts, not the body or camera.
    // Render only while interpolating; no permanent WebGL animation loop is needed.
    let gazeFrame: number | null = null
    let targetYaw = 0
    let targetPitch = 0
    const updateGaze = () => {
      gazeFrame = null
      if (viewerRef.current !== viewer) return
      const head = viewer.playerObject.skin.head
      head.rotation.y += (targetYaw - head.rotation.y) * 0.14
      head.rotation.x += (targetPitch - head.rotation.x) * 0.14
      viewer.render()
      if (Math.abs(targetYaw - head.rotation.y) > 0.002 || Math.abs(targetPitch - head.rotation.x) > 0.002) {
        gazeFrame = window.requestAnimationFrame(updateGaze)
      }
    }
    const scheduleGaze = () => {
      if (gazeFrame === null) gazeFrame = window.requestAnimationFrame(updateGaze)
    }
    // Project the real on-screen cursor through the portrait camera. Using the
    // camera ray (rather than percentages of the browser window) makes the gaze
    // follow the actual cursor location, including when it is outside the canvas.
    const pointerRaycaster = new THREE.Raycaster()
    const pointerNdc = new THREE.Vector2()
    const aimPlane = new THREE.Plane()
    const aimPoint = new THREE.Vector3()
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || !wrapRef.current) return
      const bounds = wrapRef.current.getBoundingClientRect()
      if (bounds.bottom < 0 || bounds.top > window.innerHeight) {
        resetGaze()
        return
      }
      if (!bounds.width || !bounds.height) return

      pointerNdc.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        1 - ((event.clientY - bounds.top) / bounds.height) * 2,
      )
      viewer.camera.updateWorldMatrix(true, false)
      pointerRaycaster.setFromCamera(pointerNdc, viewer.camera)

      const head = viewer.playerObject.skin.head
      const parent = head.parent
      if (!parent) return
      // The head pivot is below the eyes in skinview3d. Use the eye line as
      // the gaze origin, unaffected by the head's current interpolation.
      const headWorld = head.getWorldPosition(new THREE.Vector3())
        .add(new THREE.Vector3(0, 3.5, 0))
      const towardCamera = viewer.camera.getWorldPosition(new THREE.Vector3()).sub(headWorld)
      const gazeDepth = THREE.MathUtils.clamp(towardCamera.length() * 0.45, 12, 24)
      const planePoint = headWorld.clone().addScaledVector(towardCamera.normalize(), gazeDepth)
      const cameraForward = viewer.camera.getWorldDirection(new THREE.Vector3())
      aimPlane.setFromNormalAndCoplanarPoint(cameraForward, planePoint)
      if (!pointerRaycaster.ray.intersectPlane(aimPlane, aimPoint)) return

      // Body yaw is accounted for by converting both points to head-parent
      // coordinates. +Z is the front of a Minecraft skin in skinview3d.
      const localTarget = parent.worldToLocal(aimPoint.clone())
      const localOrigin = parent.worldToLocal(headWorld.clone())
      const direction = localTarget.sub(localOrigin)
      targetYaw = THREE.MathUtils.clamp(Math.atan2(direction.x, direction.z), -0.62, 0.62)
      targetPitch = THREE.MathUtils.clamp(
        -Math.atan2(direction.y, Math.hypot(direction.x, direction.z)),
        -0.34,
        0.34,
      )
      scheduleGaze()
    }
    const resetGaze = () => {
      targetYaw = 0
      targetPitch = 0
      scheduleGaze()
    }
    if (followCursor) {
      window.addEventListener('pointermove', onPointerMove, { passive: true })
      window.addEventListener('blur', resetGaze)
      document.addEventListener('mouseleave', resetGaze)
    }

    return () => {
      if (gazeFrame !== null) window.cancelAnimationFrame(gazeFrame)
      if (followCursor) {
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('blur', resetGaze)
        document.removeEventListener('mouseleave', resetGaze)
      }
      window.removeEventListener('resize', onResize)
      roRef.current?.disconnect()
      controls.dispose()
      viewer.dispose()
      viewerRef.current = null
      controlsRef.current = null
    }
  }, [skinUrl, animated, background, interactive, onReady, onError, portraitYaw, followCursor, portraitFraming])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    viewer.autoRotate = !!autoRotate
    viewer.autoRotateSpeed = 1.2
    viewer.render()
  }, [autoRotate])

  return <div ref={wrapRef} className={`${className} relative`} aria-label={language === 'ru' ? '3D-просмотр скина' : '3D skin preview'} />
}
