export const AI_MODEL_TEMPERATURE_CONFIG = {
  MIN: 0,
  MAX: 2,
  STEP: 0.1,
  DEFAULT: 0.7,
  MARKS: {
    0: '0',
    0.7: '0.7',
    1: '1',
    2: '2',
  } as Record<number, string>,
};

export const AI_MODEL_MAX_TOKENS_CONFIG = {
  MIN: 1,
  MAX: 8000,
  DEFAULT: 2000,
};

export const AI_MODEL_TIMEOUT_CONFIG = {
  MIN: 5,
  MAX: 300,
  DEFAULT: 30,
};
