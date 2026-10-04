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
}: {
  frames: readonly (readonly string[])[]
  palette: Readonly<Record<string, string>>
  scale: number
  label: string
  className: string
  idle?: boolean
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
      role="img"
      aria-label={label}
    >
      {frames.map((rows, frame) => (
        <g key={frame} className={`pixel-frame pixel-frame-${frame}`}>
          {runs(rows, palette, label).map((run) => (
            <rect key={`${run.x}-${run.y}`} x={run.x} y={run.y} width={run.width} height={1} fill={run.fill} />
          ))}
        </g>
      ))}
    </svg>
  )
}

// One rect per horizontal run of the same color.
function runs(rows: readonly string[], palette: Readonly<Record<string, string>>, label: string) {
  const out: { x: number; y: number; width: number; fill: string }[] = []
  rows.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const key = row.charAt(x)
      let end = x + 1
      while (end < row.length && row.charAt(end) === key) end += 1
      if (key !== '.') {
        const fill = palette[key]
        if (fill === undefined) throw new Error(`${label}: unknown pixel key "${key}"`)
        out.push({ x, y, width: end - x, fill })
      }
      x = end
    }
  })
  return out
}
