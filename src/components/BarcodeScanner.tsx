import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useRef } from 'react';
import { Modal, View } from 'react-native';
import { Btn, Text } from './ui';

export default function BarcodeScanner({ onScan, onClose }: { onScan: (code: string) => void; onClose: () => void }) {
  const [perm, ask] = useCameraPermissions();
  const done = useRef(false);
  useEffect(() => { if (perm && !perm.granted && perm.canAskAgain) ask(); }, [perm]);

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 bg-black">
        {perm?.granted ? (
          <CameraView
            style={{ flex: 1 }} facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'] }}
            onBarcodeScanned={({ data }) => { if (done.current) return; done.current = true; onScan(data); }}
          />
        ) : (
          <View className="flex-1 items-center justify-center p-8 gap-4">
            <Text className="text-white text-center text-lg">ক্যামেরা চালু করতে অনুমতি দিন</Text>
            {perm && !perm.canAskAgain ? <Text className="text-rose-300 text-center">ফোনের সেটিং → অ্যাপ → ইজিদোকান → পারমিশন থেকে ক্যামেরা চালু করুন</Text> : <Btn title="অনুমতি দিন" onPress={ask} />}
          </View>
        )}
        <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
          <View className="w-72 h-40 rounded-2xl border-4 border-brand-400" />
          <Text className="text-white text-lg mt-6">বারকোডের সামনে ক্যামেরা ধরুন</Text>
        </View>
        <View className="absolute bottom-10 left-0 right-0 items-center"><Btn title="বন্ধ করুন" variant="soft" onPress={onClose} /></View>
      </View>
    </Modal>
  );
}
