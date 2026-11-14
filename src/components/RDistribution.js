import React from "react";
import { Text, View } from "react-native";
import { C, styles } from "../theme";
import { rDistribution } from "../utils/stats";

export default function RDistribution({ list }) {
  const buckets = rDistribution(list);
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const colors = [C.red, C.red, C.muted, C.green, C.green, C.green];
  return (
    <View style={styles.table}>
      {buckets.map((b, i) => (
        <View key={b.label} style={styles.barRow}>
          <Text style={styles.barLabel}>{b.label}</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${(b.count / max) * 100}%`, backgroundColor: colors[i] }]} />
          </View>
          <Text style={styles.barCount}>{b.count}</Text>
        </View>
      ))}
      <Text style={styles.small}>How many closed trades ended in each R range.</Text>
    </View>
  );
}
