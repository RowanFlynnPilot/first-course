// Draws pixel art as crisp SVG: rows of palette keys, one character per pixel,
// '.' for clear. Used by the chef sprite and the badges. `scale` is whole screen
// pixels per art pixel; keep it an integer or the pixels come out uneven.
//
// With two frames and `idle`, the art alternates between them (styles.css,
// .pixels-idle). Reduced motion shows the first frame only.

export function PixelArt({
  frames,
  palette,
  scale,
  label,
  className,
  idle = false,
  decorative = false,
}: {
  frames: readonly (readonly string[])[]
  palette: Readonly<Record<string, string>>
  scale: number
  /** What the art shows, for a screen reader, and in errors about the art. */
  label: string
  className: string
  idle?: boolean
  /** Text beside it already says what it shows, so a screen reader skips it. */
  decorative?: boolean
}) {
  const first = frames[0]
  if (first === undefined || first.length === 0) throw new Error(`${label}: pixel art has no rows`)
  const width = first[0]?.length ?? 0
  const height = first.length
  for (const rows of frames) {
    if (rows.length !== height) throw new Error(`${label}: frames are different heights`)
    for (const row of rows) if (row.length !== width) throw new Error(`${label}: row "${row}" is not ${width} wide`)
  }

  return (
    <svg
      className={`pixels ${className}${idle && frames.length > 1 ? ' pixels-idle' : ''}`}
      width={width * scale}
      height={height * scale}
      viewBox={`0 0 ${width} ${height}`}
      shapeRendering="crispEdges"
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label })}
    >
      {frames.map((rows, frame) => (
        <g key={frame} className={`pixel-frame pixel-frame-${frame}`}>
          {[...shapes(rows, palette, label)].map(([fill, d]) => (
            <path key={fill} d={d} fill={fill} />
          ))}
        </g>
      ))}
    </svg>
  )
}

// One path per color, made of a rectangle for each horizontal run of it. The
// chef sheet draws 31 badges and seven chefs: a rect per run came to about
// 3,700 elements, a path per color to a few hundred.
function shapes(rows: readonly string[], palette: Readonly<Record<string, string>>, label: string): Map<string, string> {
  const byFill = new Map<string, string>()
  rows.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const key = row.charAt(x)
      let end = x + 1
      while (end < row.length && row.charAt(end) === key) end += 1
      if (key !== '.') {
        const fill = palette[key]
        if (fill === undefined) throw new Error(`${label}: unknown pixel key "${key}"`)
        const width = end - x
        byFill.set(fill, `${byFill.get(fill) ?? ''}M${x} ${y}h${width}v1h-${width}z`)
      }
      x = end
    }
  })
  return byFill
}
