declare module 'svg-captcha' {
  export function create(options?: {
    size?: number;
    ignoreChars?: string;
    noise?: number;
    color?: boolean;
    background?: string;
  }): { text: string; data: string };

  const svgCaptcha: { create: typeof create };
  export default svgCaptcha;
}
