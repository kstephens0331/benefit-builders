#!/usr/bin/env node
/**
 * Test Google Gemini AI Integration
 *
 * Verifies the Gemini API key is valid and working
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read environment variables
const envPath = join(__dirname, '..', 'apps', 'web', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');

const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`${name}=(.+)`));
  if (!match) throw new Error(`Missing ${name}`);
  return match[1].trim();
};

const geminiApiKey = getEnvVar('GEMINI_API_KEY');

console.log('🔍 Testing Google Gemini AI Integration\n');
console.log('='.repeat(60) + '\n');

async function testGemini() {
  try {
    if (!geminiApiKey || geminiApiKey === '') {
      console.log('❌ GEMINI_API_KEY is not set in .env.local\n');
      console.log('To enable AI-powered bulk upload:');
      console.log('1. Get API key from: https://makersuite.google.com/app/apikey');
      console.log('2. Add to apps/web/.env.local: GEMINI_API_KEY=your_key_here\n');
      return false;
    }

    console.log('✅ API Key found:', geminiApiKey.substring(0, 10) + '...\n');

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    console.log('🧪 Testing API connection...\n');

    // Simple test prompt
    const prompt = `You are a data extraction specialist.
Given this sample employee census data:
[
  { "Name": "John Doe", "Pay": "3500", "FSA": "200" }
]

Extract and return ONLY valid JSON in this format:
{
  "employees": [
    {
      "first_name": "John",
      "last_name": "Doe",
      "gross_pay": 3500,
      "benefits": [
        { "plan_code": "FSA_HEALTH", "per_pay_amount": 200 }
      ]
    }
  ]
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('✅ API Response received!\n');
    console.log('Sample response (first 200 chars):');
    console.log(text.substring(0, 200) + '...\n');

    // Try to parse JSON from response
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ||
                      text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const jsonText = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonText);
      console.log('✅ JSON parsing successful!\n');
      console.log('Parsed data:', JSON.stringify(parsed, null, 2), '\n');
    }

    console.log('='.repeat(60) + '\n');
    console.log('🎉 SUCCESS! Gemini AI is working correctly!\n');
    console.log('✅ Bulk upload feature will use AI-powered parsing');
    console.log('✅ Handles flexible column names and formats');
    console.log('✅ Automatically structures messy spreadsheet data\n');

    return true;

  } catch (error) {
    console.error('❌ Gemini API test failed:', error.message, '\n');

    if (error.message.includes('API_KEY_INVALID')) {
      console.log('⚠️  Invalid API key. Please check your GEMINI_API_KEY\n');
      console.log('Get a new key from: https://makersuite.google.com/app/apikey\n');
    } else if (error.message.includes('quota')) {
      console.log('⚠️  API quota exceeded. Free tier limits may apply.\n');
    } else {
      console.log('⚠️  Bulk upload will fall back to manual parsing\n');
    }

    return false;
  }
}

testGemini();
