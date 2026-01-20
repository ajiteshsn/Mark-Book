# Mark Book

Ontario high school mark management and final evaluation simulation tool.

## Features

- **70/15/15 Grade Model** - Calculates grades using Ontario's curriculum model:
  - 70% Coursework
  - 15% Final Performance Task (FPT)
  - 15% Final Exam
- **Multiple Courses** - Track marks across all your courses
- **Save & Export** - Save data to your browser or export as JSON
- **Strategy Gap Analysis** - Shows what you need on finals to reach your target grade
- **Simulation Mode** - Toggle assessments on/off to simulate dropping marks

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm

### Installation

1. Open a terminal in this folder
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open http://localhost:5173 in your browser

### Building for Production

```bash
npm run build
```

This creates a `dist` folder with static files you can deploy to any web server.

## Usage

1. Click "Open Mark Book" to enter the dashboard
2. Click the **+** button to add a new course
3. Add your coursework assessments with scores, totals, and weights
4. Add FPT tasks and exam scores
5. View your projected grade and what you need on finals
6. Click **Save** to persist your data between sessions

## License

MIT
