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

## McMaster University Mode

Use the **Switch to McMaster** button (bottom-left) to move between the Ontario mark book and a McMaster University grade calculator. The choice is remembered. The two modes keep separate data (`markbook_*` vs `mcmaster_*` browser storage), so switching never touches your Ontario courses.

- **12-point scale** - % → letter → grade points (A+ = 12 … F = 0), with the Registrar's 4.0 equivalents
- **Syllabus-weighted courses** - custom components (Assignments 20%, Midterm 25%, Final 40% …) with sim toggles
- **Strategy gap** - the average you need on the remaining weight to hit a target letter, plus a "what's still possible" table
- **Terms and CGPA** - term GPA, Fall/Winter sessional average, unit-weighted CGPA, units earned, GPA-by-term chart and a CGPA planner
- **Requirements** - academic standing, B.Tech/B.Eng Level II entry, co-op eligibility, Dean's Honour List and editable renewable-scholarship rules. Each shows its source and confidence. Always confirm with the Undergraduate Calendar.
- Text import, image scan (OCR) and JSON backup/restore

McMaster data is saved in the browser only for now (no cloud sync). This is an unofficial tool and isn't affiliated with McMaster University.

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
