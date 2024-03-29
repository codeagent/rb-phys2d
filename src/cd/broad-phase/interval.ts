import { pairId, PriorityQueue } from '../../utils';
import { AABB } from '../aabb';
import { Collider } from '../collider';

export enum IntervalType {
  X = 0,
  Y = 1,
}

export enum IntervalPointType {
  Start = 0,
  End = 1,
}

export class IntervalPoint {
  constructor(readonly type: IntervalPointType, readonly interval: Interval) {}

  get value(): number {
    return this.interval.aabb[this.type][this.interval.type];
  }
}

export class Interval {
  readonly start: IntervalPoint;

  readonly end: IntervalPoint;

  constructor(
    readonly id: number,
    readonly aabb: Readonly<AABB>,
    readonly collider: Readonly<Collider>,
    readonly type: IntervalType
  ) {
    this.start = new IntervalPoint(IntervalPointType.Start, this);
    this.end = new IntervalPoint(IntervalPointType.End, this);
  }
}

export const intervalPredicate = (a: IntervalPoint, b: IntervalPoint): number =>
  a.value - b.value;

export class AABBIntervalKeeper {
  readonly intersected = new Map<number, [Interval, Interval]>();

  private readonly aabbInterval = new Map<Readonly<AABB>, Interval>();

  private readonly queue = new PriorityQueue<IntervalPoint>(intervalPredicate);

  private readonly active = new Set<Interval>();

  constructor(readonly type: IntervalType) {}

  registerAABB(collider: Readonly<Collider>): void {
    const interval = new Interval(
      this.aabbInterval.size + 1,
      collider.aabb,
      collider,
      this.type
    );
    this.aabbInterval.set(collider.aabb, interval);
    this.queue.enqueue(interval.start);
    this.queue.enqueue(interval.end);
  }

  unregisterAABB(collider: Readonly<Collider>): void {
    const interval = this.aabbInterval.get(collider.aabb);
    this.queue.remove(interval.start);
    this.queue.remove(interval.end);
    this.aabbInterval.delete(collider.aabb);
  }

  update(): void {
    this.active.clear();
    this.intersected.clear();

    // Update interval points according actual coordinates
    this.queue.resort();

    for (const point of this.queue) {
      if (point.type === IntervalPointType.Start) {
        // Add to intersection list
        for (const active of this.active) {
          this.intersected.set(pairId(active.id, point.interval.id), [
            active,
            point.interval,
          ]);
        }
        this.active.add(point.interval);
      } else {
        this.active.delete(point.interval);
      }
    }
  }
}
