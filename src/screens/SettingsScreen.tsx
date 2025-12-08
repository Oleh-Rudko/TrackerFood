import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, DateData } from 'react-native-calendars';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  initDatabase,
  getActivePeriod,
  createPeriod,
  updatePeriod,
  getSchedule,
  saveScheduleItem,
  getDisabledDays,
  disableDay,
  enableDay,
} from '../services/database';
import { syncNotificationsWithSchedule } from '../services/notifications';
import { Period, ScheduleItem, MealType, MEAL_NAMES, MEAL_ICONS } from '../types';

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatTime(timeStr: string): string {
  return timeStr || '--:--';
}

function timeToDate(timeStr: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date;
}

function dateToTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

const DAY_NAMES = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MEALS: MealType[] = ['breakfast', 'lunch', 'dinner'];

// Дефолтні часи
const DEFAULT_TIMES: Record<MealType, string> = {
  breakfast: '08:00',
  lunch: '13:00',
  dinner: '19:00',
};

export function SettingsScreen() {
  const [period, setPeriod] = useState<Period | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingField, setEditingField] = useState<'start' | 'end' | 'name'>('start');
  const [tempName, setTempName] = useState('');
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectingDate, setSelectingDate] = useState<'start' | 'end'>('start');

  // Розклад
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<{
    dayOfWeek: number;
    mealType: MealType;
  } | null>(null);
  const [tempTime, setTempTime] = useState(new Date());

  // Вимкнені дні
  const [disabledDays, setDisabledDays] = useState<string[]>([]);
  const [showDisabledCalendar, setShowDisabledCalendar] = useState(false);

  // Завантаження даних
  useEffect(() => {
    loadPeriod();
  }, []);

  const loadPeriod = async () => {
    try {
      await initDatabase();
      const activePeriod = await getActivePeriod();
      setPeriod(activePeriod);
      if (activePeriod) {
        setTempName(activePeriod.name || '');
        setTempStartDate(activePeriod.start_date);
        setTempEndDate(activePeriod.end_date);
        // Завантажуємо розклад
        const periodSchedule = await getSchedule(activePeriod.id!);
        setSchedule(periodSchedule);
        // Завантажуємо вимкнені дні
        const disabled = await getDisabledDays(activePeriod.id!);
        setDisabledDays(disabled);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Load period error:', error);
      setIsLoading(false);
    }
  };

  // Отримати час для конкретного дня і типу їжі
  const getTimeForMeal = (dayOfWeek: number, mealType: MealType): string | null => {
    const item = schedule.find(
      s => s.day_of_week === dayOfWeek && s.meal_type === mealType
    );
    return item?.time || null;
  };

  // Відкрити time picker
  const openTimePicker = (dayOfWeek: number, mealType: MealType) => {
    const currentTime = getTimeForMeal(dayOfWeek, mealType);
    setEditingSchedule({ dayOfWeek, mealType });
    setTempTime(currentTime ? timeToDate(currentTime) : timeToDate(DEFAULT_TIMES[mealType]));
    setShowTimePicker(true);
  };

  // Обробка зміни часу
  const handleTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedDate && editingSchedule) {
      setTempTime(selectedDate);
    }
  };

  // Зберегти час
  const saveTime = async () => {
    if (!period?.id || !editingSchedule) return;

    const timeStr = dateToTime(tempTime);

    try {
      await saveScheduleItem({
        period_id: period.id,
        day_of_week: editingSchedule.dayOfWeek,
        meal_type: editingSchedule.mealType,
        time: timeStr,
      });

      // Оновлюємо локальний стан
      setSchedule(prev => {
        const filtered = prev.filter(
          s =>
            !(
              s.day_of_week === editingSchedule.dayOfWeek &&
              s.meal_type === editingSchedule.mealType
            )
        );
        return [
          ...filtered,
          {
            period_id: period.id!,
            day_of_week: editingSchedule.dayOfWeek,
            meal_type: editingSchedule.mealType,
            time: timeStr,
          },
        ];
      });

      // Синхронізуємо notifications з розкладом
      await syncNotificationsWithSchedule();

      setShowTimePicker(false);
      setEditingSchedule(null);
    } catch (error) {
      Alert.alert('Помилка', 'Не вдалося зберегти час');
    }
  };

  // Toggle вимкненого дня
  const toggleDisabledDay = async (dateString: string) => {
    if (!period?.id) return;

    // Перевірка чи дата в межах періоду
    if (dateString < period.start_date || dateString > period.end_date) {
      return;
    }

    try {
      const isDisabled = disabledDays.includes(dateString);
      if (isDisabled) {
        await enableDay(period.id, dateString);
        setDisabledDays(prev => prev.filter(d => d !== dateString));
      } else {
        await disableDay(period.id, dateString);
        setDisabledDays(prev => [...prev, dateString]);
      }
    } catch (error) {
      Alert.alert('Помилка', 'Не вдалося змінити статус дня');
    }
  };

  // Створити новий період
  const handleCreatePeriod = async () => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setMonth(startDate.getMonth() - 1);
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 3);

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    try {
      const id = await createPeriod({
        name: 'Новий період',
        start_date: startStr,
        end_date: endStr,
        is_active: true,
      });

      const newPeriod: Period = {
        id,
        name: 'Новий період',
        start_date: startStr,
        end_date: endStr,
        is_active: true,
      };

      setPeriod(newPeriod);
      setTempName(newPeriod.name || '');
      setTempStartDate(newPeriod.start_date);
      setTempEndDate(newPeriod.end_date);
    } catch (error) {
      console.error('Create period error:', error);
      Alert.alert('Помилка', 'Не вдалося створити період');
    }
  };

  // Відкрити редагування назви
  const openEditName = () => {
    setEditingField('name');
    setShowEditModal(true);
  };

  // Відкрити вибір дати
  const openDatePicker = (field: 'start' | 'end') => {
    setSelectingDate(field);
    setShowCalendar(true);
  };

  // Обробка вибору дати
  const handleDateSelect = (date: DateData) => {
    if (selectingDate === 'start') {
      setTempStartDate(date.dateString);
    } else {
      setTempEndDate(date.dateString);
    }
    setShowCalendar(false);
  };

  // Зберегти назву
  const saveName = async () => {
    if (!period?.id) return;
    try {
      await updatePeriod(period.id, { name: tempName });
      setPeriod({ ...period, name: tempName });
      setShowEditModal(false);
    } catch (error) {
      Alert.alert('Помилка', 'Не вдалося зберегти назву');
    }
  };

  // Зберегти дати
  const saveDates = async () => {
    if (!period?.id) return;

    if (tempStartDate >= tempEndDate) {
      Alert.alert('Помилка', 'Дата початку має бути раніше дати кінця');
      return;
    }

    try {
      await updatePeriod(period.id, {
        start_date: tempStartDate,
        end_date: tempEndDate,
      });
      setPeriod({
        ...period,
        start_date: tempStartDate,
        end_date: tempEndDate,
      });
      Alert.alert('Збережено', 'Дати періоду оновлено');
    } catch (error) {
      Alert.alert('Помилка', 'Не вдалося зберегти дати');
    }
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.screenTitle}>Налаштування</Text>

        {/* Секція періоду */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Поточний період</Text>

          {period ? (
            <View style={styles.periodCard}>
              {/* Назва */}
              <TouchableOpacity style={styles.periodRow} onPress={openEditName}>
                <Text style={styles.periodLabel}>Назва</Text>
                <View style={styles.periodValueRow}>
                  <Text style={styles.periodValue}>{period.name || 'Без назви'}</Text>
                  <Text style={styles.editIcon}>✏️</Text>
                </View>
              </TouchableOpacity>

              {/* Дата початку */}
              <TouchableOpacity
                style={styles.periodRow}
                onPress={() => openDatePicker('start')}
              >
                <Text style={styles.periodLabel}>Початок</Text>
                <View style={styles.periodValueRow}>
                  <Text style={styles.periodValue}>
                    {formatDisplayDate(tempStartDate)}
                  </Text>
                  <Text style={styles.editIcon}>📅</Text>
                </View>
              </TouchableOpacity>

              {/* Дата кінця */}
              <TouchableOpacity
                style={styles.periodRow}
                onPress={() => openDatePicker('end')}
              >
                <Text style={styles.periodLabel}>Кінець</Text>
                <View style={styles.periodValueRow}>
                  <Text style={styles.periodValue}>
                    {formatDisplayDate(tempEndDate)}
                  </Text>
                  <Text style={styles.editIcon}>📅</Text>
                </View>
              </TouchableOpacity>

              {/* Кнопка зберегти дати */}
              {(tempStartDate !== period.start_date ||
                tempEndDate !== period.end_date) && (
                <TouchableOpacity style={styles.saveButton} onPress={saveDates}>
                  <Text style={styles.saveButtonText}>Зберегти дати</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.noPeriodCard}>
              <Text style={styles.noPeriodText}>Немає активного періоду</Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreatePeriod}
              >
                <Text style={styles.createButtonText}>+ Створити період</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Секція розкладу */}
        {period && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Розклад</Text>
            <View style={styles.scheduleCard}>
              {/* Заголовок таблиці */}
              <View style={styles.scheduleHeader}>
                <Text style={styles.scheduleHeaderDay}>День</Text>
                {MEALS.map(meal => (
                  <Text key={meal} style={styles.scheduleHeaderMeal}>
                    {MEAL_ICONS[meal]}
                  </Text>
                ))}
              </View>

              {/* Рядки для кожного дня */}
              {[1, 2, 3, 4, 5, 6, 0].map(dayOfWeek => (
                <View key={dayOfWeek} style={styles.scheduleRow}>
                  <Text style={styles.scheduleDayName}>{DAY_NAMES[dayOfWeek]}</Text>
                  {MEALS.map(meal => {
                    const time = getTimeForMeal(dayOfWeek, meal);
                    return (
                      <TouchableOpacity
                        key={meal}
                        style={styles.scheduleTimeButton}
                        onPress={() => openTimePicker(dayOfWeek, meal)}
                      >
                        <Text
                          style={[
                            styles.scheduleTimeText,
                            !time && styles.scheduleTimeEmpty,
                          ]}
                        >
                          {time || '--:--'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Секція вимкнених днів */}
        {period && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Вимкнені дні</Text>
            <View style={styles.disabledDaysCard}>
              <Text style={styles.disabledDaysHint}>
                Натисніть на день щоб вимкнути/увімкнути notifications
              </Text>
              <TouchableOpacity
                style={styles.disabledDaysButton}
                onPress={() => setShowDisabledCalendar(true)}
              >
                <Text style={styles.disabledDaysButtonText}>
                  📅 Вибрати дні ({disabledDays.length} вимкнено)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Модальне вікно вимкнених днів */}
      <Modal visible={showDisabledCalendar} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={() => setShowDisabledCalendar(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Вимкнені дні</Text>
                <Text style={styles.disabledCalendarHint}>
                  Червоні дні - вимкнені (не отримуватимете notifications)
                </Text>
                <Calendar
                  onDayPress={(day: DateData) => toggleDisabledDay(day.dateString)}
                  markedDates={disabledDays.reduce((acc, date) => {
                    acc[date] = { selected: true, selectedColor: '#FF3B30' };
                    return acc;
                  }, {} as Record<string, { selected: boolean; selectedColor: string }>)}
                  minDate={period?.start_date}
                  maxDate={period?.end_date}
                  theme={{
                    todayTextColor: '#007AFF',
                    arrowColor: '#007AFF',
                  }}
                />
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowDisabledCalendar(false)}
                >
                  <Text style={styles.modalCloseText}>Готово</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Модальне вікно редагування назви */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={() => setShowEditModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Назва періоду</Text>
                <TextInput
                  style={styles.textInput}
                  value={tempName}
                  onChangeText={setTempName}
                  placeholder="Введіть назву"
                  autoFocus
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setShowEditModal(false)}
                  >
                    <Text style={styles.modalCancelText}>Скасувати</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalSaveButton} onPress={saveName}>
                    <Text style={styles.modalSaveText}>Зберегти</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Модальне вікно календаря */}
      <Modal visible={showCalendar} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={() => setShowCalendar(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  {selectingDate === 'start' ? 'Дата початку' : 'Дата кінця'}
                </Text>
                <Calendar
                  onDayPress={handleDateSelect}
                  markedDates={{
                    [selectingDate === 'start' ? tempStartDate : tempEndDate]: {
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
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Модальне вікно time picker */}
      <Modal visible={showTimePicker} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={() => { setShowTimePicker(false); setEditingSchedule(null); }}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  {editingSchedule
                    ? `${DAY_NAMES[editingSchedule.dayOfWeek]} - ${MEAL_NAMES[editingSchedule.mealType]}`
                    : 'Виберіть час'}
                </Text>
                <DateTimePicker
                  value={tempTime}
                  mode="time"
                  display="spinner"
                  onChange={handleTimeChange}
                  locale="uk-UA"
                  is24Hour={true}
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => {
                      setShowTimePicker(false);
                      setEditingSchedule(null);
                    }}
                  >
                    <Text style={styles.modalCancelText}>Скасувати</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalSaveButton} onPress={saveTime}>
                    <Text style={styles.modalSaveText}>Зберегти</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 20,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  periodCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    borderRadius: 12,
    overflow: 'hidden',
  },
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  periodLabel: {
    fontSize: 16,
    color: '#333',
  },
  periodValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  periodValue: {
    fontSize: 16,
    color: '#007AFF',
    marginRight: 8,
  },
  editIcon: {
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    margin: 15,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noPeriodCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  noPeriodText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  placeholderCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 5,
  },
  placeholderHint: {
    fontSize: 14,
    color: '#bbb',
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
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666',
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
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
  // Розклад
  scheduleCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    borderRadius: 12,
    overflow: 'hidden',
  },
  scheduleHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  scheduleHeaderDay: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  scheduleHeaderMeal: {
    flex: 1,
    fontSize: 18,
    textAlign: 'center',
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  scheduleDayName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  scheduleTimeButton: {
    flex: 1,
    alignItems: 'center',
  },
  scheduleTimeText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  scheduleTimeEmpty: {
    color: '#ccc',
  },
  // Вимкнені дні
  disabledDaysCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    borderRadius: 12,
    padding: 15,
  },
  disabledDaysHint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  disabledDaysButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  disabledDaysButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledCalendarHint: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
});
