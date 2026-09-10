/**
 * The 3D bench: the reconstructed pattern, drawn from measured dimensions.
 *
 * This view earns its axis because the reconstruction is real. The burden, spacing, bench height,
 * stemming and charge column shown here were recovered from the source's own per-site hole diameters
 * and asserted against fifteen dimensional constraints its prose states. It is not a cartoon of a
 * bench, it is this bench.
 *
 * IT IS ALSO NOT EVIDENCE, and the screen says so permanently. The timing factor in the modified
 * classical model is a SCALAR on the mean size with no spatial structure, so changing the tie-in from
 * row-by-row to a V-cut changes the ripple below and changes nothing in the prediction. Only the
 * aggregate delay moves the number. Without that badge this view is the failure where the moving part
 * is not validated and the validated part does not move.
 *
 * The animation is paused by default and halts when the tab is hidden. A page that spins a GPU while
 * nobody is looking is a compute bomb.
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

import type { Pattern } from '../lib/contract.types';

export interface BenchView3DProps {
  pattern: Pattern;
  /** Holes per row and rows, so a single blast reads as a pattern rather than one hole. */
  holesPerRow?: number;
  rows?: number;
  /** Inter-hole delay in milliseconds, which drives the ripple and nothing else. */
  delayMs?: number;
  tieIn?: 'row-by-row' | 'v-cut' | 'reverse';
  label?: string;
  height?: number;
}

type Init = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  holes: { mesh: THREE.Mesh; order: number }[];
  dispose: () => void;
};

function cssColour(name: string, fallback: string): THREE.Color {
  const raw =
    typeof window === 'undefined'
      ? ''
      : getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  try {
    return new THREE.Color(raw || fallback);
  } catch {
    return new THREE.Color(fallback);
  }
}

function initiationOrder(
  row: number,
  column: number,
  rows: number,
  columns: number,
  tieIn: BenchView3DProps['tieIn'],
): number {
  if (tieIn === 'v-cut') {
    const centre = (columns - 1) / 2;
    return Math.abs(column - centre) + row * 0.5;
  }
  if (tieIn === 'reverse') {
    return (rows - 1 - row) * columns + (columns - 1 - column);
  }
  return row * columns + column;
}

export function BenchView3D({
  pattern,
  holesPerRow = 6,
  rows = 3,
  delayMs = 8,
  tieIn = 'row-by-row',
  label,
  height = 380,
}: BenchView3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const initRef = useRef<Init | null>(null);
  const rafRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [themeEpoch, setThemeEpoch] = useState(0);

  useEffect(() => {
    const observer = new MutationObserver(() => setThemeEpoch((e) => e + 1));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 480;
    const boxHeight = mount.clientHeight || height;

    const scene = new THREE.Scene();
    scene.background = cssColour('--color-surface-2', '#11151c');

    const camera = new THREE.PerspectiveCamera(46, width / boxHeight, 0.1, 500);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, boxHeight);
    mount.replaceChildren(renderer.domElement);

    const { burden_m: B, spacing_m: S, bench_height_m: H, stemming_m: T, charge_length_m: L } = pattern;
    const spanX = S * (holesPerRow - 1);
    const spanY = B * (rows - 1);

    // The bench block: the rock this pattern is going to break.
    const rockColour = cssColour('--color-fg-subtle', '#6b7280');
    const bench = new THREE.Mesh(
      new THREE.BoxGeometry(spanX + S * 1.4, H, spanY + B * 1.6),
      new THREE.MeshStandardMaterial({ color: rockColour, roughness: 0.95, metalness: 0.02 }),
    );
    bench.position.set(0, -H / 2, 0);
    scene.add(bench);

    // The free face, which is what the front row breaks toward.
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(spanX + S * 1.4, H),
      new THREE.MeshStandardMaterial({
        color: cssColour('--color-accent-2', '#9b6dd6'),
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
      }),
    );
    face.position.set(0, -H / 2, spanY / 2 + B * 0.8);
    scene.add(face);

    const holes: { mesh: THREE.Mesh; order: number }[] = [];
    const chargeColour = cssColour('--color-accent', '#4f8ef7');
    const stemColour = cssColour('--color-warn', '#d19a2b');
    const radius = Math.max(0.06, (pattern.hole_diameter_mm / 1000) * 2.2);

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < holesPerRow; column += 1) {
        const x = column * S - spanX / 2;
        const z = row * B - spanY / 2;

        // The charged column, coloured by charge, and the stemming above it in a different colour.
        // A single-colour cylinder would hide the thing the uniformity index is most sensitive to.
        const charge = new THREE.Mesh(
          new THREE.CylinderGeometry(radius, radius, Math.max(0.2, L), 14),
          new THREE.MeshStandardMaterial({ color: chargeColour, roughness: 0.5, emissive: 0x000000 }),
        );
        charge.position.set(x, -H + Math.max(0.2, L) / 2, z);
        scene.add(charge);

        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(radius * 0.92, radius * 0.92, Math.max(0.1, T), 12),
          new THREE.MeshStandardMaterial({ color: stemColour, roughness: 0.85, transparent: true, opacity: 0.85 }),
        );
        stem.position.set(x, -Math.max(0.1, T) / 2, z);
        scene.add(stem);

        holes.push({
          mesh: charge,
          order: initiationOrder(row, column, rows, holesPerRow, tieIn),
        });
      }
    }

    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(spanX, H * 2.5, spanY * 2);
    scene.add(key);

    const reach = Math.max(spanX, spanY, H) * 1.9 + 6;
    camera.position.set(reach * 0.62, reach * 0.55, reach * 0.78);
    camera.lookAt(0, -H / 2, 0);

    // Pointer drag orbits the camera. `.click()` teleports a cursor and would pass a control no hand
    // can operate, so this is a real pointer interaction rather than a button that jumps the view.
    let dragging = false;
    let lastX = 0;
    let angle = Math.atan2(camera.position.z, camera.position.x);
    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      renderer.domElement.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      angle -= (e.clientX - lastX) * 0.008;
      lastX = e.clientX;
      const r = Math.hypot(camera.position.x, camera.position.z);
      camera.position.x = Math.cos(angle) * r;
      camera.position.z = Math.sin(angle) * r;
      camera.lookAt(0, -H / 2, 0);
      renderer.render(scene, camera);
    };
    const onUp = () => {
      dragging = false;
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointermove', onMove);
    renderer.domElement.addEventListener('pointerup', onUp);
    renderer.domElement.style.cursor = 'grab';
    renderer.domElement.setAttribute('data-bench-holes', String(holes.length));

    renderer.render(scene, camera);

    const resize = new ResizeObserver(() => {
      const w = mount.clientWidth || width;
      const h = mount.clientHeight || boxHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.render(scene, camera);
    });
    resize.observe(mount);

    initRef.current = {
      renderer,
      scene,
      camera,
      holes,
      dispose: () => {
        resize.disconnect();
        renderer.domElement.removeEventListener('pointerdown', onDown);
        renderer.domElement.removeEventListener('pointermove', onMove);
        renderer.domElement.removeEventListener('pointerup', onUp);
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            (Array.isArray(object.material) ? object.material : [object.material]).forEach((m) =>
              m.dispose(),
            );
          }
        });
        renderer.dispose();
      },
    };

    return () => {
      initRef.current?.dispose();
      initRef.current = null;
    };
  }, [pattern, holesPerRow, rows, tieIn, height, themeEpoch]);

  // The initiation ripple. Default paused, halted on a hidden tab.
  useEffect(() => {
    if (!playing) return;
    const state = initRef.current;
    if (!state) return;

    const maxOrder = Math.max(...state.holes.map((h) => h.order), 1);
    const cycleMs = Math.max(900, maxOrder * Math.max(1, delayMs) * 6);
    let start = performance.now();

    const step = () => {
      if (document.hidden) {
        setPlaying(false);
        return;
      }
      const elapsed = (performance.now() - start) % cycleMs;
      const front = (elapsed / cycleMs) * (maxOrder + 1.5);
      for (const hole of state.holes) {
        const distance = front - hole.order;
        const intensity = distance >= 0 && distance < 1.2 ? 1 - distance / 1.2 : 0;
        const material = hole.mesh.material as THREE.MeshStandardMaterial;
        material.emissive.setRGB(intensity * 0.9, intensity * 0.45, 0);
      }
      state.renderer.render(state.scene, state.camera);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);

    const onVisibility = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
      for (const hole of state.holes) {
        (hole.mesh.material as THREE.MeshStandardMaterial).emissive.setRGB(0, 0, 0);
      }
      state.renderer.render(state.scene, state.camera);
      start = 0;
    };
  }, [playing, delayMs]);

  return (
    <div className="fr-bench">
      <div ref={mountRef} className="fr-bench-canvas" style={{ minHeight: height }} />
      <div className="fr-bench-bar">
        <button
          type="button"
          className="fr-btn"
          onClick={() => setPlaying((p) => !p)}
          aria-pressed={playing}
        >
          {playing ? 'Pause initiation' : 'Play initiation'}
        </button>
        <span className="fr-bench-dims">
          burden {pattern.burden_m.toFixed(2)} m · spacing {pattern.spacing_m.toFixed(2)} m · bench{' '}
          {pattern.bench_height_m.toFixed(2)} m · hole {pattern.hole_diameter_mm.toFixed(0)} mm ·{' '}
          {pattern.charge_mass_kg.toFixed(0)} kg in {pattern.rock_volume_m3.toFixed(0)} m3
        </span>
        {label ? <span className="fr-bench-label">{label}</span> : null}
      </div>
      {/*
        The permanent honesty overlay. Not dismissible, because the moment it can be dismissed this
        view starts looking like evidence for something it cannot support.
      */}
      <p className="fr-note fr-note-warn" data-bench-disclaimer="timing-is-choreography">
        The initiation sequence is choreography. The timing factor in the modified classical model is
        a single number multiplying the mean size, with no spatial structure, so changing the tie-in
        moves this animation and moves no prediction on this page. Only the aggregate delay does, and
        its published values are not printed in any source held for this work.
      </p>
    </div>
  );
}
