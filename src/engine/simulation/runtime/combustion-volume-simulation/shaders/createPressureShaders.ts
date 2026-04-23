import { TILE_SIZE, WORKGROUP_SIZE } from '../constants'

export function createLocalDivergenceShader() {
  return /* wgsl */ `
    struct VolumeInfo {
      width: u32,
      height: u32,
      depth: u32,
      voxelCount: u32,
    }

    @group(0) @binding(0) var<uniform> volumeInfo: VolumeInfo;
    @group(0) @binding(1) var<storage, read> velocitySource: array<vec4<f32>>;
    @group(0) @binding(2) var<storage, read_write> divergenceTarget: array<f32>;
    var<workgroup> velocityTile: array<vec4<f32>, ${TILE_SIZE * TILE_SIZE * TILE_SIZE}>;

    fn flatten(coord: vec3<u32>) -> u32 {
      return coord.x + volumeInfo.width * (coord.y + volumeInfo.height * coord.z);
    }

    fn tileIndex(coord: vec3<u32>) -> u32 {
      return coord.x + ${TILE_SIZE}u * (coord.y + ${TILE_SIZE}u * coord.z);
    }

    fn readVelocity(coord: vec3<u32>) -> vec4<f32> {
      let clamped = vec3<u32>(
        clamp(coord.x, 0u, volumeInfo.width - 1u),
        clamp(coord.y, 0u, volumeInfo.height - 1u),
        clamp(coord.z, 0u, volumeInfo.depth - 1u),
      );
      return velocitySource[flatten(clamped)];
    }

    fn dec(value: u32) -> u32 {
      if (value == 0u) {
        return 0u;
      }

      return value - 1u;
    }

    fn inc(value: u32, maxValue: u32) -> u32 {
      return min(value + 1u, maxValue);
    }

    @compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
    fn main(
      @builtin(global_invocation_id) gid: vec3<u32>,
      @builtin(local_invocation_id) lid: vec3<u32>,
    ) {
      let maxCoord = vec3<u32>(volumeInfo.width - 1u, volumeInfo.height - 1u, volumeInfo.depth - 1u);
      let valid = gid.x < volumeInfo.width && gid.y < volumeInfo.height && gid.z < volumeInfo.depth;
      let sampleCoord = min(gid, maxCoord);

      let localCoord = lid + vec3<u32>(1u, 1u, 1u);
      velocityTile[tileIndex(localCoord)] = readVelocity(sampleCoord);

      if (lid.x == 0u) {
        velocityTile[tileIndex(localCoord - vec3<u32>(1u, 0u, 0u))] = readVelocity(vec3<u32>(dec(sampleCoord.x), sampleCoord.y, sampleCoord.z));
      }
      if (lid.x == ${WORKGROUP_SIZE - 1}u || gid.x + 1u >= volumeInfo.width) {
        velocityTile[tileIndex(localCoord + vec3<u32>(1u, 0u, 0u))] = readVelocity(vec3<u32>(inc(sampleCoord.x, volumeInfo.width - 1u), sampleCoord.y, sampleCoord.z));
      }
      if (lid.y == 0u) {
        velocityTile[tileIndex(localCoord - vec3<u32>(0u, 1u, 0u))] = readVelocity(vec3<u32>(sampleCoord.x, dec(sampleCoord.y), sampleCoord.z));
      }
      if (lid.y == ${WORKGROUP_SIZE - 1}u || gid.y + 1u >= volumeInfo.height) {
        velocityTile[tileIndex(localCoord + vec3<u32>(0u, 1u, 0u))] = readVelocity(vec3<u32>(sampleCoord.x, inc(sampleCoord.y, volumeInfo.height - 1u), sampleCoord.z));
      }
      if (lid.z == 0u) {
        velocityTile[tileIndex(localCoord - vec3<u32>(0u, 0u, 1u))] = readVelocity(vec3<u32>(sampleCoord.x, sampleCoord.y, dec(sampleCoord.z)));
      }
      if (lid.z == ${WORKGROUP_SIZE - 1}u || gid.z + 1u >= volumeInfo.depth) {
        velocityTile[tileIndex(localCoord + vec3<u32>(0u, 0u, 1u))] = readVelocity(vec3<u32>(sampleCoord.x, sampleCoord.y, inc(sampleCoord.z, volumeInfo.depth - 1u)));
      }

      workgroupBarrier();

      if (!valid) {
        return;
      }

      let index = flatten(gid);

      if (gid.x == 0u || gid.y == 0u || gid.z == 0u || gid.x == volumeInfo.width - 1u || gid.y == volumeInfo.height - 1u || gid.z == volumeInfo.depth - 1u) {
        divergenceTarget[index] = 0.0;
        return;
      }

      let divergenceX = velocityTile[tileIndex(localCoord + vec3<u32>(1u, 0u, 0u))].x - velocityTile[tileIndex(localCoord - vec3<u32>(1u, 0u, 0u))].x;
      let divergenceY = velocityTile[tileIndex(localCoord + vec3<u32>(0u, 1u, 0u))].y - velocityTile[tileIndex(localCoord - vec3<u32>(0u, 1u, 0u))].y;
      let divergenceZ = velocityTile[tileIndex(localCoord + vec3<u32>(0u, 0u, 1u))].z - velocityTile[tileIndex(localCoord - vec3<u32>(0u, 0u, 1u))].z;

      divergenceTarget[index] = (divergenceX + divergenceY + divergenceZ) * 0.5;
    }
  `
}

export function createLocalResidualShader() {
  return /* wgsl */ `
    struct VolumeInfo {
      width: u32,
      height: u32,
      depth: u32,
      voxelCount: u32,
    }

    @group(0) @binding(0) var<uniform> volumeInfo: VolumeInfo;
    @group(0) @binding(1) var<storage, read> divergenceSource: array<f32>;
    @group(0) @binding(2) var<storage, read> pressureSource: array<f32>;
    @group(0) @binding(3) var<storage, read_write> residualTarget: array<f32>;
    var<workgroup> pressureTile: array<f32, ${TILE_SIZE * TILE_SIZE * TILE_SIZE}>;

    fn flatten(coord: vec3<u32>) -> u32 {
      return coord.x + volumeInfo.width * (coord.y + volumeInfo.height * coord.z);
    }

    fn tileIndex(coord: vec3<u32>) -> u32 {
      return coord.x + ${TILE_SIZE}u * (coord.y + ${TILE_SIZE}u * coord.z);
    }

    fn readPressure(coord: vec3<u32>) -> f32 {
      let clamped = vec3<u32>(
        clamp(coord.x, 0u, volumeInfo.width - 1u),
        clamp(coord.y, 0u, volumeInfo.height - 1u),
        clamp(coord.z, 0u, volumeInfo.depth - 1u),
      );
      return pressureSource[flatten(clamped)];
    }

    fn dec(value: u32) -> u32 {
      if (value == 0u) {
        return 0u;
      }

      return value - 1u;
    }

    fn inc(value: u32, maxValue: u32) -> u32 {
      return min(value + 1u, maxValue);
    }

    @compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
    fn main(
      @builtin(global_invocation_id) gid: vec3<u32>,
      @builtin(local_invocation_id) lid: vec3<u32>,
    ) {
      let maxCoord = vec3<u32>(volumeInfo.width - 1u, volumeInfo.height - 1u, volumeInfo.depth - 1u);
      let valid = gid.x < volumeInfo.width && gid.y < volumeInfo.height && gid.z < volumeInfo.depth;
      let sampleCoord = min(gid, maxCoord);

      let localCoord = lid + vec3<u32>(1u, 1u, 1u);
      pressureTile[tileIndex(localCoord)] = readPressure(sampleCoord);

      if (lid.x == 0u) {
        pressureTile[tileIndex(localCoord - vec3<u32>(1u, 0u, 0u))] = readPressure(vec3<u32>(dec(sampleCoord.x), sampleCoord.y, sampleCoord.z));
      }
      if (lid.x == ${WORKGROUP_SIZE - 1}u || gid.x + 1u >= volumeInfo.width) {
        pressureTile[tileIndex(localCoord + vec3<u32>(1u, 0u, 0u))] = readPressure(vec3<u32>(inc(sampleCoord.x, volumeInfo.width - 1u), sampleCoord.y, sampleCoord.z));
      }
      if (lid.y == 0u) {
        pressureTile[tileIndex(localCoord - vec3<u32>(0u, 1u, 0u))] = readPressure(vec3<u32>(sampleCoord.x, dec(sampleCoord.y), sampleCoord.z));
      }
      if (lid.y == ${WORKGROUP_SIZE - 1}u || gid.y + 1u >= volumeInfo.height) {
        pressureTile[tileIndex(localCoord + vec3<u32>(0u, 1u, 0u))] = readPressure(vec3<u32>(sampleCoord.x, inc(sampleCoord.y, volumeInfo.height - 1u), sampleCoord.z));
      }
      if (lid.z == 0u) {
        pressureTile[tileIndex(localCoord - vec3<u32>(0u, 0u, 1u))] = readPressure(vec3<u32>(sampleCoord.x, sampleCoord.y, dec(sampleCoord.z)));
      }
      if (lid.z == ${WORKGROUP_SIZE - 1}u || gid.z + 1u >= volumeInfo.depth) {
        pressureTile[tileIndex(localCoord + vec3<u32>(0u, 0u, 1u))] = readPressure(vec3<u32>(sampleCoord.x, sampleCoord.y, inc(sampleCoord.z, volumeInfo.depth - 1u)));
      }

      workgroupBarrier();

      if (!valid) {
        return;
      }

      let index = flatten(gid);

      if (gid.x == 0u || gid.y == 0u || gid.z == 0u || gid.x == volumeInfo.width - 1u || gid.y == volumeInfo.height - 1u || gid.z == volumeInfo.depth - 1u) {
        residualTarget[index] = 0.0;
        return;
      }

      let neighborSum =
        pressureTile[tileIndex(localCoord + vec3<u32>(1u, 0u, 0u))] +
        pressureTile[tileIndex(localCoord - vec3<u32>(1u, 0u, 0u))] +
        pressureTile[tileIndex(localCoord + vec3<u32>(0u, 1u, 0u))] +
        pressureTile[tileIndex(localCoord - vec3<u32>(0u, 1u, 0u))] +
        pressureTile[tileIndex(localCoord + vec3<u32>(0u, 0u, 1u))] +
        pressureTile[tileIndex(localCoord - vec3<u32>(0u, 0u, 1u))];
      let laplacian = neighborSum - pressureTile[tileIndex(localCoord)] * 6.0;

      residualTarget[index] = divergenceSource[index] - laplacian;
    }
  `
}

export function createLocalPressureSmoothShader() {
  return /* wgsl */ `
    struct VolumeInfo {
      width: u32,
      height: u32,
      depth: u32,
      voxelCount: u32,
    }

    @group(0) @binding(0) var<uniform> volumeInfo: VolumeInfo;
    @group(0) @binding(1) var<storage, read> divergenceSource: array<f32>;
    @group(0) @binding(2) var<storage, read> pressureSource: array<f32>;
    @group(0) @binding(3) var<storage, read_write> pressureTarget: array<f32>;
    var<workgroup> pressureTile: array<f32, ${TILE_SIZE * TILE_SIZE * TILE_SIZE}>;

    fn flatten(coord: vec3<u32>) -> u32 {
      return coord.x + volumeInfo.width * (coord.y + volumeInfo.height * coord.z);
    }

    fn tileIndex(coord: vec3<u32>) -> u32 {
      return coord.x + ${TILE_SIZE}u * (coord.y + ${TILE_SIZE}u * coord.z);
    }

    fn readPressure(coord: vec3<u32>) -> f32 {
      let clamped = vec3<u32>(
        clamp(coord.x, 0u, volumeInfo.width - 1u),
        clamp(coord.y, 0u, volumeInfo.height - 1u),
        clamp(coord.z, 0u, volumeInfo.depth - 1u),
      );
      return pressureSource[flatten(clamped)];
    }

    fn dec(value: u32) -> u32 {
      if (value == 0u) {
        return 0u;
      }

      return value - 1u;
    }

    fn inc(value: u32, maxValue: u32) -> u32 {
      return min(value + 1u, maxValue);
    }

    @compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
    fn main(
      @builtin(global_invocation_id) gid: vec3<u32>,
      @builtin(local_invocation_id) lid: vec3<u32>,
    ) {
      let maxCoord = vec3<u32>(volumeInfo.width - 1u, volumeInfo.height - 1u, volumeInfo.depth - 1u);
      let valid = gid.x < volumeInfo.width && gid.y < volumeInfo.height && gid.z < volumeInfo.depth;
      let sampleCoord = min(gid, maxCoord);

      let localCoord = lid + vec3<u32>(1u, 1u, 1u);
      pressureTile[tileIndex(localCoord)] = readPressure(sampleCoord);

      if (lid.x == 0u) {
        pressureTile[tileIndex(localCoord - vec3<u32>(1u, 0u, 0u))] = readPressure(vec3<u32>(dec(sampleCoord.x), sampleCoord.y, sampleCoord.z));
      }
      if (lid.x == ${WORKGROUP_SIZE - 1}u || gid.x + 1u >= volumeInfo.width) {
        pressureTile[tileIndex(localCoord + vec3<u32>(1u, 0u, 0u))] = readPressure(vec3<u32>(inc(sampleCoord.x, volumeInfo.width - 1u), sampleCoord.y, sampleCoord.z));
      }
      if (lid.y == 0u) {
        pressureTile[tileIndex(localCoord - vec3<u32>(0u, 1u, 0u))] = readPressure(vec3<u32>(sampleCoord.x, dec(sampleCoord.y), sampleCoord.z));
      }
      if (lid.y == ${WORKGROUP_SIZE - 1}u || gid.y + 1u >= volumeInfo.height) {
        pressureTile[tileIndex(localCoord + vec3<u32>(0u, 1u, 0u))] = readPressure(vec3<u32>(sampleCoord.x, inc(sampleCoord.y, volumeInfo.height - 1u), sampleCoord.z));
      }
      if (lid.z == 0u) {
        pressureTile[tileIndex(localCoord - vec3<u32>(0u, 0u, 1u))] = readPressure(vec3<u32>(sampleCoord.x, sampleCoord.y, dec(sampleCoord.z)));
      }
      if (lid.z == ${WORKGROUP_SIZE - 1}u || gid.z + 1u >= volumeInfo.depth) {
        pressureTile[tileIndex(localCoord + vec3<u32>(0u, 0u, 1u))] = readPressure(vec3<u32>(sampleCoord.x, sampleCoord.y, inc(sampleCoord.z, volumeInfo.depth - 1u)));
      }

      workgroupBarrier();

      if (!valid) {
        return;
      }

      let index = flatten(gid);

      if (gid.x == 0u || gid.y == 0u || gid.z == 0u || gid.x == volumeInfo.width - 1u || gid.y == volumeInfo.height - 1u || gid.z == volumeInfo.depth - 1u) {
        pressureTarget[index] = 0.0;
        return;
      }

      let neighborSum =
        pressureTile[tileIndex(localCoord + vec3<u32>(1u, 0u, 0u))] +
        pressureTile[tileIndex(localCoord - vec3<u32>(1u, 0u, 0u))] +
        pressureTile[tileIndex(localCoord + vec3<u32>(0u, 1u, 0u))] +
        pressureTile[tileIndex(localCoord - vec3<u32>(0u, 1u, 0u))] +
        pressureTile[tileIndex(localCoord + vec3<u32>(0u, 0u, 1u))] +
        pressureTile[tileIndex(localCoord - vec3<u32>(0u, 0u, 1u))];

      pressureTarget[index] = (neighborSum - divergenceSource[index]) / 6.0;
    }
  `
}

export function createRestrictionShader() {
  return /* wgsl */ `
    struct VolumeInfo {
      width: u32,
      height: u32,
      depth: u32,
      voxelCount: u32,
    }

    @group(0) @binding(0) var<uniform> sourceInfo: VolumeInfo;
    @group(0) @binding(1) var<uniform> targetInfo: VolumeInfo;
    @group(0) @binding(2) var<storage, read> sourceBuffer: array<f32>;
    @group(0) @binding(3) var<storage, read_write> targetBuffer: array<f32>;

    fn sourceIndex(coord: vec3<u32>) -> u32 {
      return coord.x + sourceInfo.width * (coord.y + sourceInfo.height * coord.z);
    }

    fn targetIndex(coord: vec3<u32>) -> u32 {
      return coord.x + targetInfo.width * (coord.y + targetInfo.height * coord.z);
    }

    fn readSource(coord: vec3<u32>) -> f32 {
      let clamped = vec3<u32>(
        clamp(coord.x, 0u, sourceInfo.width - 1u),
        clamp(coord.y, 0u, sourceInfo.height - 1u),
        clamp(coord.z, 0u, sourceInfo.depth - 1u),
      );
      return sourceBuffer[sourceIndex(clamped)];
    }

    @compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
    fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
      if (gid.x >= targetInfo.width || gid.y >= targetInfo.height || gid.z >= targetInfo.depth) {
        return;
      }

      let index = targetIndex(gid);

      if (gid.x == 0u || gid.y == 0u || gid.z == 0u || gid.x == targetInfo.width - 1u || gid.y == targetInfo.height - 1u || gid.z == targetInfo.depth - 1u) {
        targetBuffer[index] = 0.0;
        return;
      }

      let base = gid * 2u;
      let sum =
        readSource(base + vec3<u32>(0u, 0u, 0u)) +
        readSource(base + vec3<u32>(1u, 0u, 0u)) +
        readSource(base + vec3<u32>(0u, 1u, 0u)) +
        readSource(base + vec3<u32>(1u, 1u, 0u)) +
        readSource(base + vec3<u32>(0u, 0u, 1u)) +
        readSource(base + vec3<u32>(1u, 0u, 1u)) +
        readSource(base + vec3<u32>(0u, 1u, 1u)) +
        readSource(base + vec3<u32>(1u, 1u, 1u));

      targetBuffer[index] = sum * 0.125;
    }
  `
}

export function createProlongationShader() {
  return /* wgsl */ `
    struct VolumeInfo {
      width: u32,
      height: u32,
      depth: u32,
      voxelCount: u32,
    }

    @group(0) @binding(0) var<uniform> coarseInfo: VolumeInfo;
    @group(0) @binding(1) var<uniform> fineInfo: VolumeInfo;
    @group(0) @binding(2) var<storage, read> coarsePressure: array<f32>;
    @group(0) @binding(3) var<storage, read_write> finePressure: array<f32>;

    fn coarseIndex(coord: vec3<u32>) -> u32 {
      return coord.x + coarseInfo.width * (coord.y + coarseInfo.height * coord.z);
    }

    fn fineIndex(coord: vec3<u32>) -> u32 {
      return coord.x + fineInfo.width * (coord.y + fineInfo.height * coord.z);
    }

    fn readCoarse(coord: vec3<u32>) -> f32 {
      let clamped = vec3<u32>(
        clamp(coord.x, 0u, coarseInfo.width - 1u),
        clamp(coord.y, 0u, coarseInfo.height - 1u),
        clamp(coord.z, 0u, coarseInfo.depth - 1u),
      );
      return coarsePressure[coarseIndex(clamped)];
    }

    fn sampleCoarse(position: vec3<f32>) -> f32 {
      let maxPosition = vec3<f32>(vec3<u32>(coarseInfo.width - 1u, coarseInfo.height - 1u, coarseInfo.depth - 1u));
      let clamped = clamp(position, vec3<f32>(0.0), maxPosition);
      let base = vec3<u32>(floor(clamped));
      let upper = min(base + vec3<u32>(1u), vec3<u32>(maxPosition));
      let fraction = fract(clamped);
      let c000 = readCoarse(base);
      let c100 = readCoarse(vec3<u32>(upper.x, base.y, base.z));
      let c010 = readCoarse(vec3<u32>(base.x, upper.y, base.z));
      let c110 = readCoarse(vec3<u32>(upper.x, upper.y, base.z));
      let c001 = readCoarse(vec3<u32>(base.x, base.y, upper.z));
      let c101 = readCoarse(vec3<u32>(upper.x, base.y, upper.z));
      let c011 = readCoarse(vec3<u32>(base.x, upper.y, upper.z));
      let c111 = readCoarse(upper);
      let x00 = mix(c000, c100, fraction.x);
      let x10 = mix(c010, c110, fraction.x);
      let x01 = mix(c001, c101, fraction.x);
      let x11 = mix(c011, c111, fraction.x);
      return mix(mix(x00, x10, fraction.y), mix(x01, x11, fraction.y), fraction.z);
    }

    @compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
    fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
      if (gid.x >= fineInfo.width || gid.y >= fineInfo.height || gid.z >= fineInfo.depth) {
        return;
      }

      let index = fineIndex(gid);

      if (gid.x == 0u || gid.y == 0u || gid.z == 0u || gid.x == fineInfo.width - 1u || gid.y == fineInfo.height - 1u || gid.z == fineInfo.depth - 1u) {
        finePressure[index] = 0.0;
        return;
      }

      let coarsePosition = (vec3<f32>(gid) + vec3<f32>(0.5)) * 0.5 - vec3<f32>(0.5);
      finePressure[index] += sampleCoarse(coarsePosition);
    }
  `
}

export function createLocalProjectionShader() {
  return /* wgsl */ `
    struct VolumeInfo {
      width: u32,
      height: u32,
      depth: u32,
      voxelCount: u32,
    }

    @group(0) @binding(0) var<uniform> volumeInfo: VolumeInfo;
    @group(0) @binding(1) var<storage, read> velocitySource: array<vec4<f32>>;
    @group(0) @binding(2) var<storage, read> pressureSource: array<f32>;
    @group(0) @binding(3) var<storage, read_write> velocityTarget: array<vec4<f32>>;
    var<workgroup> pressureTile: array<f32, ${TILE_SIZE * TILE_SIZE * TILE_SIZE}>;

    fn flatten(coord: vec3<u32>) -> u32 {
      return coord.x + volumeInfo.width * (coord.y + volumeInfo.height * coord.z);
    }

    fn tileIndex(coord: vec3<u32>) -> u32 {
      return coord.x + ${TILE_SIZE}u * (coord.y + ${TILE_SIZE}u * coord.z);
    }

    fn readPressure(coord: vec3<u32>) -> f32 {
      let clamped = vec3<u32>(
        clamp(coord.x, 0u, volumeInfo.width - 1u),
        clamp(coord.y, 0u, volumeInfo.height - 1u),
        clamp(coord.z, 0u, volumeInfo.depth - 1u),
      );
      return pressureSource[flatten(clamped)];
    }

    fn dec(value: u32) -> u32 {
      if (value == 0u) {
        return 0u;
      }

      return value - 1u;
    }

    fn inc(value: u32, maxValue: u32) -> u32 {
      return min(value + 1u, maxValue);
    }

    @compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
    fn main(
      @builtin(global_invocation_id) gid: vec3<u32>,
      @builtin(local_invocation_id) lid: vec3<u32>,
    ) {
      let maxCoord = vec3<u32>(volumeInfo.width - 1u, volumeInfo.height - 1u, volumeInfo.depth - 1u);
      let valid = gid.x < volumeInfo.width && gid.y < volumeInfo.height && gid.z < volumeInfo.depth;
      let sampleCoord = min(gid, maxCoord);

      let localCoord = lid + vec3<u32>(1u, 1u, 1u);
      pressureTile[tileIndex(localCoord)] = readPressure(sampleCoord);

      if (lid.x == 0u) {
        pressureTile[tileIndex(localCoord - vec3<u32>(1u, 0u, 0u))] = readPressure(vec3<u32>(dec(sampleCoord.x), sampleCoord.y, sampleCoord.z));
      }
      if (lid.x == ${WORKGROUP_SIZE - 1}u || gid.x + 1u >= volumeInfo.width) {
        pressureTile[tileIndex(localCoord + vec3<u32>(1u, 0u, 0u))] = readPressure(vec3<u32>(inc(sampleCoord.x, volumeInfo.width - 1u), sampleCoord.y, sampleCoord.z));
      }
      if (lid.y == 0u) {
        pressureTile[tileIndex(localCoord - vec3<u32>(0u, 1u, 0u))] = readPressure(vec3<u32>(sampleCoord.x, dec(sampleCoord.y), sampleCoord.z));
      }
      if (lid.y == ${WORKGROUP_SIZE - 1}u || gid.y + 1u >= volumeInfo.height) {
        pressureTile[tileIndex(localCoord + vec3<u32>(0u, 1u, 0u))] = readPressure(vec3<u32>(sampleCoord.x, inc(sampleCoord.y, volumeInfo.height - 1u), sampleCoord.z));
      }
      if (lid.z == 0u) {
        pressureTile[tileIndex(localCoord - vec3<u32>(0u, 0u, 1u))] = readPressure(vec3<u32>(sampleCoord.x, sampleCoord.y, dec(sampleCoord.z)));
      }
      if (lid.z == ${WORKGROUP_SIZE - 1}u || gid.z + 1u >= volumeInfo.depth) {
        pressureTile[tileIndex(localCoord + vec3<u32>(0u, 0u, 1u))] = readPressure(vec3<u32>(sampleCoord.x, sampleCoord.y, inc(sampleCoord.z, volumeInfo.depth - 1u)));
      }

      workgroupBarrier();

      if (!valid) {
        return;
      }

      let index = flatten(gid);

      if (gid.x == 0u || gid.y == 0u || gid.z == 0u || gid.x == volumeInfo.width - 1u || gid.y == volumeInfo.height - 1u || gid.z == volumeInfo.depth - 1u) {
        velocityTarget[index] = vec4<f32>(0.0);
        return;
      }

      var velocity = velocitySource[index].xyz;
      let gradientX = pressureTile[tileIndex(localCoord + vec3<u32>(1u, 0u, 0u))] - pressureTile[tileIndex(localCoord - vec3<u32>(1u, 0u, 0u))];
      let gradientY = pressureTile[tileIndex(localCoord + vec3<u32>(0u, 1u, 0u))] - pressureTile[tileIndex(localCoord - vec3<u32>(0u, 1u, 0u))];
      let gradientZ = pressureTile[tileIndex(localCoord + vec3<u32>(0u, 0u, 1u))] - pressureTile[tileIndex(localCoord - vec3<u32>(0u, 0u, 1u))];

      velocity -= vec3<f32>(gradientX, gradientY, gradientZ) * 0.5;
      velocityTarget[index] = vec4<f32>(velocity, 0.0);
    }
  `
}
