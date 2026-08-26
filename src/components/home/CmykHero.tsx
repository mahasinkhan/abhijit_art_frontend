import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * CmykHero
 *
 * Renders an image as four separated process plates (cyan, magenta,
 * yellow, key) that converge into register on load, and pull back out
 * of register as the pointer approaches. A halftone dot screen at the
 * real trade screen angles (C 15, M 75, Y 0, K 45) resolves away as
 * the plates land.
 *
 * Degrades to a plain <img> when the pointer is coarse (phones), when
 * the visitor asks for reduced motion, or when WebGL is unavailable,
 * so the hero never costs a lead on a slow connection.
 */

type Props = {
  src: string;
  alt: string;
  className?: string;
};

const VERTEX = [
  'varying vec2 vUv;',
  'void main() {',
  '  vUv = uv;',
  '  gl_Position = vec4(position.xy, 0.0, 1.0);',
  '}',
].join('\n');

const FRAGMENT = [
  'precision highp float;',
  '',
  'varying vec2 vUv;',
  '',
  'uniform sampler2D uTex;',
  'uniform vec2 uPlaneSize;',
  'uniform vec2 uImageSize;',
  'uniform vec2 uPointer;',
  'uniform float uSpread;',
  'uniform float uScreen;',
  'uniform vec3 uPaper;',
  '',
  '// Map uv so the texture behaves like object-fit: cover.',
  'vec2 coverUv(vec2 uv) {',
  '  float planeAspect = uPlaneSize.x / uPlaneSize.y;',
  '  float imageAspect = uImageSize.x / uImageSize.y;',
  '  vec2 scale = vec2(1.0);',
  '  if (planeAspect > imageAspect) {',
  '    scale.y = imageAspect / planeAspect;',
  '  } else {',
  '    scale.x = planeAspect / imageAspect;',
  '  }',
  '  return (uv - 0.5) * scale + 0.5;',
  '}',
  '',
  'vec2 rotate(vec2 v, float a) {',
  '  float s = sin(a);',
  '  float c = cos(a);',
  '  return vec2(v.x * c - v.y * s, v.x * s + v.y * c);',
  '}',
  '',
  '// Ink coverage for one plate, sampled at its own offset.',
  'vec4 plate(vec2 uv, vec2 offset) {',
  '  vec2 p = coverUv(uv + offset);',
  '  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) {',
  '    return vec4(0.0);',
  '  }',
  '  vec3 rgb = texture2D(uTex, p).rgb;',
  '  float k = 1.0 - max(max(rgb.r, rgb.g), rgb.b);',
  '  float d = max(1.0 - k, 0.0001);',
  '  vec3 cmy = (vec3(1.0 - k) - rgb) / d;',
  '  return vec4(clamp(cmy, 0.0, 1.0), clamp(k, 0.0, 1.0));',
  '}',
  '',
  '// Amplitude-modulated dot screen at a given angle.',
  'float dotScreen(vec2 uv, float angle, float value) {',
  '  float freq = 170.0;',
  '  vec2 aspect = vec2(uPlaneSize.x / uPlaneSize.y, 1.0);',
  '  vec2 grid = rotate((uv - 0.5) * aspect, angle) * freq;',
  '  vec2 cell = fract(grid) - 0.5;',
  '  float radius = sqrt(clamp(value, 0.0, 1.0)) * 0.52;',
  '  float edge = fwidth(length(cell)) + 0.004;',
  '  return 1.0 - smoothstep(radius - edge, radius + edge, length(cell));',
  '}',
  '',
  'const float DEG = 0.017453292;',
  '',
  'void main() {',
  '  // Pointer nudges the plates apart; uSpread carries the load-in.',
  '  float pull = uSpread + length(uPointer) * 0.35 * (1.0 - uSpread);',
  '  float m = pull * 0.055;',
  '  vec2 lean = uPointer * pull * 0.02;',
  '',
  '  vec2 offC = vec2(-0.62, 0.44) * m + lean;',
  '  vec2 offM = vec2(0.68, 0.30) * m - lean;',
  '  vec2 offY = vec2(0.10, -0.72) * m + lean * 0.5;',
  '  vec2 offK = vec2(0.0);',
  '',
  '  float c = plate(vUv, offC).r;',
  '  float mg = plate(vUv, offM).g;',
  '  float y = plate(vUv, offY).b;',
  '  float k = plate(vUv, offK).a;',
  '',
  '  // Resolve the dot screen into continuous tone as plates register.',
  '  if (uScreen > 0.001) {',
  '    c = mix(c, dotScreen(vUv + offC, 15.0 * DEG, c), uScreen);',
  '    mg = mix(mg, dotScreen(vUv + offM, 75.0 * DEG, mg), uScreen);',
  '    y = mix(y, dotScreen(vUv + offY, 0.0, y), uScreen);',
  '    k = mix(k, dotScreen(vUv + offK, 45.0 * DEG, k), uScreen);',
  '  }',
  '',
  '  // Subtractive recombination, printed onto the paper stock.',
  '  vec3 ink = vec3(1.0 - c, 1.0 - mg, 1.0 - y) * (1.0 - k);',
  '  gl_FragColor = vec4(ink * uPaper, 1.0);',
  '}',
].join('\n');

function easeOutExpo(t: number) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export default function CmykHero({ src, alt, className }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const wantsCalm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const narrow = window.innerWidth < 900;

    if (wantsCalm || coarse || narrow) {
      setFallback(true);
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    } catch {
      setFallback(true);
      return;
    }

    let frame = 0;
    let disposed = false;
    let startedAt = 0;

    const pointer = new THREE.Vector2(0, 0);
    const pointerTarget = new THREE.Vector2(0, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uTex: { value: null },
        uPlaneSize: { value: new THREE.Vector2(1, 1) },
        uImageSize: { value: new THREE.Vector2(1, 1) },
        uPointer: { value: new THREE.Vector2(0, 0) },
        uSpread: { value: 1 },
        uScreen: { value: 1 },
        uPaper: { value: new THREE.Color(0.984, 0.984, 0.976) },
      },
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.appendChild(renderer.domElement);

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      material.uniforms.uPlaneSize.value.set(w, h);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      pointerTarget.set(x * 2, -y * 2);
    };

    const onPointerLeave = () => pointerTarget.set(0, 0);

    const loader = new THREE.TextureLoader();
    loader.load(
      src,
      (texture) => {
        if (disposed) return;
        texture.colorSpace = THREE.NoColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        material.uniforms.uTex.value = texture;
        material.uniforms.uImageSize.value.set(texture.image.width, texture.image.height);
        startedAt = performance.now();
        loop();
      },
      undefined,
      () => {
        if (!disposed) setFallback(true);
      }
    );

    const loop = () => {
      if (disposed) return;
      frame = requestAnimationFrame(loop);

      // Plates travel home over 1.8s; the screen resolves a touch sooner.
      const elapsed = (performance.now() - startedAt) / 1800;
      const landed = easeOutExpo(Math.min(elapsed, 1));
      material.uniforms.uSpread.value = 1 - landed;
      material.uniforms.uScreen.value = Math.max(0, 1 - easeOutExpo(Math.min(elapsed * 1.35, 1)));

      pointer.lerp(pointerTarget, 0.07);
      material.uniforms.uPointer.value.copy(pointer);

      renderer.render(scene, camera);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    host.addEventListener('pointermove', onPointerMove);
    host.addEventListener('pointerleave', onPointerLeave);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerleave', onPointerLeave);
      material.uniforms.uTex.value?.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, [src]);

  if (fallback) {
    return <img className={className} src={src} alt={alt} loading="eager" decoding="async" />;
  }

  return <div ref={hostRef} className={className} role="img" aria-label={alt} />;
}
