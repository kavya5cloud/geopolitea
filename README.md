# Geopolitea

Geopolitea is a small web app that lets users chat with a playful AI assistant called Ms. Diplomatt about global politics.

## Features

- A retro-style landing page and chat interface
- A local Node.js server that handles chat requests
- Integration with Groq for AI-generated responses
- Simple setup with environment variables

## Getting Started

1. Install dependencies:
   npm install

2. Create a local environment file:
   Copy .env.example to .env and add your Groq API key.

3. Start the app:
   npm start

4. Open the app in your browser:
   http://127.0.0.1:3000

## Environment Variables

Create a .env file with:

GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
PORT=3000

## Project Structure

- index.html: Main app UI
- server.js: Local server and API proxy
- .env.example: Example environment variables

## Notes

If no Groq API key is provided, the app will fall back to a simple local demo response.