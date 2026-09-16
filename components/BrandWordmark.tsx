/** Text fallback for the repository's truncated PNG wordmark. */
export default function BrandWordmark({ inverse = false }: { inverse?: boolean }) {
  return <span aria-label="ThynkXP" style={{ display: 'inline-flex', alignItems: 'baseline', fontFamily: 'inherit', fontSize: 27, fontWeight: 850, letterSpacing: '-1.6px', lineHeight: 1.1, color: inverse ? '#f7f8f6' : '#202321' }}>thynk<span style={{ color: '#f16d2d', fontWeight: 850 }}>XP</span><span aria-hidden="true" style={{ fontSize: 23, color: '#f16d2d', marginLeft: 1 }}>.</span></span>;
}
