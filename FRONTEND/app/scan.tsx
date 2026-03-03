import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Image,
  TextInput, FlatList, Animated, Keyboard, Platform,
  ScrollView, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../constants/Colors';
import { useProduct, ProductData } from '../constants/ProductContext';
import { ProductsAPI, NormalizedProduct } from '../constants/api';
import { normalizedToProductData } from '../utils/productMapper';

const SEARCH_BAR_H = 52;

type ScanMode = 'barcode' | 'ingredient';

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setCurrentProduct } = useProduct();

  // Camera
  const [permission, requestPermission] = useCameraPermissions();
  const [torchOn, setTorchOn] = useState(false);
  const [pickedImage, setPickedImage] = useState<string | null>(null);
  const [pickedBase64, setPickedBase64] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  // Mode
  const [mode, setMode] = useState<ScanMode>('barcode');
  const [scanning, setScanning] = useState(false);

  // Product name prompt
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [productNameInput, setProductNameInput] = useState('');
  const [pendingBase64, setPendingBase64] = useState<string | null>(null);
  const [pendingMode, setPendingMode] = useState<ScanMode>('ingredient');
  const nameInputRef = useRef<TextInput>(null);

  // ── Reset scanner when screen gains focus (e.g. coming back from product-detail) ──
  useFocusEffect(
    useCallback(() => {
      setScanning(false);
      setPickedImage(null);
      setPickedBase64(null);
      setPendingBase64(null);
      setShowNamePrompt(false);
      setProductNameInput('');
    }, [])
  );

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Animations
  const slideY     = useRef(new Animated.Value(0)).current;
  const dimOpacity = useRef(new Animated.Value(0)).current;

  // ── Keyboard listeners ──
  useEffect(() => {
    const BOTTOM_REST = insets.bottom + 20;
    const showEv = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEv = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = Keyboard.addListener(showEv, (e) => {
      if (showNamePrompt) return; // Don't shift search bar when name prompt is open
      const kbHeight = e.endCoordinates.height;
      const translation = -(kbHeight - BOTTOM_REST + 20);
      setSearchFocused(true);
      Animated.parallel([
        Animated.spring(slideY, { toValue: translation, useNativeDriver: true, bounciness: 4, speed: 14 }),
        Animated.timing(dimOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    });
    const onHide = Keyboard.addListener(hideEv, () => {
      if (showNamePrompt) return;
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, useNativeDriver: true, bounciness: 3, speed: 14 }),
        Animated.timing(dimOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start(() => setSearchFocused(false));
    });
    return () => { onShow.remove(); onHide.remove(); };
  }, [insets.bottom, showNamePrompt]);

  // ── Live search via backend ──
  useEffect(() => {
    if (searchQuery.length < 2) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      const { data } = await ProductsAPI.search(searchQuery, 1, 7);
      setSuggestions(data?.products ?? []);
      setSearchLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const dismissSearch = () => {
    inputRef.current?.blur();
    Keyboard.dismiss();
    setSearchQuery('');
    setSuggestions([]);
  };

  // ── Navigate to product detail ──
  const openProduct = (raw: NormalizedProduct) => {
    setCurrentProduct(normalizedToProductData(raw));
    dismissSearch();
    router.push('/product-detail' as any);
  };

  // ── Barcode scanned ──
  const handleBarcode = async ({ data }: { data: string; type: string }) => {
    if (scanning || mode !== 'barcode') return;
    setScanning(true);
    const { data: product, error } = await ProductsAPI.byBarcode(data);
    if (product) {
      setCurrentProduct(normalizedToProductData(product));
      router.push('/product-detail' as any);
    } else {
      const msg = error?.includes('not found') || error?.includes('404')
        ? `No data found for barcode: ${data}`
        : (error || 'Failed to fetch product data.');
      Alert.alert('Product Not Found', msg, [
        { text: 'OK', onPress: () => setScanning(false) },
      ]);
    }
  };

  // ── Show product name prompt before ingredient analysis ──
  const promptForProductName = (base64: string, currentMode: ScanMode) => {
    if (currentMode === 'ingredient') {
      setPendingBase64(base64);
      setPendingMode(currentMode);
      setProductNameInput('');
      setShowNamePrompt(true);
      setTimeout(() => nameInputRef.current?.focus(), 300);
    } else {
      triggerAnalysis(base64, currentMode);
    }
  };

  const handleNameSubmit = () => {
    setShowNamePrompt(false);
    if (pendingBase64) {
      triggerAnalysis(pendingBase64, pendingMode, productNameInput.trim());
    }
    setPendingBase64(null);
  };

  const handleNameSkip = () => {
    setShowNamePrompt(false);
    if (pendingBase64) {
      triggerAnalysis(pendingBase64, pendingMode);
    }
    setPendingBase64(null);
  };

  // ── Gallery ──
  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission required', 'Grant gallery access.'); return; }
    
    const result = await ImagePicker.launchImageLibraryAsync({ 
      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
      allowsEditing: true, 
      quality: 0.7,
      base64: true
    });

    if (!result.canceled && result.assets[0].base64) {
      console.log('Gallery image picked successfully. URI:', result.assets[0].uri);
      const b64 = result.assets[0].base64;
      setPickedImage(result.assets[0].uri);
      setPickedBase64(b64);
      
      // Show product name prompt for ingredient mode, else analyze directly
      console.log('Automating analysis trigger for mode:', mode);
      promptForProductName(b64, mode);
    } else {
      console.log('Gallery picking canceled or base64 missing.');
    }
  };

  const triggerAnalysis = async (base64: string, currentMode: ScanMode, productName?: string) => {
    console.log('triggerAnalysis started. Mode:', currentMode, 'Product name:', productName || '(none)');
    setScanning(true);
    try {
      const apiCall = currentMode === 'barcode' 
        ? ProductsAPI.analyzeBarcode(base64)
        : ProductsAPI.analyzeLabel(base64, productName);
        
      console.log('Calling API...');
      const { data, error, status } = await apiCall;
      console.log('API Response status:', status);
      setScanning(false);
      
      if (data) {
        console.log('Product data received:', data.name);
        setCurrentProduct(normalizedToProductData(data));
        console.log('Navigating to product-detail...');
        router.push('/product-detail' as any);
        setPickedImage(null);
        setPickedBase64(null);
      } else {
        console.log('API Error:', error);
        const type = currentMode === 'barcode' ? 'barcode' : 'ingredients';
        Alert.alert('Analysis Failed', error || `AI could not analyze this image as a ${type}.`);
      }
    } catch (err: any) {
      console.log('triggerAnalysis Exception:', err);
      setScanning(false);
      Alert.alert('System Error', 'An unexpected error occurred: ' + (err.message || String(err)));
    }
  };

  const capturePhoto = async () => {
    // If we have a picked image (from gallery), analyze it based on current mode
    if (pickedImage && pickedBase64) {
      promptForProductName(pickedBase64, mode);
      return;
    }

    // Otherwise, handle live camera capture
    if (mode === 'ingredient') {
      if (!cameraRef.current) return;
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: true });
        if (!photo?.base64) {
          Alert.alert('Error', 'Camera failed to provide image data.');
          return;
        }
        promptForProductName(photo.base64, 'ingredient');
      } catch (e) {
        Alert.alert('Capture failed', 'Could not capture photo.');
      }
      return;
    }

    // Normal barcode camera capture
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (photo?.uri) setPickedImage(photo.uri);
    } catch {
      Alert.alert('Capture failed', 'Could not capture. Please try again.');
    }
  };

  const showDropdown = searchFocused && (suggestions.length > 0 || searchLoading);

  if (!permission) return <View style={styles.safe} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.permBox}>
          <Ionicons name="camera-outline" size={60} color={Colors.textMuted} />
          <Text style={styles.permTitle}>Camera Access Needed</Text>
          <Text style={styles.permSub}>Grant camera permission to scan food labels for nutritional analysis.</Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Allow Camera</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + SEARCH_BAR_H + 36 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Scan Item</Text>
          <Text style={styles.subtitle}>Point camera at a barcode or ingredient label</Text>
        </View>

        {/* Mode Toggle */}
        <View style={styles.modeRow}>
          {(['barcode', 'ingredient'] as ScanMode[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
              onPress={() => { setMode(m); setPickedImage(null); setScanning(false); }}
            >
              <Ionicons
                name={m === 'barcode' ? 'barcode-outline' : 'document-text-outline'}
                size={16}
                color={mode === m ? '#fff' : Colors.textMuted}
              />
              <Text style={[styles.modeBtnText, mode === m && { color: '#fff' }]}>
                {m === 'barcode' ? 'Barcode' : 'Ingredients Label'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Scanning status */}
        {scanning && (
          <View style={styles.scanningBanner}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={{ color: Colors.primary, fontWeight: '600', marginLeft: 8 }}>Looking up product…</Text>
          </View>
        )}

        {/* Viewfinder */}
        <View style={styles.viewfinder}>
          {pickedImage ? (
            <Image source={{ uri: pickedImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              enableTorch={torchOn}
              onBarcodeScanned={mode === 'barcode' && !scanning ? handleBarcode : undefined}
            />
          )}

          <View style={styles.corners}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
          </View>

          <View style={styles.scanLabelBox}>
            <Text style={styles.scanText}>
              {mode === 'barcode'
                ? (pickedImage ? 'Image selected  •  tap ✕ to retake' : 'Align barcode within frame')
                : (pickedImage ? 'Label selected  •  tap 🔍 to analyze' : 'Point at ingredient label or use gallery')}
            </Text>
          </View>

          {pickedImage && (
            <TouchableOpacity style={styles.clearBtn} onPress={() => setPickedImage(null)}>
              <Ionicons name="close-circle" size={30} color="#fff" />
            </TouchableOpacity>
          )}
          {torchOn && !pickedImage && (
            <View style={styles.flashBadge}>
              <Ionicons name="flashlight" size={12} color="#fff" />
              <Text style={styles.flashBadgeText}>TORCH ON</Text>
            </View>
          )}
        </View>

        {/* Mode description */}
        <View style={styles.modeHint}>
          <Ionicons
            name={mode === 'barcode' ? 'information-circle-outline' : 'sparkles-outline'}
            size={14}
            color={Colors.textMuted}
          />
          <Text style={styles.modeHintText}>
            {mode === 'barcode'
              ? 'Point at any food product barcode. Data fetched from Open Food Facts.'
              : 'Photograph the ingredient list on the packaging. AI will parse the label.'}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={openGallery}>
            <View style={styles.actionIconBox}>
              <Ionicons name="image-outline" size={22} color={Colors.textSecondary} />
            </View>
            <Text style={styles.actionLabel}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.scanBtn} onPress={capturePhoto}>
            {pickedImage ? (
              <Ionicons name="sparkles" size={28} color="#fff" />
            ) : (
              <View style={styles.scanBtnInner} />
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => setTorchOn((t) => !t)}>
            <View style={[styles.actionIconBox, torchOn && styles.flashActiveBox]}>
              <Ionicons
                name={torchOn ? 'flashlight' : 'flashlight-outline'}
                size={22}
                color={torchOn ? Colors.primary : Colors.textSecondary}
              />
            </View>
            <Text style={[styles.actionLabel, torchOn && { color: Colors.primary }]}>
              {torchOn ? 'Flash ON' : 'Flash'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Product Name Prompt Modal ── */}
      <Modal
        visible={showNamePrompt}
        transparent
        animationType="fade"
        onRequestClose={handleNameSkip}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconRow}>
              <View style={styles.modalIconBg}>
                <Ionicons name="pencil-outline" size={24} color={Colors.primary} />
              </View>
            </View>
            <Text style={styles.modalTitle}>Product Name</Text>
            <Text style={styles.modalSubtitle}>
              Enter the product name for better results, or skip to let AI detect it.
            </Text>
            <TextInput
              ref={nameInputRef}
              style={styles.modalInput}
              placeholder="e.g. Maggi Noodles, Amul Butter…"
              placeholderTextColor={Colors.textMuted}
              value={productNameInput}
              onChangeText={setProductNameInput}
              returnKeyType="done"
              onSubmitEditing={handleNameSubmit}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalSkipBtn} onPress={handleNameSkip}>
                <Text style={styles.modalSkipText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleNameSubmit}>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
                <Text style={styles.modalSubmitText}>Analyze</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Dim backdrop */}
      <Animated.View pointerEvents={searchFocused ? 'box-only' : 'none'} style={[styles.backdrop, { opacity: dimOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={dismissSearch} />
      </Animated.View>

      {/* Floating search panel */}
      <Animated.View style={[styles.searchPanel, { bottom: insets.bottom + 20, transform: [{ translateY: slideY }], zIndex: 100 }]}>
        {showDropdown && (
          <View style={styles.dropdown}>
            {searchLoading ? (
              <View style={styles.dropdownLoader}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={{ color: Colors.textMuted, marginLeft: 10, fontSize: 13 }}>Searching…</Text>
              </View>
            ) : (
              <FlatList
                data={suggestions}
                keyExtractor={(item) => item.id || item.name}
                scrollEnabled={suggestions.length > 5}
                keyboardShouldPersistTaps="handled"
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                renderItem={({ item }) => {
                  const nsColor = { A: '#038141', B: '#85BB2F', C: '#FECB02', D: '#EE8100', E: '#E63E11' }[item.nutriscore_grade?.toUpperCase() as string] ?? '#555';
                  const kcal = item.nutrients_100g?.energy_kcal;
                  return (
                    <TouchableOpacity style={styles.suggestionRow} onPress={() => openProduct(item)}>
                      {item.image_small_url || item.image_url ? (
                        <Image source={{ uri: item.image_small_url || item.image_url }} style={styles.suggestionImg} />
                      ) : (
                        <View style={[styles.suggestionImg, { backgroundColor: '#252525', alignItems: 'center', justifyContent: 'center' }]}>
                          <Text>🛒</Text>
                        </View>
                      )}
                      <View style={styles.suggestionInfo}>
                        <Text style={styles.suggestionName} numberOfLines={1}>{item.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.suggestionBrand} numberOfLines={1}>{item.brand || 'Unknown brand'}</Text>
                          {kcal != null && (
                            <Text style={[styles.suggestionBrand, { color: Colors.primary, fontWeight: '700' }]}>
                              • {Math.round(kcal)} kcal
                            </Text>
                          )}
                        </View>
                      </View>
                      {item.nutriscore_grade && (
                        <View style={[styles.nsBadge, { backgroundColor: nsColor }]}>
                          <Text style={styles.nsBadgeText}>{item.nutriscore_grade.toUpperCase()}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        )}

        <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
          <Ionicons name="search-outline" size={18} color={searchFocused ? Colors.primary : Colors.textMuted} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search product by name or brand…"
            placeholderTextColor={Colors.textMuted}
            returnKeyType="search"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchFocused && (
            <TouchableOpacity onPress={dismissSearch}>
              <Text style={styles.cancelBtn}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  permBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  permTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginTop: 20, marginBottom: 10, textAlign: 'center' },
  permSub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: 28 },
  permBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 },
  permBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },

  modeRow: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 12, gap: 8 },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 9, borderRadius: 12, backgroundColor: Colors.card,
    borderWidth: 1, borderColor: Colors.border,
  },
  modeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },

  scanningBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, marginHorizontal: 20, marginBottom: 8,
    backgroundColor: Colors.primaryMuted, borderRadius: 12,
  },

  viewfinder: { marginHorizontal: 20, borderRadius: 24, overflow: 'hidden', height: 280, backgroundColor: '#000', borderWidth: 1, borderColor: Colors.border },
  corners: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: Colors.primary, borderWidth: 3 },
  tl: { top: 16, left: 16, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
  tr: { top: 16, right: 16, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
  bl: { bottom: 16, left: 16, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
  br: { bottom: 16, right: 16, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
  scanLabelBox: { position: 'absolute', bottom: 16, left: 0, right: 0, alignItems: 'center' },
  scanText: { color: 'rgba(255,255,255,0.75)', fontSize: 12, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  clearBtn: { position: 'absolute', top: 12, right: 12 },
  flashBadge: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  flashBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },

  modeHint: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginHorizontal: 24, marginTop: 10, marginBottom: 2 },
  modeHintText: { flex: 1, fontSize: 11, color: Colors.textMuted, lineHeight: 16 },

  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 32, marginTop: 16, marginBottom: 8 },
  actionBtn: { alignItems: 'center', gap: 6 },
  actionIconBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  flashActiveBox: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  actionLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '600' },
  scanBtn: { width: 74, height: 74, borderRadius: 37, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 14, elevation: 12 },
  scanBtnInner: { width: 54, height: 54, borderRadius: 27, borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' },

  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 99 },

  searchPanel: { position: 'absolute', left: 16, right: 16 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.card, borderRadius: 16,
    paddingHorizontal: 14, height: SEARCH_BAR_H,
    borderWidth: 1.5, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 8,
  },
  searchBarFocused: { borderColor: Colors.primary },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: 14 },
  cancelBtn: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  dropdown: {
    backgroundColor: Colors.card, borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
    marginBottom: 8, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  dropdownLoader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  separator: { height: 1, backgroundColor: Colors.border, marginHorizontal: 14 },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  suggestionImg: { width: 40, height: 40, borderRadius: 8 },
  suggestionInfo: { flex: 1 },
  suggestionName: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  suggestionBrand: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  nsBadge: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  nsBadgeText: { fontSize: 13, fontWeight: '900', color: '#fff' },

  // Product name prompt modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  modalCard: {
    width: '100%', backgroundColor: Colors.card, borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 16,
  },
  modalIconRow: { alignItems: 'center', marginBottom: 12 },
  modalIconBg: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginBottom: 6 },
  modalSubtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 19, marginBottom: 16 },
  modalInput: {
    backgroundColor: Colors.background, borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: Colors.textPrimary, marginBottom: 18,
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalSkipBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
  },
  modalSkipText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  modalSubmitBtn: {
    flex: 1.5, flexDirection: 'row', gap: 6, paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary,
  },
  modalSubmitText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
