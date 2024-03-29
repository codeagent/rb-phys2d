import { mat3, vec2 } from 'gl-matrix';

import { getUnique, getConvexHull } from '../../utils';
import { AABB } from '../aabb';
import {
  Mesh,
  MeshOBBNode,
  generateOBBTree,
  getLeafs,
  getMeshCentroid,
  getMeshItertia,
} from '../mesh';
import { MassDistribution, Shape } from '../types';

import { Polygon } from './polygon';

export class MeshShape implements Shape, MassDistribution {
  readonly radius: number = 0;

  readonly obbTree: MeshOBBNode;

  readonly triangles: Polygon[] = [];

  private readonly hull: vec2[] = [];

  constructor(
    readonly mesh: Readonly<Mesh>,
    readonly transformOrigin: boolean = true
  ) {
    if (transformOrigin) {
      this.mesh = this.transformOriginToCentroid(this.mesh);
    }

    this.obbTree = generateOBBTree(this.mesh);
    getLeafs(this.triangles, this.obbTree);

    this.getConvexHull();
    this.radius = this.getRadius();
  }

  testPoint(point: vec2): boolean {
    return this.triangles.some(shape => shape.testPoint(point));
  }

  support(out: vec2, dir: vec2): vec2 {
    const index = this.indexOfFarhestPoint(dir);
    return vec2.copy(out, this.hull[index]);
  }

  aabb(out: AABB, transform: mat3): AABB {
    const v = vec2.create();

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const p of this.hull) {
      vec2.transformMat3(v, p, transform);

      if (v[0] < minX) {
        minX = v[0];
      }
      if (v[1] < minY) {
        minY = v[1];
      }
      if (v[0] > maxX) {
        maxX = v[0];
      }
      if (v[1] > maxY) {
        maxY = v[1];
      }
    }

    vec2.set(out.min, minX, minY);
    vec2.set(out.max, maxX, maxY);

    return out;
  }

  inetria(mass: number): number {
    return getMeshItertia(this.mesh, mass);
  }

  private getConvexHull(): void {
    const points = new Set<vec2>();
    for (const triangle of this.mesh) {
      points.add(triangle.p0);
      points.add(triangle.p1);
      points.add(triangle.p2);
    }

    const unique = new Set<vec2>();
    getUnique(unique, points);

    getConvexHull(this.hull, unique);
  }

  private transformOriginToCentroid(mesh: Readonly<Mesh>): Mesh {
    const shift = getMeshCentroid(mesh);
    return mesh.map(triangle => ({
      p0: vec2.subtract(vec2.create(), triangle.p0, shift),
      p1: vec2.subtract(vec2.create(), triangle.p1, shift),
      p2: vec2.subtract(vec2.create(), triangle.p2, shift),
    }));
  }

  private indexOfFarhestPoint(dir: vec2): number {
    // @todo: hill climbing
    let bestDot = Number.NEGATIVE_INFINITY;
    let index = -1;
    for (let i = 0; i < this.hull.length; i++) {
      const dot = vec2.dot(this.hull[i], dir);
      if (dot > bestDot) {
        bestDot = dot;
        index = i;
      }
    }

    return index;
  }

  private getRadius(): number {
    return this.hull
      .map(p => vec2.length(p))
      .reduce((max, length) => (length > max ? length : max), 0);
  }
}
