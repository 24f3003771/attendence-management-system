// ---------------------------------------------------------------------------
// src/screens/HistoryScreen.tsx
// Paginated, pull-to-refresh list of own attendance records (read-only)
// ---------------------------------------------------------------------------

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import apiClient from '../api/client';
import AttendanceItem from '../components/AttendanceItem';
import { AttendanceRecord, HistoryResponse } from '../types';

const PAGE_SIZE = 20;

const HistoryScreen: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async (pageNum: number, replace: boolean) => {
    if (loading && !replace) return;
    replace ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get<HistoryResponse>('/api/attendance/history', {
        params: { page: pageNum, pageSize: PAGE_SIZE },
      });
      setTotal(data.total);
      setRecords((prev) => (replace ? data.records : [...prev, ...data.records]));
      setPage(pageNum);
    } catch (err: any) {
      const msg: string =
        err?.response?.data?.message ?? 'Failed to load history. Pull down to retry.';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loading]);

  useEffect(() => {
    fetchRecords(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = () => fetchRecords(1, true);
  const loadMore = () => {
    const hasMore = records.length < total;
    if (hasMore && !loading) fetchRecords(page + 1, false);
  };

  const renderEmpty = () => {
    if (loading || refreshing) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyText}>No attendance records yet.</Text>
      </View>
    );
  };

  const renderFooter = () => {
    const hasMore = records.length < total;
    if (!hasMore && !loading) return null;
    if (loading && records.length > 0) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator color="#FFF" />
        </View>
      );
    }
    if (hasMore) {
      return (
        <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} activeOpacity={0.8}>
          <Text style={styles.loadMoreText}>Load More</Text>
        </TouchableOpacity>
      );
    }
    return null;
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Attendance History</Text>
        {total > 0 && (
          <Text style={styles.headerCount}>{total} records total</Text>
        )}
      </View>

      {/* Error banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={onRefresh}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Initial loader */}
      {loading && records.length === 0 && (
        <View style={styles.initialLoader}>
          <ActivityIndicator color="#FFF" size="large" />
        </View>
      )}

      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AttendanceItem record={item} />}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        contentContainerStyle={records.length === 0 ? styles.flatListEmpty : styles.flatListContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFF"
            colors={['#FFF']}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  headerCount: {
    color: '#555',
    fontSize: 12,
    marginTop: 2,
  },
  errorBanner: {
    backgroundColor: '#FF000018',
    borderWidth: 1,
    borderColor: '#FF4444',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 13,
    flex: 1,
  },
  retryText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 12,
  },
  initialLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flatListContent: {
    paddingVertical: 12,
    paddingBottom: 32,
  },
  flatListEmpty: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    color: '#555',
    fontSize: 15,
  },
  footerLoader: {
    padding: 20,
    alignItems: 'center',
  },
  loadMoreBtn: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    marginHorizontal: 40,
    marginVertical: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  loadMoreText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default HistoryScreen;
