// ---------------------------------------------------------------------------
// src/components/StatusCard.tsx
// Displays today's sign-in / sign-out status at the top of ScannerScreen
// ---------------------------------------------------------------------------

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TodayStatus } from '../types';

interface Props {
  status: TodayStatus | null;
}

const StatusCard: React.FC<Props> = ({ status }) => {
  const renderLabel = (): string => {
    if (!status) return '—';
    if (status.signedOut && status.signOutTime) return `Signed Out at ${status.signOutTime}`;
    if (status.signedIn && status.signInTime) return `Signed In at ${status.signInTime}`;
    return 'Not Signed In Yet';
  };

  const getColor = (): string => {
    if (!status) return '#888';
    if (status.signedOut) return '#FF6B6B';
    if (status.signedIn) return '#4CAF50';
    return '#FFA726';
  };

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Today's Status</Text>
      <Text style={[styles.status, { color: getColor() }]}>{renderLabel()}</Text>

      {status?.signedIn && status.signInTime && (
        <View style={styles.row}>
          <Text style={styles.dimText}>IN</Text>
          <Text style={styles.timeText}>{status.signInTime}</Text>
        </View>
      )}
      {status?.signedOut && status.signOutTime && (
        <View style={styles.row}>
          <Text style={styles.dimText}>OUT</Text>
          <Text style={styles.timeText}>{status.signOutTime}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  label: {
    color: '#888',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  status: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  dimText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '600',
  },
  timeText: {
    color: '#CCC',
    fontSize: 13,
  },
});

export default StatusCard;
