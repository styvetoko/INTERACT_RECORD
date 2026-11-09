import { ImageRejectedError, IMAGE_QUEUE_LIMITS, withImageSlot } from './image-processing';

describe('file des traitements d’images (M5, N5)', () => {
  it('ne dépasse jamais la limite de traitements simultanés et refuse au-delà de la file', async () => {
    const { MAX_CONCURRENT_JOBS, MAX_QUEUED_JOBS } = IMAGE_QUEUE_LIMITS;
    let active = 0;
    let peak = 0;
    const releases: (() => void)[] = [];
    const job = () =>
      new Promise<void>((resolve) => {
        active++;
        peak = Math.max(peak, active);
        releases.push(() => {
          active--;
          resolve();
        });
      });

    const accepted = Array.from({ length: MAX_CONCURRENT_JOBS + MAX_QUEUED_JOBS }, () => withImageSlot(job));
    await expect(withImageSlot(job)).rejects.toMatchObject({ code: 'MEDIA_BUSY' });
    expect(new ImageRejectedError('MEDIA_BUSY', 'x')).toBeInstanceOf(Error);

    // Libère les traitements un par un ; un nouvel appel arrive pendant chaque passage de relais.
    let extra: Promise<void>[] = [];
    while (releases.length) {
      releases.shift()!();
      await Promise.resolve();
      if (extra.length < 5) extra.push(withImageSlot(job));
      await new Promise((r) => setImmediate(r));
    }
    await Promise.all([...accepted, ...extra]);
    expect(peak).toBe(MAX_CONCURRENT_JOBS);
  });
});
