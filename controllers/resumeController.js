const axios = require('axios');
const pdf = require('pdf-parse');
const model = require('../config/gemini');
const Applicant = require('../models/applicantModel');
const { encrypt, decrypt } = require('../utils/encryption');

const enrichResume = async (req, res) => {
  const { url } = req.body;
  console.log('URL from the body:', url);

  try {
    // Step 1: Download the PDF file from the URL
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const pdfBuffer = Buffer.from(response.data, 'binary');
    console.log('PDF downloaded successfully');

    // Step 2: Extract text from the PDF buffer
    const data = await pdf(pdfBuffer);
    const text = data.text;
    console.log('Text extracted from PDF:', text);

    // Step 3: Use Gemini to structure the data
    const prompt = `Extract the following details from the resume text in JSON format: name, email, education (degree, branch, institution, year), experience (job_title, company, start_date, end_date), skills (as an array), and a short summary. Resume text: ${text}`;
    const result = await model.generateContent(prompt);
    const geminiResponse = await result.response;
    const responseText = await geminiResponse.text();
    console.log('Raw response from Gemini:', responseText);

    // Step 4: Clean the response (remove Markdown formatting)
    let cleanedResponse = responseText;
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/```json|```/g, '').trim();
    }
    console.log('Cleaned response:', cleanedResponse);

    // Step 5: Parse the cleaned response as JSON
    const jsonData = JSON.parse(cleanedResponse);
    console.log('Structured data from Gemini:', jsonData);

    // Step 6: Encrypt sensitive data
    const encryptedData = {
      name: encrypt(jsonData.name),
      email: encrypt(jsonData.email),
      education: jsonData.education,
      experience: jsonData.experience,
      skills: jsonData.skills,
      summary: jsonData.summary,
    };

    // Step 7: Save to MongoDB
    const applicant = new Applicant(encryptedData);
    await applicant.save();
    console.log('Resume data saved to MongoDB');

    res.status(200).json({ message: 'Resume data saved successfully' });
  } catch (err) {
    console.error('Error processing the resume:', err);
    res.status(500).json({ error: 'Failed to process the resume' });
  }
};
const searchResume = async (req, res) => {
  const { name } = req.body;

  try {
    const applicants = await Applicant.find({});
    const matches = applicants.filter((applicant) =>
      decrypt(applicant.name).toLowerCase().includes(name.toLowerCase())
    );

    if (matches.length === 0) {
      return res.status(404).json({ error: 'No matching records found' });
    }

    res.status(200).json(matches);
  } catch (err) {
    console.error('Error searching resumes:', err);
    res.status(500).json({ error: 'Failed to search resumes' });
  }
};

module.exports = { enrichResume, searchResume };