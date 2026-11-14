import React, { useState } from "react";
import { Text, View } from "react-native";
import { C, styles } from "../theme";
import { fmtR } from "../utils/format";

export default function EquityCurve({ points }) {
  const [width, setWidth] = useState(0);
  const height = 170;
  const pad = 12;

  if (points.length < 2) {
    return (
      <View style={styles.chartEmpty}>
        <Text style={styles.muted}>Close at least one trade to see your equity curve.</Text>
      </View>
    );
  }

  const max = Math.max(0, ...points);
  const min = Math.min(0, ...points);
  const range = max - min || 1;
  const innerW = Math.max(0, width - pad * 2);
  const innerH = height - pad * 2;

  const xy = points.map((v, i) => ({
    x: pad + (i / (points.length - 1)) * innerW,
    y: pad + ((max - v) / range) * innerH,
    v,
  }));
  const zeroY = pad + (max / range) * innerH;

  return (
    <View
      style={[styles.chart, { height }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <View style={[styles.zeroLine, { top: zeroY }]} />
      {width > 0 &&
        xy.slice(1).map((p, i) => {
          const a = xy[i];
          const dx = p.x - a.x;
          const dy = p.y - a.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);
          return (
            <View
              key={"seg" + i}
              style={[
                styles.segment,
                {
                  width: len,
                  left: (a.x + p.x) / 2 - len / 2,
                  top: (a.y + p.y) / 2 - 1,
                  backgroundColor: p.v >= a.v ? C.green : C.red,
                  transform: [{ rotate: `${angle}rad` }],
                },
              ]}
            />
          );
        })}
      {width > 0 &&
        points.length <= 60 &&
        xy.map((p, i) => (
          <View key={"dot" + i} style={[styles.dot, { left: p.x - 3, top: p.y - 3 }]} />
        ))}
      <Text style={[styles.chartLabel, { top: 2 }]}>{fmtR(max)}</Text>
      <Text style={[styles.chartLabel, { bottom: 2 }]}>{fmtR(min)}</Text>
    </View>
  );
}
