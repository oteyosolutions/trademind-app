import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { C, styles } from "../theme";
import { fmtR } from "../utils/format";
import { calendarMonth } from "../utils/stats";

const HEAD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function cellColor(cell) {
  if (!cell || cell.count === 0) return C.card;
  if (cell.r > 0) return cell.r >= 2 ? "#1E7A57" : "#174A3A";
  if (cell.r < 0) return cell.r <= -2 ? "#8A2F35" : "#4A2329";
  return "#2A3346";
}

export default function CalendarHeatmap({ list }) {
  const [offset, setOffset] = useState(0);
  const month = calendarMonth(list, offset);
  const rows = [];
  for (let i = 0; i < month.cells.length; i += 7) rows.push(month.cells.slice(i, i + 7));

  return (
    <View style={styles.table}>
      <View style={[styles.tradeRow, { marginTop: 0, marginBottom: 10 }]}>
        <TouchableOpacity style={styles.periodButton} onPress={() => setOffset(offset - 1)}>
          <Text style={styles.periodArrow}>‹</Text>
        </TouchableOpacity>
        <View style={{ alignItems: "center", flex: 1 }}>
          <Text style={styles.menuTitle}>{month.label}</Text>
          <Text style={[styles.small, { marginTop: 0 }]}>
            {fmtR(month.netR)} · {month.greenDays} green / {month.redDays} red days
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.periodButton, offset >= 0 && { opacity: 0.3 }]}
          disabled={offset >= 0}
          onPress={() => setOffset(offset + 1)}
        >
          <Text style={styles.periodArrow}>›</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.calRow}>
        {HEAD.map((d) => (
          <Text key={d} style={styles.calHead}>{d}</Text>
        ))}
      </View>
      {rows.map((row, i) => (
        <View key={i} style={styles.calRow}>
          {row.map((cell, j) => (
            <View key={j} style={[styles.calCell, { backgroundColor: cellColor(cell) }, !cell && { borderWidth: 0, backgroundColor: "transparent" }]}>
              {cell && <Text style={styles.calDay}>{cell.day}</Text>}
              {cell && cell.count > 0 && <Text style={styles.calR}>{cell.r > 0 ? "+" : ""}{cell.r.toFixed(1)}</Text>}
            </View>
          ))}
        </View>
      ))}
      <Text style={styles.small}>Net R per day, by the date each trade closed.</Text>
    </View>
  );
}
