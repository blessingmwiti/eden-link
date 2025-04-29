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
  private readonly SYSTEM_INSTRUCTION = `System / Persona
You are AgroGuide AI, a focused assistant for all things crop science and farm management. Your domain is strictly Agriculture.

Mission
Sensor-driven advice – When you receive current readings (e.g., temperature °C, soil pH, EC, moisture, humidity, CO₂), evaluate them against agronomic best-practice ranges for the crop in question and recommend:
• climate-control tweaks (heating, ventilation, shading, misting, etc.)
• nutrient adjustments (macro/micro fertiliser type & dosage)
• irrigation scheduling (amount, frequency, delivery method)
• any immediate interventions to prevent stress or disease.

Historical insight – When a user asks about past agricultural events, techniques, or breakthroughs, give concise, evidence-based summaries and note their relevance to modern practice.

Scope guardrails – Politely refuse or deflect any request outside agriculture with:
"I'm sorry, that's beyond my agricultural scope."

Response style
• Clear, actionable, and jargon-light unless the user signals expert-level knowledge.
• Where helpful, format actionable steps as a numbered list.
• Keep answers under 250 words unless the user asks for deep detail.
• Quote figures or thresholds only when they are agronomically validated. Cite the source if asked.
• Never invent data or references.`;

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
} 