import { moderateScale, scale, verticalScale } from "@/utils/responsive";
import { router } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = Record<string, never>;
export default (props: Props) => {
	return (
		<View style={styles.container}>
			{/* Background Image - Full Height */}
			<View style={styles.imageContainer}>
				<Image
					source={require('../assets/images/index_background.png')} 
					resizeMode={"cover"}
					style={styles.backgroundImage}
				/>
				<Image
					source={require('../assets/images/niice_logo.png')}
					resizeMode="contain"
					style={styles.logo}
				/>
			</View>
			
			{/* Blue Section with Buttons - Overlapping */}
			<View style={styles.blueSection}>
				<View style={styles.blueBackground} />
				
				{/* Button content */}
				<View style={styles.buttonWrapper}>
					{/* Apple Button */}
					<View style={styles.socialButton}>
						<Image
							source={require('../assets/images/apple_logo.png')} 
							resizeMode={"contain"}
							style={styles.buttonIcon}
						/>
						<Text style={styles.socialButtonText}>
							{"Continue with Apple"}
						</Text>
					</View>
					
					{/* Google Button */}
					<View style={[styles.socialButton, styles.googleButton]}>
						<Image
							source={require('../assets/images/google_logo.png')} 
							resizeMode={"contain"}
							style={styles.buttonIcon}
						/>
						<Text style={styles.googleButtonText}>
							{"Continue with Google"}
						</Text>
						<View style={styles.buttonIconPlaceholder} />
					</View>
					
					{/* Sign Up Button */}
					<TouchableOpacity 
						style={styles.primaryButton}
						onPress={() => router.push('/signup_phone')}
					>
						<Text style={styles.primaryButtonText}>
							{"Sign Up"}
						</Text>
					</TouchableOpacity>
					
					{/* Log In Button */}
					<TouchableOpacity 
						style={styles.secondaryButton}
						onPress={() => router.push('/login')}
					>
						<Text style={styles.secondaryButtonText}>
							{"Log In"}
						</Text>
					</TouchableOpacity>
				</View>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#FFFFFF",
	},
	imageContainer: {
		width: '100%',
		height: verticalScale(550),
		position: 'relative',
	},
	backgroundImage: {
		width: '100%',
		height: '100%',
	},
	logo: {
		position: 'absolute',
		top: '45%',
		left: '50%',
		transform: [
			{ translateX: -scale(140) }, 
			{ translateY: -scale(140) }
		],
		width: scale(280),
		height: scale(280),
		maxWidth: 320,
		maxHeight: 320,
	},
	blueSection: {
		position: 'relative',
		marginTop: verticalScale(-50), // ← Reduced from -100 to -50
		flex: 1,
	},
	blueBackground: {
		position: "absolute",
		top: verticalScale(20), // ← Reduced from 40 to 20
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: "#1A44CC",
		borderTopLeftRadius: scale(30),
		borderTopRightRadius: scale(30),
	},
	buttonWrapper: {
		paddingTop: verticalScale(45), // ← Reduced from 65 to 45
		paddingBottom: verticalScale(30),
		maxWidth: 500,
		width: '100%',
		alignSelf: 'center',
	},
	socialButton: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#BBDBF6",
		borderRadius: scale(30),
		paddingVertical: verticalScale(13),
		paddingHorizontal: scale(53),
		marginBottom: verticalScale(8),
		marginHorizontal: scale(24),
		shadowColor: "#000000",
		shadowOpacity: 0.25,
		shadowOffset: {
			width: 0,
			height: verticalScale(4)
		},
		shadowRadius: scale(4),
		elevation: 4,
	},
	googleButton: {
		justifyContent: "center",
		backgroundColor: "#BBDBF640",
	},
	buttonIcon: {
		width: moderateScale(22),
		height: moderateScale(22),
		marginRight: scale(7),
		marginTop: verticalScale(-2),
	},
	buttonIconPlaceholder: {
		width: moderateScale(22),
		height: moderateScale(22),
	},
	socialButtonText: {
		color: "#000910",
		fontSize: moderateScale(18),
		fontFamily: "Kadwa-Bold",
	},
	googleButtonText: {
		color: "#EEF7FF",
		fontSize: moderateScale(18),
		fontFamily: "Kadwa-Bold",
		marginRight: scale(9),
	},
	primaryButton: {
		alignItems: "center",
		backgroundColor: "#BBDBF6",
		borderRadius: scale(30),
		paddingVertical: verticalScale(13),
		marginBottom: verticalScale(8),
		marginHorizontal: scale(24),
		shadowColor: "#000000",
		shadowOpacity: 0.25,
		shadowOffset: {
			width: 0,
			height: verticalScale(4)
		},
		shadowRadius: scale(4),
		elevation: 4,
	},
	primaryButtonText: {
		color: "#000910",
		fontSize: moderateScale(18),
		fontFamily: "Kadwa-Bold",
	},
	secondaryButton: {
		alignItems: "center",
		backgroundColor: "#000910",
		borderRadius: scale(30),
		paddingVertical: verticalScale(13),
		marginHorizontal: scale(24),
		shadowColor: "#000000",
		shadowOpacity: 0.25,
		shadowOffset: {
			width: 0,
			height: verticalScale(4)
		},
		shadowRadius: scale(4),
		elevation: 4,
	},
	secondaryButtonText: {
		color: "#EEF7FF",
		fontSize: moderateScale(18),
		fontFamily: "Kadwa-Bold",
	},
});