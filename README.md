# App2

A React application built with Vite, Tailwind CSS, and the Anthropic Claude API.

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- An [Anthropic API key](https://console.anthropic.com)

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/marianalameiro03-debug/app2.git
   cd app2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create a `.env` file** at the root of the project and add your Anthropic API key:
   ```
   VITE_ANTHROPIC_API_KEY=your_anthropic_api_key_here
   ```

4. **Run the app locally**
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:5173`.

## Build for Production

```bash
npm run build
```

## Tech Stack

- [React 18](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/)
- [Anthropic Claude API](https://docs.anthropic.com/)
- [React Router](https://reactrouter.com/)

## ⚠️ Security Note

Never commit your `.env` file to GitHub. Make sure `.env` is listed in your `.gitignore`.
