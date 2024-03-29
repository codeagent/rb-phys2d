import { vec2 } from 'gl-matrix';

import {
  MaxAngleConstraint,
  MinAngleConstraint,
  RevoluteXConstraint,
  RevoluteYConstraint,
  SpiralSpringConstraint,
} from '../constraint';
import {
  BodyInterface,
  WorldInterface,
  JointInterface,
  ConstraintInterface,
} from '../types';

export interface RevoluteJointDef {
  bodyA: Readonly<BodyInterface>;
  pivotA?: Readonly<vec2>;
  bodyB: Readonly<BodyInterface>;
  pivotB?: Readonly<vec2>;
  minAngle?: number;
  maxAngle?: number;
  stiffness?: number;
  damping?: number;
  contacts?: boolean;
}

export class RevoluteJoint implements JointInterface {
  private readonly constraints: ConstraintInterface[] = [];

  constructor(
    readonly world: WorldInterface,
    readonly bodyA: Readonly<BodyInterface>,
    readonly pivotA: Readonly<vec2>,
    readonly bodyB: Readonly<BodyInterface>,
    readonly pivotB: Readonly<vec2>,
    readonly minAngle: number,
    readonly maxAngle: number,
    readonly stiffness: number,
    readonly damping: number
  ) {
    this.constraints.push(
      new RevoluteXConstraint(
        world,
        bodyA,
        vec2.clone(pivotA),
        bodyB,
        vec2.clone(pivotB)
      )
    );

    this.constraints.push(
      new RevoluteYConstraint(
        world,
        bodyA,
        vec2.clone(pivotA),
        bodyB,
        vec2.clone(pivotB)
      )
    );

    if (isFinite(this.minAngle)) {
      this.constraints.push(
        new MinAngleConstraint(world, bodyA, bodyB, this.minAngle)
      );
    }

    if (isFinite(this.maxAngle)) {
      this.constraints.push(
        new MaxAngleConstraint(world, bodyA, bodyB, this.maxAngle)
      );
    }

    if (this.stiffness) {
      this.constraints.push(
        new SpiralSpringConstraint(
          world,
          bodyA,
          bodyB,
          bodyB.angle - bodyA.angle,
          this.stiffness,
          this.damping
        )
      );
    }
  }

  *[Symbol.iterator](): Iterator<ConstraintInterface> {
    yield* this.constraints;
  }
}
