const { MongoClient } = require('mongodb');
require('dotenv').config();

// Replace the following with values for your environment.
const username = encodeURIComponent(process.env.MONGO_USERNAME);
const password = encodeURIComponent(process.env.MONGO_PASSWORD);
const clusterUrl = process.env.MONGO_CLAUSTER_URL;
const databaseName = process.env.MONGO_DATABASE_NAME;

const uri = `mongodb+srv://${username}:${password}@${clusterUrl}/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

var _db;

module.exports = {
  connectToServer: function (callback) {
    client.connect(function (err, db) {
      // Verify we got a good "db" object
      if (db) {
        _db = db.db(databaseName);
        console.log("Successfully connected to MongoDB.");
      }
      return callback(err);
    });
  },

  getDb: function () {
    return _db;
  },
};