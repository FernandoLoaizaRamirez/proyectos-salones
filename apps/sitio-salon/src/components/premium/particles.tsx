"use client";

import * as React from "react";

/**
 * Campo de partículas doradas flotantes, en WebGL puro (sin librerías).
 * Es puramente decorativo; si el navegador no soporta WebGL, no dibuja nada
 * y la foto de fondo se sigue viendo perfecta (degradación elegante).
 */
export function Particles({ className = "" }: { className?: string }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: true,
    });
    if (!gl) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const vsrc = `
      attribute vec2 a_seed;
      uniform float u_time;
      uniform vec2 u_res;
      varying float v_alpha;
      void main() {
        float t = u_time * 0.03;
        float sway = sin((a_seed.y + t) * 6.2831) * 0.03;
        float x = fract(a_seed.x + sway);
        float y = fract(a_seed.y + t * (0.25 + a_seed.x * 0.5));
        vec2 p = vec2(x, 1.0 - y);
        gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
        float s = fract(a_seed.x * 13.37);
        gl_PointSize = mix(2.0, 8.0, s) * (u_res.y / 900.0);
        v_alpha = mix(0.12, 0.65, fract(a_seed.y * 7.0));
      }
    `;
    const fsrc = `
      precision mediump float;
      varying float v_alpha;
      uniform vec3 u_color;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * v_alpha;
        gl_FragColor = vec4(u_color, a);
      }
    `;

    const compile = (type: number, src: string): WebGLShader | null => {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };

    const vs = compile(gl.VERTEX_SHADER, vsrc);
    const fs = compile(gl.FRAGMENT_SHADER, fsrc);
    const prog = gl.createProgram();
    if (!vs || !fs || !prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const N = 170;
    const seeds = new Float32Array(N * 2);
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);

    const aSeed = gl.getAttribLocation(prog, "a_seed");
    gl.enableVertexAttribArray(aSeed);
    gl.vertexAttribPointer(aSeed, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, "u_time");
    const uRes = gl.getUniformLocation(prog, "u_res");
    const uColor = gl.getUniformLocation(prog, "u_color");
    gl.uniform3f(uColor, 0.82, 0.68, 0.44);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || 1;
      const h = canvas.clientHeight || 1;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    const start = performance.now();
    const render = (now: number) => {
      gl.uniform1f(uTime, reduce ? 0 : (now - start) / 1000);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.POINTS, 0, N);
      if (!reduce) raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />;
}
