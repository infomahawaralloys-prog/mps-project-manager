'use client';
import { useState, useEffect, useRef } from 'react';

var THREE = null;

function IFC3DViewer({ parts, erectedPartIds, fabSummary, ifcMarks, onSelectMark }) {
  var mountRef = useRef(null);
  var sceneRef = useRef(null);
  var rendererRef = useRef(null);
  var cameraRef = useRef(null);
  var controlsRef = useRef(null);
  var meshesRef = useRef({});
  var animFrameRef = useRef(null);
  var [loaded, setLoaded] = useState(false);
  var [selectedMark, setSelectedMark] = useState(null);
  var [viewMode, setViewMode] = useState('3d');

  // Load Three.js dynamically
  useEffect(function() {
    import('three').then(function(mod) {
      THREE = mod;
      setLoaded(true);
    });
    return function() {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (rendererRef.current) rendererRef.current.dispose();
    };
  }, []);

  useEffect(function() {
    if (!loaded || !THREE || !mountRef.current || parts.length === 0) return;
    initScene();
    return function() {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
    };
  }, [loaded, parts, erectedPartIds, viewMode]);

  function getMarkColor(part) {
    var erected = !!erectedPartIds[part.id];
    if (erected) return 0x34d399; // green
    var fs = fabSummary[part.id];
    if (fs && fs.painting > 0) return 0x38bdf8; // blue - painted, ready
    if (fs && fs.welding > 0) return 0xf59e0b; // amber - in fab
    if (fs && fs.cutting > 0) return 0xfb923c; // orange - started
    return 0xdc2626; // red - not started
  }

  function getMarkType(part) {
    var d = (part.description + ' ' + part.mark).toUpperCase();
    if (d.indexOf('COL') >= 0 || d.indexOf('COLUMN') >= 0 || d.indexOf('SW_COL') >= 0) return 'column';
    if (d.indexOf('RAFT') >= 0 || d.indexOf('RAFTER') >= 0 || d.indexOf('RF') >= 0) return 'rafter';
    if (d.indexOf('BEAM') >= 0 || d.indexOf('B.') >= 0) return 'beam';
    if (d.indexOf('BRAC') >= 0 || d.indexOf('BKT') >= 0 || d.indexOf('BR') >= 0) return 'bracing';
    if (d.indexOf('PUR') >= 0 || d.indexOf('PURLIN') >= 0) return 'purlin';
    if (d.indexOf('GIRT') >= 0 || d.indexOf('GT') >= 0 || d.indexOf('C_GT') >= 0) return 'girt';
    if (d.indexOf('STRUT') >= 0 || d.indexOf('SP') >= 0 || d.indexOf('SR') >= 0) return 'strut';
    if (d.indexOf('EAV') >= 0 || d.indexOf('EA') >= 0) return 'eave';
    if (d.indexOf('CLIP') >= 0 || d.indexOf('CL') >= 0) return 'clip';
    if (d.indexOf('PLATE') >= 0 || d.indexOf('PL') >= 0 || d.indexOf('BP') >= 0) return 'plate';
    if (d.indexOf('FASH') >= 0 || d.indexOf('FA') >= 0) return 'fascia';
    if (d.indexOf('RB') >= 0 || d.indexOf('ROD') >= 0) return 'rodbracing';
    return 'other';
  }

  function initScene() {
    var mount = mountRef.current;
    if (!mount) return;

    // Clear previous
    while (mount.firstChild) mount.removeChild(mount.firstChild);
    if (rendererRef.current) rendererRef.current.dispose();

    var w = mount.clientWidth;
    var h = mount.clientHeight || 500;

    // Scene
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    scene.fog = new THREE.Fog(0x0a0a0f, 80, 200);
    sceneRef.current = scene;

    // Camera
    var camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 500);
    camera.position.set(30, 20, 40);
    camera.lookAt(0, 5, 0);
    cameraRef.current = camera;

    // Renderer
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    var ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);
    var dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(20, 30, 20);
    dirLight.castShadow = true;
    scene.add(dirLight);
    var pointLight = new THREE.PointLight(0xdc2626, 0.3, 100);
    pointLight.position.set(0, 15, 0);
    scene.add(pointLight);

    // Ground grid
    var gridHelper = new THREE.GridHelper(80, 40, 0x2a2a3a, 0x1a1a24);
    scene.add(gridHelper);

    // Ground plane
    var groundGeo = new THREE.PlaneGeometry(80, 80);
    var groundMat = new THREE.MeshStandardMaterial({ color: 0x0d0d14, transparent: true, opacity: 0.8 });
    var ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    // Build PEB structure from parts
    buildStructure(scene);

    // Simple orbit controls (manual)
    var isDragging = false;
    var prevMouse = { x: 0, y: 0 };
    var spherical = { theta: Math.PI / 4, phi: Math.PI / 4, radius: 50 };

    function updateCamera() {
      var x = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      var y = spherical.radius * Math.cos(spherical.phi);
      var z = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.position.set(x, y, z);
      camera.lookAt(0, 5, 0);
    }

    mount.addEventListener('mousedown', function(e) { isDragging = true; prevMouse = { x: e.clientX, y: e.clientY }; });
    mount.addEventListener('mousemove', function(e) {
      if (!isDragging) return;
      var dx = e.clientX - prevMouse.x;
      var dy = e.clientY - prevMouse.y;
      spherical.theta -= dx * 0.005;
      spherical.phi = Math.max(0.2, Math.min(Math.PI - 0.2, spherical.phi + dy * 0.005));
      prevMouse = { x: e.clientX, y: e.clientY };
      updateCamera();
    });
    mount.addEventListener('mouseup', function() { isDragging = false; });
    mount.addEventListener('wheel', function(e) {
      spherical.radius = Math.max(10, Math.min(100, spherical.radius + e.deltaY * 0.05));
      updateCamera();
    });

    // Touch support
    mount.addEventListener('touchstart', function(e) {
      if (e.touches.length === 1) { isDragging = true; prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }
    });
    mount.addEventListener('touchmove', function(e) {
      if (!isDragging || e.touches.length !== 1) return;
      var dx = e.touches[0].clientX - prevMouse.x;
      var dy = e.touches[0].clientY - prevMouse.y;
      spherical.theta -= dx * 0.005;
      spherical.phi = Math.max(0.2, Math.min(Math.PI - 0.2, spherical.phi + dy * 0.005));
      prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      updateCamera();
    });
    mount.addEventListener('touchend', function() { isDragging = false; });

    // Click to select
    var raycaster = new THREE.Raycaster();
    var mouse = new THREE.Vector2();
    mount.addEventListener('click', function(e) {
      if (isDragging) return;
      var rect = mount.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / w) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / h) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      var allMeshes = Object.values(meshesRef.current).filter(Boolean);
      var intersects = raycaster.intersectObjects(allMeshes);
      if (intersects.length > 0) {
        var hit = intersects[0].object;
        setSelectedMark(hit.userData);
        if (onSelectMark) onSelectMark(hit.userData);
      } else {
        setSelectedMark(null);
      }
    });

    updateCamera();

    // Animate
    function animate() {
      animFrameRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }
    animate();

    // Handle resize
    function onResize() {
      var nw = mount.clientWidth;
      var nh = mount.clientHeight || 500;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    }
    window.addEventListener('resize', onResize);
  }

  function buildStructure(scene) {
    meshesRef.current = {};

    // Classify parts by type
    var classified = {};
    parts.forEach(function(p) {
      var type = getMarkType(p);
      if (!classified[type]) classified[type] = [];
      classified[type].push(p);
    });

    var columns = classified.column || [];
    var rafters = classified.rafter || [];
    var beams = classified.beam || [];
    var purlins = classified.purlin || [];
    var girts = classified.girt || [];
    var bracings = classified.bracing || [];
    var struts = classified.strut || [];
    var others = [].concat(classified.clip || [], classified.plate || [], classified.fascia || [], classified.rodbracing || [], classified.eave || [], classified.other || []);

    // PEB layout parameters
    var baySpacing = 6;
    var buildingWidth = 20;
    var eaveHeight = 8;
    var ridgeHeight = 11;
    var numBays = Math.max(Math.ceil(columns.length / 2), 4);

    // Place columns
    columns.forEach(function(p, i) {
      var side = i % 2 === 0 ? -1 : 1;
      var bay = Math.floor(i / 2);
      var x = side * (buildingWidth / 2);
      var z = bay * baySpacing - (numBays * baySpacing / 2);
      var h = eaveHeight;
      addMember(scene, p, x, h / 2, z, 0.3, h, 0.3, 'column');
    });

    // Place rafters
    rafters.forEach(function(p, i) {
      var bay = i % numBays;
      var side = Math.floor(i / numBays) % 2 === 0 ? -1 : 1;
      var z = bay * baySpacing - (numBays * baySpacing / 2);
      var x = side * (buildingWidth / 4);
      var slopeH = (ridgeHeight - eaveHeight) / 2;
      addMember(scene, p, x, eaveHeight + slopeH, z, buildingWidth / 2, 0.4, 0.25, 'rafter');
    });

    // Place beams
    beams.forEach(function(p, i) {
      var bay = i % numBays;
      var z = bay * baySpacing - (numBays * baySpacing / 2);
      addMember(scene, p, 0, eaveHeight * 0.6, z, buildingWidth * 0.6, 0.3, 0.2, 'beam');
    });

    // Place purlins along roof
    purlins.forEach(function(p, i) {
      var row = i % 6;
      var bay = Math.floor(i / 6) % numBays;
      var z = bay * baySpacing - (numBays * baySpacing / 2);
      var x = (row - 2.5) * (buildingWidth / 6);
      var roofSlope = (ridgeHeight - eaveHeight) * (1 - Math.abs(row - 2.5) / 3);
      addMember(scene, p, x, eaveHeight + roofSlope + 0.3, z, 0.1, 0.15, baySpacing * 0.9, 'purlin');
    });

    // Place girts on walls
    girts.forEach(function(p, i) {
      var side = i % 2 === 0 ? -1 : 1;
      var row = Math.floor(i / 2) % 4;
      var bay = Math.floor(i / 8) % numBays;
      var z = bay * baySpacing - (numBays * baySpacing / 2);
      var y = (row + 1) * (eaveHeight / 5);
      addMember(scene, p, side * (buildingWidth / 2), y, z, 0.1, 0.12, baySpacing * 0.9, 'girt');
    });

    // Place bracings
    bracings.forEach(function(p, i) {
      var side = i % 2 === 0 ? -1 : 1;
      var bay = Math.floor(i / 2) % numBays;
      var z = bay * baySpacing - (numBays * baySpacing / 2);
      addMember(scene, p, side * (buildingWidth / 2 - 1), eaveHeight / 2, z, 0.08, eaveHeight * 0.8, 0.08, 'bracing');
    });

    // Place struts
    struts.forEach(function(p, i) {
      var bay = i % numBays;
      var z = bay * baySpacing - (numBays * baySpacing / 2);
      addMember(scene, p, 0, eaveHeight + 1, z, buildingWidth * 0.3, 0.15, 0.15, 'strut');
    });

    // Place small items (clips, plates etc) near the building
    others.forEach(function(p, i) {
      var angle = (i / others.length) * Math.PI * 2;
      var radius = buildingWidth / 2 + 3;
      var x = Math.cos(angle) * radius;
      var z = Math.sin(angle) * radius;
      addMember(scene, p, x, 0.15, z, 0.3, 0.3, 0.3, 'small');
    });
  }

  function addMember(scene, part, x, y, z, sx, sy, sz, memberType) {
    var color = getMarkColor(part);
    var geo;
    if (memberType === 'column') {
      geo = new THREE.BoxGeometry(sx, sy, sz);
    } else if (memberType === 'rafter') {
      geo = new THREE.BoxGeometry(sx, sy, sz);
    } else if (memberType === 'purlin' || memberType === 'girt') {
      geo = new THREE.CylinderGeometry(sx, sx, sz, 8);
    } else {
      geo = new THREE.BoxGeometry(sx, sy, sz);
    }

    var mat = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.6,
      roughness: 0.3,
      transparent: true,
      opacity: erectedPartIds[part.id] ? 1.0 : 0.7,
      emissive: color,
      emissiveIntensity: erectedPartIds[part.id] ? 0.15 : 0.05
    });

    var mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { id: part.id, mark: part.mark, description: part.description, weight: part.weight, erected: !!erectedPartIds[part.id], type: memberType };

    if (memberType === 'purlin' || memberType === 'girt') {
      mesh.rotation.x = Math.PI / 2;
    }
    if (memberType === 'bracing') {
      mesh.rotation.z = Math.PI / 6 * (x > 0 ? 1 : -1);
    }

    scene.add(mesh);
    meshesRef.current[part.id] = mesh;
  }

  var erected = parts.filter(function(p) { return !!erectedPartIds[p.id]; }).length;
  var pct = parts.length > 0 ? Math.round(erected / parts.length * 100) : 0;

  return (
    <div className="glass-card" style={{ padding: 0, overflow: 'hidden', borderLeft: '3px solid #a78bfa' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(42,42,58,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🏗</span>
          <span className="mono" style={{ fontSize: 11, color: 'var(--dim)', letterSpacing: 2, fontWeight: 600 }}>3D ERECTION VIEW</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="mono" style={{ fontSize: 10, color: '#34d399' }}>{erected}/{parts.length} erected ({pct}%)</span>
        </div>
      </div>

      {/* Legend */}
      <div style={{ padding: '8px 16px', display: 'flex', gap: 12, flexWrap: 'wrap', borderBottom: '1px solid rgba(42,42,58,0.2)' }}>
        {[
          { color: '#34d399', label: 'Erected' },
          { color: '#38bdf8', label: 'Painted (Ready)' },
          { color: '#f59e0b', label: 'In Fabrication' },
          { color: '#fb923c', label: 'Cutting Started' },
          { color: '#dc2626', label: 'Not Started' },
        ].map(function(item) {
          return (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: item.color }} />
              <span style={{ fontSize: 9, color: 'var(--dim)' }}>{item.label}</span>
            </div>
          );
        })}
      </div>

      {/* 3D Canvas */}
      {!loaded ? (
        <div style={{ height: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 30, height: 30, border: '3px solid #2a2a3a', borderTop: '3px solid #dc2626', borderRadius: '50%', margin: '0 auto 12px' }} className="animate-spin" />
            <span className="mono" style={{ fontSize: 11, color: 'var(--dim)' }}>Loading 3D engine...</span>
          </div>
        </div>
      ) : parts.length === 0 ? (
        <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 40 }}>📦</span>
            <p className="mono" style={{ fontSize: 11, color: 'var(--dim)', marginTop: 8 }}>No parts to display. Upload BOM first.</p>
          </div>
        </div>
      ) : (
        <div ref={mountRef} style={{ height: 500, width: '100%', cursor: 'grab' }} />
      )}

      {/* Selected mark info */}
      {selectedMark && (
        <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(42,42,58,0.3)', background: 'rgba(10,10,15,0.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: selectedMark.erected ? '#34d399' : '#dc2626' }} />
            <span className="mono" style={{ fontWeight: 700, fontSize: 13, color: selectedMark.erected ? '#34d399' : '#dc2626' }}>{selectedMark.mark}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{selectedMark.description}</span>
            <span className="mono" style={{ fontSize: 10, color: 'var(--dim)', marginLeft: 'auto' }}>{selectedMark.weight} kg</span>
            <span className="badge" style={{ background: selectedMark.erected ? 'rgba(52,211,153,0.15)' : 'rgba(220,38,38,0.15)', color: selectedMark.erected ? '#34d399' : '#dc2626' }}>
              {selectedMark.erected ? 'ERECTED' : 'PENDING'}
            </span>
          </div>
        </div>
      )}

      {/* Controls hint */}
      <div style={{ padding: '6px 16px', textAlign: 'center', borderTop: '1px solid rgba(42,42,58,0.2)' }}>
        <span style={{ fontSize: 9, color: 'var(--dim)' }}>🖱 Drag to rotate · Scroll to zoom · Click to select mark</span>
      </div>
    </div>
  );
}

export default IFC3DViewer;