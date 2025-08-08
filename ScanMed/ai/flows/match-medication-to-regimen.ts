'use server';
/**
 * @fileOverview Matches a photo of medications to a prescribed regimen.
 *
 * - matchMedicationToRegimen - A function that handles the medication matching process.
 * - MatchMedicationToRegimenInput - The input type for the matchMedicationToRegimen function.
 * - MatchMedicationToRegimenOutput - The return type for the matchMedicationToRegimen function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MatchMedicationToRegimenInputSchema = z.object({
  medicationPhotoDataUri: z
    .string()
    .describe(
      "A photo of the medications, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  medicationList: z.array(z.string()).describe('A list of prescribed medication names.'),
});
export type MatchMedicationToRegimenInput = z.infer<typeof MatchMedicationToRegimenInputSchema>;

const MatchMedicationToRegimenOutputSchema = z.object({
  matchStatus: z.string().describe('The status of the medication matching (Match, Mismatch, Partial Match).'),
  annotatedImage: z.string().describe('An annotated image highlighting the medications.'),
});
export type MatchMedicationToRegimenOutput = z.infer<typeof MatchMedicationToRegimenOutputSchema>;

export async function matchMedicationToRegimen(input: MatchMedicationToRegimenInput): Promise<MatchMedicationToRegimenOutput> {
  return matchMedicationToRegimenFlow(input);
}

const prompt = ai.definePrompt({
  name: 'matchMedicationToRegimenPrompt',
  input: {schema: MatchMedicationToRegimenInputSchema},
  output: {schema: MatchMedicationToRegimenOutputSchema},
  prompt: `You are an expert pharmacist specializing in verifying medication regimens.

You will use the following information to determine if the medications in the photo match the prescribed medication list.

Medication List: {{{medicationList}}}

Photo: {{media url=medicationPhotoDataUri}}

Based on the photo and the medication list, determine the match status (Match, Mismatch, Partial Match) and provide an annotated image highlighting the medications.

Ensure that the annotated image clearly identifies each medication in the photo and indicates whether it matches a medication in the provided list.

Return the match status and the annotated image.
`,
});

const matchMedicationToRegimenFlow = ai.defineFlow(
  {
    name: 'matchMedicationToRegimenFlow',
    inputSchema: MatchMedicationToRegimenInputSchema,
    outputSchema: MatchMedicationToRegimenOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
