import api from "./api";

export const loginAdmin = async (data: any) => {
  const response = await api.post("auth/login", data);
  return response.data;
};
