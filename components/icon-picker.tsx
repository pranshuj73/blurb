import { BlurbColors } from '@/theme/colors';
import { BlurbTypography } from '@/theme/typography';
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  Dimensions,
  PanResponder,
} from 'react-native';
import {
  Home,
  Mail,
  Phone,
  User,
  Link as LinkIcon,
  Github,
  Twitter,
  Linkedin,
  Instagram,
  Facebook,
  Youtube,
  Music,
  Camera,
  Image,
  Video,
  FileText,
  Book,
  Bookmark,
  Heart,
  Star,
  MapPin,
  Calendar,
  Clock,
  MessageCircle,
  Send,
  Globe,
  Settings,
  Bell,
  Shield,
  Lock,
  Key,
  Download,
  Upload,
  Share2,
  ExternalLink,
  Code,
  Terminal,
  Coffee,
  Briefcase,
  ShoppingCart,
  CreditCard,
  DollarSign,
  TrendingUp,
  BarChart,
  PieChart,
  Activity,
  Zap,
  Sun,
  Moon,
  Cloud,
  Umbrella,
  Wind,
  Eye,
  EyeOff,
  Search,
  Filter,
  Edit,
  Trash2,
  Plus,
  Minus,
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
} from 'lucide-react-native';
import Animated, {
  Extrapolation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ICON_SIZE = 24;
const ICON_COLOR = BlurbColors.text;
const DISMISS_THRESHOLD = 120;
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Popular icons catalog
const ICON_CATALOG = [
  { name: 'Home', component: Home },
  { name: 'Mail', component: Mail },
  { name: 'Phone', component: Phone },
  { name: 'User', component: User },
  { name: 'Link', component: LinkIcon },
  { name: 'Github', component: Github },
  { name: 'Twitter', component: Twitter },
  { name: 'Linkedin', component: Linkedin },
  { name: 'Instagram', component: Instagram },
  { name: 'Facebook', component: Facebook },
  { name: 'Youtube', component: Youtube },
  { name: 'Music', component: Music },
  { name: 'Camera', component: Camera },
  { name: 'Image', component: Image },
  { name: 'Video', component: Video },
  { name: 'FileText', component: FileText },
  { name: 'Book', component: Book },
  { name: 'Bookmark', component: Bookmark },
  { name: 'Heart', component: Heart },
  { name: 'Star', component: Star },
  { name: 'MapPin', component: MapPin },
  { name: 'Calendar', component: Calendar },
  { name: 'Clock', component: Clock },
  { name: 'MessageCircle', component: MessageCircle },
  { name: 'Send', component: Send },
  { name: 'Globe', component: Globe },
  { name: 'Settings', component: Settings },
  { name: 'Bell', component: Bell },
  { name: 'Shield', component: Shield },
  { name: 'Lock', component: Lock },
  { name: 'Key', component: Key },
  { name: 'Download', component: Download },
  { name: 'Upload', component: Upload },
  { name: 'Share2', component: Share2 },
  { name: 'ExternalLink', component: ExternalLink },
  { name: 'Code', component: Code },
  { name: 'Terminal', component: Terminal },
  { name: 'Coffee', component: Coffee },
  { name: 'Briefcase', component: Briefcase },
  { name: 'ShoppingCart', component: ShoppingCart },
  { name: 'CreditCard', component: CreditCard },
  { name: 'DollarSign', component: DollarSign },
  { name: 'TrendingUp', component: TrendingUp },
  { name: 'BarChart', component: BarChart },
  { name: 'PieChart', component: PieChart },
  { name: 'Activity', component: Activity },
  { name: 'Zap', component: Zap },
  { name: 'Sun', component: Sun },
  { name: 'Moon', component: Moon },
  { name: 'Cloud', component: Cloud },
  { name: 'Umbrella', component: Umbrella },
  { name: 'Wind', component: Wind },
  { name: 'Eye', component: Eye },
  { name: 'EyeOff', component: EyeOff },
  { name: 'Search', component: Search },
  { name: 'Filter', component: Filter },
  { name: 'Edit', component: Edit },
  { name: 'Trash2', component: Trash2 },
  { name: 'Plus', component: Plus },
  { name: 'Minus', component: Minus },
  { name: 'Check', component: Check },
  { name: 'X', component: X },
  { name: 'ChevronRight', component: ChevronRight },
  { name: 'ChevronLeft', component: ChevronLeft },
  { name: 'ChevronUp', component: ChevronUp },
  { name: 'ChevronDown', component: ChevronDown },
  { name: 'ArrowRight', component: ArrowRight },
  { name: 'ArrowLeft', component: ArrowLeft },
  { name: 'ArrowUp', component: ArrowUp },
  { name: 'ArrowDown', component: ArrowDown },
];

interface IconPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectIcon: (iconName: string) => void;
  topActionLabel?: string;
  onPressTopAction?: () => void;
}

export function IconPicker({
  visible,
  onClose,
  onSelectIcon,
  topActionLabel,
  onPressTopAction,
}: IconPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [scrollOffset, setScrollOffset] = useState(0);
  const insets = useSafeAreaInsets();
  const drawerOffset = useSharedValue(SCREEN_HEIGHT);
  const isPulling = useSharedValue(false);

  const closePicker = React.useCallback(() => {
    drawerOffset.value = withSpring(
      SCREEN_HEIGHT,
      {
        damping: 30,
        stiffness: 300,
        mass: 0.7,
      },
      (finished) => {
        'worklet';
        if (finished) {
          runOnJS(setSearchQuery)('');
          runOnJS(onClose)();
        }
      }
    );
  }, [drawerOffset, onClose]);

  React.useEffect(() => {
    if (!visible) return;

    drawerOffset.value = SCREEN_HEIGHT;
    drawerOffset.value = withSpring(0, {
      damping: 28,
      stiffness: 300,
      mass: 0.7,
    });
  }, [drawerOffset, visible]);

  const filteredIcons = useMemo(() => {
    if (!searchQuery.trim()) {
      return ICON_CATALOG;
    }
    const query = searchQuery.toLowerCase();
    return ICON_CATALOG.filter(icon =>
      icon.name.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleSelectIcon = (iconName: string) => {
    onSelectIcon(iconName);
    closePicker();
  };

  const drawerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      drawerOffset.value,
      [0, SCREEN_HEIGHT],
      [1, 0],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      drawerOffset.value,
      [0, SCREEN_HEIGHT],
      [1, 0.95],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ translateY: drawerOffset.value }, { scale }],
      opacity,
    };
  });

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gestureState) => {
          const isVerticalDrag = Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
          return scrollOffset <= 0 && gestureState.dy > 8 && isVerticalDrag;
        },
        onPanResponderGrant: () => {
          isPulling.value = true;
        },
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            drawerOffset.value = gestureState.dy;
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > DISMISS_THRESHOLD) {
            closePicker();
          } else {
            drawerOffset.value = withSpring(0, {
              damping: 28,
              stiffness: 300,
              mass: 0.7,
            });
          }
          isPulling.value = false;
        },
        onPanResponderTerminate: () => {
          drawerOffset.value = withSpring(0, {
            damping: 28,
            stiffness: 300,
            mass: 0.7,
          });
          isPulling.value = false;
        },
      }),
    [closePicker, drawerOffset, isPulling, scrollOffset]
  );

  const renderIcon = ({ item }: { item: typeof ICON_CATALOG[0] }) => {
    const IconComponent = item.component;
    return (
      <TouchableOpacity
        style={styles.iconItem}
        onPress={() => handleSelectIcon(item.name)}
      >
        <View style={styles.iconCircle}>
          <IconComponent size={ICON_SIZE} color={ICON_COLOR} />
        </View>
        <Text style={styles.iconName}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      presentationStyle="overFullScreen"
      transparent
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.drawerContainer, drawerStyle]}>
        <Animated.View
          {...panResponder.panHandlers}
          style={[styles.sheet, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 18 }]}
        >
              <View>
                <View style={styles.handleWrap}>
                  <View style={styles.handle} />
                </View>

                <View style={styles.header}>
                  <Text style={styles.headerTitle}>Pick an Icon</Text>
                  <TouchableOpacity onPress={closePicker} style={styles.closeButton}>
                    <Text style={styles.closeButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.searchContainer}>
                <Search size={20} color={BlurbColors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search icons..."
                  placeholderTextColor={BlurbColors.textTertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={20} color={BlurbColors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              {topActionLabel && onPressTopAction ? (
                <TouchableOpacity style={styles.topActionButton} onPress={onPressTopAction} activeOpacity={0.88}>
                  <Text style={styles.topActionButtonText}>{topActionLabel}</Text>
                </TouchableOpacity>
              ) : null}

              <FlatList
                data={filteredIcons}
                renderItem={renderIcon}
                keyExtractor={(item) => item.name}
                numColumns={3}
                onScroll={(event) => {
                  setScrollOffset(event.nativeEvent.contentOffset.y);
                }}
                scrollEventThrottle={16}
                contentContainerStyle={styles.iconGrid}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No icons found</Text>
                  </View>
                }
              />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: BlurbColors.backgroundElevated,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  sheet: {
    flex: 1,
    backgroundColor: BlurbColors.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  handleWrap: {
    alignItems: 'center',
    paddingBottom: 6,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BlurbColors.border,
  },
  headerTitle: {
    ...BlurbTypography.title,
    color: BlurbColors.text,
  },
  closeButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  closeButtonText: {
    ...BlurbTypography.body,
    color: BlurbColors.text,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BlurbColors.backgroundElevated,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BlurbColors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    ...BlurbTypography.body,
    color: BlurbColors.text,
    paddingVertical: 4,
  },
  topActionButton: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 6,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: BlurbColors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topActionButtonText: {
    ...BlurbTypography.body,
    color: BlurbColors.background,
    fontWeight: '700',
  },
  iconGrid: {
    padding: 16,
  },
  iconItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    marginHorizontal: 4,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BlurbColors.backgroundElevated,
    borderWidth: 1,
    borderColor: BlurbColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconName: {
    ...BlurbTypography.small,
    color: BlurbColors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    ...BlurbTypography.body,
    color: BlurbColors.textSecondary,
  },
});
