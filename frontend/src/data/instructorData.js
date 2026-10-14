// What an instructor can be responsible for. The values are the backend's codes
// (users.responsibility); the backend checks them against the same list
// (INSTRUCTOR_RESPONSIBILITIES in backend/utils/validationUtils.js).
export const responsibilityOptions = [
  { value: 'VAN', label: 'Van' },
  { value: 'MOTOR_BIKE', label: 'Motor Bike' },
  { value: 'THREE_WHEELER', label: 'Three Wheeler' },
  { value: 'BUS', label: 'Bus' },
  { value: 'TRACTOR', label: 'Tractor' },
]

// 'MOTOR_BIKE' -> 'Motor Bike'; null for an instructor who has not been given one yet
export const getResponsibilityLabel = (value) =>
  responsibilityOptions.find((option) => option.value === value)?.label ?? null
