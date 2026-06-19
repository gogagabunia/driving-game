import { CarPhysics } from './CarPhysics';

export interface ConeData {
  id: string;
  x: number;
  z: number;
  radius: number;
  hit: boolean;
}

export interface TaskData {
  id: string;
  nameEn: string;
  nameKa: string;
  descriptionEn: string;
  descriptionKa: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
}

export class CourseManager {
  public tasks: TaskData[] = [];
  public currentTaskIndex: number = 0;
  
  // List of cones for collision checks
  public cones: ConeData[] = [];
  
  // Course boundaries: X and Z limits
  public minX: number = -40;
  public maxX: number = 40;
  public minZ: number = -50;
  public maxZ: number = 50;

  // Sound and penalty callbacks
  private onPenaltyCallback: (points: number, reasonEn: string, reasonKa: string) => void;
  private onTaskCompletedCallback: (index: number) => void;

  // Three-point turn tracking
  private yTurnMovements: number = 0;
  private yTurnLastDirection: 'forward' | 'reverse' | null = null;
  private hasStoppedInYTurn: boolean = false;

  // Ramp task tracking
  private rampStopped: boolean = false;
  private rampStoppedTimer: number = 0;

  // Parallel & Perpendicular parking tracking
  private parkingStoppedTimer: number = 0;
  private isParkedSuccessfully: boolean = false;

  constructor(
    onPenalty: (points: number, reasonEn: string, reasonKa: string) => void,
    onTaskCompleted: (index: number) => void
  ) {
    this.onPenaltyCallback = onPenalty;
    this.onTaskCompletedCallback = onTaskCompleted;
    this.initTasks();
    this.initCones();
  }

  private initTasks() {
    this.tasks = [
      {
        id: 'ramp',
        nameEn: 'Ramp / Hill Start',
        nameKa: 'ესტაკადა (აღმართი)',
        descriptionEn: 'Drive up the ramp, stop completely, engage handbrake. Restart and drive off without rolling back.',
        descriptionKa: 'აიარეთ ესტაკადაზე, სრულად გაჩერდით და აღმართეთ ხელის მუხრუჭი. დაიწყეთ მოძრაობა უკან დაგორების გარეშე.',
        status: 'active'
      },
      {
        id: 'slalom',
        nameEn: 'Slalom / Serpentine',
        nameKa: 'ზინგზაგი (სერპენტინი)',
        descriptionEn: 'Weave left and right between the 5 cones in a continuous flow.',
        descriptionKa: 'გაიარეთ 5 კონუსს შორის მარცხნივ და მარჯვნივ უწყვეტი ტრაექტორიით.',
        status: 'pending'
      },
      {
        id: 'parallel',
        nameEn: 'Parallel Parking',
        nameKa: 'პარალელური პარკირება',
        descriptionEn: 'Reverse-park the car inside the side bay, stop, pull handbrake, then exit.',
        descriptionKa: 'უკუსვლით დააყენეთ მანქანა გვერდითა ჯიბეში, გააჩერეთ, აღმართეთ ხელის მუხრუჭი და შემდეგ გამოდით.',
        status: 'pending'
      },
      {
        id: 'perpendicular',
        nameEn: 'Garage / Perpendicular Parking',
        nameKa: 'ბოქსი (გარაჟი)',
        descriptionEn: 'Reverse-park the car into the perpendicular garage, stop, pull handbrake, then exit.',
        descriptionKa: 'უკუსვლით შედით პერპენდიკულარულ გარაჟში, გააჩერეთ, აღმართეთ ხელის მუხრუჭი და შემდეგ გამოდით.',
        status: 'pending'
      },
      {
        id: 'yturn',
        nameEn: 'Three-Point Turn',
        nameKa: 'შემობრუნება ვიწრო გზაზე',
        descriptionEn: 'Turn the vehicle 180 degrees in the narrow lane using at most 3 movements.',
        descriptionKa: 'შემოაბრუნეთ მანქანა 180 გრადუსით ვიწრო გზაზე მაქსიმუმ 3 სვლით.',
        status: 'pending'
      },
      {
        id: 'stopline',
        nameEn: 'Stop Line Finish',
        nameKa: 'ფინიში (სტოპ ხაზი)',
        descriptionEn: 'Drive to the final stop line and stop the vehicle completely.',
        descriptionKa: 'მიიყვანეთ მანქანა ფინალურ სტოპ ხაზთან და სრულად გააჩერეთ.',
        status: 'pending'
      }
    ];
    this.currentTaskIndex = 0;
  }

  private initCones() {
    this.cones = [];

    // --- Task 2: Slalom Cones (X = 15, Z from -20 to 20)
    for (let i = 0; i < 5; i++) {
      this.cones.push({
        id: `slalom_cone_${i}`,
        x: 15,
        z: -20 + i * 10,
        radius: 0.35,
        hit: false
      });
    }

    // --- Task 3: Parallel Parking Bay Cones (X around -25, Z around 15 to 22)
    // Bay center: X = -27.5, Z = 18.5. Corners:
    const px = -25.5;
    const pzStart = 15;
    const pzEnd = 22;
    this.cones.push(
      { id: 'p_cone_fr', x: px, z: pzStart, radius: 0.35, hit: false },
      { id: 'p_cone_br', x: px, z: pzEnd, radius: 0.35, hit: false },
      { id: 'p_cone_fl', x: px - 3.0, z: pzStart, radius: 0.35, hit: false },
      { id: 'p_cone_bl', x: px - 3.0, z: pzEnd, radius: 0.35, hit: false }
    );

    // --- Task 4: Perpendicular Garage Cones (X around -22 to -27, Z around -13 to -17)
    // Garage center: X = -25, Z = -15. Entrance is at X = -22.
    const gx = -22;
    const gzTop = -13.5;
    const gzBottom = -16.5;
    this.cones.push(
      { id: 'g_cone_ent_t', x: gx, z: gzTop, radius: 0.35, hit: false },
      { id: 'g_cone_ent_b', x: gx, z: gzBottom, radius: 0.35, hit: false },
      { id: 'g_cone_back_t', x: gx - 5.0, z: gzTop, radius: 0.35, hit: false },
      { id: 'g_cone_back_b', x: gx - 5.0, z: gzBottom, radius: 0.35, hit: false }
    );

    // --- Task 5: Three-point Turn Lane Markers (X around 25, Z from -30 to -15)
    // Dead end street at X = 25, Z = -20.
    this.cones.push(
      { id: 'y_cone_l1', x: 22, z: -25, radius: 0.35, hit: false },
      { id: 'y_cone_l2', x: 22, z: -15, radius: 0.35, hit: false },
      { id: 'y_cone_r1', x: 28, z: -25, radius: 0.35, hit: false },
      { id: 'y_cone_r2', x: 28, z: -15, radius: 0.35, hit: false }
    );
  }

  public reset() {
    this.initTasks();
    this.initCones();
    this.yTurnMovements = 0;
    this.yTurnLastDirection = null;
    this.hasStoppedInYTurn = false;
    this.rampStopped = false;
    this.rampStoppedTimer = 0;
    this.parkingStoppedTimer = 0;
    this.isParkedSuccessfully = false;
  }

  public update(dt: number, car: CarPhysics) {
    if (this.currentTaskIndex >= this.tasks.length) return;

    // 1. Collision detection with cones
    this.cones.forEach(cone => {
      if (!cone.hit && car.collidesWithCircle(cone.x, cone.z, cone.radius)) {
        cone.hit = true;
        this.onPenaltyCallback(
          5,
          `Hit Cone (${cone.id.split('_')[0]})`,
          `დაეჯახეთ კონუსს`
        );
      }
    });

    // 2. Course boundaries check
    const carCorners = car.getBoundingBox();
    let outOfBounds = false;
    for (const c of carCorners) {
      if (c.x < this.minX || c.x > this.maxX || c.z < this.minZ || c.z > this.maxZ) {
        outOfBounds = true;
        break;
      }
    }
    
    // Check custom task zone constraints (like crossing walls in three-point turn)
    if (this.tasks[this.currentTaskIndex].id === 'yturn') {
      for (const c of carCorners) {
        // Outer boundaries of the three-point turn box: X < 22 or X > 28
        // If Z is inside the active zone [-25, -15]
        if (c.z >= -25 && c.z <= -15 && (c.x < 22 || c.x > 28)) {
          outOfBounds = true;
          break;
        }
      }
    }

    if (outOfBounds) {
      // Small penalty every second, or reset car back to track
      this.onPenaltyCallback(10, 'Out of Course Boundaries', 'გახვედით საგამოცდო ზოლის გარეთ');
      // Push car back inside slightly to prevent infinite penalty loop
      car.x = Math.max(this.minX + 2, Math.min(this.maxX - 2, car.x));
      car.z = Math.max(this.minZ + 2, Math.min(this.maxZ - 2, car.z));
      car.speed = 0;
    }

    // 3. Process the current active task state
    const activeTask = this.tasks[this.currentTaskIndex];

    switch (activeTask.id) {
      case 'ramp':
        this.processRampTask(dt, car);
        break;
      case 'slalom':
        this.processSlalomTask(dt, car);
        break;
      case 'parallel':
        this.processParallelParkingTask(dt, car);
        break;
      case 'perpendicular':
        this.processPerpendicularParkingTask(dt, car);
        break;
      case 'yturn':
        this.processYTurnTask(dt, car);
        break;
      case 'stopline':
        this.processStopLineTask(dt, car);
        break;
    }
  }

  // --- Task 1: Ramp / Hill Start
  // Ramp zone is X in [-13, -7], Z in [-15, 10]
  private processRampTask(dt: number, car: CarPhysics) {
    const isInsideRampZone = car.x >= -13 && car.x <= -7 && car.z >= -15 && car.z <= 22;
    car.onSlope = isInsideRampZone && car.z >= -15 && car.z <= 22; // slope starts Z=-15, flat top Z=0 to 7, downhill ends Z=22

    if (car.onSlope) {
      // Must stop in the middle of the ramp: Z between -4 and 1
      const isStoppedInStopArea = car.z >= -4 && car.z <= 1 && Math.abs(car.speed) < 0.05;
      
      if (isStoppedInStopArea && car.handbrake) {
        if (!this.rampStopped) {
          this.rampStoppedTimer += dt;
          if (this.rampStoppedTimer >= 2.0) { // must hold for 2 seconds
            this.rampStopped = true;
          }
        }
      }

      // Check rollback penalty
      if (car.rollbackDistance > 0.3) { // 30 cm
        this.onPenaltyCallback(
          10,
          `Rollback on hill start: ${(car.rollbackDistance * 100).toFixed(0)}cm`,
          `უკან დაგორება: ${(car.rollbackDistance * 100).toFixed(0)}სმ`
        );
        car.rollbackDistance = 0; // reset to avoid spam
      }
    }

    // Successful exit from slope
    if (this.rampStopped && car.z > 21.5) {
      car.onSlope = false;
      this.completeTask();
    }
  }

  // --- Task 2: Slalom
  // Must weave left/right of 5 cones along X=15 line (Z = -20, -10, 0, 10, 20)
  // Player enters zone (Z in [-25, 25], X in [10, 20])
  private processSlalomTask(dt: number, car: CarPhysics) {
    const slalomEnded = car.z > 22 && car.x >= 10 && car.x <= 20;
    if (slalomEnded) {
      // Check if player hit less than 3 cones
      const hitCones = this.cones.filter(c => c.id.startsWith('slalom_cone_') && c.hit).length;
      if (hitCones > 2) {
        this.onPenaltyCallback(10, 'Poor slalom precision', 'სერპენტინის არაზუსტი გავლა');
      }
      this.completeTask();
    }
  }

  // --- Task 3: Parallel Parking
  // Bay center: X = -27.5, Z = 18.5. Target boundaries: X in [-29, -26], Z in [15.5, 21.5]
  private processParallelParkingTask(dt: number, car: CarPhysics) {
    const isInsideBay = car.x >= -29.5 && car.x <= -25.5 && car.z >= 15.5 && car.z <= 21.5;
    
    if (isInsideBay && Math.abs(car.speed) < 0.05 && car.handbrake) {
      this.parkingStoppedTimer += dt;
      if (this.parkingStoppedTimer >= 2.0) { // hold for 2s
        this.isParkedSuccessfully = true;
      }
    }

    // Must drive OUT of the parking zone to complete
    if (this.isParkedSuccessfully && car.z < 13) {
      this.completeTask();
      this.isParkedSuccessfully = false;
      this.parkingStoppedTimer = 0;
    }
  }

  // --- Task 4: Perpendicular Parking (Garage)
  // Garage center: X = -25.0, Z = -15.0. Target: X in [-27.5, -22.5], Z in [-16.5, -13.5]
  private processPerpendicularParkingTask(dt: number, car: CarPhysics) {
    const isInsideGarage = car.x >= -27.5 && car.x <= -22.5 && car.z >= -16.5 && car.z <= -13.5;

    if (isInsideGarage && Math.abs(car.speed) < 0.05 && car.handbrake) {
      this.parkingStoppedTimer += dt;
      if (this.parkingStoppedTimer >= 2.0) {
        this.isParkedSuccessfully = true;
      }
    }

    // Exit garage into the main lane (X > -18)
    if (this.isParkedSuccessfully && car.x > -18) {
      this.completeTask();
      this.isParkedSuccessfully = false;
      this.parkingStoppedTimer = 0;
    }
  }

  // --- Task 5: Three-point Turn (Y-Turn)
  // Zone: X in [22, 28], Z in [-25, -15].
  private processYTurnTask(dt: number, car: CarPhysics) {
    const isInsideYTurnZone = car.x >= 21.5 && car.x <= 28.5 && car.z >= -25.5 && car.z <= -14.5;
    if (!isInsideYTurnZone) {
      // If we turned 180 degrees (angle is opposite) and exited back down, we complete it.
      // Start direction was Z negative (facing south, angle ~ PI or -PI) or Z positive.
      // Check if car angle is opposite and car is now outside Z < -26
      if (car.z < -26 && Math.abs(car.angle) < 1.0) { // facing north now (0 radians)
        this.completeTask();
      }
      return;
    }

    // Count shifts between forward and reverse movement
    const currentSpeed = car.speed;
    const currentDir = currentSpeed > 0.1 ? 'forward' : currentSpeed < -0.1 ? 'reverse' : null;

    if (currentDir && currentDir !== this.yTurnLastDirection) {
      if (this.yTurnLastDirection !== null) {
        this.yTurnMovements++;
        if (this.yTurnMovements > 3) {
          this.onPenaltyCallback(5, 'Exceeded 3 turns in Y-turn', 'ვიწრო გზაზე შემობრუნების ლიმიტის გადაჭარბება');
        }
      }
      this.yTurnLastDirection = currentDir;
    }
  }

  // --- Task 6: Stop Line Finish
  // Line is at X around 0, Z = -35. Target: Z in [-36, -34], X in [-4, 4]
  private processStopLineTask(dt: number, car: CarPhysics) {
    const isAtStopLine = car.x >= -4 && car.x <= 4 && car.z >= -36 && car.z <= -33.5;
    
    if (isAtStopLine && Math.abs(car.speed) < 0.05 && car.handbrake) {
      this.completeTask();
    }
  }

  private completeTask() {
    this.tasks[this.currentTaskIndex].status = 'completed';
    this.onTaskCompletedCallback(this.currentTaskIndex);

    this.currentTaskIndex++;
    if (this.currentTaskIndex < this.tasks.length) {
      this.tasks[this.currentTaskIndex].status = 'active';
    }
  }
}
