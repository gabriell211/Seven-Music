import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

type Props = {
  size?: number;
};

export function SevenMark({ size = 34 }: Props) {
  const height = size * 1.0963;

  return (
    <Svg
      width={size}
      height={height}
      viewBox="0 0 135 148"
      accessibilityRole="image"
      accessibilityLabel="Seven Music"
    >
      <Defs>
        <LinearGradient id="sevenTop" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#F19BFF"/>
          <Stop offset="0.38" stopColor="#C45CFF"/>
          <Stop offset="0.73" stopColor="#7C2CFF"/>
          <Stop offset="1" stopColor="#3D125F"/>
        </LinearGradient>
        <LinearGradient id="sevenBlade" x1="0.2" y1="0" x2="0.85" y2="1">
          <Stop offset="0" stopColor="#D569FF"/>
          <Stop offset="0.32" stopColor="#9B3EFF"/>
          <Stop offset="0.7" stopColor="#6224C8"/>
          <Stop offset="1" stopColor="#35104F"/>
        </LinearGradient>
        <LinearGradient id="sevenLight" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#F7B2FF" stopOpacity="0.9"/>
          <Stop offset="0.55" stopColor="#A34BFF" stopOpacity="0.45"/>
          <Stop offset="1" stopColor="#55209C" stopOpacity="0"/>
        </LinearGradient>
      </Defs>

      <Path
        d="M132 1H39C27 1 20 5 13 14C6 23 2 36 2 57C13 48 21 43 29 39C46 36 65 38 86 36C103 31 118 18 132 1Z"
        fill="url(#sevenTop)"
      />
      <Path
        d="M119 31C103 35 89 39 77 45C65 52 55 63 46 77C35 94 27 116 22 146C31 137 38 127 44 116C55 97 68 82 81 64C95 47 108 36 119 31Z"
        fill="url(#sevenBlade)"
      />
      <Path
        d="M91 36C78 46 67 58 57 74C48 89 40 105 34 122C46 107 58 95 68 80C78 65 88 51 101 39C98 38 95 37 91 36Z"
        fill="url(#sevenLight)"
        opacity="0.92"
      />
    </Svg>
  );
}
