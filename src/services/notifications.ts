import * as Notifications from 'expo-notifications';
import { MealType, MEAL_NAMES, MEAL_PRICES } from '../types';
import { saveMealEntry, getActivePeriod } from './database';

// Категорії notifications
const MEAL_CATEGORY = 'meal-check';
const REMINDER_CATEGORY = 'meal-reminder';
const DINNER_CATEGORY = 'dinner-check';

// Реєстрація категорій з кнопками
export async function registerNotificationCategories(): Promise<void> {
  // Категорія для сніданку/обіду (2 кнопки)
  await Notifications.setNotificationCategoryAsync(MEAL_CATEGORY, [
    {
      identifier: 'ate',
      buttonTitle: '✅ Їв',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'not_ate',
      buttonTitle: '❌ Не їв',
      options: { opensAppToForeground: false },
    },
  ]);

  // Категорія для вечері (3 кнопки)
  await Notifications.setNotificationCategoryAsync(DINNER_CATEGORY, [
    {
      identifier: 'ate_default',
      buttonTitle: `✅ ${MEAL_PRICES.dinner.default} zł`,
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'ate_alternative',
      buttonTitle: `✅ ${MEAL_PRICES.dinner.alternative} zł`,
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'not_ate',
      buttonTitle: '❌ Не їв',
      options: { opensAppToForeground: false },
    },
  ]);

  // Категорія для нагадування (1 кнопка)
  await Notifications.setNotificationCategoryAsync(REMINDER_CATEGORY, [
    {
      identifier: 'ok',
      buttonTitle: 'Ок',
      options: { opensAppToForeground: false },
    },
  ]);
}

// Обробка відповіді на notification
export async function handleNotificationResponse(
  response: Notifications.NotificationResponse
): Promise<void> {
  const actionId = response.actionIdentifier;
  const data = response.notification.request.content.data as {
    mealType?: MealType;
    price?: number;
    isReminder?: boolean;
  };

  // Ігноруємо нагадування
  if (data.isReminder || actionId === 'ok') {
    return;
  }

  // Ігноруємо дефолтну дію (просто натискання на notification)
  if (actionId === Notifications.DEFAULT_ACTION_IDENTIFIER) {
    return;
  }

  const period = await getActivePeriod();
  if (!period?.id || !data.mealType) return;

  const today = new Date().toISOString().split('T')[0];
  let ate = false;
  let price = 0;

  if (actionId === 'ate') {
    ate = true;
    price = data.price || MEAL_PRICES[data.mealType as 'breakfast' | 'lunch'] || 0;
  } else if (actionId === 'ate_default') {
    ate = true;
    price = MEAL_PRICES.dinner.default;
  } else if (actionId === 'ate_alternative') {
    ate = true;
    price = MEAL_PRICES.dinner.alternative;
  } else if (actionId === 'not_ate') {
    ate = false;
    price = 0;
  }

  await saveMealEntry({
    period_id: period.id,
    date: today,
    meal_type: data.mealType,
    ate,
    price,
  });
}

// Відправити тестове notification для прийому їжі
export async function sendTestMealNotification(mealType: MealType): Promise<void> {
  const name = MEAL_NAMES[mealType];
  const isDinner = mealType === 'dinner';
  const price = isDinner ? MEAL_PRICES.dinner.default : MEAL_PRICES[mealType];

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🍽️ ${name}?`,
      categoryIdentifier: isDinner ? DINNER_CATEGORY : MEAL_CATEGORY,
      data: {
        mealType,
        price,
        isReminder: false,
      },
    },
    trigger: null, // Відправити зараз
  });
}

// Відправити тестове нагадування
export async function sendTestReminderNotification(mealType: MealType): Promise<void> {
  const name = MEAL_NAMES[mealType];

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🔔 Скоро ${name.toLowerCase()}!`,
      body: 'Через 5 хвилин',
      categoryIdentifier: REMINDER_CATEGORY,
      data: {
        mealType,
        isReminder: true,
      },
    },
    trigger: null,
  });
}

// Запланувати notification на конкретний час
export async function scheduleMealNotification(
  mealType: MealType,
  hour: number,
  minute: number
): Promise<string> {
  const name = MEAL_NAMES[mealType];
  const isDinner = mealType === 'dinner';
  const price = isDinner ? MEAL_PRICES.dinner.default : MEAL_PRICES[mealType];

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `🍽️ ${name}?`,
      categoryIdentifier: isDinner ? DINNER_CATEGORY : MEAL_CATEGORY,
      data: {
        mealType,
        price,
        isReminder: false,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  return id;
}

// Запланувати нагадування (за 5 хв до їжі)
export async function scheduleReminderNotification(
  mealType: MealType,
  hour: number,
  minute: number
): Promise<string> {
  const name = MEAL_NAMES[mealType];

  // Віднімаємо 5 хвилин
  let reminderHour = hour;
  let reminderMinute = minute - 5;
  if (reminderMinute < 0) {
    reminderMinute = 60 + reminderMinute;
    reminderHour = hour - 1;
    if (reminderHour < 0) {
      reminderHour = 23;
    }
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `🔔 Скоро ${name.toLowerCase()}!`,
      body: 'Через 5 хвилин',
      categoryIdentifier: REMINDER_CATEGORY,
      data: {
        mealType,
        isReminder: true,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: reminderHour,
      minute: reminderMinute,
    },
  });

  return id;
}

// Скасувати всі заплановані notifications
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Отримати всі заплановані notifications
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return await Notifications.getAllScheduledNotificationsAsync();
}
