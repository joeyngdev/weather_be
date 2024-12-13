require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const admin = require('firebase-admin');
const axios = require('axios');

const app = express();

app.use(cors()); 
app.use(express.json()); 

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
  });

  
const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
      user: process.env.GMAIL_USER, 
      pass: process.env.GMAIL_PASS, 
    },
  });

  let users = [];
    async function listAllUsers(nextPageToken) {
    try {
        const result = await admin.auth().listUsers(1000, nextPageToken);
        result.users.forEach(userRecord => {
            let user = userRecord.toJSON();
            users.push({name: user['email'], verified: user['emailVerified']});
        });
        if (result.pageToken) {
        listAllUsers(result.pageToken);
        }
        console.log(users)
    } catch (error) {
        console.error("Error fetching users:", error);
    }
    }

    const apiKey = 'c4468049dd0b47d5a6a54443241212';
    const weather_endpoint = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=ho chi minh`;
    async function getWeather() {
        try {
          const response = await axios.get(weather_endpoint);
          const weatherData = response.data;
          const weather = {
            cityname: weatherData['location']['name'],
            humidity: weatherData['current']['humidity'],
            temp: weatherData['current']['temp_c'],
            condition: weatherData['current']['condition']['text'],
            time: weatherData['location']['localtime']
          }
          return weather;
        } catch (error) {
          console.error('Error fetching weather data:', error);
        }
      }
    async function sendEmail()
    {
        const weather = await getWeather();
        try {
            let recipients = []
         users.filter((user) => user.verified == true).forEach((user) => recipients.push(user.name));
        console.log(weather);
        const mailOptions = {
            from: `"Weather Forecast Company" <joey20092003@gmail.com>`,
            to: recipients.join(','),
            subject: "Your subscription of receiving daily weather forecast",
            text: `
            City name: ${weather['cityname']}
            Date: ${weather['time']}
            Temperature: ${weather['temp']} - Humidity: ${weather['humidity']} - Condition: ${weather['condition']}
            `,
          };
        await transporter.sendMail(mailOptions);
 
        } catch (error) {
            console.log(error);
            console.log('aaa')
        }
    }

cron.schedule('0 0 * * *', async () => {
    await listAllUsers();
    console.log('Sending daily email...');
    await sendEmail(); 
    users = [];
  });
  app.listen(process.env.PORT, () => {
    console.log(`Server is running on http://localhost:${process.env.PORT}`);
  });