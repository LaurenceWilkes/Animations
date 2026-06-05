const WORKGROUP_SIZE = 8;

const canvas = document.querySelector("canvas");
canvas.addEventListener("contextmenu", (event) => { event.preventDefault(); });
const rect = canvas.getBoundingClientRect();

const DPR = Math.min(2, window.devicePixelRatio || 1);
canvas.width = Math.floor(canvas.clientWidth * DPR);
canvas.height = Math.floor(canvas.clientHeight * DPR);

// Parameters
const blocks = 360000; // has to have lots of factors
const C = 250.0;       // wave speed

// Determine vertical and horizontal blocks
// Should be roughly square on any aspect ratio
let NW = Math.floor(Math.sqrt(blocks * canvas.width / canvas.height)); // Number of horizontal blocks
let NH = Math.floor(NW * canvas.height / canvas.width);                // Number of vertical blocks
let dx = canvas.width / NW;
let dy = canvas.height / NH;

////////////////////
const dt = 0.45 / (C * Math.sqrt(1 / (dx * dx) + 1 / (dy * dy)));
console.log("Timestep: " + dt);

//const dt     = 1/200;  // Simulated time-step

//const DAMP   = Math.exp(-K * dt * 0.5);
////////////////////


if (!navigator.gpu) { throw new Error("WebGPU not supported on this browser."); }
const adapter = await navigator.gpu.requestAdapter();
if (!adapter) { throw new Error("No appropriate GPUAdapter found."); }
const device = await adapter.requestDevice();

const context = canvas.getContext("webgpu");
const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
context.configure({
  device: device,        // Needs to be configured with the device
  format: canvasFormat,  // and the texture formate the canvas will use
});

const vertices = new Float32Array([
//   X,    Y,
  -1.0, -1.0, // Triangle 1
   1.0, -1.0,
   1.0,  1.0,

  -1.0, -1.0, // Triangle 2
   1.0,  1.0,
  -1.0,  1.0,
]);

const vertexBuffer = device.createBuffer({
  label: "Cell vertices",
  size: vertices.byteLength,
  usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(vertexBuffer, /*bufferOffset=*/0, vertices);

const vertexBufferLayout = {
  arrayStride: 8, // the number of bytes the GPU needs to skip forward in the buffer when it's looking for the next vertex
  attributes: [{
    format: "float32x2",
    offset: 0,
    shaderLocation: 0, // Position from 0 to 15
  }],
};

const renderBindGroupLayout = device.createBindGroupLayout({
  label: "Render Bind Group Layout",
  entries: [{
    binding: 0,
    visibility: GPUShaderStage.VERTEX,
    buffer: { type: "uniform" }, // grid
  }, {
    binding: 1,
    visibility: GPUShaderStage.VERTEX,
    buffer: { type: "read-only-storage" }, // h for rendering
  }],
});

const computeBindGroupLayout = device.createBindGroupLayout({
  label: "Compute Bind Group Layout",
  entries: [{
    binding: 0,
    visibility: GPUShaderStage.COMPUTE,
    buffer: { type: "uniform" }, // grid
  }, {
    binding: 1,
    visibility: GPUShaderStage.COMPUTE,
    buffer: { type: "uniform" }, // params
  }, {
    binding: 2,
    visibility: GPUShaderStage.COMPUTE,
    buffer: { type: "storage" }, // h current
  }, {
    binding: 3,
    visibility: GPUShaderStage.COMPUTE,
    buffer: { type: "storage" }, // h old
  }, {
    binding: 4,
    visibility: GPUShaderStage.COMPUTE,
    buffer: { type: "storage" }, // h new
  }, {
    binding: 5,
    visibility: GPUShaderStage.COMPUTE,
    buffer: { type: "uniform" }, // impulse
  }],
});

const bindGroupLayout = device.createBindGroupLayout({
  label: "Cell Bind Group Layout",
  entries: [{
    binding: 0,
    visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
    buffer: { type: "uniform" } // Grid uniform buffer
  }, {
    binding: 1,
    visibility: GPUShaderStage.COMPUTE,
    buffer: { type: "uniform" } // Param uniform buffer
  }, {
    binding: 2,
    visibility: GPUShaderStage.VERTEX,
    buffer: { type: "read-only-storage"} // h buffer for rendering
  }, {
    binding: 3,
    visibility: GPUShaderStage.COMPUTE,
    buffer: { type: "storage"} // h current
  }, {
    binding: 4,
    visibility: GPUShaderStage.COMPUTE,
    buffer: { type: "storage"} // h old
  }, {
    binding: 5,
    visibility: GPUShaderStage.COMPUTE,
    buffer: { type: "storage"} // h new
  }, {
    binding: 6,
    visibility: GPUShaderStage.COMPUTE,
    buffer: { type: "uniform" } // impulse uniform buffer
  }]
});

const renderPipelineLayout = device.createPipelineLayout({
  label: "Render Pipeline Layout",
  bindGroupLayouts: [renderBindGroupLayout],
});

const computePipelineLayout = device.createPipelineLayout({
  label: "Compute Pipeline Layout",
  bindGroupLayouts: [computeBindGroupLayout],
});

const cellShaderModule = device.createShaderModule({
  label: "Cell shader",
  code: `
    struct VertexInput {
      @location(0) pos: vec2f,
      @builtin(instance_index) i: u32,
    };

    struct VertexOutput {
      @builtin(position) pos: vec4f,
      @location(0) uv: vec2f,
      @location(1) c00: vec3f,
      @location(2) c01: vec3f,
      @location(3) c10: vec3f,
      @location(4) c11: vec3f,
    };

    struct FragmentInput {
      @location(0) uv: vec2f,
      @location(1) c00: vec3f,
      @location(2) c01: vec3f,
      @location(3) c10: vec3f,
      @location(4) c11: vec3f,
    };

    @group(0) @binding(0) var<uniform> grid: vec2u;
    @group(0) @binding(1) var<storage, read> h: array<f32>;

    fn getCol(i: u32) -> vec3f {
      let x = i % grid.x;
      let y = i / grid.x;
      let hval = h[i];
      let hL = select(hval, h[i - 1], x > 0);
      let hR = select(hval, h[i + 1], x < grid.x - 1u);
      let hU = select(hval, h[i - grid.x], y > 0);
      let hD = select(hval, h[i + grid.x], y < grid.y - 1u);

      let scaleDiff = 8.0;
      let normDir = normalize(vec3f(
        -scaleDiff * (hR - hL) / 2.0,
        -scaleDiff * (hD - hU) / 2.0,
        1.0
      ));

      let lightDir = normalize(vec3f(0.3, -0.3, 0.99));
      let dotNL = dot(normDir, lightDir);
      let diffAng = max(0, dotNL);

      let rz = 2 * dotNL * normDir.z - lightDir.z;
      let spec = pow(max(0, rz), 30);

      return vec3f(
        clamp(spec, 0, 1),
        clamp(spec, 0, 1),
        clamp(spec, 0, 1),
      );
    }

    @vertex
    fn vertexMain(input: VertexInput) -> VertexOutput {
      let x = input.i % grid.x;
      let y = input.i / grid.x;
      let cell = vec2f(f32(x), f32(y));

      let i00 = input.i;
      let i10 = select(input.i, input.i + 1, x < grid.x - 1u);
      let i01 = select(input.i, input.i + grid.x, y < grid.y - 1u);
      let i11 = select(i01, i01 + 1, x < grid.x - 1u);

      let gridf = vec2f(f32(grid.x), f32(grid.y));
      let cellOffset = cell / gridf * 2;
      let gridPos = (input.pos + 1) / gridf - 1 + cellOffset;

      var output: VertexOutput;
      output.uv = (input.pos+ 1.0) * 0.5;
      output.c00 = getCol(i00);
      output.c01 = getCol(i01);
      output.c10 = getCol(i10);
      output.c11 = getCol(i11);
      output.pos = vec4f(gridPos, 0, 1);
      return output;
    }

    @fragment
    fn fragmentMain(f: FragmentInput) -> @location(0) vec4f {
//      let col = f.c00;
      let col = (1 - f.uv.x) * ((1 - f.uv.y) * f.c00 + f.uv.y * f.c01)
              + f.uv.x * ((1 - f.uv.y) * f.c10 + f.uv.y * f.c11);
      return vec4f(col, 1);
    }
  `
});

const cellPipeline = device.createRenderPipeline({
  label: "Cell pipeline",
  layout: renderPipelineLayout,
  vertex: {
    module: cellShaderModule,
    entryPoint: "vertexMain",
    buffers: [vertexBufferLayout]
  },
  fragment: {
    module: cellShaderModule,
    entryPoint: "fragmentMain",
    targets: [{ format: canvasFormat }]
  }
});

const simulationShaderModule = device.createShaderModule({
  label: "Simulation shader",
  code: `
    struct Params {
      dt: f32,
      dx: f32,
      dy: f32,
      C: f32,
    };

    @group(0) @binding(0) var<uniform> grid: vec2u;
    @group(0) @binding(1) var<uniform> p: Params;

    @group(0) @binding(2) var<storage, read_write> hCur: array<f32>;
    @group(0) @binding(3) var<storage, read_write> hOld: array<f32>;
    @group(0) @binding(4) var<storage, read_write> hNew: array<f32>;

    @group(0) @binding(5) var<uniform> impulse: vec2f;

    fn id(i: u32, j: u32) -> u32 {
      return i + j * grid.x;
    }

    @compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
    fn applyImpulse(@builtin(global_invocation_id) gid: vec3u) {
      if (gid.x >= grid.x || gid.y >= grid.y) { return; }
      let radius: f32 = 28.0 / p.dx;
      let strength: f32 = 0.4;
      let gx = f32(gid.x);
      let gy = f32(gid.y);
      let dx = gx - impulse.x;
      let dy = gy - impulse.y;
      let sigma = radius * 0.25;
      let w = exp(-(dx * dx + dy * dy) / (2.0 * sigma * sigma));
      hCur[id(gid.x, gid.y)] += strength * w;
      hOld[id(gid.x, gid.y)] += strength * w;
    }

    @compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
    fn stepWave(@builtin(global_invocation_id) gid: vec3u) {
      if (gid.x >= grid.x || gid.y >= grid.y) { return; }

      let i = gid.x;
      let j = gid.y;
      let idc = id(i, j);

      if (i == 0u || j == 0u || i == grid.x - 1u || j == grid.y - 1u) {
        hNew[idc] = 0.0;
        return;
      }

      let uC = hCur[idc];
      let uL = hCur[id(i - 1u, j)];
      let uR = hCur[id(i + 1u, j)];
      let uD = hCur[id(i, j - 1u)];
      let uU = hCur[id(i, j + 1u)];

      let lap =
          (uR - 2.0 * uC + uL) / (p.dx * p.dx) +
          (uU - 2.0 * uC + uD) / (p.dy * p.dy);

      let c2dt2 = p.C * p.C * p.dt * p.dt;

      hNew[idc] = 2.0 * uC - hOld[idc] + c2dt2 * lap;
    }

  `
});

function makeComputePipeline(entryPoint) {
  return device.createComputePipeline({
    layout: computePipelineLayout,
    compute: {
      module: simulationShaderModule,
      entryPoint,
    },
  });
}
const stepWavePipeline = makeComputePipeline("stepWave");
const applyImpulsePipeline = makeComputePipeline("applyImpulse");

const gridArray = new Uint32Array([NW, NH]);
const gridBuffer = device.createBuffer({
  label: "Grid Uniforms",
  size: gridArray.byteLength,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(gridBuffer, 0, gridArray);

const paramArray = new Float32Array([dt, dx, dy, C]);
const paramBuffer = device.createBuffer({
  label: "Param Uniforms",
  size: paramArray.byteLength,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(paramBuffer, 0, paramArray);

const impulseArray = new Float32Array([ 0.0, 0.0 ]);
const impulseBuffer = device.createBuffer({
  label: "Impulse Uniforms",
  size: impulseArray.byteLength,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(impulseBuffer, 0, impulseArray);

const hCurArray = new Float32Array(NW * NH);
const hOldArray = new Float32Array(NW * NH);
const hNewArray = new Float32Array(NW * NH);

const arrBuffers = {
  hCur: device.createBuffer({
    label: "Cell data hCur",
    size: hCurArray.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
  }),
  hOld: device.createBuffer({
    label: "Cell data hOld",
    size: hOldArray.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
  }),
  hNew: device.createBuffer({
    label: "Cell data hNew",
    size: hNewArray.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
  })
};
device.queue.writeBuffer(arrBuffers.hCur, 0, hCurArray);
device.queue.writeBuffer(arrBuffers.hOld, 0, hOldArray);
device.queue.writeBuffer(arrBuffers.hNew, 0, hNewArray);

const renderBindGroup = device.createBindGroup({
  layout: renderBindGroupLayout,
  entries: [
    { binding: 0, resource: { buffer: gridBuffer } },
    { binding: 1, resource: { buffer: arrBuffers.hCur } },
  ],
});

const computeBindGroup = device.createBindGroup({
  layout: computeBindGroupLayout,
  entries: [
    { binding: 0, resource: { buffer: gridBuffer } },
    { binding: 1, resource: { buffer: paramBuffer } },
    { binding: 2, resource: { buffer: arrBuffers.hCur } },
    { binding: 3, resource: { buffer: arrBuffers.hOld } },
    { binding: 4, resource: { buffer: arrBuffers.hNew } },
    { binding: 5, resource: { buffer: impulseBuffer } },
  ],
});

const horWG  = Math.ceil(NW / WORKGROUP_SIZE);
const verWG  = Math.ceil(NH / WORKGROUP_SIZE);
const horVelWG = Math.ceil((NW + 1) / WORKGROUP_SIZE);
const verVelWG = Math.ceil((NH + 1) / WORKGROUP_SIZE);

let POINTER_DOWN = false;
let pointerPos = {
  x: 0.0,
  y: 0.0,
};
function impulseAt(pointerPos) {
  impulseArray[0] = pointerPos.x;
  impulseArray[1] = pointerPos.y;

  device.queue.writeBuffer(impulseBuffer, 0, impulseArray);

  const encoder = device.createCommandEncoder();
  const impulsePass = encoder.beginComputePass();

  impulsePass.setBindGroup(0, computeBindGroup);
  impulsePass.setPipeline(applyImpulsePipeline);
  impulsePass.dispatchWorkgroups(horWG, verWG);

  impulsePass.end();
  device.queue.submit([encoder.finish()]);
}

canvas.addEventListener("pointerdown", (e) => {
  POINTER_DOWN = true;
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;
  pointerPos.x = x * NW;
  pointerPos.y = (1 - y) * NH;
});

canvas.addEventListener("pointermove", (e) => {
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;
  pointerPos.x = x * NW;
  pointerPos.y = (1 - y) * NH;
});

canvas.addEventListener("pointerup", (e) => {
  POINTER_DOWN = false;
});

function updateGrid() {
  if (POINTER_DOWN) impulseAt(pointerPos);
  const encoder = device.createCommandEncoder();

  const computePass = encoder.beginComputePass();
  computePass.setBindGroup(0, computeBindGroup);

  // Two passes of the algorithm per frame
  computePass.setPipeline(stepWavePipeline);
  computePass.dispatchWorkgroups(horWG, verWG);

  computePass.end();

  encoder.copyBufferToBuffer(arrBuffers.hCur, 0, arrBuffers.hOld, 0, hCurArray.byteLength);
  encoder.copyBufferToBuffer(arrBuffers.hNew, 0, arrBuffers.hCur, 0, hNewArray.byteLength);

  const renderPass = encoder.beginRenderPass({
    colorAttachments: [{
      view: context.getCurrentTexture().createView(),
      loadOp: "clear",
      clearValue: { r: 0, g: 0, b: 0.4, a: 1.0 },
      storeOp: "store",
    }]
  });
  renderPass.setPipeline(cellPipeline);
  renderPass.setBindGroup(0, renderBindGroup);
  renderPass.setVertexBuffer(0, vertexBuffer);
  renderPass.draw(vertices.length / 2, NW * NH); // 6 vertices
  renderPass.end();

  device.queue.submit([encoder.finish()]);
}

function step() {
  updateGrid();
  requestAnimationFrame(step);
}
requestAnimationFrame(step);
