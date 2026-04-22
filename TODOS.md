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
- [x] Replaced the viewport placeholder with a real Three.js scene host, camera controls, resize lifecycle, and compatibility fallback path owned by engine runtime code.
- [x] Added a first external editor store with command dispatch, React provider/hooks, and panel interactions for project naming, node selection, viewport shading, overlay toggles, and simulation profile selection.

## Next Up

- [ ] Add persistence and project serialization to the editor store boundary.
- [ ] Build the first node graph data model with editable nodes, connections, validation, and serialization.
- [ ] Start the simulation compiler/runtime path with explicit domain config, scheduling, and GPU resource descriptors.
- [ ] Expand the editor store into command history, persistence, and multi-panel selection coordination.
- [ ] Replace the preview scene with actual simulation-driven render data and explicit renderer/runtime synchronization.
- [ ] Establish import aliases and testing strategy before the module graph gets wider.
