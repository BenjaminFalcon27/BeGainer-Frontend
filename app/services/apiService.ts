import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "https://begainer-api.onrender.com/api";

export interface User {
  id: string;
  email?: string;
}

export interface AuthResponse {
  token?: string;
  user?: User;
  id?: string;
  error?: string;
  name?: string;
}

export interface UserPreferencesResponse {
  user_id: string;
  name: string;
  error?: string;
}

export interface UserPreferencesPayload {
  user_id: string | null;
  name: string | null;
  gender: string | null;
  age: number;
  height_cm: number;
  weight_kg: number;
  training_freq: number;
  goal: string | null;
  training_place: string | null;
  session_length: number;
  milestone: string;
}

export type SubmitPreferencesResponse =
  | UserPreferencesResponse
  | { message: string };

const handleApiResponse = async <T>(response: Response): Promise<T> => {
  const responseText = await response.text();
  let dataJson: any;

  try {
    if (responseText) {
      dataJson = JSON.parse(responseText);
    }
  } catch (parseError) {
    if (!response.ok) {
      console.error(
        `Erreur HTTP ${
          response.status
        } - Réponse non JSON: ${responseText.slice(0, 300)}`
      );
      throw new Error(
        `Erreur serveur (${response.status}). Réponse non lisible.`
      );
    }
    console.error(
      `Réponse OK (${
        response.status
      }) mais parsing JSON échoué: ${responseText.slice(0, 300)}`
    );
    throw new Error("Réponse du serveur au format inattendu.");
  }

  if (!response.ok) {
    console.error(
      `Erreur API: ${dataJson?.error || response.statusText}`,
      dataJson
    );
  }

  return dataJson as T;
};

export const loginUser = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleApiResponse<AuthResponse>(response);
};

export const registerUser = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const registerData = await handleApiResponse<AuthResponse>(response);

  if (registerData.error) {
    throw new Error(registerData.error);
  }

  const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const loginData = await handleApiResponse<AuthResponse>(loginResponse);
  if (loginData.error) {
    throw new Error(loginData.error);
  }
  return {
    ...registerData,
    token: loginData.token,
    user: loginData.user,
  };
};

export const fetchUserPreferences = async (
  userId: string,
  token: string
): Promise<UserPreferencesResponse> => {
  const prefsUrl = `${API_BASE_URL}/user-preferences/${userId}`;
  const response = await fetch(prefsUrl, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  return handleApiResponse<UserPreferencesResponse>(response);
};

export const submitUserPreferences = async (
  preferences: UserPreferencesPayload
): Promise<SubmitPreferencesResponse> => {
  const url = `${API_BASE_URL}/user-preferences`;

  const token = await AsyncStorage.getItem("token");
  if (!token) {
    throw new Error(
      "Token d'authentification non trouvé pour soumettre les préférences."
    );
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(preferences),
  });
  return handleApiResponse<SubmitPreferencesResponse>(response);
};
