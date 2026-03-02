import { useCallback } from 'react'
import { AdvancedMarker } from '@vis.gl/react-google-maps'
import { useAppStore } from '../store/appStore.js'
import { getCategoryIcon } from '../config/categories.js'

export default function MapMarker({ location, isSelected }) {
  const setSelection = useAppStore((s) => s.setSelection)

  const handleClick = useCallback(() => {
    setSelection(location.id, 'map')
  }, [location.id, setSelection])

  const size = isSelected ? 40 : 28

  // A 0×0 anchor div: AdvancedMarker anchors its bottom-center at the geographic
  // coordinate. By using a 0×0 container the anchor point IS the coordinate, and
  // we center the icon on it with absolute positioning + translate(-50%, -50%).
  // This matches the builder's google.maps.Marker anchor: (size/2, size/2).
  return (
    <AdvancedMarker
      position={{ lat: location.lat, lng: location.lng }}
      onClick={handleClick}
      title={location.name}
    >
      <div style={{ position: 'relative', width: 0, height: 0 }}>
        {/* 48×48 transparent tap target centered on the coordinate */}
        <div style={{
          position: 'absolute',
          width: 48,
          height: 48,
          transform: 'translate(-50%, -50%)',
          cursor: 'pointer',
        }} />
        <img
          src={getCategoryIcon(location.category)}
          alt={location.category}
          style={{
            position: 'absolute',
            width: size,
            height: size,
            transform: 'translate(-50%, -50%)',
            filter: isSelected
              ? 'drop-shadow(0 0 6px rgba(56,189,248,0.9))'
              : 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
            transition: 'width 0.15s, height 0.15s, filter 0.15s',
          }}
        />
      </div>
    </AdvancedMarker>
  )
}
