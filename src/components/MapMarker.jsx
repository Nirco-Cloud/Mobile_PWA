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

  // Invisible padding extends the tappable area to 48×48dp
  const pad = Math.max(0, Math.floor((48 - size) / 2))

  return (
    <AdvancedMarker
      position={{ lat: location.lat, lng: location.lng }}
      onClick={handleClick}
      title={location.name}
    >
      <div style={{ padding: pad, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img
          src={getCategoryIcon(location.category)}
          alt={location.category}
          style={{
            width: size,
            height: size,
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
