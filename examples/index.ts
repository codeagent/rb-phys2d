/// <reference path="./declarations.d.ts" />
import 'reflect-metadata';

import { createWorld } from 'rb-phys2d';
import {
  RenderMask,
  createViewport,
  createWorldRenderer,
} from 'rb-phys2d-renderer';
// import { createWorld } from 'rb-phys2d-threaded';
import { animationFrames, fromEvent, interval } from 'rxjs';
import { map, startWith, switchMap, tap } from 'rxjs/operators';
import { Container } from 'typedi';

import { ExampleInterface } from './example.interface';
import {
  Profiler,
  ExampleLoader,
  EXAMPLES_TOKEN,
  EXAMPLES,
  CONTAINER_TOKEN,
  RENDERER_TOKEN,
} from './services';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;

canvas.width = Math.max(
  document.documentElement.clientWidth || 0,
  window.innerWidth || 0
);
canvas.height = Math.max(
  document.documentElement.clientHeight || 0,
  window.innerHeight || 0
);

const world = createWorld({});
const viewport = createViewport(canvas)
  .addMousePickingControl(world)
  .addViewportAdjustingControl({ width: 50 });

const renderer = createWorldRenderer(viewport, world);

const container = Container.of('examples');
container.set({ id: EXAMPLES_TOKEN, value: EXAMPLES });
container.set({ id: CONTAINER_TOKEN, value: container });
container.set({ id: RENDERER_TOKEN, value: renderer });
container.set({ id: 'WORLD', value: world });
container.set({ id: 'SETTINGS', value: world.settings });

let example: ExampleInterface;

const profiler = container.get(Profiler);
const loader = container.get(ExampleLoader);

fromEvent(self.document.querySelectorAll('.nav-link'), 'click')
  .pipe(
    map((e: MouseEvent) => (e.target as HTMLAnchorElement).id),
    startWith('joint'),
    tap(id => {
      document
        .querySelectorAll('.nav-link')
        .forEach(e => e.classList.remove('active'));
      document.getElementById(id).classList.add('active');
    }),
    switchMap((id: string) => loader.loadExample(id))
  )
  .subscribe(e => {
    if (example) {
      example.uninstall();
      renderer.reset();
    }
    example = e;
    example.install();
  });

const dt = 1.0 / 60.0;

interval(dt * 1000).subscribe(() => {
  profiler.begin('step');
  world.step(dt);
  profiler.end('step');
});

animationFrames().subscribe(() => {
  profiler.begin('draw');
  renderer.clear();
  renderer.render(RenderMask.Default);
  profiler.end('draw');
});

const perf = document.getElementById('perf');
profiler.listen('draw', 'step').subscribe(e => {
  perf.innerText = `Draw: ${e.draw?.toFixed(2)}ms | Step: ${e.step?.toFixed(
    2
  )}ms`;
});
