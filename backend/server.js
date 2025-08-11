import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// The AI analysis endpoint
app.post('/analyze', upload.single('image'), async (req, res) => {
    try {
        const { apiKey } = req.body;
        const imageFile = req.file;
        if (!apiKey || !imageFile) {
            return res.status(400).json({ error: 'API key and image file are required.' });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });

        // --- KEY IMPROVEMENT IS IN THIS PROMPT ---
        const prompt = `
            Analyze this image of a biological diagram with extreme precision. Your task is to perform a detailed analysis and return a valid JSON object. DO NOT include any text outside of the JSON object itself, and do not use markdown like \`\`\`json.

            The JSON object must have the following structure:
            {
              "summary": "A one-paragraph overview of the diagram, describing the specific view and type of structures shown.",
              "annotations": [
                {
                  "label": "Specific Component Name (e.g., 'Cerebellum', 'Corpus Callosum')",
                  "description": "A concise, one-sentence description suitable for a high school student.",
                  "analogy": "A simple analogy to help understanding (e.g., 'The coordination center for movement').",
                  "function": "The primary biological function of this component.",
                  "polygon": [
                    {"x": "50%", "y": "45%"},
                    {"x": "52%", "y": "48%"},
                    {"x": "50%", "y": "51%"},
                    {"x": "48%", "y": "48%"}
                  ]
                }
              ],
              "quiz": [
                  {
                      "question": "Which component is primarily responsible for balance and coordination?",
                      "options": ["Cerebrum", "Cerebellum", "Brainstem"],
                      "answer": "Cerebellum"
                  }
              ]
            }

            IMPORTANT INSTRUCTIONS FOR THE "polygon" FIELD:
            1.  You MUST trace the PRECISE ANATOMICAL BOUNDARY of the identified component.
            2.  DO NOT just draw a simple box or rectangle around the structure.
            3.  Follow the curves and contours of the organelle or structure.
            4.  Use at least 6-10 coordinate points for curved or complex shapes to ensure the outline is accurate.
            5.  Identify at least 3-4 distinct and specific structures in the diagram.
        `;

        const imagePart = {
            inlineData: {
                data: imageFile.buffer.toString('base64'),
                mimeType: imageFile.mimetype,
            },
        };

        const result = await model.generateContent([prompt, imagePart]);
        const responseText = result.response.text();

        const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonResponse = JSON.parse(cleanedText);

        res.json(jsonResponse);

    } catch (error) {
        console.error('Error during AI analysis:', error);
        res.status(500).json({ error: 'Failed to analyze image. Check your API key and the server logs.' });
    }
});

app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
});
