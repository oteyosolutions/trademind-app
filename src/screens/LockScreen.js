import React, { useState } from "react";
import { SafeAreaView, Text, TextInput, TouchableOpacity } from "react-native";
import { C, styles } from "../theme";
import { useApp } from "../context/AppContext";

export default function LockScreen() {
  const { tryUnlock } = useApp();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");

  function submit() {
    const result = tryUnlock(code);
    setCode("");
    if (result === "wrong") setMessage("Wrong PIN. Try again.");
    if (result === "wait") setMessage("Too many attempts. Wait 30 seconds and try again.");
  }

  return (
    <SafeAreaView style={styles.lockWrap}>
      <Text style={styles.brand}>TRADEMIND ICT</Text>
      <Text style={styles.pageTitle}>Enter your PIN</Text>
      <TextInput
        style={styles.pinInput}
        value={code}
        onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
        placeholder="PIN"
        placeholderTextColor="#65738B"
        keyboardType="number-pad"
        secureTextEntry
        autoFocus
        onSubmitEditing={submit}
      />
      <TouchableOpacity style={styles.primaryButton} onPress={submit}>
        <Text style={styles.primaryText}>Unlock</Text>
      </TouchableOpacity>
      {!!message && <Text style={[styles.muted, { color: C.red, textAlign: "center" }]}>{message}</Text>}
    </SafeAreaView>
  );
}
