// helpers/auditAnalysis.js
import axios from 'axios';
import { getSettings } from '../models/AdminSettings.js';

async function analyzeLogs(logs) {
  const prompt = `Analyze the following log entries for anomalies or suspicious patterns:\n\n${logs.map(log => 
    `Time: ${new Date(log.timestamp).toISOString()}, AI System: ${log.aiSystem}, Data Accessed: ${log.dataAccessed.join(', ')}, Purpose: ${log.purpose.join(', ')}, Details: ${log.details || ''}`
  ).join('\n\n')}\n\nProvide a concise analysis.`;
  
  const settings = await getSettings();
  
  if (settings && settings.openAIKey) {
    try {
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are an expert auditor analyzing AI access logs." },
          { role: "user", content: prompt }
        ],
        max_tokens: 150,
        temperature: 0.2
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.openAIKey}`
        }
      });
      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error("Error calling OpenAI API:", error.response ? error.response.data : error.message);
      throw new Error("OpenAI API request failed");
    }
  } else if (settings && settings.azureOpenAIKey && settings.azureOpenAIUrl) {
    try {
      const response = await axios.post(`${settings.azureOpenAIUrl}/openai/deployments/your-deployment/chat/completions?api-version=2023-03-15-preview`, {
        model: "gpt-35-turbo",
        messages: [
          { role: "system", content: "You are an expert auditor analyzing AI access logs." },
          { role: "user", content: prompt }
        ],
        max_tokens: 150,
        temperature: 0.2
      }, {
        headers: {
          'Content-Type': 'application/json',
          'api-key': settings.azureOpenAIKey
        }
      });
      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error("Error calling Azure OpenAI API:", error.response ? error.response.data : error.message);
      throw new Error("Azure OpenAI API request failed");
    }
  } else {
    throw new Error("No valid AI API configuration found in settings");
  }
}

export { analyzeLogs };
