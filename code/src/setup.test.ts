import { describe, it, expect } from 'vitest';

describe('Project Setup', () => {
  it('should have correct environment', () => {
    expect(process.env.NODE_ENV).toBeDefined();
  });

  it('should have vitest configured', () => {
    expect(true).toBe(true);
  });
});