const mongoose = require('mongoose');
async function connectDatabase(uri = process.env.MONGODB_URI) {
  if (!uri) throw new Error('MONGODB_URI is required to connect the database.');
  await mongoose.connect(uri);
  console.log('MongoDB connected');
  return mongoose.connection;
}
module.exports = { connectDatabase };
