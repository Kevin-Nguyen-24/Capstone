export type Medication = {
  name: string;
  dosage: string;
};

export type RegimenStatus = 'Punctual' | 'Late' | 'Missed' | 'Scheduled';

export type RegimenIntake = {
  id: string;
  dateTime: string; // ISO string
  medications: Medication[];
  status: RegimenStatus;
};
