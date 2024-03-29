import { vec2 } from 'gl-matrix';
import {
  Settings,
  Box,
  Circle,
  BodyInterface,
  WorldInterface,
} from 'rb-phys2d';
import { Inject, Service } from 'typedi';

import { ExampleInterface } from './example.interface';

@Service()
export class PendulumExample implements ExampleInterface {
  constructor(
    @Inject('SETTINGS') private readonly settings: Settings,
    @Inject('WORLD') private readonly world: WorldInterface
  ) {}

  install(): void {
    this.settings.constraintPushFactor = 1.0;

    this.createPendulums(6);
  }

  uninstall(): void {
    this.world.clear();
  }

  private createPendulums(n: number): void {
    const step = 1.0;
    const length = 8;
    const m = 1.0;

    // ceil
    const ceil = this.world.createBody({
      mass: Number.POSITIVE_INFINITY,
      inertia: Number.POSITIVE_INFINITY,
      position: vec2.fromValues(0.0, 10),
    });
    this.world.addCollider({ body: ceil, shape: new Box(20, 1) });

    let offset = 0;

    while (n--) {
      let pendulum: BodyInterface;
      if (n === 1) {
        pendulum = this.world.createBody({
          mass: m,
          inertia: m,
          position: vec2.fromValues(
            (n % 2 ? offset : -offset) + length * Math.sin(Math.PI * 0.25),
            length * Math.cos(Math.PI * 0.25)
          ),
        });
        this.world.addCollider({
          body: pendulum,
          shape: new Circle(step * 0.5),
          material: { restitution: 1.0, friction: 0 },
        });
      } else {
        pendulum = this.world.createBody({
          mass: m,
          inertia: m,
          position: vec2.fromValues(n % 2 ? offset : -offset, 0),
        });
        this.world.addCollider({
          body: pendulum,
          shape: new Circle(step * 0.5),
          material: { restitution: 1.0, friction: 0 },
        });
      }

      this.world.addDistanceJoint({
        bodyA: ceil,
        bodyB: pendulum,
        pivotA: vec2.fromValues(n % 2 ? offset : -offset, 0.0),
        pivotB: vec2.fromValues(0.0, 0.0),
        distance: length,
      });

      if (n % 2) {
        offset += step;
      }
    }
  }
}
