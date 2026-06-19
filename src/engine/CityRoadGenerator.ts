import { Scene, Vector3, MeshBuilder, StandardMaterial, Color3, Mesh, Color4 } from '@babylonjs/core';
import { getCityById } from '../data/cities';

export interface RoadNode {
  id: string;
  x: number;
  z: number;
  type: 'cross' | 'tjunction' | 'roundabout' | 'deadend';
  hasTrafficLight: boolean;
  lightState: 'green_ns' | 'red_ns'; // North-South state. East-West is opposite.
  lightTimer: number;
}

export interface RoadEdge {
  id: string;
  fromNode: string;
  toNode: string;
  speedLimit: number; // km/h
  streetNameKa: string;
  streetNameEn: string;
}

export class CityRoadGenerator {
  public nodes: RoadNode[] = [];
  public edges: RoadEdge[] = [];
  private cityId: string;
  private preset: 'grid' | 'boulevard' | 'roundabout' | 'valley' = 'grid';
  
  // Track visual traffic lights to change their emissive colors
  private lightMeshes: {
    nodeId: string;
    direction: 'ns' | 'ew';
    redMesh: Mesh;
    yellowMesh: Mesh;
    greenMesh: Mesh;
  }[] = [];

  constructor(cityId: string) {
    this.cityId = cityId;
    const city = getCityById(cityId);
    this.preset = city?.layoutPreset || 'grid';
    this.generateLayout();
  }

  private generateLayout() {
    this.nodes = [];
    this.edges = [];

    if (this.preset === 'boulevard') {
      // Sea front boulevard layout (e.g. Batumi, Poti)
      // Long boulevard at X = 20, connected to side streets heading west
      this.nodes = [
        { id: 'n_b_s', x: 15,  z: -40, type: 'tjunction',  hasTrafficLight: true,  lightState: 'green_ns', lightTimer: 0 },
        { id: 'n_b_c', x: 15,  z: 0,   type: 'cross',      hasTrafficLight: true,  lightState: 'red_ns',   lightTimer: 2 },
        { id: 'n_b_n', x: 15,  z: 40,  type: 'tjunction',  hasTrafficLight: true,  lightState: 'green_ns', lightTimer: 4 },
        { id: 'n_w_s', x: -25, z: -40, type: 'deadend',     hasTrafficLight: false, lightState: 'green_ns', lightTimer: 0 },
        { id: 'n_w_c', x: -25, z: 0,   type: 'deadend',     hasTrafficLight: false, lightState: 'green_ns', lightTimer: 0 },
        { id: 'n_w_n', x: -25, z: 40,  type: 'deadend',     hasTrafficLight: false, lightState: 'green_ns', lightTimer: 0 }
      ];

      this.edges = [
        { id: 'e_b_s_c', fromNode: 'n_b_s', toNode: 'n_b_c', speedLimit: 50, streetNameKa: 'ბათუმის ბულვარი', streetNameEn: 'Batumi Boulevard' },
        { id: 'e_b_c_n', fromNode: 'n_b_c', toNode: 'n_b_n', speedLimit: 50, streetNameKa: 'ბათუმის ბულვარი', streetNameEn: 'Batumi Boulevard' },
        { id: 'e_s_w',   fromNode: 'n_b_s', toNode: 'n_w_s', speedLimit: 40, streetNameKa: 'გორგილაძის ქუჩა', streetNameEn: 'Gorgiladze St' },
        { id: 'e_c_w',   fromNode: 'n_b_c', toNode: 'n_w_c', speedLimit: 40, streetNameKa: 'ჭავჭავაძის გამზირი', streetNameEn: 'Chavchavadze Ave' },
        { id: 'e_n_w',   fromNode: 'n_b_n', toNode: 'n_w_n', speedLimit: 40, streetNameKa: 'მელიქიშვილის ქუჩა', streetNameEn: 'Melikishvili St' }
      ];
    } else if (this.preset === 'roundabout') {
      // Center roundabout layout (e.g. Kutaisi, Akhaltsikhe)
      this.nodes = [
        { id: 'n_center', x: 0,   z: 0,   type: 'roundabout',  hasTrafficLight: false, lightState: 'green_ns', lightTimer: 0 },
        { id: 'n_north',  x: 0,   z: 45,  type: 'tjunction',   hasTrafficLight: true,  lightState: 'green_ns', lightTimer: 0 },
        { id: 'n_south',  x: 0,   z: -45, type: 'tjunction',   hasTrafficLight: true,  lightState: 'red_ns',   lightTimer: 3 },
        { id: 'n_east',   x: 45,  z: 0,   type: 'cross',       hasTrafficLight: true,  lightState: 'green_ns', lightTimer: 6 },
        { id: 'n_west',   x: -45, z: 0,   type: 'cross',       hasTrafficLight: true,  lightState: 'red_ns',   lightTimer: 1 }
      ];

      this.edges = [
        { id: 'e_c_n', fromNode: 'n_center', toNode: 'n_north', speedLimit: 50, streetNameKa: 'თამარ მეფის ქუჩა', streetNameEn: 'Tamar Mepe St' },
        { id: 'e_c_s', fromNode: 'n_center', toNode: 'n_south', speedLimit: 50, streetNameKa: 'რუსთაველის გამზირი', streetNameEn: 'Rustaveli Ave' },
        { id: 'e_c_e', fromNode: 'n_center', toNode: 'n_east',  speedLimit: 60, streetNameKa: 'წერეთლის ქუჩა', streetNameEn: 'Tsereteli St' },
        { id: 'e_c_w', fromNode: 'n_center', toNode: 'n_west',  speedLimit: 40, streetNameKa: 'პუშკინის ქუჩა', streetNameEn: 'Pushkin St' }
      ];
    } else if (this.preset === 'valley') {
      // Scenic valley layout (e.g. Telavi, Sachkhere, Ambrolauri, Akhalkalaki)
      // Winding road going from start to end with small side paths
      this.nodes = [
        { id: 'n_start', x: -30, z: -40, type: 'deadend',     hasTrafficLight: false, lightState: 'green_ns', lightTimer: 0 },
        { id: 'n_mid1',  x: -15, z: -15, type: 'tjunction',   hasTrafficLight: true,  lightState: 'green_ns', lightTimer: 0 },
        { id: 'n_mid2',  x: 15,  z: 15,  type: 'tjunction',   hasTrafficLight: true,  lightState: 'red_ns',   lightTimer: 4 },
        { id: 'n_end',   x: 30,  z: 40,  type: 'deadend',     hasTrafficLight: false, lightState: 'green_ns', lightTimer: 0 },
        { id: 'n_side1', x: 15,  z: -15, type: 'deadend',     hasTrafficLight: false, lightState: 'green_ns', lightTimer: 0 },
        { id: 'n_side2', x: -15, z: 15,  type: 'deadend',     hasTrafficLight: false, lightState: 'green_ns', lightTimer: 0 }
      ];

      this.edges = [
        { id: 'e_s_m1',  fromNode: 'n_start', toNode: 'n_mid1',  speedLimit: 40, streetNameKa: 'ერეკლე II-ის ქუჩა', streetNameEn: 'Erekle II St' },
        { id: 'e_m1_m2', fromNode: 'n_mid1',  toNode: 'n_mid2',  speedLimit: 40, streetNameKa: 'ჩოლოყაშვილის გამზირი', streetNameEn: 'Choloqashvili Ave' },
        { id: 'e_m2_e',  fromNode: 'n_mid2',  toNode: 'n_end',   speedLimit: 40, streetNameKa: 'ვაჟა-ფშაველას ქუჩა', streetNameEn: 'Vaja-Pshavela St' },
        { id: 'e_m1_s1', fromNode: 'n_mid1',  toNode: 'n_side1', speedLimit: 30, streetNameKa: 'გურჯაანის გზა', streetNameEn: 'Gurjaani Rd' },
        { id: 'e_m2_s2', fromNode: 'n_mid2',  toNode: 'n_side2', speedLimit: 30, streetNameKa: 'რუსთავის ჩიხი', streetNameEn: 'Rustavi deadend' }
      ];
    } else {
      // Default: Soviet grid layout (Rustavi, Gori, Zugdidi, Ozurgeti)
      this.nodes = [
        { id: 'n_0_0', x: 0,   z: 0,   type: 'cross',       hasTrafficLight: true,  lightState: 'green_ns', lightTimer: 0 },
        { id: 'n_0_p', x: 0,   z: 40,  type: 'tjunction',  hasTrafficLight: true,  lightState: 'red_ns',   lightTimer: 2 },
        { id: 'n_0_m', x: 0,   z: -40, type: 'tjunction',  hasTrafficLight: true,  lightState: 'red_ns',   lightTimer: 5 },
        { id: 'n_p_0', x: 40,  z: 0,   type: 'tjunction',  hasTrafficLight: true,  lightState: 'red_ns',   lightTimer: 7 },
        { id: 'n_p_p', x: 40,  z: 40,  type: 'deadend',     hasTrafficLight: false, lightState: 'green_ns', lightTimer: 0 },
        { id: 'n_p_m', x: 40,  z: -40, type: 'deadend',     hasTrafficLight: false, lightState: 'green_ns', lightTimer: 0 },
        { id: 'n_m_0', x: -40, z: 0,   type: 'tjunction',  hasTrafficLight: true,  lightState: 'red_ns',   lightTimer: 3 },
        { id: 'n_m_p', x: -40, z: 40,  type: 'deadend',     hasTrafficLight: false, lightState: 'green_ns', lightTimer: 0 },
        { id: 'n_m_m', x: -40, z: -40, type: 'deadend',     hasTrafficLight: false, lightState: 'green_ns', lightTimer: 0 }
      ];

      this.edges = [
        { id: 'e_m_p_0_p', fromNode: 'n_m_p', toNode: 'n_0_p',  speedLimit: 50, streetNameKa: 'შარტავას ქუჩა', streetNameEn: 'Shartava St' },
        { id: 'e_0_p_p_p', fromNode: 'n_0_p', toNode: 'n_p_p',  speedLimit: 50, streetNameKa: 'შარტავას ქუჩა', streetNameEn: 'Shartava St' },
        { id: 'e_m_0_0_0', fromNode: 'n_m_0', toNode: 'n_0_0',  speedLimit: 60, streetNameKa: 'მეგობრობის გამზირი', streetNameEn: 'Megobroba Ave' },
        { id: 'e_0_0_p_0', fromNode: 'n_0_0', toNode: 'n_p_0',  speedLimit: 60, streetNameKa: 'მეგობრობის გამზირი', streetNameEn: 'Megobroba Ave' },
        { id: 'e_m_m_0_m', fromNode: 'n_m_m', toNode: 'n_0_m',  speedLimit: 50, streetNameKa: 'კოსტავას ქუჩა', streetNameEn: 'Kostava St' },
        { id: 'e_0_m_p_m', fromNode: 'n_0_m', toNode: 'n_p_m',  speedLimit: 50, streetNameKa: 'კოსტავას ქუჩა', streetNameEn: 'Kostava St' },
        { id: 'e_m_m_m_0', fromNode: 'n_m_m', toNode: 'n_m_0',  speedLimit: 40, streetNameKa: 'ლესელიძის ქუჩა', streetNameEn: 'Leselidze St' },
        { id: 'e_m_0_m_p', fromNode: 'n_m_0', toNode: 'n_m_p',  speedLimit: 40, streetNameKa: 'ლესელიძის ქუჩა', streetNameEn: 'Leselidze St' },
        { id: 'e_0_m_0_0', fromNode: 'n_0_m', toNode: 'n_0_0',  speedLimit: 50, streetNameKa: 'შოთა რუსთაველის ქუჩა', streetNameEn: 'Shota Rustaveli St' },
        { id: 'e_0_0_0_p', fromNode: 'n_0_0', toNode: 'n_0_p',  speedLimit: 50, streetNameKa: 'შოთა რუსთაველის ქუჩა', streetNameEn: 'Shota Rustaveli St' },
        { id: 'e_p_m_p_0', fromNode: 'n_p_m', toNode: 'n_p_0',  speedLimit: 40, streetNameKa: 'თბილისის გზატკეცილი', streetNameEn: 'Tbilisi Highway' },
        { id: 'e_p_0_p_p', fromNode: 'n_p_0', toNode: 'n_p_p',  speedLimit: 40, streetNameKa: 'თბილისის გზატკეცილი', streetNameEn: 'Tbilisi Highway' }
      ];
    }
  }

  public updateLightTimers(dt: number) {
    this.nodes.forEach(node => {
      if (!node.hasTrafficLight) return;
      
      node.lightTimer += dt;
      if (node.lightTimer >= 8.0) {
        node.lightTimer = 0;
        node.lightState = node.lightState === 'green_ns' ? 'red_ns' : 'green_ns';
        this.updateVisualLights(node);
      }
    });
  }

  public build3DMap(scene: Scene) {
    const roadMat = new StandardMaterial("roadMat", scene);
    roadMat.diffuseColor = new Color3(0.12, 0.14, 0.18);
    roadMat.specularColor = new Color3(0.05, 0.05, 0.05);

    const yellowLineMat = new StandardMaterial("yellowLineMat", scene);
    yellowLineMat.diffuseColor = new Color3(0.9, 0.7, 0.1);
    yellowLineMat.emissiveColor = new Color3(0.1, 0.08, 0);

    const roadWidth = 8.0;

    // Apply Weather Fog if enabled
    const cityData = getCityById(this.cityId);
    if (cityData?.hasWeatherEffects) {
      scene.fogMode = Scene.FOGMODE_EXP;
      scene.fogDensity = this.cityId === 'akhalkalaki' ? 0.022 : 0.012; // Extra fog in Akhalkalaki
      scene.fogColor = new Color3(0.55, 0.58, 0.62);
    }

    // Build road segments
    this.edges.forEach(edge => {
      const from = this.nodes.find(n => n.id === edge.fromNode);
      const to = this.nodes.find(n => n.id === edge.toNode);
      if (!from || !to) return;

      const dx = to.x - from.x;
      const dz = to.z - from.z;
      const length = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dx, dz);

      const roadPlane = MeshBuilder.CreatePlane(`road_${edge.id}`, { width: roadWidth, height: length }, scene);
      roadPlane.rotation.x = Math.PI / 2;
      roadPlane.rotation.z = -angle;
      roadPlane.position.set(from.x + dx/2, 0.005, from.z + dz/2);
      roadPlane.material = roadMat;
      roadPlane.receiveShadows = true;

      // Double solid line
      const yellowLine1 = MeshBuilder.CreatePlane(`yellow1_${edge.id}`, { width: 0.08, height: length }, scene);
      yellowLine1.rotation.x = Math.PI / 2;
      yellowLine1.rotation.z = -angle;
      const offsetX1 = Math.cos(angle) * 0.06;
      const offsetZ1 = -Math.sin(angle) * 0.06;
      yellowLine1.position.set(from.x + dx/2 + offsetX1, 0.007, from.z + dz/2 + offsetZ1);
      yellowLine1.material = yellowLineMat;

      const yellowLine2 = MeshBuilder.CreatePlane(`yellow2_${edge.id}`, { width: 0.08, height: length }, scene);
      yellowLine2.rotation.x = Math.PI / 2;
      yellowLine2.rotation.z = -angle;
      const offsetX2 = -Math.cos(angle) * 0.06;
      const offsetZ2 = Math.sin(angle) * 0.06;
      yellowLine2.position.set(from.x + dx/2 + offsetX2, 0.007, from.z + dz/2 + offsetZ2);
      yellowLine2.material = yellowLineMat;

      // Draw arched bridge mesh (for Kutaisi river crossings)
      if (this.cityId === 'kutaisi' && (edge.id === 'e_c_w' || edge.id === 'e_c_e')) {
        this.buildArchedBridge(from.x + dx/2, from.z + dz/2, length, angle, scene);
      }
    });

    // Build Intersections
    const crossroadMat = new StandardMaterial("crossMat", scene);
    crossroadMat.diffuseColor = new Color3(0.14, 0.16, 0.2);

    this.nodes.forEach(node => {
      if (node.type === 'cross' || node.type === 'tjunction') {
        const size = node.type === 'cross' ? roadWidth * 1.3 : roadWidth * 1.15;
        const intersectionPlane = MeshBuilder.CreatePlane(`node_${node.id}`, { width: size, height: size }, scene);
        intersectionPlane.rotation.x = Math.PI / 2;
        intersectionPlane.position.set(node.x, 0.006, node.z);
        intersectionPlane.material = crossroadMat;
        intersectionPlane.receiveShadows = true;

        if (node.hasTrafficLight) {
          this.buildTrafficLightsForNode(node, scene);
        }
      } else if (node.type === 'roundabout') {
        const ringOuter = MeshBuilder.CreateCylinder(`roundabout_outer_${node.id}`, { diameter: 18, height: 0.01, tessellation: 24 }, scene);
        ringOuter.position.set(node.x, 0.006, node.z);
        ringOuter.material = roadMat;

        const island = MeshBuilder.CreateCylinder(`roundabout_island_${node.id}`, { diameter: 8, height: 0.6, tessellation: 24 }, scene);
        island.position.set(node.x, 0.3, node.z);
        const islandMat = new StandardMaterial("islandMat", scene);
        islandMat.diffuseColor = new Color3(0.2, 0.55, 0.28);
        island.material = islandMat;
      }
    });

    // Custom Background elements per city Preset
    this.buildCityDecorations(scene);
  }

  private buildArchedBridge(x: number, z: number, length: number, angle: number, scene: Scene) {
    const bridgeMat = new StandardMaterial("bridgeMat", scene);
    bridgeMat.diffuseColor = new Color3(0.45, 0.45, 0.48); // stone grey

    // Arched side rails representing Kutaisi bridges
    const railL = MeshBuilder.CreateBox("bridge_rail_l", { width: 0.3, height: 1.1, depth: length }, scene);
    railL.position.set(x - 4.15 * Math.cos(angle), 0.55, z + 4.15 * Math.sin(angle));
    railL.rotation.y = -angle;
    railL.material = bridgeMat;

    const railR = MeshBuilder.CreateBox("bridge_rail_r", { width: 0.3, height: 1.1, depth: length }, scene);
    railR.position.set(x + 4.15 * Math.cos(angle), 0.55, z - 4.15 * Math.sin(angle));
    railR.rotation.y = -angle;
    railR.material = bridgeMat;
  }

  private buildCityDecorations(scene: Scene) {
    const vegetationMat = new StandardMaterial("vegMat", scene);
    vegetationMat.diffuseColor = new Color3(0.18, 0.55, 0.25); // lush green leaves

    const trunkMat = new StandardMaterial("trunkMat", scene);
    trunkMat.diffuseColor = new Color3(0.42, 0.25, 0.15); // brown wood

    // --- Welcome Banner Arch ---
    // Spawn arch welcome banner at start node
    const startNode = this.nodes[0];
    if (startNode) {
      const cityName = getCityById(this.cityId)?.nameEn || 'Rustavi';
      const archL = MeshBuilder.CreateCylinder("archL", { diameter: 0.3, height: 5.0 }, scene);
      archL.position.set(startNode.x - 5.5, 2.5, startNode.z - 3);
      archL.material = trunkMat;

      const archR = MeshBuilder.CreateCylinder("archR", { diameter: 0.3, height: 5.0 }, scene);
      archR.position.set(startNode.x + 5.5, 2.5, startNode.z - 3);
      archR.material = trunkMat;

      const bannerBox = MeshBuilder.CreateBox("bannerBox", { width: 11.2, height: 1.5, depth: 0.3 }, scene);
      bannerBox.position.set(startNode.x, 4.5, startNode.z - 3);
      const bannerMat = new StandardMaterial("bannerTextMat", scene);
      bannerMat.diffuseColor = new Color3(0.08, 0.15, 0.28);
      bannerBox.material = bannerMat;
    }

    // --- Preset A: Boulevard (Batumi, Poti) Black Sea + Palms/Cranes
    if (this.preset === 'boulevard') {
      // 1. Black Sea Plane along X = 45 (Z from -65 to 65)
      const sea = MeshBuilder.CreatePlane("blackSea", { width: 60, height: 130 }, scene);
      sea.rotation.x = Math.PI / 2;
      sea.position.set(50, 0.002, 0);
      const seaMat = new StandardMaterial("seaMat", scene);
      seaMat.diffuseColor = new Color3(0.05, 0.35, 0.55); // Coastal blue
      seaMat.emissiveColor = new Color3(0, 0.05, 0.1);
      sea.material = seaMat;

      // 2. Palm Trees along Boulevard sidewalk (X = 22)
      for (let z = -55; z <= 55; z += 18) {
        const trunk = MeshBuilder.CreateCylinder(`palm_trunk_${z}`, { diameterTop: 0.12, diameterBottom: 0.22, height: 4.0 }, scene);
        trunk.position.set(21, 2.0, z);
        trunk.material = trunkMat;

        const leaves = MeshBuilder.CreateSphere(`palm_leaves_${z}`, { diameter: 1.8 }, scene);
        leaves.position.set(21, 4.0, z);
        leaves.material = vegetationMat;
        leaves.scaling.y = 0.35; // flatten like a palm crown
      }

      // 3. Poti Harbor Cranes
      if (this.cityId === 'poti') {
        const craneMat = new StandardMaterial("craneMat", scene);
        craneMat.diffuseColor = new Color3(0.3, 0.3, 0.3); // industrial grey
        for (let z = -45; z <= 45; z += 30) {
          const craneBase = MeshBuilder.CreateBox(`crane_${z}`, { width: 3, height: 6, depth: 3 }, scene);
          craneBase.position.set(65, 3.0, z);
          craneBase.material = craneMat;

          const craneArm = MeshBuilder.CreateBox(`crane_arm_${z}`, { width: 8, height: 0.4, depth: 0.8 }, scene);
          craneArm.position.set(62, 6.0, z);
          craneArm.rotation.z = Math.PI / 6;
          craneArm.material = craneMat;
        }
      }
    }

    // --- Preset B: Roundabout (Kutaisi, Akhaltsikhe) River + Bridges / Castle Hills
    if (this.preset === 'roundabout') {
      if (this.cityId === 'kutaisi') {
        // 1. Rioni River Plane cutting North-South at X = -20
        const river = MeshBuilder.CreatePlane("rioniRiver", { width: 15, height: 130 }, scene);
        river.rotation.x = Math.PI / 2;
        river.position.set(-20, 0.002, 0);
        const riverMat = new StandardMaterial("riverMat", scene);
        riverMat.diffuseColor = new Color3(0.18, 0.45, 0.45); // muddy river teal
        riverMat.emissiveColor = new Color3(0, 0.05, 0.05);
        river.material = riverMat;

        // 2. Distant Bagrati Cathedral Hill in Top-Left (X=-45, Z=45)
        const cathedralHill = MeshBuilder.CreateCylinder("cathedralHill", { diameterTop: 12, diameterBottom: 25, height: 8 }, scene);
        cathedralHill.position.set(-65, 2.0, 65);
        const hillMat = new StandardMaterial("hillMat", scene);
        hillMat.diffuseColor = new Color3(0.2, 0.45, 0.22);
        cathedralHill.material = hillMat;

        // Dome
        const dome = MeshBuilder.CreateSphere("bagratiDome", { diameter: 4 }, scene);
        dome.position.set(-65, 7.5, 65);
        const domeMat = new StandardMaterial("domeMat", scene);
        domeMat.diffuseColor = new Color3(0.1, 0.35, 0.28); // Green dome oxide
        dome.material = domeMat;
      }

      if (this.cityId === 'akhaltsikhe') {
        // Rabati Castle hill in Bottom-Left quadrant (X=-50, Z=-50)
        const castleHill = MeshBuilder.CreateCylinder("rabatiHill", { diameterTop: 18, diameterBottom: 30, height: 7 }, scene);
        castleHill.position.set(-60, 2.0, -60);
        const cHillMat = new StandardMaterial("cHillMat", scene);
        cHillMat.diffuseColor = new Color3(0.38, 0.32, 0.25); // stone dirt color
        castleHill.material = cHillMat;

        // Tower cylinders
        for (let i = 0; i < 3; i++) {
          const angle = (i * Math.PI * 2) / 3;
          const tx = -60 + Math.sin(angle) * 7;
          const tz = -60 + Math.cos(angle) * 7;
          const tower = MeshBuilder.CreateCylinder(`rabati_tower_${i}`, { diameter: 2.2, height: 6.0 }, scene);
          tower.position.set(tx, 7.5, tz);
          const towerMat = new StandardMaterial("towerMat", scene);
          towerMat.diffuseColor = new Color3(0.5, 0.5, 0.48);
          tower.material = towerMat;
        }
      }
    }

    // --- Preset C: Valley / Mountain Vineyard preset (Telavi, Sachkhere, Ambrolauri, Akhalkalaki)
    if (this.preset === 'valley') {
      // 1. Vineyards Rows (Telavi, Ambrolauri)
      if (this.cityId === 'telavi' || this.cityId === 'ambrolauri') {
        const rowPositions = [
          { x: -35, z: -15 }, { x: -35, z: 15 },
          { x: 35,  z: -15 }, { x: 35,  z: 15 }
        ];
        rowPositions.forEach((pos, index) => {
          for (let r = 0; r < 3; r++) { // 3 rows
            const rx = pos.x + r * 2.5;
            for (let z = pos.z - 15; z <= pos.z + 15; z += 5) {
              const vine = MeshBuilder.CreateBox(`vine_${index}_${r}_${z}`, { width: 0.6, height: 1.4, depth: 0.6 }, scene);
              vine.position.set(rx, 0.7, z);
              vine.material = vegetationMat;
            }
          }
        });
      }

      // 2. Giant Mountain Range in the background (Z = 65)
      // Snow-capped peak pyramids
      if (this.cityId === 'ambrolauri' || this.cityId === 'sachkhere') {
        const peakMat = new StandardMaterial("peakMat", scene);
        peakMat.diffuseColor = new Color3(0.48, 0.52, 0.58);
        const snowMat = new StandardMaterial("snowMat", scene);
        snowMat.diffuseColor = new Color3(0.98, 0.98, 0.98); // White snow

        const mountConfigs = [
          { x: -70, z: 75, r: 30, h: 25 },
          { x: 0,   z: 85, r: 35, h: 32 },
          { x: 70,  z: 75, r: 30, h: 25 }
        ];

        mountConfigs.forEach((mc, index) => {
          const mount = MeshBuilder.CreateCylinder(`mount_${index}`, { diameterTop: 0.1, diameterBottom: mc.r * 2, height: mc.h, subdivisions: 4 }, scene);
          mount.position.set(mc.x, mc.h / 2, mc.z);
          mount.material = peakMat;

          // Snow cap
          const capHeight = mc.h * 0.3;
          const cap = MeshBuilder.CreateCylinder(`mount_cap_${index}`, { diameterTop: 0.1, diameterBottom: mc.r * 0.6, height: capHeight }, scene);
          cap.position.set(mc.x, mc.h - capHeight / 2, mc.z);
          cap.material = snowMat;
        });
      }
    }

    // --- Generic Buildings grid quadrant clusters ---
    this.buildSurroundingBuildings(scene);
  }

  private buildTrafficLightsForNode(node: RoadNode, scene: Scene) {
    const poleMat = new StandardMaterial("poleMat", scene);
    poleMat.diffuseColor = new Color3(0.3, 0.3, 0.3);

    const offsets = [
      { dir: 'n', x: 0,    z: 5.5,  rotY: Math.PI },
      { dir: 's', x: 0,    z: -5.5, rotY: 0 },
      { dir: 'e', x: 5.5,  z: 0,    rotY: Math.PI / 2 },
      { dir: 'w', x: -5.5, z: 0,    rotY: -Math.PI / 2 }
    ];

    offsets.forEach(offset => {
      const pole = MeshBuilder.CreateCylinder(`pole_${node.id}_${offset.dir}`, { diameter: 0.15, height: 3.5 }, scene);
      pole.position.set(node.x + offset.x, 1.75, node.z + offset.z);
      pole.material = poleMat;

      const lightBox = MeshBuilder.CreateBox(`box_${node.id}_${offset.dir}`, { width: 0.4, height: 1.0, depth: 0.4 }, scene);
      lightBox.position.set(node.x + offset.x, 3.0, node.z + offset.z);
      lightBox.rotation.y = offset.rotY;
      const boxMat = new StandardMaterial("lightBoxMat", scene);
      boxMat.diffuseColor = new Color3(0.1, 0.1, 0.1);
      lightBox.material = boxMat;

      const lightRed = MeshBuilder.CreateCylinder(`light_red_${node.id}_${offset.dir}`, { diameter: 0.22, height: 0.1, tessellation: 8 }, scene);
      lightRed.rotation.x = Math.PI / 2;
      lightRed.position.set(0, 0.3, 0.2);
      lightRed.parent = lightBox;

      const lightYellow = MeshBuilder.CreateCylinder(`light_yellow_${node.id}_${offset.dir}`, { diameter: 0.22, height: 0.1, tessellation: 8 }, scene);
      lightYellow.rotation.x = Math.PI / 2;
      lightYellow.position.set(0, 0, 0.2);
      lightYellow.parent = lightBox;

      const lightGreen = MeshBuilder.CreateCylinder(`light_green_${node.id}_${offset.dir}`, { diameter: 0.22, height: 0.1, tessellation: 8 }, scene);
      lightGreen.rotation.x = Math.PI / 2;
      lightGreen.position.set(0, -0.3, 0.2);
      lightGreen.parent = lightBox;

      const rMat = new StandardMaterial(`rMat_${node.id}_${offset.dir}`, scene);
      const yMat = new StandardMaterial(`yMat_${node.id}_${offset.dir}`, scene);
      const gMat = new StandardMaterial(`gMat_${node.id}_${offset.dir}`, scene);

      lightRed.material = rMat;
      lightYellow.material = yMat;
      lightGreen.material = gMat;

      const isNS = offset.dir === 'n' || offset.dir === 's';
      this.lightMeshes.push({
        nodeId: node.id,
        direction: isNS ? 'ns' : 'ew',
        redMesh: lightRed,
        yellowMesh: lightYellow,
        greenMesh: lightGreen
      });
    });

    this.updateVisualLights(node);
  }

  private updateVisualLights(node: RoadNode) {
    const dimColor = new Color3(0.1, 0.02, 0.02);
    const brightRed = new Color3(0.95, 0.1, 0.1);
    const brightGreen = new Color3(0.1, 0.95, 0.15);

    const nodeLights = this.lightMeshes.filter(lm => lm.nodeId === node.id);

    nodeLights.forEach(light => {
      const isGreen = (light.direction === 'ns' && node.lightState === 'green_ns') ||
                      (light.direction === 'ew' && node.lightState === 'red_ns');

      const rMat = light.redMesh.material as StandardMaterial;
      const gMat = light.greenMesh.material as StandardMaterial;
      const yMat = light.yellowMesh.material as StandardMaterial;

      if (!rMat || !gMat || !yMat) return;

      yMat.diffuseColor = new Color3(0.15, 0.15, 0.02);
      yMat.emissiveColor = Color3.Black();

      if (isGreen) {
        rMat.diffuseColor = dimColor;
        rMat.emissiveColor = Color3.Black();

        gMat.diffuseColor = brightGreen;
        gMat.emissiveColor = new Color3(0.1, 0.8, 0.1);
      } else {
        rMat.diffuseColor = brightRed;
        rMat.emissiveColor = new Color3(0.8, 0.1, 0.1);

        gMat.diffuseColor = new Color3(0.02, 0.1, 0.02);
        gMat.emissiveColor = Color3.Black();
      }
    });
  }

  private buildSurroundingBuildings(scene: Scene) {
    const roofMat = new StandardMaterial("roofMat", scene);
    roofMat.diffuseColor = new Color3(0.6, 0.25, 0.2);

    // Filter building placements dynamically to avoid placing houses directly on roads/lakes/rivers
    const quadRanges = [
      { minX: -34, maxX: -6,   minZ: -34, maxZ: -6 },   // Bottom-Left
      { minX: 6,   maxX: 34,   minZ: -34, maxZ: -6 },   // Bottom-Right
      { minX: -34, maxX: -6,   minZ: 6,   maxZ: 34 },   // Top-Left
      { minX: 6,   maxX: 34,   minZ: 6,   maxZ: 34 }    // Top-Right
    ];

    quadRanges.forEach((qr, qIndex) => {
      // Avoid building in sectors where river or sea is spawned
      if (this.preset === 'boulevard' && qr.minX > 10) return; // sea along East
      if (this.cityId === 'kutaisi' && qr.minX < 0 && qr.maxX > -25) return; // river along X=-20

      const stepsX = [qr.minX + 5, qr.maxX - 5];
      const stepsZ = [qr.minZ + 5, qr.maxZ - 5];

      let houseCount = 0;
      stepsX.forEach(hx => {
        stepsZ.forEach(hz => {
          // Avoid spawning directly on Rabati castle/Fortress hill quadrants
          if (this.cityId === 'akhaltsikhe' && hx < -20 && hz < -20) return;
          if (this.cityId === 'kutaisi' && hx < -30 && hz > 20) return;

          houseCount++;
          const height = 5 + Math.random() * 8;
          const width = 6 + Math.random() * 2;
          const depth = 6 + Math.random() * 2;

          const house = MeshBuilder.CreateBox(`house_${qIndex}_${houseCount}`, { width, height, depth }, scene);
          house.position.set(hx, height/2, hz);

          const houseMat = new StandardMaterial(`houseMat_${qIndex}_${houseCount}`, scene);
          const colors = [
            new Color3(0.85, 0.8, 0.72),
            new Color3(0.6, 0.75, 0.78),
            new Color3(0.7, 0.7, 0.72)
          ];
          houseMat.diffuseColor = colors[(qIndex + houseCount) % colors.length];
          house.material = houseMat;

          const roof = MeshBuilder.CreateBox(`roof_${qIndex}_${houseCount}`, { width: width + 0.3, height: 0.15, depth: depth + 0.3 }, scene);
          roof.position.set(hx, height + 0.075, hz);
          roof.material = roofMat;
        });
      });
    });
  }

  public checkRedLightViolation(x: number, z: number, yawAngle: number): boolean {
    for (const node of this.nodes) {
      if (!node.hasTrafficLight) continue;
      
      const dx = x - node.x;
      const dz = z - node.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 6.0) {
        const isNS = Math.abs(Math.cos(yawAngle)) > Math.abs(Math.sin(yawAngle));
        if (isNS && node.lightState === 'red_ns') {
          return true;
        }
        if (!isNS && node.lightState === 'green_ns') {
          return true;
        }
      }
    }
    return false;
  }
}
