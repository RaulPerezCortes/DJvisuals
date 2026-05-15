export const shaderUtils = /* glsl */ `
precision highp float;

#define PI 3.141592653589793

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec3 hash3(vec3 p) {
  p = fract(p * vec3(.1031, .1030, .0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float noise3(vec3 x) {
  vec3 p = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);

  float n = p.x + p.y * 57.0 + 113.0 * p.z;
  return mix(
    mix(mix(hash(vec2(n + 0.0, n + 1.0)), hash(vec2(n + 1.0, n + 2.0)), f.x),
        mix(hash(vec2(n + 57.0, n + 58.0)), hash(vec2(n + 58.0, n + 59.0)), f.x), f.y),
    mix(mix(hash(vec2(n + 113.0, n + 114.0)), hash(vec2(n + 114.0, n + 115.0)), f.x),
        mix(hash(vec2(n + 170.0, n + 171.0)), hash(vec2(n + 171.0, n + 172.0)), f.x), f.y),
    f.z
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amp = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    value += amp * noise(p);
    p = rot * p * 2.03 + 17.7;
    amp *= 0.52;
  }
  return value;
}

vec2 kaleidoscope(vec2 uv, float segments, float phase) {
  float angle = atan(uv.y, uv.x) + phase;
  float radius = length(uv);
  float slice = PI * 2.0 / segments;
  angle = abs(mod(angle, slice) - slice * 0.5);
  return vec2(cos(angle), sin(angle)) * radius;
}

vec3 palette(float t) {
  vec3 a = vec3(0.5, 0.5, 0.5);
  vec3 b = vec3(0.5, 0.5, 0.5);
  vec3 c = vec3(1.0, 1.0, 1.0);
  vec3 d = vec3(0.08, 0.36, 0.72);
  return a + b * cos(6.28318 * (c * t + d));
}

vec3 rgbShiftColor(vec2 uv, float amount, float t) {
  float n = fbm(uv * 3.0 + t * 0.12);
  return vec3(
    fbm(uv * 2.4 + vec2(amount + n, 0.0)),
    fbm(uv * 2.6),
    fbm(uv * 2.4 - vec2(amount + n, 0.0))
  );
}
`;
