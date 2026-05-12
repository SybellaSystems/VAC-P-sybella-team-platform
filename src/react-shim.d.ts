// Minimal React/JSX shim to satisfy TypeScript in environments missing @types/react.
// This does NOT change runtime behavior.

declare module 'react' {
  export type ReactNode = any;
  export type ReactElement = any;
  export type FC<P = {}> = (props: P) => ReactElement;
  export function useState<T = any>(initial: T): [T, (v: T) => void];
  export function useEffect(effect: any, deps?: any[]): void;
  export function useMemo<T = any>(fn: () => T, deps?: any[]): T;
  export function useRef<T = any>(initial: T): { current: T };
}

declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

