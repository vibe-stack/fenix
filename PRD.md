PRD: Browser-Based EmberGen-Class Volumetric Fluid Engine

You are building a production-grade browser-based volumetric fluid simulation engine and editor from a clean Vite + React + TypeScript starter.

This is not a shader demo, toy experiment, or isolated rendering prototype.
This must evolve into a full modular product with a maintainable architecture, clear subsystem boundaries, scalable file organization, and a professional editor UI.

The end goal is a system that can rival EmberGen in architecture direction, meaning:

real-time GPU volumetric simulation
sparse active voxel simulation
high-performance rendering
modular node-based authoring
interactive editor workflows
future export pipeline support
designed to scale over a long development horizon

This project must be implemented in a way that remains clean and extensible as features grow.
Do not collapse everything into a few large files.
Do not mix UI code with simulation code.
Do not couple editor state to low-level GPU runtime logic.

1. Tech Stack Assumptions

Base project:

Vite
React
TypeScript

UI layer:

React
Tailwind CSS

Rendering / GPU:

Three.js with WebGPU
use Three.js as the outer rendering/editor shell
the heavy simulation architecture must remain modular enough that low-level GPU internals can evolve independently from the React UI

State / architecture principles:

UI/editor state should be separate from simulation runtime state
simulation code should be usable without React
rendering code should not depend on React component lifecycle for core execution logic
2. Product Goal

Build a modular system with the following major layers:

Editor UI Layer
Authoring / Graph Layer
Simulation Compiler Layer
GPU Simulation Runtime
Volumetric Renderer
Asset / Export Pipeline
Shared Core Utilities / Math / Types

Each layer must have a clear responsibility and a clean file structure.

3. Non-Negotiable Architecture Rules
3.1 Separation of concerns

Keep these concerns separate:

React UI
editor application state
graph definitions
GPU resource management
simulation execution
rendering
serialization / persistence
exports
3.2 Modular file structure

Organize code into subsystem-first folders, not random utility sprawl.

3.3 Long-horizon maintainability

This codebase must be built for many future iterations.
Prefer extensibility, composability, and clear interfaces over quick hacks.

3.4 Simulation is not UI

The fluid engine must be architected like an engine/runtime, not like a React app.

3.5 Rendering is not simulation

Simulation and rendering must remain distinct systems.

3.6 Start from correct architecture early

Even early prototype phases must respect the long-term module boundaries.
Do not write a throwaway dense-grid demo directly in page components.

4. Required High-Level File Structure

Use this as the target structure and follow it consistently.

src/
  app/
    App.tsx
    main.tsx
    providers/
    routes/
    layout/

  ui/
    components/
      common/
      panels/
      toolbar/
      viewport/
      node-editor/
      timeline/
      inspectors/
    hooks/
    theme/
    styles/

  editor/
    state/
      app/
      viewport/
      selection/
      graph/
      simulation/
      project/
    commands/
    tools/
    services/
    models/

  engine/
    core/
      types/
      math/
      utils/
      events/
      time/
      ids/
    scene/
      camera/
      controls/
      lighting/
      debug/
    render/
      renderer/
      materials/
      passes/
      volumetrics/
      helpers/
    gpu/
      context/
      buffers/
      textures/
      pipelines/
      bindings/
      allocators/
      readback/
    simulation/
      common/
      config/
      compiler/
      runtime/
      scheduling/
      domain/
      sparse/
      dense/
      fields/
      solvers/
      forces/
      combustion/
      particles/
      emitters/
      colliders/
      caching/
    graph/
      schema/
      nodes/
      execution/
      validation/
      serialization/
    assets/
      loaders/
      importers/
      caches/
      registry/
    export/
      flipbooks/
      vdb/
      images/
      sequences/
      serialization/

  features/
    project-browser/
    viewport/
    node-graph/
    simulation-controls/
    render-controls/
    inspector/
    asset-browser/
    export-panel/

  store/
    app-store/
    editor-store/
    ui-store/

  lib/
    three/
    webgpu/
    react/
    tailwind/
    serialization/

  workers/
    optional/

  test/
    unit/
    integration/
    gpu/
5. Folder Responsibility Rules
app/

Application bootstrap only.

Contains:

root app
providers
layout
route composition

Must not contain fluid engine logic.

ui/

Pure reusable React/Tailwind UI.

Contains:

buttons
panels
layout components
inspector controls
toolbar widgets
node editor UI shells

Must not directly contain simulation logic.

editor/

Editor-specific behavior and state orchestration.

Contains:

selection state
active tool state
panel state
user commands
undo/redo foundations
project lifecycle
editor services

This is the bridge between UI and engine.

engine/

The actual product core.

This is where the serious architecture lives.

engine/core/

Shared engine-level primitives:

IDs
events
math
utilities
timing
base interfaces
engine/gpu/

Low-level GPU abstraction layer:

device/context setup
GPU buffers
textures
bind groups
pipeline builders
allocators
indirect dispatch support
engine/simulation/

Main fluid simulation system.

Must be split into meaningful modules:

config
compiler
runtime
sparse domain
field storage
pressure solver
forces
combustion
particles
emitters
colliders
engine/render/

Volumetric rendering system.

Separate from simulation.
Consumes simulation fields and visualizes them.

engine/graph/

Node graph schema and runtime graph logic.

Graph definitions should not live inside React components.

engine/assets/

Asset management for imported meshes, textures, etc.

engine/export/

Export pipeline and future cache/output systems.

features/

Feature-assembled UI modules.

Example:

viewport feature
node graph feature
export feature

These compose ui/, editor/, and engine/ pieces into actual product features.

store/

Top-level app/editor stores only if needed.

Do not let this turn into a dumping ground.

lib/

Small adapters/wrappers around third-party libraries.

Use this to isolate:

Three.js-specific helpers
WebGPU-specific wrappers
serialization helpers
6. Required Architectural Boundaries
Boundary A: React UI vs Engine Runtime

The engine must be callable from outside React.

Bad:

simulation created directly inside React components
GPU resources owned by component render flow

Good:

React mounts a viewport/editor shell
editor services create and manage engine instances
components subscribe to state and invoke commands
Boundary B: Graph Definitions vs UI Graph Editor

The graph editor UI is not the graph model.

Need:

graph schema
graph node registry
graph validation
graph serialization
graph compilation path

Separate from:

node cards
handles
drag UI
inspector widgets
Boundary C: GPU Abstractions vs Simulation Logic

Do not scatter raw WebGPU resource handling across simulation modules.

Need:

reusable GPU context layer
buffer/texture creation helpers
pipeline management
bind group construction utilities
dispatch helpers

Simulation systems consume these abstractions cleanly.

Boundary D: Sparse Domain vs Solver Logic

Sparse brick/page-table logic should be isolated from individual solver passes where possible.

7. Required Initial Subsystems

Implement from the beginning with these top-level subsystems, even if the first versions are minimal.

7.1 Viewport subsystem
Three.js WebGPU viewport
orbit or editor camera
render loop integration
debug overlays
7.2 Simulation runtime subsystem
simulation tick/update entry point
pass scheduling
field storage
injection flow
solver pass chain
7.3 GPU resource subsystem
buffer allocation
texture allocation
pipeline creation
lifecycle management
7.4 Graph subsystem
minimal graph schema
simulation node definitions
serialization format
graph-to-runtime compile path
7.5 Editor state subsystem
selected node
selected object
active viewport tool
current project settings
simulation play/pause/reset
7.6 Inspector subsystem
editable properties for simulation/render settings
node property editing
source/emitter editing
8. Simulation Architecture Requirements

The fluid engine must be designed to evolve toward:

sparse active voxel simulation
brick-based domain management
GPU-driven scheduling
low CPU overhead
future high-performance pressure solving
future particles + combustion + export

Even if early phases begin with a dense prototype for correctness, the code structure must already anticipate:

dense/
sparse/
fields/
solvers/
runtime/
compiler/

Do not place all simulation code into one monolithic “fluid.ts”.

9. Rendering Architecture Requirements

The rendering system must be its own subsystem.

Structure it to support:

preview rendering
future higher-quality rendering
debug visualization of fields
sparse volume rendering later
proxy volume rendering
lighting evolution later

Recommended internal structure:

engine/render/
  renderer/
  passes/
  volumetrics/
  debug/
  lighting/
  compositing/

The volumetric renderer must consume simulation outputs through a clear interface, not reach into random simulation internals.

10. Code Organization Requirements
10.1 Every subsystem needs:
types
interfaces
implementation files
clear public entry points
10.2 Avoid giant files

If a file becomes too broad in responsibility, split it.

10.3 Use index files carefully

Use barrel exports where they improve clarity, not to hide messy structure.

10.4 Favor explicit naming

Use names like:

SparseBrickPool
SimulationScheduler
PressureSolvePass
VolumeRaymarchPass
GraphCompiler
GpuBufferAllocator

Avoid vague names like:

manager
helper
stuff
misc
11. UI Requirements

UI is built with React + Tailwind.

Must support a professional editor layout with panels such as:

viewport
node graph
inspector
simulation controls
render settings
asset/project panels

The UI should be modular and panel-driven.

Recommended concept:

resizable editor shell
left/right/bottom panel regions
central viewport
graph panel
inspector panel
toolbar/header controls

UI styling should stay clean and modern, but functionality and architecture matter more than visual polish in early phases.

12. Development Sequence

Build in phases, but keep the final architecture in mind from the beginning.

Phase 1 — Foundation
app shell
editor layout
viewport integration
engine bootstrap
GPU context foundation
minimal simulation runtime scaffolding
minimal graph schema
project structure fully in place
Phase 2 — Dense Prototype
bounded dense voxel domain
basic inject/advection/pressure pipeline
basic raymarch preview
inspector controls
Phase 3 — Modular Runtime Refinement
pass scheduler
better field abstractions
debug tools
graph compilation pipeline
proper engine/editor separation cleanup
Phase 4 — Sparse Domain Introduction
brick/page-table design
active brick tracking
sparse resource layout
sparse runtime path
Phase 5 — Rendering Upgrade
sparse-aware volumetric rendering
adaptive stepping
empty-space skipping
preview vs quality modes
Phase 6 — Advanced Systems
combustion
particles
emitters/colliders
caching foundations
exports
13. Deliverable Expectations for Each Iteration

For every implementation step:

Update or preserve architecture consistency
Keep files modular
Avoid regressions in folder responsibility
Prefer clean interfaces over shortcuts
Document key subsystem entry points
Leave the system in a runnable state

When adding a feature:

place it in the correct subsystem
expose it through clean APIs
integrate it with editor/UI only through proper boundaries
14. Things to Avoid

Do not:

put simulation logic inside React components
create one giant engine file
tie GPU runtime lifecycle to arbitrary component re-renders
mix graph UI data structures with runtime graph schema
use any everywhere
build a demo-first architecture that cannot scale
make shortcuts that destroy sparse-upgrade potential later
15. Initial Directory Creation Requirement

Start by creating the project structure properly before implementing deep functionality.

First establish:

folders
public entry points
base types/interfaces
engine bootstrap flow
editor bootstrap flow
viewport shell
minimal stores/services
simulation runtime skeleton
render runtime skeleton
graph schema skeleton

Then iterate feature by feature inside that structure.

16. Immediate First Task

Your first concrete implementation goal is:

Set up the file structure above
Build a basic React + Tailwind editor shell
Add a central Three.js WebGPU viewport integration point
Create engine bootstrap modules
Create simulation runtime scaffolding
Create render subsystem scaffolding
Create graph subsystem scaffolding
Ensure the app runs cleanly with a modular foundation

After that, begin dense prototype simulation implementation inside the established architecture, not outside it.

17. Final Standard

At all times, build this like a real editor and engine product, not like an experimental graphics repo.

The final system should feel like:

a modular engine core
a clean React/Tailwind editor
a scalable GPU simulation architecture
a foundation capable of eventually rivaling EmberGen in architecture and capability