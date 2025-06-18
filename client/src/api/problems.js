const API_URL = 'http://localhost:3002/api';

export const fetchProblems = async () => {
    try {
        const response = await fetch(`${API_URL}/problems`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Raw API Response:', JSON.stringify(data, null, 2));
        if (data.length > 0) {
            console.log('First problem data:', JSON.stringify(data[0], null, 2));
        }
        return data;
    } catch (error) {
        console.error('Error fetching problems:', error);
        throw error;
    }
}; 