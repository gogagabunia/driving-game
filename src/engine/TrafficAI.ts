import { Scene, MeshBuilder, StandardMaterial, Color3, Mesh, Vector3 } from '@babylonjs/core';
import { CityRoadGenerator, RoadNode } from './CityRoadGenerator';
import { CarPhysics } from './CarPhysics';

export interface NPCCar {
  id: string;
  x: number;
  z: number;
  angle: number;
  speed: number;
  targetNodeId: string;
  previousNodeId: string;
  color: Color3;
  mesh: Mesh | null;
}

export interface NPCPedestrian {
  id: string;
  x: number;
  z: number;
  startX: number;
  endX: number;
  fixedZ: number;
  speed: number;
  direction: 1 | -1;
  mesh: Mesh | null;
}

export class TrafficAI {
  public npcs: NPCCar[] = [];
  public pedestrians: NPCPedestrian[] = [];
  private roadGenerator: CityRoadGenerator;
  private npcCruisingSpeed = 7.0; // m/s (~25 km/h)
  private collisionDistance = 6.0;

  constructor(roadGenerator: CityRoadGenerator) {
    this.roadGenerator = roadGenerator;
    this.spawnNPCs();
    this.spawnPedestrians();
  }

  private spawnNPCs() {
    this.npcs = [];
    const colors = [
      new Color3(0.7, 0.1, 0.1), // red
      new Color3(0.2, 0.3, 0.6), // blue
      new Color3(0.3, 0.3, 0.3), // grey
      new Color3(0.1, 0.5, 0.2)  // green
    ];

    // Dynamically find valid edges in the generated road network to spawn NPCs
    const activeEdges = this.roadGenerator.edges;
    let npcCount = Math.min(4, activeEdges.length);

    for (let i = 0; i < npcCount; i++) {
      const edge = activeEdges[i];
      const fromNode = this.roadGenerator.nodes.find(n => n.id === edge.fromNode);
      const toNode = this.roadGenerator.nodes.find(n => n.id === edge.toNode);
      
      if (fromNode && toNode) {
        // Spawn NPC in the middle of the road segment
        const midX = (fromNode.x + toNode.x) / 2;
        const midZ = (fromNode.z + toNode.z) / 2;
        const angle = Math.atan2(toNode.x - fromNode.x, toNode.z - fromNode.z);

        this.npcs.push({
          id: `npc_${i}`,
          x: midX,
          z: midZ,
          angle: angle,
          speed: this.npcCruisingSpeed * (0.7 + Math.random() * 0.2), // slightly varied speeds
          previousNodeId: edge.fromNode,
          targetNodeId: edge.toNode,
          color: colors[i % colors.length],
          mesh: null
        });
      }
    }
  }

  private spawnPedestrians() {
    // Spawn pedestrians relative to active grid nodes
    // Find intersections where Z = 0 or Z = 15
    this.pedestrians = [];
    
    // We spawn 2 pedestrians on crosswalk paths
    const p1Node = this.roadGenerator.nodes.find(n => n.z === 0);
    const z1 = p1Node ? p1Node.z : 0;
    
    const p2Node = this.roadGenerator.nodes.find(n => n.z === -40 || n.z === -15);
    const z2 = p2Node ? p2Node.z : -20;

    this.pedestrians.push(
      {
        id: 'ped_0',
        x: -15,
        z: z1,
        startX: -15,
        endX: 15,
        fixedZ: z1,
        speed: 1.5,
        direction: 1,
        mesh: null
      },
      {
        id: 'ped_1',
        x: 15,
        z: z2,
        startX: -15,
        endX: 15,
        fixedZ: z2,
        speed: 1.3,
        direction: -1,
        mesh: null
      }
    );
  }

  public build3DNPCObjects(scene: Scene) {
    const chassisMat = new StandardMaterial("chassisMatNPC", scene);
    chassisMat.specularColor = new Color3(0.5, 0.5, 0.5);

    const cabinMat = new StandardMaterial("cabinMatNPC", scene);
    cabinMat.diffuseColor = new Color3(0.05, 0.05, 0.08);

    const wheelMat = new StandardMaterial("wheelMatNPC", scene);
    wheelMat.diffuseColor = new Color3(0.08, 0.08, 0.08);

    // Build NPC Cars
    this.npcs.forEach(npc => {
      const carRoot = MeshBuilder.CreateBox(npc.id, { width: 0.1, height: 0.1, depth: 0.1 }, scene);
      carRoot.isVisible = false;
      npc.mesh = carRoot;

      const body = MeshBuilder.CreateBox(`${npc.id}_body`, { width: 1.75, height: 0.7, depth: 4.0 }, scene);
      body.position.set(0, 0.5, 0);
      body.parent = carRoot;

      const mat = chassisMat.clone(`${npc.id}_mat`);
      mat.diffuseColor = npc.color;
      body.material = mat;

      const cabin = MeshBuilder.CreateBox(`${npc.id}_cabin`, { width: 1.45, height: 0.6, depth: 2.1 }, scene);
      cabin.position.set(0, 1.15, -0.3);
      cabin.parent = carRoot;
      cabin.material = cabinMat;

      const wPos = [
        { x: 0.88, z: 1.25 }, { x: -0.88, z: 1.25 },
        { x: 0.88, z: -1.25 }, { x: -0.88, z: -1.25 }
      ];
      wPos.forEach((wp, i) => {
        const wheel = MeshBuilder.CreateCylinder(`${npc.id}_wheel_${i}`, { diameter: 0.68, height: 0.28 }, scene);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(wp.x, 0.25, wp.z);
        wheel.material = wheelMat;
        wheel.parent = carRoot;
      });
    });

    // Build Pedestrians
    const pedMat = new StandardMaterial("pedMat", scene);
    pedMat.diffuseColor = new Color3(0.1, 0.85, 0.8);

    this.pedestrians.forEach(ped => {
      const root = MeshBuilder.CreateBox(ped.id, { width: 0.1, height: 0.1, depth: 0.1 }, scene);
      root.isVisible = false;
      ped.mesh = root;

      const body = MeshBuilder.CreateCylinder(`${ped.id}_body`, { diameter: 0.4, height: 1.4 }, scene);
      body.position.set(0, 0.7, 0);
      body.material = pedMat;
      body.parent = root;

      const head = MeshBuilder.CreateSphere(`${ped.id}_head`, { diameter: 0.38 }, scene);
      head.position.set(0, 1.55, 0);
      const skinMat = new StandardMaterial(`${ped.id}_skin`, scene);
      skinMat.diffuseColor = new Color3(0.9, 0.7, 0.5);
      head.material = skinMat;
      head.parent = root;
    });
  }

  public update(dt: number, playerCar: CarPhysics) {
    this.npcs.forEach(npc => {
      const target = this.roadGenerator.nodes.find(n => n.id === npc.targetNodeId);
      if (!target) return;

      const dx = target.x - npc.x;
      const dz = target.z - npc.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 2.0) {
        this.advanceNPCPath(npc);
        return;
      }

      const targetAngle = Math.atan2(dx, dz);
      npc.angle = targetAngle;

      const obstacleDetected = this.isObstacleInFront(npc, playerCar);
      const redLightDetected = this.isRedLightInFront(npc, target);

      if (obstacleDetected || redLightDetected) {
        npc.speed -= 8.0 * dt;
        if (npc.speed < 0) npc.speed = 0;
      } else {
        npc.speed += 3.0 * dt;
        if (npc.speed > this.npcCruisingSpeed) npc.speed = this.npcCruisingSpeed;
      }

      npc.x += Math.sin(npc.angle) * npc.speed * dt;
      npc.z += Math.cos(npc.angle) * npc.speed * dt;

      if (npc.mesh) {
        npc.mesh.position.set(npc.x, 0, npc.z);
        npc.mesh.rotation.y = npc.angle;
      }
    });

    this.pedestrians.forEach(ped => {
      ped.x += ped.speed * ped.direction * dt;

      if (ped.x > ped.endX) {
        ped.x = ped.endX;
        ped.direction = -1;
      } else if (ped.x < ped.startX) {
        ped.x = ped.startX;
        ped.direction = 1;
      }

      if (ped.mesh) {
        ped.mesh.position.set(ped.x, 0, ped.z);
      }
    });
  }

  private advanceNPCPath(npc: NPCCar) {
    npc.previousNodeId = npc.targetNodeId;

    const outgoing = this.roadGenerator.edges.filter(
      e => e.fromNode === npc.targetNodeId || e.toNode === npc.targetNodeId
    );

    if (outgoing.length === 0) return;

    const candidates = outgoing
      .map(e => e.fromNode === npc.targetNodeId ? e.toNode : e.fromNode)
      .filter(id => id !== npc.previousNodeId);

    if (candidates.length > 0) {
      npc.targetNodeId = candidates[Math.floor(Math.random() * candidates.length)];
    } else {
      npc.targetNodeId = npc.previousNodeId;
    }
  }

  private isObstacleInFront(npc: NPCCar, player: CarPhysics): boolean {
    const fwdX = Math.sin(npc.angle);
    const fwdZ = Math.cos(npc.angle);

    const dxP = player.x - npc.x;
    const dzP = player.z - npc.z;
    const distP = Math.sqrt(dxP * dxP + dzP * dzP);

    if (distP < this.collisionDistance) {
      const dot = (dxP / distP) * fwdX + (dzP / distP) * fwdZ;
      if (dot > 0.7) return true;
    }

    for (const other of this.npcs) {
      if (other.id === npc.id) continue;

      const dxO = other.x - npc.x;
      const dzO = other.z - npc.z;
      const distO = Math.sqrt(dxO * dxO + dzO * dzO);

      if (distO < this.collisionDistance) {
        const dot = (dxO / distO) * fwdX + (dzO / distO) * fwdZ;
        if (dot > 0.7) return true;
      }
    }

    return false;
  }

  private isRedLightInFront(npc: NPCCar, target: RoadNode): boolean {
    if (!target.hasTrafficLight) return false;

    const dx = target.x - npc.x;
    const dz = target.z - npc.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 4.0 && dist < 12.0) {
      const isNS = Math.abs(Math.cos(npc.angle)) > Math.abs(Math.sin(npc.angle));
      if (isNS && target.lightState === 'red_ns') {
        return true;
      }
      if (!isNS && target.lightState === 'green_ns') {
        return true;
      }
    }

    return false;
  }

  public checkPedestrianCollisions(player: CarPhysics): boolean {
    for (const ped of this.pedestrians) {
      if (player.collidesWithCircle(ped.x, ped.z, 0.6)) {
        return true;
      }
    }
    return false;
  }

  public checkNPCCarCollisions(player: CarPhysics): boolean {
    for (const npc of this.npcs) {
      if (player.collidesWithCircle(npc.x, npc.z, 1.8)) {
        return true;
      }
    }
    return false;
  }
}
