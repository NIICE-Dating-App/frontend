// signup.tsx - FIXED FOR RESPONSIVENESS
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { scale, verticalScale } from '@/utils/responsive';
import { Image, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function SignupScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  
  return (
    <ThemedView style={styles.container}>
      {/* Decorative circles section */}
      <View style={styles.decorativeSection}>
        <View style={styles.decorativeRow1}>
          <View style={[styles.circle, styles.smallCircle]} />
          <View style={styles.decorativeColumn}>
            <View style={styles.decorativeSubColumn}>
              <View style={[styles.circle, styles.mediumCircle]} />
              <View style={[styles.circle, styles.largeCircle]} />
            </View>
            <View style={[styles.circle, styles.largeCircle, styles.offsetCircle]} />
          </View>
          <View style={[styles.circle, styles.mediumTallCircle]} />
        </View>
        
        <View style={styles.decorativeRow2}>
          <View style={styles.decorativeColumnLeft}>
            <View style={[styles.circle, styles.largeCircle]} />
            <View style={[styles.circle, styles.smallCircle, styles.offsetSmall]} />
            <View style={[styles.circle, styles.largeCircle, styles.offsetLarge]} />
          </View>
          
          <View style={styles.decorativeMainSection}>
            <View style={styles.decorativeTopRow}>
              <View style={styles.decorativeInnerColumn}>
                <View style={[styles.circle, styles.largeCircle]} />
                <View style={[styles.circle, styles.largeCircle, styles.offsetTop]} />
              </View>
              <Image
                source={{
                  uri: "https://api.builder.io/api/v1/image/assets/TEMP/b6002ea4a4383f42d0b34147c6d0b49e80ebfe5f?placeholderIfAbsent=true",
                }}
                style={styles.decorativeImage}
                resizeMode="contain"
              />
            </View>
            <View style={[styles.circle, styles.smallCircle, styles.centeredSmall]} />
            
            <View style={styles.decorativeBottomSection}>
              <View style={styles.decorativeBottomColumn}>
                <View style={styles.decorativeBottomRow}>
                  <View style={[styles.circle, styles.largeCircle]} />
                  <View style={[styles.circle, styles.largeCircle, styles.offsetBottom]} />
                </View>
                <View style={[styles.circle, styles.largeCircle, styles.centeredBottom]} />
              </View>
              
              <View style={styles.decorativeRightColumn}>
                <View style={styles.decorativeRightRow}>
                  <View style={[styles.circle, styles.largeCircle]} />
                  <View style={[styles.circle, styles.smallTallCircle, styles.offsetRight]} />
                </View>
                <View style={styles.decorativeRightBottom}>
                  <View style={[styles.circle, styles.largeCircle, styles.centeredRight]} />
                  <View style={[styles.circle, styles.smallCircle]} />
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Bottom section with buttons */}
      <View style={[styles.bottomSection, { backgroundColor: 'rgba(0, 9, 16, 1)' }]}>
        {/* Continue with Apple */}
        <TouchableOpacity style={[styles.socialButton, styles.appleButton]}>
          <Image
            source={{
              uri: "https://api.builder.io/api/v1/image/assets/TEMP/52abb6a0e9e5fa1a9bffcff1e9ca7e48efb1e51f?placeholderIfAbsent=true",
            }}
            style={styles.socialIcon}
            resizeMode="contain"
          />
          <ThemedText style={[styles.buttonText, { color: 'rgba(0, 9, 16, 1)' }]}>
            Continue with Apple
          </ThemedText>
        </TouchableOpacity>

        {/* Continue with Google */}
        <TouchableOpacity style={[styles.socialButton, styles.googleButton]}>
          <Image
            source={{
              uri: "https://api.builder.io/api/v1/image/assets/TEMP/d2230e94b60c324eecd9e0d1a6a91eafc59b2984?placeholderIfAbsent=true",
            }}
            style={styles.socialIcon}
            resizeMode="contain"
          />
          <ThemedText style={[styles.buttonText, { color: 'rgba(238, 247, 255, 1)' }]}>
            Continue with Google
          </ThemedText>
        </TouchableOpacity>

        {/* Sign Up */}
        <TouchableOpacity style={[styles.actionButton, styles.signUpButton]}>
          <ThemedText style={[styles.buttonText, { color: 'rgba(0, 9, 16, 1)' }]}>
            Sign Up
          </ThemedText>
        </TouchableOpacity>

        {/* Log In */}
        <TouchableOpacity style={[styles.actionButton, styles.logInButton]}>
          <ThemedText style={[styles.buttonText, { color: 'rgba(238, 247, 255, 1)' }]}>
            Log In
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    maxWidth: scale(480),
    alignSelf: 'center',
    width: '100%',
  },
  decorativeSection: {
    flex: 1,
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(60),
  },
  decorativeRow1: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: verticalScale(24),
  },
  decorativeRow2: {
    flexDirection: 'row',
    flex: 1,
    gap: scale(2),
  },
  decorativeColumn: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(11),
  },
  decorativeSubColumn: {
    flexDirection: 'column',
  },
  decorativeColumnLeft: {
    flexDirection: 'column',
  },
  decorativeMainSection: {
    flex: 1,
  },
  decorativeTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(25),
  },
  decorativeInnerColumn: {
    flexDirection: 'column',
    flex: 1,
  },
  decorativeBottomSection: {
    flexDirection: 'row',
    marginTop: verticalScale(11),
    gap: scale(7),
  },
  decorativeBottomColumn: {
    flexDirection: 'column',
  },
  decorativeBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(20),
    justifyContent: 'space-between',
    width: scale(205),  // FIXED: Now uses scale()
  },
  decorativeRightColumn: {
    flexDirection: 'column',
  },
  decorativeRightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(20),
    justifyContent: 'space-between',
  },
  decorativeRightBottom: {
    flexDirection: 'column',
    marginTop: verticalScale(25),
    paddingLeft: scale(29),
  },
  circle: {
    borderRadius: scale(50),
    backgroundColor: '#E5E5E5',
  },
  // FIXED: All circle sizes now use scale()
  smallCircle: {
    width: scale(35),
    height: verticalScale(71),
  },
  mediumCircle: {
    width: scale(71),
    height: verticalScale(26),
  },
  largeCircle: {
    width: scale(71),
    height: scale(71),  // Square, so using scale for both
  },
  mediumTallCircle: {
    width: scale(54),
    height: verticalScale(71),
  },
  smallTallCircle: {
    width: scale(39),
    height: verticalScale(71),
  },
  // FIXED: All offset values now use verticalScale()
  offsetCircle: {
    marginTop: verticalScale(38),
  },
  offsetSmall: {
    marginTop: verticalScale(46),
  },
  offsetLarge: {
    marginTop: verticalScale(99),
  },
  offsetTop: {
    marginTop: verticalScale(21),
  },
  offsetBottom: {
    marginTop: verticalScale(58),
  },
  offsetRight: {
    marginTop: verticalScale(40),
  },
  centeredSmall: {
    alignSelf: 'center',
    marginTop: 0,
    marginLeft: 0,
  },
  centeredBottom: {
    alignSelf: 'center',
    marginTop: verticalScale(35),
    marginLeft: scale(10),
  },
  centeredRight: {
    alignSelf: 'center',
  },
  decorativeImage: {
    width: '100%',
    aspectRatio: 2.65,
  },
  // FIXED: Bottom section with responsive padding
  bottomSection: {
    borderTopLeftRadius: scale(30),
    borderTopRightRadius: scale(30),
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(28),
  },
  // FIXED: Social buttons with responsive padding
  socialButton: {
    borderRadius: scale(30),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(13),
    paddingHorizontal: scale(48),
    gap: scale(7),
    marginBottom: verticalScale(12),
  },
  appleButton: {
    backgroundColor: '#FFFFFF',
  },
  googleButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(238, 247, 255, 0.3)',
  },
  // FIXED: Action buttons with responsive padding
  actionButton: {
    borderRadius: scale(30),
    paddingVertical: verticalScale(13),
    paddingHorizontal: scale(70),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(12),
  },
  signUpButton: {
    backgroundColor: '#FFFFFF',
  },
  logInButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(238, 247, 255, 0.3)',
  },
  // FIXED: Icon size now uses scale()
  socialIcon: {
    width: scale(22),
    height: scale(22),
  },
  // FIXED: Font size now uses scale()
  buttonText: {
    fontSize: scale(18),
    fontWeight: '700',
    letterSpacing: -0.36,
    textAlign: 'center',
    fontFamily: Platform.select({
      ios: 'Kadwa',
      android: 'Kadwa',
      default: 'system-ui',
    }),
  },
});