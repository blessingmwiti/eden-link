import { Injectable } from '@angular/core';
import { GoogleGenerativeAI, GenerateContentResult, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

interface OptimalConditions {
  temperature: { min: number; max: number };
  humidity: { min: number; max: number };
  light: { min: number; max: number };
  ph: { min: number; max: number };
  ec: { min: number; max: number };
}

interface GrowthStagePrediction {
  currentStage: string;
  nextStage: string;
  daysToNextStage: number;
  recommendations: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AIService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private readonly SYSTEM_INSTRUCTION = `
  1 · Persona

You are AgroGuide AI, an assistant specialised exclusively in crop science and farm management.

2 · Mission

A. Sensor-driven advice
When the user suppliesany of these readings – temperature, soil pH, EC, moisture, humidity, CO₂, light intensity – do three things only for the metrics actually given:

Interpret the value against good practice for the stated crop (or common crops if none is stated).
Recommend concrete actions (climate tweaks, nutrient or irrigation adjustments, protective measures).
Explain the rationale in one or two short sentences.
B. Historical insight
When asked about past agricultural events, techniques, or breakthroughs, answer concisely and show how the lesson applies today.

3 · Scope guardrails

Politely refuse anything outside agriculture with:

“I’m sorry, that’s beyond my agricultural scope.”
4 · Response style & formatting rules


Situation	How to answer
Sensor data present	• List each supplied metric as “Metric → Assessment → Action”. Do not mention unsupplied metrics.
• Follow with a short rationale section (optional if obvious).
No sensor data	Give a direct answer; avoid adding boilerplate.
Historical Q&A	Paragraph answer ≤ 200 words; bullet points if it aids clarity.
Refusal	Use the guardrail sentence verbatim.
General tone: helpful, practical, and jargon-light unless the user signals expert knowledge. Avoid repetitive phrasing between turns; vary sentence openers where natural.

5 · Safety

• No medical, veterinary, or legal advice.
• No personal-data retention.
• Adhere to Google AI Studio safety policies.
  `;

  constructor() {
    console.log('Initializing Google AI with API key:', environment.googleAiApiKey ? 'API key present' : 'No API key');
    this.genAI = new GoogleGenerativeAI(environment.googleAiApiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-lite',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
        }
      ]
    });
    console.log('Google AI model initialized:', this.model ? 'Success' : 'Failed');
  }

  getSystemHealthAnalysis(metrics: any): Observable<string> {
    console.log('Making system health analysis API call with metrics:', metrics);
    const prompt = `${this.SYSTEM_INSTRUCTION}

    Analyze the following environmental conditions for optimal crop growth:
    Temperature: ${metrics.temperature}°C
    Humidity: ${metrics.humidity}%
    Light: ${metrics.light} lux
    EC: ${metrics.ec}
    pH: ${metrics.ph}

    Please provide:
    1. Environment assessment
    2. Recommended actions
    3. Rationale for recommendations`;

    return new Observable<string>(subscriber => {
      console.log('Sending prompt to Google AI:', prompt);
      this.model.generateContent(prompt)
        .then((response: GenerateContentResult) => {
          const text = response.response.text();
          console.log('Received response from Google AI:', text);
          subscriber.next(text);
          subscriber.complete();
        })
        .catch((error: Error) => {
          console.error('Error in system health analysis:', error);
          subscriber.error(error);
        });
    });
  }

  predictGrowthStage(params: { cropType: string; plantedDate: Date; sensorHistory: any[] }): Observable<GrowthStagePrediction> {
    console.log('Making growth stage prediction API call with params:', params);
    const prompt = `${this.SYSTEM_INSTRUCTION}

    As an agricultural expert, analyze the growth stage for ${params.cropType} planted on ${params.plantedDate.toISOString()}.
    Based on the sensor history, provide a detailed analysis in JSON format with the following structure:
    {
      "currentStage": "current growth stage",
      "nextStage": "next expected stage",
      "daysToNextStage": number of days,
      "recommendations": ["list of specific recommendations"]
    }`;

    return new Observable<GrowthStagePrediction>(subscriber => {
      console.log('Sending prompt to Google AI:', prompt);
      this.model.generateContent(prompt)
        .then((response: GenerateContentResult) => {
          const text = response.response.text();
          console.log('Received response from Google AI:', text);
          try {
            // Try to parse the JSON response
            const parsedResponse = JSON.parse(text);
            console.log('Successfully parsed JSON response:', parsedResponse);
            subscriber.next(parsedResponse);
          } catch (error) {
            console.warn('Failed to parse JSON response, using fallback:', error);
            // If parsing fails, use the text response
            subscriber.next({
              currentStage: 'Analyzing',
              nextStage: 'To be determined',
              daysToNextStage: 0,
              recommendations: [text]
            });
          }
          subscriber.complete();
        })
        .catch((error: Error) => {
          console.error('Error in growth stage prediction:', error);
          subscriber.error(error);
        });
    });
  }

  predictOptimalConditions(cropType: string, stage: string): Observable<OptimalConditions> {
    console.log('Making optimal conditions API call for:', { cropType, stage });
    const prompt = `${this.SYSTEM_INSTRUCTION}

    As an agricultural expert, provide the optimal environmental conditions for ${cropType} during the ${stage} stage.
    Please provide the response in JSON format with the following structure:
    {
      "temperature": { "min": number, "max": number },
      "humidity": { "min": number, "max": number },
      "light": { "min": number, "max": number },
      "ph": { "min": number, "max": number },
      "ec": { "min": number, "max": number }
    }`;

    return new Observable<OptimalConditions>(subscriber => {
      console.log('Sending prompt to Google AI:', prompt);
      this.model.generateContent(prompt)
        .then((response: GenerateContentResult) => {
          const text = response.response.text();
          console.log('Received response from Google AI:', text);
          try {
            // Try to parse the JSON response
            const parsedResponse = JSON.parse(text);
            console.log('Successfully parsed JSON response:', parsedResponse);
            subscriber.next(parsedResponse);
          } catch (error) {
            console.warn('Failed to parse JSON response, using fallback:', error);
            // If parsing fails, use default values
            subscriber.next({
              temperature: { min: 20, max: 25 },
              humidity: { min: 60, max: 70 },
              light: { min: 500, max: 800 },
              ph: { min: 6.0, max: 6.8 },
              ec: { min: 1.5, max: 2.2 }
            });
          }
          subscriber.complete();
        })
        .catch((error: Error) => {
          console.error('Error in optimal conditions prediction:', error);
          subscriber.error(error);
        });
    });
  }

  chat(message: string): Observable<string> {
    console.log('Making chat API call with message:', message);
    const prompt = `${this.SYSTEM_INSTRUCTION}

    User message: ${message}

    Please provide a helpful response focused on agricultural advice and insights.`;

    return new Observable<string>(subscriber => {
      console.log('Sending prompt to Google AI:', prompt);
      this.model.generateContent(prompt)
        .then((response: GenerateContentResult) => {
          const text = response.response.text();
          console.log('Received response from Google AI:', text);
          subscriber.next(text);
          subscriber.complete();
        })
        .catch((error: Error) => {
          console.error('Error in chat:', error);
          subscriber.error(error);
        });
    });
  }
} 