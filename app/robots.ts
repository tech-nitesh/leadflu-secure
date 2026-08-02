import { MetadataRoute } from 'next';

// Staging copies must never be indexed by Google - two identical sites would
// be seen as duplicate content and hurt the real site's ranking. The staging
// Vercel project sets SEO_NOINDEX=1; production never sets it, so the live
// site stays fully indexable.
export default function robots(): MetadataRoute.Robots {
  if (process.env.SEO_NOINDEX === '1') {
    return {
      rules: { userAgent: '*', disallow: '/' },
    };
  }
  return {
    rules: { userAgent: '*', allow: '/' },
  };
}
