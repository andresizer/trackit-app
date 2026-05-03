interface TagBadgeProps {
  name: string
  color?: string | null
}

export default function TagBadge({ name, color }: TagBadgeProps) {
  const c = color || '#6366f1'
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
      style={{
        backgroundColor: `${c}15`,
        color: c,
        border: `1px solid ${c}30`,
      }}
    >
      #{name}
    </span>
  )
}
