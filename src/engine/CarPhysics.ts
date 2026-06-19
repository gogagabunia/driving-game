export type GearState = 'D' | 'N' | 'R';

export class CarPhysics {
  // Coordinates (3D space X, Z are horizontal plane, Y is height)
  public x: number = 0;
  public y: number = 0;
  public z: number = 0;
  
  // Heading angle (radians, 0 is along +Z axis, positive is clockwise)
  public angle: number = 0;
  
  // Speed (meters per second)
  public speed: number = 0;
  
  // Current steering angle of front wheels (radians)
  public steerAngle: number = 0;

  // Wheel rotation for visual animation (radians)
  public wheelRotation: number = 0;

  // Live traction monitoring properties
  public currentSlipRatio: number = 0;
  public currentDriveForce: number = 0;

  // Private world-space velocity components (for lateral inertia)
  private vx: number = 0;
  private vz: number = 0;

  // State configurations
  public gear: GearState = 'D';
  public handbrake: boolean = true;
  public engineRunning: boolean = true;

  // Limits & Constants
  private maxSteerAngle = 0.52; // ~30 degrees (Skoda Rapid real max)
  private steerSpeed = 2.5; // slower, more natural steering input speed
  private maxForwardSpeed = 12.0; // ~43 km/h max on closed course
  private maxReverseSpeed = -4.0; // ~14 km/h max reversing
  private acceleration = 4.5; // m/s^2
  private brakingDecel = 8.0; // m/s^2 when braking
  private handbrakeDecel = 12.0; // m/s^2 when handbrake locked
  private rollingFriction = 0.5; // slow down naturally
  private dragFriction = 0.05; // speed-dependent drag
  
  // Car dimensions
  public length = 4.2;
  public width = 1.8;

  // Incline simulation for Ramp (Task 1)
  public onSlope: boolean = false;
  public slopeAngle: number = 0.15; // radians (about 8.5 degrees)
  public pitchAngle: number = 0;
  public rollAngle: number = 0;
  public rollbackDistance: number = 0;
  private isMeasuringRollback: boolean = false;
  private initialSlopeZ: number = 0;

  // Suspension & spring-damper simulation states
  private yVelocity: number = 0;
  private pitchVelocity: number = 0;
  private rollVelocity: number = 0;
  
  // Spring constants
  private yStiffness = 180.0;
  private yDamping = 18.0;
  private pitchStiffness = 150.0;
  private pitchDamping = 16.0;
  private rollStiffness = 150.0;
  private rollDamping = 16.0;

  // Dynamic suspension scaling factors
  private squatDiveFactor = 0.001;
  private bodyRollFactor = 0.018; // enabled for visible cornering body roll

  // Track previous speed for acceleration-induced pitch
  private lastSpeed: number = 0;

  // FWD Drivetrain parameters
  private fwdGripLimit = 0.85;
  private fwdUndersteer = 0.70;
  private fwdWeightTransfer = 0.10;
  private fwdSlipLoss = 0.40;

  constructor(startX: number, startY: number, startZ: number, startAngle: number) {
    this.x = startX;
    this.y = startY;
    this.z = startZ;
    this.angle = startAngle;
    this.vx = 0;
    this.vz = 0;
    
    // Load suspension settings from local storage and listen to changes
    this.loadSuspensionSettings();
    if (typeof window !== 'undefined') {
      window.addEventListener('suspensionSettingsChanged', this.onSettingsChange);
    }
  }

  private onSettingsChange = () => {
    this.loadSuspensionSettings();
  };

  public destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('suspensionSettingsChanged', this.onSettingsChange);
    }
  }

  public loadSuspensionSettings() {
    try {
      const stored = localStorage.getItem('suspensionSettings');
      if (stored) {
        const config = JSON.parse(stored);
        if (typeof config.yStiffness === 'number') this.yStiffness = config.yStiffness;
        if (typeof config.yDamping === 'number') this.yDamping = config.yDamping;
        if (typeof config.pitchStiffness === 'number') this.pitchStiffness = config.pitchStiffness;
        if (typeof config.pitchDamping === 'number') this.pitchDamping = config.pitchDamping;
        if (typeof config.rollStiffness === 'number') this.rollStiffness = config.rollStiffness;
        if (typeof config.rollDamping === 'number') this.rollDamping = config.rollDamping;
        if (typeof config.squatDiveFactor === 'number') this.squatDiveFactor = config.squatDiveFactor;
        if (typeof config.bodyRollFactor === 'number') this.bodyRollFactor = config.bodyRollFactor;
        if (typeof config.fwdGripLimit === 'number') this.fwdGripLimit = config.fwdGripLimit;
        if (typeof config.fwdUndersteer === 'number') this.fwdUndersteer = config.fwdUndersteer;
        if (typeof config.fwdWeightTransfer === 'number') this.fwdWeightTransfer = config.fwdWeightTransfer;
        if (typeof config.fwdSlipLoss === 'number') this.fwdSlipLoss = config.fwdSlipLoss;
      }
    } catch (e) {
      console.warn('Failed to load suspension settings:', e);
    }
  }

  public reset(startX: number, startY: number, startZ: number, startAngle: number) {
    this.x = startX;
    this.y = startY;
    this.z = startZ;
    this.angle = startAngle;
    this.speed = 0;
    this.steerAngle = 0;
    this.wheelRotation = 0;
    this.gear = 'D';
    this.handbrake = true;
    this.engineRunning = true;
    this.onSlope = false;
    this.pitchAngle = 0;
    this.rollAngle = 0;
    this.rollbackDistance = 0;
    this.isMeasuringRollback = false;
    this.yVelocity = 0;
    this.pitchVelocity = 0;
    this.rollVelocity = 0;
    this.lastSpeed = 0;
    this.currentSlipRatio = 0;
    this.currentDriveForce = 0;
    this.vx = 0;
    this.vz = 0;
  }

  public update(dt: number, inputs: {
    accelerate: boolean;
    reverse: boolean;
    steerLeft: boolean;
    steerRight: boolean;
    handbrake: boolean;
  }) {
    if (dt <= 0) return;
    if (dt > 0.1) dt = 0.1; // Cap dt to prevent huge physics jumps on frame drops

    // 1. Handbrake state
    this.handbrake = inputs.handbrake;

    // 2. Adjust steering angle
    // Speed-sensitive steering (Problem 2)
    const speedFactor = Math.max(0.3, 1.0 - (Math.abs(this.speed) / this.maxForwardSpeed) * 0.6);
    const speedAdjustedMaxSteer = this.maxSteerAngle * speedFactor;

    let targetSteer = 0;
    if (inputs.steerLeft) targetSteer -= speedAdjustedMaxSteer;
    if (inputs.steerRight) targetSteer += speedAdjustedMaxSteer;

    const steerDiff = targetSteer - this.steerAngle;
    if (Math.abs(steerDiff) > 0.01) {
      this.steerAngle += Math.sign(steerDiff) * this.steerSpeed * dt;
      this.steerAngle = Math.max(-speedAdjustedMaxSteer, Math.min(speedAdjustedMaxSteer, this.steerAngle));
    } else {
      this.steerAngle = targetSteer;
    }

    // 3. Driving physics (Acceleration and Forces with FWD Drivetrain physics)
    let driveForce = 0;

    if (this.engineRunning && !this.handbrake) {
      if (this.gear === 'D' && inputs.accelerate) {
        driveForce += this.acceleration;
      } else if (this.gear === 'R' && inputs.accelerate) {
        driveForce -= this.acceleration;
      }
    }

    // Engine Torque Curve (Problem 4)
    const speedRatio = Math.abs(this.speed) / this.maxForwardSpeed;
    const torqueCurve = speedRatio < 0.4 
      ? 1.0 + speedRatio * 0.5           // builds up to 1.2x at 40% speed
      : 1.2 - (speedRatio - 0.4) * 1.5; // drops off at high speed
    const torqueMultiplier = Math.max(0.2, torqueCurve);
    driveForce *= torqueMultiplier;

    // Dynamic weight transfer based on previous frame's acceleration
    const prevAccel = dt > 0 ? (this.speed - this.lastSpeed) / dt : 0;
    
    // Normal bias: static 60% front-weight bias for FWD. Under forward acceleration,
    // normal load shifts off the front tires to the rear.
    const normalLoadFront = Math.max(0.1, 0.6 - this.fwdWeightTransfer * (this.speed > 0 ? prevAccel / this.acceleration : 0));
    const gripLimit = normalLoadFront * this.fwdGripLimit * 9.81;

    let slipRatio = 0;
    if (Math.abs(driveForce) > gripLimit) {
      slipRatio = (Math.abs(driveForce) - gripLimit) / Math.abs(driveForce);
    }

    this.currentSlipRatio = slipRatio;
    this.currentDriveForce = driveForce;

    const actualDriveForce = driveForce * (1.0 - slipRatio * this.fwdSlipLoss);

    // 4. Friction, Braking, and Handbrake
    let decel = this.rollingFriction + Math.abs(this.speed) * this.dragFriction;

    const isBraking = inputs.reverse;
    
    if (this.handbrake) {
      decel += this.handbrakeDecel;
    } else if (isBraking) {
      decel += this.brakingDecel;
    }

    // 5. Kinematics (Move the vehicle - Problem 1 & 5)
    // Forward vector
    const forwardX = Math.sin(this.angle);
    const forwardZ = Math.cos(this.angle);

    // Current velocity projected onto local forward and lateral axes
    const forwardSpeed = this.vx * forwardX + this.vz * forwardZ;
    const lateralSpeed = -this.vx * forwardZ + this.vz * forwardX;

    // Lateral grip — tires resist sideways sliding
    // Handbrake oversteer (Problem 5)
    const handbrakeGripMultiplier = this.handbrake && Math.abs(this.speed) > 1.0 ? 0.3 : 1.0;
    const lateralGrip = 8.0 * handbrakeGripMultiplier;
    const newLateralSpeed = lateralSpeed * Math.max(0, 1 - lateralGrip * dt);

    // Yaw rate from bicycle model
    const effectiveSteer = this.steerAngle * (1.0 - this.currentSlipRatio * this.fwdUndersteer);
    const yawRate = (forwardSpeed * Math.tan(effectiveSteer)) / this.length;
    this.angle += yawRate * dt;
    this.angle = Math.atan2(Math.sin(this.angle), Math.cos(this.angle));

    // Rebuild velocity from new forward direction + remaining lateral
    const newForwardX = Math.sin(this.angle);
    const newForwardZ = Math.cos(this.angle);
    
    this.vx = newForwardX * forwardSpeed - newForwardZ * newLateralSpeed;
    this.vz = newForwardZ * forwardSpeed + newForwardX * newLateralSpeed;

    // Apply drive force along forward axis
    this.vx += newForwardX * actualDriveForce * dt;
    this.vz += newForwardZ * actualDriveForce * dt;

    // Apply slope gravity force along forward axis
    let gravitySlopeForce = 0;
    if (this.onSlope && this.z >= -15 && this.z <= 0) {
      const gravity = 9.81;
      const slopeForceZ = -Math.sin(this.slopeAngle) * gravity;
      gravitySlopeForce = slopeForceZ * Math.cos(this.angle);
    }
    this.vx += newForwardX * gravitySlopeForce * dt;
    this.vz += newForwardZ * gravitySlopeForce * dt;

    // Apply deceleration opposing velocity direction
    const currentTotalSpeed = Math.sqrt(this.vx * this.vx + this.vz * this.vz);
    if (currentTotalSpeed > 0.001) {
      const frictionForce = decel * dt;
      const newSpeed = Math.max(0, currentTotalSpeed - frictionForce);
      this.vx *= newSpeed / currentTotalSpeed;
      this.vz *= newSpeed / currentTotalSpeed;
    } else {
      this.vx = 0;
      this.vz = 0;
    }

    // Update position
    this.x += this.vx * dt;
    this.z += this.vz * dt;

    // Update public speed (scalar, signed by forward direction)
    this.speed = forwardSpeed;

    // Cap speed
    if (this.speed > this.maxForwardSpeed) this.speed = this.maxForwardSpeed;
    if (this.speed < this.maxReverseSpeed) this.speed = this.maxReverseSpeed;

    // Adjust height and pitch using two-axle calculation and suspension springs
    // Calculate longitudinal acceleration (m/s^2) for pitch squat/dive
    const accel = dt > 0 ? (this.speed - this.lastSpeed) / dt : 0;
    this.lastSpeed = this.speed;

    // Pitch offset due to acceleration (forward accel squats rear -> pitch negative; braking dives front -> pitch positive)
    const targetPitchOffset = -accel * this.squatDiveFactor; // coeff for squat/dive
    
    // Calculate lateral acceleration (centrifugal force) for body roll
    let targetRoll = 0;
    if (Math.abs(this.speed) > 0.05) {
      const yawRate = (this.speed * Math.tan(this.steerAngle)) / this.length;
      const latAccel = this.speed * yawRate;
      targetRoll = -latAccel * this.bodyRollFactor; // coeff for body roll (turn right -> roll left)
    }

    // Clamp dynamic offsets to realistic maximums
    const maxPitchOffset = 0.1; // ~5.7 degrees
    const maxRollOffset = 0.14; // ~8 degrees
    const clampedPitchOffset = Math.max(-maxPitchOffset, Math.min(maxPitchOffset, targetPitchOffset));
    const clampedRoll = Math.max(-maxRollOffset, Math.min(maxRollOffset, targetRoll));

    // Axle offsets relative to car origin (updated for 2020 Skoda Rapid Spaceback)
    const zOffsetFront = 1.3096160888671875;
    const zOffsetRear = -1.4216156005859375;
    const wheelbase = zOffsetFront - zOffsetRear; // 2.731231689453125

    const cosAngle = Math.cos(this.angle);

    // Front and rear axle positions along the ramp direction (Z axis in world)
    const zFront = this.z + zOffsetFront * cosAngle;
    const zRear = this.z + zOffsetRear * cosAngle;

    const yFront = this.getTerrainHeight(zFront);
    const yRear = this.getTerrainHeight(zRear);

    const targetY = (yFront + yRear) / 2;
    const targetPitchStatic = -Math.atan2(yFront - yRear, wheelbase);
    const targetPitch = targetPitchStatic + clampedPitchOffset;

    // Sub-step the suspension update to ensure absolute stability at any frame rate
    const subSteps = 4;
    const subDt = dt / subSteps;
    for (let step = 0; step < subSteps; step++) {
      // 1. Height spring
      const yForce = -this.yStiffness * (this.y - targetY) - this.yDamping * this.yVelocity;
      this.yVelocity += yForce * subDt;
      this.y += this.yVelocity * subDt;

      // 2. Pitch spring
      const pitchForce = -this.pitchStiffness * (this.pitchAngle - targetPitch) - this.pitchDamping * this.pitchVelocity;
      this.pitchVelocity += pitchForce * subDt;
      this.pitchAngle += this.pitchVelocity * subDt;

      // 3. Roll spring
      const rollForce = -this.rollStiffness * (this.rollAngle - clampedRoll) - this.rollDamping * this.rollVelocity;
      this.rollVelocity += rollForce * subDt;
      this.rollAngle += this.rollVelocity * subDt;
    }

    // 6. Rollback distance tracking on Hill (Task 1)
    if (this.onSlope) {
      // If the car stops on the slope, we start measuring rollback
      if (Math.abs(this.speed) < 0.05 && this.handbrake) {
        this.isMeasuringRollback = true;
        this.initialSlopeZ = this.z;
        this.rollbackDistance = 0;
      }

      // If we roll backwards (Z decreases), compute distance
      if (this.isMeasuringRollback && this.z < this.initialSlopeZ) {
        this.rollbackDistance = this.initialSlopeZ - this.z;
      }

      // If we move forward successfully past the initial stop point, stop measuring
      if (this.z > this.initialSlopeZ + 0.5) {
        this.isMeasuringRollback = false;
      }
    } else {
      this.isMeasuringRollback = false;
    }

    // 7. Visual animations
    // Wheel rolling speed proportional to linear speed, spinning faster under FWD wheel spin
    if (this.currentSlipRatio > 0.05) {
      const spinSpeed = this.speed + (this.currentDriveForce > 0 ? 15.0 : -15.0) * this.currentSlipRatio;
      this.wheelRotation += (spinSpeed / 0.35) * dt; // 0.35m is wheel radius
    } else {
      this.wheelRotation += (this.speed / 0.35) * dt; // 0.35m is wheel radius
    }
  }

  // Helper for 2D bounding box checking (Separating Axis Theorem)
  public getBoundingBox(): { x: number; z: number }[] {
    const halfL = this.length / 2;
    const halfW = this.width / 2;

    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);

    // 4 corners of the car relative to center (x, z)
    return [
      { // Front-Right
        x: this.x + halfL * sin + halfW * cos,
        z: this.z + halfL * cos - halfW * sin
      },
      { // Front-Left
        x: this.x + halfL * sin - halfW * cos,
        z: this.z + halfL * cos + halfW * sin
      },
      { // Back-Left
        x: this.x - halfL * sin - halfW * cos,
        z: this.z - halfL * cos + halfW * sin
      },
      { // Back-Right
        x: this.x - halfL * sin + halfW * cos,
        z: this.z - halfL * cos - halfW * sin
      }
    ];
  }

  // Circle vs OBB (Oriented Bounding Box) collision detection for cones
  public collidesWithCircle(cx: number, cz: number, radius: number): boolean {
    // Transform circle center to vehicle local coordinates
    const dx = cx - this.x;
    const dz = cz - this.z;

    const cos = Math.cos(-this.angle);
    const sin = Math.sin(-this.angle);

    // Local coordinates
    const lx = dx * cos - dz * sin;
    const lz = dx * sin + dz * cos;

    // Half dimensions
    const halfL = this.length / 2;
    const halfW = this.width / 2;

    // Find closest point on OBB to local circle center
    const closestX = Math.max(-halfW, Math.min(halfW, lx));
    const closestZ = Math.max(-halfL, Math.min(halfL, lz));

    // Distance between closest point and local circle center
    const distSq = (lx - closestX) ** 2 + (lz - closestZ) ** 2;

    return distSq < radius ** 2;
  }

  // Get the static terrain height at a given Z coordinate on the ramp
  public getTerrainHeight(z: number): number {
    if (!this.onSlope) return 0;
    const slopeStart = -15;
    const slopeEnd = 0;
    const flatEnd = 7;
    const downhillEnd = 22;
    const peakHeight = 2.25;

    if (z >= slopeStart && z < slopeEnd) {
      return (z - slopeStart) * (peakHeight / (slopeEnd - slopeStart));
    } else if (z >= slopeEnd && z < flatEnd) {
      return peakHeight;
    } else if (z >= flatEnd && z <= downhillEnd) {
      const descRatio = (downhillEnd - z) / (downhillEnd - flatEnd);
      return peakHeight * descRatio;
    }
    return 0;
  }
}
