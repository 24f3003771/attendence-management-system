// ---------------------------------------------------------------------------
// src/components/AttendanceItem.tsx
// Single row in HistoryScreen's attendance list
// ---------------------------------------------------------------------------

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AttendanceRecord, AttendanceStatus, AttendanceType } from '../types';

interface Props {
  record: AttendanceRecord;
}

const TYPE_COLORS: Record<AttendanceType, string> = {
  IN: '#4CAF50',
  OUT: '#FF6B6B',
};

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  SUCCESS: '#4CAF50',
  FAILED: '#FF6B6B',
  DUPLICATE: '#FFA726',
  INVALID_LOCATION: '#EF5350',
};

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  SUCCESS: 'Success',
  FAILED: 'Failed',
  DUPLICATE: 'Duplicate',
  INVALID_LOCATION: 'Invalid Location',
};

const AttendanceItem: React.FC<Props> = ({ record }) => {
  const typeColor = TYPE_COLORS[record.type] ?? '#888';
  const statusColor = STATUS_COLORS[record.status] ?? '#888';
  const statusLabel = STATUS_LABELS[record.status] ?? record.status;

  return (
    <View style={styles.card}>
      {/* Left: date + type badge */}
      <View style={styles.left}>
        <Text style={styles.date}>{record.date}</Text>
        <View style={[styles.typeBadge, { backgroundColor: typeColor + '22', borderColor: typeColor }]}>
          <Text style={[styles.typeText, { color: typeColor }]}>{record.type}</Text>
        </View>
      </View>

      {/* Center: time */}
      <Text style={styles.time}>{record.time}</Text>

      {/* Right: status badge */}
      <View style={[styles.statusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
        <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  left: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 6,
  },
  date: {
    color: '#CCC',
    fontSize: 13,
    fontWeight: '600',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  time: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default AttendanceItem;
