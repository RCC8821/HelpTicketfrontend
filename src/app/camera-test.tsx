import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export default function CameraTestScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);

  // 1️⃣ Camera se photo lene ke liye
  const openCamera = async () => {
    // Android runtime permission maango
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission Denied', 'Camera permission allow karni padegi!');
      return;
    }

    // Camera open karo
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  // 2️⃣ Gallery se photo select karne ke liye
  const openGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>

      <Text style={styles.title}>Camera & Gallery Test</Text>
      <Text style={styles.subtitle}>Android Permission Testing</Text>

      {/* Buttons */}
      <TouchableOpacity style={[styles.btn, { backgroundColor: '#0284C7' }]} onPress={openCamera}>
        <Ionicons name="camera" size={20} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.btnText}>Open Camera</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btn, { backgroundColor: '#10B981' }]} onPress={openGallery}>
        <Ionicons name="images" size={20} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.btnText}>Open Gallery</Text>
      </TouchableOpacity>

      {/* Photo Preview */}
      {imageUri && (
        <View style={styles.previewBox}>
          <Text style={styles.previewLabel}>Selected Image:</Text>
          <Image source={{ uri: imageUri }} style={styles.image} />
          <Text style={styles.pathText}>URI: {imageUri}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    position: 'absolute',
    top: 50,
    left: 20,
    padding: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 30,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 300,
    height: 50,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  previewBox: {
    marginTop: 20,
    alignItems: 'center',
    width: '100%',
  },
  previewLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 10,
  },
  image: {
    width: 250,
    height: 250,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },
  pathText: {
    marginTop: 8,
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
  },
});