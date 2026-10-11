import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Dash — Live 1:1 creator sessions',
    short_name: 'Dash',
    description: 'Request a live one-on-one video session in your niche. Instant or scheduled.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0f',
    theme_color: '#0a0a0f',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
