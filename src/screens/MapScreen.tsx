import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image,
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { getBinsNearby } from '../services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import SuggestionDialog from '../components/SuggestionDialog';
import SuggestionBottomSheet from '../components/SuggestionBottomSheet';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';


interface Bin {
  _id: string;
  location: {
    type: string;
    coordinates: [number, number];
  };
  fillLevel: number;
}

type MapScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Map'>;

const MapScreen = () => {
  const navigation = useNavigation<MapScreenNavigationProp>();
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [bins, setBins] = useState<Bin[]>([]);
  const [selectedBin, setSelectedBin] = useState<Bin | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportText, setReportText] = useState('');
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission to access location was denied');
          setLoading(false);
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        setLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        const binsNearby = await getBinsNearby(location.coords.latitude, location.coords.longitude, 500);
        setBins(binsNearby);
      } catch (error) {
        console.error('Error loading map data:', error);
        Alert.alert('Error', 'Failed to load map data. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const refreshBins = async () => {
    if (!location) return;
    setLoading(true);
    try {
      const binsNearby = await getBinsNearby(location.latitude, location.longitude, 500);
      setBins(binsNearby);
    } catch (error) {
      console.error('Error refreshing bins:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      const uris = result.assets.map(asset => asset.uri);
      setImages([...images, ...uris]);
    }
  };

  const submitReport = () => {
    console.log('Report Submitted:', reportText, images);
    setReportVisible(false);
    setReportText('');
    setImages([]);
    Alert.alert('Success', 'Issue reported successfully.');
  };

  // Update the navigation function to use the simplified direct navigation
  const navigateToCollectorLogin = () => {
    navigation.navigate('CollectorLogin');
  };

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#12805c" />
          <Text style={styles.loadingText}>Loading map data...</Text>
        </View>
      )}

      {location && (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          <Circle
            center={location}
            radius={500}
            strokeColor="rgba(0, 150, 255, 0.5)"
            fillColor="rgba(0, 150, 255, 0.1)"
          />
          {bins.map((bin) => (
            <Marker
              key={bin._id}
              coordinate={{
                latitude: bin.location.coordinates[1],
                longitude: bin.location.coordinates[0],
              }}
              onPress={() => setSelectedBin(bin)}
            >
              <View style={styles.marker}>
                <View style={[styles.markerInner, { backgroundColor: getFillLevelColor(bin.fillLevel) }]}>
                  <Text style={styles.markerText}>{bin.fillLevel}%</Text>
                </View>
              </View>
            </Marker>
          ))}
        </MapView>
      )}
      
      {/* Conditionally hide buttons when suggestion mode is enabled */}
      {!suggestionMode && (
        <>
          {/* Truck Button - Updated with correct navigation */}
          <TouchableOpacity 
            style={styles.truckButton} 
            onPress={navigateToCollectorLogin}
          >
            <MaterialCommunityIcons name="truck" size={28} color="#fff" />
          </TouchableOpacity>

      <TouchableOpacity
        style={styles.truckButton}
        onPress={() => Alert.alert('Driver Section', 'Driver section functionality will be connected here.')}
      >
        <MaterialCommunityIcons name="truck" size={28} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.refreshButton} onPress={refreshBins} disabled={loading}>
        <MaterialCommunityIcons name="refresh" size={24} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.reportButton} onPress={() => setReportVisible(true)}>
        <Text style={styles.reportButtonText}>Report</Text>
      </TouchableOpacity>

      {selectedBin && (
        <View style={styles.binDetails}>
          <Text style={styles.binDetailsText}>Fill Level: {selectedBin.fillLevel}%</Text>
          <Text style={styles.binDetailsText}>
            Location: {selectedBin.location.coordinates[1].toFixed(6)}, {selectedBin.location.coordinates[0].toFixed(6)}
          </Text>
          <Text style={styles.binDetailsText}>Bin ID: {selectedBin._id}</Text>
        </View>
      )}

      {/* Report Modal */}
      {reportVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report a Bin Issue</Text>
            <TextInput
              placeholder="Describe the issue..."
              value={reportText}
              onChangeText={setReportText}
              style={styles.textInput}
              multiline
            />
            <TouchableOpacity style={styles.imagePicker} onPress={pickImages}>
              <Text style={styles.imagePickerText}>Pick Images</Text>
            </TouchableOpacity>
            <View style={styles.imagePreviewContainer}>
              {images.map((uri, idx) => (
                <Image key={idx} source={{ uri }} style={styles.previewImage} />
              ))}
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setReportVisible(false)} style={styles.cancelButton}>
                <Text style={{ color: '#fff' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submitReport} style={styles.submitButton}>
                <Text style={{ color: '#fff' }}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const getFillLevelColor = (fillLevel: number) => {
  if (fillLevel >= 90) return '#EF4444';
  if (fillLevel >= 70) return '#F59E0B';
  if (fillLevel >= 50) return '#FBBF24';
  return '#10B981';
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  loadingContainer: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)', zIndex: 1000,
  },
  loadingText: { marginTop: 10, fontSize: 16, color: '#12805c' },
  truckButton: {
    position: 'absolute', top: 50, right: 20,
    backgroundColor: '#12805c', width: 50, height: 50, borderRadius: 25,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
  },
  refreshButton: {
    position: 'absolute', top: 50, right: 80,
    backgroundColor: '#12805c', width: 50, height: 50, borderRadius: 25,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
  },
  reportButton: {
    position: 'absolute', bottom: 80, right: 20,
    backgroundColor: '#F97316', width: 100, height: 50,
    borderRadius: 25, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
  },
  reportButtonText: {
    color: '#fff', fontWeight: 'bold', fontSize: 16,
  },
  marker: { alignItems: 'center', justifyContent: 'center' },
  markerInner: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  markerText: { color: '#fff', fontWeight: 'bold' },
  binDetails: {
    position: 'absolute', bottom: 20, left: 20, right: 20,
    backgroundColor: 'white', padding: 16, borderRadius: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
  },
  binDetailsText: { fontSize: 16, marginBottom: 8 },
  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 1001,
  },
  modalContent: {
    width: '90%', backgroundColor: 'white', borderRadius: 12, padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  textInput: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 8,
    padding: 10, height: 80, marginBottom: 10, textAlignVertical: 'top',
  },
  imagePicker: {
    backgroundColor: '#12805c', padding: 10, borderRadius: 8,
    alignItems: 'center', marginBottom: 10,
  },
  imagePickerText: { color: '#fff', fontWeight: '600' },
  imagePreviewContainer: {
    flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10,
  },
  previewImage: {
    width: 60, height: 60, borderRadius: 8, marginRight: 5, marginBottom: 5,
  },
  modalButtons: {
    flexDirection: 'row', justifyContent: 'space-between',
  },
  submitButton: {
    backgroundColor: '#12805c', padding: 10, borderRadius: 8,
    flex: 0.48, alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#888', padding: 10, borderRadius: 8,
    flex: 0.48, alignItems: 'center',
  },
});

export default MapScreen;
