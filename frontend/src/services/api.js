import axios from "axios";


const API = axios.create({
  baseURL: "http://127.0.0.1:8000",
});


// =========================================================
// LOGIN
// =========================================================

export const loginUser = async (
  email,
  password
) => {

  const formData =
    new URLSearchParams();

  formData.append(
    "username",
    email.trim()
  );

  formData.append(
    "password",
    password
  );

  const response = await API.post(
    "/auth/login",
    formData,
    {
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
    }
  );

  console.log(
    "LOGIN RESPONSE:",
    response.data
  );

  if (!response.data?.access_token) {

    throw new Error(
      "Backend did not return an access token."
    );
  }

  localStorage.setItem(
    "access_token",
    response.data.access_token
  );

  localStorage.setItem(
    "token_type",
    response.data.token_type ||
      "bearer"
  );

  return response.data;
};


// =========================================================
// SEND REGISTRATION OTP
// =========================================================

export const sendRegistrationOTP = async (
  name,
  email,
  password
) => {

  const response = await API.post(
    "/auth/send-otp",
    {
      name: name.trim(),

      // IMPORTANT:
      // This can be ANY user's email.
      email: email.trim(),

      password: password,

      role: "Viewer",
    }
  );

  console.log(
    "OTP SEND RESPONSE:",
    response.data
  );

  return response.data;
};


// =========================================================
// VERIFY REGISTRATION OTP
// =========================================================

export const verifyRegistrationOTP = async (
  name,
  email,
  password,
  otp
) => {

  const response = await API.post(
    "/auth/verify-otp",
    {
      name: name.trim(),

      email: email.trim(),

      password: password,

      otp: otp,

      role: "Viewer",
    }
  );

  console.log(
    "OTP VERIFY RESPONSE:",
    response.data
  );

  return response.data;
};


// =========================================================
// LOGOUT
// =========================================================

export const logoutUser = () => {

  localStorage.removeItem(
    "access_token"
  );

  localStorage.removeItem(
    "token_type"
  );
};


// =========================================================
// GET AUTH TOKEN
// =========================================================

export const getAuthToken = () => {

  return localStorage.getItem(
    "access_token"
  );
};


// =========================================================
// AUTHORIZATION HEADER
// =========================================================

export const getAuthHeaders = () => {

  const token =
    localStorage.getItem(
      "access_token"
    );

  return {
    Authorization:
      `Bearer ${token}`
  };
};


export default API;