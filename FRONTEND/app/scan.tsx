import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Image,
  FlatList, Animated, Keyboard, Platform,
  ScrollView, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../constants/ThemeContext';
import { useProduct, ProductData } from '../constants/ProductContext';
import { ProductsAPI, NormalizedProduct } from '../constants/api';
import { normalizedToProductData } from '../utils/productMapper';
import SearchBar from '../components/SearchBar';
import ProductCard from '../components/ProductCard';

const SEARCH_BAR_H = 52;

type ScanMode = 'barcode' | 'ingredient';

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { setCurrentProduct } = useProduct();

  // ── Camera ──
  const [permission, requestPermission] = useCameraPermissions();
  const [torchOn, setTorchOn] = useState(false);
  const [pickedImage, setPickedImage] = useState<string | null>(null);
  const [pickedBase64, setPickedBase64] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  // ── Scan mode ──
  const [mode, setMode] = useState<ScanMode>('barcode');
  const [scanning, setScanning] = useState(false);

  // ── Product name prompt ──
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [productNameInput, setProductNameInput] = useState('');
  const [pendingBase64, setPendingBase64] = useState<string | null>(null);
  const [pendingMode, setPendingMode] = useState<ScanMode>('ingredient');
  const nameInputRef = useRef<any>(null);

  // Reset scanner state when screen gains focus (e.g. returning from product-detail)
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

  // ── Floating search state ──
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<NormalizedProduct[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const inputRef = useRef<any>(null);

  // Slide + dim animations for keyboard
  const slideY     = useRef(new Animated.Value(0)).current;
  const dimOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const BOTTOM_REST = insets.bottom + 20;
    const showEv = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEv = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = Keyboard.addListener(showEv, (e) => {
      if (showNamePrompt) return;
      const translation = -(e.endCoordinates.height - BOTTOM_REST + 20);
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

  // Debounced search suggestions
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

  const openProduct = (raw: NormalizedProduct) => {
    setCurrentProduct(normalizedToProductData(raw));
    dismissSearch();
    router.push('/product-detail' as any);
  };

  // ── Barcode scan ──
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
      Alert.alert('Product Not Found', msg, [{ text: 'OK', onPress: () => setScanning(false) }]);
    }
  };

  // ── Product name prompt before ingredient analysis ──
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
    if (pendingBase64) triggerAnalysis(pendingBase64, pendingMode, productNameInput.trim());
    setPendingBase64(null);
  };

  const handleNameSkip = () => {
    setShowNamePrompt(false);
    if (pendingBase64) triggerAnalysis(pendingBase64, pendingMode);
    setPendingBase64(null);
  };

  // ── Gallery ──
  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission required', 'Grant gallery access.'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, quality: 0.7, base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const b64 = result.assets[0].base64;
      setPickedImage(result.assets[0].uri);
      setPickedBase64(b64);
      promptForProductName(b64, mode);
    }
  };

  // ── AI analysis ──
  const triggerAnalysis = async (base64: string, currentMode: ScanMode, productName?: string) => {
    setScanning(true);
    try {
      const apiCall = currentMode === 'barcode'
        ? ProductsAPI.analyzeBarcode(base64)
        : ProductsAPI.analyzeLabel(base64, productName);

      const { data, error } = await apiCall;
      setScanning(false);

      if (data) {
        setCurrentProduct(normalizedToProductData(data));
        router.push('/product-detail' as any);
        setPickedImage(null);
        setPickedBase64(null);
      } else {
        const type = currentMode === 'barcode' ? 'barcode' : 'ingredients';
        Alert.alert('Analysis Failed', error || `AI could not analyze this image as a ${type}.`);
      }
    } catch (err: any) {
      setScanning(false);
      Alert.alert('System Error', 'An unexpected error occurred: ' + (err.message || String(err)));
    }
  };

  const capturePhoto = async () => {
    if (pickedImage && pickedBase64) {
      promptForProductName(pickedBase64, mode);
      return;
    }
    if (mode === 'ingredient') {
      if (!cameraRef.current) return;
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: true });
        if (!photo?.base64) { Alert.alert('Error', 'Camera failed to provide image data.'); return; }
        promptForProductName(photo.base64, 'ingredient');
      } catch {
        Alert.alert('Capture failed', 'Could not capture photo.');
      }
      return;
    }
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (photo?.uri) setPickedImage(photo.uri);
    } catch {
      Alert.alert('Capture failed', 'Could not capture. Please try again.');
    }
  };

  const showDropdown = searchFocused && (suggestions.length > 0 || searchLoading);

  if (!permission) return <View style={[styles.safe, { backgroundColor: colors.background }]} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={styles.permBox}>
          <Ionicons name="camera-outline" size={60} color={colors.textMuted} />
          <Text style={[styles.permTitle, { color: colors.textPrimary }]}>Camera Access Needed</Text>
          <Text style={[styles.permSub, { color: colors.textSecondary }]}>
            Grant camera permission to scan food labels for nutritional analysis.
          </Text>
          <TouchableOpacity style={[styles.permBtn, { backgroundColor: colors.primary }]} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Allow Camera</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + SEARCH_BAR_H + 36 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Scan Item</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Point camera at a barcode or ingredient label
          </Text>
        </View>

        {/* Mode toggle */}
        <View style={styles.modeRow}>
          {(['barcode', 'ingredient'] as ScanMode[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={[
                styles.modeBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
                mode === m && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => { setMode(m); setPickedImage(null); setScanning(false); }}
            >
              <Ionicons
                name={m === 'barcode' ? 'barcode-outline' : 'document-text-outline'}
                size={16}
                color={mode === m ? '#fff' : colors.textMuted}
              />
              <Text style={[styles.modeBtnText, { color: mode === m ? '#fff' : colors.textMuted }]}>
                {m === 'barcode' ? 'Barcode' : 'Ingredients Label'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Scanning banner */}
        {scanning ? (
          <View style={[styles.scanningBanner, { backgroundColor: colors.primaryMuted }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '600', marginLeft: 8 }}>Looking up product…</Text>
          </View>
        ) : null}

        {/* Viewfinder */}
        <View style={[styles.viewfinder, { borderColor: colors.border }]}>
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

          {/* Corner markers */}
          <View style={styles.corners}>
            {[styles.tl, styles.tr, styles.bl, styles.br].map((cs, i) => (
              <View key={i} style={[styles.corner, cs, { borderColor: colors.primary }]} />
            ))}
          </View>

          <View style={styles.scanLabelBox}>
            <Text style={styles.scanText}>
              {mode === 'barcode'
                ? (pickedImage ? 'Image selected  •  tap ✕ to retake' : 'Align barcode within frame')
                : (pickedImage ? 'Label selected  •  tap 🔍 to analyze' : 'Point at ingredient label or use gallery')}
            </Text>
          </View>

          {pickedImage ? (
            <TouchableOpacity style={styles.clearBtn} onPress={() => setPickedImage(null)}>
              <Ionicons name="close-circle" size={30} color="#fff" />
            </TouchableOpacity>
          ) : null}

          {torchOn && !pickedImage ? (
            <View style={[styles.flashBadge, { backgroundColor: colors.primary }]}>
              <Ionicons name="flashlight" size={12} color="#fff" />
              <Text style={styles.flashBadgeText}>TORCH ON</Text>
            </View>
          ) : null}
        </View>

        {/* Mode hint */}
        <View style={styles.modeHint}>
          <Ionicons
            name={mode === 'barcode' ? 'information-circle-outline' : 'sparkles-outline'}
            size={14}
            color={colors.textMuted}
          />
          <Text style={[styles.modeHintText, { color: colors.textMuted }]}>
            {mode === 'barcode'
              ? 'Point at any food product barcode. Data fetched from Open Food Facts.'
              : 'Photograph the ingredient list on the packaging. AI will parse the label.'}
          </Text>
        </View>

        {/* Camera actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={openGallery}>
            <View style={[styles.actionIconBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="image-outline" size={22} color={colors.textSecondary} />
            </View>
            <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.scanBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
            onPress={capturePhoto}
          >
            {pickedImage
              ? <Ionicons name="sparkles" size={28} color="#fff" />
              : <View style={styles.scanBtnInner} />}
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => setTorchOn((t) => !t)}>
            <View style={[
              styles.actionIconBox,
              { backgroundColor: colors.card, borderColor: colors.border },
              torchOn && { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
            ]}>
              <Ionicons
                name={torchOn ? 'flashlight' : 'flashlight-outline'}
                size={22}
                color={torchOn ? colors.primary : colors.textSecondary}
              />
            </View>
            <Text style={[styles.actionLabel, { color: torchOn ? colors.primary : colors.textSecondary }]}>
              {torchOn ? 'Flash ON' : 'Flash'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Product name prompt modal */}
      <Modal visible={showNamePrompt} transparent animationType="fade" onRequestClose={handleNameSkip}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalIconRow}>
              <View style={[styles.modalIconBg, { backgroundColor: colors.primaryMuted }]}>
                <Ionicons name="pencil-outline" size={24} color={colors.primary} />
              </View>
            </View>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Product Name</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Enter the product name for better results, or skip to let AI detect it.
            </Text>
            <View style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <SearchBar
                ref={nameInputRef}
                value={productNameInput}
                onChangeText={setProductNameInput}
                placeholder="e.g. Maggi Noodles, Amul Butter…"
                onSubmitEditing={handleNameSubmit}
                height={46}
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalSkipBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={handleNameSkip}
              >
                <Text style={[styles.modalSkipText, { color: colors.textSecondary }]}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: colors.primary }]}
                onPress={handleNameSubmit}
              >
                <Ionicons name="arrow-forward" size={18} color="#fff" />
                <Text style={styles.modalSubmitText}>Analyze</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Dim backdrop */}
      <Animated.View
        pointerEvents={searchFocused ? 'box-only' : 'none'}
        style={[styles.backdrop, { opacity: dimOpacity }]}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={dismissSearch} />
      </Animated.View>

      {/* Floating search panel */}
      <Animated.View
        style={[styles.searchPanel, { bottom: insets.bottom + 20, transform: [{ translateY: slideY }], zIndex: 100 }]}
      >
        {showDropdown ? (
          <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {searchLoading ? (
              <View style={styles.dropdownLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={{ color: colors.textMuted, marginLeft: 10, fontSize: 13 }}>Searching…</Text>
              </View>
            ) : (
              <FlatList
                data={suggestions}
                keyExtractor={(item) => item.id || item.name}
                scrollEnabled={suggestions.length > 5}
                keyboardShouldPersistTaps="handled"
                ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
                renderItem={({ item }) => (
                  <ProductCard product={item} onPress={() => openProduct(item)} compact />
                )}
              />
            )}
          </View>
        ) : null}

        <SearchBar
          ref={inputRef}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search product by name or brand…"
          focused={searchFocused}
          onCancel={dismissSearch}
          height={SEARCH_BAR_H}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  permBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  permTitle: { fontSize: 22, fontWeight: '800', marginTop: 20, marginBottom: 10, textAlign: 'center' },
  permSub: { fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 28 },
  permBtn: { borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 },
  permBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 4 },

  modeRow: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 12, gap: 8 },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 9, borderRadius: 12, borderWidth: 1,
  },
  modeBtnText: { fontSize: 13, fontWeight: '600' },

  scanningBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, marginHorizontal: 20, marginBottom: 8, borderRadius: 12,
  },

  viewfinder: {
    marginHorizontal: 20, borderRadius: 24, overflow: 'hidden',
    height: 280, backgroundColor: '#000', borderWidth: 1,
  },
  corners: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  corner: { position: 'absolute', width: 28, height: 28, borderWidth: 3 },
  tl: { top: 16, left: 16, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
  tr: { top: 16, right: 16, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
  bl: { bottom: 16, left: 16, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
  br: { bottom: 16, right: 16, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
  scanLabelBox: { position: 'absolute', bottom: 16, left: 0, right: 0, alignItems: 'center' },
  scanText: {
    color: 'rgba(255,255,255,0.75)', fontSize: 12,
    backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
  },
  clearBtn: { position: 'absolute', top: 12, right: 12 },
  flashBadge: {
    position: 'absolute', top: 12, left: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4,
  },
  flashBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },

  modeHint: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginHorizontal: 24, marginTop: 10, marginBottom: 2 },
  modeHintText: { flex: 1, fontSize: 11, lineHeight: 16 },

  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 32, marginTop: 16, marginBottom: 8 },
  actionBtn: { alignItems: 'center', gap: 6 },
  actionIconBox: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  actionLabel: { fontSize: 11, fontWeight: '600' },
  scanBtn: {
    width: 74, height: 74, borderRadius: 37, alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 14, elevation: 12,
  },
  scanBtnInner: { width: 54, height: 54, borderRadius: 27, borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' },

  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 99 },

  searchPanel: { position: 'absolute', left: 16, right: 16 },
  searchBar: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 8,
  },
  dropdown: {
    borderRadius: 16, borderWidth: 1, marginBottom: 8, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  dropdownLoader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  separator: { height: 1, marginHorizontal: 14 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  modalCard: { width: '100%', borderRadius: 20, padding: 24, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 16 },
  modalIconRow: { alignItems: 'center', marginBottom: 12 },
  modalIconBg: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  modalSubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 16 },
  modalInput: { marginBottom: 18 },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalSkipBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  modalSkipText: { fontSize: 14, fontWeight: '600' },
  modalSubmitBtn: { flex: 1.5, flexDirection: 'row', gap: 6, paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modalSubmitText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
