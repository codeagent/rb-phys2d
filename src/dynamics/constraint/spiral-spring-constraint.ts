import { BodyInterface } from '../body.interface';
import { WorldInterface } from '../world.interface';

import { ConstraintBase } from './constraint.base';

export class SpiralSpringConstraint extends ConstraintBase {
  constructor(
    public readonly world: WorldInterface,
    public readonly bodyA: BodyInterface,
    public readonly bodyB: BodyInterface,
    public readonly angle: number,
    public readonly stiffness: number,
    public readonly extinction: number
  ) {
    super();
  }

  getJacobian(out: Float32Array): void {
    out.fill(0.0);

    if (isFinite(this.bodyA.inertia)) {
      out[0] = 0;
      out[1] = 0;
      out[2] = -1;
    }

    if (isFinite(this.bodyB.inertia)) {
      out[3] = 0;
      out[4] = 0;
      out[5] = 1;
    }
  }

  getPushFactor(): number {
    return 0.0;
  }

  getClamping() {
    // Damping force
    const fd = -this.extinction * (this.bodyB.omega - this.bodyA.omega);

    // Stiff force
    const fs =
      this.stiffness * (this.angle - (this.bodyB.angle - this.bodyA.angle));

    const c = fs + fd;

    return { min: c, max: c };
  }
}
