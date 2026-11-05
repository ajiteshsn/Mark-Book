# Mark Book

A grade and GPA calculator for McMaster University students. Track your course marks, see exactly what you need on the final, and plan your 12-point CGPA.

## Features

- **Course outline import** - drop in a PDF, Word (.docx), photo or text outline and Mark Book fills in the course code, title, units, term and grading breakdown for you to review
- **12-point scale** - % → letter → grade points (A+ = 12 … F = 0), with the Registrar's 4.0 equivalents
- **Syllabus-weighted courses** - custom components (Assignments 20%, Midterm 25%, Final 40% …) with sim toggles to try out dropped marks
- **Strategy gap** - the average you need on the remaining weight to hit a target letter, plus a "what's still possible" table
- **Terms and CGPA** - term GPA, Fall/Winter sessional average, unit-weighted CGPA, units earned, GPA-by-term chart and a CGPA planner
- **Requirements** - academic standing, B.Tech/B.Eng Level II entry, co-op eligibility, Dean's Honour List and editable renewable-scholarship rules. Each shows its source and confidence. Always confirm with the Undergraduate Calendar.
- **Mark entry shortcuts** - paste marks as text, scan a screenshot (OCR), and JSON backup/restore

Everything runs in the browser: grades and uploaded outlines never leave your device. This is an unofficial tool and isn't affiliated with McMaster University.

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

1. Click **Start Tracking** on the landing page
2. Click **Import Outline** and choose your course outline, or click **+** to add a course by hand
3. Enter marks as you get them back - type, paste or scan them
4. Pick a target letter to see what you need on the rest of the course
5. Check **GPA Overview** and **Requirements** to see your CGPA and where you stand for your program

## License

MIT
