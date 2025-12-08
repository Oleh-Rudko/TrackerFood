import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>⚙️</Text>
        <Text style={styles.title}>Налаштування</Text>
        <Text style={styles.subtitle}>Скоро буде...</Text>
        <Text style={styles.hint}>
          Тут можна буде:{'\n'}
          • Створювати періоди{'\n'}
          • Налаштовувати розклад{'\n'}
          • Вимикати окремі дні
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  icon: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    marginBottom: 30,
  },
  hint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});
