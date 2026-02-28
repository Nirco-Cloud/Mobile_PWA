// Entry type definitions — icon paths, accent colors, and meta field schemas

export const ENTRY_TYPES = {
  location: {
    label: 'Location',
    icon: 'M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
    accentColor: '#0ea5e9', // sky-500
    metaFields: [],
  },
  flight: {
    label: 'Flight',
    // Plane icon
    icon: 'M3.414 13.778l2.367-2.367 5.59 2.795L20.414 5.164a2 2 0 012.828 2.828l-9.042 9.042-2.795-5.59-2.367 2.367a1 1 0 01-1.414 0l-4.21-4.21',
    accentColor: '#3b82f6', // blue-500
    metaFields: [
      { key: 'airline',           label: 'Airline',          type: 'text' },
      { key: 'flightNumber',      label: 'Flight Number',    type: 'text' },
      { key: 'departureStation',  label: 'From',             type: 'text' },
      { key: 'arrivalStation',    label: 'To',               type: 'text' },
      { key: 'departureTime',     label: 'Departure',        type: 'datetime' },
      { key: 'arrivalTime',       label: 'Arrival',          type: 'datetime' },
      { key: 'confirmationNumber',label: 'Confirmation #',   type: 'text' },
    ],
    deriveName: (meta) => {
      const parts = [meta.flightNumber, meta.departureStation, meta.arrivalStation].filter(Boolean)
      if (parts.length >= 3) return `${parts[0]} ${parts[1]} → ${parts[2]}`
      if (parts.length > 0) return parts.join(' ')
      return 'Flight'
    },
  },
  hotel: {
    label: 'Hotel',
    // Bed icon
    icon: 'M3 7v11m0-7h18m0 0V7a2 2 0 00-2-2H5a2 2 0 00-2 2v4h18zm0 0v7m-9-4h.01',
    accentColor: '#8b5cf6', // violet-500
    metaFields: [
      { key: 'confirmationNumber',label: 'Confirmation #',   type: 'text' },
      { key: 'checkIn',           label: 'Check-In',         type: 'date' },
      { key: 'checkOut',          label: 'Check-Out',        type: 'date' },
      { key: 'nights',            label: 'Nights',           type: 'text' },
      { key: 'roomType',          label: 'Room Type',        type: 'text' },
    ],
    deriveName: (meta) => meta.roomType || 'Hotel Booking',
  },
  car_rental: {
    label: 'Car Rental',
    // Car icon
    icon: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0zm-2-2H7l-2-5h14l-2 5zM5 10l1.5-4.5A2 2 0 018.4 4h7.2a2 2 0 011.9 1.5L19 10',
    accentColor: '#10b981', // emerald-500
    metaFields: [
      { key: 'company',           label: 'Company',          type: 'text' },
      { key: 'pickupLocation',    label: 'Pick-up',          type: 'text' },
      { key: 'dropoffLocation',   label: 'Drop-off',         type: 'text' },
      { key: 'pickupTime',        label: 'Pick-up Time',     type: 'datetime' },
      { key: 'dropoffTime',       label: 'Drop-off Time',    type: 'datetime' },
      { key: 'confirmationNumber',label: 'Confirmation #',   type: 'text' },
    ],
    deriveName: (meta) => {
      if (meta.company) return `${meta.company} Rental`
      return 'Car Rental'
    },
  },
  train: {
    label: 'Train',
    // Train icon
    icon: 'M12 4v16m-4-4l4 4 4-4M8 4h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2z',
    accentColor: '#f97316', // orange-500
    metaFields: [
      { key: 'operator',          label: 'Operator',         type: 'text' },
      { key: 'departureStation',  label: 'From',             type: 'text' },
      { key: 'arrivalStation',    label: 'To',               type: 'text' },
      { key: 'departureTime',     label: 'Departure',        type: 'datetime' },
      { key: 'arrivalTime',       label: 'Arrival',          type: 'datetime' },
    ],
    deriveName: (meta) => {
      const parts = [meta.departureStation, meta.arrivalStation].filter(Boolean)
      if (parts.length === 2) return `${parts[0]} → ${parts[1]}`
      return meta.operator || 'Train'
    },
  },
  activity: {
    label: 'Activity',
    // Ticket icon
    icon: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 002 2 2 2 0 010 4 2 2 0 00-2 2v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 00-2-2 2 2 0 010-4 2 2 0 002-2V7a2 2 0 00-2-2H5z',
    accentColor: '#ec4899', // pink-500
    metaFields: [
      { key: 'venue',             label: 'Venue',            type: 'text' },
      { key: 'time',              label: 'Time',             type: 'datetime' },
      { key: 'confirmationNumber',label: 'Confirmation #',   type: 'text' },
    ],
    deriveName: (meta) => meta.venue || 'Activity',
  },
  note: {
    label: 'Note',
    // Pencil icon
    icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
    accentColor: '#6b7280', // gray-500
    metaFields: [],
    deriveName: () => 'Note',
  },
}

// Types that can be created via the EntryCreatorSheet (excludes location — that uses LocationPickerSheet)
export const CREATABLE_TYPES = ['flight', 'hotel', 'car_rental', 'train', 'activity', 'note']

// Types that may have a confirmationNumber in meta
export const TYPES_WITH_CONFIRMATION = ['flight', 'hotel', 'car_rental', 'activity']
