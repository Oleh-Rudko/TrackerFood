// Типи прийомів їжі
export type MealType = 'breakfast' | 'lunch' | 'dinner';

// Статус запису
export type MealStatus = 'ate' | 'not_ate' | 'not_marked';

// Запис прийому їжі
export interface MealEntry {
  id?: number;
  period_id: number;
  date: string; // YYYY-MM-DD
  meal_type: MealType;
  ate: boolean;
  price: number;
  created_at?: string;
}

// Період
export interface Period {
  id?: number;
  name?: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  is_active: boolean;
}

// Розклад для одного прийому їжі
export interface ScheduleItem {
  id?: number;
  period_id: number;
  day_of_week: number; // 0=Нд, 1=Пн, ..., 6=Сб
  meal_type: MealType;
  time: string; // HH:MM
}

// Вимкнений день
export interface DisabledDay {
  id?: number;
  period_id: number;
  date: string; // YYYY-MM-DD
}

// Дані для відображення на екрані дня
export interface DayMeals {
  date: string;
  breakfast: MealEntry | null;
  lunch: MealEntry | null;
  dinner: MealEntry | null;
  isDisabled: boolean;
  total: number;
}

// Конфігурація цін
export const MEAL_PRICES = {
  breakfast: 5,
  lunch: 10,
  dinner: {
    default: 7,
    alternative: 10,
  },
} as const;

// Назви прийомів їжі українською
export const MEAL_NAMES: Record<MealType, string> = {
  breakfast: 'Сніданок',
  lunch: 'Обід',
  dinner: 'Вечеря',
};

// Емодзі для прийомів їжі
export const MEAL_ICONS: Record<MealType, string> = {
  breakfast: '🌅',
  lunch: '🌞',
  dinner: '🌙',
};
