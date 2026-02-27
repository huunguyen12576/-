import { GoogleGenAI } from "@google/genai";

export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9" | "1:4" | "1:8" | "4:1" | "8:1";
export type ImageSize = "512px" | "1K" | "2K" | "4K";

export interface GenerateImageParams {
  prompt: string;
  model: "gemini-2.5-flash-image" | "gemini-3.1-flash-image-preview";
  aspectRatio: AspectRatio;
  imageSize?: ImageSize;
  apiKey: string;
}

export interface EditImageParams {
  prompt: string;
  image: string; // base64
  model: "gemini-2.5-flash-image";
  apiKey: string;
}

export async function generateImage(params: GenerateImageParams): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: params.apiKey });
  
  const config: any = {
    imageConfig: {
      aspectRatio: params.aspectRatio,
    }
  };

  if (params.model === "gemini-3.1-flash-image-preview" && params.imageSize) {
    config.imageConfig.imageSize = params.imageSize;
  }

  const response = await ai.models.generateContent({
    model: params.model,
    contents: {
      parts: [{ text: params.prompt }]
    },
    config
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image generated");
}

export async function editImage(params: EditImageParams): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: params.apiKey });

  // Remove data:image/png;base64, prefix if present
  const base64Data = params.image.replace(/^data:image\/\w+;base64,/, "");

  const response = await ai.models.generateContent({
    model: params.model,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: "image/png",
            data: base64Data
          }
        },
        { text: params.prompt }
      ]
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No edited image generated");
}
