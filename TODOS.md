# Fenix TODOs

## Done In This Pass

- [x] Read `PRD.md` and aligned the first implementation pass to the required subsystem-first architecture.
- [x] Rewired the Vite starter entrypoint so the app boots through `src/app/` instead of a flat starter component.
- [x] Created the first modular editor shell across `app`, `ui`, `editor`, `engine`, and `features`.
- [x] Added an initial production-facing workspace layout with toolbar, project overview, viewport, node graph preview, inspector, and timeline surfaces.
- [x] Added editor bootstrap/state factories so UI state is assembled separately from engine/runtime modules.
- [x] Added engine-side simulation defaults, graph schema seeds, timing helpers, and a renderer bridge abstraction.
- [x] Added WebGPU capability probing so the viewport reports runtime readiness instead of pretending the engine exists.
- [x] Replaced the empty starter styling with a defined Fenix visual system and Tailwind-driven layout foundation.
- [x] Removed the fake sphere-based plume preview and replaced it with a real volumetric path: 3D field generation plus WebGPU raymarched volume rendering.
- [x] Added a first external editor store with command dispatch, React provider/hooks, and panel interactions for project naming, node selection, viewport shading, overlay toggles, and simulation profile selection.
- [x] Replaced the procedural texture generator with a dense simulation prototype made of explicit domain, field, emitter, force, combustion, advection, and pressure-solve modules.
- [x] Split simulation output from rendering upload through a dedicated volume-texture bridge so the WebGPU renderer consumes a stable frame interface instead of direct simulation internals.
- [x] Replaced the Three.js-owned viewport runtime with one raw WebGPU device that runs GPU compute simulation and direct volume raymarch rendering in the same frame graph.
- [x] Removed the CPU simulation loop and CPU readback/upload path from the active viewport runtime.
- [x] Split the active GPU solver into explicit source, velocity-advection, scalar-advection, divergence, pressure, and projection passes with separate density, temperature, fuel, and turbulence buffers.
- [x] Reworked pressure solving into a first multilevel GPU scaffold with fine/mid/coarse volumes, residual restriction, additive prolongation, and pre/post smoothing instead of a flat single-level iteration loop.
- [x] Moved divergence, residual, pressure smoothing, and projection stencils onto workgroup-local tiled kernels to reduce repeated global neighbor fetches.

## Next Up

- [ ] Add persistence and project serialization to the editor store boundary.
- [ ] Build the first node graph data model with editable nodes, connections, validation, and serialization.
- [ ] Expand the editor store into command history, persistence, and multi-panel selection coordination.
- [ ] Replace the current dense collocated velocity field with a MAC-grid layout and update advection/projection accordingly.
- [ ] Improve advection quality with higher-order or corrective advection instead of the current basic semi-Lagrangian path.
- [ ] Add vorticity confinement, better combustion shaping, and stronger smoke breakup so the plume stops reading like a soft torch.
- [ ] Improve the multilevel pressure path from a first scaffold into a stricter V-cycle with better residual/correction handling and profiling-driven iteration budgets.
- [ ] Add render-side empty-space skipping, step adaptation, and lighting/shadow quality upgrades for better visual density at lower raymarch cost.
- [ ] Introduce sparse brick allocation, active-brick tracking, and sparse-aware volume upload/rendering so the dense prototype can evolve toward EmberGen-class scale.
- [ ] Establish import aliases and testing strategy before the module graph gets wider.
