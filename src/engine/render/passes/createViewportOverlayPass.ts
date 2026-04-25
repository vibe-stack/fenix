import type { OrbitCameraSnapshot } from '../../scene/camera/createOrbitCameraController'
import type { VolumeResolution } from '../../simulation/common/volumeResolution'
import { getVolumeWorldBounds } from '../volumetrics/volumeWorldBounds'

export interface ViewportOverlayPass {
  render(
    encoder: GPUCommandEncoder,
    view: GPUTextureView,
    camera: OrbitCameraSnapshot,
    renderWidth: number,
    renderHeight: number,
    overlays: readonly string[],
  ): void
  dispose(): void
}

const GPU_BUFFER_VERTEX = 0x0020
const GPU_BUFFER_COPY_DST = 0x0008
const GPU_BUFFER_UNIFORM = 0x0040
const FLOATS_PER_VERTEX = 7
const MAX_VERTICES = 256

type Vec3 = readonly [number, number, number]
type Color = readonly [number, number, number, number]

export function createViewportOverlayPass(
  device: GPUDevice,
  format: GPUTextureFormat,
  resolution: VolumeResolution,
): ViewportOverlayPass {
  const bounds = getVolumeWorldBounds(resolution)
  const cameraData = new Float32Array(20)
  const vertexData = new Float32Array(MAX_VERTICES * FLOATS_PER_VERTEX)
  const vertexBuffer = device.createBuffer({
    label: 'viewport-overlay-lines-buffer',
    size: vertexData.byteLength,
    usage: GPU_BUFFER_VERTEX | GPU_BUFFER_COPY_DST,
  })
  const cameraBuffer = device.createBuffer({
    label: 'viewport-overlay-camera-buffer',
    size: cameraData.byteLength,
    usage: GPU_BUFFER_UNIFORM | GPU_BUFFER_COPY_DST,
  })
  const shaderModule = device.createShaderModule({
    label: 'viewport-overlay-lines-shader',
    code: createOverlayShader(),
  })
  const pipeline = device.createRenderPipeline({
    label: 'viewport-overlay-lines-pipeline',
    layout: 'auto',
    vertex: {
      module: shaderModule,
      entryPoint: 'vsMain',
      buffers: [
        {
          arrayStride: Float32Array.BYTES_PER_ELEMENT * FLOATS_PER_VERTEX,
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x3' },
            { shaderLocation: 1, offset: Float32Array.BYTES_PER_ELEMENT * 3, format: 'float32x4' },
          ],
        },
      ],
    },
    fragment: {
      module: shaderModule,
      entryPoint: 'fsMain',
      targets: [
        {
          format,
          blend: {
            color: {
              srcFactor: 'src-alpha',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add',
            },
            alpha: {
              srcFactor: 'one',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add',
            },
          },
        },
      ],
    },
    primitive: {
      topology: 'line-list',
    },
  })
  const bindGroup = device.createBindGroup({
    label: 'viewport-overlay-lines-bind-group',
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: cameraBuffer } }],
  })

  return {
    render(encoder, view, camera, renderWidth, renderHeight, overlays) {
      const showBounds = overlays.includes('bounds')
      const showGuides = overlays.includes('guides')

      if (!showBounds && !showGuides) {
        return
      }

      cameraData[0] = camera.position.x
      cameraData[1] = camera.position.y
      cameraData[2] = camera.position.z
      cameraData[3] = 0
      cameraData[4] = camera.right.x
      cameraData[5] = camera.right.y
      cameraData[6] = camera.right.z
      cameraData[7] = 0
      cameraData[8] = camera.up.x
      cameraData[9] = camera.up.y
      cameraData[10] = camera.up.z
      cameraData[11] = 0
      cameraData[12] = camera.forward.x
      cameraData[13] = camera.forward.y
      cameraData[14] = camera.forward.z
      cameraData[15] = 0
      cameraData[16] = renderWidth / Math.max(renderHeight, 1)
      cameraData[17] = camera.tanHalfFovY
      cameraData[18] = 0
      cameraData[19] = 0

      let vertexCount = 0
      if (showGuides) {
        vertexCount = writeGuideLines(vertexData, vertexCount, bounds)
      }
      if (showBounds) {
        vertexCount = writeBoundsLines(vertexData, vertexCount, bounds)
      }

      device.queue.writeBuffer(cameraBuffer, 0, cameraData)
      device.queue.writeBuffer(vertexBuffer, 0, vertexData, 0, vertexCount * FLOATS_PER_VERTEX)

      const pass = encoder.beginRenderPass({
        label: 'viewport-overlay-lines-pass',
        colorAttachments: [
          {
            view,
            loadOp: 'load',
            storeOp: 'store',
          },
        ],
      })

      pass.setPipeline(pipeline)
      pass.setBindGroup(0, bindGroup)
      pass.setVertexBuffer(0, vertexBuffer)
      pass.draw(vertexCount)
      pass.end()
    },
    dispose() {
      vertexBuffer.destroy()
      cameraBuffer.destroy()
    },
  }
}

function writeBoundsLines(
  data: Float32Array,
  vertexCount: number,
  bounds: ReturnType<typeof getVolumeWorldBounds>,
) {
  const { center, halfExtents } = bounds
  const min: Vec3 = [center.x - halfExtents.x, center.y - halfExtents.y, center.z - halfExtents.z]
  const max: Vec3 = [center.x + halfExtents.x, center.y + halfExtents.y, center.z + halfExtents.z]
  const corners: Vec3[] = [
    [min[0], min[1], min[2]],
    [max[0], min[1], min[2]],
    [max[0], min[1], max[2]],
    [min[0], min[1], max[2]],
    [min[0], max[1], min[2]],
    [max[0], max[1], min[2]],
    [max[0], max[1], max[2]],
    [min[0], max[1], max[2]],
  ]
  const color: Color = [0.21, 0.82, 0.95, 0.9]
  const edges: readonly (readonly [number, number])[] = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ]

  for (const [start, end] of edges) {
    vertexCount = writeLine(data, vertexCount, corners[start], corners[end], color)
  }

  return vertexCount
}

function writeGuideLines(
  data: Float32Array,
  vertexCount: number,
  bounds: ReturnType<typeof getVolumeWorldBounds>,
) {
  const { center, halfExtents } = bounds
  const min: Vec3 = [center.x - halfExtents.x, center.y - halfExtents.y, center.z - halfExtents.z]
  const max: Vec3 = [center.x + halfExtents.x, center.y + halfExtents.y, center.z + halfExtents.z]
  const floorY = min[1]
  const gridColor: Color = [0.62, 0.68, 0.74, 0.22]
  const xColor: Color = [0.95, 0.28, 0.22, 0.68]
  const yColor: Color = [0.38, 0.9, 0.42, 0.72]
  const zColor: Color = [0.24, 0.56, 1.0, 0.68]
  const gridSteps = 8

  for (let i = 0; i <= gridSteps; i += 1) {
    const t = i / gridSteps
    const x = min[0] + (max[0] - min[0]) * t
    const z = min[2] + (max[2] - min[2]) * t
    const color = i === gridSteps / 2 ? [0.8, 0.86, 0.92, 0.38] as const : gridColor

    vertexCount = writeLine(data, vertexCount, [x, floorY, min[2]], [x, floorY, max[2]], color)
    vertexCount = writeLine(data, vertexCount, [min[0], floorY, z], [max[0], floorY, z], color)
  }

  vertexCount = writeLine(data, vertexCount, [min[0], floorY, center.z], [max[0], floorY, center.z], xColor)
  vertexCount = writeLine(data, vertexCount, [center.x, min[1], center.z], [center.x, max[1], center.z], yColor)
  vertexCount = writeLine(data, vertexCount, [center.x, floorY, min[2]], [center.x, floorY, max[2]], zColor)

  return vertexCount
}

function writeLine(
  data: Float32Array,
  vertexCount: number,
  start: Vec3,
  end: Vec3,
  color: Color,
) {
  let nextVertexCount = writeVertex(data, vertexCount, start, color)
  nextVertexCount = writeVertex(data, nextVertexCount, end, color)
  return nextVertexCount
}

function writeVertex(data: Float32Array, vertexCount: number, position: Vec3, color: Color) {
  const offset = vertexCount * FLOATS_PER_VERTEX
  data[offset] = position[0]
  data[offset + 1] = position[1]
  data[offset + 2] = position[2]
  data[offset + 3] = color[0]
  data[offset + 4] = color[1]
  data[offset + 5] = color[2]
  data[offset + 6] = color[3]
  return vertexCount + 1
}

function createOverlayShader() {
  return /* wgsl */ `
    struct CameraData {
      position: vec4<f32>,
      right: vec4<f32>,
      up: vec4<f32>,
      forward: vec4<f32>,
      renderInfo: vec4<f32>,
    }

    struct VertexInput {
      @location(0) worldPosition: vec3<f32>,
      @location(1) color: vec4<f32>,
    }

    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) color: vec4<f32>,
    }

    @group(0) @binding(0) var<uniform> camera: CameraData;

    @vertex
    fn vsMain(input: VertexInput) -> VertexOutput {
      let cameraToPoint = input.worldPosition - camera.position.xyz;
      let depth = dot(cameraToPoint, camera.forward.xyz);
      let aspect = max(camera.renderInfo.x, 0.0001);
      let tanHalfFovY = max(camera.renderInfo.y, 0.0001);
      let nearPlane = 0.05;
      let clipX = dot(cameraToPoint, camera.right.xyz) / (aspect * tanHalfFovY);
      let clipY = dot(cameraToPoint, camera.up.xyz) / tanHalfFovY;

      var output: VertexOutput;
      output.position = vec4<f32>(clipX, clipY, depth - nearPlane, depth);
      output.color = input.color;
      return output;
    }

    @fragment
    fn fsMain(input: VertexOutput) -> @location(0) vec4<f32> {
      return input.color;
    }
  `
}
