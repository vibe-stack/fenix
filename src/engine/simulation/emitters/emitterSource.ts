import type { ScalarEmitter } from './scalarEmitter'
import type { VelocityEmitter } from './velocityEmitter'
import type { IgniterEmitter } from './igniterEmitter'
import type { BurstEmitter } from './burstEmitter'

export type EmitterSource = ScalarEmitter | VelocityEmitter | BurstEmitter | IgniterEmitter

export type { ScalarEmitter, VelocityEmitter, BurstEmitter, IgniterEmitter }
