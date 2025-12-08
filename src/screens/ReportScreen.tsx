import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, DateData } from 'react-native-calendars';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getActivePeriod, getEntriesBetweenDates, initDatabase } from '../services/database';
import { MealEntry, Period, MEAL_PRICES } from '../types';

interface DayReport {
  date: string;
  breakfast: boolean | null; // null = not marked
  lunch: boolean | null;
  dinner: boolean | null;
  total: number;
}

// Отримати дефолтний діапазон (16 минулого місяця - 15 поточного)
function getDefaultDateRange(): { start: string; end: string } {
  const today = new Date();
  const currentDay = today.getDate();

  let startDate: Date;
  let endDate: Date;

  if (currentDay >= 16) {
    // Якщо сьогодні 16+ число - беремо з 16 поточного до 15 наступного
    startDate = new Date(today.getFullYear(), today.getMonth(), 16);
    endDate = new Date(today.getFullYear(), today.getMonth() + 1, 15);
  } else {
    // Якщо сьогодні < 16 - беремо з 16 минулого до 15 поточного
    startDate = new Date(today.getFullYear(), today.getMonth() - 1, 16);
    endDate = new Date(today.getFullYear(), today.getMonth(), 15);
  }

  return {
    start: formatDate(startDate),
    end: formatDate(endDate),
  };
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function ReportScreen() {
  const [period, setPeriod] = useState<Period | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [dayReports, setDayReports] = useState<DayReport[]>([]);
  const [totalSum, setTotalSum] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectingDate, setSelectingDate] = useState<'start' | 'end'>('start');

  // Ініціалізація
  useEffect(() => {
    async function init() {
      try {
        await initDatabase();
        const activePeriod = await getActivePeriod();
        setPeriod(activePeriod);

        const defaultRange = getDefaultDateRange();
        setStartDate(defaultRange.start);
        setEndDate(defaultRange.end);
        setIsLoading(false);
      } catch (error) {
        console.error('Init error:', error);
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // Завантаження даних
  const loadData = useCallback(async () => {
    if (!period?.id || !startDate || !endDate) return;

    try {
      const entries = await getEntriesBetweenDates(period.id, startDate, endDate);

      // Генеруємо всі дні в діапазоні
      const days: DayReport[] = [];
      const current = new Date(startDate);
      const end = new Date(endDate);

      while (current <= end) {
        const dateStr = formatDate(current);
        const dayEntries = entries.filter(e => e.date === dateStr);

        const breakfast = dayEntries.find(e => e.meal_type === 'breakfast');
        const lunch = dayEntries.find(e => e.meal_type === 'lunch');
        const dinner = dayEntries.find(e => e.meal_type === 'dinner');

        const total =
          (breakfast?.ate ? breakfast.price : 0) +
          (lunch?.ate ? lunch.price : 0) +
          (dinner?.ate ? dinner.price : 0);

        days.push({
          date: dateStr,
          breakfast: breakfast ? breakfast.ate : null,
          lunch: lunch ? lunch.ate : null,
          dinner: dinner ? dinner.ate : null,
          total,
        });

        current.setDate(current.getDate() + 1);
      }

      setDayReports(days);
      setTotalSum(days.reduce((sum, d) => sum + d.total, 0));
    } catch (error) {
      console.error('Load data error:', error);
    }
  }, [period, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Обробка вибору дати
  const handleDateSelect = (date: DateData) => {
    if (selectingDate === 'start') {
      setStartDate(date.dateString);
    } else {
      setEndDate(date.dateString);
    }
    setShowCalendar(false);
  };

  // Генерація HTML для PDF
  const generateHTML = (): string => {
    const getStatusSymbol = (status: boolean | null): string => {
      if (status === null) return '—';
      return status ? '✓' : '✗';
    };

    const rows = dayReports
      .map(
        day => `
        <tr>
          <td>${formatDisplayDate(day.date)}</td>
          <td class="${day.breakfast === true ? 'yes' : day.breakfast === false ? 'no' : ''}">${getStatusSymbol(day.breakfast)}</td>
          <td class="${day.lunch === true ? 'yes' : day.lunch === false ? 'no' : ''}">${getStatusSymbol(day.lunch)}</td>
          <td class="${day.dinner === true ? 'yes' : day.dinner === false ? 'no' : ''}">${getStatusSymbol(day.dinner)}</td>
          <td class="sum">${day.total} zł</td>
        </tr>
      `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, sans-serif;
            padding: 20px;
          }
          h1 {
            text-align: center;
            color: #333;
            font-size: 18px;
            margin-bottom: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
          }
          th {
            background: #007AFF;
            color: white;
            padding: 10px 5px;
            text-align: center;
          }
          td {
            border: 1px solid #ddd;
            padding: 8px 5px;
            text-align: center;
          }
          tr:nth-child(even) {
            background: #f9f9f9;
          }
          .yes {
            color: #4CAF50;
            font-weight: bold;
          }
          .no {
            color: #f44336;
            font-weight: bold;
          }
          .sum {
            color: #007AFF;
            font-weight: 500;
          }
          .total {
            margin-top: 20px;
            text-align: right;
            font-size: 20px;
            font-weight: bold;
            color: #007AFF;
          }
        </style>
      </head>
      <body>
        <h1>Звіт: ${formatDisplayDate(startDate)} — ${formatDisplayDate(endDate)}</h1>
        <table>
          <tr>
            <th>Дата</th>
            <th>Сніданок</th>
            <th>Обід</th>
            <th>Вечеря</th>
            <th>Сума</th>
          </tr>
          ${rows}
        </table>
        <p class="total">Всього: ${totalSum} zł</p>
      </body>
      </html>
    `;
  };

  // Експорт в PDF
  const handleExport = async () => {
    try {
      const html = generateHTML();
      const { uri } = await Print.printToFileAsync({ html });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Експорт звіту',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Готово', `PDF збережено: ${uri}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Помилка', 'Не вдалося створити PDF');
    }
  };

  // Рендер рядка дня
  const renderDayRow = ({ item }: { item: DayReport }) => {
    const getStatusIcon = (status: boolean | null): string => {
      if (status === null) return '—';
      return status ? '✅' : '❌';
    };

    return (
      <View style={styles.dayRow}>
        <Text style={styles.dayDate}>{formatDisplayDate(item.date)}</Text>
        <Text style={styles.dayMeal}>{getStatusIcon(item.breakfast)}</Text>
        <Text style={styles.dayMeal}>{getStatusIcon(item.lunch)}</Text>
        <Text style={styles.dayMeal}>{getStatusIcon(item.dinner)}</Text>
        <Text style={styles.dayTotal}>{item.total} zł</Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text>Завантаження...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!period) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.noPeriodText}>Немає активного періоду</Text>
          <Text style={styles.noPeriodHint}>Створіть період в налаштуваннях</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Заголовок з діапазоном дат */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => {
            setSelectingDate('start');
            setShowCalendar(true);
          }}
        >
          <Text style={styles.dateButtonText}>{formatDisplayDate(startDate)}</Text>
        </TouchableOpacity>
        <Text style={styles.dateSeparator}>—</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => {
            setSelectingDate('end');
            setShowCalendar(true);
          }}
        >
          <Text style={styles.dateButtonText}>{formatDisplayDate(endDate)}</Text>
        </TouchableOpacity>
      </View>

      {/* Заголовок таблиці */}
      <View style={styles.tableHeader}>
        <Text style={styles.headerDate}>Дата</Text>
        <Text style={styles.headerMeal}>🌅</Text>
        <Text style={styles.headerMeal}>🌞</Text>
        <Text style={styles.headerMeal}>🌙</Text>
        <Text style={styles.headerTotal}>Сума</Text>
      </View>

      {/* Список днів */}
      <FlatList
        data={dayReports}
        keyExtractor={item => item.date}
        renderItem={renderDayRow}
        style={styles.list}
        contentContainerStyle={styles.listContent}
      />

      {/* Підсумок */}
      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Всього:</Text>
          <Text style={styles.totalValue}>{totalSum} zł</Text>
        </View>
        <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
          <Text style={styles.exportButtonText}>📄 Експорт в PDF</Text>
        </TouchableOpacity>
      </View>

      {/* Модальне вікно з календарем */}
      <Modal visible={showCalendar} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectingDate === 'start' ? 'Початкова дата' : 'Кінцева дата'}
            </Text>
            <Calendar
              onDayPress={handleDateSelect}
              markedDates={{
                [selectingDate === 'start' ? startDate : endDate]: {
                  selected: true,
                  selectedColor: '#007AFF',
                },
              }}
              theme={{
                todayTextColor: '#007AFF',
                selectedDayBackgroundColor: '#007AFF',
                arrowColor: '#007AFF',
              }}
            />
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowCalendar(false)}
            >
              <Text style={styles.modalCloseText}>Закрити</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dateButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  dateButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  dateSeparator: {
    fontSize: 18,
    marginHorizontal: 10,
    color: '#666',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#e8e8e8',
  },
  headerDate: {
    flex: 2,
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  headerMeal: {
    flex: 1,
    fontSize: 16,
    textAlign: 'center',
  },
  headerTotal: {
    flex: 1.2,
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textAlign: 'right',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 10,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dayDate: {
    flex: 2,
    fontSize: 14,
    color: '#333',
  },
  dayMeal: {
    flex: 1,
    fontSize: 16,
    textAlign: 'center',
  },
  dayTotal: {
    flex: 1.2,
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    textAlign: 'right',
  },
  footer: {
    backgroundColor: '#fff',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
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
  exportButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 15,
    color: '#333',
  },
  modalCloseButton: {
    marginTop: 15,
    paddingVertical: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#666',
  },
});
