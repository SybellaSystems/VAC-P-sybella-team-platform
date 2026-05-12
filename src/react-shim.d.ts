// Minimal React/JSX shim to satisfy TypeScript when React/JSX types are missing/misconfigured.
// This does NOT change runtime behavior.

// Provide basic React module types so `import { useState, useEffect, ... } from 'react'` compiles.
declare module 'react' {
  export type ReactNode = any;
  export type ReactElement = any;
  export type FC<P = {}> = (props: P) => ReactElement;

  export function useState<T = any>(initial: T): [T, (v: T) => void];
  export function useEffect(effect: any, deps?: any[]): void;
  export function useMemo<T = any>(fn: () => T, deps?: any[]): T;
  export function useRef<T = any>(initial: T): { current: T };
}

// Next/JSX transform relies on jsx-runtime declarations.
declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

// Basic JSX intrinsic elements so JSX compiles.
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

