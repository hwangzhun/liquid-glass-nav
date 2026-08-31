import { useEffect, useMemo, useRef } from "react";

type FlowBackgroundCanvasProps = {
  colors: readonly string[];
  speed?: number;
  scale?: number;
  distortion?: number;
  swirl?: number;
};

const MAX_RENDER_PIXELS = 52_000;
const MAX_FRAME_RATE = 30;
const INITIAL_TIME = 20.75;

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function fract(value: number) {
  return value - Math.floor(value);
}

function smooth(value: number) {
  const clamped = clamp01(value);
  return clamped * clamped * (3 - 2 * clamped);
}

function parseHexColor(value: string): [number, number, number] {
  const normalized = value.replace("#", "");
  const numeric = Number.parseInt(normalized, 16);
  return [
    (numeric >> 16) & 255,
    (numeric >> 8) & 255,
    numeric & 255,
  ];
}

function movingAnchor(index: number, time: number): [number, number] {
  const phase = index * 0.37;
  const horizontalSpeed = 0.6 + fract(index / 3) * 0.9;
  const verticalSpeed = 0.8 + fract((index + 1) / 4);
  return [
    0.5 + 0.5 * Math.sin(time * horizontalSpeed + phase),
    0.5 + 0.5 * Math.cos(time * verticalSpeed + phase * 1.5),
  ];
}

function drawFlowField(
  imageData: ImageData,
  width: number,
  height: number,
  colors: Array<[number, number, number]>,
  time: number,
  scale: number,
  distortion: number,
  swirl: number
) {
  const data = imageData.data;
  const fieldScale = 0.4 + (scale / 100) * 1.2;
  const distortionAmount = distortion / 100;
  const swirlAmount = swirl / 100;
  const anchors = colors.map((_, index) => movingAnchor(index, time));

  for (let y = 0; y < height; y += 1) {
    const sourceY = (y + 0.5) / height;
    for (let x = 0; x < width; x += 1) {
      let fieldX = ((x + 0.5) / width - 0.5) / fieldScale + 0.5;
      let fieldY = (sourceY - 0.5) / fieldScale + 0.5;
      const radius = smooth(Math.hypot(fieldX - 0.5, fieldY - 0.5));
      const edgeFalloff = 1 - radius;

      for (let pass = 1; pass <= 2; pass += 1) {
        fieldX +=
          (distortionAmount * edgeFalloff *
            Math.sin(time + pass * 0.4 * smooth(fieldY)) *
            Math.cos(0.2 * time + pass * 2.4 * smooth(fieldY))) /
          pass;
        fieldY +=
          (distortionAmount * edgeFalloff *
            Math.cos(time + pass * 2 * smooth(fieldX))) /
          pass;
      }

      const rotation = -3 * swirlAmount * radius;
      const cosine = Math.cos(rotation);
      const sine = Math.sin(rotation);
      const centeredX = fieldX - 0.5;
      const centeredY = fieldY - 0.5;
      fieldX = cosine * centeredX - sine * centeredY + 0.5;
      fieldY = sine * centeredX + cosine * centeredY + 0.5;

      let red = 0;
      let green = 0;
      let blue = 0;
      let totalWeight = 0;

      for (let index = 0; index < colors.length; index += 1) {
        const deltaX = fieldX - anchors[index][0];
        const deltaY = fieldY - anchors[index][1];
        const squaredDistance = deltaX * deltaX + deltaY * deltaY;
        const weight = 1 / (Math.pow(squaredDistance, 1.75) + 0.0001);
        red += colors[index][0] * weight;
        green += colors[index][1] * weight;
        blue += colors[index][2] * weight;
        totalWeight += weight;
      }

      const pixelIndex = (y * width + x) * 4;
      const inverseWeight = 1 / Math.max(0.0001, totalWeight);
      data[pixelIndex] = red * inverseWeight;
      data[pixelIndex + 1] = green * inverseWeight;
      data[pixelIndex + 2] = blue * inverseWeight;
      data[pixelIndex + 3] = 255;
    }
  }
}

export function FlowBackgroundCanvas({
  colors,
  speed = 26,
  scale = 50,
  distortion = 44,
  swirl = 6,
}: FlowBackgroundCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const parsedColors = useMemo(() => colors.map(parseHexColor), [colors]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let imageData = context.createImageData(1, 1);
    let animationFrame = 0;
    let lastAnimationTime = 0;
    let lastPaintTime = 0;
    let flowTime = INITIAL_TIME;
    let stopped = false;

    const resize = () => {
      const viewportWidth = Math.max(1, window.innerWidth);
      const viewportHeight = Math.max(1, window.innerHeight);
      const renderScale = Math.min(
        1,
        Math.sqrt(MAX_RENDER_PIXELS / (viewportWidth * viewportHeight))
      );
      const width = Math.max(96, Math.round(viewportWidth * renderScale));
      const height = Math.max(96, Math.round(viewportHeight * renderScale));
      if (canvas.width === width && canvas.height === height) return;
      canvas.width = width;
      canvas.height = height;
      imageData = context.createImageData(width, height);
    };

    const paint = () => {
      drawFlowField(
        imageData,
        canvas.width,
        canvas.height,
        parsedColors,
        flowTime,
        scale,
        distortion,
        swirl
      );
      context.putImageData(imageData, 0, 0);
    };

    const animate = (timestamp: number) => {
      if (stopped) return;
      const elapsed = lastAnimationTime
        ? Math.min(0.05, (timestamp - lastAnimationTime) / 1000)
        : 0;
      lastAnimationTime = timestamp;

      if (!document.hidden) {
        flowTime += (speed / 100) * 1.2 * elapsed;

        if (timestamp - lastPaintTime >= 1000 / MAX_FRAME_RATE) {
          paint();
          lastPaintTime = timestamp;
        }
      }
      animationFrame = window.requestAnimationFrame(animate);
    };

    const restart = () => {
      window.cancelAnimationFrame(animationFrame);
      lastAnimationTime = 0;
      lastPaintTime = 0;
      resize();
      paint();
      if (!reducedMotion.matches)
        animationFrame = window.requestAnimationFrame(animate);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) lastAnimationTime = 0;
    };

    restart();
    window.addEventListener("resize", restart);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    reducedMotion.addEventListener("change", restart);

    return () => {
      stopped = true;
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", restart);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      reducedMotion.removeEventListener("change", restart);
    };
  }, [distortion, parsedColors, scale, speed, swirl]);

  return <canvas ref={canvasRef} className="flow-background-canvas" aria-hidden="true" />;
}
