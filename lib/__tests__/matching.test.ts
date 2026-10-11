import { describe, expect, it, beforeEach } from 'vitest';
import { rankCreators } from '../dispatch';
import { listCreators, resetStore, updateCreator } from '../store';

beforeEach(async () => {
  await resetStore();
});

describe('rankCreators', () => {
  it('only returns online creators in the niche', async () => {
    const ranked = await rankCreators('solo', 100000, 60);
    expect(ranked.length).toBeGreaterThan(0);
    for (const c of ranked) {
      expect(c.online).toBe(true);
      expect(c.niches).toContain('solo');
    }
    // Ivy is offline and must never appear
    expect(ranked.map((c) => c.id)).not.toContain('cr_ivy');
  });

  it('filters out creators whose minimum exceeds the budget', async () => {
    // $1 budget: nobody's minimum (rate * minMinutes) fits
    const ranked = await rankCreators('solo', 100, 60);
    expect(ranked).toHaveLength(0);
  });

  it('excludes already-pinged creators', async () => {
    const first = await rankCreators('solo', 100000, 60);
    const second = await rankCreators('solo', 100000, 60, [first[0].id]);
    expect(second.map((c) => c.id)).not.toContain(first[0].id);
  });

  it('prefers higher rating at similar price', async () => {
    // Kai: 5.0 rating @ 600cpm; give both same price and check order
    await updateCreator('cr_kai', { rateCentsPerMin: 350, niches: ['solo', 'joi'] });
    await updateCreator('cr_maya', { rateCentsPerMin: 350 });
    const ranked = await rankCreators('solo', 100000, 60);
    const kaiIdx = ranked.findIndex((c) => c.id === 'cr_kai');
    const mayaIdx = ranked.findIndex((c) => c.id === 'cr_maya');
    expect(kaiIdx).toBeGreaterThanOrEqual(0);
    expect(mayaIdx).toBeGreaterThanOrEqual(0);
    expect(kaiIdx).toBeLessThan(mayaIdx); // 5.0 beats 4.9 at equal price
  });

  it('returns empty when nobody is online in the niche', async () => {
    for (const c of await listCreators()) await updateCreator(c.id, { online: false });
    expect(await rankCreators('solo', 100000, 60)).toHaveLength(0);
  });
});
