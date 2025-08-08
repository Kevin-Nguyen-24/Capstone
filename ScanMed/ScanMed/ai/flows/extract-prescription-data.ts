
'use server';
/**
 * @fileOverview Extracts prescription data from an image by proxying to an external API.
 *
 * - extractPrescriptionData - A function that handles the prescription data extraction process.
 * - ExtractPrescriptionDataInput - The input type for the extractPrescriptionData function.
 * - ExtractPrescriptionDataOutput - The return type for the extractPrescriptionData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractPrescriptionDataInputSchema = z.object({
  prescriptionPhotoDataUri: z
    .string()
    .describe(
      "A photo of the prescription, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractPrescriptionDataInput = z.infer<typeof ExtractPrescriptionDataInputSchema>;

const MedicationEntrySchema = z.object({
    medicine: z.string(),
    dosage: z.string(),
    quantity: z.string().optional(),
    Instruction: z.string().optional(),
    Refill: z.string().optional(),
});

const ExtractPrescriptionDataOutputSchema = z.array(MedicationEntrySchema);
export type ExtractPrescriptionDataOutput = z.infer<typeof ExtractPrescriptionDataOutputSchema>;


export async function extractPrescriptionData(input: ExtractPrescriptionDataInput): Promise<ExtractPrescriptionDataOutput> {
  return extractPrescriptionDataFlow(input);
}


const extractPrescriptionDataFlow = ai.defineFlow(
  {
    name: 'extractPrescriptionDataFlow',
    inputSchema: ExtractPrescriptionDataInputSchema,
    outputSchema: ExtractPrescriptionDataOutputSchema,
  },
  async (input) => {
    const base64Image = input.prescriptionPhotoDataUri.split(',')[1];

    const response = await fetch('https://capstone-982784006177.europe-west1.run.app/predict_prescription', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            image_base64: base64Image,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    return result;
  }
);
