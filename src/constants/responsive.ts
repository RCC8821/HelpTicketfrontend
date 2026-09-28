import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base design width (iPhone 11 / common design size)
const BASE_WIDTH = 390;

/**
 * Horizontal scale - width ke hisaab se
 */
export const wp = (size: number) => {
  return (SCREEN_WIDTH / BASE_WIDTH) * size;
};

/**
 * Vertical scale - height ke hisaab se (thoda soft)
 */
export const hp = (size: number) => {
  return (SCREEN_HEIGHT / 844) * size;
};

/**
 * Font scale - text ke liye best
 * (zyada bada/chhota nahi hota, balanced rehta hai)
 */
export const fp = (size: number) => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scale;

  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  }
  return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 1;
};

/**
 * Moderate scale - buttons/icons ke liye
 */
export const ms = (size: number, factor = 0.5) => {
  return size + (wp(size) - size) * factor;
};

export const SCREEN = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  isSmall: SCREEN_WIDTH < 360,
  isLarge: SCREEN_WIDTH > 400,
};