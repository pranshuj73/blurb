import { BlurbColors } from '@/theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import React from 'react';
import { Keyboard, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type HeightMode = 'fit' | 'full' | `${number}%`;

type BlurbFormSheetProps = {
  title: string;
  onClose: () => void;
  height?: HeightMode;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function BlurbFormSheet({ title, onClose, height = 'fit', children, footer }: BlurbFormSheetProps) {
  const insets = useSafeAreaInsets();
  const keyboardOffset = useSharedValue(0);

  React.useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      const nextOffset = Math.max(event.endCoordinates.height - insets.bottom, 0);
      keyboardOffset.value = withTiming(nextOffset, {
        duration: event.duration ?? 220,
        easing: Easing.out(Easing.cubic),
      });
    });

    const hideSub = Keyboard.addListener(hideEvent, (event) => {
      keyboardOffset.value = withTiming(0, {
        duration: event?.duration ?? 180,
        easing: Easing.out(Easing.cubic),
      });
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [insets.bottom, keyboardOffset]);

  const sheetLiftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -keyboardOffset.value }],
  }));

  const heightStyle =
    height === 'full'
      ? styles.sheetFull
      : height === 'fit'
        ? null
        : { height };

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)} style={styles.backdrop} />
      <View style={styles.keyboardWrap}>
        <Animated.View
          entering={SlideInDown.duration(220).easing(Easing.out(Easing.cubic))}
          exiting={SlideOutDown.duration(180).easing(Easing.in(Easing.cubic))}
          style={[
            sheetLiftStyle,
            styles.sheet,
            heightStyle,
            {
              paddingTop: 18,
              paddingBottom: insets.bottom + 24,
            },
          ]}
        >
          <View style={styles.header}>
            <TouchableOpacity style={styles.iconButton} onPress={onClose} activeOpacity={0.85}>
              <X color={BlurbColors.textSecondary} size={18} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{title}</Text>
            <View style={styles.iconButtonPlaceholder} />
          </View>

          <View style={styles.body}>{children}</View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  keyboardWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
  },
  sheet: {
    backgroundColor: '#0C0C0E',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 18,
  },
  sheetFull: {
    minHeight: '92%',
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  iconButtonPlaceholder: {
    width: 38,
    height: 38,
  },
  headerTitle: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700',
    color: BlurbColors.text,
    fontFamily: 'Manrope',
  },
  body: {
    gap: 16,
  },
  footer: {
    marginTop: 22,
    marginBottom: 4,
  },
});
