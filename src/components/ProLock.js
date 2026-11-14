import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { C, styles } from "../theme";
import { useApp } from "../context/AppContext";

/** Shows children for Pro users, an upgrade card for everyone else. */
export default function ProLock({ title, children }) {
  const { isPro, setTab } = useApp();
  if (isPro) return children;
  return (
    <View style={[styles.menu, { borderColor: C.blue }]}>
      <Text style={styles.menuTitle}>🔒 {title}</Text>
      <Text style={styles.muted}>This is a TradeMind Pro feature.</Text>
      <TouchableOpacity onPress={() => setTab("Pro")}>
        <Text style={styles.linkText}>See what Pro includes →</Text>
      </TouchableOpacity>
    </View>
  );
}
