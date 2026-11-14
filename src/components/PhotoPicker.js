import React from "react";
import { Alert, Image, Text, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { styles } from "../theme";

/** Attach chart screenshots from the phone's gallery. */
export default function PhotoPicker({ photos, setPhotos }) {
  async function addPhoto() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.6, allowsEditing: false });
      // Newer Expo versions return { canceled, assets }, older ones { cancelled, uri }
      if (!result || result.canceled || result.cancelled) return;
      const uri = result.assets && result.assets[0] ? result.assets[0].uri : result.uri;
      if (uri) setPhotos([...photos, uri].slice(0, 4));
    } catch (error) {
      Alert.alert("Could not open your photos", String(error.message || error));
    }
  }

  return (
    <View style={{ marginTop: 17 }}>
      <Text style={styles.label}>Chart screenshots ({photos.length}/4)</Text>
      <View style={styles.photoRow}>
        {photos.map((uri) => (
          <View key={uri}>
            <Image source={{ uri }} style={styles.thumb} />
            <TouchableOpacity onPress={() => setPhotos(photos.filter((p) => p !== uri))}>
              <Text style={[styles.small, { marginTop: 4 }]}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
      {photos.length < 4 && (
        <TouchableOpacity style={styles.secondaryButton} onPress={addPhoto}>
          <Text style={styles.secondaryText}>+ Add screenshot from gallery</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.small}>
        Screenshots stay on this phone and are not included in backups. Chart links (below) are
        included in backups.
      </Text>
    </View>
  );
}
