export interface BloomParams {
  enabled: boolean
  threshold: number
  strength: number
  radius: number
}

export interface BloomPass {
  render(
    encoder: GPUCommandEncoder,
    sourceView: GPUTextureView,
    targetView: GPUTextureView,
    width: number,
    height: number,
    params: BloomParams,
  ): void
  resize(width: number, height: number): void
  dispose(): void
}

const GPU_TEXTURE_RENDER_ATTACHMENT = 0x10
const GPU_TEXTURE_TEXTURE_BINDING = 0x04
const GPU_BUFFER_UNIFORM = 0x0040
const GPU_BUFFER_COPY_DST = 0x0008

export function createBloomPass(device: GPUDevice, canvasFormat: GPUTextureFormat): BloomPass {
  let width = 1
  let height = 1

  // Internal textures at half resolution for the blur chain
  let brightTex = makeColorTexture(device, width, height)
  let blurHTex = makeColorTexture(device, width, height)
  let blurVTex = makeColorTexture(device, width, height)

  const paramsBuffer = device.createBuffer({
    label: 'bloom-params',
    size: 32,
    usage: GPU_BUFFER_UNIFORM | GPU_BUFFER_COPY_DST,
  })
  const paramsData = new Float32Array(8)

  const thresholdModule = device.createShaderModule({ label: 'bloom-threshold', code: thresholdShader() })
  const blurHModule = device.createShaderModule({ label: 'bloom-blur-h', code: blurShader(true) })
  const blurVModule = device.createShaderModule({ label: 'bloom-blur-v', code: blurShader(false) })
  const compositeModule = device.createShaderModule({ label: 'bloom-composite', code: compositeShader() })
  const blitModule = device.createShaderModule({ label: 'bloom-blit', code: blitShader() })

  const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' })

  const thresholdPipeline = makeRenderPipeline(device, thresholdModule, 'rgba16float')
  const blurHPipeline = makeRenderPipeline(device, blurHModule, 'rgba16float')
  const blurVPipeline = makeRenderPipeline(device, blurVModule, 'rgba16float')
  const compositePipeline = makeRenderPipeline(device, compositeModule, canvasFormat)
  const blitPipeline = makeRenderPipeline(device, blitModule, canvasFormat)

  function makeBindGroup(pipeline: GPURenderPipeline, texView: GPUTextureView, extraView?: GPUTextureView): GPUBindGroup {
    const entries: GPUBindGroupEntry[] = [
      { binding: 0, resource: texView },
      { binding: 1, resource: sampler },
      { binding: 2, resource: { buffer: paramsBuffer } },
    ]
    if (extraView) {
      entries.push({ binding: 3, resource: extraView })
    }
    return device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries,
    })
  }

  function makeBlitBindGroup(texView: GPUTextureView): GPUBindGroup {
    return device.createBindGroup({
      layout: blitPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: texView },
        { binding: 1, resource: sampler },
      ],
    })
  }

  function rebuildTextures(w: number, h: number) {
    brightTex.destroy()
    blurHTex.destroy()
    blurVTex.destroy()
    const hw = Math.max(1, Math.floor(w / 2))
    const hh = Math.max(1, Math.floor(h / 2))
    brightTex = makeColorTexture(device, hw, hh)
    blurHTex = makeColorTexture(device, hw, hh)
    blurVTex = makeColorTexture(device, hw, hh)
  }

  return {
    render(encoder, sourceView, targetView, w, h, params) {
      if (w !== width || h !== height) {
        width = w
        height = h
        rebuildTextures(w, h)
      }

      const hw = Math.max(1, Math.floor(w / 2))
      const hh = Math.max(1, Math.floor(h / 2))

      // Pack params: threshold, strength, radius, texel size
      paramsData[0] = params.threshold
      paramsData[1] = params.strength
      paramsData[2] = params.radius
      paramsData[3] = 0
      paramsData[4] = 1 / hw
      paramsData[5] = 1 / hh
      paramsData[6] = 1 / w
      paramsData[7] = 1 / h
      device.queue.writeBuffer(paramsBuffer, 0, paramsData)

      if (!params.enabled) {
        runPass(encoder, blitPipeline, makeBlitBindGroup(sourceView), targetView, 'clear')
        return
      }

      // 1. Threshold: downsample + extract bright regions into brightTex
      runPass(encoder, thresholdPipeline, makeBindGroup(thresholdPipeline, sourceView), brightTex.createView(), 'clear')

      // 2. Horizontal blur: brightTex → blurHTex
      runPass(encoder, blurHPipeline, makeBindGroup(blurHPipeline, brightTex.createView()), blurHTex.createView(), 'clear')

      // 3. Vertical blur: blurHTex → blurVTex
      runPass(encoder, blurVPipeline, makeBindGroup(blurVPipeline, blurHTex.createView()), blurVTex.createView(), 'clear')

      // 4. Composite: source + blurVTex → canvas target
      runPass(encoder, compositePipeline, makeBindGroup(compositePipeline, sourceView, blurVTex.createView()), targetView, 'clear')
    },

    resize(w, h) {
      if (w !== width || h !== height) {
        width = w
        height = h
        rebuildTextures(w, h)
      }
    },

    dispose() {
      brightTex.destroy()
      blurHTex.destroy()
      blurVTex.destroy()
      paramsBuffer.destroy()
    },
  }
}

function makeColorTexture(device: GPUDevice, width: number, height: number): GPUTexture {
  return device.createTexture({
    size: { width, height },
    format: 'rgba16float',
    usage: GPU_TEXTURE_RENDER_ATTACHMENT | GPU_TEXTURE_TEXTURE_BINDING,
  })
}

function makeRenderPipeline(
  device: GPUDevice,
  module: GPUShaderModule,
  format: GPUTextureFormat,
  additiveBlend = false,
): GPURenderPipeline {
  return device.createRenderPipeline({
    layout: 'auto',
    vertex: { module, entryPoint: 'vsMain' },
    fragment: {
      module,
      entryPoint: 'fsMain',
      targets: [{
        format,
        blend: additiveBlend ? {
          color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
        } : undefined,
      }],
    },
    primitive: { topology: 'triangle-list' },
  })
}

function runPass(
  encoder: GPUCommandEncoder,
  pipeline: GPURenderPipeline,
  bindGroup: GPUBindGroup,
  target: GPUTextureView,
  loadOp: GPULoadOp,
) {
  const pass = encoder.beginRenderPass({
    colorAttachments: [{
      view: target,
      loadOp,
      storeOp: 'store',
      clearValue: { r: 0, g: 0, b: 0, a: 0 },
    }],
  })
  pass.setPipeline(pipeline)
  pass.setBindGroup(0, bindGroup)
  pass.draw(3)
  pass.end()
}

function fullscreenVert() {
  return /* wgsl */`
    struct VO { @builtin(position) pos: vec4<f32>, @location(0) uv: vec2<f32> }
    @vertex fn vsMain(@builtin(vertex_index) vi: u32) -> VO {
      var p = array<vec2<f32>,3>(vec2(-1.,-3.), vec2(-1.,1.), vec2(3.,1.));
      let pos = p[vi];
      var o: VO;
      o.pos = vec4(pos, 0., 1.);
      o.uv  = vec2(pos.x * 0.5 + 0.5, 0.5 - pos.y * 0.5);
      return o;
    }
  `
}

function thresholdShader() {
  return fullscreenVert() + /* wgsl */`
    @group(0) @binding(0) var src: texture_2d<f32>;
    @group(0) @binding(1) var smp: sampler;
    @group(0) @binding(2) var<uniform> bloom: BloomParams;

    struct BloomParams { threshold: f32, strength: f32, radius: f32, _pad: f32, texelH: vec4<f32> }

    @fragment fn fsMain(v: VO) -> @location(0) vec4<f32> {
      let c = textureSample(src, smp, v.uv);
      // Luminance-based soft threshold
      let lum = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      let knee = bloom.threshold * 0.5;
      let rq = clamp(lum - bloom.threshold + knee, 0., 2. * knee);
      let w = (rq * rq) / (4. * knee * knee + 0.00001);
      let mask = max(w, step(bloom.threshold, lum));
      return vec4(c.rgb * mask * c.a, c.a * mask);
    }
  `
}

function blurShader(horizontal: boolean) {
  const axis = horizontal ? 'vec2(bloom.texelH.x, 0.)' : 'vec2(0., bloom.texelH.y)'
  return fullscreenVert() + /* wgsl */`
    @group(0) @binding(0) var src: texture_2d<f32>;
    @group(0) @binding(1) var smp: sampler;
    @group(0) @binding(2) var<uniform> bloom: BloomParams;

    struct BloomParams { threshold: f32, strength: f32, radius: f32, _pad: f32, texelH: vec4<f32> }

    @fragment fn fsMain(v: VO) -> @location(0) vec4<f32> {
      let step = ${axis} * (1. + bloom.radius * 2.);
      // 9-tap gaussian weights
      let w0 = 0.2270270270;
      let w1 = 0.1945945946;
      let w2 = 0.1216216216;
      let w3 = 0.0540540541;
      let w4 = 0.0162162162;
      var col = textureSample(src, smp, v.uv) * w0;
      col += textureSample(src, smp, v.uv + step * 1.) * w1;
      col += textureSample(src, smp, v.uv - step * 1.) * w1;
      col += textureSample(src, smp, v.uv + step * 2.) * w2;
      col += textureSample(src, smp, v.uv - step * 2.) * w2;
      col += textureSample(src, smp, v.uv + step * 3.) * w3;
      col += textureSample(src, smp, v.uv - step * 3.) * w3;
      col += textureSample(src, smp, v.uv + step * 4.) * w4;
      col += textureSample(src, smp, v.uv - step * 4.) * w4;
      return col;
    }
  `
}

function blitShader() {
  return fullscreenVert() + /* wgsl */`
    @group(0) @binding(0) var src: texture_2d<f32>;
    @group(0) @binding(1) var smp: sampler;

    @fragment fn fsMain(v: VO) -> @location(0) vec4<f32> {
      let base = textureSample(src, smp, v.uv);
      let hdr = max(base.rgb, vec3(0.0));
      return vec4(pow(hdr, vec3(0.92)), clamp(base.a, 0.0, 1.0));
    }
  `
}

function compositeShader() {
  return fullscreenVert() + /* wgsl */`
    @group(0) @binding(0) var src: texture_2d<f32>;
    @group(0) @binding(1) var smp: sampler;
    @group(0) @binding(2) var<uniform> bloom: BloomParams;
    @group(0) @binding(3) var bloomTex: texture_2d<f32>;

    struct BloomParams { threshold: f32, strength: f32, radius: f32, _pad: f32, texelH: vec4<f32> }

    @fragment fn fsMain(v: VO) -> @location(0) vec4<f32> {
      let base = textureSample(src, smp, v.uv);
      let glow = textureSample(bloomTex, smp, v.uv);
      let hdr = max(base.rgb + max(glow.rgb, vec3(0.0)) * bloom.strength, vec3(0.0));
      let glowAlpha = clamp(glow.a * bloom.strength, 0.0, 1.0);
      let alpha = clamp(base.a + glowAlpha * (1.0 - base.a), 0.0, 1.0);
      return vec4(pow(hdr, vec3(0.92)), alpha);
    }
  `
}
