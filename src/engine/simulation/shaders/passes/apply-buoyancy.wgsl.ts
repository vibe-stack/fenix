import { WORKGROUP_SIZE } from '../../runtime/combustion-volume-simulation/constants'
import { ActiveBrickMaskWGSL } from '../common/active-brick-mask.wgsl'
import { ClampUtilsWGSL } from '../common/clamp-utils.wgsl'
import { IndexingWGSL } from '../common/indexing.wgsl'
import { SimulationParamsWGSL } from '../common/simulation-params.wgsl'
import { VolumeInfoWGSL } from '../common/volume-info.wgsl'
import { joinWGSL } from '../common/wgsl'

export function createApplyBuoyancyShader() {
  return joinWGSL([
    SimulationParamsWGSL,
    VolumeInfoWGSL,
    ActiveBrickMaskWGSL,
    /* wgsl */ `
@group(0) @binding(0) var<uniform> params: SimulationParams;
@group(0) @binding(1) var<uniform> volumeInfo: VolumeInfo;
@group(0) @binding(2) var<storage, read> densityField: array<f32>;
@group(0) @binding(3) var<storage, read> temperatureField: array<f32>;
@group(0) @binding(4) var<storage, read_write> velocityField: array<vec4<f32>>;
@group(0) @binding(5) var<storage, read> activeBrickFlags: array<u32>;
@group(0) @binding(6) var<uniform> brickInfo: BrickInfo;
`,
    IndexingWGSL,
    ClampUtilsWGSL,
    /* wgsl */ `
fn readTemperature(coord: vec3<u32>) -> f32 {
  return temperatureField[flatten(clampCoord(coord))];
}

fn readDensity(coord: vec3<u32>) -> f32 {
  return densityField[flatten(clampCoord(coord))];
}

@compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  if (!insideVolume(id)) {
    return;
  }

  if (!isActiveCoord(id)) {
    return;
  }

  let index = flatten(id);
  let dt = params.deltaTime;
  let buoyancyResponse = params.buoyancy * (1.0 + smoothstep(6.0, 24.0, abs(params.buoyancy)) * 0.38);
  let temperatureLift = temperatureField[index] * buoyancyResponse;
  let smokeWeight = densityField[index] * 0.45;
  let hotEntrainment = densityField[index] * smoothstep(0.06, 0.34, temperatureField[index]);
  let normalizedY = (f32(id.y) + 0.5) / f32(volumeInfo.height);
  let shear = sin(f32(id.y) * 0.073 + params.time * 0.9) * 0.35 +
    sin(f32(id.x) * 0.041 - f32(id.z) * 0.052 + params.time * 0.43) * 0.22;
  let windAmount = params.wind.w * (0.18 + densityField[index] * 0.55 + normalizedY * 0.45);
  let wind = params.wind.xyz * windAmount + vec3<f32>(-params.wind.z, 0.0, params.wind.x) * windAmount * shear;
  let temperatureGradient = vec3<f32>(
    readTemperature(vec3<u32>(inc(id.x, volumeInfo.width - 1u), id.y, id.z)) -
      readTemperature(vec3<u32>(dec(id.x), id.y, id.z)),
    readTemperature(vec3<u32>(id.x, inc(id.y, volumeInfo.height - 1u), id.z)) -
      readTemperature(vec3<u32>(id.x, dec(id.y), id.z)),
    readTemperature(vec3<u32>(id.x, id.y, inc(id.z, volumeInfo.depth - 1u))) -
      readTemperature(vec3<u32>(id.x, id.y, dec(id.z))),
  ) * 0.5;
  let densityGradient = vec3<f32>(
    readDensity(vec3<u32>(inc(id.x, volumeInfo.width - 1u), id.y, id.z)) -
      readDensity(vec3<u32>(dec(id.x), id.y, id.z)),
    readDensity(vec3<u32>(id.x, inc(id.y, volumeInfo.height - 1u), id.z)) -
      readDensity(vec3<u32>(id.x, dec(id.y), id.z)),
    readDensity(vec3<u32>(id.x, id.y, inc(id.z, volumeInfo.depth - 1u))) -
      readDensity(vec3<u32>(id.x, id.y, dec(id.z))),
  ) * 0.5;
  let densityGradientLength = max(length(densityGradient), 0.0001);
  let coldSmoke = densityField[index] * (1.0 - smoothstep(0.12, 0.72, temperatureField[index]));
  let surfaceBreakup = smoothstep(0.008, 0.06, densityGradientLength) * coldSmoke;
  let shredDirection = normalize(vec3<f32>(
    sin(f32(id.y) * 0.117 + params.time * 1.9),
    sin(f32(id.x) * 0.071 - f32(id.z) * 0.083 + params.time * 1.35) * 0.35,
    cos(f32(id.x) * 0.061 + f32(id.y) * 0.049 - params.time * 1.6),
  ));
  let collapseAmount = densityField[index] * (1.0 - smoothstep(0.16, 0.64, temperatureField[index]));
  var velocity = velocityField[index].xyz * (1.0 - dt * 0.08);

  velocity += wind * dt;
  velocity += temperatureGradient * collapseAmount * dt * (3.2 + abs(params.buoyancy) * 0.08);
  velocity += (-densityGradient / densityGradientLength) * surfaceBreakup * dt * 2.8;
  velocity += shredDirection * coldSmoke * dt * (0.72 + surfaceBreakup * 2.4);
  velocity += params.wind.xyz * coldSmoke * params.wind.w * dt * 0.9;
  let voxelSpeedLimit = 80.0 / max(params.dx, 0.001);
  velocity.y = clamp(
    velocity.y + (temperatureLift + hotEntrainment * buoyancyResponse * 0.24 - smokeWeight) * dt,
    -voxelSpeedLimit,
    voxelSpeedLimit,
  );

  if (id.x == 0u || id.x == volumeInfo.width - 1u || id.z == 0u || id.z == volumeInfo.depth - 1u) {
    velocity.x = 0.0;
    velocity.z = 0.0;
  }
  if (id.y == 0u) {
    velocity.y = max(velocity.y, 0.0);
  }

  velocityField[index] = vec4<f32>(velocity, 0.0);
}
`,
  ])
}
