export type AIProviderValue =
  | 'OpenAI'
  | 'Google'
  | 'Minimax'
  | 'doubao'
  | '腾讯云混元'
  | '智谱GLM'
  | '讯飞星火'
  | 'Moonshot'
  | '阿里云'
  | '百度'
  | '其他';

export const AI_PROVIDER_LABELS = {
  OPENAI: 'OpenAI',
  GOOGLE: 'Google',
  MINIMAX: 'Minimax',
  DOU_BAO: 'Doubao（火山方舟 Ark）',
  TENCENT_HUNYUAN: '腾讯云混元',
  ZHIPU_GLM: '智谱 GLM',
  IFY_SPEECH: '讯飞星火',
  MOONSHOT: 'Moonshot（月之暗面）',
  ALIYUN: '阿里云',
  BAIDU: '百度',
  OTHER: '其他',
} as const;

export const AI_PROVIDER_OPTIONS: { label: string; value: AIProviderValue }[] = [
  { label: AI_PROVIDER_LABELS.OPENAI, value: 'OpenAI' },
  { label: AI_PROVIDER_LABELS.GOOGLE, value: 'Google' },
  { label: AI_PROVIDER_LABELS.MINIMAX, value: 'Minimax' },
  { label: AI_PROVIDER_LABELS.DOU_BAO, value: 'doubao' },
  { label: AI_PROVIDER_LABELS.TENCENT_HUNYUAN, value: '腾讯云混元' },
  { label: AI_PROVIDER_LABELS.ZHIPU_GLM, value: '智谱 GLM' },
  { label: AI_PROVIDER_LABELS.IFY_SPEECH, value: '讯飞星火' },
  { label: AI_PROVIDER_LABELS.MOONSHOT, value: 'Moonshot' },
  { label: AI_PROVIDER_LABELS.ALIYUN, value: '阿里云' },
  { label: AI_PROVIDER_LABELS.BAIDU, value: '百度' },
  { label: AI_PROVIDER_LABELS.OTHER, value: '其他' },
];

export const AI_PROVIDER_VALUE_ENUM: Record<
  AIProviderValue,
  { text: string }
> = {
  OpenAI: { text: AI_PROVIDER_LABELS.OPENAI },
  Google: { text: AI_PROVIDER_LABELS.GOOGLE },
  Minimax: { text: AI_PROVIDER_LABELS.MINIMAX },
  doubao: { text: AI_PROVIDER_LABELS.DOU_BAO },
  腾讯云混元: { text: AI_PROVIDER_LABELS.TENCENT_HUNYUAN },
  '智谱GLM': { text: AI_PROVIDER_LABELS.ZHIPU_GLM },
  讯飞星火: { text: AI_PROVIDER_LABELS.IFY_SPEECH },
  Moonshot: { text: AI_PROVIDER_LABELS.MOONSHOT },
  阿里云: { text: AI_PROVIDER_LABELS.ALIYUN },
  百度: { text: AI_PROVIDER_LABELS.BAIDU },
  其他: { text: AI_PROVIDER_LABELS.OTHER },
};

export const DOU_BAO_PROVIDER_VALUE: AIProviderValue = 'doubao';

export function isDoubaoProvider(
  provider?: string | null | undefined,
): boolean {
  if (!provider) return false;
  return String(provider).toLowerCase().includes('doubao');
}
