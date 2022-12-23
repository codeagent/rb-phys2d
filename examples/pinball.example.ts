import { vec2 } from 'gl-matrix';
import {
  WorldInterface,
  Settings,
  Collider,
  Circle,
  loadObj,
  MeshShape,
} from 'js-physics-2d';
import { Inject, Service } from 'typedi';
import { ExampleInterface } from './example.interface';
import PINTBALL from './objects/pintball.obj';

@Service()
export class PinballExample implements ExampleInterface {
  constructor(
    @Inject('SETTINGS') private readonly settings: Settings,
    @Inject('WORLD') private readonly world: WorldInterface
  ) {}

  install(): void {
    this.settings.defaultRestitution = 0.75;
    this.settings.defaultPushFactor = 0.65;
    this.settings.defaultFriction = 0.75;

    this.createPinball();
  }

  uninstall(): void {
    this.world.dispose();
  }

  private createPinball() {
    this.world.addCollider({
      body: this.world.createBody({
        mass: 10,
        inertia: 1,
        position: vec2.fromValues(0.0, 6.5),
        angle: Math.PI * 0.25,
      }),
      shape: new Circle(0.25),
    });

    const collection = loadObj(PINTBALL);

    for (const object in collection) {
      this.world.addCollider({
        body: this.world.createBody({
          mass: Number.POSITIVE_INFINITY,
          inertia: Number.POSITIVE_INFINITY,
          position: vec2.fromValues(0, 0),
          angle: 0,
        }),
        shape: new MeshShape(collection[object]),
      });
    }
  }
}
