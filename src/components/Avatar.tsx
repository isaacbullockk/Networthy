export default function Avatar({
  name,
  gradient,
  size = 'md',
}: {
  name: string
  gradient: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
  const cls = {
    sm: 'h-10 w-10 text-sm',
    md: 'h-14 w-14 text-lg',
    lg: 'h-20 w-20 text-2xl',
    xl: 'h-32 w-32 text-4xl',
  }[size]
  return (
    <div
      className={`grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${gradient} ${cls} font-display font-semibold text-white shadow-md`}
    >
      {initials}
    </div>
  )
}
