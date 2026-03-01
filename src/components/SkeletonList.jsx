// Skeleton placeholder rows shown while location data is loading from IndexedDB
export default function SkeletonList({ count = 8 }) {
  // Vary the name-bar widths to look more natural
  const widths = [55, 72, 48, 65, 80, 42, 60, 70]

  return (
    <div className="flex-1 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-2 px-3 min-h-[56px] border-b border-gray-100 dark:border-gray-800"
        >
          {/* Category dot */}
          <div className="w-2 h-2 rounded-full shrink-0 skeleton-shimmer" />
          {/* Location name bar */}
          <div
            className="h-4 rounded skeleton-shimmer"
            style={{ width: `${widths[i % widths.length]}%` }}
          />
          {/* Distance badge */}
          <div className="w-10 h-3 rounded shrink-0 skeleton-shimmer" />
          {/* Chevron */}
          <div className="w-3 h-3 rounded shrink-0 skeleton-shimmer" />
        </div>
      ))}
    </div>
  )
}
