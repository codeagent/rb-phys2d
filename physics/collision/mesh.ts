import { mat2, mat3, vec2, vec3 } from 'gl-matrix';
import { AABB, Polygon as PolygonShape } from './shape';
import { affineInverse } from './utils';

export interface MeshTriangle {
  p0: vec2;
  p1: vec2;
  p2: vec2;
}

export type Mesh = MeshTriangle[];

export interface OBB {
  transform: mat3;
  invTransform: mat3;
  extent: vec2;
}

const getPoints = (mesh: Mesh): vec2[] =>
  Array.from(
    mesh.reduce((acc, tri) => {
      acc.add(tri.p0);
      acc.add(tri.p1);
      acc.add(tri.p2);
      return acc;
    }, new Set<vec2>())
  );

const getMedian = (mesh: Mesh) => {
  const points = getPoints(mesh);
  const median = vec2.create();
  for (let point of points) {
    vec2.add(median, median, point);
  }
  return vec2.scale(median, median, 1.0 / points.length);
};

const getCovarianceMatrix = (mesh: Mesh) => {
  const points = getPoints(mesh);
  const median = getMedian(mesh);
  let c00 = 0.0;
  let c01 = 0.0;
  let c11 = 0.0;

  for (let point of points) {
    c00 = c00 + (point[0] - median[0]) * (point[0] - median[0]);
    c01 = c01 + (point[0] - median[0]) * (point[1] - median[1]);
    c11 = c11 + (point[1] - median[1]) * (point[1] - median[1]);
  }
  const m = 1.0 / points.length;
  return mat2.fromValues(c00 * m, c01 * m, c01 * m, c11 * m);
};

const getEigenVectors = (m: mat2): vec2[] => {
  const c00 = m[0];
  const c10 = m[1];
  const c01 = m[2];
  const c11 = m[3];

  const D = (c00 + c11) * (c00 + c11) - 4.0 * (c00 * c11 - c01 * c10);
  if (D < 0) {
    throw Error('getEigenVectors: something went wrong');
  }

  const lambda0 = 0.5 * (c00 + c11 - Math.sqrt(D));
  const lambda1 = 0.5 * (c00 + c11 + Math.sqrt(D));

  const x0 = vec2.create();
  if (c00 !== lambda0) {
    vec2.set(x0, -c01 / (c00 - lambda0), 1);
  } else {
    vec2.set(x0, -c11 / (c10 - lambda0), 1);
  }

  const x1 = vec2.create();
  if (c00 !== lambda1) {
    vec2.set(x1, -c01 / (c00 - lambda1), 1);
  } else {
    vec2.set(x1, -c11 / (c10 - lambda1), 1);
  }

  return [x0, x1];
};

export const calculateOBB = (mesh: Mesh): OBB => {
  const points = getPoints(mesh);
  const covariance = getCovarianceMatrix(mesh);
  const [e0, e1] = getEigenVectors(covariance);

  vec2.normalize(e0, e0);
  vec2.normalize(e1, e1);

  const z = vec3.create();
  if (vec2.cross(z, e0, e1)[2] < 0) {
    vec2.negate(e0, e0);
  }

  let minDot0 = Number.POSITIVE_INFINITY;
  let maxDot0 = Number.NEGATIVE_INFINITY;
  let minDot1 = Number.POSITIVE_INFINITY;
  let maxDot1 = Number.NEGATIVE_INFINITY;

  for (let point of points) {
    let dot = vec2.dot(point, e0);
    if (dot < minDot0) {
      minDot0 = dot;
    }
    if (dot > maxDot0) {
      maxDot0 = dot;
    }

    dot = vec2.dot(point, e1);
    if (dot < minDot1) {
      minDot1 = dot;
    }
    if (dot > maxDot1) {
      maxDot1 = dot;
    }
  }

  const extent0 = 0.5 * Math.abs(maxDot0 - minDot0);
  const extent1 = 0.5 * Math.abs(maxDot1 - minDot1);

  const a = 0.5 * (minDot0 + maxDot0);
  const b = 0.5 * (minDot1 + maxDot1);

  const center = vec2.create();
  vec2.scaleAndAdd(center, center, e0, a);
  vec2.scaleAndAdd(center, center, e1, b);

  const transform = mat3.fromValues(
    e0[0],
    e0[1],
    0,

    e1[0],
    e1[1],
    0,

    center[0],
    center[1],
    1
  );

  const invTransform = mat3.create();
  affineInverse(invTransform, transform);

  return {
    transform,
    invTransform,
    extent: vec2.fromValues(extent0, extent1),
  };
};

export interface OBBNode {
  obb: OBB;
  triangle?: MeshTriangle;
  triangleShape?: PolygonShape;
  children: OBBNode[];
}

export const centroid = (triangle: MeshTriangle) =>
  vec2.fromValues(
    (triangle.p0[0] + triangle.p1[0] + triangle.p2[0]) / 3.0,
    (triangle.p0[1] + triangle.p1[1] + triangle.p2[1]) / 3.0
  );

export const generateOBBTree = (mesh: Mesh): OBBNode => {
  let root: OBBNode = {
    obb: calculateOBB(mesh),
    children: [],
  };

  const queue: { node: OBBNode; soup: Mesh }[] = [
    {
      node: root,
      soup: mesh,
    },
  ];

  while (queue.length) {
    const { soup, node: parent } = queue.shift();

    if (soup.length > 1) {
      const origin = vec2.fromValues(
        parent.obb.transform[6],
        parent.obb.transform[7]
      );
      const normal0 = vec2.create();
      const normal1 = vec2.create();
      if (parent.obb.extent[0] > parent.obb.extent[1]) {
        vec2.set(normal0, parent.obb.transform[0], parent.obb.transform[1]);
        vec2.set(normal1, parent.obb.transform[3], parent.obb.transform[4]);
      } else {
        vec2.set(normal0, parent.obb.transform[3], parent.obb.transform[4]);
        vec2.set(normal1, parent.obb.transform[0], parent.obb.transform[1]);
      }

      for (let normal of [normal0, normal1]) {
        const positive: Mesh = [];
        const negative: Mesh = [];

        const dot = vec2.dot(origin, normal);
        for (const triangle of soup) {
          if (vec2.dot(normal, centroid(triangle)) > dot) {
            positive.push(triangle);
          } else {
            negative.push(triangle);
          }
        }

        if (positive.length > 0 && negative.length > 0) {
          const left = {
            obb: calculateOBB(negative),
            children: [],
          };
          parent.children.push(left);
          queue.push({
            node: left,
            soup: negative,
          });

          const right = {
            obb: calculateOBB(positive),
            children: [],
          };
          parent.children.push(right);
          queue.push({
            node: right,
            soup: positive,
          });

          break;
        }
      }
    } else {
      parent.triangle = soup[0];
      parent.triangleShape = new PolygonShape([
        soup[0].p0,
        soup[0].p1,
        soup[0].p2,
      ]);
    }
  }

  return root;
};

export const testAABBOBB = (
  aabb: AABB,
  obb: OBB,
  transform: mat3, // obb -> abb
  invTransform: mat3 // abb -> obb
) => {
  let points = [
    vec2.fromValues(-obb.extent[0], -obb.extent[1]),
    vec2.fromValues(obb.extent[0], -obb.extent[1]),
    vec2.fromValues(obb.extent[0], obb.extent[1]),
    vec2.fromValues(-obb.extent[0], obb.extent[1]),
  ].map((p) => vec2.transformMat3(p, p, transform));

  if (
    points.every((p) => p[0] < aabb[0][0]) ||
    points.every((p) => p[0] > aabb[1][0]) ||
    points.every((p) => p[1] < aabb[0][1]) ||
    points.every((p) => p[1] > aabb[1][1])
  ) {
    return false;
  }

  points = [
    vec2.fromValues(aabb[0][0], aabb[0][1]),
    vec2.fromValues(aabb[1][0], aabb[0][1]),
    vec2.fromValues(aabb[1][0], aabb[1][1]),
    vec2.fromValues(aabb[0][0], aabb[1][1]),
  ].map((p) => vec2.transformMat3(p, p, invTransform));

  if (
    points.every((p) => p[0] < -obb.extent[0]) ||
    points.every((p) => p[0] > obb.extent[0]) ||
    points.every((p) => p[1] < -obb.extent[1]) ||
    points.every((p) => p[1] > obb.extent[1])
  ) {
    return false;
  }

  return true;
};

export const testAABBOBBTree = (
  leafs: Set<OBBNode>,
  aabb: AABB,
  tree: OBBNode,
  transform: mat3
): boolean => {
  const queue: OBBNode[] = [tree];
  const mapping = mat3.create();
  const invMapping = mat3.create();

  leafs.clear();

  while (queue.length) {
    const node = queue.shift();
    mat3.multiply(mapping, transform, node.obb.transform);
    affineInverse(invMapping, mapping);

    if (testAABBOBB(aabb, node.obb, mapping, invMapping)) {
      if (node.triangle) {
        leafs.add(node);
      } else {
        for (const child of node.children) {
          queue.push(child);
        }
      }
    }
  }

  return leafs.size !== 0;
};

export class MeshShape {
  readonly obbTree: OBBNode;

  constructor(public readonly mesh: Mesh) {
    this.obbTree = generateOBBTree(mesh);
  }
}
