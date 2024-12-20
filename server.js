const https = require('https');
const express = require('express');

const bodyParser = require('body-parser');
const { Pool } = require('pg');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const path = require('path');
const cors = require('cors');
const session = require('express-session');

const sslOptions = {
  key: fs.readFileSync('./key.pem'),
  cert: fs.readFileSync('./cert.pem')
};



// Initialize the express app
const app = express();
const port = 8080;

app.use(express.static('../frontend'));
app.use(cors({
  origin : 'https://localhost:8080',
  credentials : true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: 'f2d1bc382a9f28397312cd3404ae9a837fbc5d1f83a9ec7c1fc6cfa3e8b76ebf',
   resave: false,
   saveUninitialized: true,
   cookie: {
    httpOnly : false, 
    secure: true,
    maxAge : 24 * 60 * 60 * 1000 
  },
 })
);


//const JWT_SECRET = 'f2d1bc382a9f28397312cd3404ae9a837fbc5d1f83a9ec7c1fc6cfa3e8b76ebf';

  
  // PostgreSQL database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'Marees',
  port: 5432,
});

pool.connect((err) => {
  if (err) {
    console.error('Database connection error:', err.stack);
  } else {
    console.log('Connected to PostgreSQL');
  }
});



app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (result.rows.length > 0) {
    return res.status(400).json({ message: 'Email already in use' });
  }
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id',
      [name, email, hashedPassword]
    );
    return res.status(201).json({ message: 'Registration successful! Please log in.' });
   
  } catch (error) {
    console.error('Error during registration:', error.message);
    return res.status(500).json({ error: 'An error occurred during registration', details: error.message });
  }
});

// User login
app.post('/login', async (req, res) => {
 
      
  const { email, password } = req.body;
  
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    console.log("Query result:", result.rows);
    
    if (result.rows.length === 0){
       return res.status(400).send("Invalid email or password.");
    }
    const user = result.rows[0];
    //console.log("Found user:", user);
      const validPassword = await bcrypt.compare(password, user.password);
      
     
      

      if (!validPassword){ 
        return res.status(400).json({ error: "Invalid email or password" });
 }
 req.session.user = { email: user.email };
 console.log('User logged in:', req.session.user);

    //   const token = jwt.sign({ id: user.id }, secret, {
    //     expiresIn: '1h', // Token expires in 1 hour
    //  });
    //  res.json({ token });
      
     //console.log('Generated Token:', token);
      // req.session.user = { id: user.id, name: user.name };
      
      res.status(200).json({ message: "Login successful"});
      
      
    }
catch (error) {
    console.error('Error during login:', error.message);
    res.status(500).json({ error: 'An error occurred during login', details: error.message });
  }
});



 
    




// Directory for saving reports
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Generate PDF report (protected by authentication)
app.post('/generateReport', async (req, res) => {
  console.log("Satellite form submission received:");
  console.log("Session data:", req.session);
  if (!req.session.user || !req.session.user.email) {
    return res.status(401).json({ message: 'Unauthorized: Please log in first.' });
  }
  const data = req.body;
    const email = req.session.user.email;
    const { payloadmass, configuration_id, pointingprecision, propulsion, comm, payload_duty, payload_pow } = data;

    console.log('Received form data:', data);
  try {
    // Step 1: Check if data is present
    

    // Step 2: Check if all required fields are present
    if (!payloadmass || !configuration_id || !pointingprecision || !propulsion || !comm || !payload_duty || !payload_pow) {
      return res.status(400).send('Missing required form data');
    }

    
    const configResult = await pool.query('SELECT * FROM configuration WHERE configuration_id = $1', [configuration_id]);
    const subsystemResult = await pool.query('SELECT * FROM subsystems WHERE configuration_id = $1', [configuration_id]);

    // Handle case where configuration is not found
    if (configResult.rows.length === 0) {
      return res.status(404).json({ error: 'Configuration ID not found in the database' });
    }

    const configuration = configResult.rows[0];
    const subsystems = subsystemResult.rows;

    const newFilePath = path.join(outputDir,'new_report.pdf');
    const mergedFilePath = path.join(outputDir, 'merged_report.pdf')

    
    // Step 4: Create the PDF document
    const doc = new PDFDocument();
    const writeStream = fs.createWriteStream(newFilePath);
    const fontPath = path.join(__dirname, 'fonts', 'Exo2-Regular.ttf');
    doc.font(fontPath);
    doc.pipe(writeStream);  // Save the PDF as a temporary file

    // Set header
    doc.font('fonts/Exo2-Black.ttf').fontSize(16).text(`${configuration.name} Nano Satellite Configuration Report`, { align: 'center' });
    doc.moveDown(1);  // Add a line break
    
    doc.font('fonts/Exo2-Regular.ttf').fontSize(13).text(`Configuration Name: ${configuration.name}`);
    doc.text(`Description: ${configuration.description}`);
    doc.moveDown(1);  // Add another line break

    // Add User Selected Configurations
    doc.font('fonts/Exo2-BoldItalic.ttf').fontSize(14).text('User Selected Configurations for Nano Satellite:', { underline: true });
    doc.moveDown(1);
    doc.font('fonts/Exo2-Regular.ttf').fontSize(13).text(`Payload Mass: ${payloadmass} kg`);
    doc.text(`Payload Volume Envelope: ${configuration_id} U`);
    doc.text(`Pointing Precision: ${pointingprecision}`);
    doc.text(`Propulsion: ${propulsion}`);
    doc.text(`Downlink Data Rate: ${comm}`);
    doc.text(`Payload Duty Cycle: ${payload_duty}%`);
    doc.text(`Payload Power Consumption: ${payload_pow} W`);
    doc.moveDown(); // Add enough space before the table
    doc.font('fonts/Exo2-BoldItalic.ttf').fontSize(14).text('Subsystem Configuration:', { underline: true });
    doc.moveDown();
    // Draw Subsystem Configuration Table
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const tableWidth = 450;
    const columnWidths = [120, 110, 110, 110];
    const rowHeight = 50;
    const startX = (pageWidth - tableWidth)/2 + doc.page.margins.left;
    let currentY = doc.y;

    // Table Header
    const drawTableHeader = (startX, currentY, columnWidths,rowHeight) => {
      const headers = ['Component', 'Light Config', 'Mid Config', 'Max Config'];
      headers.forEach((header, i) => {
        doc.rect(
          startX + columnWidths.slice(0, i).reduce((a, b) => a + b, 0),
          currentY,
          columnWidths[i],
          rowHeight
        ).stroke();
        doc.font('fonts/Exo2-MediumItalic.ttf').fontSize(13).text(header, startX + columnWidths.slice(0,i).reduce((a,b) => a+b, 0) +5,currentY +5,{
          width : columnWidths[i] - 10,
          align : 'center',  
        });

      });
        // Move the currentY position after the header
    };

    // Table Row
    const drawTableRow = (row,startX,currentY,columnWidths,rowHeight) => {
      row.forEach((cell, i) => {
        doc.rect(
          startX + columnWidths.slice(0,i).reduce((a,b) => a+b,0),
          currentY,
          columnWidths[i],
          rowHeight
        ).stroke();
        
        doc.font('fonts/Exo2-Regular.ttf').fontSize(12).text(cell, startX + columnWidths.slice(0,i).reduce((a,b) => a+b,0) + 5,currentY +5,{
          width: columnWidths[i] - 10,
          align: 'left',
          lineBreak : true,
        });
          
        });
      };

    drawTableHeader(startX, currentY,columnWidths,rowHeight);
    currentY += rowHeight;

    // Add rows of subsystem data
    subsystems.forEach((subsystem) => {
      const row = [
        subsystem.component || '-',
        subsystem.light_config || '-',
        subsystem.mid_config || '-',
        subsystem.max_config || '-',
      ];

      // Check if content exceeds the page height and add a page break
      if (currentY + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        currentY = doc.page.margins.top;
        drawTableHeader(startX,currentY,columnWidths,rowHeight);
        currentY += rowHeight; // Redraw the table header when a new page is added
      }

      drawTableRow(row,startX,currentY,columnWidths,rowHeight);
      currentY += rowHeight;
    });

    // Finalize the document
    doc.end();
    // 
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'smarees2003@gmail.com',
        pass: 'wkfv lwkq nunl rqxp', // You should use environment variables for security
      },
    });
  
    
        const mergePDFs = async () => {
        const loadPdfMerger = async () => (await import('pdf-merger-js')).default;
        const PdfMerger = await loadPdfMerger(); // Dynamically load PdfMerger
        const merger = new PdfMerger();
      
        try {
          await merger.add('GS.pdf'); // Add the first PDF
          await merger.add(newFilePath); // Add the new report PDF
          await merger.save(path.join(outputDir, 'merged_report.pdf')); // Save the merged PDF
          console.log('PDFs merged successfully');
          
        } catch (mergeError) {
          console.error('Error during PDF merging:', mergeError.message);
          throw mergeError; // Throw to handle errors higher up if needed
        }
      };
      writeStream.on('finish', async () => {
        console.log('PDF finished, starting merge...');

    

    await mergePDFs();
    const mergedFilePath = path.join(outputDir, 'merged_report.pdf');
    res.download(mergedFilePath, 'merged_report.pdf', (err) => {
      if (err) {
        console.error('Error sending the file to client:', err.message);
        res.status(500).send('Error downloading the file');
      }
    
    });
  });

    writeStream.on('finish', async () => {
      try {
        // Send email with the generated PDF as attachment
        const pdfPath = path.join(outputDir, 'merged_report.pdf');
        const mailOptions = {
          from: 'smarees2003@gmail.com',
          to: email,  // Send to the logged-in user's email
          subject: 'Your Satellite Report',
          text: 'Please find your satellite report attached.',
          attachments: [
            {
              filename: 'SatelliteReport.pdf',
              path: pdfPath,
            },
          ],
        };

        await transporter.sendMail(mailOptions);
        console.log('Report sent successfully to the email!');
        res.status(200).json({message: "Report generated and emailed successfully!" });
        
  } catch (error) {
    res.status(500).json({ error: 'Failed to merge PDFs', details: error.message });
  }
});

writeStream.on('error', (writeError) => {
  console.error('Error writing PDF:', writeError.message);
  res.status(500).json({ error: 'Error generating PDF' });
});
    
   

  } catch (error) {
    console.error('Error generating the report:', error.stack || error.message);
    res.status(500).json({ error: 'An error occurred while generating the PDF', details: error.message });
  }
});



https.createServer(sslOptions, app).listen(443, ()=> {
  console.log('HTTPS server running on https://localhost');

})

// // Start the server
// app.listen(port, () => {
//   console.log(`Server is running on https://localhost:${port}`);
// });
