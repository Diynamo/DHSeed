require('dotenv').config();

const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;

// get driver connection
const dbo = require("./connect");

app.use(cors());
// Use JSON parser for all non-webhook routes
app.use((req, res, next) => {
  if (req.originalUrl === '/stripe/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});
app.use(require("./record.js"));
app.use('/uploads', express.static('uploads'))

app.get("/ping", (req, res) => {
  res.json({ dreamer_says: "(V1) To the Moon!" });
});

app.listen(port, () => {
  // perform a database connection when server starts
  dbo.connectToServer(function (err) {
    if (err) console.error(err);

  });
  console.log(`Server is running on port: ${port}`);
});