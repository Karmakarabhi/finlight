/**
 * Finlight V1: Tax Engine Module
 * Pluggable, versioned Indian tax engine for capital gains and withdrawal consequence modeling.
 * Strictly adheres to docs/FINLIGHT_V1_SPECIFICATION.md.
 *
 * NOTE: Pure TypeScript. No DB imports, no React imports, no external API calls.
 */

export * from './types';
export * from './lot-matcher';
export * from './rules-2024-25';
