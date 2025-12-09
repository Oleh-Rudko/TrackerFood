import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, AppState, AppStateStatus } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DateNavigator } from '../components/DateNavigator';
import { MealCard } from '../components/MealCard';
import {
  initDatabase,
  getActivePeriod,
  getDayMeals,
  saveMealEntry,
  isDayDisabled,
  createPeriod,
} from '../services/database';
import { DayMeals, MealType, Period, MEAL_PRICES } from '../types';

// Форматування дати в YYYY-MM-DD
function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Перевірка чи дата сьогодні або в минулому
function isDateNotInFuture(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate <= today;
}

// Перевірка чи дата в межах періоду
function isDateInPeriod(date: Date, period: Period): boolean {
  const dateStr = formatDateString(date);
  return dateStr >= period.start_date && dateStr <= period.end_date;
}

export function HomeScreen() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [period, setPeriod] = useState<Period | null>(null);
  const [dayMeals, setDayMeals] = useState<DayMeals | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Ініціалізація
  useEffect(() => {
    async function init() {
      try {
        await initDatabase();
        let activePeriod = await getActivePeriod();

        // Якщо немає активного періоду - створюємо тестовий
        if (!activePeriod) {
          const today = new Date();
          const startDate = new Date(today);
          startDate.setMonth(startDate.getMonth() - 1);
          const endDate = new Date(today);
          endDate.setMonth(endDate.getMonth() + 1);

          const periodId = await createPeriod({
            name: 'Тестовий період',
            start_date: formatDateString(startDate),
            end_date: formatDateString(endDate),
            is_active: true,
          });

          activePeriod = {
            id: periodId,
            name: 'Тестовий період',
            start_date: formatDateString(startDate),
            end_date: formatDateString(endDate),
            is_active: true,
          };
        }

        setPeriod(activePeriod);
        setIsLoading(false);
      } catch (error) {
        console.error('Init error:', error);
        Alert.alert('Помилка', 'Не вдалося ініціалізувати базу даних');
      }
    }
    init();
  }, []);

  // Завантаження даних дня
  const loadDayData = useCallback(async () => {
    if (!period?.id) return;

    try {
      const dateStr = formatDateString(currentDate);
      const meals = await getDayMeals(period.id, dateStr);
      setDayMeals(meals);
    } catch (error) {
      console.error('Load day error:', error);
    }
  }, [currentDate, period]);

  useEffect(() => {
    loadDayData();
  }, [loadDayData]);

  // Оновлюємо дату і дані коли додаток повертається у фокус
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // Оновлюємо дату на сьогоднішню
        const today = new Date();
        const currentDateStr = formatDateString(currentDate);
        const todayStr = formatDateString(today);

        if (currentDateStr !== todayStr) {
          // Якщо дата змінилась - оновлюємо на сьогодні
          setCurrentDate(today);
        } else {
          // Якщо та сама дата - просто перезавантажуємо дані
          loadDayData();
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [loadDayData, currentDate]);

  // Обробка зміни статусу їжі
  const handleMealToggle = async (mealType: MealType, ate: boolean, price?: number) => {
    if (!period?.id) return;

    try {
      const dateStr = formatDateString(currentDate);
      const finalPrice = ate ? (price ?? MEAL_PRICES[mealType === 'dinner' ? 'dinner' : mealType]) : 0;

      await saveMealEntry({
        period_id: period.id,
        date: dateStr,
        meal_type: mealType,
        ate,
        price: typeof finalPrice === 'object' ? finalPrice.default : finalPrice,
      });

      await loadDayData();
    } catch (error) {
      console.error('Save meal error:', error);
      Alert.alert('Помилка', 'Не вдалося зберегти');
    }
  };

  // Навігація по датам
  const goToPreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);

    if (period && isDateInPeriod(newDate, period)) {
      setCurrentDate(newDate);
    }
  };

  const goToNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);

    if (isDateNotInFuture(newDate) && period && isDateInPeriod(newDate, period)) {
      setCurrentDate(newDate);
    }
  };

  // Чи можна перейти на наступний день
  const canGoNext = (): boolean => {
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 1);
    return isDateNotInFuture(nextDate) && (period ? isDateInPeriod(nextDate, period) : false);
  };

  // Якщо немає періоду
  if (!period) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.noPeriodContainer}>
          <Text style={styles.noPeriodText}>
            {isLoading ? 'Завантаження...' : 'Немає активного періоду'}
          </Text>
          <Text style={styles.noPeriodHint}>
            Створіть період в налаштуваннях
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Перевірка чи дата в межах періоду
  const isInPeriod = isDateInPeriod(currentDate, period);

  return (
    <SafeAreaView style={styles.container}>
      <DateNavigator
        date={currentDate}
        onPrevious={goToPreviousDay}
        onNext={goToNextDay}
        canGoNext={canGoNext()}
      />

      {!isInPeriod ? (
        <View style={styles.outOfPeriodContainer}>
          <Text style={styles.outOfPeriodText}>Ця дата поза межами періоду</Text>
          <Text style={styles.periodInfo}>
            Період: {period.start_date} — {period.end_date}
          </Text>
        </View>
      ) : (
        <View style={styles.mealsContainer}>
          {dayMeals?.isDisabled ? (
            <View style={styles.disabledDayContainer}>
              <Text style={styles.disabledDayText}>🚫 Цей день вимкнено</Text>
            </View>
          ) : null}

          <MealCard
            mealType="breakfast"
            entry={dayMeals?.breakfast || null}
            isDisabled={dayMeals?.isDisabled || false}
            onToggle={(ate, price) => handleMealToggle('breakfast', ate, price)}
          />

          <MealCard
            mealType="lunch"
            entry={dayMeals?.lunch || null}
            isDisabled={dayMeals?.isDisabled || false}
            onToggle={(ate, price) => handleMealToggle('lunch', ate, price)}
          />

          <MealCard
            mealType="dinner"
            entry={dayMeals?.dinner || null}
            isDisabled={dayMeals?.isDisabled || false}
            onToggle={(ate, price) => handleMealToggle('dinner', ate, price)}
          />

          {/* Сума за день */}
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Всього:</Text>
            <Text style={styles.totalValue}>{dayMeals?.total || 0} zł</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  mealsContainer: {
    flex: 1,
    paddingTop: 10,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    marginHorizontal: 15,
    marginTop: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  noPeriodContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noPeriodText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  noPeriodHint: {
    fontSize: 14,
    color: '#999',
  },
  outOfPeriodContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  outOfPeriodText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  periodInfo: {
    fontSize: 14,
    color: '#999',
  },
  disabledDayContainer: {
    backgroundColor: '#fff3e0',
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  disabledDayText: {
    fontSize: 16,
    color: '#f57c00',
    fontWeight: '500',
  },
});
