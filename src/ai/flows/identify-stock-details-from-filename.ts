'use server';
/**
 * @fileOverview Identifies the stock ticker symbol and Japanese company name from a filename using the Gemini API.
 *
 * - identifyStockDetailsFromFilename - A function that extracts stock details from a filename.
 * - IdentifyStockDetailsInput - The input type for the identifyStockDetailsFromFilename function.
 * - IdentifyStockDetailsOutput - The return type for the identifyStockDetailsFromFilename function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IdentifyStockDetailsInputSchema = z.object({
  filename: z.string().describe('The name of the file containing stock data.'),
});
export type IdentifyStockDetailsInput = z.infer<typeof IdentifyStockDetailsInputSchema>;

const IdentifyStockDetailsOutputSchema = z.object({
  tickerSymbol: z.string().describe('The official ticker symbol of the stock.'),
  companyNameJapanese: z.string().describe('The Japanese company name of the stock.'),
});
export type IdentifyStockDetailsOutput = z.infer<typeof IdentifyStockDetailsOutputSchema>;

export async function identifyStockDetailsFromFilename(
  input: IdentifyStockDetailsInput
): Promise<IdentifyStockDetailsOutput> {
  return identifyStockDetailsFromFilenameFlow(input);
}

const prompt = ai.definePrompt({
  name: 'identifyStockDetailsFromFilenamePrompt',
  input: {schema: IdentifyStockDetailsInputSchema},
  output: {schema: IdentifyStockDetailsOutputSchema},
  prompt: `You are a financial data expert. Your task is to identify the ticker symbol and Japanese company name from a given filename.

Filename: {{{filename}}}

Provide the ticker symbol and Japanese company name in the following JSON format:
\{
  "tickerSymbol": "<ticker_symbol>",
  "companyNameJapanese": "<company_name_in_japanese>"
\}`,
});

const identifyStockDetailsFromFilenameFlow = ai.defineFlow(
  {
    name: 'identifyStockDetailsFromFilenameFlow',
    inputSchema: IdentifyStockDetailsInputSchema,
    outputSchema: IdentifyStockDetailsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
