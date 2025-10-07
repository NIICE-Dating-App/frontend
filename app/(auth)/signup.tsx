import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import React from 'react';
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
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  decorativeSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  decorativeRow1: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  decorativeRow2: {
    flexDirection: 'row',
    flex: 1,
    gap: 2,
  },
  decorativeColumn: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
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
    gap: 25,
  },
  decorativeInnerColumn: {
    flexDirection: 'column',
    flex: 1,
  },
  decorativeBottomSection: {
    flexDirection: 'row',
    marginTop: 11,
    gap: 7,
  },
  decorativeBottomColumn: {
    flexDirection: 'column',
  },
  decorativeBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 20,
    justifyContent: 'space-between',
    width: 205,
  },
  decorativeRightColumn: {
    flexDirection: 'column',
  },
  decorativeRightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 20,
    justifyContent: 'space-between',
  },
  decorativeRightBottom: {
    flexDirection: 'column',
    marginTop: 25,
    paddingLeft: 29,
  },
  circle: {
    borderRadius: 50,
    backgroundColor: '#E5E5E5',
  },
  smallCircle: {
    width: 35,
    height: 71,
  },
  mediumCircle: {
    width: 71,
    height: 26,
  },
  largeCircle: {
    width: 71,
    height: 71,
  },
  mediumTallCircle: {
    width: 54,
    height: 71,
  },
  smallTallCircle: {
    width: 39,
    height: 71,
  },
  offsetCircle: {
    marginTop: 38,
  },
  offsetSmall: {
    marginTop: 46,
  },
  offsetLarge: {
    marginTop: 99,
  },
  offsetTop: {
    marginTop: 21,
  },
  offsetBottom: {
    marginTop: 58,
  },
  offsetRight: {
    marginTop: 40,
  },
  centeredSmall: {
    alignSelf: 'center',
    marginTop: 0,
    marginLeft: 0,
  },
  centeredBottom: {
    alignSelf: 'center',
    marginTop: 35,
    marginLeft: 10,
  },
  centeredRight: {
    alignSelf: 'center',
  },
  decorativeImage: {
    width: '100%',
    aspectRatio: 2.65,
  },
  bottomSection: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  socialButton: {
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 48,
    gap: 7,
    marginBottom: 12,
  },
  appleButton: {
    backgroundColor: '#FFFFFF',
  },
  googleButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(238, 247, 255, 0.3)',
  },
  actionButton: {
    borderRadius: 30,
    paddingVertical: 13,
    paddingHorizontal: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  signUpButton: {
    backgroundColor: '#FFFFFF',
  },
  logInButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(238, 247, 255, 0.3)',
  },
  socialIcon: {
    width: 22,
    height: 22,
  },
  buttonText: {
    fontSize: 18,
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
