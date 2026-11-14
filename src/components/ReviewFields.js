import React from "react";
import { Text, View } from "react-native";
import { styles } from "../theme";
import { MISTAKES } from "../constants";
import { Chips, Field } from "./ui";

/** "Did you follow your plan?", mistake tags and lesson - used when closing and editing. */
export default function ReviewFields({ plan, setPlan, mistakes, setMistakes, lesson, setLesson }) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={styles.label}>Did you follow your plan?</Text>
      <Chips
        options={["Yes", "No"]}
        selected={plan === true ? "Yes" : plan === false ? "No" : null}
        onSelect={(o) => setPlan(o === "Yes" ? (plan === true ? null : true) : plan === false ? null : false)}
      />
      <Text style={[styles.label, { marginTop: 12 }]}>Mistakes (tap all that apply)</Text>
      <Chips
        options={MISTAKES}
        selected={mistakes}
        onSelect={(o) => setMistakes(mistakes.includes(o) ? mistakes.filter((m) => m !== o) : [...mistakes, o])}
      />
      <Field
        label="Lesson learned (optional)"
        value={lesson}
        onChangeText={setLesson}
        placeholder="What will you do differently?"
        multiline
      />
    </View>
  );
}
