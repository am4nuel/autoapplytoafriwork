# How to Customize Your Expertise

The bot now uses your personal expertise to generate better, more personalized cover letters!

## Edit Your Expertise

Open `config.json` and update the `expertise` section with your actual skills and experience:

```json
{
  "expertise": {
    "skills": ["Your skill 1", "Your skill 2", "Your skill 3"],
    "experience": [
      "Your experience 1",
      "Your experience 2",
      "Your experience 3"
    ],
    "education": "Your education background",
    "languages": ["Language1", "Language2"],
    "additionalInfo": "Any additional information about you"
  }
}
```

## Example

```json
{
  "expertise": {
    "skills": [
      "Full-stack web development",
      "React.js and modern JavaScript frameworks",
      "Node.js and backend development",
      "Mobile app development with Flutter"
    ],
    "experience": [
      "3+ years of professional software development experience",
      "Built and deployed multiple web applications using React and Node.js",
      "Developed cross-platform mobile applications with Flutter"
    ],
    "education": "Computer Science degree from XYZ University",
    "languages": ["JavaScript", "TypeScript", "Python", "Dart"],
    "additionalInfo": "Passionate about learning new technologies and contributing to innovative projects."
  }
}
```

## What Changed

✅ **AI now uses Google Generative AI** (already was using it)
✅ **Maximum 500 words** for cover letters (but limited to 1000 characters by Afriwork API)
✅ **Personalized cover letters** using your expertise from config.json

The AI will now:

- Match your skills to the job requirements
- Use your experience to write relevant examples
- Highlight your education and programming languages
- Create a more compelling, personalized cover letter

## Test It

1. Update your expertise in `config.json`
2. Run `npm start`
3. Wait for a new job posting
4. Check the generated cover letter in the console output
