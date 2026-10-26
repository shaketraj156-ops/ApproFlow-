import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const STAGE_COUNT = 7;

/**
 * A decorative WebGL scene for the home page hero: a glowing core, seven "stage" nodes travelling
 * along an orbit (one per approval stage), rings and drifting particles. It follows the pointer a little.
 * Draws nothing and starts no loop for reduced-motion users or when WebGL is unavailable.
 */
export default function HeroScene({ className = '' }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'low-power' });
    } catch {
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    renderer.domElement.style.display = 'block';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 11);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.PointLight(0x34d399, 60, 40);
    key.position.set(5, 4, 6);
    scene.add(key);
    const fill = new THREE.PointLight(0x818cf8, 40, 40);
    fill.position.set(-6, -3, 4);
    scene.add(fill);

    const disposables = [];
    const track = (obj) => { disposables.push(obj); return obj; };

    // Everything lives in one group so it can sit right of centre and tilt with the pointer.
    const rig = new THREE.Group();
    scene.add(rig);

    const core = new THREE.Mesh(
      track(new THREE.IcosahedronGeometry(1.5, 0)),
      track(new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x047857, emissiveIntensity: 0.7, metalness: 0.4, roughness: 0.25, flatShading: true }))
    );
    rig.add(core);

    const shell = new THREE.Mesh(
      track(new THREE.IcosahedronGeometry(2.1, 0)),
      track(new THREE.MeshBasicMaterial({ color: 0x6ee7b7, wireframe: true, transparent: true, opacity: 0.22 }))
    );
    rig.add(shell);

    const ringA = new THREE.Mesh(
      track(new THREE.TorusGeometry(3.2, 0.025, 6, 80)),
      track(new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.7 }))
    );
    ringA.rotation.x = Math.PI / 2.4;
    rig.add(ringA);

    const ringB = new THREE.Mesh(
      track(new THREE.TorusGeometry(4.1, 0.018, 6, 80)),
      track(new THREE.MeshBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0.55 }))
    );
    ringB.rotation.set(Math.PI / 3, Math.PI / 6, 0);
    rig.add(ringB);

    // Seven nodes on ring A: the approval stages. The last one is brighter (the decision).
    const orbit = new THREE.Group();
    orbit.rotation.x = ringA.rotation.x;
    rig.add(orbit);
    const nodeGeo = track(new THREE.SphereGeometry(0.24, 14, 14));
    const nodes = [];
    for (let i = 0; i < STAGE_COUNT; i += 1) {
      const last = i === STAGE_COUNT - 1;
      const mat = track(new THREE.MeshStandardMaterial({
        color: last ? 0xfbbf24 : 0xffffff,
        emissive: last ? 0xf59e0b : 0x34d399,
        emissiveIntensity: last ? 0.9 : 0.5,
        roughness: 0.3,
      }));
      const node = new THREE.Mesh(nodeGeo, mat);
      const a = (i / STAGE_COUNT) * Math.PI * 2;
      node.position.set(Math.cos(a) * 3.2, Math.sin(a) * 3.2, 0);
      node.userData.phase = i;
      orbit.add(node);
      nodes.push(node);
    }

    // Drifting particles.
    const COUNT = 110;
    const positions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 26;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 14 - 2;
    }
    const particleGeo = track(new THREE.BufferGeometry());
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(
      particleGeo,
      track(new THREE.PointsMaterial({ color: 0xa7f3d0, size: 0.06, transparent: true, opacity: 0.7, sizeAttenuation: true }))
    );
    scene.add(particles);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = mount;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      // On wide screens push the object to the right, away from the headline; centre it on narrow ones.
      rig.position.x = w > 1024 ? 4.2 : 0;
      rig.position.y = w > 1024 ? 0 : 2.2;
      rig.scale.setScalar(w > 1024 ? 1 : 0.7);
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    const pointer = { x: 0, y: 0 };
    const onMove = (e) => {
      pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    const clock = new THREE.Clock();
    let raf = 0;
    let visible = true;

    const frame = () => {
      const t = clock.getElapsedTime();
      core.rotation.y = t * 0.35;
      core.rotation.x = t * 0.15;
      core.scale.setScalar(1 + Math.sin(t * 1.6) * 0.04);
      shell.rotation.y = -t * 0.2;
      shell.rotation.z = t * 0.1;
      ringA.rotation.z = t * 0.12;
      ringB.rotation.z = -t * 0.09;
      orbit.rotation.z = t * 0.12;
      nodes.forEach((n) => n.scale.setScalar(1 + Math.sin(t * 2 + n.userData.phase) * 0.18));
      particles.rotation.y = t * 0.015;
      particles.position.y = Math.sin(t * 0.3) * 0.2;
      rig.rotation.y += (pointer.x * 0.35 - rig.rotation.y) * 0.05;
      rig.rotation.x += (pointer.y * 0.2 - rig.rotation.x) * 0.05;
      renderer.render(scene, camera);
    };

    // About 30 frames a second is plenty for slow motion and halves the GPU work.
    let last = 0;
    const loop = (now = 0) => {
      raf = requestAnimationFrame(loop);
      if (now - last < 33) return;
      last = now;
      frame();
    };

    if (reduce) {
      frame(); // one still frame
    } else {
      loop();
    }

    // Stop drawing while the hero is off screen or the tab is hidden.
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible && !reduce && !document.hidden) loop();
    });
    io.observe(mount);
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && visible && !reduce) loop();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      observer.disconnect();
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVisibility);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} className={`pointer-events-none ${className}`} aria-hidden="true" />;
}
