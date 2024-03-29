import { vec2 } from 'gl-matrix';
import { Service } from 'typedi';

import { AABB } from '../aabb';
import { Collider } from '../collider';
import {
  BroadPhaseInterface,
  ContactCandidate,
  ContactCandidatePair,
} from '../types';

import { AABBIntervalKeeper, IntervalType } from './interval';

@Service()
export class SapBroadPhase implements BroadPhaseInterface {
  private readonly colliders = new Set<Collider>();

  private readonly capsuleAABB = new AABB();

  private readonly candidatePair: [ContactCandidate, ContactCandidate] = [
    new ContactCandidate(),
    new ContactCandidate(),
  ];

  private readonly xIntervalKeeper = new AABBIntervalKeeper(IntervalType.X);

  private readonly yIntervalKeeper = new AABBIntervalKeeper(IntervalType.Y);

  registerCollider(collider: Collider): void {
    this.colliders.add(collider);
    this.xIntervalKeeper.registerAABB(collider);
    this.yIntervalKeeper.registerAABB(collider);
  }

  unregisterCollider(collider: Collider): void {
    this.colliders.delete(collider);
    this.xIntervalKeeper.unregisterAABB(collider);
    this.yIntervalKeeper.unregisterAABB(collider);
  }

  *queryCapsule(
    p0: Readonly<vec2>,
    p1: Readonly<vec2>,
    radius: number
  ): Iterable<Collider> {
    vec2.set(
      this.capsuleAABB.min,
      Math.min(p0[0], p1[0]) - radius,
      Math.min(p0[1], p1[1]) - radius
    );
    vec2.set(
      this.capsuleAABB.max,
      Math.max(p0[0], p1[0]) + radius,
      Math.max(p0[1], p1[1]) + radius
    );

    this.updateAABBs();

    for (const collider of this.colliders) {
      if (
        AABB.testAABB(this.capsuleAABB, collider.aabb) &&
        AABB.testCapsule(collider.aabb, p0, p1, radius)
      ) {
        yield collider;
      }
    }
  }

  *detectCandidates(): Iterable<ContactCandidatePair> {
    this.updateAABBs();

    this.xIntervalKeeper.update();
    this.yIntervalKeeper.update();

    // find intersections
    for (const [id, pair] of this.xIntervalKeeper.intersected) {
      if (this.yIntervalKeeper.intersected.has(id)) {
        const leftCollider = pair[0].collider;
        const rightCollider = pair[1].collider;

        if (!(leftCollider.mask & rightCollider.mask)) {
          continue;
        }

        if (leftCollider.id < rightCollider.id) {
          this.candidatePair[0].collider = leftCollider;
          this.candidatePair[0].shape = leftCollider.shape;
          this.candidatePair[1].collider = rightCollider;
          this.candidatePair[1].shape = rightCollider.shape;
        } else {
          this.candidatePair[1].collider = leftCollider;
          this.candidatePair[1].shape = leftCollider.shape;
          this.candidatePair[0].collider = rightCollider;
          this.candidatePair[0].shape = rightCollider.shape;
        }

        yield this.candidatePair;
      }
    }
  }

  private updateAABBs(): void {
    for (const collider of this.colliders) {
      collider.updateAABB();
    }
  }
}
