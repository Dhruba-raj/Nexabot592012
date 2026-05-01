const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const gTTS = require('gtts'); // Helper for voice output

const app = express();
const upload = multer({ dest: 'uploads/' });

// Initialize Gemini with your Environment Variable
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(express.json());

// 1. Endpoint for ESP32 to send audio
app.post('/process-audio', upload.single('audio'), async (req, res) => {
    try {
        console.log("Receiving audio from NexaBOT...");
        
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const audioPath = req.file.path;

        // Read audio and convert to Base64 for Gemini
        const audioBuffer = fs.readFileSync(audioPath);
        
        const part = {
            inlineData: {
                data: audioBuffer.toString("base64"),
                mimeType: "audio/wav" 
            }
        };

        const prompt = "You are Nexa, a helpful AI assistant. Listen to the user's request and reply concisely.";
        
        // 2. Generate Content from Audio
        const result = await model.generateContent([prompt, part]);
        const responseText = result.response.text();
        console.log("Nexa Response:", responseText);

        // 3. Convert Text Response to Speech (MP3)
        const gtts = new gTTS(responseText, 'en');
        const speechPath = path.join(__dirname, 'response.mp3');

        gtts.save(speechPath, function (err, result) {
            if (err) { throw new Error(err); }
            console.log("Audio response ready.");
            // Send the MP3 file back to ESP32
            res.sendFile(speechPath);
        });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Brain freeze! Something went wrong." });
    }
});

// 4. Simple status check
app.get('/', (req, res) => res.send("NexaBOT Server is Online!"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
