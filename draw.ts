import { vec2, mat3 } from 'gl-matrix';

import {
  ContactManifold,
  World,
  ConstraintInterface,
  ContactConstraint,
  DistanceConstraint,
  LineConstraint,
  Polygon,
  Circle,
  MaxDistanceConstraint,
  MinDistanceConstraint,
  SpringConstraint,
  Body,
} from './physics';
import { WorldIsland } from './physics/world-island';

export const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const context = canvas.getContext('2d') as CanvasRenderingContext2D;

const DEFAULT_COLOR = '#666666';
const REDISH_COLOR = '#ff0000';
const BLUISH_COLOR = '#0356fc';
const LINE_COLOR = '#f5ad42';

export const projMat = mat3.fromValues(
  canvas.width / 30.0,
  0,
  0,
  0,
  -canvas.height / 20.0,
  0,
  canvas.width * 0.5,
  canvas.height * 0.5,
  1
);

export const clear = (): void => {
  context.clearRect(0, 0, canvas.width, canvas.height);
};

export const drawPolyShape = (
  poly: Polygon,
  transform: mat3,
  color: string,
  dashed = false
) => {
  context.lineWidth = 1;
  context.strokeStyle = color;
  context.setLineDash(dashed ? [1, 1] : []);

  context.beginPath();
  for (let i = 0; i < poly.points.length; i++) {
    const p0 = vec2.create();
    const p1 = vec2.create();

    vec2.transformMat3(p0, poly.points[i], transform);
    vec2.transformMat3(p0, p0, projMat);
    vec2.transformMat3(
      p1,
      poly.points[(i + 1) % poly.points.length],
      transform
    );
    vec2.transformMat3(p1, p1, projMat);

    if (i === 0) {
      context.moveTo(p0[0], p0[1]);
    }
    context.lineTo(p1[0], p1[1]);
  }
  context.stroke();
  context.setLineDash([]);
};

export const drawCircleShape = (
  radius: number,
  transform: mat3,
  color: string
) => {
  const c = vec2.transformMat3(
    vec2.create(),
    vec2.fromValues(0.0, 0.0),
    transform
  );

  const r = vec2.transformMat3(
    vec2.create(),
    vec2.fromValues(radius, 0.0),
    transform
  );

  vec2.transformMat3(c, c, projMat);
  vec2.transformMat3(r, r, projMat);

  context.lineWidth = 0.5;

  context.setLineDash([6, 2]);
  context.beginPath();
  context.strokeStyle = color;
  context.moveTo(c[0], c[1]);
  context.lineTo(r[0], r[1]);
  context.stroke();

  context.lineWidth = 1.0;

  context.setLineDash([]);
  context.beginPath();
  context.arc(c[0], c[1], radius * 40, 0, 2 * Math.PI, false);
  context.fillStyle = color;
  context.stroke();
};

export const drawDot = (position: vec2, color = '#666666') => {
  const INNER_RADIUS = 2;
  context.beginPath();
  const p = vec2.transformMat3(vec2.create(), position, projMat);
  context.arc(p[0], p[1], INNER_RADIUS, 0, 2 * Math.PI, false);
  context.fillStyle = color;
  context.fill();
};

export const drawLineSegment = (ed: [vec2, vec2], color = '#666666') => {
  context.setLineDash([]);

  context.beginPath();
  context.strokeStyle = color;
  const p0 = vec2.transformMat3(vec2.create(), ed[0], projMat);
  const p1 = vec2.transformMat3(vec2.create(), ed[1], projMat);
  context.moveTo(p0[0], p0[1]);
  context.lineTo(p1[0], p1[1]);

  context.stroke();
};

export const drawManifold = (manifold: ContactManifold) => {
  context.lineWidth = 0.5;
  const t = vec2.create();
  manifold.forEach(
    ({
      shape0,
      shape1,
      point0,
      localPoint0,
      point1,
      localPoint1,
      normal,
      depth,
    }) => {
      drawDot(point0, '#FF0000');
      vec2.add(t, point0, normal);
      drawLineSegment([point0, t], LINE_COLOR);
      drawDot(point1, '#0000FF');
    }
  );
};

export const drawConstraint = (constraint: ConstraintInterface) => {
  context.lineWidth = 1;
  if (
    constraint instanceof DistanceConstraint ||
    constraint instanceof MaxDistanceConstraint ||
    constraint instanceof MinDistanceConstraint ||
    constraint instanceof LineConstraint ||
    constraint instanceof SpringConstraint
  ) {
    const bodyA = constraint.world.bodies[constraint.bodyAIndex];
    const bodyB = constraint.world.bodies[constraint.bodyBIndex];

    const pa = vec2.create();
    vec2.transformMat3(pa, constraint.jointA, bodyA.transform);

    const pb = vec2.create();
    vec2.transformMat3(pb, constraint.jointB, bodyB.transform);
    drawLineSegment([pa, pb], LINE_COLOR);
    drawDot(pa, BLUISH_COLOR);
    drawDot(pb, BLUISH_COLOR);
  } else if (constraint instanceof ContactConstraint) {
    const p = vec2.fromValues(constraint.joint[0], constraint.joint[1]);
    const n = vec2.fromValues(
      p[0] + constraint.normal[0],
      p[1] + constraint.normal[1]
    );
    drawLineSegment([p, n], LINE_COLOR);
    drawDot(p, REDISH_COLOR);
  }
};

export const drawCross = (transform: mat3, color = '#666666') => {
  context.lineWidth = 0.5;
  const a: [vec2, vec2] = [
    vec2.fromValues(-0.1, 0.0),
    vec2.fromValues(0.1, 0.0),
  ];
  const b: [vec2, vec2] = [
    vec2.fromValues(0.0, -0.1),
    vec2.fromValues(0.0, 0.1),
  ];
  a.forEach((p) => vec2.transformMat3(p, p, transform));
  b.forEach((p) => vec2.transformMat3(p, p, transform));

  drawLineSegment(a, color);
  drawLineSegment(b, color);
};

export const drawGround = (origin: vec2, normal: vec2) => {
  context.lineWidth = 1.0;

  const extend = 1.0;
  const dashes = 8;
  const skew = 0.2;
  const dash = 0.2;
  const dir = vec2.fromValues(-normal[1], normal[0]);
  vec2.normalize(dir, dir);

  const p0 = vec2.create();
  vec2.scaleAndAdd(p0, origin, dir, extend);

  const p1 = vec2.create();
  vec2.scaleAndAdd(p1, origin, dir, -extend);

  drawLineSegment([p0, p1], LINE_COLOR);

  const delta = vec2.distance(p1, p0) / dashes;
  vec2.scaleAndAdd(p1, p0, normal, -dash);
  vec2.scaleAndAdd(p0, p0, dir, skew);

  context.lineWidth = 0.5;
  for (let i = 0; i < dashes; i++) {
    vec2.scaleAndAdd(p0, p0, dir, -delta);
    vec2.scaleAndAdd(p1, p1, dir, -delta);
    drawLineSegment([p1, p0], LINE_COLOR);
  }
};

export const drawBody = (world: World, body: Body, color: string) => {
  const shape = world.bodyShape.get(body);
  drawCross(body.transform, color);
  if (shape instanceof Polygon) {
    drawPolyShape(shape, body.transform, color);
  } else if (shape instanceof Circle) {
    drawCircleShape(shape.radius, body.transform, color);
  }
};

export const drawWorld = (world: World): void => {
  let index = 0;
  world.islands.forEach((island: WorldIsland) => {
    const color = COLORS[index++];
    island.bodies.forEach((body) => drawBody(world, body, color));
  });

  world.bodies
    .filter((body) => body.isStatic)
    .forEach((body) => drawBody(world, body, DEFAULT_COLOR));

  world.motors.forEach((constraint) => drawConstraint(constraint));
  // world.contacts.forEach((contact) =>
  //   contact.getConstraints().forEach((constraint) => drawConstraint(constraint))
  // );
  world.joints.forEach((joint) =>
    joint.getConstraints().forEach((constraint) => drawConstraint(constraint))
  );
};

const COLORS = [
  '#c17b5f',
  '#7dbc56',
  '#beb2d1',
  '#f8b64a',
  '#66c4d1',
  '#e8f435',
  '#169e14',
  '#64beea',
  '#b5f4f3',
  '#ea6d54',
  '#abb703',
  '#6c45f9',
  '#d6d02c',
  '#e28981',
  '#8f42ed',
  '#e06b83',
  '#f99fc3',
  '#ef3b95',
  '#7c8e07',
  '#5f2a93',
  '#e5c682',
  '#28e021',
  '#42dd57',
  '#dd1ca0',
  '#799604',
  '#1e8499',
  '#b0ba01',
  '#42f4bf',
  '#aee88d',
  '#2ccc81',
  '#3dc672',
  '#dd58d4',
  '#010166',
  '#120575',
  '#dd7398',
  '#7c42c9',
  '#efaec4',
  '#50ce76',
  '#9678c9',
  '#6456ce',
  '#ff7a97',
  '#b26123',
  '#5c00b2',
  '#35ba59',
  '#c44de2',
  '#c9249d',
  '#d0e589',
  '#f9c390',
  '#16bf70',
  '#442191',
  '#19fc20',
  '#735fce',
  '#63e8dd',
  '#d8639e',
  '#0f6384',
  '#12b7a1',
  '#89d34c',
  '#b3ffb2',
  '#db5eb5',
  '#ae80d6',
  '#a48ad8',
  '#70bf37',
  '#7fefd9',
  '#0d2b70',
  '#cab3f2',
  '#bdea41',
  '#383eed',
  '#0acc24',
  '#cea023',
  '#56ef74',
  '#60bed1',
  '#6fe27c',
  '#cb67db',
  '#7281cc',
  '#f4b297',
  '#e6fcae',
  '#8d5dfc',
  '#c00bc6',
  '#0e33af',
  '#e20fca',
  '#fcf9a6',
  '#3cf2d3',
  '#a3f76f',
  '#f43a5c',
  '#e06bc3',
  '#2cd695',
  '#e06e45',
  '#dbb300',
  '#45e537',
  '#b7ea88',
  '#e5a912',
  '#3566ba',
  '#33c48f',
  '#8f53ba',
  '#8185d3',
  '#f9cd09',
  '#b5d149',
  '#c9087c',
  '#b2312a',
  '#e0e244',
  '#ef94cf',
  '#edd39e',
  '#c65833',
  '#3229e5',
  '#d89c04',
  '#7efc8c',
  '#01b7ae',
  '#d5f72c',
  '#e2a07c',
  '#edb4f7',
  '#ccc806',
  '#e5ca90',
  '#eac84d',
  '#8fecf7',
  '#cbe585',
  '#a6ce04',
  '#2449b7',
  '#6644af',
  '#9fa4f4',
  '#9ef470',
  '#aee281',
  '#87f2de',
  '#291d99',
  '#f4c03d',
  '#ffec99',
  '#eb82ed',
  '#f2b0e0',
  '#c60978',
  '#6beae6',
  '#ed9cc3',
  '#6ced61',
  '#79ad0a',
  '#c24bea',
  '#d3ef8d',
  '#64fc74',
  '#a2db64',
  '#62b72d',
  '#8f98f7',
  '#47bc0d',
  '#669ce2',
  '#e0c372',
  '#16427c',
  '#250982',
  '#31c1c6',
  '#86c3ef',
  '#014aa3',
  '#8aed84',
  '#87e021',
  '#b6ffb2',
  '#cad149',
  '#d646b4',
  '#807dd8',
  '#717af2',
  '#c478ed',
  '#40ad1f',
];
