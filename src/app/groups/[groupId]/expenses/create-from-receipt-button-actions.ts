'use server'
import { getCategories } from '@/lib/api'
import { env } from '@/lib/env'
import { formatCategoryForAIPrompt } from '@/lib/utils'
import OpenAI from 'openai'
import { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/index.mjs'
import fs from 'fs'

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

export async function extractExpenseInformationFromImage(imageUrl: string) {
  'use server'
  const categories = await getCategories()

  let file_id;

  // Check if imageUrl indicates a local file
  if (imageUrl.startsWith('local://')) {
    const localFilePath = imageUrl.slice(7); // Remove the 'local://' prefix to get the actual file path
    try {
      const fileUploadResponse = await openai.files.create({
        file: fs.createReadStream(localFilePath),
        purpose: 'fine-tune'  // Change the purpose according to your actual requirement
      });
      file_id = fileUploadResponse.data.id; // Make sure to access the file id correctly depending on the response structure
    } catch (error) {
      console.error("Failed to upload file:", error);
      throw new Error("File upload failed");
    }
  }

  const body: ChatCompletionCreateParamsNonStreaming = {
    model: 'gpt-4-vision-preview',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `
              This image contains a receipt.
              Read the total amount and store it as a non-formatted number without any other text or currency.
              Then guess the category for this receipt amoung the following categories and store its ID: ${categories.map(
                (category) => formatCategoryForAIPrompt(category),
              )}.
              Guess the expense’s date and store it as yyyy-mm-dd.
              Guess a title for the expense.
              Return the amount, the category, the date and the title with just a comma between them, without anything else.`,
          },
        ],
      },
      {
        role: 'user',
        content: file_id ? [{ type: 'file', file_id }] : [{ type: 'image_url', url: imageUrl }],
      },
    ],
  }
  const completion = await openai.chat.completions.create(body)

  const [amountString, categoryId, date, title] = completion.choices
    .at(0)
    ?.message.content?.split(',') ?? [null, null, null, null]
  return { amount: Number(amountString), categoryId, date, title }
}

export type ReceiptExtractedInfo = Awaited<
  ReturnType<typeof extractExpenseInformationFromImage>
>
