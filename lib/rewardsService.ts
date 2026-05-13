import api from "./api";

/**
 * POST /admin/rewards/send/:userId
 * Response: transaction card — id, amount, type, description, reference, createdAt
 */
export const sendRewards = async (
  userId: number | string,
  amount: number,
  description?: string,
) => {
  const response = await api.post(`admin/rewards/send/${userId}`, {
    amount,
    ...(description ? { description } : {}),
  });
  return response.data;
};
