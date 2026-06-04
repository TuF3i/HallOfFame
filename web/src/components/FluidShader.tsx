import { useEffect, useRef } from "react";

const vertexShaderSource = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const fragmentShaderSource = `
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_pointer;
uniform float u_time;

float circle(vec2 uv, vec2 center, float radius, float blur) {
  float distanceToCenter = length(uv - center);
  return smoothstep(radius + blur, radius - blur, distanceToCenter);
}

float box(vec2 uv, vec2 center, vec2 size, float blur) {
  vec2 d = abs(uv - center) - size;
  return smoothstep(blur, -blur, length(max(d, 0.0)) + min(max(d.x, d.y), 0.0));
}

float lineField(vec2 uv, float angle, float frequency) {
  vec2 direction = vec2(cos(angle), sin(angle));
  float projected = dot(uv, direction) * frequency;
  return smoothstep(0.02, 0.0, abs(fract(projected) - 0.5));
}

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 p = (uv - 0.5) * aspect + 0.5;
  vec2 pointer = mix(vec2(0.62, 0.42), u_pointer, 0.32);

  float t = u_time * 0.12;
  float flow = noise((p + vec2(sin(t), cos(t * 0.8))) * 3.2);
  flow += 0.5 * noise((p * 6.0) + vec2(t * 1.8, -t));

  float magenta = circle(p, vec2(0.76 + sin(t) * 0.06, 0.69), 0.24 + flow * 0.035, 0.2);
  float cyan = circle(p, vec2(0.23, 0.64 + cos(t * 1.2) * 0.06), 0.26, 0.22);
  float orange = circle(p, vec2(0.57, 0.24), 0.22 + flow * 0.03, 0.2);
  float violet = circle(p, pointer, 0.19, 0.18);

  vec3 color = vec3(1.0);
  color = mix(color, vec3(0.02, 0.02, 0.02), circle(p, vec2(0.68, 0.55), 0.09, 0.012) * 0.92);
  color = mix(color, vec3(0.03, 0.03, 0.03), circle(p, vec2(0.54, 0.62), 0.07, 0.01) * 0.86);
  color = mix(color, vec3(0.26, 0.07, 1.0), magenta * 0.55);
  color = mix(color, vec3(0.0, 0.92, 0.95), cyan * 0.5);
  color = mix(color, vec3(1.0, 0.36, 0.04), orange * 0.48);
  color = mix(color, vec3(0.92, 0.02, 0.92), violet * 0.45);

  float hardCut = box(p, vec2(0.73, 0.34), vec2(0.21, 0.17), 0.01);
  color = mix(color, vec3(1.0, 0.43, 0.0), hardCut * 0.28);

  float linesA = lineField(p + flow * 0.035, 0.76, 24.0);
  float linesB = lineField(p - flow * 0.025, 2.32, 34.0);
  color = mix(color, vec3(0.0), (linesA + linesB) * 0.12);

  float paper = noise(uv * u_resolution.xy * 0.32) * 0.035;
  color += paper;
  color = mix(vec3(1.0), color, 0.9);

  gl_FragColor = vec4(color, 0.92);
}
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error("Unable to create WebGL shader.");
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) ?? "Unknown shader compile error.";
    gl.deleteShader(shader);
    throw new Error(info);
  }

  return shader;
}

export function FluidShader() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", { antialias: true, alpha: true, premultipliedAlpha: false });
    if (!canvas || !gl) {
      return;
    }

    let animationFrame = 0;
    const pointer = { x: 0.5, y: 0.5 };
    const start = performance.now();

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = gl.createProgram();
    if (!program) {
      return;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? "Unable to link WebGL program.");
    }

    const positionLocation = gl.getAttribLocation(program, "a_position");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const pointerLocation = gl.getUniformLocation(program, "u_pointer");
    const timeLocation = gl.getUniformLocation(program, "u_time");
    const positionBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const movePointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = (event.clientX - rect.left) / rect.width;
      pointer.y = 1 - (event.clientY - rect.top) / rect.height;
    };

    const render = () => {
      resize();
      gl.useProgram(program);
      gl.enableVertexAttribArray(positionLocation);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform2f(pointerLocation, pointer.x, pointer.y);
      gl.uniform1f(timeLocation, (performance.now() - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrame = window.requestAnimationFrame(render);
    };

    resize();
    render();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", movePointer);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", movePointer);
      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, []);

  return <canvas ref={canvasRef} className="fluid-shader" aria-hidden="true" />;
}
