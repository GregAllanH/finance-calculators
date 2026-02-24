// app/sitemap.ts
import { MetadataRoute } from 'next';
import calculators from '@/data/finance-calculators.json';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://canadiancalculators.ca';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/income-tax`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
  ];

  // JSON-driven calculator pages
  const calcPages: MetadataRoute.Sitemap = (calculators as any[]).map((calc) => ({
    url: `${baseUrl}/calculator/${calc.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  return [...staticPages, ...calcPages];
}
