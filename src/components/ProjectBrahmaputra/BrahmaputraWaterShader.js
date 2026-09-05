/**
 * ============================================================================
 * PROJECT BRAHMAPUTRA — ISOLATED GPU LIVING RIVER WATER SHADER ENGINE (HD PASS)
 * Strictly localized to river channels with ZERO impact on static landscape.
 * Non-water pixels are completely DISCARDED (transparent), preserving 100%
 * pixel-perfect sharpness of the 1080p HD forests, mountains, sandbars, and sky.
 * ============================================================================
 */

// Braided River Flow Corridors calibrated to the HD Brahmaputra Landscape
const BRAHMAPUTRA_FLOW_VECTORS = [
  // 1. Center-Right Main Sweeping Arterial (Right horizon to center foreground)
  [
    { x: 0.98, y: 0.62 },
    { x: 0.82, y: 0.69 },
    { x: 0.68, y: 0.76 },
    { x: 0.52, y: 0.81 },
    { x: 0.36, y: 0.87 },
    { x: 0.24, y: 0.95 },
    { x: 0.18, y: 1.02 },
  ],
  // 2. Left Braided Channel Loop (Left bank sweeping around green hills)
  [
    { x: 0.02, y: 0.65 },
    { x: 0.14, y: 0.68 },
    { x: 0.22, y: 0.75 },
    { x: 0.32, y: 0.86 },
    { x: 0.44, y: 0.94 },
    { x: 0.52, y: 1.02 },
  ],
  // 3. Middle Sandbar Island Chute (Mid-basin interconnect)
  [
    { x: 0.08, y: 0.72 },
    { x: 0.18, y: 0.78 },
    { x: 0.28, y: 0.83 },
    { x: 0.38, y: 0.89 },
    { x: 0.48, y: 0.96 },
  ],
  // 4. Right Braided Sandbar Veins (East delta split)
  [
    { x: 0.88, y: 0.65 },
    { x: 0.76, y: 0.73 },
    { x: 0.62, y: 0.80 },
    { x: 0.55, y: 0.87 },
    { x: 0.50, y: 0.93 },
  ],
  // 5. Far Right Outer Shore Branch
  [
    { x: 0.96, y: 0.72 },
    { x: 0.86, y: 0.80 },
    { x: 0.78, y: 0.88 },
    { x: 0.72, y: 0.96 },
    { x: 0.68, y: 1.02 },
  ],
  // 6. Far Left Delta Inflow
  [
    { x: 0.04, y: 0.80 },
    { x: 0.09, y: 0.86 },
    { x: 0.15, y: 0.92 },
    { x: 0.20, y: 1.02 },
  ],
];

// Vertex Shader
const VS_SOURCE = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = (a_position + 1.0) * 0.5;
  v_uv.y = 1.0 - v_uv.y;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

// Fragment Shader: Strictly outputs animated river water, DISCARDS land/mountains/forests
const FS_SOURCE = `
precision highp float;
varying vec2 v_uv;

uniform sampler2D u_image;
uniform sampler2D u_flow_mask;
uniform float u_time;
uniform vec2 u_resolution;

// Noise helper functions for micro-ripples
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Surface micro-wavelet normal calculation
vec2 getWaterNormal(vec2 uv, float t) {
  float freq1 = 38.0;
  float freq2 = 76.0;
  float freq3 = 150.0;
  
  float n1 = snoise(uv * freq1 + vec2(t * 0.75, t * 0.5));
  float n2 = snoise(uv * freq2 - vec2(t * 0.65, t * 0.8));
  float n3 = snoise(uv * freq3 + vec2(t * 1.1, -t * 0.55));
  
  float dX = n1 * 0.5 + n2 * 0.32 + n3 * 0.18;
  float dY = n1 * 0.38 - n2 * 0.3 + n3 * 0.22;
  return vec2(dX, dY);
}

void main() {
  vec2 uv = v_uv;
  
  // Read flow vector and river mask
  vec4 flowData = texture2D(u_flow_mask, uv);
  float riverMask = flowData.a;
  
  // CRITICAL: If pixel is outside the river (forest, mountains, sandbars, sky), DISCARD IT.
  // This guarantees that the 1080p static background is 100% pixel-perfect and razor sharp!
  if (riverMask < 0.04) {
    discard;
  }
  
  vec2 flowDir = flowData.rg * 2.0 - 1.0;
  float depth = flowData.b;
  
  // Perspective scaling (faster current & visible ripples in foreground)
  float depthFactor = mix(0.5, 1.0, smoothstep(0.58, 0.95, uv.y));
  
  // Fast natural flow speed: noticeable in 0.5 - 1.0s
  float flowSpeed = (0.16 + depth * 0.10) * depthFactor;
  
  // Dual-phase advection cycle for seamless non-snapping continuous flow
  float cycleTime = u_time * flowSpeed;
  float phase0 = fract(cycleTime);
  float phase1 = fract(cycleTime + 0.5);
  
  float blendWeight = abs((phase0 - 0.5) * 2.0);
  
  // Controlled flow displacement (river channel shape remains geometrically stable)
  float flowDisplace = 0.015 * depthFactor;
  vec2 uv0 = uv + flowDir * (phase0 - 0.5) * flowDisplace;
  vec2 uv1 = uv + flowDir * (phase1 - 0.5) * flowDisplace;
  
  // Surface wave perturbation inside the water channels
  vec2 norm0 = getWaterNormal(uv0, u_time * 1.6);
  vec2 norm1 = getWaterNormal(uv1, u_time * 1.6);
  vec2 blendedNorm = mix(norm0, norm1, blendWeight);
  
  // Micro-ripple texture distortion (fine, natural surface tension)
  float rippleDistort = 0.0030 * depthFactor;
  vec4 water0 = texture2D(u_image, uv0 + norm0 * rippleDistort);
  vec4 water1 = texture2D(u_image, uv1 + norm1 * rippleDistort);
  
  vec4 flowingWater = mix(water0, water1, blendWeight);
  
  // Dynamic moving celestial starlight specular glints on wave crests
  vec2 lightDir = normalize(vec2(0.4, -0.75));
  float specular = pow(max(0.0, dot(blendedNorm, lightDir)), 6.0) * 0.32 * depthFactor;
  vec3 specularGlint = vec3(0.85, 0.95, 1.0) * specular;
  
  vec3 finalWater = flowingWater.rgb + specularGlint;
  
  // Output animated water with soft feathered edge alpha
  gl_FragColor = vec4(finalWater, riverMask);
}
`;

/**
 * Generate Flow Map Texture (RGBA)
 * R = Flow Direction X [-1, 1] -> [0, 255]
 * G = Flow Direction Y [-1, 1] -> [0, 255]
 * B = Channel Depth [0, 255]
 * A = River Mask (Water = 255, Land = 0 with tight edge protection)
 */
function generateFlowMapTexture(img, width, height) {
  const offCanvas = document.createElement('canvas');
  offCanvas.width = width;
  offCanvas.height = height;
  const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
  offCtx.drawImage(img, 0, 0, width, height);

  const imgData = offCtx.getImageData(0, 0, width, height);
  const src = imgData.data;

  const flowMap = offCtx.createImageData(width, height);
  const dst = flowMap.data;

  // Step 1: Accurate River Water Segmentation on HD image
  const maskGrid = new Float32Array(width * height);

  for (let y = 0; y < height; y++) {
    const ny = y / height;
    for (let x = 0; x < width; x++) {
      const nx = x / width;
      const idx = (y * width + x) * 4;
      const r = src[idx];
      const g = src[idx + 1];
      const b = src[idx + 2];

      // Water only exists in the lower valley (ny > 0.54)
      if (ny < 0.54) {
        maskGrid[y * width + x] = 0;
        continue;
      }

      // Detect pure turquoise/cyan/blue water color signature
      const isCyanTeal = b > r * 1.15 && g > r * 1.02 && b > 65;
      const isDeepBlue = b > 55 && b > r + 16 && b >= g - 8;
      
      // Strict exclusion of green forest canopy, trees, and sandbars
      const isGreenForest = g > b && g > r + 8;
      const isSandbar = (r > 65 && g > 65 && b < 85) || (Math.abs(r - g) < 14 && Math.abs(g - b) < 18);
      const isDarkRock = r < 35 && g < 42 && b < 40;

      let isWater = (isCyanTeal || isDeepBlue) && !isGreenForest && !isSandbar && !isDarkRock;

      // Ensure upper sky/mountain perimeter is excluded
      if (ny < 0.58 && (nx < 0.35 || nx > 0.92)) isWater = false;

      maskGrid[y * width + x] = isWater ? 1.0 : 0.0;
    }
  }

  // Step 2: Tight 1px Gaussian/Box Feathering on River Mask (No bleeding into forest)
  const smoothedMask = new Float32Array(width * height);
  const rBlur = 1;
  for (let y = rBlur; y < height - rBlur; y++) {
    for (let x = rBlur; x < width - rBlur; x++) {
      let sum = 0;
      let count = 0;
      for (let dy = -rBlur; dy <= rBlur; dy++) {
        for (let dx = -rBlur; dx <= rBlur; dx++) {
          sum += maskGrid[(y + dy) * width + (x + dx)];
          count++;
        }
      }
      smoothedMask[y * width + x] = sum / count;
    }
  }

  // Step 3: Compute River Flow Vectors along Channel Splines
  for (let y = 0; y < height; y++) {
    const ny = y / height;
    for (let x = 0; x < width; x++) {
      const nx = x / width;
      const pIdx = y * width + x;
      const dIdx = pIdx * 4;

      const maskVal = smoothedMask[pIdx];

      if (maskVal < 0.04) {
        dst[dIdx] = 128;     // Vx = 0
        dst[dIdx + 1] = 128; // Vy = 0
        dst[dIdx + 2] = 0;   // Depth = 0
        dst[dIdx + 3] = 0;   // Mask = 0 (Discard)
        continue;
      }

      // Find nearest channel spline and calculate flow tangent
      let bestDist = Infinity;
      let bestDx = 0;
      let bestDy = 1;

      for (let c = 0; c < BRAHMAPUTRA_FLOW_VECTORS.length; c++) {
        const pts = BRAHMAPUTRA_FLOW_VECTORS[c];
        for (let i = 0; i < pts.length - 1; i++) {
          const p1 = pts[i];
          const p2 = pts[i + 1];

          const segDx = p2.x - p1.x;
          const segDy = p2.y - p1.y;
          const segLen2 = segDx * segDx + segDy * segDy;

          let t = ((nx - p1.x) * segDx + (ny - p1.y) * segDy) / segLen2;
          t = Math.max(0, Math.min(1, t));

          const projX = p1.x + t * segDx;
          const projY = p1.y + t * segDy;
          const dist2 = (nx - projX) * (nx - projX) + (ny - projY) * (ny - projY);

          if (dist2 < bestDist) {
            bestDist = dist2;
            const len = Math.sqrt(segLen2) || 1;
            bestDx = segDx / len;
            bestDy = segDy / len;
          }
        }
      }

      // Encode flow direction [-1, 1] into [0, 255]
      dst[dIdx] = Math.round((bestDx * 0.5 + 0.5) * 255);
      dst[dIdx + 1] = Math.round((bestDy * 0.5 + 0.5) * 255);
      dst[dIdx + 2] = Math.round(Math.min(1.0, maskVal * 1.3) * 255); // Depth
      dst[dIdx + 3] = Math.round(maskVal * 255); // River Mask Alpha
    }
  }

  offCtx.putImageData(flowMap, 0, 0);
  return offCanvas;
}

/**
 * Initialize and Run WebGL Water Flow Renderer
 */
export function initBrahmaputraWaterShader(canvasElement, imageSrc, onReady) {
  const gl =
    canvasElement.getContext('webgl', { alpha: true, premultipliedAlpha: false }) ||
    canvasElement.getContext('experimental-webgl');

  if (!gl) {
    console.warn('[Project Brahmaputra] WebGL not supported. Falling back to static vista.');
    return null;
  }

  function createShader(glCtx, type, source) {
    const shader = glCtx.createShader(type);
    glCtx.shaderSource(shader, source);
    glCtx.compileShader(shader);
    if (!glCtx.getShaderParameter(shader, glCtx.COMPILE_STATUS)) {
      console.error('[Water Shader Error]', glCtx.getShaderInfoLog(shader));
      glCtx.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vs = createShader(gl, gl.VERTEX_SHADER, VS_SOURCE);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, FS_SOURCE);
  if (!vs || !fs) return null;

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('[Shader Link Error]', gl.getProgramInfoLog(program));
    return null;
  }

  gl.useProgram(program);

  // Fullscreen Quad Buffer
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]),
    gl.STATIC_DRAW
  );

  const aPositionLoc = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(aPositionLoc);
  gl.vertexAttribPointer(aPositionLoc, 2, gl.FLOAT, false, 0, 0);

  const uTimeLoc = gl.getUniformLocation(program, 'u_time');
  const uResolutionLoc = gl.getUniformLocation(program, 'u_resolution');
  const uImageLoc = gl.getUniformLocation(program, 'u_image');
  const uFlowMaskLoc = gl.getUniformLocation(program, 'u_flow_mask');

  const imageTexture = gl.createTexture();
  const flowMaskTexture = gl.createTexture();

  let isDestroyed = false;
  let animId = null;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = imageSrc;

  img.onload = () => {
    if (isDestroyed) return;

    const w = img.naturalWidth || 1920;
    const h = img.naturalHeight || 1080;

    // 1. Upload HD photograph to Texture Unit 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, imageTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.uniform1i(uImageLoc, 0);

    // 2. Generate Flow Map + River Mask Canvas and upload to Texture Unit 1
    const maskCanvas = generateFlowMapTexture(img, Math.min(w, 960), Math.min(h, 540));

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, flowMaskTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, maskCanvas);
    gl.uniform1i(uFlowMaskLoc, 1);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    if (onReady) onReady();

    // 3. Animation Loop
    const startTime = performance.now();

    function renderLoop() {
      if (isDestroyed) return;

      const elapsed = (performance.now() - startTime) * 0.001;

      if (
        canvasElement.width !== canvasElement.clientWidth ||
        canvasElement.height !== canvasElement.clientHeight
      ) {
        canvasElement.width = canvasElement.clientWidth;
        canvasElement.height = canvasElement.clientHeight;
        gl.viewport(0, 0, canvasElement.width, canvasElement.height);
      }

      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);
      gl.uniform1f(uTimeLoc, elapsed);
      gl.uniform2f(uResolutionLoc, canvasElement.width, canvasElement.height);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animId = requestAnimationFrame(renderLoop);
    }

    animId = requestAnimationFrame(renderLoop);
  };

  return {
    destroy: () => {
      isDestroyed = true;
      if (animId) cancelAnimationFrame(animId);
      gl.deleteTexture(imageTexture);
      gl.deleteTexture(flowMaskTexture);
      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(program);
    },
  };
}
