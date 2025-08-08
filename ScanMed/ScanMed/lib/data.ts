import type { RegimenIntake } from './types';

const initialRegimens: RegimenIntake[] = [
  {
    id: '1',
    dateTime: new Date(new Date().getTime() - 24 * 60 * 60 * 1000).toISOString(),
    medications: [{ name: 'Centrum', dosage: '20mg' }],
    status: 'Punctual',
  },
  {
    id: '2',
    dateTime: new Date(new Date().getTime() - 12 * 60 * 60 * 1000).toISOString(),
    medications: [
      { name: 'Centrum', dosage: '10mg' },
      { name: 'Magnesium', dosage: '5mg' },
    ],
    status: 'Late',
  },
  {
    id: '3',
    dateTime: new Date(new Date().getTime() - 2 * 60 * 60 * 1000).toISOString(),
    medications: [{ name: 'Coenzyme', dosage: '20mg' }],
    status: 'Missed',
  },
  {
    id: '4',
    dateTime: new Date(new Date().getTime() + 1 * 60 * 60 * 1000).toISOString(),
    medications: [{ name: 'Centrum', dosage: '10mg' }],
    status: 'Scheduled',
  },
  {
    id: '5',
    dateTime: new Date(new Date().getTime() + 8 * 60 * 60 * 1000).toISOString(),
    medications: [
      { name: 'Centrum', dosage: '10mg' },
      { name: 'Magnesium', dosage: '5mg' },
    ],
    status: 'Scheduled',
  },
];

export const getRegimens = (): RegimenIntake[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const storedData = localStorage.getItem('medsmart_regimens');
    if (storedData) {
      return JSON.parse(storedData);
    }
    localStorage.setItem('medsmart_regimens', JSON.stringify(initialRegimens));
    return initialRegimens;
  } catch (error) {
    console.error("Failed to access localStorage for regimens", error);
    return initialRegimens; // Fallback to initial data if localStorage is unavailable
  }
};

export const updateRegimenStatus = (id: string, status: RegimenIntake['status']) => {
  if (typeof window === 'undefined') return [];
  let currentRegimens = getRegimens();
  const index = currentRegimens.findIndex(r => r.id === id);
  if (index !== -1) {
    currentRegimens[index].status = status;
    localStorage.setItem('medsmart_regimens', JSON.stringify(currentRegimens));
  }
  return currentRegimens;
};

export const addRegimens = (newRegimens: Omit<RegimenIntake, 'id' | 'status'>[]) => {
  if (typeof window === 'undefined') return [];
  let currentRegimens = getRegimens();
  const newEntries: RegimenIntake[] = newRegimens.map((r, i) => ({
    ...r,
    id: `new-${Date.now()}-${i}`,
    status: 'Scheduled',
  }));
  const updatedRegimens = [...currentRegimens, ...newEntries].sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  localStorage.setItem('medsmart_regimens', JSON.stringify(updatedRegimens));
  return updatedRegimens;
};