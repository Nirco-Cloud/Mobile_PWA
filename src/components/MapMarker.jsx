import { useCallback } from 'react'
import { AdvancedMarker } from '@vis.gl/react-google-maps'
import { useAppStore } from '../store/appStore.js'
import { getCategoryIcon } from '../config/categories.js'

// Hotel marker — visually dominant anchor, never clustered
function HotelMarker({ location, isSelected, onClick }) {
  const size = isSelected ? 46 : 34 // ~20% larger than POI (40/28)
  return (
    <AdvancedMarker
      position={{ lat: location.lat, lng: location.lng }}
      onClick={onClick}
      title={location.name}
    >
      <div style={{ position: 'relative', width: 0, height: 0 }}>
        {/* Tap target */}
        <div style={{
          position: 'absolute',
          width: 52,
          height: 52,
          transform: 'translate(-50%, -50%)',
          cursor: 'pointer',
        }} />
        {/* Outer glow ring */}
        <div style={{
          position: 'absolute',
          width: size + 8,
          height: size + 8,
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(30,58,138,0.12)',
          transition: 'width 0.15s, height 0.15s',
        }} />
        {/* Main badge */}
        <div style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#1e3a8a',
          border: '2px solid white',
          boxShadow: isSelected
            ? '0 0 0 2.5px rgba(30,58,138,0.35), 0 3px 10px rgba(0,0,0,0.35)'
            : '0 0 0 1.5px rgba(30,58,138,0.2), 0 2px 6px rgba(0,0,0,0.28)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'width 0.15s, height 0.15s, box-shadow 0.15s',
        }}>
          <svg
            viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ width: size * 0.52, height: size * 0.52 }}
          >
            <path d="M3 22V8l9-6 9 6v14" />
            <path d="M9 22V16h6v6" />
            <path d="M9 10h6" />
          </svg>
        </div>
      </div>
    </AdvancedMarker>
  )
}

export default function MapMarker({ location, isSelected }) {
  const setSelection        = useAppStore((s) => s.setSelection)
  const setDetailLocationId = useAppStore((s) => s.setDetailLocationId)

  const handleClick = useCallback(() => {
    setSelection(location.id, 'map')
    setDetailLocationId(location.id)
  }, [location.id, setSelection, setDetailLocationId])

  // Hotel gets its own dominant marker style
  if (location.category === 'Hotel') {
    return <HotelMarker location={location} isSelected={isSelected} onClick={handleClick} />
  }

  const size = isSelected ? 40 : 28

  return (
    <AdvancedMarker
      position={{ lat: location.lat, lng: location.lng }}
      onClick={handleClick}
      title={location.name}
    >
      <div style={{ position: 'relative', width: 0, height: 0 }}>
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
