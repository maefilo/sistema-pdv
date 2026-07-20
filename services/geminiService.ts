import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { GEMINI_MODEL_TEXT } from '../constants';
import { formatCurrency } from '../utils/currencyFormatter';

const getGeminiClient = (apiKey?: string) => {
  const key = apiKey || process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!key) {
    console.error("A chave da API Gemini não está definida.");
    return null;
  }
  return new GoogleGenAI({ apiKey: key });
};

/**
 * Gera uma descrição de produto usando a API Gemini.
 * @param productName O nome do produto.
 * @param keywords Palavras-chave opcionais para incluir na descrição.
 * @returns Uma Promise que resolve com a string da descrição gerada.
 */
export const generateProductDescription = async (
  productName: string,
  apiKey?: string,
  model?: string,
  keywords?: string
): Promise<string> => {
  const ai = getGeminiClient(apiKey);
  if (!ai) {
    return 'Erro: Chave de API não configurada para gerar descrição.';
  }

  const prompt = `Gere uma descrição de produto criativa e comercial para "${productName}". Inclua detalhes sobre tecido, estilo e para quem se destina. ${
    keywords ? `Palavras-chave: ${keywords}.` : ''
  } A descrição deve ter no máximo 100 palavras.`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model || GEMINI_MODEL_TEXT,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        temperature: 0.9,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 200, // Limit output to prevent overly long descriptions
        thinkingConfig: { thinkingBudget: 50 }, // Allocate tokens for thinking
      },
    });

    const text = response.text;
    if (text) {
      return text.trim();
    } else {
      console.warn('A API Gemini não retornou texto para a descrição do produto.');
      return 'Não foi possível gerar uma descrição no momento. Tente novamente.';
    }
  } catch (error) {
    console.error('Erro ao gerar descrição de produto com a API Gemini:', error);
    return 'Ocorreu um erro ao gerar a descrição do produto. Verifique a chave da API ou tente novamente mais tarde.';
  }
};

/**
 * Resume um texto de relatório usando a API Gemini.
 * @param reportText O conteúdo de texto do relatório para resumir.
 * @returns Uma Promise que resolve com a string do texto resumido.
 */
export const summarizeReport = async (
  reportText: string,
  apiKey?: string,
  model?: string
): Promise<string> => {
  const ai = getGeminiClient(apiKey);
  if (!ai) {
    return 'Erro: Chave de API não configurada para resumir relatório.';
  }

  const prompt = `Resuma o seguinte relatório de atividades de vendas e pedidos em um parágrafo conciso, destacando os pontos mais importantes, como total de vendas, valor de ordens de serviço, custos de produção, número de pedidos e itens populares. Relatório:\n\n${reportText}`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model || GEMINI_MODEL_TEXT,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        temperature: 0.7,
        topK: 40,
        topP: 0.9,
        maxOutputTokens: 200, // Limit output for conciseness
        thinkingConfig: { thinkingBudget: 50 }, // Allocate tokens for thinking
      },
    });

    const text = response.text;
    if (text) {
      return text.trim();
    } else {
      console.warn('A API Gemini não retornou texto para o resumo do relatório.');
      return 'Não foi possível gerar um resumo para o relatório.';
    }
  } catch (error) {
    console.error('Erro ao resumir relatório com a API Gemini:', error);
    return 'Ocorreu um erro ao resumir o relatório. Verifique a chave da API ou tente novamente mais tarde.';
  }
};