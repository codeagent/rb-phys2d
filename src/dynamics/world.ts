import { vec2 } from 'gl-matrix';
import { Inject, Service } from 'typedi';

import {
  CollisionDetector,
  Collider,
  ColliderDef,
  ColliderInterface,
  PairsRegistryInterface,
} from '../cd';
import { Events } from '../events';
import { Settings } from '../settings';
import { Clock, EventDispatcher, IdManager, pairId } from '../utils';

import { Body } from './body';
import {
  DistanceJoint,
  MouseJoint,
  PrismaticJoint,
  RevoluteJoint,
  SpringJoint,
  WeldJoint,
  WheelJoint,
  MotorJoint,
  DistanceJointDef,
  PrismaticJointDef,
  RevoluteJointDef,
  WeldJointDef,
  WheelJointDef,
  SpringDef,
  MouseJointDef,
  MotorDef,
} from './joint';
import { Material } from './material';
import {
  IslandsGeneratorInterface,
  BodyDef,
  BodyInterface,
  WorldInterface,
  JointInterface,
} from './types';

@Service()
export class World implements WorldInterface {
  private readonly bodies = new Map<number, Body>();

  private readonly bodyForce = vec2.create();

  constructor(
    @Inject('SETTINGS') readonly settings: Readonly<Settings>,
    @Inject('ISLANDS_GENERATOR')
    private readonly islandGenerator: IslandsGeneratorInterface,
    @Inject('PAIRS_REGISTRY')
    private readonly registry: PairsRegistryInterface,
    private readonly detector: CollisionDetector,
    private readonly clock: Clock,
    private readonly idManager: IdManager,
    private readonly dispatcher: EventDispatcher
  ) {}

  createBody(bodyDef?: BodyDef): BodyInterface {
    if (this.bodies.size === this.settings.maxBodiesNumber) {
      throw new Error(
        `World.createBody: Failed to create body: maximum namber of bodies attained: ${this.settings.maxBodiesNumber}`
      );
    }

    const body = new Body(
      this.idManager.getUniqueId(),
      this,
      bodyDef?.isContinuos ?? false
    );
    body.mass = bodyDef?.mass ?? 1.0;
    body.inertia = bodyDef?.inertia ?? 1.0;
    body.position = bodyDef?.position ?? vec2.create();
    body.angle = bodyDef?.angle ?? 0.0;
    body.updateTransform();

    this.bodies.set(body.id, body);

    this.dispatch(Events.BodyCreated, body);

    return body;
  }

  destroyBody(body: BodyInterface): void {
    if (!this.bodies.has(body.id)) {
      return;
    }

    this.bodies.delete(body.id);
    this.idManager.releaseId(body.id);

    if (body.collider) {
      this.removeCollider(body.collider);
    }

    this.dispatch(Events.BodyDestroyed, body);
  }

  getBody(id: number): BodyInterface {
    return this.bodies.get(id);
  }

  addDistanceJoint(jointDef: DistanceJointDef): JointInterface {
    const joint = new DistanceJoint(
      this,
      jointDef.bodyA,
      jointDef.pivotA ?? vec2.create(),
      jointDef.bodyB,
      jointDef.pivotB ?? vec2.create(),
      jointDef.distance
    );
    jointDef.bodyA.addJoint(joint);
    jointDef.bodyB.addJoint(joint);

    this.dispatch(Events.JointAdded, joint);

    return joint;
  }

  addPrismaticJoint(jointDef: PrismaticJointDef): JointInterface {
    const joint = new PrismaticJoint(
      this,
      jointDef.bodyA,
      jointDef.pivotA ?? vec2.create(),
      jointDef.bodyB,
      jointDef.pivotB ?? vec2.create(),
      jointDef.localAxis ?? vec2.fromValues(1.0, 0.0),
      jointDef.refAngle ?? 0,
      jointDef.minDistance ?? 0,
      jointDef.maxDistance ?? Number.POSITIVE_INFINITY
    );

    jointDef.bodyA.addJoint(joint);
    jointDef.bodyB.addJoint(joint);

    this.dispatch(Events.JointAdded, joint);

    return joint;
  }

  addRevoluteJoint(jointDef: RevoluteJointDef): JointInterface {
    const joint = new RevoluteJoint(
      this,
      jointDef.bodyA,
      jointDef.pivotA ?? vec2.create(),
      jointDef.bodyB,
      jointDef.pivotB ?? vec2.create(),
      jointDef.minAngle ?? Number.NEGATIVE_INFINITY,
      jointDef.maxAngle ?? Number.POSITIVE_INFINITY,
      jointDef.stiffness ?? 0,
      jointDef.damping ?? 0
    );

    jointDef.bodyA.addJoint(joint);
    jointDef.bodyB.addJoint(joint);

    jointDef.contacts ??= true;

    if (
      !jointDef.contacts &&
      jointDef.bodyA.collider &&
      jointDef.bodyB.collider
    ) {
      const pair = this.registry.getPairById(
        pairId(jointDef.bodyA.collider.id, jointDef.bodyB.collider.id)
      );

      pair.intercontact = false;
    }

    this.dispatch(Events.JointAdded, joint);

    return joint;
  }

  addWeldJoint(jointDef: WeldJointDef): JointInterface {
    const joint = new WeldJoint(
      this,
      jointDef.bodyA,
      jointDef.pivotA ?? vec2.create(),
      jointDef.bodyB,
      jointDef.pivotB ?? vec2.create(),
      jointDef.refAngle ?? 0
    );

    jointDef.bodyA.addJoint(joint);
    jointDef.bodyB.addJoint(joint);

    if (jointDef.bodyA.collider && jointDef.bodyB.collider) {
      const pair = this.registry.getPairById(
        pairId(jointDef.bodyA.collider.id, jointDef.bodyB.collider.id)
      );

      pair.intercontact = false;
    }

    this.dispatch(Events.JointAdded, joint);

    return joint;
  }

  addWheelJonit(jointDef: WheelJointDef): JointInterface {
    const joint = new WheelJoint(
      this,
      jointDef.bodyA,
      jointDef.pivotA ?? vec2.create(),
      jointDef.bodyB,
      jointDef.pivotB ?? vec2.create(),
      jointDef.localAxis ?? vec2.fromValues(1.0, 0.0),
      jointDef.minDistance ?? 0,
      jointDef.maxDistance ?? Number.POSITIVE_INFINITY
    );

    jointDef.bodyA.addJoint(joint);
    jointDef.bodyB.addJoint(joint);

    this.dispatch(Events.JointAdded, joint);

    return joint;
  }

  addSpring(springDef: SpringDef): JointInterface {
    const joint = new SpringJoint(
      this,
      springDef.bodyA,
      springDef.pivotA ?? vec2.create(),
      springDef.bodyB,
      springDef.pivotB ?? vec2.create(),
      springDef.distance ?? 0.5,
      springDef.stiffness ?? 1.0,
      springDef.extinction ?? 1.0
    );

    springDef.bodyA.addJoint(joint);
    springDef.bodyB.addJoint(joint);

    this.dispatch(Events.JointAdded, joint);

    return joint;
  }

  addMouseJoint(jointDef: MouseJointDef): JointInterface {
    const joint = new MouseJoint(
      this,
      jointDef.control,
      jointDef.body,
      jointDef.joint,
      jointDef.stiffness ?? 1.0,
      jointDef.maxForce ?? 1.0e4
    );

    jointDef.body.addJoint(joint);

    this.dispatch(Events.JointAdded, joint);

    return joint;
  }

  addMotor(motorDef: MotorDef): JointInterface {
    const joint = new MotorJoint(
      this,
      motorDef.body,
      motorDef.speed,
      motorDef.torque
    );
    motorDef.body.addJoint(joint);

    this.dispatch(Events.JointAdded, joint);

    return joint;
  }

  addCollider(colliderDef: ColliderDef): ColliderInterface {
    const materialDef = {
      ...this.settings.defaultMaterial,
      ...(colliderDef.material ?? {}),
    };

    const material = new Material(
      materialDef.friction,
      materialDef.restitution,
      materialDef.damping,
      materialDef.angularDamping
    );

    const collider = new Collider(
      colliderDef.body,
      colliderDef.shape,
      colliderDef.mask ?? 0xffffffff,
      colliderDef.isVirtual ?? false,
      material
    );
    Object.assign(collider.body, { collider });

    this.detector.registerCollider(collider);

    for (const body of this.bodies.values()) {
      if (
        !(collider.body.isStatic && body.isStatic) &&
        body.collider &&
        body.collider !== collider
      ) {
        this.registry.registerPair(body.collider, collider);
      }
    }

    this.dispatch(Events.ColliderAdded, collider, collider.body);

    return collider;
  }

  removeCollider(collider: ColliderInterface): void {
    this.detector.unregisterCollider(collider as Collider);
    Object.assign(collider.body, { collider: null });

    for (const body of this.bodies.values()) {
      const id = pairId(body.collider.id, collider.id);
      this.registry.unregisterPair(id);
    }

    this.dispatch(Events.ColliderRemoved, collider, collider.body);
  }

  removeJoint(joint: JointInterface): void {
    if (joint.bodyA) {
      joint.bodyA.removeJoint(joint);
    }

    if (joint.bodyB) {
      joint.bodyB.removeJoint(joint);
    }

    this.dispatch(Events.JointRemoved, joint);
  }

  clear(): void {
    for (const body of this.bodies.values()) {
      if (body.collider) {
        this.detector.unregisterCollider(body.collider);
      }

      this.dispatch(Events.BodyDestroyed, body);
    }

    this.registry.clear();
    this.idManager.reset();
    this.bodies.clear();
  }

  on<T extends CallableFunction>(
    eventName: keyof typeof Events,
    handler: T
  ): void {
    this.dispatcher.addEventListener(eventName, handler);
  }

  off<T extends CallableFunction>(
    eventName: keyof typeof Events,
    handler: T
  ): void {
    this.dispatcher.removeEventListener(eventName, handler);
  }

  dispatch(eventName: keyof typeof Events, ...payload: unknown[]): void {
    this.dispatcher.dispatch(eventName, ...payload);
  }

  step(dt: number): void {
    this.clock.tick(dt);
    this.dispatch(Events.PreStep, this.clock.frame, this.clock.time);

    let iterations = this.settings.toiSubsteps;
    let span = dt;
    let toi = 0;
    let t = 0;

    this.applyGlobalForces();

    do {
      toi = this.detector.getTimeOfFirstImpact(span); // between [0-1]

      // Corect very small values assuming that there are no impacts
      if (toi < 1.0e-3) {
        toi = 1;
      }

      t = span * toi;
      this.detectCollisions();
      this.advance(t);
      span -= t;
    } while (iterations-- && toi < 1);

    this.clearForces();

    for (const body of this.bodies.values()) {
      body.tick(dt);
    }

    this.dispatch(Events.PostStep, this.clock.frame, this.clock.time);
  }

  *[Symbol.iterator](): Iterator<BodyInterface> {
    yield* this.bodies.values();
  }

  private applyGlobalForces(): void {
    for (const body of this) {
      vec2.copy(this.bodyForce, body.force);

      if (body.invMass) {
        vec2.scaleAndAdd(
          this.bodyForce,
          this.bodyForce,
          this.settings.gravity,
          body.mass
        );
      }

      if (body.collider) {
        vec2.scaleAndAdd(
          this.bodyForce,
          this.bodyForce,
          body.velocity,
          -body.collider.material.damping
        );
        body.force = this.bodyForce;

        body.torque -= body.collider.material.angularDamping * body.omega;
      }
    }
  }

  private clearForces(): void {
    for (const body of this.bodies.values()) {
      body.clearForces();
    }
  }

  private advance(dt: number): void {
    for (const island of this.islandGenerator.generate(this.bodies.values())) {
      if (!island.sleeping) {
        this.dispatch(Events.IslandPreStep, island);
        island.step(dt);
        this.dispatch(Events.IslandPostStep, island);
      }
    }
  }

  private detectCollisions(): void {
    this.registry.validatePairs();

    for (const contactInfo of this.detector.detectCollisions()) {
      this.registry.addContact(contactInfo);
    }

    this.registry.emitEvents();
  }
}
