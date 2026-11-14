import React from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../theme";

export function Field({ label, value, onChangeText, placeholder, keyboardType, multiline }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || "Enter " + label.toLowerCase()}
        placeholderTextColor="#65738B"
        keyboardType={keyboardType || "default"}
        autoCapitalize="none"
        multiline={!!multiline}
      />
    </View>
  );
}

export function Choice({ label, selected, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.choice, selected && styles.choiceActive]}
    >
      <Text style={[styles.choiceText, selected && styles.choiceTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function Stat({ label, value, color }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

/** Wrapping chips. `selected` is a value (single) or an array (multi). */
export function Chips({ options, selected, onSelect }) {
  const isOn = (o) => (Array.isArray(selected) ? selected.includes(o) : selected === o);
  return (
    <View style={styles.chipWrap}>
      {options.map((o) => (
        <TouchableOpacity key={String(o)} style={[styles.chip, isOn(o) && styles.chipActive]} onPress={() => onSelect(o)}>
          <Text style={[styles.chipText, isOn(o) && styles.chipTextActive]}>{String(o)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
