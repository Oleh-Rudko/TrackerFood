# 🍽️ Meal Tracker App - План Розробки

## 📋 Опис Проекту

**Мета:** Додаток для iPhone який відстежує прийоми їжі з push-повідомленнями та фінансовим підрахунком.

**Ключові функції:**
- Push-повідомлення декілька разів на день з кнопками "Їв" / "Не їв"
- Кожен запис має свою ціну
- Збереження в локальній базі даних (SQLite)
- Вибір діапазону дат і підрахунок загальної суми
- Експорт даних (Excel або screenshot)
- Налаштування часу повідомлень для кожного дня окремо

---

## 🎯 Етап 1: ТЕСТОВИЙ ДОДАТОК (Почати тут!)

### Мета тесту
Зробити простий додаток який надсилає повідомлення **кожну хвилину** щоб перевірити що все працює на твоєму iPhone.

### Швидкий старт

#### 1. Створення проекту
```bash
# Створи проект
npx create-expo-app meal-tracker-test
cd meal-tracker-test

# Встанови необхідні пакети
npx expo install expo-notifications expo-device
```

#### 2. Створи файл App.js

```javascript
import { useState, useEffect, useRef } from 'react';
import { Text, View, Button, Platform, StyleSheet, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

// Налаштування як показувати notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(false);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Запит на дозвіл notifications
    registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

    // Слухач для отримання notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    // Слухач для натискань на notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  // Функція для запиту дозволу на notifications
  async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'ios') {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        Alert.alert('Помилка', 'Дозвіл на notifications не надано!');
        return;
      }
    }

    return token;
  }

  // Функція для планування повідомлення кожну хвилину
  async function scheduleEveryMinuteNotification() {
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "⏰ Тестове повідомлення!",
        body: 'Це повідомлення приходить кожну хвилину',
        data: { testData: 'test' },
      },
      trigger: {
        seconds: 60,
        repeats: true,
      },
    });

    Alert.alert('Успіх!', 'Повідомлення будуть приходити кожну хвилину');
  }

  // Функція для відправки негайного повідомлення
  async function sendImmediateNotification() {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🔔 Негайне повідомлення!",
        body: 'Це тестове повідомлення зараз',
      },
      trigger: null, // null = відправити зараз
    });
  }

  // Функція для скасування всіх повідомлень
  async function cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
    Alert.alert('Готово', 'Всі повідомлення скасовано');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧪 Тест Notifications</Text>
      
      <View style={styles.buttonContainer}>
        <Button
          title="📤 Відправити зараз"
          onPress={sendImmediateNotification}
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="⏰ Запустити кожну хвилину"
          onPress={scheduleEveryMinuteNotification}
          color="#4CAF50"
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="🛑 Зупинити всі"
          onPress={cancelAllNotifications}
          color="#f44336"
        />
      </View>

      {notification && (
        <View style={styles.notificationContainer}>
          <Text style={styles.notificationTitle}>Останнє повідомлення:</Text>
          <Text>{notification.request.content.title}</Text>
          <Text>{notification.request.content.body}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  buttonContainer: {
    marginVertical: 10,
    width: '80%',
  },
  notificationContainer: {
    marginTop: 40,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    width: '90%',
  },
  notificationTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
  },
});
```

#### 3. Конвертуй в native iOS проект
```bash
npx expo prebuild --platform ios
```

#### 4. Відкрий в Xcode
```bash
open ios/mealtrackertest.xcworkspace
```

#### 5. Налаштуй в Xcode

**Signing & Capabilities:**
1. Виберу проект зліва → Target → Signing & Capabilities
2. **Team:** Add Account → залогінься своїм Apple ID (безкоштовний)
3. **Bundle Identifier:** змінити на `com.tvojeimya.mealtrackertest`
4. Поставити галочку **Automatically manage signing**

**Додай Capabilities:**
1. Натисни **+ Capability**
2. Додай **Push Notifications**
3. Додай **Background Modes** → постав галочку **Remote notifications**

#### 6. Налаштуй iPhone для розробки

**На iPhone:**
1. Settings → General → VPN & Device Management
2. Довіряй своєму Apple ID (Developer App)

#### 7. Запусти на iPhone
1. Підключи iPhone через USB
2. В Xcode вибери свій iPhone вгорі
3. Натисни **▶️** (або Cmd+R)
4. Перший раз треба буде підтвердити на iPhone: Settings → General → VPN & Device Management → Trust

#### 8. Тестуй!
1. Відкрий додаток на iPhone
2. Дозволи notifications коли попросить
3. Натисни "Відправити зараз" → має прийти негайне повідомлення
4. Натисни "Запустити кожну хвилину" → повідомлення будуть кожну хвилину
5. **Згорни додаток** (не закривай) → повідомлення працюють у фоні
6. Натисни "Зупинити всі" коли захочеш зупинити

---

## 🚀 Етап 2: ПОВНИЙ ДОДАТОК (Після успішного тесту)

### Архітектура

```
meal-tracker/
├── App.js                          # Головний файл
├── src/
│   ├── components/
│   │   ├── NotificationButtons.js  # Компонент з кнопками в notification
│   │   ├── DateRangePicker.js      # Вибір діапазону дат
│   │   └── SummaryView.js          # Показ підрахунків
│   ├── screens/
│   │   ├── HomeScreen.js           # Головний екран
│   │   ├── SettingsScreen.js       # Налаштування часу повідомлень
│   │   └── ReportScreen.js         # Звіти та експорт
│   ├── services/
│   │   ├── database.js             # SQLite операції
│   │   ├── notifications.js        # Логіка notifications
│   │   └── calculations.js         # Підрахунки сум
│   └── utils/
│       ├── exportToExcel.js        # Експорт в Excel
│       └── screenshot.js           # Створення screenshots
└── app.json
```

### База даних (SQLite)

```sql
-- Таблиця записів
CREATE TABLE meal_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  ate BOOLEAN NOT NULL,
  price REAL NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблиця налаштувань розкладу
CREATE TABLE notification_schedule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day_of_week INTEGER NOT NULL, -- 0 = неділя, 6 = субота
  time TEXT NOT NULL,            -- "09:00"
  price REAL NOT NULL,
  enabled BOOLEAN DEFAULT 1
);
```

### Функції для реалізації

#### 1. Interactive Notifications з кнопками

```javascript
// Реєстрація категорій
async function registerNotificationCategories() {
  await Notifications.setNotificationCategoryAsync('meal-check', [
    {
      identifier: 'ate',
      buttonTitle: '✅ Їв',
      options: { opensAppToForeground: false }
    },
    {
      identifier: 'not-ate',
      buttonTitle: '❌ Не їв',
      options: { opensAppToForeground: false }
    }
  ]);
}

// Планування з категорією
async function scheduleMealNotification(hour, minute, price, dayOfWeek) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🍽️ Час перевірки!',
      body: `Ти їв? (${price} грн)`,
      categoryIdentifier: 'meal-check',
      data: { price: price, time: `${hour}:${minute}` }
    },
    trigger: {
      hour: hour,
      minute: minute,
      weekday: dayOfWeek,
      repeats: true
    }
  });
}

// Обробка відповідей
Notifications.addNotificationResponseReceivedListener(async (response) => {
  const actionId = response.actionIdentifier;
  const { price, time } = response.notification.request.content.data;
  
  if (actionId === 'ate') {
    await saveToDatabase({
      date: new Date().toISOString().split('T')[0],
      time: time,
      ate: true,
      price: price
    });
  } else if (actionId === 'not-ate') {
    await saveToDatabase({
      date: new Date().toISOString().split('T')[0],
      time: time,
      ate: false,
      price: 0
    });
  }
});
```

#### 2. Налаштування розкладу для кожного дня

```javascript
// Приклад структури
const scheduleConfig = {
  monday: [
    { time: '09:00', price: 50 },
    { time: '13:00', price: 75 },
    { time: '18:00', price: 60 }
  ],
  tuesday: [
    { time: '10:00', price: 50 },
    { time: '14:00', price: 75 },
    { time: '19:00', price: 60 }
  ],
  // ... інші дні
};
```

#### 3. Підрахунок між датами

```javascript
async function calculateTotal(startDate, endDate) {
  const entries = await db.getAllEntriesBetweenDates(startDate, endDate);
  
  const totalSpent = entries
    .filter(entry => entry.ate === true)
    .reduce((sum, entry) => sum + entry.price, 0);
  
  const breakdown = entries.reduce((acc, entry) => {
    const date = entry.date;
    if (!acc[date]) {
      acc[date] = { ate: 0, notAte: 0, total: 0 };
    }
    if (entry.ate) {
      acc[date].ate += 1;
      acc[date].total += entry.price;
    } else {
      acc[date].notAte += 1;
    }
    return acc;
  }, {});
  
  return { totalSpent, breakdown };
}
```

#### 4. Експорт в Excel

```javascript
import * as XLSX from 'xlsx';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

async function exportToExcel(startDate, endDate) {
  const entries = await db.getAllEntriesBetweenDates(startDate, endDate);
  
  // Підготовка даних
  const data = entries.map(entry => ({
    'Дата': entry.date,
    'Час': entry.time,
    'Їв': entry.ate ? 'Так' : 'Ні',
    'Ціна': entry.ate ? entry.price : 0
  }));
  
  // Створення Excel
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Звіт");
  
  // Збереження
  const wbout = XLSX.write(wb, { type: 'base64', bookType: "xlsx" });
  const uri = FileSystem.documentDirectory + `report_${startDate}_${endDate}.xlsx`;
  await FileSystem.writeAsStringAsync(uri, wbout, {
    encoding: FileSystem.EncodingType.Base64
  });
  
  // Поділитися файлом
  await Sharing.shareAsync(uri);
}
```

---

## 📦 Необхідні пакети для повного додатку

```bash
npx expo install expo-notifications
npx expo install expo-sqlite
npx expo install expo-device
npx expo install expo-file-system
npx expo install expo-sharing
npm install xlsx
npm install @react-navigation/native
npm install @react-navigation/bottom-tabs
npx expo install react-native-screens react-native-safe-area-context
npm install react-native-calendars
```

---

## 🎨 Екрани додатку

### 1. Home Screen
- Сьогоднішня статистика
- Швидкі дії (позначити їв/не їв вручну)
- Список останніх записів

### 2. Settings Screen
- Налаштування розкладу для кожного дня тижня
- Додавання/видалення часів повідомлень
- Встановлення цін для кожного прийому їжі

### 3. Report Screen
- Вибір діапазону дат (DateRangePicker)
- Показ підрахунків
- Графіки/діаграми (опціонально)
- Кнопки експорту (Excel, Screenshot)

---

## ⚙️ Налаштування для production

### app.json
```json
{
  "expo": {
    "name": "Meal Tracker",
    "slug": "meal-tracker",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.yourname.mealtracker",
      "buildNumber": "1",
      "supportsTablet": false,
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"]
      }
    },
    "notification": {
      "icon": "./assets/notification-icon.png",
      "color": "#4CAF50"
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "sounds": ["./assets/notification-sound.wav"]
        }
      ]
    ]
  }
}
```

---

## 🐛 Типові проблеми та рішення

### Повідомлення не приходять
- Перевір що додаток має дозвіл на notifications
- Перевір що добавив Push Notifications capability в Xcode
- Закрий і знову відкрий додаток після змін

### Кнопки в повідомленнях не показуються
- Interactive notifications працюють тільки на справжньому iPhone
- Переконайся що registered categories перед scheduling
- В Expo Go це не працює - потрібен native build

### База даних втрачається
- SQLite зберігає дані в документах додатку
- Не втратяться при оновленні якщо Bundle ID не змінюється
- Зроби backup функцію на всяк випадок

---

## 📱 Тестування на iPhone

### Режим розробки
```bash
# Запусти Metro bundler
npx expo start

# В Xcode натисни Run
# Або через CLI:
npx react-native run-ios
```

### Production build (для довгострокового використання)
```bash
# Через Xcode:
# Product → Archive → Distribute App → Development
# Встанови .ipa через Xcode на свій iPhone

# Або використай EAS:
eas build --profile preview --platform ios
```

---

## 🎯 Чеклист розробки

### Етап 1: Тест (ЗАРАЗ)
- [ ] Створити тестовий проект
- [ ] Запустити на iPhone
- [ ] Перевірити що notifications працюють
- [ ] Перевірити що повідомлення приходять кожну хвилину
- [ ] Перевірити що працюють у фоновому режимі

### Етап 2: MVP
- [ ] Реалізувати SQLite базу даних
- [ ] Створити interactive notifications з кнопками
- [ ] Додати збереження даних при натисканні кнопок
- [ ] Створити просту сторінку зі списком записів
- [ ] Тестувати що дані зберігаються правильно

### Етап 3: Повна функціональність
- [ ] Створити екран налаштувань розкладу
- [ ] Додати можливість налаштовувати час для кожного дня
- [ ] Реалізувати DateRangePicker
- [ ] Додати підрахунки між датами
- [ ] Створити експорт в Excel
- [ ] Додати screenshot функціонал
- [ ] Оптимізувати UI/UX

### Етап 4: Polish
- [ ] Додати іконки та splash screen
- [ ] Оптимізувати батарею (не занадто часті notifications)
- [ ] Додати backup/restore даних
- [ ] Тестування протягом тижня
- [ ] Виправити баги

---

## 💡 Поради

1. **Почни з тестового додатку** - переконайся що notifications працюють
2. **Не перевантажуй функціями відразу** - робі MVP першим
3. **Тестуй на реальному пристрої** - simulator не підходить для notifications
4. **Роби backup даних** - додай функцію експорту на всяк випадок
5. **Документуй зміни** - коли щось не працює, легше буде дебажити

---

## 🔗 Корисні посилання

- [Expo Notifications Docs](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Expo SQLite Docs](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [Apple Developer - User Notifications](https://developer.apple.com/documentation/usernotifications)

---

## 📞 Наступні кроки

1. **ЗАРАЗ:** Зроби тестовий додаток з повідомленнями кожну хвилину
2. **Коли працює:** Повернися до цього документу і переходь до Етапу 2
3. **Якщо проблеми:** Перевір розділ "Типові проблеми"

**Успіхів! 🚀**
