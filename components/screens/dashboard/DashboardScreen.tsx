import React, { useEffect, useState, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Animated,
} from "react-native";
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/Colors";
import {
    UserPreferencesDetail,
    UserProgram,
    ProgramSession,
    fetchUserPreferencesDetails,
    fetchProgramById,
    fetchSessionsWithExercisesForProgram,
} from "@/app/services/apiService";

const ProfileIcon = () => (
    <MaterialIcons
        name="account-circle"
        size={28}
        color={Colors.dark.tint}
    />
);

export default function DashboardScreen() {
    const router = useRouter();
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userName, setUserName] = useState<string | null>(null);
    const [userPreferences, setUserPreferences] =
        useState<UserPreferencesDetail | null>(null);
    const [activeProgram, setActiveProgram] = useState<UserProgram | null>(null);
    const [programSessions, setProgramSessions] = useState<ProgramSession[]>([]);

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();

        const loadDashboardData = async () => {
            setIsLoading(true);
            setError(null);
            let currentError: string | null = null;

            try {
                const storedToken = await AsyncStorage.getItem("token");
                const storedUserId = await AsyncStorage.getItem("userId");
                const storedName = await AsyncStorage.getItem("name");

                if (storedToken && storedUserId) {
                    setUserName(storedName);

                    const prefsData = await fetchUserPreferencesDetails(
                        storedUserId,
                        storedToken
                    );
                    setUserPreferences(prefsData);

                    if (prefsData.error) {
                        currentError = `Erreur Préférences: ${prefsData.error}`;
                    }

                    if (!prefsData.error && prefsData.active_program_id) {
                        const programData = await fetchProgramById(
                            prefsData.active_program_id,
                            storedToken
                        );

                        if (programData.error) {
                            currentError = `${
                                currentError ? currentError + "\n" : ""
                            }Erreur Programme: ${programData.error}`;
                            setActiveProgram(null);
                            setProgramSessions([]);
                        } else {
                            setActiveProgram(programData);
                            const sessionsData = await fetchSessionsWithExercisesForProgram(
                                programData.id,
                                storedToken
                            );
                            if (Array.isArray(sessionsData)) {
                                setProgramSessions(sessionsData);
                            } else {
                                currentError = `${
                                    currentError ? currentError + "\n" : ""
                                }Erreur Séances: ${sessionsData}`;
                                setProgramSessions([]);
                            }
                        }
                    } else if (!prefsData.active_program_id && !prefsData.error) {
                        setActiveProgram(null);
                        setProgramSessions([]);
                    } else {
                        setActiveProgram(null);
                        setProgramSessions([]);
                    }
                } else {
                    currentError = "Utilisateur non authentifié.";
                    router.replace("/");
                }
            } catch (e: any) {
                console.error("Échec du chargement des données du tableau de bord:", e);
                currentError = e.message || "Une erreur inattendue est survenue.";
            } finally {
                setError(currentError);
                setIsLoading(false);
            }
        };

        loadDashboardData();
    }, []);

    const navigateToProfile = () => {
        router.push("/user/profile");
    };

    const handleSessionPress = (sessionId: string) => {
        console.log("Naviguer vers la session :", sessionId);
    };

    if (isLoading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.dark.tint} />
                <Text style={styles.loadingText}>Chargement du Tableau de Bord...</Text>
            </View>
        );
    }

    return (
        <View style={styles.mainContainer}>
            <Animated.View style={{ opacity: fadeAnim, width: "100%", flex: 1 }}>
                <View style={styles.header}>
                    <Text style={styles.title}>Tableau de Bord</Text>
                    <TouchableOpacity
                        onPress={navigateToProfile}
                        style={styles.profileButton}
                    >
                        <ProfileIcon />
                    </TouchableOpacity>
                </View>

                {userName && (
                    <Text style={styles.welcomeMessage}>Bonjour, {userName} !</Text>
                )}

                {error && !isLoading && <Text style={styles.errorText}>{error}</Text>}

                <View style={styles.contentArea}>
                    {!activeProgram &&
                        !isLoading &&
                        !error &&
                        userPreferences &&
                        !userPreferences.active_program_id && (
                            <View style={styles.sectionContainer}>
                                <Text style={styles.sectionTitle}>Aucun Programme Actif</Text>
                                <Text style={styles.infoText}>
                                    Vous n'avez pas encore de programme d'entraînement actif.
                                </Text>
                                <TouchableOpacity
                                    style={[
                                        styles.actionButton,
                                        { backgroundColor: Colors.dark.primary },
                                    ]}
                                    onPress={() => router.push("/")}
                                >
                                    <Text style={styles.actionButtonText}>
                                        Générer un programme
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                    {activeProgram && !activeProgram.error && (
                        <View style={styles.sectionContainer}>
                            <Text style={styles.sectionTitle}>Votre Programme Actif</Text>
                            <Text style={styles.programName}>{activeProgram.name}</Text>
                            <View style={styles.programDetails}>
                                <Text style={styles.detailText}>
                                    <Text style={styles.detailLabel}>Objectif:</Text>{" "}
                                    {activeProgram.goal}
                                </Text>
                                <Text style={styles.detailText}>
                                    <Text style={styles.detailLabel}>Durée:</Text>{" "}
                                    {activeProgram.duration_weeks} semaines
                                </Text>
                            </View>
                        </View>
                    )}

                    {activeProgram &&
                        !activeProgram.error &&
                        programSessions.length > 0 && (
                            <View style={styles.sectionContainer}>
                                <Text style={styles.sectionTitle}>Vos Séances à venir</Text>
                                {programSessions.slice(0, 2).map(
                                    (
                                        session
                                    ) => (
                                        <TouchableOpacity
                                            key={session.id}
                                            style={styles.sessionItem}
                                            onPress={() => handleSessionPress(session.id)}
                                        >
                                            <View>
                                                <Text style={styles.sessionName}>{session.name}</Text>
                                                <Text style={styles.sessionInfo}>
                                                    {session.exercises.length} exercice
                                                    {session.exercises.length > 1 ? "s" : ""}
                                                </Text>
                                            </View>
                                            <Text style={styles.sessionArrow}>➔</Text>
                                        </TouchableOpacity>
                                    )
                                )}
                                {programSessions.length > 2 && (
                                    <Text style={styles.moreSessionsText}>
                                        Et {programSessions.length - 2} autre(s) séance(s)...
                                    </Text>
                                )}
                            </View>
                        )}
                    {activeProgram &&
                        !activeProgram.error &&
                        programSessions.length === 0 &&
                        !isLoading && (
                            <View style={styles.sectionContainer}>
                                <Text style={styles.sectionTitle}>Vos Séances</Text>
                                <Text style={styles.infoText}>
                                    Aucune séance trouvée pour ce programme.
                                </Text>
                            </View>
                        )}
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: Colors.dark.background,
        paddingHorizontal: 15,
        paddingTop: 40,
        paddingBottom: 15,
    },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: Colors.dark.background,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: Colors.dark.text,
    },
    errorText: {
        color: "#FF6B6B",
        textAlign: "center",
        marginVertical: 8,
        paddingHorizontal: 15,
        fontSize: 14,
    },
    header: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
    },
    title: {
        fontSize: 26,
        fontWeight: "bold",
        color: Colors.dark.title,
    },
    profileButton: {
        padding: 8,
    },
    welcomeMessage: {
        fontSize: 18,
        fontWeight: "600",
        color: Colors.dark.text,
        textAlign: "center",
        marginVertical: 10,
    },
    contentArea: {
        flex: 1,
        justifyContent: "flex-start",
    },
    sectionContainer: {
        width: "100%",
        backgroundColor: Colors.dark.card,
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: Colors.dark.tint,
        marginBottom: 10,
    },
    programName: {
        fontSize: 20,
        fontWeight: "bold",
        color: Colors.dark.text,
        marginBottom: 8,
    },
    programDetails: {
        marginTop: 3,
    },
    detailLabel: {
        fontWeight: "600",
        color: Colors.dark.secondary,
    },
    detailText: {
        fontSize: 15,
        color: Colors.dark.text,
        marginBottom: 4,
        lineHeight: 20,
    },
    infoText: {
        fontSize: 14,
        color: Colors.dark.text,
        lineHeight: 20,
        marginBottom: 12,
    },
    sessionItem: {
        backgroundColor: Colors.dark.background,
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 10,
        marginBottom: 8,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderWidth: 1,
        borderColor: Colors.dark.secondary,
    },
    sessionName: {
        fontSize: 16,
        fontWeight: "bold",
        color: Colors.dark.text,
    },
    sessionInfo: {
        fontSize: 13,
        color: Colors.dark.secondary,
        marginTop: 3,
    },
    sessionArrow: {
        fontSize: 18,
        color: Colors.dark.tint,
    },
    moreSessionsText: {
        fontSize: 13,
        color: Colors.dark.secondary,
        textAlign: "center",
        marginTop: 5,
    },
    actionButton: {
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 20,
        alignItems: "center",
        marginTop: 8,
    },
    actionButtonText: {
        color: Colors.dark.text,
        fontSize: 15,
        fontWeight: "bold",
    },
});
