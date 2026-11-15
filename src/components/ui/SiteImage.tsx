'use client'

// Thin wrapper over next/image used everywhere an <img> used to be.
//  - Local files in /public are optimised by Next (resized, AVIF/WebP).
//  - Remote product photos (Supabase storage etc.) are served as-is: the shop's
//    own notes record that routing them through Next's optimiser took 20-40s per
//    image, and they are already small files on a CDN. Pass `unoptimized={false}`
//    to override.
//  - `fallbackSrc` swaps in a backup image if the first one fails to load.
// Always give width and height (or `fill` inside a positioned parent) so the
// browser reserves space and the layout does not shift.

import { useEffect, useState } from 'react'
import Image, { type ImageProps } from 'next/image'

type Props = Omit<ImageProps, 'src' | 'alt'> & {
  src: string
  alt: string
  fallbackSrc?: string
}

export default function SiteImage({ src, alt, fallbackSrc, onError, unoptimized, ...rest }: Props) {
  const [current, setCurrent] = useState(src)
  useEffect(() => setCurrent(src), [src])
  const remote = /^https?:\/\//.test(current)

  return (
    <Image
      {...rest}
      src={current}
      alt={alt}
      unoptimized={unoptimized ?? remote}
      onError={e => {
        if (fallbackSrc && current !== fallbackSrc) setCurrent(fallbackSrc)
        onError?.(e)
      }}
    />
  )
}
