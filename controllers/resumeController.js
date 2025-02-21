const axios = require('axios');
const pdf = require('pdf-parse');
const model = require('../config/gemini');
const Applicant = require('../models/applicantModel');
const { encrypt, decrypt } = require('../utils/encryption');

const enrichResume = async (req, res) => {
  const { url } = req.body;

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
    let cleanedResponse = responseText
      .replace(/```(json|JSON)?/g, '') // Remove all backticks and json labels
      .replace(/^\s*JSON\s*$/gm, '') // Remove standalone "JSON" lines
      .trim();
    console.log('Cleaned response:', cleanedResponse);

    // Step 5: Parse the cleaned response as JSON
    const jsonData = JSON.parse(cleanedResponse);
    console.log('Structured data from Gemini:', jsonData);

    // Step 6: Encrypt sensitive data
    let userEmail = Array.isArray(jsonData.email) ? jsonData.email[0] : jsonData.email;
    const encryptedData = {
      name: encrypt(jsonData.name),
      email: encrypt(userEmail),
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
  console.log(name);

  try {
    const applicants = await Applicant.find({});

    // Filter applicants whose decrypted name matches the search query
    const matches = applicants.filter((applicant) => {
      try {
        const decryptedName = decrypt(applicant.name);
        return decryptedName.toLowerCase().includes(name.toLowerCase());
      } catch (err) {
        console.error('Error decrypting applicant name:', err);
        return false; // Skip this applicant if decryption fails
      }
    });

    if (matches.length === 0) {
      return res.status(404).json({ error: 'No matching records found' });
    }

    // Decrypt the fields for the response
    const decryptedMatches = matches.map((applicant) => {
      try {
        return {
          ...applicant.toObject(),
          name: decrypt(applicant.name),
          email: decrypt(applicant.email),
        };
      } catch (err) {
        console.error('Error decrypting applicant data:', err);
        return null; // Skip this applicant if decryption fails
      }
    }).filter(Boolean); // Remove null entries

    res.status(200).json(decryptedMatches);
  } catch (err) {
    console.error('Error searching resumes:', err);
    res.status(500).json({ error: 'Failed to search resumes' });
  }
};

module.exports = { enrichResume, searchResume };