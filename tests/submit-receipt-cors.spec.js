import { test, expect } from '@playwright/test';
import { corsHeaders, isAllowedOrigin } from '../supabase/functions/submit-receipt/cors.js';

test.describe('submit-receipt CORS', () => {
  test('allows the local preview origin and preserves preflight headers', () => {
    expect(isAllowedOrigin('http://localhost:43922')).toBe(true);
    expect(corsHeaders('http://localhost:43922')).toEqual({
      'Access-Control-Allow-Origin': 'http://localhost:43922',
      Vary: 'Origin',
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    });
  });

  test('continues to allow the production origin and rejects other origins', () => {
    expect(isAllowedOrigin('https://darioswede.github.io')).toBe(true);
    expect(isAllowedOrigin('https://example.com')).toBe(false);
    expect(corsHeaders('https://example.com')['Access-Control-Allow-Origin']).toBe('https://darioswede.github.io');
  });
});