import { ColliderDef, ColliderInterface } from '../../cd';
import { Events } from '../../events';
import { Settings } from '../../settings';
import {
  DistanceJointDef,
  MotorDef,
  MouseJointDef,
  PrismaticJointDef,
  RevoluteJointDef,
  SpringDef,
  WeldJointDef,
  WheelJointDef,
} from '../joint';

import { BodyDef, BodyInterface } from './body.interface';
import { JointInterface } from './joint.interface';

export interface WorldInterface extends Iterable<BodyInterface> {
  readonly settings: Readonly<Settings>;
  createBody(bodyDef?: BodyDef): BodyInterface;
  destroyBody(body: BodyInterface): void;
  addDistanceJoint(joint: DistanceJointDef): JointInterface;
  addPrismaticJoint(joint: PrismaticJointDef): JointInterface;
  addRevoluteJoint(joint: RevoluteJointDef): JointInterface;
  addWeldJoint(joint: WeldJointDef): JointInterface;
  addWheelJonit(jointDef: WheelJointDef): JointInterface;
  addSpring(springDef: SpringDef): JointInterface;
  addMouseJoint(jointDef: MouseJointDef): JointInterface;
  addMotor(jointDef: MotorDef): JointInterface;
  removeJoint(joint: JointInterface): void;
  addCollider(collider: ColliderDef): ColliderInterface;
  removeCollider(collider: ColliderInterface): void;
  clear(): void;
  on<T extends CallableFunction>(
    eventName: keyof typeof Events,
    handler: T
  ): void;
  off<T extends CallableFunction>(
    eventName: keyof typeof Events,
    handler: T
  ): void;
  step(dt: number): void;
  getBody(id: number): BodyInterface;
}
