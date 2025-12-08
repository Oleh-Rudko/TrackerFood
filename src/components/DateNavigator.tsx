import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface DateNavigatorProps {
  date: Date;
  onPrevious: () => void;
  onNext: () => void;
  canGoNext: boolean;
}

export function DateNavigator({ date, onPrevious, onNext, canGoNext }: DateNavigatorProps) {
  const formatDate = (d: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    };
    return d.toLocaleDateString('uk-UA', options);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onPrevious} style={styles.arrow}>
        <Text style={styles.arrowText}>←</Text>
      </TouchableOpacity>

      <Text style={styles.dateText}>{formatDate(date)}</Text>

      <TouchableOpacity
        onPress={onNext}
        style={[styles.arrow, !canGoNext && styles.arrowDisabled]}
        disabled={!canGoNext}
      >
        <Text style={[styles.arrowText, !canGoNext && styles.arrowTextDisabled]}>→</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  arrow: {
    padding: 10,
  },
  arrowDisabled: {
    opacity: 0.3,
  },
  arrowText: {
    fontSize: 24,
    color: '#007AFF',
  },
  arrowTextDisabled: {
    color: '#ccc',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
});
