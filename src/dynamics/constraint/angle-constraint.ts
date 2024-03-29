import { BodyInterface, ConstraintClamping, WorldInterface } from '../types';

import { ConstraintBase } from './constraint.base';

export class AngleConstraint extends ConstraintBase {
  constructor(
    readonly world: WorldInterface,
    readonly bodyA: BodyInterface,
    readonly bodyB: BodyInterface,
    readonly angle: number
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

  getPushFactor(dt: number, strength: number): number {
    return (
      ((this.angle - (this.bodyB.angle - this.bodyA.angle)) / dt) * strength
    );
  }

  getClamping(): ConstraintClamping {
    return {
      min: -this.world.settings.constraintMaxForce,
      max: this.world.settings.constraintMaxForce,
    };
  }
}
