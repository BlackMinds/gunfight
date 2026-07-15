<template>
  <div
    ref="hostRef"
    class="operator-3d"
    :class="{ dragging: drag.active }"
    @pointerdown="beginDrag"
    @pointermove="moveDrag"
    @pointerup="endDrag"
    @pointercancel="endDrag"
    @wheel.prevent="zoomCamera"
  >
    <canvas ref="canvasRef" aria-label="可旋转的三维装甲训练员" />
    <div class="operator-3d__scan" aria-hidden="true" />
    <div class="operator-3d__toolbar">
      <span>外观联动 {{ props.equipment.length }} / 8</span>
      <button type="button" @pointerdown.stop @click.stop="toggleFace">
        {{ faceVisible ? '合上面罩' : '显示面部' }}
      </button>
    </div>
    <div class="operator-3d__status">
      <span><i :class="modelState" />{{ modelState === 'ready' ? '动态 3D 模型' : modelState === 'loading' ? '正在加载角色' : '简化模型' }}</span>
      <b>拖动旋转 · 滚轮缩放</b>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

type EquipmentPreview = { slot: string; name?: string; rarity?: string }

const props = withDefaults(defineProps<{ equipment?: EquipmentPreview[] }>(), {
  equipment: () => []
})

const hostRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const modelState = ref<'loading' | 'ready' | 'fallback'>('loading')
const faceVisible = ref(true)
const drag = reactive({ active: false, x: 0, velocity: 0 })

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let operator: THREE.Group | null = null
let fallbackOperator: THREE.Group | null = null
let mixer: THREE.AnimationMixer | null = null
let visorObject: THREE.Object3D | null = null
let faceObject: THREE.Group | null = null
const loadoutVisuals = new Map<string, THREE.Object3D>()
let resizeObserver: ResizeObserver | null = null
let animationFrame = 0
let targetRotation = Math.PI - 0.16
let cameraDistance = 7.65
const clock = new THREE.Clock()

const armor = new THREE.MeshStandardMaterial({ color: 0x363a38, metalness: 0.82, roughness: 0.3 })
const armorLight = new THREE.MeshStandardMaterial({ color: 0x8a7d5d, metalness: 0.72, roughness: 0.34 })
const undersuit = new THREE.MeshStandardMaterial({ color: 0x0e1111, metalness: 0.08, roughness: 0.86 })
const visor = new THREE.MeshStandardMaterial({ color: 0x0b5670, emissive: 0x06384c, emissiveIntensity: 1.4, metalness: 0.62, roughness: 0.16 })
const accent = new THREE.MeshStandardMaterial({ color: 0xe0ae43, emissive: 0x5f3d08, emissiveIntensity: 0.55, metalness: 0.76, roughness: 0.24 })
const weaponMat = new THREE.MeshStandardMaterial({ color: 0x171b1b, metalness: 0.92, roughness: 0.24 })
const loadoutMetal = new THREE.MeshStandardMaterial({ color: 0x252b2b, metalness: 0.86, roughness: 0.28 })
const loadoutAccent = new THREE.MeshStandardMaterial({ color: 0xc99736, emissive: 0x422500, emissiveIntensity: 0.48, metalness: 0.74, roughness: 0.26 })
const loadoutEnergy = new THREE.MeshStandardMaterial({ color: 0x2b9fc2, emissive: 0x0b5672, emissiveIntensity: 1.7, metalness: 0.44, roughness: 0.2 })

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, position: [number, number, number], rotation: [number, number, number] = [0, 0, 0]) {
  const object = new THREE.Mesh(geometry, material)
  object.position.set(...position)
  object.rotation.set(...rotation)
  object.castShadow = true
  object.receiveShadow = true
  return object
}

function buildArmoredOperator() {
  const root = new THREE.Group()
  root.position.y = -1.75

  root.add(mesh(new THREE.CapsuleGeometry(0.58, 0.74, 7, 12), undersuit, [0, 3.18, 0]))
  root.add(mesh(new THREE.BoxGeometry(1.25, 1.1, 0.62, 2, 2, 1), armor, [0, 3.34, 0.08]))
  root.add(mesh(new THREE.BoxGeometry(0.92, 0.3, 0.68), armorLight, [0, 3.72, 0.04], [0.04, 0, 0]))
  root.add(mesh(new THREE.BoxGeometry(0.34, 0.17, 0.73), accent, [0, 3.2, 0.38]))
  root.add(mesh(new THREE.BoxGeometry(1.02, 0.28, 0.5), armor, [0, 2.62, 0]))

  root.add(mesh(new THREE.SphereGeometry(0.48, 20, 14), armor, [0, 4.45, 0]))
  root.add(mesh(new THREE.BoxGeometry(0.82, 0.27, 0.46), visor, [0, 4.48, 0.34], [-0.06, 0, 0]))
  root.add(mesh(new THREE.BoxGeometry(0.2, 0.18, 0.5), accent, [0, 4.83, 0.05]))
  root.add(mesh(new THREE.BoxGeometry(0.13, 0.42, 0.4), armorLight, [-0.47, 4.42, -0.01]))
  root.add(mesh(new THREE.BoxGeometry(0.13, 0.42, 0.4), armorLight, [0.47, 4.42, -0.01]))

  const shoulderGeometry = new THREE.SphereGeometry(0.34, 12, 10)
  const limbGeometry = new THREE.CapsuleGeometry(0.19, 0.68, 6, 10)
  root.add(mesh(shoulderGeometry, armorLight, [-0.83, 3.62, 0], [0, 0, -0.12]))
  root.add(mesh(shoulderGeometry, armorLight, [0.83, 3.62, 0], [0, 0, 0.12]))
  root.add(mesh(limbGeometry, undersuit, [-0.82, 3.03, 0.14], [0.05, 0, -0.18]))
  root.add(mesh(limbGeometry, undersuit, [0.82, 3.03, 0.14], [0.05, 0, 0.18]))
  root.add(mesh(new THREE.BoxGeometry(0.38, 0.66, 0.42), armor, [-0.88, 3.03, 0.12], [0.05, 0, -0.18]))
  root.add(mesh(new THREE.BoxGeometry(0.38, 0.66, 0.42), armor, [0.88, 3.03, 0.12], [0.05, 0, 0.18]))
  root.add(mesh(new THREE.CapsuleGeometry(0.15, 0.58, 6, 10), undersuit, [-0.58, 2.42, 0.48], [0.48, 0, -0.48]))
  root.add(mesh(new THREE.CapsuleGeometry(0.15, 0.58, 6, 10), undersuit, [0.58, 2.42, 0.48], [0.48, 0, 0.48]))

  root.add(mesh(new THREE.CapsuleGeometry(0.3, 0.78, 7, 12), undersuit, [-0.36, 1.65, 0]))
  root.add(mesh(new THREE.CapsuleGeometry(0.3, 0.78, 7, 12), undersuit, [0.36, 1.65, 0]))
  root.add(mesh(new THREE.BoxGeometry(0.48, 0.78, 0.48), armor, [-0.38, 1.66, 0.08]))
  root.add(mesh(new THREE.BoxGeometry(0.48, 0.78, 0.48), armor, [0.38, 1.66, 0.08]))
  root.add(mesh(new THREE.CapsuleGeometry(0.23, 0.72, 7, 12), undersuit, [-0.38, 0.82, 0]))
  root.add(mesh(new THREE.CapsuleGeometry(0.23, 0.72, 7, 12), undersuit, [0.38, 0.82, 0]))
  root.add(mesh(new THREE.BoxGeometry(0.44, 0.5, 0.5), armorLight, [-0.38, 0.96, 0.1]))
  root.add(mesh(new THREE.BoxGeometry(0.44, 0.5, 0.5), armorLight, [0.38, 0.96, 0.1]))
  root.add(mesh(new THREE.BoxGeometry(0.58, 0.25, 0.94), armor, [-0.38, 0.26, 0.25]))
  root.add(mesh(new THREE.BoxGeometry(0.58, 0.25, 0.94), armor, [0.38, 0.26, 0.25]))

  const rifle = new THREE.Group()
  rifle.add(mesh(new THREE.BoxGeometry(1.95, 0.26, 0.3), weaponMat, [0, 0, 0]))
  rifle.add(mesh(new THREE.BoxGeometry(0.56, 0.38, 0.34), armor, [-0.24, -0.08, 0]))
  rifle.add(mesh(new THREE.BoxGeometry(0.18, 0.56, 0.22), weaponMat, [-0.16, -0.38, 0], [0, 0, 0.16]))
  rifle.add(mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.75, 10), weaponMat, [1.27, 0, 0], [0, 0, Math.PI / 2]))
  rifle.add(mesh(new THREE.BoxGeometry(0.38, 0.12, 0.18), accent, [0.2, 0.22, 0]))
  rifle.position.set(0, 2.68, 0.72)
  rifle.rotation.set(-0.12, -0.1, -0.12)
  root.add(rifle)

  root.add(mesh(new THREE.BoxGeometry(0.25, 0.48, 0.2), armorLight, [-0.68, 2.62, -0.37]))
  root.add(mesh(new THREE.BoxGeometry(0.25, 0.48, 0.2), armorLight, [0.68, 2.62, -0.37]))
  return root
}

function buildFace(head: THREE.Object3D) {
  const skin = new THREE.MeshPhysicalMaterial({ color: 0xc38260, emissive: 0x2b1008, emissiveIntensity: 0.28, roughness: 0.72, clearcoat: 0.08, side: THREE.DoubleSide })
  const skinVisible = new THREE.MeshBasicMaterial({ color: 0xc98a68, side: THREE.DoubleSide })
  const dark = new THREE.MeshBasicMaterial({ color: 0x211714, side: THREE.DoubleSide })
  const eye = new THREE.MeshBasicMaterial({ color: 0x263c3c, side: THREE.DoubleSide })
  const face = new THREE.Group()
  face.name = 'operator-visible-face'

  const headShape = mesh(new THREE.SphereGeometry(7.3, 28, 20), skin, [0, 6.1, -2.4])
  headShape.scale.set(0.82, 1.04, 0.74)
  face.add(headShape)
  const buildFaceSide = (direction: -1 | 1) => {
    const portrait = new THREE.Group()
    const z = direction * 13.6
    const facePlate = mesh(new THREE.CircleGeometry(6.2, 36), skinVisible, [0, 6.1, z])
    facePlate.scale.set(0.72, 1, 1)
    portrait.add(facePlate)
    portrait.add(mesh(new THREE.CircleGeometry(0.72, 16), eye, [-2.05, 7.4, direction * 14.05]))
    portrait.add(mesh(new THREE.CircleGeometry(0.72, 16), eye, [2.05, 7.4, direction * 14.05]))
    portrait.add(mesh(new THREE.BoxGeometry(2, 0.5, 0.3), dark, [-2.1, 9, direction * 14], [0, 0, -0.08]))
    portrait.add(mesh(new THREE.BoxGeometry(2, 0.5, 0.3), dark, [2.1, 9, direction * 14], [0, 0, 0.08]))
    portrait.add(mesh(new THREE.BoxGeometry(2.8, 0.42, 0.3), dark, [0, 3.25, direction * 14]))
    return portrait
  }
  face.add(buildFaceSide(-1), buildFaceSide(1))
  head.add(face)
  faceObject = face
}

function buildVisibleFaceOverlay() {
  if (!operator) return
  const face = new THREE.Group()
  face.name = 'operator-face-overlay'
  face.position.set(0, 2.56, -0.47)
  const skin = new THREE.MeshBasicMaterial({ color: 0xc78a69, side: THREE.DoubleSide })
  const dark = new THREE.MeshBasicMaterial({ color: 0x241916, side: THREE.DoubleSide })
  const eyes = new THREE.MeshBasicMaterial({ color: 0x294242, side: THREE.DoubleSide })
  const plate = mesh(new THREE.CircleGeometry(0.17, 32), skin, [0, 0, 0])
  plate.scale.set(0.76, 1.08, 1)
  face.add(plate)
  face.add(mesh(new THREE.CircleGeometry(0.018, 12), eyes, [-0.052, 0.034, -0.008]))
  face.add(mesh(new THREE.CircleGeometry(0.018, 12), eyes, [0.052, 0.034, -0.008]))
  face.add(mesh(new THREE.BoxGeometry(0.05, 0.009, 0.008), dark, [-0.052, 0.074, -0.008], [0, 0, -0.12]))
  face.add(mesh(new THREE.BoxGeometry(0.05, 0.009, 0.008), dark, [0.052, 0.074, -0.008], [0, 0, 0.12]))
  face.add(mesh(new THREE.BoxGeometry(0.078, 0.009, 0.008), dark, [0, -0.075, -0.008]))
  operator.add(face)
  faceObject = face
}

function addVisual(slot: string, object: THREE.Object3D, parent: THREE.Object3D) {
  object.name = `loadout-${slot}`
  parent.add(object)
  loadoutVisuals.set(slot, object)
}

function buildLoadoutVisuals(model: THREE.Object3D) {
  loadoutVisuals.clear()

  const weaponRoot = new THREE.Group()
  weaponRoot.position.set(39, 83, -11)
  weaponRoot.rotation.set(0.06, -0.08, -0.08)
  weaponRoot.add(mesh(new THREE.BoxGeometry(9, 58, 9), loadoutMetal, [0, 0, 0]))
  weaponRoot.add(mesh(new THREE.BoxGeometry(13, 18, 10), loadoutMetal, [0, -15, 0]))
  model.add(weaponRoot)

  const barrel = new THREE.Group()
  barrel.add(mesh(new THREE.CylinderGeometry(2.8, 3.2, 39, 14), loadoutMetal, [0, 44, 0]))
  barrel.add(mesh(new THREE.BoxGeometry(8, 15, 8), loadoutAccent, [0, 25, 0]))
  addVisual('枪管', barrel, weaponRoot)

  const muzzle = new THREE.Group()
  muzzle.add(mesh(new THREE.CylinderGeometry(4.2, 4.2, 10, 16), loadoutMetal, [0, 68, 0]))
  muzzle.add(mesh(new THREE.TorusGeometry(4.4, 0.8, 8, 20), loadoutAccent, [0, 73, 0], [Math.PI / 2, 0, 0]))
  addVisual('枪口', muzzle, weaponRoot)

  const stock = new THREE.Group()
  stock.add(mesh(new THREE.BoxGeometry(13, 25, 12), loadoutMetal, [0, -41, -1], [0.08, 0, 0]))
  stock.add(mesh(new THREE.BoxGeometry(16, 7, 13), loadoutAccent, [0, -54, -1]))
  addVisual('枪托', stock, weaponRoot)

  const magazine = new THREE.Group()
  magazine.add(mesh(new THREE.BoxGeometry(13, 23, 8), loadoutMetal, [-7, -8, 8], [0.04, 0, 0.18]))
  magazine.add(mesh(new THREE.BoxGeometry(12, 4, 9), loadoutAccent, [-9, -20, 8], [0, 0, 0.18]))
  addVisual('弹匣', magazine, weaponRoot)

  const sight = new THREE.Group()
  sight.add(mesh(new THREE.BoxGeometry(9, 12, 9), loadoutMetal, [0, 18, 8]))
  sight.add(mesh(new THREE.CylinderGeometry(3.2, 3.2, 8, 16), loadoutEnergy, [0, 19, 13], [Math.PI / 2, 0, 0]))
  addVisual('瞄具', sight, weaponRoot)

  const ammo = new THREE.Group()
  ammo.position.set(0, 93, -18)
  for (const x of [-13, 0, 13]) ammo.add(mesh(new THREE.BoxGeometry(10, 17, 7), loadoutMetal, [x, 0, 0]))
  ammo.add(mesh(new THREE.BoxGeometry(38, 3, 8), loadoutAccent, [0, 9, 0]))
  addVisual('弹芯', ammo, model)

  const module = new THREE.Group()
  module.position.set(0, 128, -20)
  module.add(mesh(new THREE.BoxGeometry(18, 13, 5), loadoutMetal, [0, 0, 0]))
  module.add(mesh(new THREE.CylinderGeometry(4.5, 4.5, 2.5, 20), loadoutEnergy, [0, 0, 3.6], [Math.PI / 2, 0, 0]))
  addVisual('模块', module, model)

  const chip = new THREE.Group()
  chip.position.set(-38, 111, -8)
  chip.rotation.z = -0.18
  chip.add(mesh(new THREE.BoxGeometry(12, 16, 5), loadoutMetal, [0, 0, 0]))
  chip.add(mesh(new THREE.BoxGeometry(8, 11, 2), loadoutEnergy, [0, 0, 3.5]))
  addVisual('芯片', chip, model)
  syncLoadoutVisuals()
}

function syncLoadoutVisuals() {
  const equippedSlots = new Set(props.equipment.map((item) => item.slot))
  loadoutVisuals.forEach((object, slot) => {
    object.visible = equippedSlots.has(slot)
  })
}

function applyFaceMode() {
  if (visorObject) visorObject.visible = !faceVisible.value
  if (faceObject) faceObject.visible = faceVisible.value
}

function toggleFace() {
  faceVisible.value = !faceVisible.value
  applyFaceMode()
}

function resize() {
  if (!hostRef.value || !renderer || !camera) return
  const { width, height } = hostRef.value.getBoundingClientRect()
  if (!width || !height) return
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}

function beginDrag(event: PointerEvent) {
  drag.active = true
  drag.x = event.clientX
  drag.velocity = 0
  hostRef.value?.setPointerCapture(event.pointerId)
}

function moveDrag(event: PointerEvent) {
  if (!drag.active) return
  const delta = event.clientX - drag.x
  drag.x = event.clientX
  drag.velocity = delta * 0.012
  targetRotation += drag.velocity
}

function endDrag(event: PointerEvent) {
  drag.active = false
  if (hostRef.value?.hasPointerCapture(event.pointerId)) hostRef.value.releasePointerCapture(event.pointerId)
}

function zoomCamera(event: WheelEvent) {
  cameraDistance = THREE.MathUtils.clamp(cameraDistance + event.deltaY * 0.0025, 6.7, 9.8)
}

function render() {
  animationFrame = requestAnimationFrame(render)
  if (!renderer || !scene || !camera || !operator) return
  if (!drag.active) {
    targetRotation += drag.velocity
    drag.velocity *= 0.92
  }
  operator.rotation.y += (targetRotation - operator.rotation.y) * 0.16
  camera.position.z += (cameraDistance - camera.position.z) * 0.12
  mixer?.update(Math.min(clock.getDelta(), 0.05))
  renderer.render(scene, camera)
}

function loadDetailedOperator() {
  if (!operator || !renderer) return
  const loader = new GLTFLoader()
  loader.load(
    '/models/soldier.glb',
    (gltf) => {
      if (!operator || !renderer) return
      const model = gltf.scene
      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return
        object.castShadow = true
        object.receiveShadow = true
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        materials.forEach((material) => {
          if ('map' in material && material.map instanceof THREE.Texture) {
            material.map.anisotropy = renderer!.capabilities.getMaxAnisotropy()
          }
        })
      })

      const initialBox = new THREE.Box3().setFromObject(model)
      const initialSize = initialBox.getSize(new THREE.Vector3())
      model.scale.setScalar(4.45 / Math.max(initialSize.y, 0.01))
      model.updateMatrixWorld(true)
      const fittedBox = new THREE.Box3().setFromObject(model)
      const fittedCenter = fittedBox.getCenter(new THREE.Vector3())
      model.position.x -= fittedCenter.x
      model.position.y += -1.5 - fittedBox.min.y
      model.position.z -= fittedCenter.z

      visorObject = model.getObjectByName('vanguard_visor') ?? null
      const head = model.getObjectByName('mixamorig:Head')
      if (head) buildFace(head)
      buildVisibleFaceOverlay()
      buildLoadoutVisuals(model)
      applyFaceMode()

      operator.remove(fallbackOperator!)
      operator.add(model)
      fallbackOperator = null
      if (gltf.animations.length) {
        mixer = new THREE.AnimationMixer(model)
        const idleClip = gltf.animations.find((clip) => /idle/i.test(clip.name)) ?? gltf.animations[0]
        mixer.clipAction(idleClip).play()
      }
      modelState.value = 'ready'
    },
    undefined,
    () => {
      modelState.value = 'fallback'
    }
  )
}

onMounted(() => {
  if (!canvasRef.value || !hostRef.value) return
  scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x080b0c, 0.055)
  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 30)
  camera.position.set(0, 0.78, cameraDistance)
  camera.lookAt(0, 0.78, 0)
  renderer = new THREE.WebGLRenderer({ canvas: canvasRef.value, alpha: true, antialias: true, powerPreference: 'high-performance' })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.18
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  scene.add(new THREE.HemisphereLight(0xa9d9e7, 0x171108, 1.45))
  const key = new THREE.DirectionalLight(0xffdf9a, 3.1)
  key.position.set(-3.5, 6, 4)
  key.castShadow = true
  scene.add(key)
  const rim = new THREE.DirectionalLight(0x57b7dc, 2.7)
  rim.position.set(4, 3, -4)
  scene.add(rim)

  operator = new THREE.Group()
  fallbackOperator = buildArmoredOperator()
  operator.add(fallbackOperator)
  scene.add(operator)
  const platform = mesh(new THREE.CylinderGeometry(1.55, 1.72, 0.18, 48), new THREE.MeshStandardMaterial({ color: 0x171b1b, metalness: 0.78, roughness: 0.32 }), [0, -1.62, 0])
  scene.add(platform)
  const ring = mesh(new THREE.TorusGeometry(1.28, 0.025, 8, 64), accent, [0, -1.51, 0], [Math.PI / 2, 0, 0])
  scene.add(ring)

  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(hostRef.value)
  resize()
  loadDetailedOperator()
  render()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame)
  resizeObserver?.disconnect()
  scene?.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    object.geometry.dispose()
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach((material) => material.dispose())
  })
  renderer?.dispose()
})

watch(() => props.equipment.map((item) => `${item.slot}:${item.name ?? ''}`).join('|'), syncLoadoutVisuals)
</script>

<style scoped>
.operator-3d {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  cursor: grab;
  touch-action: none;
  user-select: none;
  border: 1px solid rgba(240, 191, 87, 0.28);
  border-radius: 6px;
  background:
    radial-gradient(circle at 50% 24%, rgba(87, 163, 190, 0.17), transparent 37%),
    linear-gradient(180deg, rgba(26, 31, 32, 0.94), rgba(6, 8, 9, 0.98));
}

.operator-3d.dragging { cursor: grabbing; }

canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.operator-3d__scan {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(180deg, transparent 62%, rgba(5, 7, 8, 0.88)),
    repeating-linear-gradient(180deg, transparent 0 3px, rgba(155, 204, 218, 0.025) 3px 4px);
}

.operator-3d__toolbar {
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  color: #bec8c5;
  font-size: var(--font-caption, 12px);
  pointer-events: none;
}

.operator-3d__toolbar span {
  padding: 5px 7px;
  border: 1px solid rgba(120, 145, 149, 0.26);
  background: rgba(7, 10, 11, 0.72);
}

.operator-3d__toolbar button {
  min-height: 28px;
  padding: 5px 9px;
  border: 1px solid rgba(240, 191, 87, 0.34);
  border-radius: 4px;
  color: #f3cc6b;
  background: rgba(13, 16, 17, 0.9);
  font: inherit;
  font-weight: 800;
  cursor: pointer;
  pointer-events: auto;
}

.operator-3d__toolbar button:hover {
  border-color: rgba(240, 191, 87, 0.68);
  background: rgba(48, 39, 21, 0.94);
}

.operator-3d__status {
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 10px;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  padding: 7px 9px;
  border: 1px solid rgba(240, 191, 87, 0.24);
  background: rgba(8, 11, 12, 0.76);
  color: #aeb8b8;
  font-size: var(--font-caption, 12px);
}

.operator-3d__status span {
  display: flex;
  align-items: center;
  gap: 6px;
}

.operator-3d__status i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #66c9e7;
  box-shadow: 0 0 8px rgba(102, 201, 231, 0.8);
}

.operator-3d__status b {
  color: #f5cc6a;
  font-weight: 800;
}
</style>
