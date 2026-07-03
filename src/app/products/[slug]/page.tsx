// src/app/products/[slug]/page.tsx
export const dynamic = 'force-dynamic'

export default async function ProductPage({ params }: { params: { slug: string } }) {
  return (
    <div style={{ padding: 40 }}>
      <h1>Product: {params.slug}</h1>
      <p>Route is working. Full page coming soon.</p>
    </div>
  )
}