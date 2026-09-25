import { buildCorsOrigins, normalizeOrigin, withWwwVariant } from './cors.config';

describe('CORS origin allowlist', () => {
  it('should strip trailing slashes', () => {
    expect(normalizeOrigin('https://chekup247.com/')).toBe('https://chekup247.com');
    expect(normalizeOrigin('https://chekup247.com///')).toBe('https://chekup247.com');
  });

  it('should cover apex and www variants for https origins', () => {
    expect(withWwwVariant('https://chekup247.com')).toEqual([
      'https://chekup247.com',
      'https://www.chekup247.com',
    ]);
    expect(withWwwVariant('https://www.chekup247.com')).toEqual([
      'https://www.chekup247.com',
      'https://chekup247.com',
    ]);
  });

  it('should leave http/localhost origins untouched', () => {
    expect(withWwwVariant('http://localhost:3000')).toEqual(['http://localhost:3000']);
  });

  it('should build a de-duplicated allowlist including the reported failing origin', () => {
    const origins = buildCorsOrigins([
      'https://chekup247.com/', // trailing slash as misconfigured on a deploy
      'https://doctor.chekup247.com',
      'https://admin.chekup247.com',
      '',
      'http://localhost:3000',
    ]);

    expect(origins).toContain('https://chekup247.com');
    expect(origins).toContain('https://www.chekup247.com');
    expect(origins).toContain('https://doctor.chekup247.com');
    expect(origins).toContain('http://localhost:3000');
    expect(origins.length).toBe(new Set(origins).size);
  });
});
