export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const simulateApiCall = async <T>(data: T, ms: number = 500): Promise<T> => {
    await delay(ms);
    return data;
};
