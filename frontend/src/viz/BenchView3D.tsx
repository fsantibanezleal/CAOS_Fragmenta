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

import { useShellLang } from '@fasl-work/caos-app-shell';
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

/** A dimension line between two points. The measurement it marks is named in the legend. */
function makeDimension(from: THREE.Vector3, to: THREE.Vector3, colour: THREE.Color): THREE.Line {
  return new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([from, to]),
    new THREE.LineBasicMaterial({ color: colour }),
  );
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
  const lang = useShellLang();
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
    // `preserveDrawingBuffer` so the canvas can be READ after the frame.
    //
    // Without it a WebGL canvas comes back blank to any reader, and a gate can then only ask the
    // renderer what it drew. This view declares its hole count on the element and that declaration
    // was true while every hole was hidden inside an opaque block: eighteen holes, zero pixels, and
    // a green check. A count is not a picture, so the picture has to be readable.
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, boxHeight);
    mount.replaceChildren(renderer.domElement);

    const { burden_m: B, spacing_m: S, bench_height_m: H, stemming_m: T, charge_length_m: L } = pattern;
    const spanX = S * (holesPerRow - 1);
    const spanY = B * (rows - 1);

    // The bench block: the rock this pattern is going to break.
    //
    // TRANSLUCENT, and that is the whole view working rather than a preference. Every charge column
    // and every stemming plug sits INSIDE this box by construction, because that is where a blasthole
    // is. Drawn opaque, the box hid all 36 of them and the tab showed a featureless block: the holes
    // were there, the renderer counted 18 of them and said so on the element, and not one pixel of
    // them reached the screen. A count is not a picture.
    //
    // `depthWrite: false` is the other half. Without it the box still writes depth and the columns
    // behind it are discarded before any blending happens, so transparency alone changes nothing.
    const benchSize = new THREE.Vector3(spanX + S * 1.4, H, spanY + B * 1.6);
    const bench = new THREE.Mesh(
      new THREE.BoxGeometry(benchSize.x, benchSize.y, benchSize.z),
      new THREE.MeshStandardMaterial({
        // Neutral, and deliberately not the surface token the scene background uses.
        //
        // This read `--color-fg-subtle`, a text colour, which is near-black in the light theme, so
        // the bench rendered as a dark slab on a white page. Moving it to `--color-surface-2` fixed
        // that and introduced a subtler problem: in the dark theme that token is a navy, the same
        // colour as the scene background and the same colour FAMILY as the charge, so the block had
        // no contrast against the backdrop and no pixel test could tell rock from charge. A border
        // token is neutral grey in both themes, which reads as rock, contrasts with the background,
        // and sits far from both the accent blue and the warn amber.
        color: cssColour('--color-border', '#b9bec7'),
        roughness: 0.95,
        metalness: 0.02,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
      }),
    );
    bench.position.set(0, -H / 2, 0);
    scene.add(bench);

    // The edges keep the block readable once its faces are see-through. Without them a translucent
    // box on a pale background has no silhouette at all.
    const benchEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(bench.geometry),
      new THREE.LineBasicMaterial({ color: cssColour('--color-fg-subtle', '#6b7280') }),
    );
    benchEdges.position.copy(bench.position);
    scene.add(benchEdges);

    // The free face, which is what the front row breaks toward. A blast is oriented by its free face
    // and without one the block has no front, so this is outlined as well as tinted: at 0.18 opacity
    // against a translucent bench it was invisible, which left the view with no orientation at all.
    const faceGeometry = new THREE.PlaneGeometry(benchSize.x, H);
    const face = new THREE.Mesh(
      faceGeometry,
      new THREE.MeshStandardMaterial({
        color: cssColour('--color-accent-2', '#9b6dd6'),
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    face.position.set(0, -H / 2, benchSize.z / 2);
    scene.add(face);

    const faceEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(faceGeometry),
      new THREE.LineBasicMaterial({ color: cssColour('--color-accent-2', '#9b6dd6') }),
    );
    faceEdges.position.copy(face.position);
    scene.add(faceEdges);

    const holes: { mesh: THREE.Mesh; order: number }[] = [];
    const chargeColour = cssColour('--color-accent', '#4f8ef7');
    const stemColour = cssColour('--color-warn', '#d19a2b');
    // A 165 mm hole in a 12 m bench is 1.4% of the height. Drawn true to scale it is a hairline that
    // antialiasing eats, so the columns are drawn thicker than life and the real diameter is printed
    // beside the view. Exaggerating a dimension to make it visible is fine; doing it silently is not.
    const radius = Math.max(0.16, (pattern.hole_diameter_mm / 1000) * 3.2);

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

    // The dimensions, on the drawing rather than under it. Each one is placed against the geometry it
    // measures: the spacing along a row on the crest, the burden across the rows, the bench height up
    // the near corner, and the free face named where it is.
    const dimColour = cssColour('--color-fg-subtle', '#6b7280');
    const crest = 0.25; // a little above the crest, so a line does not z-fight the top face
    const halfX = benchSize.x / 2;
    const halfZ = benchSize.z / 2;

    if (holesPerRow > 1) {
      scene.add(
        makeDimension(
          new THREE.Vector3(-spanX / 2, crest, -halfZ - 0.6),
          new THREE.Vector3(spanX / 2, crest, -halfZ - 0.6),
          dimColour,
        ),
      );
    }
    if (rows > 1) {
      scene.add(
        makeDimension(
          new THREE.Vector3(halfX + 1.4, crest, -spanY / 2),
          new THREE.Vector3(halfX + 1.4, crest, spanY / 2),
          dimColour,
        ),
      );
    }
    scene.add(
      makeDimension(
        new THREE.Vector3(-halfX - 0.6, 0, -halfZ),
        new THREE.Vector3(-halfX - 0.6, -H, -halfZ),
        dimColour,
      ),
    );

    // The lines stay in the scene; the NUMBERS moved to an overlay beside it.
    //
    // Text drawn into a 3D scene has to be positioned against geometry, and this view lets the
    // reader orbit. Every placement that read well at the opening angle collided with something at
    // another: the bench-height label sat over the pattern, the column labels sat on the columns
    // they named. A legend in a fixed corner cannot collide at any angle, and being HTML it also
    // goes through the normal translation path, which the sprites never did.
    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(spanX, H * 2.5, spanY * 2);
    scene.add(key);

    // Close enough to fill the canvas, far enough that the dimension labels beside the block are
    // inside it. The first pass at this framed the rock and clipped "4.50 m burden" off the right
    // edge, which trades one kind of missing information for another.
    const reach = Math.max(spanX, spanY, H) * 1.62 + 4;
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

    /**
     * How many of those holes a reader can actually SEE, asked of the scene rather than of a
     * screenshot.
     *
     * The hole count alone was true and useless: the columns were drawn inside an opaque block, so
     * this element said "18" while the tab showed a featureless slab. Every attempt to answer it
     * from pixels measured something adjacent instead. Counting distinct colours passed on the
     * broken view, because a shaded grey box has plenty. Classifying pixels by colour passed in the
     * dark theme, because the palette's blues sit close together. Counting transitions along a
     * scanline passed too, because it was counting the dimension lines.
     *
     * A raycast answers the actual question. Fire at each charge from the camera and see what is hit
     * first; anything the reader can see through does not occlude, which is why the test is on
     * opacity rather than on mere presence.
     */
    const countVisibleHoles = () => {
      const raycaster = new THREE.Raycaster();
      const occluders = scene.children.filter(
        (child): child is THREE.Mesh =>
          child instanceof THREE.Mesh &&
          !(child.material instanceof THREE.MeshStandardMaterial && child.material.transparent
            ? child.material.opacity < 0.9
            : false),
      );
      const target = new THREE.Vector3();
      let visible = 0;
      for (const { mesh } of holes) {
        mesh.getWorldPosition(target);
        const direction = target.clone().sub(camera.position).normalize();
        raycaster.set(camera.position, direction);
        const hit = raycaster.intersectObjects(occluders, false)[0];
        if (hit && hit.object === mesh) visible += 1;
      }
      return visible;
    };
    renderer.domElement.setAttribute('data-bench-holes-visible', String(countVisibleHoles()));

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

  const es = lang === 'es';

  // Colour-keyed to the scene, in a fixed corner, so it cannot collide with the geometry at any
  // camera angle and it reads in the language the rest of the page is in.
  const legend: { key: string; swatch: string; label: string; value: string }[] = [
    {
      key: 'charge',
      swatch: 'var(--color-accent)',
      label: es ? 'carga' : 'charge',
      value: `${pattern.charge_length_m.toFixed(2)} m · ${pattern.charge_mass_kg.toFixed(0)} kg`,
    },
    {
      key: 'stemming',
      swatch: 'var(--color-warn)',
      label: es ? 'taco' : 'stemming',
      value: `${pattern.stemming_m.toFixed(2)} m`,
    },
    {
      key: 'face',
      swatch: 'var(--color-accent-2)',
      label: es ? 'cara libre' : 'free face',
      value: es ? 'hacia el frente' : 'toward the front',
    },
    {
      key: 'burden',
      swatch: 'var(--color-fg-subtle)',
      label: es ? 'bordo x espaciamiento' : 'burden x spacing',
      value: `${pattern.burden_m.toFixed(2)} x ${pattern.spacing_m.toFixed(2)} m`,
    },
    {
      key: 'bench',
      swatch: 'var(--color-fg-subtle)',
      label: es ? 'banco' : 'bench',
      value: `${pattern.bench_height_m.toFixed(2)} m`,
    },
    {
      key: 'hole',
      swatch: 'var(--color-fg-subtle)',
      label: es ? 'perforación' : 'hole',
      value: `${pattern.hole_diameter_mm.toFixed(0)} mm`,
    },
  ];

  return (
    <div className="fr-bench">
      <div className="fr-bench-frame">
        <div ref={mountRef} className="fr-bench-canvas" style={{ minHeight: height }} />
        <dl className="fr-bench-legend">
          {legend.map((row) => (
            <div key={row.key} className="fr-bench-legend-row">
              <dt>
                <i style={{ background: row.swatch }} aria-hidden="true" />
                {row.label}
              </dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="fr-bench-bar">
        <button
          type="button"
          className="fr-btn"
          onClick={() => setPlaying((p) => !p)}
          aria-pressed={playing}
        >
          {playing
            ? es ? 'Pausar iniciación' : 'Pause initiation'
            : es ? 'Reproducir iniciación' : 'Play initiation'}
        </button>
        <span className="fr-bench-dims">
          {es ? 'roca' : 'rock'} {pattern.rock_volume_m3.toFixed(0)} m3 ·{' '}
          {(pattern.charge_mass_kg / Math.max(1e-9, pattern.rock_volume_m3)).toFixed(3)}{' '}
          {es ? 'kg por m3' : 'kg per m3'}
        </span>
        {label ? <span className="fr-bench-label">{label}</span> : null}
      </div>
      {/*
        The permanent caveat overlay. Not dismissible, because the moment it can be dismissed this
        view starts looking like evidence for something it cannot support.
      */}
      <p className="fr-note fr-note-warn" data-bench-disclaimer="timing-is-choreography">
        {es
          ? 'La secuencia de iniciación es coreografía. El factor de tiempo en el modelo clásico modificado es un solo número que multiplica el tamaño medio, sin estructura espacial, de modo que cambiar el amarre mueve esta animación y no mueve ninguna predicción de esta página. Solo el retardo agregado lo hace, y sus valores publicados no aparecen impresos en ninguna fuente disponible para este trabajo.'
          : 'The initiation sequence is choreography. The timing factor in the modified classical model is a single number multiplying the mean size, with no spatial structure, so changing the tie-in moves this animation and moves no prediction on this page. Only the aggregate delay does, and its published values are not printed in any source held for this work.'}
      </p>
    </div>
  );
}
