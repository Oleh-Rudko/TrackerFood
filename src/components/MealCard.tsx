import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MealType, MealEntry, MEAL_NAMES, MEAL_ICONS, MEAL_PRICES } from '../types';

interface MealCardProps {
  mealType: MealType;
  entry: MealEntry | null;
  isDisabled: boolean;
  onToggle: (ate: boolean, price?: number) => void;
}

export function MealCard({ mealType, entry, isDisabled, onToggle }: MealCardProps) {
  const icon = MEAL_ICONS[mealType];
  const name = MEAL_NAMES[mealType];

  // Визначаємо статус
  const getStatus = (): 'ate' | 'not_ate' | 'not_marked' => {
    if (isDisabled) return 'not_ate';
    if (!entry) return 'not_marked';
    return entry.ate ? 'ate' : 'not_ate';
  };

  const status = getStatus();

  // Ціна для відображення
  const getPrice = (): number => {
    if (isDisabled || !entry?.ate) return 0;
    return entry.price;
  };

  // Стандартна ціна для типу їжі
  const getDefaultPrice = (): number => {
    if (mealType === 'dinner') {
      return MEAL_PRICES.dinner.default;
    }
    return MEAL_PRICES[mealType];
  };

  const handleToggle = () => {
    if (isDisabled) return;

    if (status === 'ate') {
      // Якщо вже "Їв" -> перемикаємо на "Не їв"
      onToggle(false, 0);
    } else {
      // Якщо "Не їв" або "Не відмічено" -> перемикаємо на "Їв"
      onToggle(true, getDefaultPrice());
    }
  };

  // Для вечері - вибір ціни
  const handleDinnerPrice = (price: number) => {
    if (isDisabled) return;
    onToggle(true, price);
  };

  return (
    <View style={[styles.container, isDisabled && styles.containerDisabled]}>
      <View style={styles.leftSection}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.name}>{name}</Text>
      </View>

      <View style={styles.rightSection}>
        {/* Статус кнопка */}
        <TouchableOpacity
          style={[
            styles.statusButton,
            status === 'ate' && styles.statusAte,
            status === 'not_ate' && styles.statusNotAte,
            status === 'not_marked' && styles.statusNotMarked,
          ]}
          onPress={handleToggle}
          disabled={isDisabled}
        >
          <Text style={styles.statusText}>
            {status === 'ate' ? '✅ Їв' : status === 'not_ate' ? '❌ Не їв' : '⏳ ---'}
          </Text>
        </TouchableOpacity>

        {/* Для вечері - вибір ціни */}
        {mealType === 'dinner' && status === 'ate' && !isDisabled && (
          <View style={styles.priceSelector}>
            <TouchableOpacity
              style={[
                styles.priceButton,
                entry?.price === MEAL_PRICES.dinner.default && styles.priceButtonSelected,
              ]}
              onPress={() => handleDinnerPrice(MEAL_PRICES.dinner.default)}
            >
              <Text
                style={[
                  styles.priceButtonText,
                  entry?.price === MEAL_PRICES.dinner.default && styles.priceButtonTextSelected,
                ]}
              >
                {MEAL_PRICES.dinner.default} zł
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.priceButton,
                entry?.price === MEAL_PRICES.dinner.alternative && styles.priceButtonSelected,
              ]}
              onPress={() => handleDinnerPrice(MEAL_PRICES.dinner.alternative)}
            >
              <Text
                style={[
                  styles.priceButtonText,
                  entry?.price === MEAL_PRICES.dinner.alternative && styles.priceButtonTextSelected,
                ]}
              >
                {MEAL_PRICES.dinner.alternative} zł
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Ціна */}
        <Text style={styles.price}>{getPrice()} zł</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 15,
    marginVertical: 5,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  containerDisabled: {
    opacity: 0.5,
    backgroundColor: '#f5f5f5',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
    marginRight: 10,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginBottom: 5,
  },
  statusAte: {
    backgroundColor: '#e8f5e9',
  },
  statusNotAte: {
    backgroundColor: '#ffebee',
  },
  statusNotMarked: {
    backgroundColor: '#fff3e0',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  priceSelector: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  priceButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginLeft: 5,
  },
  priceButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  priceButtonText: {
    fontSize: 12,
    color: '#666',
  },
  priceButtonTextSelected: {
    color: '#fff',
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
});
