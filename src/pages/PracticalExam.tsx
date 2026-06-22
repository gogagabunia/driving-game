import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getCityById } from '../data/cities';
import { useLang } from '../contexts/LanguageContext';
import { SoundSynthesizer } from '../engine/SoundSynthesizer';
import { CarPhysics, GearState } from '../engine/CarPhysics';
import { CourseManager, TaskData } from '../engine/CourseManager';
import SettingsModal from '../components/SettingsModal';

// Babylon.js imports
import {
  Engine,
  Scene,
  Vector3,
  Color3,
  Color4,
  HemisphericLight,
  DirectionalLight,
  MeshBuilder,
  PBRMaterial,
  ShadowGenerator,
  Mesh,
  SpotLight,
  SceneLoader,
  DefaultRenderingPipeline,
  GlowLayer,
  ImageProcessingConfiguration,
  Texture,
  ColorCurves,
  VertexData,
  Material
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { SkyMaterial } from '@babylonjs/materials';
// Inspector loaded dynamically on Shift+I (dev only)

import './PracticalExam.css';

interface ViolationLog {
  id: string;
  time: string;
  points: number;
  reasonEn: string;
  reasonKa: string;
}

// Helper to split a combined axle mesh into left and right wheels
function splitCombinedMesh(mesh: Mesh, scene: Scene): { left: Mesh, right: Mesh } {
  const vertexData = VertexData.ExtractFromMesh(mesh);
  const positions = vertexData.positions!;
  const indices = vertexData.indices!;
  
  const leftIndices: number[] = [];
  const rightIndices: number[] = [];
  
  // 1. Classify indices and calculate centers based on raw GLB coordinates (Z > 0 is Left, Z < 0 is Right)
  let leftSumX = 0, leftSumY = 0, leftSumZ = 0, leftCount = 0;
  let rightSumX = 0, rightSumY = 0, rightSumZ = 0, rightCount = 0;
  
  for (let i = 0; i < indices.length; i += 3) {
    const i1 = indices[i];
    const i2 = indices[i + 1];
    const i3 = indices[i + 2];
    
    const z = positions[i1 * 3 + 2];
    if (z > 0) {
      leftIndices.push(i1, i2, i3);
    } else {
      rightIndices.push(i1, i2, i3);
    }
  }

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    if (z > 0) {
      leftSumX += x;
      leftSumY += y;
      leftSumZ += z;
      leftCount++;
    } else {
      rightSumX += x;
      rightSumY += y;
      rightSumZ += z;
      rightCount++;
    }
  }
  
  const leftCenter = leftCount > 0
    ? new Vector3(leftSumX / leftCount, leftSumY / leftCount, leftSumZ / leftCount)
    : Vector3.Zero();
    
  const rightCenter = rightCount > 0
    ? new Vector3(rightSumX / rightCount, rightSumY / rightCount, rightSumZ / rightCount)
    : Vector3.Zero();

  // 2. Create shifted positions so that the local origin of each split mesh is at its physical wheel center
  const leftPositions = new Float32Array(positions.length);
  for (let i = 0; i < positions.length; i += 3) {
    leftPositions[i] = positions[i] - leftCenter.x;
    leftPositions[i + 1] = positions[i + 1] - leftCenter.y;
    leftPositions[i + 2] = positions[i + 2] - leftCenter.z;
  }
  
  const rightPositions = new Float32Array(positions.length);
  for (let i = 0; i < positions.length; i += 3) {
    rightPositions[i] = positions[i] - rightCenter.x;
    rightPositions[i + 1] = positions[i + 1] - rightCenter.y;
    rightPositions[i + 2] = positions[i + 2] - rightCenter.z;
  }
  
  // 3. Create Left Mesh (Z > 0)
  const leftMesh = new Mesh(mesh.name + "_L", scene);
  const leftData = new VertexData();
  leftData.positions = leftPositions as any;
  leftData.normals = vertexData.normals;
  leftData.uvs = vertexData.uvs;
  leftData.indices = leftIndices;
  leftData.applyToMesh(leftMesh);
  leftMesh.material = mesh.material;
  
  leftMesh.parent = mesh.parent;
  leftMesh.scaling = mesh.scaling.clone();
  leftMesh.rotation = mesh.rotation.clone();
  if (mesh.rotationQuaternion) {
    leftMesh.rotationQuaternion = mesh.rotationQuaternion.clone();
  } else {
    leftMesh.rotationQuaternion = null;
  }
  leftMesh.position = mesh.position.add(leftCenter);
  leftMesh.overrideMaterialSideOrientation = Material.ClockWiseSideOrientation;
  
  // 4. Create Right Mesh (Z < 0)
  const rightMesh = new Mesh(mesh.name + "_R", scene);
  const rightData = new VertexData();
  rightData.positions = rightPositions as any;
  rightData.normals = vertexData.normals;
  rightData.uvs = vertexData.uvs;
  rightData.indices = rightIndices;
  rightData.applyToMesh(rightMesh);
  rightMesh.material = mesh.material;
  
  rightMesh.parent = mesh.parent;
  rightMesh.scaling = mesh.scaling.clone();
  rightMesh.rotation = mesh.rotation.clone();
  if (mesh.rotationQuaternion) {
    rightMesh.rotationQuaternion = mesh.rotationQuaternion.clone();
  } else {
    rightMesh.rotationQuaternion = null;
  }
  rightMesh.position = mesh.position.add(rightCenter);
  rightMesh.overrideMaterialSideOrientation = Material.ClockWiseSideOrientation;
  
  // 5. Force world matrix calculation to bake the loaded GLB parent transforms (like scales and rotations)
  leftMesh.computeWorldMatrix(true);
  rightMesh.computeWorldMatrix(true);
  
  return { left: leftMesh, right: rightMesh };
}

const PracticalExam: React.FC = () => {
  const { t } = useTranslation();
  const { lang } = useLang();
  const { cityId } = useParams<{ cityId: string }>();
  const navigate = useNavigate();
  const city = cityId ? getCityById(cityId) : null;

  // Canvas and engine references
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  
  // Custom engine script instances
  const carPhysicsRef = useRef<CarPhysics | null>(null);
  const courseManagerRef = useRef<CourseManager | null>(null);
  const soundRef = useRef<SoundSynthesizer | null>(null);
  
  // Penalty debounce and warning tracking refs
  const lastPenaltyTimeRef = useRef<Record<string, number>>({});
  const scoreWarningShownRef = useRef(false);

  const [showSettings, setShowSettings] = useState(false);
  const [loadingState, setLoadingState] = useState({
    visible: true,
    progress: 0,
    status: "Initializing engine..."
  });

  // Keyboard state tracking
  const inputsRef = useRef({
    accelerate: false,
    reverse: false,
    steerLeft: false,
    steerRight: false,
    handbrake: true
  });

  // UI state tracking
  const [speed, setSpeed] = useState(0);
  const [gear, setGear] = useState<GearState>('D');
  const [handbrake, setHandbrake] = useState(true);
  const [score, setScore] = useState(100);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [activeTask, setActiveTask] = useState<TaskData | null>(null);
  const [showBanner, setShowBanner] = useState(true);
  const bannerTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (activeTask) {
      setShowBanner(true);
      if (bannerTimeoutRef.current) {
        clearTimeout(bannerTimeoutRef.current);
      }
      bannerTimeoutRef.current = setTimeout(() => {
        setShowBanner(false);
      }, 10000);
    }
    return () => {
      if (bannerTimeoutRef.current) {
        clearTimeout(bannerTimeoutRef.current);
      }
    };
  }, [activeTask]);

  const [examState, setExamState] = useState<'intro' | 'driving' | 'paused' | 'passed' | 'failed'>('intro');
  const examStateRef = useRef(examState);
  useEffect(() => {
    examStateRef.current = examState;
  }, [examState]);

  // Camera switching states & refs
  const [cameraMode, setCameraMode] = useState<1 | 2 | 3>(1);
  const [showCameraHUD, setShowCameraHUD] = useState(false);
  const [fadeOutCameraHUD, setFadeOutCameraHUD] = useState(false);
  const cameraHUDTimeoutRef = useRef<any>(null);
  const cameraHUDFadeTimeoutRef = useRef<any>(null);

  const cameraRef = useRef<any>(null);
  const cameraModeRef = useRef<1 | 2 | 3>(1);
  const cameraTransitionRef = useRef({
    startPosition: new Vector3(),
    startTarget: new Vector3(),
    transitionTime: 0.3,
    targetMode: 1 as 1 | 2 | 3,
  });

  const orbitParamsRef = useRef({
    alpha: 0,
    beta: Math.PI / 3,
    radius: 10,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
  });

  const triggerCameraHUD = (mode: 1 | 2 | 3) => {
    setCameraMode(mode);
    setShowCameraHUD(true);
    setFadeOutCameraHUD(false);

    if (cameraHUDTimeoutRef.current) clearTimeout(cameraHUDTimeoutRef.current);
    if (cameraHUDFadeTimeoutRef.current) clearTimeout(cameraHUDFadeTimeoutRef.current);

    cameraHUDFadeTimeoutRef.current = setTimeout(() => {
      setFadeOutCameraHUD(true);
    }, 1000);

    cameraHUDTimeoutRef.current = setTimeout(() => {
      setShowCameraHUD(false);
      setFadeOutCameraHUD(false);
    }, 1500);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (cameraModeRef.current !== 3) return;
    orbitParamsRef.current.isDragging = true;
    orbitParamsRef.current.lastMouseX = e.clientX;
    orbitParamsRef.current.lastMouseY = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (cameraModeRef.current !== 3 || !orbitParamsRef.current.isDragging) return;
    const dx = e.clientX - orbitParamsRef.current.lastMouseX;
    const dy = e.clientY - orbitParamsRef.current.lastMouseY;

    orbitParamsRef.current.alpha -= dx * 0.005;
    orbitParamsRef.current.beta = Math.max(
      0.1,
      Math.min(Math.PI / 2 - 0.05, orbitParamsRef.current.beta + dy * 0.005)
    );

    orbitParamsRef.current.lastMouseX = e.clientX;
    orbitParamsRef.current.lastMouseY = e.clientY;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (cameraModeRef.current !== 3) return;
    orbitParamsRef.current.isDragging = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (cameraModeRef.current !== 3) return;
    orbitParamsRef.current.radius = Math.max(
      3.0,
      Math.min(25.0, orbitParamsRef.current.radius + e.deltaY * 0.015)
    );
  };

  const [violationLogs, setViolationLogs] = useState<ViolationLog[]>([]);
  const [activeToasts, setActiveToasts] = useState<ViolationLog[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Timer countdown
  useEffect(() => {
    if (examState !== 'driving') return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endExam(false, 'Out of Time', 'დრო ამოიწურა');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [examState]);

  // Format time (mm:ss)
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Sound instance setup
  useEffect(() => {
    soundRef.current = new SoundSynthesizer();
    return () => {
      soundRef.current?.destroy();
    };
  }, []);

  const handleMuteToggle = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundRef.current?.setMute(nextMuted);
  };

  const handlePauseToggle = () => {
    if (examState === 'driving') {
      setExamState('paused');
      soundRef.current?.stopEngine();
    } else if (examState === 'paused') {
      setExamState('driving');
      soundRef.current?.startEngine();
      setTimeout(() => {
        canvasRef.current?.focus();
      }, 100);
    }
  };

  // Add violation record
  const addViolation = (points: number, reasonEn: string, reasonKa: string) => {
    // Cooldown/debounce on the penalty trigger (Fix 1)
    const now = Date.now();
    const cooldownMs = 2000;
    const lastTime = lastPenaltyTimeRef.current[reasonEn] ?? 0;
    if (now - lastTime < cooldownMs) return;
    lastPenaltyTimeRef.current[reasonEn] = now;

    soundRef.current?.playHit();
    const newLog: ViolationLog = {
      id: Math.random().toString(36).substring(2, 9),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      points,
      reasonEn,
      reasonKa
    };

    setViolationLogs(prev => [...prev, newLog]);
    setScore(prev => {
      const nextScore = prev - points;
      if (nextScore >= 80) {
        scoreWarningShownRef.current = false;
      }
      if (nextScore < 80) {
        if (!scoreWarningShownRef.current) {
          scoreWarningShownRef.current = true;
          // Run on next tick to avoid state collision during render
          setTimeout(() => {
            endExam(false, 'Score fell below passing threshold (80 points)', 'ქულები ჩამოსცდა ზღვარს (80 ქულა)');
          }, 10);
        }
      }
      return Math.max(0, nextScore);
    });

    // Flash penalty toast
    setActiveToasts(prev => [...prev, newLog]);
    setTimeout(() => {
      setActiveToasts(prev => prev.filter(t => t.id !== newLog.id));
    }, 3500);

    // Apply flash class to score box
    const scoreBox = document.getElementById('score-box');
    if (scoreBox) {
      scoreBox.classList.add('penalty-flash');
      setTimeout(() => scoreBox.classList.remove('penalty-flash'), 1000);
    }
  };

  // Complete a task
  const handleTaskCompleted = (index: number) => {
    soundRef.current?.playWin();
    if (courseManagerRef.current) {
      const completed = courseManagerRef.current.tasks[index];
      // Alert toast for task completion
      const toastLog: ViolationLog = {
        id: Math.random().toString(36).substring(2, 9),
        time: '',
        points: 0,
        reasonEn: `Completed: ${completed.nameEn}`,
        reasonKa: `შესრულდა: ${completed.nameKa}`
      };
      setActiveToasts(prev => [...prev, toastLog]);
      setTimeout(() => {
        setActiveToasts(prev => prev.filter(t => t.id !== toastLog.id));
      }, 2500);

      // Check if this was the final task
      if (index === courseManagerRef.current.tasks.length - 1) {
        endExam(true);
      } else {
        setActiveTask(courseManagerRef.current.tasks[index + 1]);
      }
    }
  };

  // End exam scenario
  const endExam = (passed: boolean, reasonEn = '', reasonKa = '') => {
    setExamState(passed ? 'passed' : 'failed');
    soundRef.current?.stopEngine();

    if (passed) {
      soundRef.current?.playWin();
    } else {
      soundRef.current?.playFail();
      if (reasonEn) {
        addViolation(0, reasonEn, reasonKa);
      }
    }

    // Save attempt record to local storage
    try {
      const history = JSON.parse(localStorage.getItem('examHistory') || '[]');
      const elapsed = 300 - timeLeft;
      const record = {
        id: Math.random().toString(36).substring(2, 9),
        date: new Date().toISOString(),
        type: 'practical',
        city: city?.nameEn || 'Rustavi',
        score: Math.max(0, score),
        maxScore: 100,
        passed,
        duration: elapsed
      };
      history.unshift(record);
      localStorage.setItem('examHistory', JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save exam history:', e);
    }
  };

  // Initialize 3D Engine and Course
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let lastWallCollisionTime = 0;

    // 1. Initialise Babylon Engine & Scene
    const engine = new Engine(canvas, true, {
      antialias: true,
      adaptToDeviceRatio: true,
      stencil: true,
    });
    engineRef.current = engine;

    const scene = new Scene(engine);
    sceneRef.current = scene;
    (window as any).debugScene = scene;
    setLoadingState({ visible: true, progress: 20, status: "Initializing engine..." });

    // Sky colors based on selected city's color profile
    let skyR = 0.05, skyG = 0.1, skyB = 0.2;
    if (city) {
      // Crude parsing of sky gradient (e.g. #2C7BB6 or #87CEEB)
      if (city.id === 'batumi') { skyR = 0.1; skyG = 0.25; skyB = 0.45; }
      else if (city.id === 'sachkhere') { skyR = 0.15; skyG = 0.22; skyB = 0.28; }
      else if (city.id === 'telavi') { skyR = 0.2; skyG = 0.32; skyB = 0.38; }
      else if (city.id === 'rustavi') { skyR = 0.25; skyG = 0.4; skyB = 0.5; }
    }
    scene.clearColor = new Color4(skyR, skyG, skyB, 1);

    // IBL reflections for PBR materials
    scene.createDefaultEnvironment({ createGround: false, createSkybox: false });

    // Lights
    const hemiLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), scene);
    hemiLight.intensity = 0.6;
    hemiLight.diffuse = new Color3(0.7, 0.85, 1.0); // sky blue
    hemiLight.groundColor = new Color3(0.4, 0.35, 0.28); // warm ground bounce

    const dirLight = new DirectionalLight("dirLight", new Vector3(-0.6, -1.0, -0.4), scene);
    dirLight.position = new Vector3(20, 40, 20);
    dirLight.intensity = 4.5;
    dirLight.diffuse = new Color3(1.0, 0.95, 0.85); // warm golden sun
    dirLight.specular = new Color3(1.0, 0.98, 0.9);

    const fillLight = new DirectionalLight("fillLight", new Vector3(1, -1, 1), scene);
    fillLight.intensity = 0.3;
    fillLight.diffuse = new Color3(0.85, 0.9, 1.0);

    // Shadows
    const shadowGenerator = new ShadowGenerator(2048, dirLight);
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurKernel = 32;
    shadowGenerator.darkness = 0.3;

    // Skybox using Babylon's built-in SkyMaterial
    const skyMaterial = new SkyMaterial("skyMat", scene);
    skyMaterial.backFaceCulling = false;
    skyMaterial.inclination = -0.35; // sun high in sky
    skyMaterial.azimuth = 0.25;      // south-east sun direction
    skyMaterial.luminance = 0.9;
    skyMaterial.turbidity = 5;       // slight haze
    skyMaterial.rayleigh = 2.5;
    const skybox = MeshBuilder.CreateBox("skyBox", { size: 1000 }, scene);
    skybox.material = skyMaterial;
    skybox.infiniteDistance = true;

    setLoadingState({ visible: true, progress: 40, status: "Loading environment..." });

    // 2. Build closed course meshes
    setLoadingState({ visible: true, progress: 60, status: "Loading environment..." });

    // Navy Grid Ground (apply asphalt texture)
    const ground = MeshBuilder.CreateGround("ground", { width: 100, height: 120 }, scene);
    const groundMat = new PBRMaterial("groundMat", scene);
    const groundAlbedo = new Texture("https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/asphalt_02/asphalt_02_diff_1k.jpg", scene);
    groundAlbedo.uScale = 12;
    groundAlbedo.vScale = 12;
    groundMat.albedoTexture = groundAlbedo;

    const groundBump = new Texture("https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/asphalt_02/asphalt_02_nor_gl_1k.jpg", scene);
    groundBump.uScale = 12;
    groundBump.vScale = 12;
    groundMat.bumpTexture = groundBump;

    const groundMetallic = new Texture("https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/asphalt_02/asphalt_02_rough_1k.jpg", scene);
    groundMetallic.uScale = 12;
    groundMetallic.vScale = 12;
    groundMat.metallicTexture = groundMetallic;

    groundMat.roughness = 0.92;
    groundMat.metallic = 0.0;
    ground.material = groundMat;
    ground.receiveShadows = true;

    // Draw grid markings on the ground to give spatial awareness
    const gridMarkingsMat = new PBRMaterial("gridMarkingsMat", scene);
    gridMarkingsMat.albedoColor = new Color3(0.15, 0.2, 0.3);
    gridMarkingsMat.metallic = 0.0;
    gridMarkingsMat.roughness = 0.6;
    for (let x = -40; x <= 40; x += 10) {
      const line = MeshBuilder.CreatePlane(`grid_x_${x}`, { width: 0.15, height: 120 }, scene);
      line.rotation.x = Math.PI / 2;
      line.position.set(x, 0.005, 0);
      line.material = gridMarkingsMat;
    }
    for (let z = -50; z <= 50; z += 10) {
      const line = MeshBuilder.CreatePlane(`grid_z_${z}`, { width: 80, height: 0.15 }, scene);
      line.rotation.x = Math.PI / 2;
      line.position.set(0, 0.005, z);
      line.material = gridMarkingsMat;
    }

    // Outer Boundary Warning Rails (Red/White barrier blocks)
    const barrierMatRed = new PBRMaterial("barrierMatRed", scene);
    barrierMatRed.albedoColor = new Color3(0.85, 0.15, 0.15);
    barrierMatRed.metallic = 0.0;
    barrierMatRed.roughness = 0.6;
    const barrierMatWhite = new PBRMaterial("barrierMatWhite", scene);
    barrierMatWhite.albedoColor = new Color3(0.95, 0.95, 0.95);
    barrierMatWhite.metallic = 0.0;
    barrierMatWhite.roughness = 0.6;

    const buildBarrierWall = (startX: number, startZ: number, endX: number, endZ: number) => {
      const isXWall = startZ === endZ;
      const len = isXWall ? Math.abs(endX - startX) : Math.abs(endZ - startZ);
      const segments = Math.ceil(len / 4);

      for (let i = 0; i < segments; i++) {
        const seg = MeshBuilder.CreateBox(`barrier_${startX}_${startZ}_${i}`, { width: isXWall ? 3.8 : 0.6, height: 0.5, depth: isXWall ? 0.6 : 3.8 }, scene);
        const ratio = i / segments;
        const xPos = startX + (endX - startX) * ratio + (isXWall ? 1.9 : 0);
        const zPos = startZ + (endZ - startZ) * ratio + (isXWall ? 0 : 1.9);

        seg.position.set(xPos, 0.25, zPos);
        seg.material = i % 2 === 0 ? barrierMatRed : barrierMatWhite;
        shadowGenerator.addShadowCaster(seg);
        seg.receiveShadows = true;
      }
    };

    // Draw boundary fences
    buildBarrierWall(-40, -50, 40, -50); // back wall
    buildBarrierWall(-40, 50, 40, 50);   // front wall
    buildBarrierWall(-40, -50, -40, 50); // left wall
    buildBarrierWall(40, -50, 40, 50);   // right wall

    // Welcome Banner / Billboards
    const bannerText = city ? `${lang === 'ka' ? city.nameKa : city.nameEn} COURSE` : 'GEORGIAN EXAM COURSE';
    const billboard = MeshBuilder.CreateBox("billboard", { width: 14, height: 4, depth: 0.4 }, scene);
    billboard.position.set(0, 4.5, -45);
    const billboardMat = new PBRMaterial("billboardMat", scene);
    billboardMat.albedoColor = new Color3(0.75, 0.15, 0.15);
    billboardMat.emissiveColor = new Color3(0, 0.05, 0.15);
    billboardMat.metallic = 0.0;
    billboardMat.roughness = 0.6;
    billboard.material = billboardMat;

    const postL = MeshBuilder.CreateCylinder("postL", { diameter: 0.3, height: 5 }, scene);
    postL.position.set(-5.5, 2.5, -45);
    const postR = MeshBuilder.CreateCylinder("postR", { diameter: 0.3, height: 5 }, scene);
    postR.position.set(5.5, 2.5, -45);
    const postMat = new PBRMaterial("postMat", scene);
    postMat.albedoColor = new Color3(0.4, 0.4, 0.4);
    postMat.metallic = 0.5;
    postMat.roughness = 0.4;
    postL.material = postMat;
    postR.material = postMat;

    // --- Task 1: 3D Ramp/Hill
    // Ramp starts at Z=-15, ends Z=22. Center line X = -10. Total Length = 37.
    // Uphill: Z in [-15, 0], Flat top: Z in [0, 7], Downhill: Z in [7, 22]
    // Height goes from 0 up to 2.25 and back to 0.
    const rampWidth = 5.0;
    const rampSlopeLength = 15;
    const rampFlatLength = 7.0;
    const slopeAngle = 0.15; // radians (about 8.5 degrees)

    // Slope mesh (Uphill)
    const rampSlope = MeshBuilder.CreateBox("rampSlope", { width: rampWidth, height: 0.2, depth: rampSlopeLength }, scene);
    rampSlope.position.set(-10, 1.125, -7.5);
    rampSlope.rotation.x = -slopeAngle; // tilt up
    
    // Flat top mesh
    const rampFlat = MeshBuilder.CreateBox("rampFlat", { width: rampWidth, height: 0.2, depth: rampFlatLength }, scene);
    rampFlat.position.set(-10, 2.25, 3.5);

    // Slope mesh (Downhill)
    const rampDownhill = MeshBuilder.CreateBox("rampDownhill", { width: rampWidth, height: 0.2, depth: rampSlopeLength }, scene);
    rampDownhill.position.set(-10, 1.125, 14.5);
    rampDownhill.rotation.x = slopeAngle; // tilt down

    // Visual side supports for the ramp (spanning the entire Z range -15 to 22, center at 3.5)
    const totalRampLength = rampSlopeLength + rampFlatLength + rampSlopeLength; // 15 + 7 + 15 = 37
    const rampSideL = MeshBuilder.CreateBox("rampSideL", { width: 0.2, height: 2.25, depth: totalRampLength }, scene);
    rampSideL.position.set(-10 - (rampWidth/2 + 0.1), 1.125, 3.5);
    const rampSideR = MeshBuilder.CreateBox("rampSideR", { width: 0.2, height: 2.25, depth: totalRampLength }, scene);
    rampSideR.position.set(-10 + (rampWidth/2 + 0.1), 1.125, 3.5);

    const rampMat = new PBRMaterial("rampMat", scene);
    const rampAlbedo = new Texture("https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/concrete_floor_02/concrete_floor_02_diff_1k.jpg", scene);
    rampAlbedo.uScale = 4;
    rampAlbedo.vScale = 4;
    rampMat.albedoTexture = rampAlbedo;

    const rampBump = new Texture("https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/concrete_floor_02/concrete_floor_02_nor_gl_1k.jpg", scene);
    rampBump.uScale = 4;
    rampBump.vScale = 4;
    rampMat.bumpTexture = rampBump;

    rampMat.metallic = 0.0;
    rampMat.roughness = 0.95;
    const sideMat = new PBRMaterial("sideMat", scene);
    sideMat.albedoColor = new Color3(0.9, 0.5, 0.1); // Bright warning orange side rails
    sideMat.metallic = 0.0;
    sideMat.roughness = 0.5;

    rampSlope.material = rampMat;
    rampFlat.material = rampMat;
    rampDownhill.material = rampMat;
    rampSideL.material = sideMat;
    rampSideR.material = sideMat;

    rampSlope.receiveShadows = true;
    rampFlat.receiveShadows = true;
    rampDownhill.receiveShadows = true;
    shadowGenerator.addShadowCaster(rampSlope);
    shadowGenerator.addShadowCaster(rampFlat);
    shadowGenerator.addShadowCaster(rampDownhill);

    // 3. Initialize car physics starting position
    // Starting coordinates: X = -10, Z = -35 (just before the ramp)
    const carPhysics = new CarPhysics(-10, 0, -35, 0); // facing north (0 angle)
    carPhysicsRef.current = carPhysics;

    // CourseManager
    const courseManager = new CourseManager(addViolation, handleTaskCompleted);
    courseManagerRef.current = courseManager;
    setActiveTask(courseManager.tasks[0]);

    // 4. Create visual car meshes
    const carRoot = MeshBuilder.CreateBox("carRoot", { width: 0.1, height: 0.1, depth: 0.1 }, scene);
    carRoot.isVisible = false;
    
    // Stub physics impostor to satisfy external checks
    (carRoot as any).physicsImpostor = {
      type: "mock",
      physicsBody: {},
      setLinearVelocity: () => {},
      setAngularVelocity: () => {},
      dispose: () => {}
    };

    // Materials
    const bodyMat = new PBRMaterial("bodyMat", scene);
    bodyMat.albedoColor = new Color3(0.95, 0.95, 0.95);
    bodyMat.metallic = 1.0;
    bodyMat.roughness = 0.3;
    bodyMat.reflectivityColor = new Color3(0.9, 0.9, 1.0);

    const darkMat = new PBRMaterial("darkMat", scene);
    darkMat.albedoColor = new Color3(0.15, 0.15, 0.18);
    darkMat.metallic = 0.0;
    darkMat.roughness = 0.7;

    const glassMat = new PBRMaterial("glassMat", scene);
    glassMat.albedoColor = new Color3(0.1, 0.2, 0.35);
    glassMat.metallic = 0.0;
    glassMat.roughness = 0.1;
    glassMat.alpha = 0.75;

    const chromeMat = new PBRMaterial("chromeMat", scene);
    chromeMat.albedoColor = new Color3(0.75, 0.75, 0.8);
    chromeMat.metallic = 1.0;
    chromeMat.roughness = 0.05;
    chromeMat.reflectivityColor = new Color3(0.95, 0.95, 1.0);

    const redLightMat = new PBRMaterial("redLightMat", scene);
    redLightMat.albedoColor = new Color3(0.9, 0.1, 0.1);
    redLightMat.emissiveColor = new Color3(0.4, 0, 0);
    redLightMat.metallic = 0.0;
    redLightMat.roughness = 0.4;

    const yellowLightMat = new PBRMaterial("yellowLightMat", scene);
    yellowLightMat.albedoColor = new Color3(0.95, 0.95, 0.75);
    yellowLightMat.emissiveColor = new Color3(0.6, 0.6, 0.3);
    yellowLightMat.metallic = 0.0;
    yellowLightMat.roughness = 0.3;

    const stripeMat = new PBRMaterial("stripeMat", scene);
    stripeMat.albedoColor = new Color3(0.05, 0.25, 0.65);
    stripeMat.metallic = 0.0;
    stripeMat.roughness = 0.5;

    const stripeRedMat = new PBRMaterial("stripeRedMat", scene);
    stripeRedMat.albedoColor = new Color3(0.85, 0.1, 0.1);
    stripeRedMat.metallic = 0.0;
    stripeRedMat.roughness = 0.5;

    const lPlateMat = new PBRMaterial("lPlateMat", scene);
    lPlateMat.albedoColor = new Color3(0.95, 0.95, 0.95);
    lPlateMat.emissiveColor = new Color3(0.2, 0.2, 0.2);
    lPlateMat.metallic = 0.0;
    lPlateMat.roughness = 0.4;

    // --- ŠKODA RAPID PARTS ASSEMBLY ---
    const proceduralBody = MeshBuilder.CreateBox("proceduralBody", { width: 0.1, height: 0.1, depth: 0.1 }, scene);
    proceduralBody.isVisible = false;
    proceduralBody.parent = carRoot;

    // A. Underbody Chassis Base
    const baseChassis = MeshBuilder.CreateBox("baseChassis", { width: 1.8, height: 0.2, depth: 4.2 }, scene);
    baseChassis.position.set(0, 0.25, 0);
    baseChassis.material = darkMat;
    baseChassis.parent = proceduralBody;
    shadowGenerator.addShadowCaster(baseChassis);

    // B. Main Body Panels (Fastback/Liftback silhouette)
    // Front Hood (Low nose, sloped forward)
    const hood = MeshBuilder.CreateBox("hood", { width: 1.76, height: 0.45, depth: 1.25 }, scene);
    hood.position.set(0, 0.52, 1.32);
    hood.rotation.x = 0.06; // sloped down towards front
    hood.material = bodyMat;
    hood.parent = proceduralBody;
    shadowGenerator.addShadowCaster(hood);

    // Hood Center Crease
    const hoodCrease = MeshBuilder.CreateBox("hoodCrease", { width: 0.04, height: 0.03, depth: 1.1 }, scene);
    hoodCrease.position.set(0, 0.74, 1.25);
    hoodCrease.rotation.x = 0.06;
    hoodCrease.material = bodyMat;
    hoodCrease.parent = proceduralBody;

    // Rear Liftback Trunk (Sloped deck)
    const trunk = MeshBuilder.CreateBox("trunk", { width: 1.76, height: 0.48, depth: 0.95 }, scene);
    trunk.position.set(0, 0.53, -1.42);
    trunk.rotation.x = -0.04;
    trunk.material = bodyMat;
    trunk.parent = proceduralBody;
    shadowGenerator.addShadowCaster(trunk);

    // Mid Cabin Body
    const midBody = MeshBuilder.CreateBox("midBody", { width: 1.76, height: 0.6, depth: 2.05 }, scene);
    midBody.position.set(0, 0.6, -0.1);
    midBody.material = bodyMat;
    midBody.parent = proceduralBody;
    shadowGenerator.addShadowCaster(midBody);

    // Cabin Roof
    const roof = MeshBuilder.CreateBox("roof", { width: 1.42, height: 0.5, depth: 1.78 }, scene);
    roof.position.set(0, 1.15, -0.25);
    roof.material = bodyMat;
    roof.parent = proceduralBody;
    shadowGenerator.addShadowCaster(roof);

    // C. Windshield & Windows
    // Sloped Windshield
    const windshield = MeshBuilder.CreateBox("windshield", { width: 1.38, height: 0.46, depth: 0.05 }, scene);
    windshield.position.set(0, 1.04, 0.63);
    windshield.rotation.x = 0.44; // Sleek sloped windshield
    windshield.material = glassMat;
    windshield.parent = proceduralBody;

    // Sloped Liftback Rear Glass
    const rearGlass = MeshBuilder.CreateBox("rearGlass", { width: 1.38, height: 0.44, depth: 0.05 }, scene);
    rearGlass.position.set(0, 1.04, -1.13);
    rearGlass.rotation.x = -0.42; // Fastback flow
    rearGlass.material = glassMat;
    rearGlass.parent = proceduralBody;

    // Side Windows L
    const sideGlassL = MeshBuilder.CreateBox("sideGlassL", { width: 0.05, height: 0.42, depth: 1.58 }, scene);
    sideGlassL.position.set(-0.71, 1.05, -0.25);
    sideGlassL.material = glassMat;
    sideGlassL.parent = proceduralBody;

    // Side Windows R
    const sideGlassR = MeshBuilder.CreateBox("sideGlassR", { width: 0.05, height: 0.42, depth: 1.58 }, scene);
    sideGlassR.position.set(0.71, 1.05, -0.25);
    sideGlassR.material = glassMat;
    sideGlassR.parent = proceduralBody;

    // B-Pillars for Side Windows
    const bPillarL = MeshBuilder.CreateBox("bPillarL", { width: 0.02, height: 0.44, depth: 0.08 }, scene);
    bPillarL.position.set(-0.72, 1.05, -0.25);
    bPillarL.material = darkMat;
    bPillarL.parent = proceduralBody;

    const bPillarR = MeshBuilder.CreateBox("bPillarR", { width: 0.02, height: 0.44, depth: 0.08 }, scene);
    bPillarR.position.set(0.72, 1.05, -0.25);
    bPillarR.material = darkMat;
    bPillarR.parent = proceduralBody;

    // D. MIA Service Agency Dual Decal Stripes
    const sideStripeBlueL = MeshBuilder.CreateBox("sideStripeBlueL", { width: 0.02, height: 0.04, depth: 2.1 }, scene);
    sideStripeBlueL.position.set(-0.89, 0.48, -0.1);
    sideStripeBlueL.material = stripeMat;
    sideStripeBlueL.parent = proceduralBody;

    const sideStripeRedL = MeshBuilder.CreateBox("sideStripeRedL", { width: 0.02, height: 0.04, depth: 2.1 }, scene);
    sideStripeRedL.position.set(-0.89, 0.43, -0.1);
    sideStripeRedL.material = stripeRedMat;
    sideStripeRedL.parent = proceduralBody;

    const sideStripeBlueR = MeshBuilder.CreateBox("sideStripeBlueR", { width: 0.02, height: 0.04, depth: 2.1 }, scene);
    sideStripeBlueR.position.set(0.89, 0.48, -0.1);
    sideStripeBlueR.material = stripeMat;
    sideStripeBlueR.parent = proceduralBody;

    const sideStripeRedR = MeshBuilder.CreateBox("sideStripeRedR", { width: 0.02, height: 0.04, depth: 2.1 }, scene);
    sideStripeRedR.position.set(0.89, 0.43, -0.1);
    sideStripeRedR.material = stripeRedMat;
    sideStripeRedR.parent = proceduralBody;

    const hoodStripeBlue = MeshBuilder.CreateBox("hoodStripeBlue", { width: 0.18, height: 0.02, depth: 0.95 }, scene);
    hoodStripeBlue.position.set(-0.1, 0.72, 1.25);
    hoodStripeBlue.rotation.x = 0.06;
    hoodStripeBlue.material = stripeMat;
    hoodStripeBlue.parent = proceduralBody;

    const hoodStripeRed = MeshBuilder.CreateBox("hoodStripeRed", { width: 0.18, height: 0.02, depth: 0.95 }, scene);
    hoodStripeRed.position.set(0.1, 0.72, 1.25);
    hoodStripeRed.rotation.x = 0.06;
    hoodStripeRed.material = stripeRedMat;
    hoodStripeRed.parent = proceduralBody;

    // MIA Service Agency door decals
    const doorDecalBaseL = MeshBuilder.CreateBox("doorDecalBaseL", { width: 0.01, height: 0.18, depth: 0.35 }, scene);
    doorDecalBaseL.position.set(-0.89, 0.52, 0.4);
    doorDecalBaseL.material = bodyMat;
    doorDecalBaseL.parent = proceduralBody;

    const doorDecalBlueL = MeshBuilder.CreateBox("doorDecalBlueL", { width: 0.012, height: 0.02, depth: 0.2 }, scene);
    doorDecalBlueL.position.set(-0.895, 0.54, 0.4);
    doorDecalBlueL.material = stripeMat;
    doorDecalBlueL.parent = proceduralBody;

    const doorDecalRedL = MeshBuilder.CreateBox("doorDecalRedL", { width: 0.012, height: 0.02, depth: 0.2 }, scene);
    doorDecalRedL.position.set(-0.895, 0.50, 0.4);
    doorDecalRedL.material = stripeRedMat;
    doorDecalRedL.parent = proceduralBody;

    const doorDecalBaseR = MeshBuilder.CreateBox("doorDecalBaseR", { width: 0.01, height: 0.18, depth: 0.35 }, scene);
    doorDecalBaseR.position.set(0.89, 0.52, 0.4);
    doorDecalBaseR.material = bodyMat;
    doorDecalBaseR.parent = proceduralBody;

    const doorDecalBlueR = MeshBuilder.CreateBox("doorDecalBlueR", { width: 0.012, height: 0.02, depth: 0.2 }, scene);
    doorDecalBlueR.position.set(0.895, 0.54, 0.4);
    doorDecalBlueR.material = stripeMat;
    doorDecalBlueR.parent = proceduralBody;

    const doorDecalRedR = MeshBuilder.CreateBox("doorDecalRedR", { width: 0.012, height: 0.02, depth: 0.2 }, scene);
    doorDecalRedR.position.set(0.895, 0.50, 0.4);
    doorDecalRedR.material = stripeRedMat;
    doorDecalRedR.parent = proceduralBody;

    // E. Skoda Grille and Logo Notch
    const grilleFrame = MeshBuilder.CreateBox("grilleFrame", { width: 1.15, height: 0.22, depth: 0.04 }, scene);
    grilleFrame.position.set(0, 0.55, 1.93);
    grilleFrame.material = chromeMat;
    grilleFrame.parent = proceduralBody;

    const grille = MeshBuilder.CreateBox("grille", { width: 1.1, height: 0.18, depth: 0.06 }, scene);
    grille.position.set(0, 0.55, 1.94);
    grille.material = darkMat;
    grille.parent = proceduralBody;

    const logoBadge = MeshBuilder.CreateCylinder("logoBadge", { diameter: 0.1, height: 0.04 }, scene);
    logoBadge.rotation.x = Math.PI / 2;
    logoBadge.position.set(0, 0.67, 1.93);
    logoBadge.material = chromeMat;
    logoBadge.parent = proceduralBody;

    // F. Bumpers
    const bumperFront = MeshBuilder.CreateBox("bumperFront", { width: 1.82, height: 0.22, depth: 0.2 }, scene);
    bumperFront.position.set(0, 0.33, 2.05);
    bumperFront.material = darkMat;
    bumperFront.parent = proceduralBody;

    const bumperRear = MeshBuilder.CreateBox("bumperRear", { width: 1.82, height: 0.22, depth: 0.2 }, scene);
    bumperRear.position.set(0, 0.33, -2.05);
    bumperRear.material = darkMat;
    bumperRear.parent = proceduralBody;

    // Georgia License Plates
    const licensePlateFront = MeshBuilder.CreateBox("licensePlateFront", { width: 0.5, height: 0.12, depth: 0.02 }, scene);
    licensePlateFront.position.set(0, 0.35, 2.16);
    licensePlateFront.material = lPlateMat;
    licensePlateFront.parent = proceduralBody;

    const licensePlateFrontBlue = MeshBuilder.CreateBox("licensePlateFrontBlue", { width: 0.06, height: 0.12, depth: 0.03 }, scene);
    licensePlateFrontBlue.position.set(0.21, 0.35, 2.16);
    licensePlateFrontBlue.material = stripeMat;
    licensePlateFrontBlue.parent = proceduralBody;

    const licensePlateRear = MeshBuilder.CreateBox("licensePlateRear", { width: 0.5, height: 0.12, depth: 0.02 }, scene);
    licensePlateRear.position.set(0, 0.35, -2.16);
    licensePlateRear.material = lPlateMat;
    licensePlateRear.parent = proceduralBody;

    const licensePlateRearBlue = MeshBuilder.CreateBox("licensePlateRearBlue", { width: 0.06, height: 0.12, depth: 0.03 }, scene);
    licensePlateRearBlue.position.set(-0.21, 0.35, -2.16);
    licensePlateRearBlue.material = stripeMat;
    licensePlateRearBlue.parent = proceduralBody;

    // G. Angular Headlights & Taillights
    const headlightL = MeshBuilder.CreateBox("headlightL", { width: 0.28, height: 0.12, depth: 0.15 }, scene);
    headlightL.position.set(-0.64, 0.55, 1.9);
    headlightL.rotation.y = -0.12; // angled Skoda eyes
    headlightL.material = yellowLightMat;
    headlightL.parent = proceduralBody;

    const headlightR = MeshBuilder.CreateBox("headlightR", { width: 0.28, height: 0.12, depth: 0.15 }, scene);
    headlightR.position.set(0.64, 0.55, 1.9);
    headlightR.rotation.y = 0.12;
    headlightR.material = yellowLightMat;
    headlightR.parent = proceduralBody;

    const taillightL = MeshBuilder.CreateBox("taillightL", { width: 0.22, height: 0.15, depth: 0.1 }, scene);
    taillightL.position.set(-0.65, 0.55, -1.91);
    taillightL.material = redLightMat;
    taillightL.parent = proceduralBody;

    const taillightR = MeshBuilder.CreateBox("taillightR", { width: 0.22, height: 0.15, depth: 0.1 }, scene);
    taillightR.position.set(0.65, 0.55, -1.91);
    taillightR.material = redLightMat;
    taillightR.parent = proceduralBody;

    // C-shaped taillight cuts
    const taillightCutL = MeshBuilder.CreateBox("taillightCutL", { width: 0.12, height: 0.07, depth: 0.02 }, scene);
    taillightCutL.position.set(-0.60, 0.55, -1.965);
    taillightCutL.material = darkMat;
    taillightCutL.parent = proceduralBody;

    const taillightCutR = MeshBuilder.CreateBox("taillightCutR", { width: 0.12, height: 0.07, depth: 0.02 }, scene);
    taillightCutR.position.set(0.60, 0.55, -1.965);
    taillightCutR.material = darkMat;
    taillightCutR.parent = proceduralBody;

    // Rear Reflectors
    const reflectorL = MeshBuilder.CreateBox("reflectorL", { width: 0.15, height: 0.02, depth: 0.02 }, scene);
    reflectorL.position.set(-0.65, 0.25, -2.16);
    reflectorL.material = redLightMat;
    reflectorL.parent = proceduralBody;

    const reflectorR = MeshBuilder.CreateBox("reflectorR", { width: 0.15, height: 0.02, depth: 0.02 }, scene);
    reflectorR.position.set(0.65, 0.25, -2.16);
    reflectorR.material = redLightMat;
    reflectorR.parent = proceduralBody;

    // H. Side Mirrors & Roof L-Plate
    const mirrorL = MeshBuilder.CreateBox("mirrorL", { width: 0.18, height: 0.12, depth: 0.1 }, scene);
    mirrorL.position.set(-0.9, 0.85, 0.5);
    mirrorL.material = bodyMat;
    mirrorL.parent = proceduralBody;

    const mirrorR = MeshBuilder.CreateBox("mirrorR", { width: 0.18, height: 0.12, depth: 0.1 }, scene);
    mirrorR.position.set(0.9, 0.85, 0.5);
    mirrorR.material = bodyMat;
    mirrorR.parent = proceduralBody;

    // Wheel Arches (Fenders)
    const fenderFL = MeshBuilder.CreateBox("fenderFL", { width: 0.05, height: 0.38, depth: 0.85 }, scene);
    fenderFL.position.set(-0.89, 0.38, 1.3);
    fenderFL.material = darkMat;
    fenderFL.parent = proceduralBody;

    const fenderFR = MeshBuilder.CreateBox("fenderFR", { width: 0.05, height: 0.38, depth: 0.85 }, scene);
    fenderFR.position.set(0.89, 0.38, 1.3);
    fenderFR.material = darkMat;
    fenderFR.parent = proceduralBody;

    const fenderBL = MeshBuilder.CreateBox("fenderBL", { width: 0.05, height: 0.38, depth: 0.85 }, scene);
    fenderBL.position.set(-0.89, 0.38, -1.3);
    fenderBL.material = darkMat;
    fenderBL.parent = proceduralBody;

    const fenderBR = MeshBuilder.CreateBox("fenderBR", { width: 0.05, height: 0.38, depth: 0.85 }, scene);
    fenderBR.position.set(0.89, 0.38, -1.3);
    fenderBR.material = darkMat;
    fenderBR.parent = proceduralBody;

    const lPlateBase = MeshBuilder.CreateBox("lPlateBase", { width: 0.45, height: 0.04, depth: 0.45 }, scene);
    lPlateBase.position.set(0, 1.42, -0.25);
    lPlateBase.material = darkMat;
    lPlateBase.parent = proceduralBody;

    const lPlateSign = MeshBuilder.CreateCylinder("lPlateSign", { diameter: 0.42, height: 0.12, tessellation: 3 }, scene); // 3-sided triangle
    lPlateSign.rotation.z = Math.PI / 2; 
    lPlateSign.rotation.x = Math.PI / 6;
    lPlateSign.position.set(0, 1.6, -0.25);
    lPlateSign.material = lPlateMat;
    lPlateSign.parent = proceduralBody;

    // Front-facing "L"
    const lPlateRed = MeshBuilder.CreateBox("lPlateRed", { width: 0.08, height: 0.25, depth: 0.08 }, scene);
    lPlateRed.position.set(-0.06, 1.6, -0.2);
    lPlateRed.material = redLightMat;
    lPlateRed.parent = proceduralBody;

    const lPlateRedHorizontal = MeshBuilder.CreateBox("lPlateRedHoriz", { width: 0.18, height: 0.08, depth: 0.08 }, scene);
    lPlateRedHorizontal.position.set(-0.01, 1.5, -0.2);
    lPlateRedHorizontal.material = redLightMat;
    lPlateRedHorizontal.parent = proceduralBody;

    // Rear-facing "L" (visible from behind!)
    const lPlateRedRear = MeshBuilder.CreateBox("lPlateRedRear", { width: 0.08, height: 0.25, depth: 0.08 }, scene);
    lPlateRedRear.position.set(-0.06, 1.6, -0.3);
    lPlateRedRear.material = redLightMat;
    lPlateRedRear.parent = proceduralBody;

    const lPlateRedHorizRear = MeshBuilder.CreateBox("lPlateRedHorizRear", { width: 0.18, height: 0.08, depth: 0.08 }, scene);
    lPlateRedHorizRear.position.set(-0.01, 1.5, -0.3);
    lPlateRedHorizRear.material = redLightMat;
    lPlateRedHorizRear.parent = proceduralBody;

    // Load realistic Škoda Rapid Spaceback 3D model
    fetch("/models/2020_skoda_rapid_spaceback.glb")
      .then(r => console.log("GLB fetch status:", r.status, r.ok))
      .catch(e => console.error("GLB fetch failed:", e));

    setLoadingState({ visible: true, progress: 70, status: "Loading vehicle..." });

    SceneLoader.ImportMeshAsync("", "/models/", "2020_skoda_rapid_spaceback.glb", scene)
      .then((result) => {
        setLoadingState({ visible: true, progress: 85, status: "Almost ready..." });
        const meshes = result.meshes;
        
        // Log all mesh names as requested
        meshes.forEach(mesh => console.log("GLB mesh:", mesh.name));

        const importedRoot = result.meshes[0];
        
        importedRoot.parent = carRoot;
        importedRoot.rotationQuaternion = null;
        
        const scaleFactor = 42.1;
        importedRoot.scaling = new Vector3(-scaleFactor, scaleFactor, scaleFactor);
        importedRoot.rotation = new Vector3(0, 0, 0);
        
        // Align GLB model wheel centers with the game's physics wheel positions
        // GLB wheel center Y: 33.40 * 0.01 = 0.334m. Game wheel Y is 0.35m.
        // GLB wheel center X (Z-axis in game) has a raw X offset of +3.5 units, which maps to +0.035m in game Z.
        // We set position to Y = 0.016 (0.35 - 0.334) and Z = -0.035 to align them perfectly.
        importedRoot.position = new Vector3(0, 0.016, -0.035);
        
        // Force all meshes visible
        result.meshes.forEach(mesh => {
          mesh.setEnabled(true);
          mesh.isVisible = true;
          if (mesh instanceof Mesh) {
            mesh.overrideMaterialSideOrientation = Material.ClockWiseSideOrientation;
          }
        });

        // --- STEP 1: Keep ALL dummy wheels completely hidden ---
        const wheelParts = [
          "tire_fr", "rim_fr", "spoke_fr", "spoke2_fr",
          "tire_fl", "rim_fl", "spoke_fl", "spoke2_fl",
          "tire_br", "rim_br", "spoke_br", "spoke2_br",
          "tire_bl", "rim_bl", "spoke_bl", "spoke2_bl",
        ];
        wheelParts.forEach(name => {
          const mesh = scene.getMeshByName(name);
          if (mesh) {
            mesh.isVisible = false;
            mesh.setEnabled(true);
          }
        });

        // --- STEP 2: Split combined GLB axle meshes and attach to rotating wheel containers ---
        const frontMeshes = [
          "18_tire_map_c_tyre_0",
          "22_hub_metal_chrome_0",
          "20_hub_black_metal_black_rim_0",
          "24_hub_black_metal_chrome_0"
        ];
        
        const rearMeshes = [
          "19_tire_map_c_tyre_0",
          "23_hub_metal_chrome_0",
          "21_hub_black_metal_black_rim_0",
          "25_hub_black_metal_chrome_0"
        ];

        const containerFR = scene.getMeshByName("wheelContainer_fr");
        const containerFL = scene.getMeshByName("wheelContainer_fl");
        const containerBR = scene.getMeshByName("wheelContainer_br");
        const containerBL = scene.getMeshByName("wheelContainer_bl");

        const processCombinedMesh = (meshName: string, isFront: boolean) => {
          const mesh = meshes.find(m => m.name === meshName) as Mesh;
          if (!mesh || !mesh.geometry) return;
          
          const { left, right } = splitCombinedMesh(mesh, scene);
          
          if (isFront) {
            if (containerFL) {
              right.setParent(containerFL);
              right.position.set(0, 0, 0);
              shadowGenerator.addShadowCaster(right);
            }
            if (containerFR) {
              left.setParent(containerFR);
              left.position.set(0, 0, 0);
              shadowGenerator.addShadowCaster(left);
            }
          } else {
            if (containerBL) {
              right.setParent(containerBL);
              right.position.set(0, 0, 0);
              shadowGenerator.addShadowCaster(right);
            }
            if (containerBR) {
              left.setParent(containerBR);
              left.position.set(0, 0, 0);
              shadowGenerator.addShadowCaster(left);
            }
          }
          
          // Disable original combined static mesh
          mesh.setEnabled(false);
        };

        frontMeshes.forEach(name => processCombinedMesh(name, true));
        rearMeshes.forEach(name => processCombinedMesh(name, false));

        // --- STEP 3: Keep hiding other GLB static wheels ---
        const GLB_WHEELS_TO_HIDE = [
          "89_hub_black_metal_bz_chrome_0", "89_hub_black_metal_2_bz_chrome_0",
        ];
        result.meshes.forEach(m => {
          if (GLB_WHEELS_TO_HIDE.includes(m.name)) m.setEnabled(false);
        });

        // --- STEP 4: Log what was found ---
        console.log("rim_fr found:", !!scene.getMeshByName("rim_fr"));
        console.log("tire_fr found:", !!scene.getMeshByName("tire_fr"));

        // Hide the procedural car body meshes visually so only the GLB model is seen,
        // but keep them active in the scene graph for physics/collision tracking
        if (proceduralBody) {
          proceduralBody.getChildMeshes().forEach(mesh => {
            mesh.isVisible = false;
          });
        }

        // Bounding box and positioning diagnostics
        console.log("Scene disposed?", scene.isDisposed);
        console.log("carRoot disposed?", carRoot.isDisposed());

        const b = importedRoot.getHierarchyBoundingVectors(true);
        console.log("NEW size X:", (b.max.x - b.min.x).toFixed(3));
        console.log("NEW size Y:", (b.max.y - b.min.y).toFixed(3));
        console.log("NEW size Z:", (b.max.z - b.min.z).toFixed(3));
        console.log("NEW min Y:", b.min.y.toFixed(3));
        console.log("NEW max Y:", b.max.y.toFixed(3));
        console.log("NEW absolutePos:", 
          importedRoot.getAbsolutePosition().x.toFixed(3),
          importedRoot.getAbsolutePosition().y.toFixed(3),
          importedRoot.getAbsolutePosition().z.toFixed(3));

        // Log parent and impostor checks
        console.log("carRoot impostor:", (carRoot as any).physicsImpostor);
        console.log("importedRoot parent:", importedRoot.parent?.name);
        console.log("proceduralBody name:", proceduralBody.name);
        console.log("proceduralBody === carRoot:", proceduralBody === carRoot);

        // Enable shadow casting and receiving on the imported meshes, set pickable to false
        meshes.forEach(mesh => {
          mesh.isPickable = false;
          mesh.receiveShadows = true;
          if (mesh.geometry) {
            shadowGenerator.addShadowCaster(mesh);
          }
        });
      })
      .catch((err: any) => {
        console.error("Failed to load Škoda Rapid GLB:", err);
        console.error("GLB load error:", err?.message || err, err);
      });

    // I. Wheels Assembly (Metallic rims + Spokes + Tires)
    const wheelMat = new PBRMaterial("wheelMat", scene);
    wheelMat.albedoColor = new Color3(0.08, 0.08, 0.08);
    wheelMat.metallic = 0.0;
    wheelMat.roughness = 0.9;

    const wheels: Mesh[] = [];
    const wheelPositions = [
      { name: "fr", x: 0.7342462539672852, y: 0.35, z: 1.3096160888671875, isRight: true },
      { name: "fl", x: -0.7342462539672852, y: 0.35, z: 1.3096160888671875, isRight: false },
      { name: "br", x: 0.7413530349731445, y: 0.35, z: -1.4216156005859375, isRight: true },
      { name: "bl", x: -0.7413530349731445, y: 0.35, z: -1.4216156005859375, isRight: false }
    ];

    wheelPositions.forEach(wp => {
      const wheelContainer = MeshBuilder.CreateBox(`wheelContainer_${wp.name}`, { width: 0.1, height: 0.1, depth: 0.1 }, scene);
      wheelContainer.position.set(wp.x, wp.y, wp.z);
      wheelContainer.isVisible = false;
      wheelContainer.parent = carRoot;

      const tire = MeshBuilder.CreateCylinder(`tire_${wp.name}`, { diameter: 0.7, height: 0.3 }, scene);
      tire.rotation.z = Math.PI / 2;
      tire.material = wheelMat;
      tire.parent = wheelContainer;
      shadowGenerator.addShadowCaster(tire);

      const rimOffset = wp.isRight ? 0.06 : -0.06;
      const rim = MeshBuilder.CreateCylinder(`rim_${wp.name}`, { diameter: 0.42, height: 0.2 }, scene);
      rim.rotation.z = Math.PI / 2;
      rim.position.x = rimOffset;
      rim.material = darkMat; // Sleek dark metal rim
      rim.parent = wheelContainer;

      const spoke = MeshBuilder.CreateBox(`spoke_${wp.name}`, { width: 0.38, height: 0.05, depth: 0.08 }, scene);
      spoke.position.x = rimOffset * 1.1;
      spoke.material = chromeMat; // Shiny chrome spokes
      spoke.parent = wheelContainer;

      const spoke2 = MeshBuilder.CreateBox(`spoke2_${wp.name}`, { width: 0.38, height: 0.05, depth: 0.08 }, scene);
      spoke2.rotation.x = Math.PI / 2;
      spoke2.position.x = rimOffset * 1.1;
      spoke2.material = chromeMat; // Shiny chrome spokes
      spoke2.parent = wheelContainer;

      wheels.push(wheelContainer as any);
    });

    // Spotlights (only 1 center spotlight to conserve WebGL resources)
    const spotlight = new SpotLight("carSpotlight", new Vector3(0, 0.6, 2.2), new Vector3(0, -0.1, 1), Math.PI / 4, 1.2, scene);
    spotlight.intensity = 1.5;
    spotlight.diffuse = new Color3(1, 1, 0.9);
    spotlight.parent = carRoot;

    // 5. Place 3D Cones on the field
    const coneMatOrange = new PBRMaterial("coneMatOrange", scene);
    coneMatOrange.albedoColor = new Color3(0.95, 0.45, 0.05);
    coneMatOrange.metallic = 0.0;
    coneMatOrange.roughness = 0.6;
    const coneMatWhite = new PBRMaterial("coneMatWhite", scene);
    coneMatWhite.albedoColor = new Color3(0.95, 0.95, 0.95);
    coneMatWhite.metallic = 0.0;
    coneMatWhite.roughness = 0.6;

    const visualCones: Mesh[] = [];
    courseManager.cones.forEach(cData => {
      // Create cone container
      const coneContainer = MeshBuilder.CreateBox(`visual_${cData.id}`, { width: 0.1, height: 0.1, depth: 0.1 }, scene);
      coneContainer.position.set(cData.x, 0, cData.z);
      coneContainer.isVisible = false;

      // Dark square base
      const base = MeshBuilder.CreateCylinder(`base_${cData.id}`, { diameterTop: 0.5, diameterBottom: 0.5, height: 0.04 }, scene);
      base.position.set(0, 0.02, 0);
      base.parent = coneContainer;
      const baseMat = new PBRMaterial("coneBaseMat", scene);
      baseMat.albedoColor = new Color3(0.1, 0.1, 0.1);
      baseMat.metallic = 0.0;
      baseMat.roughness = 0.8;
      base.material = baseMat;

      // Orange cone body
      const coneBody = MeshBuilder.CreateCylinder(`coneBody_${cData.id}`, { diameterTop: 0.02, diameterBottom: 0.38, height: 0.8 }, scene);
      coneBody.position.set(0, 0.42, 0);
      coneBody.material = coneMatOrange;
      coneBody.parent = coneContainer;

      // White stripe
      const stripe = MeshBuilder.CreateCylinder(`stripe_${cData.id}`, { diameterTop: 0.15, diameterBottom: 0.25, height: 0.25 }, scene);
      stripe.position.set(0, 0.42, 0);
      stripe.material = coneMatWhite;
      stripe.parent = coneContainer;

      shadowGenerator.addShadowCaster(base);
      shadowGenerator.addShadowCaster(coneBody);
      visualCones.push(coneContainer);
    });

    // Final Stop Line visual grid
    const stopLine = MeshBuilder.CreateBox("visualStopLine", { width: 8, height: 0.02, depth: 0.6 }, scene);
    stopLine.position.set(0, 0.006, -35); // matches Task 6 line
    const stopLineMat = new PBRMaterial("stopLineMat", scene);
    stopLineMat.albedoColor = new Color3(0.9, 0.9, 0.9);
    stopLineMat.metallic = 0.0;
    stopLineMat.roughness = 0.5;
    stopLine.material = stopLineMat;

    // Giant red STOP word painted on ground before the line
    const stopBannerText = MeshBuilder.CreateBox("stopTextGround", { width: 4, height: 0.02, depth: 1.2 }, scene);
    stopBannerText.position.set(0, 0.006, -33);
    const stopTextMat = new PBRMaterial("stopTextMat", scene);
    stopTextMat.albedoColor = new Color3(0.85, 0.1, 0.1);
    stopTextMat.emissiveColor = new Color3(0.2, 0, 0);
    stopTextMat.metallic = 0.0;
    stopTextMat.roughness = 0.5;
    stopBannerText.material = stopTextMat;

    // 6. Camera Follow System
    scene.createDefaultCamera(false, true, false);
    const camera = scene.activeCamera as any;
    cameraRef.current = camera;
    if (camera) {
      camera.mode = 0; // Perspective
      camera.maxZ = 300;
      if (camera.inputs) {
        camera.inputs.clear();
      }
      // Initialize position and target immediately to prevent startup fly-in lag
      const startX = carPhysics.x - Math.sin(carPhysics.angle) * 7.0;
      const startZ = carPhysics.z - Math.cos(carPhysics.angle) * 7.0;
      const startY = carPhysics.y + 3.5;
      camera.position.set(startX, startY, startZ);
      camera.setTarget(new Vector3(
        carPhysics.x + Math.sin(carPhysics.angle) * 1.5,
        carPhysics.y + 0.8,
        carPhysics.z + Math.cos(carPhysics.angle) * 1.5
      ));
    }

    // Post-processing pipeline
    const ENABLE_BLOOM = true;
    const ENABLE_CHROMATIC_ABERRATION = true;
    const ENABLE_GLOW = true;

    const pipeline = new DefaultRenderingPipeline("defaultPipeline", true, scene, [camera]);
    pipeline.samples = 4;
    pipeline.fxaaEnabled = true;
    pipeline.bloomEnabled = ENABLE_BLOOM;
    pipeline.bloomWeight = 0.25;
    pipeline.bloomThreshold = 0.8;
    pipeline.imageProcessingEnabled = true;
    pipeline.imageProcessing.contrast = 1.25;
    pipeline.imageProcessing.exposure = 1.2;
    pipeline.imageProcessing.toneMappingEnabled = true;
    pipeline.imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;

    pipeline.imageProcessing.colorCurvesEnabled = true;
    const curves = new ColorCurves();
    curves.globalSaturation = 15;      // slightly more vivid colors
    curves.globalHue = 10;             // warm shift
    curves.shadowsHue = 220;           // cool blue shadows
    curves.shadowsDensity = 20;
    pipeline.imageProcessing.colorCurves = curves;

    pipeline.chromaticAberrationEnabled = ENABLE_CHROMATIC_ABERRATION;
    pipeline.chromaticAberration.aberrationAmount = 1.5;
    pipeline.depthOfFieldEnabled = false;

    if (ENABLE_GLOW) {
      const glowLayer = new GlowLayer("glowLayer", scene);
      glowLayer.intensity = 0.5;
    }

    // 7. Engine Render Loop
    engine.runRenderLoop(() => {
      if (examStateRef.current !== 'driving' && examStateRef.current !== 'intro') {
        scene.render();
        return;
      }

      const dt = engine.getDeltaTime() / 1000;

      // Keep track of previous positions for collision recovery
      const prevX = carPhysics.x;
      const prevZ = carPhysics.z;

      // Update driving physics script
      carPhysics.update(dt, inputsRef.current);

      // Check collision with solid boundaries (rampSideL and rampSideR)
      let collided = false;
      if (baseChassis && rampSideL && rampSideR) {
        // Sync position of collision proxy mesh to check intersection
        carRoot.position.set(carPhysics.x, carPhysics.y, carPhysics.z);
        carRoot.rotation.y = carPhysics.angle;
        carRoot.rotation.x = carPhysics.pitchAngle;
        carRoot.rotation.z = carPhysics.rollAngle;
        carRoot.computeWorldMatrix(true);
        baseChassis.computeWorldMatrix(true);
        rampSideL.computeWorldMatrix(true);
        rampSideR.computeWorldMatrix(true);

        if (baseChassis.intersectsMesh(rampSideL, false) || baseChassis.intersectsMesh(rampSideR, false)) {
          collided = true;
        }
      }

      if (collided) {
        // Collided with ramp side wall! Revert position and stop
        carPhysics.x = prevX;
        carPhysics.z = prevZ;
        carPhysics.speed = 0;
        
        // Deduct points for hitting boundaries (limit penalty spam to once every 1.5s)
        if (Date.now() - lastWallCollisionTime > 1500) {
          lastWallCollisionTime = Date.now();
          addViolation(10, "Collision: Hit ramp side barrier", "ჯარიმა: დაეჯახეთ ესტაკადის მოაჯირს");
        }
      }

      setSpeed(Math.abs(carPhysics.speed * 3.6)); // m/s to km/h
      setGear(carPhysics.gear);
      setHandbrake(carPhysics.handbrake);

      // Update sound engine pitch
      const maxSpeed = 12.0;
      const speedRatio = Math.min(1.0, Math.abs(carPhysics.speed) / maxSpeed);
      soundRef.current?.updateEnginePitch(speedRatio);

      // Check task milestones & penalties
      courseManager.update(dt, carPhysics);

      // Sync 3D model positions
      carRoot.position.set(carPhysics.x, carPhysics.y, carPhysics.z);
      carRoot.rotation.y = carPhysics.angle;
      carRoot.rotation.x = carPhysics.pitchAngle;
      carRoot.rotation.z = carPhysics.rollAngle;

      // Front steering wheels rotation
      wheels[0].rotation.y = carPhysics.steerAngle; // Front Right
      wheels[1].rotation.y = carPhysics.steerAngle; // Front Left

      // Roll wheels visually
      wheels.forEach(w => {
        w.rotation.x = carPhysics.wheelRotation;
      });

      // Camera View Mode Switching System
      if (camera) {
        // Mode 1 values (Default follow)
        const m1Height = 3.5;
        const m1Dist = 7.0;
        const m1LookAhead = 1.5;

        // Mode 2 values (Wide follow - zoomed out ~60%)
        const m2Height = 3.5 * 1.6; // 5.6
        const m2Dist = 7.0 * 1.6;   // 11.2
        const m2LookAhead = 1.0;    // Look down more (lower lookAhead puts target closer, increasing angle)

        // Mode 3 Target
        const orbitTarget = new Vector3(carPhysics.x, carPhysics.y + 0.8, carPhysics.z);

        // Update spherical angles when NOT in Mode 3 so transition starts seamlessly
        if (cameraModeRef.current !== 3) {
          const dx = camera.position.x - orbitTarget.x;
          const dy = camera.position.y - orbitTarget.y;
          const dz = camera.position.z - orbitTarget.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          orbitParamsRef.current.radius = dist > 0 ? dist : 10;
          orbitParamsRef.current.beta = Math.acos(Math.max(-0.999, Math.min(0.999, dy / (dist > 0 ? dist : 1))));
          orbitParamsRef.current.alpha = Math.atan2(dx, dz);
        }

        // Calculate target and position based on current cameraModeRef
        let desiredPosition = new Vector3();
        let desiredTarget = new Vector3();

        if (cameraModeRef.current === 1) {
          const targetX = carPhysics.x - Math.sin(carPhysics.angle) * m1Dist;
          const targetZ = carPhysics.z - Math.cos(carPhysics.angle) * m1Dist;
          const targetY = carPhysics.y + m1Height;
          desiredPosition.set(targetX, targetY, targetZ);

          desiredTarget.set(
            carPhysics.x + Math.sin(carPhysics.angle) * m1LookAhead,
            carPhysics.y + 0.8,
            carPhysics.z + Math.cos(carPhysics.angle) * m1LookAhead
          );
        } else if (cameraModeRef.current === 2) {
          const targetX = carPhysics.x - Math.sin(carPhysics.angle) * m2Dist;
          const targetZ = carPhysics.z - Math.cos(carPhysics.angle) * m2Dist;
          const targetY = carPhysics.y + m2Height;
          desiredPosition.set(targetX, targetY, targetZ);

          desiredTarget.set(
            carPhysics.x + Math.sin(carPhysics.angle) * m2LookAhead,
            carPhysics.y + 0.8,
            carPhysics.z + Math.cos(carPhysics.angle) * m2LookAhead
          );
        } else if (cameraModeRef.current === 3) {
          const p = orbitParamsRef.current;
          const ox = orbitTarget.x + p.radius * Math.sin(p.beta) * Math.sin(p.alpha);
          const oy = orbitTarget.y + p.radius * Math.cos(p.beta);
          const oz = orbitTarget.z + p.radius * Math.sin(p.beta) * Math.cos(p.alpha);

          desiredPosition.set(ox, oy, oz);
          desiredTarget.copyFrom(orbitTarget);
        }

        // Update transition logic
        if (cameraTransitionRef.current.transitionTime < 0.3) {
          cameraTransitionRef.current.transitionTime += dt;
          const tVal = Math.min(1.0, cameraTransitionRef.current.transitionTime / 0.3);
          const easeT = tVal * tVal * (3 - 2 * tVal); // smoothstep

          const interpPos = Vector3.Lerp(cameraTransitionRef.current.startPosition, desiredPosition, easeT);
          const interpTarg = Vector3.Lerp(cameraTransitionRef.current.startTarget, desiredTarget, easeT);

          camera.position.copyFrom(interpPos);
          camera.setTarget(interpTarg);
        } else {
          // Normal mode execution when transition is complete
          if (cameraModeRef.current === 1 || cameraModeRef.current === 2) {
            // Apply standard linear interpolation follow behavior (exactly same as original)
            camera.position.x += (desiredPosition.x - camera.position.x) * 0.1;
            camera.position.z += (desiredPosition.z - camera.position.z) * 0.1;
            camera.position.y += (desiredPosition.y - camera.position.y) * 0.1;

            camera.setTarget(new Vector3(
              desiredTarget.x,
              desiredTarget.y,
              desiredTarget.z
            ));
          } else if (cameraModeRef.current === 3) {
            // Lock target and position immediately in Mode 3 (Free mouse orbit)
            camera.position.copyFrom(desiredPosition);
            camera.setTarget(desiredTarget);
          }
        }
      }

      // Sync cones visibility if hit
      courseManager.cones.forEach((coneData, index) => {
        if (coneData.hit && visualCones[index]) {
          // Tilt hit cones visual indicator
          visualCones[index].rotation.z = Math.PI / 4;
        }
      });

      scene.render();
    });

    scene.executeWhenReady(() => {
      setLoadingState({ visible: true, progress: 100, status: "Almost ready..." });
      setTimeout(() => {
        setLoadingState(prev => ({ ...prev, status: "Starting..." }));
        setTimeout(() => {
          setLoadingState(prev => ({ ...prev, visible: false }));
        }, 500);
      }, 500);
    });

    // Handle window resize
    const resizeHandler = () => engine.resize();
    window.addEventListener('resize', resizeHandler);

    // Pause on tab visibility change to comply with efficient-background-processing
    const visibilityHandler = () => {
      if (document.hidden && examStateRef.current === 'driving') {
        setExamState('paused');
        soundRef.current?.stopEngine();
      }
    };
    document.addEventListener('visibilitychange', visibilityHandler);

    // Cleanups
    return () => {
      engine.stopRenderLoop();
      scene.dispose();
      engine.dispose();
      window.removeEventListener('resize', resizeHandler);
      document.removeEventListener('visibilitychange', visibilityHandler);
      carPhysicsRef.current?.destroy();
    };
  }, []);

  // Handle keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Babylon Inspector with Shift + I
      if (e.shiftKey && e.key.toLowerCase() === 'i') {
        if (sceneRef.current) {
          const scene = sceneRef.current;
          if (scene.debugLayer.isVisible()) {
            scene.debugLayer.hide();
          } else {
            import('@babylonjs/inspector').then(() => {
              scene.debugLayer.show({ overlay: true, handleCamera: true } as any);
            });
          }
        }
        return;
      }

      if (examStateRef.current !== 'driving') return;

      const key = e.key.toLowerCase();
      
      // Console log for debugging driving keys
      if (['w', 's', 'a', 'd', ' ', '1', '2', '3', 'h', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key) ||
          ['Digit1', 'Digit2', 'Digit3', 'Numpad1', 'Numpad2', 'Numpad3'].includes(e.code)) {
        console.log("Driving key down:", e.key, "code:", e.code, "handbrake:", inputsRef.current.handbrake);
      }

      if (key === 'w' || e.key === 'ArrowUp') inputsRef.current.accelerate = true;
      if (key === 's' || e.key === 'ArrowDown') inputsRef.current.reverse = true;
      if (key === 'a' || e.key === 'ArrowLeft') inputsRef.current.steerLeft = true;
      if (key === 'd' || e.key === 'ArrowRight') inputsRef.current.steerRight = true;
      
      // Handbrake
      if (e.key === ' ') {
        inputsRef.current.handbrake = !inputsRef.current.handbrake;
        e.preventDefault(); // prevent window scroll
      }

      // Gear box toggle: '1' -> D, '2' -> N, '3' -> R (layout-independent)
      if (key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') {
        soundRef.current?.playTick();
        if (carPhysicsRef.current) carPhysicsRef.current.gear = 'D';
      }
      if (key === '2' || e.code === 'Digit2' || e.code === 'Numpad2') {
        soundRef.current?.playTick();
        if (carPhysicsRef.current) carPhysicsRef.current.gear = 'N';
      }
      if (key === '3' || e.code === 'Digit3' || e.code === 'Numpad3') {
        soundRef.current?.playTick();
        if (carPhysicsRef.current) carPhysicsRef.current.gear = 'R';
      }

      // Horn (H)
      if (key === 'h') {
        soundRef.current?.setHorn(true);
      }

      // Camera view cycle (C)
      if (key === 'c') {
        const nextMode = (cameraModeRef.current === 1 ? 2 : (cameraModeRef.current === 2 ? 3 : 1)) as 1 | 2 | 3;
        cameraModeRef.current = nextMode;
        triggerCameraHUD(nextMode);

        if (cameraRef.current) {
          cameraTransitionRef.current.startPosition.copyFrom(cameraRef.current.position);
          if (cameraRef.current.getTarget) {
            cameraTransitionRef.current.startTarget.copyFrom(cameraRef.current.getTarget());
          } else if (cameraRef.current.target) {
            cameraTransitionRef.current.startTarget.copyFrom(cameraRef.current.target);
          }
          cameraTransitionRef.current.transitionTime = 0;
          cameraTransitionRef.current.targetMode = nextMode;
        }
      }

      // Pause (Escape)
      if (e.key === 'Escape') {
        handlePauseToggle();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || e.key === 'ArrowUp') inputsRef.current.accelerate = false;
      if (key === 's' || e.key === 'ArrowDown') inputsRef.current.reverse = false;
      if (key === 'a' || e.key === 'ArrowLeft') inputsRef.current.steerLeft = false;
      if (key === 'd' || e.key === 'ArrowRight') inputsRef.current.steerRight = false;
      
      if (key === 'h') {
        soundRef.current?.setHorn(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const startPractice = () => {
    setExamState('driving');
    soundRef.current?.startEngine();
    // Programmatically focus the canvas to capture keyboard inputs
    setTimeout(() => {
      canvasRef.current?.focus();
    }, 100);
  };

  const restartPractice = () => {
    window.location.reload();
  };

  const changeGearState = (g: GearState) => {
    soundRef.current?.playTick();
    if (carPhysicsRef.current) carPhysicsRef.current.gear = g;
  };

  return (
    <div className="practical-page">
      <canvas
        ref={canvasRef}
        className="driving-canvas"
        tabIndex={0}
        style={{ outline: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
      />

      {showCameraHUD && (
        <div className={`camera-hud-overlay ${fadeOutCameraHUD ? 'fade-out' : ''}`}>
          {cameraMode === 1 && '📷 Default'}
          {cameraMode === 2 && '📷 Wide'}
          {cameraMode === 3 && '📷 Free'}
        </div>
      )}

      {/* --- HUD PANEL --- */}
      {examState !== 'intro' && (
        <div className="hud-container">
          {/* Header Row */}
          <div className="hud-header">
            <div className="hud-city-card">
              <h2 className="hud-city-title">📍 {lang === 'ka' ? city?.nameKa : city?.nameEn}</h2>
              <span className="hud-city-backdrop">{city?.practicalBackdrop}</span>
            </div>

            <div className="hud-stats-panel">
              <div className="stat-box" id="score-box">
                <span className="stat-box-val">{score}</span>
                <span className="stat-box-lbl">{t('practical.violation')}s</span>
              </div>
              <div className="stat-box">
                <span className={`stat-box-val ${timeLeft < 60 ? 'timer-urgent' : ''}`}>
                  {formatTime(timeLeft)}
                </span>
                <span className="stat-box-lbl">{t('theory.timeRemaining').split(' ')[0]}</span>
              </div>
            </div>
          </div>

          {/* Active Instructions Banner */}
          <div className="hud-center">
            {activeTask && showBanner && (
              <div className="task-banner">
                <button 
                  className="banner-close-btn" 
                  onClick={() => {
                    setShowBanner(false);
                    if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
                  }}
                  aria-label="Close"
                >
                  &times;
                </button>
                <h3 className="task-title">
                  {t('practical.task')} {courseManagerRef.current ? courseManagerRef.current.currentTaskIndex + 1 : 1}: {lang === 'ka' ? activeTask.nameKa : activeTask.nameEn}
                </h3>
                <p className="task-desc">
                  {lang === 'ka' ? activeTask.descriptionKa : activeTask.descriptionEn}
                </p>
              </div>
            )}
          </div>

          {/* Dashboard and Actions Footer */}
          <div className="hud-footer">
            <div className="dashboard-widget">
              <div className="speedometer-ring">
                <span className="speed-number">{Math.round(speed)}</span>
                <span className="speed-unit">KM/H</span>
              </div>

              <div className="gear-box">
                <span className="gear-label">GEAR</span>
                <span className="gear-value">{gear}</span>
              </div>

              {handbrake && (
                <span className="handbrake-badge">PARK</span>
              )}
            </div>

            <div className="hud-actions-panel">
              <button className="btn btn-ghost btn-sm" onClick={handleMuteToggle} id="hud-mute-btn">
                {isMuted ? '🔇' : '🔊'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowSettings(true)} id="hud-settings-btn">
                ⚙️ Tuning
              </button>
              <button className="btn btn-ghost btn-sm" onClick={handlePauseToggle} id="hud-pause-btn">
                ⏸ {t('practical.pause')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- In-game Toast Violation Popups --- */}
      <div className="violation-toast-container">
        {activeToasts.map(toast => (
          <div key={toast.id} className="violation-toast">
            ⚠️ -{toast.points} pts: {lang === 'ka' ? toast.reasonKa : toast.reasonEn}
          </div>
        ))}
      </div>

      {/* --- MOBILE TOUCH CONTROLS OVERLAY --- */}
      {isMobile && examState === 'driving' && (
        <div className="mobile-controls-overlay">
          {/* Left panel: steering */}
          <div className="mobile-left-panel">
            <button 
              className="control-btn"
              onTouchStart={() => { inputsRef.current.steerLeft = true; }}
              onTouchEnd={() => { inputsRef.current.steerLeft = false; }}
              id="mobile-steer-l"
            >
              ◀
            </button>
            <button 
              className="control-btn"
              onTouchStart={() => { inputsRef.current.steerRight = true; }}
              onTouchEnd={() => { inputsRef.current.steerRight = false; }}
              id="mobile-steer-r"
            >
              ▶
            </button>
          </div>

          {/* Right panel: accelerator/brake, handbrake, gear */}
          <div className="mobile-right-panel">
            <button
              className="control-btn"
              onClick={() => {
                inputsRef.current.handbrake = !inputsRef.current.handbrake;
              }}
              style={{ background: handbrake ? 'rgba(230,51,41,0.5)' : 'rgba(10,25,50,0.6)' }}
              id="mobile-handbrake"
            >
              🅿️
            </button>

            <button
              className="control-btn"
              onClick={() => {
                const nextGear: Record<GearState, GearState> = { 'D': 'N', 'N': 'R', 'R': 'D' };
                changeGearState(nextGear[gear]);
              }}
              id="mobile-gear"
            >
              {gear}
            </button>

            <button 
              className="control-btn pedal-btn pedal-brake"
              onTouchStart={() => { inputsRef.current.reverse = true; }}
              onTouchEnd={() => { inputsRef.current.reverse = false; }}
              id="mobile-brake"
            >
              BRAKE
            </button>
            <button 
              className="control-btn pedal-btn pedal-gas"
              onTouchStart={() => { inputsRef.current.accelerate = true; }}
              onTouchEnd={() => { inputsRef.current.accelerate = false; }}
              id="mobile-gas"
            >
              GAS
            </button>
          </div>
        </div>
      )}

      {/* --- START EXAM SCREEN INTRO MODAL --- */}
      {examState === 'intro' && (
        <div className="modal-overlay">
          <div className="results-modal-box animate-fadeInScale">
            <span className="results-header-icon">🚗</span>
            <h2 className="title-text" style={{ fontSize: '1.8rem', fontWeight: 900 }}>
              {t('practical.title')}
            </h2>
            <div className="badge badge-blue" style={{ marginTop: '0.5rem', padding: '0.4rem 1.2rem' }}>
              📍 {lang === 'ka' ? city?.nameKa : city?.nameEn}
            </div>

            <div className="results-details" style={{ textAlign: 'left', maxHeight: 'none' }}>
              <h4 style={{ color: '#F5A623', marginBottom: '0.5rem', fontWeight: 800 }}>⚠️ Rules of the Exam:</h4>
              <ul style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                <li>Start with 100 points. You must maintain at least <strong>80 points</strong> to pass.</li>
                <li>Complete 5 maneuvers (Ramp hill start, Slalom, Parallel parking, Perpendicular garage, 3-point turn).</li>
                <li>Avoid hitting cones (-5 points) and crossing boundaries (-10 points).</li>
                <li>Ensure the car does not roll back on hill start.</li>
                <li><strong>Keyboard Controls:</strong> Use <strong>W/A/S/D</strong> or <strong>Arrows</strong> to drive, <strong>Space</strong> for Handbrake, and gears <strong>1</strong> (D), <strong>2</strong> (N), <strong>3</strong> (R).</li>
              </ul>
            </div>

            <div className="results-actions-panel" style={{ marginTop: '2rem' }}>
              <button className="btn btn-ghost flex-1" onClick={() => navigate('/')} id="intro-back-btn">
                ← {t('common.back')}
              </button>
              <button className="btn btn-primary flex-1 animate-pulse" onClick={startPractice} id="intro-start-btn">
                {t('common.start')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- PAUSE MODAL --- */}
      {examState === 'paused' && (
        <div className="modal-overlay">
          <div className="results-modal-box animate-fadeInScale" style={{ maxWidth: '360px' }}>
            <span style={{ fontSize: '3rem' }}>⏸</span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.75rem 0' }}>
              {t('practical.pause')}
            </h2>
            <p className="text-secondary text-sm" style={{ marginBottom: '2rem' }}>
              Exam time remaining: {formatTime(timeLeft)}
            </p>
            <div className="results-actions-panel" style={{ flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                <button className="btn btn-ghost flex-1" onClick={() => navigate('/')} id="pause-quit-btn">
                  Quit Exam
                </button>
                <button className="btn btn-primary flex-1" onClick={handlePauseToggle} id="pause-resume-btn">
                  {t('practical.resume')}
                </button>
              </div>
              <button className="btn btn-ghost w-full" onClick={() => setShowSettings(true)} id="pause-settings-btn" style={{ pointerEvents: 'auto' }}>
                ⚙️ Audio Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- RESULTS OVERLAY MODAL --- */}
      {(examState === 'passed' || examState === 'failed') && (
        <div className="modal-overlay">
          <div className="results-modal-box animate-fadeInScale">
            <span className="results-header-icon">{examState === 'passed' ? '🏆' : '💀'}</span>
            <h1 className="results-score-label">{score} / 100</h1>
            
            <div className={`badge ${examState === 'passed' ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '1rem', padding: '0.5rem 1.5rem' }}>
              {examState === 'passed' ? t('practical.examPassed') : t('practical.examFailed')}
            </div>

            <div className="results-details">
              <div className="results-detail-row">
                <span className="text-secondary">📍 City:</span>
                <span>{lang === 'ka' ? city?.nameKa : city?.nameEn}</span>
              </div>
              <div className="results-detail-row">
                <span className="text-secondary">⏱ Duration:</span>
                <span>{300 - timeLeft} seconds</span>
              </div>

              {violationLogs.length > 0 && (
                <div className="results-violation-log">
                  <h4 style={{ fontWeight: 800, marginBottom: '0.25rem' }}>Violations Committed:</h4>
                  <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                    {violationLogs.map(log => (
                      <li key={log.id} style={{ fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                        {log.time} - {lang === 'ka' ? log.reasonKa : log.reasonEn} (-{log.points} pts)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="results-actions-panel">
              <button className="btn btn-ghost flex-1" onClick={() => navigate('/')} id="results-menu-btn">
                {t('results.backToMenu')}
              </button>
              <button className="btn btn-primary flex-1" onClick={restartPractice} id="results-restart-btn">
                {t('results.tryAgain')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audio Settings Modal */}
      {showSettings && (
        <SettingsModal 
          onClose={() => {
            setShowSettings(false);
            soundRef.current?.refreshSettings();
          }} 
          isLive={examState === 'driving'}
        />
      )}

      {/* --- React Loading Overlay Screen --- */}
      {loadingState.visible && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: '#0a0a0a',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'opacity 0.6s ease',
          opacity: loadingState.progress === 100 ? 0 : 1,
          color: '#f0f4ff',
          fontFamily: "'Inter', sans-serif",
          userSelect: 'none'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
            maxWidth: '320px',
            width: '100%',
            textAlign: 'center'
          }}>
            {/* Animated Pulsing Car Silhouette SVG */}
            <svg 
              viewBox="0 0 100 40" 
              width="120" 
              height="50" 
              style={{
                fill: '#E63329',
                animation: 'pulse 1.8s infinite ease-in-out',
                filter: 'drop-shadow(0 0 8px rgba(230, 51, 41, 0.6))'
              }}
            >
              <path d="M12 26 C 12 18, 20 16, 30 16 C 36 12, 45 6, 58 6 C 68 6, 75 8, 78 16 C 88 16, 92 18, 92 26 C 94 26, 95 28, 93 30 C 91 32, 88 32, 88 32 C 86 26, 78 26, 76 32 L 28 32 C 26 26, 18 26, 16 32 L 10 32 C 7 32, 6 30, 8 28 C 10 26, 12 26, 12 26 Z" />
            </svg>

            {/* CSS animation insertion for pulsing car */}
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes pulse {
                0% { transform: scale(0.98); opacity: 0.8; }
                50% { transform: scale(1.02); opacity: 1; filter: drop-shadow(0 0 12px rgba(230, 51, 41, 0.85)); }
                100% { transform: scale(0.98); opacity: 0.8; }
              }
            `}} />

            {/* Title */}
            <div style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              color: '#ffffff'
            }}>
              {t('practical.title')}
            </div>

            {/* Thin accent color progress bar */}
            <div style={{
              position: 'relative',
              width: '100%',
              height: '4px',
              background: '#1a1a1a',
              borderRadius: '2px',
              overflow: 'hidden',
              marginTop: '0.5rem'
            }}>
              <div style={{
                height: '100%',
                width: `${loadingState.progress}%`,
                background: 'linear-gradient(90deg, #E63329 0%, #ff5549 100%)',
                boxShadow: '0 0 8px rgba(230, 51, 41, 0.7)',
                transition: 'width 0.4s ease-out',
                borderRadius: '2px'
              }} />
            </div>

            {/* Status text */}
            <div style={{
              fontSize: '0.8rem',
              color: '#8ba4c4',
              fontWeight: 500,
              marginTop: '0.25rem',
              letterSpacing: '0.5px'
            }}>
              {loadingState.status}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PracticalExam;
