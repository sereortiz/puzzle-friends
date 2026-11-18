import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { imageBase64, mimeType } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'Imagem não enviada' }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `Você é um especialista em catalogação de quebra-cabeças (jigsaw puzzles).
Analise a foto desta caixa de quebra-cabeça e extraia as seguintes informações em formato JSON estrito, sem nenhum texto adicional ou crases de markdown:
{
  "title": "Título oficial do quebra-cabeça em português (se estiver em inglês na caixa, mantenha o original ou tradução conhecida)",
  "brand": "Nome do fabricante/marca (ex: Grow, Toyster, Ravensburger, Clementoni, Game Office, Pais & Filhos, Estrela, etc. Se não tiver certeza, coloque 'Outra')",
  "pieces": 1000
}
Regras:
- "pieces" deve ser apenas um número inteiro (ex: 500, 1000, 1500, 2000, 3000, 300). Se não conseguir ler o número de peças na caixa, retorne 1000.
- Se não conseguir ler o título, descreva brevemente a imagem da caixa.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        prompt,
        {
          inlineData: {
            data: imageBase64,
            mimeType: mimeType || 'image/jpeg'
          }
        }
      ]
    });

    const rawText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
    const puzzleData = JSON.parse(rawText);

    return NextResponse.json(puzzleData);
  } catch (error) {
    console.error('Erro ao analisar caixa:', error);
    return NextResponse.json(
      { error: 'Não foi possível ler a caixa automaticamente. Preencha manualmente.' },
      { status: 500 }
    );
  }
}
