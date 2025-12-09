import * as SQLite from 'expo-sqlite';
import { MealEntry, Period, ScheduleItem, DisabledDay, MealType, DayMeals, MEAL_PRICES } from '../types';

let db: SQLite.SQLiteDatabase | null = null;

// Ініціалізація бази даних
export async function initDatabase(): Promise<void> {
  db = await SQLite.openDatabaseAsync('mealtracker.db');

  // Створення таблиць
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS periods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS schedule (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      period_id INTEGER NOT NULL,
      day_of_week INTEGER NOT NULL,
      meal_type TEXT NOT NULL,
      time TEXT NOT NULL,
      FOREIGN KEY (period_id) REFERENCES periods(id)
    );

    CREATE TABLE IF NOT EXISTS meal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      period_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      meal_type TEXT NOT NULL,
      ate INTEGER NOT NULL,
      price REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (period_id) REFERENCES periods(id),
      UNIQUE(period_id, date, meal_type)
    );

    CREATE TABLE IF NOT EXISTS disabled_days (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      period_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      FOREIGN KEY (period_id) REFERENCES periods(id),
      UNIQUE(period_id, date)
    );
  `);
}

// ============ PERIODS ============

// Отримати активний період
export async function getActivePeriod(): Promise<Period | null> {
  if (!db) return null;
  const result = await db.getFirstAsync<Period>(
    'SELECT * FROM periods WHERE is_active = 1 LIMIT 1'
  );
  return result || null;
}

// Створити новий період
export async function createPeriod(period: Omit<Period, 'id'>): Promise<number> {
  if (!db) throw new Error('Database not initialized');

  // Деактивуємо попередній активний період
  await db.runAsync('UPDATE periods SET is_active = 0 WHERE is_active = 1');

  const result = await db.runAsync(
    'INSERT INTO periods (name, start_date, end_date, is_active) VALUES (?, ?, ?, ?)',
    [period.name || null, period.start_date, period.end_date, period.is_active ? 1 : 0]
  );
  return result.lastInsertRowId;
}

// Оновити період
export async function updatePeriod(id: number, period: Partial<Period>): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (period.name !== undefined) {
    fields.push('name = ?');
    values.push(period.name || null);
  }
  if (period.start_date !== undefined) {
    fields.push('start_date = ?');
    values.push(period.start_date);
  }
  if (period.end_date !== undefined) {
    fields.push('end_date = ?');
    values.push(period.end_date);
  }
  if (period.is_active !== undefined) {
    fields.push('is_active = ?');
    values.push(period.is_active ? 1 : 0);
  }

  if (fields.length > 0) {
    values.push(id);
    await db.runAsync(`UPDATE periods SET ${fields.join(', ')} WHERE id = ?`, values);
  }
}

// ============ MEAL ENTRIES ============

// Отримати запис для конкретного дня і типу їжі
export async function getMealEntry(
  periodId: number,
  date: string,
  mealType: MealType
): Promise<MealEntry | null> {
  if (!db) return null;
  const result = await db.getFirstAsync<MealEntry>(
    'SELECT * FROM meal_entries WHERE period_id = ? AND date = ? AND meal_type = ?',
    [periodId, date, mealType]
  );
  return result || null;
}

// Отримати всі записи за день
export async function getDayEntries(periodId: number, date: string): Promise<MealEntry[]> {
  if (!db) return [];
  const results = await db.getAllAsync<MealEntry>(
    'SELECT * FROM meal_entries WHERE period_id = ? AND date = ?',
    [periodId, date]
  );
  return results;
}

// Зберегти/оновити запис
export async function saveMealEntry(entry: Omit<MealEntry, 'id' | 'created_at'>): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  await db.runAsync(
    `INSERT INTO meal_entries (period_id, date, meal_type, ate, price)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(period_id, date, meal_type) DO UPDATE SET
     ate = excluded.ate,
     price = excluded.price`,
    [entry.period_id, entry.date, entry.meal_type, entry.ate ? 1 : 0, entry.price]
  );
}

// Отримати всі записи за період дат
export async function getEntriesBetweenDates(
  periodId: number,
  startDate: string,
  endDate: string
): Promise<MealEntry[]> {
  if (!db) return [];
  const results = await db.getAllAsync<MealEntry>(
    'SELECT * FROM meal_entries WHERE period_id = ? AND date >= ? AND date <= ? ORDER BY date, meal_type',
    [periodId, startDate, endDate]
  );
  return results;
}

// ============ DISABLED DAYS ============

// Перевірити чи день вимкнений
export async function isDayDisabled(periodId: number, date: string): Promise<boolean> {
  if (!db) return false;
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM disabled_days WHERE period_id = ? AND date = ?',
    [periodId, date]
  );
  return (result?.count || 0) > 0;
}

// Вимкнути день
export async function disableDay(periodId: number, date: string): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  await db.runAsync(
    'INSERT OR IGNORE INTO disabled_days (period_id, date) VALUES (?, ?)',
    [periodId, date]
  );
}

// Увімкнути день
export async function enableDay(periodId: number, date: string): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  await db.runAsync(
    'DELETE FROM disabled_days WHERE period_id = ? AND date = ?',
    [periodId, date]
  );
}

// Отримати всі вимкнені дні для періоду
export async function getDisabledDays(periodId: number): Promise<string[]> {
  if (!db) return [];
  const results = await db.getAllAsync<{ date: string }>(
    'SELECT date FROM disabled_days WHERE period_id = ?',
    [periodId]
  );
  return results.map(r => r.date);
}

// ============ SCHEDULE ============

// Отримати розклад для періоду
export async function getSchedule(periodId: number): Promise<ScheduleItem[]> {
  if (!db) return [];
  const results = await db.getAllAsync<ScheduleItem>(
    'SELECT * FROM schedule WHERE period_id = ? ORDER BY day_of_week, meal_type',
    [periodId]
  );
  return results;
}

// Отримати розклад для конкретного дня тижня
export async function getScheduleForDay(periodId: number, dayOfWeek: number): Promise<ScheduleItem[]> {
  if (!db) return [];
  const results = await db.getAllAsync<ScheduleItem>(
    'SELECT * FROM schedule WHERE period_id = ? AND day_of_week = ? ORDER BY time',
    [periodId, dayOfWeek]
  );
  return results;
}

// Зберегти пункт розкладу
export async function saveScheduleItem(item: Omit<ScheduleItem, 'id'>): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  // Видаляємо старий запис для цього дня/типу їжі
  await db.runAsync(
    'DELETE FROM schedule WHERE period_id = ? AND day_of_week = ? AND meal_type = ?',
    [item.period_id, item.day_of_week, item.meal_type]
  );

  // Додаємо новий
  await db.runAsync(
    'INSERT INTO schedule (period_id, day_of_week, meal_type, time) VALUES (?, ?, ?, ?)',
    [item.period_id, item.day_of_week, item.meal_type, item.time]
  );
}

// Видалити пункт розкладу
export async function deleteScheduleItem(
  periodId: number,
  dayOfWeek: number,
  mealType: string
): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  await db.runAsync(
    'DELETE FROM schedule WHERE period_id = ? AND day_of_week = ? AND meal_type = ?',
    [periodId, dayOfWeek, mealType]
  );
}

// Видалити весь розклад для періоду
export async function clearSchedule(periodId: number): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  await db.runAsync('DELETE FROM schedule WHERE period_id = ?', [periodId]);
}

// ============ HELPERS ============

// Отримати дані для відображення дня
export async function getDayMeals(periodId: number, date: string): Promise<DayMeals> {
  const entries = await getDayEntries(periodId, date);
  const isDisabled = await isDayDisabled(periodId, date);

  const breakfast = entries.find(e => e.meal_type === 'breakfast') || null;
  const lunch = entries.find(e => e.meal_type === 'lunch') || null;
  const dinner = entries.find(e => e.meal_type === 'dinner') || null;

  const total = entries.reduce((sum, e) => sum + (e.ate ? e.price : 0), 0);

  return {
    date,
    breakfast,
    lunch,
    dinner,
    isDisabled,
    total,
  };
}

// Підрахувати суму за період
export async function calculateTotalForPeriod(
  periodId: number,
  startDate: string,
  endDate: string
): Promise<number> {
  if (!db) return 0;
  const result = await db.getFirstAsync<{ total: number }>(
    'SELECT SUM(price) as total FROM meal_entries WHERE period_id = ? AND date >= ? AND date <= ? AND ate = 1',
    [periodId, startDate, endDate]
  );
  return result?.total || 0;
}
